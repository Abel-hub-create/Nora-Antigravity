import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

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
            allBonus: false,
            dailyGoals: false
        }
    });

    // Daily Goals State
    const [dailyGoals, setDailyGoals] = useState([
        { type: 'summary', targetMinutes: 30, completed: false },
        { type: 'quiz', targetMinutes: 20, completed: false }
    ]);

    // Check for day change
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
                    allBonus: false,
                    dailyGoals: false
                }
            });
            // Reset daily goals completion status
            setDailyGoals(prev => prev.map(g => ({ ...g, completed: false })));
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

    const updateTime = (activityType, seconds) => {
        const today = new Date().toDateString();
        if (dailyStats.date !== today) return;

        setDailyStats(prev => {
            const newStats = { ...prev };

            if (activityType === 'quiz') newStats.quizTime += seconds;
            if (activityType === 'flashcards') newStats.flashcardsTime += seconds;
            if (activityType === 'summary') newStats.summaryTime += seconds;

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

        // Update Daily Goals Progress
        setDailyGoals(prev => prev.map(goal => {
            if (goal.completed) return goal;

            let currentTime = 0;
            if (goal.type === 'quiz') currentTime = dailyStats.quizTime + (activityType === 'quiz' ? seconds : 0);
            if (goal.type === 'flashcards') currentTime = dailyStats.flashcardsTime + (activityType === 'flashcards' ? seconds : 0);
            if (goal.type === 'summary') currentTime = dailyStats.summaryTime + (activityType === 'summary' ? seconds : 0);

            if (currentTime >= goal.targetMinutes * 60) {
                return { ...goal, completed: true };
            }
            return goal;
        }));
    };

    // Check Daily Goals Completion Bonus (10 XP)
    useEffect(() => {
        if (dailyGoals.length > 0 && dailyGoals.every(g => g.completed) && !dailyStats.xpAwarded.dailyGoals) {
            setDailyStats(prev => ({
                ...prev,
                xpAwarded: { ...prev.xpAwarded, dailyGoals: true }
            }));
            addExp(10);
        }
    }, [dailyGoals, dailyStats.xpAwarded.dailyGoals, addExp]);

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
            setDailyGoals,
            updateTime
        }}>
            {children}
        </UserContext.Provider>
    );
};
