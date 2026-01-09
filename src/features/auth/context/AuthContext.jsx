import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import i18n from '../../../i18n';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount - DB is the only source of truth
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Fetch user data directly from backend (DB)
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
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

  const login = useCallback(async (credentials) => {
    try {
      setError(null);
      const userData = await authService.login(credentials);
      setUser(userData);
      return userData;
    } catch (err) {
      const message = err.response?.data?.error || i18n.t('errors.loginFailed');
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
      const message = err.response?.data?.error || i18n.t('errors.registerFailed');
      setError(message);
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

  const forgotPassword = useCallback(async (email) => {
    try {
      setError(null);
      return await authService.forgotPassword(email);
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

  const clearError = useCallback(() => setError(null), []);

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

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    clearError,
    syncUserData,
    updateProfile,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
