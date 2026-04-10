import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, BookOpen, Loader2, Camera, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as assistantSvc from '../services/assistantService';
import { formatMath } from '../utils/formatMath';
import VoiceDictation from '../components/Import/VoiceDictation';
import AnaCameraModal from '../components/Assistant/AnaCameraModal';
import frLocale from '../i18n/locales/fr.json';
import enLocale from '../i18n/locales/en.json';

const LOCALES = { fr: frLocale, en: enLocale };

// Traduction explicite par langue — indépendant du contexte React i18n
function tl(lang, key, params = {}) {
  const parts = key.split('.');
  let val = LOCALES[lang] || LOCALES.fr;
  for (const p of parts) {
    val = val?.[p];
    if (val === undefined) {
      // fallback français
      let fb = LOCALES.fr;
      for (const p2 of parts) fb = fb?.[p2];
      val = fb ?? key;
      break;
    }
  }
  if (typeof val !== 'string') return key;
  return val.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`));
}

const SUBJECT_EMOJIS = {
  mathematics: '📐', french: '📚', physics: '⚡', chemistry: '🧪',
  biology: '🧬', history: '🏛️', geography: '🌍', english: '📖', dutch: '🌷'
};

const ALL_SUBJECTS = ['mathematics', 'french', 'physics', 'chemistry', 'biology', 'history', 'geography', 'english', 'dutch'];

const DAILY_LIMITS = { chat: 15, exs: 5, ana: 5 };

// ─── Étapes Monk Mode ─────────────────────────────────────────────────────────
const MONK_STEPS = {
  IDLE: 'idle',
  SELECT_SUBJECT: 'select_subject',
  ANALYZING: 'analyzing',
  SPECIFIC_DIFFICULTIES: 'specific_difficulties',
  SELECT_TYPES: 'select_types',
  SELECT_COUNTS: 'select_counts',
  SELECT_DIFFICULTY: 'select_difficulty',
  GENERATING: 'generating',
  DONE: 'done',
  // /ana
  ANA_UPLOAD: 'ana_upload',
  ANA_ANALYZING: 'ana_analyzing'
};

const ThinkingBubble = ({ text }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2 text-text-muted text-sm italic px-4 py-2"
  >
    <Loader2 size={14} className="animate-spin text-primary shrink-0" />
    <span>{text}</span>
  </motion.div>
);

const AssistantBubble = ({ content, isThinking, thinkingText }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex gap-3 items-start"
  >
    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-base">
      🤖
    </div>
    <div className="flex-1 bg-surface border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-text-main leading-relaxed max-w-[85%]">
      {isThinking ? (
        <span className="flex items-center gap-2 text-text-muted">
          <Loader2 size={14} className="animate-spin" /> {thinkingText || '...'}
        </span>
      ) : content}
    </div>
  </motion.div>
);

const UserBubble = ({ content }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex justify-end"
  >
    <div className="bg-primary/20 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-text-main max-w-[85%]">
      {content}
    </div>
  </motion.div>
);

const ActionButtons = ({ buttons, onSelect }) => (
  <div className="flex flex-wrap gap-2 pl-11">
    {buttons.map((btn) => (
      <motion.button
        key={btn.value}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onSelect(btn)}
        className="px-3 py-2 bg-surface border border-primary/30 text-primary text-sm rounded-xl hover:bg-primary/10 transition-colors"
      >
        {btn.label}
      </motion.button>
    ))}
  </div>
);

export default function Assistant() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [showAnaCamera, setShowAnaCamera] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  // Mémoire silencieuse des 5 derniers messages pour le contexte IA
  const memoryRef = useRef([]);

  // État Monk Mode
  const [monkStep, setMonkStep] = useState(MONK_STEPS.IDLE);
  const [monkData, setMonkData] = useState({
    subject: null,
    analysis: null,
    specificDifficulties: null,
    selectedTypes: [],
    counts: { qcm: 0, open: 0, practical: 0 },
    difficulty: 'medium',
    currentTypeIndex: 0,
    exerciseSetId: null,
    exerciseSets: [],
    isAnaMode: false,
    examText: null,
    feedbackNote: null
  });

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [actionButtons, setActionButtons] = useState(null);
  // Langue active du flow — ref pour éviter les stale closures dans useCallback
  const langRef = useRef(i18n.language?.split('-')[0] || 'fr');
  useEffect(() => {
    langRef.current = i18n.language?.split('-')[0] || 'fr';
  }, [i18n.language]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingText, actionButtons]);

  // Charger l'historique : afficher les 10 derniers messages et les mettre en mémoire
  useEffect(() => {
    const load = async () => {
      try {
        const [history, subjects] = await Promise.all([
          assistantSvc.getChatHistory(),
          assistantSvc.getAvailableSubjects()
        ]);
        setAvailableSubjects(subjects);
        // Garder les 10 derniers messages comme contexte IA
        const last10 = history.slice(-10);
        memoryRef.current = last10.map(m => ({ role: m.role, content: m.content }));
        // Afficher ces messages dans le chat (session courante)
        if (last10.length > 0) {
          setMessages(last10.map(m => ({ role: m.role, content: m.content })));
        } else {
          setMessages([{ role: 'assistant', content: t('assistant.welcome') }]);
        }
      } catch {
        // pas de mémoire si erreur
        setMessages([{ role: 'assistant', content: t('assistant.welcome') }]);
      }
    };
    load();
  }, []); // eslint-disable-line

  const addMessage = useCallback((role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  }, []);

  // ─── Monk Mode handlers ────────────────────────────────────────────────────

  const startMonkMode = useCallback(async () => {
    const lang = langRef.current;
    setMonkStep(MONK_STEPS.SELECT_SUBJECT);
    setMonkData(prev => ({ ...prev, isAnaMode: false, examText: null }));
    addMessage('assistant', tl(lang, 'assistant.monk.selectSubject'));

    let subjects = availableSubjects;
    if (subjects.length === 0) {
      try {
        subjects = await assistantSvc.getAvailableSubjects();
        setAvailableSubjects(subjects);
      } catch { subjects = []; }
    }

    if (subjects.length === 0) {
      addMessage('assistant', tl(lang, 'assistant.monk.noSubjects'));
      setMonkStep(MONK_STEPS.IDLE);
      return;
    }

    setActionButtons(subjects.map(s => ({
      value: s,
      label: `${SUBJECT_EMOJIS[s] ?? '📖'} ${tl(lang, `subjects.${s}`) || s}`
    })));
  }, [availableSubjects, addMessage]);

  const handleSubjectSelect = useCallback(async (subject) => {
    const lang = langRef.current;
    setActionButtons(null);
    addMessage('user', `${SUBJECT_EMOJIS[subject] ?? '📖'} ${tl(lang, `subjects.${subject}`) || subject}`);
    setMonkData(prev => ({ ...prev, subject }));
    setMonkStep(MONK_STEPS.ANALYZING);

    const isAna = monkData.isAnaMode;

    if (isAna) {
      setThinkingText(tl(lang, 'assistant.ana.analyzing'));
      await new Promise(r => setTimeout(r, 800));
      setThinkingText(tl(lang, 'assistant.ana.identifying'));

      try {
        const result = await assistantSvc.analyzeExam(monkData.examText, subject);
        setThinkingText('');
        const { analysis, feedbackNote } = result;
        setMonkData(prev => ({ ...prev, analysis, feedbackNote: feedbackNote || null }));

        let msg = `📊 ${tl(lang, 'assistant.monk.weakTopics')}\n`;
        if (analysis.weakTopics?.length > 0) {
          msg += analysis.weakTopics.map(tp => `• ${tp}`).join('\n');
        } else {
          msg += analysis.summary;
        }
        msg += `\n\n${tl(lang, 'assistant.monk.askSpecific')}`;
        addMessage('assistant', msg);
        setMonkStep(MONK_STEPS.SPECIFIC_DIFFICULTIES);
      } catch {
        setThinkingText('');
        addMessage('assistant', tl(lang, 'assistant.monk.analyzeError'));
        setMonkStep(MONK_STEPS.IDLE);
      }
    } else {
      setThinkingText(tl(lang, 'assistant.monk.analyzingSubject', { subject: tl(lang, `subjects.${subject}`) }));
      await new Promise(r => setTimeout(r, 800));
      setThinkingText(tl(lang, 'assistant.monk.analyzingQuiz'));
      await new Promise(r => setTimeout(r, 1000));
      setThinkingText(tl(lang, 'assistant.monk.analyzingWeak'));

      try {
        const result = await assistantSvc.analyzeSubject(subject);
        setThinkingText('');
        const { analysis, synthesesCount, answersCount } = result;
        setMonkData(prev => ({ ...prev, analysis }));

        let msg = tl(lang, 'assistant.monk.analyzed', {
          syntheses: synthesesCount,
          synthesesPlural: synthesesCount > 1 ? 's' : '',
          answers: answersCount,
          answersPlural: answersCount > 1 ? 's' : '',
          subject: tl(lang, `subjects.${subject}`)
        }) + '\n\n';

        if (analysis.hasSufficientData && analysis.weakTopics.length > 0) {
          msg += `📊 ${tl(lang, 'assistant.monk.weakTopics')}\n${analysis.weakTopics.map(tp => `• ${tp}`).join('\n')}\n\n`;
        } else {
          msg += `${analysis.summary}\n\n`;
        }

        msg += tl(lang, 'assistant.monk.askSpecific');
        addMessage('assistant', msg);
        setMonkStep(MONK_STEPS.SPECIFIC_DIFFICULTIES);
      } catch {
        setThinkingText('');
        addMessage('assistant', tl(lang, 'assistant.monk.analyzeError'));
        setMonkStep(MONK_STEPS.IDLE);
      }
    }
  }, [addMessage, monkData.isAnaMode, monkData.examText]);

  const handleSpecificDifficulties = useCallback((text) => {
    const lang = langRef.current;
    const isNo = /^(non|no|nope|pas|rien|skip|aucun)/i.test(text.trim());
    const isJustYes = /^(oui|yes|ok|ouais|yep|yeah|bien sûr|of course|absolument|absolutely|yup|yep)\s*[.!?]?\s*$/i.test(text.trim());

    if (isJustYes) {
      addMessage('assistant', tl(lang, 'assistant.monk.tellDifficulties'));
      return; // Stay in SPECIFIC_DIFFICULTIES, wait for actual description
    }

    setMonkData(prev => ({
      ...prev,
      specificDifficulties: isNo ? null : text.trim()
    }));

    if (!isNo) {
      addMessage('assistant', tl(lang, 'assistant.monk.noted', { text: text.trim() }));
    }

    setMonkStep(MONK_STEPS.SELECT_TYPES);
    addMessage('assistant', tl(lang, 'assistant.monk.selectTypes'));
    setActionButtons([
      { value: 'qcm', label: `📝 ${tl(lang, 'assistant.monk.mcq')}` },
      { value: 'open', label: `✍️ ${tl(lang, 'assistant.monk.openQuestions')}` },
      { value: 'practical', label: `🔬 ${tl(lang, 'assistant.monk.practicalExercises')}` },
      { value: 'confirm_types', label: `✅ ${tl(lang, 'assistant.monk.confirmTypes')}` }
    ]);
    setMonkData(prev => ({ ...prev, selectedTypes: [] }));
  }, [addMessage]);

  const handleTypeToggle = useCallback((type) => {
    const lang = langRef.current;
    if (type === 'confirm_types') {
      setMonkData(prev => {
        if (prev.selectedTypes.length === 0) {
          addMessage('assistant', tl(lang, 'assistant.monk.atLeastOne'));
          return prev;
        }
        setActionButtons(null);
        setMonkStep(MONK_STEPS.SELECT_COUNTS);
        const firstType = prev.selectedTypes[0];
        const maxMap = { qcm: 5, open: 10, practical: 10 };
        const nameMap = {
          qcm: tl(lang, 'assistant.monk.mcq'),
          open: tl(lang, 'assistant.monk.openQuestions'),
          practical: tl(lang, 'assistant.monk.practicalExercises')
        };
        addMessage('assistant', tl(lang, 'assistant.monk.howMany', { type: nameMap[firstType], max: maxMap[firstType] }));
        return { ...prev, currentTypeIndex: 0 };
      });
      return;
    }

    setMonkData(prev => {
      const isSelected = prev.selectedTypes.includes(type);
      const newTypes = isSelected
        ? prev.selectedTypes.filter(tp => tp !== type)
        : [...prev.selectedTypes, type];
      return { ...prev, selectedTypes: newTypes };
    });

    setActionButtons(prev => prev?.map(btn => {
      if (btn.value === type) {
        const isSelected = btn.label.startsWith('✅');
        return { ...btn, label: isSelected ? btn.label.replace('✅ ', '') : `✅ ${btn.label}` };
      }
      return btn;
    }));
  }, [addMessage]);

  const handleCountInput = useCallback((text) => {
    const lang = langRef.current;
    const num = parseInt(text);
    if (isNaN(num) || num < 1) {
      addMessage('assistant', tl(lang, 'assistant.monk.invalidNumber'));
      return;
    }

    setMonkData(prev => {
      const types = prev.selectedTypes;
      const type = types[prev.currentTypeIndex];
      const maxMap = { qcm: 5, open: 10, practical: 10 };
      const nameMap = {
        qcm: tl(lang, 'assistant.monk.mcq'),
        open: tl(lang, 'assistant.monk.openQuestions'),
        practical: tl(lang, 'assistant.monk.practicalExercises')
      };

      if (num > maxMap[type]) {
        addMessage('assistant', tl(lang, 'assistant.monk.maxExceeded', { max: maxMap[type] }));
        return prev;
      }

      const newCounts = { ...prev.counts, [type]: num };
      const nextIndex = prev.currentTypeIndex + 1;

      if (nextIndex < types.length) {
        const nextType = types[nextIndex];
        addMessage('assistant', tl(lang, 'assistant.monk.howMany', { type: nameMap[nextType], max: maxMap[nextType] }));
        return { ...prev, counts: newCounts, currentTypeIndex: nextIndex };
      } else {
        // All counts done → ask difficulty
        setMonkStep(MONK_STEPS.SELECT_DIFFICULTY);
        addMessage('assistant', tl(lang, 'assistant.monk.selectDifficulty'));
        setActionButtons([
          { value: 'easy', label: tl(lang, 'assistant.monk.easy') },
          { value: 'medium', label: tl(lang, 'assistant.monk.medium') },
          { value: 'hard', label: tl(lang, 'assistant.monk.hard') }
        ]);
        return { ...prev, counts: newCounts };
      }
    });
  }, [addMessage]);

  const handleDifficultySelect = useCallback((difficulty) => {
    setActionButtons(null);
    setMonkData(prev => {
      const updated = { ...prev, difficulty };
      generateExercisesFlow(updated);
      return updated;
    });
  }, []);

  const generateExercisesFlow = useCallback(async (data) => {
    const lang = langRef.current;
    setMonkStep(MONK_STEPS.GENERATING);
    setThinkingText(tl(lang, 'assistant.monk.generating'));
    await new Promise(r => setTimeout(r, 800));
    setThinkingText(tl(lang, 'assistant.monk.buildingSet', { subject: tl(lang, `subjects.${data.subject}`) }));

    try {
      const result = await assistantSvc.generateExercises({
        subject: data.subject,
        weakTopics: data.analysis?.weakTopics || [],
        errorPatterns: data.analysis?.errorPatterns || [],
        analysisSummary: data.analysis?.summary || '',
        specificDifficulties: data.specificDifficulties,
        counts: data.counts,
        difficulty: data.difficulty || 'medium',
        source: data.isAnaMode ? 'ana' : 'exs',
        feedbackNote: data.isAnaMode ? data.feedbackNote : null
      });
      setThinkingText('');

      const total = (data.counts.qcm || 0) + (data.counts.open || 0) + (data.counts.practical || 0);
      addMessage('assistant', tl(lang, 'assistant.monk.generated', {
        count: total,
        plural: total > 1 ? 's' : '',
        title: result.title
      }));
      setActionButtons([{ value: 'goto_exercises', label: tl(lang, 'assistant.monk.viewExercises') }]);
      setMonkData(prev => ({ ...prev, exerciseSetId: result.exerciseSetId }));
      setMonkStep(MONK_STEPS.DONE);
    } catch (err) {
      setThinkingText('');
      const code = err?.response?.data?.error;
      let msg;
      if (code === 'EXERCISES_LIMIT_REACHED') msg = tl(lang, 'assistant.monk.limitReached');
      else if (code === 'DAILY_EXS_LIMIT') msg = tl(lang, 'assistant.monk.dailyExsLimit', { limit: DAILY_LIMITS.exs });
      else if (code === 'DAILY_ANA_LIMIT') msg = tl(lang, 'assistant.monk.dailyAnaLimit', { limit: DAILY_LIMITS.ana });
      else msg = tl(lang, 'assistant.monk.genError');
      addMessage('assistant', msg);
      setMonkStep(MONK_STEPS.IDLE);
    }
  }, [addMessage]);

  // ─── /ana handlers ─────────────────────────────────────────────────────────

  const startAnaMode = useCallback(async () => {
    const lang = langRef.current;
    setMonkStep(MONK_STEPS.ANA_UPLOAD);
    setMonkData(prev => ({ ...prev, isAnaMode: true, examText: null }));
    addMessage('assistant', tl(lang, 'assistant.ana.upload'));
  }, [addMessage]);

  // Accepts either a File object (from gallery input) or a raw base64 string (from camera capture)
  const handleAnaImageUpload = useCallback(async (fileOrBase64) => {
    if (!fileOrBase64) return;
    const lang = langRef.current;
    setThinkingText(tl(lang, 'assistant.ana.extracting'));

    const processBase64 = async (base64) => {
      try {
        if (!base64 || base64.length < 100) {
          setThinkingText('');
          addMessage('assistant', tl(lang, 'assistant.ana.extractError'));
          setMonkStep(MONK_STEPS.IDLE);
          return;
        }

        setMonkData(prev => ({ ...prev, examText: base64 }));
        setThinkingText('');
        addMessage('assistant', tl(lang, 'assistant.ana.extracted'));

        setMonkStep(MONK_STEPS.SELECT_SUBJECT);

        setActionButtons(ALL_SUBJECTS.map(s => ({
          value: s,
          label: `${SUBJECT_EMOJIS[s] ?? '📖'} ${tl(lang, `subjects.${s}`) || s}`
        })));
      } catch {
        setThinkingText('');
        addMessage('assistant', tl(lang, 'assistant.ana.extractError'));
        setMonkStep(MONK_STEPS.IDLE);
      }
    };

    // If it's already a base64 string (from camera), use it directly
    if (typeof fileOrBase64 === 'string') {
      processBase64(fileOrBase64);
    } else {
      // It's a File object — read it
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        processBase64(base64);
      };
      reader.readAsDataURL(fileOrBase64);
    }
  }, [availableSubjects, addMessage]);

  // ─── Handler boutons d'action ──────────────────────────────────────────────

  const handleActionButton = useCallback((btn) => {
    const { value } = btn;

    if (value === 'goto_exercises') {
      setActionButtons(null);
      navigate('/exercises');
      return;
    }

    if (monkStep === MONK_STEPS.SELECT_SUBJECT) {
      handleSubjectSelect(value);
      return;
    }

    if (monkStep === MONK_STEPS.SELECT_TYPES || value === 'confirm_types') {
      handleTypeToggle(value);
      return;
    }

    if (monkStep === MONK_STEPS.SELECT_DIFFICULTY) {
      handleDifficultySelect(value);
      return;
    }

  }, [monkStep, handleSubjectSelect, handleTypeToggle, handleDifficultySelect, navigate]);

  // ─── Submit message ────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');

    if (text === '/exs' || text === '/练习') {
      addMessage('user', text);
      setMonkStep(MONK_STEPS.IDLE);
      setActionButtons(null);
      await startMonkMode();
      return;
    }

    if (text === '/ana' || text === '/分析') {
      addMessage('user', text);
      setMonkStep(MONK_STEPS.IDLE);
      setActionButtons(null);
      await startAnaMode();
      return;
    }

    // User typed something during /ana upload step → cancel /ana (doesn't count toward quota)
    if (monkStep === MONK_STEPS.ANA_UPLOAD) {
      setMonkStep(MONK_STEPS.IDLE);
      setMonkData(prev => ({ ...prev, isAnaMode: false, examText: null }));
      // Fall through to normal chat (message added below)
    }

    if (monkStep === MONK_STEPS.SPECIFIC_DIFFICULTIES) {
      addMessage('user', text);
      handleSpecificDifficulties(text);
      return;
    }

    if (monkStep === MONK_STEPS.SELECT_COUNTS) {
      addMessage('user', text);
      handleCountInput(text);
      return;
    }

    // Chat normal — utilise la mémoire silencieuse des 5 derniers messages comme contexte
    addMessage('user', text);
    setIsLoading(true);
    try {
      const context = [...memoryRef.current, { role: 'user', content: text }];
      const response = await assistantSvc.sendMessage(context);
      addMessage('assistant', response);
      // Mettre à jour la mémoire : garder les 5 derniers messages
      memoryRef.current = [...memoryRef.current, { role: 'user', content: text }, { role: 'assistant', content: response }].slice(-10);
    } catch (err) {
      const code = err?.response?.data?.error;
      const lang = langRef.current;
      const msg = code === 'DAILY_CHAT_LIMIT'
        ? tl(lang, 'assistant.dailyChatLimit', { limit: DAILY_LIMITS.chat })
        : t('assistant.error');
      addMessage('assistant', msg);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, monkStep, addMessage, startMonkMode, startAnaMode, handleSpecificDifficulties, handleCountInput, t]);

  // ─── Voice dictation handler ───────────────────────────────────────────────

  const handleVoiceTranscript = useCallback((text) => {
    setInput(prev => prev ? `${prev} ${text}` : text);
  }, []);

  // ─── Render messages ───────────────────────────────────────────────────────

  const renderContent = (content) => {
    const formatted = formatMath(content);
    const lines = formatted.split('\n');
    const parts = lines.map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const italic = bold.replace(/\*(.*?)\*/g, '<em>$1</em>');
      return <span key={i} dangerouslySetInnerHTML={{ __html: italic + (i < lines.length - 1 ? '<br/>' : '') }} />;
    });
    return <>{parts}</>;
  };

  const isInputDisabled = isLoading || !!thinkingText;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 border border-primary/30 flex items-center justify-center text-xl">
            🤖
          </div>
          <div>
            <h1 className="font-bold text-text-main text-base">{t('assistant.title')}</h1>
            <p className="text-xs text-text-muted">{t('assistant.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/exercises')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/30 rounded-xl text-xs text-primary font-medium hover:bg-primary/25 transition-colors mr-10"
        >
          <BookOpen size={13} />
          {t('assistant.myExercises')}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i}>
              {msg.role === 'assistant'
                ? <AssistantBubble content={renderContent(msg.content)} />
                : <UserBubble content={msg.content} />
              }
            </motion.div>
          ))}
        </AnimatePresence>

        {thinkingText && <ThinkingBubble text={thinkingText} />}
        {isLoading && <AssistantBubble isThinking thinkingText={t('assistant.thinking')} />}

        {actionButtons && !isLoading && !thinkingText && (
          <ActionButtons buttons={actionButtons} onSelect={handleActionButton} />
        )}

        {/* /ana upload buttons */}
        {monkStep === MONK_STEPS.ANA_UPLOAD && !thinkingText && (
          <div className="pl-11 flex gap-2 flex-wrap">
            {/* Galerie */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleAnaImageUpload(e.target.files?.[0])}
            />
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowAnaCamera(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary/20 border border-primary/30 text-primary text-sm rounded-xl hover:bg-primary/30 transition-colors"
            >
              <Camera size={16} />
              {t('assistant.ana.captureBtn')}
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-text-muted text-sm rounded-xl hover:bg-white/10 transition-colors"
            >
              <ImageIcon size={16} />
              {t('assistant.ana.galleryBtn')}
            </motion.button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 px-4 py-3 border-t border-white/5 flex flex-col gap-1"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('assistant.inputPlaceholder')}
            disabled={isInputDisabled}
            className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary/40 disabled:opacity-50"
          />
          {/* Voice dictation — only shown in SPECIFIC_DIFFICULTIES step */}
          {monkStep === MONK_STEPS.SPECIFIC_DIFFICULTIES && (
            <VoiceDictation
              onTranscript={handleVoiceTranscript}
              disabled={isLoading || !!thinkingText}
            />
          )}
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !!thinkingText}
            className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-40 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[11px] text-text-muted text-center">
          {t('assistant.commandsHint')}
        </p>
      </form>

      {/* Modal caméra /ana */}
      <AnimatePresence>
        {showAnaCamera && (
          <AnaCameraModal
            onCapture={(base64) => {
              setShowAnaCamera(false);
              handleAnaImageUpload(base64);
            }}
            onClose={() => setShowAnaCamera(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
