"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, downloadExport } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import {
  ApiResponse,
  Category,
  DualWinners,
  TabulationRow,
} from "@/types";

const emptyWinners: DualWinners = { male: null, female: null };

export function useTabulation(
  token: string | null,
  options: { enabled?: boolean; canRecalculate?: boolean } = {}
) {
  const { enabled = true, canRecalculate = false } = options;
  const [rows, setRows] = useState<TabulationRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [winners, setWinners] = useState<DualWinners>(emptyWinners);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    if (!token || !enabled) return;
    try {
      const [tabResult, winnerResult] = await Promise.allSettled([
        apiFetch<ApiResponse<{ rows: TabulationRow[]; categories: Category[] }>>(
          "/api/tabulation",
          {},
          token
        ),
        apiFetch<ApiResponse<DualWinners>>("/api/tabulation/winner", {}, token),
      ]);

      if (tabResult.status === "fulfilled" && tabResult.value.success && tabResult.value.data) {
        const nextRows = (tabResult.value.data.rows ?? []).map((row) => ({
          ...row,
          finalScore: Number(row.finalScore) || 0,
          rank: Number(row.rank) || 0,
          categoryScores: Object.fromEntries(
            Object.entries(row.categoryScores ?? {}).map(([key, value]) => [
              Number(key),
              Number(value) || 0,
            ])
          ),
        }));
        setRows(nextRows);
        setCategories(tabResult.value.data.categories ?? []);
      } else if (tabResult.status === "rejected") {
        setError(
          tabResult.reason instanceof Error ? tabResult.reason.message : "Failed to load tabulation"
        );
      }

      if (winnerResult.status === "fulfilled" && winnerResult.value.success) {
        const next = winnerResult.value.data ?? emptyWinners;
        setWinners({
          male: next.male
            ? { ...next.male, finalScore: Number(next.male.finalScore) || 0 }
            : null,
          female: next.female
            ? { ...next.female, finalScore: Number(next.female.finalScore) || 0 }
            : null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tabulation");
    }
  }, [token, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket({
    token,
    enabled: Boolean(token && enabled),
    onStateUpdate: () => {
      load();
    },
    onScoreSubmitted: () => {
      load();
    },
  });

  const refresh = async () => {
    if (!token) return;
    setIsRefreshing(true);
    setError(null);
    try {
      if (canRecalculate) {
        await apiFetch("/api/tabulation/recalculate", { method: "POST" }, token);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportExcel = async () => {
    if (!token) return;
    setIsExporting(true);
    setError(null);
    try {
      await downloadExport(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    rows,
    categories,
    winners,
    error,
    isRefreshing,
    isExporting,
    reload: load,
    refresh,
    exportExcel,
    setError,
  };
}
