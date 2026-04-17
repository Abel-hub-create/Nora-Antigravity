import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import * as authService from '../services/authService';
import i18n from '../../../i18n';
import api from '../../../lib/api';

// Apply user preferences (theme and language)
const applyUserPreferences = (user) => {
  // Use saved theme, or fall back to system preference
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', user?.theme || systemTheme);
  if (user?.language) {
    i18n.changeLanguage(user.language);
  }
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  // Check if user is logged in on mount - DB is the only source of truth
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Fetch user data directly from backend (DB)
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        // Apply user's saved preferences
        applyUserPreferences(currentUser);
      } catch {
        // Not authenticated
        setUser(null);
        localStorage.removeItem('accessToken');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Refresh user data when tab becomes visible (picks up plan changes from admin)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch {
          // Silently ignore ��� don't log out the user on a failed refresh
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      setError(null);
      const userData = await authService.login(credentials);
      setUser(userData);
      // Apply user's saved preferences after login
      applyUserPreferences(userData);
      return userData;
    } catch (err) {
      const code = err.response?.data?.code;
      let message;
      if (code === 'EMAIL_NOT_VERIFIED') {
        message = i18n.t('auth.emailNotVerified');
      } else if (code === 'INVALID_CREDENTIALS') {
        message = i18n.t('auth.invalidCredentials');
      } else if (code === 'ACCOUNT_BANNED') {
        message = err.response?.data?.reason || i18n.t('errors.accountBanned');
      } else {
        message = err.response?.data?.error || i18n.t('errors.loginFailed');
      }
      setError(message);
      setErrorCode(code || null);
      throw new Error(message);
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    try {
      setError(null);
      const userData = await authService.loginWithGoogle(credential);
      setUser(userData);
      // Apply user's saved preferences after login
      applyUserPreferences(userData);
      return userData;
    } catch (err) {
      const code = err.response?.data?.code;
      let message;
      if (code === 'ACCOUNT_BANNED') {
        message = i18n.t('errors.accountBanned');
      } else {
        message = err.response?.data?.error || i18n.t('errors.googleLoginFailed');
      }
      setError(message);
      setErrorCode(code || null);
      throw new Error(message);
    }
  }, []);

  const loginWithApple = useCallback(async (identityToken, appleUser) => {
    try {
      setError(null);
      const userData = await authService.loginWithApple(identityToken, appleUser);
      setUser(userData);
      applyUserPreferences(userData);
      return userData;
    } catch (err) {
      const message = err.response?.data?.error || i18n.t('errors.appleLoginFailed');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (data) => {
    try {
      setError(null);
      const result = await authService.register(data);
      // Don't set user - they need to verify email first
      return result;
    } catch (err) {
      const code = err.response?.data?.code;
      let message;
      if (code === 'EMAIL_ALREADY_VERIFIED') {
        message = i18n.t('auth.emailAlreadyUsedVerified');
      } else if (code === 'EMAIL_NOT_VERIFIED') {
        message = i18n.t('auth.emailAlreadyUsed');
      } else {
        message = err.response?.data?.error || i18n.t('errors.registerFailed');
      }
      setError(message);
      setErrorCode(code || null);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const forgotPassword = useCallback(async (email, language) => {
    try {
      setError(null);
      return await authService.forgotPassword(email, language);
    } catch (err) {
      const message = err.response?.data?.error || i18n.t('errors.requestFailed');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    try {
      setError(null);
      return await authService.resetPassword(token, password);
    } catch (err) {
      const message = err.response?.data?.error || i18n.t('errors.resetFailed');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  // Sync user data to backend and update local state with response
  const syncUserData = useCallback(async (userData) => {
    try {
      const updatedUser = await authService.syncUserData(userData);
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('Failed to sync user data:', err);
      throw err;
    }
  }, []);

  const updateProfile = useCallback(async ({ name, avatar }) => {
    try {
      setError(null);
      const updatedUser = await authService.updateProfile({ name, avatar });
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      const message = err.response?.data?.error || i18n.t('errors.profileUpdateFailed');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const updateActiveBadge = useCallback(async (badgeId) => {
    const data = await api.patch('/auth/active-badge', { badge_id: badgeId });
    setUser(prev => ({ ...prev, active_badge_id: data.active_badge_id }));
    return data;
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      setError(null);
      await authService.deleteAccount();
      setUser(null);
    } catch (err) {
      const message = err.response?.data?.error || i18n.t('errors.deleteAccountFailed');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const updatePreferences = useCallback(async ({ theme, language, auto_folder }) => {
    try {
      setError(null);
      const updatedUser = await authService.updatePreferences({ theme, language, auto_folder });
      setUser(updatedUser);
      // Apply preferences immediately
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme);
      }
      if (language) {
        i18n.changeLanguage(language);
      }
      return updatedUser;
    } catch (err) {
      const message = err.response?.data?.error || i18n.t('errors.preferencesUpdateFailed');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const completeOnboarding = useCallback(async ({ name, avatar }) => {
    try {
      setError(null);
      const updatedUser = await authService.completeOnboarding({ name, avatar });
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      const message = err.response?.data?.error || i18n.t('errors.generic');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    errorCode,
    login,
    loginWithGoogle,
    loginWithApple,
    register,
    logout,
    forgotPassword,
    resetPassword,
    clearError,
    syncUserData,
    updateProfile,
    updatePreferences,
    updateActiveBadge,
    deleteAccount,
    completeOnboarding
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
