-- Migration: Add avatar column to users
-- Run: mysql -u username -p database_name < 011_add_avatar.sql

ALTER TABLE users
  ADD COLUMN avatar MEDIUMTEXT NULL AFTER name;
