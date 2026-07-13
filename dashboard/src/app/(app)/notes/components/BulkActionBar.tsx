import { FolderPlus, Heart, Sparkles, Tag, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type BulkActionBarProps = {
  count: number;
  onDelete: () => void;
  onClear: () => void;
};

function BulkAction({
  icon,
  label,
  destructive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground",
        destructive && "hover:text-destructive"
      )}
    >
      {icon}
    </button>
  );
}

export function BulkActionBar({ count, onDelete, onClear }: BulkActionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-2.5 shadow-2xl">
        <span className="shrink-0 font-mono text-2xs text-muted-foreground">
          {count} selected
        </span>
        <div className="h-4 w-px bg-border" />
        <BulkAction icon={<FolderPlus className="size-3.5" />} label="Add to collection" />
        <BulkAction icon={<Tag className="size-3.5" />} label="Tag" />
        <BulkAction icon={<Heart className="size-3.5" />} label="Like" />
        <BulkAction icon={<Sparkles className="size-3.5" />} label="Find similar" />
        <div className="h-4 w-px bg-border" />
        <BulkAction
          icon={<Trash2 className="size-3.5" />}
          label="Delete"
          destructive
          onClick={onDelete}
        />
        <button
          onClick={onClear}
          aria-label="Clear selection"
          className="ml-1 flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
