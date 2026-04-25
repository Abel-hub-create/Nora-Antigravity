-- 045_card_trade_requests.sql

-- Add 'trade' to user_cards source enum
ALTER TABLE user_cards
  MODIFY COLUMN source ENUM('pack','daily','event','trade') DEFAULT 'pack';

-- Trade requests between users
CREATE TABLE IF NOT EXISTS card_trade_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  initiator_id INT UNSIGNED NOT NULL,
  receiver_id INT UNSIGNED NOT NULL,
  offered_card_id VARCHAR(64) NOT NULL,
  requested_card_id VARCHAR(64) NULL,
  status ENUM('pending','accepted','refused') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trade_receiver (receiver_id, status),
  INDEX idx_trade_initiator (initiator_id),
  FOREIGN KEY (initiator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (offered_card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_card_id) REFERENCES cards(id) ON DELETE SET NULL
);
