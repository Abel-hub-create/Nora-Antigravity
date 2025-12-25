import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

// Available activity types for goals
export const ACTIVITY_TYPES = {
    summary: { label: 'Synthèse', key: 'summaryTime' },
    quiz: { label: 'Quiz', key: 'quizTime' },
    flashcards: { label: 'Flashcards', key: 'flashcardsTime' }
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

    // Daily Stats State
    const [dailyStats, setDailyStats] = useState({
        date: new Date().toDateString(),
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

    // Daily Goals State - Multiple customizable goals
    const [dailyGoals, setDailyGoalsState] = useState([
        { id: 1, type: 'summary', targetMinutes: 30, completed: false },
        { id: 2, type: 'quiz', targetMinutes: 20, completed: false }
    ]);

    // Track if daily goals reward has been claimed today (separate from goals completion)
    // This persists even if user modifies goals after claiming reward
    const [dailyGoalsRewardClaimed, setDailyGoalsRewardClaimed] = useState(false);

    // Notifications state for goal completions
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

    // Check for day change - Reset daily stats and goals completion
    useEffect(() => {
        const today = new Date().toDateString();
        if (dailyStats.date !== today) {
            setDailyStats({
                date: today,
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
            // Reset daily goals completion status
            setDailyGoalsState(prev => prev.map(g => ({ ...g, completed: false })));
            // Reset daily goals reward claimed status for new day
            setDailyGoalsRewardClaimed(false);
        }
    }, [dailyStats.date]);

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

    const addExp = useCallback((amount) => {
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
    }, [syncToBackend]);

    const updateTime = useCallback((activityType, seconds) => {
        const today = new Date().toDateString();
        if (dailyStats.date !== today) return;

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

            // Check XP Thresholds
            const thresholds = {
                flashcards: { time: 10 * 60, xp: 40 },
                quiz: { time: 20 * 60, xp: 70 },
                summary: { time: 30 * 60, xp: 100 }
            };

            // Award XP for specific activity
            if (activityType in thresholds && !newStats.xpAwarded[activityType]) {
                const type = activityType;
                if (newStats[`${type}Time`] >= thresholds[type].time) {
                    newStats.xpAwarded[type] = true;
                    addExp(thresholds[type].xp);
                }
            }

            // Check All Bonus (100 XP)
            if (!newStats.xpAwarded.allBonus &&
                newStats.xpAwarded.flashcards &&
                newStats.xpAwarded.quiz &&
                newStats.xpAwarded.summary) {
                newStats.xpAwarded.allBonus = true;
                addExp(100);
            }

            return newStats;
        });

        // Update Daily Goals Progress with notifications
        // Use updated times calculated above
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
    }, [dailyStats, addExp, addNotification]);

    // Check Daily Goals Completion Bonus (10 XP) - only once per day
    useEffect(() => {
        // Only award if:
        // 1. There are goals defined
        // 2. All goals are completed
        // 3. Reward hasn't been claimed today (independent of goal modifications)
        if (dailyGoals.length > 0 &&
            dailyGoals.every(g => g.completed) &&
            !dailyGoalsRewardClaimed) {
            setDailyGoalsRewardClaimed(true);
            addExp(10);
            addNotification('Tous les objectifs complétés ! +10 XP', 'reward');
        }
    }, [dailyGoals, dailyGoalsRewardClaimed, addExp, addNotification]);

    // Function to update daily goals with reset of progress
    // IMPORTANT: Modifying goals resets progress to 0% but does NOT reset the reward claimed status
    const updateDailyGoals = useCallback((newGoals, skipWarning = false) => {
        // Reset all goals to not completed (progress goes to 0%)
        const resetGoals = newGoals.map((goal, index) => ({
            ...goal,
            id: goal.id || index + 1,
            completed: false
        }));
        setDailyGoalsState(resetGoals);

        // Note: dailyGoalsRewardClaimed is NOT reset here
        // This prevents users from regaining the 10 XP reward by modifying goals
    }, []);

    // Add a new goal
    const addDailyGoal = useCallback((type, targetMinutes) => {
        setDailyGoalsState(prev => {
            // Check if this type already exists
            if (prev.some(g => g.type === type)) {
                addNotification('Un objectif de ce type existe déjà', 'warning');
                return prev;
            }
            const newId = Math.max(...prev.map(g => g.id), 0) + 1;
            const newGoals = [...prev, { id: newId, type, targetMinutes, completed: false }];
            // Reset all progress when adding a new goal
            return newGoals.map(g => ({ ...g, completed: false }));
        });
    }, [addNotification]);

    // Remove a goal
    const removeDailyGoal = useCallback((goalId) => {
        setDailyGoalsState(prev => {
            const newGoals = prev.filter(g => g.id !== goalId);
            // Reset all progress when removing a goal
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
                // Reset all goals completion when any goal is modified
                return { ...g, completed: false };
            });
        });
    }, []);

    // Calculate daily progress percentage based on completed goals
    const dailyProgressPercentage = dailyGoals.length > 0
        ? Math.round((dailyGoals.filter(g => g.completed).length / dailyGoals.length) * 100)
        : 0;

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
            notifications,
            addNotification,
            removeNotification
        }}>
            {children}
        </UserContext.Provider>
    );
};
