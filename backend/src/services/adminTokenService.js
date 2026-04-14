import jwt from 'jsonwebtoken';

const ADMIN_ACCESS_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-change-in-prod';
const ADMIN_REFRESH_SECRET = process.env.ADMIN_JWT_REFRESH_SECRET || 'admin-refresh-secret-change-in-prod';

export function generateAdminAccessToken(adminId, email) {
  return jwt.sign(
    { adminId, email, role: 'admin' },
    ADMIN_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

export function generateAdminRefreshToken(adminId, email) {
  return jwt.sign(
    { adminId, email, role: 'admin' },
    ADMIN_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAdminAccessToken(token) {
  return jwt.verify(token, ADMIN_ACCESS_SECRET);
}

export function verifyAdminRefreshToken(token) {
  return jwt.verify(token, ADMIN_REFRESH_SECRET);
}

export function generatePendingToken(adminId, email) {
  return jwt.sign(
    { adminId, email, role: 'pending' },
    ADMIN_ACCESS_SECRET,
    { expiresIn: '10m' }
  );
}

export function verifyPendingToken(token) {
  return jwt.verify(token, ADMIN_ACCESS_SECRET);
}
