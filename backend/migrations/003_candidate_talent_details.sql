-- Talent / performance notes shown on the judge candidate hero card
USE pageant_scoring;

ALTER TABLE candidates
  ADD COLUMN talent_details VARCHAR(200) NULL AFTER department;
