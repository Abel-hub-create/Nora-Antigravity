import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, BookOpen, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card, { RARITY_CONFIG } from '../components/UI/Card';
import { cardService } from '../services/cardService';

const RARITY_ORDER = ['commun','chill','rare','epique','mythique','legendaire','dot'];

function SetBadge({ set }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
      set.completed
        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
        : 'bg-surface/40 border-white/8 text-text-muted'
    }`}>
      {set.completed && <Trophy size={12} className="text-amber-400 shrink-0" />}
      <span>{set.name}</span>
      <span className="opacity-70">{set.owned}/{set.total}</span>
    </div>
  );
}

const Collection = () => {
  const { t } = useTranslation();
  const [myCards, setMyCards]     = useState([]);
  const [catalog, setCatalog]     = useState([]);
  const [sets, setSets]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all'); // all | owned | rarity
  const [activeRarity, setActiveRarity] = useState(null);

  useEffect(() => {
    Promise.all([
      cardService.getMyCards(),
      cardService.getCatalog(),
    ]).then(([myData, catData]) => {
      setMyCards(myData.cards);
      setSets(myData.sets);
      setCatalog(catData.cards);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const ownedIds = new Set(myCards.map(c => c.id));

  const displayed = catalog
    .filter(c => {
      if (filter === 'owned') return ownedIds.has(c.id);
      if (activeRarity)       return c.rarity === activeRarity;
      return true;
    })
    .sort((a, b) => a.rarity_order - b.rarity_order || a.card_name.localeCompare(b.card_name));

  return (
    <div className="p-6 pt-8 pb-28 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Link to="/shop" className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-main">{t('collection.title')}</h1>
          <p className="text-sm text-text-muted">{ownedIds.size} / {catalog.length} {t('collection.cardsOwned')}</p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Sets */}
          {sets.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={15} className="text-primary" />
                <h2 className="text-xs font-bold text-text-main uppercase tracking-wider">{t('collection.sets')}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {sets.map(s => <SetBadge key={s.name} set={s} />)}
              </div>
            </section>
          )}

          {/* Filtres */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setFilter('all'); setActiveRarity(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filter === 'all' && !activeRarity
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-surface/40 border-white/8 text-text-muted'
              }`}
            >{t('collection.filterAll')}</button>

            <button
              onClick={() => { setFilter('owned'); setActiveRarity(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filter === 'owned'
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-surface/40 border-white/8 text-text-muted'
              }`}
            >{t('collection.filterOwned')} ({ownedIds.size})</button>

            {RARITY_ORDER.map(r => {
              const cfg = RARITY_CONFIG[r];
              const count = catalog.filter(c => c.rarity === r).length;
              if (!count) return null;
              return (
                <button
                  key={r}
                  onClick={() => { setActiveRarity(r); setFilter('rarity'); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={
                    activeRarity === r
                      ? { background: `${cfg.color}22`, borderColor: `${cfg.color}66`, color: cfg.color }
                      : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: cfg.color, opacity: 0.7 }
                  }
                >{cfg.label}</button>
              );
            })}
          </div>

          {/* Grille de cartes */}
          <div className="grid grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {displayed.map(card => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: ownedIds.has(card.id) ? 1 : 0.35, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="relative">
                    <Card card={card} scale={0.95} />
                    {!ownedIds.has(card.id) && (
                      <div className="absolute inset-0 rounded-[14px] flex items-center justify-center">
                        <span className="text-2xl">🔒</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-text-muted text-center">{card.card_name}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {displayed.length === 0 && (
            <div className="text-center py-12 text-text-muted text-sm">
              {t('collection.empty')}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Collection;
