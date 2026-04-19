import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as validators from '../validators/syntheseValidators.js';
import * as syntheseRepo from '../services/syntheseRepository.js';
import { logQuizAnswer } from '../services/exerciseRepository.js';
import { findOrCreateSubjectFolder, addSynthesesToFolder } from '../services/folderRepository.js';
import * as userRepository from '../services/userRepository.js';
import { getUserPlanLimits } from '../services/planRepository.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all syntheses for current user
router.get('/', validate(validators.searchSchema), async (req, res, next) => {
  try {
    const { search, limit, offset } = req.query;
    const syntheses = await syntheseRepo.findAllByUser(req.user.id, { search, limit, offset });
    const total = await syntheseRepo.countByUser(req.user.id);

    res.json({ syntheses, total, limit, offset });
  } catch (error) {
    next(error);
  }
});

// Get single synthese with flashcards and quiz
router.get('/:id', async (req, res, next) => {
  try {
    const synthese = await syntheseRepo.getCompleteSynthese(
      parseInt(req.params.id),
      req.user.id
    );

    if (!synthese) {
      return res.status(404).json({ error: 'Synthèse non trouvée' });
    }

    res.json({ synthese });
  } catch (error) {
    next(error);
  }
});

// Create new synthese with flashcards and quiz
router.post('/', validate(validators.createSyntheseSchema), async (req, res, next) => {
  try {
    const { title, originalContent, summaryContent, sourceType, subject, flashcards, quizQuestions, specificInstructions } = req.body;

    // Check max syntheses limit from user's plan
    const currentCount = await syntheseRepo.countByUser(req.user.id);
    const { limits } = await getUserPlanLimits(req.user.id);
    const maxSyntheses = limits.max_syntheses ?? 3;
    if (currentCount >= maxSyntheses) {
      const error = new Error('SYNTHESES_LIMIT_REACHED');
      error.statusCode = 403;
      error.code = 'SYNTHESES_LIMIT_REACHED';
      throw error;
    }

    // Create synthese
    const synthese = await syntheseRepo.create({
      userId: req.user.id,
      title,
      originalContent,
      summaryContent,
      sourceType,
      subject: subject || null,
      specificInstructions: specificInstructions || null
    });

    // Create associated flashcards
    const createdFlashcards = await syntheseRepo.createFlashcards(synthese.id, flashcards);

    // Create associated quiz questions
    const createdQuizQuestions = await syntheseRepo.createQuizQuestions(synthese.id, quizQuestions);

    // Auto-sort into subject folder if enabled
    if (subject) {
      try {
        const userPrefs = await userRepository.findById(req.user.id);
        if (userPrefs?.auto_folder) {
          const lang = (req.headers['accept-language'] || 'fr').split(',')[0].split('-')[0];
          const folderId = await findOrCreateSubjectFolder(req.user.id, subject, lang);
          if (folderId) await addSynthesesToFolder(folderId, [synthese.id]);
        }
      } catch (e) {
        console.error('[Synthese] Erreur auto-folder:', e);
        // Non-blocking
      }
    }

    res.status(201).json({
      synthese: {
        ...synthese,
        flashcards: createdFlashcards,
        quizQuestions: createdQuizQuestions
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper: vérifier plan premium ou school
async function requirePremiumOrSchool(userId, res) {
  const { plan } = await getUserPlanLimits(userId);
  if (plan !== 'premium' && plan !== 'school') {
    res.status(403).json({ error: 'Fonctionnalité réservée aux plans Premium et School', code: 'PREMIUM_REQUIRED' });
    return false;
  }
  return true;
}

// Edit synthese content (premium/school only)
router.patch('/:id/content', async (req, res, next) => {
  try {
    if (!await requirePremiumOrSchool(req.user.id, res)) return;
    const { summaryContent } = req.body;
    if (!summaryContent || typeof summaryContent !== 'string') {
      return res.status(400).json({ error: 'Contenu invalide' });
    }
    const updated = await syntheseRepo.updateContent(parseInt(req.params.id), req.user.id, summaryContent);
    if (!updated) return res.status(404).json({ error: 'Synthèse non trouvée' });
    res.json({ message: 'Contenu mis à jour' });
  } catch (error) {
    next(error);
  }
});

// Edit flashcard (premium/school only)
router.patch('/:id/flashcards/:flashcardId', async (req, res, next) => {
  try {
    if (!await requirePremiumOrSchool(req.user.id, res)) return;
    const { front, back } = req.body;
    if (!front || !back) return res.status(400).json({ error: 'front et back requis' });
    // Verify synthese belongs to user
    const synthese = await syntheseRepo.findById(parseInt(req.params.id), req.user.id);
    if (!synthese) return res.status(404).json({ error: 'Synthèse non trouvée' });
    const updated = await syntheseRepo.updateFlashcard(parseInt(req.params.flashcardId), parseInt(req.params.id), { front, back });
    if (!updated) return res.status(404).json({ error: 'Flashcard non trouvée' });
    res.json({ message: 'Flashcard mise à jour' });
  } catch (error) {
    next(error);
  }
});

// Edit quiz question (premium/school only)
router.patch('/:id/quiz/:questionId', async (req, res, next) => {
  try {
    if (!await requirePremiumOrSchool(req.user.id, res)) return;
    const { question, options, correctAnswer, explanation } = req.body;
    if (!question || !Array.isArray(options) || options.length !== 4 || typeof correctAnswer !== 'number') {
      return res.status(400).json({ error: 'Données invalides' });
    }
    const synthese = await syntheseRepo.findById(parseInt(req.params.id), req.user.id);
    if (!synthese) return res.status(404).json({ error: 'Synthèse non trouvée' });
    const updated = await syntheseRepo.updateQuizQuestion(parseInt(req.params.questionId), parseInt(req.params.id), { question, options, correctAnswer, explanation: explanation || '' });
    if (!updated) return res.status(404).json({ error: 'Question non trouvée' });
    res.json({ message: 'Question mise à jour' });
  } catch (error) {
    next(error);
  }
});

// Update synthese title
router.patch('/:id/title', validate(validators.updateTitleSchema), async (req, res, next) => {
  try {
    const updated = await syntheseRepo.updateTitle(
      parseInt(req.params.id),
      req.user.id,
      req.body.title
    );

    if (!updated) {
      return res.status(404).json({ error: 'Synthèse non trouvée' });
    }

    res.json({ message: 'Titre mis à jour', title: req.body.title });
  } catch (error) {
    next(error);
  }
});

// Archive synthese (soft delete)
router.patch('/:id/archive', async (req, res, next) => {
  try {
    const archived = await syntheseRepo.archive(
      parseInt(req.params.id),
      req.user.id
    );

    if (!archived) {
      return res.status(404).json({ error: 'Synthèse non trouvée' });
    }

    res.json({ message: 'Synthèse archivée' });
  } catch (error) {
    next(error);
  }
});

// Delete synthese permanently
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await syntheseRepo.remove(
      parseInt(req.params.id),
      req.user.id
    );

    if (!deleted) {
      return res.status(404).json({ error: 'Synthèse non trouvée' });
    }

    res.json({ message: 'Synthèse supprimée' });
  } catch (error) {
    next(error);
  }
});

// Get flashcards for a synthese
router.get('/:id/flashcards', async (req, res, next) => {
  try {
    const synthese = await syntheseRepo.findById(parseInt(req.params.id), req.user.id);
    if (!synthese) {
      return res.status(404).json({ error: 'Synthèse non trouvée' });
    }

    const flashcards = await syntheseRepo.getFlashcardsBySynthese(parseInt(req.params.id));
    res.json({ flashcards, syntheseTitle: synthese.title });
  } catch (error) {
    next(error);
  }
});

// Update flashcard progress
router.post('/flashcards/:id/progress', validate(validators.flashcardProgressSchema), async (req, res, next) => {
  try {
    await syntheseRepo.updateFlashcardProgress(
      parseInt(req.params.id),
      req.body.isCorrect
    );
    res.json({ message: 'Progression mise à jour' });
  } catch (error) {
    next(error);
  }
});

// Get quiz questions for a synthese
router.get('/:id/quiz', async (req, res, next) => {
  try {
    const synthese = await syntheseRepo.findById(parseInt(req.params.id), req.user.id);
    if (!synthese) {
      return res.status(404).json({ error: 'Synthèse non trouvée' });
    }

    const questions = await syntheseRepo.getQuizQuestionsBySynthese(parseInt(req.params.id));
    res.json({ questions, syntheseTitle: synthese.title });
  } catch (error) {
    next(error);
  }
});

// Update quiz progress + log answer for Monk Mode analysis
router.post('/:id/quiz/progress', validate(validators.quizProgressSchema), async (req, res, next) => {
  try {
    const syntheseId = parseInt(req.params.id);
    const { questionId, isCorrect, selectedAnswer } = req.body;

    await syntheseRepo.updateQuizProgress(questionId, isCorrect);

    // Log dans quiz_answers pour analyse Monk Mode (fire-and-forget)
    logQuizAnswer({
      userId: req.user.id,
      questionId,
      syntheseId,
      selectedAnswer: selectedAnswer ?? -1,
      isCorrect
    }).catch(err => console.error('[QuizAnswer] Log failed:', err));

    res.json({ message: 'Progression mise à jour' });
  } catch (error) {
    next(error);
  }
});

export default router;
