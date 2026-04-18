import React from 'react';
import { useTranslation } from 'react-i18next';

const SUBJECTS = [
  'mathematics', 'french',   'physics',
  'chemistry',   'biology',  'history',
  'geography',   'english',  'dutch',
];

const SHORT_FR = {
  mathematics: 'Maths',   french: 'Français',  physics: 'Physique',
  chemistry:   'Chimie',  biology: 'Bio',       history: 'Histoire',
  geography:   'Géo',     english: 'Anglais',   dutch:   'Néerl.',
};
const SHORT_EN = {
  mathematics: 'Maths',   french: 'French',     physics: 'Physics',
  chemistry:   'Chem.',   biology: 'Bio',        history: 'History',
  geography:   'Geo',     english: 'English',    dutch:   'Dutch',
};

const SUBJECT_COLORS = {
  mathematics: '#f87171',
  french:      '#c084fc',
  physics:     '#fbbf24',
  chemistry:   '#34d399',
  biology:     '#4ade80',
  history:     '#fb923c',
  geography:   '#22d3ee',
  english:     '#60a5fa',
  dutch:       '#f472b6',
};

const SIZE   = 140;
const CX     = SIZE / 2;
const CY     = SIZE / 2;
const R      = 36;
const LABEL  = 15;
const N      = SUBJECTS.length;
const RINGS  = [0.33, 0.66, 1];

const rad = (deg) => (deg * Math.PI) / 180;
const angle = (i) => rad(-90 + (360 / N) * i);

const pt = (i, ratio = 1) => ({
  x: CX + R * ratio * Math.cos(angle(i)),
  y: CY + R * ratio * Math.sin(angle(i)),
});

const polyPoints = (ratios) =>
  ratios.map((r, i) => `${pt(i, r).x},${pt(i, r).y}`).join(' ');

export default function SubjectRadar({ scores = [] }) {
  const { i18n } = useTranslation();
  const SHORT = i18n.language === 'fr' ? SHORT_FR : SHORT_EN;

  const ratioMap = {};
  scores.forEach(({ subject, score }) => {
    ratioMap[subject] = score / 100;
  });

  const dataRatios = SUBJECTS.map(s => ratioMap[s] ?? 0);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-full"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="radar-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Grid rings ── */}
      {RINGS.map((ratio) => (
        <polygon
          key={ratio}
          points={polyPoints(SUBJECTS.map(() => ratio))}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1"
        />
      ))}

      {/* ── Axis lines ── */}
      {SUBJECTS.map((_, i) => {
        const tip = pt(i);
        return (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={tip.x} y2={tip.y}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />
        );
      })}

      {/* ── Axis highlights pour matières actives ── */}
      {SUBJECTS.map((s, i) => {
        const ratio = ratioMap[s] ?? 0;
        if (ratio === 0) return null;
        const tip = pt(i, ratio);
        return (
          <line
            key={`hl-${i}`}
            x1={CX} y1={CY}
            x2={tip.x} y2={tip.y}
            stroke={SUBJECT_COLORS[s]}
            strokeWidth="1.5"
            strokeOpacity="0.35"
          />
        );
      })}

      {/* ── Data polygon ── */}
      <polygon
        points={polyPoints(dataRatios)}
        fill="rgba(56,189,248,0.30)"
        stroke="rgba(125,211,252,1)"
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#radar-glow)"
      />
      {/* Couche lumineuse intérieure */}
      <polygon
        points={polyPoints(dataRatios)}
        fill="rgba(186,230,253,0.15)"
        stroke="none"
      />

      {/* ── Points lumineux sur chaque axe actif ── */}
      {SUBJECTS.map((s, i) => {
        const ratio = ratioMap[s] ?? 0;
        if (ratio === 0) return null;
        const tip = pt(i, ratio);
        return (
          <g key={`dot-${i}`}>
            {/* halo */}
            <circle cx={tip.x} cy={tip.y} r="5" fill={SUBJECT_COLORS[s]} opacity="0.25" />
            {/* point */}
            <circle cx={tip.x} cy={tip.y} r="2.5" fill={SUBJECT_COLORS[s]} filter="url(#radar-glow)" />
          </g>
        );
      })}

      {/* ── Labels ── */}
      {SUBJECTS.map((s, i) => {
        const a   = angle(i);
        const lx  = CX + (R + LABEL) * Math.cos(a);
        const ly  = CY + (R + LABEL) * Math.sin(a);
        const cos = Math.cos(a);
        const sin = Math.sin(a);

        const anchor   = cos >  0.2 ? 'start' : cos < -0.2 ? 'end'     : 'middle';
        const baseline = sin < -0.2 ? 'auto'  : sin >  0.2 ? 'hanging' : 'middle';
        const hasData  = (ratioMap[s] ?? 0) > 0;

        return (
          <text
            key={i}
            x={lx} y={ly}
            textAnchor={anchor}
            dominantBaseline={baseline}
            fontSize="8"
            fontWeight={hasData ? '700' : '400'}
            fill={SUBJECT_COLORS[s]}
          >
            {SHORT[s]}
          </text>
        );
      })}
    </svg>
  );
}
