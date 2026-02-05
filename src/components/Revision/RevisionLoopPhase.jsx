import React, { useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, AlertCircle, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useRevisionTimer from '../../hooks/useRevisionTimer';
import useActiveTimer from '../../hooks/useActiveTimer';

const LOOP_DURATION = 8; // 1 minute
const CHARS_PER_PAGE = 2000; // Nombre de caractères par page pour la pagination

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
    const [currentPage, setCurrentPage] = useState(0);

    // Diviser la synthèse en pages
    const summaryPages = useMemo(() => {
        if (!originalSummary) return [];
        if (originalSummary.length <= CHARS_PER_PAGE) {
            return [{ content: originalSummary, startIndex: 0, endIndex: originalSummary.length }];
        }

        const pages = [];
        let start = 0;
        while (start < originalSummary.length) {
            let end = start + CHARS_PER_PAGE;
            if (end < originalSummary.length) {
                const paragraphEnd = originalSummary.lastIndexOf('\n\n', end);
                const sentenceEnd = originalSummary.lastIndexOf('. ', end);
                if (paragraphEnd > start + CHARS_PER_PAGE * 0.7) {
                    end = paragraphEnd + 2;
                } else if (sentenceEnd > start + CHARS_PER_PAGE * 0.7) {
                    end = sentenceEnd + 2;
                }
            }
            pages.push({
                content: originalSummary.slice(start, end).trim(),
                startIndex: start,
                endIndex: Math.min(end, originalSummary.length)
            });
            start = end;
        }
        return pages;
    }, [originalSummary]);

    const totalPages = summaryPages.length;
    const hasMultiplePages = totalPages > 1;

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

    // Render summary page with ALL text colored: green for understood, RED for everything else
    // Principle: anything not explicitly recognized as understood is considered not retained
    const renderHighlightedPage = (pageContent, pageStartIndex) => {
        // If no understood concepts, everything is red
        if (!understoodConcepts || understoodConcepts.length === 0) {
            return (
                <mark className="bg-error/30 text-error">
                    {pageContent}
                </mark>
            );
        }

        // Find all understood concept positions in the FULL summary
        const allGreenZones = [];
        understoodConcepts.forEach((concept) => {
            if (concept.originalText) {
                const regex = new RegExp(escapeRegExp(concept.originalText), 'gi');
                let match;
                while ((match = regex.exec(originalSummary)) !== null) {
                    allGreenZones.push({
                        start: match.index,
                        end: match.index + match[0].length,
                        text: match[0],
                        concept: concept.concept
                    });
                }
            }
        });

        // Sort by position and remove overlaps
        allGreenZones.sort((a, b) => a.start - b.start);
        const filteredZones = [];
        let lastEnd = 0;
        allGreenZones.forEach((zone) => {
            if (zone.start >= lastEnd) {
                filteredZones.push(zone);
                lastEnd = zone.end;
            }
        });

        // Filter zones that intersect with current page
        const pageEndIndex = pageStartIndex + pageContent.length;
        const pageZones = filteredZones
            .filter(zone => zone.start < pageEndIndex && zone.end > pageStartIndex)
            .map(zone => ({
                ...zone,
                // Adjust indices relative to page
                localStart: Math.max(0, zone.start - pageStartIndex),
                localEnd: Math.min(pageContent.length, zone.end - pageStartIndex)
            }));

        // Build parts for this page
        let parts = [];
        let localIndex = 0;

        pageZones.forEach((zone, idx) => {
            // Add text BEFORE this green zone as RED
            if (zone.localStart > localIndex) {
                parts.push(
                    <mark key={`red-${idx}`} className="bg-error/30 text-error">
                        {pageContent.slice(localIndex, zone.localStart)}
                    </mark>
                );
            }
            // Add the understood zone as GREEN
            parts.push(
                <mark key={`green-${idx}`} className="bg-success/30 text-success" title={zone.concept}>
                    {pageContent.slice(zone.localStart, zone.localEnd)}
                </mark>
            );
            localIndex = zone.localEnd;
        });

        // Add remaining text as RED
        if (localIndex < pageContent.length) {
            parts.push(
                <mark key="red-end" className="bg-error/30 text-error">
                    {pageContent.slice(localIndex)}
                </mark>
            );
        }

        return parts.length > 0 ? parts : <mark className="bg-error/30 text-error">{pageContent}</mark>;
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
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                            <BookOpen size={16} />
                            {t('revision.tabs.summary')}
                        </h3>
                        {hasMultiplePages && (
                            <span className="text-xs text-text-muted">
                                {currentPage + 1} / {totalPages}
                            </span>
                        )}
                    </div>

                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {summaryPages[currentPage]
                            ? renderHighlightedPage(summaryPages[currentPage].content, summaryPages[currentPage].startIndex)
                            : renderHighlightedPage(originalSummary, 0)
                        }
                    </div>

                    {/* Boutons de navigation */}
                    {hasMultiplePages && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                    currentPage === 0
                                        ? 'text-text-muted/30 cursor-not-allowed'
                                        : 'text-primary bg-primary/10 hover:bg-primary/20'
                                }`}
                            >
                                <ChevronLeft size={18} />
                                <span className="text-sm">{t('common.previous')}</span>
                            </button>

                            {/* Indicateurs de page */}
                            <div className="flex gap-1.5">
                                {summaryPages.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentPage(idx)}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                            idx === currentPage ? 'bg-primary' : 'bg-white/20 hover:bg-white/40'
                                        }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage === totalPages - 1}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                    currentPage === totalPages - 1
                                        ? 'text-text-muted/30 cursor-not-allowed'
                                        : 'text-primary bg-primary/10 hover:bg-primary/20'
                                }`}
                            >
                                <span className="text-sm">{t('common.next')}</span>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default RevisionLoopPhase;
