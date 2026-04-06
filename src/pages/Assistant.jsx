import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, BookOpen, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as assistantSvc from '../services/assistantService';

const SUBJECT_EMOJIS = {
  mathematics: '📐', french: '📚', physics: '⚡', chemistry: '🧪',
  biology: '🧬', history: '🏛️', geography: '🌍', english: '🇬🇧', dutch: '🇳🇱'
};

const SUBJECT_NAMES = {
  mathematics: 'Mathématiques', french: 'Français', physics: 'Physique',
  chemistry: 'Chimie', biology: 'Biologie', history: 'Histoire',
  geography: 'Géographie', english: 'Anglais', dutch: 'Néerlandais'
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
  CORRECTING: 'correcting'
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

const AssistantBubble = ({ content, isThinking }) => (
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
          <Loader2 size={14} className="animate-spin" /> En train de réfléchir...
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
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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
    exerciseSets: []
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
            content: 'Bonjour ! Je suis NORA, ton assistant pédagogique. Je suis là pour t\'aider à comprendre tes cours et à progresser. 😊\n\nTape /exs pour lancer le **Monk Mode** et générer des exercices adaptés à tes difficultés, ou /correct pour corriger tes exercices.'
          }]);
        }
      } catch {
        setMessages([{
          role: 'assistant',
          content: 'Bonjour ! Je suis NORA, ton assistant pédagogique. 😊\n\nTape /exs pour le **Monk Mode** ou /correct pour corriger tes exercices.'
        }]);
      }
    };
    load();
  }, []);

  const addMessage = useCallback((role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  }, []);

  // ─── Monk Mode handlers ────────────────────────────────────────────────────

  const startMonkMode = useCallback(async () => {
    setMonkStep(MONK_STEPS.SELECT_SUBJECT);
    addMessage('assistant', 'Dans quelle matière veux-tu travailler ? 🎯');

    let subjects = availableSubjects;
    if (subjects.length === 0) {
      try {
        subjects = await assistantSvc.getAvailableSubjects();
        setAvailableSubjects(subjects);
      } catch { subjects = []; }
    }

    if (subjects.length === 0) {
      addMessage('assistant', 'Tu n\'as pas encore de synthèses avec une matière assignée. Importe d\'abord un cours en choisissant une matière ! 📚');
      setMonkStep(MONK_STEPS.IDLE);
      return;
    }

    setActionButtons(subjects.map(s => ({
      value: s,
      label: `${SUBJECT_EMOJIS[s] ?? '📖'} ${SUBJECT_NAMES[s] ?? s}`
    })));
  }, [availableSubjects, addMessage]);

  const handleSubjectSelect = useCallback(async (subject) => {
    setActionButtons(null);
    addMessage('user', `${SUBJECT_EMOJIS[subject] ?? '📖'} ${SUBJECT_NAMES[subject] ?? subject}`);
    setMonkData(prev => ({ ...prev, subject }));
    setMonkStep(MONK_STEPS.ANALYZING);

    // Thinking indicators
    setThinkingText(`Recherche de tes synthèses en ${SUBJECT_NAMES[subject]}...`);
    await new Promise(r => setTimeout(r, 800));
    setThinkingText('Analyse de tes résultats aux quiz...');
    await new Promise(r => setTimeout(r, 1000));
    setThinkingText('Identification de tes points faibles...');

    try {
      const result = await assistantSvc.analyzeSubject(subject);
      setThinkingText('');
      const { analysis, synthesesCount, answersCount } = result;
      setMonkData(prev => ({ ...prev, analysis }));

      let msg = `J'ai analysé **${synthesesCount} synthèse${synthesesCount > 1 ? 's' : ''}** et **${answersCount} réponse${answersCount > 1 ? 's' : ''}** en ${SUBJECT_NAMES[subject]}.\n\n`;

      if (analysis.hasSufficientData && analysis.weakTopics.length > 0) {
        msg += `📊 Tes points à renforcer :\n${analysis.weakTopics.map(t => `• ${t}`).join('\n')}\n\n`;
      } else {
        msg += `${analysis.summary}\n\n`;
      }

      msg += `As-tu des difficultés spécifiques à ajouter ? (écris-les ou dis "non")`;
      addMessage('assistant', msg);
      setMonkStep(MONK_STEPS.SPECIFIC_DIFFICULTIES);
    } catch (err) {
      setThinkingText('');
      addMessage('assistant', 'Erreur lors de l\'analyse. Réessaie dans un moment.');
      setMonkStep(MONK_STEPS.IDLE);
    }
  }, [addMessage]);

  const handleSpecificDifficulties = useCallback((text) => {
    const isNo = /^(non|no|nope|pas|rien|skip|aucun)/i.test(text.trim());
    setMonkData(prev => ({
      ...prev,
      specificDifficulties: isNo ? null : text.trim()
    }));

    if (!isNo) {
      addMessage('assistant', `Noté ! Je prendrai en compte : *"${text.trim()}"* 📝`);
    }

    // Sélection des types
    setMonkStep(MONK_STEPS.SELECT_TYPES);
    addMessage('assistant', 'Quels types d\'exercices veux-tu ? (sélectionne au moins un)\n\n• **QCM** — Questions à choix multiples (max 5)\n• **Questions ouvertes** — Réponses rédigées (max 10)\n• **Exercices pratiques** — Calculs, manipulations (max 10)');
    setActionButtons([
      { value: 'qcm', label: '📝 QCM' },
      { value: 'open', label: '✍️ Questions ouvertes' },
      { value: 'practical', label: '🔬 Exercices pratiques' },
      { value: 'confirm_types', label: '✅ Valider ma sélection' }
    ]);
    setMonkData(prev => ({ ...prev, selectedTypes: [] }));
  }, [addMessage]);

  const handleTypeToggle = useCallback((type) => {
    if (type === 'confirm_types') {
      setMonkData(prev => {
        if (prev.selectedTypes.length === 0) {
          addMessage('assistant', 'Sélectionne au moins un type d\'exercice ! 😊');
          return prev;
        }
        setActionButtons(null);
        setMonkStep(MONK_STEPS.SELECT_COUNTS);
        const firstType = prev.selectedTypes[0];
        const maxMap = { qcm: 5, open: 10, practical: 10 };
        const nameMap = { qcm: 'QCM', open: 'questions ouvertes', practical: 'exercices pratiques' };
        addMessage('assistant', `Combien de **${nameMap[firstType]}** veux-tu ? (1 à ${maxMap[firstType]})`);
        return { ...prev, currentTypeIndex: 0 };
      });
      return;
    }

    setMonkData(prev => {
      const isSelected = prev.selectedTypes.includes(type);
      const newTypes = isSelected
        ? prev.selectedTypes.filter(t => t !== type)
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
    const num = parseInt(text);
    if (isNaN(num) || num < 1) {
      addMessage('assistant', 'Donne-moi un nombre entre 1 et le maximum indiqué 😊');
      return;
    }

    setMonkData(prev => {
      const types = prev.selectedTypes;
      const type = types[prev.currentTypeIndex];
      const maxMap = { qcm: 5, open: 10, practical: 10 };
      const nameMap = { qcm: 'QCM', open: 'questions ouvertes', practical: 'exercices pratiques' };
      const clampedNum = Math.min(Math.max(1, num), maxMap[type]);
      const newCounts = { ...prev.counts, [type]: clampedNum };
      const nextIndex = prev.currentTypeIndex + 1;

      if (nextIndex < types.length) {
        const nextType = types[nextIndex];
        addMessage('assistant', `Parfait ! Et combien de **${nameMap[nextType]}** ? (1 à ${maxMap[nextType]})`);
        return { ...prev, counts: newCounts, currentTypeIndex: nextIndex };
      } else {
        // Lancer la génération
        const self = { ...prev, counts: newCounts };
        generateExercisesFlow(self);
        return self;
      }
    });
  }, [addMessage]);

  const generateExercisesFlow = useCallback(async (data) => {
    setMonkStep(MONK_STEPS.GENERATING);
    setThinkingText('Génération de tes exercices personnalisés...');
    await new Promise(r => setTimeout(r, 800));
    setThinkingText(`Construction du set ${SUBJECT_NAMES[data.subject]}...`);

    try {
      const result = await assistantSvc.generateExercises({
        subject: data.subject,
        weakTopics: data.analysis?.weakTopics || [],
        specificDifficulties: data.specificDifficulties,
        counts: data.counts
      });
      setThinkingText('');

      const total = (data.counts.qcm || 0) + (data.counts.open || 0) + (data.counts.practical || 0);
      addMessage('assistant', `✅ **${total} exercice${total > 1 ? 's' : ''} créé${total > 1 ? 's' : ''}** : "${result.title}"\n\nQuand tu auras terminé, tape **/correct** pour que je les corrige !`);
      setActionButtons([{ value: 'goto_exercises', label: '📋 Voir mes exercices →' }]);
      setMonkData(prev => ({ ...prev, exerciseSetId: result.exerciseSetId }));
      setMonkStep(MONK_STEPS.DONE);
    } catch (err) {
      setThinkingText('');
      const msg = err?.response?.data?.error === 'EXERCISES_LIMIT_REACHED'
        ? 'Tu as atteint la limite de 15 sets d\'exercices. Supprime-en un pour continuer.'
        : 'Erreur lors de la génération. Réessaie dans un moment.';
      addMessage('assistant', msg);
      setMonkStep(MONK_STEPS.IDLE);
    }
  }, [addMessage]);

  // ─── /correct handlers ─────────────────────────────────────────────────────

  const startCorrectMode = useCallback(async () => {
    setMonkStep(MONK_STEPS.CORRECT_SELECT);
    addMessage('assistant', 'Chargement de tes exercices...');
    try {
      const { exercises } = await import('../services/exerciseService').then(m => m.getExercises());
      if (!exercises || exercises.length === 0) {
        addMessage('assistant', 'Tu n\'as pas encore d\'exercices à corriger. Lance le Monk Mode avec **/exs** ! 💪');
        setMonkStep(MONK_STEPS.IDLE);
        return;
      }
      setMonkData(prev => ({ ...prev, exerciseSets: exercises }));
      addMessage('assistant', 'Quel set d\'exercices veux-tu corriger ?');
      setActionButtons(exercises.map(e => ({
        value: `correct_set_${e.id}`,
        label: `${SUBJECT_EMOJIS[e.subject] ?? '📖'} ${e.title}`
      })));
    } catch {
      addMessage('assistant', 'Erreur lors du chargement. Réessaie.');
      setMonkStep(MONK_STEPS.IDLE);
    }
  }, [addMessage]);

  const handleCorrectSet = useCallback(async (setId) => {
    setActionButtons(null);
    setMonkStep(MONK_STEPS.CORRECTING);
    setThinkingText('Lecture de tes réponses...');
    await new Promise(r => setTimeout(r, 700));
    setThinkingText('Correction en cours...');

    try {
      const correction = await assistantSvc.correctExercises(setId);
      setThinkingText('');

      const { corrections, globalFeedback } = correction;
      let msg = `📝 **Correction terminée !**\n\n`;

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
        ? 'Il n\'y a aucune réponse à corriger pour ce set. Remplis les exercices d\'abord ! ✏️'
        : 'Erreur lors de la correction. Réessaie.';
      addMessage('assistant', msg);
      setMonkStep(MONK_STEPS.IDLE);
    }
  }, [addMessage]);

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

    // Commandes spéciales
    if (text === '/exs') {
      addMessage('user', text);
      setMonkStep(MONK_STEPS.IDLE);
      setActionButtons(null);
      await startMonkMode();
      return;
    }

    if (text === '/correct') {
      addMessage('user', text);
      setMonkStep(MONK_STEPS.IDLE);
      setActionButtons(null);
      await startCorrectMode();
      return;
    }

    // Flux Monk Mode
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
      addMessage('assistant', 'Désolé, une erreur s\'est produite. Réessaie dans un moment.');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, monkStep, addMessage, startMonkMode, startCorrectMode, handleSpecificDifficulties, handleCountInput]);

  // ─── Render messages ───────────────────────────────────────────────────────

  const renderContent = (content) => {
    // Simple markdown : **bold**, *italic*, • bullets, \n newlines
    const parts = content.split('\n').map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const italic = bold.replace(/\*(.*?)\*/g, '<em>$1</em>');
      return <span key={i} dangerouslySetInnerHTML={{ __html: italic + (i < content.split('\n').length - 1 ? '<br/>' : '') }} />;
    });
    return <>{parts}</>;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 border border-primary/30 flex items-center justify-center text-xl">
            🤖
          </div>
          <div>
            <h1 className="font-bold text-text-main text-base">NORA</h1>
            <p className="text-xs text-text-muted">Assistant pédagogique</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/exercises')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-white/10 rounded-xl text-xs text-text-muted hover:text-primary hover:border-primary/30 transition-colors"
        >
          <BookOpen size={13} />
          Mes exercices
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

        {/* Thinking */}
        {thinkingText && <ThinkingBubble text={thinkingText} />}

        {/* Loading */}
        {isLoading && <AssistantBubble isThinking />}

        {/* Boutons d'action */}
        {actionButtons && !isLoading && !thinkingText && (
          <ActionButtons buttons={actionButtons} onSelect={handleActionButton} />
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
            placeholder="Envoie un message..."
            disabled={isLoading || !!thinkingText}
            className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !!thinkingText}
            className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-40 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[11px] text-text-muted text-center">
          Tape <span className="text-primary font-mono">/exs</span> pour le Monk Mode · <span className="text-primary font-mono">/correct</span> pour corriger tes exercices
        </p>
      </form>
    </div>
  );
}
