import React, { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Search, ChevronLeft, Trash2, User, Calendar, Eye, X, Bot } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

function ConversationModal({ conv, onClose, onDelete }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get(`/conversations/${conv.id}`).then(setData).finally(() => setLoading(false));
  }, [conv.id]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <p className="font-semibold text-white">{conv.title || 'Sans titre'}</p>
            <p className="text-xs text-gray-500">{conv.user_email} · {conv.message_count} messages</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onDelete(conv.id); onClose(); }}
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : data?.messages?.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Aucun message</p>
          ) : data?.messages?.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-sky-400" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-sky-500/20 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className="text-xs opacity-40 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminConversations() {
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const limit = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, search });
      const res = await adminApi.get(`/conversations?${params}`);
      setConversations(res.conversations);
      setTotal(res.total);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette conversation ?')) return;
    await adminApi.delete(`/conversations/${id}`);
    load();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Conversations Aron</h1>
          <span className="text-sm text-gray-500">{total} conversation{total !== 1 ? 's' : ''}</span>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Rechercher par utilisateur, email ou titre..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
            <p>Aucune conversation</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(conv => (
              <div key={conv.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors">
                <div className="w-9 h-9 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} className="text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{conv.title || <span className="text-gray-600 italic">Sans titre</span>}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <User size={11} /> {conv.user_name || conv.user_email}
                    </span>
                    <span className="text-xs text-gray-600">{conv.message_count} msg</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      conv.plan_type === 'premium' ? 'bg-amber-500/10 text-amber-400' :
                      conv.plan_type === 'school' ? 'bg-violet-500/10 text-violet-400' :
                      'text-gray-600'
                    }`}>{conv.plan_type}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600 shrink-0">
                  {new Date(conv.updated_at).toLocaleDateString('fr-FR')}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setSelected(conv)}
                    className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => handleDelete(conv.id)}
                    className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
              <ChevronLeft size={14} /> Précédent
            </button>
            <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
              Suivant <ChevronLeft size={14} className="rotate-180" />
            </button>
          </div>
        )}
      </div>

      {selected && <ConversationModal conv={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />}
    </AdminLayout>
  );
}
