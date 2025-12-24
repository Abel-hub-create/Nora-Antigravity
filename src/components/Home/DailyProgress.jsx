import React from 'react';
import { motion } from 'framer-motion';

const DailyProgress = ({ progress = 65 }) => {
    return (
        <div className="w-full mb-8">
            <div className="flex justify-between items-end mb-2">
                <h2 className="text-lg font-medium text-text-main">Objectif Quotidien</h2>
                <span className="text-2xl font-bold text-primary">{progress}%</span>
            </div>

            <div className="h-4 w-full bg-surface rounded-full overflow-hidden relative">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-primary/10" />

                {/* Progress Bar */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary-dark to-primary rounded-full relative"
                >
                    {/* Shine Effect */}
                    <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/30 blur-[2px]" />
                </motion.div>
            </div>

            <p className="text-xs text-text-muted mt-2 text-right">Continue comme ça ! Tu gères.</p>
        </div>
    );
};

export default DailyProgress;
