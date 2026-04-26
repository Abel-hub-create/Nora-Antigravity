import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, RefreshCw, Loader2, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import AnimatedNumber from '../components/UI/AnimatedNumber';
import CoinIcon from '../components/UI/CoinIcon';
import Card, { RARITY_CONFIG } from '../components/UI/Card';
import BoosterOpenModal from '../components/UI/BoosterOpenModal';
import { cardService } from '../services/cardService';

const BOOSTER_SETS = [
  {
    key: 'mh',
    name: 'Mascarade Humaine',
    abbr: 'SET 1 · MH',
    color: '#a78bfa',
    frontImg: '/boostermh2.png',
    backImg: '/boosternoraback.png',
    fallbackImg: '/boosternorafront.png',
    packs: [
      { type: 'mh-one',  labelKey: 'shop.boosterOne',  descKey: 'shop.boosterOneDesc',  price: 100, count: 1  },
      { type: 'mh-five', labelKey: 'shop.boosterFive', descKey: 'shop.boosterFiveDesc', price: 400, count: 5  },
      { type: 'mh-ten',  labelKey: 'shop.boosterTen',  descKey: 'shop.boosterTenDesc',  price: 800, count: 10 },
    ],
  },
  {
    key: 'ds',
    name: 'Domination Silencieuse',
    abbr: 'SET 2 · DS',
    color: '#f87171',
    frontImg: '/boosterdsf2.png',
    backImg: '/boosterdsb2.png',
    fallbackImg: '/boosternorafront.png',
    packs: [
      { type: 'ds-one',  labelKey: 'shop.boosterOne',  descKey: 'shop.boosterOneDesc',  price: 100, count: 1  },
      { type: 'ds-five', labelKey: 'shop.boosterFive', descKey: 'shop.boosterFiveDesc', price: 400, count: 5  },
      { type: 'ds-ten',  labelKey: 'shop.boosterTen',  descKey: 'shop.boosterTenDesc',  price: 800, count: 10 },
    ],
  },
];

const REAL_MONEY_OFFERS = [
  { id: 'offer_3',  price: '3 €',  coins: 100,  emoji: '💰', popular: false },
  { id: 'offer_5',  price: '5 €',  coins: 220,  emoji: '💰', popular: true  },
  { id: 'offer_10', price: '10 €', coins: 800,  emoji: '💎', popular: false },
];

function BoosterCard({ booster, setColor, frontImg, fallbackImg, onOpen, loading }) {
  const { t } = useTranslation();
  const active = loading === booster.type;
  const [imgSrc, setImgSrc] = useState(frontImg);

  return (
    <motion.button
      whileTap={{ scale: .95 }}
      onClick={() => onOpen(booster.type)}
      disabled={!!loading}
      className="relative bg-surface/60 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-white/20 transition-colors w-full disabled:opacity-60"
    >
      <motion.img
        src={imgSrc}
        alt="Booster"
        onError={() => setImgSrc(fallbackImg)}
        style={{ width: 64, height: 'auto', objectFit: 'contain', filter: `drop-shadow(0 4px 12px ${setColor}55)` }}
        animate={active ? { rotate: [0, 10, -10, 10, -10, 0] } : { rotate: 0, y: [0, -4, 0] }}
        transition={active
          ? { duration: .5, ease: 'easeInOut' }
          : { rotate: { duration: 0 }, y: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } }
        }
      />
      <div className="text-center">
        <p className="font-bold text-text-main text-sm">{t(booster.labelKey)}</p>
        <p className="text-xs text-text-muted mt-0.5">{t(booster.descKey)}</p>
      </div>
      <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: `${setColor}18`, border: `1px solid ${setColor}40` }}>
        {active ? <Loader2 size={11} className="animate-spin" style={{ color: setColor }} /> : <CoinIcon size={13} />}
        <span className="text-xs font-bold" style={{ color: setColor }}>{booster.price}</span>
      </div>
    </motion.button>
  );
}

const isMobile = () => window.innerWidth < 768;

