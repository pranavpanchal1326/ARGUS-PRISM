"""
Unit tests for RBI Regulatory Report Generator.
"""

import pytest
import json
import hashlib
from datetime import datetime, timezone
from services.autostr.rbi_report_generator import generate_rbi_report
from services.autostr.schemas.fiu_schema import (
    FIUReportInput, AccountRecord, TransactionRecord, SignalScore, SHAPAttribution
)

@pytest.fixture
def sample_input():
    return FIUReportInput(
        case_id="UBI-RBI-TEST",
        reporting_entity_code="UBI0001",
        principal_officer_name="Pranav Panchal",
        principal_officer_designation="CCO",
        principal_officer_email="cco@ubi.com",
        detection_timestamp=datetime.now(timezone.utc),
        threshold_crossed=85.0,
        accounts=[
            AccountRecord(
                account_id="ACC-7842",
                account_type="SAVINGS",
                holder_name="John Doe",
                mobile_raw="+919876543210",
                aadhaar_raw="123456789012",
                pan_raw="ABCDE1234F",
                branch_code="B1",
                ifsc="IFSC1",
                kyc_status="VERIFIED",
                warmth_score=85.0,
                risk_level="IMMINENT"
            )
        ],
        transactions=[
            TransactionRecord(
                transaction_id="TXN-1",
                transaction_type="UPI",
                amount=50000.0,
                transaction_timestamp=datetime.now(timezone.utc),
                source_account_id="S",
                destination_account_id="D",
                channel="C",
                device_id_raw="D",
                ip_address_raw="1.1.1.1"
            )
        ],
        signal_scores=[
            SignalScore(signal_name="s1", raw_score=0.9, weighted_score=10.0, shap_impact=1.0),
            SignalScore(signal_name="s2", raw_score=0.9, weighted_score=10.0, shap_impact=1.0),
            SignalScore(signal_name="s3", raw_score=0.9, weighted_score=10.0, shap_impact=1.0),
            SignalScore(signal_name="s4", raw_score=0.9, weighted_score=10.0, shap_impact=1.0),
            SignalScore(signal_name="s5", raw_score=0.9, weighted_score=10.0, shap_impact=1.0),
            SignalScore(signal_name="s6", raw_score=0.9, weighted_score=10.0, shap_impact=1.0),
        ],
        shap_attribution=SHAPAttribution(
            primary_signal="s1", primary_impact=1.0,
            secondary_signal="s2", secondary_impact=1.0,
            tertiary_signal="s3", tertiary_impact=1.0
        )
    )

def test_report_schema_complete(sample_input):
    report = generate_rbi_report(sample_input, "xml_hash", "pdf_hash", 10.0, 5.0)
    top_keys = [
        "report_metadata", "incident_summary", "financial_exposure",
        "regulatory_actions_taken", "signal_breakdown", "document_integrity"
    ]
    for key in top_keys:
        assert key in report

def test_signal_breakdown_has_six_entries(sample_input):
    report = generate_rbi_report(sample_input, "xml_hash", "pdf_hash", 10.0, 5.0)
    assert len(report["signal_breakdown"]) == 6

def test_rbi_report_hash_valid(sample_input):
    report = generate_rbi_report(sample_input, "xml_hash", "pdf_hash", 10.0, 5.0)
    report_hash = report["document_integrity"]["rbi_report_hash"]
    assert len(report_hash) == 64
    # Re-verify hash
    r2 = report.copy()
    r2["document_integrity"]["rbi_report_hash"] = ""
    json_str = json.dumps(r2, sort_keys=True)
    expected_hash = hashlib.sha256(json_str.encode()).hexdigest()
    assert report_hash == expected_hash

def test_sc_writ_compliance_true(sample_input):
    report = generate_rbi_report(sample_input, "xml_hash", "pdf_hash", 10.0, 5.0)
    assert report["regulatory_actions_taken"]["sc_writ_compliance"] == True

def test_report_id_format(sample_input):
    report = generate_rbi_report(sample_input, "xml_hash", "pdf_hash", 10.0, 5.0)
    assert report["report_metadata"]["report_id"].startswith("RBI-")
