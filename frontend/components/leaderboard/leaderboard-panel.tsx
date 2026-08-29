"use client";

import { Download, RefreshCw, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LeaderboardPanelProps } from "@/types";

export function LeaderboardPanel({
  rows,
  categories,
  winner,
  onRefresh,
  onExport,
  isRefreshing = false,
  isExporting = false,
  activeCategoryName,
  compact = false,
  showExport = true,
  showBreakdown = true,
}: LeaderboardPanelProps) {
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const leaders = compact ? sorted.slice(0, 8) : sorted;

  const leader =
    winner ??
    (sorted[0]
      ? {
          candidateId: sorted[0].candidateId,
          candidateNumber: sorted[0].candidateNumber,
          name: sorted[0].name,
          department: sorted[0].department,
          finalScore: sorted[0].finalScore,
          isComplete: false,
        }
      : null);

  const runnerUps = leaders.filter(
    (row) => !leader || row.candidateId !== leader.candidateId
  );

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
              : "Aggregated scores across categories"}
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

      <div className="space-y-2 p-4">
        {leader && (
          <div className="rounded-2xl border border-rsu-gold/50 bg-[linear-gradient(135deg,rgba(212,160,30,0.16)_0%,rgba(18,31,44,0.95)_42%,rgba(18,31,44,1)_100%)] p-3.5 shadow-[0_0_24px_rgba(212,160,30,0.22)]">
            <div className="flex items-center gap-3">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-[2.5px] border-rsu-gold bg-[#121a24] text-rsu-gold shadow-[0_0_18px_rgba(212,160,30,0.55)]">
                <span className="text-[1.35rem] font-black leading-none">1</span>
              </div>

              <div className="min-w-0 flex-1">
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
                  {leader.finalScore.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        )}

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
                {row.finalScore.toFixed(1)}
              </span>
            </li>
          ))}
          {!leader && leaders.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              No tabulation data yet.
            </li>
          )}
        </ul>
      </div>

      {showBreakdown && sorted.length > 0 && !compact && (
        <div className="mt-auto overflow-x-auto border-t border-white/10 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Full Breakdown
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
              {sorted.map((row) => (
                <tr
                  key={row.candidateId}
                  className={cn("border-t border-white/5", row.rank === 1 && "bg-rsu-gold/5")}
                >
                  <td className="py-2 pr-2 font-bold text-rsu-gold">{row.rank}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{row.candidateNumber}</td>
                  <td className="py-2 pr-2 text-white">{row.name}</td>
                  {categories.map((cat) => (
                    <td key={cat.id} className="py-2 pr-2 text-right text-muted-foreground">
                      {(row.categoryScores[cat.id] ?? 0).toFixed(2)}
                    </td>
                  ))}
                  <td className="py-2 text-right font-semibold text-rsu-teal">
                    {row.finalScore.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
