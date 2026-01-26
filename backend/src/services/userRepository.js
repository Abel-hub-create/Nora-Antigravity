import { query } from '../config/database.js';

export const create = async ({ email, password, name }) => {
  const sql = 'INSERT INTO users (email, password, name) VALUES (?, ?, ?)';
  const result = await query(sql, [email, password, name]);
  return { id: result.insertId, email, name };
};

export const findByEmail = async (email) => {
  const sql = 'SELECT * FROM users WHERE email = ? AND is_active = 1';
  const users = await query(sql, [email]);
  return users[0] || null;
};

export const findById = async (id) => {
  const sql = `SELECT id, email, name, avatar, theme, language, onboarding_completed, level, exp, next_level_exp, streak, eggs, collection, created_at
               FROM users WHERE id = ? AND is_active = 1`;
  const users = await query(sql, [id]);
  return users[0] || null;
};

export const updatePreferences = async (userId, { theme, language }) => {
  const sql = `UPDATE users SET
    theme = COALESCE(?, theme),
    language = COALESCE(?, language),
    updated_at = NOW()
    WHERE id = ?`;
  await query(sql, [theme, language, userId]);
};

export const updateProfile = async (userId, { name, avatar }) => {
  const sql = `UPDATE users SET
    name = COALESCE(?, name),
    avatar = COALESCE(?, avatar),
    updated_at = NOW()
    WHERE id = ?`;
  await query(sql, [name, avatar, userId]);
};

export const completeOnboarding = async (userId, { name, avatar }) => {
  const sql = `UPDATE users SET
    name = COALESCE(?, name),
    avatar = COALESCE(?, avatar),
    onboarding_completed = TRUE,
    updated_at = NOW()
    WHERE id = ?`;
  await query(sql, [name, avatar, userId]);
};

export const updatePassword = async (userId, hashedPassword) => {
  const sql = 'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?';
  await query(sql, [hashedPassword, userId]);
};

export const updateLastLogin = async (userId) => {
  const sql = 'UPDATE users SET last_login_at = NOW() WHERE id = ?';
  await query(sql, [userId]);
};

export const updateUserData = async (userId, { level, exp, next_level_exp, streak, eggs, collection }) => {
  const sql = `UPDATE users SET
    level = COALESCE(?, level),
    exp = COALESCE(?, exp),
    next_level_exp = COALESCE(?, next_level_exp),
    streak = COALESCE(?, streak),
    eggs = COALESCE(?, eggs),
    collection = COALESCE(?, collection),
    updated_at = NOW()
    WHERE id = ?`;
  await query(sql, [level, exp, next_level_exp, streak, eggs, JSON.stringify(collection), userId]);
};

// Refresh token management
export const saveRefreshToken = async (userId, token, expiresAt, userAgent, ipAddress) => {
  const sql = 'INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)';
  await query(sql, [userId, token, expiresAt, userAgent, ipAddress]);
};

export const findRefreshToken = async (token) => {
  const sql = 'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()';
  const tokens = await query(sql, [token]);
  return tokens[0] || null;
};

export const deleteRefreshToken = async (token) => {
  const sql = 'DELETE FROM refresh_tokens WHERE token = ?';
  await query(sql, [token]);
};

export const deleteUserRefreshTokens = async (userId) => {
  const sql = 'DELETE FROM refresh_tokens WHERE user_id = ?';
  await query(sql, [userId]);
};

// Password reset management
export const createPasswordReset = async (userId, token, expiresAt) => {
  const sql = 'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)';
  await query(sql, [userId, token, expiresAt]);
};

export const findPasswordReset = async (token) => {
  const sql = 'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW() AND used = 0';
  const resets = await query(sql, [token]);
  return resets[0] || null;
};

export const markPasswordResetUsed = async (token) => {
  const sql = 'UPDATE password_resets SET used = 1 WHERE token = ?';
  await query(sql, [token]);
};

// Email verification management
export const createWithVerificationToken = async ({ email, password, name, verificationToken, verificationExpires }) => {
  // Default preferences for new accounts: light theme, French language
  const sql = `INSERT INTO users (email, password, name, theme, language, is_verified, verification_token, verification_token_expires)
               VALUES (?, ?, ?, 'light', 'fr', FALSE, ?, ?)`;
  const result = await query(sql, [email, password, name, verificationToken, verificationExpires]);
  return { id: result.insertId, email, name, theme: 'light', language: 'fr' };
};

export const findByVerificationToken = async (token) => {
  // Find user by token (even if expired, to check if already verified)
  const sql = 'SELECT * FROM users WHERE verification_token = ? AND is_active = 1';
  const users = await query(sql, [token]);
  return users[0] || null;
};

export const isVerificationTokenExpired = (user) => {
  if (!user.verification_token_expires) return true;
  return new Date(user.verification_token_expires) < new Date();
};

export const verifyEmail = async (userId) => {
  // Keep token for 5 more minutes to handle double-clicks/refreshes
  const sql = `UPDATE users SET
    is_verified = TRUE,
    verification_token_expires = DATE_ADD(NOW(), INTERVAL 5 MINUTE),
    updated_at = NOW()
    WHERE id = ?`;
  await query(sql, [userId]);
};

export const updateVerificationToken = async (userId, token, expiresAt) => {
  const sql = `UPDATE users SET
    verification_token = ?,
    verification_token_expires = ?,
    updated_at = NOW()
    WHERE id = ?`;
  await query(sql, [token, expiresAt, userId]);
};

export const deleteAccount = async (userId) => {
  // Delete in order to respect foreign key constraints
  // 1. Delete flashcards and quiz questions (via syntheses)
  await query(`DELETE f FROM flashcards f
               INNER JOIN syntheses s ON f.synthese_id = s.id
               WHERE s.user_id = ?`, [userId]);
  await query(`DELETE q FROM quiz_questions q
               INNER JOIN syntheses s ON q.synthese_id = s.id
               WHERE s.user_id = ?`, [userId]);

  // 2. Delete folder_syntheses relations
  await query(`DELETE fs FROM folder_syntheses fs
               INNER JOIN folders f ON fs.folder_id = f.id
               WHERE f.user_id = ?`, [userId]);

  // 3. Delete folders
  await query('DELETE FROM folders WHERE user_id = ?', [userId]);

  // 4. Delete syntheses
  await query('DELETE FROM syntheses WHERE user_id = ?', [userId]);

  // 5. Delete push subscriptions
  await query('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);

  // 6. Delete daily progress
  await query('DELETE FROM daily_progress WHERE user_id = ?', [userId]);

  // 7. Delete refresh tokens
  await query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);

  // 8. Delete password resets
  await query('DELETE FROM password_resets WHERE user_id = ?', [userId]);

  // 9. Finally delete the user
  await query('DELETE FROM users WHERE id = ?', [userId]);
};
