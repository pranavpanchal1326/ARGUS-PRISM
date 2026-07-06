# ARGUS-PRISM — V3

> Pre-crime Intelligence System for Mule Detection — Union Bank of India, FIU.
> *"The hundred eyes see what others cannot. This time, everything they show is real."*

V3 is the production-grade rebuild of the iDEA 2.0 hackathon system. It is built
under **three laws** (see `PRD-V3.md` on the `docs` branch):

1. **Contract first** — a feature does not exist until its endpoint is in
   `contracts/openapi.yaml`. There is no `USE_MOCK` flag anywhere.
2. **No fake anything** — every number on every screen is computed by the backend
   from real (simulated) transaction data flowing through the real pipeline.
3. **No secrets on glass** — no keys, tokens, or security material is ever rendered
   in the UI. Integrity is communicated through *status*, never raw key material.

## Repository layout (monorepo)

```
contracts/        OpenAPI 3.1 contract — the single source of truth (shared, dual-approval)
backend/          FastAPI services: auth, alerts, accounts, cases, graph, autostr, …
  app/core/       config, response envelope, problem+json, security, logging
  app/engines/    the proven IP: WarmthScore, recruiter, taint, autostr
  app/simulator/  seeded, YAML-campaign scenario engine (the live transaction faucet)
ml-models/        pre-trained model artifacts + training/data-generation code
infra/            docker-compose, Dockerfiles, CI-adjacent ops
.github/          CI: ruff+mypy, contract tests, secret-grep tripwire
```

## Branch ownership

- **Aditya** — `backend-api`, `backend-pipeline`, `ml-models`, `auth`, `infra`, CI, simulator, chatbot backend.
- **Pranav** — `ui-shell`, `ui-live-feed`, `ui-chatbot`, `docs`, design system, all screens.
- **Shared** — `contracts/openapi.yaml` (dual approval). `main` is the protected trunk.

## Quick start (backend, local — no Docker required)

```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate   # Windows
pip install -e ".[dev]"
cp ../.env.example ../.env
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/health   and   /docs
```

Without Docker the backend falls back to a local SQLite database and an in-memory
event bus, so the API can be developed before standing up Postgres/Neo4j/Redis.

## Full stack (Docker)

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up --build
# API → :8000   Postgres → :5432   Neo4j → :7474/:7687   Redis → :6379   Ollama → :11434
```

## The contract workflow

1. Add the endpoint to `contracts/openapi.yaml` (PR to `main`).
2. Backend implements it; frontend generates its TS client from the same contract.
3. CI runs `schemathesis` against the running API to machine-check the implementation.

`main` only receives merges that pass CI. Conventional commits. No direct pushes to `main`.
