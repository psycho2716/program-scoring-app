"use client";

import { FormEvent, useEffect, useState } from "react";
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

export function JudgesManager({ token, scoringLocked = false, onChange }: JudgesManagerProps) {
  const [judges, setJudges] = useState<JudgeAccount[]>([]);
  const [form, setForm] = useState({ username: "", password: "", judgeNumber: "" });
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    const res = await apiFetch<ApiResponse<JudgeAccount[]>>("/api/admin/judges", {}, token);
    if (res.success && res.data) setJudges(res.data);
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || scoringLocked) return;
    try {
      await apiFetch(
        "/api/admin/judges",
        {
          method: "POST",
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            judgeNumber: form.judgeNumber ? Number(form.judgeNumber) : undefined,
          }),
        },
        token
      );
      setForm({ username: "", password: "", judgeNumber: "" });
      setMessage("Judge account created");
      await load();
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create judge");
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
        <form onSubmit={handleSubmit} className="mb-4 grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Username"
            value={form.username}
            disabled={scoringLocked}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
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
            placeholder="Judge # (optional)"
            value={form.judgeNumber}
            disabled={scoringLocked}
            onChange={(e) => setForm({ ...form, judgeNumber: e.target.value })}
          />
          <Button type="submit" variant="blue" disabled={scoringLocked}>
            Create Judge
          </Button>
        </form>

        <div className="space-y-2">
          {judges.map((judge) => (
            <div
              key={judge.id}
              className="flex items-center justify-between rounded-xl border border-border bg-black/20 px-4 py-3"
            >
              <div>
                <span className="font-semibold text-amber-300">Judge {judge.judgeNumber}</span>
                <span className="ml-3 text-muted-foreground">{judge.username}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={scoringLocked}
                onClick={() => handleDelete(judge.id)}
                className="text-red-300 hover:bg-destructive/10 hover:text-red-200"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
