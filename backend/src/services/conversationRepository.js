import { query } from '../config/database.js';

// ─── Conversations ──────────────────────────────────────────────────────────

export const getConversationsByUser = async (userId, limit = 50) => {
  return query(
    `SELECT id, title, created_at, updated_at
     FROM conversations
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT ?`,
    [userId, limit]
  );
};

export const getConversationById = async (conversationId, userId) => {
  const rows = await query(
    `SELECT id, user_id, title, context_synthese_ids, created_at, updated_at
     FROM conversations
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [conversationId, userId]
  );
  if (!rows[0]) return null;
  const conv = rows[0];
  if (conv.context_synthese_ids && typeof conv.context_synthese_ids === 'string') {
    try { conv.context_synthese_ids = JSON.parse(conv.context_synthese_ids); } catch { conv.context_synthese_ids = []; }
  }
  return conv;
};

export const updateConversationContext = async (conversationId, syntheseIds) => {
  await query(
    `UPDATE conversations SET context_synthese_ids = ?, updated_at = NOW() WHERE id = ?`,
    [JSON.stringify(syntheseIds), conversationId]
  );
};

export const createConversation = async (userId, title = null) => {
  const result = await query(
    `INSERT INTO conversations (user_id, title) VALUES (?, ?)`,
    [userId, title]
  );
  return { id: result.insertId, user_id: userId, title, created_at: new Date(), updated_at: new Date() };
};

export const updateConversationTitle = async (conversationId, title) => {
  await query(
    `UPDATE conversations SET title = ? WHERE id = ?`,
    [title, conversationId]
  );
};

export const deleteConversation = async (conversationId, userId) => {
  const result = await query(
    `DELETE FROM conversations WHERE id = ? AND user_id = ?`,
    [conversationId, userId]
  );
  return result.affectedRows > 0;
};

export const countConversationsByUser = async (userId) => {
  const rows = await query(
    `SELECT COUNT(*) as count FROM conversations WHERE user_id = ?`,
    [userId]
  );
  return Number(rows[0].count);
};

// ─── Messages ───────────────────────────────────────────────────────────────

export const getMessages = async (conversationId, limit = 100) => {
  return query(
    `SELECT id, role, content, created_at
     FROM conversation_messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [conversationId, limit]
  );
};

export const addMessage = async (conversationId, role, content) => {
  const result = await query(
    `INSERT INTO conversation_messages (conversation_id, role, content) VALUES (?, ?, ?)`,
    [conversationId, role, content]
  );
  // Touch the conversation updated_at
  await query(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`, [conversationId]);
  return { id: result.insertId, conversation_id: conversationId, role, content, created_at: new Date() };
};

export const getMessageCount = async (conversationId) => {
  const rows = await query(
    `SELECT COUNT(*) as count FROM conversation_messages WHERE conversation_id = ?`,
    [conversationId]
  );
  return Number(rows[0].count);
};
