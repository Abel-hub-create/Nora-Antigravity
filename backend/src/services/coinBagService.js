import { query, pool, applyTablePrefix } from '../config/database.js';

/**
 * Tirage pondéré côté serveur uniquement — anti-triche.
 * Les probabilités sont des seuils cumulatifs (pas indépendants).
 */
function rollCoins(planType) {
  const roll = Math.random() * 100;
  if (planType === 'premium' || planType === 'school') {
    if (roll < 1)  return 150; // 1%
    if (roll < 31) return 60;  // 30%
    if (roll < 81) return 40;  // 50%
    return 20;                 // 69%
  }
  // free
  if (roll < 1)  return 50;  // 1%
  if (roll < 31) return 20;  // 30%
  return 10;                 // 69%
}

export const generateBag = async (userId, planType) => {
  const coinsAmount = rollCoins(planType || 'free');
  const result = await query(
    `INSERT INTO pending_coin_bags (user_id, coins_amount, plan_type_at_creation) VALUES (?, ?, ?)`,
    [userId, coinsAmount, planType || 'free']
  );
  return { id: result.insertId, coinsAmount };
};

export const revealBag = async (userId, bagId) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [bags] = await conn.query(
      applyTablePrefix(`SELECT * FROM pending_coin_bags WHERE id = ? AND user_id = ? LIMIT 1`),
      [bagId, userId]
    );
    if (!bags[0]) {
      await conn.rollback();
      const e = new Error('Sac introuvable'); e.statusCode = 404; throw e;
    }
    if (bags[0].revealed_at !== null) {
      await conn.rollback();
      const e = new Error('Sac déjà révélé'); e.statusCode = 409; throw e;
    }

    const coinsAwarded = bags[0].coins_amount;

    await conn.query(
      applyTablePrefix(`UPDATE pending_coin_bags SET revealed_at = NOW() WHERE id = ?`),
      [bagId]
    );
    await conn.query(
      applyTablePrefix(`UPDATE users SET coins = coins + ? WHERE id = ?`),
      [coinsAwarded, userId]
    );
    await conn.query(
      applyTablePrefix(`INSERT INTO coin_transactions (user_id, amount, reason, context_id) VALUES (?, ?, 'bag_reveal', ?)`),
      [userId, coinsAwarded, String(bagId)]
    );

    const [userRows] = await conn.query(
      applyTablePrefix(`SELECT coins FROM users WHERE id = ? LIMIT 1`),
      [userId]
    );
    const newBalance = userRows[0]?.coins ?? 0;

    await conn.commit();
    return { coinsAwarded, newBalance };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

export const getPendingBags = async (userId) => {
  return await query(
    `SELECT id, coins_amount, plan_type_at_creation, created_at
     FROM pending_coin_bags
     WHERE user_id = ? AND revealed_at IS NULL
     ORDER BY created_at ASC`,
    [userId]
  );
};
