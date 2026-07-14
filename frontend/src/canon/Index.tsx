/* THE INDEX (9.9) — command palette, Cmd/Ctrl+K or `.`. A card-catalogue
   tray: giant ruled input, results grouped SHEETS · ACCOUNTS · ACTIONS.
   Fully keyboard-driven. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AccountSummary } from "../api/client";

interface Entry { group: string; label: string; hint?: string; run: () => void; }

const SHEETS: { name: string; to: string }[] = [
  { name: "Command Center", to: "/command-center" },
  { name: "Alert Queue", to: "/alerts" },
  { name: "Cases", to: "/cases" },
  { name: "Accounts", to: "/accounts" },
  { name: "Network Graph", to: "/graph" },
  { name: "Recruiter Map", to: "/recruiters" },
  { name: "AutoSTR", to: "/autostr" },
  { name: "Compliance", to: "/compliance" },
];

export function Index() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => { setOpen(false); setQuery(""); setAccounts([]); setActive(0); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "." && !typing)) {
        e.preventDefault(); setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 20); }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setAccounts([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await api<{ data: AccountSummary[] }>(`/api/v1/accounts?query=${encodeURIComponent(query.trim())}&limit=6`);
        setAccounts(res.data);
      } catch { setAccounts([]); }
    }, 200);
  }, [query, open]);

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim().toLowerCase();
    const sheetHits = SHEETS
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .map<Entry>((s) => ({ group: "SHEETS", label: s.name, run: () => { navigate(s.to); close(); } }));
    const acctHits = accounts.map<Entry>((a) => ({
      group: "ACCOUNTS", label: a.account_ref, hint: a.holder,
      run: () => { navigate("/accounts"); close(); },
    }));
    return [...sheetHits, ...acctHits];
  }, [query, accounts, navigate, close]);

  useEffect(() => { setActive(0); }, [query, accounts]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(entries.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); entries[active]?.run(); }
    else if (e.key === "Escape") close();
  };

  let lastGroup = "";
  return (
    <div className="index-scrim" onClick={close}>
      <div className="index-tray" role="dialog" aria-modal="true" aria-label="The Index" onClick={(e) => e.stopPropagation()}>
        <input ref={inputRef} className="index-input" placeholder="Search the press…"
          value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown} />
        <div className="index-results">
          {entries.length === 0 ? (
            <p className="index-empty mx">No entry in the index.</p>
          ) : entries.map((e, i) => {
            const head = e.group !== lastGroup ? (lastGroup = e.group) : null;
            return (
              <div key={i}>
                {head && <p className="index-group v-label">{head}</p>}
                <button className={`index-row${i === active ? " index-row--active" : ""}`}
                  onMouseEnter={() => setActive(i)} onClick={() => e.run()}>
                  <span className="index-row__label">{e.label}</span>
                  {e.hint && <span className="index-row__hint mx">{e.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
