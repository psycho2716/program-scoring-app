-- Add event settings for configurable pageant setup
USE pageant_scoring;

CREATE TABLE IF NOT EXISTS event_settings (
  id INT PRIMARY KEY DEFAULT 1,
  pageant_name VARCHAR(200) NOT NULL DEFAULT 'Mr. and Miss Katimugan',
  min_score TINYINT NOT NULL DEFAULT 1,
  max_score TINYINT NOT NULL DEFAULT 10,
  scoring_formula ENUM('percentage_weighted', 'raw_average_weighted') NOT NULL DEFAULT 'percentage_weighted',
  tiebreaker_category_id INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_single_event CHECK (id = 1)
);

INSERT INTO event_settings (id, pageant_name, min_score, max_score, scoring_formula)
VALUES (1, 'Mr. and Miss Katimugan', 1, 10, 'percentage_weighted')
ON DUPLICATE KEY UPDATE pageant_name = pageant_name;

-- Set default tiebreaker to Question & Answer if it exists
UPDATE event_settings es
SET tiebreaker_category_id = (
  SELECT id FROM categories WHERE category_name = 'Question & Answer' LIMIT 1
)
WHERE es.id = 1 AND es.tiebreaker_category_id IS NULL;
