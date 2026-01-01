import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import * as notificationService from '../services/notificationService';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

// Available activity types for goals
export const ACTIVITY_TYPES = {
    summary: { label: 'Synthèse', key: 'summaryTime' },
    quiz: { label: 'Quiz', key: 'quizTime' },
    flashcards: { label: 'Flashcards', key: 'flashcardsTime' }
};

// XP Thresholds for daily study time rewards
export const XP_THRESHOLDS = {
    flashcards: { timeMinutes: 10, xp: 40 },
    quiz: { timeMinutes: 20, xp: 70 },
    summary: { timeMinutes: 30, xp: 100 }
};

// Bonus XP when all thresholds are reached
export const ALL_BONUS_XP = 100;

// Daily goals completion bonus
export const DAILY_GOALS_BONUS_XP = 10;

// Helper to get today's date string
const getTodayString = () => new Date().toDateString();

// Helper to load from localStorage with default value
const loadFromStorage = (key, defaultValue) => {
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error(`Error loading ${key} from localStorage:`, e);
    }
    return defaultValue;
};

// Helper to save to localStorage
const saveToStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
    }
};

// Default daily stats
const getDefaultDailyStats = () => ({
    date: getTodayString(),
    quizTime: 0,
    flashcardsTime: 0,
    summaryTime: 0,
    xpAwarded: {
        quiz: false,
        flashcards: false,
        summary: false,
        allBonus: false
    }
});

// Default daily goals
const getDefaultDailyGoals = () => [
    { id: 1, type: 'summary', targetMinutes: 30, completed: false },
    { id: 2, type: 'quiz', targetMinutes: 20, completed: false }
];

// Calculate total study time from daily stats (in seconds)
const getTotalStudyTime = (stats) => {
    return (stats.quizTime || 0) + (stats.flashcardsTime || 0) + (stats.summaryTime || 0);
};

