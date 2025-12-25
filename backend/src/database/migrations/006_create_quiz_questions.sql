-- Migration: Create quiz_questions table
-- Quiz lié à une synthèse (indissociable)

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  synthese_id INT UNSIGNED NOT NULL,
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_answer INT NOT NULL,
  explanation TEXT NULL,
  times_answered INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (synthese_id) REFERENCES syntheses(id) ON DELETE CASCADE,
  INDEX idx_synthese_id (synthese_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
