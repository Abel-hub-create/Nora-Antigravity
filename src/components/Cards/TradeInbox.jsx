import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowLeftRight, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cardService } from '../../services/cardService';
import { RARITY_CONFIG } from '../UI/Card';
import TradeExchangeModal from './TradeExchangeModal';

function RequestCard({ req, onAccept, onRefuse }) {
  const { t } = useTranslation();
  const cfg = RARITY_CONFIG[req.rarity] ?? RARITY_CONFIG.commun;
  const [refusing, setRefusing] = useState(false);

  const handleRefuse = async () => {
    setRefusing(true);
    await onRefuse(req.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      className="rounded-2xl p-4 flex items-center gap-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Card thumbnail */}
      <div className="relative flex-shrink-0">
        <div style={{
          width: 54, height: 81, borderRadius: 8,
          border: `1.5px solid ${cfg.color}`,
          background: cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxShadow: `0 0 12px ${cfg.color}33`,
          position: 'relative',
        }}>
          <img
            src={`/assets/cards/${req.image}`}
            alt={req.author}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }} />
          <span style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center', fontSize: 7, color: cfg.color, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {req.author}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          {req.set_abbr === 'MH' ? 'SET 1 · MH' : req.set_abbr === 'DS' ? 'SET 2 · DS' : ''}
        </p>
        <p style={{ color: cfg.color, fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{cfg.label}</p>
        <p className="text-text-muted text-xs mt-1 truncate">
          <span className="text-text-main font-medium">{req.initiator_name}</span>
          {' '}{t('trade.proposesExchange')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => handleRefuse()}
          disabled={refusing}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}
        >
          {refusing
            ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
            : <X size={15} className="text-red-400" />
          }
        </button>
        <button
          onClick={() => onAccept(req)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}
        >
          <Check size={15} className="text-green-400" />
        </button>
      </div>
    </motion.div>
  );
}

export default function TradeInbox({ onClose, onCountChange, onExchangeDone }) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeReq, setActiveReq] = useState(null);

  const load = async () => {
    try {
      const data = await cardService.getInbox();
      setRequests(data.requests ?? []);
      onCountChange?.(data.requests?.length ?? 0);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRefuse = async (id) => {
    try {
      await cardService.refuseRequest(id);
      const updated = requests.filter(r => r.id !== id);
      setRequests(updated);
      onCountChange?.(updated.length);
    } catch { /* silent */ }
  };

  const handleExchangeDone = () => {
    load();
    setActiveReq(null);
    onExchangeDone?.();
  };

  return (
    <>
      {ReactDOM.createPortal(
      <AnimatePresence>
        <motion.div
          key="inbox-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9200] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            key="inbox-modal"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl flex flex-col"
            style={{
              background: 'rgba(10,18,35,0.97)',
              border: '1.5px solid rgba(255,255,255,0.12)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              maxHeight: '80vh',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Inbox size={18} className="text-primary" />
                <span className="font-bold text-text-main">{t('trade.inbox')}</span>
                {requests.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    {requests.length}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <ArrowLeftRight size={32} className="text-text-muted opacity-30" />
                  <p className="text-text-muted text-sm">{t('trade.inboxEmpty')}</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {requests.map(req => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      onRefuse={handleRefuse}
                      onAccept={setActiveReq}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
      )}

      {activeReq && (
        <TradeExchangeModal
          request={activeReq}
          onClose={() => setActiveReq(null)}
          onDone={handleExchangeDone}
        />
      )}
    </>
  );
}
