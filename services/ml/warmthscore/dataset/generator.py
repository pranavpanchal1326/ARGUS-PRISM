# ═══════════════════════════════════════════════════════
# ARGUS-PRISM | generator.py
# Engine: WarmthScore — Synthetic Dataset Generator
# Branch: pranav/warmthscore
# Research basis: BioCatch 2023, NPCI UPI spec, DoT Chakshu,
#                 RBI KYC Master Direction 2016
# ═══════════════════════════════════════════════════════
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import uuid

import numpy as np

try:
    from .features import compute_feature_matrix, derive_signal_flags
    from .export import export_dataset
    from .recruiters import generate_recruiters
    from .taint_network import generate_taint_network
    from .validate import run_validation
except ImportError:  # pragma: no cover
    from features import compute_feature_matrix, derive_signal_flags
    from export import export_dataset
    from recruiters import generate_recruiters
    from taint_network import generate_taint_network
    from validate import run_validation

IST = timezone(timedelta(hours=5, minutes=30))


@dataclass
class AccountMeta:
    account_id: str
    profile_type: str
    label: int
    account_age_days: int
    dormancy_days: int
    open_device_imei: str
    upi_device_imei: str
    upi_registration_hour: int
    open_sim_iccid: str
    current_sim_iccid: str
    sim_swap_within_7_days: bool
    sim_swap_hour: int
    sim_swap_delta_hours: float
    imei_cluster_risk: float
    fri_score: str
    reactivation_device_change: bool
    first_post_txn_type: str
    activation_time: datetime
    taint_score: float
    test_credit_count: int
    open_device_used_in_events: bool


def _random_digits(length: int) -> str:
    """Purpose: Generate a numeric string of fixed length.

    Parameters:
        length: Number of digits required.
    Returns:
        Numeric string of the requested length.
    PRISM signal: Signals 1-6 (identifier generation).
    """
    digits = np.random.randint(0, 10, size=length)
    return "".join(str(int(d)) for d in digits)


def _generate_blocked_prefixes(count: int) -> List[str]:
    """Purpose: Build a list of blocked IMEI prefixes for cluster simulation.

    Parameters:
        count: Number of blocked 8-digit prefixes to generate.
    Returns:
        List of blocked IMEI prefixes.
    PRISM signal: Signal 2 (IMEI cluster risk modeling).
    """
    prefixes: List[str] = []
    while len(prefixes) < count:
        prefix = _random_digits(8)
        if prefix not in prefixes:
            prefixes.append(prefix)
    return prefixes


def _generate_imei(blocked_prefixes: List[str], use_blocked: bool) -> str:
    """Purpose: Generate a 15-digit IMEI with optional blocked prefix.

    Parameters:
        blocked_prefixes: List of blocked 8-digit IMEI prefixes.
        use_blocked: Whether to force a blocked prefix selection.
    Returns:
        15-digit IMEI string.
    PRISM signal: Signal 2 (device fingerprint modeling).
    """
    if use_blocked:
        prefix = str(np.random.choice(blocked_prefixes))
    else:
        prefix = _random_digits(8)
        while prefix in blocked_prefixes:
            prefix = _random_digits(8)
    return prefix + _random_digits(7)


def _generate_iccid() -> str:
    """Purpose: Generate a 20-digit SIM ICCID string.

    Parameters:
        None.
    Returns:
        20-digit ICCID string.
    PRISM signal: Signal 6 (SIM swap modeling).
    """
    return _random_digits(20)


def _random_source_account_id() -> str:
    """Purpose: Generate a synthetic source account identifier.

    Parameters:
        None.
    Returns:
        Source account ID string.
    PRISM signal: Signal 1 (source account modeling).
    """
    return f"UBI-2025-{int(np.random.randint(1, 999999)):06d}"


def _weighted_hours(start: int, end: int, count: int, power: float) -> List[int]:
    """Purpose: Sample hours with a weighted bias for velocity shaping.

    Parameters:
        start: Inclusive start hour.
        end: Inclusive end hour.
        count: Number of samples to draw.
        power: Exponent controlling bias toward higher hours.
    Returns:
        List of sampled integer hours.
    PRISM signal: Signal 3 (velocity convexity modeling).
    """
    samples = np.random.rand(count)
    hours = start + (samples ** power) * float(end - start)
    return [int(np.round(hour)) for hour in hours]


