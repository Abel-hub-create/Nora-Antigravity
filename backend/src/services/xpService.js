import { query } from '../config/database.js';
import { getUserPlanLimits } from './planRepository.js';
import { getXpConfigMap } from './xpConfigService.js';
import * as coinBagService from './coinBagService.js';

// Modes de déduplication par reason
const DEDUP_MODE = {
  synthesis_created:        'daily_per_context',  // une fois par synthèse (contextId = syntheseId)
  goal_completed:           'daily_per_context',  // une fois par goal par jour (contextId = goalId)
  daily_goals_all_bonus:    'daily_global',       // une fois par jour
  exercise_first_daily:     'daily_global',       // une fois par jour
  vocal_completed:          'daily_per_context',  // une fois par vocal par jour (contextId = messageId ou exerciseId)
  winstreak_daily:          'daily_global',       // une fois par jour
  premium_purchase:         'once_lifetime',      // une seule fois à vie
  admin_grant:              'none',               // pas de dédup
};

// Seuils d'XP par niveau
export const getXpThreshold = (level) => {
  if (level <= 3) return 500;
  if (level <= 9) return 1000;
  return 1200;
};

async function isDuplicate(userId, reason, contextId) {
  const mode = DEDUP_MODE[reason] ?? 'none';
  if (mode === 'none') return false;

  if (mode === 'once_lifetime') {
    const rows = await query(
      `SELECT 1 FROM xp_events WHERE user_id = ? AND reason = ? LIMIT 1`,
      [userId, reason]
    );
    return rows.length > 0;
  }

  if (mode === 'daily_global') {
    const rows = await query(
      `SELECT 1 FROM xp_events WHERE user_id = ? AND reason = ? AND DATE(created_at) = CURDATE() LIMIT 1`,
      [userId, reason]
    );
    return rows.length > 0;
  }

  if (mode === 'daily_per_context') {
    const rows = await query(
      `SELECT 1 FROM xp_events WHERE user_id = ? AND reason = ? AND context_id = ? AND DATE(created_at) = CURDATE() LIMIT 1`,
      [userId, reason, contextId ?? null]
    );
    return rows.length > 0;
  }

  return false;
}

/**
 * Attribue des XP à un utilisateur.
 *
 * @param {number} userId
 * @param {string} reason  - clé dans xp_config
 * @param {object} options
 *   - contextId {string|null}  - identifiant pour la déduplication per_context
 *   - amount    {number|null}  - montant override (admin_grant uniquement)
 *   - goalCount {number}       - nb d'objectifs (pour daily_goals_all_bonus, unused)
 *
 * @returns {{ xpAwarded, multiplier, levelUps, newLevel, newExp, nextLevelExp, coinBags }}
 */
export const awardXp = async (userId, reason, options = {}) => {
  const { contextId = null, amount: overrideAmount = null } = options;

  // 1. Déduplication
  const dupe = await isDuplicate(userId, reason, contextId);
  if (dupe) {
    return { xpAwarded: 0, multiplier: 1, levelUps: 0, newLevel: null, newExp: null, nextLevelExp: null, coinBags: [] };
  }

  // 2. Données utilisateur
  const users = await query(
    `SELECT exp, level, plan_type FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
    [userId]
  );
  if (!users[0]) {
    const e = new Error('Utilisateur introuvable'); e.statusCode = 404; throw e;
  }
  const user = users[0];

  // 3. Multiplicateur XP et plan effectif depuis plan_limits
  const { plan: effectivePlan, limits } = await getUserPlanLimits(userId);
  const multiplier = Number(limits.xp_multiplier) || 1;

  // 4. Montant de base depuis xp_config (ou override admin)
  let xpBase;
  if (reason === 'admin_grant' && overrideAmount != null) {
    xpBase = Math.max(0, Math.floor(overrideAmount));
  } else {
    const configMap = await getXpConfigMap();
    xpBase = configMap[reason] ?? 0;
  }

  // admin_grant ne multiplie pas (déjà un avantage admin)
  const xpTotal = reason === 'admin_grant' ? xpBase : xpBase * multiplier;

  if (xpTotal === 0) {
    return { xpAwarded: 0, multiplier, levelUps: 0, newLevel: user.level, newExp: user.exp, nextLevelExp: getXpThreshold(user.level), coinBags: [] };
  }

  // 5. Boucle de montée de niveau
  let currentExp = user.exp + xpTotal;
  let currentLevel = user.level;
  let levelUps = 0;
  const coinBags = [];

  while (true) {
    const threshold = getXpThreshold(currentLevel);
    if (currentExp >= threshold) {
      currentExp -= threshold;
      currentLevel++;
      levelUps++;
      try {
        const bag = await coinBagService.generateBag(userId, effectivePlan || user.plan_type);
        coinBags.push(bag);
      } catch (e) {
        console.error('[XP] Erreur génération sac:', e.message);
      }
    } else {
      break;
    }
  }

  const nextLevelExp = getXpThreshold(currentLevel);

  // 6. Mise à jour en base
  await query(
    `UPDATE users SET exp = ?, level = ?, next_level_exp = ?, updated_at = NOW() WHERE id = ?`,
    [currentExp, currentLevel, nextLevelExp, userId]
  );

  await query(
    `INSERT INTO xp_events (user_id, reason, context_id, xp_base, xp_multiplier_used, xp_total) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, reason, contextId, xpBase, multiplier, xpTotal]
  );

  return { xpAwarded: xpTotal, multiplier, levelUps, newLevel: currentLevel, newExp: currentExp, nextLevelExp, coinBags };
};
