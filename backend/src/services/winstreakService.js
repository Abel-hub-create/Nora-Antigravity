import { query } from '../config/database.js';
import { awardXp } from './xpService.js';

/** Retourne la date YYYY-MM-DD dans le fuseau donné. */
function getTodayInTimezone(tz) {
  try {
    // locale 'en-CA' donne toujours YYYY-MM-DD
    return new Date().toLocaleDateString('en-CA', { timeZone: tz || 'UTC' });
  } catch {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'UTC' });
  }
}

/** Retourne la date du jour précédent en YYYY-MM-DD. */
function getYesterdayStr(todayStr) {
  const d = new Date(todayStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Convertit un champ DATE MySQL (Date ou string) en YYYY-MM-DD. */
function toDateStr(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

/**
 * Vérifie et met à jour la winstreak de l'utilisateur.
 * Doit être appelé à chaque login.
 *
 * @returns {{ changed, newStreak, xpAwarded, xpResult }}
 */
export const checkAndUpdateWinstreak = async (userId, userTimezone) => {
  const rows = await query(
    `SELECT winstreak, last_activity_date FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  if (!rows[0]) return { changed: false, newStreak: 1, xpAwarded: 0 };

  const { winstreak, last_activity_date } = rows[0];
  const todayStr     = getTodayInTimezone(userTimezone || 'UTC');
  const lastStr      = toDateStr(last_activity_date);
  const yesterdayStr = getYesterdayStr(todayStr);

  // Déjà compté aujourd'hui
  if (lastStr === todayStr) {
    return { changed: false, newStreak: winstreak || 1, xpAwarded: 0 };
  }

  if (lastStr === yesterdayStr) {
    // Série maintenue — mettre à jour la DB AVANT d'attribuer l'XP (ordre sécurisé)
    const newStreak = (winstreak || 0) + 1;
    await query(
      `UPDATE users SET winstreak = ?, last_activity_date = ? WHERE id = ?`,
      [newStreak, todayStr, userId]
    );
    let xpResult = null;
    try {
      xpResult = await awardXp(userId, 'winstreak_daily', { contextId: null });
    } catch (e) {
      console.error('[Winstreak] Erreur XP:', e.message);
    }
    return { changed: true, newStreak, xpAwarded: xpResult?.xpAwarded ?? 0, xpResult };
  }

  // Série brisée → retour à 1 (pas d'XP)
  await query(
    `UPDATE users SET winstreak = 1, last_activity_date = ? WHERE id = ?`,
    [todayStr, userId]
  );
  return { changed: true, newStreak: 1, xpAwarded: 0, xpResult: null };
};
