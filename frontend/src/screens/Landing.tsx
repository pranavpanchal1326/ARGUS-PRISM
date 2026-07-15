/* SHEET 00 · THE NOTE ITSELF (Part 10). The public face is one oversized
   engraved banknote on cotton paper. NOTE mode always. */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Pulse } from "../api/client";
import { useAuth } from "../shell/AuthContext";
import { useLockMode } from "../shell/ModeContext";
import { LiveNote } from "./LiveNote";
import "./landing.css";

/* Each station examines one security feature of the note and reveals a
   real product engine (Part 10, Sheet 00 table). Each carries a concrete
   demonstration glyph so the claim is shown, not merely stated. */
const STATIONS = [
  { feature: "THE MICROPRINTING", truth: "FlowGraph", demo: "graph" as const,
    line: "Fraud hides in the spaces between transactions. FlowGraph reads them — tracing layering, round-tripping and structuring across a live account graph, four hops deep, so a mule ring reads as one shape instead of a hundred innocent-looking transfers." },
  { feature: "THE WATERMARK", truth: "Taint propagation", demo: "taint" as const,
    line: "Hold a real note to the light and the watermark appears. Confirm one mule here and its taint spreads to every account it touched — persisting four hops out, so the network can't hide by simply going dormant." },
  { feature: "THE SECURITY THREAD", truth: "The HMAC audit chain", demo: "thread" as const,
    line: "A banknote's thread is woven in, not printed on — you cannot forge it without unpicking the paper. Every action here is sealed into an unbroken HMAC chain; tamper with one entry and the thread visibly severs at exactly that line." },
  { feature: "THE SEE-THROUGH REGISTER", truth: "Recruiter Mapper", demo: "die" as const,
    line: "Front and back of a note align to form one image. Align a campaign's test-payments and its coordinator appears — the recruiter fanning out to disposable mules, drawn as a master die whose copies degrade with each generation." },
  { feature: "THE INTAGLIO", truth: "WarmthScore", demo: "warmth" as const,
    line: "Intaglio ink is raised — you feel it before you read it. WarmthScore is risk you feel before it arrives: six behavioural signals score every account 0–100 for mule-warming, hours before the illicit money ever moves." },
];

const STATS = [
  { v: "< 60", k: "MIN · STR TURNAROUND" },
  { v: "0–100", k: "WARMTH · PRE-CRIME" },
  { v: "4", k: "HOPS · TAINT DEPTH" },
  { v: "100", k: "EYES · NEVER BLINK" },
];

