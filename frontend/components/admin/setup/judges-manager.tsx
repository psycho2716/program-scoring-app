"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ApiResponse, JudgeAccount } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface JudgesManagerProps {
  token: string | null;
  scoringLocked?: boolean;
  onChange?: () => void;
}

interface JudgeDraft {
  username: string;
  displayName: string;
  judgeNumber: string;
  password: string;
}

function draftFromJudge(judge: JudgeAccount): JudgeDraft {
  return {
    username: judge.username,
    displayName: judge.displayName ?? "",
    judgeNumber: String(judge.judgeNumber),
    password: "",
  };
}

function isDraftDirty(judge: JudgeAccount, draft: JudgeDraft): boolean {
  return (
    draft.username.trim() !== judge.username ||
    draft.displayName.trim() !== (judge.displayName ?? "") ||
    draft.judgeNumber.trim() !== String(judge.judgeNumber) ||
    draft.password.trim().length > 0
  );
}

export function JudgesManager({ token, scoringLocked = false, onChange }: JudgesManagerProps) {
  const [judges, setJudges] = useState<JudgeAccount[]>([]);
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    judgeNumber: "",
  });
  const [drafts, setDrafts] = useState<Record<number, JudgeDraft>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    const res = await apiFetch<ApiResponse<JudgeAccount[]>>("/api/admin/judges", {}, token);
    if (res.success && res.data) {
      setJudges(res.data);
      setDrafts((prev) => {
        const next: Record<number, JudgeDraft> = {};
        for (const judge of res.data!) {
          const existing = prev[judge.id];
          next[judge.id] =
            existing && isDraftDirty(judge, existing) ? existing : draftFromJudge(judge);
        }
        return next;
      });
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const dirtyIds = useMemo(() => {
    const ids = new Set<number>();
    for (const judge of judges) {
      const draft = drafts[judge.id];
      if (draft && isDraftDirty(judge, draft)) ids.add(judge.id);
    }
    return ids;
  }, [judges, drafts]);

  const updateDraft = (id: number, patch: Partial<JudgeDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? draftFromJudge(judges.find((j) => j.id === id)!)), ...patch },
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || scoringLocked) return;
    setMessage(null);
    try {
      await apiFetch(
        "/api/admin/judges",
        {
          method: "POST",
          body: JSON.stringify({
            username: form.username,
            displayName: form.displayName.trim() || null,
            password: form.password,
            judgeNumber: form.judgeNumber ? Number(form.judgeNumber) : undefined,
          }),
        },
        token
      );
      setForm({ username: "", displayName: "", password: "", judgeNumber: "" });
      setMessage("Judge account created");
      await load();
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create judge");
    }
  };

  const handleSave = async (judge: JudgeAccount) => {
    if (!token) return;
    const draft = drafts[judge.id];
    if (!draft) return;

    const judgeNumber = Number(draft.judgeNumber);
    if (!draft.username.trim()) {
      setMessage("Username is required");
      return;
    }
    if (!Number.isInteger(judgeNumber) || judgeNumber < 1) {
      setMessage("Judge number must be a positive whole number");
      return;
    }

    const profileChanged =
      draft.username.trim() !== judge.username ||
      draft.displayName.trim() !== (judge.displayName ?? "") ||
      draft.judgeNumber.trim() !== String(judge.judgeNumber);

    if (profileChanged && scoringLocked) {
      setMessage("Close scoring before changing judge profile fields (password can still be changed)");
      return;
    }

    setSavingId(judge.id);
    setMessage(null);
    try {
      const payload: Record<string, string | number | null> = {};
      if (!scoringLocked) {
        payload.username = draft.username.trim();
        payload.displayName = draft.displayName.trim() || null;
        payload.judgeNumber = judgeNumber;
      }
      if (draft.password.trim()) {
        payload.password = draft.password.trim();
      }

      const res = await apiFetch<ApiResponse<JudgeAccount>>(
        `/api/admin/judges/${judge.id}`,
        { method: "PUT", body: JSON.stringify(payload) },
        token
      );
      if (!res.success) {
        throw new Error(res.error ?? "Failed to update judge");
      }

      setMessage(
        draft.password.trim()
          ? `Updated Judge ${judgeNumber} and password`
          : `Updated Judge ${judgeNumber}`
      );
      await load();
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update judge");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || scoringLocked) return;
    try {
      await apiFetch(`/api/admin/judges/${id}`, { method: "DELETE" }, token);
      await load();
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete judge");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-rsu-teal">Judge Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="mb-4 grid gap-3 md:grid-cols-5">
          <Input
            placeholder="Login (e.g. judge8)"
            value={form.username}
            disabled={scoringLocked}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <Input
            placeholder="Display name"
            value={form.displayName}
            disabled={scoringLocked}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
          <Input
            type="password"
            placeholder="Password"
            value={form.password}
            disabled={scoringLocked}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Input
            placeholder="Judge #"
            value={form.judgeNumber}
            disabled={scoringLocked}
            onChange={(e) => setForm({ ...form, judgeNumber: e.target.value })}
          />
          <Button type="submit" variant="blue" disabled={scoringLocked}>
            Create Judge
          </Button>
        </form>
        <p className="mb-4 text-xs text-muted-foreground">
          Login stays short (judge1…). Display name is shown on the judge panel. Password can be
          changed anytime; other fields require scoring closed.
        </p>

        <div className="space-y-2">
          {judges.map((judge) => {
            const draft = drafts[judge.id] ?? draftFromJudge(judge);
            const dirty = dirtyIds.has(judge.id);
            const busy = savingId === judge.id;

            return (
              <div
                key={judge.id}
                className="rounded-xl border border-border bg-black/20 px-4 py-3"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[4.5rem_8rem_1fr_10rem]">
                    <Input
                      aria-label={`Judge ${judge.id} number`}
                      value={draft.judgeNumber}
                      disabled={scoringLocked || busy}
                      onChange={(e) => updateDraft(judge.id, { judgeNumber: e.target.value })}
                      className="h-9"
                      title="Judge number"
                    />
                    <Input
                      aria-label={`Judge ${judge.id} username`}
                      value={draft.username}
                      disabled={scoringLocked || busy}
                      onChange={(e) => updateDraft(judge.id, { username: e.target.value })}
                      className="h-9"
                      title="Login username"
                    />
                    <Input
                      aria-label={`Judge ${judge.id} display name`}
                      value={draft.displayName}
                      disabled={scoringLocked || busy}
                      onChange={(e) => updateDraft(judge.id, { displayName: e.target.value })}
                      className="h-9"
                      placeholder="Display name"
                      title="Display name"
                    />
                    <Input
                      type="password"
                      aria-label={`Judge ${judge.id} new password`}
                      value={draft.password}
                      disabled={busy}
                      onChange={(e) => updateDraft(judge.id, { password: e.target.value })}
                      className="h-9"
                      placeholder="New password"
                      title="Leave blank to keep current password"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {dirty ? (
                      <>
                        <Button
                          type="button"
                          variant="teal"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleSave(judge)}
                        >
                          <Save className="h-3.5 w-3.5" />
                          {busy ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            setDrafts((prev) => ({ ...prev, [judge.id]: draftFromJudge(judge) }))
                          }
                          className="text-zinc-400"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={scoringLocked || busy}
                      onClick={() => void handleDelete(judge.id)}
                      className="text-red-300 hover:bg-destructive/10 hover:text-red-200"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
