import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';

const VoiceDictation = ({ onTranscript, disabled = false }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef(null);
    const shouldRestartRef = useRef(false); // Pour redémarrer auto si arrêt involontaire
    const isStoppingRef = useRef(false); // Pour savoir si l'arrêt est volontaire
    const onTranscriptRef = useRef(onTranscript); // Ref pour éviter la réinitialisation

    // Mettre à jour le ref quand le callback change (sans réinitialiser la reconnaissance)
    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    useEffect(() => {
        // Vérifier le support de l'API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        // Créer l'instance
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'fr-FR';

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Envoyer le texte final au parent via le ref
            if (finalTranscript && onTranscriptRef.current) {
                onTranscriptRef.current(finalTranscript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            // Ne pas arrêter si c'est juste une erreur "no-speech"
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                shouldRestartRef.current = false;
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            // Redémarrer automatiquement si l'arrêt n'était pas volontaire
            if (shouldRestartRef.current && !isStoppingRef.current) {
                try {
                    recognition.start();
                } catch (err) {
                    console.error('Failed to restart recognition:', err);
                    setIsListening(false);
                    shouldRestartRef.current = false;
                }
            } else {
                setIsListening(false);
                shouldRestartRef.current = false;
            }
            isStoppingRef.current = false;
        };

        recognitionRef.current = recognition;

        return () => {
            shouldRestartRef.current = false;
            isStoppingRef.current = true;
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []); // Pas de dépendance - la reconnaissance n'est créée qu'une fois

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            // Arrêt volontaire
            isStoppingRef.current = true;
            shouldRestartRef.current = false;
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                // Démarrer avec redémarrage auto activé
                shouldRestartRef.current = true;
                isStoppingRef.current = false;
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                console.error('Failed to start recognition:', err);
                shouldRestartRef.current = false;
            }
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
