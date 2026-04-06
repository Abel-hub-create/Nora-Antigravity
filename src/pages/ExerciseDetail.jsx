import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Printer, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as exerciseSvc from '../services/exerciseService';
import * as assistantSvc from '../services/assistantService';
import LiquidProgressBar from '../components/UI/LiquidProgressBar';

const SUBJECT_EMOJIS = {
  mathematics: '📐', french: '📚', physics: '⚡', chemistry: '🧪',
  biology: '🧬', history: '🏛️', geography: '🌍', english: '🇬🇧', dutch: '🇳🇱'
};

const TYPE_LABELS = { qcm: 'QCM', open: 'Questions ouvertes', practical: 'Exercices pratiques' };
const TYPE_ICONS = { qcm: '📝', open: '✍️', practical: '🔬' };

// ─── Composant QCM ────────────────────────────────────────────────────────────

function QCMItem({ item, onChange, correction }) {
  const [selected, setSelected] = useState(
    item.user_answer !== null && item.user_answer !== undefined ? parseInt(item.user_answer) : null
  );

  const handleSelect = (idx) => {
    if (correction) return;
    setSelected(idx);
    onChange(String(idx));
  };

  const corrData = correction
    ? correction.corrections?.find(c => c.exerciseIndex === item._globalIndex)
    : null;

  return (
    <div className="space-y-2">
      {(item.options || []).map((opt, idx) => {
        let cls = 'border-white/10 bg-surface';
        if (correction && item.correct_answer === idx) cls = 'border-success bg-success/10 text-success';
        else if (correction && selected === idx && item.correct_answer !== idx) cls = 'border-error bg-error/10 text-error';
        else if (!correction && selected === idx) cls = 'border-primary/50 bg-primary/10';

        return (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            disabled={!!correction}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all ${cls}`}
          >
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="flex-1">{opt}</span>
            {correction && item.correct_answer === idx && <CheckCircle2 size={16} className="shrink-0" />}
          </button>
        );
      })}
      {corrData && (
        <div className={`mt-2 p-3 rounded-xl text-sm ${corrData.isCorrect ? 'bg-success/10 border border-success/20 text-success' : 'bg-error/10 border border-error/20 text-error'}`}>
          <p>{corrData.feedback}</p>
          {corrData.tip && <p className="mt-1 text-text-muted text-xs">💡 {corrData.tip}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Composant Réponse texte ──────────────────────────────────────────────────

function TextItem({ item, onChange, correction, placeholder }) {
  const [value, setValue] = useState(item.user_answer || '');
  const saveTimeout = useRef(null);

  const handleChange = (e) => {
    setValue(e.target.value);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => onChange(e.target.value), 800);
  };

  const corrData = correction
    ? correction.corrections?.find(c => c.exerciseIndex === item._globalIndex)
    : null;

  return (
    <div>
      <textarea
        value={value}
        onChange={handleChange}
        disabled={!!correction}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-surface border border-white/10 rounded-xl p-3 text-sm text-text-main placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/40 disabled:opacity-60"
      />
      {corrData && (
        <div className={`mt-2 p-3 rounded-xl text-sm ${corrData.isCorrect ? 'bg-success/10 border border-success/20 text-success' : corrData.isPartial ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-error/10 border border-error/20 text-error'}`}>
          <p className="font-medium mb-1">{corrData.isCorrect ? '✅ Correct' : corrData.isPartial ? '🟡 Partiellement correct' : '❌ À retravailler'}</p>
          <p>{corrData.feedback}</p>
          {corrData.tip && <p className="mt-1 text-text-muted text-xs">💡 {corrData.tip}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [exercise, setExercise] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correction, setCorrection] = useState(null);
  const [showGlobalFeedback, setShowGlobalFeedback] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      setIsLoading(true);
      const data = await exerciseSvc.getExercise(id);
      setExercise(data);
    } catch {
      navigate('/exercises');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = useCallback(async (itemId, answer) => {
    try {
      await exerciseSvc.saveAnswer(itemId, answer);
      setExercise(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId ? { ...item, user_answer: answer } : item
        )
      }));
    } catch (err) {
      console.error('Save answer error:', err);
    }
  }, []);

  const handleCorrect = async () => {
    setIsCorrecting(true);
    try {
      const result = await assistantSvc.correctExercises(id);
      setCorrection(result);
      setShowGlobalFeedback(true);
    } catch (err) {
      const msg = err?.response?.data?.error;
      alert(msg || 'Erreur lors de la correction');
    } finally {
      setIsCorrecting(false);
    }
  };

  const handlePrint = () => {
    if (!exercise) return;
    const subjectEmoji = SUBJECT_EMOJIS[exercise.subject] ?? '📖';
    const date = new Date(exercise.created_at).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    // Grouper par type
    const byType = {};
    exercise.items.forEach(item => {
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push(item);
    });

    let md = `# ${subjectEmoji} ${exercise.title}\n`;
    md += `**Date :** ${date}\n\n`;
    md += `---\n\n`;

    const printType = (type, items) => {
      md += `## ${TYPE_ICONS[type]} ${TYPE_LABELS[type]}\n\n`;
      items.forEach((item, i) => {
        md += `**${i + 1}.** ${item.question}\n\n`;
        if (type === 'qcm' && item.options) {
          item.options.forEach((opt, idx) => {
            md += `   ${String.fromCharCode(65 + idx)}) ${opt}\n`;
          });
          md += '\n';
        } else {
          md += `_Réponse :_ _______________________________________________\n\n`;
          if (type === 'practical') {
            md += `_Développement :_\n\n\n\n`;
          }
        }
        md += '\n';
      });
    };

    ['qcm', 'open', 'practical'].forEach(type => {
      if (byType[type]) printType(type, byType[type]);
    });

    // Ouvrir une fenêtre d'impression
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
      <head>
        <title>${exercise.title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
          h1 { font-size: 24px; margin-bottom: 6px; }
          h2 { font-size: 18px; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e5e5e5; }
          p { margin-bottom: 10px; }
          .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
          .separator { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
          .question { margin-bottom: 24px; page-break-inside: avoid; }
          .question-title { font-weight: bold; margin-bottom: 8px; }
          .option { margin: 4px 0 4px 20px; }
          .answer-line { border-bottom: 1px solid #999; margin: 8px 0 16px; min-height: 24px; }
          .answer-block { border: 1px solid #ccc; border-radius: 4px; min-height: 80px; margin: 8px 0 16px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>${subjectEmoji} ${exercise.title}</h1>
        <p class="meta">Date : ${date}</p>
        <hr class="separator"/>
        ${renderPrintHTML(byType)}
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const renderPrintHTML = (byType) => {
    let html = '';
    const renderSection = (type, items) => {
      html += `<h2>${TYPE_ICONS[type]} ${TYPE_LABELS[type]}</h2>`;
      items.forEach((item, i) => {
        html += `<div class="question">`;
        html += `<p class="question-title">${i + 1}. ${item.question.replace(/</g, '&lt;')}</p>`;
        if (type === 'qcm' && item.options) {
          item.options.forEach((opt, idx) => {
            html += `<p class="option">&#9675; ${String.fromCharCode(65 + idx)}) ${opt.replace(/</g, '&lt;')}</p>`;
          });
        } else if (type === 'open') {
          html += `<p style="color:#666;font-size:13px;">Réponse :</p><div class="answer-line"></div>`;
        } else {
          html += `<p style="color:#666;font-size:13px;">Développement :</p><div class="answer-block"></div>`;
        }
        html += `</div>`;
      });
    };
    ['qcm', 'open', 'practical'].forEach(type => {
      if (byType[type]) renderSection(type, byType[type]);
    });
    return html;
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!exercise) return null;

  // Grouper les items par type + ajouter index global pour correction
  const byType = {};
  exercise.items.forEach((item, globalIndex) => {
    const enriched = { ...item, _globalIndex: globalIndex };
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(enriched);
  });

  const toggleSection = (type) => {
    setCollapsedSections(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const answeredCount = exercise.items.filter(i =>
    i.user_answer !== null && i.user_answer !== undefined && String(i.user_answer).trim() !== ''
  ).length;

  return (
    <div className="min-h-full bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <Link to="/exercises" className="p-2 -ml-2 text-text-muted hover:text-text-main">
          <ArrowLeft size={22} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-text-main truncate text-sm">{exercise.title}</h1>
          <p className="text-xs text-text-muted">{t('exerciseDetail.answered', { count: answeredCount, total: exercise.items.length })}</p>
        </div>
        <button
          onClick={handlePrint}
          className="p-2 text-text-muted hover:text-primary transition-colors mr-10"
          title={t('exerciseDetail.print')}
        >
          <Printer size={20} />
        </button>
      </div>

      {/* Barre de progression — liquide vert */}
      <LiquidProgressBar
        progress={(answeredCount / Math.max(exercise.items.length, 1)) * 100}
        height={4}
        completed={answeredCount >= exercise.items.length}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Feedback global correction */}
        {correction?.globalFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-primary/10 border border-primary/20 rounded-2xl"
          >
            <button
              onClick={() => setShowGlobalFeedback(v => !v)}
              className="flex items-center justify-between w-full"
            >
              <span className="font-semibold text-primary text-sm">🌟 Bilan global</span>
              {showGlobalFeedback ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showGlobalFeedback && (
              <p className="mt-2 text-sm text-text-main">{correction.globalFeedback}</p>
            )}
          </motion.div>
        )}

        {/* Sections par type */}
        {['qcm', 'open', 'practical'].map(type => {
          if (!byType[type]) return null;
          const items = byType[type];
          const isCollapsed = collapsedSections[type];

          return (
            <div key={type} className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection(type)}
                className="w-full flex items-center justify-between p-4 text-left no-hover"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{TYPE_ICONS[type]}</span>
                  <span className="font-semibold text-text-main">{TYPE_LABELS[type]}</span>
                  <span className="text-xs text-text-muted bg-white/5 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
                {isCollapsed ? <ChevronDown size={18} className="text-text-muted" /> : <ChevronUp size={18} className="text-text-muted" />}
              </button>

              {!isCollapsed && (
                <div className="px-4 pb-4 space-y-6">
                  {items.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <p className="text-sm font-medium text-text-main mb-3">
                        <span className="text-primary font-bold mr-2">{i + 1}.</span>
                        {item.question}
                      </p>

                      {type === 'qcm' ? (
                        <QCMItem
                          item={item}
                          onChange={(val) => handleAnswer(item.id, val)}
                          correction={correction}
                        />
                      ) : (
                        <TextItem
                          item={item}
                          onChange={(val) => handleAnswer(item.id, val)}
                          correction={correction}
                          placeholder={type === 'open'
                            ? 'Rédige ta réponse ici...'
                            : 'Montre ton développement et ta solution...'}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bouton correction fixe en bas */}
      {!correction && (
        <div className="fixed bottom-36 left-0 right-0 px-4 max-w-3xl mx-auto">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={handleCorrect}
            disabled={isCorrecting || answeredCount === 0}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-2xl shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCorrecting ? (
              <><Loader2 size={18} className="animate-spin" /> {t('exerciseDetail.correcting')}</>
            ) : (
              <>✨ {t('exerciseDetail.correctBtn', { answered: answeredCount, total: exercise.items.length })}</>
            )}
          </motion.button>
        </div>
      )}
    </div>
  );
}
