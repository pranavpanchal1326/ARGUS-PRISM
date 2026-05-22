"""
PRISM V1 — Signal Extractor Unit Tests

Validates:
  1. Successful signal extraction and formatting for S1-S6.
  2. Safe fallback strategy (returns zero vectors on connection or query failures, never crashes).
  3. Proper shap_ready_vector structure and length.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone

from services.pipeline.signal_extractor import (
    extract_s1_test_credits,
    extract_s2_device_fingerprint,
    extract_s3_velocity_derivative,
    extract_s4_dormant_reactivation,
    extract_s5_fri_contradiction,
    extract_s6_sim_swap,
    extract_all_signals,
    SIGNAL_LENGTHS,
)


@pytest.mark.asyncio
async def test_s1_extractor_success():
    """Verify S1 credit signal extraction with mock Neo4j & PostgreSQL data."""
    mock_neo = MagicMock()
    mock_db = AsyncMock()

    # Mock Neo4j recent credits query
    mock_credits = [
        {
            "amount": 250.0,
            "timestamp": "2026-05-22T10:00:00Z",
            "source_account_id": "ACC-SRC-001",
            "source_account_age_days": 10,
            "source_account_dormant": False,
        }
    ]

    # Mock PostgreSQL account metadata
    mock_meta = {
        "account_id": "ACC-001",
        "account_opened_at": "2026-05-20T10:00:00Z",
    }

    with patch("services.pipeline.signal_extractor.get_recent_credits", AsyncMock(return_value=mock_credits)), \
         patch("services.pipeline.signal_extractor.get_account_metadata", AsyncMock(return_value=mock_meta)), \
         patch("services.pipeline.signal_extractor.s1_evaluate", MagicMock(return_value={"triggered": True, "shap_ready_vector": [0.1] * 7})) as mock_eval:
        
        res = await extract_s1_test_credits("ACC-001", mock_neo, mock_db)
        assert res["triggered"] is True
        assert len(res["shap_ready_vector"]) == SIGNAL_LENGTHS["S1"]
        assert mock_eval.called


@pytest.mark.asyncio
async def test_s1_extractor_fallback():
    """Verify S1 extractor returns zeros if query fails (never crashes)."""
    mock_neo = MagicMock()
    mock_db = AsyncMock()

    # Force query to raise Exception
    with patch("services.pipeline.signal_extractor.get_recent_credits", AsyncMock(side_effect=Exception("Neo4j down"))):
        res = await extract_s1_test_credits("ACC-001", mock_neo, mock_db)
        assert res["triggered"] is False
        assert res["shap_ready_vector"] == [0.0] * SIGNAL_LENGTHS["S1"]


@pytest.mark.asyncio
async def test_s2_extractor_success():
    """Verify S2 device fingerprint signal extraction with mock Neo4j data."""
    mock_neo = MagicMock()
    mock_dev_data = {
        "device_events": [],
        "account_created_epoch": 1716380000,
        "blocked_imei_prefixes": [],
        "shared_imeis": {"861234567890123"},
    }

    with patch("services.pipeline.signal_extractor.get_device_events", AsyncMock(return_value=mock_dev_data)), \
         patch("services.pipeline.signal_extractor.s2_evaluate", MagicMock(return_value={"triggered": False, "shap_ready_vector": [0.0] * 9})):
        
        res = await extract_s2_device_fingerprint("ACC-001", mock_neo)
        assert res["triggered"] is False
        assert len(res["shap_ready_vector"]) == SIGNAL_LENGTHS["S2"]


@pytest.mark.asyncio
async def test_s3_extractor_success():
    """Verify S3 velocity derivative extraction."""
    mock_neo = MagicMock()
    mock_vel_data = {
        "transactions": [],
        "account_created_epoch": 1716380000,
        "observation_window_hours": 72.0,
    }

    with patch("services.pipeline.signal_extractor.get_transaction_velocity", AsyncMock(return_value=mock_vel_data)), \
         patch("services.pipeline.signal_extractor.s3_evaluate", MagicMock(return_value={"triggered": False, "shap_ready_vector": [0.0] * 8})):
        
        res = await extract_s3_velocity_derivative("ACC-001", mock_neo)
        assert len(res["shap_ready_vector"]) == SIGNAL_LENGTHS["S3"]


@pytest.mark.asyncio
async def test_s4_extractor_success():
    """Verify S4 dormant reactivation extraction from Postgres."""
    mock_db = AsyncMock()
    mock_meta = {
        "account_id": "ACC-001",
        "dormancy_days": 120,
    }

    with patch("services.pipeline.signal_extractor.get_account_metadata", AsyncMock(return_value=mock_meta)), \
         patch("services.pipeline.signal_extractor._s4_signal.compute", MagicMock(return_value={"features": [0.2] * 7})):
        
        res = await extract_s4_dormant_reactivation("ACC-001", mock_db)
        assert res["shap_ready_vector"] == [0.2] * SIGNAL_LENGTHS["S4"]


@pytest.mark.asyncio
async def test_s5_extractor_success():
    """Verify S5 FRI contradiction extraction."""
    mock_db = AsyncMock()
    mock_fri = {
        "account_id": "ACC-001",
        "fri_tier": 2,
    }
    mock_partials = {
        "S1": {"shap_ready_vector": [0.1] * 7},
        "S2": {"shap_ready_vector": [0.2] * 9},
        "S3": {"shap_ready_vector": [0.3] * 8},
        "S4": {"shap_ready_vector": [0.4] * 7},
    }

    with patch("services.pipeline.signal_extractor.get_fri_data", AsyncMock(return_value=mock_fri)), \
         patch("services.pipeline.signal_extractor._s5_signal.compute", MagicMock(return_value={"features": [0.5] * 6})):
        
        res = await extract_s5_fri_contradiction("ACC-001", mock_partials, mock_db)
        assert res["shap_ready_vector"] == [0.5] * SIGNAL_LENGTHS["S5"]


@pytest.mark.asyncio
async def test_s6_extractor_success():
    """Verify S6 SIM swap velocity extraction."""
    mock_db = AsyncMock()
    mock_swap = {
        "account_id": "ACC-001",
        "upi_registration_date": "2026-05-20T10:00:00Z",
        "swap_events": [],
        "transactions_post_swap_24h": 0,
    }

    with patch("services.pipeline.signal_extractor.get_sim_swap_data", AsyncMock(return_value=mock_swap)), \
         patch("services.pipeline.signal_extractor._s6_signal.compute", MagicMock(return_value={"features": [0.6] * 6})):
        
        res = await extract_s6_sim_swap("ACC-001", mock_db)
        assert res["shap_ready_vector"] == [0.6] * SIGNAL_LENGTHS["S6"]


@pytest.mark.asyncio
async def test_extract_all_signals_integration():
    """Verify orchestrator runs S1-S6 in order and returns a grouped dict."""
    mock_neo = MagicMock()
    mock_db = AsyncMock()

    with patch("services.pipeline.signal_extractor.extract_s1_test_credits", AsyncMock(return_value={"shap_ready_vector": [0.1] * 7})), \
         patch("services.pipeline.signal_extractor.extract_s2_device_fingerprint", AsyncMock(return_value={"shap_ready_vector": [0.2] * 9})), \
         patch("services.pipeline.signal_extractor.extract_s3_velocity_derivative", AsyncMock(return_value={"shap_ready_vector": [0.3] * 8})), \
         patch("services.pipeline.signal_extractor.extract_s4_dormant_reactivation", AsyncMock(return_value={"shap_ready_vector": [0.4] * 7})), \
         patch("services.pipeline.signal_extractor.extract_s5_fri_contradiction", AsyncMock(return_value={"shap_ready_vector": [0.5] * 6})), \
         patch("services.pipeline.signal_extractor.extract_s6_sim_swap", AsyncMock(return_value={"shap_ready_vector": [0.6] * 6})):
        
        all_res = await extract_all_signals("ACC-001", mock_neo, mock_db)
        assert "S1" in all_res
        assert "S2" in all_res
        assert "S3" in all_res
        assert "S4" in all_res
        assert "S5" in all_res
        assert "S6" in all_res

        assert all_res["S1"]["shap_ready_vector"] == [0.1] * 7
        assert all_res["S6"]["shap_ready_vector"] == [0.6] * 6
