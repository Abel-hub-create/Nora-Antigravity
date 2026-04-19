import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LiquidProgressBar from '../components/UI/LiquidProgressBar';
import { ArrowLeft, CheckCircle, XCircle, Loader2, PenLine, X, Check } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatMath } from '../utils/formatMath';
import confetti from 'canvas-confetti';
import useActiveTimer from '../hooks/useActiveTimer';
import { useAuth } from '../features/auth/hooks/useAuth';
import * as syntheseService from '../services/syntheseService';

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function shuffleQuizQuestions(questions) {
    const shuffled = shuffleArray(questions);
    return shuffled.map(q => {
        const options = Array.isArray(q.options) ? [...q.options] : JSON.parse(q.options);
        const correctOption = options[q.correct_answer];
        const shuffledOptions = shuffleArray(options);
        return {
            ...q,
            options: shuffledOptions,
            correct_answer: shuffledOptions.indexOf(correctOption)
        };
    });
}

const StudyQuiz = () => {
    const { t } = useTranslation();
    useActiveTimer('quiz');
    const { id } = useParams();
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [rawQuestions, setRawQuestions] = useState([]); // pool original pour re-shuffle
    const [syntheseTitle, setSyntheseTitle] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [resultMessage, setResultMessage] = useState('');
    const optionRefs = useRef([]);
    const [optionHeight, setOptionHeight] = useState(null);

    // Mode édition (premium/school)
    const canEdit = user?.plan_type === 'premium' || user?.plan_type === 'school';
    const [isEditingQuestion, setIsEditingQuestion] = useState(false);
    const [editQuestion, setEditQuestion] = useState('');
    const [editOptions, setEditOptions] = useState(['', '', '', '']);
    const [editCorrectAnswer, setEditCorrectAnswer] = useState(0);
    const [editExplanation, setEditExplanation] = useState('');
    const [isSavingQuestion, setIsSavingQuestion] = useState(false);

    useEffect(() => {
        setOptionHeight(null);
        const frame = requestAnimationFrame(() => {
            const heights = optionRefs.current.map(r => r?.offsetHeight ?? 0);
            const max = Math.max(...heights);
            if (max > 0) setOptionHeight(max);
        });
        return () => cancelAnimationFrame(frame);
    }, [currentQuestion]);

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
                const raw = response.questions || [];
                setRawQuestions(raw);
                setQuestions(shuffleQuizQuestions(raw));
                setSyntheseTitle(response.syntheseTitle || 'Quiz');
            } catch (error) {
                console.error('Error loading quiz:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadQuiz();
    }, [id]);

    const handleEditQuestion = () => {
        const q = questions[currentQuestion];
        const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options);
        setEditQuestion(q.question);
        setEditOptions([...opts]);
        setEditCorrectAnswer(q.correct_answer);
        setEditExplanation(q.explanation || '');
        setIsEditingQuestion(true);
    };

    const handleSaveQuestion = async () => {
        if (!editQuestion.trim() || editOptions.some(o => !o.trim())) return;
        setIsSavingQuestion(true);
        // Retrouver l'ID de la question originale dans le pool
        const originalQ = rawQuestions.find(rq => rq.question === questions[currentQuestion].question) || rawQuestions[currentQuestion];
        try {
            await syntheseService.updateQuizQuestion(id, originalQ.id, {
                question: editQuestion.trim(),
                options: editOptions.map(o => o.trim()),
                correctAnswer: editCorrectAnswer,
                explanation: editExplanation.trim()
            });
            // Mettre à jour questions affichées et raw pool
            const updatedQ = { ...questions[currentQuestion], question: editQuestion.trim(), options: editOptions.map(o => o.trim()), correct_answer: editCorrectAnswer, explanation: editExplanation.trim() };
            setQuestions(prev => prev.map((q, i) => i === currentQuestion ? updatedQ : q));
            setRawQuestions(prev => prev.map(rq => rq.id === originalQ.id ? { ...rq, question: editQuestion.trim(), options: editOptions.map(o => o.trim()), correct_answer: editCorrectAnswer, explanation: editExplanation.trim() } : rq));
            setIsEditingQuestion(false);
        } catch (err) {
            console.error('Error saving question:', err);
        } finally {
            setIsSavingQuestion(false);
        }
    };

    const handleOptionClick = async (index) => {
        if (selectedOption !== null) return;

        setSelectedOption(index);
        const correct = index === questions[currentQuestion].correct_answer;

        // Update progress on backend (+ log answer pour Monk Mode)
        try {
            await syntheseService.updateQuizProgress(id, questions[currentQuestion].id, correct, index);
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
                                setQuestions(shuffleQuizQuestions(rawQuestions));
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
            {/* Modal édition question (portal pour échapper au stacking context backdrop-filter) */}
            {ReactDOM.createPortal(
                <AnimatePresence>
                    {isEditingQuestion && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 flex items-end justify-center p-4 sm:items-center"
                            style={{ zIndex: 9999 }}
                        >
                            <motion.div
                                initial={{ y: 60, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 60, opacity: 0 }}
                                className="bg-surface rounded-2xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto"
                                style={{ backdropFilter: 'none' }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-text-main">{t('quiz.editQuestion')}</h3>
                                    <button onClick={() => setIsEditingQuestion(false)} className="p-1 text-text-muted hover:text-text-main">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="space-y-3 mb-4">
                                    <div>
                                        <label className="text-xs text-text-muted uppercase tracking-wider block mb-1">{t('quiz.questionLabel')}</label>
                                        <textarea
                                            value={editQuestion}
                                            onChange={e => setEditQuestion(e.target.value)}
                                            className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm text-text-main resize-none focus:outline-none focus:border-primary min-h-[60px]"
                                            autoFocus
                                        />
                                    </div>
                                    {editOptions.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditCorrectAnswer(idx)}
                                                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${editCorrectAnswer === idx ? 'border-green-500 bg-green-500' : 'border-white/20'}`}
                                            >
                                                {editCorrectAnswer === idx && <Check size={12} className="text-white" />}
                                            </button>
                                            <input
                                                value={opt}
                                                onChange={e => setEditOptions(prev => prev.map((o, i) => i === idx ? e.target.value : o))}
                                                className="flex-1 bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary"
                                                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="text-xs text-text-muted uppercase tracking-wider block mb-1">{t('quiz.explanationLabel')}</label>
                                        <textarea
                                            value={editExplanation}
                                            onChange={e => setEditExplanation(e.target.value)}
                                            className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm text-text-main resize-none focus:outline-none focus:border-primary min-h-[48px]"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveQuestion}
                                    disabled={isSavingQuestion || !editQuestion.trim() || editOptions.some(o => !o.trim())}
                                    className="w-full py-2.5 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSavingQuestion ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                    {t('common.save')}
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <header className="mb-6 shrink-0">
                <div className="flex items-center justify-between mb-4">
                <Link to={`/study/${id}`} className="inline-flex items-center gap-2 text-text-muted hover:text-text-main">
                    <ArrowLeft size={20} />
                    <span className="text-sm truncate max-w-[200px]">{syntheseTitle}</span>
                </Link>
                {canEdit && (
                    <button
                        onClick={handleEditQuestion}
                        className="p-2 text-text-muted hover:text-primary transition-colors"
                        title={t('quiz.editQuestion')}
                    >
                        <PenLine size={18} />
                    </button>
                )}
                </div>

                {/* Progress Bar */}
                <LiquidProgressBar
                    progress={((currentQuestion + 1) / questions.length) * 100}
                    height={8}
                    className="w-full"
                />
                <p className="text-xs text-text-muted mt-2 text-right">
                    {t('quiz.questionOf', { current: currentQuestion + 1, total: questions.length })}
                </p>
            </header>

            <motion.h2
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xl font-bold text-text-main mb-8 leading-relaxed shrink-0"
            >
                {formatMath(currentQ.question)}
            </motion.h2>

            <div className="flex-1 space-y-3">
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
                            ref={el => optionRefs.current[index] = el}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                            onClick={() => handleOptionClick(index)}
                            disabled={selectedOption !== null}
                            style={optionHeight ? { height: optionHeight } : {}}
                            className={`w-full p-4 rounded-2xl border text-left font-medium transition-all duration-200 flex justify-between items-center ${stateStyle}`}
                        >
                            <span className="flex-1">{formatMath(option)}</span>
                            {selectedOption !== null && index === currentQ.correct_answer && (
                                <CheckCircle size={20} className="shrink-0 ml-2" />
                            )}
                            {selectedOption === index && index !== currentQ.correct_answer && (
                                <XCircle size={20} className="shrink-0 ml-2" />
                            )}
                        </motion.button>
                    );
                })}
            </div>

        </div>
    );
};

export default StudyQuiz;
