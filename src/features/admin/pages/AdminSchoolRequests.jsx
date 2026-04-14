import React, { useEffect, useState, useCallback } from 'react';
import { School, Mail, Users, MessageSquare, ChevronLeft, ChevronRight, Loader2, Trash2, CheckCircle, XCircle, Clock, Phone } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Toutes', color: 'gray' },
  { value: 'pending', label: 'En attente', color: 'amber' },
  { value: 'contacted', label: 'Contactée', color: 'sky' },
  { value: 'accepted', label: 'Acceptée', color: 'emerald' },
  { value: 'rejected', label: 'Rejetée', color: 'red' },
];

const statusBadge = (status) => {
  const map = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    contacted: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    accepted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return map[status] || map.pending;
};

export default function AdminSchoolRequests() {
  const [data, setData] = useState({ requests: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, status: filter });
      const res = await adminApi.get(`/school-requests?${params}`);
      setData(res);
    } finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    setActionLoading(id);
    try {
      await adminApi.patch(`/school-requests/${id}`, { status, admin_notes: notes || undefined });
      await load();
    } finally { setActionLoading(null); }
  };

  const saveNotes = async (id) => {
    setActionLoading(id);
    try {
      await adminApi.patch(`/school-requests/${id}`, { admin_notes: notes });
      await load();
    } finally { setActionLoading(null); }
  };

  const deleteRequest = async (id) => {
    if (!confirm('Supprimer cette demande ?')) return;
    try {
      await adminApi.delete(`/school-requests/${id}`);
      await load();
    } catch (err) { alert(err.message); }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Demandes écoles <span className="text-gray-500 font-normal text-lg">({data.total})</span></h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => { setFilter(s.value); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${filter === s.value ? 'bg-sky-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-sky-400" size={32} /></div>
        ) : data.requests.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Aucune demande</div>
        ) : (
          <div className="space-y-3">
            {data.requests.map(req => (
              <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => { setExpandedId(expandedId === req.id ? null : req.id); setNotes(req.admin_notes || ''); }}>
                  <School size={20} className="text-violet-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm">{req.school_name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><Mail size={10} /> {req.contact_email}</span>
                      {req.contact_name && <span>{req.contact_name}</span>}
                      {req.student_count && <span className="flex items-center gap-1"><Users size={10} /> {req.student_count} élèves</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge(req.status)}`}>
                    {STATUS_OPTIONS.find(s => s.value === req.status)?.label || req.status}
                  </span>
                  <span className="text-xs text-gray-600">{new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                </div>

                {expandedId === req.id && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-3">
                    {req.message && (
                      <div className="bg-gray-800/50 rounded-xl p-3">
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MessageSquare size={10} /> Message</div>
                        <p className="text-sm text-gray-300">{req.message}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Notes admin</label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500 resize-none"
                        placeholder="Ajouter des notes..." />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => updateStatus(req.id, 'contacted')} disabled={actionLoading === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-medium hover:bg-sky-500/30 transition-colors disabled:opacity-50">
                        <Phone size={12} /> Contactée
                      </button>
                      <button onClick={() => updateStatus(req.id, 'accepted')} disabled={actionLoading === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                        <CheckCircle size={12} /> Accepter
                      </button>
                      <button onClick={() => updateStatus(req.id, 'rejected')} disabled={actionLoading === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50">
                        <XCircle size={12} /> Rejeter
                      </button>
                      <button onClick={() => saveNotes(req.id)} disabled={actionLoading === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-xs font-medium hover:bg-gray-600 transition-colors disabled:opacity-50">
                        Sauvegarder notes
                      </button>
                      <button onClick={() => deleteRequest(req.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors ml-auto">
                        <Trash2 size={12} /> Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg bg-gray-800 disabled:opacity-30 hover:bg-gray-700 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-400">Page {page} / {data.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
              className="p-2 rounded-lg bg-gray-800 disabled:opacity-30 hover:bg-gray-700 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
