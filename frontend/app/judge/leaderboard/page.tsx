"use client";

import { LeaderboardPanel } from "@/components/leaderboard/leaderboard-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTabulation } from "@/hooks/useTabulation";
import { useAuth } from "@/providers/auth-context";

export default function JudgeLeaderboardPage() {
  const { token } = useAuth();
  const { rows, categories, winners, error, isRefreshing, refresh } = useTabulation(token, {
    canRecalculate: false,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-white">Leaderboard</h2>
        <p className="text-sm text-muted-foreground">
          Separate Mr. and Miss standings for the pageant.
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
        isRefreshing={isRefreshing}
        showExport={false}
        showBreakdown
      />
    </div>
  );
}
