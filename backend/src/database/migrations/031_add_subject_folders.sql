-- Add subject column to folders (links a folder to a subject for auto-sorting)
ALTER TABLE folders ADD COLUMN subject VARCHAR(50) NULL DEFAULT NULL AFTER color;
ALTER TABLE folders ADD INDEX idx_user_subject (user_id, subject);

-- Add auto_folder preference to users (default ON)
ALTER TABLE users ADD COLUMN auto_folder TINYINT(1) NOT NULL DEFAULT 1 AFTER language;
