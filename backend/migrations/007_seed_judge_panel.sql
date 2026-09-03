-- Idempotent seed/update for the 7 Katimugan judge accounts (judge1–judge7).
-- Safe to re-run: updates display names and judge numbers; inserts missing judges
-- with the default password123 hash without overwriting existing passwords.
USE pageant_scoring;

SET @pwd = '$2b$10$txbkEh4X4b4S9BdMf2VQpu1N4gHLVSyZ.czWy8Y2/RMGhywKgvkDu';

-- display_name column added by 006_judge_display_name.sql; ensure it exists for fresh partial installs
SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'display_name'
);
SET @ddl = IF(
  @col_exists = 0,
  'ALTER TABLE users ADD COLUMN display_name VARCHAR(120) NULL AFTER username',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO users (username, display_name, password_hash, role, judge_number) VALUES
  ('judge1', 'Ms. Shella Mae Tabuna', @pwd, 'judge', 1),
  ('judge2', 'Mr. Ralph Lester Gadon', @pwd, 'judge', 2),
  ('judge3', 'Mr. Mark Lambert Fornea', @pwd, 'judge', 3),
  ('judge4', 'Mr. Marcus Maylas', @pwd, 'judge', 4),
  ('judge5', 'Mr. John Vyktor Regala', @pwd, 'judge', 5),
  ('judge6', 'Mr. Justin Tyron Martinez', @pwd, 'judge', 6),
  ('judge7', 'Ms. Danielle Jane Magallon', @pwd, 'judge', 7)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  judge_number = VALUES(judge_number);
