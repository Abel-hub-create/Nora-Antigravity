import { query } from '../config/database.js';

// Sync daily progress from frontend
export const syncDailyProgress = async (userId, { dailyGoals, progressPercentage, rewardClaimed }) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Upsert: insert or update if exists
  const sql = `
    INSERT INTO daily_progress (user_id, daily_goals, progress_percentage, reward_claimed, progress_date)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      daily_goals = VALUES(daily_goals),
      progress_percentage = VALUES(progress_percentage),
      reward_claimed = VALUES(reward_claimed),
      progress_date = VALUES(progress_date)
  `;

  await query(sql, [
    userId,
    JSON.stringify(dailyGoals || []),
    progressPercentage || 0,
    rewardClaimed || false,
    today
  ]);
};

// Get daily progress for a user
export const getDailyProgress = async (userId) => {
  const today = new Date().toISOString().split('T')[0];

  const sql = `
    SELECT * FROM daily_progress
    WHERE user_id = ? AND progress_date = ?
  `;

  const results = await query(sql, [userId, today]);
  return results[0] || null;
};

// Reset daily progress for a new day (called at midnight or on first access)
export const resetDailyProgressIfNeeded = async (userId) => {
  const today = new Date().toISOString().split('T')[0];

  const existing = await getDailyProgress(userId);

  // If no record for today, reset goals completion status
  if (!existing) {
    const yesterday = await getLatestProgress(userId);

    if (yesterday && yesterday.daily_goals) {
      // Keep goal definitions but reset completion status
      const resetGoals = JSON.parse(yesterday.daily_goals).map(goal => ({
        ...goal,
        completed: false
      }));

      await syncDailyProgress(userId, {
        dailyGoals: resetGoals,
        progressPercentage: 0,
        rewardClaimed: false
      });
    }
  }
};

// Get latest progress record (for reset purposes)
const getLatestProgress = async (userId) => {
  const sql = `
    SELECT * FROM daily_progress
    WHERE user_id = ?
    ORDER BY progress_date DESC
    LIMIT 1
  `;

  const results = await query(sql, [userId]);
  return results[0] || null;
};
