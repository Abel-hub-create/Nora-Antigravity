import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Gift, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EggAnimation from '../components/Collection/EggAnimation';
import { useUser } from '../context/UserContext';
import { CREATURES, getRandomCreature, RARITIES } from '../data/creatures';

const Collection = () => {
    const { t } = useTranslation();
    const { user, useEgg, unlockCreature } = useUser();
    const [showEgg, setShowEgg] = useState(false);
    const [reward, setReward] = useState(null);

    const handleOpenEgg = () => {
        if (useEgg()) {
            const newCreature = getRandomCreature();
            setReward(newCreature);
            setShowEgg(true);
        }
    };

    const handleEggComplete = () => {
        if (reward) {
            unlockCreature(reward.id);
            setShowEgg(false);
            setReward(null);
        }
    };

    // Sort creatures by rarity then by ID
    const sortedCreatures = [...CREATURES].sort((a, b) => {
        const rarityOrder = ['secret', 'mythic', 'legendary', 'epic', 'very_rare', 'rare'];
        return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
    });

    return (
        <div className="min-h-full bg-background p-6 pb-24">
            {showEgg && reward && <EggAnimation onComplete={handleEggComplete} reward={reward} />}

            <header className="flex items-center gap-4 mb-8">
                <Link to="/profile" className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-2xl font-bold text-text-main">{t('collection.title')}</h1>
            </header>

            {/* Egg Status */}
            <div className="mb-8">
                <div className="bg-gradient-to-r from-surface to-surface/50 p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-text-main mb-1">{t('collection.eggs')}</h2>
                            <p className="text-sm text-text-muted">{t('collection.eggsHint')}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full border border-white/10">
                            <Gift size={18} className="text-primary" />
                            <span className="font-bold text-white">{user.eggs}</span>
                        </div>
                    </div>

                    {user.eggs > 0 ? (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleOpenEgg}
                            className="mt-6 w-full py-3 bg-primary text-background font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors relative z-10"
                        >
                            {t('collection.openNow')}
                        </motion.button>
                    ) : (
                        <button
                            disabled
                            className="mt-6 w-full py-3 bg-surface text-text-muted font-bold rounded-xl border border-white/5 cursor-not-allowed relative z-10"
                        >
                            {t('collection.noEggs')}
                        </button>
                    )}

                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                </div>
            </div>

            {/* Grid */}
            <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">{t('collection.creatures')}</h3>
                <div className="grid grid-cols-3 gap-3">
                    {sortedCreatures.map((creature) => {
                        const isUnlocked = user.collection.includes(creature.id);
                        const rarityColor = RARITIES[creature.rarity.toUpperCase()].color;

                        return (
                            <div
                                key={creature.id}
                                className={`aspect-square rounded-2xl border flex flex-col items-center justify-center p-2 text-center transition-all relative overflow-hidden ${isUnlocked ? 'bg-surface border-white/10' : 'bg-surface/30 border-white/5 opacity-50'}`}
                                style={isUnlocked ? { borderColor: rarityColor + '40' } : {}}
                            >
                                {isUnlocked && (
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundColor: rarityColor }} />
                                )}

                                <div className="text-4xl mb-2 relative z-10">
                                    {isUnlocked ? (
                                        creature.image ? (
                                            <img src={creature.image} alt={creature.name} className="w-12 h-12 object-cover rounded-lg shadow-md" />
                                        ) : (
                                            creature.icon
                                        )
                                    ) : (
                                        <Lock size={24} className="text-text-muted mx-auto" />
                                    )}
                                </div>
                                {isUnlocked && (
                                    <p className="text-[10px] font-bold truncate w-full relative z-10" style={{ color: rarityColor }}>
                                        {t(`creatures.${creature.id}`)}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Collection;
