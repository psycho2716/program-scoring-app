"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, downloadExport } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import {
  ApiResponse,
  Category,
  TabulationRow,
  WinnerInfo,
} from "@/types";

export function useTabulation(
  token: string | null,
  options: { enabled?: boolean; canRecalculate?: boolean } = {}
) {
  const { enabled = true, canRecalculate = false } = options;
  const [rows, setRows] = useState<TabulationRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [winner, setWinner] = useState<WinnerInfo | null>(null);
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
        apiFetch<ApiResponse<WinnerInfo | null>>("/api/tabulation/winner", {}, token),
      ]);

      if (tabResult.status === "fulfilled" && tabResult.value.success && tabResult.value.data) {
        setRows(tabResult.value.data.rows);
        setCategories(tabResult.value.data.categories);
      } else if (tabResult.status === "rejected") {
        setError(
          tabResult.reason instanceof Error ? tabResult.reason.message : "Failed to load tabulation"
        );
      }

      if (winnerResult.status === "fulfilled" && winnerResult.value.success) {
        setWinner(winnerResult.value.data ?? null);
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
    winner,
    error,
    isRefreshing,
    isExporting,
    reload: load,
    refresh,
    exportExcel,
    setError,
  };
}
