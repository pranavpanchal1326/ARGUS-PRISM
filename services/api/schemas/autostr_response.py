"""
Pydantic v2 schemas for AutoSTR API responses.
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional

class PackageStatus(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    generated: bool
    hash: str
    generation_time_ms: float

class AutoSTRAPIResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    case_id: str
    account_id: str
    status: str          # "COMPLETE" / "PARTIAL" / "FAILED"
    
    fiu_xml: PackageStatus
    cbi_pdf: PackageStatus
    rbi_report: PackageStatus
    
    total_generation_time_seconds: float
    generated_at: str    # IST ISO8601
    
    # For dashboard download buttons
    fiu_xml_download_path: str
    cbi_pdf_download_path: str
    
    # Legal compliance flags
    pmla_s12_fulfilled: bool
    sc_writ_03_2025_fulfilled: bool
    rbi_csf_fulfilled: bool
    
    all_legal_obligations_met: bool
