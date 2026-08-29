import type { AppNavItem } from "@/types";

export const ADMIN_NAV: AppNavItem[] = [
  { key: "judging", label: "Judging", href: "/admin" },
  { key: "overview", label: "Overview", href: "/admin/overview" },
  { key: "leaderboard", label: "Leaderboard", href: "/admin/leaderboard" },
];

/** Judge mockup shows Overview + Leaderboard only; console is reached via brand title. */
export const JUDGE_NAV: AppNavItem[] = [
  { key: "overview", label: "Overview", href: "/judge/overview" },
  { key: "leaderboard", label: "Leaderboard", href: "/judge/leaderboard" },
];
