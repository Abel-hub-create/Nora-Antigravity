import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, BookOpen, Loader2, Camera, Image as ImageIcon, Plus, MessageSquare, Trash2, ChevronLeft, Menu, Paperclip, X, FileText, Command, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as assistantSvc from '../services/assistantService';
import { formatMath } from '../utils/formatMath';
import VoiceDictation from '../components/Import/VoiceDictation';
import AnaCameraModal from '../components/Assistant/AnaCameraModal';
import frLocale from '../i18n/locales/fr.json';
import enLocale from '../i18n/locales/en.json';
import { useAuth } from '../features/auth/hooks/useAuth';
import { PremiumGate, usePremiumGate } from '../components/UI/PremiumGate';

const LOCALES = { fr: frLocale, en: enLocale };

function tl(lang, key, params = {}) {
  const parts = key.split('.');
  let val = LOCALES[lang] || LOCALES.fr;
  for (const p of parts) {
    val = val?.[p];
    if (val === undefined) {
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
    <div className="w-12 h-14 shrink-0">
      <img src="/aronsbg.png" alt="Aron" className="w-full h-full object-contain" />
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

// ─── Slash Commands reference ──────────────────────────────────────────────────

const getSlashCommands = (t) => [
  { cmd: '/exs', desc: t('assistant.commands.exs') },
  { cmd: '/ana', desc: t('assistant.commands.ana') },
  { cmd: '/context', desc: t('assistant.commands.context') },
  { cmd: '/clear', desc: t('assistant.commands.clear') },
  { cmd: '/help', desc: t('assistant.commands.help') },
];

// ─── Context Panel ─────────────────────────────────────────────────────────────

const ContextPanel = ({ syntheses, selectedIds, onToggle, onClose, loading, t }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-white/10 rounded-2xl shadow-xl z-20 overflow-hidden"
  >
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
      <div className="flex items-center gap-2">
        <Paperclip size={14} className="text-primary" />
        <span className="text-sm font-semibold text-text-main">{t('assistant.context.title')}</span>
        {selectedIds.length > 0 && (
          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{selectedIds.length} {selectedIds.length > 1 ? t('assistant.context.activePlural') : t('assistant.context.active')}</span>
        )}
      </div>
      <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-main transition-colors">
        <X size={14} />
      </button>
    </div>
    <div className="max-h-56 overflow-y-auto p-2">
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-primary" /></div>
      ) : syntheses.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-6">{t('assistant.context.empty')}</p>
      ) : syntheses.map(s => {
        const isSelected = selectedIds.includes(s.id);
        return (
          <button
            key={s.id}
            onClick={() => onToggle(s.id)}
            className={`no-hover w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
              isSelected ? 'bg-primary/15 border border-primary/20' : 'border border-transparent hover:bg-white/5'
            }`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
              isSelected ? 'border-primary bg-primary/20' : 'border-white/20'
            }`}>
              {isSelected && <div className="w-2 h-2 bg-primary rounded-sm" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-main truncate">{s.title}</p>
              {s.subject && <p className="text-xs text-text-muted truncate">{s.subject}</p>}
            </div>
            <FileText size={12} className="text-text-muted shrink-0" />
          </button>
        );
      })}
    </div>
    {selectedIds.length > 0 && (
      <div className="px-4 py-2.5 border-t border-white/5 bg-primary/5">
        <p className="text-xs text-primary">
          {t('assistant.context.hint')}
        </p>
      </div>
    )}
  </motion.div>
);

// ─── Slash autocomplete ────────────────────────────────────────────────────────

const SlashAutocomplete = ({ query, onSelect }) => {
  const { t } = useTranslation();
  const matches = getSlashCommands(t).filter(c => c.cmd.startsWith(query));
  if (!matches.length || query === matches[0]?.cmd) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-full left-0 right-0 mb-1 bg-surface border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden"
    >
      {matches.map(({ cmd, desc }) => (
        <button key={cmd} onClick={() => onSelect(cmd)}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
          <code className="text-primary text-sm font-mono">{cmd}</code>
          <span className="text-xs text-text-muted">{desc}</span>
        </button>
      ))}
    </motion.div>
  );
};

// ─── Conversation sidebar ─────────────────────────────────────────────────────

const ConversationSidebar = ({ conversations, activeId, onSelect, onCreate, onDelete, isOpen, onClose }) => {
  const { t } = useTranslation();
  return (
  <>
    {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />}
    <div className={`
      fixed md:relative top-0 left-0 h-full z-40
      w-72 bg-background border-r border-white/5 flex flex-col shrink-0
      transition-transform duration-200
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      <div className="p-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-sm font-semibold text-text-main">{t('assistant.sidebar.title')}</span>
        <div className="flex gap-1">
          <button
            onClick={onCreate}
            className="p-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
            title={t('assistant.sidebar.newConversation')}
          >
            <Plus size={16} />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg text-text-muted hover:text-text-main md:hidden">
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <p className="text-xs text-text-muted text-center py-8 px-4">
            {t('assistant.sidebar.empty')}
          </p>
        )}
        {conversations.map(conv => (
          <div
            key={conv.id}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              conv.id === activeId
                ? 'bg-primary/15 border border-primary/20'
                : 'hover:bg-white/5 border border-transparent'
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <MessageSquare size={14} className="text-text-muted shrink-0" />
            <span className="flex-1 text-sm text-text-main truncate">
              {conv.title || t('assistant.sidebar.untitled')}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-text-muted hover:text-error transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  </>
  );
};

export default function Assistant() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user: authUser } = useAuth();
  const planLimits = authUser?.plan_limits || {};
  const canUseQuiz = planLimits.has_quiz !== 0 || (planLimits.max_exs_per_day ?? 0) > 0;
  const canUseTts = planLimits.has_tts !== 0;
  const maxChars = planLimits.max_char_per_message ?? 500;
  const { gateProps, showGate } = usePremiumGate();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showAnaCamera, setShowAnaCamera] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Conversation state
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingText, setThinkingText] = useState('');

  // Monk Mode state
  const [monkStep, setMonkStep] = useState(MONK_STEPS.IDLE);
  const [monkData, setMonkData] = useState({
    subject: null, analysis: null, specificDifficulties: null,
    selectedTypes: [], counts: { qcm: 0, open: 0, practical: 0 },
    difficulty: 'medium', currentTypeIndex: 0, exerciseSetId: null,
    isAnaMode: false, examText: null, feedbackNote: null
  });

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [actionButtons, setActionButtons] = useState(null);
  const langRef = useRef(i18n.language?.split('-')[0] || 'fr');
  useEffect(() => { langRef.current = i18n.language?.split('-')[0] || 'fr'; }, [i18n.language]);

  // Context (syntheses) state
  const [contextSyntheseIds, setContextSyntheseIds] = useState([]);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [availableSyntheses, setAvailableSyntheses] = useState([]);
  const [synthesesLoading, setSynthesesLoading] = useState(false);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingText, actionButtons]);

  // Load conversations on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [convs, subjects] = await Promise.all([
          assistantSvc.getConversations(),
          assistantSvc.getAvailableSubjects()
        ]);
        setAvailableSubjects(subjects);
        setConversations(convs);
        if (convs.length > 0) {
          loadConversation(convs[0].id);
        } else {
          setMessages([{ role: 'assistant', content: t('assistant.welcome') }]);
        }
      } catch {
        setMessages([{ role: 'assistant', content: t('assistant.welcome') }]);
      }
    };
    load();
  }, []); // eslint-disable-line

  const loadConversation = async (convId) => {
    try {
      setActiveConvId(convId);
      setMonkStep(MONK_STEPS.IDLE);
      setActionButtons(null);
      setShowContextPanel(false);
      const data = await assistantSvc.getConversation(convId);
      if (data.messages.length > 0) {
        setMessages(data.messages.map(m => ({ role: m.role, content: m.content })));
      } else {
        setMessages([{ role: 'assistant', content: t('assistant.welcome') }]);
      }
      // Restore context from conversation
      const ids = data.conversation?.context_synthese_ids || [];
      setContextSyntheseIds(Array.isArray(ids) ? ids : []);
      setSidebarOpen(false);
    } catch {
      setMessages([{ role: 'assistant', content: t('assistant.welcome') }]);
      setContextSyntheseIds([]);
    }
  };

  const handleOpenContext = useCallback(async () => {
    setShowContextPanel(p => !p);
    if (!availableSyntheses.length) {
      setSynthesesLoading(true);
      try {
        const syns = await assistantSvc.getSyntheses();
        setAvailableSyntheses(syns.filter(s => !s.is_archived));
      } finally { setSynthesesLoading(false); }
    }
  }, [availableSyntheses.length]);

  const handleToggleSynthese = useCallback(async (id) => {
    const newIds = contextSyntheseIds.includes(id)
      ? contextSyntheseIds.filter(i => i !== id)
      : [...contextSyntheseIds, id];
    setContextSyntheseIds(newIds);
    if (activeConvId) {
      try { await assistantSvc.updateConversationContext(activeConvId, newIds); } catch { /* non-blocking */ }
    }
  }, [contextSyntheseIds, activeConvId]);

  const handleCreateConversation = async () => {
    try {
      const conv = await assistantSvc.createConversation();
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([{ role: 'assistant', content: t('assistant.welcome') }]);
      setMonkStep(MONK_STEPS.IDLE);
      setActionButtons(null);
      setSidebarOpen(false);
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'CONVERSATION_LIMIT') {
        alert(err?.response?.data?.message || 'Limite de conversations atteinte');
      }
    }
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await assistantSvc.deleteConversation(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConvId === convId) {
        const remaining = conversations.filter(c => c.id !== convId);
        if (remaining.length > 0) {
          loadConversation(remaining[0].id);
        } else {
          setActiveConvId(null);
          setMessages([{ role: 'assistant', content: t('assistant.welcome') }]);
        }
      }
    } catch { /* ignore */ }
  };

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
      return;
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
      else if (code === 'DAILY_EXS_LIMIT') msg = tl(lang, 'assistant.monk.dailyExsLimit', { limit: 5 });
      else if (code === 'DAILY_ANA_LIMIT') msg = tl(lang, 'assistant.monk.dailyAnaLimit', { limit: 5 });
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

    if (typeof fileOrBase64 === 'string') {
      processBase64(fileOrBase64);
    } else {
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
    setShowContextPanel(false);

    if (text === '/exs' || text === '/练习') {
      if (!canUseQuiz) { showGate(t('premiumGate.features.monkMode'), t('premiumGate.features.monkModeDesc')); return; }
      addMessage('user', text);
      setMonkStep(MONK_STEPS.IDLE);
      setActionButtons(null);
      await startMonkMode();
      return;
    }

    if (text === '/ana' || text === '/分析') {
      if (!canUseQuiz) { showGate(t('premiumGate.features.anaMode'), t('premiumGate.features.anaModeDesc')); return; }
      addMessage('user', text);
      setMonkStep(MONK_STEPS.IDLE);
      setActionButtons(null);
      await startAnaMode();
      return;
    }

    if (text === '/context') {
      addMessage('user', text);
      await handleOpenContext();
      return;
    }

    if (text === '/clear') {
      addMessage('user', text);
      setContextSyntheseIds([]);
      if (activeConvId) {
        try { await assistantSvc.updateConversationContext(activeConvId, []); } catch { /* non-blocking */ }
      }
      addMessage('assistant', t('assistant.clearContextMsg'));
      return;
    }

    if (text === '/help') {
      addMessage('user', text);
      const helpMsg = `${t('assistant.commands.helpTitle')}\n\n${getSlashCommands(t).map(c => `**${c.cmd}** — ${c.desc}`).join('\n')}`;
      addMessage('assistant', helpMsg);
      return;
    }

    if (monkStep === MONK_STEPS.ANA_UPLOAD) {
      setMonkStep(MONK_STEPS.IDLE);
      setMonkData(prev => ({ ...prev, isAnaMode: false, examText: null }));
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

    // ─── Conversation-based chat ─────────────────────────────────────────────

    let convId = activeConvId;
    if (!convId) {
      try {
        const conv = await assistantSvc.createConversation();
        setConversations(prev => [conv, ...prev]);
        setActiveConvId(conv.id);
        convId = conv.id;
      } catch (err) {
        const code = err?.response?.data?.error;
        if (code === 'CONVERSATION_LIMIT') {
          addMessage('assistant', t('assistant.conversationLimit'));
          return;
        }
        addMessage('assistant', t('assistant.error'));
        return;
      }
    }

    addMessage('user', text);
    setIsLoading(true);
    try {
      const result = await assistantSvc.sendConversationMessage(convId, text, contextSyntheseIds);
      addMessage('assistant', result.message);
      if (result.conversation?.title) {
        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, title: result.conversation.title, updated_at: result.conversation.updated_at } : c
        ));
      }
    } catch (err) {
      const code = err?.response?.data?.error;
      const lang = langRef.current;
      let msg;
      if (code === 'DAILY_CHAT_LIMIT') msg = tl(lang, 'assistant.dailyChatLimit', { limit: err?.response?.data?.limit || 3 });
      else if (code === 'MESSAGE_TOO_LONG') msg = err?.response?.data?.message || t('assistant.messageTooLong');
      else msg = t('assistant.error');
      addMessage('assistant', msg);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, monkStep, activeConvId, contextSyntheseIds, addMessage, startMonkMode, startAnaMode, handleSpecificDifficulties, handleCountInput, handleOpenContext, t]);

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
    <div className="flex-1 flex bg-background overflow-hidden">
      {/* Conversation sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={loadConversation}
        onCreate={handleCreateConversation}
        onDelete={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/5 relative flex flex-col items-center">
          {/* Top row: menu (left) + exercises (right) */}
          <div className="w-full flex items-center justify-between mb-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-white/5 transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:block" />
            <button
              onClick={() => navigate('/exercises')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/30 rounded-xl text-xs text-primary font-medium hover:bg-primary/25 transition-colors"
            >
              <BookOpen size={13} />
              {t('assistant.myExercises')}
            </button>
          </div>
          {/* Centered avatar + name */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-20 h-24">
              <img src="/aronsbg.png" alt="Aron" className="w-full h-full object-contain" />
            </div>
            <h1 className="font-bold text-text-main text-base">{t('assistant.title')}</h1>
            <p className="text-xs text-text-muted">
              {conversations.find(c => c.id === activeConvId)?.title || t('assistant.subtitle')}
            </p>
          </div>
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

          {monkStep === MONK_STEPS.ANA_UPLOAD && !thinkingText && (
            <div className="pl-11 flex gap-2 flex-wrap">
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
          className="shrink-0 px-4 py-3 border-t border-white/5 flex flex-col gap-1.5"
        >
          {/* Context chips */}
          {contextSyntheseIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Paperclip size={12} className="text-primary shrink-0" />
              {contextSyntheseIds.map(id => {
                const s = availableSyntheses.find(x => x.id === id);
                return s ? (
                  <span key={id} className="flex items-center gap-1 bg-primary/15 border border-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                    <FileText size={10} />{s.title.substring(0, 25)}{s.title.length > 25 ? '…' : ''}
                    <button type="button" onClick={() => handleToggleSynthese(id)} className="ml-0.5 opacity-60 hover:opacity-100">
                      <X size={10} />
                    </button>
                  </span>
                ) : null;
              })}
              <button type="button" onClick={() => { setContextSyntheseIds([]); if (activeConvId) assistantSvc.updateConversationContext(activeConvId, []); }}
                className="text-xs text-text-muted hover:text-error transition-colors">{t('assistant.sidebar.clearContext')}</button>
            </div>
          )}

          {/* Slash autocomplete */}
          <div className="relative">
            <AnimatePresence>
              {input.startsWith('/') && input.length > 1 && (
                <SlashAutocomplete query={input} onSelect={(cmd) => { setInput(cmd); inputRef.current?.focus(); }} />
              )}
              {showContextPanel && (
                <ContextPanel
                  syntheses={availableSyntheses}
                  selectedIds={contextSyntheseIds}
                  onToggle={handleToggleSynthese}
                  onClose={() => setShowContextPanel(false)}
                  loading={synthesesLoading}
                  t={t}
                />
              )}
            </AnimatePresence>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOpenContext}
                className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                  showContextPanel || contextSyntheseIds.length > 0
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-surface border border-white/10 text-text-muted hover:text-text-main'
                }`}
                title={t('assistant.context.addButton')}
              >
                <Paperclip size={17} />
              </button>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value.slice(0, maxChars))}
                  placeholder={t('assistant.inputPlaceholder')}
                  disabled={isInputDisabled}
                  maxLength={maxChars}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary/40 disabled:opacity-50"
                />
                {input.length > maxChars * 0.8 && (
                  <span className={`absolute right-2 bottom-1 text-[10px] ${input.length >= maxChars ? 'text-red-400' : 'text-text-muted'}`}>
                    {input.length}/{maxChars}
                  </span>
                )}
              </div>
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
          </div>
          <p className="text-[11px] text-text-muted text-center">
            {t('assistant.commandsHint')} · <span className="text-primary/60">/context /clear /help</span>
          </p>
        </form>
      </div>

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

      {/* Premium Gate */}
      <PremiumGate {...gateProps} />
    </div>
  );
}
