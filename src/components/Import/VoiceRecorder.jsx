import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Check } from 'lucide-react';

const VoiceRecorder = ({ onComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");

    useEffect(() => {
        let interval;
        if (isRecording) {
            const phrases = [
                "So, basically...",
                " photosynthesis is the process...",
                " where plants use sunlight...",
                " to synthesize foods...",
                " from carbon dioxide and water."
            ];
            let i = 0;
            interval = setInterval(() => {
                if (i < phrases.length) {
                    setTranscript(prev => prev + phrases[i]);
                    i++;
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const handleToggle = () => {
        if (isRecording) {
            setIsRecording(false);
            setTimeout(() => onComplete(transcript), 500);
        } else {
            setIsRecording(true);
            setTranscript("");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full space-y-8">
            <div className="relative">
                {/* Ripple Animation */}
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
                    className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-error shadow-lg shadow-error/30' : 'bg-primary shadow-lg shadow-primary/30'}`}
                >
                    {isRecording ? <Square size={32} className="text-white fill-current" /> : <Mic size={32} className="text-white" />}
                </button>
            </div>

            <div className="text-center space-y-2 h-24">
                <h3 className="text-xl font-medium text-text-main">
                    {isRecording ? "J'écoute..." : "Appuie pour parler"}
                </h3>
                <AnimatePresence>
                    {transcript && (
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-text-muted text-sm max-w-[250px] mx-auto"
                        >
                            "{transcript}"
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default VoiceRecorder;
