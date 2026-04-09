-- Add ban support to users
ALTER TABLE users
  ADD COLUMN is_banned TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active,
  ADD COLUMN banned_reason VARCHAR(255) NULL AFTER is_banned,
  ADD COLUMN banned_at TIMESTAMP NULL AFTER banned_reason,
  ADD COLUMN premium_expires_at TIMESTAMP NULL AFTER banned_at,
  ADD INDEX idx_is_banned (is_banned);

-- Admin accounts (separate from users)
CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
