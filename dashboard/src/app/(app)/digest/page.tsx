"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { pollJob } from "@/lib/jobs";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { DemoToggle } from "@/components/shared/DemoToggle";
import { toast } from "@/hooks/use-toast";
import {
  DEMO_DIGEST_FULL,
  DEMO_PAST_DIGESTS,
  DEMO_WEEK_STATS,
  DEMO_CLUSTERS,
} from "@/lib/demo";
import type { DigestFull, PastDigest, WeekStats, ClusterPreview } from "@/lib/types";
import { DigestIdleState } from "./components/DigestIdleState";
import { DigestBriefing } from "./components/DigestBriefing";
import { DigestSkeleton } from "./components/DigestSkeleton";
import { PastDigestRail } from "./components/PastDigestRail";

const EMPTY_STATS: WeekStats = { notesThisWeek: 0, topicsCount: 0, sourceCount: 0 };
const EMPTY_CLUSTERS: ClusterPreview[] = [];

type Phase = "idle" | "loading" | "generated";

/** Accepts both the new DigestFull shape and the legacy {summary, themes} shape. */
function normalizeDigest(raw: any): DigestFull {
  if (raw?.sections) return raw as DigestFull;

  // Legacy API format: { summary, themes: [{title, summary, note_ids}] }
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return {
    weekRange: weekLabel,
    generatedAt: now.toISOString(),
    overview: raw?.summary ?? "",
    sections: (raw?.themes ?? []).map((t: any) => ({
      cluster: t.title ?? "Untitled",
      noteCount: t.note_ids?.length ?? 0,
      synthesis: t.summary ?? "",
      notes: [],
    })),
  };
}

export default function DigestPage() {
  useRequireAuth();

  const [demo, setDemo] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [digest, setDigest] = useState<DigestFull | null>(null);
  const [pastDigests, setPastDigests] = useState<PastDigest[]>([]);
  const [selectedPastId, setSelectedPastId] = useState<string | null>(null);
  const pollCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { pollCancelRef.current?.(); }, []);

  useEffect(() => {
    const isDemo =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1";
    if (isDemo) enableDemo();
  }, []);

  function enableDemo() {
    setDemo(true);
    setPhase("idle");
    setDigest(null);
    setPastDigests(DEMO_PAST_DIGESTS);
    setSelectedPastId(null);
  }

  function disableDemo() {
    setDemo(false);
    setPhase("idle");
    setDigest(null);
    setPastDigests([]);
    setSelectedPastId(null);
  }

  async function generate() {
    setPhase("loading");
    pollCancelRef.current?.();

    if (demo) {
      await new Promise((r) => setTimeout(r, 900));
      setDigest(DEMO_DIGEST_FULL);
      setPhase("generated");
      return;
    }

    try {
      const res = await apiFetch<any>("/api/digest/weekly");
      if (res?.status === "queued" && res.job_id) {
        pollCancelRef.current = pollJob<any>(
          apiFetch,
          res.job_id,
          (result) => { setDigest(normalizeDigest(result)); setPhase("generated"); },
          (msg) => { toast.error(msg); setPhase("idle"); }
        );
      } else {
        setDigest(normalizeDigest(res));
        setPhase("generated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate digest");
      setPhase("idle");
    }
  }

  function selectPastDigest(id: string) {
    setSelectedPastId(id);
    if (demo) {
      setDigest(DEMO_DIGEST_FULL);
      setPhase("generated");
    }
  }

  const activeStats = demo ? DEMO_WEEK_STATS : EMPTY_STATS;
  const activeClusters = demo ? DEMO_CLUSTERS : EMPTY_CLUSTERS;
  const activePast = demo ? DEMO_PAST_DIGESTS : pastDigests;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-12">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Digest</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A synthesized briefing of what you saved and read this week.
          </p>
        </div>
        <DemoToggle active={demo} onToggle={() => (demo ? disableDemo() : enableDemo())} />
      </div>

      {/* Two-column layout */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        {/* Main column */}
        <div className="min-w-0">
          {phase === "idle" ? (
            <DigestIdleState
              weekStats={activeStats}
              clusters={activeClusters}
              loading={false}
              onGenerate={generate}
            />
          ) : phase === "loading" ? (
            <DigestSkeleton />
          ) : digest ? (
            <DigestBriefing digest={digest} />
          ) : null}
        </div>

        {/* Right rail */}
        <aside>
          <PastDigestRail
            digests={activePast}
            selectedId={selectedPastId}
            onSelect={selectPastDigest}
          />
        </aside>
      </div>
    </div>
  );
}
