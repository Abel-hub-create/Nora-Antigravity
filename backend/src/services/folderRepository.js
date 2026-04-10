import { query } from '../config/database.js';

// Subject folders metadata
export const SUBJECT_FOLDERS = [
  { subject: 'mathematics', names: { fr: 'Mathématiques', en: 'Mathematics' }, color: '#6366f1' },
  { subject: 'french',      names: { fr: 'Français',       en: 'French'      }, color: '#f43f5e' },
  { subject: 'physics',     names: { fr: 'Physique',        en: 'Physics'     }, color: '#38bdf8' },
  { subject: 'chemistry',   names: { fr: 'Chimie',          en: 'Chemistry'   }, color: '#10b981' },
  { subject: 'biology',     names: { fr: 'Biologie',        en: 'Biology'     }, color: '#84cc16' },
  { subject: 'history',     names: { fr: 'Histoire',        en: 'History'     }, color: '#f59e0b' },
  { subject: 'geography',   names: { fr: 'Géographie',      en: 'Geography'   }, color: '#06b6d4' },
  { subject: 'english',     names: { fr: 'Anglais',         en: 'English'     }, color: '#8b5cf6' },
  { subject: 'dutch',       names: { fr: 'Néerlandais',     en: 'Dutch'       }, color: '#ec4899' },
];

// Folders CRUD
export const create = async ({ userId, name, color = '#6366f1', subject = null }) => {
  const sql = `INSERT INTO folders (user_id, name, color, subject) VALUES (?, ?, ?, ?)`;
  const result = await query(sql, [userId, name, color, subject]);
  return { id: result.insertId, userId, name, color, subject };
};

/**
 * Create all 9 subject folders for a new user.
 * lang: 'fr' | 'en' (defaults to 'fr')
 */
export const createSubjectFolders = async (userId, lang = 'fr') => {
  const safeLang = ['fr', 'en'].includes(lang) ? lang : 'fr';
  const values = SUBJECT_FOLDERS.map(f => [userId, f.names[safeLang], f.color, f.subject]);
  await query(
    `INSERT IGNORE INTO folders (user_id, name, color, subject) VALUES ?`,
    [values]
  );
};

/**
 * Find the subject folder for a user. If it doesn't exist, create it.
 */
export const findOrCreateSubjectFolder = async (userId, subject, lang = 'fr') => {
  const rows = await query(
    `SELECT id FROM folders WHERE user_id = ? AND subject = ? LIMIT 1`,
    [userId, subject]
  );
  if (rows[0]) return rows[0].id;

  // Lazy creation
  const meta = SUBJECT_FOLDERS.find(f => f.subject === subject);
  if (!meta) return null;
  const safeLang = ['fr', 'en'].includes(lang) ? lang : 'fr';
  const result = await query(
    `INSERT INTO folders (user_id, name, color, subject) VALUES (?, ?, ?, ?)`,
    [userId, meta.names[safeLang], meta.color, subject]
  );
  return result.insertId;
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
