import React, { useEffect, useState, useCallback } from 'react';
import { Ticket, Plus, Trash2, Loader2, Save, X, ToggleLeft, ToggleRight, Copy, Check } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(null);
  const [copied, setCopied] = useState(null);

  // New promo form
  const [form, setForm] = useState({
    code: '', discount_type: 'percent', discount_value: 10,
    max_uses: '', valid_from: '', valid_until: '', applicable_plans: [],
    stripe_coupon_id: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/promo-codes');
      setCodes(res.codes);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.code.trim() || form.discount_value <= 0) {
      alert('Code et valeur de réduction requis');
      return;
    }
    setSaving('create');
    try {
      await adminApi.post('/promo-codes', {
        ...form,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        applicable_plans: form.applicable_plans.length > 0 ? form.applicable_plans : null,
        stripe_coupon_id: form.stripe_coupon_id || null,
      });
      setShowCreate(false);
      setForm({ code: '', discount_type: 'percent', discount_value: 10, max_uses: '', valid_from: '', valid_until: '', applicable_plans: [], stripe_coupon_id: '' });
      await load();
    } catch (err) {
      alert('Erreur: ' + err.message);
    } finally { setSaving(null); }
  };

  const toggleActive = async (promo) => {
    setSaving(promo.id);
    try {
      await adminApi.patch(`/promo-codes/${promo.id}`, { is_active: promo.is_active ? 0 : 1 });
      await load();
    } finally { setSaving(null); }
  };

  const deleteCode = async (id) => {
    if (!confirm('Supprimer ce code promo ?')) return;
    try {
      await adminApi.delete(`/promo-codes/${id}`);
      await load();
    } catch (err) { alert(err.message); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const togglePlan = (slug) => {
    setForm(f => ({
      ...f,
      applicable_plans: f.applicable_plans.includes(slug)
        ? f.applicable_plans.filter(p => p !== slug)
        : [...f.applicable_plans, slug]
    }));
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Codes promo</h1>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors">
            {showCreate ? <X size={16} /> : <Plus size={16} />}
            {showCreate ? 'Annuler' : 'Nouveau code'}
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Code</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="EX: RENTREE2024" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white uppercase placeholder:text-gray-600 focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
                  <option value="percent">Pourcentage (%)</option>
                  <option value="fixed">Montant fixe (€)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valeur</label>
                <input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Utilisations max (vide = illimité)</label>
                <input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                  placeholder="Illimité" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valide à partir de</label>
                <input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valide jusqu'au</label>
                <input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Plans applicables (vide = tous)</label>
              <div className="flex gap-2">
                {['premium', 'school'].map(slug => (
                  <button key={slug} onClick={() => togglePlan(slug)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${form.applicable_plans.includes(slug) ? 'bg-sky-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    {slug}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Stripe Coupon ID (optionnel)</label>
              <input value={form.stripe_coupon_id} onChange={e => setForm(f => ({ ...f, stripe_coupon_id: e.target.value }))}
                placeholder="coupon_..." className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500" />
            </div>
            <button onClick={handleCreate} disabled={saving === 'create'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium transition-colors disabled:opacity-50">
              {saving === 'create' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Créer le code
            </button>
          </div>
        )}

        {/* Codes List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-sky-400" size={32} /></div>
        ) : codes.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Aucun code promo</div>
        ) : (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Code</th>
                    <th className="text-left px-5 py-3">Réduction</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">Utilisations</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">Validité</th>
                    <th className="text-left px-5 py-3">Statut</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {codes.map(promo => (
                    <tr key={promo.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Ticket size={14} className="text-amber-400" />
                          <span className="font-mono font-bold text-sm text-white">{promo.code}</span>
                          <button onClick={() => copyCode(promo.code)} className="p-1 text-gray-600 hover:text-white transition-colors">
                            {copied === promo.code ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        <span className="text-amber-400 font-medium">
                          {promo.discount_type === 'percent' ? `${promo.discount_value}%` : `${promo.discount_value}€`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-sm text-gray-400">
                        {promo.current_uses}{promo.max_uses ? ` / ${promo.max_uses}` : ' / ∞'}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-xs text-gray-500">
                        {promo.valid_from ? new Date(promo.valid_from).toLocaleDateString('fr-FR') : '—'}
                        {' → '}
                        {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString('fr-FR') : '∞'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => toggleActive(promo)} disabled={saving === promo.id}>
                          {promo.is_active ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400"><ToggleRight size={16} /> Actif</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-500"><ToggleLeft size={16} /> Inactif</span>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => deleteCode(promo.id)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
