import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Coins } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import AnimatedNumber from '../UI/AnimatedNumber';

// Positions fixes pour les particules (calculées une seule fois)
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 220,
  y: -(Math.random() * 160 + 60),
  delay: i * 0.04,
  size: Math.random() * 6 + 8,
}));

export default function CoinBagModal() {
  const { pendingBags, hasPendingBag, revealBag, revealAllBags } = useUser();
  const [step, setStep] = useState('idle'); // idle | opening | coins | all
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [totalBagsRevealed, setTotalBagsRevealed] = useState(0);
  const isRevealingRef = useRef(false);

  const currentBag = pendingBags[0];

  const handleTap = async () => {
    if (step === 'idle' && !isRevealingRef.current && currentBag) {
      isRevealingRef.current = true;
      setStep('opening');

      try {
        // Attendre l'animation d'ouverture (1.2s) puis révéler
        await new Promise(r => setTimeout(r, 1200));
        const result = await revealBag(currentBag.id);
        setCoinsAwarded(result.coinsAwarded);

        // Confetti
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#f59e0b', '#fcd34d', '#ffffff', '#fb923c'],
          disableForReducedMotion: true,
        });

        setStep('coins');
      } catch {
        setStep('idle');
      } finally {
        isRevealingRef.current = false;
      }
    }

    if (step === 'coins' || step === 'all') {
      // Sac suivant ou fermer
      setStep('idle');
      setCoinsAwarded(0);
      setTotalBagsRevealed(0);
      isRevealingRef.current = false;
    }
  };

  const handleRevealAll = async () => {
    if (isRevealingRef.current) return;
    isRevealingRef.current = true;
    const count = pendingBags.length;
    setStep('opening');
    try {
      await new Promise(r => setTimeout(r, 1200));
      const result = await revealAllBags();
      setCoinsAwarded(result.totalCoins);
      setTotalBagsRevealed(count);
      confetti({
        particleCount: 150,
        spread: 110,
        origin: { y: 0.55 },
        colors: ['#f59e0b', '#fcd34d', '#ffffff', '#fb923c'],
        disableForReducedMotion: true,
      });
      setStep('all');
    } catch {
      setStep('idle');
    } finally {
      isRevealingRef.current = false;
    }
  };

  if (!hasPendingBag) return null;

  return ReactDOM.createPortal(
    <div
      className="preserve-colors fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl"
      style={{ touchAction: 'none' }}
    >
      <div className="flex flex-col items-center gap-6 px-8 select-none">

        {/* Titre */}
        <AnimatePresence mode="wait">
          {step === 'idle' && (
            <motion.p
              key="tap-hint"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-white/70 text-sm font-medium tracking-wide"
            >
              Appuie pour ouvrir
            </motion.p>
          )}
          {step === 'opening' && (
            <motion.p
              key="opening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-amber-400 text-sm font-medium"
            >
              Ouverture...
            </motion.p>
          )}
          {step === 'coins' && (
            <motion.p
              key="reward-title"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-amber-300 text-lg font-bold"
            >
              Nouveau niveau ! 🎉
            </motion.p>
          )}
          {step === 'all' && (
            <motion.p
              key="reward-all-title"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-amber-300 text-lg font-bold"
            >
              {totalBagsRevealed} sacs ouverts ! 🎉
            </motion.p>
          )}
        </AnimatePresence>

        {/* Sac + pièces */}
        <div className="relative w-48 h-48 flex items-center justify-center cursor-pointer" onClick={handleTap}>

          {/* Particules de pièces */}
          <AnimatePresence>
            {step === 'coins' && PARTICLES.map(p => (
              <motion.div
                key={p.id}
                className="absolute rounded-full bg-amber-400 border-2 border-amber-300 shadow-lg shadow-amber-500/50"
                style={{ width: p.size, height: p.size }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x: p.x, y: p.y, scale: [0, 1.3, 0.9], opacity: [1, 1, 0] }}
                transition={{ duration: 0.9, delay: p.delay, ease: 'easeOut' }}
              />
            ))}
          </AnimatePresence>

          {/* Le sac */}
          <AnimatePresence mode="wait">
            {(step === 'idle' || step === 'opening') && (
              <motion.div
                key="bag"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={
                  step === 'idle'
                    ? { scale: 1, opacity: 1, y: [0, -12, 0] }
                    : {
                        scale: [1, 1.15, 0.9, 1.25, 0.8, 1.1, 0],
                        rotate: [0, -8, 8, -12, 12, 0, 0],
                        opacity: [1, 1, 1, 1, 1, 1, 0],
                      }
                }
                transition={
                  step === 'idle'
                    ? { y: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }, scale: { duration: 0.3 }, opacity: { duration: 0.3 } }
                    : { duration: 1.2, ease: 'easeInOut' }
                }
                exit={{ scale: 0, opacity: 0 }}
                className="text-7xl"
                whileTap={step === 'idle' ? { scale: 0.92 } : undefined}
              >
                💰
              </motion.div>
            )}

            {(step === 'coins' || step === 'all') && (
              <motion.div
                key="coins-display"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="flex flex-col items-center gap-1"
              >
                <Coins size={64} className="text-amber-400" />
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-amber-300">+</span>
                  <AnimatedNumber
                    value={coinsAwarded}
                    duration={800}
                    className="text-3xl font-black text-amber-300"
                  />
                </div>
                <span className="text-amber-400/80 text-xs font-medium">pièces</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Boutons bas */}
        <AnimatePresence>
          {step === 'coins' && (
            <motion.button
              key="btn-next"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
              onClick={handleTap}
              className="px-8 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold rounded-2xl transition-colors shadow-lg shadow-amber-500/30"
            >
              {pendingBags.length > 1 ? `Suivant (${pendingBags.length - 1} restant${pendingBags.length - 1 > 1 ? 's' : ''})` : 'Continuer'}
            </motion.button>
          )}
          {step === 'all' && (
            <motion.button
              key="btn-close-all"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
              onClick={handleTap}
              className="px-8 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold rounded-2xl transition-colors shadow-lg shadow-amber-500/30"
            >
              Continuer
            </motion.button>
          )}
          {step === 'idle' && pendingBags.length > 2 && (
            <motion.div
              key="reveal-all-section"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <p className="text-white/40 text-xs">{pendingBags.length} sacs à ouvrir</p>
              <button
                onClick={handleRevealAll}
                className="px-6 py-2 bg-white/10 hover:bg-white/15 active:bg-white/20 text-amber-300 text-sm font-semibold rounded-xl border border-amber-500/30 transition-colors"
              >
                Tout récupérer d'un coup
              </button>
            </motion.div>
          )}
          {step === 'idle' && pendingBags.length > 1 && pendingBags.length <= 2 && (
            <motion.p
              key="count-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              className="text-white/40 text-xs"
            >
              {pendingBags.length} sacs à ouvrir
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>,
    document.body
  );
}
