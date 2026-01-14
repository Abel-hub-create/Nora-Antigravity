import React, { useState, useEffect } from 'react';
import { ArrowLeft, Layers, Brain, Calendar, Trash2, Loader2, AlertCircle, BookOpen, Award } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as syntheseService from '../services/syntheseService';
import useActiveTimer from '../hooks/useActiveTimer';

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
                className="bg-surface rounded-2xl border border-white/5 p-5 mb-6 relative"
            >
                <h2 className="font-semibold text-text-main mb-3">{t('studyDetail.summary')}</h2>
                <div className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                    {synthese.summary_content}
                </div>
                {/* Badge maîtrisée en bas à gauche */}
                {synthese.mastery_score === 100 && (
                    <div className="absolute bottom-3 left-3">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-success/20 text-success text-xs font-medium rounded-full border border-success/30">
                            <Award size={14} />
                            {t('study.mastered')}
                        </span>
                    </div>
                )}
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
