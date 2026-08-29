"use client";

import { Check } from "lucide-react";
import { MatrixCell } from "@/types";
import { cn } from "@/lib/utils";

interface SubmissionMatrixProps {
  matrix: MatrixCell[];
  candidateNumbers: number[];
  judgeNumbers: number[];
}

export function SubmissionMatrix({
  matrix,
  candidateNumbers,
  judgeNumbers,
}: SubmissionMatrixProps) {
  const getCell = (candidateNumber: number, judgeNumber: number) =>
    matrix.find(
      (cell) =>
        cell.candidateNumber === candidateNumber && cell.judgeNumber === judgeNumber
    );

  return (
    <div className="gold-border-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="inline-block h-2 w-2 rounded-sm bg-rsu-gold" />
            Live Submission Matrix
          </h3>
        </div>
        <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="matrix-cell matrix-cell-empty !h-3.5 !w-3.5" /> Not Started
          </span>
          <span className="flex items-center gap-1.5">
            <span className="matrix-cell matrix-cell-progress !h-3.5 !w-3.5" /> In Progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="matrix-cell matrix-cell-done !h-3.5 !w-3.5">
              <Check className="h-2.5 w-2.5" />
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
              {candidateNumbers.map((num) => (
                <th key={num} className="px-2 py-2 text-center font-medium">
                  C{num}
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
                {candidateNumbers.map((candidateNumber) => {
                  const cell = getCell(candidateNumber, judgeNumber);
                  const status = cell?.status ?? "not_started";

                  return (
                    <td key={candidateNumber} className="px-2 py-2.5 text-center last:rounded-r-xl">
                      <span
                        title={
                          cell?.rawScore != null
                            ? `Score: ${cell.rawScore} (${status})`
                            : status.replace("_", " ")
                        }
                        className={cn(
                          "matrix-cell",
                          status === "submitted" && "matrix-cell-done",
                          status === "in_progress" && "matrix-cell-progress",
                          status === "not_started" && "matrix-cell-empty"
                        )}
                      >
                        {status === "submitted" && <Check className="h-4 w-4" strokeWidth={2.5} />}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            {judgeNumbers.length === 0 && (
              <tr>
                <td
                  colSpan={Math.max(candidateNumbers.length + 1, 2)}
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
