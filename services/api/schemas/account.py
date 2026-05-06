# ═══════════════════════════════════════
# ARGUS-PRISM | account.py
# Engine: FlowGraph
# Branch: pranav/api
# ═══════════════════════════════════════
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel

from schemas.common import PRISMBaseResponse


class AccountChannel(str, Enum):
    UPI = "UPI"
    NEFT = "NEFT"
    RTGS = "RTGS"
    IMPS = "IMPS"
    ATM = "ATM"
    BRANCH = "BRANCH"


class AccountCreateRequest(BaseModel):
    account_id: str
    customer_name: str
    mobile_number: str
    declared_profession: str
    monthly_income_inr: float
    account_type: str
    branch_code: str
    is_digital_onboarding: bool = True
    kyc_completed: bool = False
    device_imei: Optional[str] = None
    sim_iccid: Optional[str] = None


class AccountResponse(BaseModel):
    account_id: str
    customer_name: str
    mobile_number: str
    declared_profession: str
    monthly_income_inr: float
    account_type: str
    branch_code: str
    is_digital_onboarding: bool
    kyc_completed: bool
    warmth_score: float = 0.0
    risk_level: str = "CLEAN"
    taint_score: float = 0.0
    is_restricted: bool = False
    created_at: str
    last_updated: str


class AccountListResponse(PRISMBaseResponse):
    total: int
    page: int
    accounts: List[AccountResponse]
