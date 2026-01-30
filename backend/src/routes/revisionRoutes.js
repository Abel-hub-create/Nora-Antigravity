import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as revisionRepo from '../services/revisionRepository.js';
import * as revisionCompareService from '../services/revisionCompareService.js';
import * as syntheseRepo from '../services/syntheseRepository.js';

// Helper to calculate mastery score from session data
const calculateMasteryScore = (session) => {
    const understood = revisionRepo.safeJsonParse(session.understood_concepts) || [];
    const missing = revisionRepo.safeJsonParse(session.missing_concepts) || [];
    const total = understood.length + missing.length;
    return total > 0 ? Math.round((understood.length / total) * 100) : 0;
};

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /:syntheseId/session - Get active session or null
 */
router.get('/:syntheseId/session', async (req, res, next) => {
    try {
        const syntheseId = parseInt(req.params.syntheseId);
        const session = await revisionRepo.getSession(req.user.id, syntheseId);

        // Check expiration (15 min inactivity)
        if (session && revisionRepo.isSessionExpired(session)) {
            await revisionRepo.stopSession(req.user.id, syntheseId);
            return res.json({ session: null, expired: true });
        }

        // Parse JSON fields
        if (session) {
            session.missing_concepts = revisionRepo.safeJsonParse(session.missing_concepts);
            session.understood_concepts = revisionRepo.safeJsonParse(session.understood_concepts);
            session.custom_settings = revisionRepo.safeJsonParse(session.custom_settings);
        }

        res.json({ session });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:syntheseId/start - Start new session
 * Body: { requirementLevel?: 'beginner'|'intermediate'|'expert'|'custom', customSettings?: object }
 */
router.post('/:syntheseId/start', async (req, res, next) => {
    try {
        const syntheseId = parseInt(req.params.syntheseId);
        const { requirementLevel, customSettings } = req.body;

        // Verify synthese belongs to user
        const synthese = await syntheseRepo.findById(syntheseId, req.user.id);
        if (!synthese) {
            return res.status(404).json({ error: 'Synthese non trouvee' });
        }

        const session = await revisionRepo.startSession(req.user.id, syntheseId, {
            requirementLevel: requirementLevel || 'intermediate',
            customSettings: customSettings || null
        });
        res.json({ session });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:syntheseId/sync - Sync state (timer, phase)
 */
router.patch('/:syntheseId/sync', async (req, res, next) => {
    try {
        const syntheseId = parseInt(req.params.syntheseId);
        await revisionRepo.syncSession(req.user.id, syntheseId, req.body);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:syntheseId/recall - Submit user recall text
 */
router.post('/:syntheseId/recall', async (req, res, next) => {
    try {
        const syntheseId = parseInt(req.params.syntheseId);
        const { userRecall } = req.body;

        if (!userRecall || userRecall.trim().length < 10) {
            return res.status(400).json({ error: 'Le rappel doit contenir au moins 10 caracteres' });
        }

        await revisionRepo.saveRecall(req.user.id, syntheseId, userRecall.trim());
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:syntheseId/compare - Run AI comparison
 */
router.post('/:syntheseId/compare', async (req, res, next) => {
    try {
        const syntheseId = parseInt(req.params.syntheseId);

        // Get synthese for original summary
        const synthese = await syntheseRepo.getCompleteSynthese(syntheseId, req.user.id);
        if (!synthese) {
            return res.status(404).json({ error: 'Synthese non trouvee' });
        }

        // Get session for user recall and requirement level
        const session = await revisionRepo.getSession(req.user.id, syntheseId);
        if (!session || !session.user_recall) {
            return res.status(400).json({ error: 'Aucun rappel a comparer' });
        }

        // Parse custom settings if present
        const customSettings = revisionRepo.safeJsonParse(session.custom_settings);

        // Run AI comparison with requirement level
        const result = await revisionCompareService.compareRecall(
            synthese.summary_content,
            session.user_recall,
            synthese.specific_instructions || null,
            session.requirement_level || 'intermediate',
            customSettings
        );

        // Save results to session
        await revisionRepo.saveComparison(
            req.user.id,
            syntheseId,
            result.understoodConcepts,
            result.missingConcepts
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:syntheseId/next-iteration - Move to next loop iteration
 */
router.post('/:syntheseId/next-iteration', async (req, res, next) => {
    try {
        const syntheseId = parseInt(req.params.syntheseId);
        const session = await revisionRepo.getSession(req.user.id, syntheseId);

        if (!session) {
            return res.status(404).json({ error: 'Aucune session active' });
        }

        const newIteration = session.current_iteration + 1;

        // Force complete after 8 iterations
        if (newIteration > 8) {
            const result = await revisionRepo.completeSession(req.user.id, syntheseId);
            return res.json({ completed: true, ...result });
        }

        // Reset for next iteration
        await revisionRepo.syncSession(req.user.id, syntheseId, {
            phase: 'recall',
            studyTimeRemaining: session.study_time_remaining,
            pauseTimeRemaining: session.pause_time_remaining,
            currentIteration: newIteration
        });

        res.json({ iteration: newIteration });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:syntheseId/complete - Mark session complete
 */
router.post('/:syntheseId/complete', async (req, res, next) => {
    try {
        const syntheseId = parseInt(req.params.syntheseId);

        // Get session before completing to calculate mastery score
        const session = await revisionRepo.getSession(req.user.id, syntheseId);
        if (!session) {
            return res.status(404).json({ error: 'Aucune session active' });
        }

        // Calculate and save mastery score
        const masteryScore = calculateMasteryScore(session);
        await syntheseRepo.updateMasteryScore(syntheseId, req.user.id, masteryScore);

        // Complete the session
        const result = await revisionRepo.completeSession(req.user.id, syntheseId);

        res.json({ ...result, masteryScore });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:syntheseId/stop - Stop/cancel session
 */
router.delete('/:syntheseId/stop', async (req, res, next) => {
    try {
        const syntheseId = parseInt(req.params.syntheseId);
        await revisionRepo.stopSession(req.user.id, syntheseId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:syntheseId/completions - Get completion count
 */
router.get('/:syntheseId/completions', async (req, res, next) => {
    try {
        const syntheseId = parseInt(req.params.syntheseId);
        const count = await revisionRepo.getCompletionCount(req.user.id, syntheseId);
        res.json({ count });
    } catch (error) {
        next(error);
    }
});

export default router;
