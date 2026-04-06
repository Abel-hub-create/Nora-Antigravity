CREATE TABLE IF NOT EXISTS `{PREFIX}quiz_answers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `question_id` INT UNSIGNED NOT NULL,
  `synthese_id` INT UNSIGNED NOT NULL,
  `selected_answer` INT NOT NULL,
  `is_correct` TINYINT(1) NOT NULL,
  `answered_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_subject` (`user_id`),
  KEY `idx_question` (`question_id`),
  KEY `idx_synthese` (`synthese_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
