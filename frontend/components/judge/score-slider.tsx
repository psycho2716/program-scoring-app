"use client";

import { Slider } from "@/components/ui/slider";
import {
  buildHalfPointScores,
  formatScoreDisplay,
  scoresEqual,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface ScoreSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  candidateName: string;
  minScore?: number;
  maxScore?: number;
  categoryLabel?: string;
}

export function ScoreSlider({
  value,
  onChange,
  disabled = false,
  candidateName,
  minScore = 1,
  maxScore = 10,
  categoryLabel = "Score",
}: ScoreSliderProps) {
  const chips = buildHalfPointScores(minScore, maxScore);

  return (
    <div className="flex h-full flex-col">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rsu-teal">
          {categoryLabel}
        </p>
        <p className="mt-1 text-[4.25rem] font-bold leading-none tabular-nums tracking-tight text-white">
          {formatScoreDisplay(value)}
        </p>
      </div>

      <div className="mt-6 px-1">
        <Slider
          min={minScore}
          max={maxScore}
          step={0.5}
          value={[value]}
          disabled={disabled}
          aria-label={`Score for ${candidateName}`}
          onValueChange={(values) =>
            onChange(Number((values[0] ?? minScore).toFixed(1)))
          }
        />
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={disabled}
            onClick={() => onChange(chip)}
            className={cn(
              "min-w-[2.75rem] rounded-lg border px-2 py-1.5 text-sm font-semibold tabular-nums transition",
              scoresEqual(value, chip)
                ? "border-rsu-teal bg-rsu-teal/20 text-rsu-teal shadow-teal"
                : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/25 hover:text-white",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {formatScoreDisplay(chip)}
          </button>
        ))}
      </div>
    </div>
  );
}