def _select_device(account: AccountMeta, hour: int) -> str:
    """Purpose: Select the device IMEI for a transaction hour.

    Parameters:
        account: Account metadata containing device assignments.
        hour: Hour in the 72-hour window.
    Returns:
        IMEI string for the event.
    PRISM signal: Signal 2 (device switch detection).
    """
    if account.open_device_used_in_events and hour == 0:
        return account.open_device_imei
    return account.upi_device_imei


def _select_sim(account: AccountMeta, hour: int) -> str:
    """Purpose: Select the SIM ICCID for a transaction hour.

    Parameters:
        account: Account metadata containing SIM assignments.
        hour: Hour in the 72-hour window.
    Returns:
        ICCID string for the event.
    PRISM signal: Signal 6 (SIM swap detection).
    """
    if account.sim_swap_within_7_days and hour >= account.sim_swap_hour:
        return account.current_sim_iccid
    return account.open_sim_iccid


def _append_event(
    events: List[Dict[str, Any]],
    account: AccountMeta,
    hour: int,
    amount_inr: float,
    transaction_type: str,
    channel: str,
    source_account_id: Optional[str],
    source_account_age_days: int,
    source_is_merchant: bool,
    is_test_credit: bool,
) -> None:
    """Purpose: Append a transaction event to the event list.

    Parameters:
        events: Mutable list of event dictionaries.
        account: Account metadata providing shared attributes.
        hour: Hour in the 72-hour window.
        amount_inr: Transaction amount in INR.
        transaction_type: CREDIT or DEBIT.
        channel: Transaction channel string.
        source_account_id: Source account ID or None for debits.
        source_account_age_days: Age of the source account.
        source_is_merchant: Whether source is a merchant UPI account.
        is_test_credit: Whether this event is a test credit.
    Returns:
        None.
    PRISM signal: Signals 1-3 (event construction).
    """
    timestamp = (account.activation_time + timedelta(hours=int(hour))).isoformat()
    events.append(
        {
            "event_id": f"EVT-{uuid.uuid4()}",
            "account_id": account.account_id,
            "hour": int(hour),
            "timestamp": timestamp,
            "amount_inr": float(amount_inr),
            "transaction_type": transaction_type,
            "channel": channel,
            "source_account_id": source_account_id,
            "source_account_age_days": int(source_account_age_days),
            "source_is_merchant": bool(source_is_merchant),
            "device_imei": _select_device(account, int(hour)),
            "sim_iccid": _select_sim(account, int(hour)),
            "imei_cluster_risk": float(account.imei_cluster_risk),
            "fri_score": account.fri_score,
            "sim_swap_within_7_days": bool(account.sim_swap_within_7_days),
            "is_test_credit": bool(is_test_credit),
            "label": int(account.label),
        }
    )


