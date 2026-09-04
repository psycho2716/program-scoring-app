"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryControl } from "@/components/admin/category-control";
import { SubmissionMatrix } from "@/components/admin/submission-matrix";
import { LeaderboardPanel } from "@/components/leaderboard/leaderboard-panel";
import { useSocket } from "@/hooks/useSocket";
import { useTabulation } from "@/hooks/useTabulation";
import { apiFetch } from "@/lib/api";
import { ApiResponse, Category, MatrixCell, SystemState } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LiveControlDashboardProps {
  token: string | null;
}

export function LiveControlDashboard({ token }: LiveControlDashboardProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [state, setState] = useState<SystemState | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [matrixCategoryId, setMatrixCategoryId] = useState<number | null>(null);
  const [matrix, setMatrix] = useState<MatrixCell[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    rows,
    categories: tabCategories,
    winners,
    error: tabError,
    isRefreshing,
    isExporting,
    refresh,
    exportExcel,
  } = useTabulation(token, { canRecalculate: true });

  const loadCategories = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<ApiResponse<Category[]>>("/api/state/categories", {}, token);
      if (res.success && res.data) {
        setCategories(res.data);
        setSelectedCategoryId((current) => current ?? res.data![0]?.id ?? null);
        setMatrixCategoryId((current) => current ?? res.data![0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    }
  }, [token]);

  const loadState = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<ApiResponse<SystemState>>("/api/state", {}, token);
      if (res.success && res.data) {
        setState(res.data);
        if (res.data.activeCategoryId) {
          setSelectedCategoryId(res.data.activeCategoryId);
          setMatrixCategoryId(res.data.activeCategoryId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load system state");
    }
  }, [token]);

  const loadMatrix = useCallback(
    async (categoryId: number) => {
      if (!token) return;
      try {
        const res = await apiFetch<ApiResponse<MatrixCell[]>>(
          `/api/tabulation/matrix?categoryId=${categoryId}`,
          {},
          token
        );
        if (res.success && res.data) setMatrix(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load submission matrix");
      }
    },
    [token]
  );

  useEffect(() => {
    loadCategories();
    loadState();
  }, [loadCategories, loadState]);

  useEffect(() => {
    if (matrixCategoryId) loadMatrix(matrixCategoryId);
  }, [matrixCategoryId, loadMatrix]);

  useSocket({
    token,
    enabled: Boolean(token),
    onStateUpdate: () => {
      loadState();
    },
    onScoreProgress: () => {
      if (matrixCategoryId) loadMatrix(matrixCategoryId);
    },
    onScoreSubmitted: () => {
      if (matrixCategoryId) loadMatrix(matrixCategoryId);
    },
  });

  const matrixCandidates = useMemo(() => {
    const byId = new Map<
      number,
      { candidateId: number; candidateNumber: number; gender: MatrixCell["gender"] }
    >();
    for (const cell of matrix) {
      if (!byId.has(cell.candidateId)) {
        byId.set(cell.candidateId, {
          candidateId: cell.candidateId,
          candidateNumber: cell.candidateNumber,
          gender: cell.gender,
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => {
      if (a.gender !== b.gender) return a.gender === "female" ? -1 : 1;
      return a.candidateNumber - b.candidateNumber;
    });
  }, [matrix]);

  const judgeNumbers = useMemo(
    () => Array.from(new Set(matrix.map((m) => m.judgeNumber))).sort((a, b) => a - b),
    [matrix]
  );

  const updateState = async (payload: {
    activeCategoryId?: number | null;
    isScoringOpen?: boolean;
  }) => {
    if (!token) return;
    setIsUpdating(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResponse<SystemState>>(
        "/api/state",
        { method: "PUT", body: JSON.stringify(payload) },
        token
      );
      if (res.success && res.data) {
        setState(res.data);
        if (res.data.activeCategoryId) {
          setMatrixCategoryId(res.data.activeCategoryId);
          loadMatrix(res.data.activeCategoryId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const displayCategories = tabCategories.length ? tabCategories : categories;
  const matrixCategoryName = displayCategories.find((c) => c.id === matrixCategoryId)?.categoryName;
  const displayError = error || tabError;

  return (
    <div className="space-y-5">
      {displayError && (
        <Alert variant="destructive">
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}

      <CategoryControl
        categories={displayCategories}
        state={state}
        selectedCategoryId={selectedCategoryId}
        isUpdating={isUpdating}
        onSelectCategory={setSelectedCategoryId}
        onToggleScoring={() => {
          if (state?.isScoringOpen) {
            updateState({ isScoringOpen: false });
            return;
          }
          if (!selectedCategoryId) {
            setError("Select a category before opening scoring");
            return;
          }
          updateState({ activeCategoryId: selectedCategoryId, isScoringOpen: true });
        }}
      />

      <div className="gold-border-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rsu-gold">
            Audience results
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Projector page shows a holding screen until you reveal the Top 4.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={state?.resultsRevealed ? "secondary" : "teal"}
            disabled={isUpdating}
            onClick={() => {
              void (async () => {
                if (!token) return;
                setIsUpdating(true);
                try {
                  await apiFetch(
                    "/api/state/results-reveal",
                    {
                      method: "PUT",
                      body: JSON.stringify({ revealed: !state?.resultsRevealed }),
                    },
                    token
                  );
                  await loadState();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to update projector");
                } finally {
                  setIsUpdating(false);
                }
              })();
            }}
          >
            {state?.resultsRevealed ? "Hide projector results" : "Show projector results"}
          </Button>
          <Button type="button" size="sm" variant="ghost" asChild>
            <a href="/admin/results">Open results page</a>
          </Button>
        </div>
      </div>

      <div className="gold-border-card p-4">
        <Label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Matrix Category
        </Label>
        <div className="flex flex-wrap gap-2">
          {displayCategories.map((cat) => (
            <Button
              key={cat.id}
              type="button"
              size="sm"
              variant={matrixCategoryId === cat.id ? "default" : "secondary"}
              onClick={() => setMatrixCategoryId(cat.id)}
              className={cn(
                matrixCategoryId === cat.id &&
                  "bg-rsu-gold/20 text-rsu-gold ring-1 ring-rsu-gold/40 hover:bg-rsu-gold/25"
              )}
            >
              {cat.categoryName}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <SubmissionMatrix
          matrix={matrix}
          candidates={matrixCandidates}
          judgeNumbers={judgeNumbers}
        />
        <LeaderboardPanel
          rows={rows}
          categories={displayCategories}
          winners={winners}
          onRefresh={refresh}
          onExport={exportExcel}
          isRefreshing={isRefreshing}
          isExporting={isExporting}
          activeCategoryName={matrixCategoryName}
          compact
          showBreakdown={false}
        />
      </div>
    </div>
  );
}
