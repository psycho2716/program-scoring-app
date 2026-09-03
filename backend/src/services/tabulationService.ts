import { RowDataPacket } from "mysql2";
import { pool } from "../db/pool";
import {
  CandidateGender,
  DualWinners,
  MatrixCell,
  TabulationRow,
  WinnerInfo,
} from "../types";
import { getAllCategories } from "./stateService";
import { calculateWeightedScore, getEventSettings } from "./settingsService";

interface RawScoreRow extends RowDataPacket {
  candidate_id: number;
  category_id: number;
  raw_score: number;
}

interface CandidateRow extends RowDataPacket {
  id: number;
  candidate_number: number;
  gender: CandidateGender;
  name: string;
  department: string;
}

interface MatrixRow extends RowDataPacket {
  judge_id: number;
  judge_number: number;
  candidate_id: number;
  candidate_number: number;
  gender: CandidateGender;
  category_id: number;
  raw_score: number | null;
  is_submitted: boolean;
}

interface CompletionRow extends RowDataPacket {
  total: number;
  submitted: number;
}

let recalculationLock: Promise<void> = Promise.resolve();

async function withRecalculationLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = recalculationLock.then(operation, operation);
  recalculationLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function mapTabulationRow(
  candidate: CandidateRow,
  categories: Awaited<ReturnType<typeof getAllCategories>>,
  resultRows: Array<
    RowDataPacket & {
      candidate_id: number;
      category_id: number;
      weighted_score: number;
      final_score: number;
      rank_position: number;
    }
  >
): TabulationRow {
  const candidateResults = resultRows.filter((r) => r.candidate_id === candidate.id);
  const categoryScores: Record<number, number> = {};

  for (const category of categories) {
    const match = candidateResults.find((r) => r.category_id === category.id);
    categoryScores[category.id] = match ? Number(match.weighted_score) : 0;
  }

  const first = candidateResults[0];

  return {
    candidateId: candidate.id,
    candidateNumber: candidate.candidate_number,
    gender: candidate.gender,
    name: candidate.name,
    department: candidate.department,
    categoryScores,
    finalScore: first ? Number(first.final_score) : 0,
    rank: first ? Number(first.rank_position) : 0,
  };
}

