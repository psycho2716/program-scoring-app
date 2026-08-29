"use client";

import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreSlider } from "@/components/judge/score-slider";

interface ScoringMatrixPanelProps {
  candidateName: string;
  value: number;
  minScore: number;
  maxScore: number;
  categoryLabel: string;
  disabled?: boolean;
  submitting?: boolean;
  canSubmitCategory?: boolean;
  onScoreChange: (value: number) => void;
  onClear: () => void;
  onSubmitCategory: () => void;
}

/**
 * Right-hand Scoring Matrix — flush against the hero (no outer card gap).
 */
export function ScoringMatrixPanel({
  candidateName,
  value,
  minScore,
  maxScore,
  categoryLabel,
  disabled = false,
  submitting = false,
  canSubmitCategory = false,
  onScoreChange,
  onClear,
  onSubmitCategory,
}: ScoringMatrixPanelProps) {
  return (
    <aside className="flex h-full min-h-[420px] flex-col bg-[#0e1a26] p-5 lg:min-h-full">
      <div className="shrink-0">
        <h3 className="text-[1.05rem] font-semibold leading-tight text-white">Scoring Matrix</h3>
        <p className="mt-1 text-xs text-zinc-500">Enter score for current segment</p>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ScoreSlider
          value={value}
          disabled={disabled}
          candidateName={candidateName}
          minScore={minScore}
          maxScore={maxScore}
          categoryLabel={categoryLabel}
          onChange={onScoreChange}
        />
      </div>

      <div className="mt-6 shrink-0 space-y-3">
        <Button
          type="button"
          variant="amber"
          size="lg"
          className="h-[3.25rem] w-full rounded-xl text-[13px] font-bold uppercase tracking-[0.12em] shadow-gold"
          disabled={!canSubmitCategory || submitting || disabled}
          onClick={onSubmitCategory}
        >
          <UserCheck className="h-4 w-4" />
          {submitting ? "Submitting..." : "Submit Score"}
        </Button>
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="w-full text-center text-xs font-medium text-rsu-teal transition hover:text-teal-300 disabled:opacity-40"
        >
          Clear Input
        </button>
      </div>
    </aside>
  );
}
