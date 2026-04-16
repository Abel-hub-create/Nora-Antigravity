import React, { useEffect, useState } from 'react';
import { Calendar, Plus, Trash2, CheckCircle, Edit3, Loader2, Trophy } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  // format: YYYY-MM-DDTHH:MM
  return d.toISOString().slice(0, 16);
};

export default function AdminSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Formulaire création
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ number: '', name: '', starts_at: '', set_active: false });

  // Formulaire édition
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', starts_at: '' });

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.get('/seasons');
      setSeasons(data.seasons || []);
    } catch (e) {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const notify = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.number || !form.name || !form.starts_at) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.post('/seasons', {
        number: parseInt(form.number, 10),
        name: form.name,
        starts_at: new Date(form.starts_at).toISOString(),
        set_active: form.set_active,
      });
      setForm({ number: '', name: '', starts_at: '', set_active: false });
      setShowCreate(false);
      await load();
      notify('Saison créée avec succès');
    } catch (e) {
      setError(e.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id) => {
    setSaving(true);
    try {
      await adminApi.patch(`/seasons/${id}/activate`);
      await load();
      notify('Saison activée');
    } catch (e) {
      setError('Erreur lors de l\'activation');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette saison ? Cette action est irréversible.')) return;
    setSaving(true);
    try {
      await adminApi.delete(`/seasons/${id}`);
      await load();
      notify('Saison supprimée');
    } catch (e) {
      setError('Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (season) => {
    setEditId(season.id);
    setEditForm({ name: season.name, starts_at: toLocalInput(season.starts_at) });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.patch(`/seasons/${editId}`, {
        name: editForm.name,
        starts_at: new Date(editForm.starts_at).toISOString(),
      });
      setEditId(null);
      await load();
      notify('Saison modifiée');
    } catch (e) {
      setError('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const activeSeason = seasons.find(s => s.is_active);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy size={22} className="text-sky-400" />
              Gestion des Saisons
            </h1>
            <p className="text-gray-400 text-sm mt-1">Créez et gérez les saisons du classement</p>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl hover:bg-sky-500/30 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Nouvelle saison
          </button>
        </div>

        {/* Feedback */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle size={14} /> {success}
          </div>
        )}

        {/* Saison active */}
        {activeSeason && (
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4">
            <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider mb-1">Saison active</p>
            <p className="text-white font-bold">{activeSeason.name}</p>
            <p className="text-gray-400 text-xs mt-1">
              Du {formatDate(activeSeason.starts_at)} au {formatDate(activeSeason.ends_at)}
            </p>
          </div>
        )}

        {/* Formulaire création */}
        {showCreate && (
          <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Créer une saison</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Numéro de saison</label>
                <input
                  type="number" min="1" required
                  value={form.number}
                  onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  placeholder="Ex: 1"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nom de la saison</label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Saison Été 2026"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date et heure de début</label>
              <input
                type="datetime-local" required
                value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
              />
              <p className="text-xs text-gray-500 mt-1">La saison durera 30 jours à partir de cette date.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.set_active}
                onChange={e => setForm(f => ({ ...f, set_active: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-300">Activer cette saison immédiatement</span>
            </label>
            <div className="flex gap-3 pt-1">
              <button
                type="submit" disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Créer
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Liste des saisons */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-sky-400" />
          </div>
        ) : seasons.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy size={36} className="mx-auto mb-3 opacity-30" />
            <p>Aucune saison créée.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {seasons.map(season => (
              <div key={season.id} className={`bg-gray-900 border rounded-2xl p-4 ${season.is_active ? 'border-sky-500/40' : 'border-gray-800'}`}>
                {editId === season.id ? (
                  <form onSubmit={handleEdit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Nom</label>
                        <input
                          type="text" required
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Date de début</label>
                        <input
                          type="datetime-local" required
                          value={editForm.starts_at}
                          onChange={e => setEditForm(f => ({ ...f, starts_at: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving} className="px-3 py-1.5 bg-sky-500 text-white rounded-lg text-xs font-medium hover:bg-sky-600 disabled:opacity-50">
                        Enregistrer
                      </button>
                      <button type="button" onClick={() => setEditId(null)} className="px-3 py-1.5 text-gray-400 hover:text-white text-xs">
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{season.name}</span>
                        {season.is_active && (
                          <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
                        )}
                        {season.reset_executed === 1 && (
                          <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-bold">TERMINÉE</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">
                        S{season.number} · {formatDate(season.starts_at)} → {formatDate(season.ends_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!season.is_active && season.reset_executed === 0 && (
                        <button
                          onClick={() => handleActivate(season.id)}
                          disabled={saving}
                          className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                        >
                          Activer
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(season)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(season.id)}
                        disabled={saving}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
