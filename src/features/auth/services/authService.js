import api from '../../../lib/api';

export const register = async ({ email, password, name }) => {
  const data = await api.post('/auth/register', { email, password, name });

  // Save token and user
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data.user;
};

export const login = async ({ email, password, rememberMe = false }) => {
  const data = await api.post('/auth/login', { email, password, rememberMe });

  // Save token and user
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data.user;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    // Clear storage regardless of API result
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }
};

export const getCurrentUser = async () => {
  const data = await api.get('/auth/me');
  return data.user;
};

export const forgotPassword = async (email) => {
  const data = await api.post('/auth/forgot-password', { email });
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
