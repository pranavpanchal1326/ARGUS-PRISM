# PRISM V3 — Product Requirements Document

| | |
|---|---|
| **Product** | ARGUS-PRISM — Pre-crime Intelligence System for Mule Detection |
| **Version** | 3.0 (full rebuild) |
| **Status** | Approved for build |
| **Owners** | Aditya (Backend / ML / Auth / Infra) · Pranav (Frontend / Design / Docs) |
| **Origin** | iDEA 2.0 (PS3, Union Bank of India) — top-30 finish; V3 is the post-hackathon production-grade rebuild |
| **Prime directive** | The finished system must be indistinguishable from software an actual bank's internal engineering team shipped. No demo shortcuts, no mock data, no hackathon smell. |

---

## 1. Why V3 Exists

V2 lost the final round on **execution polish, not ideas**:

1. The backend and frontend were built as two loosely-coordinated halves. UI features were added that had no real endpoint behind them, so screens silently fell back to hardcoded mock data — and judges noticed.
2. An "encryption key" was visible in the AutoSTR screen, and regenerating produced the *same* key. One click from a judge destroyed credibility.
3. The git repo was chaos: 13+ branches, merge tangles, a broken deploy. The wiring failed at the worst moment.

V3 fixes the *system of building*, not just the code. The three rules below are non-negotiable and every section of this PRD flows from them.

### The Three Laws of V3

> **Law 1 — Contract first.** A feature does not exist until its API endpoint is specified in the shared OpenAPI contract. UI may only be built against the contract. There is no `USE_MOCK` flag anywhere in the codebase. Ever.
>
> **Law 2 — No fake anything.** Every number on every screen comes from the backend, which computes it from real (simulated) transaction data. No hardcoded arrays, no `Math.random()` KPIs, no lorem-ipsum accounts. If the backend is down, the UI shows an honest, elegant error state — not fake data.
>
> **Law 3 — No secrets on glass.** No encryption keys, tokens, hashes-as-keys, JWTs, or any security material is ever rendered in the UI. Integrity is communicated through *status* ("Package sealed ✓", document fingerprint chip showing last 8 chars only), never through raw key material.

---

## 2. Product Summary

PRISM watches every account and transaction in the bank in real time, scores accounts for "mule warming" behaviour **before** illicit funds arrive, restricts them under KYC authority (no court order needed), and auto-generates the three legal evidence packages (FIU-IND STR, CBI Package, RBI Report) the moment the law requires them.

**The five engines (unchanged from V2 — this is the proven IP):**

| Engine | What it does |
|---|---|
| **FlowGraph** | Neo4j transaction graph; detects layering, round-tripping, structuring, dormant activation, profile mismatch |
| **WarmthScore** | 6-signal XGBoost ensemble, 0–100 risk score with SHAP explanation; score bands trigger escalating legal actions |
| **AutoSTR** | One click → FIU-IND XML + CBI PDF + RBI report, in under 60 minutes vs 3–7 days manual |
| **Taint Propagation** | Confirmed mule → persistent taint scores written 4 hops deep into the network so it can't hide by going dormant |
| **Recruiter Mapper** | Detects the *coordinator* account fanning out test payments — the boss, not the employees |

V3 adds four new capabilities:

1. **Live Operations Feed** — a rebuilt, reliable transaction simulator streaming events per-second over WebSocket; the whole UI feels alive.
2. **Real authentication** — Google OAuth + email/password, TOTP two-factor (authenticator app, QR provisioning), JWT sessions, full RBAC.
3. **PRISM Assistant** — a small docked AI chatbot (Ollama + Gemma, fully on-prem — a selling point: *no customer data leaves the bank*) for quick Q&A and per-screen insights.
4. **A bespoke "Heritage Bank" design system** — see §7. The UI should look like a 90-year-old private bank hired a world-class design agency.

---

## 3. Users & Roles (RBAC)

Roles are enforced server-side on every endpoint AND drive UI visibility. The UI never shows an action the role can't perform (greyed-out is acceptable only with a tooltip explaining the required role).

