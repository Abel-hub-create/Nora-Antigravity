import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for countdown timer with visibility-aware behavior
 * Timer continues counting down in background based on timestamps
 *
 * @param {number} initialTime - Initial time in seconds
 * @param {function} onComplete - Callback when timer reaches 0
 * @param {boolean} isActive - Whether the timer should be active
 * @returns {Object} { timeRemaining, setTimeRemaining, formattedTime }
 */
const useRevisionTimer = (initialTime, onComplete, isActive = true) => {
    const [timeRemaining, setTimeRemaining] = useState(initialTime);
    const intervalRef = useRef(null);
    const lastTickRef = useRef(Date.now());
    const onCompleteRef = useRef(onComplete);

    // Keep onComplete ref updated
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Tick function - decrements timer by 1 second
    const tick = useCallback(() => {
        if (document.visibilityState === 'visible') {
            setTimeRemaining(prev => {
                const newTime = Math.max(0, prev - 1);
                if (newTime === 0 && onCompleteRef.current) {
                    // Use setTimeout to avoid state update during render
                    setTimeout(() => onCompleteRef.current(), 0);
                }
                return newTime;
            });
            lastTickRef.current = Date.now();
        }
    }, []);

    // Handle visibility change (recalculate elapsed time when returning)
    const handleVisibilityChange = useCallback(() => {
        if (document.visibilityState === 'visible') {
            const elapsed = Math.floor((Date.now() - lastTickRef.current) / 1000);
            setTimeRemaining(prev => {
                const newTime = Math.max(0, prev - elapsed);
                if (newTime === 0 && prev > 0 && onCompleteRef.current) {
                    setTimeout(() => onCompleteRef.current(), 0);
                }
                return newTime;
            });
            lastTickRef.current = Date.now();
        }
    }, []);

    // Start/stop timer based on isActive
    useEffect(() => {
        if (!isActive) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Start interval
        lastTickRef.current = Date.now();
        intervalRef.current = setInterval(tick, 1000);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [tick, handleVisibilityChange, isActive]);

    // Format time as MM:SS
    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        timeRemaining,
        setTimeRemaining,
        formattedTime: formatTime(timeRemaining)
    };
};

export default useRevisionTimer;
