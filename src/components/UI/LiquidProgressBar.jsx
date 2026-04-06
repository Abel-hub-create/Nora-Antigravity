import React, { useEffect, useRef, useState, useMemo } from 'react';

// ─── Device tilt (singleton) ─────────────────────────────────────────────────
// gamma : inclinaison gauche/droite  -90 → +90
// beta  : inclinaison avant/arrière  0 (à plat) → 90 (portrait normal) → -90 (retourné)

const _tilt = { gamma: 0, beta: 90 };
const _listeners = new Set();

const _notify = (gamma, beta) => {
    _tilt.gamma = gamma;
    _tilt.beta  = beta;
    _listeners.forEach(fn => fn({ gamma, beta }));
};

// Flag : true dès qu'un vrai event gyroscope arrive
let _hasRealOrientation = false;

try {
    if (typeof window !== 'undefined' && typeof DeviceOrientationEvent !== 'undefined') {
        const onOrientation = (e) => {
            const gamma = e.gamma ?? 0;
            const beta  = e.beta  ?? 90;
            if (Math.abs(gamma) > 1 || Math.abs(beta - 90) > 2) _hasRealOrientation = true;
            if (_hasRealOrientation) _notify(gamma, beta);
        };

        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            window.addEventListener('touchstart', () => {
                DeviceOrientationEvent.requestPermission()
                    .then(s => {
                        if (s === 'granted')
                            window.addEventListener('deviceorientation', onOrientation, { passive: true });
                    })
                    .catch(() => {});
            }, { once: true, passive: true });
        } else {
            window.addEventListener('deviceorientation', onOrientation, { passive: true });
        }
    }
} catch (_) {}

// PC : oscillation automatique lente (si pas de vrai gyroscope)
if (typeof window !== 'undefined') {
    const _autoWave = () => {
        if (!_hasRealOrientation) {
            const t = Date.now() / 1000;
            // Deux sinusoïdes déphasées → mouvement naturel non répétitif
            const gamma = Math.sin(t * 0.4) * 18 + Math.sin(t * 0.17) * 8;
            _notify(gamma, 90);
        }
        requestAnimationFrame(_autoWave);
    };
    requestAnimationFrame(_autoWave);
}

const useTilt = () => {
    const [tilt, setTilt] = useState({ gamma: _tilt.gamma, beta: _tilt.beta });
    useEffect(() => {
        _listeners.add(setTilt);
        return () => _listeners.delete(setTilt);
    }, []);
    return tilt;
};

// ─── Physique liquide (RAF direct sur DOM — 0 re-render React) ────────────────
// Formule gravité :
//   forceX = sin(gamma) × sin(beta)
//   • sin(beta) ≈  1  → portrait normal    → pleine gravité gauche/droite
//   • sin(beta) ≈  0  → téléphone à plat  → pas d'effet
//   • sin(beta) ≈ -1  → retourné          → gravité inversée (liquid "tombe" de l'autre côté)

const useGravitySpring = (groupRef, getTilt, maxShift) => {
    const posRef = useRef(0);
    const velRef = useRef(0);
    const rafRef = useRef(null);
    const getTiltRef = useRef(getTilt);
    getTiltRef.current = getTilt;

    useEffect(() => {
        const tick = () => {
            const { gamma, beta } = getTiltRef.current();
            const gRad = (gamma * Math.PI) / 180;
            const bRad = (beta  * Math.PI) / 180;

            // Composante horizontale de la gravité dans le plan de la barre
            const target = Math.sin(gRad) * Math.sin(bRad) * maxShift;

            // Spring légèrement sous-amorti → effet slosh liquide
            const dx = target - posRef.current;
            velRef.current = (velRef.current + dx * 0.13) * 0.84;
            posRef.current += velRef.current;

            if (groupRef.current) {
                groupRef.current.setAttribute('transform', `translate(${posRef.current.toFixed(2)}, 0)`);
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [maxShift]); // eslint-disable-line
};

// ─── Chemin SVG de la vague ───────────────────────────────────────────────────

const buildWavePath = (fillW, height, extra = 120) => {
    if (fillW <= 0 || height <= 0) return '';
    const amp  = height * 0.3;
    const midY = height * 0.46;
    const wl   = Math.max(18, Math.min(50, fillW / 4));

    let d = `M ${-extra} ${height} L ${-extra} ${midY}`;
    let x = -extra;
    let sign = 1;
    while (x < fillW + extra) {
        const half = wl / 2;
        d += ` Q ${x + half / 2} ${midY + sign * amp} ${x + half} ${midY}`;
        x += half;
        sign = -sign;
    }
    return d + ` L ${fillW + extra} ${height} Z`;
};

// ─── Composant ────────────────────────────────────────────────────────────────

const LiquidProgressBar = ({ progress, height = 16, completed = false, className = '' }) => {
    const tilt = useTilt();
    const containerRef = useRef(null);
    const [barWidth, setBarWidth] = useState(0);
    const id = useRef(`liq-${Math.random().toString(36).slice(2, 8)}`).current;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(e => setBarWidth(e[0].contentRect.width));
        ro.observe(el);
        setBarWidth(el.offsetWidth);
        return () => ro.disconnect();
    }, []);

    const pct   = Math.max(0, Math.min(100, progress || 0));
    const fillW = barWidth > 0 ? (pct / 100) * barWidth : 0;

    // Max shift = 100px (extra buffer = 120px donc jamais de bord visible)
    const tiltRef = useRef(tilt);
    tiltRef.current = tilt;

    const waveGroupRef = useRef(null);
    useGravitySpring(waveGroupRef, () => tiltRef.current, 100);

    const wavePath = useMemo(() => buildWavePath(fillW, height), [fillW, height]);

    // Slime vert : vert forêt foncé → lime fluo
    const colorFrom = completed ? '#14532d' : '#166534';
    const colorTo   = completed ? '#86efac' : '#a3e635';

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden rounded-full border border-white/20 ${className}`}
            style={{ height }}
        >
            <div className="absolute inset-0 bg-surface" />
            <div className="absolute inset-0 bg-primary/10" />

            {barWidth > 0 && fillW > 0 && (
                <svg width={barWidth} height={height} className="absolute inset-0">
                    <defs>
                        <clipPath id={`${id}-c`}>
                            <rect x={0} y={0} width={fillW} height={height}
                                  rx={height / 2} ry={height / 2} />
                        </clipPath>
                        <linearGradient id={`${id}-g`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%"   stopColor={colorFrom} />
                            <stop offset="100%" stopColor={colorTo} />
                        </linearGradient>
                    </defs>

                    <g clipPath={`url(#${id}-c)`}>
                        {/* Base solide */}
                        <rect x={0} y={height * 0.44} width={fillW} height={height}
                              fill={`url(#${id}-g)`} />
                        {/* Vague gravitationnelle */}
                        <g ref={waveGroupRef}>
                            <path d={wavePath} fill={`url(#${id}-g)`} />
                            <path d={wavePath} fill="white" fillOpacity={0.1} />
                        </g>
                    </g>

                    {pct > 0 && pct < 100 && (
                        <line x1={fillW} y1={2} x2={fillW} y2={height - 2}
                              stroke="white" strokeWidth={1.5} strokeOpacity={0.4}
                              strokeLinecap="round" />
                    )}
                </svg>
            )}
        </div>
    );
};

export default LiquidProgressBar;
