import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, CreditCard, Bell, LogOut, Plus, Trash2, AlertTriangle, Check, Trophy, Loader2, Camera, X, UserX, Volume2, FolderOpen, Crown, Zap, Music, Upload } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUser, ACTIVITY_TYPES } from '../context/UserContext';
import { useAuth } from '../features/auth/hooks/useAuth';
import * as notificationService from '../services/notificationService';
import { PremiumGate, usePremiumGate } from '../components/UI/PremiumGate';
import LanguageSelector from '../components/Settings/LanguageSelector';
import ThemeSelector from '../components/Settings/ThemeSelector';

const Settings = () => {
    const { t } = useTranslation();
    const { user, logout, updateProfile, deleteAccount, updatePreferences } = useAuth();
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
    const { gateProps, showGate } = usePremiumGate();
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
    const [notifHour, setNotifHour] = useState(18);
    const [notifDays, setNotifDays] = useState([0, 1, 2, 3, 4, 5, 6]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    // Sounds state (localStorage)
    const [soundsEnabled, setSoundsEnabled] = useState(
        localStorage.getItem('nora_sounds_enabled') !== 'false'
    );

    // Music state
    const {
        musicEnabled, toggleMusic,
        musicVolume, setMusicVolume,
        sfxVolume, setSfxVolume,
        currentTrackId, selectTrack,
        allTracks, customTracks,
        importTrack, deleteCustomTrack, renameTrack,
    } = useAudio();
    const musicFileRef = useRef(null);
    const [importError, setImportError] = useState(null);
    const [renamingTrackId, setRenamingTrackId] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    // Auto-folder state
    const [autoFolder, setAutoFolder] = useState(user?.auto_folder !== false);
    const handleAutoFolderToggle = async () => {
        if (user?.plan_limits?.has_folders === 0) {
            showGate(t('premiumGate.features.autoFolder'), t('premiumGate.features.autoFolderDesc'));
            return;
        }
        const newVal = !autoFolder;
        setAutoFolder(newVal);
        try {
            await updatePreferences({ auto_folder: newVal });
        } catch {
            setAutoFolder(!newVal); // revert on error
        }
    };

    // Profile edit state
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [newAvatar, setNewAvatar] = useState(user?.avatar || null);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const fileInputRef = useRef(null);

    // Delete account state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
                if (settings.hour != null) setNotifHour(settings.hour);
                if (settings.days != null) setNotifDays(settings.days);
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
                addNotification(t('settings.notificationsEnabled'), 'success');
            } else {
                // Disable: Unsubscribe from push notifications
                await notificationService.unsubscribeFromPush();
                setNotificationsEnabled(false);
                addNotification(t('settings.notificationsDisabled'), 'success');
            }
        } catch (error) {
            console.error('Failed to toggle notifications:', error);
            if (error.message === 'Notification permission denied') {
                addNotification(t('settings.permissionDenied'), 'warning');
            } else {
                addNotification(t('settings.notificationError'), 'warning');
            }
        } finally {
            setNotificationsLoading(false);
        }
    };

    // Handle sounds toggle
    const handleSoundsToggle = () => {
        const next = !soundsEnabled;
        setSoundsEnabled(next);
        localStorage.setItem('nora_sounds_enabled', next ? 'true' : 'false');
    };

    const isPremiumOrSchool = user?.plan_type === 'premium' || user?.plan_type === 'school';

    const handleImportTrack = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setImportError(null);
        if (!isPremiumOrSchool) {
            setImportError('premium');
            return;
        }
        const result = await importTrack(file);
        if (result === 'limit') setImportError('limit');
    };

    // Handle notification schedule change
    const handleScheduleChange = async (hour, days) => {
        setScheduleLoading(true);
        try {
            await notificationService.updateNotificationSchedule(hour, days);
        } catch (error) {
            console.error('Failed to update schedule:', error);
        } finally {
            setScheduleLoading(false);
        }
    };

    const toggleNotifDay = (day) => {
        const next = notifDays.includes(day)
            ? notifDays.filter(d => d !== day)
            : [...notifDays, day];
        if (next.length === 0) return; // keep at least 1 day
        setNotifDays(next);
        handleScheduleChange(notifHour, next);
    };

    const handleHourChange = (hour) => {
        setNotifHour(hour);
        handleScheduleChange(hour, notifDays);
    };

    // Handle profile photo selection
    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            addNotification(t('settings.profileModal.selectImage'), 'warning');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            addNotification(t('settings.profileModal.imageTooLarge'), 'warning');
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
            addNotification(t('settings.profileModal.nameEmpty'), 'warning');
            return;
        }

        setIsUpdatingProfile(true);

        try {
            await updateProfile({
                name: newName.trim(),
                avatar: newAvatar
            });
            addNotification(t('settings.profileModal.updated'), 'success');
            setShowProfileModal(false);
        } catch (error) {
            addNotification(t('settings.profileModal.updateError'), 'warning');
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
            title: t('settings.account'),
            items: [
                { icon: User, label: t('settings.editProfile'), value: user?.name || t('common.user'), onClick: openProfileModal },
                { icon: CreditCard, label: t('settings.subscription'), value: user?.plan_type === 'premium' ? '✨ Premium' : user?.plan_type === 'school' ? '🏫 École' : t('settings.freePlan'), onClick: () => navigate('/pricing') },
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
            addNotification(t('settings.selectGoalType'), 'warning');
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

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== t('settings.deleteKeyword')) return;

        setIsDeletingAccount(true);
        try {
            await deleteAccount();
            navigate('/login');
        } catch (error) {
            console.error('Delete account failed:', error);
            addNotification(t('settings.deleteError'), 'warning');
        } finally {
            setIsDeletingAccount(false);
            setShowDeleteModal(false);
            setDeleteConfirmText('');
        }
    };

    return (
        <div className="min-h-full bg-background p-6 pb-24">
            <header className="flex items-center gap-4 mb-8">
                <Link to="/profile" className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-2xl font-bold text-text-main">{t('settings.title')}</h1>
            </header>

            {/* Language Section */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">{t('settings.language')}</h3>
                <div className="bg-surface rounded-2xl overflow-hidden border border-white/5">
                    <LanguageSelector />
                </div>
            </div>

            {/* Theme Section */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">{t('settings.theme')}</h3>
                <div className="bg-surface rounded-2xl overflow-hidden border border-white/5">
                    <ThemeSelector />
                </div>
            </div>

            {/* Sounds Section */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">{t('settings.sounds')}</h3>
                <div className="space-y-3">
                    {/* SFX */}
                    <div className="bg-surface rounded-2xl border border-white/10 overflow-hidden">
                        <button
                            onClick={handleSoundsToggle}
                            className="no-hover w-full p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <Volume2 size={20} className="text-text-muted" />
                                <div className="text-left">
                                    <span className="text-text-main block">{t('settings.soundEffects')}</span>
                                    <span className="text-xs text-text-muted">{t('settings.soundEffectsDesc')}</span>
                                </div>
                            </div>
                            <div className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${soundsEnabled ? 'bg-primary' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${soundsEnabled ? 'left-5' : 'left-1'}`} />
                            </div>
                        </button>
                        <AnimatePresence>
                            {soundsEnabled && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 pb-4 flex items-center gap-3">
                                        <span className="text-xs text-text-muted w-16">{t('settings.sfxVolume')}</span>
                                        <input
                                            type="range" min="0" max="1" step="0.05"
                                            value={sfxVolume}
                                            onChange={e => setSfxVolume(parseFloat(e.target.value))}
                                            className="flex-1 h-2 bg-black rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <span className="text-xs text-text-muted w-8 text-right">{Math.round(sfxVolume * 100)}%</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Music */}
                    <div className="bg-surface rounded-2xl border border-white/10 overflow-hidden">
                        <button
                            onClick={toggleMusic}
                            className="no-hover w-full p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <Music size={20} className="text-text-muted" />
                                <div className="text-left">
                                    <span className="text-text-main block">{t('settings.music')}</span>
                                    <span className="text-xs text-text-muted">{t('settings.musicDesc')}</span>
                                </div>
                            </div>
                            <div className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${musicEnabled ? 'bg-primary' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${musicEnabled ? 'left-5' : 'left-1'}`} />
                            </div>
                        </button>

                        <AnimatePresence>
                            {musicEnabled && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    {/* Volume */}
                                    <div className="px-4 pb-3 flex items-center gap-3">
                                        <span className="text-xs text-text-muted w-16">{t('settings.musicVolume')}</span>
                                        <input
                                            type="range" min="0" max="1" step="0.05"
                                            value={musicVolume}
                                            onChange={e => setMusicVolume(parseFloat(e.target.value))}
                                            className="flex-1 h-2 bg-black rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <span className="text-xs text-text-muted w-8 text-right">{Math.round(musicVolume * 100)}%</span>
                                    </div>

                                    {/* Track list */}
                                    <div className="px-4 pb-3">
                                        <p className="text-xs text-text-muted mb-2">{t('settings.musicTracks')}</p>
                                        <div className="space-y-1.5">
                                            {allTracks.map(track => {
                                                const displayName = track.displayName ?? (track.isDefault ? t(`settings.track${track.id.charAt(0).toUpperCase() + track.id.slice(1)}`) : track.name);
                                                const isRenaming = renamingTrackId === track.id;
                                                return (
                                                <div key={track.id} className={`flex items-center gap-2 p-2.5 rounded-xl transition-colors ${
                                                    currentTrackId === track.id
                                                        ? 'bg-primary/15 border border-primary/30'
                                                        : 'bg-white/5 border border-transparent'
                                                }`}>
                                                    <div
                                                        className={`w-2 h-2 rounded-full shrink-0 cursor-pointer ${currentTrackId === track.id ? 'bg-primary' : 'bg-white/20'}`}
                                                        onClick={() => { if (!isRenaming) selectTrack(track.id); }}
                                                    />
                                                    {isRenaming ? (
                                                        <input
                                                            autoFocus
                                                            value={renameValue}
                                                            onChange={e => setRenameValue(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') { renameTrack(track.id, renameValue); setRenamingTrackId(null); }
                                                                if (e.key === 'Escape') setRenamingTrackId(null);
                                                            }}
                                                            onBlur={() => { renameTrack(track.id, renameValue); setRenamingTrackId(null); }}
                                                            className="flex-1 text-sm bg-black/30 border border-primary/40 rounded-lg px-2 py-0.5 text-text-main focus:outline-none"
                                                        />
                                                    ) : (
                                                        <span
                                                            className="text-sm text-text-main flex-1 cursor-pointer"
                                                            onClick={() => selectTrack(track.id)}
                                                            onDoubleClick={() => { setRenamingTrackId(track.id); setRenameValue(displayName); }}
                                                        >
                                                            {displayName}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setRenamingTrackId(track.id); setRenameValue(displayName); }}
                                                        className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-main transition-colors"
                                                        title="Renommer"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                    </button>
                                                    {!track.isDefault && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); deleteCustomTrack(track.id); }}
                                                            className="p-1 rounded-lg hover:bg-error/20 text-error/60 hover:text-error transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Import */}
                                    <div className="px-4 pb-4">
                                        <input
                                            ref={musicFileRef}
                                            type="file"
                                            accept="audio/*"
                                            onChange={handleImportTrack}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => {
                                                if (!isPremiumOrSchool) {
                                                    setImportError('premium');
                                                    return;
                                                }
                                                if (customTracks.length >= 5) {
                                                    setImportError('limit');
                                                    return;
                                                }
                                                setImportError(null);
                                                musicFileRef.current?.click();
                                            }}
                                            className="w-full py-2 rounded-xl border border-dashed border-white/15 text-text-muted hover:border-primary/40 hover:text-primary text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Upload size={14} />
                                            {t('settings.importTrack')}
                                            {!isPremiumOrSchool && <Crown size={12} className="text-amber-400" />}
                                        </button>
                                        {importError === 'premium' && (
                                            <p className="text-[11px] text-amber-400 mt-1.5 text-center">{t('settings.importTrackPremium')}</p>
                                        )}
                                        {importError === 'limit' && (
                                            <p className="text-[11px] text-error/70 mt-1.5 text-center">{t('settings.importTrackLimit')}</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Auto-folder Section */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">{t('settings.autoFolder')}</h3>
                <button
                    onClick={handleAutoFolderToggle}
                    className="hover-lift no-hover w-full p-4 flex items-center justify-between bg-surface rounded-2xl border border-white/10"
                >
                    <div className="flex items-center gap-3">
                        <FolderOpen size={20} className="text-text-muted" />
                        <div className="text-left">
                            <span className="text-text-main block">{t('settings.autoFolderToggle')}</span>
                            <span className="text-xs text-text-muted">{t('settings.autoFolderDesc')}</span>
                        </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${autoFolder ? 'bg-primary' : 'bg-white/10'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoFolder ? 'left-5' : 'left-1'}`} />
                    </div>
                </button>
            </div>

            {/* Daily Goals Section */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{t('settings.dailyGoals')}</h3>
                    {dailyGoalsRewardClaimed && (
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                            <Trophy size={14} />
                            <span>{t('settings.bonusClaimed')}</span>
                        </div>
                    )}
                </div>

                <div className="bg-surface rounded-2xl p-6 border border-white/5 space-y-4">
                    {/* Current Progress Indicator */}
                    {dailyGoals.length > 0 && (
                        <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl mb-2">
                            <span className="text-sm text-text-muted">{t('settings.currentProgress')}</span>
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
                                                {t(ACTIVITY_TYPES[goal.type]?.labelKey) || goal.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-primary font-bold">{goal.targetMinutes} {t('common.min')}</span>
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
                            <p className="text-sm">{t('settings.noGoalsDefined')}</p>
                            <p className="text-xs mt-1">{t('settings.addGoalsHint')}</p>
                        </div>
                    )}

                    {/* Add Goal Section */}
                    {availableTypes.length > 0 && (
                        <>
                            {!showAddGoal ? (
                                <button
                                    onClick={() => {
                                        if (user?.plan_limits?.has_daily_goals === 0) {
                                            showGate(t('premiumGate.features.dailyGoals'), t('premiumGate.features.dailyGoalsDesc'));
                                            return;
                                        }
                                        setShowAddGoal(true);
                                    }}
                                    className="w-full p-3 rounded-xl border-2 border-dashed border-white/10 text-text-muted hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} />
                                    {t('settings.addGoal')}
                                </button>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-black/30 rounded-xl space-y-4"
                                >
                                    <div>
                                        <label className="text-sm text-text-muted mb-2 block">{t('settings.activityType')}</label>
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
                                                    {t(ACTIVITY_TYPES[type]?.labelKey) || type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm text-text-muted">{t('settings.targetDuration')}</label>
                                            <span className="text-primary font-bold">{newGoalMinutes} {t('common.min')}</span>
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
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            onClick={handleAddGoal}
                                            className="flex-1 p-2 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors"
                                        >
                                            {t('common.add')}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </>
                    )}

                    {/* Warning message */}
                    <p className="text-xs text-text-muted italic flex items-start gap-2 mt-4">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-orange-400" />
                        {t('settings.modifyWarning')}
                        {dailyGoalsRewardClaimed && (
                            <span className="block text-yellow-400"> {t('settings.bonusWarningNote')}</span>
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
                                <h3 className="text-lg font-bold text-text-main">{t('common.warning')}</h3>
                            </div>
                            <p className="text-text-muted mb-6">
                                {t('settings.modifyWarning').replace('0%', '')} <span className="text-primary font-bold">0%</span>.
                                {dailyGoalsRewardClaimed && (
                                    <span className="block mt-2 text-yellow-400">
                                        {t('settings.bonusAlreadyClaimed')}
                                    </span>
                                )}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={cancelChange}
                                    className="flex-1 p-3 rounded-xl bg-white/5 text-text-main hover:bg-white/10 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={confirmChange}
                                    className="flex-1 p-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                                >
                                    {t('common.confirm')}
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
                                <h3 className="text-lg font-bold text-text-main">{t('settings.profileModal.title')}</h3>
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
                                                <span className="text-3xl font-bold text-text-main">
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
                                <label className="block text-sm text-text-muted mb-2">{t('settings.profileModal.name')}</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder={t('settings.profileModal.namePlaceholder')}
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
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleProfileUpdate}
                                    disabled={isUpdatingProfile}
                                    className="flex-1 p-3 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isUpdatingProfile ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        t('common.save')
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
                        <div className="space-y-2">
                            {section.items.map((item, index) => {
                                const ItemWrapper = item.onClick ? 'button' : 'div';
                                return (
                                    <ItemWrapper
                                        key={item.label}
                                        onClick={item.onClick}
                                        className={`${item.onClick ? 'hover-lift no-hover' : ''} w-full p-4 flex items-center justify-between bg-surface border border-white/10 rounded-2xl`}
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
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">{t('settings.notifications')}</h3>
                    <div className="space-y-2">
                        {/* Toggle */}
                        {!isPremiumOrSchool ? (
                            <div className="relative w-full p-4 flex items-center justify-between bg-surface border border-white/10 rounded-2xl opacity-60">
                                <div className="flex items-center gap-3">
                                    <Bell size={20} className="text-text-muted" />
                                    <div className="text-left">
                                        <span className="text-text-main block">{t('settings.dailyReminder')}</span>
                                        <span className="text-xs text-amber-400 flex items-center gap-1">
                                            <Crown size={11} /> Premium
                                        </span>
                                    </div>
                                </div>
                                <div className="w-10 h-6 rounded-full relative bg-white/10">
                                    <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full" />
                                </div>
                            </div>
                        ) : (
                        <button
                            onClick={handleNotificationToggle}
                            disabled={notificationsLoading || !notificationsSupported}
                            className="hover-lift no-hover w-full p-4 flex items-center justify-between bg-surface border border-white/10 rounded-2xl disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                <Bell size={20} className="text-text-muted" />
                                <div className="text-left">
                                    <span className="text-text-main block">{t('settings.dailyReminder')}</span>
                                    <span className="text-xs text-text-muted">
                                        {!notificationsSupported
                                            ? t('settings.notSupported')
                                            : `${String(notifHour).padStart(2, '0')}:00`}
                                    </span>
                                </div>
                            </div>
                            {notificationsLoading ? (
                                <Loader2 size={20} className="text-primary animate-spin" />
                            ) : (
                                <div className={`w-10 h-6 rounded-full relative transition-colors ${notificationsEnabled ? 'bg-primary' : 'bg-white/10'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationsEnabled ? 'left-5' : 'left-1'}`} />
                                </div>
                            )}
                        </button>
                        )}

                        {/* Schedule (shown when enabled) */}
                        {notificationsEnabled && notificationsSupported && (
                            <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-4">
                                {/* Hour picker */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-text-muted">{t('settings.notificationHour')}</span>
                                    <select
                                        value={notifHour}
                                        onChange={(e) => handleHourChange(parseInt(e.target.value))}
                                        disabled={scheduleLoading}
                                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-text-main focus:outline-none focus:border-primary disabled:opacity-50"
                                    >
                                        {Array.from({ length: 18 }, (_, i) => i + 6).map(h => (
                                            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Day picker */}
                                <div>
                                    <span className="text-sm text-text-muted block mb-2">{t('settings.notificationDays')}</span>
                                    <div className="flex gap-1.5">
                                        {[
                                            { day: 1, key: 'mon' },
                                            { day: 2, key: 'tue' },
                                            { day: 3, key: 'wed' },
                                            { day: 4, key: 'thu' },
                                            { day: 5, key: 'fri' },
                                            { day: 6, key: 'sat' },
                                            { day: 0, key: 'sun' },
                                        ].map(({ day, key }) => (
                                            <button
                                                key={day}
                                                onClick={() => toggleNotifDay(day)}
                                                disabled={scheduleLoading}
                                                className={`no-hover w-8 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                                                    notifDays.includes(day)
                                                        ? 'bg-primary text-white'
                                                        : 'bg-white/5 text-text-muted hover:bg-white/10'
                                                }`}
                                            >
                                                {t(`settings.days.${key}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full p-4 rounded-2xl bg-error/10 text-error font-medium flex items-center justify-center gap-2 hover:bg-error/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <LogOut size={20} />
                    {isLoggingOut ? t('settings.loggingOut') : t('settings.logout')}
                </button>

                {/* Delete Account Section */}
                <div className="mt-8 pt-8 border-t border-white/10">
                    <h3 className="text-sm font-semibold text-error uppercase tracking-wider mb-4">{t('settings.dangerZone')}</h3>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full p-4 rounded-2xl border-2 border-error/30 text-error font-medium flex items-center justify-center gap-2 hover:bg-error/10 transition-colors"
                    >
                        <UserX size={20} />
                        {t('settings.deleteAccount')}
                    </button>
                    <p className="text-xs text-text-muted mt-2 text-center">
                        {t('settings.deleteWarning')}
                    </p>
                </div>
            </div>

            {/* Delete Account Modal */}
            <AnimatePresence>
                {showDeleteModal && (
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
                            className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-error/30"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center">
                                    <UserX className="text-error" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-text-main">{t('settings.deleteConfirmTitle')}</h3>
                            </div>
                            <p className="text-text-muted mb-4">
                                {t('settings.deleteConfirmText')} <span className="text-error font-bold">{t('settings.deleteIrreversible')}</span>. {t('settings.deleteDataList')}
                            </p>
                            <ul className="text-sm text-text-muted mb-4 space-y-1 list-disc list-inside">
                                <li>{t('settings.deleteSyntheses')}</li>
                                <li>{t('settings.deleteProgress')}</li>
                                <li>{t('settings.deleteFolders')}</li>
                            </ul>
                            <p className="text-text-muted mb-4">
                                {t('settings.typeToConfirm')} <span className="font-mono bg-black/30 px-2 py-1 rounded text-error">{t('settings.deleteKeyword')}</span>
                            </p>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder={t('settings.typePlaceholder')}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-text-main placeholder-text-muted focus:outline-none focus:border-error transition-colors mb-4"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeleteConfirmText('');
                                    }}
                                    className="flex-1 p-3 rounded-xl bg-white/5 text-text-main hover:bg-white/10 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteConfirmText !== t('settings.deleteKeyword') || isDeletingAccount}
                                    className="flex-1 p-3 rounded-xl bg-error text-white hover:bg-error/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isDeletingAccount ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        t('common.delete')
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <PremiumGate {...gateProps} />
        </div>
    );
};

export default Settings;
