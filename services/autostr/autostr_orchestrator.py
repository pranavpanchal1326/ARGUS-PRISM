"""
AutoSTR Orchestrator for ARGUS-PRISM.
Coordinates generation of FIU-IND XML, CBI PDF, and RBI JSON reports.
"""

import logging
import hashlib
import time
import os
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Dict, Any, Optional

from .fiu_xml_generator import generate_fiu_xml
from .cbi_pdf_generator import generate_cbi_pdf
from .rbi_report_generator import generate_rbi_report
from .schemas.fiu_schema import FIUReportInput

logger = logging.getLogger("prism.autostr.orchestrator")

@dataclass
class AutoSTRResult:
    case_id: str
    account_id: str
    
    # Package outputs
    fiu_xml_string: str
    fiu_xml_path: str
    fiu_xml_hash: str
    
    cbi_pdf_path: str
    cbi_pdf_hash: str
    
    rbi_report_dict: dict
    rbi_report_hash: str
    
    # Timing
    total_generation_time_seconds: float
    fiu_generation_time_ms: float
    cbi_generation_time_ms: float
    rbi_generation_time_ms: float
    
    # Status
    all_packages_generated: bool
    generated_at: str

class AutoSTRGenerationError(Exception):
    def __init__(self, package: str, reason: str):
        self.package = package
        self.reason = reason
        super().__init__(f"AutoSTR failed [{package}]: {reason}")

def generate_all_packages(report_input: FIUReportInput) -> AutoSTRResult:
    """
    Orchestrates the sequential generation of all evidence packages.
    """
    start_total = time.perf_counter()
    case_id = report_input.case_id
    account_id = report_input.accounts[0].account_id
    ts = int(time.time())
    
    all_success = True
    
    # STEP 1: FIU-IND XML (MANDATORY)
    try:
        start_fiu = time.perf_counter()
        xml_string = generate_fiu_xml(report_input)
        
        # Extract hash from doc_hash attribute using simple string find if ET is too heavy
        # or just parse once to be sure. 
        # Actually, since I control the output of 5A, I know it's at the root.
        # Let's use a quick search for doc_hash="...".
        import re
        hash_match = re.search(r'doc_hash="([a-f0-9]{64})"', xml_string)
        fiu_xml_hash = hash_match.group(1) if hash_match else ""
        
        fiu_gen_ms = (time.perf_counter() - start_fiu) * 1000
    except Exception as e:
        logger.error(f"FIU XML generation failed for {case_id}: {e}")
        raise AutoSTRGenerationError("FIU-IND", str(e))

    # STEP 2: Write XML to temp
    xml_path = f"D:/Projects/IDEA 2.0/ARGUS-PRISM/services/autostr/temp/prism_str_{case_id}_{ts}.xml"
    os.makedirs(os.path.dirname(xml_path), exist_ok=True)
    with open(xml_path, "w", encoding="utf-8") as f:
        f.write(xml_string)

    # STEP 3: CBI PDF
    cbi_pdf_path = ""
    cbi_pdf_hash = ""
    cbi_gen_ms = 0.0
    try:
        start_cbi = time.perf_counter()
        cbi_pdf_path = f"D:/Projects/IDEA 2.0/ARGUS-PRISM/services/autostr/temp/prism_cbi_{case_id}_{ts}.pdf"
        generate_cbi_pdf(report_input, cbi_pdf_path, fiu_xml_hash)
        
        # Compute PDF hash
        with open(cbi_pdf_path, "rb") as f:
            cbi_pdf_hash = hashlib.sha256(f.read()).hexdigest()
            
        cbi_gen_ms = (time.perf_counter() - start_cbi) * 1000
    except Exception as e:
        logger.error(f"CBI PDF generation failed for {case_id}: {e}")
        all_success = False

    # STEP 4: RBI Report
    rbi_report_dict = {}
    rbi_report_hash = ""
    rbi_gen_ms = 0.0
    try:
        start_rbi = time.perf_counter()
        
        # Calculate timing metrics
        now = datetime.now(timezone.utc)
        det_ts = report_input.detection_timestamp
        if det_ts.tzinfo is None: det_ts = det_ts.replace(tzinfo=timezone.utc)
        
        delta = now - det_ts
        det_to_res_min = delta.total_seconds() / 60.0
        # For simulation, restriction happened now
        
        rbi_report_dict = generate_rbi_report(
            report_input, fiu_xml_hash, cbi_pdf_hash,
            detection_to_restriction_minutes=det_to_res_min,
            str_filing_time_minutes=det_to_res_min # PRISM files immediately
        )
        rbi_report_hash = rbi_report_dict["document_integrity"]["rbi_report_hash"]
        
        rbi_gen_ms = (time.perf_counter() - start_rbi) * 1000
    except Exception as e:
        logger.error(f"RBI Report generation failed for {case_id}: {e}")
        all_success = False

    total_time = time.perf_counter() - start_total
    
    return AutoSTRResult(
        case_id=case_id,
        account_id=account_id,
        fiu_xml_string=xml_string,
        fiu_xml_path=xml_path,
        fiu_xml_hash=fiu_xml_hash,
        cbi_pdf_path=cbi_pdf_path,
        cbi_pdf_hash=cbi_pdf_hash,
        rbi_report_dict=rbi_report_dict,
        rbi_report_hash=rbi_report_hash,
        total_generation_time_seconds=total_time,
        fiu_generation_time_ms=fiu_gen_ms,
        cbi_generation_time_ms=cbi_gen_ms,
        rbi_generation_time_ms=rbi_gen_ms,
        all_packages_generated=all_success,
        generated_at=datetime.now(timezone.utc).isoformat()
    )
