import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, LifeBuoy, CheckCircle, Clock, Send, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supportService } from '../services/supportService';

const CATEGORIES = ['bug', 'billing', 'question', 'other'];

function CategoryKey(cat) {
  const map = { bug: 'categoryBug', billing: 'categoryBilling', question: 'categoryQuestion', other: 'categoryOther' };
  return map[cat] ?? 'categoryOther';
}

function TicketCard({ ticket }) {
  const { t } = useTranslation();
  const answered = !!ticket.admin_reply;
  const date = new Date(ticket.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-text-main text-sm font-semibold truncate">{ticket.subject}</p>
          <p className="text-text-muted text-xs mt-0.5">{date} · {t(`support.${CategoryKey(ticket.category)}`)}</p>
        </div>
        <span
          className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={answered
            ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80' }
            : { background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }
          }
        >
          {answered ? t('support.answered') : t('support.pending')}
        </span>
      </div>

      <p className="text-text-muted text-xs leading-relaxed line-clamp-2">{ticket.message}</p>

      {answered && (
        <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <p className="text-xs font-semibold text-primary">{t('support.adminReply')}</p>
          <p className="text-text-main text-xs leading-relaxed">{ticket.admin_reply}</p>
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('new');
  const [category, setCategory] = useState('question');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const { tickets: data } = await supportService.getMyTickets();
      setTickets(data);
    } catch { /* silent */ } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (tab === 'history') loadTickets();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (subject.trim().length < 3) { setSendError('Le sujet doit faire au moins 3 caractères.'); return; }
    if (message.trim().length < 10) { setSendError('Le message doit faire au moins 10 caractères.'); return; }
    setSending(true);
    setSendError('');
    try {
      await supportService.createTicket(category, subject.trim(), message.trim());
      setSent(true);
      setSubject('');
      setMessage('');
      setCategory('question');
    } catch (err) {
      const details = err?.response?.data?.details;
      const msg = (Array.isArray(details) && details[0]?.message)
        || err?.response?.data?.error
        || t('errors.generic');
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-full bg-background p-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-text-muted hover:text-text-main transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <LifeBuoy size={20} className="text-primary" />
          <h1 className="text-xl font-bold text-text-main">{t('support.title')}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-surface rounded-xl p-1 mb-6">
        {[
          { id: 'new', label: t('support.newTicket') },
          { id: 'history', label: t('support.myTickets') },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setSent(false); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={tab === id
              ? { background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }
              : { color: 'var(--color-text-muted)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'new' ? (
          <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <CheckCircle size={48} className="text-green-400" />
                <div>
                  <p className="text-text-main font-bold text-lg">{t('support.sentTitle')}</p>
                  <p className="text-text-muted text-sm mt-1">{t('support.sentSubtitle')}</p>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setSent(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}
                  >
                    {t('support.newTicketBtn')}
                  </button>
                  <button
                    onClick={() => { setSent(false); setTab('history'); }}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}
                  >
                    {t('support.myTickets')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category */}
                <div className="bg-surface rounded-xl p-4 border border-white/5 space-y-3">
                  <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">{t('support.category')}</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        style={category === cat
                          ? { background: 'rgba(56,189,248,0.18)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-muted)', border: '1px solid rgba(255,255,255,0.08)' }
                        }
                      >
                        {t(`support.${CategoryKey(cat)}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="bg-surface rounded-xl p-4 border border-white/5 space-y-2">
                  <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">{t('support.subject')}</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder={t('support.subjectPlaceholder')}
                    maxLength={200}
                    className="w-full bg-transparent text-text-main text-sm outline-none placeholder:text-text-muted/50"
                    required
                  />
                </div>

                {/* Message */}
                <div className="bg-surface rounded-xl p-4 border border-white/5 space-y-2">
                  <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">{t('support.message')}</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={t('support.messagePlaceholder')}
                    maxLength={5000}
                    rows={5}
                    className="w-full bg-transparent text-text-main text-sm outline-none resize-none placeholder:text-text-muted/50"
                    required
                  />
                </div>

                {sendError && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    {sendError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={sending || subject.trim().length < 3 || message.trim().length < 10}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #38bdf8, #6366f1)', color: '#fff' }}
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {sending ? t('support.sending') : t('support.send')}
                </button>
              </form>
            )}
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={loadTickets}
                disabled={loadingTickets}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={loadingTickets ? 'animate-spin' : ''} />
                Actualiser
              </button>
            </div>
            {loadingTickets ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Clock size={36} className="text-text-muted opacity-30" />
                <div>
                  <p className="text-text-muted text-sm font-medium">{t('support.noTickets')}</p>
                  <p className="text-text-muted/60 text-xs mt-1">{t('support.noTicketsHint')}</p>
                </div>
              </div>
            ) : (
              tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
