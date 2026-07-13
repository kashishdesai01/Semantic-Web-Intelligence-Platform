"use client";

import { FolderPlus, Heart, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { IconAction } from "@/components/shared/IconAction";
import { hostFrom, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Collection, Note } from "@/lib/types";

type NoteRowProps = {
  note: Note;
  collections: Collection[];
  addedLabel: string | null;
  onLike: () => void;
  onDelete: () => void;
  onAddTo: (collectionId: number) => void;
};

export function NoteRow({
  note,
  collections,
  addedLabel,
  onLike,
  onDelete,
  onAddTo,
}: NoteRowProps) {
  return (
    <div className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-elevated/40">
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
          {note.liked ? (
            <Heart className="size-3 shrink-0 fill-accent text-accent" />
          ) : null}
          {addedLabel ? (
            <Badge variant="score" className="shrink-0">
              ↳ {addedLabel}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
          {note.summary}
        </p>
        <div className="mt-1.5 flex items-center gap-2 font-mono text-2xs text-muted-foreground">
          <span className="truncate">{note.domain || hostFrom(note.url)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="shrink-0">{shortDate(note.created_at)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <IconAction label={note.liked ? "Unlike" : "Like"} onClick={onLike}>
          <Heart
            className={cn("size-3.5", note.liked && "fill-accent text-accent")}
          />
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
            <DropdownMenuLabel>Add to collection</DropdownMenuLabel>
            <DropdownMenuSeparator />
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
  );
}
