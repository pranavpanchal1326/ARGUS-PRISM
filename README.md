# ═══════════════════════════════════════
# ARGUS-PRISM | README.md
# Engine: PRISM Core
# Branch: pranav/api
# ═══════════════════════════════════════

# ARGUS-PRISM

PRISM is a pre-crime mule account detection system for Union Bank of India.
This repository contains the FastAPI service skeleton, ML module structure,
and dashboard scaffold for iDEA 2.0.

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
