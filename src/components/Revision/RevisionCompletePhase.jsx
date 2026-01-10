import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';

const RevisionCompletePhase = ({ iterationsCount, onFinish }) => {
    const { t } = useTranslation();

    // Launch confetti on mount
    useEffect(() => {
        // First burst
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#38bdf8', '#818cf8', '#34d399', '#fbbf24']
        });

        // Second burst after delay
        const timer = setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.7 },
                colors: ['#38bdf8', '#818cf8']
            });
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.7 },
                colors: ['#34d399', '#fbbf24']
            });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    // Get emoji based on iterations
    const getEmoji = () => {
        if (iterationsCount === 1) return '🏆';
        if (iterationsCount === 2) return '🎯';
        if (iterationsCount <= 3) return '💪';
        return '👏';
    };

    // Get message based on iterations
    const getMessage = () => {
        if (iterationsCount === 1) {
            return t('revision.complete.perfectMessage');
        }
        if (iterationsCount <= 3) {
            return t('revision.complete.goodMessage');
        }
        return t('revision.complete.doneMessage');
    };

    return (
        <div className="min-h-full flex flex-col items-center justify-center p-6 text-center">
            {/* Animated Trophy */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="relative mb-8"
            >
                {/* Glow effect */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-xl"
                />

                {/* Trophy container */}
                <div className="relative w-32 h-32 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-2xl shadow-primary/30">
                    <span className="text-5xl">{getEmoji()}</span>
                </div>

                {/* Checkmark badge */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-success rounded-full flex items-center justify-center border-4 border-background"
                >
                    <CheckCircle size={20} className="text-white" />
                </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-text-main mb-3"
            >
                {t('revision.phases.complete')}
            </motion.h1>

            {/* Message */}
            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-text-muted mb-2"
            >
                {t('revision.phases.completeMessage')}
            </motion.p>

            {/* Sub message */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-text-muted text-sm mb-8"
            >
                {getMessage()}
            </motion.p>

            {/* Iterations count */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-surface rounded-2xl px-6 py-4 mb-8"
            >
                <div className="flex items-center gap-3">
                    <Trophy size={24} className="text-primary" />
                    <div>
                        <div className="text-sm text-text-muted">{t('revision.complete.iterations')}</div>
                        <div className="text-xl font-bold text-text-main">{iterationsCount}</div>
                    </div>
                </div>
            </motion.div>

            {/* Finish Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={onFinish}
                className="w-full max-w-xs py-4 bg-primary text-white rounded-xl font-medium text-lg hover:bg-primary-dark transition-colors"
            >
                {t('revision.phases.completeButton')}
            </motion.button>
        </div>
    );
};

export default RevisionCompletePhase;
