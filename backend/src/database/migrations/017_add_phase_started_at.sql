-- Migration: 017_add_phase_started_at.sql
-- Description: Add phase_started_at timestamp for real-time timer calculation

ALTER TABLE revision_sessions ADD COLUMN phase_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER phase;
