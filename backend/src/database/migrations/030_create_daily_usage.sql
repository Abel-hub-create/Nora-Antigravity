-- Daily usage tracking for assistant limits
CREATE TABLE IF NOT EXISTS daily_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  usage_date DATE NOT NULL,
  chat_count INT NOT NULL DEFAULT 0,
  exs_count INT NOT NULL DEFAULT 0,
  ana_count INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_user_date (user_id, usage_date),
  KEY idx_user_date (user_id, usage_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
