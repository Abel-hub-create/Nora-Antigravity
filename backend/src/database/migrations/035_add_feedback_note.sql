ALTER TABLE exercises
  ADD COLUMN feedback_note TEXT NULL DEFAULT NULL AFTER difficulty_summary;
