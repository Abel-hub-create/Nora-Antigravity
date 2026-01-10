import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coffee, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useRevisionTimer from '../../hooks/useRevisionTimer';

const RevisionPausePhase = ({ timeRemaining, onTimeUpdate, onComplete }) => {
    const { t } = useTranslation();

    // Timer hook
    const { formattedTime, timeRemaining: currentTime } = useRevisionTimer(
        timeRemaining,
        onComplete,
        true
    );

    // Update parent with current time
    useEffect(() => {
        onTimeUpdate(currentTime);
    }, [currentTime, onTimeUpdate]);

    // Calculate progress percentage
    const progress = ((300 - currentTime) / 300) * 100;

    return (
        <div className="min-h-full flex flex-col items-center justify-center p-6 text-center">
            {/* Animated Icon */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="relative mb-8"
            >
                {/* Progress ring */}
                <svg className="w-40 h-40 -rotate-90">
                    <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-surface"
                    />
                    <motion.circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        className="text-primary"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * progress) / 100}
                        transition={{ duration: 0.5 }}
                    />
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Coffee size={32} className="text-primary mb-2" />
                    <span className="text-3xl font-mono font-bold text-text-main">{formattedTime}</span>
                </div>
            </motion.div>

            {/* Title */}
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-text-main mb-3"
            >
                {t('revision.phases.pause')}
            </motion.h2>

            {/* Message */}
            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-text-muted max-w-xs"
            >
                {t('revision.phases.pauseMessage')}
            </motion.p>

            {/* Warning - Don't close page */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 bg-warning/10 border border-warning/30 rounded-xl p-4 max-w-xs"
            >
                <div className="flex items-center gap-2 text-warning text-sm font-medium">
                    <Clock size={16} />
                    <span>{t('revision.phases.pauseHint')}</span>
                </div>
                <p className="text-xs text-text-muted mt-2">
                    {t('revision.phases.pauseWarning')}
                </p>
            </motion.div>
        </div>
    );
};

export default RevisionPausePhase;
