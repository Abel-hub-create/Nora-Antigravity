import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, ChevronRight, AlertTriangle, Camera, Image } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PhotoCapture from '../components/Import/PhotoCapture';
import VoiceDictation from '../components/Import/VoiceDictation';

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
    const [showPhotoCapture, setShowPhotoCapture] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // État pour la sélection de matière
    const [selectedSubject, setSelectedSubject] = useState(null);

    // État pour l'écran intermédiaire (instructions spécifiques)
    const [capturedContent, setCapturedContent] = useState(null);
    const [capturedSourceType, setCapturedSourceType] = useState(null);
    const [showSpecificPrompt, setShowSpecificPrompt] = useState(false);
    const [wantsSpecific, setWantsSpecific] = useState(null); // null, true, false
    const [definitionsToInclude, setDefinitionsToInclude] = useState('');
    const [examObjectives, setExamObjectives] = useState('');
    const defNewLineRef = useRef(false); // flag : prochain ajout définition = nouvelle ligne
    const objNewLineRef = useRef(false); // flag : prochain ajout objectif = nouvelle ligne

    const NEW_LINE_REGEX = /[aà][h]?\s*la\s*lignes?/gi;

    const addVoiceEntry = (setter, newLineRef, text) => {
        const hasNewLine = NEW_LINE_REGEX.test(text);
        NEW_LINE_REGEX.lastIndex = 0; // reset après .test()

        if (hasNewLine) {
            // Séparer sur "à la ligne"
            const parts = text.split(NEW_LINE_REGEX);
            parts.forEach((part, idx) => {
                const trimmed = part.trim();
                if (trimmed) {
                    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                    const forceNew = idx > 0 || newLineRef.current;
                    setter(prev => prev + (prev && forceNew ? '\n- ' : prev ? '\n- ' : '- ') + formatted);
                    newLineRef.current = false;
                }
            });
            // Si "à la ligne" était à la fin (dernière part vide), préparer la prochaine
            const lastPart = parts[parts.length - 1].trim();
            if (!lastPart) newLineRef.current = true;
        } else {
            const trimmed = text.trim();
            if (!trimmed) return;
            const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
            setter(prev => prev + (prev ? '\n- ' : '- ') + formatted);
            newLineRef.current = false;
        }
    };

    // État pour le message d'avertissement des définitions
    const [showDefinitionsWarning, setShowDefinitionsWarning] = useState(false);
    const [dontShowWarningAgain, setDontShowWarningAgain] = useState(false);
    const [hideWarningPermanently, setHideWarningPermanently] = useState(false);

    // Charger la préférence "ne plus afficher" au montage + restaurer brouillon si retour depuis Process
    useEffect(() => {
        const hidden = localStorage.getItem(DEFINITIONS_WARNING_KEY) === 'true';
        setHideWarningPermanently(hidden);

        if (location.state?.isDraft) {
            try {
                const draft = JSON.parse(localStorage.getItem('nora_process_draft') || 'null');
                if (draft?.content) {
                    setCapturedContent(draft.content);
                    setCapturedSourceType(draft.sourceType || 'photo');
                    setSelectedSubject(draft.subject || null);
                    setDefinitionsToInclude(draft.definitionsToInclude || '');
                    setExamObjectives(draft.examObjectives || '');
                    setWantsSpecific(draft.wantsSpecific ?? null);
                    setShowSpecificPrompt(true);
                }
            } catch (_) {}
        }
    }, []); // eslint-disable-line

    // Sélectionner une matière → ouvrir directement la caméra
    const handleSelectSubject = (subjectId) => {
        setSelectedSubject(subjectId);
        setShowPhotoCapture(true);
    };

    // Fermeture de la caméra → retour à la sélection de matière
    const handlePhotoCaptureClose = () => {
        setShowPhotoCapture(false);
        setSelectedSubject(null);
    };

    // Gestion de la complétion photo (OCR)
    const handlePhotoComplete = (extractedText) => {
        setShowPhotoCapture(false);
        if (extractedText.trim()) {
            setCapturedContent(extractedText);
            setCapturedSourceType('photo');
            setShowSpecificPrompt(true);
        }
    };

    // Continuer vers la génération
    const handleContinueToProcess = () => {
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

        // Sauvegarder le brouillon pour récupération en cas d'échec
        localStorage.setItem('nora_process_draft', JSON.stringify({
            content: capturedContent,
            sourceType: capturedSourceType,
            subject: selectedSubject,
            definitionsToInclude,
            examObjectives,
            wantsSpecific
        }));

        navigate('/process', {
            state: {
                content: capturedContent,
                sourceType: capturedSourceType,
                subject: selectedSubject,
                specificInstructions: instructions
            }
        });
    };

    // Annuler les instructions spécifiques → retour à la sélection de matière
    const handleCancelSpecific = () => {
        setShowSpecificPrompt(false);
        setCapturedContent(null);
        setCapturedSourceType(null);
        setWantsSpecific(null);
        setDefinitionsToInclude('');
        setExamObjectives('');
        defNewLineRef.current = false;
        objNewLineRef.current = false;
        setSelectedSubject(null);
    };

    return (
        <>
            {/* Écran de sélection de matière */}
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
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.04 }}
                                onClick={() => handleSelectSubject(subject.id)}
                                className="bg-surface border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-surface/80 active:scale-95 transition-all text-left overflow-hidden no-hover"
                            >
                                <span className="text-2xl shrink-0">{subject.icon}</span>
                                <span className="font-medium text-text-main flex-1 truncate text-sm">
                                    {t(`subjects.${subject.id}`)}
                                </span>
                                <Camera size={16} className="text-text-muted shrink-0" />
                            </motion.button>
                        ))}
                    </div>

                    {/* Indication subtile */}
                    <p className="text-text-muted/60 text-xs text-center mt-4">
                        {t('import.subjectHint')}
                    </p>
                </div>
            </div>

            {/* Photo Capture Modal - s'ouvre directement après sélection matière */}
            <AnimatePresence>
                {showPhotoCapture && (
                    <PhotoCapture
                        onComplete={handlePhotoComplete}
                        onClose={handlePhotoCaptureClose}
                        subjectLabel={selectedSubject ? `${SUBJECTS.find(s => s.id === selectedSubject)?.icon} ${t(`subjects.${selectedSubject}`)}` : null}
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
                        className="fixed inset-0 bg-background z-[60] flex flex-col"
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
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 p-4 overflow-auto">
                                <p className="text-text-main text-center mb-6">
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
                                        className="flex flex-col gap-4"
                                    >
                                        {/* Section Définitions */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-text-main font-medium text-sm">
                                                    {t('import.specificPrompt.definitionsLabel')}
                                                </label>
                                                <VoiceDictation
                                                    onTranscript={(text) => addVoiceEntry(setDefinitionsToInclude, defNewLineRef, text)}
                                                />
                                            </div>
                                            <p className="text-text-muted text-xs mb-2">
                                                {t('import.specificPrompt.definitionsHint')}
                                            </p>
                                            <textarea
                                                value={definitionsToInclude}
                                                onChange={(e) => setDefinitionsToInclude(e.target.value)}
                                                placeholder={t('import.specificPrompt.definitionsPlaceholder')}
                                                className="w-full h-20 md:h-40 bg-surface text-text-main rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted/50 text-sm"
                                                autoFocus
                                            />
                                        </div>

                                        {/* Section Objectifs */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-text-main font-medium text-sm">
                                                    {t('import.specificPrompt.objectivesLabel')}
                                                </label>
                                                <VoiceDictation
                                                    onTranscript={(text) => addVoiceEntry(setExamObjectives, objNewLineRef, text)}
                                                />
                                            </div>
                                            <p className="text-text-muted text-xs mb-2">
                                                {t('import.specificPrompt.objectivesHint')}
                                            </p>
                                            <textarea
                                                value={examObjectives}
                                                onChange={(e) => setExamObjectives(e.target.value)}
                                                placeholder={t('import.specificPrompt.objectivesPlaceholder')}
                                                className="w-full h-20 md:h-40 bg-surface text-text-main rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted/50 text-sm"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Bouton Continuer - toujours visible en bas */}
                            {wantsSpecific === true && (
                                <div className="p-4 border-t border-white/10 bg-background">
                                    <button
                                        onClick={handleContinueToProcess}
                                        className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                                    >
                                        {t('import.specificPrompt.continue')}
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
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
