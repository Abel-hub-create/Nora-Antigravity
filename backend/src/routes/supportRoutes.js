import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as supportRepo from '../services/supportRepository.js';
import { query } from '../config/database.js';

const router = express.Router();

const unbanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Trop de demandes, réessayez dans une heure' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
});

const createTicketSchema = z.object({
  body: z.object({
    category: z.enum(['bug', 'billing', 'question', 'other']),
    subject: z.string().min(3, 'Sujet trop court').max(200, 'Sujet trop long'),
    message: z.string().min(10, 'Message trop court').max(5000, 'Message trop long'),
  })
});

const unbanRequestSchema = z.object({
  body: z.object({
    email: z.string().email('Email invalide'),
    subject: z.string().min(3, 'Sujet trop court').max(200, 'Sujet trop long'),
    message: z.string().min(10, 'Message trop court').max(5000, 'Message trop long'),
  })
});

// Public — accessible for banned users who can't log in
router.post('/unban-request', unbanLimiter, validate(unbanRequestSchema), async (req, res, next) => {
  try {
    const { email, subject, message } = req.body;
    const [bannedUser] = await query(
      'SELECT id FROM users WHERE email = ? AND is_banned = 1',
      [email.toLowerCase().trim()]
    );
    await supportRepo.createTicket({
      userId: bannedUser?.id ?? null,
      email: bannedUser ? null : email,
      category: 'unban',
      subject,
      message,
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Authenticated routes
router.use(authenticate);

router.post('/', validate(createTicketSchema), async (req, res, next) => {
  try {
    const { category, subject, message } = req.body;
    const id = await supportRepo.createTicket({ userId: req.user.id, email: null, category, subject, message });
    res.json({ ok: true, id });
  } catch (e) { next(e); }
});

router.get('/mine', async (req, res, next) => {
  try {
    const tickets = await supportRepo.getUserTickets(req.user.id);
    res.json({ tickets });
  } catch (e) { next(e); }
});

export default router;
