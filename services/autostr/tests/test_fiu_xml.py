"""
Unit tests for FIU-IND XML Generator.
Validates 8 critical acceptance criteria.
"""

import pytest
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from services.autostr.fiu_xml_generator import generate_fiu_xml
from services.autostr.schemas.fiu_schema import (
    FIUReportInput, AccountRecord, TransactionRecord, SignalScore, SHAPAttribution
)

@pytest.fixture
def sample_input():
    return FIUReportInput(
        case_id="UBI-TEST-001",
        reporting_entity_code="UBI0001",
        principal_officer_name="Pranav Panchal",
        principal_officer_designation="CCO",
        principal_officer_email="cco@ubi.com",
        detection_timestamp=datetime(2026, 3, 15, 14, 30, 0, tzinfo=timezone.utc),
        threshold_crossed=85.0,
        accounts=[
            AccountRecord(
                account_id="ACC-123",
                account_type="SAVINGS",
                holder_name="Test User",
                mobile_raw="+919999988888",
                aadhaar_raw="123412341234",
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
                amount=850000.0,
                transaction_timestamp=datetime(2026, 3, 15, 14, 0, 0, tzinfo=timezone.utc),
                source_account_id="S1",
                destination_account_id="ACC-123",
                channel="C1",
                device_id_raw="IMEI123",
                ip_address_raw="192.168.1.1"
            )
        ],
        signal_scores=[
            SignalScore(signal_name="test_credit_pattern", raw_score=0.9, weighted_score=16.2, shap_impact=1.2),
            SignalScore(signal_name="device_fingerprint", raw_score=0.8, weighted_score=17.6, shap_impact=0.9),
            SignalScore(signal_name="velocity_derivative", raw_score=0.7, weighted_score=10.5, shap_impact=0.5),
            SignalScore(signal_name="dormant_reactivation", raw_score=0.1, weighted_score=2.0, shap_impact=-0.1),
            SignalScore(signal_name="fri_contradiction", raw_score=0.2, weighted_score=3.0, shap_impact=0.1),
            SignalScore(signal_name="sim_swap_velocity", raw_score=0.0, weighted_score=0.0, shap_impact=0.0),
        ],
        shap_attribution=SHAPAttribution(
            primary_signal="test_credit_pattern", primary_impact=1.2,
            secondary_signal="device_fingerprint", secondary_impact=0.9,
            tertiary_signal="velocity_derivative", tertiary_impact=0.5
        )
    )

# TEST 1 — test_xml_is_well_formed
def test_xml_is_well_formed(sample_input):
    xml_str = generate_fiu_xml(sample_input)
    root = ET.fromstring(xml_str)
    assert root.tag.endswith("FIUReport") or root.tag == "FIUReport"
    assert root.attrib["version"] == "2.0"

# TEST 2 — test_all_four_sap_sections_present
def test_all_four_sap_sections_present(sample_input):
    xml_str = generate_fiu_xml(sample_input)
    root = ET.fromstring(xml_str)
    # Remove namespace for easier searching if present
    tags = [child.tag.split("}")[-1] for child in root]
    assert "SAPTRN" in tags
    assert "SAPINP" in tags
    assert "SAPLEP" in tags
    assert "SAPPIT" in tags

# TEST 3 — test_pii_never_in_plaintext
def test_pii_never_in_plaintext(sample_input):
    xml_str = generate_fiu_xml(sample_input)
    
    # Raw values that should NOT be in the XML
    assert "123412341234" not in xml_str  # Aadhaar
    assert "ABCDE1234F" not in xml_str    # PAN
    assert "+919999988888" not in xml_str # Mobile
    assert "IMEI123" not in xml_str       # IMEI
    assert "192.168.1.1" not in xml_str   # IP
    
    # Assert masked formats exist
    assert "XXXXXX8888" in xml_str        # Masked Mobile
    assert "192.168.x.x" in xml_str       # Masked IP

# TEST 4 — test_suspicion_narrative_format
def test_suspicion_narrative_format(sample_input):
    xml_str = generate_fiu_xml(sample_input)
    root = ET.fromstring(xml_str)
    
    narrative = ""
    for elem in root.iter():
        if elem.tag.split("}")[-1] == "SuspicionGrounds":
            narrative = elem.text
            break
            
    assert "ACC-123" in narrative
    assert "PMLA Section 12" in narrative
    assert "Union Bank of India" in narrative
    assert "test_credit_pattern" in narrative
    assert "device_fingerprint" in narrative
    assert "velocity_derivative" in narrative

# TEST 5 — test_document_hash_present
def test_document_hash_present(sample_input):
    xml_str = generate_fiu_xml(sample_input)
    root = ET.fromstring(xml_str)
    
    assert "doc_hash" in root.attrib
    doc_hash = root.attrib["doc_hash"]
    assert len(doc_hash) == 64
    
    # Test integrity: if we change the XML, the hash should be different
    # (Manual verification: if we modify content, re-computing hash would give different result)

# TEST 6 — test_generation_performance
def test_generation_performance(sample_input):
    # Scale up transactions to 50
    txns = []
    for i in range(50):
        txns.append(TransactionRecord(
            transaction_id=f"TXN-{i}",
            transaction_type="UPI",
            amount=1000.0 * i,
            transaction_timestamp=datetime.now(timezone.utc),
            source_account_id="S",
            destination_account_id="D",
            channel="C",
            device_id_raw="D",
            ip_address_raw="1.1.1.1"
        ))
    sample_input.transactions = txns
    
    start = time.perf_counter()
    generate_fiu_xml(sample_input)
    end = time.perf_counter()
    
    duration_ms = (end - start) * 1000
    assert duration_ms < 500

# TEST 7 — test_datetime_format_ist
def test_datetime_format_ist(sample_input):
    xml_str = generate_fiu_xml(sample_input)
    # Every datetime should have +05:30
    # Common datetime fields: ReportDate, DetectionTimestamp, TransactionTimestamp
    import re
    ist_pattern = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+05:30")
    matches = ist_pattern.findall(xml_str)
    assert len(matches) >= 3
    assert "Z" not in xml_str

# TEST 8 — test_amount_formatting
def test_amount_formatting(sample_input):
    xml_str = generate_fiu_xml(sample_input)
    # 850000.0 should be "850000.00"
    assert "<Amount>850000.00</Amount>" in xml_str
