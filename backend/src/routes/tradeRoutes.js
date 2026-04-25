import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  createTradeRequest, getInbox, getInboxCount,
  refuseRequest, getAvailableCards, acceptRequest,
} from '../services/tradeRepository.js';

const router = express.Router();
router.use(authenticate);

// POST /api/trades/request — envoyer une demande d'échange
router.post('/request', async (req, res, next) => {
  try {
    const { receiverShareCode, offeredCardId } = req.body;
    if (!receiverShareCode || !offeredCardId) return res.status(400).json({ error: 'MISSING_PARAMS' });
    const result = await createTradeRequest(req.user.id, receiverShareCode, offeredCardId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/trades/inbox — boîte de réception
router.get('/inbox', async (req, res, next) => {
  try {
    const requests = await getInbox(req.user.id);
    res.json({ requests });
  } catch (err) { next(err); }
});

// GET /api/trades/inbox/count — badge count
router.get('/inbox/count', async (req, res, next) => {
  try {
    const count = await getInboxCount(req.user.id);
    res.json({ count });
  } catch (err) { next(err); }
});

// PUT /api/trades/:id/refuse — refuser
router.put('/:id/refuse', async (req, res, next) => {
  try {
    const result = await refuseRequest(Number(req.params.id), req.user.id);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/trades/:id/available-cards — cartes disponibles pour l'échange
router.get('/:id/available-cards', async (req, res, next) => {
  try {
    const result = await getAvailableCards(Number(req.params.id), req.user.id);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) { next(err); }
});

// PUT /api/trades/:id/accept — accepter et exécuter l'échange
router.put('/:id/accept', async (req, res, next) => {
  try {
    const { requestedCardId } = req.body;
    if (!requestedCardId) return res.status(400).json({ error: 'MISSING_PARAMS' });
    const result = await acceptRequest(Number(req.params.id), req.user.id, requestedCardId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
