import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Layers, Brain, Calendar, Trash2, Loader2, AlertCircle, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as syntheseService from '../services/syntheseService';
import useActiveTimer from '../hooks/useActiveTimer';
import { useAuth } from '../features/auth/hooks/useAuth';
import { formatMath } from '../utils/formatMath';
import { PremiumGate, usePremiumGate } from '../components/UI/PremiumGate';

const SECTION_EMOJIS = {
    définitions: '📖', definitions: '📖', vocabulaire: '📖', lexique: '📖',
    tableaux: '📊', tableau: '📊', données: '📊', statistiques: '📊', chiffres: '📊',
    méthodes: '🔧', methodes: '🔧', méthode: '🔧', technique: '🔧', procédé: '🔧',
    exemples: '💡', exemple: '💡', application: '💡', exercice: '💡',
    formules: '🧮', calculs: '🧮', calcul: '🧮', équation: '🧮', algorithme: '🧮',
    conclusion: '🎯', bilan: '🎯', synthèse: '🎯',
    introduction: '🚀', contexte: '🚀', présentation: '🚀',
    histoire: '🏛️', historique: '🏛️', chronologie: '🏛️', période: '🏛️', siècle: '🏛️',
    biologie: '🧬', cellule: '🧬', organisme: '🧬', gène: '🧬', ADN: '🧬',
    chimie: '🧪', réaction: '🧪', molécule: '🧪', atome: '🧪', composé: '🧪',
    physique: '⚡', énergie: '⚡', force: '⚡', lumière: '⚡', électricité: '⚡',
    géographie: '🌍', continent: '🌍', territoire: '🌍', carte: '🌍', région: '🌍',
    économie: '💰', marché: '💰', budget: '💰', prix: '💰', monnaie: '💰',
    guerre: '⚔️', conflit: '⚔️', bataille: '⚔️', armée: '⚔️',
    politique: '🏛️', gouvernement: '🏛️', état: '🏛️', loi: '🏛️',
    science: '🔬', recherche: '🔬', expérience: '🔬', observation: '🔬',
    math: '📐', algèbre: '📐', géométrie: '📐', fonction: '📐', vecteur: '📐',
    littérature: '📜', texte: '📜', auteur: '📜', roman: '📜', poème: '📜',
    philosophie: '🤔', pensée: '🤔', concept: '🤔', théorie: '🤔',
    propriété: '✅', caractéristique: '✅', avantage: '✅', inconvénient: '❌',
    attention: '⚠️', important: '⚠️', remarque: '⚠️', note: '📝',
    résumé: '✏️', rappel: '✏️',
};

const getSectionEmoji = (title) => {
    const lower = title.toLowerCase();
    for (const [key, emoji] of Object.entries(SECTION_EMOJIS)) {
        if (lower.includes(key)) return emoji;
    }
    return '🔹';
};

