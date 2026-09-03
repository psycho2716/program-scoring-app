"use client";

import { LeaderboardPanel } from "@/components/leaderboard/leaderboard-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTabulation } from "@/hooks/useTabulation";
import { useAuth } from "@/providers/auth-context";

export default function AdminLeaderboardPage() {
  const { token } = useAuth();
  const { rows, categories, winners, error, isRefreshing, isExporting, refresh, exportExcel } =
    useTabulation(token, { canRecalculate: true });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-white">Leaderboard</h2>
        <p className="text-sm text-muted-foreground">
          Separate Mr. and Miss standings with full category breakdown.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <LeaderboardPanel
        rows={rows}
        categories={categories}
        winners={winners}
        onRefresh={refresh}
        onExport={exportExcel}
        isRefreshing={isRefreshing}
        isExporting={isExporting}
        showExport
        showBreakdown
      />
    </div>
  );
}
