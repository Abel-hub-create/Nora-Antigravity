import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Printer, Loader2, CheckCircle2, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as exerciseSvc from '../services/exerciseService';
import { correctItem, tts } from '../services/assistantService';
import { formatMath } from '../utils/formatMath';
import LiquidProgressBar from '../components/UI/LiquidProgressBar';

const SUBJECT_EMOJIS = {
  mathematics: '📐', french: '📚', physics: '⚡', chemistry: '🧪',
  biology: '🧬', history: '🏛️', geography: '🌍', english: '📖', dutch: '🌷'
};

const TYPE_ICONS = { qcm: '📝', open: '✍️', practical: '🔬' };

// ─── Composant QCM — feedback immédiat local ─────────────────────────────────

function QCMItem({ item, onChange }) {
  const [selected, setSelected] = useState(
    item.user_answer !== null && item.user_answer !== undefined ? parseInt(item.user_answer) : null
  );
  const [corrected, setCorrected] = useState(
    item.user_answer !== null && item.user_answer !== undefined
  );

  const handleSelect = (idx) => {
    if (corrected) return;
    setSelected(idx);
    setCorrected(true);
    onChange(String(idx));
  };

  return (
    <div className="space-y-2">
      {(item.options || []).map((opt, idx) => {
        let cls = 'border-white/10 bg-surface';
        if (corrected && item.correct_answer === idx) cls = 'border-success bg-success/10 text-success';
        else if (corrected && selected === idx && item.correct_answer !== idx) cls = 'border-error bg-error/10 text-error';
        else if (!corrected && selected === idx) cls = 'border-primary/50 bg-primary/10';

        return (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            disabled={corrected}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all no-hover ${cls}`}
          >
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="flex-1">{formatMath(opt)}</span>
            {corrected && item.correct_answer === idx && <CheckCircle2 size={16} className="shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Composant Réponse texte — correction GPT au blur ────────────────────────

function TextItem({ item, exerciseSetId, onChange, placeholder }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(item.user_answer || '');
  const [corrData, setCorrData] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const saveTimeout = useRef(null);
  const lastCorrectedValue = useRef(item.user_answer || '');

  const handleChange = (e) => {
    const newVal = e.target.value;
    setValue(newVal);
    // Reset correction if user edits after getting feedback
    if (corrData) setCorrData(null);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => onChange(newVal), 800);
  };

  const handleBlur = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === lastCorrectedValue.current) return;
    lastCorrectedValue.current = trimmed;

    // Save immediately before correcting
    clearTimeout(saveTimeout.current);
    await onChange(trimmed);

    setIsChecking(true);
    try {
      const result = await correctItem(exerciseSetId, item.id);
      setCorrData(result);
    } catch {
      // Silent fail — user can retry by clicking out again
    } finally {
      setIsChecking(false);
    }
  };

  const borderClass = corrData
    ? corrData.isCorrect ? 'border-success/60' : corrData.isPartial ? 'border-amber-500/60' : 'border-error/60'
    : isChecking ? 'border-primary/50' : 'border-white/10 focus:border-primary/40';

  return (
    <div>
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={4}
          className={`w-full bg-surface border rounded-xl p-3 text-sm text-text-main placeholder:text-text-muted resize-none focus:outline-none transition-colors ${borderClass}`}
        />
        {isChecking && (
          <div className="absolute bottom-3 right-3">
            <Loader2 size={14} className="animate-spin text-primary opacity-60" />
          </div>
        )}
      </div>
      {corrData && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-2 p-3 rounded-xl text-sm ${corrData.isCorrect ? 'bg-success/10 border border-success/20' : corrData.isPartial ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-error/10 border border-error/20'}`}
        >
          <p className={`font-semibold mb-1.5 ${corrData.isCorrect ? 'text-success' : corrData.isPartial ? 'text-amber-400' : 'text-error'}`}>
            {corrData.isCorrect ? `✅ ${t('exercises.correctionCorrect')}` : corrData.isPartial ? `🟡 ${t('exercises.correctionPartial')}` : `❌ ${t('exercises.correctionWrong')}`}
          </p>
          <p className="text-text-main leading-relaxed">{corrData.feedback}</p>
          {corrData.tip && <p className="mt-2 text-text-muted text-xs leading-relaxed">💡 {corrData.tip}</p>}
        </motion.div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [exercise, setExercise] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [feedbackOpen, setFeedbackOpen] = useState(true);
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

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

  const handleListenFeedback = async () => {
    if (ttsAudioUrl || ttsLoading || !exercise?.feedback_note) return;
    setTtsLoading(true);
    try {
      const base64 = await tts(exercise.feedback_note);
      setTtsAudioUrl(`data:audio/mpeg;base64,${base64}`);
    } catch {
      // silently fail
    } finally {
      setTtsLoading(false);
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

  const handlePrint = () => {
    if (!exercise) return;
    const subjectEmoji = SUBJECT_EMOJIS[exercise.subject] ?? '📖';
    const localeMap = { fr: 'fr-FR', en: 'en-US' };
    const locale = localeMap[i18n.language] || 'en-US';
    const date = new Date(exercise.created_at).toLocaleDateString(locale, {
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

    const typeLabels = {
      qcm: t('exercises.type.qcm'),
      open: t('exercises.type.open'),
      practical: t('exercises.type.practical')
    };
    const printType = (type, items) => {
      md += `## ${TYPE_ICONS[type]} ${typeLabels[type]}\n\n`;
      items.forEach((item, i) => {
        md += `**${i + 1}.** ${item.question}\n\n`;
        if (type === 'qcm' && item.options) {
          item.options.forEach((opt, idx) => {
            md += `   ${String.fromCharCode(65 + idx)}) ${opt}\n`;
          });
          md += '\n';
        } else {
          md += `_${t('exercises.printAnswer')}_ _______________________________________________\n\n`;
          if (type === 'practical') {
            md += `_${t('exercises.printDevelopment')}_\n\n\n\n`;
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
    const typeLabels = {
      qcm: t('exercises.type.qcm'),
      open: t('exercises.type.open'),
      practical: t('exercises.type.practical')
    };
    let html = '';
    const renderSection = (type, items) => {
      html += `<h2>${TYPE_ICONS[type]} ${typeLabels[type]}</h2>`;
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

        {/* Note de feedback /ana */}
        {exercise.feedback_note && (
          <div className="bg-surface border border-primary/20 rounded-2xl overflow-hidden">
            <button
              onClick={() => setFeedbackOpen(prev => !prev)}
              className="w-full flex items-center justify-between p-4 text-left no-hover"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <span className="font-semibold text-text-main text-sm">Analyse personnalisée</span>
              </div>
              {feedbackOpen ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
            </button>
            <AnimatePresence initial={false}>
              {feedbackOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3">
                    {/* Audio player */}
                    <div className="flex items-center gap-3">
                      {ttsAudioUrl ? (
                        <audio controls src={ttsAudioUrl} className="h-8 flex-1" style={{ accentColor: '#38bdf8' }} />
                      ) : (
                        <button
                          onClick={handleListenFeedback}
                          disabled={ttsLoading}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary/15 border border-primary/30 rounded-xl text-xs text-primary font-medium hover:bg-primary/25 transition-colors disabled:opacity-50"
                        >
                          {ttsLoading
                            ? <><Loader2 size={12} className="animate-spin" /> Chargement...</>
                            : <><Volume2 size={13} /> Écouter</>
                          }
                        </button>
                      )}
                      <button
                        onClick={() => setTranscriptOpen(prev => !prev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-text-muted hover:text-text-main transition-colors"
                      >
                        {transcriptOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        Transcription
                      </button>
                    </div>
                    {/* Transcript — hidden behind toggle */}
                    <AnimatePresence initial={false}>
                      {transcriptOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap pt-1">{exercise.feedback_note}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
                  <span className="font-semibold text-text-main">{t(`exercises.type.${type}`)}</span>
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
                        {formatMath(item.question)}
                      </p>

                      {type === 'qcm' ? (
                        <QCMItem
                          item={item}
                          onChange={(val) => handleAnswer(item.id, val)}
                        />
                      ) : (
                        <TextItem
                          item={item}
                          exerciseSetId={parseInt(id)}
                          onChange={(val) => handleAnswer(item.id, val)}
                          placeholder={type === 'open'
                            ? t('exercises.placeholderOpen')
                            : t('exercises.placeholderPractical')}
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

    </div>
  );
}
