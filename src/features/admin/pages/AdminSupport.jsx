import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../services/adminApiClient';
import { LifeBuoy, MessageSquare, Clock, CheckCircle, X, Send, Trash2 } from 'lucide-react';

const CATEGORY_LABELS = { bug: 'Bug', billing: 'Facturation', question: 'Question', other: 'Autre' };
const CATEGORY_COLORS = {
  bug: 'bg-red-500/15 text-red-400',
  billing: 'bg-amber-500/15 text-amber-400',
  question: 'bg-sky-500/15 text-sky-400',
  other: 'bg-gray-500/15 text-gray-400',
};

function ReplyModal({ ticket, onClose, onReplied }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await adminApi.post(`/support/${ticket.id}/reply`, { reply: reply.trim() });
      onReplied();
    } catch { /* silent */ } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-bold">Répondre au ticket</h3>
            <p className="text-gray-400 text-sm mt-0.5 truncate">{ticket.subject}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300 leading-relaxed max-h-32 overflow-y-auto">
          {ticket.message}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Votre réponse..."
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white placeholder-gray-500 resize-none outline-none focus:border-sky-500 transition-colors"
            required
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-colors disabled:opacity-50"
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                : <Send size={14} />
              }
              Envoyer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TicketRow({ ticket, onReply, onDelete }) {
  const answered = !!ticket.admin_reply;
  const date = new Date(ticket.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[ticket.category] ?? CATEGORY_COLORS.other}`}>
              {CATEGORY_LABELS[ticket.category] ?? ticket.category}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${answered ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
              {answered ? 'Répondu' : 'En attente'}
            </span>
            <span className="text-gray-500 text-xs">{date}</span>
          </div>
          <p className="text-white font-semibold text-sm mt-1.5">{ticket.subject}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {ticket.user_name
              ? `${ticket.user_name} (${ticket.user_email ?? '—'})`
              : ticket.email ?? 'Utilisateur anonyme'}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {!answered && (
            <button
              onClick={() => onReply(ticket)}
              title="Répondre"
              className="p-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 transition-colors"
            >
              <MessageSquare size={15} />
            </button>
          )}
          <button
            onClick={() => onDelete(ticket.id)}
            title="Supprimer"
            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <p className="text-gray-400 text-xs leading-relaxed border-t border-gray-800 pt-3">{ticket.message}</p>

      {answered && (
        <div className="bg-sky-500/8 border border-sky-500/20 rounded-lg p-3 space-y-1">
          <p className="text-sky-400 text-xs font-semibold">Votre réponse</p>
          <p className="text-gray-300 text-xs leading-relaxed">{ticket.admin_reply}</p>
        </div>
      )}
    </div>
  );
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [replyTicket, setReplyTicket] = useState(null);

  const load = useCallback(async () => {
    try {
      const { tickets: data } = await adminApi.get('/support');
      setTickets(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce ticket ?')) return;
    try {
      await adminApi.delete(`/support/${id}`);
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch { /* silent */ }
  };

  const handleReplied = () => {
    setReplyTicket(null);
    load();
  };

  const unansweredCount = tickets.filter(t => !t.admin_reply).length;
  const displayed = filter === 'unanswered' ? tickets.filter(t => !t.admin_reply) : tickets;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LifeBuoy size={24} className="text-sky-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Support</h1>
              <p className="text-gray-400 text-sm">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} au total</p>
            </div>
          </div>
          {unansweredCount > 0 && (
            <span className="bg-amber-500/15 text-amber-400 text-sm font-bold px-3 py-1 rounded-full">
              {unansweredCount} en attente
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'unanswered', label: 'Non répondus' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === id
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CheckCircle size={40} className="text-green-400 opacity-40" />
            <p className="text-gray-400 text-sm">
              {filter === 'unanswered' ? 'Tous les tickets ont été traités 🎉' : 'Aucun ticket pour l\'instant'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(ticket => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                onReply={setReplyTicket}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {replyTicket && (
        <ReplyModal
          ticket={replyTicket}
          onClose={() => setReplyTicket(null)}
          onReplied={handleReplied}
        />
      )}
    </AdminLayout>
  );
}
