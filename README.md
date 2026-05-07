<div align="center">

```
 █████╗ ██████╗  ██████╗ ██╗   ██╗███████╗
██╔══██╗██╔══██╗██╔════╝ ██║   ██║██╔════╝
███████║██████╔╝██║  ███╗██║   ██║███████╗
██╔══██║██╔══██╗██║   ██║██║   ██║╚════██║
██║  ██║██║  ██║╚██████╔╝╚██████╔╝███████║
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝
```

# PRISM — Pre-crime Intelligence System for Mule Detection

**The hundred-eyed guardian. Always watching. Never sleeping.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.x-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)](https://neo4j.com)
[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-231F20?style=for-the-badge&logo=apache-kafka&logoColor=white)](https://kafka.apache.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![iDEA 2.0](https://img.shields.io/badge/iDEA_2.0-PS3-gold?style=for-the-badge)](https://ideahackathon.com)
[![Union Bank](https://img.shields.io/badge/Union_Bank_of_India-₹13L_Prize-blue?style=for-the-badge)](https://unionbankofindia.co.in)

---

> *MuleHunter.AI detects mule accounts after funds arrive. FRI flags numbers already known to be fraudulent.*
> *India's largest banks are reverting to branch visits because they have no third option.*
> **PRISM is the third option.**

**By the time the money moves, the FIU report is already written.**

</div>

---

## 📊 The Crisis — Why PRISM Exists

| Metric | Value | Context |
|--------|-------|---------|
| 🏦 FY25 Total Bank Fraud | **₹36,014 Crore** | 194% increase year-on-year |
| 📈 FY26 H1 Fraud Value | **₹21,515 Crore** | Already 60% of full FY25 in just 6 months |
| 🏛️ PSB Share of Losses | **71% (₹25,667 Cr)** | Public sector banks absorb the majority |
| ⚡ UPI Fraud Cashout | **15 seconds** | Batch systems reviewing 8-hour-old data are dead |
| 🏦 Banks with MuleHunter.AI | **23 banks** | Detects mules *after* funds arrive — too late |
| 🔄 Digital Onboarding | **Paused at SBI, BoI, BoB, ICICI** | Reverting to 1990s branch verification |

**The critical insight:** Fraud cases fell 72%. Fraud *value* rose 30%. Fewer criminals, each stealing exponentially more. Industrial organised operations replacing random fraud. Industrial operations leave patterns. **PRISM reads those patterns.**

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph EXTERNAL["🌐 External Data Sources"]
        FC[Finacle Core Banking\nEvent Stream]
        DOT[DoT DIP API\nFRI Score + SIM Swap]
    end

    subgraph KAFKA["📨 Event Ingestion — Apache Kafka"]
        K1[account_events]
        K2[txn_events]
        K3[device_events]
        K4[kyc_events]
    end

    subgraph FLINK["⚡ Stream Processing — Apache Flink"]
        FL[Stateful Stream Processor\nSub-200ms per event]
    end

    subgraph ENGINES["🔬 PRISM Five Engines"]
        E1["ENGINE 1\n🕸️ FlowGraph\nNeo4j Real-time Graph\n5 PS3 Detectors"]
        E2["ENGINE 2\n🌡️ WarmthScore\n6 Behavioural Signals\nXGBoost + SHAP"]
        E3["ENGINE 3\n📄 AutoSTR v2\nFIU-IND XML\nCBI PDF + RBI Report"]
        E4["ENGINE 4\n☣️ Taint Engine\nPersistent Network Memory\n4-hop Propagation"]
        E5["ENGINE 5\n🕵️ Recruiter Map\nCoordinator Detection\nCampaign Freeze"]
    end

    subgraph DECISION["🧠 Decision Engine"]
        DE[PRISM Decision Core\nScore Fusion + Threshold Actions]
    end

    subgraph EVIDENCE["📦 AutoSTR v2 Output"]
        A1[FIU-IND XML\nSAPTRN + SAPINP\nSAPLEP + SAPPIT]
        A2[CBI Evidence Package PDF\nSC Writ 03/2025 Mandate]
        A3[RBI Regulatory Report\nReal-time Event-driven]
    end

    subgraph STORAGE["💾 Data Layer"]
        PG[(PostgreSQL 16\nCases · Alerts · Audit)]
        RD[(Redis\nWarmthScore Hot Cache)]
        N4[(Neo4j 5.x\nGraph Database)]
    end

    subgraph DASHBOARD["🖥️ MLRO Dashboard"]
        D1[Alert Queue]
        D2[Account Timeline]
        D3[FlowGraph View]
        D4[Recruiter Map]
        D5[AutoSTR Preview]
    end

    FC --> K1 & K2 & K3 & K4
    DOT --> E2
    K1 & K2 & K3 & K4 --> FL
    FL --> E1 & E2 & E4 & E5
    E1 --> N4
    E2 --> RD
    E1 & E2 & E4 & E5 --> DE
    DE --> E3
    E3 --> A1 & A2 & A3
    DE --> PG
    PG & RD & N4 --> DASHBOARD
    D1 & D2 & D3 & D4 & D5 --> DASHBOARD
```

---

## 🔬 The Five Engines

### ENGINE 1 — FlowGraph (PS3 Core Coverage)

Real-time Neo4j transaction graph. Every account is a node. Every transaction is an edge. Five pattern detectors covering 100% of PS3 requirements.

```mermaid
flowchart LR
    subgraph DETECTORS["FlowGraph Pattern Detectors"]
        D1["🔀 Layering Detector\n3+ accounts · 6hr window\nGraph depth search"]
        D2["🔄 Round-Trip Detector\nFunds return to origin\nthrough 2+ intermediaries · 72hr"]
        D3["📊 Structuring Detector\nMultiple sub-₹10L txns\nSame day · Connected cluster"]
        D4["💤 Dormant Activation\n90+ day inactive account\nReceives credit → instant alert"]
        D5["👤 Profile Mismatch\nKYC vs actual txn divergence\nVegetable vendor gets ₹50L"]
    end

    TXN[Incoming Transaction] --> D1 & D2 & D3 & D4 & D5
    D1 & D2 & D3 & D4 & D5 --> ALERT[Pattern Confirmed\n→ Taint Engine Trigger]
```

---

### ENGINE 2 — WarmthScore (Pre-Crime Detection)

Six behavioural signals detecting mule account warming **72 hours before the first illicit rupee arrives.** XGBoost ensemble with SHAP explainability for every MLRO decision.

```mermaid
flowchart TB
    subgraph SIGNALS["Six Behavioural Signals"]
        S1["Signal 1 — Test Credit Pattern\nIsolation Forest\n3-8 micro-credits ₹1-₹500\nWeight: 18%"]
        S2["Signal 2 — Device Fingerprint\nIMEI Cluster Proximity\n263,348 blocked IMEIs\nWeight: 22%"]
        S3["Signal 3 — Velocity Derivative\nConvexity Detector\n2nd derivative · Hour 0-72\nWeight: 15%"]
        S4["Signal 4 — Dormant Reactivation\n180+ days dormant\nNew device on reactivation\nWeight: 20%"]
        S5["Signal 5 — FRI Contradiction\nAnti-Evasion Signal\nFRI LOW + WarmthScore HIGH\nWeight: 15%"]
        S6["Signal 6 — SIM Swap Velocity\nDoT DIP API · Sep 2025 MOU\nSIM swap within 7 days of UPI\nWeight: 10%"]
    end

    subgraph MODEL["XGBoost Ensemble"]
        XG[XGBoost Classifier\nn_estimators=100\nSHAP Attribution]
    end

    subgraph SCORE["WarmthScore Output"]
        W0["0-40 🟢 CLEAN\nNormal monitoring"]
        W1["40-60 🟡 WARMING\nEnhanced monitoring"]
        W2["60-75 🟠 HOT\nKYC re-verification"]
        W3["75-85 🔴 CRITICAL\nUPI restricted · AutoSTR"]
        W4["85-100 ⛔ IMMINENT\nFull restriction · CBI Package"]
    end

    S1 & S2 & S3 & S4 & S5 & S6 --> XG
    XG --> W0 & W1 & W2 & W3 & W4
```

---

### ENGINE 3 — AutoSTR v2 (Evidence Generation)

Three auto-generated evidence packages. STR preparation: **7 days → 60 minutes.**

| Package | Recipient | Format | Legal Mandate | Time |
|---------|-----------|--------|---------------|------|
| FIU-IND STR | Financial Intelligence Unit India | SAPTRN + SAPINP + SAPLEP + SAPPIT XML | PMLA Section 12 | < 60 minutes |
| CBI Evidence Package | Central Bureau of Investigation | Structured PDF — txn lineage, device timeline, network graph | SC Writ 03/2025 | Auto at score 85+ |
| RBI Regulatory Report | Reserve Bank of India | Aggregate fraud intelligence | RBI Cyber Security Framework | Real-time event-driven |

> **No bank in India currently auto-generates CBI evidence packages. The Supreme Court mandated this in January 2026. PRISM is the first.**

---

### ENGINE 4 — Taint Propagation Engine (Persistent Memory)

The feature that makes PRISM an institutional memory system, not just a real-time detector.

```mermaid
flowchart LR
    subgraph CONFIRM["Mule Confirmed"]
        MC[FlowGraph Confirms\nMule Account A]
    end

    subgraph TAINT["4-Hop Taint Propagation"]
        H1["1 Hop — Direct Partner\nTaint Score: 80\nHigh confidence"]
        H2["2 Hops Away\nTaint Score: 55\nStatistically improbable"]
        H3["3 Hops Away\nTaint Score: 30\nEnhanced monitoring"]
        H4["4 Hops Away\nTaint Score: 15\nInformational flag"]
    end

    subgraph MEMORY["18 Months Later"]
        DM[Dormant Account\nReactivates with\nnew device]
        STARTS["WarmthScore starts\nat Taint Score 80\nnot at zero"]
        CATCH["Crosses 85 threshold\nwithin 6 hours\nNot 72 hours"]
    end

    MC --> H1 --> H2 --> H3 --> H4
    H1 --> DM --> STARTS --> CATCH
```

**The mule network cannot hide by waiting. PRISM has persistent memory.**

---

### ENGINE 5 — Recruiter Network Mapper (Upstream Threat)

Every other system catches mules one at a time. PRISM catches the **coordinator** — shutting down the entire campaign simultaneously.

```mermaid
flowchart TB
    subgraph RECRUITER["Recruiter Node Detected"]
        RC["Source Account\nSends ₹50 to\n40 different accounts\nin 48 hours"]
    end

    subgraph CLASSIFY["Classification Thresholds"]
        C1["Campaign Coordinator\n1 source → 5-15 accounts · 48hr\nRestrict outbound > ₹5,000"]
        C2["Industrial Orchestrator\n1 source → 15-40 accounts · 48hr\nFull restriction + AutoSTR + CBI"]
        C3["Platform-Scale Operation\n1 source → 40+ accounts · 48hr\nEmergency escalation · FIU-IND alert"]
    end

    subgraph OUTCOME["Outcome"]
        O1["One detection event\nFreezes coordinator +\nALL connected accounts\nsimultaneously"]
    end

    RC --> C1 & C2 & C3
    C1 & C2 & C3 --> O1
```

---

## ⚖️ Legal Architecture

**The PMLA Legal Cage — and how PRISM escapes it:**

```mermaid
flowchart LR
    subgraph SCORE["WarmthScore Threshold"]
        S1["Score 60-75\nHOT"]
        S2["Score 75-85\nCRITICAL"]
        S3["Score 85-100\nIMMINENT"]
    end

    subgraph LEGAL["Legal Authority"]
        L1["RBI KYC Master Direction\n2016 — Section 38\nKYC Re-verification\nNO court order needed"]
        L2["RBI KYC MD S.38\n+\nPMLA Section 12\nAutoSTR initiated"]
        L3["RBI KYC MD S.38\n+\nPMLA S.12\n+\nSC Writ 03/2025\nCBI Package generated"]
    end

    subgraph ACTION["Bank Action"]
        A1["Video KYC triggered\nNo restriction\nNo customer impact"]
        A2["Outbound UPI restricted\nSTR preparation begins"]
        A3["Full account restriction\nCBI evidence package\nMLRO escalation"]
    end

    S1 --> L1 --> A1
    S2 --> L2 --> A2
    S3 --> L3 --> A3
```

> **PRISM does not circumvent PMLA. It operates in a different legal domain until PMLA naturally applies.** KYC Master Direction restriction = pre-crime. PMLA STR = post-crime evidence. Two legal frameworks, each appropriate to the threat stage.

---

## 🔒 Security Architecture — Seven Layers

| Layer | Implementation |
|-------|---------------|
| **1 — Data Encryption** | AES-256 + HSM-managed keys · TLS 1.3 mandatory · Field-level PII encryption |
| **2 — API Security** | Mutual TLS (mTLS) · HMAC-SHA256 request signing · Rate limiting + reconnaissance alerts |
| **3 — Access Control** | RBAC: MLRO / Fraud Analyst / Admin / Audit · Zero-trust network · Read-only Finacle access |
| **4 — Adversarial Resistance** | Immutable model weight versioning · Dual-approval threshold changes · Model poisoning detection |
| **5 — Evidence Integrity** | Cryptographic signing at generation · SHA-256 hash in immutable log · Write-once evidence packages |
| **6 — Privacy Preservation** | SHA-256 device fingerprints before external queries · Pseudonymised IDs · DPDP Act 2023 compliant |
| **7 — Operational Security** | Dedicated security zone · Biometric admin access · Quarterly penetration testing mandate |

---

## 🖥️ MLRO Dashboard

```mermaid
flowchart LR
    subgraph VIEWS["Five Dashboard Views"]
        V1["🚨 Alert Queue\nRanked by WarmthScore\nTop 2 signals shown\nTaint indicator"]
        V2["📈 Account Timeline\n72-hour WarmthScore\ntrajectory\nSignal events overlay"]
        V3["🕸️ FlowGraph View\nInteractive D3 graph\nNode colour = risk score\nEdge thickness = value"]
        V4["🕵️ Recruiter Map\nCoordinator nodes\nConnected warming accounts\nCampaign scale indicator"]
        V5["📄 AutoSTR Preview\nComplete STR preview\nSHAP attribution shown\n3-package download"]
    end

    subgraph ACTIONS["MLRO Actions"]
        A1[Approve STR]
        A2[Reject + Document]
        A3[Escalate to CBI]
        A4[Request Video KYC]
        A5[Freeze Network]
    end

    V1 & V2 & V3 & V4 & V5 --> A1 & A2 & A3 & A4 & A5
```

---

## 🛠️ Technology Stack

```mermaid
mindmap
  root((PRISM\nTech Stack))
    Event Layer
      Apache Kafka
        Sub-10ms publish latency
        Persistent log for replay
      Apache Flink
        Stateful stream processing
        Per-account state across events
    Graph Layer
      Neo4j 5.x
        Native graph storage
        Cypher pattern queries
        O(1) relationship traversal
    ML Layer
      XGBoost
        6-signal ensemble
        Trained on mule patterns
      SHAP
        Signal attribution
        Regulatory compliance
    Backend
      FastAPI + Python
        Async high-throughput
        MLRO dashboard API
      PostgreSQL 16
        Cases and alerts
        Immutable audit log
      Redis
        WarmthScore hot cache
        Sub-millisecond reads
    Frontend
      React 18
        MLRO dashboard
        WarmthScore timeline
      D3.js
        FlowGraph visualiser
        Recruiter network graph
      Recharts
        Score trend charts
    Security
      AES-256 + HSM
        PII encrypted at rest
      TLS 1.3
        All data in transit
      FIPS 140-2 Level 3
        HSM compliance
    External APIs
      DoT DIP API
        FRI score lookup
        SIM swap events
      Finacle Event Stream
        Read-only subscriber
        Account and txn events
```

---

## 📁 Repository Structure

```
ARGUS-PRISM/
├── README.md                          ← You are here
├── docker-compose.yml                 ← Full stack local setup
├── .github/
│   └── workflows/                     ← CI/CD pipeline
├── docs/
│   ├── architecture.md                ← System architecture diagrams
│   ├── legal-framework.md             ← 7 legal provisions mapped
│   ├── ps3-compliance-map.md          ← Every PS3 requirement covered
│   └── warmthscore-signals.md         ← 6 signals with validation sources
├── services/
│   ├── api/                           ← FastAPI backend (Pranav)
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   ├── accounts.py
│   │   │   ├── warmthscore.py
│   │   │   └── autostr.py
│   │   └── schemas/
│   ├── ml/
│   │   └── warmthscore/               ← WarmthScore engine (Pranav)
│   │       ├── signals/               ← 6 signal processors
│   │       ├── model/                 ← XGBoost ensemble + SHAP
│   │       └── dataset/               ← Synthetic 72hr behavioural data
│   └── dashboard/                     ← React frontend (Pranav)
│       └── src/
│           ├── components/
│           └── pages/
├── src/
│   ├── flowgraph/                     ← Neo4j schema + 5 detectors (Aditya)
│   ├── taint_engine/                  ← Graph propagation (Aditya)
│   ├── recruiter_mapper/              ← Coordinator detection (Aditya)
│   └── autostr/                       ← Evidence packages (Pranav)
│       ├── fiu_xml_generator.py       ← FIU-IND SAPTRN/SAPINP/SAPLEP/SAPPIT
│       ├── cbi_pdf_generator.py       ← CBI Evidence Package (SC Writ 03/2025)
│       └── rbi_report_generator.py   ← RBI Regulatory Report
└── data/
    └── synthetic_demo/                ← Demo behavioural dataset (72-hour campaign)
        └── UBI-2026-DEMO-001/         ← Complete demo account storyline
```

---

## 🚀 Quick Start

### Prerequisites

```bash
Docker Desktop 4.x+
Python 3.11+
Node.js 18+
```

### 1. Clone the Repository

```bash
git clone https://github.com/pranavpanchal1326/ARGUS-PRISM.git
cd ARGUS-PRISM
```

### 2. Start the Full Stack

```bash
docker-compose up -d
```

This starts: Kafka · Flink · Neo4j · PostgreSQL · Redis

### 3. Start the API

```bash
cd services/api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API running at `http://localhost:8000`
Swagger docs at `http://localhost:8000/docs`

### 4. Start the Dashboard

```bash
cd services/dashboard
npm install
npm run dev
```

Dashboard running at `http://localhost:5173`

### 5. Verify Health

```bash
curl http://localhost:8000/health
# {"status": "operational", "engine": "PRISM", "version": "2.0.0"}
```

---

## 🎬 The 4-Minute Demo

| Minute | What You See | The Point |
|--------|-------------|-----------|
| **0:00–1:00** | Account UBI-2026-DEMO-001 · WarmthScore climbs 21→84 over 71 hours · FRI shows LOW the whole time | Signal 5 catches the FRI contradiction. MuleHunter.AI sees nothing. |
| **1:00–2:00** | Score crosses 75 at Hour 60 · KYC trigger fires · UPI restricted · No PMLA invoked | RBI KYC MD S.38 authority. No court order. Account locked 12 hours before funds arrive. |
| **2:00–3:00** | ₹8,50,000 arrives · FlowGraph builds in real time · Recruiter Map shows 23 connected accounts | One click. Coordinator + all 23 accounts frozen simultaneously. Campaign dead. |
| **3:00–4:00** | AutoSTR generates FIU-IND XML + CBI Package + RBI Report · Timestamps shown | First signal: Hour 0. Restricted: Hour 60. Evidence ready: Hour 72 + 47min. |

> *MuleHunter.AI would have seen this account at hour 72 when the credit arrived.*
> *PRISM restricted it at hour 60. The money could not move.*

---

## 📋 PS3 Compliance Map

| PS3 Requirement | PRISM Delivery | Engine |
|----------------|----------------|--------|
| Fund flow tracking system | FlowGraph: real-time Neo4j graph | Engine 1 |
| Maps end-to-end movement of funds | Interactive D3 dashboard — every hop, timestamp, amount | Engine 1 |
| Graph analytics and machine learning | Neo4j Cypher + Apache Flink + XGBoost | Engine 1 + 2 |
| Rapid layering through multiple accounts | Layering Detector: 3+ accounts · 6hr window | Engine 1 |
| Circular transactions (round-tripping) | Round-Trip Detector: origin-to-origin · 2+ intermediaries · 72hr | Engine 1 |
| Structuring below reporting thresholds | Structuring Detector: sub-₹10L · same day · connected cluster | Engine 1 |
| Sudden activation of dormant accounts | Dormant Activation Detector + WarmthScore Signal 4 | Engine 1 + 2 |
| Mismatches between declared profiles | Profile Mismatch Detector + Signal 5 FRI contradiction | Engine 1 + 2 |
| Trace complete journey of funds | FlowGraph full lineage + Taint Engine historical network | Engine 1 + 4 |
| Generate evidence packages for FIU | AutoSTR: FIU-IND XML auto-generated in < 60 minutes | Engine 3 |

---

## 🌐 API Reference

### Core Endpoints

```
GET  /health                              → System status
GET  /api/accounts/{id}                   → Account details
POST /api/accounts                        → Create account
GET  /api/warmthscore/{account_id}        → Score + SHAP breakdown
GET  /api/warmthscore/{account_id}/timeline → 72hr score history
GET  /api/flowgraph/{account_id}          → Transaction subgraph JSON
GET  /api/recruiter/map                   → Full campaign graph
POST /api/autostr/generate/{case_id}      → Generate all 3 evidence packages
GET  /api/alerts?severity=HIGH,CRITICAL   → Active alert queue
```

### WarmthScore Response Example

```json
{
  "account_id": "UBI-2026-DEMO-001",
  "warmth_score": 84.3,
  "risk_level": "CRITICAL",
  "signals": [
    {"signal_name": "dormant_reactivation", "score": 0.91, "weight": 0.20},
    {"signal_name": "device_fingerprint",   "score": 0.88, "weight": 0.22},
    {"signal_name": "fri_contradiction",    "score": 0.76, "weight": 0.15}
  ],
  "shap_top3": [
    {"signal": "device_fingerprint",    "impact": 22.4},
    {"signal": "dormant_reactivation",  "impact": 19.8},
    {"signal": "fri_contradiction",     "impact": 14.1}
  ],
  "legal_action": "KYC_REVERIFICATION_TRIGGERED",
  "legal_basis": "RBI KYC Master Direction 2016 — Section 38",
  "timestamp": "2026-03-15T14:32:11Z"
}
```

---

## 🔴 The Competitive Gap

```mermaid
quadrantChart
    title PRISM vs Existing Systems
    x-axis Pre-Crime Detection --> Post-Crime Detection
    y-axis Static Patterns --> Adaptive Intelligence
    quadrant-1 Best Position
    quadrant-2 Too Late
    quadrant-3 Legacy
    quadrant-4 Limited
    PRISM: [0.15, 0.90]
    MuleHunter.AI: [0.75, 0.35]
    FRI: [0.80, 0.20]
    DPIP: [0.65, 0.30]
    Manual Review: [0.90, 0.05]
```

| Feature | PRISM | MuleHunter.AI | FRI | DPIP |
|---------|-------|---------------|-----|------|
| Pre-crime warming detection | ✅ 72hr window | ❌ | ❌ | ❌ |
| Clean SIM evasion detection | ✅ Signal 5 | ❌ | ❌ | ❌ |
| Persistent taint memory | ✅ 4-hop graph | ❌ | ❌ | ❌ |
| Recruiter network mapping | ✅ Campaign freeze | ❌ | ❌ | ❌ |
| AutoSTR < 60 minutes | ✅ | ❌ | ❌ | ❌ |
| CBI evidence package | ✅ SC Writ 03/2025 | ❌ | ❌ | ❌ |
| No court order restriction | ✅ KYC MD S.38 | ❌ | ❌ | ❌ |
| SHAP explainability | ✅ Every decision | ❌ | ❌ | ❌ |

---

## 🗺️ Product Roadmap

```mermaid
timeline
    title PRISM Deployment Roadmap
    section Phase 1 — Months 1-3
        Union Bank Deployment : All 5 engines live
                              : Finacle integration
                              : FRI + DoT DIP APIs
                              : MLRO dashboard operational
    section Phase 2 — Months 3-9
        PSB Expansion : 3 additional PSBs
                      : Cross-PSB taint score sharing
                      : Recruiter networks mapped across banks
                      : License fee per PSB
    section Phase 3 — Months 6-8
        Global Fintech Fest : Live demo at GFF 2026
                            : International payment network interest
                            : SWIFT member bank discussions
    section Phase 4 — Months 12-24
        Platform : PRISM API for cooperative banks
                 : SaaS model — per-alert pricing
                 : MuleHunter.AI complement positioning
```

---

## 👥 Team ARGUS

| Member | Role | Ownership |
|--------|------|-----------|
| **Pranav Panchal** | ML Engineer · Backend · Frontend · DevOps | WarmthScore · AutoSTR · FastAPI · React Dashboard · Vercel |
| **Aditya B** | Data Pipeline · Graph Engineer | Kafka · Flink · Neo4j · Taint Engine · Recruiter Mapper · Synthetic Data |
| **Pranita Panchal** | Research & Documentation | Legal Framework · PS3 Compliance · Product Strategy |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | Complete system architecture with diagrams |
| [Legal Framework](docs/legal-framework.md) | All 7 legal provisions mapped to PRISM actions |
| [PS3 Compliance Map](docs/ps3-compliance-map.md) | Every PS3 requirement covered with evidence |
| [WarmthScore Signals](docs/warmthscore-signals.md) | All 6 signals with validation sources |

---

## 📜 Legal & Regulatory Framework

| Regulation | Section | PRISM Application |
|-----------|---------|-------------------|
| RBI KYC Master Direction 2016 | Section 38 | Score 60-85: KYC re-verification. No court order. |
| Prevention of Money Laundering Act | Section 12 | Score 75+: AutoSTR within 60 minutes of suspicion |
| RBI FRI Directive — June 2025 | All SCBs | Signal 5: FRI integration + anti-evasion detection |
| DoT-FIU MOU — September 2025 | DIP Platform | Signal 6: SIM swap events via DoT DIP API |
| Supreme Court Writ 03/2025 | In Re: Digital Arrest | Score 85+: CBI Evidence Package auto-generated |
| Digital Personal Data Protection Act 2023 | Data Minimisation | SHA-256 hashed fingerprints. Raw PII never leaves bank. |
| RBI Cyber Security Framework | Real-time Monitoring | Kafka sub-200ms event processing with audit trail |

---

## ⭐ Key Statistics

```
₹36,014 Cr  →  FY25 Total Bank Fraud Value
194%        →  Year-on-year increase
72 hours    →  PRISM warming detection window
60 minutes  →  AutoSTR generation time (vs 7 days manual)
4 hops      →  Taint propagation depth
6 signals   →  WarmthScore behavioural indicators
3 packages  →  AutoSTR evidence outputs
0           →  Court orders needed below score 85
```

---

<div align="center">

**ARGUS · iDEA 2.0 · PS3 · Union Bank of India · March 2026**

*The hundred eyes see what others cannot. They never close.*

[![GitHub Stars](https://img.shields.io/github/stars/pranavpanchal1326/ARGUS-PRISM?style=social)](https://github.com/pranavpanchal1326/ARGUS-PRISM/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/pranavpanchal1326/ARGUS-PRISM?style=social)](https://github.com/pranavpanchal1326/ARGUS-PRISM/network/members)

</div>
