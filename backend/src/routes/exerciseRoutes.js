import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as exerciseRepo from '../services/exerciseRepository.js';

const router = express.Router();
router.use(authenticate);

// Liste des sets d'exercices
router.get('/', async (req, res, next) => {
  try {
    const sets = await exerciseRepo.findAllByUser(req.user.id);
    const total = await exerciseRepo.countByUser(req.user.id);
    res.json({ exercises: sets, total, limit: exerciseRepo.EXERCISE_LIMIT });
  } catch (error) {
    next(error);
  }
});

// Détail d'un set
router.get('/:id', async (req, res, next) => {
  try {
    const set = await exerciseRepo.findById(parseInt(req.params.id), req.user.id);
    if (!set) return res.status(404).json({ error: 'Exercices non trouvés' });
    res.json({ exercise: set });
  } catch (error) {
    next(error);
  }
});

// Sauvegarder la réponse d'un item
router.patch('/items/:itemId/answer', async (req, res, next) => {
  try {
    const { answer } = req.body;
    if (answer === undefined) return res.status(400).json({ error: 'answer requis' });

    const ok = await exerciseRepo.updateAnswer(
      parseInt(req.params.itemId),
      req.user.id,
      answer
    );
    if (!ok) return res.status(404).json({ error: 'Exercice non trouvé' });
    res.json({ message: 'Réponse sauvegardée' });
  } catch (error) {
    next(error);
  }
});

// Supprimer un set
router.delete('/:id', async (req, res, next) => {
  try {
    const set = await exerciseRepo.findById(parseInt(req.params.id), req.user.id);
    if (!set) return res.status(404).json({ error: 'Exercices non trouvés' });
    await exerciseRepo.deleteSet(parseInt(req.params.id), req.user.id);
    res.json({ message: 'Set supprimé' });
  } catch (error) {
    next(error);
  }
});

export default router;
