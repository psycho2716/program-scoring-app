import type { ReactNode } from "react";

export interface RsuLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  glow?: boolean;
  priority?: boolean;
}

export interface CandidatePhotoProps {
  name: string;
  photoUrl?: string | null;
  candidateNumber?: number;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
}

export type AppNavKey = "judging" | "overview" | "leaderboard";

export interface AppNavItem {
  key: AppNavKey;
  label: string;
  href: string;
}

export interface AppShellProps {
  brandLabel: string;
  brandTitle: string;
  /** When set, shown under the title (e.g. JUDGES PANEL). */
  brandSubtitle?: string;
  brandHref?: string;
  navItems: AppNavItem[];
  activeNav: AppNavKey;
  /** Centered header content (e.g. active category badge on judge console). */
  centerSlot?: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  hideFooter?: boolean;
  /** Page-level footer slot above the copyright footer (e.g. progress bar). */
  bottomSlot?: ReactNode;
}

export interface AppFooterProps {
  className?: string;
}

export interface RoleGateProps {
  role: import("./index").UserRole;
  children: ReactNode;
}

export interface LeaderboardPanelProps {
  rows: import("./index").TabulationRow[];
  categories: import("./index").Category[];
  winners: import("./index").DualWinners;
  onRefresh?: () => void;
  onExport?: () => void;
  isRefreshing?: boolean;
  isExporting?: boolean;
  activeCategoryName?: string | null;
  compact?: boolean;
  showExport?: boolean;
  showBreakdown?: boolean;
}

export interface CandidateQueueProps {
  scores: import("./index").ScoreEntry[];
  localScores: Record<number, number>;
  selectedId: number | null;
  scoredCount: number;
  minScore: number;
  maxScore: number;
  /** Candidate IDs the judge may open (scored + next unscored, or only active if unfinished). */
  selectableIds: number[];
  /** Hint when the active candidate still needs a score. */
  mustScoreActive: boolean;
  onSelect: (candidateId: number) => void;
}

export interface CandidateScoreGridProps {
  scores: import("./index").ScoreEntry[];
  localScores: Record<number, number>;
  onScoreChange: (candidateId: number, score: number) => void;
  onSubmitCategory: () => void;
  submitting?: boolean;
  disabled?: boolean;
  minScore?: number;
  maxScore?: number;
  categoryName?: string | null;
  categoryWeight?: number | null;
}

export interface CandidateHeroProps {
  candidate: import("./index").ScoreEntry;
  categoryName?: string | null;
  maxScore: number;
}

export interface CandidateFormFields {
  candidateNumber: string;
  gender: import("./index").CandidateGender;
  name: string;
  department: string;
  talentDetails: string;
}

export interface CandidatesManagerProps {
  token: string | null;
  scoringLocked?: boolean;
  onChange?: () => void;
}
