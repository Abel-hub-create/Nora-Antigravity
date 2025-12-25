-- Migration: Create flashcards table
-- Flashcards liées à une synthèse (indissociables)

CREATE TABLE IF NOT EXISTS flashcards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  synthese_id INT UNSIGNED NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  times_reviewed INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  last_reviewed_at TIMESTAMP NULL,
  next_review_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (synthese_id) REFERENCES syntheses(id) ON DELETE CASCADE,
  INDEX idx_synthese_id (synthese_id),
  INDEX idx_next_review (next_review_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
