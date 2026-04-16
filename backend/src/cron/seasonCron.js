import cron from 'node-cron';
import { getActiveSeason, executeSeasonReset } from '../services/seasonRepository.js';

// Vérifie chaque minute si la saison active doit être réinitialisée
export const startSeasonCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const season = await getActiveSeason();
      if (!season) return;
      if (season.reset_executed) return;

      const now = new Date();
      const endsAt = new Date(season.ends_at);

      if (now >= endsAt) {
        console.log(`[SEASON CRON] Season ${season.number} ended — executing reset...`);
        const count = await executeSeasonReset(season);
        console.log(`[SEASON CRON] Reset complete: ${count} badges awarded, all levels reset to 1`);
      }
    } catch (err) {
      console.error('[SEASON CRON] Error during season check:', err);
    }
  }, {
    timezone: 'Europe/Paris'
  });

  console.log('[SEASON CRON] Season check job scheduled (every minute, Europe/Paris)');
};
