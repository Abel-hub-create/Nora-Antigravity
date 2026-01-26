-- Add onboarding_completed column to users table
-- Tracks whether user has completed the initial onboarding flow

ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE AFTER language;

-- Set existing users as already onboarded (they were here before the feature)
UPDATE users SET onboarding_completed = TRUE WHERE id > 0;
