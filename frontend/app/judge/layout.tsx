"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Star } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { JUDGE_NAV } from "@/lib/nav";
import { useAuth } from "@/providers/auth-context";
import type { ApiResponse, AppNavKey, EventSettings, SystemState } from "@/types";

function resolveJudgeNav(pathname: string): AppNavKey {
  if (pathname.startsWith("/judge/overview")) return "overview";
  if (pathname.startsWith("/judge/leaderboard")) return "leaderboard";
  return "judging";
}

export default function JudgeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [pageantName, setPageantName] = useState("Judges Panel");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const isJudgingConsole = pathname === "/judge";

  useEffect(() => {
    apiFetch<ApiResponse<EventSettings>>("/api/admin/settings")
      .then((res) => {
        if (res.success && res.data?.pageantName) setPageantName(res.data.pageantName);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<ApiResponse<SystemState>>("/api/state", {}, token)
      .then((res) => {
        if (res.success && res.data?.activeCategory) {
          setActiveCategory(
            `${res.data.activeCategory.categoryName} (${res.data.activeCategory.weight}%)`
          );
        } else {
          setActiveCategory(null);
        }
      })
      .catch(() => undefined);
  }, [token, pathname]);

  return (
    <RoleGate role="judge">
      <AppShell
        className="stage-bg"
        brandLabel="Judges Panel"
        brandTitle={pageantName}
        brandSubtitle="Judges Panel"
        brandHref="/judge"
        navItems={JUDGE_NAV}
        activeNav={resolveJudgeNav(pathname)}
        contentClassName={isJudgingConsole ? "py-3 md:py-4" : "pb-8"}
        hideFooter={isJudgingConsole}
        centerSlot={
          isJudgingConsole && activeCategory ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-rsu-teal/35 bg-rsu-teal/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-rsu-teal">
              <Star className="h-3.5 w-3.5 fill-rsu-teal text-rsu-teal" />
              {activeCategory}
            </div>
          ) : undefined
        }
        rightSlot={
          <>
            <div className="flex items-center gap-2 rounded-full border border-rsu-gold/35 bg-rsu-gold/10 py-1 pl-1 pr-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rsu-gold text-[10px] font-black text-black">
                J{user?.judgeNumber}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rsu-gold">
                  Judge {user?.judgeNumber}
                </p>
                <p className="max-w-[180px] truncate text-xs font-medium text-white">
                  {user?.displayName || user?.username}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Sign Out"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="h-9 w-9 border border-white/10 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        }
      >
        {children}
      </AppShell>
    </RoleGate>
  );
}
