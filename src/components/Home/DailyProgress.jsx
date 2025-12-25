import React from 'react';
import { motion } from 'framer-motion';
import { Check, Target, Trophy } from 'lucide-react';
import { useUser, ACTIVITY_TYPES } from '../../context/UserContext';

const DailyProgress = () => {
    const {
        dailyGoals,
        dailyProgressPercentage,
        dailyGoalsRewardClaimed,
        dailyStats
    } = useUser();

    const completedGoals = dailyGoals.filter(g => g.completed).length;
    const totalGoals = dailyGoals.length;

    // Get current time for each goal type
    const getTimeForType = (type) => {
        const timeKey = ACTIVITY_TYPES[type]?.key;
        if (!timeKey) return 0;
        return Math.floor((dailyStats[timeKey] || 0) / 60); // Convert to minutes
    };

    // Calculate individual goal progress percentage
    const getGoalProgress = (goal) => {
        const currentMinutes = getTimeForType(goal.type);
        return Math.min(100, Math.round((currentMinutes / goal.targetMinutes) * 100));
    };

    // Get motivational message based on progress
    const getMessage = () => {
        if (totalGoals === 0) return "Définissez des objectifs pour commencer !";
        if (dailyProgressPercentage === 100) return "Bravo ! Tous les objectifs complétés !";
        if (dailyProgressPercentage >= 75) return "Presque fini ! Tu y es presque !";
        if (dailyProgressPercentage >= 50) return "Super travail ! Continue comme ça !";
        if (dailyProgressPercentage >= 25) return "Bien parti ! Tu avances bien !";
        return "C'est parti ! Tu gères.";
    };

    return (
        <div className="w-full mb-8">
            {/* Header */}
            <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-medium text-text-main">Objectifs du Jour</h2>
                </div>
                <div className="flex items-center gap-2">
                    {dailyGoalsRewardClaimed && (
                        <Trophy className="w-5 h-5 text-yellow-400" />
                    )}
                    <span className="text-2xl font-bold text-primary">{dailyProgressPercentage}%</span>
                </div>
            </div>

            {/* Main Progress Bar */}
            <div className="h-4 w-full bg-surface rounded-full overflow-hidden relative mb-4">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-primary/10" />

                {/* Progress Bar */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${dailyProgressPercentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`h-full rounded-full relative ${
                        dailyProgressPercentage === 100
                            ? 'bg-gradient-to-r from-green-500 to-green-400'
                            : 'bg-gradient-to-r from-primary-dark to-primary'
                    }`}
                >
                    {/* Shine Effect */}
                    <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/30 blur-[2px]" />
                </motion.div>
            </div>

            {/* Goals Summary */}
            {totalGoals > 0 ? (
                <div className="space-y-3">
                    {/* Completed count */}
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-text-muted">
                            {completedGoals} sur {totalGoals} objectif{totalGoals > 1 ? 's' : ''} complété{completedGoals > 1 ? 's' : ''}
                        </span>
                        {dailyGoalsRewardClaimed && (
                            <span className="text-xs text-yellow-400 flex items-center gap-1">
                                +10 XP
                            </span>
                        )}
                    </div>

                    {/* Individual Goals */}
                    <div className="grid gap-2">
                        {dailyGoals.map((goal) => {
                            const currentMinutes = getTimeForType(goal.type);
                            const goalProgress = getGoalProgress(goal);

                            return (
                                <motion.div
                                    key={goal.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-3 rounded-xl transition-colors ${
                                        goal.completed
                                            ? 'bg-green-500/10 border border-green-500/20'
                                            : 'bg-surface/50 border border-white/5'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {goal.completed ? (
                                                <Check className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-text-muted" />
                                            )}
                                            <span className={`text-sm font-medium ${
                                                goal.completed ? 'text-green-400' : 'text-text-main'
                                            }`}>
                                                {ACTIVITY_TYPES[goal.type]?.label || goal.type}
                                            </span>
                                        </div>
                                        <span className={`text-xs ${
                                            goal.completed ? 'text-green-400' : 'text-text-muted'
                                        }`}>
                                            {currentMinutes}/{goal.targetMinutes} min
                                        </span>
                                    </div>

                                    {/* Mini progress bar for each goal */}
                                    <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${goalProgress}%` }}
                                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                            className={`h-full rounded-full ${
                                                goal.completed
                                                    ? 'bg-green-400'
                                                    : 'bg-primary/70'
                                            }`}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-4 bg-surface/30 rounded-xl border border-white/5">
                    <p className="text-sm text-text-muted">Aucun objectif défini</p>
                    <p className="text-xs text-text-muted mt-1">
                        Allez dans les paramètres pour ajouter des objectifs
                    </p>
                </div>
            )}

            {/* Motivational Message */}
            <p className="text-xs text-text-muted mt-3 text-right">{getMessage()}</p>
        </div>
    );
};

export default DailyProgress;
