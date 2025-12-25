import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Type, Camera, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceRecorder from '../components/Import/VoiceRecorder';
import PhotoCapture from '../components/Import/PhotoCapture';

const Import = () => {
    const [mode, setMode] = useState('text'); // 'text', 'voice', or 'photo'
    const [text, setText] = useState('');
    const [showPhotoCapture, setShowPhotoCapture] = useState(false);
    const navigate = useNavigate();

    // Gestion de la complétion vocale
    const handleVoiceComplete = (transcript) => {
        if (transcript.trim()) {
            navigate('/process', {
                state: {
                    content: transcript,
                    sourceType: 'voice'
                }
            });
        }
    };

    // Gestion de la complétion photo (OCR)
    const handlePhotoComplete = (extractedText) => {
        setShowPhotoCapture(false);
        if (extractedText.trim()) {
            navigate('/process', {
                state: {
                    content: extractedText,
                    sourceType: 'photo'
                }
            });
        }
    };

    // Soumettre le texte pour traitement
    const handleAnalyze = () => {
        if (!text.trim()) return;
        navigate('/process', {
            state: {
                content: text,
                sourceType: 'text'
            }
        });
    };

    // Ouvrir le mode photo
    const handlePhotoMode = () => {
        setShowPhotoCapture(true);
    };

    return (
        <>
            <div className="h-full flex flex-col p-6 pt-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-text-main">Nouveau Contenu</h1>
                    <p className="text-text-muted">Que veux-tu apprendre aujourd'hui ?</p>
                </header>

                {/* Mode Switcher - 3 options */}
                <div className="flex p-1 bg-surface rounded-xl mb-6">
                    <button
                        onClick={() => setMode('text')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                            mode === 'text'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-text-muted hover:text-text-main'
                        }`}
                    >
                        <Type size={18} />
                        Texte
                    </button>
                    <button
                        onClick={() => setMode('voice')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                            mode === 'voice'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-text-muted hover:text-text-main'
                        }`}
                    >
                        <Mic size={18} />
                        Vocal
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
                        Photo
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative">
                    <AnimatePresence mode="wait">
                        {mode === 'text' && (
                            <motion.div
                                key="text"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="h-full flex flex-col"
                            >
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Colle ton texte ici ou explique ce que tu veux comprendre..."
                                    className="flex-1 w-full bg-transparent text-text-main text-lg placeholder:text-text-muted/50 resize-none focus:outline-none"
                                />

                                {/* Floating Action Button */}
                                <AnimatePresence>
                                    {text.trim().length > 0 && (
                                        <motion.button
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleAnalyze}
                                            className="absolute bottom-4 right-0 bg-primary text-background font-bold py-3 px-6 rounded-full shadow-lg shadow-primary/20 flex items-center gap-2"
                                        >
                                            Simplifier
                                            <ArrowRight size={20} />
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

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
        </>
    );
};

export default Import;
