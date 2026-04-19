ALTER TABLE users ADD COLUMN referred_by INT NULL AFTER share_code;

CREATE TABLE IF NOT EXISTS referral_rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT NOT NULL,
  referee_id INT NOT NULL UNIQUE,
  reward_type ENUM('premium_week','coins') NOT NULL,
  coins_amount INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_referrer (referrer_id)
);
