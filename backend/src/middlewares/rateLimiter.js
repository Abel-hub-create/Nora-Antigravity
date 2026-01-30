import rateLimit from 'express-rate-limit';

// Get real IP from Cloudflare or fallback to req.ip
const getClientIp = (req) => {
  return req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
};

// Rate limit by email address for login
const getLoginKey = (req) => {
  const email = req.body?.email?.toLowerCase() || '';
  return email || getClientIp(req);
};

export const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 1 minute' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getLoginKey
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Trop de créations de compte, réessayez plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Trop de demandes de réinitialisation, réessayez plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp
});

// Rate limiter for AI verification endpoint
export const aiVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 verifications per 15 minutes
  message: { error: 'Trop de requêtes de vérification, réessayez dans quelques minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp
});
