"""Response envelope + RFC-7807 problem+json.

Every success response the UI consumes is enveloped as ``{"data": ...}`` (lists add
``"meta": {"cursor": ..., "total": ...}``). Every error is problem+json. This is
Law 1's envelope convention — the thing that crashed V2's alert queue — made
mandatory here.
"""

from __future__ import annotations

from typing import Any

from fastapi import Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse


def envelope(data: Any, *, cursor: str | None = None, total: int | None = None) -> dict[str, Any]:
    """Wrap a payload in the standard success envelope."""
    body: dict[str, Any] = {"data": data}
    if cursor is not None or total is not None:
        body["meta"] = {"cursor": cursor, "total": total}
    return body


def list_envelope(
    items: list[Any], *, cursor: str | None = None, total: int | None = None
) -> dict[str, Any]:
    """Envelope for list endpoints — always includes ``meta``."""
    return {"data": items, "meta": {"cursor": cursor, "total": total}}


class ProblemException(Exception):
    """Raise to return an RFC-7807 problem+json error.

    Prefer this over ``HTTPException`` so every error path is consistent.
    """

    def __init__(
        self,
        status_code: int,
        title: str,
        *,
        detail: str | None = None,
        code: str | None = None,
        type_: str = "about:blank",
    ) -> None:
        self.status_code = status_code
        self.title = title
        self.detail = detail
        self.code = code
        self.type = type_
        super().__init__(detail or title)


def problem_response(
    request: Request,
    status_code: int,
    title: str,
    *,
    detail: str | None = None,
    code: str | None = None,
    type_: str = "about:blank",
) -> JSONResponse:
    body: dict[str, Any] = {
        "type": type_,
        "title": title,
        "status": status_code,
        "instance": str(request.url.path),
    }
    if detail:
        body["detail"] = detail
    if code:
        body["code"] = code
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder(body),
        media_type="application/problem+json",
    )


def register_exception_handlers(app: Any) -> None:
    """Wire problem+json handlers for our exception + FastAPI's built-ins."""
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    @app.exception_handler(ProblemException)
    async def _problem_handler(request: Request, exc: ProblemException) -> JSONResponse:
        return problem_response(
            request,
            exc.status_code,
            exc.title,
            detail=exc.detail,
            code=exc.code,
            type_=exc.type,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        title = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return problem_response(request, exc.status_code, title)

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return problem_response(
            request,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Validation failed",
            detail="; ".join(
                f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors()
            ),
            code="validation_error",
        )
