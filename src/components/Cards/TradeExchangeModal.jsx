import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cardService } from '../../services/cardService';
import { RARITY_CONFIG } from '../UI/Card';
import CardPickerModal from './CardPickerModal';

function MiniCard({ card, placeholder, onClick }) {
  const W = 90, H = 135;
  if (!card) {
    return (
      <motion.div
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        style={{
          width: W, height: H, borderRadius: 12,
          border: '2px dashed rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.03)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer',
        }}
      >
        <Plus size={22} className="text-text-muted" />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '0 8px', lineHeight: 1.4 }}>
          {placeholder}
        </span>
      </motion.div>
    );
  }
  const cfg = RARITY_CONFIG[card.rarity] ?? RARITY_CONFIG.commun;
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      style={{
        width: W, height: H, borderRadius: 12,
        border: `1.5px solid ${cfg.color}`,
        background: cfg.bg, overflow: 'hidden', position: 'relative',
        boxShadow: `0 0 20px ${cfg.color}44`,
      }}
    >
      <img src={`/assets/cards/${card.image}`} alt={card.author} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} onError={e => { e.target.style.display = 'none'; }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }} />
      <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: cfg.color, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {card.author}
      </span>
      <span style={{ position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center', fontSize: 7, color: cfg.color, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', opacity: .85 }}>
        {cfg.label}
      </span>
    </motion.div>
  );
}

function Avatar({ user }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
      {user?.name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

// Animation d'envoi de cartes
function SendAnimation({ offeredCard, requestedCard, onDone }) {
  const cfg1 = RARITY_CONFIG[offeredCard?.rarity] ?? RARITY_CONFIG.commun;
  const cfg2 = RARITY_CONFIG[requestedCard?.rarity] ?? RARITY_CONFIG.commun;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 28 }}>
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 140 }}>
        {/* Offered card flies left */}
        <motion.div
          initial={{ x: 80, opacity: 1 }}
          animate={{ x: -120, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          style={{ position: 'absolute', width: 56, height: 84, borderRadius: 8, border: `1.5px solid ${cfg1.color}`, background: cfg1.bg, boxShadow: `0 0 16px ${cfg1.color}66`, overflow: 'hidden' }}
        >
          <img src={`/assets/cards/${offeredCard?.image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} onError={e => { e.target.style.display = 'none'; }} />
        </motion.div>
        {/* Requested card flies right */}
        <motion.div
          initial={{ x: -80, opacity: 1 }}
          animate={{ x: 120, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          style={{ position: 'absolute', width: 56, height: 84, borderRadius: 8, border: `1.5px solid ${cfg2.color}`, background: cfg2.bg, boxShadow: `0 0 16px ${cfg2.color}66`, overflow: 'hidden' }}
        >
          <img src={`/assets/cards/${requestedCard?.image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} onError={e => { e.target.style.display = 'none'; }} />
        </motion.div>
        {/* Sparkle */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
          transition={{ delay: 0.3, duration: 0.6 }}
          onAnimationComplete={() => { try { onDone(); } catch { /* ignore, modal will stay mounted */ } }}
          style={{ position: 'absolute', fontSize: 32 }}
        >✨</motion.div>
      </div>
    </div>
  );
}

export default function TradeExchangeModal({ request, onClose, onDone }) {
  const { t } = useTranslation();
  const [pickedCard, setPickedCard]     = useState(null);
  const [showPicker, setShowPicker]     = useState(false);
  const [confirming, setConfirming]     = useState(false);
  const [animating, setAnimating]       = useState(false);
  const [error, setError]               = useState('');

  const offeredCard = {
    id: request.card_id, card_name: request.card_name, author: request.author,
    image: request.image, rarity: request.rarity, explanation: request.explanation, quote: request.quote,
  };

  const ERROR_MSGS = {
    INITIATOR_CARD_GONE:  t('trade.errors.cardGone'),
    RECEIVER_CARD_GONE:   t('trade.errors.cardGone'),
    INITIATOR_STOCK_FULL: t('trade.errors.initiatorStockFull'),
    RECEIVER_STOCK_FULL:  t('trade.errors.receiverStockFull'),
  };

  const handleConfirm = async () => {
    if (!pickedCard || confirming) return;
    setConfirming(true);
    setError('');
    try {
      const res = await cardService.acceptRequest(request.id, pickedCard.id);
      if (res.error) { setError(ERROR_MSGS[res.error] ?? t('common.error')); setConfirming(false); return; }
      setAnimating(true);
    } catch (e) {
      const code = e?.response?.data?.error;
      setError(ERROR_MSGS[code] ?? t('common.error'));
      setConfirming(false);
    }
  };

  return ReactDOM.createPortal(
    <>
      <AnimatePresence>
        <motion.div
          key="exchange-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9300] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
          onClick={!confirming ? onClose : undefined}
        >
          <motion.div
            key="exchange-modal"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-[28px] flex flex-col overflow-hidden relative"
            style={{
              background: 'rgba(10,18,35,0.97)',
              border: '1.5px solid rgba(255,255,255,0.12)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
            }}
          >
            {/* Send animation overlay */}
            {animating && (
              <SendAnimation offeredCard={offeredCard} requestedCard={pickedCard} onDone={onDone} />
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
              <span className="font-bold text-text-main text-sm">{t('trade.exchangeTitle')}</span>
              {!confirming && (
                <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Split view */}
            <div className="flex items-stretch" style={{ minHeight: 220 }}>
              {/* Left — receiver picks */}
              <div className="flex-1 flex flex-col items-center gap-3 p-5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-muted font-medium">{t('trade.yourCard')}</span>
                </div>
                <MiniCard card={pickedCard} placeholder={t('trade.clickToPick')} onClick={() => setShowPicker(true)} />
                {pickedCard && (
                  <button onClick={() => setShowPicker(true)} className="text-xs text-text-muted underline underline-offset-2 opacity-60">
                    {t('trade.change')}
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="flex flex-col items-center justify-center py-6 gap-1.5" style={{ width: 28 }}>
                <div className="flex-1 w-px" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.12), transparent)' }} />
                <span style={{ fontSize: 16 }}>⇄</span>
                <div className="flex-1 w-px" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.12), transparent)' }} />
              </div>

              {/* Right — initiator's offered card */}
              <div className="flex-1 flex flex-col items-center gap-3 p-5">
                <div className="flex items-center gap-1.5">
                  <Avatar user={{ name: request.initiator_name, avatar: request.initiator_avatar }} />
                  <span className="text-xs text-text-muted font-medium truncate max-w-[70px]">{request.initiator_name}</span>
                </div>
                <MiniCard card={offeredCard} />
              </div>
            </div>

            {/* Error */}
            {error && <p className="px-5 pb-2 text-red-400 text-xs text-center">{error}</p>}

            {/* Confirm button */}
            <div className="px-5 pb-5">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleConfirm}
                disabled={!pickedCard || confirming}
                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#38bdf822,#38bdf844)', border: '1.5px solid #38bdf8', color: '#38bdf8' }}
              >
                {confirming
                  ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  : <Check size={16} />
                }
                {t('trade.confirmExchange')}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {showPicker && (
        <CardPickerModal
          requestId={request.id}
          onSelect={card => { setPickedCard(card); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>,
    document.body
  );
}
