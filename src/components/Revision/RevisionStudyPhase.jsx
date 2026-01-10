import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Layers, Brain, X, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useRevisionTimer from '../../hooks/useRevisionTimer';

const RevisionStudyPhase = ({ synthese, timeRemaining, onTimeUpdate, onComplete, onStop }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('summary');
    const [showGuide, setShowGuide] = useState(true);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);

    // Timer hook
    const { formattedTime, timeRemaining: currentTime } = useRevisionTimer(
        timeRemaining,
        onComplete,
        true
    );

    // Update parent with current time
    useEffect(() => {
        onTimeUpdate(currentTime);
    }, [currentTime, onTimeUpdate]);

    // Hide guide after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => setShowGuide(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    const tabs = [
        { id: 'summary', label: t('revision.tabs.summary'), icon: BookOpen },
        { id: 'flashcards', label: t('revision.tabs.flashcards'), icon: Layers },
        { id: 'quiz', label: t('revision.tabs.quiz'), icon: Brain },
    ];

    const flashcards = synthese.flashcards || [];
    const questions = synthese.quizQuestions || [];

    // Flashcard handlers
    const handleFlip = () => setIsFlipped(!isFlipped);
    const handleNextCard = () => {
        if (currentCardIndex < flashcards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
            setIsFlipped(false);
        }
    };
    const handlePrevCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
            setIsFlipped(false);
        }
    };

    // Quiz handlers
    const handleOptionClick = (index) => {
        if (selectedOption !== null) return;
        setSelectedOption(index);
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setSelectedOption(null);
            }
        }, 1000);
    };

    return (
        <div className="min-h-full flex flex-col p-4 pb-24">
            {/* Header with Timer */}
            <header className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-lg font-bold text-text-main">{t('revision.phases.study')}</h1>
                    <p className="text-xs text-text-muted truncate max-w-[200px]">{synthese.title}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-primary/20 px-3 py-1.5 rounded-full">
                        <Clock size={16} className="text-primary" />
                        <span className="text-primary font-mono font-bold">{formattedTime}</span>
                    </div>
                    <button
                        onClick={onStop}
                        className="p-2 text-text-muted hover:text-error transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </header>

            {/* Guide message */}
            <AnimatePresence>
                {showGuide && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4"
                    >
                        <p className="text-sm text-text-main">{t('revision.phases.studyMessage')}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                            activeTab === tab.id
                                ? 'bg-primary text-white'
                                : 'bg-surface text-text-muted hover:bg-surface/80'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
                {/* Summary Tab */}
                {activeTab === 'summary' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-surface rounded-2xl border border-white/5 p-4"
                    >
                        <div className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                            {synthese.summary_content}
                        </div>
                    </motion.div>
                )}

                {/* Flashcards Tab */}
                {activeTab === 'flashcards' && flashcards.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center"
                    >
                        {/* Card */}
                        <div
                            onClick={handleFlip}
                            className="w-full max-w-xs aspect-[3/4] cursor-pointer perspective-1000"
                        >
                            <motion.div
                                className="w-full h-full relative"
                                style={{ transformStyle: "preserve-3d" }}
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                {/* Front */}
                                <div
                                    className="absolute inset-0 bg-surface border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center"
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    <span className="text-xs text-primary uppercase tracking-wider mb-3">{t('flashcards.question')}</span>
                                    <p className="text-lg font-medium text-text-main">{flashcards[currentCardIndex].front}</p>
                                </div>
                                {/* Back */}
                                <div
                                    className="absolute inset-0 bg-surface border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center"
                                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                                >
                                    <span className="text-xs text-primary uppercase tracking-wider mb-3">{t('flashcards.answer')}</span>
                                    <p className="text-text-main">{flashcards[currentCardIndex].back}</p>
                                </div>
                            </motion.div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between w-full max-w-xs mt-4">
                            <button
                                onClick={handlePrevCard}
                                disabled={currentCardIndex === 0}
                                className="px-4 py-2 bg-surface rounded-xl text-text-muted disabled:opacity-50"
                            >
                                {t('common.previous')}
                            </button>
                            <span className="text-text-muted">{currentCardIndex + 1} / {flashcards.length}</span>
                            <button
                                onClick={handleNextCard}
                                disabled={currentCardIndex === flashcards.length - 1}
                                className="px-4 py-2 bg-surface rounded-xl text-text-muted disabled:opacity-50"
                            >
                                {t('common.next')}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Quiz Tab */}
                {activeTab === 'quiz' && questions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        <div className="text-xs text-text-muted text-right">
                            {currentQuestionIndex + 1} / {questions.length}
                        </div>

                        <h3 className="text-lg font-medium text-text-main mb-4">
                            {questions[currentQuestionIndex].question}
                        </h3>

                        <div className="space-y-2">
                            {(typeof questions[currentQuestionIndex].options === 'string'
                                ? JSON.parse(questions[currentQuestionIndex].options)
                                : questions[currentQuestionIndex].options
                            ).map((option, index) => {
                                let style = "bg-surface border-white/5";
                                if (selectedOption !== null) {
                                    if (index === questions[currentQuestionIndex].correct_answer) {
                                        style = "bg-success/20 border-success";
                                    } else if (index === selectedOption) {
                                        style = "bg-error/20 border-error";
                                    }
                                }

                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleOptionClick(index)}
                                        disabled={selectedOption !== null}
                                        className={`w-full p-3 rounded-xl border text-left transition-colors ${style}`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default RevisionStudyPhase;
