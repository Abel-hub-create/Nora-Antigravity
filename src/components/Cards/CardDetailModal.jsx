import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card, { RARITY_CONFIG } from '../UI/Card';

export default function CardDetailModal({ card, count, onClose, onTrade }) {
  const { t } = useTranslation();
  if (!card) return null;

  const cfg = RARITY_CONFIG[card.rarity] ?? RARITY_CONFIG.commun;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9000] flex flex-col items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          key="card-container"
          initial={{ scale: 0.6, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          onClick={e => e.stopPropagation()}
          className="flex flex-col items-center gap-5"
        >
          {/* Count badge */}
          {count > 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 20, padding: '4px 14px',
                color: cfg.color, fontWeight: 800, fontSize: 13,
                letterSpacing: '.06em',
              }}
            >
              ×{count} {t('trade.copies')}
            </motion.div>
          )}

          {/* Card at 1.5x scale */}
          <div style={{ filter: `drop-shadow(0 0 32px ${cfg.color}55)` }}>
            <Card card={card} scale={1.5} showFlipHint />
          </div>

          {/* Card info */}
          <div className="text-center">
            <p style={{ color: cfg.color, fontWeight: 800, fontSize: 15, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              {card.card_name}
            </p>
            <p className="text-text-muted text-xs mt-1">{card.author}</p>
          </div>

          {/* Exchange button */}
          {count > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onTrade}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm"
              style={{
                background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}44)`,
                border: `1.5px solid ${cfg.color}`,
                color: cfg.color,
                boxShadow: `0 0 20px ${cfg.color}33`,
              }}
            >
              <ArrowLeftRight size={16} />
              {t('trade.exchange')}
            </motion.button>
          )}
        </motion.div>

        {/* Close button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <X size={18} className="text-text-muted" />
        </motion.button>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
