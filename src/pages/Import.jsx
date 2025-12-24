import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Type, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceRecorder from '../components/Import/VoiceRecorder';

const Import = () => {
    const [mode, setMode] = useState('text'); // 'text' or 'voice'
    const [text, setText] = useState('');
    const navigate = useNavigate();

    const handleVoiceComplete = (transcript) => {
        setText(prev => prev + (prev ? " " : "") + transcript);
        setMode('text'); // Switch back to text to review/edit
    };

    const handleAnalyze = () => {
        if (!text.trim()) return;
        // Simulate processing
        navigate('/summary', { state: { content: text } });
    };

    return (
        <div className="h-full flex flex-col p-6 pt-8">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-text-main">Nouveau Contenu</h1>
                <p className="text-text-muted">Que veux-tu apprendre aujourd'hui ?</p>
            </header>

            {/* Mode Switcher */}
            <div className="flex p-1 bg-surface rounded-xl mb-6">
                <button
                    onClick={() => setMode('text')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${mode === 'text' ? 'bg-background text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                >
                    <Type size={18} />
                    Texte
                </button>
                <button
                    onClick={() => setMode('voice')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${mode === 'voice' ? 'bg-background text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                >
                    <Mic size={18} />
                    Vocal
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative">
                {mode === 'text' ? (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="h-full flex flex-col"
                    >
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Colle ton texte ici ou explique ce que tu veux comprendre..."
                            className="flex-1 w-full bg-transparent text-text-main text-lg placeholder:text-text-muted/50 resize-none focus:outline-none"
                        />

                        {/* Floating Action Button */}
                        {text.trim().length > 0 && (
                            <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                onClick={handleAnalyze}
                                className="absolute bottom-4 right-0 bg-primary text-background font-bold py-3 px-6 rounded-full shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                Simplifier
                                <ArrowRight size={20} />
                            </motion.button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="h-full"
                    >
                        <VoiceRecorder onComplete={handleVoiceComplete} />
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Import;
