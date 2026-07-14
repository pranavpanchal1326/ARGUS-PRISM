/* SHEET 11 · PROFILE & SESSIONS (Part 10) — a drawer, not a sheet. The
   operator's press ID: credentials · 2FA state (never any secret; Law 3) ·
   sessions ledger with per-row REVOKE Seals · the Large Print lever. */
import { Drawer } from "./Drawer";
import { Seal } from "./Seal";
import { useNotices } from "./Notices";
import { useAuth } from "../shell/AuthContext";
import { useMode } from "../shell/ModeContext";
import { api, ApiProblem } from "../api/client";
import { date, timestamp } from "../lib/format";

export function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, reload, logout } = useAuth();
  const { largePrint, setLargePrint } = useMode();
  const { post } = useNotices();
  if (!me) return null;

  async function revoke(id: string, current: boolean) {
    try {
      await api(`/api/v1/auth/sessions/${id}`, { method: "DELETE" });
      if (current) { await logout(); location.assign("/login"); return; }
      post({ msg: "Session revoked.", tone: "success" });
      void reload();
    } catch (err) { post({ msg: err instanceof ApiProblem ? err.title : "Revoke returned.", tone: "error" }); }
  }

  return (
    <Drawer open={open} title={me.name} refLabel="PRESS ID" onClose={onClose}>
      <div className="profile">
        <div className="profile__cred">
          <span className="v-label">{me.role.replace(/_/g, " ")}</span>
          <span className="mx profile__email">{me.email}</span>
          <span className="mx profile__mfa">
            2FA: {me.mfa_active ? `KEY CUT${me.mfa_active_since ? ` ${date(me.mfa_active_since)}` : ""}` : "NOT ENROLLED"}
          </span>
        </div>

        <div className="profile__block">
          <p className="v-label">The Large Print Edition</p>
          <button className="lever profile__lever" onClick={() => setLargePrint(!largePrint)}
            aria-pressed={largePrint}>
            <span className={`lever__pos${!largePrint ? " lever__pos--on" : ""}`}>STANDARD</span>
            <span className={`lever__pos${largePrint ? " lever__pos--on" : ""}`}>LARGE</span>
          </button>
        </div>

        <div className="profile__block">
          <p className="v-label">Sessions</p>
          <ul className="session-list">
            {me.sessions.map((s) => (
              <li key={s.id} className="session">
                <div className="session__meta">
                  <span className="session__device">{s.device}{s.current && " · CURRENT"}</span>
                  <span className="mx session__ip">{s.ip}</span>
                  <span className="mx session__seen">{s.last_seen_at ? timestamp(s.last_seen_at) : timestamp(s.created_at)}</span>
                </div>
                <Seal label="Revoke" variant="vermilion" size={40} onAuthorize={() => revoke(s.id, s.current)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Drawer>
  );
}