export async function recalculateTabulation(): Promise<void> {
  return withRecalculationLock(async () => {
    const settings = await getEventSettings();
    const categories = await getAllCategories();
    const [candidates] = await pool.query<CandidateRow[]>(
      "SELECT id, candidate_number, gender, name, department FROM candidates ORDER BY gender, candidate_number"
    );

    // Only submitted category scores count toward the public leaderboard.
    const [rawRows] = await pool.query<RawScoreRow[]>(
      `SELECT s.candidate_id, s.category_id, s.raw_score
       FROM scores s
       INNER JOIN users u ON u.id = s.judge_id AND u.role = 'judge'
       WHERE s.raw_score IS NOT NULL
         AND s.is_submitted = 1`
    );

    const grouped = new Map<string, number[]>();
    for (const row of rawRows) {
      const score = Number(row.raw_score);
      if (!Number.isFinite(score)) continue;

      const key = `${row.candidate_id}-${row.category_id}`;
      const list = grouped.get(key) ?? [];
      list.push(score);
      grouped.set(key, list);
    }

    const finalScores = new Map<number, number>();
    const categoryWeighted = new Map<string, number>();
    const categoryAvg = new Map<string, number>();

    for (const candidate of candidates) {
      let finalScore = 0;

      for (const category of categories) {
        const key = `${candidate.id}-${category.id}`;
        const scores = grouped.get(key) ?? [];
        const avgRaw =
          scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
        const weighted = calculateWeightedScore(
          avgRaw,
          category.weight,
          settings.maxScore,
          settings
        );
        const safeAvg = Number.isFinite(avgRaw) ? avgRaw : 0;
        const safeWeighted = Number.isFinite(weighted) ? weighted : 0;

        categoryAvg.set(key, safeAvg);
        categoryWeighted.set(key, safeWeighted);
        finalScore += safeWeighted;
      }

      finalScores.set(candidate.id, Number.isFinite(finalScore) ? finalScore : 0);
    }

    const tiebreakerCategory = settings.tiebreakerCategoryId
      ? categories.find((c) => c.id === settings.tiebreakerCategoryId)
      : categories.find((c) => c.categoryName === "Question & Answer");

    const compareCandidates = (a: CandidateRow, b: CandidateRow) => {
      const diff = (finalScores.get(b.id) ?? 0) - (finalScores.get(a.id) ?? 0);
      if (Math.abs(diff) > 0.0001) return diff;

      if (tiebreakerCategory) {
        const aTie = categoryWeighted.get(`${a.id}-${tiebreakerCategory.id}`) ?? 0;
        const bTie = categoryWeighted.get(`${b.id}-${tiebreakerCategory.id}`) ?? 0;
        if (bTie !== aTie) return bTie - aTie;
      }

      return a.candidate_number - b.candidate_number;
    };

    const rankMap = new Map<number, number>();
    for (const gender of ["female", "male"] as CandidateGender[]) {
      const division = candidates.filter((c) => c.gender === gender).sort(compareCandidates);
      division.forEach((candidate, index) => {
        rankMap.set(candidate.id, index + 1);
      });
    }

    await pool.query("DELETE FROM candidate_results");

    const insertValues: Array<{
      candidateId: number;
      categoryId: number;
      avgRaw: number;
      weightedScore: number;
      finalScore: number;
      rank: number;
    }> = [];

    for (const candidate of candidates) {
      const finalScore = finalScores.get(candidate.id) ?? 0;
      const rank = rankMap.get(candidate.id) ?? 0;

      for (const category of categories) {
        const key = `${candidate.id}-${category.id}`;
        insertValues.push({
          candidateId: candidate.id,
          categoryId: category.id,
          avgRaw: categoryAvg.get(key) ?? 0,
          weightedScore: categoryWeighted.get(key) ?? 0,
          finalScore,
          rank,
        });
      }
    }

    if (insertValues.length > 0) {
      const placeholders = insertValues.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
      const flatValues = insertValues.flatMap((row) => [
        row.candidateId,
        row.categoryId,
        row.avgRaw,
        row.weightedScore,
        row.finalScore,
        row.rank,
      ]);

      await pool.query(
        `INSERT INTO candidate_results (candidate_id, category_id, avg_raw, weighted_score, final_score, rank_position)
         VALUES ${placeholders}`,
        flatValues
      );
    }
  });
}

export async function getTabulation(): Promise<TabulationRow[]> {
  const categories = await getAllCategories();
  const [candidates] = await pool.query<CandidateRow[]>(
    "SELECT id, candidate_number, gender, name, department FROM candidates ORDER BY gender DESC, candidate_number"
  );

  const [resultRows] = await pool.query<
    (RowDataPacket & {
      candidate_id: number;
      category_id: number;
      weighted_score: number;
      final_score: number;
      rank_position: number;
    })[]
  >(
    `SELECT candidate_id, category_id, weighted_score, final_score, rank_position
     FROM candidate_results`
  );

  if (resultRows.length === 0) {
    await recalculateTabulation();

    const [refreshedRows] = await pool.query<
      (RowDataPacket & {
        candidate_id: number;
        category_id: number;
        weighted_score: number;
        final_score: number;
        rank_position: number;
      })[]
    >(
      `SELECT candidate_id, category_id, weighted_score, final_score, rank_position
       FROM candidate_results`
    );

    return candidates.map((candidate) =>
      mapTabulationRow(candidate, categories, refreshedRows)
    );
  }

  return candidates.map((candidate) => mapTabulationRow(candidate, categories, resultRows));
}

