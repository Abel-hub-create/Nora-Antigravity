import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/hooks/useAuth';
import * as notificationService from '../services/notificationService';
import * as gamificationService from '../services/gamificationService';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

// Types d'activité disponibles pour les objectifs
export const ACTIVITY_TYPES = {
    summary:    { label: 'Synthèse',   labelKey: 'activities.summary',    key: 'summaryTime' },
    quiz:       { label: 'Quiz',       labelKey: 'activities.quiz',       key: 'quizTime' },
    flashcards: { label: 'Flashcards', labelKey: 'activities.flashcards', key: 'flashcardsTime' }
};

// Seuils XP par défaut (temps + XP) — les montants d'XP sont overridés par xp_config si dispo
export const XP_THRESHOLDS = {
    flashcards: { timeMinutes: 10, xp: 40 },
    quiz:       { timeMinutes: 20, xp: 70 },
    summary:    { timeMinutes: 30, xp: 100 }
};
export const ALL_BONUS_XP = 100;
export const DAILY_GOALS_BONUS_XP = 50; // remplacé par xp_config.daily_goals_all_bonus

/** Seuil d'XP pour passer au niveau suivant (nouvelle formule fixe) */
export const getXpThreshold = (level) => {
    if (level <= 3) return 500;
    if (level <= 9) return 1000;
    return 1200;
};

const getTodayString = () => new Date().toDateString();

const getDefaultDailyStats = () => ({
    date: getTodayString(),
    quizTime: 0,
    flashcardsTime: 0,
    summaryTime: 0,
    xpAwarded: { quiz: false, flashcards: false, summary: false, allBonus: false }
});

const getDefaultDailyGoals = () => [];

const getTotalStudyTime = (stats) =>
    (stats.quizTime || 0) + (stats.flashcardsTime || 0) + (stats.summaryTime || 0);

