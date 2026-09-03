"use client";

import { CandidateGender, MatrixCell } from "@/types";
import { cn, divisionLabel } from "@/lib/utils";

export interface MatrixCandidateColumn {
  candidateId: number;
  candidateNumber: number;
  gender: CandidateGender;
}

interface SubmissionMatrixProps {
  matrix: MatrixCell[];
  candidates: MatrixCandidateColumn[];
  judgeNumbers: number[];
}

function formatScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function SubmissionMatrix({
  matrix,
  candidates,
  judgeNumbers,
}: SubmissionMatrixProps) {
  const getCell = (candidateId: number, judgeNumber: number) =>
    matrix.find(
      (cell) => cell.candidateId === candidateId && cell.judgeNumber === judgeNumber
    );

  return (
    <div className="gold-border-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="inline-block h-2 w-2 rounded-sm bg-rsu-gold" />
            Judge Scores by Category
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Raw scores entered by each adjudicator for the selected category
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="matrix-score-cell matrix-cell-empty !h-5 !min-w-[1.75rem] !px-1 text-[10px]">
              —
            </span>{" "}
            Not Started
          </span>
          <span className="flex items-center gap-1.5">
            <span className="matrix-score-cell matrix-cell-progress !h-5 !min-w-[1.75rem] !px-1 text-[10px]">
              8
            </span>{" "}
            In Progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="matrix-score-cell matrix-cell-done !h-5 !min-w-[1.75rem] !px-1 text-[10px]">
              9
            </span>{" "}
            Submitted
          </span>
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full min-w-[520px] border-separate border-spacing-y-2">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Adjudicator</th>
              {candidates.map((candidate) => (
                <th key={candidate.candidateId} className="px-2 py-2 text-center font-medium">
                  <span className="block text-rsu-gold/80">
                    {divisionLabel(candidate.gender)}
                  </span>
                  <span>C{candidate.candidateNumber}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {judgeNumbers.map((judgeNumber) => (
              <tr key={judgeNumber} className="rounded-xl bg-white/[0.02]">
                <td className="rounded-l-xl px-3 py-2.5 text-sm font-medium text-zinc-200">
                  Judge {judgeNumber}
                </td>
                {candidates.map((candidate) => {
                  const cell = getCell(candidate.candidateId, judgeNumber);
                  const status = cell?.status ?? "not_started";
                  const score = cell?.rawScore ?? null;
                  const label = formatScore(score);
                  const shortLabel = `${divisionLabel(candidate.gender)} C${candidate.candidateNumber}`;

                  return (
                    <td
                      key={candidate.candidateId}
                      className="px-2 py-2.5 text-center last:rounded-r-xl"
                    >
                      <span
                        title={
                          score != null
                            ? `Judge ${judgeNumber} → ${shortLabel}: ${label} (${status.replace("_", " ")})`
                            : `Judge ${judgeNumber} → ${shortLabel}: ${status.replace("_", " ")}`
                        }
                        className={cn(
                          "matrix-score-cell",
                          status === "submitted" && "matrix-cell-done",
                          status === "in_progress" && "matrix-cell-progress",
                          status === "not_started" && "matrix-cell-empty",
                          score == null && status !== "not_started" && "text-muted-foreground/70"
                        )}
                      >
                        {label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            {judgeNumbers.length === 0 && (
              <tr>
                <td
                  colSpan={Math.max(candidates.length + 1, 2)}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  No submission data for this category yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
