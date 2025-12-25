import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Calendar, ChevronRight, Pencil, Check, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as syntheseService from '../services/syntheseService';

const Study = () => {
    const navigate = useNavigate();
    const [syntheses, setSyntheses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    const loadSyntheses = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await syntheseService.getAllSyntheses({ search: searchQuery });
            setSyntheses(response.syntheses || []);
        } catch (error) {
            console.error('Erreur chargement synthèses:', error);
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
            console.error('Erreur renommage:', error);
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

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Aujourd'hui";
        if (diffDays === 1) return 'Hier';
        if (diffDays < 7) return `Il y a ${diffDays} jours`;

        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const getSourceIcon = (sourceType) => {
        switch (sourceType) {
            case 'voice': return '🎤';
            case 'photo': return '📷';
            default: return '📝';
        }
    };

    return (
        <div className="min-h-full bg-background p-4 pb-24">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-text-main mb-1">Mes Études</h1>
                <p className="text-text-muted text-sm">
                    {syntheses.length} synthèse{syntheses.length !== 1 ? 's' : ''}
                </p>
            </header>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input
                    type="text"
                    placeholder="Rechercher une synthèse..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-text-main placeholder-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="animate-spin text-primary mb-3" size={32} />
                    <p className="text-text-muted">Chargement...</p>
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
                        {searchQuery ? 'Aucun résultat' : 'Aucune synthèse'}
                    </h3>
                    <p className="text-text-muted text-sm max-w-[250px]">
                        {searchQuery
                            ? 'Essayez avec d\'autres mots-clés'
                            : 'Importez du contenu pour créer votre première synthèse'}
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
                                <div
                                    className="p-4 flex items-center gap-3 cursor-pointer active:bg-white/5 transition-colors"
                                    onClick={() => navigate(`/study/${synthese.id}`)}
                                >
                                    {/* Icon */}
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                        <span className="text-xl">{getSourceIcon(synthese.source_type)}</span>
                                    </div>

                                    {/* Content */}
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
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default Study;
