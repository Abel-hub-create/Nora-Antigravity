import { useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';

const useActiveTimer = (activityType) => {
    const { updateTime } = useUser();
    const intervalRef = useRef(null);

    useEffect(() => {
        const startTimer = () => {
            if (intervalRef.current) return;
            intervalRef.current = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    updateTime(activityType, 1);
                }
            }, 1000);
        };

        const stopTimer = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                startTimer();
            } else {
                stopTimer();
            }
        };

        // Start initially
        startTimer();

        // Listen for visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            stopTimer();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [activityType, updateTime]);
};

export default useActiveTimer;
