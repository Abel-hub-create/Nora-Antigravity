CREATE TABLE IF NOT EXISTS `{PREFIX}exercise_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `exercise_set_id` INT UNSIGNED NOT NULL,
  `type` ENUM('qcm','open','practical') NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `question` TEXT NOT NULL,
  `options` JSON,
  `correct_answer` INT,
  `expected_answer` TEXT,
  `user_answer` TEXT,
  PRIMARY KEY (`id`),
  KEY `idx_set` (`exercise_set_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
