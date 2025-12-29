-- Migration: Create folder_syntheses junction table
-- Liaison many-to-many entre dossiers et syntheses

CREATE TABLE IF NOT EXISTS folder_syntheses (
  folder_id INT UNSIGNED NOT NULL,
  synthese_id INT UNSIGNED NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (folder_id, synthese_id),
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  FOREIGN KEY (synthese_id) REFERENCES syntheses(id) ON DELETE CASCADE,
  INDEX idx_folder_id (folder_id),
  INDEX idx_synthese_id (synthese_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
