import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as supportRepo from '../services/supportRepository.js';

const router = express.Router();

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
router.post('/unban-request', validate(unbanRequestSchema), async (req, res, next) => {
  try {
    const { email, subject, message } = req.body;
    const id = await supportRepo.createTicket({ userId: null, email, category: 'other', subject, message });
    res.json({ ok: true, id });
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
