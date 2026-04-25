import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  getAllCards, getUserCards, openPack,
  getDailyCards, buyDailyCard, getSetProgress, getUserCollection,
} from '../services/cardRepository.js';

const router = express.Router();

router.use(authenticate);

// GET /api/cards — catalogue complet
router.get('/', async (req, res, next) => {
  try {
    const cards = await getAllCards();
    res.json({ cards });
  } catch (err) { next(err); }
});

// GET /api/cards/my — ma collection
router.get('/my', async (req, res, next) => {
  try {
    const cards = await getUserCards(req.user.id);
    const sets  = await getSetProgress(req.user.id);
    res.json({ cards, sets });
  } catch (err) { next(err); }
});

// GET /api/cards/daily — cartes du jour
router.get('/daily', async (req, res, next) => {
  try {
    const cards = await getDailyCards(req.user.id);
    res.json({ cards });
  } catch (err) { next(err); }
});

// POST /api/cards/daily/:cardId/buy — acheter une carte du jour
router.post('/daily/:cardId/buy', async (req, res, next) => {
  try {
    const result = await buyDailyCard(req.user.id, req.params.cardId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/cards/pack/:type/open — ouvrir un pack (basic | rare | legend)
router.post('/pack/:type/open', async (req, res, next) => {
  try {
    const result = await openPack(req.user.id, req.params.type);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/cards/collection — catalogue complet avec count par carte (pour le classeur)
router.get('/collection', async (req, res, next) => {
  try {
    const cards = await getUserCollection(req.user.id);
    res.json({ cards });
  } catch (err) { next(err); }
});

// GET /api/cards/sets — progression des sets
router.get('/sets', async (req, res, next) => {
  try {
    const sets = await getSetProgress(req.user.id);
    res.json({ sets });
  } catch (err) { next(err); }
});

export default router;
