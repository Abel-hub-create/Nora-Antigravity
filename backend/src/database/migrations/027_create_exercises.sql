CREATE TABLE IF NOT EXISTS `{PREFIX}exercises` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `subject` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `difficulty_summary` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
