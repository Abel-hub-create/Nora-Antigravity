import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { RARITIES } from '../../data/creatures';

const EggAnimation = ({ onComplete, reward }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState('idle'); // idle, cracking, exploding, revealed

    const rarityColor = RARITIES[reward.rarity.toUpperCase()].color;

    const handleTap = () => {
        if (step === 'idle') {
            setStep('cracking');

            // Sequence of events
            setTimeout(() => setStep('exploding'), 1500);
            setTimeout(() => {
                setStep('revealed');
                // Explosion confetti
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.5 },
                    colors: [rarityColor, '#ffffff', '#FFD700'],
                    scalar: 1.2
                });
            }, 2300);
        } else if (step === 'revealed') {
            onComplete();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-6 overflow-hidden" onClick={handleTap}>
            <AnimatePresence mode='wait'>
                {step !== 'revealed' ? (
                    <motion.div
                        key="egg-container"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 2, opacity: 0, filter: "blur(20px)" }}
                        transition={{ duration: 0.5 }}
                        className="relative cursor-pointer flex flex-col items-center"
                    >
                        {/* Ambient Glow */}
                        <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full scale-150 animate-pulse-slow" />

                        <motion.div
                            animate={
                                step === 'idle' ? { y: [0, -10, 0] } :
                                    step === 'cracking' ? { x: [-5, 5, -5, 5, 0], rotate: [-2, 2, -2, 2, 0] } :
                                        step === 'exploding' ? { scale: [1, 1.2, 0.8, 1.5], opacity: [1, 1, 1, 0] } : {}
                            }
                            transition={
                                step === 'idle' ? { repeat: Infinity, duration: 3, ease: "easeInOut" } :
                                    step === 'cracking' ? { repeat: Infinity, duration: 0.2 } :
                                        { duration: 0.8 }
                            }
                            className="relative z-10"
                        >
                            {/* The Egg */}
                            <div className="w-56 h-72 bg-gradient-to-br from-surface to-black border-4 border-white/10 rounded-[50%] relative overflow-hidden shadow-2xl shadow-primary/20">
                                {/* Texture */}
                                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
                                <div className="absolute top-10 left-10 w-16 h-24 bg-white/5 rounded-full blur-xl transform -rotate-12" />

                                {/* Cracks SVG */}
                                {step !== 'idle' && (
                                    <svg viewBox="0 0 200 250" className="absolute inset-0 w-full h-full pointer-events-none">
                                        <motion.path
                                            d="M100 40 L90 80 L110 110 L80 150 L100 190"
                                            stroke="white"
                                            strokeWidth="3"
                                            fill="none"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 1.5, ease: "easeInOut" }}
                                        />
                                        <motion.path
                                            d="M100 40 L120 70 L90 100 L110 140"
                                            stroke="white"
                                            strokeWidth="2"
                                            fill="none"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                        />
                                    </svg>
                                )}
                            </div>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-12 text-white/50 text-sm font-medium tracking-[0.2em] uppercase"
                        >
                            {step === 'idle' ? t('collection.tapToOpen') : t('collection.hatching')}
                        </motion.p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="reward-reveal"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="relative z-20 flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Rarity Burst Background */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1.5, rotate: 180 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-3xl"
                            style={{ background: `conic-gradient(from 0deg, transparent, ${rarityColor} 50%, transparent)` }}
                        />

                        {/* Card */}
                        <div
                            className={`backdrop-blur-xl border p-8 rounded-[2.5rem] text-center w-80 relative overflow-hidden z-10 ${reward.rarity === 'secret' ? 'bg-black/90 border-white/20' : 'bg-black/80'}`}
                            style={{ borderColor: reward.rarity === 'secret' ? '#ffffff' : rarityColor }}
                        >
                            <div className="absolute inset-0 opacity-20 bg-gradient-to-b from-white/10 to-transparent" />

                            {reward.rarity === 'secret' ? (
                                // SECRET REVEAL UI
                                <div className="relative">
                                    <motion.div
                                        initial={{ scale: 1.5, filter: 'blur(10px)' }}
                                        animate={{ scale: 1, filter: 'blur(0px)' }}
                                        transition={{ duration: 0.8 }}
                                        className="w-full aspect-square rounded-2xl overflow-hidden mb-6 border-2 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                                    >
                                        <img src={reward.image} alt={reward.name} className="w-full h-full object-cover" />
                                    </motion.div>

                                    <motion.h3
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-2 uppercase tracking-tighter"
                                    >
                                        {t(`creatures.${reward.id}`)}
                                    </motion.h3>

                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.5, type: "spring" }}
                                        className="mb-6"
                                    >
                                        <span className="text-xs font-bold uppercase tracking-[0.3em] text-white border border-white/30 px-3 py-1 rounded-full">
                                            {t('collection.secretDiscovered')}
                                        </span>
                                    </motion.div>

                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.8 }}
                                        className="text-white/80 text-sm italic mb-8 font-serif"
                                    >
                                        "{t('collection.mysteryMessage')}"
                                    </motion.p>
                                </div>
                            ) : (
                                // STANDARD REVEAL UI
                                <>
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="w-40 h-40 mx-auto rounded-full flex items-center justify-center mb-8 relative"
                                        style={{ backgroundColor: `${rarityColor}20` }}
                                    >
                                        <div className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse" style={{ backgroundColor: rarityColor }} />
                                        <span className="text-7xl relative z-10 filter drop-shadow-lg">{reward.icon}</span>
                                    </motion.div>

                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <h3 className="text-2xl font-bold text-white mb-2">{t(`creatures.${reward.id}`)}</h3>
                                        <div className="inline-block px-4 py-1 rounded-full border border-white/10 bg-white/5 mb-8">
                                            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: rarityColor }}>
                                                {t(RARITIES[reward.rarity.toUpperCase()].nameKey)}
                                            </span>
                                        </div>
                                    </motion.div>
                                </>
                            )}

                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                onClick={onComplete}
                                className={`w-full py-4 font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg ${reward.rarity === 'secret' ? 'bg-white text-black shadow-white/20' : 'text-black shadow-white/10'}`}
                                style={{ backgroundColor: reward.rarity === 'secret' ? '#ffffff' : rarityColor }}
                            >
                                {reward.rarity === 'secret' ? t('collection.incredible') : t('collection.awesome')}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EggAnimation;
