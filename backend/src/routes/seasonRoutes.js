import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  getActiveSeason,
  getLeaderboard,
  getUserBadges,
} from '../services/seasonRepository.js';

const router = express.Router();

// GET /api/seasons/active — saison en cours (pour l'horloge du profil)
router.get('/active', authenticate, async (req, res) => {
  try {
    const season = await getActiveSeason();
    res.json({ season: season || null });
  } catch (err) {
    console.error('[seasons] Error fetching active season:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/seasons/leaderboard — top 50
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const [users, season] = await Promise.all([getLeaderboard(), getActiveSeason()]);
    res.json({ leaderboard: users, season: season || null });
  } catch (err) {
    console.error('[seasons] Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/seasons/badges/:userId — badges d'un utilisateur
router.get('/badges/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
    const badges = await getUserBadges(userId);
    res.json({ badges });
  } catch (err) {
    console.error('[seasons] Error fetching badges:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
