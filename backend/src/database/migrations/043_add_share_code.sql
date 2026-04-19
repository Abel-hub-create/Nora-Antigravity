-- Share code sur les users (ex: SleepyBadger)
ALTER TABLE users ADD COLUMN share_code VARCHAR(20) UNIQUE NULL AFTER active_badge_id;

-- Feature has_share dans plan_limits (0 = free, 1 = premium/school)
INSERT INTO plan_limits (plan_id, limit_key, limit_value, label)
SELECT id, 'has_share', 0, 'Partage de synthèses' FROM plans WHERE slug = 'free';

INSERT INTO plan_limits (plan_id, limit_key, limit_value, label)
SELECT id, 'has_share', 1, 'Partage de synthèses' FROM plans WHERE slug = 'premium';

INSERT INTO plan_limits (plan_id, limit_key, limit_value, label)
SELECT id, 'has_share', 1, 'Partage de synthèses' FROM plans WHERE slug = 'school';

-- Colonne pour tracer l'origine des synthèses partagées
ALTER TABLE syntheses ADD COLUMN shared_from_user_id INT NULL AFTER specific_instructions;
