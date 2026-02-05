import { query } from '../config/database.js';

// Get all feedbacks with vote counts (filtered by type, excluding expired)
export const getAllByType = async (type, currentUserId) => {
  const sql = `
    SELECT
      f.id,
      f.user_id,
      f.type,
      f.content,
      f.created_at,
      u.name as author_name,
      u.email as author_email,
      COALESCE(SUM(fv.vote), 0) as net_score,
      (SELECT vote FROM feedback_votes WHERE feedback_id = f.id AND user_id = ?) as user_vote
    FROM feedbacks f
    INNER JOIN users u ON f.user_id = u.id
    LEFT JOIN feedback_votes fv ON f.id = fv.feedback_id
    WHERE f.type = ?
      AND f.created_at > NOW() - INTERVAL 3 DAY
    GROUP BY f.id
    ORDER BY net_score DESC, f.created_at DESC
  `;

  return await query(sql, [currentUserId, type]);
};

// Get daily count of feedbacks (for limit check)
export const getDailyCount = async () => {
  const sql = `
    SELECT COUNT(*) as count
    FROM feedbacks
    WHERE DATE(created_at) = CURDATE()
  `;

  const results = await query(sql);
  return results[0]?.count || 0;
};

// Create a new feedback
export const create = async ({ userId, type, content }) => {
  const sql = `
    INSERT INTO feedbacks (user_id, type, content)
    VALUES (?, ?, ?)
  `;

  const result = await query(sql, [userId, type, content]);
  return { id: result.insertId, userId, type, content };
};

// Delete a feedback (only by owner)
export const remove = async (feedbackId, userId) => {
  const sql = `
    DELETE FROM feedbacks
    WHERE id = ? AND user_id = ?
  `;

  const result = await query(sql, [feedbackId, userId]);
  return result.affectedRows > 0;
};

// Vote on a feedback (upsert)
export const vote = async (feedbackId, userId, voteValue) => {
  // voteValue: 1 = like, -1 = dislike, 0 = remove vote

  if (voteValue === 0) {
    // Remove vote
    const sql = `DELETE FROM feedback_votes WHERE feedback_id = ? AND user_id = ?`;
    await query(sql, [feedbackId, userId]);
    return { removed: true };
  }

  // Upsert vote
  const sql = `
    INSERT INTO feedback_votes (feedback_id, user_id, vote)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE vote = VALUES(vote)
  `;

  await query(sql, [feedbackId, userId, voteValue]);
  return { vote: voteValue };
};

// Get net score for a feedback
export const getNetScore = async (feedbackId) => {
  const sql = `
    SELECT COALESCE(SUM(vote), 0) as net_score
    FROM feedback_votes
    WHERE feedback_id = ?
  `;

  const results = await query(sql, [feedbackId]);
  return results[0]?.net_score || 0;
};

// Check if feedback exists and is not expired
export const findById = async (feedbackId) => {
  const sql = `
    SELECT * FROM feedbacks
    WHERE id = ?
      AND created_at > NOW() - INTERVAL 3 DAY
  `;

  const results = await query(sql, [feedbackId]);
  return results[0] || null;
};
