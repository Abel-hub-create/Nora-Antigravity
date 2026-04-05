import { useEffect, useRef, useState } from 'react';

const easeOut = (t) => 1 - Math.pow(1 - t, 3); // cubic ease-out

/**
 * AnimatedNumber — compte de 0 (ou de la valeur précédente) jusqu'à `value`
 * @param {number} value     valeur cible
 * @param {number} duration  durée de l'animation en ms (défaut 1200)
 * @param {string} className classes Tailwind supplémentaires
 */
const AnimatedNumber = ({ value, duration = 1200, className = '' }) => {
    const [displayed, setDisplayed] = useState(0);
    const rafRef  = useRef(null);
    const startTs = useRef(null);
    const fromRef = useRef(0);

    useEffect(() => {
        const from = fromRef.current;
        const to   = Number(value) || 0;
        if (from === to) return;

        cancelAnimationFrame(rafRef.current);
        startTs.current = null;

        const animate = (ts) => {
            if (startTs.current === null) startTs.current = ts;
            const t       = Math.min((ts - startTs.current) / duration, 1);
            const current = Math.round(from + (to - from) * easeOut(t));
            setDisplayed(current);
            if (t < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                fromRef.current = to;
            }
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [value, duration]);

    return <span className={className}>{displayed}</span>;
};

export default AnimatedNumber;
