-- Remove score rows for deleted candidates/judges/categories, then restore FKs.
USE pageant_scoring;

DELETE s FROM scores s
LEFT JOIN candidates c ON c.id = s.candidate_id
WHERE c.id IS NULL;

DELETE s FROM scores s
LEFT JOIN users u ON u.id = s.judge_id
WHERE u.id IS NULL;

DELETE s FROM scores s
LEFT JOIN categories cat ON cat.id = s.category_id
WHERE cat.id IS NULL;

-- Recreate foreign keys if missing (ignore errors if already present via app migration runner).
ALTER TABLE scores
  ADD CONSTRAINT fk_scores_judge
    FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_scores_candidate
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_scores_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
