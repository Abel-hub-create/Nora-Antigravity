import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as revisionService from '../services/revisionService';
import * as syntheseService from '../services/syntheseService';
import { useRevision } from '../context/RevisionContext';

// Phase components
import RevisionStudyPhase from '../components/Revision/RevisionStudyPhase';
import RevisionPausePhase from '../components/Revision/RevisionPausePhase';
import RevisionRecallPhase from '../components/Revision/RevisionRecallPhase';
import RevisionComparePhase from '../components/Revision/RevisionComparePhase';
import RevisionLoopPhase from '../components/Revision/RevisionLoopPhase';
import RevisionCompletePhase from '../components/Revision/RevisionCompletePhase';

const StudyRevision = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const { setRevisionActive } = useRevision();

    // Session state
    const [session, setSession] = useState(null);
    const [synthese, setSynthese] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expired, setExpired] = useState(false);

    // Comparison results (from AI)
    const [comparisonResult, setComparisonResult] = useState(null);

    // Stop confirmation modal
    const [showStopConfirm, setShowStopConfirm] = useState(false);

    // Sync interval ref
    const syncIntervalRef = useRef(null);

    // Check if session is active (not completed and not expired)
    const isSessionActive = session && session.phase !== 'complete' && !expired && !isLoading;

    // Block browser close/tab close with beforeunload
    useEffect(() => {
        if (!isSessionActive) return;

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            // Most modern browsers ignore this message and show their own
            e.returnValue = t('revision.exitWarning');
            return e.returnValue;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isSessionActive, t]);

    // Set revision context active state for navigation blocking
    useEffect(() => {
        setRevisionActive(isSessionActive);
        return () => setRevisionActive(false);
    }, [isSessionActive, setRevisionActive]);

    // Load session and synthese on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Load synthese first
                const syntheseData = await syntheseService.getSynthese(id);
                setSynthese(syntheseData);

                // Check for existing session
                const { session: existingSession, expired: isExpired } = await revisionService.getSession(id);

                if (isExpired) {
                    setExpired(true);
                    setIsLoading(false);
                    return;
                }

                if (existingSession) {
                    setSession(existingSession);
                } else {
                    // Start new session
                    const { session: newSession } = await revisionService.startSession(id);
                    setSession(newSession);
                }
            } catch (err) {
                console.error('Error loading revision:', err);
                setError(t('revision.loadError'));
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [id, t]);

    // Sync session to backend every 5 seconds
    useEffect(() => {
        if (!session || session.phase === 'complete') return;

        const syncToBackend = async () => {
            try {
                await revisionService.syncSession(id, {
                    phase: session.phase,
                    studyTimeRemaining: session.study_time_remaining,
                    pauseTimeRemaining: session.pause_time_remaining,
                    loopTimeRemaining: session.loop_time_remaining,
                    currentIteration: session.current_iteration
                });
            } catch (err) {
                console.debug('Sync error:', err);
            }
        };

        syncIntervalRef.current = setInterval(syncToBackend, 5000);

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [id, session]);

    // Update session state helper
    const updateSession = useCallback((updates) => {
        setSession(prev => ({ ...prev, ...updates }));
    }, []);

    // Phase transition handlers
    const handleStudyComplete = useCallback(() => {
        updateSession({ phase: 'pause', phase_started_at: new Date().toISOString() });
    }, [updateSession]);

    const handlePauseComplete = useCallback(() => {
        updateSession({ phase: 'recall', phase_started_at: new Date().toISOString() });
    }, [updateSession]);

    const handleRecallSubmit = useCallback(async (userRecall) => {
        try {
            await revisionService.submitRecall(id, userRecall);
            updateSession({ phase: 'compare', user_recall: userRecall });
        } catch (err) {
            console.error('Error submitting recall:', err);
        }
    }, [id, updateSession]);

    const handleCompareComplete = useCallback(async (result) => {
        setComparisonResult(result);

        // If no missing concepts, go to complete
        if (!result.missingConcepts || result.missingConcepts.length === 0) {
            updateSession({ phase: 'complete', phase_started_at: new Date().toISOString() });
        } else {
            updateSession({
                phase: 'loop',
                phase_started_at: new Date().toISOString(),
                missing_concepts: result.missingConcepts,
                understood_concepts: result.understoodConcepts
            });
        }
    }, [updateSession]);

    const handleLoopContinue = useCallback(async () => {
        try {
            const result = await revisionService.nextIteration(id);

            if (result.completed) {
                updateSession({ phase: 'complete', phase_started_at: new Date().toISOString() });
            } else {
                updateSession({
                    phase: 'recall',
                    phase_started_at: new Date().toISOString(),
                    current_iteration: result.iteration,
                    user_recall: null,
                    loop_time_remaining: 300 // Reset loop timer for next iteration
                });
                setComparisonResult(null);
            }
        } catch (err) {
            console.error('Error moving to next iteration:', err);
        }
    }, [id, updateSession]);

    const handleComplete = useCallback(async () => {
        try {
            await revisionService.completeSession(id);
            navigate(`/study/${id}`);
        } catch (err) {
            console.error('Error completing:', err);
            navigate(`/study/${id}`);
        }
    }, [id, navigate]);

    const handleStop = useCallback(async () => {
        try {
            await revisionService.stopSession(id);
            navigate(`/study/${id}`);
        } catch (err) {
            console.error('Error stopping:', err);
            navigate(`/study/${id}`);
        }
    }, [id, navigate]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-full bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin text-primary mx-auto mb-3" size={32} />
                    <p className="text-text-muted">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    // Expired session
    if (expired) {
        return (
            <div className="min-h-full bg-background p-6">
                <Link to={`/study/${id}`} className="inline-flex items-center gap-2 text-text-muted hover:text-text-main mb-6">
                    <ArrowLeft size={20} />
                    {t('common.back')}
                </Link>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Clock className="text-warning mb-4" size={48} />
                    <h2 className="text-xl font-bold text-text-main mb-2">{t('revision.expired')}</h2>
                    <p className="text-text-muted mb-6">{t('revision.expiredMessage')}</p>
                    <Link
                        to={`/study/${id}`}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors"
                    >
                        {t('common.back')}
                    </Link>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !session || !synthese) {
        return (
            <div className="min-h-full bg-background p-6">
                <Link to={`/study/${id}`} className="inline-flex items-center gap-2 text-text-muted hover:text-text-main mb-6">
                    <ArrowLeft size={20} />
                    {t('common.back')}
                </Link>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="text-error mb-3" size={40} />
                    <p className="text-text-muted">{error || t('revision.loadError')}</p>
                </div>
            </div>
        );
    }

    // Render phase component
    const renderPhase = () => {
        switch (session.phase) {
            case 'study':
                return (
                    <RevisionStudyPhase
                        synthese={synthese}
                        phaseStartedAt={session.phase_started_at}
                        onComplete={handleStudyComplete}
                        onStop={() => setShowStopConfirm(true)}
                    />
                );

            case 'pause':
                return (
                    <RevisionPausePhase
                        phaseStartedAt={session.phase_started_at}
                        onComplete={handlePauseComplete}
                    />
                );

            case 'recall':
                return (
                    <RevisionRecallPhase
                        iteration={session.current_iteration}
                        onSubmit={handleRecallSubmit}
                        onStop={() => setShowStopConfirm(true)}
                    />
                );

            case 'compare':
                return (
                    <RevisionComparePhase
                        syntheseId={id}
                        userRecall={session.user_recall}
                        originalSummary={synthese.summary_content}
                        onComplete={handleCompareComplete}
                    />
                );

            case 'loop':
                return (
                    <RevisionLoopPhase
                        missingConcepts={session.missing_concepts || comparisonResult?.missingConcepts || []}
                        iteration={session.current_iteration}
                        originalSummary={synthese.summary_content}
                        phaseStartedAt={session.phase_started_at}
                        onContinue={handleLoopContinue}
                    />
                );

            case 'complete':
                return (
                    <RevisionCompletePhase
                        iterationsCount={session.current_iteration}
                        onFinish={handleComplete}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-full bg-background">
            <AnimatePresence mode="wait">
                <motion.div
                    key={session.phase}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="min-h-full"
                >
                    {renderPhase()}
                </motion.div>
            </AnimatePresence>

            {/* Stop Confirmation Modal */}
            <AnimatePresence>
                {showStopConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
                        onClick={() => setShowStopConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface rounded-2xl p-6 max-w-sm w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-text-main mb-2">
                                {t('revision.stopConfirmTitle')}
                            </h3>
                            <p className="text-text-muted text-sm mb-6">
                                {t('revision.stopConfirmMessage')}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowStopConfirm(false)}
                                    className="flex-1 py-3 bg-white/5 text-text-main rounded-xl font-medium hover:bg-white/10 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleStop}
                                    className="flex-1 py-3 bg-error text-white rounded-xl font-medium hover:bg-error/90 transition-colors"
                                >
                                    {t('revision.stopButton')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default StudyRevision;