// Convertit le markdown en éléments React pour l'affichage
const renderMarkdown = (text) => {
    if (!text) return null;
    text = formatMath(text);
    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    const parseBold = (str) => {
        const parts = str.split(/\*\*(.+?)\*\*/g);
        return parts.map((part, idx) =>
            idx % 2 === 1
                ? <strong key={idx} className="text-text-main font-semibold">{part}</strong>
                : part
        );
    };

    while (i < lines.length) {
        const line = lines[i];

        // H2
        if (line.startsWith('## ')) {
            const title = line.slice(3).trim();
            const emoji = getSectionEmoji(title);
            elements.push(
                <div key={i} className={`${i > 0 ? 'mt-5' : ''} mb-2`}>
                    <h2 className="text-base font-bold text-text-main border-b border-white/10 pb-1">
                        {emoji} {title}
                    </h2>
                </div>
            );
        }
        // H3
        else if (line.startsWith('### ')) {
            const title = line.slice(4).trim();
            elements.push(
                <div key={i} className="mt-3 mb-1">
                    <h3 className="text-sm font-semibold text-primary/90">{title}</h3>
                </div>
            );
        }
        // Table row
        else if (line.startsWith('|') && line.endsWith('|')) {
            // Collect all table rows
            const tableRows = [];
            let j = i;
            while (j < lines.length && lines[j].startsWith('|')) {
                tableRows.push(lines[j]);
                j++;
            }
            const headers = tableRows[0].split('|').filter(c => c.trim() !== '').map(c => c.trim());
            const dataRows = tableRows.slice(2).map(r => r.split('|').filter(c => c.trim() !== '').map(c => c.trim()));
            elements.push(
                <div key={i} className="my-3 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr>
                                {headers.map((h, hi) => (
                                    <th key={hi} className="text-left px-2 py-1.5 bg-primary/10 text-primary font-semibold border border-white/10">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dataRows.map((row, ri) => (
                                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-white/3'}>
                                    {row.map((cell, ci) => (
                                        <td key={ci} className="px-2 py-1.5 text-text-muted border border-white/10">{parseBold(cell)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            i = j;
            continue;
        }
        // Bullet
        else if (line.match(/^[-*] /)) {
            const content = line.slice(2).trim();
            elements.push(
                <div key={i} className="flex gap-2 text-sm text-text-muted leading-relaxed ml-1">
                    <span className="shrink-0 text-primary/60 mt-0.5">•</span>
                    <span>{parseBold(content)}</span>
                </div>
            );
        }
        // Empty line
        else if (line.trim() === '') {
            elements.push(<div key={i} className="h-2" />);
        }
        // Normal paragraph
        else {
            elements.push(
                <p key={i} className="text-sm text-text-muted leading-relaxed">
                    {parseBold(line)}
                </p>
            );
        }
        i++;
    }
    return elements;
};

// Convertit le markdown en HTML pour le print
const markdownToHtml = (text) => {
    if (!text) return '';
    return text
        .split('\n')
        .map(line => {
            const bold = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            if (line.startsWith('## ')) {
                const title = line.slice(3).trim();
                const emoji = getSectionEmoji(title);
                return `<h2>${emoji} ${title}</h2>`;
            }
            if (line.startsWith('### ')) return `<h3>▸ ${line.slice(4).trim()}</h3>`;
            if (line.match(/^[-*] /)) return `<li>${bold(line.slice(2).trim())}</li>`;
            if (line.startsWith('|') && line.endsWith('|')) return `<tr>${line.split('|').filter(c=>c.trim()).map(c=>`<td>${c.trim()}</td>`).join('')}</tr>`;
            if (line.match(/^[|-]+$/)) return '';
            if (line.trim() === '') return '<br>';
            return `<p>${bold(line.trim())}</p>`;
        })
        .join('\n')
        .replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`)
        .replace(/(<tr>.*<\/tr>\n?)+/g, match => `<table>${match}</table>`);
};

// Mapping des matières avec leurs icônes
const SUBJECT_ICONS = {
    mathematics: '📐',
    french: '📚',
    physics: '⚡',
    chemistry: '🧪',
    biology: '🧬',
    history: '🏛️',
    geography: '🌍',
    english: '📖',
    dutch: '🌷'
};

// Nombre de caractères par page pour la pagination
const CHARS_PER_PAGE = 2000;

const StudyDetail = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { gateProps, showGate } = usePremiumGate();
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
        const localeMap = {
            fr: 'fr-FR',
            en: 'en-US'
        };
        const locale = localeMap[i18n.language] || 'en-US';
        return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const subjectLabel = synthese.subject ? t(`subjects.${synthese.subject}`) : '';
        const subjectIcon = synthese.subject ? (SUBJECT_ICONS[synthese.subject] || '📝') : '';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${synthese.title}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        padding: 40px;
                        line-height: 1.6;
                        color: #1a1a1a;
                    }
                    .header {
                        border-bottom: 2px solid #e5e5e5;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .title {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 10px;
                    }
                    .meta {
                        display: flex;
                        gap: 20px;
                        color: #666;
                        font-size: 14px;
                    }
                    .subject {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .content { font-size: 14px; }
                    .content h2 {
                        font-size: 16px; font-weight: bold; margin: 20px 0 6px;
                        padding-bottom: 4px; border-bottom: 1px solid #ddd; color: #111;
                    }
                    .content h3 {
                        font-size: 14px; font-weight: 600; margin: 12px 0 4px; color: #333;
                    }
                    .content p { margin: 4px 0; color: #333; line-height: 1.7; }
                    .content ul { margin: 4px 0 8px 16px; }
                    .content li { margin: 2px 0; color: #444; line-height: 1.6; }
                    .content br { display: block; margin: 6px 0; content: ''; }
                    .content table {
                        border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 13px;
                    }
                    .content td, .content th {
                        border: 1px solid #ccc; padding: 6px 10px; text-align: left;
                    }
                    .content th { background: #f0f0f0; font-weight: 600; }
                    .content tr:nth-child(even) { background: #fafafa; }
                    @media print {
                        body { padding: 20px; }
                        .content h2 { page-break-after: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="title">${synthese.title}</h1>
                    <div class="meta">
                        ${subjectLabel ? `<span class="subject">${subjectIcon} ${subjectLabel}</span>` : ''}
                        <span>${formatDate(synthese.created_at)}</span>
                    </div>
                </div>
                <div class="content">${markdownToHtml(synthese.summary_content)}</div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
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
                    <div className="flex items-center gap-3 mt-1">
                        {synthese.subject && (
                            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded-lg">
                                <span className="text-sm">{SUBJECT_ICONS[synthese.subject] || '📝'}</span>
                                <span className="text-xs font-medium">{t(`subjects.${synthese.subject}`)}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-text-muted" />
                            <span className="text-xs text-text-muted">
                                {formatDate(synthese.created_at)}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Action Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3 mb-6"
            >
                {user?.plan_limits?.has_flashcards !== 0 ? (
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
                ) : (
                    <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 opacity-50 cursor-pointer" onClick={() => showGate(t('premiumGate.features.flashcards'), t('premiumGate.features.flashcardsDesc'))}>
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                            <Layers className="text-text-muted" size={24} />
                        </div>
                        <span className="font-medium text-text-muted">{t('study.flashcardsButton')}</span>
                        <span className="text-xs text-text-muted">{t('studyDetail.premiumLabel')}</span>
                    </div>
                )}

                {user?.plan_limits?.has_quiz !== 0 ? (
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
                ) : (
                    <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 opacity-50 cursor-pointer" onClick={() => showGate(t('premiumGate.features.quiz'), t('premiumGate.features.quizDesc'))}>
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                            <Brain className="text-text-muted" size={24} />
                        </div>
                        <span className="font-medium text-text-muted">{t('study.quizButton')}</span>
                        <span className="text-xs text-text-muted">{t('studyDetail.premiumLabel')}</span>
                    </div>
                )}
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
                    <div className="flex items-center gap-3">
                        {hasMultiplePages && (
                            <span className="text-xs text-text-muted">
                                {currentPage + 1} / {totalPages}
                            </span>
                        )}
                        <button
                            onClick={handlePrint}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title={t('studyDetail.print')}
                        >
                            <Printer size={18} />
                        </button>
                    </div>
                </div>

                <div className="relative overflow-visible">
                    {/* Contenu de la synthèse */}
                    <div className="flex flex-col gap-0.5">
                        {renderMarkdown(summaryPages[currentPage] || synthese.summary_content)}
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
            <PremiumGate {...gateProps} />
        </div>
    );
};

export default StudyDetail;
