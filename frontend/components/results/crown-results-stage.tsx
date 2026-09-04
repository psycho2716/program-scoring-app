"use client";

import { CandidatePhoto } from "@/components/brand/candidate-photo";
import { RsuLogo } from "@/components/brand/rsu-logo";
import { cn, divisionLabel } from "@/lib/utils";
import type { CrownPlacement, CrownResultsDisplay, CandidateGender } from "@/types";

function formatScore(value: number): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function WinnerCard({
  gender,
  year,
  winner,
}: {
  gender: CandidateGender;
  year: number;
  winner: CrownPlacement | null;
}) {
  const division = divisionLabel(gender);

  return (
    <article className="relative overflow-hidden rounded-[1.75rem] border border-rsu-gold/40 bg-[linear-gradient(165deg,rgba(212,160,30,0.2)_0%,rgba(12,24,34,0.96)_38%,rgba(8,16,24,0.98)_100%)] p-5 shadow-[0_0_48px_rgba(212,160,30,0.18)] md:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_0%,rgba(212,160,30,0.28),transparent_55%)]" />
      <p className="relative text-center text-[11px] font-bold uppercase tracking-[0.28em] text-rsu-gold">
        Grand Winner
      </p>
      <h3 className="relative mt-1 text-center font-black uppercase leading-tight tracking-wide text-white md:text-2xl">
        {gender === "female" ? `Miss Katimugan ${year}` : `Mr. Katimugan ${year}`}
      </h3>

      {winner ? (
        <div className="relative mt-5 flex flex-col items-center">
          <div className="gold-glow-ring rounded-full p-1">
            <CandidatePhoto
              name={winner.name}
              photoUrl={winner.photoUrl}
              candidateNumber={winner.candidateNumber}
              size="crown"
              className="rounded-full border-[3px] border-rsu-gold"
            />
          </div>
          <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-rsu-teal">
            {division} #{String(winner.candidateNumber).padStart(2, "0")}
          </p>
          <p className="mt-1 max-w-full text-center text-2xl font-black leading-tight text-white md:text-[1.85rem]">
            {winner.name}
          </p>
          <p className="mt-1 max-w-sm text-center text-sm text-zinc-400">{winner.department}</p>
          <p className="mt-3 font-black tabular-nums text-rsu-gold">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-rsu-gold/80">
              Final{" "}
            </span>
            <span className="text-3xl leading-none">{formatScore(winner.finalScore)}</span>
          </p>
        </div>
      ) : (
        <p className="relative mt-8 text-center text-sm text-muted-foreground">
          No {division} candidate yet
        </p>
      )}
    </article>
  );
}

function RunnerUpRow({ placement }: { placement: CrownPlacement }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
      <CandidatePhoto
        name={placement.name}
        photoUrl={placement.photoUrl}
        candidateNumber={placement.candidateNumber}
        size="md"
        className="rounded-full"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rsu-gold/90">
          {placement.honorific}
        </p>
        <p className="truncate text-sm font-semibold text-white">{placement.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{placement.department}</p>
      </div>
      <span className="shrink-0 text-lg font-black tabular-nums text-rsu-teal">
        {formatScore(placement.finalScore)}
      </span>
    </li>
  );
}

function DivisionColumn({
  gender,
  year,
  placements,
}: {
  gender: CandidateGender;
  year: number;
  placements: CrownPlacement[];
}) {
  const winner = placements.find((row) => row.rank === 1) ?? placements[0] ?? null;
  const runners = placements.filter((row) => row.rank !== 1).slice(0, 3);

  return (
    <section className="flex flex-col gap-4">
      <WinnerCard gender={gender} year={year} winner={winner?.rank === 1 ? winner : null} />
      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Runner-up
        </p>
        {runners.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-muted-foreground">
            No runner-up in this division yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {runners.map((placement) => (
              <RunnerUpRow key={placement.candidateId} placement={placement} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function ResultsHoldingScreen({ pageantName, year }: { pageantName: string; year: number }) {
  return (
    <div className="results-stage relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="spotlight spotlight-left" />
      <div className="spotlight spotlight-right" />
      <RsuLogo size="xl" glow priority />
      <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.42em] text-rsu-gold">
        Official Results
      </p>
      <h1 className="mt-3 max-w-4xl text-center text-3xl font-black uppercase leading-tight tracking-wide text-white md:text-5xl">
        {pageantName} {year}
      </h1>
      <p className="mt-5 max-w-lg text-center text-sm text-zinc-400 md:text-base">
        The Tabulator will reveal the Grand Winners and runner-up when the coronation is ready.
      </p>
      <div className="mt-8 h-px w-40 bg-gradient-to-r from-transparent via-rsu-gold/70 to-transparent" />
    </div>
  );
}

export function CrownResultsStage({
  data,
  compact = false,
}: {
  data: CrownResultsDisplay;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "results-stage relative overflow-hidden",
        compact ? "rounded-2xl border border-white/10 px-4 py-6 md:px-6" : "min-h-screen px-4 py-8 md:px-10 md:py-10"
      )}
    >
      {!compact && (
        <>
          <div className="spotlight spotlight-left" />
          <div className="spotlight spotlight-right" />
        </>
      )}

      <header className="relative mb-8 text-center">
        <div className="mb-3 flex justify-center">
          <RsuLogo size={compact ? "md" : "lg"} glow />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.38em] text-rsu-gold">
          Coronation Night · Top 4
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-wide text-white md:text-4xl">
          {data.pageantName} {data.year}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">Grand Winner · 1st · 2nd · 3rd Runner-Up</p>
      </header>

      {data.female.length === 0 && data.male.length === 0 ? (
        <div className="relative mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-rsu-gold">
            Awaiting scores
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            No results yet. Grand Winners appear after judges submit scores.
          </p>
        </div>
      ) : (
        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:gap-10">
          <DivisionColumn gender="female" year={data.year} placements={data.female} />
          <DivisionColumn gender="male" year={data.year} placements={data.male} />
        </div>
      )}
    </div>
  );
}
