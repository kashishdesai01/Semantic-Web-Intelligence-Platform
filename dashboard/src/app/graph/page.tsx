"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { pollJob } from "@/lib/jobs";
import { useRouter } from "next/navigation";

type Node = { id: string; label: string; type: string };
type Edge = { source: string; target: string; label: string };

export default function GraphPage() {
  const router = useRouter();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [connectedEdges, setConnectedEdges] = useState<Edge[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const draggingRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  }>({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  async function loadGraph() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/graph");
      if (res?.status === "queued") {
        pollJob<{ nodes: Node[]; edges: Edge[] }>(
          apiFetch,
          res.job_id,
          (result) => {
            setNodes(result.nodes || []);
            setEdges(result.edges || []);
          },
          (message) => setError(message)
        );
      } else {
        setNodes(res.nodes || []);
        setEdges(res.edges || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load graph");
    } finally {
      setLoading(false);
    }
  }

  const edgeList = useMemo(() => {
    return edges.map((e) => ({
      source: typeof e.source === "string" ? e.source : (e.source as any).id,
      target: typeof e.target === "string" ? e.target : (e.target as any).id,
      label: e.label,
    }));
  }, [edges]);

  useEffect(() => {
    if (!nodes.length || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = container.clientWidth;
    const height = 520;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const simNodes = nodes.map((n) => ({ ...n }));
    const simLinks = edgeList.map((e) => ({ ...e }));

    const sim = forceSimulation(simNodes as any)
      .force(
        "link",
        forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance(130)
      )
      .force("charge", forceManyBody().strength(-260))
      .force("center", forceCenter(width / 2, height / 2));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const { x, y, k } = transformRef.current;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);

      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      simLinks.forEach((link: any) => {
        const source = link.source as any;
        const target = link.target as any;
        if (!source || !target) return;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });

      simNodes.forEach((node: any) => {
        const color =
          node.type === "person"
            ? "#7df9ff"
            : node.type === "org"
              ? "#ffc857"
              : node.type === "place"
                ? "#9aff7b"
                : "#7b9bff";
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fill();

        if (selectedNode && node.id === selectedNode.id) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      ctx.restore();
    };

    sim.on("tick", render);

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y, k } = transformRef.current;
      const scale = Math.min(Math.max(k - e.deltaY * 0.001, 0.4), 2.5);
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const nx = mx - x;
      const ny = my - y;
      const ratio = scale / k;
      transformRef.current = {
        x: mx - nx * ratio,
        y: my - ny * ratio,
        k: scale,
      };
      render();
    };

    const handleDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { x, y, k } = transformRef.current;
      const gx = (mx - x) / k;
      const gy = (my - y) / k;

      const hit = simNodes.find((n: any) => {
        const dx = n.x - gx;
        const dy = n.y - gy;
        return Math.sqrt(dx * dx + dy * dy) < 10;
      });

      if (hit) {
        setSelectedNode(hit);
        const connected = edgeList.filter(
          (edge) => edge.source === hit.id || edge.target === hit.id
        );
        setConnectedEdges(connected);
        render();
        return;
      }

      draggingRef.current = {
        active: true,
        startX: mx,
        startY: my,
        offsetX: x,
        offsetY: y,
      };
    };

    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current.active) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      transformRef.current = {
        x: draggingRef.current.offsetX + (mx - draggingRef.current.startX),
        y: draggingRef.current.offsetY + (my - draggingRef.current.startY),
        k: transformRef.current.k,
      };
      render();
    };

    const handleUp = () => {
      draggingRef.current.active = false;
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleDown);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      sim.stop();
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [nodes, edgeList, selectedNode]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="page">
      <div style={{ width: "min(1100px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1>Knowledge graph</h1>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>

        {error ? <p className="muted">{error}</p> : null}

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button className="btn primary" onClick={loadGraph} disabled={loading}>
              {loading ? "Building graph..." : "Generate graph"}
            </button>
            <div className="muted">
              Drag to pan, scroll to zoom, click nodes to inspect.
            </div>
          </div>
          <div
            ref={containerRef}
            style={{
              marginTop: 12,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="panel">
          <h2>Selected node</h2>
          {selectedNode ? (
            <div className="note">
              <strong>{selectedNode.label}</strong>
              <div className="note-meta">
                <span>{selectedNode.type}</span>
                <span>{selectedNode.id}</span>
              </div>
              <div className="list" style={{ marginTop: 10 }}>
                {connectedEdges.length === 0 ? (
                  <p className="muted">No connected edges.</p>
                ) : (
                  connectedEdges.map((edge, idx) => (
                    <div key={`${edge.source}-${edge.target}-${idx}`} className="note">
                      <strong>
                        {edge.source} → {edge.target}
                      </strong>
                      <div className="note-meta">
                        <span>{edge.label}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="muted">Click a node to inspect relationships.</p>
          )}
        </div>
      </div>
    </div>
  );
}
