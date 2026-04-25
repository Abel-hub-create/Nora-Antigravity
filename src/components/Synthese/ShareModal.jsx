import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDOM from 'react-dom';
import { X, Search, Send, Crown, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { lookupUser, sendSynthese } from '../../services/shareService';

export default function ShareModal({ syntheseId, syntheseTitle, onClose }) {
  const { t } = useTranslation();
  const [code, setCode]           = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError]   = useState(null);
  const [isLooking, setIsLooking]       = useState(false);
  const [isSending, setIsSending]       = useState(false);
  const [sent, setSent]                 = useState(false);
  const inputRef = useRef(null);

  const handleLookup = async () => {
    if (!code.trim()) return;
    setIsLooking(true);
    setLookupResult(null);
    setLookupError(null);
    setSent(false);
    try {
      const res = await lookupUser(code.trim());
      setLookupResult(res);
    } catch (err) {
      const code_ = err?.response?.data?.error;
      if (code_ === 'USER_NOT_FOUND') setLookupError('user_not_found');
      else if (code_ === 'SHARE_NOT_AVAILABLE') setLookupError('not_premium_sender');
      else setLookupError('generic');
    } finally {
      setIsLooking(false);
    }
  };

  const handleSend = async () => {
    if (!lookupResult?.canReceive) return;
    setIsSending(true);
    try {
      await sendSynthese(syntheseId, lookupResult.recipient.share_code);
      setSent(true);
      setLookupResult(null);
    } catch (err) {
      const c = err?.response?.data?.error;
      if (c === 'RECIPIENT_QUOTA_FULL') setLookupError('quota_full');
      else if (c === 'SELF_SHARE') setLookupError('self_share');
      else setLookupError('generic');
    } finally {
      setIsSending(false);
    }
  };

  const isPremiumBadge = (plan) => plan && plan !== 'free';

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-sm bg-surface border border-white/10 rounded-3xl p-6 shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-text-main">Partager la synthèse</h3>
              <p className="text-xs text-text-muted mt-0.5 truncate max-w-[220px]">{syntheseTitle}</p>
            </div>
            <button onClick={onClose} className="no-hover p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Input code */}
          <div className="flex gap-2 mb-4">
            <input
              ref={inputRef}
              value={code}
              onChange={e => { setCode(e.target.value); setLookupResult(null); setLookupError(null); setSent(false); }}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder="Code du destinataire (ex: SleepyBadger)"
              className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={handleLookup}
              disabled={isLooking || !code.trim()}
              className="no-hover px-3 py-2 bg-primary/20 border border-primary/30 rounded-xl text-primary hover:bg-primary/30 transition-colors disabled:opacity-40"
            >
              {isLooking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>

          {/* Résultat lookup */}
          <AnimatePresence mode="wait">
            {sent && (
              <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-2xl"
              >
                <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                <p className="text-sm text-green-300">Synthèse envoyée avec succès !</p>
              </motion.div>
            )}

            {lookupError && (
              <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl"
              >
                <AlertCircle size={18} className="text-red-400 shrink-0" />
                <p className="text-sm text-red-300">
                  {lookupError === 'user_not_found'     && 'Aucun utilisateur avec ce code.'}
                  {lookupError === 'not_premium_sender' && 'Le partage est réservé aux membres Premium et École.'}
                  {lookupError === 'quota_full'         && 'Ce membre a atteint sa limite de synthèses.'}
                  {lookupError === 'self_share'         && 'Tu ne peux pas t\'envoyer une synthèse à toi-même.'}
                  {lookupError === 'generic'            && 'Une erreur est survenue. Réessaie.'}
                </p>
              </motion.div>
            )}

            {lookupResult && !sent && (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {/* Carte user */}
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 overflow-hidden">
                    {lookupResult.recipient.avatar
                      ? <img src={lookupResult.recipient.avatar} alt="" className="w-full h-full object-cover" />
                      : <span className="text-sm font-bold text-white">{lookupResult.recipient.name?.charAt(0)?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-main truncate">{lookupResult.recipient.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isPremiumBadge(lookupResult.recipient.plan_type) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                          <Crown size={9} className="text-amber-400" />
                          <span className="text-[9px] font-semibold text-amber-400 capitalize">{lookupResult.recipient.plan_type}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-text-muted">
                        {lookupResult.synthesesCount}/{lookupResult.maxSyntheses} synthèses
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message quota ou bouton envoi */}
                {!lookupResult.canReceive ? (
                  <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                    <AlertCircle size={15} className="text-orange-400 shrink-0" />
                    <p className="text-xs text-orange-300">
                      {lookupResult.reason === 'QUOTA_FULL'
                        ? `${lookupResult.recipient.name} a atteint sa limite de synthèses (${lookupResult.maxSyntheses}).`
                        : `${lookupResult.recipient.name} n'est pas membre Premium ou École.`}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={isSending}
                    className="no-hover w-full flex items-center justify-center gap-2 py-3 bg-primary/20 border border-primary/30 rounded-2xl text-primary font-semibold text-sm hover:bg-primary/30 transition-colors disabled:opacity-50"
                  >
                    {isSending
                      ? <Loader2 size={16} className="animate-spin" />
                      : <><Send size={15} /> Envoyer la synthèse</>
                    }
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
