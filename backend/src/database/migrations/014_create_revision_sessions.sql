-- Migration: 014_create_revision_sessions.sql
-- Description: Tables for guided revision (Feuille Blanche) feature

-- Active revision session state
CREATE TABLE IF NOT EXISTS revision_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    synthese_id INT UNSIGNED NOT NULL,

    -- Session state
    phase ENUM('study', 'pause', 'recall', 'compare', 'analyzing', 'loop', 'loopPause', 'complete') DEFAULT 'study',
    study_time_remaining INT DEFAULT 600,      -- 10 min in seconds
    pause_time_remaining INT DEFAULT 300,      -- 5 min in seconds
    current_iteration INT DEFAULT 1,           -- Loop iteration (max 5)

    -- Recall data
    user_recall TEXT,                          -- What user wrote/dictated
    missing_concepts JSON,                     -- Concepts not recalled (red)
    understood_concepts JSON,                  -- Concepts recalled (green)

    -- Timestamps
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (synthese_id) REFERENCES syntheses(id) ON DELETE CASCADE,

    -- Only one active session per user per synthese
    UNIQUE KEY unique_active_session (user_id, synthese_id),

    -- Index for cleanup queries
    INDEX idx_last_activity (last_activity_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- History of completed revisions
CREATE TABLE IF NOT EXISTS revision_completions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    synthese_id INT UNSIGNED NOT NULL,
    iterations_count INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (synthese_id) REFERENCES syntheses(id) ON DELETE CASCADE,

    INDEX idx_user_synthese (user_id, synthese_id),
    INDEX idx_completed_at (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
