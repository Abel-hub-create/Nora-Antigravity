import express from 'express';
import rateLimit from 'express-rate-limit';
import { generateSecret, generateSync, verifySync } from 'otplib';
import QRCode from 'qrcode';
import * as hashService from '../services/hashService.js';
import * as adminTokenService from '../services/adminTokenService.js';
import * as adminRepo from '../services/adminRepository.js';
import * as emailService from '../services/emailService.js';
import * as planRepo from '../services/planRepository.js';
import * as seasonRepo from '../services/seasonRepository.js';
import { awardXp } from '../services/xpService.js';
import { getAllXpConfig, updateXpConfig } from '../services/xpConfigService.js';
import { authenticateAdmin } from '../middlewares/adminAuth.js';
import { adminConfig } from '../config/adminConfig.js';

const router = express.Router();

// Cloudflare-aware IP getter
const getClientIp = (req) =>
  req.headers['cf-connecting-ip'] ||
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.ip;

// ─── Rate limiters ────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp
});

router.use(apiLimiter);

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Step 1: verify email + password → return pending token
router.post('/auth/login', loginLimiter, express.json(), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Hardcoded email restriction — only one admin allowed
    if (!adminConfig.allowedEmails.includes(email)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = await adminRepo.findAdminByEmail(email);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await hashService.comparePassword(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const pendingToken = adminTokenService.generatePendingToken(admin.id);

    if (!admin.totp_enabled) {
      // First time: need to set up TOTP
      return res.json({ status: 'setup_required', pendingToken });
    }

    // TOTP already configured — need to verify it
    res.json({ status: 'totp_required', pendingToken });
  } catch (error) {
    next(error);
  }
});

// Step 2a (setup): generate QR code for first-time setup
router.post('/auth/totp/qrcode', express.json(), async (req, res, next) => {
  try {
    const { pendingToken } = req.body;
    if (!pendingToken) return res.status(400).json({ error: 'Pending token required' });

    const payload = adminTokenService.verifyPendingToken(pendingToken);
    const admin = await adminRepo.findAdminById(payload.adminId);
    if (!admin) return res.status(401).json({ error: 'Admin not found' });

    // Generate a new secret and save it (not yet enabled)
    const secret = generateSecret();
    await adminRepo.updateAdminTotpSecret(payload.adminId, secret);

    const otpauthUri = `otpauth://totp/Mirora%20Admin:${encodeURIComponent(admin.email)}?secret=${secret}&issuer=Mirora%20Admin`;
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

    res.json({ qrCodeDataUrl, secret });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
    next(error);
  }
});

