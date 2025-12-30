-- Migration: Add notifications support
-- Run: mysql -u username -p database_name < 009_add_notifications.sql

-- Add notification settings to users table
ALTER TABLE users
  ADD COLUMN notifications_enabled BOOLEAN DEFAULT FALSE AFTER collection,
  ADD COLUMN last_notification_sent_at DATE NULL AFTER notifications_enabled;

-- Create table for push subscriptions (one per user/device)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
