ALTER TABLE admins
  ADD COLUMN totp_secret VARCHAR(64) NULL DEFAULT NULL AFTER password_hash,
  ADD COLUMN totp_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER totp_secret;
