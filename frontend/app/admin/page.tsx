"use client";

import { LiveControlDashboard } from "@/components/admin/live-control-dashboard";
import { useAuth } from "@/providers/auth-context";

export default function AdminJudgingPage() {
  const { token } = useAuth();
  return <LiveControlDashboard token={token} />;
}
