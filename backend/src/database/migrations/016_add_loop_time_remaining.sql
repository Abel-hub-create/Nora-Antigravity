-- Migration: 016_add_loop_time_remaining.sql
-- Description: Add loop_time_remaining field to revision_sessions for 5-minute loop study timer

ALTER TABLE revision_sessions
ADD COLUMN loop_time_remaining INT DEFAULT 300 AFTER pause_time_remaining;
