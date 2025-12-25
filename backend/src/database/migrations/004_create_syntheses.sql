-- Migration: Create syntheses table
-- Une synthèse regroupe son contenu, ses flashcards et son quiz (indissociables)

CREATE TABLE IF NOT EXISTS syntheses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  original_content TEXT NOT NULL,
  summary_content TEXT NOT NULL,
  source_type ENUM('text', 'voice', 'photo') DEFAULT 'text',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_title (title(100)),
  FULLTEXT INDEX idx_search (title, summary_content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