// Step 2a (enable): verify first TOTP code, enable TOTP, issue full JWT
router.post('/auth/totp/enable', express.json(), async (req, res, next) => {
  try {
    const { pendingToken, code } = req.body;
    if (!pendingToken || !code) return res.status(400).json({ error: 'Token and code required' });

    const payload = adminTokenService.verifyPendingToken(pendingToken);
    const admin = await adminRepo.findAdminById(payload.adminId);
    if (!admin) return res.status(401).json({ error: 'Invalid token' });

    if (!admin.totp_secret) return res.status(400).json({ error: 'No TOTP secret found. Request QR code first.' });

    const result = verifySync({ secret: admin.totp_secret, token: code });
    if (!result || !result.valid) {
      return res.status(401).json({ error: 'Code incorrect' });
    }

    await adminRepo.enableTotp(payload.adminId);
    await adminRepo.updateAdminLastLogin(payload.adminId);

    const accessToken = adminTokenService.generateAdminAccessToken(payload.adminId);
    const refreshToken = adminTokenService.generateAdminRefreshToken(payload.adminId);

    res.cookie('adminRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });

    res.json({
      adminAccessToken: accessToken,
      admin: { id: admin.id, email: admin.email }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
    next(error);
  }
});

// Step 2b (verify): verify TOTP for subsequent logins
router.post('/auth/totp/verify', express.json(), async (req, res, next) => {
  try {
    const { pendingToken, code } = req.body;
    if (!pendingToken || !code) return res.status(400).json({ error: 'Token and code required' });

    const payload = adminTokenService.verifyPendingToken(pendingToken);
    const admin = await adminRepo.findAdminById(payload.adminId);
    if (!admin) return res.status(401).json({ error: 'Invalid token' });

    if (!admin.totp_secret || !admin.totp_enabled) {
      return res.status(400).json({ error: 'TOTP not configured' });
    }

    const result = verifySync({ secret: admin.totp_secret, token: code });
    if (!result || !result.valid) {
      return res.status(401).json({ error: 'Code incorrect' });
    }

    await adminRepo.updateAdminLastLogin(payload.adminId);

    const accessToken = adminTokenService.generateAdminAccessToken(payload.adminId);
    const refreshToken = adminTokenService.generateAdminRefreshToken(payload.adminId);

    res.cookie('adminRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });

    res.json({
      adminAccessToken: accessToken,
      admin: { id: admin.id, email: admin.email }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
    next(error);
  }
});

router.post('/auth/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.adminRefreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    const payload = adminTokenService.verifyAdminRefreshToken(token);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Not admin' });

    const admin = await adminRepo.findAdminById(payload.adminId);
    if (!admin) return res.status(401).json({ error: 'Admin not found' });

    const accessToken = adminTokenService.generateAdminAccessToken(admin.id);
    res.json({ adminAccessToken: accessToken });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/auth/logout', authenticateAdmin, (req, res) => {
  res.clearCookie('adminRefreshToken', { httpOnly: true, sameSite: 'strict', secure: true });
  res.json({ message: 'Logged out' });
});

router.get('/auth/me', authenticateAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get('/stats', authenticateAdmin, async (req, res, next) => {
  try {
    const stats = await adminRepo.getStats();
    res.json(stats);
  } catch (error) { next(error); }
});

// ─── Users ────────────────────────────────────────────────────────────────────

router.get('/users', authenticateAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '', filter = 'all' } = req.query;
    const result = await adminRepo.getAllUsers({
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      search,
      filter
    });
    res.json(result);
  } catch (error) { next(error); }
});

router.get('/users/:id', authenticateAdmin, async (req, res, next) => {
  try {
    const user = await adminRepo.getUserById(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) { next(error); }
});

router.patch('/users/:id/ban', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    await adminRepo.banUser(parseInt(req.params.id), req.body.reason || null);
    res.json({ message: 'User banned' });
  } catch (error) { next(error); }
});

router.patch('/users/:id/unban', authenticateAdmin, async (req, res, next) => {
  try {
    await adminRepo.unbanUser(parseInt(req.params.id));
    res.json({ message: 'User unbanned' });
  } catch (error) { next(error); }
});

router.patch('/users/:id/premium', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const { expires_at } = req.body;
    await adminRepo.setPremium(parseInt(req.params.id), expires_at || null);
    res.json({ message: 'Premium updated' });
  } catch (error) { next(error); }
});

router.post('/users/:id/reset-password', authenticateAdmin, async (req, res, next) => {
  try {
    const user = await adminRepo.getUserById(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { forgotPassword } = await import('../services/authService.js');
    await forgotPassword({ email: user.email });
    res.json({ message: 'Reset email sent' });
  } catch (error) { next(error); }
});

router.delete('/users/:id', authenticateAdmin, async (req, res, next) => {
  try {
    await adminRepo.deleteUser(parseInt(req.params.id));
    res.status(204).end();
  } catch (error) { next(error); }
});

// ─── Announcements ────────────────────────────────────────────────────────────

router.get('/announcements', authenticateAdmin, async (req, res, next) => {
  try {
    const announcements = await adminRepo.getAnnouncements();
    res.json({ announcements });
  } catch (error) { next(error); }
});

router.post('/announcements', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const { title, body, type, target_audience, is_active, starts_at, ends_at } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
    const announcement = await adminRepo.createAnnouncement({
      title, body, type, target_audience, is_active, starts_at, ends_at,
      adminId: req.admin.id
    });
    res.status(201).json({ announcement });
  } catch (error) { next(error); }
});

router.patch('/announcements/:id', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const announcement = await adminRepo.updateAnnouncement(parseInt(req.params.id), req.body);
    res.json({ announcement });
  } catch (error) { next(error); }
});

router.delete('/announcements/:id', authenticateAdmin, async (req, res, next) => {
  try {
    await adminRepo.deleteAnnouncement(parseInt(req.params.id));
    res.status(204).end();
  } catch (error) { next(error); }
});

