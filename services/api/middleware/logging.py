import time
import uuid
import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from ..config import get_settings

logger = structlog.get_logger("prism.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        settings = get_settings()

        start_time = time.monotonic()
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            status_code = 500
            raise
        finally:
            process_time = (time.monotonic() - start_time) * 1000

            logger.info(
                "request_processed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                duration_ms=round(process_time, 2),
                environment=settings.environment,
                engine="PRISM",
            )
        
        return response