def _generate_profile1_events(account: AccountMeta) -> List[Dict[str, Any]]:
    """Purpose: Generate Active Mule transactions with early warming signals.

    Parameters:
        account: Active mule account metadata.
    Returns:
        List of transaction events for the account.
    PRISM signal: Signals 1-3 (test credits, device mismatch, velocity).
    """
    events: List[Dict[str, Any]] = []
    if account.open_device_used_in_events:
        _append_event(
            events,
            account,
            hour=0,
            amount_inr=float(np.random.uniform(10.0, 50.0)),
            transaction_type="DEBIT",
            channel="UPI",
            source_account_id=None,
            source_account_age_days=0,
            source_is_merchant=False,
            is_test_credit=False,
        )

    test_hours = _weighted_hours(1, 48, account.test_credit_count, power=0.5)
    for hour in test_hours:
        source_age = int(np.random.choice([np.random.randint(1, 30), np.random.randint(200, 600)]))
        _append_event(
            events,
            account,
            hour=hour,
            amount_inr=float(np.random.uniform(1.0, 500.0)),
            transaction_type="CREDIT",
            channel="UPI",
            source_account_id=_random_source_account_id(),
            source_account_age_days=source_age,
            source_is_merchant=False,
            is_test_credit=True,
        )

    segments = [(0, 24, int(np.random.randint(1, 3))), (24, 48, int(np.random.randint(2, 4))), (48, 72, int(np.random.randint(4, 7)))]
    for start, end, count in segments:
        for _ in range(count):
            hour = int(np.random.randint(start, end + 1))
            txn_type = str(np.random.choice(["CREDIT", "DEBIT"], p=[0.6, 0.4]))
            amount = float(np.random.uniform(200.0, 5000.0))
            if txn_type == "CREDIT":
                _append_event(
                    events,
                    account,
                    hour=hour,
                    amount_inr=amount,
                    transaction_type=txn_type,
                    channel=str(np.random.choice(["UPI", "IMPS", "NEFT"])),
                    source_account_id=_random_source_account_id(),
                    source_account_age_days=int(np.random.randint(30, 600)),
                    source_is_merchant=False,
                    is_test_credit=False,
                )
            else:
                _append_event(
                    events,
                    account,
                    hour=hour,
                    amount_inr=amount,
                    transaction_type=txn_type,
                    channel=str(np.random.choice(["UPI", "ATM"])),
                    source_account_id=None,
                    source_account_age_days=0,
                    source_is_merchant=False,
                    is_test_credit=False,
                )

    _append_event(
        events,
        account,
        hour=int(np.random.randint(68, 73)),
        amount_inr=float(np.random.uniform(200000.0, 50000000.0)),
        transaction_type="CREDIT",
        channel="RTGS",
        source_account_id=_random_source_account_id(),
        source_account_age_days=int(np.random.randint(200, 900)),
        source_is_merchant=False,
        is_test_credit=False,
    )
    return events


def _generate_profile2_events(account: AccountMeta) -> List[Dict[str, Any]]:
    """Purpose: Generate Dormant Reactivation Mule transactions.

    Parameters:
        account: Dormant reactivation mule metadata.
    Returns:
        List of transaction events for the account.
    PRISM signal: Signals 1, 4, 6 (dormancy, test credits, SIM swap).
    """
    events: List[Dict[str, Any]] = []
    if account.open_device_used_in_events:
        _append_event(
            events,
            account,
            hour=0,
            amount_inr=float(np.random.uniform(10.0, 100.0)),
            transaction_type="DEBIT",
            channel="UPI",
            source_account_id=None,
            source_account_age_days=0,
            source_is_merchant=False,
            is_test_credit=False,
        )

    test_hours = _weighted_hours(1, 24, account.test_credit_count, power=0.7)
    for hour in test_hours:
        source_age = int(np.random.choice([np.random.randint(1, 30), np.random.randint(200, 600)]))
        _append_event(
            events,
            account,
            hour=hour,
            amount_inr=float(np.random.uniform(1.0, 500.0)),
            transaction_type="CREDIT",
            channel="UPI",
            source_account_id=_random_source_account_id(),
            source_account_age_days=source_age,
            source_is_merchant=False,
            is_test_credit=True,
        )

    segments = [(0, 24, int(np.random.randint(1, 3))), (24, 48, int(np.random.randint(2, 4))), (48, 72, int(np.random.randint(4, 6)))]
    for start, end, count in segments:
        for _ in range(count):
            hour = int(np.random.randint(start, end + 1))
            txn_type = str(np.random.choice(["CREDIT", "DEBIT"], p=[0.6, 0.4]))
            amount = float(np.random.uniform(200.0, 6000.0))
            if txn_type == "CREDIT":
                _append_event(
                    events,
                    account,
                    hour=hour,
                    amount_inr=amount,
                    transaction_type=txn_type,
                    channel=str(np.random.choice(["UPI", "IMPS", "NEFT"])),
                    source_account_id=_random_source_account_id(),
                    source_account_age_days=int(np.random.randint(30, 600)),
                    source_is_merchant=False,
                    is_test_credit=False,
                )
            else:
                _append_event(
                    events,
                    account,
                    hour=hour,
                    amount_inr=amount,
                    transaction_type=txn_type,
                    channel=str(np.random.choice(["UPI", "ATM"])),
                    source_account_id=None,
                    source_account_age_days=0,
                    source_is_merchant=False,
                    is_test_credit=False,
                )

    _append_event(
        events,
        account,
        hour=int(np.random.randint(60, 73)),
        amount_inr=float(np.random.uniform(200000.0, 20000000.0)),
        transaction_type="CREDIT",
        channel="RTGS",
        source_account_id=_random_source_account_id(),
        source_account_age_days=int(np.random.randint(200, 900)),
        source_is_merchant=False,
        is_test_credit=False,
    )
    return events


