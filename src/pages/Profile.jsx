import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Folder, Clock, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
    const user = {
        name: "Alex",
        level: 4,
        exp: 850,
        nextLevelExp: 1000,
        streak: 12
    };

    const folders = [
        { name: "Biology", items: 12, color: "bg-emerald-500" },
        { name: "History", items: 8, color: "bg-amber-500" },
        { name: "Physics", items: 5, color: "bg-purple-500" },
        { name: "Literature", items: 3, color: "bg-pink-500" },
    ];

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
                            <span className="text-2xl font-bold text-white">A</span>
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
                        <span className="text-lg">🎁</span>
                        <span className="text-sm font-bold text-white">1</span>
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
                        150 XP vers le Niveau {user.level + 1}
                    </p>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </Link>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-text-main mb-1">🔥 {user.streak}</span>
                    <span className="text-xs text-text-muted">Jours d'affilée</span>
                </div>
                <div className="bg-surface/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-text-main mb-1">📚 28</span>
                    <span className="text-xs text-text-muted">Sujets Appris</span>
                </div>
            </div>

            {/* Folders Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-text-main">Mes Dossiers</h3>
                    <button className="text-xs text-primary font-medium">Voir Tout</button>
                </div>

                <div className="space-y-3">
                    {folders.map((folder, index) => (
                        <motion.div
                            key={folder.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 bg-surface rounded-2xl border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-surface/80 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl ${folder.color} bg-opacity-20 flex items-center justify-center`}>
                                    <Folder size={20} className={folder.color.replace('bg-', 'text-')} />
                                </div>
                                <div>
                                    <h4 className="font-medium text-text-main">{folder.name}</h4>
                                    <p className="text-xs text-text-muted">{folder.items} éléments</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-text-muted group-hover:text-text-main transition-colors" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div >
    );
};

export default Profile;
