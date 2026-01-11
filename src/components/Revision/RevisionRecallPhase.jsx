import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Mic, X, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VoiceRecorder from '../Import/VoiceRecorder';

const RevisionRecallPhase = ({ iteration, onSubmit, onStop }) => {
    const { t } = useTranslation();
    const [userText, setUserText] = useState('');
    const [showVoice, setShowVoice] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (userText.trim().length < 10) return;

        setIsSubmitting(true);
        try {
            await onSubmit(userText.trim());
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVoiceComplete = (transcript) => {
        setUserText(prev => prev ? `${prev}\n\n${transcript}` : transcript);
        setShowVoice(false);
    };

    const canSubmit = userText.trim().length >= 10;

    return (
        <div className="min-h-full flex flex-col p-4 pb-24">
            {/* Header */}
            <header className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-lg font-bold text-text-main">{t('revision.phases.recall')}</h1>
                    {iteration > 1 && (
                        <p className="text-xs text-primary">
                            {t('revision.phases.loopIteration', { current: iteration, max: 5 })}
                        </p>
                    )}
                </div>
                <button
                    onClick={onStop}
                    className="p-2 text-text-muted hover:text-error transition-colors"
                >
                    <X size={20} />
                </button>
            </header>

            {/* Instructions */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4"
            >
                <div className="flex items-start gap-3">
                    <PenLine size={20} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-text-main">{t('revision.phases.recallMessage')}</p>
                </div>
            </motion.div>

            {/* Text Area */}
            <div className="flex-1 flex flex-col">
                <textarea
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    placeholder={t('revision.phases.recallPlaceholder')}
                    className="flex-1 w-full bg-surface border border-white/10 rounded-2xl p-4 text-text-main placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/50 transition-colors"
                    style={{ minHeight: '200px' }}
                />

                {/* Character count hint */}
                {userText.length > 0 && userText.length < 10 && (
                    <p className="text-xs text-warning mt-2">
                        {t('revision.phases.recallMinChars', { remaining: 10 - userText.length })}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-3">
                {/* Voice Button */}
                <button
                    onClick={() => setShowVoice(true)}
                    className="p-3 bg-surface border border-white/10 rounded-xl text-text-muted hover:text-primary hover:border-primary/50 transition-colors"
                >
                    <Mic size={24} />
                </button>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                        canSubmit
                            ? 'bg-primary text-white hover:bg-primary-dark'
                            : 'bg-surface text-text-muted cursor-not-allowed'
                    }`}
                >
                    <Send size={18} />
                    {t('revision.phases.recallSubmit')}
                </button>
            </div>

            {/* Voice Recorder Modal */}
            <AnimatePresence>
                {showVoice && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background z-50 flex flex-col"
                    >
                        <header className="p-4 flex items-center justify-between">
                            <h2 className="font-bold text-text-main">{t('revision.phases.recallVoice')}</h2>
                            <button
                                onClick={() => setShowVoice(false)}
                                className="p-2 text-text-muted hover:text-text-main"
                            >
                                <X size={24} />
                            </button>
                        </header>
                        <div className="flex-1">
                            <VoiceRecorder onComplete={handleVoiceComplete} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RevisionRecallPhase;
