import { Sparkles } from "lucide-react";
import type { DigestSectionData } from "@/lib/types";
import { DigestNoteCard } from "./DigestNoteCard";

type Props = {
  section: DigestSectionData;
};

export function DigestSectionBlock({ section }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h3 className="text-sm font-medium text-foreground">{section.cluster}</h3>
        <span className="font-mono text-2xs text-muted-foreground">{section.noteCount}</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
          <Sparkles className="size-2.5 text-accent" />
          auto-grouped
        </span>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{section.synthesis}</p>

      <div className="space-y-2">
        {section.notes.map((note) => (
          <DigestNoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}
