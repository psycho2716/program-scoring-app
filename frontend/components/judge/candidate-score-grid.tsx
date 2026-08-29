"use client";

import { useEffect, useMemo, useState } from "react";
import type { CandidateScoreGridProps } from "@/types";
import { CandidateHero } from "@/components/judge/candidate-hero";
import { CandidateQueue } from "@/components/judge/candidate-queue";
import { ScoringMatrixPanel } from "@/components/judge/scoring-matrix-panel";
import { getSelectableCandidateIds, isValidScoreValue } from "@/lib/scoring";

export function CandidateScoreGrid({
  scores,
  localScores,
  onScoreChange,
  onSubmitCategory,
  submitting = false,
  disabled = false,
  minScore = 1,
  maxScore = 10,
  categoryName,
  categoryWeight,
}: CandidateScoreGridProps) {
  const [selectedId, setSelectedId] = useState<number | null>(scores[0]?.candidateId ?? null);

  const selectableIds = useMemo(
    () =>
      getSelectableCandidateIds(
        scores.map((s) => ({ candidateId: s.candidateId, rawScore: s.rawScore })),
        localScores,
        selectedId,
        minScore,
        maxScore
      ),
    [scores, localScores, selectedId, minScore, maxScore]
  );

  useEffect(() => {
    if (!scores.length) {
      setSelectedId(null);
      return;
    }

    if (selectedId != null && selectableIds.has(selectedId)) return;

    const firstUnscored = scores.find(
      (s) => !isValidScoreValue(localScores[s.candidateId] ?? s.rawScore, minScore, maxScore)
    );
    const fallback =
      [...selectableIds][0] ??
      firstUnscored?.candidateId ??
      scores[0]?.candidateId ??
      null;
    setSelectedId(fallback);
  }, [scores, selectedId, localScores, minScore, maxScore, selectableIds]);

  const selected = useMemo(
    () => scores.find((s) => s.candidateId === selectedId) ?? scores[0] ?? null,
    [scores, selectedId]
  );

  const mustScoreActive = useMemo(() => {
    if (selectedId == null || !selected) return false;
    const unfinished = !isValidScoreValue(
      localScores[selectedId] ?? selected.rawScore,
      minScore,
      maxScore
    );
    return unfinished && selectableIds.size === 1 && selectableIds.has(selectedId);
  }, [selectedId, selected, localScores, minScore, maxScore, selectableIds]);

  const handleSelect = (candidateId: number) => {
    if (candidateId === selectedId) return;
    if (!selectableIds.has(candidateId)) return;
    setSelectedId(candidateId);
  };

  const scoredCount = useMemo(
    () =>
      scores.filter((s) => isValidScoreValue(localScores[s.candidateId], minScore, maxScore))
        .length,
    [scores, localScores, minScore, maxScore]
  );

  const allValid = scoredCount === scores.length && scores.length > 0;
  const currentScore =
    selected != null
      ? (localScores[selected.candidateId] ?? selected.rawScore ?? minScore)
      : minScore;

  const categoryLabel =
    categoryName && categoryWeight != null
      ? `${categoryName.split(" ")[0].toUpperCase()} ${categoryWeight}%`
      : (categoryName ?? "Score").toUpperCase();

  const progressPct = scores.length ? (scoredCount / scores.length) * 100 : 0;

  return (
    <div className="flex min-h-[calc(100vh-8.5rem)] flex-col">
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1824] lg:grid-cols-[240px_minmax(0,1fr)_300px] xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <div className="border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
          <CandidateQueue
            scores={scores}
            localScores={localScores}
            selectedId={selected?.candidateId ?? null}
            scoredCount={scoredCount}
            minScore={minScore}
            maxScore={maxScore}
            selectableIds={[...selectableIds]}
            mustScoreActive={mustScoreActive}
            onSelect={handleSelect}
          />
        </div>

        <div className="min-h-[420px] overflow-hidden border-b border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r lg:border-white/10">
          {selected ? (
            <CandidateHero
              candidate={selected}
              categoryName={categoryName}
              maxScore={maxScore}
            />
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center text-muted-foreground lg:min-h-0">
              No candidates available
            </div>
          )}
        </div>

        {selected ? (
          <div className="min-h-[420px] lg:min-h-0">
            <ScoringMatrixPanel
              candidateName={selected.name}
              value={currentScore}
              minScore={minScore}
              maxScore={maxScore}
              categoryLabel={categoryLabel}
              disabled={disabled}
              submitting={submitting}
              canSubmitCategory={allValid}
              onScoreChange={(next) => onScoreChange(selected.candidateId, next)}
              onClear={() => onScoreChange(selected.candidateId, minScore)}
              onSubmitCategory={onSubmitCategory}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
            Select a candidate
          </div>
        )}
      </div>

      <div className="mt-0 flex items-center gap-4 border-t border-white/5 pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="shrink-0 text-[11px] text-zinc-500">Progress</span>
          <div className="h-1.5 max-w-xs flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rsu-teal to-emerald-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">
            {scoredCount}/{scores.length} scored
          </span>
        </div>
        <p className="hidden text-[11px] text-zinc-600 sm:block">
          © 2026 Romblon State University · Pageant System v1.0
        </p>
      </div>
    </div>
  );
}
