import { cn } from "@/lib/utils";

type DemoToggleProps = {
  active: boolean;
  onToggle: () => void;
};

export function DemoToggle({ active, onToggle }: DemoToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-2xs uppercase tracking-wider transition-colors",
        active
          ? "border-accent/30 text-accent"
          : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-accent" : "bg-muted-foreground/50"
        )}
      />
      Demo data
    </button>
  );
}
