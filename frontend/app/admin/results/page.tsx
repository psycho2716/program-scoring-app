"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff } from "lucide-react";
import { CrownResultsStage } from "@/components/results/crown-results-stage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSocket";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/auth-context";
import type { ApiResponse, CrownResultsDisplay, SystemState } from "@/types";

const emptyDisplay: CrownResultsDisplay = {
  revealed: false,
  pageantName: "Mr. and Miss Katimugan",
  year: 2026,
  female: [],
  male: [],
};

export default function AdminResultsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<CrownResultsDisplay>(emptyDisplay);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<ApiResponse<CrownResultsDisplay>>(
        "/api/results/preview",
        {},
        token
      );
      if (res.success && res.data) {
        setData(res.data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useSocket({
    token,
    enabled: Boolean(token),
    onStateUpdate: () => {
      void load();
    },
  });

  const setRevealed = async (revealed: boolean) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResponse<SystemState>>(
        "/api/state/results-reveal",
        { method: "PUT", body: JSON.stringify({ revealed }) },
        token
      );
      if (!res.success) throw new Error(res.error ?? "Failed to update projector");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update projector");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Coronation Results</h2>
          <p className="text-sm text-muted-foreground">
            Top 4 per division. Preview here anytime; the audience projector stays blank until you
            reveal it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              data.revealed
                ? "rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300"
                : "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400"
            }
          >
            {data.revealed ? "Projector live" : "Projector hidden"}
          </span>
          <Button
            type="button"
            variant={data.revealed ? "secondary" : "teal"}
            size="sm"
            disabled={busy}
            onClick={() => void setRevealed(!data.revealed)}
          >
            {data.revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {data.revealed ? "Hide from audience" : "Show on projector"}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href="/results" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open projector view
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CrownResultsStage data={data} compact />
    </div>
  );
}
