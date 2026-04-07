import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, BookOpen, Loader2, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as assistantSvc from '../services/assistantService';
import VoiceDictation from '../components/Import/VoiceDictation';

const SUBJECT_EMOJIS = {
  mathematics: '📐', french: '📚', physics: '⚡', chemistry: '🧪',
  biology: '🧬', history: '🏛️', geography: '🌍', english: '🇬🇧', dutch: '🇳🇱'
};


// ─── Étapes Monk Mode ─────────────────────────────────────────────────────────
const MONK_STEPS = {
  IDLE: 'idle',
  SELECT_SUBJECT: 'select_subject',
  ANALYZING: 'analyzing',
  SPECIFIC_DIFFICULTIES: 'specific_difficulties',
  SELECT_TYPES: 'select_types',
  SELECT_COUNTS: 'select_counts',
  GENERATING: 'generating',
  DONE: 'done',
  // /correct
  CORRECT_SELECT: 'correct_select',
  CORRECTING: 'correcting',
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
  const { t } = useTranslation();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingText, setThinkingText] = useState('');

  // État Monk Mode
  const [monkStep, setMonkStep] = useState(MONK_STEPS.IDLE);
  const [monkData, setMonkData] = useState({
    subject: null,
    analysis: null,
    specificDifficulties: null,
    selectedTypes: [],
    counts: { qcm: 0, open: 0, practical: 0 },
    currentTypeIndex: 0,
    exerciseSetId: null,
    exerciseSets: [],
    isAnaMode: false,
    examText: null
  });

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [actionButtons, setActionButtons] = useState(null);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingText, actionButtons]);

  // Charger l'historique
  useEffect(() => {
    const load = async () => {
      try {
        const [history, subjects] = await Promise.all([
          assistantSvc.getChatHistory(),
          assistantSvc.getAvailableSubjects()
        ]);
        setAvailableSubjects(subjects);
        if (history.length > 0) {
          setMessages(history.map(m => ({ role: m.role, content: m.content })));
        } else {
          setMessages([{
            role: 'assistant',
            content: t('assistant.welcome')
          }]);
        }
      } catch {
        setMessages([{
          role: 'assistant',
          content: t('assistant.welcomeShort')
        }]);
      }
    };
    load();
  }, []); // eslint-disable-line

  const addMessage = useCallback((role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  }, []);

  // ─── Monk Mode handlers ────────────────────────────────────────────────────

  const startMonkMode = useCallback(async () => {
    setMonkStep(MONK_STEPS.SELECT_SUBJECT);
    setMonkData(prev => ({ ...prev, isAnaMode: false, examText: null }));
    addMessage('assistant', t('assistant.monk.selectSubject'));

    let subjects = availableSubjects;
    if (subjects.length === 0) {
      try {
        subjects = await assistantSvc.getAvailableSubjects();
        setAvailableSubjects(subjects);
      } catch { subjects = []; }
    }

    if (subjects.length === 0) {
      addMessage('assistant', t('assistant.monk.noSubjects'));
      setMonkStep(MONK_STEPS.IDLE);
      return;
    }

    setActionButtons(subjects.map(s => ({
      value: s,
      label: `${SUBJECT_EMOJIS[s] ?? '📖'} ${t(`subjects.${s}`) ?? s}`
    })));
  }, [availableSubjects, addMessage, t]);

  const handleSubjectSelect = useCallback(async (subject) => {
    setActionButtons(null);
    addMessage('user', `${SUBJECT_EMOJIS[subject] ?? '📖'} ${t(`subjects.${subject}`) ?? subject}`);
    setMonkData(prev => ({ ...prev, subject }));
    setMonkStep(MONK_STEPS.ANALYZING);

    const isAna = monkData.isAnaMode;

    if (isAna) {
      // /ana mode: analyze exam text
      setThinkingText(t('assistant.ana.analyzing'));
      await new Promise(r => setTimeout(r, 800));
      setThinkingText(t('assistant.ana.identifying'));

      try {
        const result = await assistantSvc.analyzeExam(monkData.examText, subject);
        setThinkingText('');
        const { analysis } = result;
        setMonkData(prev => ({ ...prev, analysis }));

        let msg = `📸 ${t('assistant.ana.analyzed')}\n\n`;
        if (analysis.weakTopics?.length > 0) {
          msg += `📊 ${t('assistant.monk.weakTopics')}\n${analysis.weakTopics.map(t => `• ${t}`).join('\n')}\n\n`;
        } else {
          msg += `${analysis.summary}\n\n`;
        }
        msg += t('assistant.monk.askSpecific');
        addMessage('assistant', msg);
        setMonkStep(MONK_STEPS.SPECIFIC_DIFFICULTIES);
      } catch {
        setThinkingText('');
        addMessage('assistant', t('assistant.monk.analyzeError'));
        setMonkStep(MONK_STEPS.IDLE);
      }
    } else {
      // Regular monk mode: analyze quiz answers
      setThinkingText(t('assistant.monk.analyzingSubject', { subject: t(`subjects.${subject}`) }));
      await new Promise(r => setTimeout(r, 800));
      setThinkingText(t('assistant.monk.analyzingQuiz'));
      await new Promise(r => setTimeout(r, 1000));
      setThinkingText(t('assistant.monk.analyzingWeak'));

      try {
        const result = await assistantSvc.analyzeSubject(subject);
        setThinkingText('');
        const { analysis, synthesesCount, answersCount } = result;
        setMonkData(prev => ({ ...prev, analysis }));

        let msg = t('assistant.monk.analyzed', {
          syntheses: synthesesCount,
          synthesesPlural: synthesesCount > 1 ? 's' : '',
          answers: answersCount,
          answersPlural: answersCount > 1 ? 's' : '',
          subject: t(`subjects.${subject}`)
        }) + '\n\n';

        if (analysis.hasSufficientData && analysis.weakTopics.length > 0) {
          msg += `📊 ${t('assistant.monk.weakTopics')}\n${analysis.weakTopics.map(tp => `• ${tp}`).join('\n')}\n\n`;
        } else {
          msg += `${analysis.summary}\n\n`;
        }

        msg += t('assistant.monk.askSpecific');
        addMessage('assistant', msg);
        setMonkStep(MONK_STEPS.SPECIFIC_DIFFICULTIES);
      } catch {
        setThinkingText('');
        addMessage('assistant', t('assistant.monk.analyzeError'));
        setMonkStep(MONK_STEPS.IDLE);
      }
    }
  }, [addMessage, monkData.isAnaMode, monkData.examText, t]);

  const handleSpecificDifficulties = useCallback((text) => {
    const isNo = /^(non|no|nope|pas|rien|skip|aucun)/i.test(text.trim());
    setMonkData(prev => ({
      ...prev,
      specificDifficulties: isNo ? null : text.trim()
    }));

    if (!isNo) {
      addMessage('assistant', t('assistant.monk.noted', { text: text.trim() }));
    }

    setMonkStep(MONK_STEPS.SELECT_TYPES);
    addMessage('assistant', t('assistant.monk.selectTypes'));
    setActionButtons([
      { value: 'qcm', label: '📝 QCM' },
      { value: 'open', label: '✍️ ' + t('assistant.monk.openQuestions') },
      { value: 'practical', label: '🔬 ' + t('assistant.monk.practicalExercises') },
      { value: 'confirm_types', label: '✅ ' + t('assistant.monk.confirmTypes') }
    ]);
    setMonkData(prev => ({ ...prev, selectedTypes: [] }));
  }, [addMessage, t]);

  const handleTypeToggle = useCallback((type) => {
    if (type === 'confirm_types') {
      setMonkData(prev => {
        if (prev.selectedTypes.length === 0) {
          addMessage('assistant', t('assistant.monk.atLeastOne'));
          return prev;
        }
        setActionButtons(null);
        setMonkStep(MONK_STEPS.SELECT_COUNTS);
        const firstType = prev.selectedTypes[0];
        const maxMap = { qcm: 5, open: 10, practical: 10 };
        const nameMap = {
          qcm: 'QCM',
          open: t('assistant.monk.openQuestions'),
          practical: t('assistant.monk.practicalExercises')
        };
        addMessage('assistant', t('assistant.monk.howMany', { type: nameMap[firstType], max: maxMap[firstType] }));
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
  }, [addMessage, t]);

  const handleCountInput = useCallback((text) => {
    const num = parseInt(text);
    if (isNaN(num) || num < 1) {
      addMessage('assistant', t('assistant.monk.invalidNumber'));
      return;
    }

    setMonkData(prev => {
      const types = prev.selectedTypes;
      const type = types[prev.currentTypeIndex];
      const maxMap = { qcm: 5, open: 10, practical: 10 };
      const nameMap = {
        qcm: 'QCM',
        open: t('assistant.monk.openQuestions'),
        practical: t('assistant.monk.practicalExercises')
      };
      const clampedNum = Math.min(Math.max(1, num), maxMap[type]);
      const newCounts = { ...prev.counts, [type]: clampedNum };
      const nextIndex = prev.currentTypeIndex + 1;

      if (nextIndex < types.length) {
        const nextType = types[nextIndex];
        addMessage('assistant', t('assistant.monk.howMany', { type: nameMap[nextType], max: maxMap[nextType] }));
        return { ...prev, counts: newCounts, currentTypeIndex: nextIndex };
      } else {
        const self = { ...prev, counts: newCounts };
        generateExercisesFlow(self);
        return self;
      }
    });
  }, [addMessage, t]);

  const generateExercisesFlow = useCallback(async (data) => {
    setMonkStep(MONK_STEPS.GENERATING);
    setThinkingText(t('assistant.monk.generating'));
    await new Promise(r => setTimeout(r, 800));
    setThinkingText(t('assistant.monk.buildingSet', { subject: t(`subjects.${data.subject}`) }));

    try {
      const result = await assistantSvc.generateExercises({
        subject: data.subject,
        weakTopics: data.analysis?.weakTopics || [],
        specificDifficulties: data.specificDifficulties,
        counts: data.counts
      });
      setThinkingText('');

      const total = (data.counts.qcm || 0) + (data.counts.open || 0) + (data.counts.practical || 0);
      addMessage('assistant', t('assistant.monk.generated', {
        count: total,
        plural: total > 1 ? 's' : '',
        title: result.title
      }));
      setActionButtons([{ value: 'goto_exercises', label: t('assistant.monk.viewExercises') }]);
      setMonkData(prev => ({ ...prev, exerciseSetId: result.exerciseSetId }));
      setMonkStep(MONK_STEPS.DONE);
    } catch (err) {
      setThinkingText('');
      const msg = err?.response?.data?.error === 'EXERCISES_LIMIT_REACHED'
        ? t('assistant.monk.limitReached')
        : t('assistant.monk.genError');
      addMessage('assistant', msg);
      setMonkStep(MONK_STEPS.IDLE);
    }
  }, [addMessage, t]);

  // ─── /correct handlers ─────────────────────────────────────────────────────

  const startCorrectMode = useCallback(async () => {
    setMonkStep(MONK_STEPS.CORRECT_SELECT);
    addMessage('assistant', t('assistant.correct.loading'));
    try {
      const { exercises } = await import('../services/exerciseService').then(m => m.getExercises());
      if (!exercises || exercises.length === 0) {
        addMessage('assistant', t('assistant.correct.empty'));
        setMonkStep(MONK_STEPS.IDLE);
        return;
      }
      setMonkData(prev => ({ ...prev, exerciseSets: exercises }));
      addMessage('assistant', t('assistant.correct.select'));
      setActionButtons(exercises.map(e => ({
        value: `correct_set_${e.id}`,
        label: `${SUBJECT_EMOJIS[e.subject] ?? '📖'} ${e.title}`
      })));
    } catch {
      addMessage('assistant', t('assistant.correct.error'));
      setMonkStep(MONK_STEPS.IDLE);
    }
  }, [addMessage, t]);

  const handleCorrectSet = useCallback(async (setId) => {
    setActionButtons(null);
    setMonkStep(MONK_STEPS.CORRECTING);
    setThinkingText(t('assistant.correct.readingAnswers'));
    await new Promise(r => setTimeout(r, 700));
    setThinkingText(t('assistant.correct.correcting'));

    try {
      const correction = await assistantSvc.correctExercises(setId);
      setThinkingText('');

      const { corrections, globalFeedback } = correction;
      let msg = `📝 **${t('assistant.correct.done')}**\n\n`;

      corrections.forEach((c, i) => {
        const icon = c.isCorrect ? '✅' : c.isPartial ? '🟡' : '❌';
        msg += `${icon} **Exercice ${i + 1}** — ${c.feedback}\n`;
        if (c.tip) msg += `   💡 *${c.tip}*\n`;
        msg += '\n';
      });

      if (globalFeedback) msg += `---\n🌟 ${globalFeedback}`;
      addMessage('assistant', msg);
      setMonkStep(MONK_STEPS.IDLE);
    } catch (err) {
      setThinkingText('');
      const msg = err?.response?.data?.error === 'Aucune réponse à corriger'
        ? t('assistant.correct.noAnswers')
        : t('assistant.correct.error');
      addMessage('assistant', msg);
      setMonkStep(MONK_STEPS.IDLE);
    }
  }, [addMessage, t]);

  // ─── /ana handlers ─────────────────────────────────────────────────────────

  const startAnaMode = useCallback(async () => {
    setMonkStep(MONK_STEPS.ANA_UPLOAD);
    setMonkData(prev => ({ ...prev, isAnaMode: true, examText: null }));
    addMessage('assistant', t('assistant.ana.upload'));
  }, [addMessage, t]);

  const handleAnaImageUpload = useCallback(async (file) => {
    if (!file) return;

    setThinkingText(t('assistant.ana.extracting'));

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result.split(',')[1]; // remove data:image/...;base64, prefix

        // We just need base64 for OCR — set examText directly
        // First check if image is valid
        if (!base64 || base64.length < 100) {
          setThinkingText('');
          addMessage('assistant', t('assistant.ana.extractError'));
          setMonkStep(MONK_STEPS.IDLE);
          return;
        }

        setMonkData(prev => ({ ...prev, examText: base64 }));
        setThinkingText('');
        addMessage('assistant', t('assistant.ana.extracted'));

        // Move to subject selection
        setMonkStep(MONK_STEPS.SELECT_SUBJECT);

        let subjects = availableSubjects;
        if (subjects.length === 0) {
          try {
            subjects = await assistantSvc.getAvailableSubjects();
            setAvailableSubjects(subjects);
          } catch { subjects = []; }
        }

        if (subjects.length === 0) {
          addMessage('assistant', t('assistant.monk.noSubjects'));
          setMonkStep(MONK_STEPS.IDLE);
          return;
        }

        setActionButtons(subjects.map(s => ({
          value: s,
          label: `${SUBJECT_EMOJIS[s] ?? '📖'} ${t(`subjects.${s}`) ?? s}`
        })));
      } catch {
        setThinkingText('');
        addMessage('assistant', t('assistant.ana.extractError'));
        setMonkStep(MONK_STEPS.IDLE);
      }
    };
    reader.readAsDataURL(file);
  }, [availableSubjects, addMessage, t]);

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

    if (value.startsWith('correct_set_')) {
      const setId = parseInt(value.replace('correct_set_', ''));
      handleCorrectSet(setId);
      return;
    }
  }, [monkStep, handleSubjectSelect, handleTypeToggle, handleCorrectSet, navigate]);

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

    if (text === '/correct' || text === '/批改') {
      addMessage('user', text);
      setMonkStep(MONK_STEPS.IDLE);
      setActionButtons(null);
      await startCorrectMode();
      return;
    }

    if (text === '/ana' || text === '/分析') {
      addMessage('user', text);
      setMonkStep(MONK_STEPS.IDLE);
      setActionButtons(null);
      await startAnaMode();
      return;
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

    // Chat normal
    addMessage('user', text);
    setIsLoading(true);
    try {
      const history = [...messages, { role: 'user', content: text }].slice(-20);
      const response = await assistantSvc.sendMessage(history);
      addMessage('assistant', response);
    } catch {
      addMessage('assistant', t('assistant.error'));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, monkStep, addMessage, startMonkMode, startCorrectMode, startAnaMode, handleSpecificDifficulties, handleCountInput, t]);

  // ─── Voice dictation handler ───────────────────────────────────────────────

  const handleVoiceTranscript = useCallback((text) => {
    setInput(prev => prev ? `${prev} ${text}` : text);
  }, []);

  // ─── Render messages ───────────────────────────────────────────────────────

  const renderContent = (content) => {
    const parts = content.split('\n').map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const italic = bold.replace(/\*(.*?)\*/g, '<em>$1</em>');
      return <span key={i} dangerouslySetInnerHTML={{ __html: italic + (i < content.split('\n').length - 1 ? '<br/>' : '') }} />;
    });
    return <>{parts}</>;
  };

  const isInputDisabled = isLoading || !!thinkingText || monkStep === MONK_STEPS.ANA_UPLOAD;

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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-white/10 rounded-xl text-xs text-text-muted hover:text-primary hover:border-primary/30 transition-colors mr-10"
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

        {/* /ana upload button */}
        {monkStep === MONK_STEPS.ANA_UPLOAD && !thinkingText && (
          <div className="pl-11">
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
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary/20 border border-primary/30 text-primary text-sm rounded-xl hover:bg-primary/30 transition-colors"
            >
              <Camera size={16} />
              {t('assistant.ana.uploadBtn')}
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
            disabled={!input.trim() || isLoading || !!thinkingText || monkStep === MONK_STEPS.ANA_UPLOAD}
            className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-40 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[11px] text-text-muted text-center">
          {t('assistant.commandsHint')}
        </p>
      </form>
    </div>
  );
}
