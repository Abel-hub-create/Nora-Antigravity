import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCw, ChevronRight, ChevronLeft, Loader2, PenLine, X, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useActiveTimer from '../hooks/useActiveTimer';
import * as syntheseService from '../services/syntheseService';
import VoiceDictation from '../components/Import/VoiceDictation';
import { formatMath } from '../utils/formatMath';
import { useAuth } from '../features/auth/hooks/useAuth';

const StudyFlashcards = () => {
    const { t } = useTranslation();
    useActiveTimer('flashcards');
    const { id } = useParams();
    const { user } = useAuth();
    const canPrint = true;
    const [cards, setCards] = useState([]);
    const [syntheseTitle, setSyntheseTitle] = useState('');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showWriteInput, setShowWriteInput] = useState(false);
    const [userAnswers, setUserAnswers] = useState({});
    const [currentAnswer, setCurrentAnswer] = useState('');
    const textareaRef = useRef(null);

    useEffect(() => {
        const loadFlashcards = async () => {
            try {
                setIsLoading(true);
                const response = await syntheseService.getFlashcards(id);
                setCards(response.flashcards || []);
                setSyntheseTitle(response.syntheseTitle || 'Flashcards');
            } catch (error) {
                console.error('Error loading flashcards:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadFlashcards();
    }, [id]);

    const handleNext = () => {
        if (currentCardIndex < cards.length - 1) {
            setDirection(1);
            setIsFlipped(false);
            setShowWriteInput(false);
            setCurrentAnswer('');
            setCurrentCardIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentCardIndex > 0) {
            setDirection(-1);
            setIsFlipped(false);
            setShowWriteInput(false);
            setCurrentAnswer('');
            setCurrentCardIndex(prev => prev - 1);
        }
    };

    const handleFlip = () => {
        // Si l'utilisateur a écrit une réponse, on la sauvegarde avant de retourner
        if (showWriteInput && currentAnswer.trim()) {
            setUserAnswers(prev => ({
                ...prev,
                [currentCardIndex]: currentAnswer.trim()
            }));
        }
        setIsFlipped(!isFlipped);
    };

    const handleWriteClick = (e) => {
        e.stopPropagation();
        setShowWriteInput(true);
        // Restaurer la réponse précédente si elle existe
        if (userAnswers[currentCardIndex]) {
            setCurrentAnswer(userAnswers[currentCardIndex]);
        }
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 100);
    };

    const handleCloseWriteInput = (e) => {
        e.stopPropagation();
        setShowWriteInput(false);
        setCurrentAnswer('');
    };

    const handleTextareaClick = (e) => {
        e.stopPropagation();
    };

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 280 : -280,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 280 : -280,
            opacity: 0
        })
    };

    // Swipe tactile
    const dragStartX = useRef(null);
    const handleTouchStart = (e) => { dragStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
        if (dragStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - dragStartX.current;
        dragStartX.current = null;
        if (Math.abs(dx) < 50) return;
        if (dx < 0) handleNext();
        else handlePrev();
    };

    const handlePrint = () => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const COLS = 3;
        const ROWS = 2;
        const PER_PAGE = COLS * ROWS;

        // Découpe les cartes en pages de 6
        const chunks = [];
        for (let i = 0; i < cards.length; i += PER_PAGE) {
            chunks.push(cards.slice(i, i + PER_PAGE));
        }

        const renderCard = (card, idx, side, isEmpty) => {
            if (isEmpty) return `<div class="card empty"></div>`;
            const num = idx + 1;
            const label = side === 'recto' ? 'Question' : 'Réponse';
            const content = side === 'recto' ? formatMath(card.front) : formatMath(card.back);
            return `
            <div class="card ${side}">
                <span class="card-label">${label}</span>
                <span class="card-num">${num}</span>
                <div class="card-content">${content}</div>
                <span class="card-title">${syntheseTitle}</span>
            </div>`;
        };

        const sheets = chunks.flatMap((chunk, pageIdx) => {
            // Pad à 6 si nécessaire
            const padded = [...chunk];
            while (padded.length < PER_PAGE) padded.push(null);

            // Recto : ordre normal
            const rectoCards = padded.map((card, i) =>
                renderCard(card, pageIdx * PER_PAGE + i, 'recto', card === null)
            ).join('');

            // Verso : miroir horizontal par rangée (pour impression recto-verso)
            const versoCards = [];
            for (let row = 0; row < ROWS; row++) {
                for (let col = COLS - 1; col >= 0; col--) {
                    const i = row * COLS + col;
                    const card = padded[i];
                    versoCards.push(renderCard(card, pageIdx * PER_PAGE + i, 'verso', card === null));
                }
            }

            return [
                `<div class="sheet">${rectoCards}</div>`,
                `<div class="sheet">${versoCards.join('')}</div>`,
            ];
        });

        const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Flashcards — ${syntheseTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page { size: A4 portrait; margin: 8mm; }

    body { background: #fff; font-family: Georgia, 'Times New Roman', serif; }

    .sheet {
      width: 194mm;
      height: 281mm;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(2, 78mm);
      gap: 6mm;
      align-content: center;
      page-break-after: always;
    }

    .card {
      border: 3px dashed #555;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px 20px;
      position: relative;
      overflow: hidden;
    }

    .card.empty {
      border-color: #ddd;
    }

    .card-label {
      position: absolute;
      top: 10px;
      left: 14px;
      font-size: 7pt;
      font-family: Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #bbb;
      font-weight: 700;
    }

    .card-num {
      position: absolute;
      top: 10px;
      right: 14px;
      font-size: 7.5pt;
      font-family: Arial, sans-serif;
      color: #ccc;
      font-weight: 600;
    }

    .card-title {
      position: absolute;
      bottom: 9px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 7pt;
      font-family: Arial, sans-serif;
      color: #ccc;
      letter-spacing: 0.04em;
    }

    .card-content {
      font-size: 11pt;
      line-height: 1.5;
      text-align: center;
      color: #111;
      font-weight: bold;
    }

    .recto .card-content {
      font-size: 12pt;
    }

    .verso .card-content {
      font-size: 11pt;
    }

    /* Petit trait décoratif sous le contenu */
    .card-content::after {
      content: '';
      display: block;
      width: 32px;
      height: 1.5px;
      background: #ccc;
      margin: 12px auto 0;
    }

    @media print {
      .sheet { page-break-after: always; }
    }
  </style>
</head>
<body>
  ${sheets.join('\n')}
  <script>window.onload = () => { if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) { window.focus(); window.print(); } }<\/script>
</body>
</html>`;
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        if (isMobile) {
            // Mobile : ouvre dans un nouvel onglet, l'utilisateur utilise le bouton natif du navigateur pour imprimer
            const newTab = window.open(url, '_blank');
            if (!newTab) window.location.href = url;
        } else {
            // Desktop : ouvre et déclenche l'impression automatiquement
            const win = window.open(url, '_blank');
            if (win) win.onload = () => { win.focus(); win.print(); };
        }

        setTimeout(() => URL.revokeObjectURL(url), 15000);
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

    if (cards.length === 0) {
        return (
            <div className="min-h-full bg-background p-6">
                <Link to={`/study/${id}`} className="inline-flex items-center gap-2 text-text-muted hover:text-text-main mb-6">
                    <ArrowLeft size={20} />
                    {t('common.back')}
                </Link>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-text-muted">{t('flashcards.noFlashcards')}</p>
                </div>
            </div>
        );
    }

    // Completed all cards
    if (currentCardIndex >= cards.length) {
        return (
            <div className="min-h-full bg-background flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-6"
                >
                    <span className="text-3xl">🎉</span>
                </motion.div>
                <h2 className="text-2xl font-bold text-text-main mb-2">{t('flashcards.completed')}</h2>
                <p className="text-text-muted mb-6">
                    {cards.length === 1
                        ? t('flashcards.reviewedAll', { count: cards.length })
                        : t('flashcards.reviewedAllPlural', { count: cards.length })}
                </p>
                <Link
                    to={`/study/${id}`}
                    className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors"
                >
                    {t('flashcards.backToSynthesis')}
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-background p-6 pb-24 flex flex-col">
            <header className="flex items-center gap-4 mb-6">
                <Link to={`/study/${id}`} className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-text-main truncate">{syntheseTitle}</h1>
                    <p className="text-xs text-text-muted">{t('flashcards.title')}</p>
                </div>
                {canPrint && cards.length > 0 && (
                    <button
                        onClick={handlePrint}
                        className="p-2 text-text-muted hover:text-text-main transition-colors"
                        title="Imprimer les flashcards"
                    >
                        <Printer size={20} />
                    </button>
                )}
            </header>

            <div className="flex-1 flex flex-col items-center justify-center relative">
                <div
                    className="w-full max-w-xs aspect-[3/4] relative perspective-1000 overflow-hidden"
                    style={{ touchAction: 'pan-y' }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <AnimatePresence initial={false} custom={direction} mode='wait'>
                        <motion.div
                            key={currentCardIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "tween", duration: 0.2, ease: "easeOut" },
                                opacity: { duration: 0.15 }
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
                                    className="absolute inset-0 bg-surface border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-xl"
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    <span className="text-sm text-primary font-bold uppercase tracking-wider mb-3">{t('flashcards.question')}</span>
                                    <p className="text-lg font-medium text-text-main leading-relaxed mb-4">
                                        {formatMath(cards[currentCardIndex].front)}
                                    </p>

                                    {/* Zone de réponse écrite */}
                                    {showWriteInput ? (
                                        <div className="w-full mt-2" onClick={handleTextareaClick}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-text-muted">{t('flashcards.yourAnswer')}</span>
                                                <button
                                                    onClick={handleCloseWriteInput}
                                                    className="p-1 text-text-muted hover:text-text-main transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <textarea
                                                    ref={textareaRef}
                                                    value={currentAnswer}
                                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                                    onClick={handleTextareaClick}
                                                    placeholder={t('flashcards.writeAnswerPlaceholder')}
                                                    className="w-full h-20 bg-white border border-white/10 rounded-xl p-3 pr-12 text-sm text-black placeholder:text-gray-400 resize-none focus:outline-none focus:border-primary/50"
                                                />
                                                <div className="absolute bottom-2 right-2" onClick={handleTextareaClick}>
                                                    <VoiceDictation
                                                        onTranscript={(text) => setCurrentAnswer(prev => prev + (prev ? ' ' : '') + text)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleWriteClick}
                                            className="flex items-center gap-2 text-xs text-text-muted hover:text-primary transition-colors mt-2 px-3 py-2 rounded-lg hover:bg-white/5"
                                        >
                                            <PenLine size={14} />
                                            {t('flashcards.writeAnswer')}
                                        </button>
                                    )}

                                    <div className="absolute bottom-4 text-text-muted text-xs flex items-center gap-2">
                                        <RotateCw size={14} />
                                        {t('flashcards.tapToReveal')}
                                    </div>
                                </div>

                                {/* Back */}
                                <div
                                    className="absolute inset-0 bg-surface border border-primary/20 rounded-3xl p-6 flex flex-col shadow-xl shadow-primary/5 overflow-y-auto"
                                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                                >
                                    {/* Afficher la réponse de l'utilisateur si elle existe */}
                                    {userAnswers[currentCardIndex] && (
                                        <div className="mb-4 pb-4 border-b border-white/10">
                                            <span className="text-xs text-text-muted uppercase tracking-wider block mb-2">{t('flashcards.yourAnswer')}</span>
                                            <p className="text-sm text-text-main/80 italic leading-relaxed">
                                                "{userAnswers[currentCardIndex]}"
                                            </p>
                                        </div>
                                    )}

                                    {/* La bonne réponse */}
                                    <div className={userAnswers[currentCardIndex] ? '' : 'flex-1 flex flex-col items-center justify-center text-center'}>
                                        <span className="text-sm text-primary font-bold uppercase tracking-wider mb-2 block">{t('flashcards.correctAnswer')}</span>
                                        <p className={`text-text-main leading-relaxed ${userAnswers[currentCardIndex] ? 'text-base' : 'text-lg text-center'}`}>
                                            {formatMath(cards[currentCardIndex].back)}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Controls */}
            <div className="mt-6 flex items-center justify-between px-4">
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

export default StudyFlashcards;
