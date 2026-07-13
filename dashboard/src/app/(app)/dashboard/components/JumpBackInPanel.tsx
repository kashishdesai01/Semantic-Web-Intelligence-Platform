import { FolderOpen, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { RailLink } from "./RailLink";
import { hostFrom, shortDate } from "@/lib/format";
import type { Collection, Note } from "@/lib/types";

type JumpBackInPanelProps = {
  loading: boolean;
  pinned: Note[];
  collections: Collection[];
};

export function JumpBackInPanel({
  loading,
  pinned,
  collections,
}: JumpBackInPanelProps) {
  return (
    <div>
      <SectionHeader title="Jump back in" />
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : pinned.length > 0 ? (
        <div className="space-y-2">
          {pinned.map((note) => (
            <RailLink
              key={note.id}
              href={note.url}
              title={note.title || "Untitled"}
              meta={note.domain || hostFrom(note.url)}
              icon={<Heart className="size-3 fill-accent text-accent" />}
            />
          ))}
        </div>
      ) : collections.length > 0 ? (
        <div className="space-y-2">
          {collections.slice(0, 4).map((c) => (
            <RailLink
              key={c.id}
              title={c.name}
              meta={`Created ${shortDate(c.created_at)}`}
              icon={<FolderOpen className="size-3 text-muted-foreground" />}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Like a note to pin it here.
          </p>
        </div>
      )}
    </div>
  );
}
