import api from '../../../lib/api';

export const register = async ({ email, password, name }) => {
  const data = await api.post('/auth/register', { email, password, name });

  // Save only the token (user data comes from DB on each load)
  if (data.accessToken) {
    localStorage.setItem('accessToken', data.accessToken);
  }

  return data.user;
};

export const login = async ({ email, password, rememberMe = false }) => {
  const data = await api.post('/auth/login', { email, password, rememberMe });

  // Save only the token (user data comes from DB on each load)
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

export const updateProfile = async ({ name, avatar }) => {
  const data = await api.patch('/auth/profile', { name, avatar });
  return data.user;
};

export const deleteAccount = async () => {
  await api.delete('/auth/account');
  // Clear token
  localStorage.removeItem('accessToken');
};
