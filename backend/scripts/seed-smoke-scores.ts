import { pool } from "../src/db/pool";
import { syncScoreGrid } from "../src/services/adminService";
import { recalculateTabulation } from "../src/services/tabulationService";
import { setResultsRevealed } from "../src/services/stateService";

type CandidateRow = {
  id: number;
  gender: "male" | "female";
  candidate_number: number;
  name: string;
};

type IdRow = { id: number; judge_number?: number };

function clampScore(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value * 10) / 10));
}

/** Higher numbers win. Miss/Mr #1 are strongest so Top 4 is easy to check. */
function candidateStrength(candidate: CandidateRow): number {
  const byNumber: Record<string, Record<number, number>> = {
    female: { 1: 9.4, 2: 8.8, 3: 8.3, 4: 7.9, 5: 7.5 },
    male: { 1: 9.3, 2: 8.9, 3: 8.4, 4: 8.0, 5: 7.6 },
  };
  return byNumber[candidate.gender][candidate.candidate_number] ?? 8.0;
}

function scoreFor(
  candidate: CandidateRow,
  judgeNumber: number,
  categoryId: number
): number {
  const jitter =
    (((candidate.id * 13 + judgeNumber * 17 + categoryId * 19) % 11) - 5) * 0.08;
  return clampScore(candidateStrength(candidate) + jitter);
}

async function main() {
  const [candidates] = await pool.query<CandidateRow[]>(
    "SELECT id, gender, candidate_number, name FROM candidates ORDER BY gender DESC, candidate_number"
  );
  const [judges] = await pool.query<IdRow[]>(
    "SELECT id, judge_number FROM users WHERE role = 'judge' ORDER BY judge_number"
  );
  const [categories] = await pool.query<IdRow[]>(
    "SELECT id FROM categories ORDER BY display_order"
  );

  if (!candidates.length || !judges.length || !categories.length) {
    throw new Error("Need candidates, judges, and categories before seeding scores");
  }

  await syncScoreGrid();

  let updated = 0;
  for (const judge of judges) {
    const judgeNumber = Number(judge.judge_number ?? 1);
    for (const candidate of candidates) {
      for (const category of categories) {
        const rawScore = scoreFor(candidate, judgeNumber, category.id);
        const [result] = await pool.query(
          `UPDATE scores
           SET raw_score = :rawScore, is_submitted = 1
           WHERE judge_id = :judgeId AND candidate_id = :candidateId AND category_id = :categoryId`,
          {
            rawScore,
            judgeId: judge.id,
            candidateId: candidate.id,
            categoryId: category.id,
          }
        );
        updated += Number((result as { affectedRows?: number }).affectedRows ?? 0);
      }
    }
  }

  await recalculateTabulation();
  await setResultsRevealed(true);

  console.log(
    JSON.stringify(
      {
        candidates: candidates.length,
        judges: judges.length,
        categories: categories.length,
        scoreRowsUpdated: updated,
        resultsRevealed: true,
      },
      null,
      2
    )
  );

  await pool.end();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
