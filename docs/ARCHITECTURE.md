# ARGUS-PRISM — Architecture

This document describes the internal architecture of ARGUS-PRISM: how requests flow, how an
account is scored, how fraud rings are propagated, and how the security and audit guarantees are
implemented. For a product overview, setup, and API summary, see the [README](../README.md).

---

## 1. Architectural overview

ARGUS-PRISM is a layered monolith with clean internal boundaries. The backend separates transport,
orchestration, and algorithms so that the detection logic is pure and independently testable.

```mermaid
flowchart TB
    subgraph Presentation["Presentation layer"]
        FE["React SPA<br/>typed client from OpenAPI"]
    end

    subgraph Transport["Transport layer - routers"]
        AUTHR["auth"]
        DOMR["alerts / accounts / cases /<br/>graph / recruiter / autostr"]
        COMPR["compliance / admin"]
        STREAM["stream (SSE) / assistant"]
    end

    subgraph Orchestration["Orchestration layer - services"]
        PIPE["pipeline<br/>ingest + rescore"]
        AUDIT["audit<br/>hash-chain"]
        FREEZE["freeze"]
        MASK["masking / PII"]
        STR["autostr_service"]
        BUS["event_bus"]
    end

    subgraph Domain["Domain layer - engines (pure)"]
        WS["warmthscore"]
        TAINT["taint"]
        REC["recruiter"]
        GRAPH["graph"]
        GEN["autostr generators"]
    end

    subgraph Persistence["Persistence layer"]
        REPO["SQLAlchemy models + session"]
        FALLBACK["SQLite fallback"]
    end

    FE --> Transport
    Transport --> Orchestration
    Orchestration --> Domain
    Orchestration --> Persistence
    REPO -. unreachable Postgres .-> FALLBACK
```

**Boundary rule.** Engines import no FastAPI and no database session. They accept plain inputs
(`ScoreInput`, account/transaction data) and return plain results. This is what lets the offline
training script reuse the production feature extractor with zero train/serve skew.

---

## 2. Deployment topology

```mermaid
flowchart LR
    subgraph Host["Developer host / Docker"]
        FE["Vite dev server<br/>:5173"]
        API["FastAPI / Uvicorn<br/>:8000"]
        PG[("PostgreSQL :5432")]
        NEO[("Neo4j :7474 / :7687")]
        REDIS[("Redis :6379")]
        OLLAMA["Ollama :11434<br/>optional"]
    end

    FE -->|REST + SSE| API
    API --> PG
    API --> NEO
    API --> REDIS
    API -->|grounded prompt| OLLAMA
```

The frontend runs as a separate dev server; the backend and datastores run under Docker Compose.
The `assistant` compose profile adds Ollama. Health for all dependencies is reported by
`GET /health`.

---

## 3. Request lifecycle

Every protected request passes through authentication, permission enforcement, orchestration, and
(for privileged actions) the audit ledger.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant R as Router
    participant Auth as Auth dependency
    participant Svc as Service
    participant DB as Database
    participant Aud as Audit ledger

    FE->>R: HTTP request + Bearer token
    R->>Auth: require(permission)
    Auth->>Auth: decode JWT, load user, check RBAC
    alt not permitted
        Auth-->>FE: 403 problem+json
    else permitted
        Auth-->>R: current user
        R->>Svc: orchestrate
        Svc->>DB: read / write (single transaction)
        opt privileged action
            Svc->>Aud: append hash-chained entry
        end
        Svc-->>R: result
        R-->>FE: 200 envelope
    end
```

Responses use a consistent envelope, and errors use `application/problem+json`.

---

## 4. Authentication and MFA

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant Auth as Auth router
    participant DB as Database

    FE->>Auth: POST /auth/login (email, password)
    Auth->>DB: verify bcrypt hash
    Auth-->>FE: mfa_token + mfa_enrolled flag

    alt first login (not enrolled)
        FE->>Auth: POST /auth/mfa/enroll (Bearer mfa_token)
        Auth->>DB: store new TOTP secret
        Auth-->>FE: otpauth:// provisioning URI (QR)
    end

    FE->>Auth: POST /auth/mfa/verify (mfa_token, code)
    Auth->>Auth: rate-limit check, verify TOTP
    Auth->>DB: activate MFA, create session (refresh jti)
    Auth-->>FE: access token + refresh token
```

- MFA is mandatory for MLRO and SYS_ADMIN and nagged-but-optional for other roles.
- Verification is rate-limited per user to resist brute force.
- Refresh tokens rotate on use; a reused refresh token is treated as compromise and revoked.

---

## 5. Scoring pipeline

The pipeline is the heart of the system: it ingests a transaction, updates the account, and
rescores it, raising or updating an alert when the score crosses a threshold.

```mermaid
sequenceDiagram
    participant SIM as Simulator / ingest
    participant Pipe as pipeline service
    participant WS as WarmthScore engine
    participant Model as XGBoost / rules
    participant DB as Database
    participant Bus as Event bus

    SIM->>Pipe: ingest_transaction(src, dst, amount, channel)
    Pipe->>DB: persist transaction, touch accounts
    Pipe->>WS: score(ScoreInput)
    WS->>Model: predict(feature vector)
    alt model available
        Model-->>WS: probability + SHAP contributions
    else fallback
        WS->>WS: weighted six-signal scorer
    end
    WS-->>Pipe: ScoreResult (0-100, signals, shap)
    Pipe->>DB: update warmth_score, append score_history
    opt score crosses threshold
        Pipe->>DB: raise / update alert
        Pipe->>Bus: emit alert event
    end
```