export const UserProvider = ({ children }) => {
    const { user: authUser, syncUserData } = useAuth();

    const [user, setUser] = useState({
        id: authUser?.id || null,
        email: authUser?.email || null,
        name: authUser?.name || "Utilisateur",
        level: authUser?.level || 1,
        exp: authUser?.exp || 0,
        nextLevelExp: authUser?.next_level_exp || 1000,
        streak: authUser?.streak || 0,
        eggs: authUser?.eggs || 0,
        collection: authUser?.collection || []
    });

    // Sync with auth user on mount and when authUser changes
    useEffect(() => {
        if (authUser) {
            setUser(prev => ({
                ...prev,
                id: authUser.id,
                email: authUser.email,
                name: authUser.name,
                level: authUser.level || prev.level,
                exp: authUser.exp || prev.exp,
                nextLevelExp: authUser.next_level_exp || prev.nextLevelExp,
                streak: authUser.streak || prev.streak,
                eggs: authUser.eggs || prev.eggs,
                collection: authUser.collection || prev.collection
            }));
        }
    }, [authUser]);

    // Daily Stats State - Load from localStorage or use defaults
    const [dailyStats, setDailyStats] = useState(() => {
        const stored = loadFromStorage('nora_dailyStats', null);
        if (stored && stored.date === getTodayString()) {
            return stored;
        }
        return getDefaultDailyStats();
    });

    // Daily Goals State - Load from localStorage or use defaults
    const [dailyGoals, setDailyGoalsState] = useState(() => {
        const stored = loadFromStorage('nora_dailyGoals', null);
        if (stored) {
            // Reset completed status if it's a new day
            const statsDate = loadFromStorage('nora_dailyStats', {})?.date;
            if (statsDate !== getTodayString()) {
                return stored.map(g => ({ ...g, completed: false }));
            }
            return stored;
        }
        return getDefaultDailyGoals();
    });

    // Track if daily goals reward has been claimed today
    const [dailyGoalsRewardClaimed, setDailyGoalsRewardClaimed] = useState(() => {
        const stored = loadFromStorage('nora_dailyGoalsRewardClaimed', null);
        if (stored && stored.date === getTodayString()) {
            return stored.claimed;
        }
        return false;
    });

    // Study history - stores total study time per day for average calculation
    // Format: [{ date: "Mon Dec 30 2024", totalSeconds: 3600 }, ...]
    const [studyHistory, setStudyHistory] = useState(() => {
        return loadFromStorage('nora_studyHistory', []);
    });

    // Notifications state for goal completions and XP gains
    const [notifications, setNotifications] = useState([]);
    const notificationIdRef = useRef(0);

    // Add notification helper
    const addNotification = useCallback((message, type = 'success') => {
        const id = ++notificationIdRef.current;
        setNotifications(prev => [...prev, { id, message, type }]);
        // Auto-remove after 4 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    }, []);

    // Remove a specific notification
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Persist dailyStats to localStorage
    useEffect(() => {
        saveToStorage('nora_dailyStats', dailyStats);
    }, [dailyStats]);

    // Persist dailyGoals to localStorage
    useEffect(() => {
        saveToStorage('nora_dailyGoals', dailyGoals);
    }, [dailyGoals]);

    // Persist dailyGoalsRewardClaimed to localStorage
    useEffect(() => {
        saveToStorage('nora_dailyGoalsRewardClaimed', {
            date: getTodayString(),
            claimed: dailyGoalsRewardClaimed
        });
    }, [dailyGoalsRewardClaimed]);

    // Persist studyHistory to localStorage
    useEffect(() => {
        saveToStorage('nora_studyHistory', studyHistory);
    }, [studyHistory]);

    // Sync daily progress to backend for notification eligibility
    useEffect(() => {
        // Only sync if user is authenticated
        if (!authUser?.id) return;

        // Calculate progress percentage
        const progressPercentage = dailyGoals.length > 0
            ? Math.round((dailyGoals.filter(g => g.completed).length / dailyGoals.length) * 100)
            : 0;

        // Debounce sync to avoid too many requests
        const syncTimer = setTimeout(async () => {
            try {
                await notificationService.syncDailyProgress(
                    dailyGoals,
                    progressPercentage,
                    dailyGoalsRewardClaimed
                );
            } catch (error) {
                // Silently fail - notification sync is not critical
                console.debug('Failed to sync daily progress:', error);
            }
        }, 2000);

        return () => clearTimeout(syncTimer);
    }, [authUser?.id, dailyGoals, dailyGoalsRewardClaimed]);

    // Check for day change - robust implementation with interval
    const checkAndResetForNewDay = useCallback(() => {
        const today = getTodayString();

        if (dailyStats.date !== today) {
            console.log('[NORA] New day detected, resetting daily stats');

            // Save yesterday's study time to history before resetting
            const totalSeconds = getTotalStudyTime(dailyStats);
            if (totalSeconds > 0) {
                setStudyHistory(prev => {
                    // Check if this day already exists in history
                    const existingIndex = prev.findIndex(h => h.date === dailyStats.date);
                    if (existingIndex >= 0) {
                        // Update existing entry
                        const updated = [...prev];
                        updated[existingIndex] = { date: dailyStats.date, totalSeconds };
                        return updated;
                    }
                    // Add new entry, keep last 30 days
                    const newHistory = [...prev, { date: dailyStats.date, totalSeconds }];
                    return newHistory.slice(-30);
                });
            }

            // Reset daily stats
            setDailyStats(getDefaultDailyStats());

            // Reset daily goals completion status
            setDailyGoalsState(prev => prev.map(g => ({ ...g, completed: false })));

            // Reset daily goals reward claimed status
            setDailyGoalsRewardClaimed(false);

            return true;
        }
        return false;
    }, [dailyStats]);

    // Check for day change on mount and set up interval
    useEffect(() => {
        // Check immediately
        checkAndResetForNewDay();

        // Check every minute for day change
        const interval = setInterval(() => {
            checkAndResetForNewDay();
        }, 60000);

        // Also check when visibility changes (user comes back to app)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkAndResetForNewDay();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkAndResetForNewDay]);

    // Sync user data to backend periodically
    const syncToBackend = useCallback(async (userData) => {
        if (syncUserData && authUser?.id) {
            try {
                await syncUserData({
                    level: userData.level,
                    exp: userData.exp,
                    next_level_exp: userData.nextLevelExp,
                    streak: userData.streak,
                    eggs: userData.eggs,
                    collection: userData.collection
                });
            } catch (error) {
                console.error('Failed to sync user data:', error);
            }
        }
    }, [syncUserData, authUser?.id]);

    const addExp = useCallback((amount, showNotification = false, notificationMessage = '') => {
        setUser(prev => {
            let newExp = prev.exp + amount;
            let newLevel = prev.level;
            let newEggs = prev.eggs;
            let newNextLevelExp = prev.nextLevelExp;

            while (newExp >= newNextLevelExp) {
                newExp -= newNextLevelExp;
                newLevel += 1;
                newEggs += 1;
                newNextLevelExp = Math.floor(newNextLevelExp * 1.2);
            }

            const newUser = {
                ...prev,
                level: newLevel,
                exp: newExp,
                eggs: newEggs,
                nextLevelExp: newNextLevelExp
            };

            // Sync to backend
            syncToBackend(newUser);

            return newUser;
        });

        // Show notification if requested
        if (showNotification && notificationMessage) {
            addNotification(notificationMessage, 'xp');
        }
    }, [syncToBackend, addNotification]);

    const updateTime = useCallback((activityType, seconds) => {
        // First check if it's a new day
        const today = getTodayString();
        if (dailyStats.date !== today) {
            checkAndResetForNewDay();
            return; // Don't update time, will be called again on next tick
        }

        // Store the updated time values for goal checking
        let updatedTimes = {
            quizTime: dailyStats.quizTime,
            flashcardsTime: dailyStats.flashcardsTime,
            summaryTime: dailyStats.summaryTime
        };

        setDailyStats(prev => {
            const newStats = { ...prev };

            if (activityType === 'quiz') newStats.quizTime += seconds;
            if (activityType === 'flashcards') newStats.flashcardsTime += seconds;
            if (activityType === 'summary') newStats.summaryTime += seconds;

            // Update the times for goal checking
            updatedTimes = {
                quizTime: newStats.quizTime,
                flashcardsTime: newStats.flashcardsTime,
                summaryTime: newStats.summaryTime
            };

            // Check XP Thresholds and award XP
            const timeKey = `${activityType}Time`;
            const threshold = XP_THRESHOLDS[activityType];

            if (threshold && !newStats.xpAwarded[activityType]) {
                const timeInSeconds = newStats[timeKey];
                const thresholdInSeconds = threshold.timeMinutes * 60;

                if (timeInSeconds >= thresholdInSeconds) {
                    newStats.xpAwarded[activityType] = true;
                    const label = ACTIVITY_TYPES[activityType]?.label || activityType;
                    // Use setTimeout to call addExp outside of setState
                    setTimeout(() => {
                        addExp(threshold.xp, true, `+${threshold.xp} XP - ${label} (${threshold.timeMinutes}min)`);
                    }, 0);
                }
            }

            // Check All Bonus (100 XP) - awarded when all three thresholds are reached
            if (!newStats.xpAwarded.allBonus &&
                newStats.xpAwarded.flashcards &&
                newStats.xpAwarded.quiz &&
                newStats.xpAwarded.summary) {
                newStats.xpAwarded.allBonus = true;
                setTimeout(() => {
                    addExp(ALL_BONUS_XP, true, `+${ALL_BONUS_XP} XP - Bonus journalier complet !`);
                }, 100);
            }

            return newStats;
        });

        // Update Daily Goals Progress with notifications
        setDailyGoalsState(prev => {
            const goalsToNotify = [];

            const updatedGoals = prev.map(goal => {
                if (goal.completed) return goal;

                // Get current time for this goal's activity type
                const timeKey = ACTIVITY_TYPES[goal.type]?.key;
                if (!timeKey) return goal;

                // Use the updated time values
                const currentTime = updatedTimes[timeKey] || 0;

                // Check if goal is now completed
                if (currentTime >= goal.targetMinutes * 60) {
                    goalsToNotify.push(goal.type);
                    return { ...goal, completed: true };
                }
                return goal;
            });

            // Show notifications outside of setState
            goalsToNotify.forEach(type => {
                const label = ACTIVITY_TYPES[type]?.label || type;
                setTimeout(() => addNotification(`Objectif "${label}" complété !`, 'goal'), 0);
            });

            return updatedGoals;
        });
    }, [dailyStats, checkAndResetForNewDay, addExp, addNotification]);

    // Check Daily Goals Completion Bonus (10 XP) - only once per day
    useEffect(() => {
        // Only award if:
        // 1. There are goals defined
        // 2. All goals are completed
        // 3. Reward hasn't been claimed today
        if (dailyGoals.length > 0 &&
            dailyGoals.every(g => g.completed) &&
            !dailyGoalsRewardClaimed) {
            setDailyGoalsRewardClaimed(true);
            addExp(DAILY_GOALS_BONUS_XP, true, `+${DAILY_GOALS_BONUS_XP} XP - Tous les objectifs complétés !`);
        }
    }, [dailyGoals, dailyGoalsRewardClaimed, addExp]);

    // Function to update daily goals with reset of progress
    const updateDailyGoals = useCallback((newGoals, skipWarning = false) => {
        const resetGoals = newGoals.map((goal, index) => ({
            ...goal,
            id: goal.id || index + 1,
            completed: false
        }));
        setDailyGoalsState(resetGoals);
    }, []);

    // Add a new goal
    const addDailyGoal = useCallback((type, targetMinutes) => {
        setDailyGoalsState(prev => {
            if (prev.some(g => g.type === type)) {
                addNotification('Un objectif de ce type existe déjà', 'warning');
                return prev;
            }
            const newId = Math.max(...prev.map(g => g.id), 0) + 1;
            const newGoals = [...prev, { id: newId, type, targetMinutes, completed: false }];
            return newGoals.map(g => ({ ...g, completed: false }));
        });
    }, [addNotification]);

    // Remove a goal
    const removeDailyGoal = useCallback((goalId) => {
        setDailyGoalsState(prev => {
            const newGoals = prev.filter(g => g.id !== goalId);
            return newGoals.map(g => ({ ...g, completed: false }));
        });
    }, []);

    // Update a specific goal's target time
    const updateGoalTarget = useCallback((goalId, newTargetMinutes) => {
        setDailyGoalsState(prev => {
            return prev.map(g => {
                if (g.id === goalId) {
                    return { ...g, targetMinutes: newTargetMinutes, completed: false };
                }
                return { ...g, completed: false };
            });
        });
    }, []);

    // Calculate daily progress percentage based on completed goals
    const dailyProgressPercentage = dailyGoals.length > 0
        ? Math.round((dailyGoals.filter(g => g.completed).length / dailyGoals.length) * 100)
        : 0;

    // Get formatted study times (in minutes)
    const getStudyTimeMinutes = useCallback((activityType) => {
        const timeKey = ACTIVITY_TYPES[activityType]?.key;
        if (!timeKey) return 0;
        return Math.floor(dailyStats[timeKey] / 60);
    }, [dailyStats]);

    // Get XP progress for an activity type (percentage to threshold)
    const getXpProgress = useCallback((activityType) => {
        const threshold = XP_THRESHOLDS[activityType];
        if (!threshold) return 0;

        const timeKey = ACTIVITY_TYPES[activityType]?.key;
        if (!timeKey) return 0;

        const currentMinutes = dailyStats[timeKey] / 60;
        return Math.min(100, (currentMinutes / threshold.timeMinutes) * 100);
    }, [dailyStats]);

    // Get average daily study time in minutes (includes today)
    const getAverageDailyStudyTime = useCallback(() => {
        // Include today's time in the calculation
        const todaySeconds = getTotalStudyTime(dailyStats);

        // If no history and no time today, return 0
        if (studyHistory.length === 0 && todaySeconds === 0) {
            return 0;
        }

        // Calculate total from history
        const historyTotal = studyHistory.reduce((sum, day) => sum + day.totalSeconds, 0);

        // Total days = history days + today (if there's time today)
        const totalDays = studyHistory.length + (todaySeconds > 0 ? 1 : 0);

        if (totalDays === 0) return 0;

        const averageSeconds = (historyTotal + todaySeconds) / totalDays;
        return Math.round(averageSeconds / 60); // Return in minutes
    }, [dailyStats, studyHistory]);

    const unlockCreature = useCallback((creatureId) => {
        setUser(prev => {
            if (!prev.collection.includes(creatureId)) {
                const newUser = { ...prev, collection: [...prev.collection, creatureId] };
                syncToBackend(newUser);
                return newUser;
            }
            return prev;
        });
    }, [syncToBackend]);

    const useEgg = useCallback(() => {
        if (user.eggs > 0) {
            setUser(prev => {
                const newUser = { ...prev, eggs: prev.eggs - 1 };
                syncToBackend(newUser);
                return newUser;
            });
            return true;
        }
        return false;
    }, [user.eggs, syncToBackend]);

    return (
        <UserContext.Provider value={{
            user,
            addExp,
            unlockCreature,
            useEgg,
            dailyStats,
            dailyGoals,
            dailyProgressPercentage,
            dailyGoalsRewardClaimed,
            updateDailyGoals,
            addDailyGoal,
            removeDailyGoal,
            updateGoalTarget,
            updateTime,
            getStudyTimeMinutes,
            getXpProgress,
            getAverageDailyStudyTime,
            notifications,
            addNotification,
            removeNotification,
            XP_THRESHOLDS,
            ALL_BONUS_XP
        }}>
            {children}
        </UserContext.Provider>
    );
};
