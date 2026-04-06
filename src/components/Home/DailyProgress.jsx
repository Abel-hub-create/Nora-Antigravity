import React from 'react';
import { motion } from 'framer-motion';
import { Check, Target, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser, ACTIVITY_TYPES } from '../../context/UserContext';
import LiquidProgressBar from '../UI/LiquidProgressBar';
import AnimatedNumber from '../UI/AnimatedNumber';

const DailyProgress = () => {
    const { t } = useTranslation();
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
        if (totalGoals === 0) return t('dailyProgress.messages.noGoals');
        if (dailyProgressPercentage === 100) return t('dailyProgress.messages.allComplete');
        if (dailyProgressPercentage >= 75) return t('dailyProgress.messages.almost');
        if (dailyProgressPercentage >= 50) return t('dailyProgress.messages.great');
        if (dailyProgressPercentage >= 25) return t('dailyProgress.messages.good');
        return t('dailyProgress.messages.start');
    };

    return (
        <div className="w-full mb-8">
            {/* Header */}
            <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-medium text-text-main">{t('dailyProgress.title')}</h2>
                </div>
                <div className="flex items-center gap-2">
                    {dailyGoalsRewardClaimed && (
                        <Trophy className="w-5 h-5 text-yellow-400" />
                    )}
                    <span className="text-2xl font-bold text-primary"><AnimatedNumber value={dailyProgressPercentage} />%</span>
                </div>
            </div>

            {/* Main Progress Bar */}
            <LiquidProgressBar
                progress={dailyProgressPercentage}
                height={16}
                completed={dailyProgressPercentage === 100}
                className="w-full mb-4"
            />

            {/* Goals Summary */}
            {totalGoals > 0 ? (
                <div className="space-y-3">
                    {/* Completed count */}
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-text-muted">
                            {totalGoals > 1
                                ? t('dailyProgress.goalsCompletedPlural', { completed: completedGoals, total: totalGoals })
                                : t('dailyProgress.goalsCompleted', { completed: completedGoals, total: totalGoals })}
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
                                            ? 'bg-green-500/10 border border-green-500/30'
                                            : 'bg-surface/50 border border-white/20'
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
                                                {t(ACTIVITY_TYPES[goal.type]?.labelKey) || goal.type}
                                            </span>
                                        </div>
                                        <span className={`text-xs ${
                                            goal.completed ? 'text-green-400' : 'text-text-muted'
                                        }`}>
                                            <AnimatedNumber value={currentMinutes} duration={900} />/{goal.targetMinutes} {t('common.min')}
                                        </span>
                                    </div>

                                    {/* Mini liquid progress bar for each goal */}
                                    <LiquidProgressBar
                                        progress={goalProgress}
                                        height={8}
                                        completed={goal.completed}
                                        className="w-full"
                                    />
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-4 bg-surface/30 rounded-xl border border-white/5">
                    <p className="text-sm text-text-muted">{t('dailyProgress.noGoals')}</p>
                    <p className="text-xs text-text-muted mt-1">
                        {t('dailyProgress.addGoalsHintSettings')}
                    </p>
                </div>
            )}

            {/* Motivational Message */}
            <p className="text-xs text-text-muted mt-3 text-right">{getMessage()}</p>
        </div>
    );
};

export default DailyProgress;
