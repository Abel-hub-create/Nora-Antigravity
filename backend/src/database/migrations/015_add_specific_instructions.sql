-- Migration: 015_add_specific_instructions.sql
-- Description: Add specific_instructions field to syntheses for revision comparison

ALTER TABLE syntheses
ADD COLUMN specific_instructions TEXT NULL AFTER summary_content;

-- Add comment for documentation
ALTER TABLE syntheses
MODIFY COLUMN specific_instructions TEXT NULL COMMENT 'User-defined important elements to prioritize in recall evaluation';
