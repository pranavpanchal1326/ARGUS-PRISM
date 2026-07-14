/* Deterministic force-directed layout (Part 10, Sheet 06). Same
   neighborhood ⇒ same layout — investigators need spatial memory. Seeded
   PRNG for initial positions; fixed iteration count; frozen after settle. */
import { hashSeed } from "./rosette";
import type { GraphNode, GraphEdge } from "../api/client";

export interface Positioned { node: GraphNode; x: number; y: number; }

function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function layoutGraph(
  nodes: GraphNode[], edges: GraphEdge[], root: string,
  w: number, h: number, iterations = 300,
): Positioned[] {
  const rand = prng(hashSeed(root));
  const n = nodes.length;
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const px = new Float64Array(n), py = new Float64Array(n);
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) * 0.42;

  // seed on a ring; root at center
  nodes.forEach((nd, i) => {
    if (nd.id === root) { px[i] = cx; py[i] = cy; return; }
    const ang = rand() * Math.PI * 2;
    const rr = radius * (0.35 + rand() * 0.65);
    px[i] = cx + Math.cos(ang) * rr;
    py[i] = cy + Math.sin(ang) * rr;
  });

  const k = radius / Math.max(1, Math.sqrt(n));
  const links = edges
    .map((e) => ({ s: idx.get(e.source), t: idx.get(e.target) }))
    .filter((l): l is { s: number; t: number } => l.s !== undefined && l.t !== undefined);

  let temp = radius * 0.1;
  for (let it = 0; it < iterations; it++) {
    const dx = new Float64Array(n), dy = new Float64Array(n);
    // repulsion
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let vx = px[i] - px[j], vy = py[i] - py[j];
      let d2 = vx * vx + vy * vy || 0.01;
      const f = (k * k) / d2;
      vx *= f; vy *= f;
      dx[i] += vx; dy[i] += vy; dx[j] -= vx; dy[j] -= vy;
    }
    // attraction along edges
    for (const l of links) {
      let vx = px[l.s] - px[l.t], vy = py[l.s] - py[l.t];
      const d = Math.sqrt(vx * vx + vy * vy) || 0.01;
      const f = (d * d) / k;
      vx = (vx / d) * f; vy = (vy / d) * f;
      dx[l.s] -= vx; dy[l.s] -= vy; dx[l.t] += vx; dy[l.t] += vy;
    }
    // gentle gravity to centre
    for (let i = 0; i < n; i++) { dx[i] += (cx - px[i]) * 0.01; dy[i] += (cy - py[i]) * 0.01; }
    // apply, capped by temperature
    for (let i = 0; i < n; i++) {
      if (nodes[i].id === root) continue; // pin root
      const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 0.01;
      px[i] += (dx[i] / d) * Math.min(d, temp);
      py[i] += (dy[i] / d) * Math.min(d, temp);
      px[i] = Math.max(24, Math.min(w - 24, px[i]));
      py[i] = Math.max(24, Math.min(h - 24, py[i]));
    }
    temp *= 0.985;
  }

  return nodes.map((node, i) => ({ node, x: px[i], y: py[i] }));
}
