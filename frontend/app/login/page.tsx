"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, UserRound, ArrowRight, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getAppName } from "@/lib/utils";
import { useAuth } from "@/providers/auth-context";
import { ApiResponse, EventSettings } from "@/types";
import { RsuLogo } from "@/components/brand/rsu-logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pageantName, setPageantName] = useState("Live Pageant Scoring");

  useEffect(() => {
    apiFetch<ApiResponse<EventSettings>>("/api/admin/settings")
      .then((res) => {
        if (res.success && res.data?.pageantName) setPageantName(res.data.pageantName);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.role === "admin" ? "/admin" : "/judge");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const authUser = await login(username, password);
      router.push(authUser.role === "admin" ? "/admin" : "/judge");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-bg relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="gold-border-card relative z-10 w-full max-w-[420px] px-8 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <RsuLogo size="xl" glow priority className="mb-5" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-rsu-gold">
            Live Scoring System
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-[1.75rem]">
            {pageantName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Judges and Tabulator sign in below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username / Judge ID"
              required
              autoComplete="username"
              className="h-12 rounded-xl border-0 bg-white pl-10 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-rsu-gold"
            />
          </div>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passcode"
              required
              autoComplete="current-password"
              className="h-12 rounded-xl border-0 bg-white pl-10 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-rsu-gold"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            variant="amber"
            className="h-12 w-full text-base font-bold shadow-gold"
            size="lg"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign In"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/10 pt-5">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-rsu-gold/80" />
            Official RSU Pageant Portal
          </p>
        </div>
      </div>
      <p className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-muted-foreground/70">
        © 2026 Romblon State University · Pageant System v1.0
      </p>
      <span className="sr-only">{getAppName()}</span>
    </main>
  );
}
