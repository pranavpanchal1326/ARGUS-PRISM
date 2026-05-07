"""
Unit tests for CBI PDF Generator.
"""

import os
import pytest
import fitz  # PyMuPDF
from datetime import datetime, timezone
from services.autostr.cbi_pdf_generator import generate_cbi_pdf
from services.autostr.schemas.fiu_schema import (
    FIUReportInput, AccountRecord, TransactionRecord, SignalScore, SHAPAttribution
)

@pytest.fixture
def sample_input():
    return FIUReportInput(
        case_id="UBI-CBI-TEST",
        reporting_entity_code="UBI0001",
        principal_officer_name="Pranav Panchal",
        principal_officer_designation="CCO",
        principal_officer_email="cco@ubi.com",
        detection_timestamp=datetime.now(timezone.utc),
        threshold_crossed=85.0,
        accounts=[
            AccountRecord(
                account_id="ACC-CBI-7842",
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
                transaction_id=f"TXN-{i}",
                transaction_type="UPI",
                amount=1000.0 * (i+1),
                transaction_timestamp=datetime.now(timezone.utc),
                source_account_id="S",
                destination_account_id="D",
                channel="C",
                device_id_raw="D",
                ip_address_raw="1.1.1.1"
            ) for i in range(25)  # More than 20 for pagination test
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

def test_pdf_file_created(sample_input):
    path = "d:/Projects/IDEA 2.0/ARGUS-PRISM/services/autostr/tests/temp_cbi.pdf"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    res_path = generate_cbi_pdf(sample_input, path, "fake_xml_hash")
    assert os.path.exists(res_path)
    assert os.path.getsize(res_path) > 10240  # > 10KB

def test_pdf_all_pages_present(sample_input):
    path = "d:/Projects/IDEA 2.0/ARGUS-PRISM/services/autostr/tests/temp_cbi.pdf"
    generate_cbi_pdf(sample_input, path, "fake_xml_hash")
    doc = fitz.open(path)
    # Expected: Cover(1) + Summary(1) + Signal(1) + Trans(2 due to pagination) + Device(1) + Legal(1) + Cert(1) = 8?
    # Spec says "minimum 6 pages"
    assert doc.page_count >= 6
    doc.close()

def test_pdf_cover_page_content(sample_input):
    path = "d:/Projects/IDEA 2.0/ARGUS-PRISM/services/autostr/tests/temp_cbi.pdf"
    generate_cbi_pdf(sample_input, path, "fake_xml_hash")
    doc = fitz.open(path)
    page1 = doc[0]
    text = page1.get_text()
    assert "RESTRICTED" in text
    assert "SC Writ 03/2025" in text
    assert "CBI" in text
    assert "UBI-CBI-TEST" in text
    doc.close()

def test_pdf_no_raw_pii(sample_input):
    path = "d:/Projects/IDEA 2.0/ARGUS-PRISM/services/autostr/tests/temp_cbi.pdf"
    generate_cbi_pdf(sample_input, path, "fake_xml_hash")
    doc = fitz.open(path)
    for page in doc:
        text = page.get_text()
        assert "123456789012" not in text  # Aadhaar
        assert "ABCDE1234F" not in text     # PAN
        assert "+919876543210" not in text # Mobile
    doc.close()

def test_pdf_generation_time(sample_input):
    import time
    path = "d:/Projects/IDEA 2.0/ARGUS-PRISM/services/autostr/tests/temp_cbi_perf.pdf"
    start = time.perf_counter()
    generate_cbi_pdf(sample_input, path, "fake_xml_hash")
    end = time.perf_counter()
    assert (end - start) < 10.0
