import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone
import uuid

from services.api.core.legal_triggers import LegalTriggerEngine, TriggerResult
from services.api.db.models import Account, Alert, AutoSTRPackage, Case


@pytest.mark.asyncio
async def test_legal_trigger_clean_score():
    """Verify that a low warmth score (e.g. 50.0) does not trigger any legal actions."""
    mock_db = AsyncMock()
    mock_account = Account(
        account_id="ACC-001",
        account_holder_name="John Doe",
        account_status="ACTIVE",
        current_warmth_score=10.0,
    )
    
    # Mock database select result
    mock_execute_result = MagicMock()
    mock_execute_result.scalar_one_or_none.return_value = mock_account
    mock_db.execute.return_value = mock_execute_result

    engine = LegalTriggerEngine()
    result = await engine.evaluate("ACC-001", 50.0, mock_db)

    assert result.triggered is False
    assert result.action is None
    assert result.new_status is None
    assert len(result.alerts_fired) == 0


@pytest.mark.asyncio
async def test_legal_trigger_kyc_flag():
    """Verify that score >= 75.0 triggers KYC Flagged state."""
    mock_db = AsyncMock()
    mock_account = Account(
        account_id="ACC-001",
        account_holder_name="John Doe",
        account_status="ACTIVE",
        current_warmth_score=50.0,
    )
    
    mock_execute_result = MagicMock()
    mock_execute_result.scalar_one_or_none.side_effect = [mock_account, None]  # account, then alert check
    mock_db.execute.return_value = mock_execute_result

    engine = LegalTriggerEngine()
    
    with patch("services.api.core.legal_triggers.AuditLogWriter.log_legal_trigger", AsyncMock()), \
         patch("services.api.core.legal_triggers.LegalTriggerEngine._fire_alert", AsyncMock(return_value="alert-uuid-1")):
        
        result = await engine.evaluate("ACC-001", 78.0, mock_db)

        assert result.triggered is True
        assert result.action == "KYC_FLAG"
        assert result.new_status == "KYC_FLAGGED"
        assert "alert-uuid-1" in result.alerts_fired


@pytest.mark.asyncio
async def test_legal_trigger_restriction_and_autostr():
    """Verify that score >= 85.0 triggers full restriction and AutoSTR package generation."""
    mock_db = AsyncMock()
    mock_account = Account(
        account_id="ACC-001",
        account_holder_name="John Doe",
        account_status="ACTIVE",
        current_warmth_score=50.0,
        account_type="SAVINGS",
        mobile_number="9999999999",
        upi_device_imei="861234567890123",
    )
    
    mock_execute_result = MagicMock()
    mock_execute_result.scalar_one_or_none.side_effect = [mock_account, None, None, None]  # account, alert, warmthscore, case
    mock_db.execute.return_value = mock_execute_result

    engine = LegalTriggerEngine()
    
    with patch("services.api.core.legal_triggers.AuditLogWriter.log_legal_trigger", AsyncMock()), \
         patch("services.api.core.legal_triggers.LegalTriggerEngine._fire_alert", AsyncMock(return_value="alert-uuid-2")), \
         patch("services.api.core.legal_triggers.trigger_autostr_generation", AsyncMock()) as mock_autostr:
        
        result = await engine.evaluate("ACC-001", 88.0, mock_db)

        assert result.triggered is True
        assert result.action == "FULL_RESTRICTION"
        assert result.new_status == "RESTRICTED"
        assert result.autostr_signal is True
        assert "alert-uuid-2" in result.alerts_fired
        assert mock_autostr.called


@pytest.mark.asyncio
async def test_legal_trigger_idempotency():
    """Verify that consecutive evaluations at the same threshold do not re-trigger actions."""
    mock_db = AsyncMock()
    
    # Account is already restricted
    mock_account = Account(
        account_id="ACC-001",
        account_holder_name="John Doe",
        account_status="RESTRICTED",
        current_warmth_score=88.0,
    )
    
    mock_execute_result = MagicMock()
    mock_execute_result.scalar_one_or_none.side_effect = [mock_account, MagicMock()]  # account, then alert check (exists)
    mock_db.execute.return_value = mock_execute_result

    engine = LegalTriggerEngine()
    
    with patch("services.api.core.legal_triggers.AuditLogWriter.log_legal_trigger", AsyncMock()), \
         patch("services.api.core.legal_triggers.LegalTriggerEngine._fire_alert", AsyncMock()) as mock_alert, \
         patch("services.api.core.legal_triggers.trigger_autostr_generation", AsyncMock()) as mock_autostr:
        
        result = await engine.evaluate("ACC-001", 88.0, mock_db)

        # Since current rank (RESTRICTED) is equal to target rank (RESTRICTED),
        # triggered should be False, alert should not be fired, and AutoSTR should not run.
        assert result.triggered is False
        assert mock_alert.called is False
        assert mock_autostr.called is False
