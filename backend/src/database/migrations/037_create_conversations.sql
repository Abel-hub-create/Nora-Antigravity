-- Migration: Create conversations system for Aaron assistant + extended plan limits
-- Run: mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/database/migrations/037_create_conversations.sql

-- Table for conversations
CREATE TABLE IF NOT EXISTS conversations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_updated (user_id, updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for conversation messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX idx_conversation_created (conversation_id, created_at ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extended plan limits for AI model, speed, XP, system prompt, etc.
-- These are inserted only if they don't already exist

-- Free plan extended limits
INSERT IGNORE INTO plan_limits (plan_id, limit_key, limit_value, label) VALUES
  ((SELECT id FROM plans WHERE slug = 'free'), 'ai_model', 0, 'Modèle IA (0=basic, 1=advanced)'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'max_char_per_message', 50, 'Caractères max par message'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'xp_multiplier', 1, 'Multiplicateur XP'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'max_conversations', 3, 'Nombre max de conversations'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'has_tts', 0, 'Accès synthèse vocale');

-- Premium plan extended limits
INSERT IGNORE INTO plan_limits (plan_id, limit_key, limit_value, label) VALUES
  ((SELECT id FROM plans WHERE slug = 'premium'), 'ai_model', 1, 'Modèle IA (0=basic, 1=advanced)'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'max_char_per_message', 2000, 'Caractères max par message'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'xp_multiplier', 2, 'Multiplicateur XP'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'max_conversations', 50, 'Nombre max de conversations'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'has_tts', 1, 'Accès synthèse vocale');

-- School plan extended limits
INSERT IGNORE INTO plan_limits (plan_id, limit_key, limit_value, label) VALUES
  ((SELECT id FROM plans WHERE slug = 'school'), 'ai_model', 1, 'Modèle IA (0=basic, 1=advanced)'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'max_char_per_message', 2000, 'Caractères max par message'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'xp_multiplier', 2, 'Multiplicateur XP'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'max_conversations', 50, 'Nombre max de conversations'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'has_tts', 1, 'Accès synthèse vocale');
