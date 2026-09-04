-- Mr. and Miss Katimugan — Pageant Scoring Schema
CREATE DATABASE IF NOT EXISTS pageant_scoring CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pageant_scoring;

DROP TABLE IF EXISTS candidate_results;
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS system_state;
DROP TABLE IF EXISTS event_settings;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(120) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('judge', 'admin') NOT NULL,
  judge_number TINYINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_number TINYINT NOT NULL,
  gender ENUM('male', 'female') NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  talent_details VARCHAR(200) NULL,
  photo_url VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_candidate_gender_number (gender, candidate_number)
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  weight DECIMAL(5, 2) NOT NULL,
  max_score TINYINT NOT NULL DEFAULT 10,
  display_order TINYINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  judge_id INT NOT NULL,
  candidate_id INT NOT NULL,
  category_id INT NOT NULL,
  raw_score DECIMAL(4,1) NULL,
  is_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_score (judge_id, candidate_id, category_id),
  FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE system_state (
  id INT PRIMARY KEY DEFAULT 1,
  active_category_id INT NULL,
  is_scoring_open BOOLEAN NOT NULL DEFAULT FALSE,
  results_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (active_category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT chk_single_state CHECK (id = 1)
);

CREATE TABLE candidate_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  category_id INT NOT NULL,
  avg_raw DECIMAL(5, 2) NOT NULL DEFAULT 0,
  weighted_score DECIMAL(6, 2) NOT NULL DEFAULT 0,
  final_score DECIMAL(6, 2) NOT NULL DEFAULT 0,
  rank_position INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_result (candidate_id, category_id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE event_settings (
  id INT PRIMARY KEY DEFAULT 1,
  pageant_name VARCHAR(200) NOT NULL DEFAULT 'Mr. and Miss Katimugan',
  min_score TINYINT NOT NULL DEFAULT 1,
  max_score TINYINT NOT NULL DEFAULT 10,
  scoring_formula ENUM('percentage_weighted', 'raw_average_weighted') NOT NULL DEFAULT 'percentage_weighted',
  tiebreaker_category_id INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_single_event CHECK (id = 1)
);

-- Default password for all accounts: password123
SET @pwd = '$2b$10$txbkEh4X4b4S9BdMf2VQpu1N4gHLVSyZ.czWy8Y2/RMGhywKgvkDu';

INSERT INTO users (username, display_name, password_hash, role, judge_number) VALUES
  ('judge1', 'Ms. Shella Mae Tabuna', @pwd, 'judge', 1),
  ('judge2', 'Mr. Ralph Lester Gadon', @pwd, 'judge', 2),
  ('judge3', 'Mr. Mark Lambert Fornea', @pwd, 'judge', 3),
  ('judge4', 'Mr. Marcus Maylas', @pwd, 'judge', 4),
  ('judge5', 'Mr. John Vyktor Regala', @pwd, 'judge', 5),
  ('judge6', 'Mr. Justin Tyron Martinez', @pwd, 'judge', 6),
  ('judge7', 'Ms. Danielle Jane Magallon', @pwd, 'judge', 7),
  ('admin', NULL, @pwd, 'admin', NULL);

INSERT INTO candidates (candidate_number, gender, name, department) VALUES
  (1, 'female', 'Akisha Daquiado', 'Bachelor of Secondary Education'),
  (2, 'female', 'Angelie Briones Maestre', 'Bachelor of Secondary Education'),
  (3, 'female', 'Psalms Fabellon', 'Bachelor of Science in Business Administration'),
  (1, 'male', 'James Andrei Mindoro', 'Bachelor of Elementary Education'),
  (2, 'male', 'Mike Fabellon', 'Bachelor of Science in Information Technology'),
  (3, 'male', 'Axl Maverick Aguado', 'Bachelor of Science in Information Technology'),
  (4, 'male', 'Karl Palis', 'Bachelor of Science in Business Administration'),
  (5, 'male', 'Jaz M. Magdato', 'Bachelor of Elementary Education');

INSERT INTO categories (category_name, weight, max_score, display_order) VALUES
  ('Production Number', 10.00, 10, 1),
  ('Advocacy Speech', 15.00, 10, 2),
  ('School Uniform', 10.00, 10, 3),
  ('Talent', 20.00, 10, 4),
  ('ASEAN Attire', 20.00, 10, 5),
  ('Question & Answer', 25.00, 10, 6);

INSERT INTO event_settings (id, pageant_name, min_score, max_score, scoring_formula)
VALUES (1, 'Mr. and Miss Katimugan', 1, 10, 'percentage_weighted');

UPDATE event_settings
SET tiebreaker_category_id = (SELECT id FROM categories WHERE category_name = 'Question & Answer' LIMIT 1)
WHERE id = 1;

INSERT INTO system_state (id, active_category_id, is_scoring_open, results_revealed) VALUES (1, NULL, FALSE, FALSE);

INSERT INTO scores (judge_id, candidate_id, category_id, raw_score, is_submitted)
SELECT j.id, c.id, cat.id, NULL, FALSE
FROM users j
CROSS JOIN candidates c
CROSS JOIN categories cat
WHERE j.role = 'judge';
