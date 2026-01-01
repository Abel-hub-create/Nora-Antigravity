import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Folder, Clock, Star, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import * as folderService from '../services/folderService';
import * as syntheseService from '../services/syntheseService';
import FolderCard from '../components/Folders/FolderCard';
import CreateFolderModal from '../components/Folders/CreateFolderModal';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useUser } from '../context/UserContext';

const Profile = () => {
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const { user: userData, getAverageDailyStudyTime } = useUser();

    // Combiner les données auth (nom, avatar) et user context (level, xp, streak)
    const user = {
        name: authUser?.name || "Utilisateur",
        avatar: authUser?.avatar || null,
        level: userData?.level || 1,
        exp: userData?.exp || 0,
        nextLevelExp: userData?.nextLevelExp || 1000,
        eggs: userData?.eggs || 0
    };

    // Get average daily study time
    const averageMinutes = getAverageDailyStudyTime();

    // Folders state
    const [folders, setFolders] = useState([]);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Syntheses count
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
                setSynthesesCount(synthesesData.syntheses?.length || 0);
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
                <h1 className="text-2xl font-bold text-text-main">Mon Profil</h1>
                <Link to="/settings" className="p-2 bg-surface rounded-full text-text-muted hover:text-text-main transition-colors">
                    <Settings size={20} />
                </Link>
            </header>

            {/* User Info Card */}
            <Link to="/collection" className="block bg-surface rounded-3xl p-6 mb-8 border border-white/5 relative overflow-hidden group">
                <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
                        <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                            {user.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-white">
                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-text-main">{user.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <Star size={14} className="fill-current" />
                            Niveau {user.level}
                        </div>
                    </div>
                    <div className="ml-auto bg-black/30 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                        <span className="text-lg">🥚</span>
                        <span className="text-sm font-bold text-white">{user.eggs}</span>
                    </div>
                </div>
                {/* EXP Bar */}
                <div className="relative z-10">
                    <div className="flex justify-between text-xs text-text-muted mb-2">
                        <span>{user.exp} XP</span>
                        <span>{user.nextLevelExp} XP</span>
                    </div>
                    <div className="h-3 w-full bg-black/30 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(user.exp / user.nextLevelExp) * 100}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                        />
                    </div>
                    <p className="text-xs text-text-muted mt-2 text-center">
                        {user.nextLevelExp - user.exp} XP vers le Niveau {user.level + 1}
                    </p>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </Link>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-text-main mb-1">
                        <Clock size={20} className="inline mr-1" />
                        {averageMinutes} min
                    </span>
                    <span className="text-xs text-text-muted">Moyenne par jour</span>
                </div>
                <div className="bg-surface/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-text-main mb-1">📚 {synthesesCount}</span>
                    <span className="text-xs text-text-muted">Synthèses</span>
                </div>
            </div>

            {/* Folders Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-text-main">Mes Dossiers</h3>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-1 text-xs text-primary font-medium"
                    >
                        <Plus size={16} />
                        Créer
                    </button>
                </div>

                {isLoadingFolders ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-primary" />
                    </div>
                ) : folders.length === 0 ? (
                    <div className="text-center py-8">
                        <Folder size={40} className="mx-auto text-text-muted mb-3 opacity-50" />
                        <p className="text-text-muted text-sm">Aucun dossier</p>
                        <p className="text-text-muted text-xs mt-1">
                            Créez un dossier pour organiser vos synthèses
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
        </div>
    );
};

export default Profile;
