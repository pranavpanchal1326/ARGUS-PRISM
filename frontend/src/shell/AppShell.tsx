/* THE SHEET CHROME (Part 4.2) — Register · Folio · Working Area ·
   Marginalia. One multiplexed WS drives the folio aperture and the
   marginalia ticks for the whole console (Part 14.3 §8). */
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Rosette } from "../canon/Rosette";
import { Index } from "../canon/Index";
import { ProfileDrawer } from "../canon/ProfileDrawer";
import { Examiner } from "../canon/Examiner";
import { Ambient } from "./Ambient";
import { ViewBoundary } from "./ViewBoundary";
import { useAuth } from "./AuthContext";
import { useMode } from "./ModeContext";
import { WS_BASE, tokens } from "../api/client";
import { MASTER_PARAMS } from "../engine/rosette";
import { LEX } from "../lexicon/strings";
import "./shell.css";

const INDEX = [
  { no: "02", to: "/command-center", name: "COMMAND CENTER" },
  { no: "04", to: "/alerts", name: "ALERT QUEUE" },
  { no: "03", to: "/cases", name: "CASES" },
  { no: "05", to: "/accounts", name: "ACCOUNTS" },
  { no: "06", to: "/graph", name: "NETWORK GRAPH" },
  { no: "07", to: "/recruiters", name: "RECRUITER MAP" },
  { no: "08", to: "/autostr", name: "AUTOSTR" },
  { no: "09", to: "/compliance", name: "COMPLIANCE" },
  { no: "10", to: "/admin", name: "ADMINISTRATION", role: "SYS_ADMIN" },
];

function useISTClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit",
    second: "2-digit", hour12: false,
  }).format(now);
}

export function AppShell() {
  const { me, logout } = useAuth();
  const { mode, toggle } = useMode();
  const navigate = useNavigate();
  const clock = useISTClock();
  const [connected, setConnected] = useState(false);
  const [warmth, setWarmth] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const marginRef = useRef<HTMLElement | null>(null);

  /* The watch: one socket → aperture health + marginalia ticks. */
  useEffect(() => {
    if (!tokens.access) return;
    let ws: WebSocket | null = null;
    let retry = 1000, closed = false;
    const connect = () => {
      ws = new WebSocket(`${WS_BASE}/api/v1/stream?token=${tokens.access}`);
      ws.onopen = () => { retry = 1000; setConnected(true); };
      ws.onmessage = (m) => {
        try {
          const ev = JSON.parse(m.data);
          const isAlert = ev.type === "alert.raised";
          if (isAlert && typeof ev.payload?.warmth_score === "number") {
            setWarmth((w) => Math.max(w, ev.payload.warmth_score));
          }
          printTick(marginRef.current, isAlert);
        } catch { /* non-JSON frame */ }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) { setTimeout(connect, retry); retry = Math.min(retry * 2, 15000); }
      };
    };
    connect();
    return () => { closed = true; ws?.close(); };
  }, []);

  const today = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
  }).format(new Date()).toUpperCase();

  const apertureParams = { ...MASTER_PARAMS, warmth: warmth / 100 };

  return (
    <>
      <div className="desk-gate">
        <div className="desk-gate__card card">
          <p className="desk-gate__title">A wider desk is required.</p>
          <p style={{ fontSize: "var(--text-13)", color: "var(--ink-mut)" }}>
            The press prints on sheets no narrower than 1280 pixels.
          </p>
        </div>
      </div>

      <div className="press fibered">
        <nav className="register" aria-label="The Register">
          <div className="register__mark">
            <Rosette params={MASTER_PARAMS} size={20} tier={1} title="ARGUS PRISM" />
            <span className="register__wordmark">ARGUS PRISM</span>
          </div>
          <div className="register__index">
            {INDEX.filter((n) => !n.role || me?.role === n.role).map((n) => (
              <NavLink key={n.to} to={n.to}
                className={({ isActive }) => `register__entry${isActive ? " register__entry--active" : ""}`}>
                <span className="register__no">{n.no}</span>
                <span className="register__name">{n.name}</span>
              </NavLink>
            ))}
          </div>
          <div className="register__foot">
            {me && (
              <button className="register__cred" onClick={() => setProfileOpen(true)} aria-label="Open press ID">
                <span className="register__cred-name">{me.name}</span>
                <span className="register__cred-role">{me.role.replace("_", " ")}</span>
              </button>
            )}
            <button className="lever" onClick={toggle} aria-label={`Mode: ${mode}. Toggle NOTE / PLATE`}>
              <span className={`lever__pos${mode === "note" ? " lever__pos--on" : ""}`}>NOTE</span>
              <span className={`lever__pos${mode === "plate" ? " lever__pos--on" : ""}`}>PLATE</span>
            </button>
            <button className="btn btn--quiet" onClick={async () => { await logout(); navigate("/login"); }}>
              {LEX.leaveDesk}
            </button>
          </div>
        </nav>

        <div className="workcol">
          <div className="folio">
            <span className="folio__id">VOL III · {today}</span>
            <span className="folio__clock">{clock} IST</span>
            <span className="folio__spacer" />
            <span className={`folio__aperture${connected ? "" : " folio__aperture--lost"}`}
              title={connected ? "The press runs" : LEX.connectionLost}>
              <Rosette params={apertureParams} size={16} tier={1} />
            </span>
          </div>

          <main className="working" role="main">
            <ViewBoundary>
              <Outlet />
            </ViewBoundary>
          </main>
        </div>

        <aside className="marginalia" ref={marginRef} aria-hidden />
      </div>
      <Index />
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
      <Examiner />
      <Ambient warmth={warmth} />
    </>
  );
}

/* A registration tick drifts up and fades over 60s (Part 9.11). */
function printTick(host: HTMLElement | null, isAlert: boolean) {
  if (!host) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tick = document.createElement("span");
  tick.className = `tick${isAlert ? " tick--alert" : ""}`;
  tick.style.bottom = "0px";
  tick.style.background = isAlert ? "var(--vermilion)" : "var(--ink-faint)";
  host.appendChild(tick);
  if (reduced) { setTimeout(() => tick.remove(), 4000); return; }
  const h = host.clientHeight || 600;
  tick.animate(
    [{ transform: "translateY(0)", opacity: 0.8 }, { transform: `translateY(-${h}px)`, opacity: 0 }],
    { duration: 60000, easing: "linear" },
  ).onfinish = () => tick.remove();
}
