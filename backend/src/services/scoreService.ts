import { RowDataPacket } from "mysql2";
import { pool } from "../db/pool";
import { CandidateGender, ScoreEntry } from "../types";
import { getEventSettings } from "./settingsService";
import { getSystemState } from "./stateService";

async function ensureScoreGrid(): Promise<void> {
  await pool.query(
    `INSERT IGNORE INTO scores (judge_id, candidate_id, category_id, raw_score, is_submitted)
     SELECT j.id, c.id, cat.id, NULL, FALSE
     FROM users j
     CROSS JOIN candidates c
     CROSS JOIN categories cat
     WHERE j.role = 'judge'`
  );
}

interface ScoreRow extends RowDataPacket {
  candidate_id: number;
  candidate_number: number;
  gender: CandidateGender;
  name: string;
  department: string;
  talent_details: string | null;
  photo_url: string | null;
  raw_score: number | null;
  is_submitted: boolean;
}

interface JudgeCategoryStatusRow extends RowDataPacket {
  total: number;
  filled: number;
  submitted: number;
}

interface CountRow extends RowDataPacket {
  count: number;
}

/** Accepts whole or half-point scores within the configured range (e.g. 7.5). */
export async function isValidRawScore(value: unknown): Promise<boolean> {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (typeof numeric !== "number" || Number.isNaN(numeric)) return false;
  const scaled = numeric * 2;
  if (!Number.isInteger(scaled)) return false;
  const settings = await getEventSettings();
  return numeric >= settings.minScore && numeric <= settings.maxScore;
}

export async function getCandidateCount(): Promise<number> {
  const [rows] = await pool.query<CountRow[]>("SELECT COUNT(*) AS count FROM candidates");
  return Number(rows[0]?.count ?? 0);
}

interface PreviousScoreRow extends RowDataPacket {
  candidate_id: number;
  raw_score: number | null;
}

export async function getActiveScoresForJudge(judgeId: number): Promise<{
  categoryId: number | null;
  isSubmittedForCategory: boolean;
  scores: ScoreEntry[];
}> {
  const state = await getSystemState();
  if (!state.activeCategoryId) {
    return { categoryId: null, isSubmittedForCategory: false, scores: [] };
  }

  const [rows] = await pool.query<ScoreRow[]>(
    `SELECT c.id AS candidate_id, c.candidate_number, c.gender, c.name, c.department, c.talent_details,
            c.photo_url, s.raw_score, s.is_submitted
     FROM candidates c
     LEFT JOIN scores s ON s.candidate_id = c.id
       AND s.judge_id = :judgeId
       AND s.category_id = :categoryId
     ORDER BY c.gender DESC, c.candidate_number`,
    { judgeId, categoryId: state.activeCategoryId }
  );

  const [prevCategoryRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, category_name FROM categories
     WHERE display_order < (
       SELECT display_order FROM categories WHERE id = :categoryId
     )
     ORDER BY display_order DESC
     LIMIT 1`,
    { categoryId: state.activeCategoryId }
  );

  const previousByCandidate = new Map<number, { score: number; categoryName: string }>();
  if (prevCategoryRows[0]) {
    const prevCategoryId = Number(prevCategoryRows[0].id);
    const prevCategoryName = String(prevCategoryRows[0].category_name);
    const [prevScores] = await pool.query<PreviousScoreRow[]>(
      `SELECT candidate_id, raw_score
       FROM scores
       WHERE judge_id = :judgeId AND category_id = :categoryId AND raw_score IS NOT NULL`,
      { judgeId, categoryId: prevCategoryId }
    );
    for (const row of prevScores) {
      previousByCandidate.set(row.candidate_id, {
        score: Number(row.raw_score),
        categoryName: prevCategoryName,
      });
    }
  }

  const isSubmittedForCategory = rows.length > 0 && rows.every((row) => Boolean(row.is_submitted));

  return {
    categoryId: state.activeCategoryId,
    isSubmittedForCategory,
    scores: rows.map((row) => {
      const previous = previousByCandidate.get(row.candidate_id);
      return {
        candidateId: row.candidate_id,
        candidateNumber: row.candidate_number,
        gender: row.gender,
        name: row.name,
        department: row.department,
        talentDetails: row.talent_details,
        photoUrl: row.photo_url,
        rawScore: row.raw_score == null ? null : Number(row.raw_score),
        isSubmitted: Boolean(row.is_submitted),
        previousScore: previous?.score ?? null,
        previousCategoryName: previous?.categoryName ?? null,
      };
    }),
  };
}

export async function saveScore(
  judgeId: number,
  candidateId: number,
  rawScore: number
): Promise<void> {
  const state = await getSystemState();

  if (!state.isScoringOpen || !state.activeCategoryId) {
    throw new Error("Scoring is not open");
  }

  const [statusRows] = await pool.query<JudgeCategoryStatusRow[]>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN s.raw_score IS NOT NULL THEN 1 ELSE 0 END) AS filled,
            SUM(CASE WHEN s.is_submitted = 1 THEN 1 ELSE 0 END) AS submitted
     FROM scores s
     INNER JOIN candidates c ON c.id = s.candidate_id
     WHERE s.judge_id = :judgeId AND s.category_id = :categoryId`,
    { judgeId, categoryId: state.activeCategoryId }
  );

  const status = statusRows[0];
  if (status && Number(status.submitted) > 0) {
    throw new Error("Scores already submitted for this category");
  }

  const [result] = await pool.query(
    `UPDATE scores
     SET raw_score = :rawScore, is_submitted = 0
     WHERE judge_id = :judgeId AND candidate_id = :candidateId AND category_id = :categoryId`,
    {
      rawScore,
      judgeId,
      candidateId,
      categoryId: state.activeCategoryId,
    }
  );

  if ((result as { affectedRows: number }).affectedRows === 0) {
    throw new Error("Score record not found");
  }
}

