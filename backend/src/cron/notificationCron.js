import cron from 'node-cron';
import { sendDailyReminders } from '../services/notificationService.js';

// Schedule daily notification at 18:00 (6 PM) Europe/Paris timezone
// Cron format: minute hour day-of-month month day-of-week
export const startNotificationCron = () => {
  // Run at 18:00 every day
  cron.schedule('0 18 * * *', async () => {
    console.log('[CRON] Starting daily reminder notifications at 18:00...');

    try {
      const result = await sendDailyReminders();
      console.log(`[CRON] Daily reminders complete: ${result.sent} sent, ${result.failed} failed`);
    } catch (error) {
      console.error('[CRON] Error sending daily reminders:', error);
    }
  }, {
    timezone: 'Europe/Paris'
  });

  console.log('[CRON] Daily notification job scheduled for 18:00 Europe/Paris');
};
