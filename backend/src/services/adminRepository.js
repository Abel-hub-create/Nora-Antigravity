import { query } from '../config/database.js';

export async function findAdminByEmail(email) {
  const rows = await query(
    `SELECT * FROM admins WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findAdminById(id) {
  const rows = await query(
    `SELECT * FROM admins WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createAdmin(email, passwordHash, totpSecret = null) {
  const result = await query(
    `INSERT INTO admins (email, password_hash, totp_secret) VALUES (?, ?, ?)`,
    [email, passwordHash, totpSecret]
  );
  return result.insertId;
}

export async function updateAdminTotpSecret(adminId, totpSecret) {
  await query(
    `UPDATE admins SET totp_secret = ? WHERE id = ?`,
    [totpSecret, adminId]
  );
}

export async function enableTotp(adminId) {
  await query(
    `UPDATE admins SET totp_enabled = 1 WHERE id = ?`,
    [adminId]
  );
}

export async function updateAdminPassword(adminId, passwordHash) {
  await query(
    `UPDATE admins SET password_hash = ? WHERE id = ?`,
    [passwordHash, adminId]
  );
}

export async function updateAdminLastLogin(adminId) {
  await query(
    `UPDATE admins SET last_login_at = NOW() WHERE id = ?`,
    [adminId]
  );
}

export async function storeRefreshToken(adminId, tokenHash, expiresAt) {
  await query(
    `INSERT INTO admin_refresh_tokens (admin_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [adminId, tokenHash, expiresAt]
  );
}

export async function findRefreshToken(tokenHash) {
  const rows = await query(
    `SELECT * FROM admin_refresh_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function deleteRefreshToken(tokenHash) {
  await query(
    `DELETE FROM admin_refresh_tokens WHERE token_hash = ?`,
    [tokenHash]
  );
}

export async function deleteExpiredTokens() {
  await query(`DELETE FROM admin_refresh_tokens WHERE expires_at <= NOW()`);
}

// ─── User Management ─────────────────────────────────────────────────────────

export async function getAllUsers({ page = 1, limit = 50, search = '', filter = 'all' }) {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params = [];

  if (search) {
    whereClause = 'WHERE (u.email LIKE ? OR u.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (filter === 'premium') {
    whereClause += (whereClause ? ' AND ' : 'WHERE ') + 'u.plan_type != "free"';
  } else if (filter === 'banned') {
    whereClause += (whereClause ? ' AND ' : 'WHERE ') + 'u.is_banned = 1';
  } else if (filter === 'free') {
    whereClause += (whereClause ? ' AND ' : 'WHERE ') + 'u.plan_type = "free"';
  }

  const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
  const dataQuery = `
    SELECT u.*, 
           (SELECT COUNT(*) FROM syntheses WHERE user_id = u.id) as syntheses_count
    FROM users u
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [countResult, users] = await Promise.all([
    query(countQuery, params),
    query(dataQuery, [...params, limit, offset])
  ]);

  const total = countResult[0].total;
  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export async function getUserById(userId) {
  const rows = await query(
    `SELECT u.*, 
            (SELECT COUNT(*) FROM syntheses WHERE user_id = u.id) as syntheses_count,
            (SELECT COUNT(*) FROM flashcards f JOIN syntheses s ON f.synthese_id = s.id WHERE s.user_id = u.id) as flashcards_count,
            (SELECT COUNT(*) FROM quiz_questions q JOIN syntheses s ON q.synthese_id = s.id WHERE s.user_id = u.id) as quiz_count
     FROM users u
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function updateUserBanStatus(userId, isBanned, banReason = null) {
  await query(
    `UPDATE users SET is_banned = ?, ban_reason = ? WHERE id = ?`,
    [isBanned ? 1 : 0, banReason, userId]
  );
}

export async function updateUserPlan(userId, planType) {
  await query(
    `UPDATE users SET plan_type = ? WHERE id = ?`,
    [planType, userId]
  );
}

export async function banUser(userId, reason = null) {
  await query(
    `UPDATE users SET is_banned = 1, banned_reason = ?, banned_at = NOW() WHERE id = ?`,
    [reason, userId]
  );
}

export async function unbanUser(userId) {
  await query(
    `UPDATE users SET is_banned = 0, banned_reason = NULL, banned_at = NULL WHERE id = ?`,
    [userId]
  );
}

export async function setPremium(userId, expiresAt = null) {
  // If expiresAt is explicitly null, set premium permanent (far future date)
  // If expiresAt is undefined or empty string, set premium for 1 year
  // If expiresAt is a valid date, use it
  
  let finalDate = expiresAt;
  
  if (expiresAt === null || expiresAt === 'null') {
    // Premium permanent - max TIMESTAMP value (MySQL TIMESTAMP max is 2038-01-19)
    finalDate = new Date('2037-12-31 23:59:59');
  } else if (!expiresAt || expiresAt === '') {
    // Default: 1 year premium
    finalDate = new Date();
    finalDate.setFullYear(finalDate.getFullYear() + 1);
  }
  
  await query(
    `UPDATE users SET plan_type = 'premium', premium_expires_at = ? WHERE id = ?`,
    [finalDate, userId]
  );
}

export async function deleteUser(userId) {
  // Delete user and all related data
  await query(`DELETE FROM syntheses WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM daily_usage WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM subscriptions WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM conversations WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM users WHERE id = ?`, [userId]);
}

// ─── Announcements ───────────────────────────────────────────────────────────

export async function getAnnouncements() {
  return await query(
    `SELECT a.*, ad.email as admin_email 
     FROM announcements a 
     LEFT JOIN admins ad ON a.created_by_admin_id = ad.id 
     ORDER BY a.created_at DESC`
  );
}

export async function getActiveAnnouncements(audience = 'free') {
  return await query(
    `SELECT * FROM announcements 
     WHERE is_active = 1 
     AND (target_audience = ? OR target_audience = 'all')
     AND (starts_at IS NULL OR starts_at <= NOW())
     AND (ends_at IS NULL OR ends_at >= NOW())
     ORDER BY created_at DESC`,
    [audience]
  );
}

export async function createAnnouncement({ title, body, type = 'info', target_audience = 'all', is_active = 1, starts_at = null, ends_at = null, adminId }) {
  const result = await query(
    `INSERT INTO announcements (title, body, type, target_audience, is_active, starts_at, ends_at, created_by_admin_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, body, type, target_audience, is_active, starts_at, ends_at, adminId]
  );
  
  const rows = await query(`SELECT * FROM announcements WHERE id = ?`, [result.insertId]);
  return rows[0];
}

export async function updateAnnouncement(id, updates) {
  const fields = [];
  const values = [];
  
  const allowedFields = ['title', 'body', 'type', 'target_audience', 'is_active', 'starts_at', 'ends_at'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  }
  
  if (fields.length === 0) {
    const rows = await query(`SELECT * FROM announcements WHERE id = ?`, [id]);
    return rows[0];
  }
  
  values.push(id);
  await query(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, values);
  
  const rows = await query(`SELECT * FROM announcements WHERE id = ?`, [id]);
  return rows[0];
}

export async function deleteAnnouncement(id) {
  await query(`DELETE FROM announcements WHERE id = ?`, [id]);
}

export async function getAllUserEmails() {
  return await query(
    `SELECT id, email, name FROM users WHERE is_banned = 0 AND is_verified = 1`
  );
}

export async function markAnnouncementSent(id) {
  await query(
    `UPDATE announcements SET sent_at = NOW() WHERE id = ?`,
    [id]
  );
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStats() {
  const [
    totalUsers,
    activeUsers,
    premiumUsers,
    bannedUsers,
    totalSyntheses,
    totalFlashcards,
    totalQuizzes,
    schoolRequests,
    subscriptions,
    newUsersToday,
    newUsersThisWeek
  ] = await Promise.all([
    query(`SELECT COUNT(*) as count FROM users`),
    query(`SELECT COUNT(*) as count FROM users WHERE last_login_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`),
    query(`SELECT COUNT(*) as count FROM users WHERE plan_type != 'free'`),
    query(`SELECT COUNT(*) as count FROM users WHERE is_banned = 1`),
    query(`SELECT COUNT(*) as count FROM syntheses`),
    query(`SELECT COUNT(*) as count FROM flashcards`),
    query(`SELECT COUNT(*) as count FROM quiz_questions`),
    query(`SELECT COUNT(*) as count FROM school_requests WHERE status = 'pending'`),
    query(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`),
    query(`SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()`),
    query(`SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`)
  ]);

  // Recent activity (last 30 days)
  const recentActivity = await query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM syntheses
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `);

  // Plan distribution
  const planDistribution = await query(`
    SELECT plan_type, COUNT(*) as count
    FROM users
    GROUP BY plan_type
  `);

  return {
    // Format attendu par le frontend
    totalUsers: totalUsers[0].count,
    activeUsers: activeUsers[0].count,
    premiumUsers: premiumUsers[0].count,
    bannedUsers: bannedUsers[0].count,
    totalSyntheses: totalSyntheses[0].count,
    totalFlashcards: totalFlashcards[0].count,
    totalQuizzes: totalQuizzes[0].count,
    newUsersToday: newUsersToday[0].count,
    newUsersThisWeek: newUsersThisWeek[0].count,
    // Format détaillé pour API
    users: {
      total: totalUsers[0].count,
      active: activeUsers[0].count,
      premium: premiumUsers[0].count,
      banned: bannedUsers[0].count,
      newToday: newUsersToday[0].count,
      newThisWeek: newUsersThisWeek[0].count
    },
    content: {
      syntheses: totalSyntheses[0].count,
      flashcards: totalFlashcards[0].count,
      quizzes: totalQuizzes[0].count
    },
    requests: {
      schoolRequests: schoolRequests[0].count
    },
    subscriptions: {
      active: subscriptions[0].count
    },
    recentActivity,
    planDistribution
  };
}
