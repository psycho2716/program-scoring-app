"use client";

import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaitingStageProps {
  message?: string;
  categoryName?: string | null;
  pageantName?: string;
  variant?: "waiting" | "submitted";
}

export function WaitingStage({
  message = "Waiting for the next category to begin...",
  categoryName,
  pageantName = "Live Scoring",
  variant = "waiting",
}: WaitingStageProps) {
  const isSubmitted = variant === "submitted";

  return (
    <div className="relative flex min-h-[65vh] items-center justify-center px-4">
      <div
        className={cn(
          "corner-frame-all relative w-full max-w-xl rounded-sm border border-amber-400/25 bg-[#0d1824]/90 px-8 py-14 text-center shadow-[0_0_48px_rgba(212,160,30,0.08)] backdrop-blur-xl md:px-14",
          "animate-success-pop"
        )}
      >
        <span className="corner-tr" aria-hidden />
        <span className="corner-bl" aria-hidden />
        <div
          className={cn(
            "mx-auto mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-[3px]",
            isSubmitted
              ? "border-emerald-400 text-emerald-400 shadow-[0_0_28px_rgba(52,211,153,0.4)]"
              : "border-rsu-gold/70 text-rsu-gold shadow-gold-sm"
          )}
        >
          {isSubmitted ? (
            <Check className="h-9 w-9" strokeWidth={2.5} />
          ) : (
            <Lock className="h-8 w-8" />
          )}
        </div>

        {isSubmitted ? (
          <>
            <h2 className="text-2xl font-bold uppercase tracking-[0.14em] md:text-[1.75rem]">
              <span className="bg-gradient-to-b from-amber-200 to-rsu-gold bg-clip-text text-transparent">
                Category Submission
              </span>
              <br />
              <span className="bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-transparent">
                Successful
              </span>
            </h2>
            {categoryName && (
              <p className="mt-4 text-sm text-rsu-gold/90">Scores for: {categoryName}</p>
            )}
            <div className="mt-8 flex flex-col items-center gap-2">
              <Lock className="h-4 w-4 text-rsu-gold/70" />
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-rsu-gold/80">
                System locked · Please wait for admin to open next category
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.35em] text-rsu-gold/80">{pageantName}</p>
            <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">{message}</h2>
            {categoryName && (
              <p className="mt-3 text-sm text-muted-foreground">
                Current category:{" "}
                <span className="font-medium text-rsu-gold">{categoryName}</span>
              </p>
            )}
            <div className="mx-auto mt-8 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2.5 w-2.5 animate-pulse rounded-full bg-rsu-gold"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
