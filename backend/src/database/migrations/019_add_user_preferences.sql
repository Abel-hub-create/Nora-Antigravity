-- Migration: Add theme and language preferences to users table
-- Run: mysql -u username -p database_name < 019_add_user_preferences.sql

ALTER TABLE users
ADD COLUMN theme VARCHAR(10) DEFAULT 'dark' AFTER avatar,
ADD COLUMN language VARCHAR(5) DEFAULT 'fr' AFTER theme;
