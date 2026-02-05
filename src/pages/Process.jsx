import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, AlertCircle, Sparkles, BookOpen, Brain, HelpCircle, Save, ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { createSynthese } from '../services/syntheseService';
import { generateComplete, verifySubject, isMockMode } from '../services/openaiService';

const Process = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { addNotification } = useUser();

  const STEPS = [
    { id: 'title', label: t('process.steps.title'), icon: Sparkles, description: t('process.steps.titleDesc') },
    { id: 'summary', label: t('process.steps.summary'), icon: BookOpen, description: t('process.steps.summaryDesc') },
    { id: 'flashcards', label: t('process.steps.flashcards'), icon: Brain, description: t('process.steps.flashcardsDesc') },
    { id: 'quiz', label: t('process.steps.quiz'), icon: HelpCircle, description: t('process.steps.quizDesc') },
    { id: 'saving', label: t('process.steps.saving'), icon: Save, description: t('process.steps.savingDesc') }
  ];

  // Récupérer les données passées depuis Import
  const { content, sourceType, subject, specificInstructions } = location.state || {};

  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('verifying'); // verifying, processing, success, error
  const [error, setError] = useState(null);
  const [generatedData, setGeneratedData] = useState({
    title: '',
    summary: '',
    flashcards: [],
    quizQuestions: []
  });

  // État pour la vérification de matière
  const [verificationResult, setVerificationResult] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [forceGenerate, setForceGenerate] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(subject);

  // Rediriger si pas de contenu
  useEffect(() => {
    if (!content) {
      navigate('/import');
    }
  }, [content, navigate]);

  // Compteur pour relancer le processus (evite window.reload)
  const [retryCount, setRetryCount] = useState(0);

  // Processus complet: verification puis generation
  useEffect(() => {
    if (!content) return;

    let isCancelled = false;
    let stepInterval = null;

    const runProcess = async () => {
      // Etape 1: Verification (si matiere selectionnee et pas de force)
      if (currentSubject && !forceGenerate) {
        try {
          setStatus('verifying');
          const result = await verifySubject(content, currentSubject);

          if (isCancelled) return;
          setVerificationResult(result);

          // Si mismatch detecte, afficher le modal et arreter
          if (!result.correspondance && !result.error) {
            setShowVerificationModal(true);
            return;
          }
        } catch (err) {
          console.error('Verification error:', err);
          // En cas d'erreur, continuer quand meme (fail-safe)
        }
      }

      if (isCancelled) return;

      // Etape 2: Generation
      setStatus('processing');
      setCurrentStep(0);

      // Animation des etapes
      stepInterval = setInterval(() => {
        setCurrentStep(prev => prev < 3 ? prev + 1 : prev);
      }, 1500);

      try {
        // Appel unique au backend qui genere tout
        const { title, summary, flashcards, quizQuestions } = await generateComplete(content, specificInstructions, currentSubject);

        if (isCancelled) return;

        clearInterval(stepInterval);
        stepInterval = null;
        setGeneratedData({ title, summary, flashcards, quizQuestions });

        // Etape 5: Sauvegarder dans la base de donnees
        setCurrentStep(4);
        const synthese = await createSynthese({
          title,
          originalContent: content,
          summaryContent: summary,
          sourceType: sourceType || 'text',
          subject: currentSubject || null,
          flashcards,
          quizQuestions,
          specificInstructions: specificInstructions || null
        });

        if (isCancelled) return;

        // Succes !
        setStatus('success');

        // Notification
        if (isMockMode()) {
          addNotification(t('process.summaryCreatedDemo'), 'success');
        } else {
          addNotification(t('process.summaryCreatedSuccess'), 'success');
        }

        // Rediriger vers la synthese creee apres un court delai
        setTimeout(() => {
          if (!isCancelled) {
            navigate(`/study/${synthese.id}`);
          }
        }, 1500);

      } catch (err) {
        if (stepInterval) {
          clearInterval(stepInterval);
          stepInterval = null;
        }
        if (isCancelled) return;

        console.error('Error processing:', err);
        setStatus('error');
        const errorCode = err?.response?.data?.code;
        let errorMessage;
        if (errorCode === 'SYNTHESES_LIMIT_REACHED') {
          errorMessage = t('errors.synthesesLimitReached');
        } else {
          errorMessage = err?.message || err?.error || t('errors.generic');
        }
        setError(errorMessage);
      }
    };

    runProcess();

    // Cleanup function
    return () => {
      isCancelled = true;
      if (stepInterval) {
        clearInterval(stepInterval);
      }
    };
  }, [content, sourceType, currentSubject, specificInstructions, forceGenerate, retryCount, navigate, addNotification, t]);

  // Réessayer en cas d'erreur
  const handleRetry = () => {
    setError(null);
    setCurrentStep(0);
    setForceGenerate(false);
    setShowVerificationModal(false);
    setVerificationResult(null);
    setRetryCount(prev => prev + 1);
  };

  // Retourner à l'import
  const handleBack = () => {
    navigate('/import');
  };

  // Handlers pour le modal de verification
  const handleChangeSubject = () => {
    // Retourner a l'import pour changer de matiere
    navigate('/import', { state: { content, sourceType, specificInstructions } });
  };

  const handleForceGenerate = () => {
    // Forcer la generation malgre le mismatch
    setShowVerificationModal(false);
    setForceGenerate(true);
    setStatus('processing');
  };

  const handleUseDetectedSubject = () => {
    // Utiliser la matiere detectee par l'IA
    if (verificationResult?.matiere_detectee_id) {
      setCurrentSubject(verificationResult.matiere_detectee_id);
    }
    setShowVerificationModal(false);
    setForceGenerate(true);
    setStatus('processing');
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
          {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold text-text-main">
          {status === 'success' ? t('process.done') : status === 'verifying' ? t('process.verifying') : t('process.processing')}
        </h1>
        <p className="text-text-muted">
          {status === 'success'
            ? t('process.summaryReady')
            : status === 'verifying'
              ? t('process.verifyingSubject')
              : isMockMode()
                ? t('process.demoMode')
                : t('process.aiGenerating')}
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
              {status === 'verifying' && (
                <motion.div
                  key="verifying"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="text-center"
                >
                  <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                </motion.div>
              )}
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
                {t('common.retry')}
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
              <p className="text-text-muted text-sm mb-2">{t('process.summaryCreated')}</p>
              <p className="text-text-main font-medium">{generatedData.title}</p>
              <p className="text-text-muted text-xs mt-4">
                {t('process.autoRedirect')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      {isMockMode() && status === 'processing' && (
        <div className="mt-8 text-center">
          <p className="text-xs text-text-muted">
            {t('process.demoModeActive')}
          </p>
        </div>
      )}

      {/* Modal de verification de matiere */}
      <AnimatePresence>
        {showVerificationModal && verificationResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl p-6 max-w-sm w-full"
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-text-main text-center mb-2">
                {t('process.subjectMismatch.title')}
              </h3>

              {/* Message */}
              <p className="text-text-muted text-sm text-center mb-4">
                {t('process.subjectMismatch.message', {
                  detected: verificationResult.matiere_detectee || t('process.subjectMismatch.unknown'),
                  confidence: t(`process.subjectMismatch.confidence.${verificationResult.confiance}`)
                })}
              </p>

              {/* Detected subject info */}
              {verificationResult.matiere_detectee && (
                <div className="bg-background/50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-text-muted mb-1">{t('process.subjectMismatch.detectedSubject')}</p>
                  <p className="text-text-main font-medium">{verificationResult.matiere_detectee}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="space-y-2">
                {/* Use detected subject (if available) */}
                {verificationResult.matiere_detectee_id && (
                  <button
                    onClick={handleUseDetectedSubject}
                    className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
                  >
                    {t('process.subjectMismatch.useDetected', { subject: verificationResult.matiere_detectee })}
                  </button>
                )}

                {/* Force continue */}
                <button
                  onClick={handleForceGenerate}
                  className="w-full py-3 bg-surface border border-white/10 text-text-main rounded-xl font-medium hover:bg-white/5 transition-colors"
                >
                  {t('process.subjectMismatch.continueAnyway')}
                </button>

                {/* Go back to import */}
                <button
                  onClick={handleChangeSubject}
                  className="w-full py-3 text-text-muted hover:text-text-main transition-colors text-sm"
                >
                  {t('process.subjectMismatch.changeSubject')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Process;
