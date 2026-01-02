-- Migration: Add email verification fields to users table
-- Date: 2026-01-02

ALTER TABLE users
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE AFTER avatar,
ADD COLUMN verification_token VARCHAR(255) NULL AFTER is_verified,
ADD COLUMN verification_token_expires DATETIME NULL AFTER verification_token;

-- Index for faster token lookup
CREATE INDEX idx_users_verification_token ON users(verification_token);
