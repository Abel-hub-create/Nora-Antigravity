-- Migration: 021_add_requirement_level.sql
-- Description: Add requirement level for guided revision

-- Add requirement level to revision sessions
ALTER TABLE revision_sessions
ADD COLUMN requirement_level ENUM('beginner', 'intermediate', 'expert', 'custom') DEFAULT 'intermediate' AFTER synthese_id,
ADD COLUMN custom_settings JSON NULL AFTER requirement_level;

-- custom_settings JSON structure (only used when requirement_level = 'custom'):
-- {
--   "definitions": 70,    -- Precision percentage (0-100)
--   "concepts": 70,       -- Precision percentage (0-100)
--   "data": 70            -- Precision percentage (0-100)
-- }
