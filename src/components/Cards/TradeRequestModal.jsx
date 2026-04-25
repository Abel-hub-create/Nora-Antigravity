import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card, { RARITY_CONFIG } from '../UI/Card';
import { cardService } from '../../services/cardService';

export default function TradeRequestModal({ card, onClose, onSent }) {
  const { t } = useTranslation();
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cfg = RARITY_CONFIG[card?.rarity] ?? RARITY_CONFIG.commun;

  const ERROR_MSGS = {
    RECEIVER_NOT_FOUND:      t('trade.errors.receiverNotFound'),
    CANNOT_TRADE_YOURSELF:   t('trade.errors.cannotTradeSelf'),
    CARD_NOT_OWNED:          t('trade.errors.cardNotOwned'),
    REQUEST_ALREADY_PENDING: t('trade.errors.alreadyPending'),
  };

  const handleSubmit = async () => {
    if (!shareCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await cardService.sendTradeRequest(shareCode.trim().toUpperCase(), card.id);
      if (res.error) { setError(ERROR_MSGS[res.error] ?? res.error); return; }
      onSent?.();
      onClose();
    } catch (e) {
      const code = e?.response?.data?.error;
      setError(ERROR_MSGS[code] ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        key="trade-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9100] flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          key="trade-modal"
          initial={{ y: 60, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5"
          style={{
            background: 'rgba(10,18,35,0.96)',
            border: '1.5px solid rgba(255,255,255,0.12)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={18} style={{ color: cfg.color }} />
              <span className="font-bold text-text-main">{t('trade.sendRequest')}</span>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Card preview */}
          <div className="flex items-center gap-4 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Card card={card} scale={0.5} />
            <div>
              <p className="font-bold text-sm text-text-main">{card?.card_name}</p>
              <p style={{ color: cfg.color, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                {cfg.label}
              </p>
              <p className="text-text-muted text-xs mt-0.5">{card?.author}</p>
            </div>
          </div>

          {/* Share code input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-muted font-medium tracking-wide uppercase">
              {t('trade.shareCodeLabel')}
            </label>
            <input
              type="text"
              value={shareCode}
              onChange={e => setShareCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={t('trade.shareCodePlaceholder')}
              maxLength={12}
              className="w-full rounded-xl px-4 py-3 text-text-main font-mono text-sm tracking-widest focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${error ? '#f87171' : 'rgba(255,255,255,0.12)'}`,
              }}
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSubmit}
            disabled={loading || !shareCode.trim()}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            style={{
              background: `linear-gradient(135deg, ${cfg.color}33, ${cfg.color}55)`,
              border: `1.5px solid ${cfg.color}`,
              color: cfg.color,
            }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `${cfg.color}40`, borderTopColor: cfg.color }} />
            ) : (
              <Send size={15} />
            )}
            {loading ? t('common.loading') : t('trade.sendBtn')}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
