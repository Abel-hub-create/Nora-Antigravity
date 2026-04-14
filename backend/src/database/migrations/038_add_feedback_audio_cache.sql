-- Migration 038: Add feedback_audio cache column to exercises
ALTER TABLE exercises ADD COLUMN feedback_audio MEDIUMTEXT NULL DEFAULT NULL AFTER feedback_note;
