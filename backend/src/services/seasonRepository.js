import { query } from '../config/database.js';

// ─── Lecture ────────────────────────────────────────────────────────────────

export const getActiveSeason = async () => {
  const rows = await query(
    'SELECT * FROM seasons WHERE is_active = 1 LIMIT 1'
  );
  return rows[0] || null;
};

export const getAllSeasons = async () => {
  return query('SELECT * FROM seasons ORDER BY number DESC');
};

export const getSeasonById = async (id) => {
  const rows = await query('SELECT * FROM seasons WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

// ─── Leaderboard ────────────────────────────────────────────────────────────

export const getLeaderboard = async () => {
  // Top 50 utilisateurs triés par level décroissant (puis exp pour départager)
  return query(`
    SELECT id, name, avatar, level, exp, plan_type, winstreak
    FROM users
    WHERE is_active = 1 AND is_banned = 0
    ORDER BY level DESC, exp DESC
    LIMIT 50
  `);
};

// ─── Badges d'un utilisateur ────────────────────────────────────────────────

export const getUserBadges = async (userId) => {
  return query(
    'SELECT * FROM user_badges WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
};

// ─── Admin CRUD ─────────────────────────────────────────────────────────────

// Convertit une date ISO en format MySQL datetime (YYYY-MM-DD HH:MM:SS)
const toMysqlDatetime = (iso) => {
  const d = new Date(iso);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

export const createSeason = async ({ number, name, name_en, starts_at }) => {
  const mysqlDate = toMysqlDatetime(starts_at);
  const result = await query(
    `INSERT INTO seasons (number, name, name_en, starts_at, ends_at)
     VALUES (?, ?, ?, ?, DATE_ADD(?, INTERVAL 30 DAY))`,
    [number, name, name_en || null, mysqlDate, mysqlDate]
  );
  return getSeasonById(result.insertId);
};

export const updateSeason = async (id, { name, name_en, starts_at, is_active }) => {
  const fields = [];
  const values = [];

  if (name !== undefined)     { fields.push('name = ?');       values.push(name); }
  if (name_en !== undefined)  { fields.push('name_en = ?');    values.push(name_en || null); }
  if (starts_at !== undefined) {
    const mysqlDate = toMysqlDatetime(starts_at);
    fields.push('starts_at = ?');
    fields.push('ends_at = DATE_ADD(?, INTERVAL 30 DAY)');
    values.push(mysqlDate);
    values.push(mysqlDate);
  }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }

  if (fields.length === 0) return getSeasonById(id);

  values.push(id);
  await query(`UPDATE seasons SET ${fields.join(', ')} WHERE id = ?`, values);
  return getSeasonById(id);
};

export const setActiveSeason = async (id) => {
  // Désactiver toutes les saisons puis activer la bonne
  await query('UPDATE seasons SET is_active = 0');
  await query('UPDATE seasons SET is_active = 1 WHERE id = ?', [id]);
};

export const deleteSeason = async (id) => {
  await query('DELETE FROM seasons WHERE id = ?', [id]);
};

// ─── Reset de saison ─────────────────────────────────────────────────────────

export const executeSeasonReset = async (season) => {
  // 1. Récupérer le top 50 AVANT le reset
  const top50 = await query(`
    SELECT id, level, exp
    FROM users
    WHERE is_active = 1 AND is_banned = 0
    ORDER BY level DESC, exp DESC
    LIMIT 50
  `);

  // 2. Insérer les rankings + badges pour chacun
  for (let i = 0; i < top50.length; i++) {
    const user = top50[i];
    const position = i + 1;
    const badgeText = `#${position} - S${season.number}`;

    await query(
      `INSERT IGNORE INTO season_rankings (season_id, user_id, position, level_at_end)
       VALUES (?, ?, ?, ?)`,
      [season.id, user.id, position, user.level]
    );

    await query(
      `INSERT IGNORE INTO user_badges (user_id, season_id, season_number, position, badge_text)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, season.id, season.number, position, badgeText]
    );
  }

  // 3. Reset level = 1, exp = 0, next_level_exp = 500 pour tous les users actifs
  await query(
    `UPDATE users SET level = 1, exp = 0, next_level_exp = 500, updated_at = NOW()
     WHERE is_active = 1`
  );

  // 4. Marquer la saison comme reset exécuté + inactive
  await query(
    'UPDATE seasons SET reset_executed = 1, is_active = 0 WHERE id = ?',
    [season.id]
  );

  // 5. Activer la prochaine saison si elle existe et que starts_at <= NOW()
  const nextSeasons = await query(
    `SELECT * FROM seasons
     WHERE number > ? AND reset_executed = 0 AND is_active = 0
     ORDER BY number ASC
     LIMIT 1`,
    [season.number]
  );
  if (nextSeasons.length > 0) {
    const next = nextSeasons[0];
    const now = new Date();
    if (new Date(next.starts_at) <= now) {
      await query('UPDATE seasons SET is_active = 1 WHERE id = ?', [next.id]);
    }
  }

  return top50.length;
};
