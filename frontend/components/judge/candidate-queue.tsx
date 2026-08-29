"use client";

import { Check } from "lucide-react";
import { CandidatePhoto } from "@/components/brand/candidate-photo";
import { isValidScoreValue } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { CandidateQueueProps } from "@/types";

/**
 * Left-rail candidate queue — styled to match the final judge console mockup.
 */
export function CandidateQueue({
  scores,
  localScores,
  selectedId,
  scoredCount,
  minScore,
  maxScore,
  selectableIds,
  mustScoreActive,
  onSelect,
}: CandidateQueueProps) {
  const selectable = new Set(selectableIds);

  return (
    <aside className="flex h-full max-h-[calc(100vh-9.5rem)] flex-col overflow-hidden bg-[#0b1520] lg:max-h-none">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pb-3 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-rsu-gold shadow-[0_0_8px_rgba(212,160,30,0.65)]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-300">
              Queue
            </p>
          </div>
          <p className="mt-1.5 pl-[18px] text-[12px] text-zinc-500">
            {scores.length} Candidate{scores.length === 1 ? "" : "s"}
          </p>
        </div>
        <p className="pt-0.5 text-[12px] font-medium text-rsu-teal">
          {scoredCount} Scored
        </p>
      </div>

      {mustScoreActive ? (
        <p className="px-4 pb-2 text-[11px] leading-snug text-rsu-gold/90">
          Score the active candidate before moving on.
        </p>
      ) : (
        <p className="px-4 pb-2 text-[11px] leading-snug text-zinc-500">
          Score in order — next unscored only (scored candidates can be revisited).
        </p>
      )}

      {/* List */}
      <ul className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {scores.map((candidate) => {
          const hasScore = isValidScoreValue(
            localScores[candidate.candidateId],
            minScore,
            maxScore
          );
          const isActive = candidate.candidateId === selectedId;
          const isLocked = !selectable.has(candidate.candidateId);
          const isDimmed = (!hasScore && !isActive) || isLocked;

          return (
            <li key={candidate.candidateId}>
              <button
                type="button"
                disabled={isLocked}
                title={
                  isLocked
                    ? mustScoreActive
                      ? "Score the active candidate before selecting another"
                      : "Score candidates in order — finish earlier ones first"
                    : undefined
                }
                onClick={() => {
                  if (isLocked) return;
                  onSelect(candidate.candidateId);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                  isActive &&
                    "bg-[#1a2410]/80 shadow-[0_0_0_1.5px_rgba(212,160,30,0.85),0_0_18px_rgba(212,160,30,0.22)]",
                  !isActive && !isLocked && "hover:bg-white/[0.03]",
                  isDimmed && "opacity-40",
                  isLocked && "cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "w-7 shrink-0 text-[12px] font-semibold tabular-nums",
                    isActive ? "text-rsu-gold" : "text-zinc-500"
                  )}
                >
                  #{String(candidate.candidateNumber).padStart(2, "0")}
                </span>

                <CandidatePhoto
                  name={candidate.name}
                  photoUrl={candidate.photoUrl}
                  candidateNumber={candidate.candidateNumber}
                  size="sm"
                  className={cn(
                    "rounded-full",
                    isActive
                      ? "ring-2 ring-rsu-gold shadow-[0_0_10px_rgba(212,160,30,0.45)]"
                      : "ring-1 ring-white/10"
                  )}
                />

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[13px] font-medium leading-tight",
                      isActive ? "text-white" : "text-zinc-200"
                    )}
                  >
                    {candidate.name}
                  </span>
                  {isActive && (
                    <span className="mt-0.5 block text-[11px] font-medium text-rsu-gold/90">
                      Scoring...
                    </span>
                  )}
                </span>

                {hasScore && !isActive ? (
                  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-rsu-teal/50 text-rsu-teal">
                    <Check className="h-3 w-3" strokeWidth={2.75} />
                  </span>
                ) : isActive ? (
                  <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                    <span className="absolute inset-0 rounded-full border-2 border-rsu-gold" />
                    <span className="h-2 w-2 rounded-full bg-rsu-gold shadow-[0_0_6px_rgba(212,160,30,0.8)]" />
                  </span>
                ) : (
                  <span className="h-[18px] w-[18px] shrink-0" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
