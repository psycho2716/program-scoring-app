"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV } from "@/lib/nav";
import { useAuth } from "@/providers/auth-context";
import { apiFetch } from "@/lib/api";
import type { ApiResponse, AppNavKey, EventSettings } from "@/types";

function resolveAdminNav(pathname: string): AppNavKey {
  if (pathname.startsWith("/admin/overview")) return "overview";
  if (pathname.startsWith("/admin/leaderboard")) return "leaderboard";
  if (pathname.startsWith("/admin/results")) return "results";
  return "judging";
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [pageantName, setPageantName] = useState("Pageant Live Scoring");

  useEffect(() => {
    apiFetch<ApiResponse<EventSettings>>("/api/admin/settings")
      .then((res) => {
        if (res.success && res.data?.pageantName) setPageantName(res.data.pageantName);
      })
      .catch(() => undefined);
  }, []);

  return (
    <RoleGate role="admin">
      <AppShell
        className="admin-bg"
        brandLabel="Tabulator Control"
        brandTitle={pageantName}
        navItems={ADMIN_NAV}
        activeNav={resolveAdminNav(pathname)}
        rightSlot={
          <>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
              <span className="status-dot animate-pulse bg-emerald-400" />
              Live System Active
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="border border-white/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </>
        }
      >
        {children}
      </AppShell>
    </RoleGate>
  );
}
