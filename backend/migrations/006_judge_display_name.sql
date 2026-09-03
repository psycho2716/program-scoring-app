-- Judge display names for Mr. and Miss Katimugan panel
USE pageant_scoring;

ALTER TABLE users
  ADD COLUMN display_name VARCHAR(120) NULL AFTER username;

UPDATE users SET display_name = 'Ms. Shella Mae Tabuna' WHERE username = 'judge1' AND role = 'judge';
UPDATE users SET display_name = 'Mr. Ralph Lester Gadon' WHERE username = 'judge2' AND role = 'judge';
UPDATE users SET display_name = 'Mr. Mark Lambert Fornea' WHERE username = 'judge3' AND role = 'judge';
UPDATE users SET display_name = 'Mr. Marcus Maylas' WHERE username = 'judge4' AND role = 'judge';
UPDATE users SET display_name = 'Mr. John Vyktor Regala' WHERE username = 'judge5' AND role = 'judge';
UPDATE users SET display_name = 'Mr. Justin Tyron Martinez' WHERE username = 'judge6' AND role = 'judge';
UPDATE users SET display_name = 'Ms. Danielle Jane Magallon' WHERE username = 'judge7' AND role = 'judge';
