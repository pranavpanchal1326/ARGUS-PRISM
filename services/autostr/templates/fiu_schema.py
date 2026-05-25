"""
Pydantic v2 schemas for FIU-IND XML generation.
"""

from typing import List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class SignalScore(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    signal_name: str        
    # one of: test_credit_pattern, device_fingerprint,
    # velocity_derivative, dormant_reactivation,
    # fri_contradiction, sim_swap_velocity
    raw_score: float = Field(ge=0.0, le=1.0)
    weighted_score: float = Field(ge=0.0, le=100.0)
    shap_impact: float      # SHAP attribution value

class SHAPAttribution(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    primary_signal: str
    primary_impact: float
    secondary_signal: str
    secondary_impact: float
    tertiary_signal: str
    tertiary_impact: float

class TransactionRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    transaction_id: str
    transaction_type: str   # UPI/NEFT/RTGS/IMPS/ATM/BRANCH
    amount: float
    transaction_timestamp: datetime
    source_account_id: str
    destination_account_id: str
    channel: str
    device_id_raw: str      # raw IMEI — hashed before XML output
    ip_address_raw: str     # raw IP — masked before XML output

class AccountRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    account_id: str
    account_type: str       # SAVINGS/CURRENT/JAN_DHAN
    holder_name: str
    mobile_raw: str         # raw mobile — masked before XML output
    aadhaar_raw: str        # raw Aadhaar — hashed before XML output
    pan_raw: str            # raw PAN — hashed before XML output
    branch_code: str
    ifsc: str
    kyc_status: str         # VERIFIED/PENDING/FAILED
    warmth_score: float
    risk_level: str         # CLEAN/WARMING/HOT/CRITICAL/IMMINENT

class FIUReportInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    case_id: str
    reporting_entity_code: str
    principal_officer_name: str
    principal_officer_designation: str
    principal_officer_email: str
    detection_timestamp: datetime
    threshold_crossed: float
    accounts: List[AccountRecord] = Field(min_length=1)
    transactions: List[TransactionRecord] = Field(min_length=1)
    signal_scores: List[SignalScore] = Field(min_length=6, max_length=6)
    shap_attribution: SHAPAttribution
