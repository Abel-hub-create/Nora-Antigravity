import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { chat, analyzeDifficulties, generateExercises, correctExercises, correctSingleItem, analyzeExamDifficulties, generateAnaFeedback, generateTTS } from '../services/assistantService.js';
import { extractTextFromImage } from '../services/openaiService.js';
import * as exerciseRepo from '../services/exerciseRepository.js';
import { query } from '../config/database.js';
import { checkAndIncrement, DEFAULT_LIMITS } from '../services/dailyUsageRepository.js';
import { requireFeature } from '../middlewares/quotaMiddleware.js';
import { getUserPlanLimits } from '../services/planRepository.js';

// Feature gate: allow if has_quiz=1 OR max_exs_per_day > 0
const requireQuizAccess = async (req, res, next) => {
  try {
    const { limits } = await getUserPlanLimits(req.user.id);
    req.planLimits = limits;
    const allowed = limits.has_quiz || (limits.max_exs_per_day ?? 0) > 0;
    if (!allowed) {
      return res.status(403).json({
        error: 'FEATURE_LOCKED',
        feature: 'has_quiz',
        message: 'Cette fonctionnalité nécessite un abonnement supérieur'
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

const router = express.Router();
router.use(authenticate);

// ─── Chat général ─────────────────────────────────────────────────────────────

router.post('/chat', async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages[] requis' });
    }

    const lang = (req.headers['accept-language'] || 'fr').split(',')[0].split('-')[0];

    // Check max_char_per_message from plan limits
    const { limits: planLimits } = await getUserPlanLimits(req.user.id);
    const maxChars = planLimits?.max_char_per_message ?? 500;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg && lastUserMsg.content.length > maxChars) {
      return res.status(400).json({
        error: 'MESSAGE_TOO_LONG',
        maxChars,
        currentChars: lastUserMsg.content.length
      });
    }

    // Check daily chat limit
    const chatUsage = await checkAndIncrement(req.user.id, 'chat');
    if (!chatUsage.allowed) {
      return res.status(429).json({
        error: 'DAILY_CHAT_LIMIT',
        current: chatUsage.current,
        limit: chatUsage.limit
      });
    }

    // Sauvegarder le dernier message user
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      await query(
        `INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)`,
        [req.user.id, lastUser.content]
      );
    }

    const response = await chat(messages, lang, req.user.id);

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

router.post('/monk-mode/analyze', requireQuizAccess, async (req, res, next) => {
  try {
    const { subject } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject requis' });

    const lang = (req.headers['accept-language'] || 'fr').split(',')[0].split('-')[0];

    const [quizAnswers, syntheses] = await Promise.all([
      exerciseRepo.getQuizAnswersForSubject(req.user.id, subject),
      exerciseRepo.getSynthesesForSubject(req.user.id, subject)
    ]);

    const analysis = await analyzeDifficulties({
      subject,
      quizAnswers,
      synthesesTitles: syntheses.map(s => s.title),
      lang,
      userId: req.user.id
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

router.post('/monk-mode/generate', requireQuizAccess, async (req, res, next) => {
  try {
    const { subject, weakTopics, errorPatterns, analysisSummary, specificDifficulties, counts, difficulty, source, feedbackNote } = req.body;

    if (!subject) return res.status(400).json({ error: 'subject requis' });
    if (!counts || (counts.qcm === 0 && counts.open === 0 && counts.practical === 0)) {
      return res.status(400).json({ error: 'Sélectionne au moins un type d\'exercice' });
    }

    // Check daily limit (exs or ana)
    const usageType = source === 'ana' ? 'ana' : 'exs';
    const usageCheck = await checkAndIncrement(req.user.id, usageType);
    if (!usageCheck.allowed) {
      const errorCode = source === 'ana' ? 'DAILY_ANA_LIMIT' : 'DAILY_EXS_LIMIT';
      return res.status(429).json({
        error: errorCode,
        current: usageCheck.current,
        limit: usageCheck.limit
      });
    }

    // Vérifier la limite
    const current = await exerciseRepo.countByUser(req.user.id);
    if (current >= exerciseRepo.EXERCISE_LIMIT) {
      return res.status(403).json({
        error: 'EXERCISES_LIMIT_REACHED',
        message: `Tu as atteint la limite de ${exerciseRepo.EXERCISE_LIMIT} sets d'exercices.`
      });
    }

    // Valider les compteurs (enforcer les maximums)
    const safeCounts = {
      qcm: Math.min(Math.max(0, parseInt(counts.qcm) || 0), 5),
      open: Math.min(Math.max(0, parseInt(counts.open) || 0), 10),
      practical: Math.min(Math.max(0, parseInt(counts.practical) || 0), 10)
    };

    const safeDifficulty = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';

    const lang = (req.headers['accept-language'] || 'fr').split(',')[0].split('-')[0];

    const { title, items } = await generateExercises({
      subject,
      weakTopics: weakTopics || [],
      errorPatterns: errorPatterns || [],
      analysisSummary: analysisSummary || '',
      specificDifficulties,
      counts: safeCounts,
      difficulty: safeDifficulty,
      lang,
      userId: req.user.id
    });

    // Sauvegarder en DB
    const set = await exerciseRepo.createSet({
      userId: req.user.id,
      subject,
      title,
      difficultySummary: weakTopics?.join(', ') || null,
      feedbackNote: feedbackNote || null
    });

    await exerciseRepo.createItems(set.id, items);

    res.status(201).json({ exerciseSetId: set.id, title });
  } catch (error) {
    next(error);
  }
});

// ─── /correct-item — Correction d'un seul item (open/practical) ──────────────

router.post('/correct-item', express.json({ limit: '50kb' }), async (req, res, next) => {
  try {
    const { exerciseSetId, itemId } = req.body;
    if (!exerciseSetId || !itemId) {
      return res.status(400).json({ error: 'exerciseSetId et itemId requis' });
    }

    const exerciseSet = await exerciseRepo.findById(exerciseSetId, req.user.id);
    if (!exerciseSet) return res.status(404).json({ error: 'Set non trouvé' });

    const item = exerciseSet.items.find(i => i.id === parseInt(itemId));
    if (!item) return res.status(404).json({ error: 'Item non trouvé' });

    if (!item.user_answer || item.user_answer.trim() === '') {
      return res.status(400).json({ error: 'Aucune réponse à corriger' });
    }

    const lang = (req.headers['accept-language'] || 'fr').split(',')[0].split('-')[0];

    const result = await correctSingleItem({
      subject: exerciseSet.subject,
      question: item.question,
      userAnswer: item.user_answer,
      expectedAnswer: item.expected_answer,
      type: item.type,
      lang
    });

    res.json(result);
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

    const lang = (req.headers['accept-language'] || 'fr').split(',')[0].split('-')[0];

    const correction = await correctExercises({
      subject: exerciseSet.subject,
      items: exerciseSet.items,
      lang
    });

    res.json({ correction, exerciseSetId: setId });
  } catch (error) {
    next(error);
  }
});

// ─── /ana — Analyse d'interro par photo ──────────────────────────────────────

router.post('/ana/analyze', async (req, res, next) => {
  try {
    const { image, subject } = req.body;
    if (!image) return res.status(400).json({ error: 'image requis (base64)' });
    if (!subject) return res.status(400).json({ error: 'subject requis' });

    // Note: /ana limit is checked at generate step (monk-mode/generate with source=ana)
    // so no separate check here — avoid double-counting

    // Extraire le texte via OCR
    let examText;
    try {
      examText = await extractTextFromImage(image);
    } catch (ocrErr) {
      console.error('[Ana] OCR error:', ocrErr?.message || ocrErr);
      return res.status(500).json({ error: 'Erreur OCR', message: ocrErr?.message });
    }

    if (!examText || examText.trim().length < 20) {
      console.warn('[Ana] No text detected, length:', examText?.length);
      return res.status(422).json({ error: 'NO_TEXT_DETECTED', message: 'Aucun texte détecté dans l\'image.' });
    }

    const lang = (req.headers['accept-language'] || 'fr').split(',')[0].split('-')[0];
    console.log(`[Ana] OCR OK (${examText.length} chars), analyzing for subject: ${subject}`);

    // Analyser les difficultés
    let analysis;
    try {
      analysis = await analyzeExamDifficulties({ examText, subject, lang });
    } catch (analyzeErr) {
      console.error('[Ana] Analyze error:', analyzeErr?.message || analyzeErr);
      return res.status(500).json({ error: 'Erreur analyse', message: analyzeErr?.message });
    }

    // Générer la note de feedback personnalisée
    let feedbackNote = null;
    try {
      feedbackNote = await generateAnaFeedback({
        weakTopics: analysis.weakTopics,
        strongTopics: analysis.strongTopics,
        summary: analysis.summary,
        examText,
        subject,
        lang
      });
    } catch (fbErr) {
      console.error('[Ana] Feedback note error (non-blocking):', fbErr?.message);
    }

    res.json({ analysis, examText, feedbackNote });
  } catch (error) {
    next(error);
  }
});

// ─── TTS — Synthèse vocale ────────────────────────────────────────────────────

router.post('/tts', requireFeature('has_tts'), express.json({ limit: '10kb' }), async (req, res, next) => {
  try {
    const { text, exerciseId } = req.body;
    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: 'text requis' });
    }

    // Serve from cache if exerciseId provided
    if (exerciseId) {
      const rows = await query(
        'SELECT feedback_audio FROM exercises WHERE id = ? AND user_id = ?',
        [exerciseId, req.user.id]
      );
      if (rows[0]?.feedback_audio) {
        return res.json({ audio: rows[0].feedback_audio, cached: true });
      }
    }

    const audioBase64 = await generateTTS(text);

    // Store in cache
    if (exerciseId) {
      await query(
        'UPDATE exercises SET feedback_audio = ? WHERE id = ? AND user_id = ?',
        [audioBase64, exerciseId, req.user.id]
      );
    }

    res.json({ audio: audioBase64 });
  } catch (error) {
    next(error);
  }
});

export default router;
