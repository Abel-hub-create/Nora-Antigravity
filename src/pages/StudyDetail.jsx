import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Layers, Brain, Calendar, Trash2, Loader2, AlertCircle, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as syntheseService from '../services/syntheseService';
import useActiveTimer from '../hooks/useActiveTimer';

// Nombre de caractères par page pour la pagination
const CHARS_PER_PAGE = 2500;

const StudyDetail = () => {
    const { t, i18n } = useTranslation();
    // Track time spent reading the summary
    useActiveTimer('summary');
    const { id } = useParams();
    const navigate = useNavigate();
    const [synthese, setSynthese] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

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

    const totalPages = summaryPages.length;
    const hasMultiplePages = totalPages > 1;

    useEffect(() => {
        const loadSynthese = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await syntheseService.getSynthese(id);
                setSynthese(data);
            } catch (err) {
                setError(t('studyDetail.loadError'));
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadSynthese();
    }, [id, t]);

    const handleDelete = async () => {
        try {
            await syntheseService.deleteSynthese(id);
            navigate('/study');
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
        return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
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

    if (error || !synthese) {
        return (
            <div className="min-h-full bg-background p-6">
                <Link to="/study" className="inline-flex items-center gap-2 text-text-muted hover:text-text-main mb-6">
                    <ArrowLeft size={20} />
                    {t('common.back')}
                </Link>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="text-error mb-3" size={40} />
                    <p className="text-text-muted">{error || t('study.notFound')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-background p-4 pb-24">
            {/* Header */}
            <header className="flex items-center gap-3 mb-6">
                <Link
                    to="/study"
                    className="p-2 -ml-2 text-text-muted hover:text-text-main hover:bg-surface rounded-xl transition-colors"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-text-main truncate">
                        {synthese.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Calendar size={12} className="text-text-muted" />
                        <span className="text-xs text-text-muted">
                            {formatDate(synthese.created_at)}
                        </span>
                    </div>
                </div>
            </header>

            {/* Action Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3 mb-6"
            >
                <Link
                    to={`/study/${id}/flashcards`}
                    className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                        <Layers className="text-primary" size={24} />
                    </div>
                    <span className="font-medium text-text-main">{t('study.flashcardsButton')}</span>
                    <span className="text-xs text-text-muted">
                        {synthese.flashcards?.length || 0} {t('common.cards')}
                    </span>
                </Link>

                <Link
                    to={`/study/${id}/quiz`}
                    className="bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                    <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                        <Brain className="text-secondary" size={24} />
                    </div>
                    <span className="font-medium text-text-main">{t('study.quizButton')}</span>
                    <span className="text-xs text-text-muted">
                        {synthese.quizQuestions?.length || 0} {t('common.questions')}
                    </span>
                </Link>
            </motion.div>

            {/* Revision Button - Primary CTA */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-6"
            >
                <Link
                    to={`/study/${id}/revision`}
                    className="w-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 border-2 border-emerald-500/40 rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg shadow-emerald-500/10"
                >
                    <div className="w-14 h-14 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                        <BookOpen className="text-emerald-400" size={28} />
                    </div>
                    <div className="flex-1">
                        <span className="font-bold text-emerald-400 block text-lg">{t('revision.title')}</span>
                        <span className="text-xs text-text-main font-medium">{t('revision.subtitle')}</span>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">{t('revision.description')}</p>
                    </div>
                </Link>
            </motion.div>

            {/* Summary Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface rounded-2xl border border-white/5 p-5 mb-6 relative overflow-visible"
            >
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-text-main">{t('studyDetail.summary')}</h2>
                    {hasMultiplePages && (
                        <span className="text-xs text-text-muted">
                            {currentPage + 1} / {totalPages}
                        </span>
                    )}
                </div>

                <div className="relative overflow-visible">
                    {/* Contenu de la synthèse */}
                    <div className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                        {summaryPages[currentPage] || synthese.summary_content}
                    </div>

                    {/* Boutons de navigation */}
                    {hasMultiplePages && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                    currentPage === 0
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
                                        onClick={() => setCurrentPage(idx)}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                            idx === currentPage ? 'bg-primary' : 'bg-white/20 hover:bg-white/40'
                                        }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage === totalPages - 1}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                    currentPage === totalPages - 1
                                        ? 'text-text-muted/30 cursor-not-allowed'
                                        : 'text-primary bg-primary/10 hover:bg-primary/20'
                                }`}
                            >
                                <span className="text-sm">{t('common.next')}</span>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Delete Button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {showDeleteConfirm ? (
                    <div className="bg-error/10 border border-error/20 rounded-2xl p-4">
                        <p className="text-sm text-text-main mb-3">
                            {t('studyDetail.deleteConfirm')}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-2 bg-error text-white rounded-xl font-medium hover:bg-error/90 transition-colors"
                            >
                                {t('common.delete')}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2 bg-surface text-text-muted rounded-xl font-medium hover:bg-surface/80 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-3 text-error/70 hover:text-error flex items-center justify-center gap-2 transition-colors"
                    >
                        <Trash2 size={18} />
                        <span className="text-sm">{t('studyDetail.deleteSynthesis')}</span>
                    </button>
                )}
            </motion.div>
        </div>
    );
};

export default StudyDetail;
