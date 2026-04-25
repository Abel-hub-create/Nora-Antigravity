import React, { useState, useRef } from 'react';

export const RARITY_CONFIG = {
  commun:     { label: 'Commun',     color: '#9ca3af', bg: 'linear-gradient(160deg,#1a1a1a 0%,#0d0d0d 100%)', shine: false, stars: false },
  chill:      { label: 'Chill',      color: '#4ade80', bg: 'linear-gradient(160deg,#061a0c 0%,#04100a 100%)', shine: false, stars: false },
  rare:       { label: 'Rare',       color: '#60a5fa', bg: 'linear-gradient(160deg,#060f1f 0%,#040a15 100%)', shine: true,  stars: false },
  epique:     { label: 'Épique',     color: '#a78bfa', bg: 'linear-gradient(160deg,#0e0820 0%,#080515 100%)', shine: true,  stars: false },
  mythique:   { label: 'Mythique',   color: '#f87171', bg: 'linear-gradient(160deg,#1a0606 0%,#100404 100%)', shine: true,  stars: true  },
  legendaire: { label: 'Légendaire', color: '#fbbf24', bg: 'linear-gradient(160deg,#1a1000 0%,#100a00 100%)', shine: true,  stars: true  },
  dot:        { label: '.',          color: '#c4b5fd', bg: 'linear-gradient(160deg,#06041c 0%,#030212 100%)', shine: true,  stars: true  },
};

const SYMBOL = { commun:'◆', chill:'◈', rare:'✦', epique:'❋', mythique:'⬟', legendaire:'★', dot:'✦' };

const GLOW = { commun:0, chill:6, rare:12, epique:14, mythique:16, legendaire:20, dot:24 };

function Stars({ n, color }) {
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', borderRadius:'inherit' }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{
          position:'absolute',
          fontSize: 5,
          color,
          left: `${5 + Math.random()*88}%`,
          top: `${5 + Math.random()*88}%`,
          opacity: 0.5 + Math.random()*0.5,
          animation: `pulse ${1.4 + Math.random()}s ease-in-out ${Math.random()*2}s infinite alternate`,
        }}>✦</span>
      ))}
    </div>
  );
}

