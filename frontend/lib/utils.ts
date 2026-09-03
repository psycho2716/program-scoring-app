import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CandidateGender } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function divisionLabel(gender: CandidateGender): "Mr." | "Miss" {
  return gender === "male" ? "Mr." : "Miss";
}

export function getAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME || "RSU Scoring System";
}

/** Deterministic placeholder gradient when a candidate has no photo */
export function candidatePlaceholderGradient(seed: string): string {
  const hues = [168, 195, 210, 45, 152, 280];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  const hue = hues[Math.abs(hash) % hues.length];
  return `linear-gradient(145deg, hsl(${hue} 35% 22%), hsl(${(hue + 40) % 360} 40% 12%))`;
}