def _generate_profile3_events(account: AccountMeta) -> List[Dict[str, Any]]:
    """Purpose: Generate Legitimate New Account transactions.

    Parameters:
        account: Legitimate new account metadata.
    Returns:
        List of transaction events for the account.
    PRISM signal: Signal 3 (linear velocity baseline).
    """
    events: List[Dict[str, Any]] = []

    salary_hour = int(np.random.randint(12, 36))
    _append_event(
        events,
        account,
        hour=salary_hour,
        amount_inr=float(np.random.uniform(20000.0, 150000.0)),
        transaction_type="CREDIT",
        channel="NEFT",
        source_account_id=_random_source_account_id(),
        source_account_age_days=int(np.random.randint(365, 2500)),
        source_is_merchant=False,
        is_test_credit=False,
    )

    merchant_count = int(np.random.randint(1, 4))
    merchant_hours = np.random.choice(np.arange(4, 48), size=merchant_count, replace=False)
    for hour in merchant_hours:
        _append_event(
            events,
            account,
            hour=int(hour),
            amount_inr=float(np.random.uniform(50.0, 2000.0)),
            transaction_type="CREDIT",
            channel="UPI",
            source_account_id=_random_source_account_id(),
            source_account_age_days=int(np.random.randint(500, 3000)),
            source_is_merchant=True,
            is_test_credit=False,
        )

    family_count = int(np.random.randint(1, 3))
    family_hours = np.random.choice(np.arange(6, 60), size=family_count, replace=False)
    for hour in family_hours:
        _append_event(
            events,
            account,
            hour=int(hour),
            amount_inr=float(np.random.uniform(1000.0, 12000.0)),
            transaction_type="CREDIT",
            channel="IMPS",
            source_account_id=_random_source_account_id(),
            source_account_age_days=int(np.random.randint(800, 4000)),
            source_is_merchant=False,
            is_test_credit=False,
        )

    debit_count = int(np.random.randint(2, 5))
    debit_hours = np.random.choice(np.arange(1, 72), size=debit_count, replace=False)
    for hour in debit_hours:
        _append_event(
            events,
            account,
            hour=int(hour),
            amount_inr=float(np.random.uniform(100.0, 5000.0)),
            transaction_type="DEBIT",
            channel=str(np.random.choice(["UPI", "ATM"])),
            source_account_id=None,
            source_account_age_days=0,
            source_is_merchant=False,
            is_test_credit=False,
        )
    return events


def _generate_profile4_events(account: AccountMeta) -> List[Dict[str, Any]]:
    """Purpose: Generate Legitimate Dormant Reactivation transactions.

    Parameters:
        account: Legitimate dormant reactivation metadata.
    Returns:
        List of transaction events for the account.
    PRISM signal: Signal 4 (legitimate dormancy baseline).
    """
    events: List[Dict[str, Any]] = []
    if account.open_device_used_in_events:
        _append_event(
            events,
            account,
            hour=0,
            amount_inr=float(np.random.uniform(20.0, 100.0)),
            transaction_type="DEBIT",
            channel="UPI",
            source_account_id=None,
            source_account_age_days=0,
            source_is_merchant=False,
            is_test_credit=False,
        )

    first_hour = int(np.random.randint(2, 8))
    _append_event(
        events,
        account,
        hour=first_hour,
        amount_inr=float(np.random.uniform(10000.0, 500000.0)),
        transaction_type="CREDIT",
        channel=str(np.random.choice(["NEFT", "RTGS"])),
        source_account_id=_random_source_account_id(),
        source_account_age_days=int(np.random.randint(800, 3000)),
        source_is_merchant=False,
        is_test_credit=False,
    )

    extra_count = int(np.random.randint(1, 4))
    extra_hours = np.random.choice(np.arange(10, 72), size=extra_count, replace=False)
    for hour in extra_hours:
        txn_type = str(np.random.choice(["CREDIT", "DEBIT"], p=[0.5, 0.5]))
        amount = float(np.random.uniform(200.0, 20000.0))
        if txn_type == "CREDIT":
            _append_event(
                events,
                account,
                hour=int(hour),
                amount_inr=amount,
                transaction_type=txn_type,
                channel=str(np.random.choice(["UPI", "IMPS"])),
                source_account_id=_random_source_account_id(),
                source_account_age_days=int(np.random.randint(900, 4000)),
                source_is_merchant=False,
                is_test_credit=False,
            )
        else:
            _append_event(
                events,
                account,
                hour=int(hour),
                amount_inr=amount,
                transaction_type=txn_type,
                channel=str(np.random.choice(["UPI", "ATM"])),
                source_account_id=None,
                source_account_age_days=0,
                source_is_merchant=False,
                is_test_credit=False,
            )
    return events