router.post('/announcements/:id/send', authenticateAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await adminRepo.getAnnouncements();
    const announcement = rows.find(a => a.id === id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

    const users = await adminRepo.getAllUserEmails();
    let sent = 0;
    for (const user of users) {
      try {
        await emailService.sendAnnouncementEmail(user.email, user.name, announcement);
        sent++;
      } catch (e) {
        console.error(`[Admin] Failed to send to ${user.email}:`, e.message);
      }
    }

    await adminRepo.markAnnouncementSent(id);
    res.json({ message: `Sent to ${sent}/${users.length} users` });
  } catch (error) { next(error); }
});

// ─── Active announcements (public, user-facing) ───────────────────────────────

router.get('/announcements/active', async (req, res, next) => {
  try {
    const audience = req.query.audience || 'free';
    const announcements = await adminRepo.getActiveAnnouncements(audience);
    res.json({ announcements });
  } catch (error) { next(error); }
});

// ─── Plans Management ────────────────────────────────────────────────────────

router.get('/plans', authenticateAdmin, async (req, res, next) => {
  try {
    const plans = await planRepo.getAllPlans();
    res.json({ plans });
  } catch (error) { next(error); }
});

router.patch('/plans/:id', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const plan = await planRepo.updatePlan(parseInt(req.params.id), req.body);
    res.json({ plan });
  } catch (error) { next(error); }
});

router.put('/plans/:id/limits', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const planId = parseInt(req.params.id);
    const { limits } = req.body;
    console.log(`[Admin] PUT /plans/${planId}/limits — body:`, JSON.stringify(req.body).slice(0, 300));
    if (!Array.isArray(limits)) return res.status(400).json({ error: 'limits array required' });
    for (const l of limits) {
      await planRepo.updatePlanLimit(planId, l.limit_key, l.limit_value, l.label);
    }
    const plan = await planRepo.getPlanById(planId);
    res.json({ plan });
  } catch (error) { next(error); }
});

router.delete('/plans/:planId/limits/:key', authenticateAdmin, async (req, res, next) => {
  try {
    await planRepo.deletePlanLimit(parseInt(req.params.planId), req.params.key);
    res.status(204).end();
  } catch (error) { next(error); }
});

// ─── School Requests ─────────────────────────────────────────────────────────

router.get('/school-requests', authenticateAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status = 'all' } = req.query;
    const result = await planRepo.getSchoolRequests({ page: parseInt(page), limit: parseInt(limit), status });
    res.json(result);
  } catch (error) { next(error); }
});

router.patch('/school-requests/:id', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    await planRepo.updateSchoolRequest(parseInt(req.params.id), req.body);
    res.json({ message: 'Updated' });
  } catch (error) { next(error); }
});

router.delete('/school-requests/:id', authenticateAdmin, async (req, res, next) => {
  try {
    await planRepo.deleteSchoolRequest(parseInt(req.params.id));
    res.status(204).end();
  } catch (error) { next(error); }
});

// ─── Promo Codes ─────────────────────────────────────────────────────────────

router.get('/promo-codes', authenticateAdmin, async (req, res, next) => {
  try {
    const codes = await planRepo.getPromoCodes();
    res.json({ codes });
  } catch (error) { next(error); }
});

router.post('/promo-codes', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const { code, discount_type, discount_value, max_uses, valid_from, valid_until, applicable_plans, stripe_coupon_id } = req.body;
    if (!code || !discount_type || discount_value == null) {
      return res.status(400).json({ error: 'code, discount_type, discount_value required' });
    }
    const id = await planRepo.createPromoCode({ code, discount_type, discount_value, max_uses, valid_from, valid_until, applicable_plans, stripe_coupon_id });
    const promo = await planRepo.getPromoCodeById(id);
    res.status(201).json({ promo });
  } catch (error) { next(error); }
});

router.patch('/promo-codes/:id', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    await planRepo.updatePromoCode(parseInt(req.params.id), req.body);
    const promo = await planRepo.getPromoCodeById(parseInt(req.params.id));
    res.json({ promo });
  } catch (error) { next(error); }
});

router.delete('/promo-codes/:id', authenticateAdmin, async (req, res, next) => {
  try {
    await planRepo.deletePromoCode(parseInt(req.params.id));
    res.status(204).end();
  } catch (error) { next(error); }
});

// ─── Admin: Set user plan manually ───────────────────────────────────────────

