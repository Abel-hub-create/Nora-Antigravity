import { query } from '../config/database.js';

export const LIMITS = {
  chat: 15,
  exs: 5,
  ana: 5
};

/**
 * Get today's usage for a user. Returns { chat_count, exs_count, ana_count }.
 */
export async function getUsageToday(userId) {
  const rows = await query(
    `SELECT chat_count, exs_count, ana_count FROM daily_usage
     WHERE user_id = ? AND usage_date = CURDATE()`,
    [userId]
  );
  return rows[0] || { chat_count: 0, exs_count: 0, ana_count: 0 };
}

/**
 * Increment a counter (chat | exs | ana) after checking it is below the limit.
 * Returns { allowed: boolean, current: number, limit: number }
 */
export async function checkAndIncrement(userId, type) {
  const limit = LIMITS[type];
  if (!limit) throw new Error(`Unknown usage type: ${type}`);

  const col = `${type}_count`;

  // Upsert row for today, then increment atomically
  await query(
    `INSERT INTO daily_usage (user_id, usage_date, ${col})
     VALUES (?, CURDATE(), 0)
     ON DUPLICATE KEY UPDATE usage_date = usage_date`,
    [userId]
  );

  // Read current count first
  const rows = await query(
    `SELECT ${col} AS cnt FROM daily_usage WHERE user_id = ? AND usage_date = CURDATE()`,
    [userId]
  );
  const current = Number(rows[0]?.cnt ?? 0);

  if (current >= limit) {
    return { allowed: false, current, limit };
  }

  // Increment
  await query(
    `UPDATE daily_usage SET ${col} = ${col} + 1
     WHERE user_id = ? AND usage_date = CURDATE()`,
    [userId]
  );

  return { allowed: true, current: current + 1, limit };
}
