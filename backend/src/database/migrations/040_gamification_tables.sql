-- Migration 040: Tables du système de gamification

-- Table XP events (déduplication + audit)
CREATE TABLE IF NOT EXISTS xp_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reason VARCHAR(64) NOT NULL,
  context_id VARCHAR(255) NULL,
  xp_base INT NOT NULL,
  xp_multiplier_used INT NOT NULL DEFAULT 1,
  xp_total INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_reason_date (user_id, reason, created_at),
  INDEX idx_user_reason_context (user_id, reason, context_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table sacs de pièces en attente de révélation
CREATE TABLE IF NOT EXISTS pending_coin_bags (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  coins_amount INT NOT NULL,
  plan_type_at_creation VARCHAR(50) NOT NULL DEFAULT 'free',
  revealed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_unrevealed (user_id, revealed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table historique des transactions de pièces
CREATE TABLE IF NOT EXISTS coin_transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount INT NOT NULL,
  reason VARCHAR(64) NOT NULL,
  context_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table rotation quotidienne des cartes de la boutique (par user)
CREATE TABLE IF NOT EXISTS shop_daily_cards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  card_slot TINYINT UNSIGNED NOT NULL,
  card_id VARCHAR(64) NOT NULL,
  valid_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_slot_date (user_id, card_slot, valid_date),
  INDEX idx_user_date (user_id, valid_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table configuration des montants d'XP (admin-configurable)
CREATE TABLE IF NOT EXISTS xp_config (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reason VARCHAR(64) NOT NULL UNIQUE,
  base_amount INT NOT NULL DEFAULT 0,
  label VARCHAR(255) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Valeurs initiales des XP (modifiables depuis le panel admin)
INSERT INTO xp_config (reason, base_amount, label, description) VALUES
('synthesis_created',    30,   'Création d\'une synthèse',                  'XP crédité à chaque nouvelle synthèse créée'),
('goal_completed',       10,   'Objectif quotidien complété',               'XP par objectif individuel terminé (une fois par jour par objectif)'),
('daily_goals_all_bonus',50,   'Tous les objectifs du jour complétés',      'Bonus XP quand la totalité des objectifs quotidiens sont faits'),
('exercise_first_daily', 30,   'Premier exercice créé (par jour)',          'XP pour la première génération d\'exercice de la journée'),
('vocal_completed',      20,   'Vocal Aron écouté jusqu\'au bout',          'XP quand un message vocal Aron est écouté intégralement'),
('winstreak_daily',      20,   'Winstreak maintenue',                       'XP crédité chaque jour consécutif de connexion'),
('premium_purchase',     1000, 'Achat plan Premium ou École',               'Bonus XP one-shot à l\'achat d\'un abonnement (une fois par compte)'),
('flashcards_timer',     40,   'Flashcards — minuteur 10 min',              'XP pour 10 min de flashcards (une fois par jour)'),
('quiz_timer',           70,   'Quiz — minuteur 20 min',                    'XP pour 20 min de quiz (une fois par jour)'),
('summary_timer',        100,  'Synthèse lue — minuteur 30 min',           'XP pour 30 min de lecture de synthèse (une fois par jour)'),
('all_timer_bonus',      100,  'Bonus : les 3 minuteurs complétés',         'XP bonus quand les 3 minuteurs (flashcards+quiz+synthèse) sont atteints le même jour');
