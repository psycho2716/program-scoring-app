"use client";

import { useMemo } from "react";
import { Download, RefreshCw, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, divisionLabel } from "@/lib/utils";
import type {
  CandidateGender,
  LeaderboardPanelProps,
  TabulationRow,
  WinnerInfo,
} from "@/types";

function formatScore(value: number | null | undefined, decimals = 1): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(decimals) : (0).toFixed(decimals);
}

function LeaderCard({
  label,
  leader,
}: {
  label: string;
  leader: WinnerInfo | null;
}) {
  if (!leader) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">No candidates yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-rsu-gold/50 bg-[linear-gradient(135deg,rgba(212,160,30,0.16)_0%,rgba(18,31,44,0.95)_42%,rgba(18,31,44,1)_100%)] p-3.5 shadow-[0_0_24px_rgba(212,160,30,0.22)]">
      <div className="flex items-center gap-3">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-[2.5px] border-rsu-gold bg-[#121a24] text-rsu-gold shadow-[0_0_18px_rgba(212,160,30,0.55)]">
          <span className="text-[1.35rem] font-black leading-none">1</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rsu-gold/90">
            {label}
          </p>
          <p className="text-[11px] leading-tight text-zinc-400">
            Candidate {String(leader.candidateNumber).padStart(2, "0")}
          </p>
          <p className="truncate text-[15px] font-semibold leading-snug text-white">
            {leader.name}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <span className="mb-0.5 rounded-[3px] bg-rsu-gold px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.14em] text-black">
            {leader.isComplete ? "Winner" : "Current Leader"}
          </span>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-rsu-gold">
            Score
          </p>
          <p className="text-[1.85rem] font-black leading-none tabular-nums text-rsu-teal">
            {formatScore(leader.finalScore, 1)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DivisionStandings({
  title,
  rows,
  compact,
}: {
  title: string;
  rows: TabulationRow[];
  compact: boolean;
}) {
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const visible = compact ? sorted.slice(0, 4) : sorted;
  const runnerUps = visible.filter((row) => row.rank !== 1);

  return (
    <div className="space-y-1.5">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      {runnerUps.length === 0 && sorted.length <= 1 ? (
        <p className="rounded-xl bg-white/[0.02] px-3 py-2.5 text-sm text-muted-foreground">
          {sorted.length === 0 ? "No candidates in this division." : "Only the leader so far."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {runnerUps.map((row) => (
            <li
              key={row.candidateId}
              className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-sm font-bold text-muted-foreground">
                {row.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">
                  Candidate {String(row.candidateNumber).padStart(2, "0")}
                </p>
                <p className="truncate text-sm font-medium text-white">{row.name}</p>
              </div>
              <span className="text-lg font-bold tabular-nums text-rsu-teal">
                {formatScore(row.finalScore, 1)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LeaderboardPanel({
  rows = [],
  categories = [],
  winners,
  onRefresh,
  onExport,
  isRefreshing = false,
  isExporting = false,
  activeCategoryName,
  compact = false,
  showExport = true,
  showBreakdown = true,
}: LeaderboardPanelProps) {
  const femaleRows = useMemo(
    () => rows.filter((row) => row.gender === "female").sort((a, b) => a.rank - b.rank),
    [rows]
  );
  const maleRows = useMemo(
    () => rows.filter((row) => row.gender === "male").sort((a, b) => a.rank - b.rank),
    [rows]
  );

  const categoryHighScores = useMemo(() => {
    const highs = new Map<string, number>();
    for (const category of categories) {
      for (const gender of ["female", "male"] as CandidateGender[]) {
        let max = 0;
        for (const row of rows) {
          if (row.gender !== gender) continue;
          const score = Number(row.categoryScores?.[category.id] ?? 0);
          if (Number.isFinite(score) && score > max) max = score;
        }
        highs.set(`${gender}:${category.id}`, max);
      }
    }
    return highs;
  }, [categories, rows]);

  const safeWinners = winners ?? { male: null, female: null };

  const normalizeLeader = (
    leader: WinnerInfo | null,
    fallback: TabulationRow | undefined,
    gender: CandidateGender
  ): WinnerInfo | null => {
    const source = leader ?? (fallback
      ? {
          candidateId: fallback.candidateId,
          candidateNumber: fallback.candidateNumber,
          gender,
          name: fallback.name,
          department: fallback.department,
          finalScore: fallback.finalScore,
          isComplete: false,
        }
      : null);
    if (!source) return null;
    return {
      ...source,
      gender: source.gender ?? gender,
      finalScore: Number(source.finalScore ?? 0) || 0,
    };
  };

  const missLeader = normalizeLeader(safeWinners.female, femaleRows[0], "female");
  const mrLeader = normalizeLeader(safeWinners.male, maleRows[0], "male");

  const breakdownGroups = [
    { key: "female" as const, title: "Miss", rows: femaleRows },
    { key: "male" as const, title: "Mr.", rows: maleRows },
  ];

  return (
    <div className="gold-border-card flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <LayoutList className="h-4 w-4 text-rsu-teal" />
            {compact ? "Live Tabulation" : "Leaderboard"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activeCategoryName
              ? `Aggregated scores for ${activeCategoryName}`
              : "Separate Mr. and Miss standings"}
          </p>
        </div>
        <div className="flex gap-2">
          {onRefresh && !compact && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="border border-white/10"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          )}
          {showExport && onExport && (
            <Button
              type="button"
              variant="amber"
              size="sm"
              onClick={onExport}
              disabled={isExporting}
              className="shadow-gold-sm"
            >
              <Download className="h-3.5 w-3.5" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <LeaderCard label="Miss" leader={missLeader} />
          <LeaderCard label="Mr." leader={mrLeader} />
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No tabulation data yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <DivisionStandings title="Miss standings" rows={femaleRows} compact={compact} />
            <DivisionStandings title="Mr. standings" rows={maleRows} compact={compact} />
          </div>
        )}
      </div>

      {showBreakdown && rows.length > 0 && !compact && (
        <div className="mt-auto space-y-5 overflow-x-auto border-t border-white/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Full Breakdown
          </p>
          {breakdownGroups.map((group) =>
            group.rows.length === 0 ? null : (
              <div key={group.key}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rsu-gold/90">
                  {group.title}
                </p>
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 pr-2">Rank</th>
                      <th className="pb-2 pr-2">#</th>
                      <th className="pb-2 pr-2">Name</th>
                      {categories.map((cat) => (
                        <th key={cat.id} className="pb-2 pr-2 text-right">
                          {cat.categoryName.split(" ")[0]}
                        </th>
                      ))}
                      <th className="pb-2 text-right">Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr
                        key={row.candidateId}
                        className={cn(
                          "border-t border-white/5",
                          row.rank === 1 && "bg-rsu-gold/5"
                        )}
                      >
                        <td className="py-2 pr-2 font-bold text-rsu-gold">{row.rank}</td>
                        <td className="py-2 pr-2 text-muted-foreground">
                          {row.candidateNumber}
                        </td>
                        <td className="py-2 pr-2 text-white">{row.name}</td>
                        {categories.map((cat) => {
                          const score = Number(row.categoryScores?.[cat.id] ?? 0) || 0;
                          const highScore =
                            categoryHighScores.get(`${row.gender}:${cat.id}`) ?? 0;
                          const isCategoryHigh = highScore > 0 && score === highScore;

                          return (
                            <td
                              key={cat.id}
                              className={cn(
                                "py-2 pr-2 text-right tabular-nums",
                                isCategoryHigh
                                  ? "font-bold text-rsu-gold"
                                  : "text-muted-foreground"
                              )}
                              title={
                                isCategoryHigh
                                  ? `Highest ${divisionLabel(row.gender)} ${cat.categoryName} score`
                                  : undefined
                              }
                            >
                              {formatScore(score, 2)}
                            </td>
                          );
                        })}
                        <td className="py-2 text-right font-semibold text-rsu-teal">
                          {formatScore(row.finalScore, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
