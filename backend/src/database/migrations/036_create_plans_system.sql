-- Plans table: defines each plan type and its configurable limits
CREATE TABLE IF NOT EXISTS plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  price_type ENUM('fixed', 'per_student') NOT NULL DEFAULT 'fixed',
  stripe_price_id VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plan limits: key-value configurable limits per plan
CREATE TABLE IF NOT EXISTS plan_limits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id INT UNSIGNED NOT NULL,
  limit_key VARCHAR(100) NOT NULL,
  limit_value INT NOT NULL DEFAULT 0,
  label VARCHAR(255) NULL,
  UNIQUE KEY uq_plan_limit (plan_id, limit_key),
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscriptions: tracks user subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT UNSIGNED NOT NULL,
  status ENUM('active', 'canceled', 'past_due', 'trialing', 'incomplete') NOT NULL DEFAULT 'active',
  stripe_customer_id VARCHAR(255) NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  current_period_start TIMESTAMP NULL,
  current_period_end TIMESTAMP NULL,
  cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
  canceled_at TIMESTAMP NULL,
  promo_code_id INT UNSIGNED NULL,
  student_count INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id),
  KEY idx_user (user_id),
  KEY idx_stripe_customer (stripe_customer_id),
  KEY idx_stripe_sub (stripe_subscription_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- School contact requests
CREATE TABLE IF NOT EXISTS school_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NULL,
  student_count INT NULL,
  message TEXT NULL,
  status ENUM('pending', 'contacted', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  admin_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses INT NULL,
  current_uses INT NOT NULL DEFAULT 0,
  valid_from TIMESTAMP NULL,
  valid_until TIMESTAMP NULL,
  applicable_plans JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  stripe_coupon_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add plan_type to users table
ALTER TABLE users
  ADD COLUMN plan_type VARCHAR(50) NOT NULL DEFAULT 'free' AFTER premium_expires_at;

-- Insert default plans with limits
INSERT INTO plans (slug, name, description, price_monthly, price_type, sort_order) VALUES
  ('free', 'Gratuit', 'Plan gratuit avec fonctionnalités limitées', 0.00, 'fixed', 0),
  ('premium', 'Premium', 'Plan premium avec toutes les fonctionnalités', 14.99, 'fixed', 1),
  ('school', 'École', 'Plan école avec tarification par élève', 10.00, 'per_student', 2);

-- Free plan limits
INSERT INTO plan_limits (plan_id, limit_key, limit_value, label) VALUES
  ((SELECT id FROM plans WHERE slug = 'free'), 'max_syntheses', 3, 'Nombre max de synthèses'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'max_chat_per_day', 3, 'Messages Aron par jour'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'max_ana_per_day', 3, 'Analyses par jour'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'max_exs_per_day', 3, 'Exercices par jour'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'max_prompt_chars', 50, 'Caractères max par prompt'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'has_daily_goals', 0, 'Objectifs quotidiens'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'has_folders', 0, 'Accès aux dossiers'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'ai_model_tier', 0, 'Niveau du modèle IA (0=basic, 1=fast, 2=advanced)'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'xp_multiplier', 1, 'Multiplicateur XP'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'max_imports', 3, 'Nombre max imports'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'has_flashcards', 0, 'Accès aux flashcards'),
  ((SELECT id FROM plans WHERE slug = 'free'), 'has_quiz', 0, 'Accès aux quiz');

-- Premium plan limits
INSERT INTO plan_limits (plan_id, limit_key, limit_value, label) VALUES
  ((SELECT id FROM plans WHERE slug = 'premium'), 'max_syntheses', 20, 'Nombre max de synthèses'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'max_chat_per_day', 15, 'Messages Aron par jour'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'max_ana_per_day', 3, 'Analyses par jour'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'max_exs_per_day', 3, 'Exercices par jour'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'max_prompt_chars', 500, 'Caractères max par prompt'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'has_daily_goals', 1, 'Objectifs quotidiens'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'has_folders', 1, 'Accès aux dossiers'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'ai_model_tier', 2, 'Niveau du modèle IA (0=basic, 1=fast, 2=advanced)'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'xp_multiplier', 3, 'Multiplicateur XP'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'max_imports', 999, 'Nombre max imports'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'has_flashcards', 1, 'Accès aux flashcards'),
  ((SELECT id FROM plans WHERE slug = 'premium'), 'has_quiz', 1, 'Accès aux quiz');

-- School plan limits
INSERT INTO plan_limits (plan_id, limit_key, limit_value, label) VALUES
  ((SELECT id FROM plans WHERE slug = 'school'), 'max_syntheses', 20, 'Nombre max de synthèses'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'max_chat_per_day', 20, 'Messages Aron par jour'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'max_ana_per_day', 5, 'Analyses par jour'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'max_exs_per_day', 5, 'Exercices par jour'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'max_prompt_chars', 500, 'Caractères max par prompt'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'has_daily_goals', 1, 'Objectifs quotidiens'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'has_folders', 1, 'Accès aux dossiers'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'ai_model_tier', 2, 'Niveau du modèle IA (0=basic, 1=fast, 2=advanced)'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'xp_multiplier', 3, 'Multiplicateur XP'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'max_imports', 999, 'Nombre max imports'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'has_flashcards', 1, 'Accès aux flashcards'),
  ((SELECT id FROM plans WHERE slug = 'school'), 'has_quiz', 1, 'Accès aux quiz');
