-- Migration: Add Google OAuth authentication support
-- Adds google_id column for identifying Google-authenticated users
-- Makes password optional for Google-only accounts

-- Add google_id column to store Google's unique user identifier
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL AFTER email;

-- Add unique index on google_id for fast lookups
ALTER TABLE users ADD UNIQUE INDEX idx_google_id (google_id);

-- Make password column nullable (Google-only accounts don't have passwords)
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL;
