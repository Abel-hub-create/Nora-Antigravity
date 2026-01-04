import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import useActiveTimer from '../hooks/useActiveTimer';
import * as syntheseService from '../services/syntheseService';

const StudyQuiz = () => {
    const { t } = useTranslation();
    useActiveTimer('quiz');
    const { id } = useParams();
    const [questions, setQuestions] = useState([]);
    const [syntheseTitle, setSyntheseTitle] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [resultMessage, setResultMessage] = useState('');

    // Get result message based on percentage
    const getResultMessage = (percentage) => {
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

    useEffect(() => {
        const loadQuiz = async () => {
            try {
                setIsLoading(true);
                const response = await syntheseService.getQuizQuestions(id);
                setQuestions(response.questions || []);
                setSyntheseTitle(response.syntheseTitle || 'Quiz');
            } catch (error) {
                console.error('Error loading quiz:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadQuiz();
    }, [id]);

    const handleOptionClick = async (index) => {
        if (selectedOption !== null) return;

        setSelectedOption(index);
        const correct = index === questions[currentQuestion].correct_answer;

        // Update progress on backend
        try {
            await syntheseService.updateQuizProgress(id, questions[currentQuestion].id, correct);
        } catch (error) {
            console.error('Error updating progress:', error);
        }

        if (correct) {
            setScore(score + 1);
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.7 },
                colors: ['#38bdf8', '#818cf8', '#ffffff']
            });
        }

        setTimeout(() => {
            if (currentQuestion < questions.length - 1) {
                setCurrentQuestion(currentQuestion + 1);
                setSelectedOption(null);
            } else {
                const finalScore = correct ? score + 1 : score;
                const percentage = Math.round((finalScore / questions.length) * 100);
                setResultMessage(getResultMessage(percentage));
                setShowResult(true);
            }
        }, 1200);
    };

    if (isLoading) {
        return (
            <div className="min-h-full bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin text-primary mx-auto mb-3" size={32} />
                    <p className="text-text-muted">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-full bg-background p-6">
                <Link to={`/study/${id}`} className="inline-flex items-center gap-2 text-text-muted hover:text-text-main mb-6">
                    <ArrowLeft size={20} />
                    {t('common.back')}
                </Link>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-text-muted">{t('quiz.noQuestions')}</p>
                </div>
            </div>
        );
    }

    if (showResult) {
        const percentage = Math.round((score / questions.length) * 100);
        const emoji = percentage === 100 ? '🏆' : percentage >= 70 ? '🎯' : percentage >= 51 ? '👏' : percentage >= 1 ? '💪' : '📚';

        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-32 h-32 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-primary/30"
                >
                    <span className="text-4xl">{emoji}</span>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="text-2xl font-bold text-text-main mb-2">{t('quiz.completed')}</h2>
                    <p className="text-4xl font-bold text-primary mb-2">{score}/{questions.length}</p>
                    <p className="text-text-muted mb-8">{resultMessage}</p>
                    <div className="flex flex-col gap-3">
                        <Link
                            to={`/study/${id}`}
                            className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors"
                        >
                            {t('quiz.backToSynthesis')}
                        </Link>
                        <button
                            onClick={() => {
                                setCurrentQuestion(0);
                                setSelectedOption(null);
                                setScore(0);
                                setShowResult(false);
                                setResultMessage('');
                            }}
                            className="bg-surface border border-white/10 text-text-main px-8 py-3 rounded-xl hover:bg-surface/80 transition-colors"
                        >
                            {t('quiz.retry')}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const currentQ = questions[currentQuestion];
    const options = typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : currentQ.options;

    return (
        <div className="h-full flex flex-col p-6 pb-24">
            <header className="mb-6">
                <Link to={`/study/${id}`} className="inline-flex items-center gap-2 text-text-muted hover:text-text-main mb-4">
                    <ArrowLeft size={20} />
                    <span className="text-sm truncate max-w-[200px]">{syntheseTitle}</span>
                </Link>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary to-secondary"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
                <p className="text-xs text-text-muted mt-2 text-right">
                    {t('quiz.questionOf', { current: currentQuestion + 1, total: questions.length })}
                </p>
            </header>

            <div className="flex-1">
                <motion.h2
                    key={currentQuestion}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl font-bold text-text-main mb-8 leading-relaxed"
                >
                    {currentQ.question}
                </motion.h2>

                <div className="space-y-3">
                    {options.map((option, index) => {
                        let stateStyle = "bg-surface border-white/5 hover:bg-surface/80 active:scale-[0.98]";
                        if (selectedOption !== null) {
                            if (index === currentQ.correct_answer) {
                                stateStyle = "bg-success/20 border-success text-success";
                            } else if (index === selectedOption) {
                                stateStyle = "bg-error/20 border-error text-error";
                            } else {
                                stateStyle = "opacity-40 pointer-events-none";
                            }
                        }

                        return (
                            <motion.button
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                                onClick={() => handleOptionClick(index)}
                                disabled={selectedOption !== null}
                                className={`w-full p-4 rounded-2xl border text-left font-medium transition-all duration-200 flex justify-between items-center ${stateStyle}`}
                            >
                                <span>{option}</span>
                                {selectedOption !== null && index === currentQ.correct_answer && (
                                    <CheckCircle size={20} className="shrink-0" />
                                )}
                                {selectedOption === index && index !== currentQ.correct_answer && (
                                    <XCircle size={20} className="shrink-0" />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Explanation */}
                {selectedOption !== null && currentQ.explanation && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl"
                    >
                        <p className="text-sm text-text-main">{currentQ.explanation}</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default StudyQuiz;
