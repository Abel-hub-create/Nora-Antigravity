import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cardService } from '../../services/cardService';
import { RARITY_CONFIG } from '../UI/Card';

function CardItem({ card, onSelect, onStockFull }) {
  const cfg = RARITY_CONFIG[card.rarity] ?? RARITY_CONFIG.commun;

  const handleClick = () => {
    if (card.initiator_stock_full) { onStockFull(); return; }
    onSelect(card);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className="relative flex flex-col items-center gap-1.5 cursor-pointer"
    >
      <div style={{
        width: 72, height: 108, borderRadius: 8,
        border: `1.5px solid ${card.initiator_stock_full ? 'rgba(255,255,255,0.1)' : cfg.color}`,
        background: cfg.bg,
        overflow: 'hidden', position: 'relative',
        opacity: card.initiator_stock_full ? 0.38 : 1,
        boxShadow: card.initiator_stock_full ? 'none' : `0 0 10px ${cfg.color}33`,
        transition: 'all .2s',
      }}>
        <img
          src={`/assets/cards/${card.image}`}
          alt={card.author}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }} />
        <span style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center', fontSize: 7, color: cfg.color, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}>
          {card.author}
        </span>
        {card.count > 1 && (
          <span style={{
            position: 'absolute', top: 3, left: 3,
            background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '1px 5px',
            fontSize: 8, color: cfg.color, fontWeight: 800,
          }}>×{card.count}</span>
        )}
        {card.initiator_stock_full && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
            <AlertCircle size={18} className="text-red-400" />
          </div>
        )}
      </div>
      <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', maxWidth: 72, textAlign: 'center', lineHeight: 1.2 }}>
        {card.set_abbr === 'MH' ? 'MH' : card.set_abbr === 'DS' ? 'DS' : ''}
      </span>
    </motion.div>
  );
}

export default function CardPickerModal({ requestId, onSelect, onClose }) {
  const { t } = useTranslation();
  const [cards, setCards]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState('');

  useEffect(() => {
    cardService.getAvailableCards(requestId)
      .then(d => setCards(d.cards ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requestId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        key="picker-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9400] flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          key="picker-modal"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg rounded-t-3xl flex flex-col"
          style={{
            background: 'rgba(10,18,35,0.98)',
            border: '1.5px solid rgba(255,255,255,0.12)',
            borderBottom: 'none',
            maxHeight: '70vh',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5">
            <span className="font-bold text-text-main">{t('trade.pickCard')}</span>
            <button onClick={onClose} className="text-text-muted">
              <X size={18} />
            </button>
          </div>

          <p className="px-5 pb-3 text-xs text-text-muted">{t('trade.pickCardHint')}</p>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cards.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">{t('trade.noEligibleCards')}</p>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px,1fr))' }}>
                {cards.map(card => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onSelect={onSelect}
                    onStockFull={() => showToast(t('trade.errors.initiatorStockFull'))}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium z-[9500]"
              style={{ background: 'rgba(248,113,113,0.92)', color: '#fff', whiteSpace: 'nowrap' }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
