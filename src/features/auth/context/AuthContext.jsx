import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check localStorage first for faster initial load
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // Verify with backend
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
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
      const message = err.response?.data?.error || 'Échec de la connexion';
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
      const message = err.response?.data?.error || 'Echec de l\'inscription';
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
      const message = err.response?.data?.error || 'Échec de la demande';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    try {
      setError(null);
      return await authService.resetPassword(token, password);
    } catch (err) {
      const message = err.response?.data?.error || 'Échec de la réinitialisation';
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
      const message = err.response?.data?.error || 'Echec de la mise a jour du profil';
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
      const message = err.response?.data?.error || 'Echec de la suppression du compte';
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
