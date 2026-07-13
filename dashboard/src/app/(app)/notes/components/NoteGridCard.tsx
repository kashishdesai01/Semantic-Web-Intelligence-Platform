"use client";

import { FolderPlus, Heart, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconAction } from "@/components/shared/IconAction";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/types";
import type { NoteWithMeta } from "../types";

type NoteGridCardProps = {
  note: NoteWithMeta;
  collections: Collection[];
  bulkMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onLike: () => void;
  onDelete: () => void;
  onAddTo: (collectionId: number) => void;
};

export function NoteGridCard({
  note,
  collections,
  bulkMode,
  selected,
  onSelect,
  onLike,
  onDelete,
  onAddTo,
}: NoteGridCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-xl border bg-surface p-4 transition-colors hover:border-muted-foreground/25 hover:bg-surface-elevated/40",
        selected ? "border-accent/30 bg-surface-elevated/60" : "border-border"
      )}
    >
      {bulkMode && (
        <button
          onClick={onSelect}
          aria-label={selected ? "Deselect" : "Select"}
          className="absolute right-3 top-3"
        >
          <div
            className={cn(
              "flex size-4 items-center justify-center rounded border",
              selected
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-surface-elevated"
            )}
          >
            {selected && <span className="block size-2 rounded-sm bg-accent" />}
          </div>
        </button>
      )}

      {note.domain && (
        <span className="inline-flex w-fit items-center rounded-md border border-border px-2 py-0.5 font-mono text-2xs text-muted-foreground">
          {note.domain}
        </span>
      )}

      <a
        href={note.url}
        target="_blank"
        rel="noreferrer"
        className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors hover:text-accent"
      >
        {note.title || "Untitled"}
      </a>

      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {note.summary}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="font-mono text-2xs text-muted-foreground">
          {shortDate(note.created_at)}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <IconAction label={note.liked ? "Unlike" : "Like"} onClick={onLike}>
            <Heart className={cn("size-3.5", note.liked && "fill-accent text-accent")} />
          </IconAction>
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
        {note.liked && (
          <Heart className="size-3 shrink-0 fill-accent text-accent opacity-100 group-hover:hidden" />
        )}
      </div>
    </div>
  );
}
