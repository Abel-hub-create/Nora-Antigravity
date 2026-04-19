import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { findByShareCode } from '../services/userRepository.js';
import { copyToUser, countByUser } from '../services/syntheseRepository.js';
import { getUserPlanLimits } from '../services/planRepository.js';
import { sendNotification } from '../services/notificationService.js';

const router = express.Router();
router.use(authenticate);

// GET /api/share/lookup/:code — trouver un user par son code de partage
router.get('/lookup/:code', async (req, res, next) => {
  try {
    const { limits: senderLimits } = await getUserPlanLimits(req.user.id);
    if (!senderLimits.has_share) {
      return res.status(403).json({ error: 'SHARE_NOT_AVAILABLE', message: 'Le partage est réservé aux membres Premium et École.' });
    }

    const recipient = await findByShareCode(req.params.code);
    if (!recipient) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const { limits: recipientLimits } = await getUserPlanLimits(recipient.id);
    if (!recipientLimits.has_share) {
      return res.status(200).json({ recipient, canReceive: false, reason: 'NOT_PREMIUM' });
    }

    const currentCount = await countByUser(recipient.id);
    const maxSyntheses = recipientLimits.max_syntheses ?? 3;
    const canReceive = currentCount < maxSyntheses;

    res.json({
      recipient: { id: recipient.id, name: recipient.name, avatar: recipient.avatar, plan_type: recipient.plan_type, share_code: recipient.share_code },
      canReceive,
      reason: canReceive ? null : 'QUOTA_FULL',
      synthesesCount: Number(currentCount),
      maxSyntheses,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/share/send/:syntheseId — envoyer une synthèse à un user
router.post('/send/:syntheseId', async (req, res, next) => {
  try {
    const { recipientCode } = req.body;
    if (!recipientCode) return res.status(400).json({ error: 'recipientCode requis' });

    const { limits: senderLimits } = await getUserPlanLimits(req.user.id);
    if (!senderLimits.has_share) {
      return res.status(403).json({ error: 'SHARE_NOT_AVAILABLE' });
    }

    const recipient = await findByShareCode(recipientCode);
    if (!recipient) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    if (recipient.id === req.user.id) return res.status(400).json({ error: 'SELF_SHARE' });

    const { limits: recipientLimits } = await getUserPlanLimits(recipient.id);
    if (!recipientLimits.has_share) {
      return res.status(403).json({ error: 'RECIPIENT_NOT_PREMIUM' });
    }

    const currentCount = await countByUser(recipient.id);
    const maxSyntheses = recipientLimits.max_syntheses ?? 3;
    if (currentCount >= maxSyntheses) {
      return res.status(403).json({ error: 'RECIPIENT_QUOTA_FULL' });
    }

    const newId = await copyToUser(parseInt(req.params.syntheseId), req.user.id, recipient.id);
    if (!newId) return res.status(404).json({ error: 'Synthèse introuvable' });

    await sendNotification(
      recipient.id,
      '📚 Nouvelle synthèse reçue',
      `${req.user.name} t'a partagé une synthèse !`
    ).catch(() => {});

    res.json({ success: true, newSyntheseId: newId });
  } catch (err) {
    next(err);
  }
});

export default router;
