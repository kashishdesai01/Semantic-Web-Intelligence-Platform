import * as React from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Tailwind-based page wrapper for redesigned pages. Lives inside the global
 * `.app-shell` (which still provides background orbs + nav). Replaces the
 * legacy `PageShell` page by page during the migration.
 */
export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "relative z-10 mx-auto w-full max-w-5xl font-sans",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
