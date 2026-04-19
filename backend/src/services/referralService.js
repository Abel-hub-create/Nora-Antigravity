import { query } from '../config/database.js';

const REFEREE_COINS    = 50;
const REFERRER_COINS   = 20;
const PREMIUM_DAYS     = 7;

// Distribue les récompenses au moment de l'onboarding du filleul
export async function processReferralReward(refereeId) {
  // Récupère le parrain du filleul
  const rows = await query(`SELECT referred_by FROM users WHERE id = ? LIMIT 1`, [refereeId]);
  const referrerId = rows[0]?.referred_by;
  if (!referrerId || referrerId === refereeId) return;

  // Idempotent : ne récompense qu'une seule fois par filleul
  const already = await query(`SELECT id FROM referral_rewards WHERE referee_id = ? LIMIT 1`, [refereeId]);
  if (already[0]) return;

  // +50 pièces au filleul
  await query(`UPDATE users SET coins = coins + ? WHERE id = ?`, [REFEREE_COINS, refereeId]);

  // Vérifier si c'est le 1er filleul du parrain
  const prevReferrals = await query(`SELECT id FROM referral_rewards WHERE referrer_id = ? LIMIT 1`, [referrerId]);
  const isFirst = !prevReferrals[0];

  if (isFirst) {
    // 1ère fois → 1 semaine premium
    await query(`
      UPDATE users SET
        plan_type = 'premium',
        premium_expires_at = DATE_ADD(
          GREATEST(COALESCE(premium_expires_at, NOW()), NOW()),
          INTERVAL ? DAY
        )
      WHERE id = ?
    `, [PREMIUM_DAYS, referrerId]);

    await query(
      `INSERT INTO referral_rewards (referrer_id, referee_id, reward_type) VALUES (?, ?, 'premium_week')`,
      [referrerId, refereeId]
    );
  } else {
    // Filleuls suivants → 20 pièces
    await query(`UPDATE users SET coins = coins + ? WHERE id = ?`, [REFERRER_COINS, referrerId]);

    await query(
      `INSERT INTO referral_rewards (referrer_id, referee_id, reward_type, coins_amount) VALUES (?, ?, 'coins', ?)`,
      [referrerId, refereeId, REFERRER_COINS]
    );
  }
}

// Statistiques parrainage d'un user (pour le profil)
export async function getReferralStats(userId) {
  const rows = await query(`
    SELECT COUNT(*) as total,
      SUM(reward_type = 'premium_week') as premium_given,
      SUM(CASE WHEN reward_type = 'coins' THEN coins_amount ELSE 0 END) as coins_earned
    FROM referral_rewards WHERE referrer_id = ?
  `, [userId]);
  return rows[0];
}
