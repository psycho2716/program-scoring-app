"use client";

import { FormEvent, useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ApiResponse, EventSettings, ScoringFormula } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventSettingsFormProps {
  token: string | null;
  onSaved?: (settings: EventSettings) => void;
  scoringLocked?: boolean;
  /** When true, omit the card's own save button (use page-level Save Settings). */
  hideSaveButton?: boolean;
  formId?: string;
  onMessage?: (message: string | null) => void;
}

export function EventSettingsForm({
  token,
  onSaved,
  scoringLocked = false,
  hideSaveButton = false,
  formId = "event-settings-form",
  onMessage,
}: EventSettingsFormProps) {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<ApiResponse<EventSettings>>("/api/admin/settings")
      .then((res) => {
        if (res.success && res.data) setSettings(res.data);
      })
      .catch(() => onMessage?.("Failed to load event settings"));
  }, [onMessage]);

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!token || !settings || scoringLocked) return;
    setSaving(true);
    onMessage?.(null);
    try {
      const res = await apiFetch<ApiResponse<EventSettings>>(
        "/api/admin/settings",
        { method: "PUT", body: JSON.stringify(settings) },
        token
      );
      if (res.success && res.data) {
        setSettings(res.data);
        onSaved?.(res.data);
        onMessage?.("Event settings saved");
      }
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground">Loading settings...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-rsu-teal">
          <Settings2 className="h-4 w-4" />
          Global Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form id={formId} onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pageant-name">Pageant Title</Label>
            <Input
              id="pageant-name"
              value={settings.pageantName}
              disabled={scoringLocked}
              onChange={(e) => setSettings({ ...settings, pageantName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scoring-formula">Scoring Formula</Label>
            <Select
              value={settings.scoringFormula}
              disabled={scoringLocked}
              onValueChange={(value) =>
                setSettings({ ...settings, scoringFormula: value as ScoringFormula })
              }
            >
              <SelectTrigger id="scoring-formula">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage_weighted">Weighted Average</SelectItem>
                <SelectItem value="raw_average_weighted">Raw Average Weighted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-score">Min Score</Label>
            <div className="relative">
              <Input
                id="min-score"
                type="number"
                value={settings.minScore}
                disabled={scoringLocked}
                onChange={(e) => setSettings({ ...settings, minScore: Number(e.target.value) })}
                className="pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                pts
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-score">Max Score</Label>
            <div className="relative">
              <Input
                id="max-score"
                type="number"
                value={settings.maxScore}
                disabled={scoringLocked}
                onChange={(e) => setSettings({ ...settings, maxScore: Number(e.target.value) })}
                className="pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                pts
              </span>
            </div>
          </div>

          {!hideSaveButton && (
            <div className="md:col-span-2">
              <button type="submit" className="sr-only" disabled={saving || scoringLocked}>
                Save
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
