import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/hooks/useAuth';
import * as notificationService from '../services/notificationService';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

// Available activity types for goals
// NOTE: labelKey is used with t() function for translation
export const ACTIVITY_TYPES = {
    summary: { label: 'Synthèse', labelKey: 'activities.summary', key: 'summaryTime' },
    quiz: { label: 'Quiz', labelKey: 'activities.quiz', key: 'quizTime' },
    flashcards: { label: 'Flashcards', labelKey: 'activities.flashcards', key: 'flashcardsTime' }
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
    const { t } = useTranslation();
    const { user: authUser, syncUserData } = useAuth();

    // Track if initial data has been loaded from backend
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const [user, setUser] = useState({
        id: authUser?.id ?? null,
        email: authUser?.email ?? null,
        name: authUser?.name ?? null,
        level: authUser?.level ?? 1,
        exp: authUser?.exp ?? 0,
        nextLevelExp: authUser?.next_level_exp ?? 1000,
        streak: authUser?.streak ?? 0,
        eggs: authUser?.eggs ?? 0,
        collection: authUser?.collection ?? []
    });

    // Track the current user ID to detect user changes
    const currentUserIdRef = useRef(authUser?.id ?? null);

    // Sync with auth user when authUser changes (data from DB)
    useEffect(() => {
        if (authUser) {
            setUser({
                id: authUser.id,
                email: authUser.email,
                name: authUser.name,
                level: authUser.level ?? 1,
                exp: authUser.exp ?? 0,
                nextLevelExp: authUser.next_level_exp ?? 1000,
                streak: authUser.streak ?? 0,
                eggs: authUser.eggs ?? 0,
                collection: authUser.collection ?? []
            });
        }
    }, [authUser]);

    // Daily Stats State - Initialize with defaults, loaded from backend
    const [dailyStats, setDailyStats] = useState(getDefaultDailyStats);

    // Daily Goals State - Initialize with defaults, loaded from backend
    const [dailyGoals, setDailyGoalsState] = useState(getDefaultDailyGoals);

    // Track if daily goals reward has been claimed today
    const [dailyGoalsRewardClaimed, setDailyGoalsRewardClaimed] = useState(false);

    // Study history - stores total study time per day for average calculation
    const [studyHistory, setStudyHistory] = useState([]);

    // Track if this is the first load for this user (vs page refresh)
    const isFirstLoadRef = useRef(true);

    // Load data from backend when user changes OR on initial mount
    useEffect(() => {
        const newUserId = authUser?.id ?? null;
        const previousUserId = currentUserIdRef.current;
        const userChanged = newUserId !== previousUserId;
        const needsInitialLoad = !isDataLoaded && newUserId;

        console.log(`[NORA] useEffect - userId: ${newUserId}, prev: ${previousUserId}, isDataLoaded: ${isDataLoaded}, needsLoad: ${userChanged || needsInitialLoad}`);

        // Load if user changed OR if data not loaded yet (initial mount/refresh)
        if (userChanged || needsInitialLoad) {
            console.log(`[NORA] Loading data - reason: ${userChanged ? 'user changed' : 'initial load'}`);
            currentUserIdRef.current = newUserId;

            if (newUserId) {
                // Load all data from backend (DB is the only source of truth)
                const loadData = async (retryCount = 0) => {
                    try {
                        const backendData = await notificationService.getDailyProgress();
                        console.log('[NORA] Loaded data from backend:', backendData);

                        // Use backend data for dailyStats (or defaults if not today)
                        if (backendData.dailyStats) {
                            setDailyStats(backendData.dailyStats);
                        } else {
                            setDailyStats(getDefaultDailyStats());
                        }

                        // Use backend data for dailyGoals
                        if (backendData.dailyGoals && backendData.dailyGoals.length > 0) {
                            console.log('[NORA] Setting goals from backend:', backendData.dailyGoals);
                            setDailyGoalsState(backendData.dailyGoals);
                        } else {
                            // Only set defaults for new users with no data
                            console.log('[NORA] No goals in backend, using defaults');
                            setDailyGoalsState(getDefaultDailyGoals());
                        }

                        // Set reward claimed status
                        setDailyGoalsRewardClaimed(backendData.dailyGoalsRewardClaimed || false);

                        // Set study history
                        if (backendData.studyHistory && backendData.studyHistory.length > 0) {
                            setStudyHistory(backendData.studyHistory);
                        } else {
                            setStudyHistory([]);
                        }

                        setIsDataLoaded(true);
                    } catch (error) {
                        console.error('[NORA] Failed to load data from backend:', error);

                        // Retry up to 2 times with exponential backoff
                        if (retryCount < 2) {
                            console.log(`[NORA] Retrying load (attempt ${retryCount + 2})...`);
                            setTimeout(() => loadData(retryCount + 1), 1000 * (retryCount + 1));
                            return;
                        }

                        // After retries failed, use defaults
                        setDailyStats(getDefaultDailyStats());
                        setDailyGoalsState(getDefaultDailyGoals());
                        setDailyGoalsRewardClaimed(false);
                        setStudyHistory([]);
                        setIsDataLoaded(true);
                    }
                };

                loadData();
            } else {
                // No user, reset to defaults
                setDailyStats(getDefaultDailyStats());
                setDailyGoalsState(getDefaultDailyGoals());
                setDailyGoalsRewardClaimed(false);
                setStudyHistory([]);
                setIsDataLoaded(true);
            }
        }
    }, [authUser?.id, isDataLoaded]);

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

    // Sync daily progress to backend immediately
    const syncDailyProgressToBackend = useCallback(async (goals, stats, rewardClaimed) => {
        if (!authUser?.id) {
            console.log('[NORA] Cannot sync: no user ID');
            return false;
        }

        const progressPercentage = goals.length > 0
            ? Math.round((goals.filter(g => g.completed).length / goals.length) * 100)
            : 0;

        console.log('[NORA] Syncing to backend:', { goals, progressPercentage, rewardClaimed });

        try {
            await notificationService.syncDailyProgress(
                goals,
                progressPercentage,
                rewardClaimed,
                stats
            );
            console.log('[NORA] Sync SUCCESS - goals saved to database');
            return true;
        } catch (error) {
            console.error('[NORA] Sync FAILED:', error);
            return false;
        }
    }, [authUser?.id]);

    // Debounced sync for automatic updates (study time changes)
    useEffect(() => {
        if (!authUser?.id || !isDataLoaded) return;

        const progressPercentage = dailyGoals.length > 0
            ? Math.round((dailyGoals.filter(g => g.completed).length / dailyGoals.length) * 100)
            : 0;

        const syncTimer = setTimeout(async () => {
            try {
                await notificationService.syncDailyProgress(
                    dailyGoals,
                    progressPercentage,
                    dailyGoalsRewardClaimed,
                    dailyStats
                );
            } catch (error) {
                console.debug('Failed to sync daily progress:', error);
            }
        }, 2000);

        return () => clearTimeout(syncTimer);
    }, [authUser?.id, dailyGoals, dailyGoalsRewardClaimed, dailyStats, isDataLoaded]);

    // Check for day change - robust implementation with interval
    const checkAndResetForNewDay = useCallback(() => {
        const today = getTodayString();

        if (dailyStats.date !== today) {
            console.log('[NORA] New day detected, resetting daily stats');

            // Save yesterday's study time to history before resetting
            const totalSeconds = getTotalStudyTime(dailyStats);
            if (totalSeconds > 0) {
                // Save to backend
                const yesterdayDate = new Date(dailyStats.date).toISOString().split('T')[0];
                notificationService.saveStudyHistory(yesterdayDate, totalSeconds).catch(err => {
                    console.debug('Failed to save study history to backend:', err);
                });

                setStudyHistory(prev => {
                    const existingIndex = prev.findIndex(h => h.date === dailyStats.date);
                    if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = { date: dailyStats.date, totalSeconds };
                        return updated;
                    }
                    const newHistory = [...prev, { date: dailyStats.date, totalSeconds }];
                    return newHistory.slice(-30);
                });
            }

            // Reset daily stats
            const newStats = getDefaultDailyStats();
            setDailyStats(newStats);

            // Reset daily goals completion status
            const resetGoals = dailyGoals.map(g => ({ ...g, completed: false }));
            setDailyGoalsState(resetGoals);

            // Reset daily goals reward claimed status
            setDailyGoalsRewardClaimed(false);

            // Sync reset state to backend
            syncDailyProgressToBackend(resetGoals, newStats, false);

            return true;
        }
        return false;
    }, [dailyStats, dailyGoals, syncDailyProgressToBackend]);

    // Check for day change on mount and set up interval
    useEffect(() => {
        if (!isDataLoaded) return;

        checkAndResetForNewDay();

        const interval = setInterval(() => {
            checkAndResetForNewDay();
        }, 60000);

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
    }, [checkAndResetForNewDay, isDataLoaded]);

    // Sync user data to backend
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

        if (showNotification && notificationMessage) {
            addNotification(notificationMessage, 'xp');
        }
    }, [syncToBackend, addNotification]);

    const updateTime = useCallback((activityType, seconds) => {
        const today = getTodayString();
        if (dailyStats.date !== today) {
            checkAndResetForNewDay();
            return;
        }

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
                    const labelKey = ACTIVITY_TYPES[activityType]?.labelKey;
                    const label = labelKey ? t(labelKey) : activityType;
                    setTimeout(() => {
                        addExp(threshold.xp, true, t('notifications.xpGained', { amount: threshold.xp, label, time: threshold.timeMinutes }));
                    }, 0);
                }
            }

            // Check All Bonus
            if (!newStats.xpAwarded.allBonus &&
                newStats.xpAwarded.flashcards &&
                newStats.xpAwarded.quiz &&
                newStats.xpAwarded.summary) {
                newStats.xpAwarded.allBonus = true;
                setTimeout(() => {
                    addExp(ALL_BONUS_XP, true, t('notifications.dailyBonusComplete', { amount: ALL_BONUS_XP }));
                }, 100);
            }

            return newStats;
        });

        // Update Daily Goals Progress
        setDailyGoalsState(prev => {
            const goalsToNotify = [];

            const updatedGoals = prev.map(goal => {
                if (goal.completed) return goal;

                const timeKey = ACTIVITY_TYPES[goal.type]?.key;
                if (!timeKey) return goal;

                const currentTime = updatedTimes[timeKey] || 0;

                if (currentTime >= goal.targetMinutes * 60) {
                    goalsToNotify.push(goal.type);
                    return { ...goal, completed: true };
                }
                return goal;
            });

            goalsToNotify.forEach(type => {
                const labelKey = ACTIVITY_TYPES[type]?.labelKey;
                const label = labelKey ? t(labelKey) : type;
                setTimeout(() => addNotification(t('notifications.goalCompleted', { label }), 'goal'), 0);
            });

            return updatedGoals;
        });
    }, [dailyStats, checkAndResetForNewDay, addExp, addNotification, t]);

    // Check Daily Goals Completion Bonus (10 XP) - only once per day
    useEffect(() => {
        if (dailyGoals.length > 0 &&
            dailyGoals.every(g => g.completed) &&
            !dailyGoalsRewardClaimed) {
            setDailyGoalsRewardClaimed(true);
            addExp(DAILY_GOALS_BONUS_XP, true, t('notifications.allGoalsCompleted', { amount: DAILY_GOALS_BONUS_XP }));
        }
    }, [dailyGoals, dailyGoalsRewardClaimed, addExp, t]);

    // Function to update daily goals with reset of progress
    const updateDailyGoals = useCallback((newGoals, skipWarning = false) => {
        const resetGoals = newGoals.map((goal, index) => ({
            ...goal,
            id: goal.id || index + 1,
            completed: false
        }));
        setDailyGoalsState(resetGoals);
        // Sync immediately to backend
        syncDailyProgressToBackend(resetGoals, dailyStats, dailyGoalsRewardClaimed);
    }, [syncDailyProgressToBackend, dailyStats, dailyGoalsRewardClaimed]);

    // Add a new goal
    const addDailyGoal = useCallback((type, targetMinutes) => {
        setDailyGoalsState(prev => {
            if (prev.some(g => g.type === type)) {
                addNotification(t('settings.goalExists'), 'warning');
                return prev;
            }
            const newId = Math.max(...prev.map(g => g.id), 0) + 1;
            const newGoals = [...prev, { id: newId, type, targetMinutes, completed: false }];
            const resetGoals = newGoals.map(g => ({ ...g, completed: false }));
            // Sync immediately to backend
            syncDailyProgressToBackend(resetGoals, dailyStats, dailyGoalsRewardClaimed);
            return resetGoals;
        });
    }, [addNotification, t, syncDailyProgressToBackend, dailyStats, dailyGoalsRewardClaimed]);

    // Remove a goal
    const removeDailyGoal = useCallback((goalId) => {
        setDailyGoalsState(prev => {
            const newGoals = prev.filter(g => g.id !== goalId);
            const resetGoals = newGoals.map(g => ({ ...g, completed: false }));
            // Sync immediately to backend
            syncDailyProgressToBackend(resetGoals, dailyStats, dailyGoalsRewardClaimed);
            return resetGoals;
        });
    }, [syncDailyProgressToBackend, dailyStats, dailyGoalsRewardClaimed]);

    // Update a specific goal's target time
    const updateGoalTarget = useCallback((goalId, newTargetMinutes) => {
        setDailyGoalsState(prev => {
            const updatedGoals = prev.map(g => {
                if (g.id === goalId) {
                    return { ...g, targetMinutes: newTargetMinutes, completed: false };
                }
                return { ...g, completed: false };
            });
            // Sync immediately to backend
            syncDailyProgressToBackend(updatedGoals, dailyStats, dailyGoalsRewardClaimed);
            return updatedGoals;
        });
    }, [syncDailyProgressToBackend, dailyStats, dailyGoalsRewardClaimed]);

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
        const todaySeconds = getTotalStudyTime(dailyStats);

        if (studyHistory.length === 0 && todaySeconds === 0) {
            return 0;
        }

        const historyTotal = studyHistory.reduce((sum, day) => sum + day.totalSeconds, 0);
        const totalDays = studyHistory.length + (todaySeconds > 0 ? 1 : 0);

        if (totalDays === 0) return 0;

        const averageSeconds = (historyTotal + todaySeconds) / totalDays;
        return Math.round(averageSeconds / 60);
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