function DailyCardSlot({ card, onBuy, buying }) {
  const { t } = useTranslation();
  const cfg = RARITY_CONFIG[card.rarity] ?? RARITY_CONFIG.commun;
  const scale = isMobile() ? 0.58 : 0.88;
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative">
        <Card card={card} scale={scale} />
        {card.owned && (
          <div className="absolute inset-0 rounded-[14px] bg-black/65 flex items-center justify-center">
            <Check size={26} className="text-emerald-400" />
          </div>
        )}
      </div>
      <button
        onClick={() => onBuy(card)}
        disabled={card.owned || buying === card.id}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
        style={{ background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44` }}
      >
        {buying === card.id
          ? <Loader2 size={12} className="animate-spin" />
          : card.owned
            ? <><Check size={12} /> {t('shop.owned')}</>
            : <><CoinIcon size={12} /> {card.price ?? 10}</>
        }
      </button>
    </div>
  );
}

export default function Shop() {
  const { t } = useTranslation();
  const { user, setUser } = useUser();
  const [dailyCards, setDailyCards]     = useState([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [openLoading, setOpenLoading]   = useState(null);
  const [revealData, setRevealData]     = useState(null); // { packs, setKey }
  const [buyingCard, setBuyingCard]     = useState(null);
  const [toast, setToast]               = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    cardService.getDailyCards()
      .then(d => setDailyCards(d.cards))
      .catch(() => {})
      .finally(() => setDailyLoading(false));
  }, []);

  const handleOpenBooster = useCallback(async (type) => {
    setOpenLoading(type);
    try {
      const data = await cardService.openPack(type);
      setUser(u => ({ ...u, coins: (u.coins ?? 0) - data.cost }));
      const setKey = type.startsWith('mh') ? 'mh' : 'ds';
      setRevealData({ packs: data.packs, setKey });
    } catch (err) {
      const msg = err?.response?.data?.error;
      showToast(msg === 'NOT_ENOUGH_COINS' ? t('shop.notEnoughCoins') : (msg || t('errors.generic')), false);
    } finally {
      setOpenLoading(null);
    }
  }, [t, setUser]);

  const handleBuyDaily = useCallback(async (card) => {
    setBuyingCard(card.id);
    try {
      const data = await cardService.buyDailyCard(card.id);
      setUser(u => ({ ...u, coins: (u.coins ?? 0) - data.cost }));
      setDailyCards(prev => prev.map(c => c.id === card.id ? { ...c, owned: true } : c));
      showToast(t('shop.cardAdded'));
    } catch (err) {
      const msg = err?.response?.data?.error;
      showToast(msg === 'NOT_ENOUGH_COINS' ? t('shop.notEnoughCoins') : (msg || t('errors.generic')), false);
    } finally {
      setBuyingCard(null);
    }
  }, [t, setUser]);

  // Split daily cards by set
  const mhDaily = dailyCards.filter(c => c.set_abbr === 'MH');
  const dsDaily = dailyCards.filter(c => c.set_abbr === 'DS');

  const currentRevealSet = revealData ? BOOSTER_SETS.find(s => s.key === revealData.setKey) : null;

  return (
    <div className="p-6 pt-8 pb-28 space-y-8 max-w-lg mx-auto">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9998] px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl flex items-center gap-2 ${toast.ok ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}
          >
            {toast.ok ? <Check size={16} /> : <X size={16} />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booster reveal modal */}
      {revealData && currentRevealSet && (
        <BoosterOpenModal
          packs={revealData.packs}
          setKey={revealData.setKey}
          frontImg={currentRevealSet.frontImg}
          backImg={currentRevealSet.backImg}
          fallbackImg={currentRevealSet.fallbackImg}
          setColor={currentRevealSet.color}
          onClose={() => setRevealData(null)}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">{t('shop.title')}</h1>
          <p className="text-sm text-text-muted mt-0.5">{t('shop.subtitle')}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-2">
          <CoinIcon size={16} />
          <AnimatedNumber value={user.coins ?? 0} duration={600} className="text-sm font-bold text-amber-300" />
        </div>
      </header>

      {/* Aron */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface/50 border border-white/8 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
          <img src="/aronsbg.png" alt="Aron" className="w-full h-full object-contain" />
        </div>
        <p className="text-xs text-text-muted">{t('shop.aronMessage')}</p>
      </motion.div>

      {/* Sections Boosters */}
      {BOOSTER_SETS.map(set => (
        <section key={set.key}>
          {/* Set header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/8">
            <div className="w-1 h-6 rounded-full" style={{ background: set.color }} />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: set.color }}>{set.abbr}</p>
              <p className="text-sm font-bold text-text-main">{set.name}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {set.packs.map(b => (
              <BoosterCard
                key={b.type}
                booster={b}
                setColor={set.color}
                frontImg={set.frontImg}
                fallbackImg={set.fallbackImg}
                onOpen={handleOpenBooster}
                loading={openLoading}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Section Cartes du jour */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-text-main uppercase tracking-wider">{t('shop.dailyCards')}</h2>
          </div>
          <span className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded-full">{t('shop.dailyRotation')}</span>
        </div>

        {dailyLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            {/* MH row */}
            {mhDaily.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>SET 1 · MH</p>
                <div className="grid grid-cols-3 gap-5">
                  {mhDaily.map(card => (
                    <DailyCardSlot key={card.id} card={card} onBuy={handleBuyDaily} buying={buyingCard} />
                  ))}
                </div>
              </div>
            )}
            {/* DS row */}
            {dsDaily.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#f87171' }}>SET 2 · DS</p>
                <div className="grid grid-cols-3 gap-5">
                  {dsDaily.map(card => (
                    <DailyCardSlot key={card.id} card={card} onBuy={handleBuyDaily} buying={buyingCard} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section Offres argent réel */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-text-main uppercase tracking-wider">{t('shop.offers')}</h2>
        </div>
        <div className="space-y-3">
          {REAL_MONEY_OFFERS.map(offer => (
            <div key={offer.id} className="relative bg-surface/50 border border-white/8 rounded-2xl p-4 flex items-center gap-4">
              {offer.popular && (
                <span className="absolute -top-2 left-4 text-[10px] font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full">{t('shop.popular')}</span>
              )}
              <span className="text-3xl">{offer.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-text-main">{offer.price}</p>
                <p className="text-xs text-text-muted flex items-center gap-1"><CoinIcon size={11} /> {offer.coins}</p>
              </div>
              <button disabled className="bg-primary/20 text-primary/60 text-xs font-semibold px-4 py-2 rounded-xl cursor-not-allowed">{t('shop.soon')}</button>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-text-muted mt-4 opacity-60">{t('shop.stripeNotice')}</p>
      </section>
    </div>
  );
}
