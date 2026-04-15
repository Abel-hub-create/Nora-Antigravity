import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middlewares/auth.js';
import { getPendingBags, revealBag, generateBag } from '../services/coinBagService.js';
import { query } from '../config/database.js';

const router = express.Router();

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // max 30 level-ups/min (ultra conservatif)
  keyGenerator: (req) => String(req.user?.id || req.ip),
});

// GET /api/bags/pending — sacs non révélés de l'utilisateur
router.get('/pending', authenticate, async (req, res, next) => {
  try {
    const bags = await getPendingBags(req.user.id);
    res.json({ bags });
  } catch (e) { next(e); }
});

// POST /api/bags/generate — générer un sac pour un level-up côté frontend (minuteurs)
// IMPORTANT : doit être AVANT /:id/reveal pour ne pas être capturé par la route dynamique
router.post('/generate', authenticate, generateLimiter, async (req, res, next) => {
  try {
    const users = await query(`SELECT plan_type FROM users WHERE id = ? LIMIT 1`, [req.user.id]);
    const planType = users[0]?.plan_type || 'free';
    const bag = await generateBag(req.user.id, planType);
    res.json({ bag });
  } catch (e) { next(e); }
});

// POST /api/bags/:id/reveal — révéler un sac
router.post('/:id/reveal', authenticate, async (req, res, next) => {
  try {
    const bagId = parseInt(req.params.id, 10);
    if (!bagId || isNaN(bagId)) return res.status(400).json({ error: 'ID de sac invalide' });
    const result = await revealBag(req.user.id, bagId);
    res.json(result);
  } catch (e) { next(e); }
});

export default router;
