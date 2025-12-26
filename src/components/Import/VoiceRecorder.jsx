import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || '';

const VoiceRecorder = ({ onComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const { accessToken } = useAuth();

    // Formater le temps d'enregistrement
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Démarrer l'enregistrement
    const startRecording = async () => {
        setError(null);
        audioChunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
            });

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Arrêter le stream
                stream.getTracks().forEach(track => track.stop());

                // Traiter l'audio
                await processAudio();
            };

            // Démarrer l'enregistrement
            mediaRecorder.start(1000); // Collecter les données toutes les secondes
            setIsRecording(true);
            setRecordingTime(0);

            // Timer pour afficher la durée
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Erreur accès microphone:', err);
            if (err.name === 'NotAllowedError') {
                setError('Accès au microphone refusé. Veuillez autoriser l\'accès.');
            } else {
                setError('Impossible d\'accéder au microphone.');
            }
        }
    };

    // Arrêter l'enregistrement
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    // Traiter l'audio avec Whisper via le backend
    const processAudio = async () => {
        if (audioChunksRef.current.length === 0) {
            setError('Aucun audio enregistré.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Créer le blob audio
            const audioBlob = new Blob(audioChunksRef.current, {
                type: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
            });

            // Créer le FormData
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            // Envoyer au backend
            const response = await fetch(`${API_URL}/ai/transcribe`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Erreur lors de la transcription');
            }

            const data = await response.json();

            if (data.transcript && data.transcript.trim()) {
                onComplete(data.transcript.trim());
            } else {
                setError('Aucun texte n\'a pu être transcrit. Réessayez en parlant plus clairement.');
            }
        } catch (err) {
            console.error('Erreur transcription:', err);
            // Afficher plus de détails sur l'erreur
            if (err.message === 'Failed to fetch') {
                setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
            } else {
                setError(err.message || 'Erreur lors de la transcription.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // Toggle enregistrement
    const handleToggle = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

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

                {/* Animation de traitement */}
                {isProcessing && (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full"
                    />
                )}

                <button
                    onClick={handleToggle}
                    disabled={isProcessing}
                    className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 ${
                        isRecording
                            ? 'bg-error shadow-lg shadow-error/30'
                            : isProcessing
                                ? 'bg-surface'
                                : 'bg-primary shadow-lg shadow-primary/30 hover:bg-primary-dark'
                    }`}
                >
                    {isProcessing ? (
                        <Loader2 size={32} className="text-primary animate-spin" />
                    ) : isRecording ? (
                        <Square size={32} className="text-white fill-current" />
                    ) : (
                        <Mic size={32} className="text-white" />
                    )}
                </button>
            </div>

            {/* Instructions et statut */}
            <div className="text-center space-y-2 min-h-[100px]">
                <h3 className="text-xl font-medium text-text-main">
                    {isProcessing
                        ? "Transcription en cours..."
                        : isRecording
                            ? "J'écoute..."
                            : "Appuie pour parler"
                    }
                </h3>

                {/* Temps d'enregistrement */}
                {isRecording && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-2xl font-mono text-primary"
                    >
                        {formatTime(recordingTime)}
                    </motion.p>
                )}

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

                {/* Indicateur de traitement */}
                {isProcessing && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-text-muted text-sm"
                    >
                        Envoi à l'IA pour transcription...
                    </motion.p>
                )}
            </div>

            {/* Instructions supplémentaires */}
            <p className="text-text-muted text-xs text-center max-w-[250px]">
                {isProcessing
                    ? "La transcription peut prendre quelques secondes"
                    : isRecording
                        ? "Appuie sur le bouton rouge pour terminer"
                        : "Dicte ton cours et il sera retranscrit par l'IA"
                }
            </p>
        </div>
    );
};

export default VoiceRecorder;
