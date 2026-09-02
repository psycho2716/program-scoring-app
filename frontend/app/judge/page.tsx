"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CandidateScoreGrid } from "@/components/judge/candidate-score-grid";
import { WaitingStage } from "@/components/judge/waiting-stage";
import { useSocket } from "@/hooks/useSocket";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isValidScoreValue } from "@/lib/scoring";
import {
  ApiResponse,
  EventSettings,
  ScoreEntry,
  StateUpdatePayload,
  SystemState,
} from "@/types";

type JudgeView = "waiting" | "scoring" | "submitted";

export default function JudgePage() {
  const { user, token } = useAuth();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [localScores, setLocalScores] = useState<Record<number, number>>({});
  const [state, setState] = useState<SystemState | null>(null);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [view, setView] = useState<JudgeView>("waiting");
  const [categorySubmitted, setCategorySubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saveTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const loadScores = useCallback(async () => {
    if (!token) return;

    const res = await apiFetch<
      ApiResponse<{
        categoryId: number | null;
        isSubmittedForCategory: boolean;
        scores: ScoreEntry[];
        state: SystemState;
        settings: EventSettings;
      }>
    >("/api/scores/active", {}, token);

    if (!res.success || !res.data) return;

    setScores(res.data.scores);
    setState(res.data.state);
    setSettings(res.data.settings);
    setCategorySubmitted(res.data.isSubmittedForCategory);

    const initial: Record<number, number> = {};
    res.data.scores.forEach((s) => {
      if (s.rawScore !== null) initial[s.candidateId] = Number(s.rawScore);
    });
    setLocalScores(initial);

    if (res.data.isSubmittedForCategory) {
      setView("submitted");
    } else if (res.data.state.isScoringOpen && res.data.state.activeCategoryId) {
      setView("scoring");
    } else {
      setView("waiting");
    }
  }, [token]);

  useEffect(() => {
    if (token) loadScores();
  }, [token, loadScores]);

  // Fallback if a socket event is missed while waiting after submit.
  useEffect(() => {
    if (!token || user?.role !== "judge") return;
    if (view !== "waiting" && view !== "submitted") return;

    const id = window.setInterval(() => {
      void loadScores();
    }, 4000);

    return () => window.clearInterval(id);
  }, [token, user?.role, view, loadScores]);

  const handleStateUpdate = useCallback(
    (payload: StateUpdatePayload) => {
      setState((prev) => ({
        activeCategoryId: payload.activeCategoryId,
        isScoringOpen: payload.isScoringOpen,
        activeCategory: payload.categoryName
          ? {
              id: payload.activeCategoryId ?? 0,
              categoryName: payload.categoryName,
              weight: prev?.activeCategory?.weight ?? 0,
              maxScore: 10,
              displayOrder: prev?.activeCategory?.displayOrder ?? 0,
            }
          : null,
      }));

      if (payload.isScoringOpen && payload.activeCategoryId) {
        setCategorySubmitted(false);
        // Always reload from API so category/submit status matches the server.
        void loadScores();
      } else {
        setView("waiting");
      }
    },
    [loadScores]
  );

  useSocket({
    token,
    enabled: Boolean(token && user?.role === "judge"),
    onStateUpdate: handleStateUpdate,
    onJudgeWaiting: () => setView("submitted"),
  });

  const allScoresValid = useMemo(() => {
    if (scores.length === 0) return false;
    const min = settings?.minScore ?? 1;
    const max = settings?.maxScore ?? 10;
    return scores.every((s) => isValidScoreValue(localScores[s.candidateId], min, max));
  }, [scores, localScores, settings]);

  const handleScoreChange = (candidateId: number, score: number) => {
    if (categorySubmitted || view !== "scoring") return;

    const min = settings?.minScore ?? 1;
    const max = settings?.maxScore ?? 10;
    const normalized = Number(score.toFixed(1));
    if (!isValidScoreValue(normalized, min, max)) return;

    setLocalScores((prev) => ({ ...prev, [candidateId]: normalized }));

    const existing = saveTimers.current.get(candidateId);
    if (existing) clearTimeout(existing);

    saveTimers.current.set(
      candidateId,
      setTimeout(async () => {
        if (!token) return;
        try {
          await apiFetch(
            `/api/scores/${candidateId}`,
            {
              method: "PUT",
              body: JSON.stringify({ rawScore: normalized }),
            },
            token
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save score");
        }
      }, 500)
    );
  };

  const flushPendingSaves = async () => {
    const pending = Array.from(saveTimers.current.entries());
    for (const [, timer] of pending) clearTimeout(timer);
    saveTimers.current.clear();

    if (!token) return;

    await Promise.all(
      Object.entries(localScores).map(async ([candidateId, rawScore]) => {
        await apiFetch(
          `/api/scores/${candidateId}`,
          {
            method: "PUT",
            body: JSON.stringify({ rawScore }),
          },
          token
        );
      })
    );
  };

  const handleSubmit = async () => {
    if (!token || !allScoresValid) return;
    setSubmitting(true);
    setError(null);

    try {
      // Ensure debounced saves finish before the server validates submission.
      await flushPendingSaves();
      await apiFetch("/api/scores/submit", { method: "POST" }, token);
      setCategorySubmitted(true);
      setView("submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(view === "waiting" || view === "submitted") && (
        <WaitingStage
          variant={view === "submitted" ? "submitted" : "waiting"}
          pageantName={settings?.pageantName}
          message={
            view === "submitted"
              ? "Scores submitted. Waiting for the next category to begin..."
              : state?.isScoringOpen
                ? "Stand by..."
                : "Waiting for the next category to begin..."
          }
          categoryName={
            state?.activeCategory
              ? `${state.activeCategory.categoryName} (${state.activeCategory.weight}%)`
              : null
          }
        />
      )}

      {view === "scoring" && scores.length > 0 && (
        <CandidateScoreGrid
          scores={scores}
          localScores={localScores}
          disabled={categorySubmitted}
          minScore={settings?.minScore ?? 1}
          maxScore={settings?.maxScore ?? 10}
          categoryName={state?.activeCategory?.categoryName}
          categoryWeight={state?.activeCategory?.weight}
          submitting={submitting}
          onScoreChange={handleScoreChange}
          onSubmitCategory={handleSubmit}
        />
      )}
    </div>
  );
}
