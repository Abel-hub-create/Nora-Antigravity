import { api } from '../lib/api';

/** Attribuer des XP pour une action (serveur détermine le montant et la déduplication) */
export const awardXp = (reason, options = {}) =>
  api.post('/xp/award', { reason, ...options });

/** Vérifier et mettre à jour la winstreak au login */
export const checkWinstreak = (timezone) =>
  api.post('/xp/winstreak', { timezone });

/** Récupérer les sacs de pièces en attente de révélation */
export const getPendingBags = () =>
  api.get('/bags/pending');

/** Révéler un sac de pièces */
export const revealBag = (bagId) =>
  api.post(`/bags/${bagId}/reveal`, {});

/** Révéler tous les sacs en attente d'un coup */
export const revealAllBags = () =>
  api.post('/bags/reveal-all', {});

/** Générer un sac pour un level-up via minuteur (XP frontend) */
export const generateBag = () =>
  api.post('/bags/generate', {});

/** Récupérer les données de la boutique */
export const getShop = () =>
  api.get('/shop');
