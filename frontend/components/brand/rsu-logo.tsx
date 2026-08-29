import Image from "next/image";
import { cn } from "@/lib/utils";
import type { RsuLogoProps } from "@/types";

const sizeMap = {
  sm: 36,
  md: 56,
  lg: 88,
  xl: 112,
} as const;

export function RsuLogo({ size = "md", className, glow = false, priority = false }: RsuLogoProps) {
  const px = sizeMap[size];

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full",
        glow && "gold-glow-ring",
        className
      )}
      style={{ width: px, height: px }}
    >
      <Image
        src="/rsu-logo.png"
        alt="Romblon State University"
        width={px}
        height={px}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