export const UserProvider = ({ children }) => {
    const { t } = useTranslation();
    const { user: authUser, syncUserData } = useAuth();

    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const [user, setUser] = useState({
        id: authUser?.id ?? null,
        email: authUser?.email ?? null,
        name: authUser?.name ?? null,
        level: authUser?.level ?? 1,
        exp: authUser?.exp ?? 0,
        nextLevelExp: authUser?.next_level_exp ?? getXpThreshold(authUser?.level ?? 1),
        winstreak: authUser?.winstreak ?? 1,
        coins: authUser?.coins ?? 0,
    });

    // Sacs en attente de révélation
    const [pendingBags, setPendingBags] = useState([]);

    const currentUserIdRef = useRef(authUser?.id ?? null);

    // Sync avec authUser (données fraîches du backend)
    useEffect(() => {
        if (authUser) {
            setUser({
                id: authUser.id,
                email: authUser.email,
                name: authUser.name,
                level: authUser.level ?? 1,
                exp: authUser.exp ?? 0,
                nextLevelExp: authUser.next_level_exp ?? getXpThreshold(authUser.level ?? 1),
                winstreak: authUser.winstreak ?? 1,
                coins: authUser.coins ?? 0,
            });
        }
    }, [authUser]);

    const [dailyStats, setDailyStats] = useState(getDefaultDailyStats);
    const [dailyGoals, setDailyGoalsState] = useState(getDefaultDailyGoals);
    const [dailyGoalsRewardClaimed, setDailyGoalsRewardClaimed] = useState(false);
    const [studyHistory, setStudyHistory] = useState([]);
    const isFirstLoadRef = useRef(true);

    // Chargement des données depuis le backend
    useEffect(() => {
        const newUserId = authUser?.id ?? null;
        const previousUserId = currentUserIdRef.current;
        const userChanged = newUserId !== previousUserId;
        const needsInitialLoad = !isDataLoaded && newUserId;

        if (userChanged || needsInitialLoad) {
            currentUserIdRef.current = newUserId;

            if (newUserId) {
                const loadData = async (retryCount = 0) => {
                    try {
                        const [backendData] = await Promise.all([
                            notificationService.getDailyProgress(),
                        ]);

                        if (backendData.dailyStats) {
                            setDailyStats(backendData.dailyStats);
                        } else {
                            setDailyStats(getDefaultDailyStats());
                        }

                        if (backendData.dailyGoals && backendData.dailyGoals.length > 0) {
                            setDailyGoalsState(backendData.dailyGoals);
                        } else {
                            setDailyGoalsState(getDefaultDailyGoals());
                        }

                        setDailyGoalsRewardClaimed(backendData.dailyGoalsRewardClaimed || false);

                        if (backendData.studyHistory && backendData.studyHistory.length > 0) {
                            setStudyHistory(backendData.studyHistory);
                        } else {
                            setStudyHistory([]);
                        }

                        // Charger les sacs en attente
                        try {
                            const { bags } = await gamificationService.getPendingBags();
                            if (bags && bags.length > 0) setPendingBags(bags);
                        } catch {
                            // Silencieux — ne bloque pas l'init
                        }

                        // Winstreak (fuseau horaire du navigateur)
                        try {
                            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
                            await gamificationService.checkWinstreak(tz);
                        } catch {
                            // Silencieux
                        }

                        setIsDataLoaded(true);
                    } catch (error) {
                        if (retryCount < 2) {
                            setTimeout(() => loadData(retryCount + 1), 1000 * (retryCount + 1));
                            return;
                        }
                        setDailyStats(getDefaultDailyStats());
                        setDailyGoalsState(getDefaultDailyGoals());
                        setDailyGoalsRewardClaimed(false);
                        setStudyHistory([]);
                        setIsDataLoaded(true);
                    }
                };
                loadData();
            } else {
                setDailyStats(getDefaultDailyStats());
                setDailyGoalsState(getDefaultDailyGoals());
                setDailyGoalsRewardClaimed(false);
                setStudyHistory([]);
                setIsDataLoaded(true);
            }
        }
    }, [authUser?.id, isDataLoaded]);

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const notificationIdRef = useRef(0);

    const addNotification = useCallback((message, type = 'success') => {
        const id = ++notificationIdRef.current;
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Sync daily progress vers le backend
    const syncDailyProgressToBackend = useCallback(async (goals, stats, rewardClaimed) => {
        if (!authUser?.id) return false;
        const progressPercentage = goals.length > 0
            ? Math.round((goals.filter(g => g.completed).length / goals.length) * 100)
            : 0;
        try {
            await notificationService.syncDailyProgress(goals, progressPercentage, rewardClaimed, stats);
            return true;
        } catch {
            return false;
        }
    }, [authUser?.id]);

    // Debounce sync
    useEffect(() => {
        if (!authUser?.id || !isDataLoaded) return;
        const progressPercentage = dailyGoals.length > 0
            ? Math.round((dailyGoals.filter(g => g.completed).length / dailyGoals.length) * 100)
            : 0;
        const syncTimer = setTimeout(async () => {
            try {
                await notificationService.syncDailyProgress(dailyGoals, progressPercentage, dailyGoalsRewardClaimed, dailyStats);
            } catch { /* silencieux */ }
        }, 2000);
        return () => clearTimeout(syncTimer);
    }, [authUser?.id, dailyGoals, dailyGoalsRewardClaimed, dailyStats, isDataLoaded]);

    // Détection changement de jour
    const checkAndResetForNewDay = useCallback(() => {
        const today = getTodayString();
        if (dailyStats.date !== today) {
            const totalSeconds = getTotalStudyTime(dailyStats);
            if (totalSeconds > 0) {
                const yesterdayDate = new Date(dailyStats.date).toISOString().split('T')[0];
                notificationService.saveStudyHistory(yesterdayDate, totalSeconds).catch(() => {});
                setStudyHistory(prev => {
                    const existingIndex = prev.findIndex(h => h.date === dailyStats.date);
                    if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = { date: dailyStats.date, totalSeconds };
                        return updated;
                    }
                    return [...prev, { date: dailyStats.date, totalSeconds }].slice(-30);
                });
            }
            const newStats = getDefaultDailyStats();
            setDailyStats(newStats);
            const resetGoals = dailyGoals.map(g => ({ ...g, completed: false }));
            setDailyGoalsState(resetGoals);
            setDailyGoalsRewardClaimed(false);
            syncDailyProgressToBackend(resetGoals, newStats, false);
            return true;
        }
        return false;
    }, [dailyStats, dailyGoals, syncDailyProgressToBackend]);

    useEffect(() => {
        if (!isDataLoaded) return;
        checkAndResetForNewDay();
        const interval = setInterval(checkAndResetForNewDay, 60000);
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkAndResetForNewDay();
                // Rafraîchir les sacs en cas de level-up en arrière-plan
                gamificationService.getPendingBags()
                    .then(({ bags }) => { if (bags?.length > 0) setPendingBags(bags); })
                    .catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkAndResetForNewDay, isDataLoaded]);

    // Sync XP (minuteur) vers le backend
    const syncToBackend = useCallback(async (userData) => {
        if (syncUserData && authUser?.id) {
            try {
                await syncUserData({
                    level: userData.level,
                    exp: userData.exp,
                    next_level_exp: userData.nextLevelExp,
                });
            } catch { /* silencieux */ }
        }
    }, [syncUserData, authUser?.id]);

    /**
     * addExp — XP local (minuteurs d'étude).
     * Applique le multiplicateur de plan, utilise les nouveaux seuils.
     * En cas de level-up : génère un sac côté serveur.
     */
    const addExp = useCallback((amount, showNotification = false, notificationMessage = '') => {
        const multiplier = Number(authUser?.plan_limits?.xp_multiplier) || 1;
        const xpConfig = authUser?.xp_config || {};

        setUser(prev => {
            const multipliedAmount = Math.round(amount * multiplier);
            let newExp = prev.exp + multipliedAmount;
            let newLevel = prev.level;
            let levelUps = 0;

            while (newExp >= getXpThreshold(newLevel)) {
                newExp -= getXpThreshold(newLevel);
                newLevel += 1;
                levelUps++;
            }

            const newNextLevelExp = getXpThreshold(newLevel);
            const newUser = { ...prev, level: newLevel, exp: newExp, nextLevelExp: newNextLevelExp };

            // Générer des sacs côté serveur pour chaque level-up
            if (levelUps > 0 && authUser?.id) {
                for (let i = 0; i < levelUps; i++) {
                    gamificationService.generateBag()
                        .then(({ bag }) => {
                            if (bag) setPendingBags(p => [...p, bag]);
                        })
                        .catch(() => {});
                }
            }

            syncToBackend(newUser);
            return newUser;
        });

        if (showNotification && notificationMessage) {
            addNotification(notificationMessage, 'xp');
        }
    }, [syncToBackend, addNotification, authUser?.plan_limits?.xp_multiplier, authUser?.xp_config, authUser?.id]);

    /**
     * awardXp — XP serveur (synthèse créée, exercice, vocal, objectifs, etc.)
     * Le serveur applique le multiplicateur et la déduplication.
     */
    const awardXp = useCallback(async (reason, options = {}) => {
        if (!authUser?.id) return null;
        try {
            const result = await gamificationService.awardXp(reason, options);
            if (!result || result.xpAwarded === 0) return result;

            // Mettre à jour le state local avec les valeurs du serveur
            setUser(prev => ({
                ...prev,
                level: result.newLevel ?? prev.level,
                exp: result.newExp ?? prev.exp,
                nextLevelExp: getXpThreshold(result.newLevel ?? prev.level),
            }));

            // Notification XP
            if (result.xpAwarded > 0) {
                addNotification(
                    t('notifications.xpGainedSimple', { amount: result.xpAwarded }),
                    'xp'
                );
            }

            // Ajouter les sacs générés à la file d'attente
            if (result.coinBags && result.coinBags.length > 0) {
                setPendingBags(prev => [...prev, ...result.coinBags]);
            }

            return result;
        } catch (e) {
            console.debug('[NORA] awardXp failed:', e?.response?.data?.error || e?.message);
            return null;
        }
    }, [authUser?.id, addNotification, t]);

    /**
     * revealBag — révéler un sac de pièces (met à jour le solde + retire de la file)
     */
    const revealBag = useCallback(async (bagId) => {
        try {
            const result = await gamificationService.revealBag(bagId);
            setUser(prev => ({ ...prev, coins: result.newBalance ?? prev.coins }));
            setPendingBags(prev => prev.filter(b => b.id !== bagId));
            return result;
        } catch (e) {
            console.error('[NORA] revealBag failed:', e?.message);
            throw e;
        }
    }, []);

    // Valeurs effectives des seuils XP (depuis xp_config si disponible) — memoïsé pour éviter les re-renders
    const effectiveXpThresholds = useMemo(() => ({
        flashcards: { timeMinutes: 10, xp: authUser?.xp_config?.flashcards_timer ?? XP_THRESHOLDS.flashcards.xp },
        quiz:       { timeMinutes: 20, xp: authUser?.xp_config?.quiz_timer ?? XP_THRESHOLDS.quiz.xp },
        summary:    { timeMinutes: 30, xp: authUser?.xp_config?.summary_timer ?? XP_THRESHOLDS.summary.xp }
    }), [authUser?.xp_config]);
    const effectiveAllBonusXp = useMemo(
        () => authUser?.xp_config?.all_timer_bonus ?? ALL_BONUS_XP,
        [authUser?.xp_config]
    );

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
            if (activityType === 'quiz')       newStats.quizTime += seconds;
            if (activityType === 'flashcards') newStats.flashcardsTime += seconds;
            if (activityType === 'summary')    newStats.summaryTime += seconds;

            updatedTimes = {
                quizTime: newStats.quizTime,
                flashcardsTime: newStats.flashcardsTime,
                summaryTime: newStats.summaryTime
            };

            // Vérifier les seuils XP minuteurs
            const timeKey = `${activityType}Time`;
            const threshold = effectiveXpThresholds[activityType];

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

            // Bonus toutes activités
            if (!newStats.xpAwarded.allBonus &&
                newStats.xpAwarded.flashcards &&
                newStats.xpAwarded.quiz &&
                newStats.xpAwarded.summary) {
                newStats.xpAwarded.allBonus = true;
                setTimeout(() => {
                    addExp(effectiveAllBonusXp, true, t('notifications.dailyBonusComplete', { amount: effectiveAllBonusXp }));
                }, 100);
            }

            return newStats;
        });

        // Mise à jour des objectifs quotidiens + XP par objectif
        setDailyGoalsState(prev => {
            const goalsToNotify = [];
            const goalsToAwardXp = [];

            const updatedGoals = prev.map(goal => {
                if (goal.completed) return goal;
                const timeKey = ACTIVITY_TYPES[goal.type]?.key;
                if (!timeKey) return goal;
                const currentTime = updatedTimes[timeKey] || 0;
                if (currentTime >= goal.targetMinutes * 60) {
                    goalsToNotify.push(goal.type);
                    goalsToAwardXp.push(goal.id);
                    return { ...goal, completed: true };
                }
                return goal;
            });

            goalsToNotify.forEach(type => {
                const labelKey = ACTIVITY_TYPES[type]?.labelKey;
                const label = labelKey ? t(labelKey) : type;
                setTimeout(() => addNotification(t('notifications.goalCompleted', { label }), 'goal'), 0);
            });

            // Créditer +XP par objectif (serveur, avec déduplication)
            goalsToAwardXp.forEach(goalId => {
                setTimeout(() => {
                    awardXp('goal_completed', { contextId: String(goalId) }).catch(() => {});
                }, 0);
            });

            return updatedGoals;
        });
    }, [dailyStats, checkAndResetForNewDay, addExp, awardXp, addNotification, t, effectiveXpThresholds, effectiveAllBonusXp]);

    // Bonus tous objectifs complétés (server-side)
    useEffect(() => {
        if (dailyGoals.length > 0 &&
            dailyGoals.every(g => g.completed) &&
            !dailyGoalsRewardClaimed) {
            setDailyGoalsRewardClaimed(true);
            awardXp('daily_goals_all_bonus').catch(() => {});
        }
    }, [dailyGoals, dailyGoalsRewardClaimed, awardXp]);

    const updateDailyGoals = useCallback((newGoals) => {
        const resetGoals = newGoals.map((goal, index) => ({
            ...goal,
            id: goal.id || index + 1,
            completed: false
        }));
        setDailyGoalsState(resetGoals);
        syncDailyProgressToBackend(resetGoals, dailyStats, dailyGoalsRewardClaimed);
    }, [syncDailyProgressToBackend, dailyStats, dailyGoalsRewardClaimed]);

    const addDailyGoal = useCallback((type, targetMinutes) => {
        setDailyGoalsState(prev => {
            if (prev.some(g => g.type === type)) {
                addNotification(t('settings.goalExists'), 'warning');
                return prev;
            }
            const newId = Math.max(...prev.map(g => g.id), 0) + 1;
            const newGoals = [...prev, { id: newId, type, targetMinutes, completed: false }];
            syncDailyProgressToBackend(newGoals, dailyStats, dailyGoalsRewardClaimed);
            return newGoals;
        });
    }, [addNotification, t, syncDailyProgressToBackend, dailyStats, dailyGoalsRewardClaimed]);

    const removeDailyGoal = useCallback((goalId) => {
        setDailyGoalsState(prev => {
            const newGoals = prev.filter(g => g.id !== goalId).map(g => {
                const timeKey = ACTIVITY_TYPES[g.type]?.key;
                const currentSeconds = timeKey ? (dailyStats[timeKey] || 0) : 0;
                return { ...g, completed: currentSeconds >= g.targetMinutes * 60 };
            });
            syncDailyProgressToBackend(newGoals, dailyStats, dailyGoalsRewardClaimed);
            return newGoals;
        });
    }, [syncDailyProgressToBackend, dailyStats, dailyGoalsRewardClaimed]);

    const updateGoalTarget = useCallback((goalId, newTargetMinutes) => {
        setDailyGoalsState(prev => {
            const updatedGoals = prev.map(g => {
                if (g.id !== goalId) return g;
                const timeKey = ACTIVITY_TYPES[g.type]?.key;
                const currentSeconds = timeKey ? (dailyStats[timeKey] || 0) : 0;
                return { ...g, targetMinutes: newTargetMinutes, completed: currentSeconds >= newTargetMinutes * 60 };
            });
            syncDailyProgressToBackend(updatedGoals, dailyStats, dailyGoalsRewardClaimed);
            return updatedGoals;
        });
    }, [syncDailyProgressToBackend, dailyStats, dailyGoalsRewardClaimed]);

    const dailyProgressPercentage = dailyGoals.length > 0
        ? Math.round((dailyGoals.filter(g => g.completed).length / dailyGoals.length) * 100)
        : 0;

    const getStudyTimeMinutes = useCallback((activityType) => {
        const timeKey = ACTIVITY_TYPES[activityType]?.key;
        if (!timeKey) return 0;
        return Math.floor(dailyStats[timeKey] / 60);
    }, [dailyStats]);

    const getXpProgress = useCallback((activityType) => {
        const threshold = effectiveXpThresholds[activityType];
        if (!threshold) return 0;
        const timeKey = ACTIVITY_TYPES[activityType]?.key;
        if (!timeKey) return 0;
        const currentMinutes = dailyStats[timeKey] / 60;
        return Math.min(100, (currentMinutes / threshold.timeMinutes) * 100);
    }, [dailyStats, effectiveXpThresholds]);

    const getAverageDailyStudyTime = useCallback(() => {
        const todaySeconds = getTotalStudyTime(dailyStats);
        if (studyHistory.length === 0 && todaySeconds === 0) return 0;
        const historyTotal = studyHistory.reduce((sum, day) => sum + day.totalSeconds, 0);
        const totalDays = studyHistory.length + (todaySeconds > 0 ? 1 : 0);
        if (totalDays === 0) return 0;
        return Math.round((historyTotal + todaySeconds) / totalDays / 60);
    }, [dailyStats, studyHistory]);

    const hasPendingBag = pendingBags.length > 0;

    return (
        <UserContext.Provider value={{
            user,
            pendingBags,
            hasPendingBag,
            addExp,
            awardXp,
            revealBag,
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
