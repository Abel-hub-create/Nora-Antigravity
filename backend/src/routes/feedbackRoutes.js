import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as validators from '../validators/feedbackValidators.js';
import * as feedbackRepo from '../services/feedbackRepository.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

const DAILY_LIMIT = 100; // Combined limit for reviews + suggestions

// Get all reviews
router.get('/reviews', async (req, res, next) => {
  try {
    const reviews = await feedbackRepo.getAllByType('review', req.user.id);
    res.json({ reviews });
  } catch (error) {
    next(error);
  }
});

// Get all suggestions
router.get('/suggestions', async (req, res, next) => {
  try {
    const suggestions = await feedbackRepo.getAllByType('suggestion', req.user.id);
    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});

// Get daily count (for UI to show remaining)
router.get('/daily-count', async (req, res, next) => {
  try {
    const count = await feedbackRepo.getDailyCount();
    res.json({ count, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - count) });
  } catch (error) {
    next(error);
  }
});

// Create a review
router.post('/reviews', validate(validators.createReviewSchema), async (req, res, next) => {
  try {
    // Check daily limit
    const dailyCount = await feedbackRepo.getDailyCount();
    if (dailyCount >= DAILY_LIMIT) {
      return res.status(429).json({
        error: 'DAILY_LIMIT_REACHED',
        message: 'Limite quotidienne atteinte. Reviens demain pour partager ton avis !'
      });
    }

    const review = await feedbackRepo.create({
      userId: req.user.id,
      type: 'review',
      content: req.body.content
    });

    res.status(201).json({ review });
  } catch (error) {
    next(error);
  }
});

// Create a suggestion
router.post('/suggestions', validate(validators.createSuggestionSchema), async (req, res, next) => {
  try {
    // Check daily limit
    const dailyCount = await feedbackRepo.getDailyCount();
    if (dailyCount >= DAILY_LIMIT) {
      return res.status(429).json({
        error: 'DAILY_LIMIT_REACHED',
        message: 'Limite quotidienne atteinte. Reviens demain pour proposer ta suggestion !'
      });
    }

    const suggestion = await feedbackRepo.create({
      userId: req.user.id,
      type: 'suggestion',
      content: req.body.content
    });

    res.status(201).json({ suggestion });
  } catch (error) {
    next(error);
  }
});

// Vote on a feedback (review or suggestion)
router.post('/:id/vote', validate(validators.voteSchema), async (req, res, next) => {
  try {
    const feedbackId = parseInt(req.params.id);

    // Check feedback exists and not expired
    const feedback = await feedbackRepo.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback non trouvé ou expiré' });
    }

    await feedbackRepo.vote(feedbackId, req.user.id, req.body.vote);

    // Return updated net score
    const netScore = await feedbackRepo.getNetScore(feedbackId);

    res.json({ netScore, userVote: req.body.vote });
  } catch (error) {
    next(error);
  }
});

// Delete a feedback (only owner)
router.delete('/:id', validate(validators.deleteSchema), async (req, res, next) => {
  try {
    const feedbackId = parseInt(req.params.id);

    const deleted = await feedbackRepo.remove(feedbackId, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Feedback non trouvé ou non autorisé' });
    }

    res.json({ message: 'Feedback supprimé' });
  } catch (error) {
    next(error);
  }
});

export default router;
