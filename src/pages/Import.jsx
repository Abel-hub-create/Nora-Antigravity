import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Camera, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VoiceRecorder from '../components/Import/VoiceRecorder';
import PhotoCapture from '../components/Import/PhotoCapture';

const Import = () => {
    const { t } = useTranslation();
    const [mode, setMode] = useState('voice'); // 'voice' or 'photo'
    const [showPhotoCapture, setShowPhotoCapture] = useState(false);
    const navigate = useNavigate();

    // État pour l'écran intermédiaire (instructions spécifiques)
    const [capturedContent, setCapturedContent] = useState(null);
    const [capturedSourceType, setCapturedSourceType] = useState(null);
    const [showSpecificPrompt, setShowSpecificPrompt] = useState(false);
    const [wantsSpecific, setWantsSpecific] = useState(null); // null, true, false
    const [specificInstructions, setSpecificInstructions] = useState('');

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
        navigate('/process', {
            state: {
                content: capturedContent,
                sourceType: capturedSourceType,
                specificInstructions: wantsSpecific ? specificInstructions.trim() : null
            }
        });
    };

    // Annuler et revenir
    const handleCancelSpecific = () => {
        setShowSpecificPrompt(false);
        setCapturedContent(null);
        setCapturedSourceType(null);
        setWantsSpecific(null);
        setSpecificInstructions('');
    };

    // Ouvrir le mode photo
    const handlePhotoMode = () => {
        setShowPhotoCapture(true);
    };

    return (
        <>
            <div className="h-full flex flex-col p-6 pt-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-text-main">{t('import.title')}</h1>
                    <p className="text-text-muted">{t('import.subtitle')}</p>
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
                        <div className="flex-1 p-6 flex flex-col">
                            <p className="text-text-main text-center mb-8">
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
                                            // Si non, continuer directement
                                            navigate('/process', {
                                                state: {
                                                    content: capturedContent,
                                                    sourceType: capturedSourceType,
                                                    specificInstructions: null
                                                }
                                            });
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

                            {/* Champ de texte si Oui */}
                            {wantsSpecific === true && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col"
                                >
                                    <label className="text-text-muted text-sm mb-2">
                                        {t('import.specificPrompt.instructionsLabel')}
                                    </label>
                                    <textarea
                                        value={specificInstructions}
                                        onChange={(e) => setSpecificInstructions(e.target.value)}
                                        placeholder={t('import.specificPrompt.instructionsPlaceholder')}
                                        className="h-48 bg-surface text-text-main rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted/50"
                                        autoFocus
                                    />

                                    <button
                                        onClick={handleContinueToProcess}
                                        className="mt-5 w-full py-4 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
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
        </>
    );
};

export default Import;
