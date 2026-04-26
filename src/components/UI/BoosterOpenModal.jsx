import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import { useTranslation } from 'react-i18next';

// stage: 'ready' → 'reveal' → 'summary'

const isTouch = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// Précharge toutes les images d'un pack en avance
function preloadPackImages(pack) {
  pack?.forEach(card => {
    if (card?.image) {
      const img = new Image();
      img.src = `/assets/cards/${card.image}`;
    }
  });
}

export default function BoosterOpenModal({ packs, setKey, frontImg, backImg, fallbackImg, setColor = '#a78bfa', onClose }) {
  const { t } = useTranslation();
  const [packIndex, setPackIndex] = useState(0);
  const [stage, setStage]         = useState('ready');
  const [cardIndex, setCardIndex] = useState(0);
  const [allDone, setAllDone]     = useState(false);
  const isAnimatingRef            = useRef(false);
  const touchStartY               = useRef(null);

  // Précharger les images dès le montage du modal
  React.useEffect(() => {
    packs?.forEach(preloadPackImages);
  }, [packs]);

  const currentPack = packs[packIndex] ?? [];
  const totalPacks  = packs.length;
  const isLastPack  = packIndex >= totalPacks - 1;

  const handleBoosterClick = useCallback(() => {
    if (stage !== 'ready') return;
    setStage('reveal');
    setCardIndex(0);
  }, [stage]);

  const handleNextCard = useCallback(() => {
    if (stage !== 'reveal' || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    const next = cardIndex + 1;
    if (next >= currentPack.length) {
      setStage('summary');
    } else {
      setCardIndex(next);
    }
    setTimeout(() => { isAnimatingRef.current = false; }, 350);
  }, [stage, cardIndex, currentPack.length]);

  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartY.current === null || stage !== 'reveal') return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > 50) handleNextCard(); // swipe up ≥ 50px
    touchStartY.current = null;
  }, [stage, handleNextCard]);

  const handleNextBooster = useCallback(() => {
    if (isLastPack) {
      setAllDone(true);
    } else {
      setPackIndex(i => i + 1);
      setStage('ready');
      setCardIndex(0);
    }
  }, [isLastPack]);

  if (allDone) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95" style={{ backdropFilter: 'blur(12px)' }}>

      {totalPacks > 1 && (
        <p className="absolute top-4 left-1/2 -translate-x-1/2 text-sm font-bold text-white/50">
          Booster {packIndex + 1} / {totalPacks}
        </p>
      )}

      {/* Un seul AnimatePresence pour tous les stages — évite le double rendu */}
      <AnimatePresence mode="wait">

        {/* ── READY ── */}
        {stage === 'ready' && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-8"
            onClick={handleBoosterClick}
            style={{ cursor: 'pointer' }}
          >
            <motion.img
              src={frontImg || '/boosternorafront.png'}
              alt="Booster"
              onError={e => { e.target.src = fallbackImg || '/boosternorafront.png'; }}
              style={{ width: 160, height: 'auto', objectFit: 'contain', filter: `drop-shadow(0 0 30px ${setColor}80)` }}
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            />
            <motion.p
              className="text-white/70 text-sm font-semibold tracking-widest uppercase"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {t('shop.tapToOpen')}
            </motion.p>
          </motion.div>
        )}

        {/* ── REVEAL ── */}
        {stage === 'reveal' && (
          <motion.div
            key={`reveal-${packIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-6 w-full px-4"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <p className="text-white/40 text-xs uppercase tracking-widest">
              {cardIndex + 1} / {currentPack.length}
            </p>

            <AnimatePresence mode="wait">
              <motion.div
                key={cardIndex}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-col items-center"
              >
                <Card card={currentPack[cardIndex]} scale={1.35} showFlipHint slotNumber={currentPack[cardIndex]?.slot_number} />
              </motion.div>
            </AnimatePresence>

            {/* Bouton uniquement sur PC — mobile utilise le swipe */}
            {!isTouch() && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleNextCard}
                className="mt-2 px-8 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition-all"
              >
                {cardIndex < currentPack.length - 1
                  ? t('shop.revealNext')
                  : t('shop.seeResult')
                }
              </motion.button>
            )}

            {/* Indicateur swipe sur mobile */}
            {isTouch() && (
              <motion.p
                className="text-white/30 text-xs tracking-widest"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                ↑ swipe
              </motion.p>
            )}
          </motion.div>
        )}

        {/* ── SUMMARY ── */}
        {stage === 'summary' && (
          <motion.div
            key={`summary-${packIndex}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-6 w-full px-4"
          >
            <h2 className="text-xl font-bold text-white">{t('shop.packRevealTitle')}</h2>

            <div className="flex gap-4 justify-center flex-wrap">
              {currentPack.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card card={card} scale={1.0} showFlipHint slotNumber={card?.slot_number} />
                </motion.div>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={isLastPack ? onClose : handleNextBooster}
              className="px-8 py-3 bg-primary text-black font-bold rounded-2xl hover:brightness-110 transition-all"
            >
              {isLastPack ? t('shop.packRevealClose') : t('shop.nextBooster', { n: totalPacks - packIndex - 1 })}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
