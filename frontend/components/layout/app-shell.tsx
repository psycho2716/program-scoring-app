"use client";

import Link from "next/link";
import { RsuLogo } from "@/components/brand/rsu-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { cn } from "@/lib/utils";
import type { AppShellProps } from "@/types";

export function AppShell({
  brandLabel,
  brandTitle,
  brandSubtitle,
  brandHref,
  navItems,
  activeNav,
  centerSlot,
  rightSlot,
  children,
  className,
  contentClassName,
  hideFooter = false,
  bottomSlot,
}: AppShellProps) {
  const brandBlock = (
    <div className="flex min-w-0 items-center gap-3">
      <RsuLogo size="sm" />
      <div className="min-w-0">
        {brandSubtitle ? (
          <>
            <h1 className="truncate text-base font-bold uppercase tracking-wide text-white md:text-lg">
              {brandTitle}
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rsu-teal">
              {brandSubtitle}
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rsu-gold">
              {brandLabel}
            </p>
            <h1 className="truncate text-lg font-bold uppercase tracking-wide text-rsu-teal md:text-xl">
              {brandTitle}
            </h1>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      <header className="border-b border-white/10 bg-[#0a1520]/90 backdrop-blur-md">
        <div
          className={cn(
            "mx-auto grid max-w-[1600px] items-center gap-3 px-4 py-3 md:px-6",
            centerSlot
              ? "grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.1fr)]"
              : "grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto]"
          )}
        >
          {brandHref ? <Link href={brandHref}>{brandBlock}</Link> : brandBlock}

          {centerSlot && (
            <div className="flex justify-center md:px-4">{centerSlot}</div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-4 md:gap-5">
            <nav className="flex items-center gap-5">
              {navItems.map((item) => {
                const active = item.key === activeNav;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition",
                      active ? "text-white" : "text-muted-foreground hover:text-zinc-200"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {rightSlot}
          </div>
        </div>
      </header>

      <div className={cn("mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 md:px-6", contentClassName)}>
        {children}
      </div>

      {bottomSlot}
      {!hideFooter && <AppFooter />}
    </div>
  );
}
