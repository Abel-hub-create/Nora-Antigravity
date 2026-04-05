import { useEffect } from 'react';

// Calcule la position du soleil et met à jour les CSS vars de l'effet verre.
// Appelé une seule fois dans App — met à jour toutes les 60 secondes.

const applyTimeLight = () => {
    const now   = new Date();
    const hour  = now.getHours() + now.getMinutes() / 60;

    // Angle : 6h = gauche, 12h = haut, 18h = droite
    const angle = ((hour - 12) / 12) * Math.PI;
    const lx = Math.sin(angle);                  // -1 à 6h, 0 à midi, 1 à 18h
    const ly = -Math.abs(Math.cos(angle));        // -1 à midi, 0 à 6h/18h

    // Intensité lumineuse : max à midi, quasi nulle la nuit
    const dayFactor = Math.max(0, Math.sin(Math.max(0, ((hour - 6) / 12)) * Math.PI));
    const lo        = 0.03 + dayFactor * 0.08;   // 0.03 (nuit) → 0.11 (midi)

    // Position du reflet inset sur les cartes (direction soleil)
    const insetX = `${(lx * 3).toFixed(1)}px`;
    const insetY = `${(ly * 2).toFixed(1)}px`;

    // Lueur de fond : déplacement ample (15% → 85%) pour suivre le soleil
    const bgX = `${(50 + lx * 38).toFixed(1)}%`;
    const bgY = `${(10 - Math.abs(ly) * 6).toFixed(1)}%`;

    const r = document.documentElement;
    r.style.setProperty('--glass-inset-x',         insetX);
    r.style.setProperty('--glass-inset-y',         insetY);
    r.style.setProperty('--glass-border-alpha',    Math.min(0.14, lo * 1.6).toFixed(3));
    r.style.setProperty('--glass-highlight-alpha', lo.toFixed(3));
    r.style.setProperty('--glass-bg-x',           bgX);
    r.style.setProperty('--glass-bg-y',           bgY);
};

export const useTimeLight = () => {
    useEffect(() => {
        applyTimeLight();
        const id = setInterval(applyTimeLight, 60_000);
        return () => clearInterval(id);
    }, []);
};
