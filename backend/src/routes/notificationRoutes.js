import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as notificationService from '../services/notificationService.js';
import * as dailyProgressRepository from '../services/dailyProgressRepository.js';

const router = express.Router();

// Get VAPID public key (for frontend to subscribe)
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Get notification settings for current user
router.get('/settings', authenticate, async (req, res, next) => {
  try {
    const settings = await notificationService.getNotificationSettings(req.user.id);
    const subscription = await notificationService.getSubscription(req.user.id);

    res.json({
      enabled: settings?.notifications_enabled || false,
      subscribed: !!subscription
    });
  } catch (error) {
    next(error);
  }
});

// Enable/disable notifications
router.patch('/settings', authenticate, async (req, res, next) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Le champ "enabled" est requis (true/false)' });
    }

    await notificationService.setNotificationsEnabled(req.user.id, enabled);

    // If disabling, also remove subscription
    if (!enabled) {
      await notificationService.removeSubscription(req.user.id);
    }

    res.json({ enabled });
  } catch (error) {
    next(error);
  }
});

// Subscribe to push notifications
router.post('/subscribe', authenticate, async (req, res, next) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Subscription invalide' });
    }

    await notificationService.saveSubscription(req.user.id, subscription);
    await notificationService.setNotificationsEnabled(req.user.id, true);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticate, async (req, res, next) => {
  try {
    await notificationService.removeSubscription(req.user.id);
    await notificationService.setNotificationsEnabled(req.user.id, false);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Sync daily progress (called from frontend to update goals status)
router.post('/sync-progress', authenticate, async (req, res, next) => {
  try {
    const {
      dailyGoals,
      progressPercentage,
      rewardClaimed,
      quizTime,
      flashcardsTime,
      summaryTime,
      xpAwarded
    } = req.body;

    await dailyProgressRepository.syncDailyProgress(req.user.id, {
      dailyGoals,
      progressPercentage,
      rewardClaimed,
      quizTime,
      flashcardsTime,
      summaryTime,
      xpAwarded
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get full daily progress (called on app load)
router.get('/daily-progress', authenticate, async (req, res, next) => {
  try {
    const data = await dailyProgressRepository.getFullDailyProgress(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Save study history (called when day changes)
router.post('/study-history', authenticate, async (req, res, next) => {
  try {
    const { studyDate, totalSeconds } = req.body;

    if (!studyDate || typeof totalSeconds !== 'number') {
      return res.status(400).json({ error: 'studyDate and totalSeconds required' });
    }

    await dailyProgressRepository.saveStudyHistory(req.user.id, studyDate, totalSeconds);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Test endpoint to send a notification (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', authenticate, async (req, res, next) => {
    try {
      const success = await notificationService.sendNotification(
        req.user.id,
        'Test Nora',
        'Ceci est une notification de test'
      );

      res.json({ success });
    } catch (error) {
      next(error);
    }
  });
}

export default router;
