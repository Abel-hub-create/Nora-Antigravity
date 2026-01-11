import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for countdown timer based on real time
 * Timer calculates remaining time from phase start timestamp
 * Works even when phone is locked or app is in background
 *
 * @param {number} totalDuration - Total duration of the phase in seconds
 * @param {string|Date} phaseStartedAt - Timestamp when the phase started
 * @param {function} onComplete - Callback when timer reaches 0
 * @param {boolean} isActive - Whether the timer should be active
 * @returns {Object} { timeRemaining, formattedTime }
 */
const useRevisionTimer = (totalDuration, phaseStartedAt, onComplete, isActive = true) => {
    const onCompleteRef = useRef(onComplete);
    const hasCompletedRef = useRef(false);
    const intervalRef = useRef(null);

    // Calculate time remaining based on real time
    const calculateTimeRemaining = useCallback(() => {
        if (!phaseStartedAt) return totalDuration;
        const startTime = new Date(phaseStartedAt).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        return Math.max(0, totalDuration - elapsed);
    }, [totalDuration, phaseStartedAt]);

    const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining);

    // Keep onComplete ref updated
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Reset hasCompleted when phase changes
    useEffect(() => {
        hasCompletedRef.current = false;
    }, [phaseStartedAt]);

    // Update timer every second and on visibility change
    useEffect(() => {
        if (!isActive) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const updateTimer = () => {
            const remaining = calculateTimeRemaining();
            setTimeRemaining(remaining);

            if (remaining === 0 && !hasCompletedRef.current && onCompleteRef.current) {
                hasCompletedRef.current = true;
                setTimeout(() => onCompleteRef.current(), 0);
            }
        };

        // Update immediately
        updateTimer();

        // Update every second
        intervalRef.current = setInterval(updateTimer, 1000);

        // Update on visibility change (when user returns to app)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateTimer();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [calculateTimeRemaining, isActive]);

    // Format time as MM:SS
    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        timeRemaining,
        formattedTime: formatTime(timeRemaining)
    };
};

export default useRevisionTimer;
