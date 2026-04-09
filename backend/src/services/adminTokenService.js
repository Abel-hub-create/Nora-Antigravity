import jwt from 'jsonwebtoken';
import { adminConfig } from '../config/adminConfig.js';

export const generateAdminAccessToken = (adminId) => {
  if (!adminConfig.jwtSecret) throw new Error('ADMIN_JWT_SECRET not configured');
  return jwt.sign({ adminId, role: 'admin' }, adminConfig.jwtSecret, {
    expiresIn: adminConfig.accessExpiresIn
  });
};

export const generateAdminRefreshToken = (adminId) => {
  if (!adminConfig.jwtRefreshSecret) throw new Error('ADMIN_JWT_REFRESH_SECRET not configured');
  return jwt.sign({ adminId, role: 'admin' }, adminConfig.jwtRefreshSecret, {
    expiresIn: adminConfig.refreshExpiresIn
  });
};

export const verifyAdminAccessToken = (token) => {
  if (!adminConfig.jwtSecret) throw new Error('ADMIN_JWT_SECRET not configured');
  return jwt.verify(token, adminConfig.jwtSecret);
};

export const verifyAdminRefreshToken = (token) => {
  if (!adminConfig.jwtRefreshSecret) throw new Error('ADMIN_JWT_REFRESH_SECRET not configured');
  return jwt.verify(token, adminConfig.jwtRefreshSecret);
};

// Pending token — short-lived (10 min), used between password check and TOTP verification
export const generatePendingToken = (adminId) => {
  if (!adminConfig.jwtSecret) throw new Error('ADMIN_JWT_SECRET not configured');
  return jwt.sign({ adminId, role: 'admin_pre_auth' }, adminConfig.jwtSecret, { expiresIn: '10m' });
};

export const verifyPendingToken = (token) => {
  if (!adminConfig.jwtSecret) throw new Error('ADMIN_JWT_SECRET not configured');
  const payload = jwt.verify(token, adminConfig.jwtSecret);
  if (payload.role !== 'admin_pre_auth') throw new Error('Invalid token type');
  return payload;
};
