export type UserRole = "judge" | "admin";

export type ScoringFormula = "percentage_weighted" | "raw_average_weighted";

export interface EventSettings {
  pageantName: string;
  minScore: number;
  maxScore: number;
  scoringFormula: ScoringFormula;
  tiebreakerCategoryId: number | null;
}

export interface Candidate {
  id: number;
  candidateNumber: number;
  name: string;
  department: string;
  /** Performance / talent blurb shown on the judge hero card. */
  talentDetails: string | null;
  photoUrl: string | null;
}

export interface JudgeAccount {
  id: number;
  username: string;
  judgeNumber: number;
}

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  judgeNumber: number | null;
}

export interface AppJwtPayload {
  sub: number;
  username: string;
  role: UserRole;
  judgeNumber: number | null;
}

export interface Category {
  id: number;
  categoryName: string;
  weight: number;
  maxScore: number;
  displayOrder: number;
}

export interface SystemState {
  activeCategoryId: number | null;
  isScoringOpen: boolean;
  activeCategory: Category | null;
}

export interface ScoreEntry {
  candidateId: number;
  candidateNumber: number;
  name: string;
  department: string;
  talentDetails: string | null;
  photoUrl: string | null;
  rawScore: number | null;
  isSubmitted: boolean;
  /** Judge's score from the prior category (by display order), if any. */
  previousScore: number | null;
  previousCategoryName: string | null;
}

export interface TabulationRow {
  candidateId: number;
  candidateNumber: number;
  name: string;
  department: string;
  categoryScores: Record<number, number>;
  finalScore: number;
  rank: number;
}

export interface MatrixCell {
  judgeId: number;
  judgeNumber: number;
  candidateId: number;
  candidateNumber: number;
  categoryId: number;
  status: "not_started" | "in_progress" | "submitted";
  rawScore: number | null;
}

export interface WinnerInfo {
  candidateId: number;
  candidateNumber: number;
  name: string;
  department: string;
  finalScore: number;
  isComplete: boolean;
}

export interface StateUpdatePayload {
  activeCategoryId: number | null;
  isScoringOpen: boolean;
  categoryName: string | null;
}

export interface ScoreProgressPayload {
  judgeId: number;
  judgeNumber: number;
  candidateId: number;
  categoryId: number;
  rawScore: number;
}

export interface ScoreSubmittedPayload {
  judgeId: number;
  judgeNumber: number;
  categoryId: number;
}
