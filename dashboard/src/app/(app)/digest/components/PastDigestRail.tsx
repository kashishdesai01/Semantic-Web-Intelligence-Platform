import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { cn } from "@/lib/utils";
import type { PastDigest } from "@/lib/types";

type Props = {
  digests: PastDigest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function PastDigestRail({ digests, selectedId, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <SectionHeader title="Past digests" />

      {digests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No past digests yet.</p>
      ) : (
        <div className="space-y-px">
          {digests.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={cn(
                "w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-elevated",
                selectedId === d.id && "bg-surface-elevated"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-2xs text-muted-foreground">{d.weekRange}</span>
                <span className="font-mono text-2xs text-muted-foreground/60">{d.noteCount}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {d.summary}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
        >
          <Mail className="size-3.5" />
          Email me weekly
        </Button>
      </div>
    </div>
  );
}
