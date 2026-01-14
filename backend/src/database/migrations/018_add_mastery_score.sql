-- Add mastery_score column to syntheses table
-- Stores the last revision score (0-100) for badge display
-- NULL means never completed a revision, 100 means mastered

ALTER TABLE syntheses ADD COLUMN mastery_score INT UNSIGNED NULL AFTER specific_instructions;

-- Add index for efficient filtering of mastered syntheses
CREATE INDEX idx_syntheses_mastery ON syntheses(user_id, mastery_score);
