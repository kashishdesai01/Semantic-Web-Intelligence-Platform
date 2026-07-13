import { cn } from "@/lib/utils";

type ScopeChipProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  /** When true and active, renders in accent colour instead of surface-elevated. */
  accent?: boolean;
};

export function ScopeChip({ active, onClick, label, accent }: ScopeChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs transition-colors",
        active
          ? accent
            ? "border-accent/30 text-accent"
            : "border-border bg-surface-elevated text-foreground"
          : "border-transparent text-muted-foreground hover:bg-surface hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
