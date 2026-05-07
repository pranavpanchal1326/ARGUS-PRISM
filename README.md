# ═══════════════════════════════════════
# ARGUS-PRISM | README.md
# Engine: PRISM Core
# Branch: pranav/api
# ═══════════════════════════════════════

# ARGUS-PRISM
## PRISM — Pre-crime Intelligence System for Mule Detection
## Team ARGUS | iDEA 2.0 | PS3 | Union Bank of India

MuleHunter.AI is in 23 banks. It detects mule accounts after funds arrive.
FRI flags known fraudulent numbers. Clean SIMs bypass it entirely.
India's largest banks are reverting to branch visits because mule
accounts broke digital onboarding. There is no third option. Until now.

PRISM detects the warming phase — 72 hours before the first illicit
rupee arrives — using KYC Master Direction authority, not PMLA, and
generates FIU-IND + CBI evidence packages automatically.

The mule network cannot hide by waiting — Taint Propagation Engine
gives PRISM persistent memory across every confirmed case.

**By the time the money moves, the FIU report is already written.**

## The Five Engines
1. FlowGraph — Real-time Neo4j transaction graph. Complete PS3 coverage.
2. WarmthScore — 6 behavioral signals detecting mule warming 72hrs before funds arrive.
3. AutoSTR v2 — FIU-IND XML + CBI Evidence Package + RBI Report. Auto-generated.
4. Taint Propagation — Persistent network memory across confirmed mule cases.
5. Recruiter Mapper — Detects the coordinator shutting down entire campaigns at once.

## Tech Stack
Apache Kafka | Apache Flink | Neo4j | XGBoost | Python | FastAPI | React | PostgreSQL | Redis | DoT DIP API | AES-256 + HSM

## Quick start (API)

1. Create a virtual environment and activate it.
2. Install API dependencies from services/api/requirements.txt.
3. Run the API from services/api/ with uvicorn main:app --reload.

## Docker compose

1. Copy .env.example to .env and set real secrets.
2. Run docker-compose up --build from the repository root.

## Health checks

- GET /health
- GET /health/ready
- GET /health/live

## Team
- Pranav Panchal
- Aditya B
- Pranita Panchal

## iDEA 2.0 | Union Bank of India | March 2026
