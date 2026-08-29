import { RowDataPacket } from "mysql2";
import { pool } from "../db/pool";
import { EventSettings, ScoringFormula } from "../types";
import { getSystemState } from "./stateService";

interface SettingsRow extends RowDataPacket {
  pageant_name: string;
  min_score: number;
  max_score: number;
  scoring_formula: ScoringFormula;
  tiebreaker_category_id: number | null;
}

export async function getEventSettings(): Promise<EventSettings> {
  const [rows] = await pool.query<SettingsRow[]>(
    `SELECT pageant_name, min_score, max_score, scoring_formula, tiebreaker_category_id
     FROM event_settings WHERE id = 1`
  );

  const row = rows[0];
  if (!row) {
    return {
      pageantName: "Pageant Live Scoring",
      minScore: 1,
      maxScore: 10,
      scoringFormula: "percentage_weighted",
      tiebreakerCategoryId: null,
    };
  }

  return {
    pageantName: row.pageant_name,
    minScore: row.min_score,
    maxScore: row.max_score,
    scoringFormula: row.scoring_formula,
    tiebreakerCategoryId: row.tiebreaker_category_id,
  };
}

export async function updateEventSettings(input: Partial<EventSettings>): Promise<EventSettings> {
  await assertSetupAllowed();

  const current = await getEventSettings();

  const next = {
    pageantName: input.pageantName?.trim() || current.pageantName,
    minScore: input.minScore ?? current.minScore,
    maxScore: input.maxScore ?? current.maxScore,
    scoringFormula: input.scoringFormula ?? current.scoringFormula,
    tiebreakerCategoryId:
      input.tiebreakerCategoryId !== undefined
        ? input.tiebreakerCategoryId
        : current.tiebreakerCategoryId,
  };

  if (next.minScore >= next.maxScore) {
    throw new Error("Minimum score must be less than maximum score");
  }

  if (next.pageantName.length < 2) {
    throw new Error("Pageant name is required");
  }

  await pool.query(
    `UPDATE event_settings
     SET pageant_name = :pageantName,
         min_score = :minScore,
         max_score = :maxScore,
         scoring_formula = :scoringFormula,
         tiebreaker_category_id = :tiebreakerCategoryId
     WHERE id = 1`,
    next
  );

  if (input.maxScore !== undefined && input.maxScore !== current.maxScore) {
    await pool.query("UPDATE categories SET max_score = :maxScore", { maxScore: next.maxScore });
  }

  return getEventSettings();
}

export async function assertSetupAllowed(): Promise<void> {
  const state = await getSystemState();
  if (state.isScoringOpen) {
    throw new Error("Close scoring before changing event setup");
  }
}

export function calculateWeightedScore(
  avgRaw: number,
  weight: number,
  maxScore: number,
  settings: EventSettings
): number {
  if (settings.scoringFormula === "raw_average_weighted") {
    return avgRaw * (weight / 100);
  }

  return (avgRaw / maxScore) * weight;
}
