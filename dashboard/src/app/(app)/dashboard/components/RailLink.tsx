import * as React from "react";
import { cn } from "@/lib/utils";

type RailLinkProps = {
  href?: string;
  title: string;
  meta: string;
  icon?: React.ReactNode;
};

export function RailLink({ href, title, meta, icon }: RailLinkProps) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <p className="truncate text-sm font-medium text-foreground group-hover:text-accent">
          {title}
        </p>
      </div>
      <p className="mt-0.5 truncate font-mono text-2xs text-muted-foreground">
        {meta}
      </p>
    </>
  );

  const className =
    "group block rounded-lg border border-border bg-surface px-3 py-2 transition-colors hover:border-muted-foreground/25 hover:bg-surface-elevated";

  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <button type="button" className={cn(className, "w-full text-left")}>
      {inner}
    </button>
  );
}
