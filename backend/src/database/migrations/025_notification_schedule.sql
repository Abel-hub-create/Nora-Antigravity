-- Migration: Add notification schedule (hour + days) to users
-- Run: mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/025_notification_schedule.sql

ALTER TABLE users
ADD COLUMN notification_hour TINYINT UNSIGNED NOT NULL DEFAULT 18,
ADD COLUMN notification_days JSON NULL;
