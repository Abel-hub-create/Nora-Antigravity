import { query } from '../config/database.js';
import { getUserPlanLimits } from './planRepository.js';

// Default fallback limits (used if plan limits not found)
export const DEFAULT_LIMITS = {
  chat: 3,
  exs: 3,
  ana: 3
};

// Map usage type to plan_limits key
const LIMIT_KEY_MAP = {
  chat: 'max_chat_per_day',
  exs: 'max_exs_per_day',
  ana: 'max_ana_per_day'
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
  // Get dynamic limit from user's plan
  let limit = DEFAULT_LIMITS[type];
  try {
    const { limits } = await getUserPlanLimits(userId);
    const planKey = LIMIT_KEY_MAP[type];
    if (planKey && limits[planKey] !== undefined) {
      limit = limits[planKey];
    }
  } catch (err) {
    console.warn('[DailyUsage] Failed to get plan limits, using defaults:', err.message);
  }
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