| Role | Who | Can | Cannot |
|---|---|---|---|
| **MLRO** (Money Laundering Reporting Officer) | Senior compliance officer | Everything: approve/submit STRs, freeze accounts & networks, decrypt PII, close cases | — |
| **FRAUD_ANALYST** | Day-to-day investigator | View alerts/accounts/graphs/timelines, annotate cases, escalate to MLRO, run chatbot queries | Freeze, approve STRs, see raw PII (sees masked) |
| **COMPLIANCE_AUDITOR** | Internal/external audit | Read-only audit log, case history, compliance reports | Any write action, PII |
| **SYS_ADMIN** | IT operations | User management, role assignment, system health, simulator controls | Case files, PII, alerts (deliberately walled off — a talking point for judges: *admins can't see customer data*) |

**Login flow:** Google OAuth (bank domain) *or* email+password → TOTP challenge (mandatory for MLRO & SYS_ADMIN, optional-but-nagged for others) → JWT (15-min access / 7-day refresh, rotation on use). First login forces TOTP enrolment via QR code. Session log visible to the user (device, IP, time) under their profile — small touch, huge "real bank" energy.

---

## 4. Information Architecture

Nine nav items + one global widget. The user lands on **Alert Queue** — one focused view, never a wall of widgets.

```
┌─ PRISM ────────────────────────────────────────────┐
│ 1. Command Center      (live ops floor — pull, not push)
│ 2. Alert Queue         ← DEFAULT LANDING VIEW
│ 3. Cases
│ 4. Accounts            (lookup + forensic timeline, one view, tabs)
│ 5. Network Graph       (FlowGraph — the headline screen)
│ 6. Recruiter Map
│ 7. AutoSTR
│ 8. Compliance          (audit ledger + customer protection, tabs)
│ 9. Administration      (users + system health; SYS_ADMIN only)
│
│ ◉ PRISM Assistant      (docked widget, all screens, collapsed by default)
└────────────────────────────────────────────────────┘
```

**Progressive-disclosure drill path** (the core UX idea — the analyst is *pulled* deeper, never *dumped* into complexity):

`Alert Queue → click alert → Account (cheque-leaf header + timeline) → click counterparty → Network Graph (pre-focused) → select cluster → Open Case → case matures → AutoSTR`

Every arrow in that path is one click, and every screen deep-links (URL-addressable state) so investigations can be shared between analyst and MLRO.

---

## 5. Feature Specifications

Every feature lists its **owner**, its **endpoints** (which must exist in `contracts/openapi.yaml` before UI work starts), and its **acceptance criteria**. Pranav: if an endpoint isn't listed here or in the contract, the feature doesn't go in the UI. Aditya: if you change a response shape, you change the contract in the same PR.

### 5.1 Authentication & Sessions — owner: Aditya (`auth`), UI screens: Pranav (`ui-shell`)

Endpoints:
```
POST   /api/v1/auth/register              (SYS_ADMIN invites only — no public signup)
POST   /api/v1/auth/login                 email+password → mfa_required=true + short-lived mfa_token
POST   /api/v1/auth/oauth/google          OAuth code exchange → same MFA gate
POST   /api/v1/auth/mfa/enroll            returns otpauth:// provisioning URI (rendered as QR client-side)
POST   /api/v1/auth/mfa/verify            TOTP code + mfa_token → access + refresh JWT
POST   /api/v1/auth/refresh               rotate refresh token
POST   /api/v1/auth/logout                revoke session
GET    /api/v1/auth/me                    profile, role, active sessions list
DELETE /api/v1/auth/sessions/{id}         revoke a specific session
```

Acceptance:
- [ ] TOTP codes verified with ±1 window drift; rate-limited 5 attempts / 5 min
- [ ] Regenerating MFA enrolment produces a **different** secret every time (the V2 sin, inverted)
- [ ] The otpauth secret appears in exactly one API response (enrolment) and is never logged, never re-displayed
- [ ] No credential material of any kind rendered post-setup — profile shows "2FA: Active since <date>" only

### 5.2 Live Operations Feed — backend: Aditya (`backend-pipeline`), frontend: Pranav (`ui-live-feed`)

The rebuilt simulator is a **first-class service**, not a demo script:
- Deterministic scenario engine: seeded RNG, YAML-defined campaigns (e.g. `campaign: recruiter_fanout, accounts: 23, duration: 48h, compression: 2880x`) so a 48-hour mule campaign replays in 60 seconds of demo time, reproducibly.
- Emits `transaction.posted`, `account.created`, `device.registered`, `kyc.updated`, `alert.raised`, `score.updated` events.
- Simulator controls (start/pause/scenario select) live in Administration, SYS_ADMIN only — during a demo, judges can watch you *drive* it, which reads as "operations console", not "canned demo".

Endpoints:
```
WS     /api/v1/stream                     multiplexed event stream (client subscribes to channels)
GET    /api/v1/feed/recent?limit=100      replay buffer for page load
GET    /api/v1/metrics/pulse              rolling KPIs: tx/sec, active alerts, accounts watched, avg score
POST   /api/v1/sim/scenario               SYS_ADMIN: load/start/pause scenario
GET    /api/v1/sim/status
```

Acceptance:
- [ ] UI reconnects WebSocket with backoff; missed events backfilled from `/feed/recent` — no gaps, no duplicates (event ids are monotonic)
- [ ] Command Center renders 50 events/sec without dropped frames (virtualized list, canvas ticker)

### 5.3 Alert Queue (default landing) — backend: Aditya (`backend-api`), frontend: Pranav (`ui-shell`)

```
GET    /api/v1/alerts?status=&severity=&sort=&cursor=     cursor-paginated, server-sorted
GET    /api/v1/alerts/{id}
PATCH  /api/v1/alerts/{id}                acknowledge / assign / resolve / mark-false-positive
POST   /api/v1/alerts/{id}/escalate
WS     /api/v1/stream (channel: alerts)   new alerts arrive live, animate in at correct rank
```

Each alert: masked account ref, WarmthScore dial, top-2 SHAP signals as tags, time-since-first-signal, **SLA countdown** (STR filing deadline under PMLA §12 — a literal ticking clock next to critical alerts; judges who know compliance will gasp), taint-linkage indicator.

Acceptance:
- [ ] Empty state is designed, elegant, and true ("No alerts require attention") — never blank, never fake-populated
- [ ] New alert arrives via WS and inserts at rank position with a subtle brass shimmer, ≤1s from backend emit

### 5.4 Cases — backend: Aditya, frontend: Pranav

Full lifecycle: `OPEN → UNDER_REVIEW → PENDING_MLRO → CLOSED_CONFIRMED_MULE | CLOSED_FALSE_POSITIVE`. Cases aggregate alerts, accounts, graph snapshots, analyst notes, and generated packages. Every state transition is an audit-log entry.

```
GET/POST      /api/v1/cases
GET/PATCH     /api/v1/cases/{id}
POST          /api/v1/cases/{id}/notes
POST          /api/v1/cases/{id}/evidence          attach graph snapshot / timeline export
GET           /api/v1/cases/{id}/activity          full state-transition history
```

### 5.5 Accounts (lookup + forensic timeline) — backend: Aditya, frontend: Pranav

```
GET    /api/v1/accounts?query=&risk_tier=&cursor=
GET    /api/v1/accounts/{id}                        profile (PII masked by role)
GET    /api/v1/accounts/{id}/score-history          WarmthScore trajectory + SHAP per point
GET    /api/v1/accounts/{id}/transactions?cursor=
GET    /api/v1/accounts/{id}/devices                IMEI/SIM event history
GET    /api/v1/accounts/{id}/signals                current S1–S6 breakdown
POST   /api/v1/accounts/{id}/actions                freeze / restrict / kyc-review (MLRO; server re-checks role)
```

UI is the **cheque-book concept** (§7.3) with tabs: Overview · Timeline · Transactions · Devices · Linked Network.

### 5.6 Network Graph — backend: Aditya (`backend-pipeline`), frontend: Pranav

The headline screen. Force-directed D3/WebGL graph, node heat = WarmthScore, amber ring = tainted, edge weight = value.

```
GET    /api/v1/graph/neighborhood/{account_id}?hops=3
GET    /api/v1/graph/patterns/{type}                detected layering/round-trip/structuring subgraphs
POST   /api/v1/graph/freeze-cluster                 MLRO: freeze selected node set
GET    /api/v1/graph/export/{case_id}               evidence-grade snapshot (attaches to case)
```

### 5.7 Recruiter Map — backend: Aditya, frontend: Pranav

```
GET    /api/v1/recruiters                            detected coordinators + campaign scale class
GET    /api/v1/recruiters/{id}/campaign              full fan-out subgraph
POST   /api/v1/recruiters/{id}/freeze-campaign       MLRO: one-click network freeze
```

### 5.8 AutoSTR — backend: Aditya (`backend-pipeline`), frontend: Pranav

The screen that killed us in V2. It gets the most care:

```
POST   /api/v1/autostr/{case_id}/generate            async job → job_id
GET    /api/v1/autostr/jobs/{job_id}                 status: ASSEMBLING → SIGNING → SEALED
GET    /api/v1/autostr/{case_id}/packages            list: type, generated_at, integrity chip (last-8 of SHA-256, labelled "Document fingerprint")
GET    /api/v1/autostr/packages/{id}/download        streams file; server-side authz; audit-logged
POST   /api/v1/autostr/packages/{id}/approve         MLRO approval → mark submitted
```

Acceptance (all three are demo-critical):
- [ ] **Zero key material in any response consumed by the UI.** Backend signing keys live in env/secret manager and never cross the API boundary. CI greps UI bundle for "BEGIN", "secret", "private" patterns as a tripwire.
- [ ] Regenerating a package produces a new job, new timestamp, new fingerprint — verifiably different every time
- [ ] Download works for all three package types including the in-memory RBI JSON (the V2 `memory://` 404 bug — fixed by streaming, not filesystem checks)

### 5.9 Compliance (Audit Ledger + Customer Protection) — backend: Aditya, frontend: Pranav

```
GET    /api/v1/audit?actor=&action=&cursor=          append-only, HMAC-chained entries
GET    /api/v1/audit/verify                          chain-integrity check → "Ledger intact ✓ (N entries)"
GET    /api/v1/compliance/reports                    scheduled report registry
GET    /api/v1/compliance/fairness                   bias/false-positive metrics by segment (DPDP story)
```

The audit UI is a **bound ledger book** (§7.3). The verify endpoint powers a "Verify ledger" action whose result is a wax-seal stamp animation — integrity as theatre, but *real* theatre: the HMAC chain check actually runs.

### 5.10 Administration — backend: Aditya (`auth` + `backend-api`), frontend: Pranav

Users (invite, role change, disable, force-MFA-reset), system health (service status strip: API · Pipeline · Graph DB · Cache · Stream — shown as small brass indicator lamps, green/amber/red), simulator controls (§5.2).

### 5.11 PRISM Assistant (chatbot) — backend: Aditya (`backend-api`), frontend: Pranav (`ui-chatbot`)

- Ollama + Gemma, on-prem. System prompt scopes it to PRISM data; it answers from **tool calls to the same REST API** (with the *user's own* role token — the bot can never see more than the user can).
- Context-aware: knows the current screen/entity ("Summarize this account's risk" on an account page needs no ids typed).
- Hard scope: refuses non-PRISM questions politely, in character ("I can only assist with matters of this institution.").

```
POST   /api/v1/assistant/chat              {message, screen_context} → SSE streamed reply
GET    /api/v1/assistant/suggestions       per-screen canned prompts (3 chips above the input)
```

Acceptance:
- [ ] Every factual claim the bot makes is fetched live — asked "how many open alerts?", it calls `/alerts`, never guesses
- [ ] Degrades gracefully when Ollama is offline: widget shows "Assistant unavailable", rest of app unaffected

---

## 6. The API Contract Workflow (Law 1, operationalized)

This section is the actual fix for V2's mock-data disaster. **Both of you follow this loop for every feature:**

```
1. SPEC      Feature endpoint(s) added to contracts/openapi.yaml   (PR to main, both approve)
2. TYPES     Pranav generates TS client: npm run gen:api           (openapi-typescript — never hand-write API types)
3. PARALLEL  Aditya implements endpoint ────┐
             Pranav builds UI against       ├── against the SAME contract
             Prism Mock Server* ────────────┘
4. INTEGRATE Pranav flips base URL to real backend. Because both sides
             obeyed the contract, this step is boring. Boring = victory.
5. VERIFY    Contract tests (schemathesis) run in CI on every backend PR:
             the implementation is machine-checked against openapi.yaml
```

\* **Prism Mock Server** is a Prism/MSW server auto-generated *from the contract* — Pranav never invents data shapes. It's a dev tool, deleted from the demo build; the shipped UI has one data source: the real API.

**Hard rules:**
- `contracts/openapi.yaml` lives on `main`, is the single source of truth, and changing it requires the other person's PR approval.
- UI PRs that add fetch calls to endpoints not in the contract are rejected. Backend PRs that change response shapes without updating the contract are rejected. CI enforces both.
- Envelope convention (everything, no exceptions): `{ "data": ..., "meta": { "cursor": ..., "total": ... } }` and RFC-7807 problem+json for errors. This killed us before (the V2 alerts-envelope crash); now it's law.

**Git workflow:** trunk-ish. Topic branches (`ui-shell`, `backend-api`, …) are the only long-lived branches; work happens on short-lived `feat/...` branches cut from them, PR'd back with review from the other person for anything touching the contract. `main` only receives merges that pass CI (lint, tests, contract check, secret-grep). Conventional commits. No direct pushes to `main`.

---

## 7. Design Language — "The Heritage Bank"

**Concept:** A 1930s private banking hall, run by a modern intelligence team. Marble, brass, ledgers, and stamps — housing real-time graph analytics. The tension between old-money gravitas and live data is *the* aesthetic. It must never tip into costume: data density and legibility always win a conflict with theme.

### 7.1 Foundations

| Token | Value / direction |
|---|---|
| Base surface | Deep bottle-green `#0E2A23` or midnight navy `#101D2E` (pick one in the ui-shell spike, not both) |
| Paper surface | Warm ivory `#F5F0E6` for cards/documents — anything "printed" sits on ivory |
| Accent | Aged brass `#B08D3E` — the *only* accent. Interactive = brass. No blues, no purples. |
| Critical | Muted oxblood `#7A2E2E` — reserved exclusively for CRITICAL/IMMINENT. Never decorative. |
| Display type | High-contrast serif (Playfair Display / Canela-like) — headers, screen titles, the wordmark |
| Data type | Neutral grotesque (Inter / Söhne-like), `tabular-nums` everywhere numbers appear |
| Ledger type | A monospace with character (IBM Plex Mono / OCR-B) — timestamps, account refs, audit rows, MICR lines |
| Texture | ≤3% opacity paper grain on ivory surfaces only. Hairline brass rules instead of shadows. |
| Motion | Sparse and mechanical: stamp *thunk* (80ms scale-settle), ledger rows slide in like a typewriter line-feed, vault-door ease on modals. Nothing bouncy. |
| Iconography | Thin engraved line icons, 1.25px stroke, squared terminals — as if etched into a brass plate |

### 7.2 Signature elements (use everywhere, consistently)

- **Ink-stamp status badges** — `FROZEN`, `APPROVED`, `UNDER REVIEW` rendered as slightly-imperfect rubber stamps (1° rotation jitter, ink-bleed edge). Status changes *stamp themselves* onto the record.
- **The WarmthScore dial** — an engraved brass gauge (vault-dial / galvanometer hybrid), needle sweeps on update, band names engraved around the arc: CLEAN · WARMING · HOT · CRITICAL · IMMINENT. This replaces every progress bar in the app and becomes the product's visual signature.
- **Wax seal** — the "sealed/verified" motif: AutoSTR completion, audit-chain verification, MLRO approval. Deep-red seal with the ARGUS eye, pressed with a satisfying settle animation.
- **Brass indicator lamps** — system health as small physical lamps, not badge pills.

### 7.3 Screen concepts — options for Pranav

You own the final call per screen. For each screen: a primary recommendation plus alternates. Prototype the cheque-book and one Command Center option first; they're the two highest-impact bets.

**Accounts — "the cheque book" (the user's requested centerpiece):**
- **Option A — Cheque-leaf card (recommended).** Each account renders as a cheque: MICR-style account number along the bottom edge, bank branch as the printed letterhead, account holder line, risk officer's "signature" strip showing the assigned analyst, and the current status stamped in ink across the face (a FROZEN account literally has FROZEN stamped over the cheque). The account *list* is the cheque book: leaves stacked with perforated top edges; opening one "tears it out" into the full forensic view.
- **Option B — Passbook.** Account detail as an open bank passbook: left page = identity/KYC, right page = machine-printed transaction lines that *print themselves* as live transactions arrive (dot-matrix animation + faint print sound optional).
- **Option C — Kardex ledger drawer.** Lookup as a card-catalogue: search pulls the drawer, account cards fan out, selected card lifts to full view. Marvelous for the lookup interaction, weaker for dense detail — could combine: Kardex for search, cheque-leaf for detail.

**Command Center:**
- **Option A — The Ticker Hall (recommended).** A slim brass-framed ticker-tape of live transactions streaming across the top (monospace, punched-tape aesthetic), a large central map/flow visualization of money movement between branch clusters, KPI plaques (engraved brass plates with flip-clock numerals) along the bottom. Feels like the operations floor of a great bank.
- **Option B — The Switchboard.** Vertical patch-panel metaphor: transaction flows as illuminated cords between account jacks, alerts as red lamps on the board. Bold, riskier, unforgettable if it lands.

**Alert Queue:** telegram delivery — each alert styled as an urgent telegraph slip (STOP-style truncated header optional flourish), sorted into brass in-trays by severity. Alternate: a plain ledger table with brass hairlines — safest, still handsome.

**Network Graph:** dark bottle-green field, nodes as brass coins that heat from patina-green through amber to oxblood as WarmthScore rises; tainted nodes get a punched hole (a canceled coin). Frozen cluster = a literal brass ring clamps around the node set.

**Recruiter Map:** organized-crime corkboard restraint — recruiter node as a large wax-sealed hub, red-thread edges to warming accounts. Keep it graph-first, board-flavored.

**AutoSTR:** a case file assembling itself — three document previews (XML/PDF/report) slide into a manila folder, string-and-button closure winds shut, wax seal presses, stamp reads `SEALED — AWAITING MLRO`. The MLRO's approve action is a *countersignature* line. (And per Law 3: the only "crypto" visible is the 8-char document fingerprint chip, labelled as such.)

**Audit ledger:** a bound book — facing pages, monospace rows, a red verification ribbon down the spine; "Verify ledger" runs the real HMAC-chain check and lays the wax seal on the page corner.

**Login:** the teller window. Centered brass-framed window on marble, "Present your credentials." TOTP entry styled as a 6-wheel combination dial (or 6 engraved digit boxes — test both). On success, a vault door swings (600ms, once, skippable) into Alert Queue.

**Chatbot:** a brass teller's bell, bottom-right. Expands to a telegram-style panel; replies "typed" in monospace with a subtle carriage-return rhythm. Suggestion chips styled as pre-printed request slips.

### 7.4 UX guardrails (theme never beats function)

- Landing = Alert Queue, always. Nothing else auto-opens. No dashboards of nine widgets.
- Every themed element must beat or match the plain version on task speed; if a motif costs legibility, the motif dies.
- WCAG AA contrast on all text over green/navy; brass-on-green tested carefully.
- Dense tables stay dense: theme lives in the *chrome* (rules, stamps, type), not in padding bloat.
- All motion respects `prefers-reduced-motion`. The vault-door plays once per session, max.
- Loading states are themed (a stamp hovering, a ledger line feeding) but never longer than the real wait.

---

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | JWT rotation, TOTP rate-limiting, server-side RBAC on every route, PII masked by role, CSP headers, no secrets in UI bundle (CI-enforced grep), audit log append-only with HMAC chain |
| Performance | API p95 < 200ms; graph neighborhood < 800ms at 5k nodes; WS event → UI paint < 1s; first meaningful paint < 2.5s |
| Reliability | Every service exposes `/health`; UI error boundaries per view (one broken screen never blanks the app); WS auto-reconnect + backfill |
| Data | All demo data generated by the scenario simulator through the real pipeline — the words "mock" and "dummy" should not appear in the final codebase |
| Quality | Backend: pytest + schemathesis contract tests, ≥80% on core routers. Frontend: vitest + Playwright on the golden path (login → alert → account → case → AutoSTR). CI green required to merge. |
| Codebase | Ruff + mypy (backend), ESLint + strict TS (frontend), conventional commits, PR templates. The repo itself is a judged artifact this time. |

---

## 9. Ownership & Milestones

**Aditya:** `backend-api`, `backend-pipeline`, `ml-models`, `auth`, `infra` — all services, the contract implementations, simulator, chatbot backend, CI.
**Pranav:** `ui-shell`, `ui-live-feed`, `ui-chatbot`, `docs` — design system, all screens, contract-generated client, this document's upkeep.
**Shared:** `contracts/openapi.yaml` (dual approval), demo script.

| Phase | Weeks | Aditya | Pranav | Exit criteria |
|---|---|---|---|---|
| **0 — Foundations** | 1 | Repo scaffolding, CI, contract v0 (auth + alerts + stream), docker-compose | Design-system spike: tokens, cheque-leaf, dial, stamp components in Storybook | Contract v0 merged; both dev environments run |
| **1 — The Spine** | 2–3 | Auth complete (OAuth+TOTP+RBAC), alerts + accounts endpoints, simulator v1 streaming | Login/teller window, app shell + nav, Alert Queue live over WS | Golden path demo: login → MFA → live alert arrives → open account |
| **2 — Investigation** | 4–5 | Graph + recruiter + cases endpoints, WarmthScore service wired, taint propagation | Network Graph, Recruiter Map, Accounts cheque-book, Cases | Full drill path works end-to-end on simulated campaign |
| **3 — Compliance** | 6 | AutoSTR pipeline (async jobs, sealed packages, downloads), audit chain + verify | AutoSTR case-file screen, Compliance ledger, Admin | STR generated, sealed, downloaded, approved — zero key material visible |
| **4 — Assistant & Polish** | 7 | Chatbot backend (Ollama tools), perf pass, load test | Chatbot widget, Command Center, motion polish, empty/error states | Full 10-min demo runs twice in a row with zero improvisation |
| **5 — Hardening** | 8 | Security pass, chaos test (kill each service mid-demo), backup/restore | Cross-browser, reduced-motion, a11y, final visual QA | The "hostile judge test": anyone may click anything, twice |

**The hostile judge test** (Phase 5 gate, named for a reason): a third person is handed the app and told to break the demo — click Generate twice, refresh mid-flow, open dev tools, kill the network. Anything that looks fake, repeats when it shouldn't, or exposes a secret is a release blocker.

---

## 10. Out of Scope for V3

- Real core-banking (Finacle) integration — simulator stands in, by design
- Cross-bank taint sharing, mobile/tablet layouts, i18n, dark/light toggle (the theme *is* the mode)
- Model retraining UI (models ship pre-trained on `ml-models`)

## 11. Open Questions

1. Bottle-green vs midnight-navy base — decide in the Phase-0 design spike (build both, screenshot, pick).
2. Command Center: Ticker Hall vs Switchboard — prototype Ticker Hall first, Switchboard only if time allows.
3. Chatbot model: Gemma via Ollama confirmed; context-window strategy for large graph summaries TBD in Phase 4.
4. Demo deployment target (local docker vs cloud) — decide by Phase 3; local-first, cloud as bonus.

---

*ARGUS-PRISM V3 — "The hundred eyes see what others cannot. This time, everything they show is real."*