export async function getSubmissionMatrix(categoryId: number): Promise<MatrixCell[]> {
  const [rows] = await pool.query<MatrixRow[]>(
    `SELECT u.id AS judge_id, u.judge_number, c.id AS candidate_id, c.candidate_number, c.gender,
            s.category_id, s.raw_score, s.is_submitted
     FROM users u
     CROSS JOIN candidates c
     LEFT JOIN scores s ON s.judge_id = u.id AND s.candidate_id = c.id AND s.category_id = :categoryId
     WHERE u.role = 'judge'
     ORDER BY c.gender DESC, c.candidate_number, u.judge_number`,
    { categoryId }
  );

  const judgeCategoryStatus = new Map<number, { filled: number; submitted: boolean }>();

  for (const row of rows) {
    if (!judgeCategoryStatus.has(row.judge_id)) {
      const judgeRows = rows.filter((r) => r.judge_id === row.judge_id);
      const filled = judgeRows.filter((r) => r.raw_score !== null).length;
      const submitted = judgeRows.every((r) => r.is_submitted);
      judgeCategoryStatus.set(row.judge_id, { filled, submitted });
    }
  }

  return rows.map((row) => {
    const judgeStatus = judgeCategoryStatus.get(row.judge_id);
    let status: MatrixCell["status"] = "not_started";

    if (row.is_submitted) {
      status = "submitted";
    } else if (row.raw_score !== null || (judgeStatus && judgeStatus.filled > 0)) {
      status = "in_progress";
    }

    return {
      judgeId: row.judge_id,
      judgeNumber: row.judge_number,
      candidateId: row.candidate_id,
      candidateNumber: row.candidate_number,
      gender: row.gender,
      categoryId: row.category_id ?? categoryId,
      status,
      rawScore: row.raw_score == null ? null : Number(row.raw_score),
    };
  });
}

export async function getWinnerInfo(): Promise<DualWinners> {
  const tabulation = await getTabulation();

  const [completion] = await pool.query<CompletionRow[]>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN is_submitted = 1 THEN 1 ELSE 0 END) AS submitted
     FROM scores s
     INNER JOIN users u ON u.id = s.judge_id AND u.role = 'judge'`
  );

  const total = Number(completion[0]?.total ?? 0);
  const submitted = Number(completion[0]?.submitted ?? 0);
  const isComplete = total > 0 && submitted === total;

  const pickWinner = (gender: CandidateGender): WinnerInfo | null => {
    const winner = tabulation
      .filter((row) => row.gender === gender)
      .sort((a, b) => a.rank - b.rank)[0];
    if (!winner) return null;

    return {
      candidateId: winner.candidateId,
      candidateNumber: winner.candidateNumber,
      gender: winner.gender,
      name: winner.name,
      department: winner.department,
      finalScore: winner.finalScore,
      isComplete,
    };
  };

  return {
    male: pickWinner("male"),
    female: pickWinner("female"),
  };
}

export async function getRawScoresForExport(): Promise<
  {
    categoryId: number;
    categoryName: string;
    weight: number;
    displayOrder: number;
    rows: {
      candidateNumber: number;
      gender: CandidateGender;
      name: string;
      judgeScores: (number | null)[];
    }[];
  }[]
> {
  const categories = await getAllCategories();

  const [judgeRows] = await pool.query<(RowDataPacket & { judge_number: number })[]>(
    "SELECT judge_number FROM users WHERE role = 'judge' ORDER BY judge_number"
  );

  const [candidateRows] = await pool.query<CandidateRow[]>(
    "SELECT id, candidate_number, gender, name FROM candidates ORDER BY gender DESC, candidate_number"
  );

  const [scoreRows] = await pool.query<
    (RowDataPacket & {
      candidate_id: number;
      category_id: number;
      judge_number: number;
      raw_score: number | null;
    })[]
  >(
    `SELECT s.candidate_id, s.category_id, u.judge_number, s.raw_score
     FROM scores s
     INNER JOIN users u ON u.id = s.judge_id
     WHERE s.is_submitted = 1
     ORDER BY s.category_id, s.candidate_id, u.judge_number`
  );

  return categories.map((category) => ({
    categoryId: category.id,
    categoryName: category.categoryName,
    weight: category.weight,
    displayOrder: category.displayOrder,
    rows: candidateRows.map((candidate) => ({
      candidateNumber: candidate.candidate_number,
      gender: candidate.gender,
      name: candidate.name,
      judgeScores: judgeRows.map((judge) => {
        const match = scoreRows.find(
          (s) =>
            s.candidate_id === candidate.id &&
            s.category_id === category.id &&
            s.judge_number === judge.judge_number
        );
        return match?.raw_score == null ? null : Number(match.raw_score);
      }),
    })),
  }));
}

export async function getCandidatesForExport(): Promise<
  { candidateNumber: number; gender: CandidateGender; name: string; department: string }[]
> {
  const [rows] = await pool.query<CandidateRow[]>(
    "SELECT candidate_number, gender, name, department FROM candidates ORDER BY gender DESC, candidate_number"
  );
  return rows.map((r) => ({
    candidateNumber: r.candidate_number,
    gender: r.gender,
    name: r.name,
    department: r.department,
  }));
}
