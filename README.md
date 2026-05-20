<div align="center">

<br/>

# ARGUS · PRISM

### *The hundred-eyed guardian. Always watching. Never sleeping.*

<br/>

[![](https://img.shields.io/badge/iDEA_2.0-PS3_Submission-CF3421?style=for-the-badge&labelColor=1A1410)](https://ideahackathon.com)
[![](https://img.shields.io/badge/Union_Bank_of_India-Host_Bank-1A1410?style=for-the-badge&labelColor=0d0d0d)](https://unionbankofindia.co.in)
[![](https://img.shields.io/badge/Prize_Pool-₹13_Lakh-C9A84C?style=for-the-badge&labelColor=1A1410)](https://ideahackathon.com)
[![](https://img.shields.io/badge/Status-Active_Build-00b300?style=for-the-badge&labelColor=1A1410)]()

<br/>

[![](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![](https://img.shields.io/badge/Apache_Kafka-231F20?style=flat-square&logo=apachekafka&logoColor=white)](https://kafka.apache.org)
[![](https://img.shields.io/badge/Apache_Flink-E6526F?style=flat-square&logo=apacheflink&logoColor=white)](https://flink.apache.org)
[![](https://img.shields.io/badge/Neo4j-008CC1?style=flat-square&logo=neo4j&logoColor=white)](https://neo4j.com)
[![](https://img.shields.io/badge/XGBoost-337AB7?style=flat-square&logo=python&logoColor=white)](https://xgboost.ai)
[![](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![](https://img.shields.io/badge/Redis-DD0031?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)

<br/>

---

<table>
<tr>
<td align="center" width="200">
<h2>₹36,014 Cr</h2>
<sub>FY25 Bank Fraud Value<br/><b>↑ 194% in one year</b></sub>
</td>
<td align="center" width="200">
<h2>72 Hours</h2>
<sub>Pre-crime detection window<br/><b>before first illicit rupee</b></sub>
</td>
<td align="center" width="200">
<h2>< 60 Min</h2>
<sub>AutoSTR generation<br/><b>vs 3–7 days manual</b></sub>
</td>
<td align="center" width="200">
<h2>5 Engines</h2>
<sub>FlowGraph · WarmthScore<br/><b>AutoSTR · Taint · Recruiter</b></sub>
</td>
</tr>
</table>

---

<br/>

**[🔴 Live Demo](https://argus-prism.vercel.app)** &nbsp;·&nbsp; **[🎥 Watch Demo](https://youtu.be/MOCxElwevF4)** &nbsp;·&nbsp; **[📐 Architecture](#architecture)** &nbsp;·&nbsp; **[⚖️ Legal Framework](#legal-architecture)** &nbsp;·&nbsp; **[🚀 Quick Start](#quick-start)**

<br/>

</div>

---

## The Problem

> MuleHunter.AI is deployed in 23 banks. It detects mule accounts **after funds arrive.**
> FRI flags known fraudulent numbers. Clean SIMs bought from Tier-3 cities bypass it entirely.
> India's largest banks have paused digital onboarding. The system has no answer for the 72-hour window before illicit funds arrive.

```
₹36,014 Cr in bank fraud in FY25.   Up 194% in one year.
FY26 H1: ₹21,515 Cr already.        60% of full FY25 — in six months.
Fraud cases fell 72%.                Fraud value rose 30%.
```

> **The critical insight:** Fewer criminals. Each stealing exponentially more. This is industrial organised operations replacing random fraud. Industrial operations leave patterns. **PRISM reads those patterns.**

**The Digital Onboarding Retreat:** ICICI Bank has discontinued instant online account-opening entirely. SBI, Bank of India, and Bank of Baroda have paused fully digital onboarding. The entire Indian banking system is reverting to 1990s branch verification because mule accounts broke digital onboarding. **PRISM gives them a third option.**

---

## What PRISM Does

```
HOUR 00 ──  Account created. FRI score: LOW (recruiter bought clean SIM). WarmthScore: 21.
HOUR 12 ──  Signal 1 fires.  Test micro-credits from dormant source accounts. Score: 29.
HOUR 24 ──  Signal 2 fires.  Device IMEI matches blocked cluster prefix. Score: 41.  ◀ WARMING
HOUR 36 ──  Signal 3 fires.  Velocity derivative curve turns convex. Score: 58.
HOUR 48 ──  Signal 5 fires.  FRI LOW contradicts WarmthScore HIGH — evasion detected. Score: 69.
HOUR 60 ──  Score crosses 75.
            ┌─────────────────────────────────────────────────────────────┐
            │  KYC Re-verification triggered — RBI KYC Master Direction   │
            │  Section 38. Outbound UPI RESTRICTED.                       │
            │  No court order. No PMLA invocation. No legal exposure.     │
            └─────────────────────────────────────────────────────────────┘
HOUR 72 ──  First illicit credit arrives: ₹8,50,000.
            Funds CANNOT LEAVE. Account already restricted.
HOUR 72+34s FlowGraph confirms layering across 4 accounts.
            Recruiter node identified: 1 source → 23 warming accounts / 48 hrs.
HOUR 72+47m AutoSTR generates: FIU-IND XML + CBI Evidence Package + RBI Report.
HOUR 72+58m MLRO approves and submits. Case closed.

──────────────────────────────────────────────────────────────────────────
  MuleHunter.AI would have seen this account at Hour 72.
  PRISM restricted it at Hour 60. The money could not move.
──────────────────────────────────────────────────────────────────────────
```

---

## The Five Engines

<details>
<summary><b>Engine 1 — FlowGraph &nbsp;·&nbsp; PS3 Core Coverage</b></summary>
<br/>

Real-time Neo4j graph database. Every transaction is an edge. Every account is a node. FlowGraph alone fulfils every explicit PS3 requirement. The four engines that follow are differentiation built on top of a solid, compliant foundation.

| Detector | Pattern | PS3 Requirement Covered |
|----------|---------|------------------------|
| **Layering Detector** | Funds touching 3+ accounts within 6 hours before final withdrawal. Graph depth search with timestamp constraint | *"rapid layering through multiple accounts"* |
| **Round-Trip Detector** | Funds returning to origin through 2+ intermediaries within 72 hours. Cycle detection in directed graph | *"circular transactions (round-tripping)"* |
| **Structuring Detector** | Multiple transactions below ₹10 lakh in same day from connected account cluster | *"structuring below reporting thresholds"* |
| **Dormant Activation** | Zero-transaction account (90+ days inactive) receiving credit. Immediate graph node activation alert | *"sudden activation of dormant accounts"* |
| **Profile Mismatch** | Account declared as vegetable vendor receiving ₹50L in 48 hours. KYC profile vs transaction profile divergence score | *"mismatches between declared customer profiles"* |

> FlowGraph alone is a complete PS3 submission. Every requirement covered. Demonstrated first. Establishes credibility before the novel engines are introduced.

</details>

<details>
<summary><b>Engine 2 — WarmthScore &nbsp;·&nbsp; Six Signals, Pre-Crime Detection</b></summary>
<br/>

Six behavioural signals. One ensemble score. Detects mule warming patterns **72 hours before illicit funds arrive.** XGBoost trained on published research patterns. Full SHAP attribution at every scoring event — a regulatory requirement for MLRO decisions.

| Signal | Model | Weight | What It Catches |
|--------|-------|--------|----------------|
| **S1 — Test Credit Pattern** | Isolation Forest | 18% | 3–8 micro-credits (₹1–₹500) within 48 hours from new or dormant source accounts |
| **S2 — Device Fingerprint** | IMEI cluster proximity scoring | 22% | Device sharing first 8 digits of IMEI prefix with 3+ known fraud devices — even if specific IMEI not yet blocked |
| **S3 — Velocity Derivative** | Time-series convexity detector | 15% | Second derivative of transaction velocity crossing zero before hour 48 — the recruiter pipeline-testing signature |
| **S4 — Dormant Reactivation** | Rule-based + ML refinement | 20% | 180+ days dormant, reactivated on different device — strongest single-session mule indicator |
| **S5 — FRI Contradiction** | Disagreement scoring | 15% | **The anti-evasion signal.** FRI LOW + WarmthScore HIGH = mule network bought clean SIM to bypass FRI. Catches exactly this |
| **S6 — SIM Swap Velocity** | Event correlation | 10% | SIM swap within 7 days of UPI registration. New data layer from DoT-FIU MOU September 2025 |

**Score → Action Mapping:**

| Score | Level | Action | Legal Basis |
|-------|-------|--------|-------------|
| 0–40 | 🟢 **CLEAN** | Normal monitoring | Internal policy |
| 40–60 | 🟡 **WARMING** | Enhanced monitoring. Internal flag only | Internal risk policy |
| 60–75 | 🟠 **HOT** | KYC re-verification. Video KYC call | RBI KYC Master Direction 2016 §38 |
| 75–85 | 🔴 **CRITICAL** | Outbound UPI restricted. AutoSTR initiated | RBI KYC MD §38 |
| 85–100 | ⛔ **IMMINENT** | Full restriction + CBI Package + MLRO escalation | RBI KYC MD §38 + PMLA §12 + SC Writ 03/2025 |

</details>

<details>
<summary><b>Engine 3 — AutoSTR v2 &nbsp;·&nbsp; Three Evidence Packages, One API Call</b></summary>
<br/>

AutoSTR v1 generated one output. AutoSTR v2 generates three — matched to three different authorities, each with a different legal mandate.

| Package | Recipient | Format | Legal Mandate | Before PRISM | With PRISM |
|---------|-----------|--------|---------------|-------------|------------|
| **FIU-IND STR** | Financial Intelligence Unit India | SAPTRN + SAPINP + SAPLEP + SAPPIT XML | PMLA §12 — mandatory STR within 7 days of suspicion | 3–7 days manual preparation | **< 60 minutes** |
| **CBI Evidence Package** | Central Bureau of Investigation | Structured PDF — transaction lineage, device timeline, network graph export | SC Suo Moto Writ 03/2025 — CBI primary agency for digital arrest fraud | Not systematically produced by **any bank in India** | **Auto-generated at WarmthScore 85+** |
| **RBI Regulatory Report** | Reserve Bank of India | Aggregate fraud intelligence in RBI prescribed format | RBI Cyber Security Framework | Quarterly manual compilation | **Real-time, event-driven** |

> No bank in India currently generates structured CBI evidence packages automatically. The Supreme Court directed this in January 2026. PRISM is the first product to implement it.

</details>

<details>
<summary><b>Engine 4 — Taint Propagation Engine &nbsp;·&nbsp; Persistent Network Memory</b></summary>
<br/>

When a mule network operates, 1 account gets caught. The other 39 go dormant for 12–18 months. They reactivate with clean WarmthScores — because every existing system has **no memory** of the prior network connection. Taint Propagation Engine solves this permanently.

The moment FlowGraph confirms a mule account, the Taint Engine back-traces the complete transaction graph up to 4 hops in both directions. Each connected account receives a **persistent Taint Score** written to its Neo4j node.

| Graph Hop | Taint Score | Rationale |
|-----------|-------------|-----------|
| Direct (1 hop) | **80** | Direct participation in confirmed mule network |
| 2 hops | **55** | Connected to a direct partner — statistically improbable by coincidence |
| 3 hops | **30** | May be legitimate. Flag for enhanced monitoring. Do not restrict |
| 4 hops | **15** | Ambient network proximity. Informational flag only |
| 5+ hops | 0 | Graph connectivity too loose to be meaningful |

**The Compounding Effect:** When any tainted account shows warming signals months later, WarmthScore starts at the Taint Score — not zero. A dormant account with Taint Score 80 showing Signal 4 immediately crosses 85. Detection window collapses from 72 hours to under **12 hours.**

> The mule network cannot hide by waiting.

</details>

<details>
<summary><b>Engine 5 — Recruiter Network Mapper &nbsp;·&nbsp; The Upstream Threat</b></summary>
<br/>

Every system focuses on mule accounts — the accounts that receive illicit funds. But mule accounts are the employees. They are replaceable. **The organisation has a boss.**

The recruiter account sends test payments to multiple warming accounts simultaneously. One source account sending ₹50 to 40 different accounts in 48 hours is not a mule. It is the coordinator running the campaign. It never receives illicit funds — so no WarmthScore fires on it. Every rule-based system sees these as normal micro-transactions.

**PRISM is the only system that detects the coordinator.**

| Classification | Threshold | Action |
|----------------|-----------|--------|
| **Campaign Coordinator** | 1 source → 5–15 warming accounts / 48 hrs | Flag for investigation. Restrict outbound > ₹5,000. MLRO notified |
| **Industrial Orchestrator** | 1 source → 15–40 warming accounts / 48 hrs | Immediate full restriction. AutoSTR + CBI Package. Organised crime event |
| **Platform-Scale Operation** | 1 source → 40+ accounts / 48 hrs | Emergency escalation. FIU-IND real-time alert. All connected accounts frozen simultaneously |

> One detection event shuts down the entire campaign. Stopping the recruiter is stopping the factory, not stopping individual products.

</details>

---

## Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║               PRISM v2 — SYSTEM ARCHITECTURE                    ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  EXTERNAL DATA SOURCES                                           ║
║  ┌──────────────────────────┐  ┌───────────────────────────┐    ║
║  │  Finacle Core Banking     │  │  DoT DIP API              │    ║
║  │  (Read-Only Event Stream) │  │  FRI Score + SIM Swap     │    ║
║  └────────────┬─────────────┘  └─────────────┬─────────────┘    ║
║               │                               │                  ║
║               ▼                               ▼                  ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │             Apache Kafka  (4 Topics)                       │  ║
║  │  account.created · transaction.posted · device.registered  │  ║
║  │  kyc.updated                                               │  ║
║  └───────────────────────────┬────────────────────────────────┘  ║
║                               │                                  ║
║                               ▼                                  ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │           Apache Flink  (Stateful Stream Processing)       │  ║
║  │  ┌─────────────┬──────────────────┬──────────────────────┐ │  ║
║  │  │  FlowGraph  │   WarmthScore    │   Recruiter Mapper   │ │  ║
║  │  │  (Neo4j)    │   (6 Signals)    │   (Network Graph)    │ │  ║
║  │  └──────┬──────┴────────┬─────────┴──────────┬───────────┘ │  ║
║  └─────────┼───────────────┼────────────────────┼─────────────┘  ║
║            └───────────────┼────────────────────┘                ║
║                            ▼                                     ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │            Taint Propagation Engine                         │ ║
║  │         (Neo4j persistent node scores — 4 hops)             │ ║
║  └─────────────────────────────┬───────────────────────────────┘ ║
║                                │                                 ║
║                                ▼                                 ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │                 AutoSTR v2 ENGINE                           │ ║
║  │  ┌──────────────┬─────────────────┬────────────────────┐   │ ║
║  │  │ FIU-IND XML  │  CBI Evidence   │  RBI Regulatory    │   │ ║
║  │  │ (PMLA §12)   │  Package PDF    │  Report            │   │ ║
║  │  └──────────────┴─────────────────┴────────────────────┘   │ ║
║  └─────────────────────────────┬───────────────────────────────┘ ║
║                                │                                 ║
║                                ▼                                 ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │     MLRO REVIEW DASHBOARD  (React 18 + FastAPI)             │ ║
║  │  PostgreSQL · Redis · Audit Trail · Immutable Event Log     │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════╝
```

### Tech Stack

| Layer | Technology | Latency Target |
|-------|-----------|---------------|
| Event Ingestion | **Apache Kafka** — 4 topics, sub-10ms publish latency | < 10ms |
| Stream Processing | **Apache Flink** — stateful, per-account WarmthScore state across events | — |
| Graph Database | **Neo4j 5.x** — index-free adjacency, O(1) relationship traversal | < 100ms query |
| ML Models | **XGBoost + SHAP** — explainable signal ensemble, regulatory-grade attribution | < 50ms score |
| External APIs | **DoT DIP REST API** — FRI lookup (S5) + SIM swap events (S6). Same API, two signals | < 150ms |
| Evidence Generation | **Python + FIU-IND XML Schema + ReportLab** — three packages, one call | < 60 min total |
| API Layer | **FastAPI** — async, high-throughput, OpenAPI docs | — |
| Dashboard | **React 18 + Recharts + D3.js** — WarmthScore timeline, FlowGraph, Recruiter Map | — |
| Primary Database | **PostgreSQL 16** — cases, alerts, taint scores, immutable audit log | — |
| Cache | **Redis** — WarmthScore hot cache, sub-millisecond reads | < 1ms |
| Security | **AES-256 + TLS 1.3 + HSM** — FIPS 140-2 Level 3, field-level PII encryption | — |
| CBS Integration | **Finacle Event Stream** — read-only subscriber, no downtime, never writes to core banking | — |

### Event Processing Latency

| Finacle Event | PRISM Action | Target |
|--------------|--------------|--------|
| `account.created` | WarmthScore node initialised. Baseline established | **< 50ms** |
| `transaction.posted` | FlowGraph edge added. All 5 detectors re-evaluated. Recruiter map updated | **< 100ms** |
| `device.registered` | Signal 2 evaluated. Signal 6 (SIM swap) queried via DoT DIP | **< 150ms** |
| `kyc.updated` | Signal 5 (FRI contradiction) re-evaluated. Profile mismatch refresh | **< 80ms** |
| `account.status_changed` | Taint propagation triggered if account confirmed mule | **< 200ms** |

---

## Legal Architecture

> PRISM was architected around the legal framework from day one. Every action at every WarmthScore threshold maps to a specific legal authority. No action exceeds what the law permits at that threshold.

| Regulation | Provision | PRISM Application |
|------------|-----------|------------------|
| **RBI KYC Master Direction 2016** | §38 — Banks may restrict account operations pending KYC re-verification **without court order** | WarmthScore 60–85: triggers KYC re-verification. Account operations restricted. Full bank authority. PMLA does not apply |
| **Prevention of Money Laundering Act** | §12 — Banks must file STR with FIU-IND when suspicion of money laundering arises | WarmthScore 75+: AutoSTR initiates STR preparation. Filed within 60 minutes. Fulfils 7-day mandate |
| **RBI FRI Directive — June 2025** | All scheduled commercial banks must integrate FRI into onboarding and transaction monitoring | Signal 5: FRI integration via DoT DIP API. FRI contradiction used as anti-evasion detector |
| **DoT-FIU MOU — September 2025** | Exchange of data on mule accounts via Digital Intelligence Platform | Signal 6: SIM swap events queried via DIP API. New data layer only available post-September 2025 |
| **Supreme Court Writ 03/2025** | CBI designated primary agency for digital arrest fraud. Banks to implement AI-based mule detection | WarmthScore 85+: CBI Evidence Package auto-generated. **No bank currently does this** |
| **DPDP Act 2023** | Data minimisation — process only what is necessary | SHA-256 applied locally before any external query. Raw PII never leaves Union Bank systems |

<details>
<summary><b>⚖️ The PMLA Legal Cage — And How PRISM Escapes It</b></summary>
<br/>

Under PMLA, banks cannot freeze accounts without court authorisation. By the time court authorisation arrives, mule networks have emptied the account. This is a structural legal constraint that has existed since PMLA was enacted and has never been solved.

**PRISM escapes this cage through jurisdictional separation:**

- WarmthScore 60–85 operates under **KYC Master Direction §38** — a completely separate legal framework from PMLA
- Banks can restrict accounts pending KYC completion. No court order. No PMLA invocation. No legal exposure.
- The illicit funds arrive, if at all, after the KYC restriction is already in place
- When funds arrive on a restricted account, PMLA §12 reporting obligation activates and AutoSTR files the STR automatically
- The legal transition from KYC jurisdiction to PMLA jurisdiction happens **automatically** as the crime pattern matures

> PRISM does not circumvent PMLA. It operates in a different legal domain until PMLA naturally applies.
> KYC Master Direction restriction → pre-crime.
> PMLA STR → post-crime evidence.
> Two separate legal actions. Each appropriate to the threat stage. Each fully within bank authority.

</details>

---

## Quick Start

### Prerequisites

```bash
Docker >= 24.0    Docker Compose >= 2.20
Python >= 3.11    Node.js >= 20.0
```

### 1 — Clone & Start the Stack

```bash
git clone https://github.com/your-team/ARGUS-PRISM.git
cd ARGUS-PRISM

# Starts all 7 services: Kafka, Flink, Neo4j, PostgreSQL, Redis, FastAPI, React
docker-compose up -d

# Verify all services healthy
docker-compose ps
```

### 2 — Seed Demo Data & Start Event Stream

```bash
# Seeds 3 mule campaigns with full 72-hour behavioural data
python scripts/demo_seeder.py

# Start Finacle event stream simulation
python scripts/kafka_producer.py &
python scripts/flink_pipeline.py &
```

### 3 — Validate & Launch

```bash
# Run smoke test — all 8 endpoints must return green
python scripts/smoke_test.py

# Open dashboard
open http://localhost:5173

# API docs (Swagger)
open http://localhost:8000/docs
```

| Service | URL |
|---------|-----|
| **MLRO Dashboard** | http://localhost:5173 |
| **FastAPI + Swagger** | http://localhost:8000/docs |
| **Neo4j Browser** | http://localhost:7474 |
| **Kafka UI** | http://localhost:8080 |

---

## API Reference

<details>
<summary><b>View All Endpoints</b></summary>
<br/>

```
# System
GET   /health                                     Service health (postgres/neo4j/redis/kafka/ml)

# Accounts
GET   /api/accounts                               Account list — filterable by risk_level
GET   /api/accounts/{id}                          Account detail
GET   /api/accounts/{id}/timeline/signals         Signal timeline (last N hours)
GET   /api/accounts/{id}/timeline/graph-events    Transaction graph (D3-ready)
POST  /api/accounts/{id}/flag-mule                Flag confirmed mule
PATCH /api/accounts/{id}/status                   Update account status

# WarmthScore
GET   /api/v1/warmthscore/{id}/timeline           Score history
POST  /api/v1/warmthscore/score                   Score an account on-demand
GET   /api/v1/warmthscore/model/status            XGBoost model status

# Recruiter
GET   /api/recruiter/map                          All recruiter nodes
GET   /api/recruiter/{id}/campaign                Campaign detail + D3 graph
POST  /api/recruiter/{id}/freeze                  Freeze coordinator + all downstream

# AutoSTR
POST  /api/autostr/generate/{case_id}             Generate all 3 evidence packages
```

**Example — Score an Account:**

```bash
curl -X POST http://localhost:8000/api/v1/warmthscore/score \
  -H "Content-Type: application/json" \
  -d '{ "account_id": "UBI-2026-DEMO-001", "transactions": [...], "fri_score": "LOW" }'
```

```json
{
  "account_id": "UBI-2026-DEMO-001",
  "warmth_score": 84.2,
  "risk_level": "CRITICAL",
  "shap_top3": [
    { "signal": "dormant_reactivation", "impact": 31.2 },
    { "signal": "device_fingerprint",   "impact": 22.0 },
    { "signal": "fri_contradiction",    "impact": 18.3 }
  ],
  "timestamp": "2026-05-20T14:33:07+05:30"
}
```

</details>

---

## Dashboard — Five Views

| View | What the MLRO Sees | Key Action |
|------|--------------------|------------|
| **Alert Queue** | Ranked list above WarmthScore threshold. Score · top 2 signals · time since first signal · taint indicator | Expand → Review → Approve STR |
| **Account Timeline** | WarmthScore trajectory over 72 hours. Every signal with timestamp. FRI overlay. SHAP breakdown | Mark false positive · Escalate to CBI |
| **FlowGraph** | Interactive D3 graph. Node colour = heat level. Edge thickness = transaction value. Tainted nodes in amber | Export as CBI evidence · Freeze network |
| **Recruiter Map** | Coordinator accounts with campaign scale indicator and downstream mule cluster | Freeze entire campaign in one click |
| **AutoSTR Panel** | Complete STR preview. SAPTRN pre-populated. Grounds of suspicion pre-written from SHAP attribution | Approve → FIU-IND · Download CBI Package |

---

## Project Structure

```
ARGUS-PRISM/
├── docker-compose.yml
├── docs/
│   ├── architecture.md
│   ├── legal-framework.md
│   ├── ps3-compliance-map.md
│   └── warmthscore-signals.md
├── services/
│   ├── api/                          FastAPI backend
│   │   ├── main.py
│   │   ├── routes/
│   │   └── schemas/
│   ├── ml/
│   │   └── warmthscore/
│   │       ├── signals/              S1 – S6 signal processors
│   │       ├── model/                XGBoost ensemble + SHAP
│   │       └── dataset/              Synthetic 72-hour campaign data
│   └── dashboard/                    React 18 frontend
│       └── src/
│           ├── design/               Washi design system tokens
│           ├── components/
│           ├── views/                AlertQueue · Timeline · FlowGraph · Recruiter · AutoSTR
│           └── api/client.js
├── src/
│   ├── flowgraph/                    Neo4j schema + 5 pattern detectors
│   ├── warmthscore/                  Signal processors + ensemble
│   ├── autostr/                      FIU-IND XML + CBI PDF + RBI Report
│   ├── taint_engine/                 Graph propagation + persistent scores
│   ├── recruiter_mapper/             Coordinator node detection
│   └── flink_pipeline/               Stateful stream processing
├── scripts/
│   ├── demo_seeder.py
│   ├── kafka_producer.py
│   ├── flink_pipeline.py
│   └── smoke_test.py
└── data/
    └── synthetic_demo/               72-hour campaign dataset
```

---

## PS3 Compliance Map

Every word of PS3 mapped to specific PRISM components. Zero gaps.

<details>
<summary><b>View Full Compliance Map</b></summary>
<br/>

| PS3 Requirement | PRISM Delivers |
|----------------|---------------|
| *"Fund flow tracking system"* | FlowGraph: real-time Neo4j graph. Every transaction is an edge. Every account is a node |
| *"maps and visualises end-to-end movement of funds"* | FlowGraph dashboard: interactive D3 graph. Every hop, every timestamp, every amount |
| *"within the bank across accounts, products, branches, channels"* | FlowGraph covers NEFT, RTGS, UPI, IMPS, ATM, and branch counter transactions |
| *"graph analytics and machine learning"* | Neo4j Cypher + Apache Flink + XGBoost WarmthScore ensemble |
| *"rapid layering through multiple accounts"* | Layering Detector: 3+ accounts within 6 hours |
| *"circular transactions (round-tripping)"* | Round-Trip Detector: origin-to-origin through 2+ intermediaries within 72 hours |
| *"structuring below reporting thresholds"* | Structuring Detector: multiple sub-₹10L transactions same day from connected accounts |
| *"sudden activation of dormant accounts"* | Dormant Activation Detector + WarmthScore Signal 4 |
| *"mismatches between declared customer profiles and actual fund movement"* | Profile Mismatch Detector + WarmthScore Signal 5 |
| *"trace the complete journey of funds"* | FlowGraph full transaction lineage. Taint Engine extends into historical network |
| *"generate evidence packages for reporting to FIU"* | AutoSTR: FIU-IND XML auto-generated in < 60 minutes |

> **Beyond PS3:** Five engines provide complete PS3 coverage plus four capabilities PS3 did not ask for but Union Bank desperately needs: pre-crime WarmthScore, persistent Taint Memory, Recruiter Network Mapping, and CBI Evidence Packages.

</details>

---

## Known Limitations

Honest disclosure. Evaluators respect teams that acknowledge constraints.

- **Synthetic training data only.** WarmthScore trained entirely on synthetic datasets derived from published research. Production deployment requires retraining on Union Bank's real transaction data with DPDP Act compliance.
- **Signal 6 depends on DoT MOU access.** SIM swap events require DoT DIP API integration under the September 2025 MOU. Banks must formally register with DIP to query this endpoint.
- **Neo4j at full production scale.** FlowGraph performance validated on synthetic datasets. Production performance at Union Bank's full transaction volume requires horizontal partitioning validation.
- **MLRO staffing assumption.** PRISM reduces review time per case — it does not eliminate human review for WarmthScore 75+. Sustained high-volume alert queues require adequate MLRO capacity.
- **Cross-bank taint sharing is Phase 2.** Phase 1 operates entirely within Union Bank. Cross-PSB taint score sharing requires regulatory framework that does not yet fully exist.

---

## Team

<div align="center">

| | Member | Role | Responsibilities |
|-|--------|------|----------------|
| 👤 | **Pranav** | ML · AutoSTR · FastAPI · React | WarmthScore signal engineering · XGBoost + SHAP · FIU-IND XML + CBI PDF generation · FastAPI backend · React dashboard · Vercel deployment |
| 👤 | **Aditya** | Pipeline · FlowGraph · Taint · Recruiter | Kafka ingestion · Flink pipeline · Neo4j graph schema · FlowGraph detectors · Taint Propagation Engine · Recruiter Mapper · Synthetic data |
| 👤 | **Pranita** | Compliance · Legal · Domain | Legal framework architecture · PMLA + KYC MD + SC Writ mapping · PS3 compliance · MLRO workflow design |

</div>

---

## Submission

<div align="center">

| Field | Detail |
|-------|--------|
| **Competition** | iDEA 2.0 — Innovation & Digital Excellence Awards |
| **Host** | Union Bank of India |
| **Problem Statement** | PS3 — Tracking of Funds within Bank for Fraud Detection |
| **Prize Pool** | ₹13 Lakh |
| **Team** | ARGUS |
| **Portal** | [ideahackathon.com](https://ideahackathon.com) |
| **Version** | PRISM v2.0 · March 2026 |

</div>

---

<div align="center">

<br/>

```
  A · R · G · U · S
```

*The hundred eyes see what others cannot. They never close.*

<br/>

> *"MuleHunter.AI detects mule accounts after funds arrive. FRI flags numbers already known to be fraudulent.*
> *India's largest banks are reverting to branch visits because they have no third option.*
> *PRISM is the third option — detect the warming phase 72 hours before the first rupee arrives,*
> *restrict under KYC authority before PMLA applies,*
> *and deliver the CBI evidence package that the Supreme Court mandated and no bank currently generates."*

<br/>

---

**ARGUS · iDEA 2.0 · PS3 · Union Bank of India · 2026**

<br/>

</div>
