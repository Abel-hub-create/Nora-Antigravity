import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/UI/Card';
import CardDetailModal from '../components/Cards/CardDetailModal';
import TradeRequestModal from '../components/Cards/TradeRequestModal';
import TradeInbox from '../components/Cards/TradeInbox';
import { cardService } from '../services/cardService';

const CARDS_PER_HALF = 4;
const FLIP_MS = 900;

const SET_COLORS = { MH: '#a78bfa', DS: '#f87171' };
const SET_NAMES  = { MH: 'Mascarade Humaine', DS: 'Domination Silencieuse' };
const SET_LABELS = { MH: 'SET 1 · MH', DS: 'SET 2 · DS' };
const SET_EMOJI  = { MH: '🎭', DS: '👁️' };

// ── Empty slot ──────────────────────────────────────────────────────────────

function EmptySlot({ slotNumber }) {
  return (
    <div style={{
      width: 120, height: 180, borderRadius: 12,
      border: '2px dashed rgba(255,255,255,0.10)',
      background: 'rgba(255,255,255,0.02)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 18, opacity: .14 }}>🃏</span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
        #{slotNumber}
      </span>
    </div>
  );
}

// ── Card slot ───────────────────────────────────────────────────────────────

function CardSlot({ card, onLongPress }) {
  const rarityColors = {
    commun: '#9ca3af', chill: '#4ade80', rare: '#60a5fa',
    epique: '#a78bfa', mythique: '#f87171', legendaire: '#fbbf24', dot: '#c4b5fd',
  };
  const color = rarityColors[card.rarity] ?? '#fff';
  return (
    <div className="relative inline-block">
      <Card card={card} scale={0.66} onLongPress={onLongPress} slotNumber={card.slot_number} />
      {card.count > 1 && (
        <div style={{
          position: 'absolute', top: 4, left: 4, zIndex: 20,
          background: 'rgba(0,0,0,0.82)', border: `1px solid ${color}`,
          borderRadius: 8, padding: '2px 6px',
          fontSize: 9, fontWeight: 800, color,
          letterSpacing: '.04em', lineHeight: 1.4,
          backdropFilter: 'blur(4px)',
        }}>
          ×{card.count}
        </div>
      )}
    </div>
  );
}

// ── Normal page half ────────────────────────────────────────────────────────

function PageFace({ cards: slots, startSlot, side, onLongPress }) {
  const isLeft = side === 'left';
  return (
    <div style={{
      width: '100%', height: '100%',
      background: isLeft
        ? 'linear-gradient(to right, #2a2540, #231f38)'
        : 'linear-gradient(to left, #2a2540, #231f38)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 18px', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px)',
      }} />
      <div style={{ position: 'absolute', top: 10, [isLeft ? 'left' : 'right']: 10, width: 6, height: 6, borderRadius: '50%', background: 'rgba(167,139,250,0.25)' }} />
      <div style={{ position: 'absolute', bottom: 10, [isLeft ? 'left' : 'right']: 10, width: 6, height: 6, borderRadius: '50%', background: 'rgba(167,139,250,0.25)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, position: 'relative', zIndex: 1 }}>
        {Array.from({ length: CARDS_PER_HALF }).map((_, i) => {
          const card = slots[startSlot + i];
          const slotNum = startSlot + i + 1;
          if (!card) return <EmptySlot key={i} slotNumber={slotNum} />;
          if (card.count === 0) return <EmptySlot key={card.id} slotNumber={slotNum} />;
          return <CardSlot key={card.id} card={card} onLongPress={onLongPress} />;
        })}
      </div>
    </div>
  );
}

// ── Separator half page ─────────────────────────────────────────────────────

function SeparatorFace({ side, setKey }) {
  const isLeft = side === 'left';
  const color  = SET_COLORS[setKey] ?? '#a78bfa';
  const label  = SET_LABELS[setKey] ?? '';
  const name   = SET_NAMES[setKey] ?? '';

  return (
    <div style={{
      width: '100%', height: '100%',
      background: isLeft
        ? `linear-gradient(to right, #1a1630, #231f38)`
        : `linear-gradient(to left, ${color}18, #231f38)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      padding: '24px 18px', position: 'relative',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06,
        background: `radial-gradient(ellipse at ${isLeft ? '80%' : '20%'} 50%, ${color} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {isLeft ? (
        /* Left: fin MH */
        <div style={{ textAlign: 'center', opacity: 0.45 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>{SET_EMOJI.MH}</div>
          <p style={{ fontSize: 10, color: SET_COLORS.MH, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>SET 1 · MH</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: '.06em' }}>Mascarade Humaine</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>11 cartes</p>
        </div>
      ) : (
        /* Right: début DS */
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>{SET_EMOJI.DS}</div>
          <div style={{ fontSize: 11, color, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '.04em', lineHeight: 1.2 }}>{name}</p>
          <div style={{ width: 40, height: 2, background: color, borderRadius: 2, margin: '10px auto', opacity: 0.7 }} />
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '.08em' }}>15 cartes</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

const BINDER_W = 580;
const BINDER_H = 440;
const NAV_H    = 96;

export default function CardBinder() {
  const { t } = useTranslation();
  const [cards, setCards]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [spread, setSpread]         = useState(0);
  const [binderScale, setBinderScale] = useState(1);
  const [flipState, setFlipState]   = useState(null);
  const [flipActive, setFlipActive] = useState(false);
  const flipPageRef = useRef(null);
  const timerRef    = useRef(null);

  const [detailCard, setDetailCard] = useState(null);
  const [tradeCard, setTradeCard]   = useState(null);
  const [showInbox, setShowInbox]   = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [tradeSent, setTradeSent]   = useState(false);

  useEffect(() => {
    if (!tradeSent) return;
    const timer = setTimeout(() => setTradeSent(false), 2000);
    return () => clearTimeout(timer);
  }, [tradeSent]);

  useEffect(() => {
    cardService.getCollection()
      .then(res => setCards(Array.isArray(res) ? res : (res.cards ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
    cardService.getInboxCount()
      .then(res => setInboxCount(res?.count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const update = () => {
      const avail = Math.min(window.innerWidth - 16, BINDER_W);
      setBinderScale(avail / BINDER_W);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Split cards by set
  const mhCards = cards.filter(c => c.set_abbr === 'MH');
  const dsCards = cards.filter(c => c.set_abbr === 'DS');
  const mhSpreads   = Math.max(1, Math.ceil(mhCards.length / (CARDS_PER_HALF * 2)));
  const dsSpreads   = Math.max(1, Math.ceil(dsCards.length / (CARDS_PER_HALF * 2)));
  const sepSpread   = mhSpreads; // index of the separator spread
  const totalSpreads = mhSpreads + 1 + dsSpreads;

  // Determine what to show for a given spread index
  const spreadInfo = (s) => {
    if (s < mhSpreads) return { type: 'cards', cards: mhCards, leftStart: s * 8, rightStart: s * 8 + 4 };
    if (s === sepSpread) return { type: 'separator' };
    const dsIdx = s - sepSpread - 1;
    return { type: 'cards', cards: dsCards, leftStart: dsIdx * 8, rightStart: dsIdx * 8 + 4 };
  };

  useEffect(() => {
    if (!flipState) return;
    const raf = requestAnimationFrame(() => setFlipActive(true));
    timerRef.current = setTimeout(() => {
      setSpread(flipState.to);
      setFlipState(null);
      setFlipActive(false);
    }, FLIP_MS + 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(timerRef.current); };
  }, [flipState]);

  const flip = (dir) => {
    if (flipState) return;
    const next = spread + dir;
    if (next < 0 || next >= totalSpreads) return;
    setFlipActive(false);
    setFlipState({ from: spread, to: next, dir });
  };

  const flipTransform = flipActive
    ? (flipState?.dir === 1 ? 'rotateY(-180deg)' : 'rotateY(180deg)')
    : 'rotateY(0deg)';

  const ownedCount = cards.filter(c => c.count > 0).length;

  // Render a page half given a spread index and side
  const renderHalf = (s, side, onLongPress) => {
    const info = spreadInfo(s);
    if (info.type === 'separator') {
      return <SeparatorFace side={side} setKey="DS" />;
    }
    const startSlot = side === 'left' ? info.leftStart : info.rightStart;
    return <PageFace cards={info.cards} startSlot={startSlot} side={side} onLongPress={onLongPress} />;
  };

  const cur  = flipState ? flipState.from : spread;
  const dest = flipState ? flipState.to   : null;

  // Set label for current spread (shown in navigation area)
  const curInfo = spreadInfo(spread);
  const currentSet = curInfo.type === 'cards'
    ? (curInfo.cards === mhCards ? 'MH' : 'DS')
    : null;

  return (
    <div className="flex flex-col items-center px-2"
      style={{
        background: 'var(--color-background)',
        minHeight: '100dvh',
        overflow: 'hidden',
        paddingBottom: '80px',
        paddingTop: 'clamp(16px, 5vh, 48px)',
      }}
    >
      <style>{`
        @keyframes flipShadow {
          0%, 100% { opacity: 0; }
          35%, 65% { opacity: 0.6; }
        }
        .flip-shadow { animation: flipShadow ${FLIP_MS}ms ease-in-out forwards; }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 w-full" style={{ maxWidth: BINDER_W }}>
        <BookOpen size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-text-main flex-1">{t('binder.title')}</h1>
        {!loading && (
          <span className="text-xs text-text-muted px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {ownedCount} / {cards.length}
          </span>
        )}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setShowInbox(true)}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/8"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Inbox size={16} className="text-text-muted" />
          {inboxCount > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ background: '#f87171', color: '#fff' }}
            >
              {inboxCount > 9 ? '9+' : inboxCount}
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* Trade sent toast */}
      <AnimatePresence>
        {tradeSent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[8000] px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(74,222,128,0.92)', color: '#fff' }}
          >
            {t('trade.requestSent')}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Binder */}
          <div style={{
            transformOrigin: 'top center',
            transform: `scale(${binderScale})`,
            width: BINDER_W,
            marginBottom: binderScale < 1 ? `${(binderScale - 1) * (BINDER_H + NAV_H)}px` : 0,
          }}>
            <div style={{ perspective: 2500, width: '100%' }}>
              <div style={{
                position: 'relative', width: '100%', height: BINDER_H,
                borderRadius: 18,
                boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.10)',
              }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 18,
                  display: 'flex', transformStyle: 'preserve-3d',
                }}>
                  {!flipState ? (
                    <>
                      <div style={{ flex: 1, height: '100%', borderRadius: '18px 0 0 18px', overflow: 'hidden' }}>
                        {renderHalf(cur, 'left', setDetailCard)}
                      </div>
                      <div style={{ flex: 1, height: '100%', borderRadius: '0 18px 18px 0', overflow: 'hidden' }}>
                        {renderHalf(cur, 'right', setDetailCard)}
                      </div>
                    </>
                  ) : flipState.dir === 1 ? (
                    <>
                      <div style={{ flex: 1, height: '100%', borderRadius: '18px 0 0 18px', overflow: 'hidden' }}>
                        {renderHalf(cur, 'left', setDetailCard)}
                      </div>
                      <div style={{ flex: 1, height: '100%', borderRadius: '0 18px 18px 0', overflow: 'hidden' }}>
                        {renderHalf(dest, 'right', setDetailCard)}
                      </div>
                      <div ref={flipPageRef} style={{
                        position: 'absolute', left: '50%', top: 0, width: '50%', height: '100%',
                        transformStyle: 'preserve-3d', transformOrigin: 'left center',
                        transform: flipTransform,
                        transition: flipActive ? `transform ${FLIP_MS}ms cubic-bezier(0.645,0.045,0.355,1.000)` : 'none',
                        zIndex: 10,
                      }}>
                        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: '0 18px 18px 0', overflow: 'hidden' }}>
                          {renderHalf(cur, 'right', setDetailCard)}
                          {flipActive && <div className="flip-shadow" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to right, rgba(0,0,0,0.65), rgba(0,0,0,0.15))' }} />}
                        </div>
                        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '18px 0 0 18px', overflow: 'hidden' }}>
                          {renderHalf(dest, 'left', setDetailCard)}
                          {flipActive && <div className="flip-shadow" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to left, rgba(0,0,0,0.65), rgba(0,0,0,0.15))' }} />}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1, height: '100%', borderRadius: '18px 0 0 18px', overflow: 'hidden' }}>
                        {renderHalf(dest, 'left', setDetailCard)}
                      </div>
                      <div style={{ flex: 1, height: '100%', borderRadius: '0 18px 18px 0', overflow: 'hidden' }}>
                        {renderHalf(cur, 'right', setDetailCard)}
                      </div>
                      <div ref={flipPageRef} style={{
                        position: 'absolute', left: 0, top: 0, width: '50%', height: '100%',
                        transformStyle: 'preserve-3d', transformOrigin: 'right center',
                        transform: flipTransform,
                        transition: flipActive ? `transform ${FLIP_MS}ms cubic-bezier(0.645,0.045,0.355,1.000)` : 'none',
                        zIndex: 10,
                      }}>
                        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: '18px 0 0 18px', overflow: 'hidden' }}>
                          {renderHalf(cur, 'left', setDetailCard)}
                          {flipActive && <div className="flip-shadow" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to left, rgba(0,0,0,0.65), rgba(0,0,0,0.15))' }} />}
                        </div>
                        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '0 18px 18px 0', overflow: 'hidden' }}>
                          {renderHalf(dest, 'right', setDetailCard)}
                          {flipActive && <div className="flip-shadow" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to right, rgba(0,0,0,0.65), rgba(0,0,0,0.15))' }} />}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Spine */}
                  <div style={{
                    position: 'absolute', left: '50%', top: 0, bottom: 0, width: 4,
                    background: currentSet
                      ? `linear-gradient(to bottom, ${SET_COLORS[currentSet]}66, ${SET_COLORS[currentSet]}44, ${SET_COLORS[currentSet]}66)`
                      : 'linear-gradient(to bottom, rgba(167,139,250,0.40), rgba(139,92,246,0.28), rgba(167,139,250,0.40))',
                    transform: 'translateX(-50%)', zIndex: 20,
                    boxShadow: '3px 0 10px rgba(0,0,0,0.5), -3px 0 10px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                    transition: 'background 0.4s',
                  }} />

                  {/* Set label — top left */}
                  {currentSet && (
                    <div style={{
                      position: 'absolute', top: 10, left: 14, zIndex: 30, pointerEvents: 'none',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <div style={{ width: 3, height: 14, borderRadius: 2, background: SET_COLORS[currentSet] }} />
                      <span style={{ fontSize: 9, color: SET_COLORS[currentSet], fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                        {SET_NAMES[currentSet]}
                      </span>
                    </div>
                  )}

                  {/* Page number */}
                  <div style={{
                    position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 30, pointerEvents: 'none',
                  }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '.12em' }}>
                      {spread + 1} / {totalSpreads}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-6 px-2">
                <button
                  onClick={() => flip(-1)}
                  disabled={spread === 0 || !!flipState}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface/60 border border-white/10 text-text-muted hover:text-text-main disabled:opacity-25 transition-all hover-lift"
                >
                  <ChevronLeft size={18} /> {t('binder.prevPage')}
                </button>

                <div className="flex gap-2 items-center">
                  {Array.from({ length: totalSpreads }).map((_, i) => {
                    const isSep = i === sepSpread;
                    const isDS  = i > sepSpread;
                    const dotColor = isSep ? '#6b7280' : isDS ? '#f87171' : '#a78bfa';
                    return (
                      <button
                        key={i}
                        onClick={() => { if (!flipState && i !== spread) setSpread(i); }}
                        style={{
                          width: i === spread ? 20 : 7,
                          height: 7,
                          borderRadius: 4,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all .25s',
                          background: i === spread ? dotColor : 'rgba(255,255,255,0.2)',
                        }}
                      />
                    );
                  })}
                </div>

                <button
                  onClick={() => flip(1)}
                  disabled={spread >= totalSpreads - 1 || !!flipState}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface/60 border border-white/10 text-text-muted hover:text-text-main disabled:opacity-25 transition-all hover-lift"
                >
                  {t('binder.nextPage')} <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Long press hint */}
          {ownedCount > 0 && (
            <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <span style={{ fontSize: 14 }}>👆</span>
              <span className="text-xs text-text-muted" style={{ opacity: 0.75 }}>
                {t('binder.longPressHint')}
              </span>
            </div>
          )}

          {/* Empty hint */}
          {ownedCount === 0 && (
            <p className="text-xs text-text-muted mt-8 text-center opacity-60 max-w-xs">
              {t('binder.hint')}
            </p>
          )}
        </>
      )}

      {/* Modals */}
      {detailCard && (
        <CardDetailModal
          card={detailCard}
          count={detailCard.count ?? 0}
          onClose={() => setDetailCard(null)}
          onTrade={() => { setTradeCard(detailCard); setDetailCard(null); }}
        />
      )}
      {tradeCard && (
        <TradeRequestModal
          card={tradeCard}
          onClose={() => setTradeCard(null)}
          onSent={() => { setTradeCard(null); setTradeSent(true); }}
        />
      )}
      {showInbox && (
        <TradeInbox
          onClose={() => setShowInbox(false)}
          onCountChange={setInboxCount}
          onExchangeDone={() =>
            cardService.getCollection()
              .then(res => setCards(Array.isArray(res) ? res : (res.cards ?? [])))
              .catch(() => {})
          }
        />
      )}
    </div>
  );
}
