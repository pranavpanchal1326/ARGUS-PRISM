import logging
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .middleware.logging import RequestLoggingMiddleware
from .routes import health, accounts, warmthscore, autostr

logger = logging.getLogger("prism.main")
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version} in {settings.environment} mode")
    logger.info(f"Loaded thresholds: MONITORING={settings.warmth_threshold_monitoring}, "
                f"KYC={settings.warmth_threshold_kyc}, RESTRICTION={settings.warmth_threshold_restriction}, "
                f"AUTOSTR={settings.warmth_threshold_autostr}, CBI={settings.warmth_threshold_cbi}")
    
    # Verify Neo4j API
    try:
        async with httpx.AsyncClient(timeout=settings.neo4j_api_timeout) as client:
            resp = await client.get(f"{settings.neo4j_api_url.rstrip('/')}/health")
            resp.raise_for_status()
            logger.info("Aditya's Neo4j API is reachable")
    except Exception as e:
        logger.warning(f"Aditya's Neo4j API is currently unreachable: {e}. PRISM starting anyway.")
    
    yield
    
    # Shutdown
    logger.info(f"{settings.app_name} shutting down cleanly.")


app = FastAPI(
    title="ARGUS-PRISM — Pre-crime Intelligence System",
    version=settings.app_version,
    description="Real-time mule account detection for Union Bank of India",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url="/redoc" if settings.environment == "development" else None,
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "development" else ["https://prism.unionbankofindia.co.in"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

# Routers
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(accounts.router)
app.include_router(warmthscore.router, prefix="/api/v1/warmthscore", tags=["WarmthScore"])
app.include_router(autostr.router, prefix="/api")

# Exception Handlers
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "unknown")
    # Never expose stack traces to client
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "code": 500}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", "unknown")
    errors = [{"loc": e["loc"], "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={"success": False, "error": "Validation failed", "details": errors, "code": 422}
    )
