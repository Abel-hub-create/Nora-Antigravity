import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, AlertCircle, Clock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useRevisionTimer from '../../hooks/useRevisionTimer';
import useActiveTimer from '../../hooks/useActiveTimer';

const LOOP_DURATION = 15; // 15 seconds (testing)

/**
 * RevisionLoopPhase - Phase 5
 * Shows concepts highlighted within the original synthese:
 * - GREEN for understood/retained concepts
 * - RED for missing/not retained concepts
 * Timer for review (auto-continues when timer ends)
 */
const RevisionLoopPhase = ({
    missingConcepts,
    understoodConcepts = [],
    iteration,
    originalSummary,
    phaseStartedAt,
    onContinue,
    onStop
}) => {
    const { t } = useTranslation();

    // Track study time for daily goals (summary activity)
    useActiveTimer('summary');

    // Auto-continue when timer completes
    const handleTimerComplete = useCallback(() => {
        onContinue();
    }, [onContinue]);

    // Timer hook - calculates remaining time from phase start timestamp
    const { formattedTime, timeRemaining } = useRevisionTimer(
        LOOP_DURATION,
        phaseStartedAt,
        handleTimerComplete,
        true
    );

    // Escape special regex characters
    const escapeRegExp = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Build highlights from both missing (red) and understood (green) concepts
    const getHighlights = () => {
        const highlights = [];

        // Add missing concepts (red)
        if (missingConcepts && missingConcepts.length > 0) {
            missingConcepts.forEach((concept) => {
                if (concept.originalText) {
                    highlights.push({
                        text: concept.originalText,
                        concept: concept.concept,
                        type: 'missing' // red
                    });
                }
            });
        }

        // Add understood concepts (green)
        if (understoodConcepts && understoodConcepts.length > 0) {
            understoodConcepts.forEach((concept) => {
                if (concept.originalText) {
                    highlights.push({
                        text: concept.originalText,
                        concept: concept.concept,
                        type: 'understood' // green
                    });
                }
            });
        }

        return highlights;
    };

    const highlights = getHighlights();

    // Render summary with highlights (green for understood, red for missing)
    const renderHighlightedSummary = () => {
        if (!highlights.length) {
            return <span>{originalSummary}</span>;
        }

        let parts = [];
        let lastIndex = 0;

        // Find all occurrences and their positions
        const occurrences = [];
        highlights.forEach((h) => {
            const regex = new RegExp(escapeRegExp(h.text), 'gi');
            let match;
            while ((match = regex.exec(originalSummary)) !== null) {
                occurrences.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    concept: h.concept,
                    type: h.type
                });
            }
        });

        // Sort by position
        occurrences.sort((a, b) => a.start - b.start);

        // Remove overlapping occurrences (keep first one found)
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
                    <span key={`text-${idx}`}>{originalSummary.slice(lastIndex, occ.start)}</span>
                );
            }
            // Add highlighted text with appropriate color
            const isUnderstood = occ.type === 'understood';
            parts.push(
                <mark
                    key={`highlight-${idx}`}
                    className={isUnderstood
                        ? "bg-success/30 text-success px-1 rounded"
                        : "bg-error/30 text-error px-1 rounded"
                    }
                    title={occ.concept}
                >
                    {occ.text}
                </mark>
            );
            lastIndex = occ.end;
        });

        // Add remaining text
        if (lastIndex < originalSummary.length) {
            parts.push(<span key="text-end">{originalSummary.slice(lastIndex)}</span>);
        }

        return parts;
    };

    const progress = ((LOOP_DURATION - timeRemaining) / LOOP_DURATION) * 100;

    return (
        <div className="min-h-full flex flex-col p-4 pb-24">
            {/* Header with Timer */}
            <header className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-lg font-bold text-text-main">{t('revision.phases.loop')}</h1>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-full">
                            <Clock size={14} className="text-primary" />
                            <span className="font-mono text-sm font-bold text-primary">{formattedTime}</span>
                        </div>
                        <button
                            onClick={onStop}
                            className="p-2 text-text-muted hover:text-error transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <p className="text-xs text-primary">
                    {t('revision.phases.loopIteration', { current: iteration, max: 8 })}
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
                className="bg-error/10 border border-error/20 rounded-xl p-4 mb-4"
            >
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-error shrink-0 mt-0.5" />
                    <p className="text-sm text-text-main font-medium">{t('revision.phases.loopReviewRed')}</p>
                </div>
            </motion.div>

            {/* Concepts Legend - Green for retained, Red for missing */}
            <div className="space-y-2 mb-4">
                {/* Retained concepts (green) */}
                {understoodConcepts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-text-muted">{t('revision.compare.retained')}:</span>
                        {understoodConcepts.slice(0, 3).map((concept, idx) => (
                            <span
                                key={`understood-${idx}`}
                                className="text-xs px-2 py-0.5 rounded bg-success/20 text-success"
                            >
                                {concept.concept}
                            </span>
                        ))}
                        {understoodConcepts.length > 3 && (
                            <span className="text-xs text-text-muted">
                                +{understoodConcepts.length - 3}
                            </span>
                        )}
                    </div>
                )}
                {/* Missing concepts (red) */}
                {missingConcepts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-text-muted">{t('revision.compare.missing')}:</span>
                        {missingConcepts.slice(0, 3).map((concept, idx) => (
                            <span
                                key={`missing-${idx}`}
                                className="text-xs px-2 py-0.5 rounded bg-error/20 text-error"
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
        </div>
    );
};

export default RevisionLoopPhase;