def _build_demo_account() -> Dict[str, Any]:
    """Purpose: Create the fixed demo account progression payload.

    Parameters:
        None.
    Returns:
        Demo account dictionary with fixed milestones.
    PRISM signal: Signal 5 (demo WarmthScore progression).
    """
    return {
        "account_id": "UBI-2026-DEMO-001",
        "fri_score": "LOW",
        "restriction_triggered_hour": 60,
        "autostr_initiated_hour": 71,
        "illicit_credit_amount_inr": 850000.0,
        "milestones": [
            {"hour": 0, "score": 21},
            {"hour": 12, "score": 29},
            {"hour": 24, "score": 41},
            {"hour": 36, "score": 58},
            {"hour": 48, "score": 69},
            {"hour": 60, "score": 77},
            {"hour": 71, "score": 84},
            {"hour": 72, "score": 87},
        ],
    }


def _account_to_feature_dict(account: AccountMeta) -> Dict[str, Any]:
    """Purpose: Convert account metadata into feature computation input.

    Parameters:
        account: Account metadata instance.
    Returns:
        Dictionary with fields required by feature computation.
    PRISM signal: Signals 1-6 (feature input mapping).
    """
    return {
        "account_id": account.account_id,
        "label": int(account.label),
        "dormancy_days": int(account.dormancy_days),
        "reactivation_device_change": bool(account.reactivation_device_change),
        "first_post_txn_type": account.first_post_txn_type,
        "fri_score": account.fri_score,
        "sim_swap_within_7_days": bool(account.sim_swap_within_7_days),
        "sim_swap_delta_hours": float(account.sim_swap_delta_hours),
        "s2_device_switch_within_24hr": account.upi_device_imei != account.open_device_imei,
        "s2_upi_device_matches_open": account.upi_device_imei == account.open_device_imei,
    }


