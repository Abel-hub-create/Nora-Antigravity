import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApiClient.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminAccessToken');
    if (!token) { setIsAdminLoading(false); return; }
    adminApi.get('/auth/me')
      .then(data => setAdminUser(data.admin))
      .catch(() => localStorage.removeItem('adminAccessToken'))
      .finally(() => setIsAdminLoading(false));
  }, []);

  const adminLogin = useCallback(async (email, password) => {
    // Returns { status: 'totp_required' | 'setup_required', pendingToken }
    // or { adminAccessToken, admin } (legacy fallback)
    return await adminApi.post('/auth/login', { email, password });
  }, []);

  const adminCompleteLogin = useCallback((accessToken, admin) => {
    localStorage.setItem('adminAccessToken', accessToken);
    setAdminUser(admin);
  }, []);

  const adminLogout = useCallback(async () => {
    try { await adminApi.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('adminAccessToken');
    setAdminUser(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ adminUser, isAdminLoading, adminLogin, adminCompleteLogin, adminLogout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
};
