/** Whole or half-point score within range (1.0, 1.5, 2.0, …). */
export function isValidScoreValue(
  value: number | null | undefined,
  minScore: number,
  maxScore: number
): boolean {
  if (typeof value !== "number" || Number.isNaN(value)) return false;
  if (value < minScore || value > maxScore) return false;
  return Number.isInteger(Number((value * 2).toFixed(6)));
}

/**
 * Sequential queue rule:
 * - May revisit already-scored candidates
 * - May open only the next unscored candidate (no skipping ahead)
 * - While that next candidate is active and unfinished, leave is blocked
 */
export function getSelectableCandidateIds(
  candidates: Array<{ candidateId: number; rawScore?: number | null }>,
  localScores: Record<number, number>,
  selectedId: number | null,
  minScore: number,
  maxScore: number
): Set<number> {
  const hasScore = (candidateId: number, rawScore?: number | null) =>
    isValidScoreValue(localScores[candidateId] ?? rawScore, minScore, maxScore);

  const selectable = new Set<number>();
  let nextUnscoredId: number | null = null;

  for (const candidate of candidates) {
    if (hasScore(candidate.candidateId, candidate.rawScore)) {
      selectable.add(candidate.candidateId);
    } else if (nextUnscoredId == null) {
      nextUnscoredId = candidate.candidateId;
      selectable.add(candidate.candidateId);
    }
  }

  // Lock navigation only when the legitimate next candidate is unfinished.
  if (
    selectedId != null &&
    nextUnscoredId != null &&
    selectedId === nextUnscoredId &&
    !hasScore(selectedId, candidates.find((c) => c.candidateId === selectedId)?.rawScore)
  ) {
    return new Set([selectedId]);
  }

  return selectable;
}

export function formatScoreDisplay(value: number): string {
  return Number(value).toFixed(1);
}

export function scoresEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

/** Every half-point from min to max inclusive (1.0, 1.5, …, 10.0). */
export function buildHalfPointScores(minScore: number, maxScore: number): number[] {
  const chips: number[] = [];
  for (let v = minScore; v <= maxScore + 1e-9; v += 0.5) {
    chips.push(Number(v.toFixed(1)));
  }
  return chips;
}
