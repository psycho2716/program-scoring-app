-- Replace all candidates with the final Mr. and Miss Katimugan roster (8 contestants).
-- Clears candidate scores/results for a fresh event slate; keeps judges, categories, settings.
-- Safe to re-run: always ends with the same 8 candidates and a resynced score grid.
USE pageant_scoring;

DELETE FROM candidate_results;

DELETE s FROM scores s
INNER JOIN candidates c ON c.id = s.candidate_id;

DELETE FROM candidates;

INSERT INTO candidates (candidate_number, gender, name, department) VALUES
  (1, 'female', 'Akisha Daquiado', 'Bachelor of Secondary Education'),
  (2, 'female', 'Angelie Briones Maestre', 'Bachelor of Secondary Education'),
  (3, 'female', 'Psalms Fabellon', 'Bachelor of Science in Business Administration'),
  (1, 'male', 'James Andrei Mindoro', 'Bachelor of Elementary Education'),
  (2, 'male', 'Mike Fabellon', 'Bachelor of Science in Information Technology'),
  (3, 'male', 'Axl Maverick Aguado', 'Bachelor of Science in Information Technology'),
  (4, 'male', 'Karl Palis', 'Bachelor of Science in Business Administration'),
  (5, 'male', 'Jaz M. Magdato', 'Bachelor of Elementary Education');

INSERT IGNORE INTO scores (judge_id, candidate_id, category_id, raw_score, is_submitted)
SELECT j.id, c.id, cat.id, NULL, FALSE
FROM users j
CROSS JOIN candidates c
CROSS JOIN categories cat
WHERE j.role = 'judge';

DELETE s FROM scores s
LEFT JOIN candidates c ON c.id = s.candidate_id
WHERE c.id IS NULL;