router.patch('/users/:id/plan', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const { plan_type, expires_at } = req.body;
    if (!plan_type) return res.status(400).json({ error: 'plan_type required' });
    if (!['free', 'premium', 'school'].includes(plan_type)) {
      return res.status(400).json({ error: 'plan_type must be free, premium or school' });
    }

    if (plan_type === 'premium') {
      // Use setPremium to handle both plan_type and premium_expires_at
      await adminRepo.setPremium(parseInt(req.params.id), expires_at !== undefined ? expires_at : null);
    } else {
      // For free/school: update plan_type and clear premium_expires_at
      await planRepo.setUserPlan(parseInt(req.params.id), plan_type);
      const { query } = await import('../config/database.js');
      await query(`UPDATE users SET premium_expires_at = NULL WHERE id = ?`, [parseInt(req.params.id)]);
    }

    res.json({ message: 'Plan updated' });
  } catch (error) { next(error); }
});

// ─── Debug: Get AI Model Info for a user ─────────────────────────────────────

router.get('/debug/ai-model/:userId', authenticateAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'Invalid userId' });
    
    // Get user info
    const user = await adminRepo.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Get plan limits for the user
    const limits = await planRepo.getUserPlanLimits(userId);
    
    // Determine which model would be used
    const planType = user.plan_type || 'free';
    const aiModelKey = limits?.ai_model ?? 0;
    const aiModelTier = limits?.ai_model_tier ?? 0;
    
    // Model mapping based on plan
    let modelInfo = {
      plan: planType,
      userId: userId,
      userEmail: user.email,
      aiModelKey,
      aiModelTier,
      models: {}
    };
    
    if (planType === 'free') {
      modelInfo.models = {
        primary: 'Gemini 2.5 Flash',
        fallback: 'GPT-4o-mini',
        reasoning: 'Free plan uses Gemini first (cheaper), falls back to GPT-4o-mini if unavailable'
      };
    } else if (planType === 'premium' || planType === 'school') {
      modelInfo.models = {
        primary: 'GPT-4o',
        fallback: 'GPT-4o-mini',
        reasoning: 'Premium/School plan uses GPT-4o for best quality'
      };
    }
    
    // Check if Gemini API key is configured
    const geminiConfigured = !!process.env.GEMINI_API_KEY;
    modelInfo.geminiConfigured = geminiConfigured;
    
    res.json(modelInfo);
  } catch (error) { next(error); }
});

// ─── Debug: Get current admin AI Model config ───────────────────────────────

router.get('/debug/ai-config', authenticateAdmin, async (req, res, next) => {
  try {
    const config = {
      gemini: {
        configured: !!process.env.GEMINI_API_KEY,
        model: 'gemini-2.5-flash'
      },
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        models: ['gpt-4o', 'gpt-4o-mini']
      },
      modelTiers: {
        free: { primary: 'Gemini 2.5 Flash', fallback: 'GPT-4o-mini' },
        premium: { primary: 'GPT-4o', fallback: 'GPT-4o-mini' },
        school: { primary: 'GPT-4o', fallback: 'GPT-4o-mini' }
      }
    };
    res.json(config);
  } catch (error) { next(error); }
});

// ─── Admin: View user conversations ─────────────────────────────────────────

router.get('/conversations', authenticateAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '', userId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = '';

    if (userId) {
      where = 'WHERE c.user_id = ?';
      params.push(parseInt(userId));
    } else if (search) {
      where = 'WHERE (u.email LIKE ? OR u.name LIKE ? OR c.title LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const { query: dbQuery } = await import('../config/database.js');

    const [total, conversations] = await Promise.all([
      dbQuery(`SELECT COUNT(*) as count FROM conversations c LEFT JOIN users u ON c.user_id = u.id ${where}`, params),
      dbQuery(
        `SELECT c.id, c.title, c.created_at, c.updated_at,
                u.id as user_id, u.email as user_email, u.name as user_name, u.plan_type,
                (SELECT COUNT(*) FROM conversation_messages WHERE conversation_id = c.id) as message_count
         FROM conversations c
         LEFT JOIN users u ON c.user_id = u.id
         ${where}
         ORDER BY c.updated_at DESC
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      )
    ]);

    res.json({ conversations, total: total[0].count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { next(error); }
});

router.get('/conversations/:id', authenticateAdmin, async (req, res, next) => {
  try {
    const { query: dbQuery } = await import('../config/database.js');
    const [conv] = await dbQuery(
      `SELECT c.*, u.email as user_email, u.name as user_name
       FROM conversations c LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = ? LIMIT 1`,
      [parseInt(req.params.id)]
    );
    if (!conv) return res.status(404).json({ error: 'Not found' });

    const messages = await dbQuery(
      `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conv.id]
    );
    res.json({ conversation: conv, messages });
  } catch (error) { next(error); }
});

