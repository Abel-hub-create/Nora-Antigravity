import cron from 'node-cron';
import { sendDailyReminders } from '../services/notificationService.js';

// Get current Paris hour and day
const getParisDT = () => {
  const nowParis = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' });
  const dt = new Date(nowParis);
  return { hour: dt.getHours(), day: dt.getDay() }; // day: 0=Sun, 1=Mon, ..., 6=Sat
};

// Run every hour — each user gets notified at their preferred hour/days
export const startNotificationCron = () => {
  cron.schedule('0 * * * *', async () => {
    const { hour, day } = getParisDT();
    console.log(`[CRON] Checking notifications for hour=${hour}, day=${day}...`);

    try {
      const result = await sendDailyReminders(hour, day);
      console.log(`[CRON] Reminders complete: ${result.sent} sent, ${result.failed} failed`);
    } catch (error) {
      console.error('[CRON] Error sending reminders:', error);
    }
  }, {
    timezone: 'Europe/Paris'
  });

  console.log('[CRON] Hourly notification job scheduled (Europe/Paris)');
};
