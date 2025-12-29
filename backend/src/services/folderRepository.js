import { query } from '../config/database.js';

// Folders CRUD
export const create = async ({ userId, name, color = '#6366f1' }) => {
  const sql = `INSERT INTO folders (user_id, name, color) VALUES (?, ?, ?)`;
  const result = await query(sql, [userId, name, color]);
  return { id: result.insertId, userId, name, color };
};

export const findById = async (id, userId) => {
  const sql = `SELECT * FROM folders WHERE id = ? AND user_id = ?`;
  const folders = await query(sql, [id, userId]);
  return folders[0] || null;
};

export const findAllByUser = async (userId) => {
  const sql = `SELECT f.*,
               (SELECT COUNT(*) FROM folder_syntheses fs WHERE fs.folder_id = f.id) as syntheses_count
               FROM folders f
               WHERE f.user_id = ?
               ORDER BY f.created_at DESC`;
  return await query(sql, [userId]);
};

export const update = async (id, userId, { name, color }) => {
  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (color !== undefined) {
    updates.push('color = ?');
    params.push(color);
  }

  if (updates.length === 0) return false;

  params.push(id, userId);
  const sql = `UPDATE folders SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND user_id = ?`;
  const result = await query(sql, params);
  return result.affectedRows > 0;
};

export const remove = async (id, userId) => {
  const sql = `DELETE FROM folders WHERE id = ? AND user_id = ?`;
  const result = await query(sql, [id, userId]);
  return result.affectedRows > 0;
};

// Folder-Syntheses relationship
export const getSynthesesInFolder = async (folderId, userId) => {
  // Verify folder belongs to user
  const folder = await findById(folderId, userId);
  if (!folder) return null;

  const sql = `SELECT s.id, s.title, s.summary_content, s.source_type, s.created_at, fs.added_at
               FROM syntheses s
               JOIN folder_syntheses fs ON s.id = fs.synthese_id
               WHERE fs.folder_id = ? AND s.is_archived = 0
               ORDER BY fs.added_at DESC`;
  return await query(sql, [folderId]);
};

export const addSynthesesToFolder = async (folderId, syntheseIds) => {
  if (!syntheseIds.length) return [];

  // Use INSERT IGNORE to skip duplicates
  const sql = `INSERT IGNORE INTO folder_syntheses (folder_id, synthese_id) VALUES ?`;
  const values = syntheseIds.map(id => [folderId, id]);
  await query(sql, [values]);

  return syntheseIds;
};

export const removeSyntheseFromFolder = async (folderId, syntheseId) => {
  const sql = `DELETE FROM folder_syntheses WHERE folder_id = ? AND synthese_id = ?`;
  const result = await query(sql, [folderId, syntheseId]);
  return result.affectedRows > 0;
};

export const countByUser = async (userId) => {
  const sql = `SELECT COUNT(*) as count FROM folders WHERE user_id = ?`;
  const result = await query(sql, [userId]);
  return result[0].count;
};

// Get all syntheses NOT in a specific folder (for adding)
export const getSynthesesNotInFolder = async (folderId, userId) => {
  const sql = `SELECT s.id, s.title, s.source_type, s.created_at
               FROM syntheses s
               WHERE s.user_id = ?
               AND s.is_archived = 0
               AND s.id NOT IN (
                 SELECT synthese_id FROM folder_syntheses WHERE folder_id = ?
               )
               ORDER BY s.created_at DESC`;
  return await query(sql, [userId, folderId]);
};
