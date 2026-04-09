import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Send, Loader2, X, Check } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

const TYPE_COLORS = {
  info: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  maintenance: 'bg-red-500/10 border-red-500/20 text-red-400',
  feature: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
};

const EMPTY = { title: '', body: '', type: 'info', target_audience: 'all', is_active: true, starts_at: '', ends_at: '' };

function AnnouncementModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg my-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-white">{initial?.id ? 'Modifier' : 'Nouvelle annonce'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Titre *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} maxLength={100}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Contenu *</label>
            <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-sky-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="info">Info</option>
                <option value="warning">Avertissement</option>
                <option value="maintenance">Maintenance</option>
                <option value="feature">Nouveauté</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Audience</label>
              <select value={form.target_audience} onChange={e => set('target_audience', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="all">Tous</option>
                <option value="premium">Premium</option>
                <option value="free">Gratuit</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Début (optionnel)</label>
              <input type="date" value={form.starts_at} onChange={e => set('starts_at', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Fin (optionnel)</label>
              <input type="date" value={form.ends_at} onChange={e => set('ends_at', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="accent-sky-400" />
            <span className="text-sm text-gray-300">Active</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm">Annuler</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.title || !form.body}
            className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    adminApi.get('/announcements').then(d => setAnnouncements(d.announcements)).finally(() => setLoading(false));
  }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (form.id) {
        const { announcement } = await adminApi.patch(`/announcements/${form.id}`, form);
        setAnnouncements(a => a.map(x => x.id === form.id ? announcement : x));
      } else {
        const { announcement } = await adminApi.post('/announcements', form);
        setAnnouncements(a => [announcement, ...a]);
      }
      setModal(null);
      showToast(form.id ? 'Annonce modifiée' : 'Annonce créée');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await adminApi.delete(`/announcements/${id}`);
    setAnnouncements(a => a.filter(x => x.id !== id));
    showToast('Supprimée');
  };

  const handleSend = async (id) => {
    if (!confirm('Envoyer par email à tous les utilisateurs actifs ?')) return;
    setSendingId(id);
    try {
      const res = await adminApi.post(`/announcements/${id}/send`);
      setAnnouncements(a => a.map(x => x.id === id ? { ...x, sent_at: new Date().toISOString() } : x));
      showToast(res.message || 'Envoyé !');
    } catch (e) { showToast(e.message || 'Erreur envoi'); }
    finally { setSendingId(null); }
  };

  return (
    <AdminLayout>
      {modal && <AnnouncementModal initial={modal} onSave={handleSave} onClose={() => setModal(null)} saving={saving} />}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Annonces</h1>
        <button onClick={() => setModal(EMPTY)}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Nouvelle
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Aucune annonce</div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[a.type]}`}>{a.type}</span>
                    <span className="text-xs text-gray-600">{a.target_audience === 'all' ? 'Tous' : a.target_audience}</span>
                    {!a.is_active && <span className="text-xs text-gray-600 border border-gray-700 px-2 py-0.5 rounded-full">Inactive</span>}
                    {a.sent_at && <span className="text-xs text-emerald-500">✓ Envoyée le {new Date(a.sent_at).toLocaleDateString('fr-FR')}</span>}
                  </div>
                  <h3 className="font-semibold text-white">{a.title}</h3>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{a.body}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleSend(a.id)} disabled={sendingId === a.id}
                    title="Envoyer par email"
                    className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors">
                    {sendingId === a.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                  <button onClick={() => setModal(a)} title="Modifier"
                    className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(a.id)} title="Supprimer"
                    className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
