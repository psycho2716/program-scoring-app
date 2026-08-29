"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApiResponse,
  Category,
  EventSettings,
  SystemState,
} from "@/types";

export default function JudgeOverviewPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [state, setState] = useState<SystemState | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      apiFetch<ApiResponse<EventSettings>>("/api/admin/settings"),
      apiFetch<ApiResponse<SystemState>>("/api/state", {}, token),
      apiFetch<ApiResponse<Category[]>>("/api/state/categories", {}, token),
    ])
      .then(([settingsRes, stateRes, categoriesRes]) => {
        if (settingsRes.success && settingsRes.data) setSettings(settingsRes.data);
        if (stateRes.success && stateRes.data) setState(stateRes.data);
        if (categoriesRes.success && categoriesRes.data) setCategories(categoriesRes.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load overview");
      });
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Event configuration and live judging status (read-only).
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-rsu-teal">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
              <span className="text-muted-foreground">Pageant</span>
              <span className="font-medium text-white">{settings?.pageantName ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
              <span className="text-muted-foreground">Score range</span>
              <span className="font-medium text-white">
                {settings ? `${settings.minScore} – ${settings.maxScore} pts` : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
              <span className="text-muted-foreground">Formula</span>
              <span className="font-medium text-white">
                {settings?.scoringFormula === "raw_average_weighted"
                  ? "Raw Average Weighted"
                  : "Weighted Average"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Scoring status</span>
              <Badge variant={state?.isScoringOpen ? "success" : "destructive"}>
                {state?.isScoringOpen ? "Open" : "Closed"}
              </Badge>
            </div>
            {state?.activeCategory && (
              <div className="rounded-xl border border-rsu-gold/20 bg-rsu-gold/5 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-rsu-gold">
                  Active category
                </p>
                <p className="font-medium text-white">
                  {state.activeCategory.categoryName} ({state.activeCategory.weight}%)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-rsu-teal">Categories & Weights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
              >
                <span className="text-sm text-white">{cat.categoryName}</span>
                <span className="rounded-lg border border-rsu-gold/30 bg-rsu-gold/10 px-2 py-0.5 text-sm font-semibold text-rsu-gold">
                  {cat.weight}%
                </span>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground">No categories configured.</p>
            )}
            <div className="flex justify-between border-t border-white/10 pt-3 text-[11px] uppercase tracking-[0.16em]">
              <span className="text-muted-foreground">Total weight</span>
              <span className="font-bold text-rsu-teal">
                {categories.reduce((sum, c) => sum + c.weight, 0)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
