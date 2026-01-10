import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const RevisionLoopPhase = ({ missingConcepts, iteration, onContinue }) => {
    const { t } = useTranslation();

    return (
        <div className="min-h-full flex flex-col p-4 pb-24">
            {/* Header */}
            <header className="mb-4">
                <h1 className="text-lg font-bold text-text-main">{t('revision.phases.loop')}</h1>
                <p className="text-xs text-primary">
                    {t('revision.phases.loopIteration', { current: iteration, max: 5 })}
                </p>
            </header>

            {/* Instructions */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-4"
            >
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-warning shrink-0 mt-0.5" />
                    <p className="text-sm text-text-main">{t('revision.phases.loopMessage')}</p>
                </div>
            </motion.div>

            {/* Missing Concepts to Review */}
            <div className="flex-1 overflow-auto">
                <h2 className="text-sm font-bold text-error mb-3 flex items-center gap-2">
                    <BookOpen size={16} />
                    {t('revision.compare.missing')} ({missingConcepts.length})
                </h2>

                <div className="space-y-3">
                    {missingConcepts.map((concept, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-surface border border-white/10 rounded-2xl p-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-error/20 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-error">{index + 1}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-text-main mb-2">{concept.concept}</h3>
                                    <p className="text-sm text-text-muted leading-relaxed">
                                        {concept.originalText}
                                    </p>
                                    {concept.importance === 'high' && (
                                        <span className="inline-block mt-2 text-xs bg-error/20 text-error px-2 py-0.5 rounded">
                                            {t('revision.compare.important')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Continue Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={onContinue}
                className="mt-4 w-full py-3 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
            >
                {t('revision.phases.loopContinue')}
                <ChevronRight size={18} />
            </motion.button>

            {/* Hint about iterations */}
            {iteration < 5 && (
                <p className="text-center text-xs text-text-muted mt-3">
                    {t('revision.phases.loopHint')}
                </p>
            )}
        </div>
    );
};

export default RevisionLoopPhase;
