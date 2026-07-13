import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DigestNote } from "@/lib/types";

type Props = {
  note: DigestNote;
};

export function DigestNoteCard({ note }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-muted-foreground/25">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <a
            href={note.url}
            target="_blank"
            rel="noreferrer"
            className="group min-w-0 flex-1"
          >
            <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-accent">
              {note.title}
            </p>
          </a>
          {typeof note.relevance === "number" ? (
            <Badge variant="score" title="Relevance score">
              {note.relevance.toFixed(2)}
            </Badge>
          ) : null}
        </div>

        <div className="mt-0.5 flex items-center gap-1">
          <span className="font-mono text-2xs text-muted-foreground">{note.domain}</span>
          <ExternalLink className="size-2.5 text-muted-foreground/40" />
        </div>

        {note.snippet ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {note.snippet}
          </p>
        ) : null}
      </div>
    </div>
  );
}