router.delete('/conversations/:id', authenticateAdmin, async (req, res, next) => {
  try {
    const { query: dbQuery } = await import('../config/database.js');
    await dbQuery(`DELETE FROM conversation_messages WHERE conversation_id = ?`, [parseInt(req.params.id)]);
    await dbQuery(`DELETE FROM conversations WHERE id = ?`, [parseInt(req.params.id)]);
    res.status(204).end();
  } catch (error) { next(error); }
});

// ─── Admin: System Prompts Management ────────────────────────────────────────

router.get('/system-prompts', authenticateAdmin, async (req, res, next) => {
  try {
    const { query: dbQuery } = await import('../config/database.js');
    const prompts = await dbQuery(`SELECT * FROM system_prompts ORDER BY name ASC`);
    res.json({ prompts });
  } catch (error) { next(error); }
});

router.put('/system-prompts/:name', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const { content, description } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    const { query: dbQuery } = await import('../config/database.js');
    await dbQuery(
      `INSERT INTO system_prompts (name, content, description, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE content = ?, description = ?, updated_at = NOW()`,
      [req.params.name, content, description || null, content, description || null]
    );
    const [prompt] = await dbQuery(`SELECT * FROM system_prompts WHERE name = ?`, [req.params.name]);
    res.json({ prompt });
  } catch (error) { next(error); }
});

router.post('/system-prompts/reset/:name', authenticateAdmin, async (req, res, next) => {
  try {
    const { query: dbQuery } = await import('../config/database.js');
    await dbQuery(`DELETE FROM system_prompts WHERE name = ?`, [req.params.name]);
    res.json({ message: 'Reset to default' });
  } catch (error) { next(error); }
});

// ─── XP : attribuer manuellement des XP à un user ───────────────────────────

router.post('/users/:id/grant-xp', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId || isNaN(userId)) return res.status(400).json({ error: 'ID utilisateur invalide' });
    const { amount, note } = req.body;
    const parsedAmount = parseInt(amount, 10);
    if (!parsedAmount || parsedAmount <= 0 || parsedAmount > 100000) {
      return res.status(400).json({ error: 'Montant invalide (entre 1 et 100 000)' });
    }
    const result = await awardXp(userId, 'admin_grant', {
      amount: parsedAmount,
      contextId: note ? String(note).slice(0, 255) : 'admin_panel'
    });
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
});

// ─── XP Config : configurer les montants d'XP par source ────────────────────

router.get('/xp-config', authenticateAdmin, async (req, res, next) => {
  try {
    const config = await getAllXpConfig();
    res.json({ config });
  } catch (e) { next(e); }
});

router.patch('/xp-config/:reason', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const { reason } = req.params;
    const { base_amount } = req.body;
    if (base_amount === undefined || base_amount === null || isNaN(Number(base_amount))) {
      return res.status(400).json({ error: 'base_amount (nombre) requis' });
    }
    await updateXpConfig(reason, Number(base_amount));
    const config = await getAllXpConfig();
    res.json({ success: true, config });
  } catch (e) { next(e); }
});

// ─── Saisons ─────────────────────────────────────────────────────────────────

router.get('/seasons', authenticateAdmin, async (req, res, next) => {
  try {
    const seasons = await seasonRepo.getAllSeasons();
    res.json({ seasons });
  } catch (e) { next(e); }
});

router.post('/seasons', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const { number, name, name_en, starts_at, set_active } = req.body;
    if (!number || !name || !starts_at) {
      return res.status(400).json({ error: 'number, name et starts_at sont requis' });
    }
    const season = await seasonRepo.createSeason({ number: parseInt(number, 10), name, name_en, starts_at });
    if (set_active) {
      await seasonRepo.setActiveSeason(season.id);
      season.is_active = 1;
    }
    res.status(201).json({ season });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ce numéro de saison existe déjà' });
    }
    next(e);
  }
});

router.patch('/seasons/:id', authenticateAdmin, express.json(), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, name_en, starts_at } = req.body;
    const season = await seasonRepo.updateSeason(id, { name, name_en, starts_at });
    res.json({ season });
  } catch (e) { next(e); }
});

router.patch('/seasons/:id/activate', authenticateAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await seasonRepo.setActiveSeason(id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.delete('/seasons/:id', authenticateAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await seasonRepo.deleteSeason(id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
