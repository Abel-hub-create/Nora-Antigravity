import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Layers, Brain, X, Clock, CheckCircle, XCircle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import useRevisionTimer from '../../hooks/useRevisionTimer';
import useActiveTimer from '../../hooks/useActiveTimer';

const STUDY_DURATION = 8; // 10 minutes
const CHARS_PER_PAGE = 2500; // Nombre de caractères par page pour la pagination

const RevisionStudyPhase = ({ synthese, phaseStartedAt, onComplete, onStop }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('summary');
    const [showGuide, setShowGuide] = useState(true);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [quizScore, setQuizScore] = useState(0);
    const [showQuizResult, setShowQuizResult] = useState(false);
    const [currentSummaryPage, setCurrentSummaryPage] = useState(0);

    // Diviser la synthèse en pages
    const summaryPages = useMemo(() => {
        if (!synthese?.summary_content) return [];
        const content = synthese.summary_content;
        if (content.length <= CHARS_PER_PAGE) return [content];

        const pages = [];
        let start = 0;
        while (start < content.length) {
            let end = start + CHARS_PER_PAGE;
            // Chercher la fin de paragraphe ou de phrase la plus proche
            if (end < content.length) {
                const paragraphEnd = content.lastIndexOf('\n\n', end);
                const sentenceEnd = content.lastIndexOf('. ', end);
                if (paragraphEnd > start + CHARS_PER_PAGE * 0.7) {
                    end = paragraphEnd + 2;
                } else if (sentenceEnd > start + CHARS_PER_PAGE * 0.7) {
                    end = sentenceEnd + 2;
                }
            }
            pages.push(content.slice(start, end).trim());
            start = end;
        }
        return pages;
    }, [synthese?.summary_content]);

    const totalSummaryPages = summaryPages.length;
    const hasMultipleSummaryPages = totalSummaryPages > 1;

    // Timer hook - calculates remaining time from phase start timestamp
    const { formattedTime, timeRemaining } = useRevisionTimer(
        STUDY_DURATION,
        phaseStartedAt,
        onComplete,
        true
    );

    // Track study time for daily goals based on active tab
    useActiveTimer(activeTab);

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
        const correct = index === questions[currentQuestionIndex].correct_answer;

        if (correct) {
            setQuizScore(prev => prev + 1);
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.7 },
                colors: ['#38bdf8', '#818cf8', '#ffffff']
            });
        }

        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setSelectedOption(null);
            } else {
                setShowQuizResult(true);
            }
        }, 1200);
    };

    const restartQuiz = () => {
        setCurrentQuestionIndex(0);
        setSelectedOption(null);
        setQuizScore(0);
        setShowQuizResult(false);
    };

    // Get result message based on percentage
    const getResultMessage = () => {
        if (questions.length === 0) return '';
        const percentage = Math.round((quizScore / questions.length) * 100);
        const messages = t('quiz.messages', { returnObjects: true });

        let category;
        if (percentage === 0) category = 'zero';
        else if (percentage <= 50) category = 'low';
        else if (percentage <= 69) category = 'medium';
        else if (percentage < 100) category = 'high';
        else category = 'perfect';

        const categoryMessages = messages[category];
        return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
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
                        {hasMultipleSummaryPages && (
                            <div className="flex justify-end mb-2">
                                <span className="text-xs text-text-muted">
                                    {currentSummaryPage + 1} / {totalSummaryPages}
                                </span>
                            </div>
                        )}

                        <div className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                            {summaryPages[currentSummaryPage] || synthese.summary_content}
                        </div>

                        {/* Boutons de navigation */}
                        {hasMultipleSummaryPages && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setCurrentSummaryPage(p => Math.max(0, p - 1))}
                                    disabled={currentSummaryPage === 0}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                        currentSummaryPage === 0
                                            ? 'text-text-muted/30 cursor-not-allowed'
                                            : 'text-primary bg-primary/10 hover:bg-primary/20'
                                    }`}
                                >
                                    <ChevronLeft size={18} />
                                    <span className="text-sm">{t('common.previous')}</span>
                                </button>

                                {/* Indicateurs de page */}
                                <div className="flex gap-1.5">
                                    {summaryPages.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentSummaryPage(idx)}
                                            className={`w-2 h-2 rounded-full transition-colors ${
                                                idx === currentSummaryPage ? 'bg-primary' : 'bg-white/20 hover:bg-white/40'
                                            }`}
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentSummaryPage(p => Math.min(totalSummaryPages - 1, p + 1))}
                                    disabled={currentSummaryPage === totalSummaryPages - 1}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                        currentSummaryPage === totalSummaryPages - 1
                                            ? 'text-text-muted/30 cursor-not-allowed'
                                            : 'text-primary bg-primary/10 hover:bg-primary/20'
                                    }`}
                                >
                                    <span className="text-sm">{t('common.next')}</span>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
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
                        {showQuizResult ? (
                            // Quiz Results
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-4 shadow-xl shadow-primary/30"
                                >
                                    <span className="text-3xl">
                                        {Math.round((quizScore / questions.length) * 100) === 100 ? '🏆' :
                                         Math.round((quizScore / questions.length) * 100) >= 70 ? '🎯' :
                                         Math.round((quizScore / questions.length) * 100) >= 51 ? '👏' :
                                         Math.round((quizScore / questions.length) * 100) >= 1 ? '💪' : '📚'}
                                    </span>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <h3 className="text-xl font-bold text-text-main mb-2">{t('quiz.completed')}</h3>
                                    <p className="text-3xl font-bold text-primary mb-2">{quizScore}/{questions.length}</p>
                                    <p className="text-text-muted mb-6">{getResultMessage()}</p>
                                    <button
                                        onClick={restartQuiz}
                                        className="flex items-center gap-2 mx-auto bg-surface border border-white/10 text-text-main px-6 py-3 rounded-xl hover:bg-surface/80 transition-colors"
                                    >
                                        <RotateCcw size={18} />
                                        {t('quiz.retry')}
                                    </button>
                                </motion.div>
                            </div>
                        ) : (
                            // Quiz Questions
                            <>
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
                                            <motion.button
                                                key={index}
                                                whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                                                onClick={() => handleOptionClick(index)}
                                                disabled={selectedOption !== null}
                                                className={`w-full p-3 rounded-xl border text-left transition-colors flex justify-between items-center ${style}`}
                                            >
                                                <span>{option}</span>
                                                {selectedOption !== null && index === questions[currentQuestionIndex].correct_answer && (
                                                    <CheckCircle size={18} className="text-success shrink-0" />
                                                )}
                                                {selectedOption === index && index !== questions[currentQuestionIndex].correct_answer && (
                                                    <XCircle size={18} className="text-error shrink-0" />
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                {/* Explanation */}
                                {selectedOption !== null && questions[currentQuestionIndex].explanation && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl"
                                    >
                                        <p className="text-sm text-text-main">{questions[currentQuestionIndex].explanation}</p>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default RevisionStudyPhase;
