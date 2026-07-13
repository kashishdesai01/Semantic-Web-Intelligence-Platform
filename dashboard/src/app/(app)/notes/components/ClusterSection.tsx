import { Sparkles } from "lucide-react";
import { NoteRow } from "./NoteRow";
import { CLUSTER_DESCRIPTIONS } from "../types";
import type { Collection } from "@/lib/types";
import type { NoteWithMeta } from "../types";

type ClusterSectionProps = {
  name: string;
  clusterNotes: NoteWithMeta[];
  allNotes: NoteWithMeta[];
  collections: Collection[];
  bulkMode: boolean;
  selectedIds: Set<number>;
  expandedSimilar: number | null;
  onSelect: (id: number) => void;
  onLike: (note: NoteWithMeta) => void;
  onDelete: (id: number) => void;
  onAddTo: (noteId: number, collectionId: number) => void;
  onFindSimilar: (id: number) => void;
};

export function ClusterSection({
  name,
  clusterNotes,
  allNotes,
  collections,
  bulkMode,
  selectedIds,
  expandedSimilar,
  onSelect,
  onLike,
  onDelete,
  onAddTo,
  onFindSimilar,
}: ClusterSectionProps) {
  const description = CLUSTER_DESCRIPTIONS[name];

  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-sm font-medium text-foreground">{name}</h2>
        <span className="font-mono text-2xs text-muted-foreground">
          {clusterNotes.length}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
          <Sparkles className="size-2.5 text-accent" />
          auto-grouped
        </span>
        {description && (
          <span className="hidden truncate text-xs text-muted-foreground lg:block">
            {description}
          </span>
        )}
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {clusterNotes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            allNotes={allNotes}
            collections={collections}
            bulkMode={bulkMode}
            selected={selectedIds.has(note.id)}
            similarOpen={expandedSimilar === note.id}
            onSelect={() => onSelect(note.id)}
            onLike={() => onLike(note)}
            onDelete={() => onDelete(note.id)}
            onAddTo={(cid) => onAddTo(note.id, cid)}
            onFindSimilar={() => onFindSimilar(note.id)}
          />
        ))}
      </div>
    </div>
  );
}
