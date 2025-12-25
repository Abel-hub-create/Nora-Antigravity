import * as userRepository from './userRepository.js';
import * as hashService from './hashService.js';
import * as tokenService from './tokenService.js';
import crypto from 'crypto';

export const register = async ({ email, password, name }) => {
  // Check if user exists
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    const error = new Error('Cet email est déjà utilisé');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await hashService.hashPassword(password);

  // Create user
  const user = await userRepository.create({
    email,
    password: hashedPassword,
    name
  });

  return user;
};

export const login = async ({ email, password }) => {
  // Find user
  const user = await userRepository.findByEmail(email);
  if (!user) {
    const error = new Error('Email ou mot de passe incorrect');
    error.statusCode = 401;
    throw error;
  }

  // Verify password
  const isValid = await hashService.comparePassword(password, user.password);
  if (!isValid) {
    const error = new Error('Email ou mot de passe incorrect');
    error.statusCode = 401;
    throw error;
  }

  // Update last login
  await userRepository.updateLastLogin(user.id);

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const generateTokens = async (userId, userAgent, ipAddress) => {
  const payload = { userId };

  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = tokenService.generateRefreshToken(payload);

  // Calculate expiry (30 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Save refresh token
  await userRepository.saveRefreshToken(userId, refreshToken, expiresAt, userAgent, ipAddress);

  return { accessToken, refreshToken };
};

export const logout = async (refreshToken) => {
  if (refreshToken) {
    await userRepository.deleteRefreshToken(refreshToken);
  }
};

export const verifyAndRefreshToken = async (refreshToken) => {
  // Verify JWT signature
  const payload = tokenService.verifyRefreshToken(refreshToken);

  // Check if token exists in DB
  const tokenData = await userRepository.findRefreshToken(refreshToken);
  if (!tokenData) {
    const error = new Error('Token invalide');
    error.statusCode = 401;
    throw error;
  }

  // Generate new access token
  const newAccessToken = tokenService.generateAccessToken({ userId: payload.userId });

  return { userId: payload.userId, accessToken: newAccessToken };
};

export const forgotPassword = async (email) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    // Don't reveal if email exists (security)
    return null;
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  await userRepository.createPasswordReset(user.id, resetToken, expiresAt);

  // In production, send email here
  console.log(`[DEV] Reset token for ${email}: ${resetToken}`);

  return resetToken;
};

export const resetPassword = async (token, newPassword) => {
  const resetData = await userRepository.findPasswordReset(token);
  if (!resetData) {
    const error = new Error('Token invalide ou expiré');
    error.statusCode = 400;
    throw error;
  }

  // Hash new password
  const hashedPassword = await hashService.hashPassword(newPassword);

  // Update password
  await userRepository.updatePassword(resetData.user_id, hashedPassword);

  // Mark token as used
  await userRepository.markPasswordResetUsed(token);

  // Invalidate all refresh tokens (force re-login)
  await userRepository.deleteUserRefreshTokens(resetData.user_id);
};

export const getUserById = async (userId) => {
  return await userRepository.findById(userId);
};

export const syncUserData = async (userId, userData) => {
  await userRepository.updateUserData(userId, userData);
  return await userRepository.findById(userId);
};
