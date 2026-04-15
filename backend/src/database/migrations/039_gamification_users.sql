-- Migration 039: Nouveau système de gamification — colonnes users
-- Renomme streak → winstreak, ajoute coins/last_activity_date/timezone, supprime eggs/collection

ALTER TABLE users
  CHANGE COLUMN streak winstreak INT NOT NULL DEFAULT 1,
  ADD COLUMN coins INT NOT NULL DEFAULT 0 AFTER winstreak,
  ADD COLUMN last_activity_date DATE NULL AFTER coins,
  ADD COLUMN timezone VARCHAR(100) NOT NULL DEFAULT 'UTC' AFTER last_activity_date,
  DROP COLUMN eggs,
  DROP COLUMN collection;

-- Winstreak minimum = 1
UPDATE users SET winstreak = 1 WHERE winstreak = 0;

-- Recalculer next_level_exp selon les nouveaux seuils
-- Niveaux 1-3 : 500 XP, 4-9 : 1000 XP, 10+ : 1200 XP
UPDATE users SET next_level_exp = CASE
  WHEN level <= 3 THEN 500
  WHEN level <= 9 THEN 1000
  ELSE 1200
END;
