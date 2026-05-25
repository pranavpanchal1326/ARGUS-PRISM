from datetime import datetime
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class PRISMResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    code: int
    timestamp: datetime
    request_id: str


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool
    data: List[T]
    total: int
    page: int
    page_size: int
    has_next: bool
    timestamp: datetime
    request_id: str


def success_response(data: T, request_id: str, code: int = 200) -> PRISMResponse[T]:
    return PRISMResponse(
        success=True,
        data=data,
        error=None,
        code=code,
        timestamp=datetime.utcnow(),
        request_id=request_id,
    )


def error_response(message: str, request_id: str, code: int) -> PRISMResponse[None]:
    return PRISMResponse(
        success=False,
        data=None,
        error=message,
        code=code,
        timestamp=datetime.utcnow(),
        request_id=request_id,
    )


def paginated_response(
    data: List[T], total: int, page: int, page_size: int, request_id: str
) -> PaginatedResponse[T]:
    has_next = (page * page_size) < total
    return PaginatedResponse(
        success=True,
        data=data,
        total=total,
        page=page,
        page_size=page_size,
        has_next=has_next,
        timestamp=datetime.utcnow(),
        request_id=request_id,
    )
