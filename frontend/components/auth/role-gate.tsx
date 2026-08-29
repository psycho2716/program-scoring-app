"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import type { RoleGateProps } from "@/types";

export function RoleGate({ role, children }: RoleGateProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(user.role === "admin" ? "/admin" : "/judge");
    }
  }, [user, isLoading, role, router]);

  if (isLoading) {
    return (
      <main className="admin-bg flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (!user || user.role !== role) {
    return null;
  }

  return <>{children}</>;
}
