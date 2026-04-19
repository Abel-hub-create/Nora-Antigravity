import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Package, Sparkles, Lock, RefreshCw, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import AnimatedNumber from '../components/UI/AnimatedNumber';

const PackCard = ({ labelKey, descKey, price, emoji }) => {
  const { t } = useTranslation();
  const [spinning, setSpinning] = useState(false);

  const handleClick = () => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.96 }}
      className="relative bg-surface/60 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-primary/30 transition-colors text-left w-full"
    >
      <motion.span
        className="text-4xl"
        animate={spinning ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        {emoji}
      </motion.span>
      <div className="text-center">
        <p className="font-bold text-text-main text-sm">{t(labelKey)}</p>
        <p className="text-xs text-text-muted mt-0.5">{t(descKey)}</p>
      </div>
      <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full px-3 py-1">
        <Coins size={12} className="text-amber-400" />
        <span className="text-amber-300 text-xs font-bold">{price}</span>
      </div>
      {/* Bientôt disponible overlay */}
      <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
        <span className="text-xs font-semibold text-white/70 bg-white/10 px-3 py-1 rounded-full">
          {t('shop.soon')}
        </span>
      </div>
    </motion.button>
  );
};

const DailyCardSlot = ({ slot }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-surface/40 border border-white/8 rounded-xl p-4 flex flex-col items-center gap-2 relative">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Sparkles size={18} className="text-primary/60" />
      </div>
      <p className="text-[11px] text-text-muted text-center">{t('shop.card', { slot })}</p>
      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
        <Lock size={14} className="text-white/40" />
      </div>
    </div>
  );
};

const Shop = () => {
  const { t } = useTranslation();
  const { user } = useUser();

  const CARD_PACKS = [
    { labelKey: 'shop.basicPack',  descKey: 'shop.basicPackDesc',  price: 150, emoji: '📦' },
    { labelKey: 'shop.rarePack',   descKey: 'shop.rarePackDesc',   price: 350, emoji: '✨' },
    { labelKey: 'shop.legendPack', descKey: 'shop.legendPackDesc', price: 800, emoji: '🌟' },
  ];

  const REAL_MONEY_OFFERS = [
    { id: 'offer_3',  price: '3 €',  coins: 100,  emoji: '💰', popular: false },
    { id: 'offer_5',  price: '5 €',  coins: 220,  emoji: '💰', popular: true  },
    { id: 'offer_10', price: '10 €', coins: 800,  emoji: '💎', popular: false },
  ];

  return (
    <div className="p-6 pt-8 pb-28 space-y-8 max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">{t('shop.title')}</h1>
          <p className="text-sm text-text-muted mt-0.5">{t('shop.subtitle')}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-2">
          <Coins size={16} className="text-amber-400" />
          <AnimatedNumber value={user.coins ?? 0} duration={600} className="text-sm font-bold text-amber-300" />
        </div>
      </header>

      {/* Vendeur Aron */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface/50 border border-white/8 rounded-2xl p-5 flex items-center gap-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
          <img src="/aronsbg.png" alt="Aron" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="font-semibold text-text-main text-sm">Aron</p>
          <p className="text-xs text-text-muted mt-0.5">{t('shop.aronMessage')}</p>
        </div>
      </motion.div>

      {/* Section 1 — Packs de cartes */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Package size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-text-main uppercase tracking-wider">{t('shop.cardPacks')}</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {CARD_PACKS.map(pack => (
            <PackCard key={pack.labelKey} {...pack} />
          ))}
        </div>
      </section>

      {/* Section 2 — Cartes du jour */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-text-main uppercase tracking-wider">{t('shop.dailyCards')}</h2>
          </div>
          <span className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded-full">{t('shop.dailyRotation')}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <DailyCardSlot key={i} slot={i} />)}
        </div>
      </section>

      {/* Section 3 — Offres argent réel */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-text-main uppercase tracking-wider">{t('shop.offers')}</h2>
        </div>
        <div className="space-y-3">
          {REAL_MONEY_OFFERS.map(offer => (
            <div key={offer.id} className="relative bg-surface/50 border border-white/8 rounded-2xl p-4 flex items-center gap-4">
              {offer.popular && (
                <span className="absolute -top-2 left-4 text-[10px] font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full">
                  {t('shop.popular')}
                </span>
              )}
              <span className="text-3xl">{offer.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-text-main">{offer.price}</p>
                <p className="text-xs text-text-muted">{t('shop.coinsLabel', { coins: offer.coins })}</p>
              </div>
              <button disabled className="bg-primary/20 text-primary/60 text-xs font-semibold px-4 py-2 rounded-xl cursor-not-allowed">
                {t('shop.soon')}
              </button>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-text-muted mt-4 opacity-60">{t('shop.stripeNotice')}</p>
      </section>
    </div>
  );
};

export default Shop;
