import { query } from '../config/database.js';

// Sync daily progress from frontend (includes study times)
export const syncDailyProgress = async (userId, {
  dailyGoals,
  progressPercentage,
  rewardClaimed,
  quizTime,
  flashcardsTime,
  summaryTime,
  xpAwarded
}) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Upsert: insert or update if exists
  const sql = `
    INSERT INTO daily_progress (user_id, daily_goals, progress_percentage, reward_claimed, quiz_time, flashcards_time, summary_time, xp_awarded, progress_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      daily_goals = VALUES(daily_goals),
      progress_percentage = VALUES(progress_percentage),
      reward_claimed = VALUES(reward_claimed),
      quiz_time = VALUES(quiz_time),
      flashcards_time = VALUES(flashcards_time),
      summary_time = VALUES(summary_time),
      xp_awarded = VALUES(xp_awarded),
      progress_date = VALUES(progress_date)
  `;

  await query(sql, [
    userId,
    JSON.stringify(dailyGoals || []),
    progressPercentage || 0,
    rewardClaimed || false,
    quizTime || 0,
    flashcardsTime || 0,
    summaryTime || 0,
    JSON.stringify(xpAwarded || {}),
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
      // Handle both string and already-parsed object (MySQL2 auto-parses JSON columns)
      const goals = typeof yesterday.daily_goals === 'string'
        ? JSON.parse(yesterday.daily_goals)
        : yesterday.daily_goals;
      const resetGoals = goals.map(goal => ({
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

// Save to study history (called when day changes)
export const saveStudyHistory = async (userId, studyDate, totalSeconds) => {
  if (totalSeconds <= 0) return;

  const sql = `
    INSERT INTO study_history (user_id, study_date, total_seconds)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE total_seconds = VALUES(total_seconds)
  `;

  await query(sql, [userId, studyDate, totalSeconds]);
};

// Get study history for average calculation (last 30 days)
export const getStudyHistory = async (userId) => {
  const sql = `
    SELECT study_date, total_seconds
    FROM study_history
    WHERE user_id = ?
    ORDER BY study_date DESC
    LIMIT 30
  `;

  const results = await query(sql, [userId]);
  return results.map(r => ({
    date: r.study_date,
    totalSeconds: r.total_seconds
  }));
};

// Get full daily progress with history for initial load
export const getFullDailyProgress = async (userId) => {
  const today = new Date().toISOString().split('T')[0];

  // Get today's progress
  const progressSql = `
    SELECT * FROM daily_progress
    WHERE user_id = ?
    ORDER BY progress_date DESC
    LIMIT 1
  `;
  const progressResults = await query(progressSql, [userId]);
  const progress = progressResults[0] || null;

  // Get study history
  const history = await getStudyHistory(userId);

  // Check if progress is from today
  const isToday = progress && progress.progress_date &&
    new Date(progress.progress_date).toISOString().split('T')[0] === today;

  // Helper to safely parse JSON (handles both string and already-parsed object)
  const safeJsonParse = (data, defaultValue = null) => {
    if (!data) return defaultValue;
    if (typeof data === 'object') return data; // Already parsed by MySQL2
    try {
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  };

  // Parse goals and reset completion status if not today
  const parsedGoals = safeJsonParse(progress?.daily_goals, null);
  const dailyGoals = parsedGoals
    ? (isToday ? parsedGoals : parsedGoals.map(g => ({ ...g, completed: false })))
    : null;

  return {
    dailyStats: isToday ? {
      date: new Date(progress.progress_date).toDateString(),
      quizTime: progress.quiz_time || 0,
      flashcardsTime: progress.flashcards_time || 0,
      summaryTime: progress.summary_time || 0,
      xpAwarded: safeJsonParse(progress.xp_awarded, {
        quiz: false,
        flashcards: false,
        summary: false,
        allBonus: false
      })
    } : null,
    dailyGoals: dailyGoals,
    dailyGoalsRewardClaimed: isToday ? progress.reward_claimed : false,
    studyHistory: history
  };
};