export default function Card({ card, scale = 1, onClick, onLongPress, showFlipHint = false }) {
  const [flipped, setFlipped] = useState(false);
  const cfg = RARITY_CONFIG[card?.rarity] ?? RARITY_CONFIG.commun;
  const pressTimer = useRef(null);
  const wasLong = useRef(false);

  const W = Math.round(180 * scale);
  const H = Math.round(270 * scale);

  const headerH = Math.round(20 * scale);
  const footerH = Math.round(36 * scale);
  const imgH    = H - headerH - footerH - 4;
  const glow    = (GLOW[card?.rarity] ?? 0) * scale;
  const pad     = Math.round(6 * scale);

  const borderW = Math.max(1.5, 1.8 * scale);
  const isDot = card?.rarity === 'dot';
  const dotBorder = Math.round(3 * scale);
  const faceBase = {
    position: 'absolute', inset: 0,
    borderRadius: Math.round(14 * scale),
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    overflow: 'hidden',
    border: isDot ? `${dotBorder}px solid #050010` : `${borderW}px solid ${cfg.color}`,
    background: cfg.bg,
    boxShadow: isDot
      ? `0 0 0 ${dotBorder + 2}px #1e3a8a, 0 0 0 ${dotBorder + 4}px #c4b5fd, 0 0 ${glow}px #c4b5fd66, 0 0 ${glow * 2}px #c4b5fd22`
      : glow
        ? `0 0 ${glow}px ${cfg.color}55, 0 0 ${glow*2}px ${cfg.color}18`
        : '0 4px 18px rgba(0,0,0,0.7)',
  };

  const textSz = (base) => Math.max(7, base * scale);

  const handlePointerDown = () => {
    wasLong.current = false;
    if (!onLongPress) return;
    pressTimer.current = setTimeout(() => {
      wasLong.current = true;
      onLongPress(card);
    }, 300);
  };
  const cancelLong = () => clearTimeout(pressTimer.current);
  const handleClick = () => {
    if (wasLong.current) { wasLong.current = false; return; }
    setFlipped(f => !f);
    onClick?.();
  };

  return (
    <div
      style={{ width:W, height:H, flexShrink:0, perspective:1000, cursor:'pointer' }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelLong}
      onPointerLeave={cancelLong}
      onPointerCancel={cancelLong}
      title={card?.card_name}
    >
      <div style={{
        width:'100%', height:'100%', position:'relative',
        transformStyle:'preserve-3d',
        transition:'transform 0.55s cubic-bezier(.4,.2,.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
      }}>

        {/* ── RECTO ── */}
        <div style={faceBase}>
          {cfg.shine && (
            <div className="card-shine" style={{ position:'absolute', inset:0, borderRadius:'inherit', zIndex:10, pointerEvents:'none' }} />
          )}
          {cfg.stars && <Stars n={Math.round(10*scale)} color={cfg.color} />}

          {/* Header — rareté haut-gauche seulement */}
          <div style={{
            height: headerH,
            display:'flex', alignItems:'center',
            padding: `0 ${pad}px`,
            background:'rgba(0,0,0,0.5)',
            borderBottom:`1px solid ${cfg.color}30`,
            position:'relative', zIndex:2,
          }}>
            <span style={{
              fontSize: textSz(8.5), fontWeight:800,
              color: cfg.color,
              display:'flex', alignItems:'center', gap:3,
              textShadow: `0 0 10px ${cfg.color}aa`,
              letterSpacing:'.02em',
            }}>
              {SYMBOL[card?.rarity]} {cfg.label}
            </span>
          </div>

          {/* Image */}
          <div style={{ height:imgH, overflow:'hidden', position:'relative', background:'rgba(255,255,255,0.06)' }}>
            <img
              src={`/assets/cards/${card?.image}`}
              alt={card?.author}
              style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', display:'block' }}
              onError={e => { e.target.style.display='none'; }}
            />
            <div style={{
              position:'absolute', bottom:0, left:0, right:0,
              height: Math.round(50*scale),
              background:'linear-gradient(to top,rgba(0,0,0,0.9),transparent)',
            }} />
          </div>

          {/* Footer — auteur centré */}
          <div style={{
            height: footerH,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,0.55)',
            borderTop:`1px solid ${cfg.color}30`,
            padding: `0 ${pad}px`,
            overflow:'hidden',
          }}>
            <span style={{
              fontSize: textSz(10), fontWeight:800,
              color: cfg.color,
              letterSpacing:'.06em', textTransform:'uppercase',
              textShadow:`0 0 12px ${cfg.color}99`,
              maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              display:'block',
            }}>{card?.author}</span>
            {showFlipHint && (
              <span style={{ fontSize: textSz(6.5), color:'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing:'.04em' }}>
                ↺ retourner
              </span>
            )}
          </div>
        </div>

        {/* ── VERSO ── */}
        <div style={{ ...faceBase, transform:'rotateY(180deg)', display:'flex', flexDirection:'column', padding: Math.round(10*scale) }}>
          {cfg.stars && <Stars n={Math.round(8*scale)} color={cfg.color} />}

          {/* Scrollable content — hidden scrollbar */}
          <div className="card-scroll-hidden" style={{
            flex:1, minHeight:0,
            overflowY:'auto', overflowX:'hidden',
            display:'flex', flexDirection:'column',
            scrollbarWidth:'none', msOverflowStyle:'none',
          }}>
            <p style={{ fontSize:textSz(8.5), fontStyle:'italic', color:'#fff', textAlign:'center', lineHeight:1.55, marginBottom:Math.round(8*scale), flexShrink:0 }}>
              "{card?.quote}"
            </p>

            <div style={{ height:1, flexShrink:0, background:`linear-gradient(to right,transparent,${cfg.color}80,transparent)`, marginBottom:Math.round(8*scale) }} />

            <p style={{ fontSize:textSz(7), color:'rgba(255,255,255,0.55)', textAlign:'center', lineHeight:1.45, flexShrink:0 }}>
              {card?.explanation}
            </p>
          </div>

          <p style={{ fontSize:textSz(7), color:cfg.color, textAlign:'center', paddingTop:Math.round(6*scale), flexShrink:0, opacity:.65, letterSpacing:'.08em' }}>
            {SYMBOL[card?.rarity]} {cfg.label}
          </p>
        </div>

      </div>
    </div>
  );
}
