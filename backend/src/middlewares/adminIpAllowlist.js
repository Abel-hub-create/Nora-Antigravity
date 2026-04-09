import { adminConfig } from '../config/adminConfig.js';

const getClientIp = (req) =>
  req.headers['cf-connecting-ip'] ||
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.ip;

export const adminIpAllowlist = (req, res, next) => {
  if (!adminConfig.ipAllowlist.length) return next();
  const clientIp = getClientIp(req);
  if (!adminConfig.ipAllowlist.includes(clientIp)) {
    console.warn(`[Admin] Blocked IP ${clientIp} → ${req.method} ${req.path}`);
    return res.status(404).json({ error: 'Not found' }); // 404, not 403 — don't reveal panel existence
  }
  next();
};
