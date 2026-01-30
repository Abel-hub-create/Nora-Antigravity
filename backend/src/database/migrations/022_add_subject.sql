-- Migration: Add subject column to syntheses table
-- Permet d'associer chaque cours à une matière pour adapter les prompts IA

ALTER TABLE syntheses ADD COLUMN subject VARCHAR(50) NULL AFTER source_type;

-- Index pour filtrer par matière
CREATE INDEX idx_subject ON syntheses(subject);
