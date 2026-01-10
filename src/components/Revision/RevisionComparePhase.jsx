import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as revisionService from '../../services/revisionService';

const RevisionComparePhase = ({ syntheseId, userRecall, originalSummary, onComplete }) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Run comparison on mount
    useEffect(() => {
        const runComparison = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const comparisonResult = await revisionService.compare(syntheseId);
                setResult(comparisonResult);
            } catch (err) {
                console.error('Comparison error:', err);
                setError(t('revision.compare.error'));
            } finally {
                setIsLoading(false);
            }
        };

        runComparison();
    }, [syntheseId, t]);

    const handleContinue = () => {
        if (result) {
            onComplete(result);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-full flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6"
                >
                    <Loader2 size={40} className="text-primary animate-spin" />
                </motion.div>
                <h2 className="text-xl font-bold text-text-main mb-2">{t('revision.phases.compareLoading')}</h2>
                <p className="text-text-muted">{t('revision.compare.analyzing')}</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-full flex flex-col items-center justify-center p-6 text-center">
                <XCircle size={48} className="text-error mb-4" />
                <h2 className="text-xl font-bold text-text-main mb-2">{t('common.error')}</h2>
                <p className="text-text-muted mb-6">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-medium"
                >
                    {t('common.retry')}
                </button>
            </div>
        );
    }

    const understoodCount = result?.understoodConcepts?.length || 0;
    const missingCount = result?.missingConcepts?.length || 0;
    const score = result?.overallScore || 0;

    return (
        <div className="min-h-full flex flex-col p-4 pb-24">
            {/* Header */}
            <header className="mb-4">
                <h1 className="text-lg font-bold text-text-main">{t('revision.phases.compare')}</h1>
            </header>

            {/* Score */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-6 mb-4 text-center ${
                    missingCount === 0
                        ? 'bg-success/10 border border-success/20'
                        : 'bg-surface'
                }`}
            >
                <div className={`text-4xl font-bold mb-2 ${
                    missingCount === 0 ? 'text-success' : 'text-primary'
                }`}>
                    {score}%
                </div>
                <p className="text-text-muted text-sm">
                    {missingCount === 0
                        ? result?.feedback
                        : t('revision.compare.partialFeedback')
                    }
                </p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-success/10 border border-success/20 rounded-xl p-4 text-center"
                >
                    <CheckCircle size={24} className="text-success mx-auto mb-2" />
                    <div className="text-2xl font-bold text-success">{understoodCount}</div>
                    <div className="text-xs text-text-muted">{t('revision.compare.understood')}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-error/10 border border-error/20 rounded-xl p-4 text-center"
                >
                    <XCircle size={24} className="text-error mx-auto mb-2" />
                    <div className="text-2xl font-bold text-error">{missingCount}</div>
                    <div className="text-xs text-text-muted">{t('revision.compare.missing')}</div>
                </motion.div>
            </div>

            {/* Comparison Content - Stacked Layout */}
            <div className="flex-1 overflow-auto space-y-4">
                {/* User Recall */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-surface rounded-2xl border border-white/5 p-4"
                >
                    <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2">
                        {t('revision.compare.yourRecall')}
                    </h3>
                    <div className="text-sm text-text-muted whitespace-pre-wrap">
                        {userRecall}
                    </div>
                </motion.div>

                {/* Understood Concepts */}
                {understoodCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-2"
                    >
                        <h3 className="text-sm font-bold text-success flex items-center gap-2">
                            <CheckCircle size={16} />
                            {t('revision.compare.understood')}
                        </h3>
                        {result.understoodConcepts.map((concept, index) => (
                            <div key={index} className="bg-success/10 border border-success/20 rounded-xl p-3">
                                <div className="font-medium text-text-main text-sm">{concept.concept}</div>
                                {concept.userText && (
                                    <div className="text-xs text-text-muted mt-1">
                                        "{concept.userText}"
                                    </div>
                                )}
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* Missing Concepts */}
                {missingCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-2"
                    >
                        <h3 className="text-sm font-bold text-error flex items-center gap-2">
                            <XCircle size={16} />
                            {t('revision.compare.missing')}
                        </h3>
                        {result.missingConcepts.map((concept, index) => (
                            <div key={index} className="bg-error/10 border border-error/20 rounded-xl p-3">
                                <div className="font-medium text-text-main text-sm">{concept.concept}</div>
                                <div className="text-xs text-text-muted mt-1">
                                    {concept.originalText}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Continue Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={handleContinue}
                className="mt-4 w-full py-3 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
            >
                {t('common.continue')}
                <ChevronRight size={18} />
            </motion.button>
        </div>
    );
};

export default RevisionComparePhase;
