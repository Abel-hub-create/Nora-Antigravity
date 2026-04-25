CREATE TABLE IF NOT EXISTS support_tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  email VARCHAR(255) NULL,
  category ENUM('bug', 'billing', 'question', 'other') NOT NULL DEFAULT 'question',
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  admin_reply TEXT NULL,
  replied_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_support_user (user_id),
  INDEX idx_support_replied (replied_at)
);
