/* SHEET 10 · THE MINT (Part 10, SYS_ADMIN only). Operators · stations ·
   the simulator. The constitutional line: the mint keeps the presses,
   never the ledgers. */
import { useCallback, useEffect, useState } from "react";
import { api, ApiProblem, type AdminUser } from "../api/client";
import { Overprint } from "../canon/Overprint";
import { Seal } from "../canon/Seal";
import { useNotices } from "../canon/Notices";
import { date } from "../lib/format";
import "./mint.css";

type Panel = "operators" | "stations" | "press";
type Health = { status: "ok" | "degraded"; version: string; dependencies: Record<string, { status?: string; detail?: string }> };

export function Mint() {
  const [panel, setPanel] = useState<Panel>("operators");
  return (
    <div className="sheet">
      <div className="margin">
        <h1 className="margin__title">The Mint</h1>
        <div className="margin__filters">
          {(["operators", "stations", "press"] as Panel[]).map((p) => (
            <button key={p} className={`punch${panel === p ? " punch--active" : ""}`} onClick={() => setPanel(p)}>{p}</button>
          ))}
        </div>
        <p className="margin__note">The mint keeps the presses — never the ledgers.</p>
      </div>
      <div>
        {panel === "operators" ? <Operators /> : panel === "stations" ? <Stations /> : <Press />}
      </div>
    </div>
  );
}

function Operators() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const { post } = useNotices();
  const load = useCallback(async () => {
    try { const res = await api<{ data: AdminUser[] }>("/api/v1/admin/users"); setUsers(res.data); }
    catch { setUsers([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (users === null) return <span className="unprinted" style={{ width: "60%" }} />;
  return (
    <table className="ledger">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>MFA</th><th>State</th><th></th></tr></thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td>{u.name}</td>
            <td className="mx">{u.email}</td>
            <td><span className="v-label">{u.role.replace(/_/g, " ")}</span></td>
            <td>{u.mfa_active ? <Overprint size="micro" tone="verified">KEY CUT</Overprint> : <span className="void__detail">—</span>}</td>
            <td>{u.disabled ? <Overprint size="micro" tone="vermilion">DISABLED</Overprint> : <span className="v-label">ACTIVE</span>}</td>
            <td>
              <Seal label="Force key re-cut" variant="vermilion" size={40}
                onAuthorize={async () => {
                  try { await api(`/api/v1/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ force_mfa_reset: true }) });
                    post({ msg: `${u.name}'s key re-cut. They re-enrol on next login.`, tone: "success" }); }
                  catch (err) { post({ msg: err instanceof ApiProblem ? err.title : "Returned.", tone: "error" }); }
                }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Stations() {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    (async () => {
      try { const res = await api<{ data: Health }>("/api/v1/admin/health"); setHealth(res.data); }
      catch { setHealth(null); }
    })();
  }, []);
  if (!health) return <span className="unprinted" style={{ width: "50%" }} />;
  return (
    <div className="stations">
      {Object.entries(health.dependencies).map(([name, dep]) => (
        <div key={name} className="station">
          <span className={`station__dot station__dot--${dep.status ?? "down"}`} />
          <span className="station__name mx">{name}</span>
          <span className="v-label station__state">{dep.status ?? "down"}</span>
          {dep.detail && <span className="station__detail">{dep.detail}</span>}
        </div>
      ))}
    </div>
  );
}

function Press() {
  const [scenario, setScenario] = useState("recruiter_fanout");
  const [seed, setSeed] = useState("20260707");
  const [running, setRunning] = useState(false);
  const { post } = useNotices();

  async function control(command: "load" | "start" | "pause" | "reset") {
    try {
      await api("/api/v1/admin/simulator", { method: "POST", body: JSON.stringify({ command, scenario, seed: Number(seed) }) });
      if (command === "start") setRunning(true);
      if (command === "pause" || command === "reset") setRunning(false);
      post({ msg: `Simulator ${command} — ${scenario} @ ${seed}.`, tone: "info" });
    } catch (err) { post({ msg: err instanceof ApiProblem ? err.title : "The press did not respond.", tone: "error" }); }
  }

  return (
    <div className="press-panel">
      <label className="field"><span className="field__label">Scenario</span>
        <input className="field__input" value={scenario} onChange={(e) => setScenario(e.target.value)} /></label>
      <label className="field"><span className="field__label">Seed</span>
        <input className="field__input mx" value={seed} onChange={(e) => setSeed(e.target.value)} /></label>
      <div className="press-panel__controls">
        <Seal label="Load scenario" variant="ink" onAuthorize={() => control("load")} />
        <button className="btn btn--secondary" onClick={() => control(running ? "pause" : "start")}>{running ? "Pause" : "Run"}</button>
        <button className="btn btn--quiet" onClick={() => control("reset")}>Reset</button>
      </div>
      <p className="void__detail">The simulator drives the live stream. Judges watch the operator run the world.</p>
    </div>
  );
}

void date;