WarmthScore bands (watch, warming, hot, critical, imminent) are configurable thresholds. The
score history table records the trajectory over time, which drives the account's sparkline and the
"dormant-then-hot" narrative.

---

## 6. Taint propagation

When an account is confirmed a mule and frozen, taint is propagated through the transaction graph
so connected accounts are re-evaluated.

```mermaid
flowchart TB
    SEED["Confirmed mule (frozen)"] --> BFS{"BFS frontier<br/>depth &lt; max_hops"}
    BFS --> N["For each neighbor"]
    N --> HW{"taint &gt; existing?<br/>(high-water mark)"}
    HW -->|yes| SET["Set taint, mark tainted,<br/>rescore account"]
    HW -->|no| SKIP["Leave stronger taint"]
    SET --> ENQ["Enqueue at depth + 1"]
    SKIP --> ENQ
    ENQ --> BFS
    BFS -->|frontier empty| EMIT["Emit taint.propagated event"]
```

Taint decays geometrically per hop and is folded into the neighbor's WarmthScore as a network
contribution. Because it is a high-water mark, revisiting an account never weakens an existing
stronger taint, and breadth-first order guarantees each account is first reached by its shortest
(strongest) path. The hop limit bounds blast radius so distant strangers are untouched.

---

## 7. Case lifecycle and AutoSTR

```mermaid
stateDiagram-v2
    [*] --> OPEN: escalate alert
    OPEN --> UNDER_REVIEW: analyst investigates
    UNDER_REVIEW --> PENDING_MLRO: escalate for seal
    PENDING_MLRO --> CLOSED_CONFIRMED_MULE: MLRO confirms + freeze + STR
    UNDER_REVIEW --> CLOSED_FALSE_POSITIVE: benign explanation
    PENDING_MLRO --> CLOSED_FALSE_POSITIVE: benign explanation
    CLOSED_CONFIRMED_MULE --> [*]
    CLOSED_FALSE_POSITIVE --> [*]
```

Confirming a mule triggers AutoSTR: the service composes a Suspicious Transaction Report from case
evidence, renders it to PDF (ReportLab), and signs the package. Generation is asynchronous — the
client polls a job until the package is ready to download or approve. Every transition and every
privileged step is written to the audit ledger.

---

## 8. Tamper-evident audit ledger

Each audit entry stores the hash of the previous entry, forming a chain. Any modification or
deletion breaks every subsequent hash, and the verify endpoint recomputes the chain end-to-end.

```mermaid
flowchart LR
    E1["Entry 1<br/>hash = H(data1, genesis)"] --> E2["Entry 2<br/>hash = H(data2, hash1)"]
    E2 --> E3["Entry 3<br/>hash = H(data3, hash2)"]
    E3 --> V{"GET /audit/verify<br/>recompute chain"}
    V -->|all match| OK["intact: true"]
    V -->|mismatch| BREAK["intact: false<br/>broken_at: seq"]
```

Hashing is keyed with an HMAC secret held only on the server (never sent to the UI). The signing
and audit keys are configuration, and rotating them requires re-sealing the chain — documented in
the operational notes.

---

## 9. Data flow and events

```mermaid
flowchart LR
    SIM["Simulator faucet"] -->|transactions| PIPE["pipeline"]
    PIPE -->|scores, alerts| PG[("PostgreSQL")]
    PIPE -->|events| BUS["event bus (Redis)"]
    BUS -->|SSE| FE["Frontend live feed"]
    PG -->|graph sync| NEO[("Neo4j")]
```

The simulator is deterministic (seeded), so a scenario replays identically — valuable for demos
and for reproducing a scored state. Events flow through Redis (or an in-memory bus in the fallback
mode) and are streamed to the frontend over Server-Sent Events for the live floor view.

---

## 10. Graceful degradation

```mermaid
flowchart TB
    START["Backend startup"] --> TRY{"Postgres reachable?"}
    TRY -->|yes| PG["Use PostgreSQL + Redis event bus"]
    TRY -->|no| SQLITE["Use SQLite file + in-memory event bus"]
    PG --> READY["API ready"]
    SQLITE --> READY
```

The API is designed never to fail to start. If the datastores are down it falls back to a local
SQLite database and an in-memory event bus, so development and demos can proceed. Health reporting
distinguishes the active backend so the degraded mode is visible, never silent.

---

## 11. Testing strategy

- **Unit-friendly engines.** Pure functions with deterministic inputs make the detection logic
  straightforward to test.
- **API tests.** The pytest suite exercises auth (full login + MFA + refresh rotation), alerts,
  accounts, cases, compliance, graph/recruiter, AutoSTR, the pipeline, and the assistant's grounded
  fallback path, against a throwaway SQLite database per session.
- **Contract tests.** CI runs schemathesis against the live API to check conformance with
  `openapi.yaml`.
- **Security tripwire.** CI greps the frontend for key material to enforce the no-secrets-on-glass
  law.

See the [README testing section](../README.md#testing-and-ci) for commands.
