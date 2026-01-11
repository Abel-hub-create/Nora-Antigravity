import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useRevisionTimer from '../../hooks/useRevisionTimer';
import useActiveTimer from '../../hooks/useActiveTimer';

const LOOP_DURATION = 15; // 15 seconds (testing)

/**
 * RevisionLoopPhase - Phase 5
 * Shows missing concepts highlighted within the original synthese
 * with a 5-minute timer for review
 */
const RevisionLoopPhase = ({
    missingConcepts,
    iteration,
    originalSummary,
    phaseStartedAt,
    onContinue
}) => {
    const { t } = useTranslation();

    // Track study time for daily goals (summary activity)
    useActiveTimer('summary');

    const handleTimerComplete = useCallback(() => {
        // Timer completed - user can now continue
    }, []);

    // Timer hook - calculates remaining time from phase start timestamp
    const { formattedTime, timeRemaining } = useRevisionTimer(
        LOOP_DURATION,
        phaseStartedAt,
        handleTimerComplete,
        true
    );

    // Highlight missing concepts in the summary
    const getHighlightedSummary = () => {
        if (!originalSummary || !missingConcepts || missingConcepts.length === 0) {
            return originalSummary;
        }

        let highlighted = originalSummary;

        // Sort by length (longest first) to avoid partial replacements
        const sortedConcepts = [...missingConcepts].sort(
            (a, b) => (b.originalText?.length || 0) - (a.originalText?.length || 0)
        );

        // Create a map to track highlighted sections
        const highlights = [];

        sortedConcepts.forEach((concept) => {
            if (concept.originalText) {
                // Find the text in the summary (case-insensitive)
                const regex = new RegExp(`(${escapeRegExp(concept.originalText)})`, 'gi');
                const matches = highlighted.match(regex);
                if (matches) {
                    highlights.push({
                        text: concept.originalText,
                        concept: concept.concept,
                        importance: concept.importance
                    });
                }
            }
        });

        return { summary: originalSummary, highlights };
    };

    // Escape special regex characters
    const escapeRegExp = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const { summary, highlights = [] } = getHighlightedSummary() || { summary: originalSummary };

    // Render summary with highlights
    const renderHighlightedSummary = () => {
        if (!highlights.length) {
            return <span>{summary}</span>;
        }

        let result = summary;
        let parts = [];
        let lastIndex = 0;

        // Find all occurrences and their positions
        const occurrences = [];
        highlights.forEach((h) => {
            const regex = new RegExp(escapeRegExp(h.text), 'gi');
            let match;
            while ((match = regex.exec(summary)) !== null) {
                occurrences.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    concept: h.concept,
                    importance: h.importance
                });
            }
        });

        // Sort by position
        occurrences.sort((a, b) => a.start - b.start);

        // Remove overlapping occurrences
        const filtered = [];
        let lastEnd = 0;
        occurrences.forEach((occ) => {
            if (occ.start >= lastEnd) {
                filtered.push(occ);
                lastEnd = occ.end;
            }
        });

        // Build parts
        filtered.forEach((occ, idx) => {
            // Add text before this highlight
            if (occ.start > lastIndex) {
                parts.push(
                    <span key={`text-${idx}`}>{summary.slice(lastIndex, occ.start)}</span>
                );
            }
            // Add highlighted text
            parts.push(
                <mark
                    key={`highlight-${idx}`}
                    className={`${occ.importance === 'high' ? 'bg-error/30 text-error' : 'bg-warning/30 text-warning'} px-1 rounded`}
                    title={occ.concept}
                >
                    {occ.text}
                </mark>
            );
            lastIndex = occ.end;
        });

        // Add remaining text
        if (lastIndex < summary.length) {
            parts.push(<span key="text-end">{summary.slice(lastIndex)}</span>);
        }

        return parts;
    };

    const canContinue = timeRemaining === 0;
    const progress = ((LOOP_DURATION - timeRemaining) / LOOP_DURATION) * 100;

    return (
        <div className="min-h-full flex flex-col p-4 pb-24">
            {/* Header with Timer */}
            <header className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-lg font-bold text-text-main">{t('revision.phases.loop')}</h1>
                    <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-full">
                        <Clock size={14} className="text-primary" />
                        <span className="font-mono text-sm font-bold text-primary">{formattedTime}</span>
                    </div>
                </div>
                <p className="text-xs text-primary">
                    {t('revision.phases.loopIteration', { current: iteration, max: 5 })}
                </p>

                {/* Progress bar */}
                <div className="mt-2 h-1 bg-surface rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </header>

            {/* Instructions */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-4"
            >
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-warning shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-text-main font-medium">{t('revision.phases.loopMessage')}</p>
                        <p className="text-xs text-text-muted mt-1">
                            {t('revision.phases.loopStudyTime')}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Missing Concepts Legend */}
            <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs text-text-muted">{t('revision.compare.missing')}:</span>
                {missingConcepts.slice(0, 3).map((concept, idx) => (
                    <span
                        key={idx}
                        className={`text-xs px-2 py-0.5 rounded ${
                            concept.importance === 'high'
                                ? 'bg-error/20 text-error'
                                : 'bg-warning/20 text-warning'
                        }`}
                    >
                        {concept.concept}
                    </span>
                ))}
                {missingConcepts.length > 3 && (
                    <span className="text-xs text-text-muted">
                        +{missingConcepts.length - 3}
                    </span>
                )}
            </div>

            {/* Summary with Highlighted Concepts */}
            <div className="flex-1 overflow-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-surface rounded-2xl border border-white/5 p-4"
                >
                    <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2">
                        <BookOpen size={16} />
                        {t('revision.tabs.summary')}
                    </h3>
                    <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                        {renderHighlightedSummary()}
                    </div>
                </motion.div>
            </div>

            {/* Continue Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={onContinue}
                disabled={!canContinue}
                className={`mt-4 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                    canContinue
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-surface text-text-muted cursor-not-allowed'
                }`}
            >
                {canContinue ? (
                    <>
                        {t('revision.phases.loopContinue')}
                        <ChevronRight size={18} />
                    </>
                ) : (
                    <>
                        <Clock size={16} />
                        {formattedTime}
                    </>
                )}
            </motion.button>

            {/* Hint about iterations */}
            {iteration < 5 && (
                <p className="text-center text-xs text-text-muted mt-3">
                    {t('revision.phases.loopHint', { remaining: 5 - iteration })}
                </p>
            )}
        </div>
    );
};

export default RevisionLoopPhase;
