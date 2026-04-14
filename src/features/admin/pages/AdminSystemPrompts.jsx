import React, { useEffect, useState, useCallback } from 'react';
import { Save, RotateCcw, Loader2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { adminApi } from '../services/adminApiClient.js';
import AdminLayout from '../components/AdminLayout.jsx';

const DEFAULTS = {
  aron_main: {
    label: 'Prompt principal Aron',
    description: 'Instructions de base envoyées à chaque conversation',
    color: 'sky',
    default: `You are Aron, an intelligent, calm and supportive educational assistant.
You help students understand their courses, revise and improve.
Always respond concisely, clearly and encouragingly.
IMPORTANT: Always respond in the exact same language the user writes in. If they write in French, respond in French. If they write in English, respond in English.`
  },
  aron_context_prefix: {
    label: 'Préfixe contexte synthèses',
    description: 'Ajouté avant les synthèses sélectionnées comme contexte',
    color: 'violet',
    default: 'The user has shared the following learning materials with you as context. Use them to answer questions more precisely:'
  },
  aron_title_gen: {
    label: 'Génération de titre',
    description: 'Instructions pour générer le titre automatique d\'une conversation',
    color: 'emerald',
    default: 'Generate a very short conversation title (max 40 chars) based on the first exchange. Respond with ONLY the title, no quotes, no extra text. Use the same language as the user message.'
  }
};

const colorClass = {
  sky: 'border-sky-500/30 bg-sky-500/5',
  violet: 'border-violet-500/30 bg-violet-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
};
const badgeClass = {
  sky: 'bg-sky-500/10 text-sky-400',
  violet: 'bg-violet-500/10 text-violet-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
};

export default function AdminSystemPrompts() {
  const [prompts, setPrompts] = useState({});
  const [saving, setSaving] = useState(null);
  const [expanded, setExpanded] = useState('aron_main');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const res = await adminApi.get('/system-prompts');
    const map = {};
    for (const p of res.prompts) map[p.name] = p.content;
    setPrompts(map);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleSave = async (name) => {
    setSaving(name);
    try {
      const content = prompts[name] || DEFAULTS[name]?.default || '';
      await adminApi.put(`/system-prompts/${name}`, { content, description: DEFAULTS[name]?.description });
      showToast('Sauvegardé !');
    } catch (e) {
      showToast('Erreur: ' + e.message);
    } finally { setSaving(null); }
  };

  const handleReset = async (name) => {
    if (!confirm('Remettre le prompt par défaut ?')) return;
    setSaving(name);
    try {
      await adminApi.post(`/system-prompts/reset/${name}`);
      setPrompts(p => ({ ...p, [name]: DEFAULTS[name]?.default || '' }));
      showToast('Remis à zéro');
    } catch (e) {
      showToast('Erreur: ' + e.message);
    } finally { setSaving(null); }
  };

  return (
    <AdminLayout>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Prompts</h1>
          <p className="text-gray-500 text-sm mt-1">Modifie les instructions envoyées à l'IA. Les changements sont appliqués immédiatement.</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3 text-sm text-amber-300">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>Ces prompts sont injectés dans chaque appel API. Sois précis et concis. Un prompt trop long augmente les coûts et peut réduire la qualité des réponses.</p>
        </div>

        {Object.entries(DEFAULTS).map(([name, meta]) => {
          const currentVal = prompts[name] ?? meta.default;
          const isExpanded = expanded === name;
          const isModified = prompts[name] !== undefined && prompts[name] !== meta.default;

          return (
            <div key={name} className={`border rounded-2xl overflow-hidden ${isExpanded ? colorClass[meta.color] : 'border-gray-800 bg-gray-900'}`}>
              <button
                onClick={() => setExpanded(isExpanded ? null : name)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{meta.label}</span>
                      {isModified && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass[meta.color]}`}>Modifié</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <code className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded-lg">{name}</code>
                  {isExpanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  <textarea
                    value={currentVal}
                    onChange={e => setPrompts(p => ({ ...p, [name]: e.target.value }))}
                    rows={8}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-sky-500 resize-y font-mono leading-relaxed"
                    placeholder="Contenu du prompt..."
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{currentVal.length} caractères</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReset(name)}
                        disabled={saving === name}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white text-sm transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={13} /> Défaut
                      </button>
                      <button
                        onClick={() => handleSave(name)}
                        disabled={saving === name}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 hover:bg-sky-500/30 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {saving === name ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        Sauvegarder
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
