"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  FolderOpen,
  Home,
  MessagesSquare,
  Network,
  Newspaper,
  Hexagon,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Notes", href: "/notes", icon: FileText },
  { label: "Collections", href: "/collections", icon: FolderOpen },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Ask", href: "/ask", icon: MessagesSquare },
  { label: "Digest", href: "/digest", icon: Newspaper },
  { label: "Graph", href: "/graph", icon: Network },
];

export function DashboardSidebar({ onSignOut }: { onSignOut?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface/40">
      {/* Product mark */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex size-7 items-center justify-center rounded-md border border-border bg-surface-elevated">
          <Hexagon className="size-4 text-accent" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-foreground">
            Semantic Intelligence
          </p>
          <p className="truncate font-mono text-2xs text-muted-foreground">
            knowledge base
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-surface-elevated text-foreground"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              {/* Active indicator — the accent's job */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: keyboard hint + sign out */}
      <div className="space-y-1 border-t border-border px-3 py-3">
        <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-xs text-muted-foreground">
          <span>Search</span>
          <kbd className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
            ⌘K
          </kbd>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