def _build_accounts() -> Tuple[List[AccountMeta], List[str], List[str]]:
    """Purpose: Build account profiles and metadata for all 1000 accounts.

    Parameters:
        None.
    Returns:
        Tuple of account list, profile2 IDs, and mule IDs.
    PRISM signal: Signals 1-6 (profile synthesis).
    """
    account_ids = [f"UBI-2026-{idx:06d}" for idx in range(1, 1001)]
    profile1_ids = account_ids[:300]
    profile2_ids = account_ids[300:500]
    profile3_ids = account_ids[500:800]
    profile4_ids = account_ids[800:1000]

    blocked_prefixes = _generate_blocked_prefixes(60)
    base_time = datetime(2026, 5, 7, 9, 0, tzinfo=IST)

    profile1_indices = np.arange(300)
    s6_indices = set(np.random.choice(profile1_indices, size=110, replace=False))
    overlap_indices = set(np.random.choice(list(s6_indices), size=40, replace=False))
    remaining_indices = [idx for idx in profile1_indices if idx not in s6_indices]
    s5_extra = set(np.random.choice(remaining_indices, size=80, replace=False))
    s5_indices = overlap_indices.union(s5_extra)

    profile4_indices = np.arange(200)
    device_change_indices = set(np.random.choice(profile4_indices, size=60, replace=False))

    accounts: List[AccountMeta] = []
    for idx, account_id in enumerate(profile1_ids):
        s6_target = idx in s6_indices
        s5_target = idx in s5_indices
        test_credit_count = int(np.random.randint(5, 9)) if s5_target else int(np.random.randint(3, 5))
        imei_cluster_risk = (
            float(np.random.uniform(0.7, 0.95)) if s5_target else float(np.random.uniform(0.55, 0.69))
        )

        open_device = _generate_imei(blocked_prefixes, use_blocked=True)
        upi_device = _generate_imei(blocked_prefixes, use_blocked=True)
        while upi_device == open_device:
            upi_device = _generate_imei(blocked_prefixes, use_blocked=True)

        open_sim = _generate_iccid()
        sim_swap_hour = int(np.random.randint(12, 72)) if s6_target else -1
        current_sim = _generate_iccid() if s6_target else open_sim
        upi_registration_hour = int(np.random.randint(1, 25))
        sim_swap_delta_hours = (
            float(np.abs(sim_swap_hour - upi_registration_hour)) if s6_target else float(-1)
        )

        accounts.append(
            AccountMeta(
                account_id=account_id,
                profile_type="ACTIVE_MULE",
                label=1,
                account_age_days=int(np.random.randint(0, 8)),
                dormancy_days=0,
                open_device_imei=open_device,
                upi_device_imei=upi_device,
                upi_registration_hour=upi_registration_hour,
                open_sim_iccid=open_sim,
                current_sim_iccid=current_sim,
                sim_swap_within_7_days=s6_target,
                sim_swap_hour=sim_swap_hour,
                sim_swap_delta_hours=sim_swap_delta_hours,
                imei_cluster_risk=imei_cluster_risk,
                fri_score="LOW",
                reactivation_device_change=False,
                first_post_txn_type="NONE",
                activation_time=base_time + timedelta(hours=int(np.random.randint(0, 24))),
                taint_score=0.0,
                test_credit_count=test_credit_count,
                open_device_used_in_events=True,
            )
        )

    for account_id in profile2_ids:
        open_device = _generate_imei(blocked_prefixes, use_blocked=True)
        upi_device = _generate_imei(blocked_prefixes, use_blocked=True)
        while upi_device == open_device:
            upi_device = _generate_imei(blocked_prefixes, use_blocked=True)

        open_sim = _generate_iccid()
        sim_swap_hour = int(np.random.randint(6, 72))
        current_sim = _generate_iccid()
        upi_registration_hour = int(np.random.randint(1, 25))
        sim_swap_delta_hours = float(np.abs(sim_swap_hour - upi_registration_hour))

        accounts.append(
            AccountMeta(
                account_id=account_id,
                profile_type="DORMANT_REACTIVATION_MULE",
                label=1,
                account_age_days=int(np.random.randint(180, 901)),
                dormancy_days=int(np.random.randint(180, 731)),
                open_device_imei=open_device,
                upi_device_imei=upi_device,
                upi_registration_hour=upi_registration_hour,
                open_sim_iccid=open_sim,
                current_sim_iccid=current_sim,
                sim_swap_within_7_days=True,
                sim_swap_hour=sim_swap_hour,
                sim_swap_delta_hours=sim_swap_delta_hours,
                imei_cluster_risk=float(np.random.uniform(0.7, 0.95)),
                fri_score="LOW",
                reactivation_device_change=True,
                first_post_txn_type="CREDIT",
                activation_time=base_time + timedelta(hours=int(np.random.randint(0, 24))),
                taint_score=0.0,
                test_credit_count=int(np.random.randint(5, 9)),
                open_device_used_in_events=True,
            )
        )

    for account_id in profile3_ids:
        device = _generate_imei(blocked_prefixes, use_blocked=False)
        open_sim = _generate_iccid()
        accounts.append(
            AccountMeta(
                account_id=account_id,
                profile_type="LEGITIMATE_NEW",
                label=0,
                account_age_days=int(np.random.randint(0, 31)),
                dormancy_days=0,
                open_device_imei=device,
                upi_device_imei=device,
                upi_registration_hour=int(np.random.randint(1, 25)),
                open_sim_iccid=open_sim,
                current_sim_iccid=open_sim,
                sim_swap_within_7_days=False,
                sim_swap_hour=-1,
                sim_swap_delta_hours=float(-1),
                imei_cluster_risk=float(np.random.uniform(0.05, 0.25)),
                fri_score=str(np.random.choice(["LOW", "MEDIUM"], p=[0.7, 0.3])),
                reactivation_device_change=False,
                first_post_txn_type="NONE",
                activation_time=base_time + timedelta(hours=int(np.random.randint(0, 24))),
                taint_score=0.0,
                test_credit_count=0,
                open_device_used_in_events=False,
            )
        )

    for idx, account_id in enumerate(profile4_ids):
        device_change = idx in device_change_indices
        open_device = _generate_imei(blocked_prefixes, use_blocked=False)
        upi_device = _generate_imei(blocked_prefixes, use_blocked=False) if device_change else open_device

        open_sim = _generate_iccid()
        accounts.append(
            AccountMeta(
                account_id=account_id,
                profile_type="LEGITIMATE_DORMANT_REACTIVATION",
                label=0,
                account_age_days=int(np.random.randint(120, 1501)),
                dormancy_days=int(np.random.randint(90, 401)),
                open_device_imei=open_device,
                upi_device_imei=upi_device,
                upi_registration_hour=int(np.random.randint(1, 25)),
                open_sim_iccid=open_sim,
                current_sim_iccid=open_sim,
                sim_swap_within_7_days=False,
                sim_swap_hour=-1,
                sim_swap_delta_hours=float(-1),
                imei_cluster_risk=float(np.random.uniform(0.05, 0.3)),
                fri_score=str(np.random.choice(["LOW", "MEDIUM"], p=[0.6, 0.4])),
                reactivation_device_change=device_change,
                first_post_txn_type="CREDIT",
                activation_time=base_time + timedelta(hours=int(np.random.randint(0, 24))),
                taint_score=0.0,
                test_credit_count=0,
                open_device_used_in_events=device_change,
            )
        )

    mule_ids = profile1_ids + profile2_ids
    return accounts, profile2_ids, mule_ids


