import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';

const VoiceDictation = ({ onTranscript, disabled = false }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef(null);
    const onTranscriptRef = useRef(onTranscript);
    const isStoppingRef = useRef(false); // true = arrêt volontaire, pas d'auto-restart

    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
        }
    }, []);

    const startNewSession = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // Nouvelle instance à chaque session = pas d'état résiduel / replay
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'fr-FR';

        // Variable locale à la session : repart de -1, immune aux bugs de resultIndex
        let lastProcessedIndex = -1;

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal && i > lastProcessedIndex) {
                    lastProcessedIndex = i;
                    const text = event.results[i][0].transcript.trim();
                    if (text && onTranscriptRef.current) {
                        onTranscriptRef.current(text);
                    }
                }
            }
        };

        recognition.onerror = (event) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                isStoppingRef.current = true;
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            // Auto-restart si l'arrêt n'est pas volontaire
            if (!isStoppingRef.current) {
                setTimeout(() => {
                    if (!isStoppingRef.current) {
                        startNewSession();
                    }
                }, 200);
            } else {
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (err) {
            console.error('Failed to start recognition:', err);
            setIsListening(false);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            isStoppingRef.current = true;
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
        } else {
            isStoppingRef.current = false;
            setIsListening(true);
            startNewSession();
        }
    };

    if (!isSupported) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            className={`p-2 rounded-lg transition-all ${
                isListening
                    ? 'bg-error text-white'
                    : 'bg-primary/20 text-primary hover:bg-primary/30'
            } disabled:opacity-50`}
            title={isListening ? 'Arrêter la dictée' : 'Dicter'}
        >
            <div className="relative">
                {isListening && (
                    <motion.div
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="absolute inset-0 bg-error rounded-full"
                    />
                )}
                {isListening ? (
                    <MicOff size={18} className="relative z-10" />
                ) : (
                    <Mic size={18} />
                )}
            </div>
        </button>
    );
};

export default VoiceDictation;
