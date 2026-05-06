# ═══════════════════════════════════════
# ARGUS-PRISM | common.py
# Engine: PRISM Core
# Branch: pranav/api
# ═══════════════════════════════════════
from enum import Enum

from pydantic import BaseModel


class PRISMBaseResponse(BaseModel):
    success: bool
    timestamp: str
    engine: str = "PRISM"


class PRISMErrorResponse(BaseModel):
    success: bool = False
    error_code: str
    detail: str
    timestamp: str


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20


class RiskLevel(str, Enum):
    CLEAN = "CLEAN"
    WARMING = "WARMING"
    HOT = "HOT"
    CRITICAL = "CRITICAL"
    IMMINENT = "IMMINENT"
