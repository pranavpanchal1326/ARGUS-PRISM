/* The frame: nav rail (left) · Meridian line · content · Margin of the
   Watch (right, 32px — the eye lives there; empty space that watches). */
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Eye } from "../components/Eye";
import { ViewBoundary } from "./ViewBoundary";
import { useAuth } from "./AuthContext";
import { WS_BASE, tokens } from "../api/client";
import "./shell.css";

const NAV = [
  { to: "/command-center", label: "Command Center" },
  { to: "/alerts", label: "Alert Queue" },
  { to: "/cases", label: "Cases" },
  { to: "/accounts", label: "Accounts" },
  { to: "/graph", label: "Network Graph" },
  { to: "/recruiters", label: "Recruiter Map" },
  { to: "/autostr", label: "AutoSTR" },
  { to: "/compliance", label: "Compliance" },
  { to: "/admin", label: "Administration", role: "SYS_ADMIN" },
];

export function AppShell() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const [eyeState, setEyeState] = useState<"resting" | "watching" | "closed">("resting");
  const [intensity, setIntensity] = useState(0);
  const [blinkSignal, setBlinkSignal] = useState(0);
  const eventTimes = useRef<number[]>([]);

  /* The Watch: one multiplexed WS drives the eye for the whole app. */
  useEffect(() => {
    if (!tokens.access) return;
    let ws: WebSocket | null = null;
    let retry = 1000;
    let closed = false;

    const connect = () => {
      ws = new WebSocket(`${WS_BASE}/api/v1/stream?token=${tokens.access}`);
      ws.onopen = () => { retry = 1000; setEyeState("watching"); };
      ws.onmessage = (m) => {
        const now = Date.now();
        eventTimes.current = [...eventTimes.current.filter((t) => now - t < 5000), now];
        setIntensity(Math.min(1, eventTimes.current.length / 25));
        try {
          const ev = JSON.parse(m.data);
          if (ev.type === "alert.raised") setBlinkSignal(now);
        } catch { /* non-JSON frame */ }
      };
      ws.onclose = () => {
        setEyeState("closed");
        if (!closed) {
          setTimeout(connect, retry);
          retry = Math.min(retry * 2, 15000);
        }
      };
    };
    connect();
    return () => { closed = true; ws?.close(); };
  }, []);

  return (
    <>
    <div className="desk-gate">
      <div className="paper desk-gate__card">
        <p className="v-institution" style={{ fontSize: "var(--text-24)", marginBottom: "var(--s-2)" }}>
          A wider desk is required.
        </p>
        <p style={{ fontSize: "var(--text-13)" }}>
          The PRISM console needs a display of at least 1280 pixels.
        </p>
      </div>
    </div>
    <div className="app-frame on-vault">
      <nav className="rail">
        <div className="rail__wordmark v-institution">
          ARGUS<span className="rail__sep">·</span>PRISM
        </div>
        <div className="rail__items">
          {NAV.filter((n) => !n.role || me?.role === n.role).map((n) => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) => `rail__item${isActive ? " rail__item--active" : ""}`}>
              {n.label}
            </NavLink>
          ))}
        </div>
        <div className="rail__foot">
          {me && (
            <>
              <div className="rail__user">
                <span className="rail__name">{me.name}</span>
                <span className="rail__role v-label">{me.role.replace("_", " ")}</span>
              </div>
              <button className="btn-quiet" onClick={async () => { await logout(); navigate("/login"); }}>
                Leave the desk
              </button>
            </>
          )}
        </div>
      </nav>

      <div className="meridian" aria-hidden />

      <main className="content">
        <ViewBoundary>
          <Outlet />
        </ViewBoundary>
      </main>

      <aside className="margin-watch" aria-hidden>
        <Eye state={eyeState} intensity={intensity} blinkSignal={blinkSignal} size={14}
          title={eyeState === "closed" ? "The watch is interrupted" : "The watch continues"} />
      </aside>
    </div>
    </>
  );
}
