"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResetScoresPanelProps {
  token: string | null;
  onReset?: () => void;
  onMessage?: (message: string | null) => void;
}

export function ResetScoresPanel({ token, onReset, onMessage }: ResetScoresPanelProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const canReset = confirmText.trim().toUpperCase() === "RESET";

  const handleReset = async () => {
    if (!token || !canReset || isResetting) return;

    const ok = window.confirm(
      "This will clear ALL judge scores and leaderboard results.\n\nCandidates, judges, categories, and settings will be kept.\n\nContinue?"
    );
    if (!ok) return;

    setIsResetting(true);
    setLocalError(null);
    onMessage?.(null);

    try {
      const res = await apiFetch<ApiResponse<{ clearedScoreRows: number }>>(
        "/api/admin/reset-scores",
        { method: "POST" },
        token
      );
      if (!res.success) {
        throw new Error(res.error ?? "Failed to reset scores");
      }

      setConfirmText("");
      const cleared = res.data?.clearedScoreRows ?? 0;
      onMessage?.(
        cleared > 0
          ? `Scores reset. Cleared ${cleared} score row${cleared === 1 ? "" : "s"}.`
          : "Scores reset. All scores were already empty."
      );
      onReset?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset scores";
      setLocalError(message);
      onMessage?.(message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="border-red-500/25">
      <CardHeader>
        <CardTitle className="text-red-300">Reset Scores</CardTitle>
        <CardDescription>
          Clear every judge score and tabulation result so the pageant can start from zero.
          Candidates, judges, categories, and event settings are kept.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            This cannot be undone. Type <span className="font-semibold text-white">RESET</span>{" "}
            below, then confirm.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="reset-confirm">Confirmation</Label>
          <Input
            id="reset-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Type "RESET" to enable'
            autoComplete="off"
            disabled={isResetting}
            className="max-w-xs border-red-500/30"
          />
        </div>

        <Button
          type="button"
          variant="destructive"
          disabled={!canReset || isResetting || !token}
          onClick={() => void handleReset()}
        >
          <RotateCcw className={isResetting ? "animate-spin" : undefined} />
          {isResetting ? "Resetting..." : "Reset all scores to 0"}
        </Button>

        {localError && <p className="text-sm text-red-300">{localError}</p>}
      </CardContent>
    </Card>
  );
}
