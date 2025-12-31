import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceRecorder from '../components/Import/VoiceRecorder';
import PhotoCapture from '../components/Import/PhotoCapture';

const Import = () => {
    const [mode, setMode] = useState('voice'); // 'voice' or 'photo'
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

    // Ouvrir le mode photo
    const handlePhotoMode = () => {
        setShowPhotoCapture(true);
    };

    return (
        <>
            <div className="h-full flex flex-col p-6 pt-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-text-main">Nouvel Import</h1>
                    <p className="text-text-muted">Que veux-tu apprendre aujourd'hui ?</p>
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
