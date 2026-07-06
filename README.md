# ARGUS-PRISM (V3)

Repo reset for the V3 rebuild. The hackathon-era codebase (iDEA 2.0, PS3 — Union Bank of India) is preserved outside this repo as a local backup; this branch and its siblings start clean.

## Branches
- `main` — protected integration branch
- `ui-shell` — app shell, routing, layout, retro-bank design system, nav
- `ui-live-feed` — Command Center live transaction/alert dataflow visualization
- `ui-chatbot` — docked AI chatbot widget (Ollama/Gemma)
- `auth` — RBAC, Google OAuth, TOTP 2FA
- `backend-api` — FastAPI service (routers, db, core)
- `backend-pipeline` — pipeline, graph, autostr services, simulator rebuild
- `ml-models` — detection models, embeddings, training
- `infra` — infra, CI/CD, load/chaos configs
- `docs` — planning and architecture docs
