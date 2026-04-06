import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, ChevronRight, Loader2, Plus } from 'lucide-react';
import * as exerciseSvc from '../services/exerciseService';
import LiquidProgressBar from '../components/UI/LiquidProgressBar';

const SUBJECT_EMOJIS = {
  mathematics: '📐', french: '📚', physics: '⚡', chemistry: '🧪',
  biology: '🧬', history: '🏛️', geography: '🌍', english: '🇬🇧', dutch: '🇳🇱'
};

const SUBJECT_NAMES = {
  mathematics: 'Mathématiques', french: 'Français', physics: 'Physique',
  chemistry: 'Chimie', biology: 'Biologie', history: 'Histoire',
  geography: 'Géographie', english: 'Anglais', dutch: 'Néerlandais'
};

export default function Exercises() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [exercises, setExercises] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const data = await exerciseSvc.getExercises();
      setExercises(data.exercises || []);
      setTotal(data.total || 0);
      setLimit(data.limit || 15);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await exerciseSvc.deleteExercise(id);
      setExercises(prev => prev.filter(e => e.id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-main">{t('exercises.title')}</h1>
          <p className="text-xs text-text-muted mt-0.5">{t('exercises.quota', { total, limit })}</p>
        </div>
        <button
          onClick={() => navigate('/assistant')}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary/20 border border-primary/30 text-primary text-sm rounded-xl hover:bg-primary/30 transition-colors mr-16"
        >
          <Plus size={15} />
          {t('exercises.monkModeBtn')}
        </button>
      </div>

      {/* Barre de quota — LiquidProgressBar vert */}
      <div className="mb-6">
        <LiquidProgressBar
          progress={(total / limit) * 100}
          height={6}
          completed={total >= limit}
        />
      </div>

      {exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center text-3xl">
            🧠
          </div>
          <div>
            <p className="text-text-main font-medium mb-1">{t('exercises.noExercises')}</p>
            <p className="text-text-muted text-sm">{t('exercises.noExercisesHint')}</p>
          </div>
          <button
            onClick={() => navigate('/assistant')}
            className="px-4 py-2 bg-primary text-white text-sm rounded-xl"
          >
            {t('exercises.openAssistant')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {exercises.map((ex, i) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
                className="bg-surface border border-white/5 rounded-2xl hover-lift"
              >
                {confirmDeleteId === ex.id ? (
                  <div className="p-4 bg-error/10 border border-error/20 rounded-2xl">
                    <p className="text-sm text-text-main mb-3">{t('exercises.deleteConfirm')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(ex.id)}
                        disabled={deletingId === ex.id}
                        className="flex-1 py-2 bg-error text-white text-sm rounded-xl"
                      >
                        {deletingId === ex.id ? <Loader2 size={14} className="animate-spin mx-auto" /> : t('exercises.delete')}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 py-2 bg-surface border border-white/10 text-text-muted text-sm rounded-xl"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-4 flex items-center gap-3 cursor-pointer transition-colors"
                    onClick={() => navigate(`/exercises/${ex.id}`)}
                  >
                    <span className="text-2xl shrink-0">{SUBJECT_EMOJIS[ex.subject] ?? '📖'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-main truncate">{ex.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-muted">{SUBJECT_NAMES[ex.subject] ?? ex.subject}</span>
                        <span className="text-text-muted/30">·</span>
                        <span className="text-xs text-text-muted">
                          {ex.item_count > 1
                            ? t('exercises.exerciseCountPlural', { count: ex.item_count })
                            : t('exercises.exerciseCount', { count: ex.item_count })}
                        </span>
                        <span className="text-text-muted/30">·</span>
                        <span className="text-xs text-text-muted">{formatDate(ex.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(ex.id); }}
                        className="p-2 text-text-muted hover:text-error transition-colors rounded-xl"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={18} className="text-text-muted" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
