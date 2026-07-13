/* Landing — the showpiece. Modern Vault: gradient mesh, the watching
   eye, curved engine cards. Public; "Enter" routes to the app. */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../shell/AuthContext";
import "./landing.css";

const ENGINES = [
  { name: "FlowGraph", line: "Traces layering, round-tripping and structuring across a live transaction graph — four hops deep.", glyph: "graph" },
  { name: "WarmthScore", line: "A six-signal ensemble scores every account 0–100 for mule-warming — before the illicit money arrives.", glyph: "dial" },
  { name: "AutoSTR", line: "One click assembles the FIU-IND, CBI and RBI packages — sealed in under an hour, not seven days.", glyph: "seal" },
  { name: "Taint Propagation", line: "A confirmed mule stains its network. The taint persists so it can't hide by going dormant.", glyph: "taint" },
  { name: "Recruiter Mapper", line: "Finds the coordinator fanning out test payments — the boss, not the disposable employees.", glyph: "hub" },
];

const STATS = [
  { v: "< 60 min", k: "STR turnaround" },
  { v: "0–100", k: "Warmth, pre-crime" },
  { v: "4 hops", k: "Taint depth" },
  { v: "100", k: "Eyes that never blink" },
];

export function Landing() {
  const { me } = useAuth();
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

  return (
    <div className="landing" ref={revealRef}>
      <header className="lnav glass">
        <div className="lnav__mark v-institution">ARGUS<span>·</span>PRISM</div>
        <nav className="lnav__links">
          <a href="#engines">The Engines</a>
          <a href="#creed">The Creed</a>
          <Link className="btn-brass lnav__cta" to={me ? "/alerts" : "/login"}>
            {me ? "Enter the vault" : "Sign in"}
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero__mesh" aria-hidden />
        <div className="hero__eye" aria-hidden>
          <EyeMark />
        </div>
        <p className="hero__eyebrow v-label">Pre-crime intelligence for mule detection</p>
        <h1 className="hero__title v-institution">
          The bank that<br /><em>never blinks.</em>
        </h1>
        <p className="hero__sub">
          PRISM watches every account in real time, scores it for mule behaviour
          <span> before </span> the money moves, and seals the legal case the moment
          the law requires it — all on-prem, nothing leaves the bank.
        </p>
        <div className="hero__cta">
          <Link className="btn-brass" to={me ? "/alerts" : "/login"}>
            {me ? "Enter the vault" : "Enter PRISM"} <Arrow />
          </Link>
          <a className="btn-ghost" href="#engines">See the engines</a>
        </div>
        <div className="hero__ticker v-machine" aria-hidden>
          <span>account.created</span><span>score.updated</span><span>alert.raised</span>
          <span>taint.spread</span><span>package.sealed</span><span>ledger.verified</span>
          <span>account.created</span><span>score.updated</span><span>alert.raised</span>
        </div>
      </section>

      {/* ── Stats band ── */}
      <section className="stats reveal">
        {STATS.map((s) => (
          <div key={s.k} className="stat">
            <div className="stat__v v-institution">{s.v}</div>
            <div className="stat__k v-label">{s.k}</div>
          </div>
        ))}
      </section>

      {/* ── Engines ── */}
      <section id="engines" className="engines">
        <div className="section-head reveal">
          <p className="v-label">The proven IP</p>
          <h2 className="v-institution">Five engines, one unblinking watch.</h2>
        </div>
        <div className="engine-grid">
          {ENGINES.map((e, i) => (
            <article key={e.name} className={`engine card reveal engine--${i === 0 ? "wide" : "std"}`}>
              <EngineGlyph kind={e.glyph} />
              <h3 className="engine__name v-institution">{e.name}</h3>
              <p className="engine__line">{e.line}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Creed ── */}
      <section id="creed" className="creed reveal">
        <div className="creed__glow" aria-hidden />
        <p className="v-label">The creed</p>
        <blockquote className="creed__quote v-institution">
          “The hundred eyes see what others cannot.<br />This time, everything they show is real.”
        </blockquote>
        <p className="creed__body">
          No mock data. No secrets on glass. Every number is computed from real
          transaction flow; every seal is a real signature; every alert is earned.
        </p>
        <Link className="btn-brass" to={me ? "/alerts" : "/login"}>
          {me ? "Enter the vault" : "Present your credentials"} <Arrow />
        </Link>
      </section>

      <footer className="lfoot">
        <span className="v-institution">ARGUS·PRISM</span>
        <span className="v-machine">Union Bank of India · PRISM V3 · on-prem intelligence</span>
      </footer>
    </div>
  );
}

/* ── Inline art ── */
function EyeMark() {
  return (
    <svg viewBox="0 0 220 220" width="100%" height="100%" fill="none">
      <defs>
        <radialGradient id="iris" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--mint)" stopOpacity="0.9" />
          <stop offset="70%" stopColor="var(--mint)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--mint)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[0, 1, 2].map((r) => (
        <ellipse key={r} cx="110" cy="110" rx={104 - r * 14} ry={62 - r * 9}
          stroke="var(--gold)" strokeWidth="1" opacity={0.5 - r * 0.12} />
      ))}
      <circle cx="110" cy="110" r="34" fill="url(#iris)" />
      <circle cx="110" cy="110" r="20" stroke="var(--mint)" strokeWidth="1.5" className="eyemark__iris" />
      <circle cx="110" cy="110" r="7" fill="var(--mint)" />
    </svg>
  );
}

function EngineGlyph({ kind }: { kind: string }) {
  return (
    <span className="engine__glyph">
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="var(--gold-bright)" strokeWidth="1.5">
        {kind === "graph" && <>
          <circle cx="8" cy="20" r="3.5" /><circle cx="30" cy="9" r="3.5" /><circle cx="32" cy="30" r="3.5" />
          <path d="M11 19 26 11M11 21 29 29M28 12 31 27" opacity="0.7" />
        </>}
        {kind === "dial" && <>
          <path d="M6 28a16 16 0 1 1 28 0" /><path d="M20 24 27 15" strokeLinecap="round" />
          <circle cx="20" cy="24" r="2" fill="var(--gold-bright)" />
        </>}
        {kind === "seal" && <>
          <circle cx="20" cy="20" r="12" /><path d="M20 12v16M12 20h16" opacity="0.6" />
        </>}
        {kind === "taint" && <>
          <circle cx="12" cy="14" r="3.5" /><circle cx="28" cy="12" r="3.5" /><circle cx="22" cy="30" r="3.5" />
          <path d="M15 15 25 13M14 17 20 27M26 15 23 27" opacity="0.7" strokeDasharray="2 2" />
        </>}
        {kind === "hub" && <>
          <circle cx="20" cy="20" r="5" /><circle cx="8" cy="10" r="2.5" /><circle cx="32" cy="10" r="2.5" />
          <circle cx="8" cy="30" r="2.5" /><circle cx="32" cy="30" r="2.5" />
          <path d="M16 17 10 11M24 17 30 11M16 23 10 29M24 23 30 29" opacity="0.7" />
        </>}
      </svg>
    </span>
  );
}

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
