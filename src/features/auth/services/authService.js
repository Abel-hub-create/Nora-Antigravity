import api from '../../../lib/api';

export const register = async ({ email, password, name, language, refCode }) => {
  const data = await api.post('/auth/register', { email, password, name, language, ...(refCode ? { refCode } : {}) });

  // Save only the token (user data comes from DB on each load)
  if (data.accessToken) {
    localStorage.setItem('accessToken', data.accessToken);
  }

  return data.user;
};

export const login = async ({ email, password, rememberMe = false }) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const data = await api.post('/auth/login', { email, password, rememberMe, timezone });

  localStorage.setItem('accessToken', data.accessToken);

  return data.user;
};

export const loginWithGoogle = async (credential) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const data = await api.post('/auth/google', { credential, timezone });

  localStorage.setItem('accessToken', data.accessToken);

  return data.user;
};

export const loginWithApple = async (identityToken, user) => {
  const data = await api.post('/auth/apple', { identityToken, user });

  localStorage.setItem('accessToken', data.accessToken);

  return data.user;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    // Clear token only
    localStorage.removeItem('accessToken');
  }
};

export const getCurrentUser = async () => {
  const data = await api.get('/auth/me');
  return data.user;
};

export const forgotPassword = async (email, language) => {
  const data = await api.post('/auth/forgot-password', { email, language });
  return data.message;
};

export const resendVerification = async (email, language) => {
  const data = await api.post('/auth/resend-verification', { email, language });
  return data.message;
};

export const resetPassword = async (token, password) => {
  const data = await api.post('/auth/reset-password', { token, password });
  return data.message;
};

export const syncUserData = async (userData) => {
  const data = await api.post('/auth/sync', userData);
  return data.user;
};

export const updateProfile = async ({ name, avatar }) => {
  const data = await api.patch('/auth/profile', { name, avatar });
  return data.user;
};

export const updatePreferences = async ({ theme, language, auto_folder }) => {
  const data = await api.patch('/auth/preferences', { theme, language, auto_folder });
  return data.user;
};

export const completeOnboarding = async ({ name, avatar }) => {
  const data = await api.patch('/auth/onboarding', { name, avatar });
  return data.user;
};

export const deleteAccount = async () => {
  await api.delete('/auth/account');
  // Clear token
  localStorage.removeItem('accessToken');
};
