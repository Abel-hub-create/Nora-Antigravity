import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Camera, ArrowRight, X, ChevronRight, BookOpen, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VoiceRecorder from '../components/Import/VoiceRecorder';
import PhotoCapture from '../components/Import/PhotoCapture';

const DEFINITIONS_WARNING_KEY = 'nora_hide_definitions_warning';

// Liste des matières disponibles
const SUBJECTS = [
    { id: 'mathematics', icon: '📐' },
    { id: 'french', icon: '📚' },
    { id: 'physics', icon: '⚡' },
    { id: 'chemistry', icon: '🧪' },
    { id: 'biology', icon: '🧬' },
    { id: 'history', icon: '🏛️' },
    { id: 'geography', icon: '🌍' },
    { id: 'english', icon: '🇬🇧' },
    { id: 'dutch', icon: '🇳🇱' }
];

const Import = () => {
    const { t } = useTranslation();
    const [mode, setMode] = useState('voice'); // 'voice' or 'photo'
    const [showPhotoCapture, setShowPhotoCapture] = useState(false);
    const navigate = useNavigate();

    // État pour la sélection de matière
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [showSubjectSelection, setShowSubjectSelection] = useState(true);

    // État pour l'écran intermédiaire (instructions spécifiques)
    const [capturedContent, setCapturedContent] = useState(null);
    const [capturedSourceType, setCapturedSourceType] = useState(null);
    const [showSpecificPrompt, setShowSpecificPrompt] = useState(false);
    const [wantsSpecific, setWantsSpecific] = useState(null); // null, true, false
    const [definitionsToInclude, setDefinitionsToInclude] = useState('');
    const [examObjectives, setExamObjectives] = useState('');

    // État pour le message d'avertissement des définitions
    const [showDefinitionsWarning, setShowDefinitionsWarning] = useState(false);
    const [dontShowWarningAgain, setDontShowWarningAgain] = useState(false);
    const [hideWarningPermanently, setHideWarningPermanently] = useState(false);

    // Charger la préférence "ne plus afficher" au montage
    useEffect(() => {
        const hidden = localStorage.getItem(DEFINITIONS_WARNING_KEY) === 'true';
        setHideWarningPermanently(hidden);
    }, []);

    // Sélectionner une matière et passer à l'import
    const handleSelectSubject = (subjectId) => {
        setSelectedSubject(subjectId);
        setShowSubjectSelection(false);
    };

    // Retour à la sélection de matière
    const handleBackToSubjects = () => {
        setShowSubjectSelection(true);
        setSelectedSubject(null);
    };

    // Gestion de la complétion vocale
    const handleVoiceComplete = (transcript) => {
        if (transcript.trim()) {
            // Stocker le contenu et afficher l'écran intermédiaire
            setCapturedContent(transcript);
            setCapturedSourceType('voice');
            setShowSpecificPrompt(true);
        }
    };

    // Gestion de la complétion photo (OCR)
    const handlePhotoComplete = (extractedText) => {
        setShowPhotoCapture(false);
        if (extractedText.trim()) {
            // Stocker le contenu et afficher l'écran intermédiaire
            setCapturedContent(extractedText);
            setCapturedSourceType('photo');
            setShowSpecificPrompt(true);
        }
    };

    // Continuer vers la génération
    const handleContinueToProcess = () => {
        // Construire les instructions structurées
        let instructions = null;
        if (wantsSpecific) {
            const parts = [];
            if (definitionsToInclude.trim()) {
                parts.push(`DEFINITIONS A INCLURE ABSOLUMENT:\n${definitionsToInclude.trim()}`);
            }
            if (examObjectives.trim()) {
                parts.push(`OBJECTIFS DE L'INTERROGATION:\n${examObjectives.trim()}`);
            }
            if (parts.length > 0) {
                instructions = parts.join('\n\n');
            }
        }

        navigate('/process', {
            state: {
                content: capturedContent,
                sourceType: capturedSourceType,
                subject: selectedSubject,
                specificInstructions: instructions
            }
        });
    };

    // Annuler et revenir
    const handleCancelSpecific = () => {
        setShowSpecificPrompt(false);
        setCapturedContent(null);
        setCapturedSourceType(null);
        setWantsSpecific(null);
        setDefinitionsToInclude('');
        setExamObjectives('');
    };

    // Ouvrir le mode photo
    const handlePhotoMode = () => {
        setShowPhotoCapture(true);
    };

    // Écran de sélection de matière
    if (showSubjectSelection) {
        return (
            <div className="h-full flex flex-col p-6 pt-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-text-main">{t('import.title')}</h1>
                    <p className="text-text-muted">{t('import.selectSubject')}</p>
                </header>

                <div className="flex-1 overflow-auto pb-24">
                    <div className="grid grid-cols-2 gap-3">
                        {SUBJECTS.map((subject, index) => (
                            <motion.button
                                key={subject.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleSelectSubject(subject.id)}
                                className="bg-surface border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-surface/80 active:scale-95 transition-all text-left"
                            >
                                <span className="text-2xl">{subject.icon}</span>
                                <span className="font-medium text-text-main flex-1">
                                    {t(`subjects.${subject.id}`)}
                                </span>
                                <ChevronRight size={18} className="text-text-muted" />
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="h-full flex flex-col p-6 pt-8">
                <header className="mb-6">
                    {/* Bouton retour + Matière sélectionnée */}
                    <button
                        onClick={handleBackToSubjects}
                        className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors mb-3"
                    >
                        <X size={18} />
                        <span className="text-sm">{t('import.changeSubject')}</span>
                    </button>

                    <h1 className="text-2xl font-bold text-text-main">{t('import.title')}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg">
                            {SUBJECTS.find(s => s.id === selectedSubject)?.icon}
                        </span>
                        <span className="text-primary font-medium">
                            {t(`subjects.${selectedSubject}`)}
                        </span>
                    </div>
                </header>

                {/* Mode Switcher - 2 options */}
                <div className="flex p-1 bg-surface rounded-xl mb-6">
                    <button
                        onClick={() => setMode('voice')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                            mode === 'voice'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-text-muted hover:text-text-main'
                        }`}
                    >
                        <Mic size={18} />
                        {t('import.voice')}
                    </button>
                    <button
                        onClick={handlePhotoMode}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                            mode === 'photo'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-text-muted hover:text-text-main'
                        }`}
                    >
                        <Camera size={18} />
                        {t('import.photo')}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative">
                    <AnimatePresence mode="wait">
                        {mode === 'voice' && (
                            <motion.div
                                key="voice"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full"
                            >
                                <VoiceRecorder onComplete={handleVoiceComplete} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Photo Capture Modal */}
            <AnimatePresence>
                {showPhotoCapture && (
                    <PhotoCapture
                        onComplete={handlePhotoComplete}
                        onClose={() => setShowPhotoCapture(false)}
                    />
                )}
            </AnimatePresence>

            {/* Écran intermédiaire - Instructions spécifiques */}
            <AnimatePresence>
                {showSpecificPrompt && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 flex items-center justify-between border-b border-white/10">
                            <button
                                onClick={handleCancelSpecific}
                                className="p-2 text-text-muted hover:text-text-main transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <h2 className="text-lg font-semibold text-text-main">
                                {t('import.specificPrompt.title')}
                            </h2>
                            <div className="w-10" /> {/* Spacer */}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 pb-6 flex flex-col overflow-auto">
                            <p className="text-text-main text-center mb-6 shrink-0">
                                {t('import.specificPrompt.question')}
                            </p>

                            {/* Boutons Oui/Non */}
                            {wantsSpecific === null && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-4 justify-center"
                                >
                                    <button
                                        onClick={() => {
                                            setWantsSpecific(false);
                                            // Si l'avertissement est masqué, continuer directement
                                            if (hideWarningPermanently) {
                                                navigate('/process', {
                                                    state: {
                                                        content: capturedContent,
                                                        sourceType: capturedSourceType,
                                                        subject: selectedSubject,
                                                        specificInstructions: null
                                                    }
                                                });
                                            } else {
                                                // Sinon, afficher l'avertissement
                                                setShowDefinitionsWarning(true);
                                            }
                                        }}
                                        className="px-8 py-3 bg-surface text-text-main rounded-xl font-medium hover:bg-surface/80 transition-colors"
                                    >
                                        {t('import.specificPrompt.no')}
                                    </button>
                                    <button
                                        onClick={() => setWantsSpecific(true)}
                                        className="px-8 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
                                    >
                                        {t('import.specificPrompt.yes')}
                                    </button>
                                </motion.div>
                            )}

                            {/* Deux sections si Oui */}
                            {wantsSpecific === true && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col gap-4 flex-1"
                                >
                                    {/* Section Définitions */}
                                    <div className="shrink-0">
                                        <label className="text-text-main font-medium text-sm mb-1 block">
                                            {t('import.specificPrompt.definitionsLabel')}
                                        </label>
                                        <p className="text-text-muted text-xs mb-2">
                                            {t('import.specificPrompt.definitionsHint')}
                                        </p>
                                        <textarea
                                            value={definitionsToInclude}
                                            onChange={(e) => setDefinitionsToInclude(e.target.value)}
                                            placeholder={t('import.specificPrompt.definitionsPlaceholder')}
                                            className="w-full h-24 bg-surface text-text-main rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted/50 text-sm"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Section Objectifs */}
                                    <div className="shrink-0">
                                        <label className="text-text-main font-medium text-sm mb-1 block">
                                            {t('import.specificPrompt.objectivesLabel')}
                                        </label>
                                        <p className="text-text-muted text-xs mb-2">
                                            {t('import.specificPrompt.objectivesHint')}
                                        </p>
                                        <textarea
                                            value={examObjectives}
                                            onChange={(e) => setExamObjectives(e.target.value)}
                                            placeholder={t('import.specificPrompt.objectivesPlaceholder')}
                                            className="w-full h-24 bg-surface text-text-main rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted/50 text-sm"
                                        />
                                    </div>

                                    <button
                                        onClick={handleContinueToProcess}
                                        className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shrink-0 mt-auto"
                                    >
                                        {t('import.specificPrompt.continue')}
                                        <ArrowRight size={20} />
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal d'avertissement pour les définitions */}
            <AnimatePresence>
                {showDefinitionsWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface rounded-2xl p-6 max-w-sm w-full"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                                    <AlertTriangle size={20} className="text-amber-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-text-main">
                                    {t('common.warning')}
                                </h3>
                            </div>

                            <p className="text-text-muted mb-6">
                                {t('import.specificPrompt.definitionsWarning')}
                            </p>

                            {/* Checkbox "Ne plus afficher" */}
                            <label className="flex items-center gap-3 mb-6 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={dontShowWarningAgain}
                                    onChange={(e) => setDontShowWarningAgain(e.target.checked)}
                                    className="w-5 h-5 text-primary bg-background border-white/20 rounded focus:ring-primary focus:ring-2"
                                />
                                <span className="text-sm text-text-muted">
                                    {t('import.specificPrompt.dontShowAgain')}
                                </span>
                            </label>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDefinitionsWarning(false);
                                        setWantsSpecific(null);
                                        setDontShowWarningAgain(false);
                                    }}
                                    className="flex-1 py-3 bg-background text-text-main rounded-xl font-medium hover:bg-background/80 transition-colors"
                                >
                                    {t('common.back')}
                                </button>
                                <button
                                    onClick={() => {
                                        // Sauvegarder la préférence si cochée
                                        if (dontShowWarningAgain) {
                                            localStorage.setItem(DEFINITIONS_WARNING_KEY, 'true');
                                            setHideWarningPermanently(true);
                                        }
                                        // Continuer vers la génération
                                        navigate('/process', {
                                            state: {
                                                content: capturedContent,
                                                sourceType: capturedSourceType,
                                                subject: selectedSubject,
                                                specificInstructions: null
                                            }
                                        });
                                    }}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
                                >
                                    {t('import.specificPrompt.understood')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Import;
