-- Projector / audience results reveal (tabulator-controlled)
USE pageant_scoring;

ALTER TABLE system_state
  ADD COLUMN results_revealed BOOLEAN NOT NULL DEFAULT FALSE AFTER is_scoring_open;
