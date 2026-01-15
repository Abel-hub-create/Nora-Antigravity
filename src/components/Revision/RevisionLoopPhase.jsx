import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, AlertCircle, Clock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useRevisionTimer from '../../hooks/useRevisionTimer';
import useActiveTimer from '../../hooks/useActiveTimer';

const LOOP_DURATION = 60; // 1 minute

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

    // Render summary with ALL text colored: green for understood, RED for everything else
    // Principle: anything not explicitly recognized as understood is considered not retained
    const renderHighlightedSummary = () => {
        // If no understood concepts, everything is red
        if (!understoodConcepts || understoodConcepts.length === 0) {
            return (
                <mark className="bg-error/30 text-error">
                    {originalSummary}
                </mark>
            );
        }

        let parts = [];
        let lastIndex = 0;

        // Find all understood concept positions (only these will be green)
        const greenZones = [];
        understoodConcepts.forEach((concept) => {
            if (concept.originalText) {
                const regex = new RegExp(escapeRegExp(concept.originalText), 'gi');
                let match;
                while ((match = regex.exec(originalSummary)) !== null) {
                    greenZones.push({
                        start: match.index,
                        end: match.index + match[0].length,
                        text: match[0],
                        concept: concept.concept
                    });
                }
            }
        });

        // Sort by position
        greenZones.sort((a, b) => a.start - b.start);

        // Remove overlapping zones (keep first one found)
        const filtered = [];
        let lastEnd = 0;
        greenZones.forEach((zone) => {
            if (zone.start >= lastEnd) {
                filtered.push(zone);
                lastEnd = zone.end;
            }
        });

        // Build parts: GREEN for understood zones, RED for everything else
        filtered.forEach((zone, idx) => {
            // Add text BEFORE this green zone as RED
            if (zone.start > lastIndex) {
                parts.push(
                    <mark
                        key={`red-${idx}`}
                        className="bg-error/30 text-error"
                    >
                        {originalSummary.slice(lastIndex, zone.start)}
                    </mark>
                );
            }
            // Add the understood zone as GREEN
            parts.push(
                <mark
                    key={`green-${idx}`}
                    className="bg-success/30 text-success"
                    title={zone.concept}
                >
                    {zone.text}
                </mark>
            );
            lastIndex = zone.end;
        });

        // Add remaining text as RED
        if (lastIndex < originalSummary.length) {
            parts.push(
                <mark
                    key="red-end"
                    className="bg-error/30 text-error"
                >
                    {originalSummary.slice(lastIndex)}
                </mark>
            );
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
