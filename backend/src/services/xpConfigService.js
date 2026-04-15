import { query } from '../config/database.js';

// Cache simple pour éviter des requêtes DB à chaque attribution d'XP
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 30_000; // 30 secondes

export const getAllXpConfig = async () => {
  const rows = await query(`SELECT reason, base_amount, label, description, is_active FROM xp_config ORDER BY id ASC`);
  return rows;
};

export const getXpConfigMap = async () => {
  const now = Date.now();
  if (_cache && (now - _cacheTime) < CACHE_TTL_MS) return _cache;

  const rows = await query(`SELECT reason, base_amount FROM xp_config WHERE is_active = 1`);
  const map = {};
  for (const row of rows) map[row.reason] = Number(row.base_amount);
  _cache = map;
  _cacheTime = now;
  return map;
};

export const updateXpConfig = async (reason, baseAmount) => {
  await query(
    `UPDATE xp_config SET base_amount = ? WHERE reason = ?`,
    [Math.max(0, Math.floor(baseAmount)), reason]
  );
  // Invalider le cache
  _cache = null;
  _cacheTime = 0;
};

export const invalidateCache = () => {
  _cache = null;
  _cacheTime = 0;
};
