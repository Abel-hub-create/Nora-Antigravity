import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { chat, analyzeDifficulties, generateExercises, correctExercises } from '../services/assistantService.js';
import * as exerciseRepo from '../services/exerciseRepository.js';
import { query } from '../config/database.js';

const router = express.Router();
router.use(authenticate);

// ─── Chat général ─────────────────────────────────────────────────────────────

router.post('/chat', async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages[] requis' });
    }

    // Sauvegarder le dernier message user
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      await query(
        `INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)`,
        [req.user.id, lastUser.content]
      );
    }

    const response = await chat(messages);

    await query(
      `INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'assistant', ?)`,
      [req.user.id, response]
    );

    res.json({ message: response });
  } catch (error) {
    next(error);
  }
});

// ─── Historique chat ─────────────────────────────────────────────────────────

router.get('/history', async (req, res, next) => {
  try {
    const messages = await query(
      `SELECT role, content, created_at FROM chat_messages
       WHERE user_id = ? ORDER BY created_at ASC LIMIT 100`,
      [req.user.id]
    );
    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

// ─── Matières disponibles (pour Monk Mode) ────────────────────────────────────

router.get('/subjects', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT DISTINCT subject FROM syntheses
       WHERE user_id = ? AND subject IS NOT NULL AND is_archived = 0`,
      [req.user.id]
    );
    res.json({ subjects: rows.map(r => r.subject) });
  } catch (error) {
    next(error);
  }
});

// ─── Monk Mode — Analyse ─────────────────────────────────────────────────────

router.post('/monk-mode/analyze', async (req, res, next) => {
  try {
    const { subject } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject requis' });

    const [quizAnswers, syntheses] = await Promise.all([
      exerciseRepo.getQuizAnswersForSubject(req.user.id, subject),
      exerciseRepo.getSynthesesForSubject(req.user.id, subject)
    ]);

    const analysis = await analyzeDifficulties({
      subject,
      quizAnswers,
      synthesesTitles: syntheses.map(s => s.title)
    });

    res.json({
      analysis,
      synthesesCount: syntheses.length,
      answersCount: quizAnswers.length
    });
  } catch (error) {
    next(error);
  }
});

// ─── Monk Mode — Génération d'exercices ──────────────────────────────────────

router.post('/monk-mode/generate', async (req, res, next) => {
  try {
    const { subject, weakTopics, specificDifficulties, counts } = req.body;

    if (!subject) return res.status(400).json({ error: 'subject requis' });
    if (!counts || (counts.qcm === 0 && counts.open === 0 && counts.practical === 0)) {
      return res.status(400).json({ error: 'Sélectionne au moins un type d\'exercice' });
    }

    // Vérifier la limite
    const current = await exerciseRepo.countByUser(req.user.id);
    if (current >= exerciseRepo.EXERCISE_LIMIT) {
      return res.status(403).json({
        error: 'EXERCISES_LIMIT_REACHED',
        message: `Tu as atteint la limite de ${exerciseRepo.EXERCISE_LIMIT} sets d'exercices.`
      });
    }

    // Valider les compteurs
    const safeCounts = {
      qcm: Math.min(Math.max(0, parseInt(counts.qcm) || 0), 5),
      open: Math.min(Math.max(0, parseInt(counts.open) || 0), 10),
      practical: Math.min(Math.max(0, parseInt(counts.practical) || 0), 10)
    };

    const { title, items } = await generateExercises({
      subject,
      weakTopics: weakTopics || [],
      specificDifficulties,
      counts: safeCounts
    });

    // Sauvegarder en DB
    const set = await exerciseRepo.createSet({
      userId: req.user.id,
      subject,
      title,
      difficultySummary: weakTopics?.join(', ') || null
    });

    await exerciseRepo.createItems(set.id, items);

    res.status(201).json({ exerciseSetId: set.id, title });
  } catch (error) {
    next(error);
  }
});

// ─── /correct ─────────────────────────────────────────────────────────────────

router.post('/correct/:exerciseSetId', async (req, res, next) => {
  try {
    const setId = parseInt(req.params.exerciseSetId);
    const exerciseSet = await exerciseRepo.findById(setId, req.user.id);

    if (!exerciseSet) {
      return res.status(404).json({ error: 'Set d\'exercices non trouvé' });
    }

    const itemsWithAnswers = exerciseSet.items.filter(item =>
      item.user_answer && item.user_answer.trim() !== ''
    );

    if (itemsWithAnswers.length === 0) {
      return res.status(400).json({ error: 'Aucune réponse à corriger' });
    }

    const correction = await correctExercises({
      subject: exerciseSet.subject,
      items: exerciseSet.items
    });

    res.json({ correction, exerciseSetId: setId });
  } catch (error) {
    next(error);
  }
});

export default router;
