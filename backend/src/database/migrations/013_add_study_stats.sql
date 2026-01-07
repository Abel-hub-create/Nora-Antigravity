-- Migration: Add study stats columns to daily_progress
-- Run: mysql -u username -p database_name < 013_add_study_stats.sql

-- Add daily stats (time spent per activity in seconds)
ALTER TABLE daily_progress
  ADD COLUMN quiz_time INT DEFAULT 0 AFTER reward_claimed,
  ADD COLUMN flashcards_time INT DEFAULT 0 AFTER quiz_time,
  ADD COLUMN summary_time INT DEFAULT 0 AFTER flashcards_time,
  ADD COLUMN xp_awarded JSON DEFAULT NULL AFTER summary_time;

-- Add study history table for average calculation
CREATE TABLE IF NOT EXISTS study_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  study_date DATE NOT NULL,
  total_seconds INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_date (user_id, study_date),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
