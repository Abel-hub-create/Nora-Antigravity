import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import useActiveTimer from '../hooks/useActiveTimer';

const Quiz = () => {
    useActiveTimer('quiz');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);

    const questions = [
        {
            question: "Quelle est la principale source d'énergie pour la photosynthèse ?",
            options: ["Eau", "Lumière du soleil", "Oxygène", "Sol"],
            answer: 1
        },
        {
            question: "Quel pigment est responsable de la couleur verte des plantes ?",
            options: ["Mélanine", "Hémoglobine", "Chlorophylle", "Carotène"],
            answer: 2
        },
        {
            question: "Quel gaz les plantes libèrent-elles ?",
            options: ["Oxygène", "Dioxyde de Carbone", "Azote", "Hélium"],
            answer: 0
        }
    ];

    const handleOptionClick = (index) => {
        if (selectedOption !== null) return; // Prevent multiple clicks

        setSelectedOption(index);
        const correct = index === questions[currentQuestion].answer;

        if (correct) {
            setScore(score + 1);
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#38bdf8', '#ffffff']
            });
        }

        setTimeout(() => {
            if (currentQuestion < questions.length - 1) {
                setCurrentQuestion(currentQuestion + 1);
                setSelectedOption(null);
            } else {
                setShowResult(true);
            }
        }, 1000);
    };

    if (showResult) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-32 h-32 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-primary/30"
                >
                    <span className="text-4xl font-bold text-white">{score}/{questions.length}</span>
                </motion.div>
                <h2 className="text-2xl font-bold text-text-main mb-2">Quiz Terminé !</h2>
                <p className="text-text-muted mb-8">Tu fais de super progrès.</p>
                <Link to="/" className="bg-surface border border-white/10 text-text-main px-8 py-3 rounded-xl hover:bg-surface/80 transition-colors">
                    Retour à l'accueil
                </Link>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6">
            <header className="mb-8">
                <Link to="/" className="inline-block p-2 -ml-2 text-text-muted hover:text-text-main mb-4">
                    <ArrowLeft size={24} />
                </Link>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </header>

            <div className="flex-1">
                <h2 className="text-xl font-bold text-text-main mb-8 leading-relaxed">
                    {questions[currentQuestion].question}
                </h2>

                <div className="space-y-3">
                    {questions[currentQuestion].options.map((option, index) => {
                        let stateStyle = "bg-surface border-white/5 hover:bg-surface/80";
                        if (selectedOption !== null) {
                            if (index === questions[currentQuestion].answer) {
                                stateStyle = "bg-success/20 border-success text-success";
                            } else if (index === selectedOption) {
                                stateStyle = "bg-error/20 border-error text-error";
                            } else {
                                stateStyle = "opacity-50";
                            }
                        }

                        return (
                            <motion.button
                                key={index}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleOptionClick(index)}
                                className={`w-full p-4 rounded-xl border text-left font-medium transition-all duration-200 flex justify-between items-center ${stateStyle}`}
                            >
                                {option}
                                {selectedOption !== null && index === questions[currentQuestion].answer && <CheckCircle size={20} />}
                                {selectedOption === index && index !== questions[currentQuestion].answer && <XCircle size={20} />}
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Quiz;
