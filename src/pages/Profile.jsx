import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LiquidProgressBar from '../components/UI/LiquidProgressBar';
import { Settings, Folder, Star, ChevronRight, Plus, Loader2, Crown, Zap } from 'lucide-react';
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

const Profile = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const isPremium = authUser?.plan_type && authUser.plan_type !== 'free';
    const { user: userData } = useUser();
    const { gateProps, showGate } = usePremiumGate();
    const hasFolders = authUser?.plan_limits?.has_folders !== 0;

    // Combiner les données auth (nom, avatar) et user context (level, xp)
    const user = {
        name: authUser?.name || t('common.user'),
        avatar: authUser?.avatar || null,
        level: userData?.level ?? 1,
        exp: userData?.exp ?? 0,
        nextLevelExp: userData?.nextLevelExp ?? getXpThreshold(userData?.level ?? 1),
        coins: userData?.coins ?? 0,
        winstreak: userData?.winstreak ?? 1,
    };

    // Folders state
    const [folders, setFolders] = useState([]);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [synthesesCount, setSynthesesCount] = useState(0);

    // Fetch folders and syntheses count on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoadingFolders(true);
                const [foldersData, synthesesData] = await Promise.all([
                    folderService.getAllFolders(),
                    syntheseService.getAllSyntheses()
                ]);
                setFolders(foldersData);
                const syntheses = synthesesData.syntheses || [];
                setSynthesesCount(syntheses.length);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoadingFolders(false);
            }
        };

        fetchData();
    }, []);

    // Create folder handler
    const handleCreateFolder = async ({ name, color }) => {
        setIsCreating(true);
        try {
            const newFolder = await folderService.createFolder({ name, color });
            setFolders((prev) => [...prev, newFolder]);
        } finally {
            setIsCreating(false);
        }
    };

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
            <div className="block bg-surface rounded-3xl p-6 mb-8 border border-white/5 relative overflow-hidden">
                <div className="flex items-center gap-4 mb-6 relative z-10">
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
                    <div>
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
                    <div className="ml-auto flex flex-col items-end gap-1.5">
                        {/* Pièces */}
                        <div className="bg-black/30 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5">
                            <span className="text-sm">🪙</span>
                            <AnimatedNumber value={user.coins} duration={800} className="text-sm font-bold text-amber-300" />
                        </div>
                        {/* Winstreak */}
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
                    <LiquidProgressBar
                        progress={(user.exp / user.nextLevelExp) * 100}
                        height={12}
                        className="w-full"
                    />
                    <p className="text-xs text-text-muted mt-2 text-center">
                        {t('profile.xpToLevel', { xp: user.nextLevelExp - user.exp, level: user.level + 1 })}
                    </p>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="bg-surface/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-text-main mb-1">📚 <AnimatedNumber value={synthesesCount} duration={1000} />/40</span>
                    <span className="text-xs text-text-muted">{t('profile.synthesesCount')}</span>
                </div>
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
                        <p className="text-text-muted text-xs mt-1">
                            {t('profile.createFolderHint')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {folders.map((folder, index) => (
                            <FolderCard
                                key={folder.id}
                                folder={folder}
                                index={index}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Folder Modal */}
            <CreateFolderModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateFolder}
                isLoading={isCreating}
            />
            <PremiumGate {...gateProps} />
        </div>
    );
};

export default Profile;