def _build_account_summaries(
    accounts: List[AccountMeta],
    signal_flags: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Purpose: Create per-account summary payloads for export.

    Parameters:
        accounts: Account metadata list.
        signal_flags: Mapping of account_id to signal flags.
    Returns:
        List of account summary dictionaries.
    PRISM signal: Signals 1-6 (summary flag aggregation).
    """
    summaries: List[Dict[str, Any]] = []
    for account in accounts:
        flags = signal_flags.get(account.account_id, {})
        summaries.append(
            {
                "account_id": account.account_id,
                "profile_type": account.profile_type,
                "label": int(account.label),
                "taint_score": float(account.taint_score),
                "signal_flags": {
                    "signal_1": bool(flags.get("s1_fired", False)),
                    "signal_2": bool(flags.get("s2_fired", False)),
                    "signal_3": bool(flags.get("s3_fired", False)),
                    "signal_4": bool(flags.get("s4_fired", False)),
                    "signal_5": bool(flags.get("s5_fired", False)),
                    "signal_6": bool(flags.get("s6_fired", False)),
                },
            }
        )
    return summaries


def main() -> None:
    """Purpose: Orchestrate synthetic dataset generation and validation.

    Parameters:
        None.
    Returns:
        None.
    PRISM signal: Signals 1-6 (end-to-end generation).
    """
    np.random.seed(42)
    accounts, profile2_ids, mule_ids = _build_accounts()

    taint_network, taint_map = generate_taint_network(profile2_ids)
    for account in accounts:
        if account.account_id in taint_map:
            account.taint_score = float(taint_map[account.account_id])

    transactions: List[Dict[str, Any]] = []
    for account in accounts:
        if account.profile_type == "ACTIVE_MULE":
            transactions.extend(_generate_profile1_events(account))
        elif account.profile_type == "DORMANT_REACTIVATION_MULE":
            transactions.extend(_generate_profile2_events(account))
        elif account.profile_type == "LEGITIMATE_NEW":
            transactions.extend(_generate_profile3_events(account))
        else:
            transactions.extend(_generate_profile4_events(account))

    account_dicts = [_account_to_feature_dict(account) for account in accounts]
    features_df = compute_feature_matrix(transactions, account_dicts)
    flags_df = derive_signal_flags(features_df)
    signal_map = flags_df.set_index("account_id").to_dict("index")

    account_summaries = _build_account_summaries(accounts, signal_map)
    recruiters = generate_recruiters(mule_ids)
    demo_account = _build_demo_account()

    output_dir = export_dataset(
        transactions=transactions,
        features_df=features_df,
        account_summaries=account_summaries,
        recruiters=recruiters,
        taint_network=taint_network,
        demo_account=demo_account,
    )

    run_validation(output_dir)


if __name__ == "__main__":
    main()
