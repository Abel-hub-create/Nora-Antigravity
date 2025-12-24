import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCw, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import useActiveTimer from '../hooks/useActiveTimer';

const Flashcards = () => {
    useActiveTimer('flashcards');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState(0);

    const cards = [
        { id: 1, front: "Qu'est-ce que la Photosynthèse ?", back: "Le processus par lequel les plantes vertes utilisent la lumière du soleil pour synthétiser des nutriments à partir de dioxyde de carbone et d'eau." },
        { id: 2, front: "Qu'est-ce que la Chlorophylle ?", back: "Un pigment vert, présent dans toutes les plantes vertes, responsable de l'absorption de la lumière pour fournir de l'énergie pour la photosynthèse." },
        { id: 3, front: "Qu'est-ce qu'un Stomate ?", back: "De minuscules ouvertures ou pores dans le tissu végétal qui permettent les échanges gazeux." },
    ];

    const handleNext = () => {
        if (currentCardIndex < cards.length - 1) {
            setDirection(1);
            setIsFlipped(false);
            setCurrentCardIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentCardIndex > 0) {
            setDirection(-1);
            setIsFlipped(false);
            setCurrentCardIndex(prev => prev - 1);
        }
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    };

    return (
        <div className="min-h-full bg-background p-6 pb-24 flex flex-col">
            <header className="flex items-center gap-4 mb-8">
                <Link to="/" className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-2xl font-bold text-text-main">Flashcards</h1>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center relative">
                <div className="w-full max-w-xs aspect-[3/4] relative perspective-1000">
                    <AnimatePresence initial={false} custom={direction} mode='wait'>
                        <motion.div
                            key={currentCardIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 }
                            }}
                            className="w-full h-full absolute top-0 left-0"
                        >
                            <motion.div
                                className="w-full h-full relative cursor-pointer"
                                style={{ transformStyle: "preserve-3d" }}
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                                onClick={handleFlip}
                            >
                                {/* Front */}
                                <div
                                    className="absolute inset-0 bg-surface border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl"
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    <span className="text-sm text-primary font-bold uppercase tracking-wider mb-4">Question</span>
                                    <p className="text-xl font-medium text-text-main leading-relaxed">
                                        {cards[currentCardIndex].front}
                                    </p>
                                    <div className="absolute bottom-6 text-text-muted text-xs flex items-center gap-2">
                                        <RotateCw size={14} />
                                        Appuyer pour retourner
                                    </div>
                                </div>

                                {/* Back */}
                                <div
                                    className="absolute inset-0 bg-surface border border-primary/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl shadow-primary/5"
                                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                                >
                                    <span className="text-sm text-primary font-bold uppercase tracking-wider mb-4">Réponse</span>
                                    <p className="text-lg text-text-main leading-relaxed">
                                        {cards[currentCardIndex].back}
                                    </p>
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center justify-between px-4">
                <button
                    onClick={handlePrev}
                    disabled={currentCardIndex === 0}
                    className={`p-4 rounded-full bg-surface border border-white/5 transition-colors ${currentCardIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 text-text-main'}`}
                >
                    <ChevronLeft size={24} />
                </button>

                <span className="text-text-muted font-medium">
                    {currentCardIndex + 1} / {cards.length}
                </span>

                <button
                    onClick={handleNext}
                    disabled={currentCardIndex === cards.length - 1}
                    className={`p-4 rounded-full bg-surface border border-white/5 transition-colors ${currentCardIndex === cards.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 text-text-main'}`}
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
};

export default Flashcards;
