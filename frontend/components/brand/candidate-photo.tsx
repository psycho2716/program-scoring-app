import Image from "next/image";
import { resolveMediaUrl } from "@/lib/api";
import { cn, candidatePlaceholderGradient } from "@/lib/utils";
import type { CandidatePhotoProps } from "@/types";

const sizeClasses = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  hero: "h-full w-full min-h-[280px]",
} as const;

export function CandidatePhoto({
  name,
  photoUrl,
  candidateNumber,
  size = "md",
  className,
}: CandidatePhotoProps) {
  const seed = `${candidateNumber ?? ""}-${name}`;
  const resolvedUrl = resolveMediaUrl(photoUrl);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (resolvedUrl) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl bg-muted", sizeClasses[size], className)}>
        <Image
          src={resolvedUrl}
          alt={name}
          fill
          className="object-cover"
          unoptimized
          sizes={size === "hero" ? "800px" : "96px"}
        />
        {size === "hero" && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-teal-100/90 ring-1 ring-white/10",
        sizeClasses[size],
        className
      )}
      style={{ background: candidatePlaceholderGradient(seed) }}
      aria-label={name}
    >
      <span className={cn(size === "hero" ? "text-5xl tracking-widest text-white/40" : "text-xs")}>
        {size === "hero"
          ? candidateNumber != null
            ? `#${String(candidateNumber).padStart(2, "0")}`
            : initials
          : initials}
      </span>
      {size === "hero" && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
      )}
    </div>
  );
}
