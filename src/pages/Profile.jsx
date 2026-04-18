import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDOM from 'react-dom';
import LiquidProgressBar from '../components/UI/LiquidProgressBar';
import { Settings, Folder, Star, Plus, Loader2, Crown, Zap, Trophy, Timer, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as folderService from '../services/folderService';
import * as syntheseService from '../services/syntheseService';
import FolderCard from '../components/Folders/FolderCard';
import CreateFolderModal from '../components/Folders/CreateFolderModal';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useUser, getXpThreshold } from '../context/UserContext';
import AnimatedNumber from '../components/UI/AnimatedNumber';
import { PremiumGate, usePremiumGate } from '../components/UI/PremiumGate';
import api from '../lib/api';
import SubjectRadar from '../components/Profile/SubjectRadar';

// Extrait "#1" et "S1" depuis "#1 - S1"
const parseBadgeText = (text) => {
    const parts = (text || '').split(' - ');
    return { pos: parts[0] || '', season: parts[1] || '' };
};

const BadgeOverlay = ({ badge, onClick, size = 56 }) => {
    const { pos, season } = parseBadgeText(badge?.badge_text);
    const emboss = '0 1px 0 rgba(255,220,80,0.5), 0 -1px 1px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.7), 1px 1px 2px rgba(0,0,0,0.8)';
    return (
        <button
            onClick={onClick}
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            <img src="/badge-s1.png" alt="Badge" className="w-full h-full object-contain drop-shadow-lg" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: '2px', paddingTop: '1px' }}>
                <span
                    className="font-black leading-none"
                    style={{
                        fontSize: size * 0.24,
                        color: '#FFE066',
                        textShadow: emboss,
                        letterSpacing: '-0.5px',
                    }}
                >
                    {pos}
                </span>
                <span
                    className="font-bold leading-none"
                    style={{
                        fontSize: size * 0.17,
                        color: '#FFD54F',
                        textShadow: emboss,
                        marginTop: '2px',
                    }}
                >
                    {season}
                </span>
            </div>
        </button>
    );
};

