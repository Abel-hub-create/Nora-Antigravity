-- Migration: Create feedbacks system (reviews + suggestions)
-- Run: mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/024_create_feedbacks.sql

-- Table for reviews and suggestions
CREATE TABLE IF NOT EXISTS feedbacks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('review', 'suggestion') NOT NULL,
  content VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for votes on feedbacks
CREATE TABLE IF NOT EXISTS feedback_votes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  feedback_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  vote TINYINT NOT NULL,  -- 1 = like, -1 = dislike
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_feedback_user (feedback_id, user_id),
  INDEX idx_feedback_id (feedback_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
