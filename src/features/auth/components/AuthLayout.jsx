import React, { useEffect } from 'react';

/**
 * AuthLayout - Wrapper for authentication pages
 * Forces light theme on login, register, and other auth pages
 * Note: Theme is restored by AuthContext.applyUserPreferences() after login
 */
const AuthLayout = ({ children }) => {
    useEffect(() => {
        // Force light theme on auth pages
        document.documentElement.setAttribute('data-theme', 'light');
        // No cleanup needed - AuthContext will apply user's theme from DB after login
    }, []);

    return <>{children}</>;
};

export default AuthLayout;