const Profile = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const isPremium = authUser?.plan_type && authUser.plan_type !== 'free';
    const { user: userData } = useUser();
    const { gateProps, showGate } = usePremiumGate();
    const hasFolders = authUser?.plan_limits?.has_folders !== 0;
    const { updateActiveBadge } = useAuth();
    const [showBadgePicker, setShowBadgePicker] = useState(false);
    const [savingBadge, setSavingBadge] = useState(false);

    const user = {
        name: authUser?.name || t('common.user'),
        avatar: authUser?.avatar || null,
        level: userData?.level ?? 1,
        exp: userData?.exp ?? 0,
        nextLevelExp: userData?.nextLevelExp ?? getXpThreshold(userData?.level ?? 1),
        coins: userData?.coins ?? 0,
        winstreak: userData?.winstreak ?? 1,
    };

    const [folders, setFolders] = useState([]);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [synthesesCount, setSynthesesCount] = useState(0);

    const [season, setSeason] = useState(null);
    const [badges, setBadges] = useState([]);
    const [timeLeft, setTimeLeft] = useState(null);
    const [subjectScores, setSubjectScores] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoadingFolders(true);
                const [foldersData, synthesesData] = await Promise.all([
                    folderService.getAllFolders(),
                    syntheseService.getAllSyntheses()
                ]);
                setFolders(foldersData);
                setSynthesesCount((synthesesData.syntheses || []).length);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoadingFolders(false);
            }
        };

        const fetchSeasonData = async () => {
            const [seasonRes, badgesRes, statsRes] = await Promise.allSettled([
                api.get('/seasons/active'),
                authUser?.id ? api.get(`/seasons/badges/${authUser.id}`) : Promise.resolve({ badges: [] }),
                api.get('/stats/subjects'),
            ]);
            if (seasonRes.status === 'fulfilled') setSeason(seasonRes.value.season || null);
            if (badgesRes.status === 'fulfilled') setBadges(badgesRes.value.badges || []);
            if (statsRes.status === 'fulfilled') setSubjectScores(statsRes.value.scores || []);
        };

        fetchData();
        fetchSeasonData();
    }, [authUser?.id]);

    // Countdown saison
    useEffect(() => {
        if (!season?.ends_at) { setTimeLeft(null); return; }
        const update = () => {
            const diff = new Date(season.ends_at) - new Date();
            if (diff <= 0) { setTimeLeft(null); return; }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            setTimeLeft({ days, hours });
        };
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [season]);

    const handleCreateFolder = async ({ name, color }) => {
        setIsCreating(true);
        try {
            const newFolder = await folderService.createFolder({ name, color });
            setFolders((prev) => [...prev, newFolder]);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSelectBadge = async (badgeId) => {
        setSavingBadge(true);
        try {
            const newId = authUser?.active_badge_id === badgeId ? null : badgeId;
            await updateActiveBadge(newId);
        } finally {
            setSavingBadge(false);
            setShowBadgePicker(false);
        }
    };

    const activeBadge = badges.find(b => b.id === authUser?.active_badge_id) || null;

    const BadgePickerModal = () => ReactDOM.createPortal(
        <AnimatePresence>
            {showBadgePicker && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShowBadgePicker(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.93, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.93 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="pointer-events-auto w-full max-w-sm bg-surface border border-white/10 rounded-3xl p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-base font-bold text-text-main">{t('badges.title')}</h3>
                                <button onClick={() => setShowBadgePicker(false)} className="p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-white/10 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Option : aucun badge */}
                            <button
                                onClick={() => handleSelectBadge(null)}
                                disabled={savingBadge}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl border mb-3 transition-colors ${
                                    !authUser?.active_badge_id ? 'border-primary/40 bg-primary/10' : 'border-white/8 hover:border-white/20'
                                }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg">🚫</div>
                                <span className="text-sm text-text-muted">{t('badges.noBadgeActive')}</span>
                                {!authUser?.active_badge_id && <span className="ml-auto text-xs text-primary font-bold">✓</span>}
                            </button>

                            {/* Liste des badges */}
                            <div className="space-y-2">
                                {badges.map(badge => {
                                    const isActive = authUser?.active_badge_id === badge.id;
                                    return (
                                        <button
                                            key={badge.id}
                                            onClick={() => handleSelectBadge(badge.id)}
                                            disabled={savingBadge}
                                            className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                                                isActive ? 'border-primary/40 bg-primary/10' : 'border-white/8 hover:border-white/20'
                                            }`}
                                        >
                                            <BadgeOverlay badge={badge} onClick={() => {}} size={44} />
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-primary">{badge.badge_text}</p>
                                                <p className="text-xs text-text-muted">{t('badges.earned', { season: `Saison ${badge.season_number}` })}</p>
                                            </div>
                                            {isActive && <span className="ml-auto text-xs text-primary font-bold">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );

    return (
        <div className="min-h-full bg-background p-6 pb-24">
            {/* Header */}
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-text-main">{t('profile.title')}</h1>
                <Link to="/settings" className="p-2 bg-surface rounded-full text-text-muted hover:text-text-main transition-colors">
                    <Settings size={20} />
                </Link>
            </header>

            {/* User Info Card */}
            <div className="bg-surface rounded-3xl p-6 mb-8 border border-white/5 relative" style={{ overflow: 'visible' }}>
                <div className="flex items-start gap-4 mb-6 relative z-10">

                    {/* Avatar + badge centré en bas */}
                    <div className="relative shrink-0" style={{ paddingBottom: '30px' }}>
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
                            <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                                {user.avatar ? (
                                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-text-main">
                                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Badge actif : centré, dépasse en bas de la photo */}
                        {activeBadge ? (
                            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 0 }}>
                                <BadgeOverlay badge={activeBadge} onClick={() => setShowBadgePicker(true)} size={52} />
                            </div>
                        ) : badges.length > 0 ? (
                            /* Bouton "+" uniquement si pas de badge actif */
                            <button
                                onClick={() => setShowBadgePicker(true)}
                                className="no-hover absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg"
                                style={{ bottom: '16px' }}
                            >
                                <Plus size={12} className="text-white" />
                            </button>
                        ) : null}
                    </div>

                    {/* Infos user */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-text-main">{user.name || t('common.user')}</h2>
                        <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <Star size={14} className="fill-current" />
                            {t('profile.level')} <AnimatedNumber value={user.level} duration={800} />
                        </div>
                        {isPremium ? (
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                                <Crown size={10} className="text-amber-400" />
                                <span className="text-[10px] font-semibold text-amber-400 capitalize">{authUser.plan_type}</span>
                            </div>
                        ) : (
                            <Link to="/pricing" className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors">
                                <Zap size={10} className="text-primary" />
                                <span className="text-[10px] font-semibold text-primary">{t('profile.upgradePremium')}</span>
                            </Link>
                        )}
                    </div>

                    {/* Pièces + winstreak */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="bg-black/30 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5">
                            <span className="text-sm">🪙</span>
                            <AnimatedNumber value={user.coins} duration={800} className="text-sm font-bold text-amber-300" />
                        </div>
                        <div className="bg-black/30 px-3 py-1 rounded-full border border-orange-500/20 flex items-center gap-1.5">
                            <span className="text-sm">🔥</span>
                            <AnimatedNumber value={user.winstreak} duration={600} className="text-sm font-bold text-orange-300" />
                        </div>
                    </div>
                </div>

                {/* EXP Bar */}
                <div className="relative z-10">
                    <div className="flex justify-between text-xs text-text-muted mb-2">
                        <span><AnimatedNumber value={user.exp} duration={1200} /> XP</span>
                        <span>{user.nextLevelExp} XP</span>
                    </div>
                    <LiquidProgressBar progress={(user.exp / user.nextLevelExp) * 100} height={12} className="w-full" />
                    <p className="text-xs text-text-muted mt-2 text-center">
                        {t('profile.xpToLevel', { xp: user.nextLevelExp - user.exp, level: user.level + 1 })}
                    </p>

                    {/* Horloge saison — dans la carte */}
                    {season && timeLeft !== null && (
                        <div className="flex items-center justify-center gap-1.5 mt-3">
                            <Timer size={11} className="text-primary opacity-70" />
                            <Link to="/leaderboard" className="text-[11px] text-text-muted hover:text-primary transition-colors">
                                {season.name} · {t('season.timeRemaining', { days: timeLeft.days, hours: timeLeft.hours })}
                            </Link>
                        </div>
                    )}
                </div>

                {/* Décoration fond */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            </div>

            {/* Radar chart */}
            <div className="bg-surface/50 rounded-2xl border border-white/5 mb-8" style={{ height: '160px', width: '50%', padding: '8px' }}>
                <SubjectRadar scores={subjectScores} />
            </div>

            {/* Folders Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-text-main">{t('profile.folders')}</h3>
                    <button
                        onClick={() => hasFolders ? setShowCreateModal(true) : showGate(t('premiumGate.features.folders'), t('premiumGate.features.foldersDesc'))}
                        className="flex items-center gap-1 text-xs text-primary font-medium"
                    >
                        <Plus size={16} />
                        {t('profile.createFolder')}
                    </button>
                </div>

                {isLoadingFolders ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-primary" />
                    </div>
                ) : folders.length === 0 ? (
                    <div className="text-center py-8">
                        <Folder size={40} className="mx-auto text-text-muted mb-3 opacity-50" />
                        <p className="text-text-muted text-sm">{t('profile.noFolders')}</p>
                        <p className="text-text-muted text-xs mt-1">{t('profile.createFolderHint')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {folders.map((folder, index) => (
                            <FolderCard key={folder.id} folder={folder} index={index} />
                        ))}
                    </div>
                )}
            </div>

            <CreateFolderModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateFolder}
                isLoading={isCreating}
            />
            <PremiumGate {...gateProps} />
            <BadgePickerModal />
        </div>
    );
};

export default Profile;