export function Landing() {
  const { me } = useAuth();
  useLockMode("note");
  const revealRef = useRef<HTMLDivElement>(null);
  const rosetteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = revealRef.current?.querySelectorAll(".reveal");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("reveal--in")),
      { threshold: 0.18 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* Hero rosette parallax (M17) — transform-only on a passive listener,
     no scroll-jack; the note tilts gently as the reader descends. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (rosetteRef.current) rosetteRef.current.style.transform =
          `translateY(${y * 0.06}px) rotate(${y * 0.01}deg)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  /* Even the landing obeys Law 2 — live figures where the API is reachable;
     the claims stand without them where it is not. No fakes. */
  const [pulse, setPulse] = useState<Pulse | null>(null);
  useEffect(() => {
    api<{ data: Pulse }>("/api/v1/metrics/pulse").then((r) => setPulse(r.data)).catch(() => setPulse(null));
  }, []);

  const serial = `AP-2026-0714-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  return (
    <div className="note-page fibered" ref={revealRef}>
      <div className="note">
        <div className="note__border" aria-hidden>
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 600">
            <rect x="6" y="6" width="988" height="588" fill="none" stroke="currentColor" strokeWidth="1" className="note__frame-draw" />
            <rect x="14" y="14" width="972" height="572" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </svg>
        </div>

        <header className="note__top">
          <span className="mx note__serial">Nº {serial}</span>
          <Link className="btn btn--secondary" to={me ? "/alerts" : "/login"}>
            {me ? "Return to the desk" : "Enter the press"}
          </Link>
        </header>

        <div className="note__hero">
          <div className="note__promise">
            <p className="v-label">Pre-crime intelligence for mule detection</p>
            <h1 className="note__title v-display">The promise<br />to detect.</h1>
            <p className="note__creed">
              ARGUS-PRISM watches every account in real time, scores the warming mule
              before the money moves, and seals the legal case the law requires —
              in under an hour, not seven days.
            </p>
            <div className="note__cta">
              <Link className="btn btn--primary" to={me ? "/alerts" : "/login"}>Enter the press</Link>
              <a className="btn btn--quiet" href="#examine">Examine the note ↓</a>
            </div>
            <p className="mx note__micro" aria-hidden>ARGUSPRISM·ARGUSPRISM·ARGUSPRISM·ARGUSPRISM·</p>
          </div>
          <div className="note__rosette" ref={rosetteRef}>
            <LiveNote />
          </div>
        </div>
      </div>

      <section className="examine-intro reveal">
        <p className="v-label">Why a banknote</p>
        <p className="examine-intro__lead">
          This product hunts counterfeit money, so it is drawn in the language money uses
          to defend itself. Every engine below maps to one security feature of a real
          note — the microprint, the watermark, the woven thread, the see-through register,
          the raised intaglio ink. Examine each in turn.
        </p>
      </section>

      <section id="examine" className="examine">
        <div className="section-head reveal">
          <p className="v-label">The examination</p>
          <h2 className="v-display v-display--section">Five features. One instrument.</h2>
        </div>
        {STATIONS.map((s, i) => (
          <article key={s.feature} className={`station reveal${i % 2 ? " station--flip" : ""}`}>
            <div className="station__loupe">
              <FeatureDemo kind={s.demo} />
            </div>
            <div className="station__card">
              <p className="v-label">{s.feature} · <span className="station__nth mx">Nº {i + 1} of 5</span></p>
              <h3 className="v-display v-display--section station__truth">{s.truth}</h3>
              <p className="station__line">{s.line}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="note-stats reveal">
        {pulse && (
          <div className="note-stat">
            <div className="note-stat__v mx num">{pulse.accounts_watched.toLocaleString("en-IN")}</div>
            <div className="note-stat__k v-label">ACCOUNTS · WATCHED NOW</div>
          </div>
        )}
        {pulse && (
          <div className="note-stat">
            <div className="note-stat__v mx num">{pulse.active_alerts}</div>
            <div className="note-stat__k v-label">ALERTS · OPEN NOW</div>
          </div>
        )}
        {STATS.slice(0, pulse ? 2 : 4).map((s) => (
          <div key={s.k} className="note-stat">
            <div className="note-stat__v mx num">{s.v}</div>
            <div className="note-stat__k v-label">{s.k}</div>
          </div>
        ))}
      </section>

      <section className="note-creed reveal">
        <blockquote className="v-display v-display--title">
          Printed, not painted.<br />Held, not clicked.<br />Real, or not rendered.
        </blockquote>
        <Link className="btn btn--primary" to={me ? "/alerts" : "/login"}>Present your credentials</Link>
      </section>

      <footer className="note-foot mx">UNION BANK OF INDIA · THE SECURITY PRESS · V3</footer>
    </div>
  );
}

/* A small engraved demonstration for each feature — animates when revealed
   into view (CSS keyframes triggered by .reveal--in on the ancestor). */
function FeatureDemo({ kind }: { kind: "graph" | "taint" | "thread" | "die" | "warmth" }) {
  return (
    <div className={`demo demo--${kind}`}>
      <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="1.2">
        {kind === "graph" && <g className="demo-graph">
          <circle cx="80" cy="80" r="6" />
          {[[30,40],[130,50],[40,120],[120,120],[80,25]].map(([x,y],i)=>(
            <g key={i}><line x1="80" y1="80" x2={x} y2={y} className="demo-edge" style={{ animationDelay: `${i*120}ms` }} /><circle cx={x} cy={y} r="4" className="demo-node" style={{ animationDelay: `${i*120}ms` }} /></g>
          ))}
        </g>}
        {kind === "taint" && <g>
          <circle cx="80" cy="80" r="7" stroke="var(--vermilion)" className="demo-taint-src" />
          {[[40,50],[120,60],[50,120],[110,115]].map(([x,y],i)=>(
            <g key={i}><line x1="80" y1="80" x2={x} y2={y} stroke="var(--vermilion)" strokeDasharray="3 3" className="demo-taint-edge" style={{ animationDelay: `${i*200}ms` }} /><circle cx={x} cy={y} r="5" stroke="var(--vermilion)" className="demo-taint-node" style={{ animationDelay: `${i*200}ms` }} /></g>
          ))}
        </g>}
        {kind === "thread" && <g>
          <path d="M30 20 C120 40 40 90 120 110 C60 130 100 140 130 145" className="demo-thread" stroke="var(--intaglio)" />
          <circle cx="30" cy="20" r="3" fill="currentColor" stroke="none" />
          <circle cx="130" cy="145" r="3" fill="currentColor" stroke="none" />
        </g>}
        {kind === "die" && <g>
          <rect x="64" y="64" width="32" height="32" className="demo-die-master" />
          {[[24,30,0],[130,34,1],[28,128,2],[128,126,3]].map(([x,y,g],i)=>(
            <g key={i} className="demo-die-copy" style={{ animationDelay: `${i*160}ms`, opacity: 1 - Number(g)*0.18 }}>
              <line x1="80" y1="80" x2={Number(x)+8} y2={Number(y)+8} strokeDasharray="2 2" />
              <rect x={x} y={y} width="16" height="16" />
            </g>
          ))}
        </g>}
        {kind === "warmth" && <g className="demo-warmth">
          {[0,1,2].map((r)=>(<circle key={r} cx="80" cy="80" r={30+r*22} className="demo-ring" style={{ animationDelay: `${r*300}ms` }} />))}
          <circle cx="80" cy="80" r="8" fill="var(--vermilion)" stroke="none" className="demo-core" />
        </g>}
      </svg>
    </div>
  );
}
