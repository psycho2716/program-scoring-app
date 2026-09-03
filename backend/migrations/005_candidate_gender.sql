-- Mr. / Miss division on candidates
USE pageant_scoring;

ALTER TABLE candidates
  ADD COLUMN gender ENUM('male', 'female') NOT NULL DEFAULT 'female' AFTER candidate_number;

-- Best-effort backfill from common seed / known names (admin can correct in setup)
UPDATE candidates SET gender = 'male'
WHERE name IN (
  'Juan Dela Cruz',
  'Carlos Mendoza',
  'Miguel Torres',
  'Diego Ramos',
  'Sam Fabellon'
);

UPDATE candidates SET gender = 'female'
WHERE name IN (
  'Maria Santos',
  'Ana Reyes',
  'Sofia Garcia',
  'Isabella Cruz',
  'Micah May Fabellon'
);

-- Allow Miss #1 and Mr #1 simultaneously
ALTER TABLE candidates DROP INDEX candidate_number;
ALTER TABLE candidates ADD UNIQUE KEY uk_candidate_gender_number (gender, candidate_number);

ALTER TABLE candidates ALTER COLUMN gender DROP DEFAULT;
