import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, CreditCard, Bell, LogOut, Plus, Trash2, AlertTriangle, Check, Trophy, Loader2, Camera, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, ACTIVITY_TYPES } from '../context/UserContext';
import { useAuth } from '../features/auth/hooks/useAuth';
import * as notificationService from '../services/notificationService';

const Settings = () => {
    const { user, logout, updateProfile } = useAuth();
    const {
        dailyGoals,
        dailyProgressPercentage,
        dailyGoalsRewardClaimed,
        updateGoalTarget,
        addDailyGoal,
        removeDailyGoal,
        addNotification
    } = useUser();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [pendingChange, setPendingChange] = useState(null);
    const [showAddGoal, setShowAddGoal] = useState(false);
    const [newGoalType, setNewGoalType] = useState('');
    const [newGoalMinutes, setNewGoalMinutes] = useState(30);

    // Notification state
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [notificationsSupported, setNotificationsSupported] = useState(true);

    // Profile edit state
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [newAvatar, setNewAvatar] = useState(user?.avatar || null);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const fileInputRef = useRef(null);

    // Load notification settings on mount
    useEffect(() => {
        const loadNotificationSettings = async () => {
            if (!notificationService.isPushSupported()) {
                setNotificationsSupported(false);
                setNotificationsLoading(false);
                return;
            }

            try {
                const settings = await notificationService.getNotificationSettings();
                setNotificationsEnabled(settings.enabled);
            } catch (error) {
                console.error('Failed to load notification settings:', error);
            } finally {
                setNotificationsLoading(false);
            }
        };

        loadNotificationSettings();
    }, []);

    // Handle notification toggle
    const handleNotificationToggle = async () => {
        if (notificationsLoading) return;

        setNotificationsLoading(true);

        try {
            if (!notificationsEnabled) {
                // Enable: Subscribe to push notifications
                await notificationService.subscribeToPush();
                setNotificationsEnabled(true);
                addNotification('Notifications activees', 'success');
            } else {
                // Disable: Unsubscribe from push notifications
                await notificationService.unsubscribeFromPush();
                setNotificationsEnabled(false);
                addNotification('Notifications desactivees', 'success');
            }
        } catch (error) {
            console.error('Failed to toggle notifications:', error);
            if (error.message === 'Notification permission denied') {
                addNotification('Permission de notification refusee', 'warning');
            } else {
                addNotification('Erreur lors de la modification des notifications', 'warning');
            }
        } finally {
            setNotificationsLoading(false);
        }
    };

    // Handle profile photo selection
    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            addNotification('Veuillez selectionner une image', 'warning');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            addNotification('L\'image ne doit pas depasser 2MB', 'warning');
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (event) => {
            setNewAvatar(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    // Handle profile update
    const handleProfileUpdate = async () => {
        if (!newName.trim()) {
            addNotification('Le nom ne peut pas etre vide', 'warning');
            return;
        }

        setIsUpdatingProfile(true);

        try {
            await updateProfile({
                name: newName.trim(),
                avatar: newAvatar
            });
            addNotification('Profil mis a jour', 'success');
            setShowProfileModal(false);
        } catch (error) {
            addNotification('Erreur lors de la mise a jour', 'warning');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    // Open profile modal
    const openProfileModal = () => {
        setNewName(user?.name || '');
        setNewAvatar(user?.avatar || null);
        setShowProfileModal(true);
    };

    const sections = [
        {
            title: "Compte",
            items: [
                { icon: User, label: "Modifier le Profil", value: user?.name || "Utilisateur", onClick: openProfileModal },
                { icon: CreditCard, label: "Abonnement", value: "Plan Gratuit" },
            ]
        }
    ];

    // Get available types (not yet used in goals)
    const availableTypes = Object.keys(ACTIVITY_TYPES).filter(
        type => !dailyGoals.some(g => g.type === type)
    );

    // Handle goal modification with warning
    const handleGoalChange = (goalId, newMinutes) => {
        if (dailyProgressPercentage > 0) {
            setPendingChange({ type: 'update', goalId, newMinutes });
            setShowWarningModal(true);
        } else {
            updateGoalTarget(goalId, newMinutes);
        }
    };

    // Handle goal removal with warning
    const handleRemoveGoal = (goalId) => {
        if (dailyProgressPercentage > 0) {
            setPendingChange({ type: 'remove', goalId });
            setShowWarningModal(true);
        } else {
            removeDailyGoal(goalId);
        }
    };

    // Handle adding a new goal with warning
    const handleAddGoal = () => {
        if (!newGoalType) {
            addNotification('Veuillez sélectionner un type d\'objectif', 'warning');
            return;
        }
        if (dailyProgressPercentage > 0) {
            setPendingChange({ type: 'add', goalType: newGoalType, minutes: newGoalMinutes });
            setShowWarningModal(true);
        } else {
            addDailyGoal(newGoalType, newGoalMinutes);
            setShowAddGoal(false);
            setNewGoalType('');
            setNewGoalMinutes(30);
        }
    };

    // Confirm pending change
    const confirmChange = () => {
        if (pendingChange) {
            switch (pendingChange.type) {
                case 'update':
                    updateGoalTarget(pendingChange.goalId, pendingChange.newMinutes);
                    break;
                case 'remove':
                    removeDailyGoal(pendingChange.goalId);
                    break;
                case 'add':
                    addDailyGoal(pendingChange.goalType, pendingChange.minutes);
                    setShowAddGoal(false);
                    setNewGoalType('');
                    setNewGoalMinutes(30);
                    break;
            }
        }
        setShowWarningModal(false);
        setPendingChange(null);
    };

    // Cancel pending change
    const cancelChange = () => {
        setShowWarningModal(false);
        setPendingChange(null);
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="min-h-full bg-background p-6 pb-24">
            <header className="flex items-center gap-4 mb-8">
                <Link to="/profile" className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-2xl font-bold text-text-main">Paramètres</h1>
            </header>

            {/* Daily Goals Section */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Objectifs Quotidiens</h3>
                    {dailyGoalsRewardClaimed && (
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                            <Trophy size={14} />
                            <span>Bonus réclamé</span>
                        </div>
                    )}
                </div>

                <div className="bg-surface rounded-2xl p-6 border border-white/5 space-y-4">
                    {/* Current Progress Indicator */}
                    {dailyGoals.length > 0 && (
                        <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl mb-2">
                            <span className="text-sm text-text-muted">Progression actuelle</span>
                            <span className="text-lg font-bold text-primary">{dailyProgressPercentage}%</span>
                        </div>
                    )}

                    {/* Goals List */}
                    <AnimatePresence mode="popLayout">
                        {dailyGoals.map((goal) => (
                            <motion.div
                                key={goal.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="py-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            {goal.completed && (
                                                <Check size={16} className="text-green-400" />
                                            )}
                                            <span className="text-text-main">
                                                {ACTIVITY_TYPES[goal.type]?.label || goal.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-primary font-bold">{goal.targetMinutes} min</span>
                                            <button
                                                onClick={() => handleRemoveGoal(goal.id)}
                                                className="p-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="60"
                                        step="5"
                                        value={goal.targetMinutes}
                                        onChange={(e) => handleGoalChange(goal.id, parseInt(e.target.value))}
                                        className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Empty State */}
                    {dailyGoals.length === 0 && (
                        <div className="text-center py-6 text-text-muted">
                            <p className="text-sm">Aucun objectif défini</p>
                            <p className="text-xs mt-1">Ajoutez des objectifs pour suivre votre progression</p>
                        </div>
                    )}

                    {/* Add Goal Section */}
                    {availableTypes.length > 0 && (
                        <>
                            {!showAddGoal ? (
                                <button
                                    onClick={() => setShowAddGoal(true)}
                                    className="w-full p-3 rounded-xl border-2 border-dashed border-white/10 text-text-muted hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} />
                                    Ajouter un objectif
                                </button>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-black/30 rounded-xl space-y-4"
                                >
                                    <div>
                                        <label className="text-sm text-text-muted mb-2 block">Type d'activité</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {availableTypes.map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setNewGoalType(type)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                                        newGoalType === type
                                                            ? 'bg-primary text-white'
                                                            : 'bg-white/5 text-text-muted hover:bg-white/10'
                                                    }`}
                                                >
                                                    {ACTIVITY_TYPES[type]?.label || type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm text-text-muted">Durée cible</label>
                                            <span className="text-primary font-bold">{newGoalMinutes} min</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="5"
                                            max="60"
                                            step="5"
                                            value={newGoalMinutes}
                                            onChange={(e) => setNewGoalMinutes(parseInt(e.target.value))}
                                            className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setShowAddGoal(false);
                                                setNewGoalType('');
                                            }}
                                            className="flex-1 p-2 rounded-xl bg-white/5 text-text-muted hover:bg-white/10 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={handleAddGoal}
                                            className="flex-1 p-2 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors"
                                        >
                                            Ajouter
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </>
                    )}

                    {/* Warning message */}
                    <p className="text-xs text-text-muted italic flex items-start gap-2 mt-4">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-orange-400" />
                        Modifier vos objectifs réinitialisera votre progression quotidienne à 0%.
                        {dailyGoalsRewardClaimed && (
                            <span className="block text-yellow-400"> Le bonus de 10 XP ne peut pas être regagné aujourd'hui.</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Warning Modal */}
            <AnimatePresence>
                {showWarningModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-white/10"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-orange-400/20 flex items-center justify-center">
                                    <AlertTriangle className="text-orange-400" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-text-main">Attention</h3>
                            </div>
                            <p className="text-text-muted mb-6">
                                Modifier vos objectifs réinitialisera votre progression quotidienne à <span className="text-primary font-bold">0%</span>.
                                {dailyGoalsRewardClaimed && (
                                    <span className="block mt-2 text-yellow-400">
                                        Note: Le bonus de 10 XP a déjà été réclamé aujourd'hui et ne peut pas être regagné.
                                    </span>
                                )}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={cancelChange}
                                    className="flex-1 p-3 rounded-xl bg-white/5 text-text-main hover:bg-white/10 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmChange}
                                    className="flex-1 p-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                                >
                                    Confirmer
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Edit Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-white/10"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-text-main">Modifier le profil</h3>
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X size={20} className="text-text-muted" />
                                </button>
                            </div>

                            {/* Avatar */}
                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
                                        <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                                            {newAvatar ? (
                                                <img src={newAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl font-bold text-white">
                                                    {newName?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary-dark transition-colors"
                                    >
                                        <Camera size={16} className="text-white" />
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoSelect}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Name input */}
                            <div className="mb-6">
                                <label className="block text-sm text-text-muted mb-2">Nom</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Votre nom"
                                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                                    maxLength={50}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="flex-1 p-3 rounded-xl bg-white/5 text-text-main hover:bg-white/10 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleProfileUpdate}
                                    disabled={isUpdatingProfile}
                                    className="flex-1 p-3 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isUpdatingProfile ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        'Enregistrer'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-8">
                {sections.map((section) => (
                    <div key={section.title}>
                        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">{section.title}</h3>
                        <div className="bg-surface rounded-2xl overflow-hidden border border-white/5">
                            {section.items.map((item, index) => {
                                const ItemWrapper = item.onClick ? 'button' : 'div';
                                return (
                                    <ItemWrapper
                                        key={item.label}
                                        onClick={item.onClick}
                                        className={`w-full p-4 flex items-center justify-between ${index !== section.items.length - 1 ? 'border-b border-white/5' : ''} ${item.onClick ? 'hover:bg-white/5 transition-colors' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon size={20} className="text-text-muted" />
                                            <span className="text-text-main">{item.label}</span>
                                        </div>
                                        {item.value && (
                                            <span className="text-sm text-text-muted">{item.value}</span>
                                        )}
                                        {item.toggle && (
                                            <div className={`w-10 h-6 rounded-full relative transition-colors ${item.active ? 'bg-primary' : 'bg-white/10'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.active ? 'left-5' : 'left-1'}`} />
                                            </div>
                                        )}
                                    </ItemWrapper>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Notifications Section */}
                <div>
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Notifications</h3>
                    <div className="bg-surface rounded-2xl overflow-hidden border border-white/5">
                        <button
                            onClick={handleNotificationToggle}
                            disabled={notificationsLoading || !notificationsSupported}
                            className="w-full p-4 flex items-center justify-between disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                <Bell size={20} className="text-text-muted" />
                                <div className="text-left">
                                    <span className="text-text-main block">Rappel quotidien</span>
                                    <span className="text-xs text-text-muted">
                                        {!notificationsSupported
                                            ? 'Non supporte sur cet appareil'
                                            : 'Notification a 18h si objectifs non termines'}
                                    </span>
                                </div>
                            </div>
                            {notificationsLoading ? (
                                <Loader2 size={20} className="text-primary animate-spin" />
                            ) : (
                                <div
                                    className={`w-10 h-6 rounded-full relative transition-colors ${
                                        notificationsEnabled ? 'bg-primary' : 'bg-white/10'
                                    }`}
                                >
                                    <div
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                                            notificationsEnabled ? 'left-5' : 'left-1'
                                        }`}
                                    />
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full p-4 rounded-2xl bg-error/10 text-error font-medium flex items-center justify-center gap-2 hover:bg-error/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <LogOut size={20} />
                    {isLoggingOut ? 'Déconnexion...' : 'Se Déconnecter'}
                </button>
            </div>
        </div>
    );
};

export default Settings;
