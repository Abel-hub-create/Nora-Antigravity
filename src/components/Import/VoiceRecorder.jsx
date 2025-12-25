import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, AlertCircle } from 'lucide-react';

const VoiceRecorder = ({ onComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');

    // Initialiser la reconnaissance vocale
    useEffect(() => {
        // Vérifier le support du navigateur
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            setError('La reconnaissance vocale n\'est pas supportée par votre navigateur. Utilisez Chrome ou Edge.');
            return;
        }

        // Créer l'instance de reconnaissance
        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = true;
        recognition.interimResults = true;

        // Gestion des résultats
        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = finalTranscriptRef.current;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPart = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcriptPart + ' ';
                    finalTranscriptRef.current = finalTranscript;
                } else {
                    interimTranscript += transcriptPart;
                }
            }

            setTranscript(finalTranscript + interimTranscript);
        };

        // Gestion des erreurs
        recognition.onerror = (event) => {
            console.error('Erreur reconnaissance vocale:', event.error);

            switch (event.error) {
                case 'not-allowed':
                    setError('Accès au microphone refusé. Veuillez autoriser l\'accès.');
                    break;
                case 'no-speech':
                    // Pas d'erreur visible, juste pas de parole détectée
                    break;
                case 'network':
                    setError('Erreur réseau. Vérifiez votre connexion.');
                    break;
                default:
                    setError(`Erreur: ${event.error}`);
            }

            setIsRecording(false);
        };

        // Quand la reconnaissance s'arrête
        recognition.onend = () => {
            // Si on est encore en mode enregistrement, redémarrer (gestion du timeout auto)
            if (isRecording && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    // Ignorer si déjà démarré
                }
            }
        };

        recognitionRef.current = recognition;

        // Cleanup
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignorer
                }
            }
        };
    }, [isRecording]);

    // Démarrer/Arrêter l'enregistrement
    const handleToggle = async () => {
        setError(null);

        if (isRecording) {
            // Arrêter l'enregistrement
            setIsRecording(false);
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignorer
                }
            }

            // Envoyer le transcript final
            const finalText = finalTranscriptRef.current.trim() || transcript.trim();
            if (finalText) {
                setTimeout(() => onComplete(finalText), 500);
            }
        } else {
            // Demander la permission du microphone et démarrer
            try {
                // Demander l'accès au micro pour déclencher la popup de permission
                await navigator.mediaDevices.getUserMedia({ audio: true });

                // Réinitialiser
                setTranscript('');
                finalTranscriptRef.current = '';
                setIsRecording(true);

                // Démarrer la reconnaissance
                if (recognitionRef.current) {
                    recognitionRef.current.start();
                }
            } catch (err) {
                console.error('Erreur accès microphone:', err);
                setError('Impossible d\'accéder au microphone. Veuillez autoriser l\'accès.');
            }
        }
    };

    // Affichage si non supporté
    if (!isSupported) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-6 p-6">
                <div className="w-20 h-20 rounded-full bg-error/20 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-error" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-medium text-text-main mb-2">
                        Non supporté
                    </h3>
                    <p className="text-text-muted text-sm max-w-[280px]">
                        {error}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full space-y-8">
            {/* Bouton d'enregistrement avec animation */}
            <div className="relative">
                {/* Ripple Animation pendant l'enregistrement */}
                {isRecording && (
                    <>
                        <motion.div
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 bg-primary/30 rounded-full"
                        />
                        <motion.div
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                            className="absolute inset-0 bg-primary/30 rounded-full"
                        />
                    </>
                )}

                <button
                    onClick={handleToggle}
                    className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isRecording
                            ? 'bg-error shadow-lg shadow-error/30'
                            : 'bg-primary shadow-lg shadow-primary/30 hover:bg-primary-dark'
                    }`}
                >
                    {isRecording ? (
                        <Square size={32} className="text-white fill-current" />
                    ) : (
                        <Mic size={32} className="text-white" />
                    )}
                </button>
            </div>

            {/* Instructions et transcript */}
            <div className="text-center space-y-2 min-h-[100px]">
                <h3 className="text-xl font-medium text-text-main">
                    {isRecording ? "J'écoute..." : "Appuie pour parler"}
                </h3>

                {/* Erreur */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-2 text-error text-sm"
                        >
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Transcript en cours */}
                <AnimatePresence>
                    {transcript && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4"
                        >
                            <p className="text-text-muted text-sm max-w-[280px] mx-auto line-clamp-4">
                                "{transcript}"
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Indicateur d'enregistrement */}
                {isRecording && !transcript && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-primary text-sm"
                    >
                        Parlez maintenant...
                    </motion.p>
                )}
            </div>

            {/* Instructions supplémentaires */}
            <p className="text-text-muted text-xs text-center max-w-[250px]">
                {isRecording
                    ? "Appuie sur le bouton rouge pour terminer"
                    : "Dicte ton cours et il sera retranscrit automatiquement"
                }
            </p>
        </div>
    );
};

export default VoiceRecorder;
