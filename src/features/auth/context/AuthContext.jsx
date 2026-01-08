import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import i18n from '../../../i18n';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to merge user data, keeping higher progression values
  const mergeUserData = (localUser, backendUser) => {
    if (!localUser) return backendUser;
    if (!backendUser) return localUser;

    // For progression values (level, exp, eggs), keep the higher value
    // This ensures recent local progress isn't lost if backend hasn't synced yet
    const mergedUser = { ...backendUser };

    // Keep higher level
    if (localUser.level > backendUser.level) {
      mergedUser.level = localUser.level;
      mergedUser.exp = localUser.exp;
      mergedUser.next_level_exp = localUser.next_level_exp;
    } else if (localUser.level === backendUser.level && localUser.exp > backendUser.exp) {
      // Same level but more exp locally
      mergedUser.exp = localUser.exp;
    }

    // Keep higher eggs count
    if (localUser.eggs > backendUser.eggs) {
      mergedUser.eggs = localUser.eggs;
    }

    // Merge collections (union of both)
    const localCollection = localUser.collection || [];
    const backendCollection = backendUser.collection || [];
    const mergedCollection = [...new Set([...localCollection, ...backendCollection])];
    mergedUser.collection = mergedCollection;

    console.log('[Auth] Merged user data:', { local: localUser, backend: backendUser, merged: mergedUser });
    return mergedUser;
  };

  // Check if user is logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check localStorage first for faster initial load
        const storedUserStr = localStorage.getItem('user');
        let storedUser = null;
        if (storedUserStr) {
          storedUser = JSON.parse(storedUserStr);
          setUser(storedUser);
        }

        // Verify with backend
        const backendUser = await authService.getCurrentUser();

        // Merge local and backend data to preserve unsync'd progress
        const mergedUser = mergeUserData(storedUser, backendUser);

        setUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));

        // If local had higher values, sync them back to backend
        if (storedUser && (
          storedUser.level > backendUser.level ||
          (storedUser.level === backendUser.level && storedUser.exp > backendUser.exp) ||
          storedUser.eggs > backendUser.eggs ||
          (storedUser.collection?.length || 0) > (backendUser.collection?.length || 0)
        )) {
          console.log('[Auth] Syncing local progress to backend...');
          authService.syncUserData({
            level: mergedUser.level,
            exp: mergedUser.exp,
            next_level_exp: mergedUser.next_level_exp,
            eggs: mergedUser.eggs,
            collection: mergedUser.collection
          }).catch(err => console.error('[Auth] Failed to sync local progress:', err));
        }
      } catch {
        // Not authenticated
        setUser(null);
        localStorage.removeItem('user');
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

  const syncUserData = useCallback(async (userData) => {
    try {
      const updatedUser = await authService.syncUserData(userData);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (err) {
      console.error('Failed to sync user data:', err);
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
