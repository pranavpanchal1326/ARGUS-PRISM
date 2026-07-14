/* ═══════════════════════════════════════════════════════════════
   THE GUILLOCHÉ ENGINE — rosette.ts (Part 8).
   Pure function module; zero DOM dependencies. Same inputs ⇒
   identical rosette (Law 2). Inputs derive only from signals/score —
   a rosette cannot leak identity.
   ═══════════════════════════════════════════════════════════════ */

export interface RosetteParams {
  /** S1..S6 signal values in [0,1]. */
  signals: [number, number, number, number, number, number];
  /** WarmthScore / 100 in [0,1]. */
  warmth: number;
  /** Seed for deterministic jitter (hash of account serial). */
  seed?: number;
}

const SAMPLES = 720;
const TAU = Math.PI * 2;

/** Deterministic PRNG (mulberry32) — jitter must reproduce exactly. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Simple string hash for seeding from an account serial. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Harmonic { A: number; R: number; phi: number; }

/** Deterministic parameter mapping (Part 8.2 table). */
export function deriveHarmonics(p: RosetteParams): {
  harmonics: Harmonic[]; alpha: number; phiAlpha: number; jitter: number;
} {
  const [s1, s2, s3, s4, s5, s6] = p.signals;
  const w = Math.min(1, Math.max(0, p.warmth));
  return {
    harmonics: [
      { A: 1.0, R: 6, phi: 0 },
      { A: 0.18 + s1 * 0.24, R: 6 + Math.round(s3 * 4), phi: s5 * (Math.PI / 3) },
      { A: 0.06 + s2 * 0.16, R: 12 + Math.round(s4 * 6), phi: s6 * (Math.PI / 2) },
    ],
    /* Quadratic: clean accounts stay serene; the top band visibly deforms. */
    alpha: w * w * 0.35,
    phiAlpha: s5 * TAU,
    jitter: w * 0.8,
  };
}

/**
 * Generate the rosette as an SVG path string, centred at (cx, cy) with
 * outer radius `radius`. `tiers`: 2 harmonics for T1 thumbnails, 3 full.
 */
export function rosettePath(
  p: RosetteParams,
  radius: number,
  cx = 0,
  cy = 0,
  tiers: 2 | 3 = 3,
  samples = SAMPLES,
): string {
  const { harmonics, alpha, phiAlpha, jitter } = deriveHarmonics(p);
  const hs = harmonics.slice(0, tiers);
  const ampSum = hs.reduce((a, h) => a + h.A, 0);
  const scale = radius / (ampSum * (1 + alpha));
  const rand = prng(p.seed ?? 1);

  let d = "";
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * TAU;
    let x = 0, y = 0;
    for (const h of hs) {
      x += h.A * Math.cos(h.R * t + h.phi);
      y += h.A * Math.sin(h.R * t + h.phi);
    }
    const mod = 1 + alpha * Math.sin(t + phiAlpha);
    x *= mod * scale; y *= mod * scale;
    if (jitter > 0) {
      x += (rand() - 0.5) * jitter;
      y += (rand() - 0.5) * jitter;
    }
    d += (i === 0 ? "M" : "L") + (cx + x).toFixed(2) + " " + (cy + y).toFixed(2);
  }
  return d + "Z";
}

/** The Master Rosette: canonical params — the institution's own note. */
export const MASTER_PARAMS: RosetteParams = {
  signals: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  warmth: 0,
  seed: 0,
};

/** Map an Alert/Account into engine inputs from what the contract gives us. */
export function paramsFromScore(
  warmthScore: number,
  signalContributions: number[],
  serial: string,
): RosetteParams {
  const s = [0, 1, 2, 3, 4, 5].map((i) => {
    const c = signalContributions[i];
    return c === undefined ? 0.5 : Math.min(1, Math.max(0, c / 40));
  }) as RosetteParams["signals"];
  return { signals: s, warmth: warmthScore / 100, seed: hashSeed(serial) };
}

/* T1 cache — quantized params (S to 1/16, W to 1/32) for >95% list hits. */
const t1Cache = new Map<string, string>();

export function rosettePathT1(p: RosetteParams, radius: number): string {
  const key =
    p.signals.map((s) => Math.round(s * 16)).join(",") +
    "|" + Math.round(p.warmth * 32) + "|" + radius;
  let d = t1Cache.get(key);
  if (!d) {
    d = rosettePath(
      { ...p, seed: 1, signals: p.signals.map((s) => Math.round(s * 16) / 16) as RosetteParams["signals"] },
      radius, 0, 0, 2, 180,
    );
    t1Cache.set(key, d);
  }
  return d;
}
