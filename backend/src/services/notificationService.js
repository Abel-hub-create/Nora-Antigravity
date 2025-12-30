import webpush from 'web-push';
import { query } from '../config/database.js';

// Configure VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Notification messages (neutral, non-pressuring tone)
const NOTIFICATION_MESSAGES = [
  'Il te reste un objectif aujourd\'hui',
  'Tu es proche de compléter ta journée',
  'Encore un petit pas pour aujourd\'hui',
  'Un objectif t\'attend encore',
  'Ta progression du jour n\'est pas finie'
];

// Get random message
const getRandomMessage = () => {
  return NOTIFICATION_MESSAGES[Math.floor(Math.random() * NOTIFICATION_MESSAGES.length)];
};

// Save push subscription for a user
export const saveSubscription = async (userId, subscription) => {
  const { endpoint, keys } = subscription;

  // Delete existing subscription for this user (one subscription per user)
  await query('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);

  // Save new subscription
  const sql = 'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)';
  await query(sql, [userId, endpoint, keys.p256dh, keys.auth]);
};

// Remove subscription for a user
export const removeSubscription = async (userId) => {
  await query('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
};

// Get subscription for a user
export const getSubscription = async (userId) => {
  const sql = 'SELECT * FROM push_subscriptions WHERE user_id = ?';
  const subs = await query(sql, [userId]);
  return subs[0] || null;
};

// Enable/disable notifications for a user
export const setNotificationsEnabled = async (userId, enabled) => {
  const sql = 'UPDATE users SET notifications_enabled = ? WHERE id = ?';
  await query(sql, [enabled, userId]);
};

// Get notification settings for a user
export const getNotificationSettings = async (userId) => {
  const sql = 'SELECT notifications_enabled, last_notification_sent_at FROM users WHERE id = ?';
  const users = await query(sql, [userId]);
  return users[0] || null;
};

// Mark notification as sent today
export const markNotificationSent = async (userId) => {
  const sql = 'UPDATE users SET last_notification_sent_at = CURDATE() WHERE id = ?';
  await query(sql, [userId]);
};

// Send push notification to a user
export const sendNotification = async (userId, title, body) => {
  const subscription = await getSubscription(userId);
  if (!subscription) {
    console.log(`No subscription found for user ${userId}`);
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  const payload = JSON.stringify({
    title: title || 'Nora',
    body: body || getRandomMessage(),
    icon: '/nora-icon.png',
    badge: '/nora-badge.png',
    tag: 'daily-reminder',
    data: {
      url: '/'
    }
  });

  try {
    await webpush.sendNotification(pushSubscription, payload);
    await markNotificationSent(userId);
    console.log(`Notification sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);

    // If subscription is invalid, remove it
    if (error.statusCode === 410 || error.statusCode === 404) {
      await removeSubscription(userId);
      console.log(`Removed invalid subscription for user ${userId}`);
    }
    return false;
  }
};

// Get all users eligible for daily reminder notification
// Conditions:
// 1. notifications_enabled = true
// 2. has at least one daily goal defined
// 3. progress < 100%
// 4. reward not claimed today
// 5. notification not already sent today
export const getEligibleUsersForNotification = async () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const sql = `
    SELECT u.id, u.name, dp.daily_goals, dp.progress_percentage, dp.reward_claimed
    FROM users u
    INNER JOIN daily_progress dp ON u.id = dp.user_id
    INNER JOIN push_subscriptions ps ON u.id = ps.user_id
    WHERE u.notifications_enabled = TRUE
      AND u.is_active = TRUE
      AND dp.progress_date = ?
      AND dp.daily_goals IS NOT NULL
      AND JSON_LENGTH(dp.daily_goals) > 0
      AND dp.progress_percentage < 100
      AND dp.reward_claimed = FALSE
      AND (u.last_notification_sent_at IS NULL OR u.last_notification_sent_at < ?)
  `;

  return await query(sql, [today, today]);
};

// Send daily reminder notifications to all eligible users
export const sendDailyReminders = async () => {
  console.log('Starting daily reminder notifications...');

  const eligibleUsers = await getEligibleUsersForNotification();
  console.log(`Found ${eligibleUsers.length} eligible users`);

  let sent = 0;
  let failed = 0;

  for (const user of eligibleUsers) {
    const success = await sendNotification(
      user.id,
      'Nora',
      getRandomMessage()
    );

    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  console.log(`Daily reminders complete: ${sent} sent, ${failed} failed`);
  return { sent, failed, total: eligibleUsers.length };
};
