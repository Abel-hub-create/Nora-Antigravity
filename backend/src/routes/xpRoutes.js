import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middlewares/auth.js';
import { awardXp } from '../services/xpService.js';
import { checkAndUpdateWinstreak } from '../services/winstreakService.js';

const router = express.Router();

// Limite : 20 appels/min par user (la déduplication côté DB protège déjà, c'est un filet de sécurité)
const xpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?.id || req.ip),
});

// Raisons que le frontend peut déclencher
const CLIENT_ALLOWED_REASONS = new Set([
  'synthesis_created',
  'goal_completed',
  'daily_goals_all_bonus',
  'exercise_first_daily',
  'vocal_completed',
]);

// POST /api/xp/award — attribuer des XP pour une action
router.post('/award', authenticate, xpLimiter, async (req, res, next) => {
  try {
    const { reason, contextId } = req.body;
    if (!reason || !CLIENT_ALLOWED_REASONS.has(reason)) {
      return res.status(400).json({ error: 'Raison XP invalide', code: 'INVALID_XP_REASON' });
    }
    const result = await awardXp(req.user.id, reason, { contextId: contextId ?? null });
    res.json(result);
  } catch (e) { next(e); }
});

// POST /api/xp/winstreak — vérifier/mettre à jour la winstreak (appelé au login)
router.post('/winstreak', authenticate, async (req, res, next) => {
  try {
    const timezone = req.body?.timezone || req.user?.timezone || 'UTC';
    const result = await checkAndUpdateWinstreak(req.user.id, timezone);
    res.json(result);
  } catch (e) { next(e); }
});

export default router;
