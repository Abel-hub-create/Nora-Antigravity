import React, { useEffect, useState, useCallback } from 'react';
import { Save, Plus, Trash2, Loader2, Settings2, X, Check } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

const PLAN_COLORS = { free: 'gray', premium: 'amber', school: 'violet' };

// Keys that are boolean (0/1)
const BOOL_KEYS = new Set(['has_daily_goals', 'has_flashcards', 'has_folders', 'has_quiz', 'has_tts', 'ai_model']);

// Keys with enum values
const ENUM_KEYS = {
  ai_model_tier: [
    { value: 0, label: 'Basique (lent, économique)' },
    { value: 1, label: 'Rapide (intermédiaire)' },
    { value: 2, label: 'Avancé (GPT-4 / Gemini)' },
  ],
};

function LimitInput({ limitKey, value, onChange }) {
  if (BOOL_KEYS.has(limitKey)) {
    return (
      <button
        onClick={() => onChange(limitKey, value ? 0 : 1)}
        className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
          value ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-700 text-gray-500 border border-gray-600'
        }`}
      >
        {value ? 'Activé' : 'Désactivé'}
      </button>
    );
  }
  if (ENUM_KEYS[limitKey]) {
    return (
      <select
        value={value}
        onChange={e => onChange(limitKey, parseInt(e.target.value))}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
      >
        {ENUM_KEYS[limitKey].map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  // Default: numeric input
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(limitKey, parseInt(e.target.value) || 0)}
      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-sky-500 font-mono"
    />
  );
}

function PlanCard({ plan, onSaved }) {
  const [data, setData] = useState(plan);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState(0);
  const [newLabel, setNewLabel] = useState('');
  const [toast, setToast] = useState('');
  const color = PLAN_COLORS[data.slug] || 'sky';

  const dot = { gray: 'bg-gray-400', amber: 'bg-amber-400', violet: 'bg-violet-400', sky: 'bg-sky-400' }[color];
  const badge = { gray: 'text-gray-400 bg-gray-500/10', amber: 'text-amber-400 bg-amber-500/10', violet: 'text-violet-400 bg-violet-500/10', sky: 'text-sky-400 bg-sky-500/10' }[color];

  const showMsg = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

  const handleLimitChange = (key, val) => {
    setData(d => ({ ...d, limits: d.limits.map(l => l.limit_key === key ? { ...l, limit_value: parseInt(val) || 0 } : l) }));
  };

  const handleLimitLabelChange = (key, label) => {
    setData(d => ({ ...d, limits: d.limits.map(l => l.limit_key === key ? { ...l, label } : l) }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.patch(`/plans/${data.id}`, {
        name: data.name, description: data.description,
        price_monthly: data.price_monthly, price_type: data.price_type,
        stripe_price_id: data.stripe_price_id, is_active: data.is_active, sort_order: data.sort_order,
      });
      await adminApi.put(`/plans/${data.id}/limits`, {
        limits: data.limits.map(l => ({ limit_key: l.limit_key, limit_value: l.limit_value, label: l.label }))
      });
      showMsg('Sauvegardé !');
      onSaved();
    } catch (err) { showMsg('Erreur: ' + err.message); }
    finally { setSaving(false); }
  };

  const addLimit = async () => {
    if (!newKey.trim()) return;
    setSaving(true);
    try {
      await adminApi.put(`/plans/${data.id}/limits`, {
        limits: [{ limit_key: newKey.trim(), limit_value: newVal, label: newLabel.trim() || LIMIT_LABELS[newKey] || newKey.trim() }]
      });
      setNewKey(''); setNewVal(0); setNewLabel(''); setShowAdd(false);
      onSaved();
    } finally { setSaving(false); }
  };

  const deleteLimit = async (key) => {
    if (!confirm(`Supprimer "${key}" ?`)) return;
    await adminApi.delete(`/plans/${data.id}/limits/${key}`);
    onSaved();
  };

  useEffect(() => { setData(plan); }, [plan]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {toast && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-3 py-2 rounded-xl">
          <Check size={13} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${data.is_active ? dot : 'bg-gray-600'}`} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{data.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>{data.slug}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{data.price_monthly}€/mois · {data.limits.length} limites</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(s => !s)}
            className={`p-2 rounded-xl transition-colors ${showSettings ? 'bg-sky-500/20 text-sky-400' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            <Settings2 size={15} />
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Sauvegarder
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mx-5 mb-5 p-4 bg-gray-800/40 rounded-xl grid grid-cols-2 md:grid-cols-3 gap-3 border border-gray-700/50">
          {[
            { field: 'name', label: 'Nom', type: 'text' },
            { field: 'price_monthly', label: 'Prix (€/mois)', type: 'number' },
            { field: 'stripe_price_id', label: 'Stripe Price ID', type: 'text', placeholder: 'price_...' },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input type={type} value={data[field] || ''} placeholder={placeholder}
                onChange={e => setData(d => ({ ...d, [field]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Type de prix</label>
            <select value={data.price_type} onChange={e => setData(d => ({ ...d, price_type: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
              <option value="fixed">Fixe</option>
              <option value="per_student">Par élève</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ordre</label>
            <input type="number" value={data.sort_order}
              onChange={e => setData(d => ({ ...d, sort_order: parseInt(e.target.value) || 0 }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={!!data.is_active} onChange={e => setData(d => ({ ...d, is_active: e.target.checked ? 1 : 0 }))}
                className="accent-sky-400" />
              Actif
            </label>
          </div>
        </div>
      )}

      {/* Limits grid */}
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {data.limits.map(limit => (
            <div key={limit.limit_key} className="group relative bg-gray-800/60 hover:bg-gray-800 rounded-xl p-3 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <input
                  type="text"
                  value={limit.label || limit.limit_key}
                  onChange={e => handleLimitLabelChange(limit.limit_key, e.target.value)}
                  className="text-xs text-gray-400 leading-tight flex-1 pr-1 bg-transparent border-none outline-none hover:text-gray-200 focus:text-white w-full"
                />
                <button onClick={() => deleteLimit(limit.limit_key)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-red-400 transition-all shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <LimitInput
                  limitKey={limit.limit_key}
                  value={limit.limit_value}
                  onChange={handleLimitChange}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1 truncate">{limit.limit_key}</p>
            </div>
          ))}

          {/* Add new limit inline */}
          {showAdd ? (
            <div className="col-span-2 bg-gray-800/60 rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <input placeholder="clé" value={newKey} onChange={e => setNewKey(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500 font-mono" />
                <input placeholder="label" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500" />
                <input type="number" placeholder="valeur" value={newVal} onChange={e => setNewVal(parseInt(e.target.value) || 0)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 text-center font-mono" />
              </div>
              <div className="flex gap-1.5">
                <button onClick={addLimit} className="flex-1 py-1.5 bg-sky-500/20 text-sky-400 rounded-lg text-xs hover:bg-sky-500/30 transition-colors flex items-center justify-center gap-1">
                  <Plus size={12} /> Ajouter
                </button>
                <button onClick={() => setShowAdd(false)} className="py-1.5 px-3 bg-gray-700 text-gray-400 rounded-lg text-xs hover:bg-gray-600 transition-colors">
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)}
              className="bg-gray-800/30 hover:bg-gray-800/60 border-2 border-dashed border-gray-700 hover:border-sky-500/30 text-gray-600 hover:text-sky-400 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors min-h-[80px]">
              <Plus size={16} />
              <span className="text-xs">Ajouter</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/plans');
      setPlans(res.plans);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Plans</h1>
          <p className="text-xs text-gray-500">Modifie les valeurs puis clique Sauvegarder</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-400" size={28} /></div>
        ) : (
          <div className="space-y-5">
            {plans.map(plan => <PlanCard key={plan.id} plan={plan} onSaved={load} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
