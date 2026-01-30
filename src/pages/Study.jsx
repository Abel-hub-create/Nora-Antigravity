import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Calendar, ChevronRight, Pencil, Check, X, Loader2, Award, Trash2, Circle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as syntheseService from '../services/syntheseService';

const Study = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [syntheses, setSyntheses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    // États pour la sélection et suppression
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteMode, setDeleteMode] = useState(null); // 'all' ou 'selected'
    const [isDeleting, setIsDeleting] = useState(false);

    const loadSyntheses = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await syntheseService.getAllSyntheses({ search: searchQuery });
            setSyntheses(response.syntheses || []);
        } catch (error) {
            console.error('Error loading syntheses:', error);
            setSyntheses([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            loadSyntheses();
        }, 300);
        return () => clearTimeout(debounce);
    }, [loadSyntheses]);

    const handleRename = async (id) => {
        if (!editTitle.trim()) return;
        try {
            await syntheseService.updateTitle(id, editTitle.trim());
            setSyntheses(prev =>
                prev.map(s => s.id === id ? { ...s, title: editTitle.trim() } : s)
            );
            setEditingId(null);
        } catch (error) {
            console.error('Error renaming:', error);
        }
    };

    const startEditing = (synthese) => {
        setEditingId(synthese.id);
        setEditTitle(synthese.title);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditTitle('');
    };

    // Fonctions de sélection
    const toggleSelection = (id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    // Fonctions de suppression
    const handleDeleteAll = () => {
        setDeleteMode('all');
        setShowDeleteConfirm(true);
    };

    const handleDeleteSelected = () => {
        setDeleteMode('selected');
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            const idsToDelete = deleteMode === 'all'
                ? syntheses.map(s => s.id)
                : Array.from(selectedIds);

            await syntheseService.deleteMultipleSyntheses(idsToDelete);

            // Mettre à jour la liste locale
            if (deleteMode === 'all') {
                setSyntheses([]);
            } else {
                setSyntheses(prev => prev.filter(s => !selectedIds.has(s.id)));
            }

            clearSelection();
            setShowDeleteConfirm(false);
            setDeleteMode(null);
        } catch (error) {
            console.error('Error deleting syntheses:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setDeleteMode(null);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const localeMap = {
            fr: 'fr-FR',
            en: 'en-US',
            es: 'es-ES',
            zh: 'zh-CN'
        };
        const locale = localeMap[i18n.language] || 'en-US';
        return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="min-h-full bg-background p-4 pb-24">
            {/* Header */}
            <header className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-text-main mb-1">{t('study.title')}</h1>
                        <p className="text-text-muted text-sm">
                            {syntheses.length === 1
                                ? t('study.count', { count: syntheses.length })
                                : t('study.countPlural', { count: syntheses.length })}
                        </p>
                    </div>

                    {/* Boutons de suppression */}
                    {syntheses.length > 0 && (
                        <div className="flex items-center gap-2">
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={handleDeleteSelected}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-error/20 text-error text-sm font-medium rounded-xl hover:bg-error/30 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    <span>{t('study.deleteSelected', { count: selectedIds.size })}</span>
                                </button>
                            )}
                            <button
                                onClick={handleDeleteAll}
                                className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-colors"
                                title={t('study.deleteAll')}
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Info sélection */}
                {selectedIds.size > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-primary">
                            {t('study.selectedCount', { count: selectedIds.size })}
                        </span>
                        <button
                            onClick={clearSelection}
                            className="text-sm text-text-muted hover:text-text-main transition-colors"
                        >
                            {t('study.clearSelection')}
                        </button>
                    </div>
                )}
            </header>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input
                    type="text"
                    placeholder={t('study.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-text-main placeholder-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="animate-spin text-primary mb-3" size={32} />
                    <p className="text-text-muted">{t('common.loading')}</p>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && syntheses.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                >
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4">
                        <FileText className="text-text-muted" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-text-main mb-2">
                        {searchQuery ? t('study.noResults') : t('study.noSyntheses')}
                    </h3>
                    <p className="text-text-muted text-sm max-w-[250px]">
                        {searchQuery
                            ? t('study.tryOtherKeywords')
                            : t('study.importContent')}
                    </p>
                </motion.div>
            )}

            {/* Syntheses List */}
            <AnimatePresence mode="popLayout">
                {!isLoading && syntheses.map((synthese, index) => (
                    <motion.div
                        key={synthese.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                        className="mb-3"
                    >
                        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
                            {/* Editing Mode */}
                            {editingId === synthese.id ? (
                                <div className="p-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="flex-1 bg-background border border-primary/30 rounded-xl py-2 px-3 text-text-main focus:outline-none focus:border-primary"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRename(synthese.id);
                                                if (e.key === 'Escape') cancelEditing();
                                            }}
                                        />
                                        <button
                                            onClick={() => handleRename(synthese.id)}
                                            className="p-2 bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition-colors"
                                        >
                                            <Check size={20} />
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            className="p-2 bg-error/20 text-error rounded-xl hover:bg-error/30 transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Normal View */
                                <div className="p-4">
                                    <div className="flex items-center gap-3">
                                        {/* Cercle de sélection */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelection(synthese.id);
                                            }}
                                            className="shrink-0 transition-colors"
                                        >
                                            {selectedIds.has(synthese.id) ? (
                                                <CheckCircle2 size={24} className="text-primary" />
                                            ) : (
                                                <Circle size={24} className="text-text-muted hover:text-primary" />
                                            )}
                                        </button>

                                        {/* Contenu cliquable */}
                                        <div
                                            className="flex-1 flex items-center gap-3 cursor-pointer"
                                            onClick={() => navigate(`/study/${synthese.id}`)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-text-main truncate">
                                                    {synthese.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Calendar size={12} className="text-text-muted" />
                                                    <span className="text-xs text-text-muted">
                                                        {formatDate(synthese.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditing(synthese);
                                                }}
                                                className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <ChevronRight className="text-text-muted shrink-0" size={20} />
                                        </div>
                                    </div>

                                    {/* Badge maîtrisée en bas */}
                                    {synthese.mastery_score === 100 && (
                                        <div className="mt-3 pt-3 border-t border-white/5 ml-9">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/20 text-success text-xs font-medium rounded-full">
                                                <Award size={12} />
                                                {t('study.mastered')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Modal de confirmation de suppression */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface rounded-2xl p-6 max-w-sm w-full"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-error/20 rounded-full flex items-center justify-center">
                                    <Trash2 size={20} className="text-error" />
                                </div>
                                <h3 className="text-lg font-semibold text-text-main">
                                    {t('study.confirmDeleteTitle')}
                                </h3>
                            </div>

                            <p className="text-text-muted mb-6">
                                {deleteMode === 'all'
                                    ? t('study.confirmDeleteAll', { count: syntheses.length })
                                    : t('study.confirmDeleteSelected', { count: selectedIds.size })}
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={cancelDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-background text-text-main rounded-xl font-medium hover:bg-background/80 transition-colors disabled:opacity-50"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-error text-white rounded-xl font-medium hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            {t('common.deleting')}
                                        </>
                                    ) : (
                                        t('common.delete')
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Study;
