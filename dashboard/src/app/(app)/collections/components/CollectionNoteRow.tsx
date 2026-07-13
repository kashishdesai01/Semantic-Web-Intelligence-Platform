import { ExternalLink, Heart, Trash2 } from "lucide-react";
import { hostFrom, shortDate } from "@/lib/format";
import type { Note } from "@/lib/types";

type CollectionNoteRowProps = {
  note: Note;
  onDelete: () => void;
};

export function CollectionNoteRow({ note, onDelete }: CollectionNoteRowProps) {
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
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <a
          href={note.url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open in new tab"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
        </a>
        <button
          aria-label="Remove from collection"
          onClick={onDelete}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
