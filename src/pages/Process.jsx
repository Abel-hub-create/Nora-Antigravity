import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Loader2, AlertCircle, Sparkles, BookOpen, Brain, HelpCircle, Save, ArrowLeft } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { createSynthese } from '../services/syntheseService';
import { generateComplete, isMockMode } from '../services/openaiService';

const STEPS = [
  { id: 'title', label: 'Titre', icon: Sparkles, description: 'Génération du titre' },
  { id: 'summary', label: 'Synthèse', icon: BookOpen, description: 'Création de la synthèse' },
  { id: 'flashcards', label: 'Flashcards', icon: Brain, description: 'Génération des flashcards' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Création des questions' },
  { id: 'saving', label: 'Sauvegarde', icon: Save, description: 'Enregistrement' }
];

const Process = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addNotification } = useUser();

  // Récupérer les données passées depuis Import
  const { content, sourceType } = location.state || {};

  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [error, setError] = useState(null);
  const [generatedData, setGeneratedData] = useState({
    title: '',
    summary: '',
    flashcards: [],
    quizQuestions: []
  });

  // Rediriger si pas de contenu
  useEffect(() => {
    if (!content) {
      navigate('/import');
    }
  }, [content, navigate]);

  // Processus de generation - un seul appel backend
  useEffect(() => {
    if (!content) return;

    const processContent = async () => {
      // Animation des etapes pendant la generation
      // Le backend genere tout en un seul appel
      setCurrentStep(0);

      // Simuler la progression des etapes pour le feedback visuel
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => prev < 3 ? prev + 1 : prev);
      }, 1500);

      try {
        // Appel unique au backend qui genere tout
        const { title, summary, flashcards, quizQuestions } = await generateComplete(content);

        clearInterval(stepInterval);
        setGeneratedData({ title, summary, flashcards, quizQuestions });

        // Etape 5: Sauvegarder dans la base de donnees
        setCurrentStep(4);
        const synthese = await createSynthese({
          title,
          originalContent: content,
          summaryContent: summary,
          sourceType: sourceType || 'text',
          flashcards,
          quizQuestions
        });

        // Succes !
        setStatus('success');

        // Notification
        if (isMockMode()) {
          addNotification('Synthese creee (mode demo)', 'success');
        } else {
          addNotification('Synthese creee avec succes !', 'success');
        }

        // Rediriger vers la synthese creee apres un court delai
        setTimeout(() => {
          navigate(`/study/${synthese.id}`);
        }, 1500);

      } catch (err) {
        clearInterval(stepInterval);
        console.error('Erreur lors du traitement:', err);
        setStatus('error');
        const errorMessage = err?.message || err?.error || 'Une erreur est survenue';
        setError(errorMessage);
      }
    };

    processContent();
  }, [content, sourceType, navigate, addNotification]);

  // Réessayer en cas d'erreur
  const handleRetry = () => {
    setStatus('processing');
    setError(null);
    setCurrentStep(0);
    // Relancer le processus en forçant un re-render
    window.location.reload();
  };

  // Retourner à l'import
  const handleBack = () => {
    navigate('/import');
  };

  // Calculer la progression
  const progress = status === 'success'
    ? 100
    : Math.round((currentStep / STEPS.length) * 100);

  if (!content) {
    return null;
  }

  return (
    <div className="min-h-full bg-background p-6 pt-8 flex flex-col">
      {/* Header */}
      <header className="mb-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          Retour
        </button>
        <h1 className="text-2xl font-bold text-text-main">
          {status === 'success' ? 'Terminé !' : 'Traitement en cours'}
        </h1>
        <p className="text-text-muted">
          {status === 'success'
            ? 'Votre synthèse est prête'
            : isMockMode()
              ? 'Mode démonstration (API non connectée)'
              : 'Génération du contenu par IA...'}
        </p>
      </header>

      {/* Progress Circle */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 mb-8">
          {/* Background Circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-surface"
            />
            <motion.circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={status === 'error' ? 'text-error' : status === 'success' ? 'text-green-400' : 'text-primary'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                strokeDasharray: '439.82',
                strokeDashoffset: 0
              }}
            />
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {status === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="text-center"
                >
                  <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-2" />
                  <span className="text-2xl font-bold text-text-main">{progress}%</span>
                </motion.div>
              )}
              {status === 'success' && (
                <motion.div
                  key="success"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center"
                >
                  <Check className="w-12 h-12 text-green-400 mx-auto" />
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center"
                >
                  <AlertCircle className="w-12 h-12 text-error mx-auto" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Steps List */}
        <div className="w-full max-w-xs space-y-3">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === index && status === 'processing';
            const isCompleted = currentStep > index || status === 'success';
            const isError = status === 'error' && currentStep === index;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-primary/10 border border-primary/30'
                    : isCompleted
                      ? 'bg-green-500/10 border border-green-500/20'
                      : isError
                        ? 'bg-error/10 border border-error/30'
                        : 'bg-surface/50 border border-white/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive
                    ? 'bg-primary text-white'
                    : isCompleted
                      ? 'bg-green-500 text-white'
                      : isError
                        ? 'bg-error text-white'
                        : 'bg-surface text-text-muted'
                }`}>
                  {isCompleted ? (
                    <Check size={16} />
                  ) : isActive ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <StepIcon size={16} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    isActive || isCompleted ? 'text-text-main' : 'text-text-muted'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-text-muted">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Error Message & Retry */}
        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 w-full max-w-xs"
            >
              <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-4">
                <p className="text-error text-sm">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
              >
                Réessayer
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Preview */}
        <AnimatePresence>
          {status === 'success' && generatedData.title && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 w-full max-w-xs text-center"
            >
              <p className="text-text-muted text-sm mb-2">Synthèse créée</p>
              <p className="text-text-main font-medium">{generatedData.title}</p>
              <p className="text-text-muted text-xs mt-4">
                Redirection automatique...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      {isMockMode() && status === 'processing' && (
        <div className="mt-8 text-center">
          <p className="text-xs text-text-muted">
            Mode démonstration actif. Connectez l'API OpenAI pour la génération réelle.
          </p>
        </div>
      )}
    </div>
  );
};

export default Process;
