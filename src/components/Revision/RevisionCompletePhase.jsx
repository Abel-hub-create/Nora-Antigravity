import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * RevisionCompletePhase - Final phase (attempt 8)
 * Shows success percentage and appropriate message
 * No congratulations animation - just clean feedback
 */
const RevisionCompletePhase = ({
    iterationsCount,
    overallScore = 0,
    understoodConcepts = [],
    missingConcepts = [],
    onFinish
}) => {
    const { t } = useTranslation();

    // Calculate percentage based on concepts
    const totalConcepts = understoodConcepts.length + missingConcepts.length;
    const percentage = totalConcepts > 0
        ? Math.round((understoodConcepts.length / totalConcepts) * 100)
        : overallScore;

    // Get message based on percentage
    const getMessage = () => {
        if (percentage <= 10) {
            return t('revision.complete.message0to10');
        }
        if (percentage <= 50) {
            return t('revision.complete.message10to50');
        }
        if (percentage <= 70) {
            return t('revision.complete.message50to70');
        }
        if (percentage < 100) {
            return t('revision.complete.message70to99');
        }
        return t('revision.complete.message100');
    };

    // Get progress bar color based on percentage
    const getProgressColor = () => {
        if (percentage <= 10) return 'bg-error';
        if (percentage <= 50) return 'bg-warning';
        if (percentage <= 70) return 'bg-primary';
        return 'bg-success';
    };

    return (
        <div className="min-h-full flex flex-col items-center justify-center p-6 text-center">
            {/* Score Display */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="relative mb-8"
            >
                {/* Circle with percentage */}
                <div className="w-36 h-36 bg-surface rounded-full flex flex-col items-center justify-center border-4 border-white/10">
                    <span className="text-4xl font-bold text-text-main">{percentage}%</span>
                    <span className="text-xs text-text-muted mt-1">{t('revision.complete.score')}</span>
                </div>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100%' }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-xs mb-6"
            >
                <div className="h-3 bg-surface rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${getProgressColor()} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-text-muted">
                    <span>0%</span>
                    <span>100%</span>
                </div>
            </motion.div>

            {/* Message based on percentage */}
            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-text-main font-medium mb-2 max-w-xs"
            >
                {getMessage()}
            </motion.p>

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex gap-6 mb-8"
            >
                <div className="text-center">
                    <div className="text-2xl font-bold text-success">{understoodConcepts.length}</div>
                    <div className="text-xs text-text-muted">{t('revision.complete.retained')}</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-error">{missingConcepts.length}</div>
                    <div className="text-xs text-text-muted">{t('revision.complete.notRetained')}</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-text-main">{iterationsCount}</div>
                    <div className="text-xs text-text-muted">{t('revision.complete.iterations')}</div>
                </div>
            </motion.div>

            {/* Finish Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={onFinish}
                className="w-full max-w-xs py-4 bg-primary text-white rounded-xl font-medium text-lg hover:bg-primary-dark transition-colors"
            >
                {t('revision.phases.completeButton')}
            </motion.button>
        </div>
    );
};

export default RevisionCompletePhase;
