import { FolderPlus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SuggestedCollection = {
  id: string;
  name: string;
  note_count: number;
  example_titles: string[];
};

type SuggestedCardProps = {
  suggestion: SuggestedCollection;
  onAccept: () => void;
  onDismiss: () => void;
};

export function SuggestedCard({
  suggestion,
  onAccept,
  onDismiss,
}: SuggestedCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent/15 bg-accent/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-md border border-accent/20 bg-surface px-2 py-0.5 font-mono text-2xs text-accent">
          <Sparkles className="size-2.5" />
          Suggested
        </span>
        <button
          onClick={onDismiss}
          aria-label="Dismiss suggestion"
          className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">{suggestion.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {suggestion.note_count} notes clustered by semantic similarity — create
          a collection?
        </p>
      </div>

      <div className="space-y-0.5">
        {suggestion.example_titles.slice(0, 2).map((t, i) => (
          <p
            key={i}
            className="truncate text-xs leading-relaxed text-muted-foreground/70"
          >
            · {t}
          </p>
        ))}
      </div>

      <Button
        size="sm"
        variant="accent"
        className="mt-auto w-full"
        onClick={onAccept}
      >
        <FolderPlus className="size-3.5" />
        Create collection
      </Button>
    </div>
  );
}
