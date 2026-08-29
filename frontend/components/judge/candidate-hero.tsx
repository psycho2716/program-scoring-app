"use client";

import { CandidatePhoto } from "@/components/brand/candidate-photo";
import { formatScoreDisplay } from "@/lib/scoring";
import type { CandidateHeroProps } from "@/types";

function detailsLabel(categoryName?: string | null): string {
  if (!categoryName?.trim()) return "Talent Details";
  const first = categoryName.trim().split(/\s+/)[0] ?? "Talent";
  return `${first} Details`;
}

/**
 * Center stage candidate panel — typography and layout match the final mockup.
 */
export function CandidateHero({ candidate, categoryName, maxScore }: CandidateHeroProps) {
  const hasPrevious =
    candidate.previousScore != null && Boolean(candidate.previousCategoryName?.trim());

  const previousCategoryShort = hasPrevious
    ? (candidate.previousCategoryName!.trim().split(/\s+/)[0] ??
      candidate.previousCategoryName!)
    : null;

  const previousLabel = hasPrevious
    ? `Previous Score (${previousCategoryShort})`
    : "Previous Score";

  const previousValue = hasPrevious
    ? `${formatScoreDisplay(candidate.previousScore!)}/${formatScoreDisplay(maxScore)}`
    : "—";

  const detailText =
    candidate.talentDetails?.trim() ||
    categoryName?.trim() ||
    candidate.department;

  return (
    <section className="relative h-full min-h-[420px] overflow-hidden bg-[#0a121c] lg:min-h-0">
      <div className="absolute inset-0">
        <CandidatePhoto
          name={candidate.name}
          photoUrl={candidate.photoUrl}
          candidateNumber={candidate.candidateNumber}
          size="hero"
          className="rounded-none"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-5 pb-7 pt-36 text-center sm:px-8">
        <span className="mb-3.5 inline-flex items-center rounded-full border border-rsu-teal/50 bg-rsu-teal/20 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-rsu-teal shadow-[0_0_20px_rgba(45,212,191,0.25)]">
          Candidate #{String(candidate.candidateNumber).padStart(2, "0")}
        </span>

        <h2 className="max-w-3xl text-[2.5rem] font-bold leading-[1.02] tracking-[-0.02em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.65)] md:text-[3.5rem] lg:text-[3.75rem]">
          {candidate.name}
        </h2>

        <p className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.32em] text-zinc-300/95 md:text-[12px]">
          {candidate.department}
        </p>

        <div className="mt-6 grid w-full max-w-[22rem] grid-cols-2 overflow-hidden rounded-2xl border border-white/12 bg-black/55 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="border-r border-white/10 px-4 py-3.5 text-left">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              {detailsLabel(categoryName)}
            </p>
            <p className="mt-1.5 text-[14px] font-medium leading-snug text-white">
              {detailText}
            </p>
          </div>
          <div className="px-4 py-3.5 text-left">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              {previousLabel}
            </p>
            <p className="mt-1.5 text-[1.45rem] font-bold tabular-nums leading-none tracking-tight text-white">
              {previousValue}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
