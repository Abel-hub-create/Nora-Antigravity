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
  const sql = `SELECT id, email, name, avatar, level, exp, next_level_exp, streak, eggs, collection, created_at
               FROM users WHERE id = ? AND is_active = 1`;
  const users = await query(sql, [id]);
  return users[0] || null;
};

export const updateProfile = async (userId, { name, avatar }) => {
  const sql = `UPDATE users SET
    name = COALESCE(?, name),
    avatar = COALESCE(?, avatar),
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
