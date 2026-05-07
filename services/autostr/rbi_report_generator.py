"""
RBI Regulatory Report Generator for ARGUS-PRISM.
Produces machine-readable JSON reports for RBI Cyber Security Framework compliance.
"""

import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any

from .schemas.fiu_schema import FIUReportInput
from .fiu_xml_generator import format_datetime_ist

def generate_rbi_report(
    report_input: FIUReportInput,
    fiu_xml_hash: str,
    cbi_pdf_hash: str,
    detection_to_restriction_minutes: float,
    str_filing_time_minutes: float
) -> dict:
    """
    Produces the RBI machine-readable JSON report with document integrity hashing.
    """
    
    # Financial Exposure calculations
    total_val = sum(t.amount for t in report_input.transactions)
    max_val = max(t.amount for t in report_input.transactions) if report_input.transactions else 0.0
    txn_types = list(set(t.transaction_type for t in report_input.transactions))
    
    # Signal Breakdown
    signals = []
    triggered_count = 0
    for i, sig in enumerate(report_input.signal_scores, 1):
        is_triggered = sig.weighted_score > 0
        if is_triggered: triggered_count += 1
        signals.append({
            "signal_id": i,
            "signal_name": sig.signal_name,
            "triggered": is_triggered,
            "weighted_score": sig.weighted_score,
            "shap_impact": sig.shap_impact
        })

    # Pass 1: Build without report hash
    report = {
        "report_metadata": {
            "report_id": f"RBI-{report_input.case_id}-{datetime.now().strftime('%Y%m%d')}",
            "report_type": "CYBER_FRAUD_INCIDENT",
            "reporting_entity": "UNION BANK OF INDIA",
            "reporting_entity_ifsc_prefix": "UBIN",
            "report_generated_at": format_datetime_ist(datetime.now(timezone.utc)),
            "regulatory_framework": "RBI Cyber Security Framework",
            "prism_version": "2.0"
        },
        "incident_summary": {
            "case_id": report_input.case_id,
            "detection_method": "AI_WARMTHSCORE_ENGINE",
            "warmth_score_at_detection": report_input.accounts[0].warmth_score,
            "risk_classification": report_input.accounts[0].risk_level,
            "detection_timestamp": format_datetime_ist(report_input.detection_timestamp),
            "threshold_crossed": report_input.threshold_crossed,
            "signals_triggered": triggered_count,
            "total_signals_evaluated": 6
        },
        "financial_exposure": {
            "total_transactions_flagged": len(report_input.transactions),
            "total_value_inr": round(total_val, 2),
            "highest_single_transaction_inr": round(max_val, 2),
            "transaction_types_involved": txn_types,
            "detection_to_restriction_minutes": round(detection_to_restriction_minutes, 2)
        },
        "regulatory_actions_taken": {
            "kyc_reverification_triggered": True,
            "account_restricted": True,
            "restriction_legal_basis": "RBI KYC Master Direction 2016 Section 38",
            "str_filed_with_fiu": True,
            "str_filing_time_minutes": round(str_filing_time_minutes, 2),
            "cbi_package_generated": True,
            "sc_writ_compliance": True
        },
        "signal_breakdown": signals,
        "document_integrity": {
            "fiu_xml_hash": fiu_xml_hash,
            "cbi_pdf_hash": cbi_pdf_hash,
            "rbi_report_hash": "",  # Placeholder for Pass 1
            "generated_by": "ARGUS-PRISM AutoSTR v2"
        }
    }

    # Pass 2: Compute SHA-256 of Pass 1 output
    report_json = json.dumps(report, sort_keys=True)
    report_hash = hashlib.sha256(report_json.encode()).hexdigest()
    
    # Final: Set hash
    report["document_integrity"]["rbi_report_hash"] = report_hash
    
    return report
