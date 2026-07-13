"use client";

import { ExternalLink, FolderPlus, Heart, Sparkles, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconAction } from "@/components/shared/IconAction";
import { hostFrom, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/types";
import type { NoteWithMeta } from "../types";

type NoteRowProps = {
  note: NoteWithMeta;
  allNotes: NoteWithMeta[];
  collections: Collection[];
  bulkMode: boolean;
  selected: boolean;
  similarOpen: boolean;
  onSelect: () => void;
  onLike: () => void;
  onDelete: () => void;
  onAddTo: (collectionId: number) => void;
  onFindSimilar: () => void;
};

export function NoteRow({
  note,
  allNotes,
  collections,
  bulkMode,
  selected,
  similarOpen,
  onSelect,
  onLike,
  onDelete,
  onAddTo,
  onFindSimilar,
}: NoteRowProps) {
  return (
    <div>
      <div
        className={cn(
          "group flex items-start gap-3 px-4 py-3 transition-colors",
          selected ? "bg-surface-elevated/60" : "hover:bg-surface-elevated/40"
        )}
      >
        {bulkMode && (
          <button
            onClick={onSelect}
            aria-label={selected ? "Deselect note" : "Select note"}
            className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <div
              className={cn(
                "flex size-4 items-center justify-center rounded border",
                selected
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border"
              )}
            >
              {selected && <span className="block size-2 rounded-sm bg-accent" />}
            </div>
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={note.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium text-foreground transition-colors hover:text-accent"
            >
              {note.title || "Untitled"}
            </a>
            {note.liked && (
              <Heart className="size-3 shrink-0 fill-accent text-accent" />
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {note.summary}
          </p>
          <div className="mt-1.5 flex items-center gap-2 font-mono text-2xs text-muted-foreground">
            <span className="truncate">{note.domain ?? hostFrom(note.url)}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="shrink-0">{shortDate(note.created_at)}</span>
            {note.read_count > 0 && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="shrink-0">{note.read_count} reads</span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <IconAction label={note.liked ? "Unlike" : "Like"} onClick={onLike}>
            <Heart className={cn("size-3.5", note.liked && "fill-accent text-accent")} />
          </IconAction>
          <IconAction label="Find similar" onClick={onFindSimilar}>
            <Sparkles className={cn("size-3.5", similarOpen && "text-accent")} />
          </IconAction>
          <a
            href={note.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in new tab"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Add to collection"
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                <FolderPlus className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {collections.length === 0 ? (
                <DropdownMenuItem disabled>No collections yet</DropdownMenuItem>
              ) : (
                collections.map((c) => (
                  <DropdownMenuItem key={c.id} onClick={() => onAddTo(c.id)}>
                    {c.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <IconAction label="Delete" onClick={onDelete} destructive>
            <Trash2 className="size-3.5" />
          </IconAction>
        </div>
      </div>

      {similarOpen && note.similar_ids.length > 0 && (
        <div className="border-t border-border bg-surface-elevated/30 px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles className="size-3 text-accent" />
            <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
              Semantically similar
            </span>
          </div>
          <div className="space-y-2">
            {note.similar_ids.map(({ id, score }) => {
              const similar = allNotes.find((n) => n.id === id);
              if (!similar) return null;
              return (
                <div key={id} className="flex items-start gap-3">
                  <a
                    href={similar.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-foreground transition-colors hover:text-accent"
                  >
                    {similar.title || "Untitled"}
                  </a>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-2xs text-muted-foreground">
                      {similar.domain ?? hostFrom(similar.url)}
                    </span>
                    <span className="rounded border border-accent/20 px-1.5 py-0.5 font-mono text-2xs text-accent">
                      {Math.round(score * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
