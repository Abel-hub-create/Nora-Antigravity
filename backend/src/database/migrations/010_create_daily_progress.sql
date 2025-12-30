-- Migration: Create daily progress table for notification checks
-- Run: mysql -u username -p database_name < 010_create_daily_progress.sql

-- Store daily goals and progress synced from frontend
-- This allows the backend to check conditions for notifications
CREATE TABLE IF NOT EXISTS daily_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,

  -- Daily goals (JSON array of goals from frontend)
  -- Format: [{ id, type, targetMinutes, completed }]
  daily_goals JSON DEFAULT NULL,

  -- Progress percentage (0-100)
  progress_percentage INT DEFAULT 0,

  -- Whether daily reward was claimed
  reward_claimed BOOLEAN DEFAULT FALSE,

  -- Date of the data (for reset detection)
  progress_date DATE NOT NULL,

  -- Last sync timestamp
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, progress_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
