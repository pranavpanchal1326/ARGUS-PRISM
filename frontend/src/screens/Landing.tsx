/* SHEET 00 · THE NOTE ITSELF (Part 10). The public face is one oversized
   engraved banknote on cotton paper. NOTE mode always. */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Pulse } from "../api/client";
import { useAuth } from "../shell/AuthContext";
import { useLockMode } from "../shell/ModeContext";
import { Rosette } from "../canon/Rosette";
import { MASTER_PARAMS } from "../engine/rosette";
import "./landing.css";

/* Each station examines one security feature of the note and reveals a
   real product engine (Part 10, Sheet 00 table). */
const STATIONS = [
  { feature: "THE MICROPRINTING", truth: "FlowGraph", line: "Read the transactions others cannot see — layering, round-tripping and structuring traced across a live graph, four hops deep." },
  { feature: "THE WATERMARK", truth: "Hidden-network detection", line: "Hold the note to the light and the network appears — taint that persists four hops from a confirmed mule." },
  { feature: "THE SECURITY THREAD", truth: "The HMAC audit chain", line: "One unbroken line runs the length of the register. Every entry seals the next; a break is visible at a glance." },
  { feature: "THE SEE-THROUGH REGISTER", truth: "Recruiter Mapper", line: "Front and back align to reveal the coordinator — the boss fanning out test payments, not the disposable mules." },
  { feature: "THE INTAGLIO", truth: "WarmthScore", line: "Risk you can feel before it arrives. Six signals score every account 0–100 for mule-warming, before the money moves." },
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
              Watches every account. Scores the warming mule before the money moves.
              Seals the case the law requires — in under an hour.
            </p>
            <div className="note__cta">
              <Link className="btn btn--primary" to={me ? "/alerts" : "/login"}>Enter the press</Link>
              <a className="btn btn--quiet" href="#examine">Examine the note ↓</a>
            </div>
            <p className="mx note__micro" aria-hidden>ARGUSPRISM·ARGUSPRISM·ARGUSPRISM·ARGUSPRISM·</p>
          </div>
          <div className="note__rosette">
            <Rosette params={MASTER_PARAMS} size={220} tier={3} title="The Master Rosette" />
          </div>
        </div>
      </div>

      <section id="examine" className="examine">
        <div className="section-head reveal">
          <p className="v-label">The examination</p>
          <h2 className="v-display v-display--section">Five features. One instrument.</h2>
        </div>
        {STATIONS.map((s, i) => (
          <article key={s.feature} className={`station reveal${i % 2 ? " station--flip" : ""}`}>
            <div className="station__loupe">
              <Rosette params={{ ...MASTER_PARAMS, warmth: i / 5 }} size={140} tier={3} />
            </div>
            <div className="station__card">
              <p className="v-label">{s.feature}</p>
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
