import { cn } from "@/lib/utils";
import type { AppFooterProps } from "@/types";

export function AppFooter({ className }: AppFooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-white/5 px-4 py-4 text-center text-[11px] text-muted-foreground/80",
        className
      )}
    >
      © 2026 Romblon State University · Pageant System v1.0
    </footer>
  );
}
