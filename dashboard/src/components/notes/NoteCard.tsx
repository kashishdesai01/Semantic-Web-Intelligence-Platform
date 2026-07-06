import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";

type NoteCardProps = {
  note: Note;
  /** Extra badges rendered after the domain/liked badges. */
  badges?: React.ReactNode;
  /** Action buttons rendered in the footer row. */
  actions?: React.ReactNode;
  /** Extra content (e.g. an inline picker) rendered below the actions. */
  children?: React.ReactNode;
  showInsights?: boolean;
  className?: string;
};

export function NoteCard({
  note,
  badges,
  actions,
  children,
  showInsights = false,
  className,
}: NoteCardProps) {
  const insights = note.key_insights ?? [];
  return (
    <Card className={cn("gap-3 p-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {note.domain ? (
          <Badge variant="secondary" className="font-normal">
            {note.domain}
          </Badge>
        ) : null}
        {note.liked ? <Badge variant="outline">Liked</Badge> : null}
        {badges}
      </div>

      <p className="text-sm leading-relaxed text-foreground/90">
        {note.summary}
      </p>

      {showInsights && insights.length > 0 ? (
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          {insights.slice(0, 4).map((insight, i) => (
            <li key={i}>{insight}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">
          {note.title || "Untitled"}
        </span>
        <span>{new Date(note.created_at).toLocaleString()}</span>
        <a
          href={note.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
        >
          Open <ExternalLink className="size-3" />
        </a>
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>
      ) : null}
      {children}
    </Card>
  );
}
