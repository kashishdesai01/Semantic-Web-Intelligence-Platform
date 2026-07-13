"use client";

import { useEffect, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";
import { Maximize2, Minus, Plus, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { pollJob } from "@/lib/jobs";
import { DemoToggle } from "@/components/shared/DemoToggle";
import {
  DEMO_GRAPH_EDGES,
  DEMO_GRAPH_NODES,
  type DemoGraphNode,
  type DemoGraphEdge,
} from "@/lib/demo";
import { useRequireAuth } from "@/lib/useRequireAuth";

// ── Cluster palette — intentional muted tokens, not a rainbow ────────────────
// Known demo clusters get fixed colors; real API clusters get colours from a
// rotating muted palette so they always look intentional rather than random.
const KNOWN_COLORS: Record<string, string> = {
  "LLM Inference":    "#6ee7b7",  // accent mint
  "Vector Databases": "#7dd3fc",  // ice blue
  "Systems Design":   "#94a3b8",  // slate
  "Rust":             "#fbbf24",  // amber
  "Startups":         "#c084fc",  // muted violet
  // Old entity-based API types
  concept:            "#6ee7b7",
  person:             "#7dd3fc",
  org:                "#fbbf24",
  place:              "#94a3b8",
};
const FALLBACK_PALETTE = [
  "#6ee7b7", "#7dd3fc", "#94a3b8", "#fbbf24",
  "#c084fc", "#f9a8d4", "#86efac", "#93c5fd",
];
const colorCache: Record<string, string> = {};
let paletteIdx = 0;

function clusterColor(cluster: string): string {
  if (KNOWN_COLORS[cluster]) return KNOWN_COLORS[cluster];
  if (colorCache[cluster]) return colorCache[cluster];
  const c = FALLBACK_PALETTE[paletteIdx % FALLBACK_PALETTE.length];
  paletteIdx++;
  colorCache[cluster] = c;
  return c;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const NODE_R_MIN  = 5;
const NODE_R_MAX  = 15;
const ACCENT_HEX  = "#6ee7b7";

// ── Types ─────────────────────────────────────────────────────────────────────
type GraphData = { nodes: DemoGraphNode[]; edges: DemoGraphEdge[] };
type Phase     = "idle" | "loading" | "computing" | "ready" | "error";

type SimNode = DemoGraphNode & {
  r: number; x: number; y: number; vx: number; vy: number;
};
type SimEdge    = { source: SimNode; target: SimNode; similarity: number };
type Connection = { node: SimNode; similarity: number };

// ── Normalise old API format → GraphData ──────────────────────────────────────
function normalizeApiResponse(res: any): GraphData | null {
  if (!res?.nodes?.length) return null;
  return {
    nodes: (res.nodes as any[]).map((n) => ({
      id:      String(n.id ?? n.note_id ?? Math.random()),
      label:   n.label ?? n.title ?? "Untitled",
      cluster: n.cluster ?? n.type ?? "Note",
      domain:  n.domain ?? "",
      summary: n.summary ?? "",
    })),
    edges: (res.edges as any[]).map((e) => ({
      source:     typeof e.source === "string" ? e.source : String(e.source?.id ?? e.source),
      target:     typeof e.target === "string" ? e.target : String(e.target?.id ?? e.target),
      similarity: e.similarity ?? e.weight ?? 0.5,
    })),
  };
}

// Hex → [r, g, b] for canvas rgba()
function hexRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GraphPage() {
  useRequireAuth();

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Mutable rendering state (no re-renders needed) ───────────────────────
  const simNodesRef    = useRef<SimNode[]>([]);
  const simEdgesRef    = useRef<SimEdge[]>([]);
  const transformRef   = useRef({ x: 0, y: 0, k: 1 });
  const dragRef        = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const mouseDownPos   = useRef({ x: 0, y: 0 });
  const hoveredRef     = useRef<SimNode | null>(null);
  const neighborIdsRef = useRef<Set<string>>(new Set());
  const selectedRef    = useRef<SimNode | null>(null);
  const searchRef      = useRef("");
  const filterRef      = useRef<string | null>(null);
  const drawRef        = useRef<(() => void) | null>(null);
  const rafRef         = useRef(0);
  const simRef         = useRef<ReturnType<typeof forceSimulation> | null>(null);
  const pollCancelRef  = useRef<(() => void) | null>(null);

  // ── React state ───────────────────────────────────────────────────────────
  const [demo, setDemo]               = useState(false);
  const [graphData, setGraphData]     = useState<GraphData | null>(null);
  const [phase, setPhase]             = useState<Phase>("idle");
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [selected, setSelected]       = useState<SimNode | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [search, setSearch]           = useState("");
  const [filterCluster, setFilterCluster] = useState<string | null>(null);

  // Sync to refs so canvas draw() reads fresh values without stale closures
  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { filterRef.current = filterCluster; }, [filterCluster]);

  // Cancel any in-flight poll on unmount
  useEffect(() => () => { pollCancelRef.current?.(); }, []);

  // Redraw when search or filter changes
  useEffect(() => {
    if (drawRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawRef.current);
    }
  }, [search, filterCluster]);

  // ── Data loading ──────────────────────────────────────────────────────────
  // Auto-load real graph on mount
  useEffect(() => { loadReal(); }, []); // eslint-disable-line

  async function loadReal() {
    pollCancelRef.current?.();
    setPhase("loading");
    setErrorMsg(null);
    try {
      const res = await apiFetch<any>("/api/graph");
      if (res?.status === "queued" && res.job_id) {
        pollCancelRef.current = pollJob<any>(
          apiFetch,
          res.job_id,
          (result) => {
            const data = normalizeApiResponse(result);
            if (data) { setGraphData(data); setPhase("computing"); }
            else setPhase("idle");
          },
          (msg) => { setErrorMsg(msg); setPhase("error"); },
        );
      } else {
        const data = normalizeApiResponse(res);
        if (data) { setGraphData(data); setPhase("computing"); }
        else setPhase("idle");
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? "Failed to load graph");
      setPhase("error");
    }
  }

  function enableDemo() {
    pollCancelRef.current?.();
    setDemo(true);
    setGraphData({ nodes: DEMO_GRAPH_NODES, edges: DEMO_GRAPH_EDGES });
    setPhase("computing");
    resetInspector();
  }

  function disableDemo() {
    setDemo(false);
    setGraphData(null);
    resetInspector();
    loadReal();
  }

  function resetInspector() {
    selectedRef.current = null;
    setSelected(null);
    setConnections([]);
    setSearch("");
    setFilterCluster(null);
  }

  // ── Simulation + canvas — re-initialised whenever graphData changes ────────
  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !graphData) return;

    const dpr     = window.devicePixelRatio || 1;
    const { nodes: rawNodes, edges: rawEdges } = graphData;

    // Degree map → node radii
    const deg: Record<string, number> = {};
    rawEdges.forEach((e) => {
      deg[e.source] = (deg[e.source] ?? 0) + 1;
      deg[e.target] = (deg[e.target] ?? 0) + 1;
    });
    const maxDeg = Math.max(1, ...Object.values(deg));

    // Unique clusters for angle seeding
    const clusters  = [...new Set(rawNodes.map((n) => n.cluster))];
    const W  = container.clientWidth;
    const H  = container.clientHeight;
    const cx = W / 2, cy = H / 2;
    const cr = Math.min(W, H) * 0.27;

    const nodes: SimNode[] = rawNodes.map((n) => {
      const ki  = clusters.indexOf(n.cluster);
      const ang = ki >= 0 ? (2 * Math.PI * ki) / clusters.length : 0;
      const d   = deg[n.id] ?? 1;
      const r   = NODE_R_MIN + (d / maxDeg) * (NODE_R_MAX - NODE_R_MIN);
      return {
        ...n, r,
        x: cx + Math.cos(ang) * cr + (Math.random() - 0.5) * 90,
        y: cy + Math.sin(ang) * cr + (Math.random() - 0.5) * 90,
        vx: 0, vy: 0,
      };
    });

    const idMap: Record<string, SimNode> = {};
    nodes.forEach((n) => (idMap[n.id] = n));

    const edges: SimEdge[] = rawEdges
      .map((e) => ({ source: idMap[e.source], target: idMap[e.target], similarity: e.similarity }))
      .filter((e) => e.source && e.target);

    simNodesRef.current = nodes;
    simEdgesRef.current = edges;

    // Reset canvas
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Reset transform and selection for this dataset
    transformRef.current = { x: 0, y: 0, k: 1 };
    hoveredRef.current     = null;
    neighborIdsRef.current = new Set();

    // ── Draw ─────────────────────────────────────────────────────────────
    function draw() {
      const W2 = canvas!.width / dpr;
      const H2 = canvas!.height / dpr;
      ctx.clearRect(0, 0, W2, H2);

      const { x: tx, y: ty, k } = transformRef.current;
      const hovered     = hoveredRef.current;
      const selNode     = selectedRef.current;
      const neighborIds = neighborIdsRef.current;
      const sq = searchRef.current.toLowerCase();
      const fc = filterRef.current;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(k, k);

      // Edges
      simEdgesRef.current.forEach((edge) => {
        const src = edge.source, tgt = edge.target;
        if (src.x == null || tgt.x == null) return;

        const srcMatch = (!fc || src.cluster === fc) && (!sq || src.label.toLowerCase().includes(sq));
        const tgtMatch = (!fc || tgt.cluster === fc) && (!sq || tgt.label.toLowerCase().includes(sq));

        let opacity: number;
        if (hovered) {
          const both = neighborIds.has(src.id) && neighborIds.has(tgt.id);
          opacity = both ? 0.22 + edge.similarity * 0.58 : 0.05;
        } else if (fc || sq) {
          opacity = srcMatch && tgtMatch ? 0.18 + edge.similarity * 0.45 : 0.04;
        } else {
          opacity = 0.08 + edge.similarity * 0.32;
        }

        const strong = edge.similarity > 0.72;
        ctx.strokeStyle = strong
          ? `rgba(110,231,183,${opacity})`
          : `rgba(138,138,148,${opacity * 0.75})`;
        ctx.lineWidth = 0.4 + edge.similarity * 2;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();
      });

      // Nodes
      simNodesRef.current.forEach((node) => {
        if (node.x == null) return;
        const isSelected = selNode?.id === node.id;
        const isHovered  = hovered?.id === node.id;
        const isNeighbor = hovered ? neighborIds.has(node.id) : false;
        const matchSearch = !sq || node.label.toLowerCase().includes(sq);
        const matchFilter = !fc  || node.cluster === fc;

        let opacity: number;
        if (hovered) {
          opacity = isHovered || isNeighbor ? 1 : 0.13;
        } else if (fc || sq) {
          opacity = matchSearch && matchFilter ? 1 : 0.13;
        } else {
          opacity = 0.88;
        }

        const cc = clusterColor(node.cluster);
        const [cr2, cg, cb] = hexRgb(cc);

        if (isSelected || isHovered) {
          ctx.shadowColor = ACCENT_HEX;
          ctx.shadowBlur  = isSelected ? 18 : 11;
        }
        ctx.fillStyle = `rgba(${cr2},${cg},${cb},${opacity})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.shadowColor = "transparent";

        if (isSelected) {
          ctx.strokeStyle = `rgba(110,231,183,0.88)`;
          ctx.lineWidth   = 2 / k;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r + 4 / k, 0, Math.PI * 2);
          ctx.stroke();
        }

        const showLabel = isHovered || isSelected || (k > 1.35 && node.r > 7);
        if (showLabel) {
          const fs = Math.max(7, Math.round(10 / k));
          ctx.font      = `${fs}px ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillStyle = `rgba(237,237,239,${Math.min(opacity, 0.92)})`;
          const lbl = node.label.length > 22 ? node.label.slice(0, 20) + "…" : node.label;
          ctx.fillText(lbl, node.x, node.y + node.r + Math.max(9, 12 / k));
        }
      });

      ctx.restore();
    }

    drawRef.current = draw;

    // ── Interaction helpers ───────────────────────────────────────────────
    function toGraph(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      const { x, y, k } = transformRef.current;
      return { gx: (clientX - rect.left - x) / k, gy: (clientY - rect.top - y) / k };
    }

    function hitTest(gx: number, gy: number): SimNode | null {
      let hit: SimNode | null = null, minDist = Infinity;
      simNodesRef.current.forEach((n) => {
        const dist = Math.hypot(n.x - gx, n.y - gy);
        if (dist < n.r + 5 && dist < minDist) { minDist = dist; hit = n; }
      });
      return hit;
    }

    function getNeighborIds(node: SimNode): Set<string> {
      const ids = new Set<string>([node.id]);
      simEdgesRef.current.forEach((e) => {
        if (e.source.id === node.id) ids.add(e.target.id);
        if (e.target.id === node.id) ids.add(e.source.id);
      });
      return ids;
    }

    function selectNode(node: SimNode) {
      selectedRef.current = node;
      setSelected(node);
      const conns = simEdgesRef.current
        .filter((e) => e.source.id === node.id || e.target.id === node.id)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 6)
        .map((e) => ({ node: e.source.id === node.id ? e.target : e.source, similarity: e.similarity }));
      setConnections(conns);
    }

    // ── Mouse events ──────────────────────────────────────────────────────
    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;

      if (dragRef.current.active) {
        transformRef.current = {
          x: dragRef.current.ox + (mx - dragRef.current.sx),
          y: dragRef.current.oy + (my - dragRef.current.sy),
          k: transformRef.current.k,
        };
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const { gx, gy } = toGraph(e.clientX, e.clientY);
      const hit = hitTest(gx, gy);
      if (hit?.id !== hoveredRef.current?.id) {
        hoveredRef.current     = hit;
        neighborIdsRef.current = hit ? getNeighborIds(hit) : new Set();
        canvas!.style.cursor   = hit ? "pointer" : "grab";
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(draw);
      }
    }

    function handleMouseDown(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      mouseDownPos.current = { x: mx, y: my };

      const { gx, gy } = toGraph(e.clientX, e.clientY);
      const hit = hitTest(gx, gy);
      if (hit) {
        selectNode(hit);
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      dragRef.current = { active: true, sx: mx, sy: my, ox: transformRef.current.x, oy: transformRef.current.y };
      canvas!.style.cursor = "grabbing";
    }

    function handleMouseUp(e: MouseEvent) {
      if (dragRef.current.active) {
        const rect = canvas!.getBoundingClientRect();
        const moved = Math.hypot(e.clientX - rect.left - mouseDownPos.current.x, e.clientY - rect.top - mouseDownPos.current.y);
        if (moved < 5) {
          selectedRef.current = null;
          setSelected(null);
          setConnections([]);
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(draw);
        }
      }
      dragRef.current.active = false;
      canvas!.style.cursor = hoveredRef.current ? "pointer" : "grab";
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const { x, y, k } = transformRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      const newK   = Math.max(0.25, Math.min(4, k * factor));
      transformRef.current = {
        x: mx - (mx - x) * (newK / k),
        y: my - (my - y) * (newK / k),
        k: newK,
      };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    }

    canvas.addEventListener("mousemove",  handleMouseMove);
    canvas.addEventListener("mousedown",  handleMouseDown);
    canvas.addEventListener("wheel",      handleWheel, { passive: false });
    window.addEventListener("mouseup",    handleMouseUp);
    canvas.style.cursor = "grab";

    // ── D3 simulation ─────────────────────────────────────────────────────
    // Call .stop() immediately so the sim doesn't auto-start — we pre-tick
    // synchronously first so the graph appears settled on the first paint.
    const sim = forceSimulation(nodes as any)
      .force(
        "link",
        forceLink(edges as any)
          .id((d: any) => d.id)
          .distance((l: any) => 38 + (1 - l.similarity) * 130)
          .strength((l: any) => 0.3 + l.similarity * 0.5),
      )
      .force("charge",  forceManyBody().strength(-210).distanceMax(380))
      .force("center",  forceCenter(W / 2, H / 2).strength(0.06))
      .force("collide", forceCollide((d: any) => d.r + 3))
      .alphaDecay(0.032)
      .velocityDecay(0.4)
      .stop();

    simRef.current = sim;

    // Pre-settle 150 ticks synchronously (< 5 ms for this graph size).
    // No tick listener registered yet → no canvas redraws during this loop.
    sim.tick(150);
    setPhase("ready");
    requestAnimationFrame(draw);

    // Restart with a small residual alpha so nodes do a brief micro-adjustment
    // rather than replaying the full settle from scratch.
    sim.on("tick", () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    });
    sim.alpha(0.08).alphaDecay(0.06).restart();

    return () => {
      sim.stop();
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousemove",  handleMouseMove);
      canvas.removeEventListener("mousedown",  handleMouseDown);
      canvas.removeEventListener("wheel",      handleWheel);
      window.removeEventListener("mouseup",    handleMouseUp);
    };
  }, [graphData]); // eslint-disable-line

  // ── Zoom / layout controls ────────────────────────────────────────────────
  function zoom(factor: number) {
    const container = containerRef.current;
    if (!container) return;
    const { x, y, k } = transformRef.current;
    const cx = container.clientWidth / 2, cy = container.clientHeight / 2;
    const newK = Math.max(0.25, Math.min(4, k * factor));
    transformRef.current = { x: cx - (cx - x) * (newK / k), y: cy - (cy - y) * (newK / k), k: newK };
    if (drawRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(drawRef.current); }
  }

  function resetView() {
    transformRef.current = { x: 0, y: 0, k: 1 };
    if (drawRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(drawRef.current); }
  }

  function refreshLayout() {
    const container = containerRef.current;
    if (!container || !simRef.current || !graphData) return;
    const W = container.clientWidth, H = container.clientHeight;
    const cx = W / 2, cy = H / 2;
    const clusters = [...new Set(graphData.nodes.map((n) => n.cluster))];
    const cr = Math.min(W, H) * 0.27;
    simNodesRef.current.forEach((n) => {
      const ki  = clusters.indexOf(n.cluster);
      const ang = ki >= 0 ? (2 * Math.PI * ki) / clusters.length : 0;
      n.x = cx + Math.cos(ang) * cr + (Math.random() - 0.5) * 90;
      n.y = cy + Math.sin(ang) * cr + (Math.random() - 0.5) * 90;
      n.vx = n.vy = 0;
    });
    simRef.current.stop();
    simRef.current.tick(120);
    if (drawRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(drawRef.current); }
    simRef.current.alpha(0.08).alphaDecay(0.06).restart();
  }

  function navigateTo(node: SimNode) {
    selectedRef.current = node;
    setSelected(node);
    const conns = simEdgesRef.current
      .filter((e) => e.source.id === node.id || e.target.id === node.id)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6)
      .map((e) => ({ node: e.source.id === node.id ? e.target : e.source, similarity: e.similarity }));
    setConnections(conns);
    if (drawRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(drawRef.current); }
  }

  // Clusters present in the current graph (for legend + filter)
  const activeClusters = graphData
    ? [...new Set(graphData.nodes.map((n) => n.cluster))]
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-end justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Knowledge Graph
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Semantic connections across your notes — clustered by topic.
          </p>
        </div>
        <DemoToggle active={demo} onToggle={() => (demo ? disableDemo() : enableDemo())} />
      </div>

      {/* ── Canvas + Inspector ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Graph area ── */}
        <div
          ref={containerRef}
          className="relative min-w-0 flex-1 overflow-hidden bg-background"
        >
          {/* Canvas is always mounted so the ref is stable; hidden when no data */}
          <canvas
            ref={canvasRef}
            className={cn("absolute inset-0", !graphData && "pointer-events-none opacity-0")}
          />

          {/* ── Full-area states (shown when no graph data) ── */}
          {phase === "idle" && !graphData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full border border-border bg-surface">
                <svg className="size-5 text-muted-foreground" viewBox="0 0 24 24" fill="none">
                  <circle cx="5"  cy="5"  r="3" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="19" cy="5"  r="3" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="19" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="5"  y1="5"  x2="19" y2="5"  stroke="currentColor" strokeWidth="1" />
                  <line x1="5"  y1="5"  x2="12" y2="19" stroke="currentColor" strokeWidth="1" />
                  <line x1="19" y1="5"  x2="12" y2="19" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No graph yet</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Save more notes to build your knowledge graph, or enable demo
                  data to explore what it looks like.
                </p>
              </div>
            </div>
          )}

          {phase === "loading" && !graphData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="size-5 animate-spin rounded-full border-2 border-border border-t-accent" />
                <p className="font-mono text-xs text-muted-foreground">loading graph…</p>
              </div>
            </div>
          )}

          {phase === "error" && !graphData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="text-sm text-muted-foreground">{errorMsg ?? "Failed to load graph."}</p>
              <button
                onClick={loadReal}
                className="font-mono text-xs text-accent hover:underline"
              >
                retry
              </button>
            </div>
          )}

          {/* Computing overlay — on top of canvas while sim settles */}
          {phase === "computing" && graphData && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-16">
              <div className="flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1.5 backdrop-blur-sm">
                <div className="size-3 animate-spin rounded-full border border-border border-t-accent" />
                <span className="font-mono text-2xs text-muted-foreground">computing layout…</span>
              </div>
            </div>
          )}

          {/* Hint pill — bottom-center */}
          {graphData && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="rounded-full border border-border bg-surface/80 px-3 py-1 font-mono text-2xs text-muted-foreground backdrop-blur-sm">
                drag to pan · scroll to zoom · click to inspect
              </span>
            </div>
          )}

          {/* Search — top-left */}
          {graphData && (
            <div className="absolute left-3 top-3">
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/90 px-2.5 py-1.5 backdrop-blur-sm">
                <Search className="size-3 shrink-0 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter nodes…"
                  className="w-28 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Zoom + refresh — top-right */}
          {graphData && (
            <div className="absolute right-3 top-3 flex flex-col gap-1">
              {(
                [
                  { icon: <Plus className="size-3.5" />,      action: () => zoom(1.25),    label: "Zoom in" },
                  { icon: <Minus className="size-3.5" />,     action: () => zoom(0.8),     label: "Zoom out" },
                  { icon: <Maximize2 className="size-3.5" />, action: resetView,            label: "Reset view" },
                ] as const
              ).map(({ icon, action, label }) => (
                <button
                  key={label}
                  onClick={action}
                  aria-label={label}
                  className="flex size-7 items-center justify-center rounded-md border border-border bg-surface/90 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-surface-elevated hover:text-foreground"
                >
                  {icon}
                </button>
              ))}
              <div className="my-0.5 h-px bg-border" />
              <button
                onClick={refreshLayout}
                aria-label="Refresh layout"
                className="flex size-7 items-center justify-center rounded-md border border-border bg-surface/90 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>
          )}

          {/* Cluster legend — bottom-right */}
          {graphData && activeClusters.length > 0 && (
            <div className="absolute bottom-4 right-3 rounded-lg border border-border bg-surface/90 p-2.5 backdrop-blur-sm">
              <p className="mb-2 font-mono text-2xs uppercase tracking-wider text-muted-foreground/60">
                Clusters
              </p>
              <div className="flex flex-col gap-1">
                {activeClusters.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilterCluster((fc) => (fc === c ? null : c))}
                    className={cn(
                      "flex items-center gap-2 rounded px-1.5 py-0.5 text-left font-mono text-2xs transition-colors",
                      filterCluster === c
                        ? "bg-surface-elevated text-foreground"
                        : filterCluster
                        ? "text-muted-foreground/40 hover:text-muted-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: clusterColor(c) }} />
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Inspector rail ── */}
        <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-border">
          {selected ? (
            <div className="flex flex-col overflow-y-auto">
              {/* Header */}
              <div className="shrink-0 border-b border-border px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-medium leading-snug text-foreground">
                    {selected.label}
                  </h2>
                  <button
                    onClick={() => {
                      selectedRef.current = null;
                      setSelected(null);
                      setConnections([]);
                      if (drawRef.current) {
                        cancelAnimationFrame(rafRef.current);
                        rafRef.current = requestAnimationFrame(drawRef.current);
                      }
                    }}
                    className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Close inspector"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {selected.domain && (
                    <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
                      {selected.domain}
                    </span>
                  )}
                  <span
                    className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-2xs"
                    style={{
                      borderColor: `${clusterColor(selected.cluster)}40`,
                      color: clusterColor(selected.cluster),
                    }}
                  >
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: clusterColor(selected.cluster) }} />
                    {selected.cluster}
                  </span>
                </div>
              </div>

              {/* Summary */}
              {selected.summary && (
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {selected.summary}
                  </p>
                </div>
              )}

              {/* Connections */}
              <div className="flex-1 px-4 py-3">
                <p className="mb-2.5 font-mono text-2xs uppercase tracking-wider text-muted-foreground/60">
                  Connections · {connections.length}
                </p>
                <div className="space-y-1.5">
                  {connections.map(({ node, similarity }) => (
                    <button
                      key={node.id}
                      onClick={() => navigateTo(node)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-muted-foreground/25 hover:bg-surface-elevated"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{node.label}</p>
                        <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{node.cluster}</p>
                      </div>
                      <span className="shrink-0 font-mono text-2xs tabular-nums text-accent">
                        {similarity.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full border border-border bg-surface">
                <svg className="size-4 text-muted-foreground" viewBox="0 0 20 20" fill="none">
                  <circle cx="5"  cy="5"  r="2.5" stroke="currentColor" strokeWidth="1.25" />
                  <circle cx="15" cy="5"  r="2.5" stroke="currentColor" strokeWidth="1.25" />
                  <circle cx="10" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.25" />
                  <line x1="5"  y1="5"  x2="15" y2="5"  stroke="currentColor" strokeWidth="0.75" />
                  <line x1="5"  y1="5"  x2="10" y2="15" stroke="currentColor" strokeWidth="0.75" />
                  <line x1="15" y1="5"  x2="10" y2="15" stroke="currentColor" strokeWidth="0.75" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Select a node</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Click any node to inspect its topic, source, and strongest
                  semantic connections.
                </p>
              </div>
              {graphData && activeClusters.length > 0 && (
                <div className="mt-2 w-full space-y-1">
                  {activeClusters.map((c) => {
                    const count = simNodesRef.current.filter((n) => n.cluster === c).length;
                    return (
                      <div key={c} className="flex items-center justify-between gap-2 rounded-md px-2 py-1">
                        <div className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: clusterColor(c) }} />
                          <span className="font-mono text-2xs text-muted-foreground">{c}</span>
                        </div>
                        <span className="font-mono text-2xs tabular-nums text-muted-foreground/60">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
