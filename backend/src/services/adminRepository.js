import { query } from '../config/database.js';

// ─── Admin accounts ───────────────────────────────────────────────────────────

export const findAdminByEmail = async (email) => {
  const rows = await query(`SELECT * FROM admins WHERE email = ? LIMIT 1`, [email]);
  return rows[0] || null;
};

export const findAdminById = async (id) => {
  const rows = await query(`SELECT id, email, last_login_at, created_at FROM admins WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

export const updateAdminLastLogin = async (adminId) => {
  await query(`UPDATE admins SET last_login_at = NOW() WHERE id = ?`, [adminId]);
};

export const saveTotpSecret = async (adminId, secret) => {
  await query(`UPDATE admins SET totp_secret = ? WHERE id = ?`, [secret, adminId]);
};

export const enableTotp = async (adminId) => {
  await query(`UPDATE admins SET totp_enabled = 1 WHERE id = ?`, [adminId]);
};

// ─── Global stats ─────────────────────────────────────────────────────────────

export const getStats = async () => {
  const [[users], [syntheses], [banned], [premium], [newToday], [newWeek]] = await Promise.all([
    query(`SELECT COUNT(*) as total FROM users WHERE is_active = 1`),
    query(`SELECT COUNT(*) as total FROM syntheses WHERE is_archived = 0`),
    query(`SELECT COUNT(*) as total FROM users WHERE is_banned = 1`),
    query(`SELECT COUNT(*) as total FROM users WHERE premium_expires_at > NOW()`),
    query(`SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = CURDATE()`),
    query(`SELECT COUNT(*) as total FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`),
  ]);
  return {
    totalUsers: Number(users.total),
    totalSyntheses: Number(syntheses.total),
    bannedUsers: Number(banned.total),
    premiumUsers: Number(premium.total),
    newUsersToday: Number(newToday.total),
    newUsersThisWeek: Number(newWeek.total),
  };
};

// ─── User management ──────────────────────────────────────────────────────────

export const getAllUsers = async ({ page = 1, limit = 50, search = '', filter = 'all' }) => {
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE u.is_active = 1';

  if (search) {
    where += ` AND (u.email LIKE ? OR u.name LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (filter === 'banned') where += ' AND u.is_banned = 1';
  if (filter === 'premium') where += ' AND u.premium_expires_at > NOW()';
  if (filter === 'free') where += ' AND (u.premium_expires_at IS NULL OR u.premium_expires_at <= NOW())';

  const countRows = await query(
    `SELECT COUNT(*) as total FROM users u ${where}`,
    params
  );
  const total = Number(countRows[0].total);

  const users = await query(
    `SELECT u.id, u.email, u.name, u.level, u.exp, u.is_banned, u.banned_reason,
            u.premium_expires_at, u.created_at, u.last_login_at,
            COUNT(DISTINCT s.id) as syntheses_count
     FROM users u
     LEFT JOIN syntheses s ON s.user_id = u.id AND s.is_archived = 0
     ${where}
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { users, total, page, totalPages: Math.ceil(total / limit) };
};

export const getUserById = async (id) => {
  const rows = await query(
    `SELECT u.*, COUNT(DISTINCT s.id) as syntheses_count
     FROM users u
     LEFT JOIN syntheses s ON s.user_id = u.id AND s.is_archived = 0
     WHERE u.id = ?
     GROUP BY u.id`,
    [id]
  );
  if (!rows[0]) return null;
  const user = rows[0];
  // Remove sensitive fields
  delete user.password;
  const syntheses = await query(
    `SELECT id, title, subject, created_at FROM syntheses WHERE user_id = ? AND is_archived = 0 ORDER BY created_at DESC LIMIT 10`,
    [id]
  );
  return { ...user, recentSyntheses: syntheses };
};

export const banUser = async (userId, reason = null) => {
  await query(
    `UPDATE users SET is_banned = 1, banned_reason = ?, banned_at = NOW() WHERE id = ?`,
    [reason, userId]
  );
  // Invalidate all refresh tokens
  await query(`DELETE FROM refresh_tokens WHERE user_id = ?`, [userId]);
};

export const unbanUser = async (userId) => {
  await query(
    `UPDATE users SET is_banned = 0, banned_reason = NULL, banned_at = NULL WHERE id = ?`,
    [userId]
  );
};

export const setPremium = async (userId, expiresAt) => {
  await query(
    `UPDATE users SET premium_expires_at = ? WHERE id = ?`,
    [expiresAt || null, userId]
  );
};

export const deleteUser = async (userId) => {
  // Cascade: delete all user data in dependency order
  await query(`DELETE FROM refresh_tokens WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM password_resets WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM push_subscriptions WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM chat_messages WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM daily_usage WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM daily_progress WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM study_history WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM quiz_answers WHERE user_id = ?`, [userId]);

  // Exercise items depend on exercises
  const exerciseIds = await query(`SELECT id FROM exercises WHERE user_id = ?`, [userId]);
  if (exerciseIds.length) {
    const ids = exerciseIds.map(r => r.id);
    await query(`DELETE FROM exercise_items WHERE exercise_set_id IN (?)`, [ids]);
  }
  await query(`DELETE FROM exercises WHERE user_id = ?`, [userId]);

  // Revision completions depend on revision sessions
  const revisionIds = await query(`SELECT id FROM revision_sessions WHERE user_id = ?`, [userId]);
  if (revisionIds.length) {
    const ids = revisionIds.map(r => r.id);
    await query(`DELETE FROM revision_completions WHERE session_id IN (?)`, [ids]);
  }
  await query(`DELETE FROM revision_sessions WHERE user_id = ?`, [userId]);

  // Feedback votes depend on feedbacks
  const feedbackIds = await query(`SELECT id FROM feedbacks WHERE user_id = ?`, [userId]);
  if (feedbackIds.length) {
    const ids = feedbackIds.map(r => r.id);
    await query(`DELETE FROM feedback_votes WHERE feedback_id IN (?)`, [ids]);
  }
  await query(`DELETE FROM feedbacks WHERE user_id = ?`, [userId]);
  // Also delete votes this user cast on others' feedbacks
  await query(`DELETE FROM feedback_votes WHERE user_id = ?`, [userId]);

  // Folders and syntheses
  await query(`DELETE FROM folders WHERE user_id = ?`, [userId]);
  const syntheseIds = await query(`SELECT id FROM syntheses WHERE user_id = ?`, [userId]);
  if (syntheseIds.length) {
    const ids = syntheseIds.map(r => r.id);
    await query(`DELETE FROM flashcards WHERE synthese_id IN (?)`, [ids]);
    await query(`DELETE FROM quiz_questions WHERE synthese_id IN (?)`, [ids]);
    await query(`DELETE FROM folder_syntheses WHERE synthese_id IN (?)`, [ids]);
    await query(`DELETE FROM syntheses WHERE user_id = ?`, [userId]);
  }

  await query(`DELETE FROM users WHERE id = ?`, [userId]);
};

// ─── Announcements ────────────────────────────────────────────────────────────

export const getAnnouncements = async () => {
  return await query(`SELECT * FROM announcements ORDER BY created_at DESC`);
};

export const getActiveAnnouncements = async (audience = 'free') => {
  return await query(
    `SELECT id, title, body, type FROM announcements
     WHERE is_active = 1
       AND (starts_at IS NULL OR starts_at <= NOW())
       AND (ends_at IS NULL OR ends_at > NOW())
       AND (target_audience = 'all' OR target_audience = ?)
     ORDER BY created_at DESC`,
    [audience]
  );
};

export const createAnnouncement = async ({ title, body, type, target_audience, is_active, starts_at, ends_at, adminId }) => {
  const result = await query(
    `INSERT INTO announcements (title, body, type, target_audience, is_active, starts_at, ends_at, created_by_admin_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, body, type || 'info', target_audience || 'all', is_active ?? 1, starts_at || null, ends_at || null, adminId]
  );
  const rows = await query(`SELECT * FROM announcements WHERE id = ?`, [result.insertId]);
  return rows[0];
};

export const updateAnnouncement = async (id, { title, body, type, target_audience, is_active, starts_at, ends_at }) => {
  await query(
    `UPDATE announcements SET
       title = COALESCE(?, title),
       body = COALESCE(?, body),
       type = COALESCE(?, type),
       target_audience = COALESCE(?, target_audience),
       is_active = CASE WHEN ? IS NOT NULL THEN ? ELSE is_active END,
       starts_at = ?,
       ends_at = ?,
       updated_at = NOW()
     WHERE id = ?`,
    [title, body, type, target_audience,
     is_active !== undefined ? 1 : null, is_active ? 1 : 0,
     starts_at || null, ends_at || null, id]
  );
  const rows = await query(`SELECT * FROM announcements WHERE id = ?`, [id]);
  return rows[0];
};

export const deleteAnnouncement = async (id) => {
  await query(`DELETE FROM announcements WHERE id = ?`, [id]);
};

export const markAnnouncementSent = async (id) => {
  await query(`UPDATE announcements SET sent_at = NOW() WHERE id = ?`, [id]);
};

export const getAllUserEmails = async () => {
  return await query(
    `SELECT email, name, language FROM users WHERE is_active = 1 AND is_banned = 0 AND is_verified = 1`
  );
};
