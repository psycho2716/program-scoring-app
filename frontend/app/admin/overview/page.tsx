"use client";

import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { CategoriesManager } from "@/components/admin/setup/categories-manager";
import { CandidatesManager } from "@/components/admin/setup/candidates-manager";
import { EventSettingsForm } from "@/components/admin/setup/event-settings-form";
import { JudgesManager } from "@/components/admin/setup/judges-manager";
import { ResetScoresPanel } from "@/components/admin/setup/reset-scores-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/auth-context";
import { ApiResponse, SystemState } from "@/types";

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const [scoringLocked, setScoringLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<ApiResponse<SystemState>>("/api/state", {}, token);
      if (res.success && res.data) {
        setScoringLocked(Boolean(res.data.isScoringOpen));
      }
    } catch {
      // keep prior lock state
    }
  }, [token]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  return (
    <div className="space-y-6">
      {scoringLocked && (
        <Alert variant="warning">
          <AlertDescription>
            Scoring in progress — setup locked. Editing capabilities are currently disabled.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Event Setup</h2>
          <p className="text-sm text-muted-foreground">
            Configure pageant parameters and scoring weights.
          </p>
        </div>
        <Button
          type="submit"
          form="event-settings-form"
          variant="amber"
          disabled={scoringLocked}
          className="shadow-gold-sm"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <div className="grid gap-5 xl:grid-cols-2">
        <EventSettingsForm
          token={token}
          scoringLocked={scoringLocked}
          hideSaveButton
          onMessage={setMessage}
        />
        <CategoriesManager token={token} scoringLocked={scoringLocked} />
      </div>

      <CandidatesManager token={token} scoringLocked={scoringLocked} />
      <JudgesManager token={token} scoringLocked={scoringLocked} />
      <ResetScoresPanel token={token} onMessage={setMessage} onReset={() => void loadState()} />
    </div>
  );
}
