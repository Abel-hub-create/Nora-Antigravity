import React, { useEffect, useState } from 'react';
import { Zap, Save, Loader2, CheckCircle, AlertCircle, Gift } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

// Labels descriptifs pour affichage
const REASON_LABELS = {
  synthesis_created:     { label: 'Création d\'une synthèse', desc: 'Par synthèse créée', icon: '📄' },
  goal_completed:        { label: 'Objectif quotidien complété', desc: 'Par objectif individuel terminé (une fois/jour)', icon: '✅' },
  daily_goals_all_bonus: { label: 'Tous les objectifs du jour complétés', desc: 'Bonus global de complétion', icon: '🎯' },
  exercise_first_daily:  { label: 'Premier exercice créé', desc: 'Une fois par jour', icon: '✏️' },
  vocal_completed:       { label: 'Vocal Aron écouté', desc: 'Par vocal écouté jusqu\'au bout', icon: '🎧' },
  winstreak_daily:       { label: 'Winstreak maintenue', desc: 'Par jour consécutif de connexion', icon: '🔥' },
  premium_purchase:      { label: 'Achat Premium / École', desc: 'One-shot à vie par compte', icon: '👑' },
  flashcards_timer:      { label: 'Flashcards — 10 min', desc: 'Minuteur (une fois/jour)', icon: '🃏' },
  quiz_timer:            { label: 'Quiz — 20 min', desc: 'Minuteur (une fois/jour)', icon: '🧠' },
  summary_timer:         { label: 'Synthèse lue — 30 min', desc: 'Minuteur (une fois/jour)', icon: '📖' },
  all_timer_bonus:       { label: 'Bonus : 3 minuteurs complétés', desc: 'Tous les minuteurs atteints le même jour', icon: '⭐' },
};

export default function AdminXpConfig() {
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [localValues, setLocalValues] = useState({});
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const showToast = (msg, isError = false) => {
    if (isError) setError(msg);
    else setToast(msg);
    setTimeout(() => { setToast(''); setError(''); }, 3000);
  };

  useEffect(() => {
    adminApi.get('/xp-config')
      .then(data => {
        setConfig(data.config || []);
        const vals = {};
        (data.config || []).forEach(row => { vals[row.reason] = row.base_amount; });
        setLocalValues(vals);
      })
      .catch(() => showToast('Impossible de charger la config XP', true))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (reason) => {
    const amount = localValues[reason];
    if (amount === undefined || isNaN(Number(amount)) || Number(amount) < 0) {
      showToast('Montant invalide', true);
      return;
    }
    setSaving(prev => ({ ...prev, [reason]: true }));
    try {
      const data = await adminApi.patch(`/xp-config/${reason}`, { base_amount: Number(amount) });
      setConfig(data.config || []);
      const vals = {};
      (data.config || []).forEach(row => { vals[row.reason] = row.base_amount; });
      setLocalValues(vals);
      showToast('Sauvegardé !');
    } catch {
      showToast('Erreur lors de la sauvegarde', true);
    } finally {
      setSaving(prev => ({ ...prev, [reason]: false }));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-sky-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
            <Zap size={20} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Configuration XP</h1>
            <p className="text-sm text-gray-400">Montants de base — multipliés par xp_multiplier du plan</p>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="flex items-center gap-2 bg-green-500/15 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">
            <CheckCircle size={16} /> {toast}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Liste */}
        <div className="space-y-3">
          {config.map(row => {
            const meta = REASON_LABELS[row.reason] || { label: row.reason, desc: '', icon: '⚡' };
            const isDirty = Number(localValues[row.reason]) !== Number(row.base_amount);
            return (
              <div key={row.reason} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
                <span className="text-xl shrink-0">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{meta.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={localValues[row.reason] ?? row.base_amount}
                    onChange={e => setLocalValues(prev => ({ ...prev, [row.reason]: e.target.value }))}
                    className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-xs text-gray-500">XP</span>
                  <button
                    onClick={() => handleSave(row.reason)}
                    disabled={saving[row.reason]}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isDirty
                        ? 'bg-sky-600 hover:bg-sky-500 text-white'
                        : 'bg-gray-800 text-gray-500 cursor-default'
                    }`}
                  >
                    {saving[row.reason]
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Save size={12} />}
                    Sauver
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-600 text-center">
          Les montants sont les valeurs de base avant application du multiplicateur de plan (xp_multiplier dans Plans).
          Exemple : 30 XP × multiplicateur x2 = 60 XP pour un utilisateur Premium.
        </p>
      </div>
    </AdminLayout>
  );
}