export async function submitCategoryScores(judgeId: number): Promise<number> {
  const state = await getSystemState();

  if (!state.isScoringOpen || !state.activeCategoryId) {
    throw new Error("Scoring is not open");
  }

  const categoryId = state.activeCategoryId;
  await ensureScoreGrid();
  const candidateCount = await getCandidateCount();

  // Only count score rows for candidates that still exist (ignore orphans).
  const [rows] = await pool.query<ScoreRow[]>(
    `SELECT s.raw_score, s.is_submitted
     FROM scores s
     INNER JOIN candidates c ON c.id = s.candidate_id
     WHERE s.judge_id = :judgeId AND s.category_id = :categoryId
     ORDER BY c.candidate_number`,
    { judgeId, categoryId }
  );

  if (rows.length !== candidateCount) {
    throw new Error(
      `Expected ${candidateCount} candidate scores, found ${rows.length}. Try refreshing and scoring again.`
    );
  }

  if (rows.some((row) => row.is_submitted)) {
    throw new Error("Scores already submitted for this category");
  }

  for (const row of rows) {
    const valid = await isValidRawScore(row.raw_score);
    if (row.raw_score === null || !valid) {
      const settings = await getEventSettings();
      throw new Error(
        `All ${candidateCount} candidates must have valid scores (${settings.minScore}-${settings.maxScore}) before submitting`
      );
    }
  }

  await pool.query(
    `UPDATE scores s
     INNER JOIN candidates c ON c.id = s.candidate_id
     SET s.is_submitted = 1
     WHERE s.judge_id = :judgeId AND s.category_id = :categoryId`,
    { judgeId, categoryId }
  );

  return categoryId;
}

export async function hasJudgeSubmittedCategory(
  judgeId: number,
  categoryId: number
): Promise<boolean> {
  const candidateCount = await getCandidateCount();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt
     FROM scores s
     INNER JOIN candidates c ON c.id = s.candidate_id
     WHERE s.judge_id = :judgeId AND s.category_id = :categoryId AND s.is_submitted = 1`,
    { judgeId, categoryId }
  );
  return Number(rows[0]?.cnt ?? 0) >= candidateCount;
}

/** Remove score rows pointing at deleted candidates/judges/categories. */
export async function cleanupOrphanScores(): Promise<number> {
  const [result] = await pool.query(
    `DELETE s FROM scores s
     LEFT JOIN candidates c ON c.id = s.candidate_id
     LEFT JOIN users u ON u.id = s.judge_id
     LEFT JOIN categories cat ON cat.id = s.category_id
     WHERE c.id IS NULL OR u.id IS NULL OR cat.id IS NULL`
  );
  return Number((result as { affectedRows?: number }).affectedRows ?? 0);
}
