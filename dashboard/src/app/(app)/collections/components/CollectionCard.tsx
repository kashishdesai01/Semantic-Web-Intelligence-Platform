import {
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shortDate } from "@/lib/format";
import type { Collection } from "@/lib/types";

export type CollectionWithMeta = Collection & {
  note_count: number;
  updated_at: string;
  preview_domains: string[];
  preview_titles: string[];
};

type CollectionCardProps = {
  collection: CollectionWithMeta;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export function CollectionCard({
  collection,
  onOpen,
  onRename,
  onDelete,
}: CollectionCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-muted-foreground/25 hover:bg-surface-elevated/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FolderOpen className="size-4 shrink-0 text-accent" />
          <p className="truncate text-sm font-medium text-foreground">
            {collection.name}
          </p>
        </div>

        <div
          className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Collection options"
                className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}>
                <FolderOpen className="size-3.5" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="size-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-2xs text-muted-foreground">
        <span className="text-accent">{collection.note_count}</span>
        <span>notes</span>
        <span className="text-muted-foreground/40">·</span>
        <span>Updated {shortDate(collection.updated_at)}</span>
      </div>

      {collection.preview_domains.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {collection.preview_domains.slice(0, 4).map((d) => (
            <span
              key={d}
              className="inline-flex items-center rounded border border-border bg-surface-elevated/40 px-1.5 py-0.5 font-mono text-2xs text-muted-foreground"
            >
              {d}
            </span>
          ))}
          {collection.preview_domains.length > 4 && (
            <span className="self-center font-mono text-2xs text-muted-foreground/60">
              +{collection.preview_domains.length - 4}
            </span>
          )}
        </div>
      )}

      {collection.preview_titles.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2.5">
          {collection.preview_titles.slice(0, 2).map((t, i) => (
            <p
              key={i}
              className="truncate text-xs leading-relaxed text-muted-foreground"
            >
              {t}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
