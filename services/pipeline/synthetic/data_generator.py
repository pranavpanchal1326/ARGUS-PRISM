"""
ARGUS-PRISM Synthetic Data Generator
=====================================
Generates 200 accounts (150 legitimate + 50 mule) across 5 fraud campaigns.
Outputs JSON files to data/synthetic_demo/ for pipeline testing.

Mule behavior patterns planted:
  - Test credit warming (Signal 1)
  - Device fingerprint changes (Signal 2)
  - Velocity spike curve (Signal 3)
  - Dormant reactivation + device change (Signal 4)
  - FRI contradiction (Signal 5)
  - SIM swap events (Signal 6)
  - Layering chains (FlowGraph Detector 1)
  - Round-trip cycles (FlowGraph Detector 2)
  - Structuring below 10L (FlowGraph Detector 3)
  - Dormant activation (FlowGraph Detector 4)
  - Profile mismatch (FlowGraph Detector 5)
"""

import json
import random
import hashlib
import uuid
from datetime import datetime, timedelta
from pathlib import Path

# ─── Seed for reproducibility ────────────────────────────────────────────────
random.seed(42)

# ─── Output paths ────────────────────────────────────────────────────────────
OUTPUT_DIR = Path(__file__).resolve().parents[3] / "data" / "synthetic_demo"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ─── Constants ───────────────────────────────────────────────────────────────
TOTAL_ACCOUNTS = 200
LEGIT_ACCOUNTS = 150
MULE_ACCOUNTS = 50          # 5 campaigns x 10 mules each
NUM_CAMPAIGNS = 5
MULES_PER_CAMPAIGN = 10

BASE_TIME = datetime(2026, 1, 1, 0, 0, 0)  # Simulation start

OCCUPATIONS = ["salaried", "self_employed", "student", "vegetable_vendor",
               "farmer", "retired", "homemaker", "business_owner"]
BRANCHES = [f"UBI-BR-{str(i).zfill(4)}" for i in range(1, 51)]
CHANNELS = ["UPI", "NEFT", "RTGS", "IMPS", "ATM", "BRANCH_COUNTER", "NETBANKING"]
ACCOUNT_TYPES = ["SAVINGS", "CURRENT", "JAN_DHAN", "SALARY"]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def ts(dt: datetime) -> int:
    """Convert datetime to epoch milliseconds."""
    return int(dt.timestamp() * 1000)


def rand_mobile() -> str:
    return f"9{random.randint(100000000, 999999999)}"


def rand_imei() -> str:
    prefix = str(random.randint(10000000, 99999999))
    suffix = str(random.randint(100000, 999999))
    return prefix + suffix


def rand_amount_paise(min_inr: int, max_inr: int) -> int:
    """Return random amount in paise (INR * 100)."""
    return random.randint(min_inr * 100, max_inr * 100)


def make_account_id(index: int) -> str:
    return f"UBI-2026-{str(index).zfill(6)}"


# ─── Account Generation ───────────────────────────────────────────────────────

def generate_legit_account(index: int) -> dict:
    account_id = make_account_id(index)
    mobile = rand_mobile()
    imei = rand_imei()
    created = BASE_TIME - timedelta(days=random.randint(30, 1800))
    last_active = created + timedelta(days=random.randint(1, 30))

    return {
        "account_id": account_id,
        "name": f"Legit Customer {index}",
        "kyc_status": "VERIFIED",
        "kyc_income": random.randint(200000, 2000000),
        "kyc_occupation": random.choice(OCCUPATIONS),
        "account_type": random.choice(ACCOUNT_TYPES),
        "branch_code": random.choice(BRANCHES),
        "mobile_number": sha256(mobile),
        "mobile_raw": mobile,              # kept only for internal simulation use
        "imei": sha256(imei),
        "imei_prefix": imei[:8],
        "sim_id": sha256(f"SIM-{mobile}"),
        "warmth_score": round(random.uniform(0, 35), 2),
        "taint_score": 0.0,
        "status": "ACTIVE",
        "fri_score": random.randint(5, 30),   # LOW FRI — clean accounts
        "is_mule": False,
        "campaign_id": None,
        "created_at": ts(created),
        "last_active": ts(last_active),
        "event_timestamp": ts(BASE_TIME),
        "source_system": "FINACLE"
    }


def generate_mule_account(index: int, campaign_id: int, recruiter_id: str,
                           is_dormant: bool = False) -> dict:
    account_id = make_account_id(index)
    mobile = rand_mobile()
    # Mule SIMs: fresh Tier-3 city numbers to score LOW on FRI
    imei = rand_imei()
    new_imei = rand_imei()   # device changes on reactivation

    if is_dormant:
        created = BASE_TIME - timedelta(days=random.randint(200, 400))
        last_active = created + timedelta(days=random.randint(1, 10))
    else:
        created = BASE_TIME - timedelta(days=random.randint(1, 5))
        last_active = None

    # SIM swap: 3-6 days before UPI registration
    sim_swap_days_before = random.randint(3, 6)
    upi_reg_time = BASE_TIME + timedelta(hours=random.randint(0, 12))
    sim_swap_time = upi_reg_time - timedelta(days=sim_swap_days_before)

    return {
        "account_id": account_id,
        "name": f"Mule Account C{campaign_id}-{index}",
        "kyc_status": "VERIFIED",   # Clean KYC — documents appear legitimate
        "kyc_income": random.randint(100000, 300000),
        "kyc_occupation": random.choice(["student", "farmer", "homemaker"]),
        "account_type": random.choice(["SAVINGS", "JAN_DHAN"]),
        "branch_code": random.choice(BRANCHES),
        "mobile_number": sha256(mobile),
        "mobile_raw": mobile,
        "imei": sha256(imei),
        "imei_prefix": imei[:8],
        "new_imei": sha256(new_imei),
        "new_imei_prefix": new_imei[:8],
        "sim_id": sha256(f"SIM-{mobile}"),
        "warmth_score": 0.0,
        "taint_score": 0.0,
        "status": "ACTIVE",
        "fri_score": random.randint(2, 15),   # LOW FRI — fresh clean SIM
        "is_mule": True,
        "campaign_id": f"CAMPAIGN-{campaign_id}",
        "recruiter_id": recruiter_id,
        "is_dormant_mule": is_dormant,
        "sim_swap_timestamp": ts(sim_swap_time),
        "upi_registration_timestamp": ts(upi_reg_time),
        "created_at": ts(created),
        "last_active": ts(last_active) if last_active else None,
        "event_timestamp": ts(BASE_TIME),
        "source_system": "FINACLE"
    }


def generate_recruiter_account(campaign_id: int, index: int) -> dict:
    """Recruiter: the coordinator account — looks completely clean individually."""
    account_id = make_account_id(index)
    mobile = rand_mobile()
    imei = rand_imei()
    created = BASE_TIME - timedelta(days=random.randint(60, 365))

    return {
        "account_id": account_id,
        "name": f"Recruiter C{campaign_id}",
        "kyc_status": "VERIFIED",
        "kyc_income": random.randint(500000, 1500000),
        "kyc_occupation": "business_owner",
        "account_type": "CURRENT",
        "branch_code": random.choice(BRANCHES),
        "mobile_number": sha256(mobile),
        "mobile_raw": mobile,
        "imei": sha256(imei),
        "imei_prefix": imei[:8],
        "sim_id": sha256(f"SIM-{mobile}"),
        "warmth_score": random.uniform(10, 20),   # Individually clean!
        "taint_score": 0.0,
        "status": "ACTIVE",
        "fri_score": random.randint(5, 20),
        "is_mule": False,
        "is_recruiter": True,
        "campaign_id": f"CAMPAIGN-{campaign_id}",
        "created_at": ts(created),
        "last_active": ts(BASE_TIME - timedelta(hours=1)),
        "event_timestamp": ts(BASE_TIME),
        "source_system": "FINACLE"
    }


# ─── Transaction Generation ───────────────────────────────────────────────────

def generate_legit_transactions(accounts: list) -> list:
    txns = []
    legit = [a for a in accounts if not a["is_mule"] and not a.get("is_recruiter")]
    for _ in range(800):
        src = random.choice(legit)
        dst = random.choice(legit)
        if src["account_id"] == dst["account_id"]:
            continue
        t = BASE_TIME - timedelta(days=random.randint(0, 30),
                                   hours=random.randint(0, 23))
        txns.append({
            "event_id": str(uuid.uuid4()),
            "txn_id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
            "txn_type": "CREDIT",
            "channel": random.choice(CHANNELS),
            "from_account": src["account_id"],
            "to_account": dst["account_id"],
            "amount": rand_amount_paise(100, 50000),
            "currency": "INR",
            "status": "SUCCESS",
            "timestamp": ts(t),
            "event_timestamp": ts(t),
            "source_system": "FINACLE"
        })
    return txns


def generate_test_credits(recruiter_id: str, mule_accounts: list,
                           campaign_start: datetime) -> list:
    """Signal 1: recruiter sends 3-8 micro-credits to each mule (₹1–₹500)."""
    txns = []
    for mule in mule_accounts:
        num_credits = random.randint(3, 8)
        for i in range(num_credits):
            t = campaign_start + timedelta(hours=random.randint(0, 36),
                                            minutes=random.randint(0, 59))
            txns.append({
                "event_id": str(uuid.uuid4()),
                "txn_id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
                "txn_type": "CREDIT",
                "channel": "UPI",
                "from_account": recruiter_id,
                "to_account": mule["account_id"],
                "amount": random.randint(100, 50000),   # ₹1–₹500 in paise
                "currency": "INR",
                "status": "SUCCESS",
                "is_test_credit": True,
                "timestamp": ts(t),
                "event_timestamp": ts(t),
                "source_system": "FINACLE"
            })
    return txns


def generate_layering_chain(accounts: list, campaign_start: datetime) -> list:
    """FlowGraph Detector 1: 3+ hops within 6 hours."""
    txns = []
    chain = random.sample([a for a in accounts if a["is_mule"]], 4)
    t = campaign_start + timedelta(hours=72)
    for i in range(len(chain) - 1):
        t += timedelta(minutes=random.randint(30, 90))
        txns.append({
            "event_id": str(uuid.uuid4()),
            "txn_id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
            "txn_type": "CREDIT",
            "channel": "NEFT",
            "from_account": chain[i]["account_id"],
            "to_account": chain[i + 1]["account_id"],
            "amount": rand_amount_paise(500000, 2000000),
            "currency": "INR",
            "status": "SUCCESS",
            "pattern_tag": "LAYERING",
            "timestamp": ts(t),
            "event_timestamp": ts(t),
            "source_system": "FINACLE"
        })
    return txns


def generate_round_trip(mule_accounts: list, campaign_start: datetime) -> list:
    """FlowGraph Detector 2: A → B → C → A cycle within 72 hours."""
    txns = []
    if len(mule_accounts) < 3:
        return txns
    a, b, c = mule_accounts[0], mule_accounts[1], mule_accounts[2]
    chain = [(a, b), (b, c), (c, a)]
    t = campaign_start + timedelta(hours=73)
    for src, dst in chain:
        t += timedelta(hours=random.randint(6, 18))
        txns.append({
            "event_id": str(uuid.uuid4()),
            "txn_id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
            "txn_type": "CREDIT",
            "channel": "IMPS",
            "from_account": src["account_id"],
            "to_account": dst["account_id"],
            "amount": rand_amount_paise(800000, 900000),
            "currency": "INR",
            "status": "SUCCESS",
            "pattern_tag": "ROUND_TRIP",
            "timestamp": ts(t),
            "event_timestamp": ts(t),
            "source_system": "FINACLE"
        })
    return txns


def generate_structuring(mule: dict, campaign_start: datetime) -> list:
    """FlowGraph Detector 3: multiple transactions sub-₹10L in same day."""
    txns = []
    t = campaign_start + timedelta(hours=74)
    for _ in range(random.randint(4, 7)):
        t += timedelta(minutes=random.randint(15, 60))
        txns.append({
            "event_id": str(uuid.uuid4()),
            "txn_id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
            "txn_type": "CREDIT",
            "channel": "NEFT",
            "from_account": mule["recruiter_id"],
            "to_account": mule["account_id"],
            "amount": rand_amount_paise(920000, 990000),   # Just under ₹10L
            "currency": "INR",
            "status": "SUCCESS",
            "pattern_tag": "STRUCTURING",
            "timestamp": ts(t),
            "event_timestamp": ts(t),
            "source_system": "FINACLE"
        })
    return txns


def generate_illicit_credit(mule: dict, campaign_start: datetime) -> dict:
    """Main fraud credit arriving at hour 72."""
    t = campaign_start + timedelta(hours=72)
    return {
        "event_id": str(uuid.uuid4()),
        "txn_id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
        "txn_type": "CREDIT",
        "channel": "RTGS",
        "from_account": f"EXTERNAL-{uuid.uuid4().hex[:8].upper()}",
        "to_account": mule["account_id"],
        "amount": rand_amount_paise(500000, 3000000),
        "currency": "INR",
        "status": "SUCCESS",
        "pattern_tag": "ILLICIT_CREDIT",
        "timestamp": ts(t),
        "event_timestamp": ts(t),
        "source_system": "FINACLE"
    }


# ─── Device Events ────────────────────────────────────────────────────────────

def generate_device_events(accounts: list) -> list:
    events = []
    for acc in accounts:
        # Initial device registration
        t = datetime.fromtimestamp(acc["created_at"] / 1000) + timedelta(hours=1)
        events.append({
            "event_id": str(uuid.uuid4()),
            "event_type": "UPI_DEVICE_REGISTERED",
            "account_id": acc["account_id"],
            "imei": acc["imei"],
            "imei_prefix": acc["imei_prefix"],
            "sim_id": acc["sim_id"],
            "fingerprint": sha256(acc["imei"] + acc["sim_id"]),
            "is_blocked_imei_cluster": False,
            "previous_imei": None,
            "sim_swap_timestamp": acc.get("sim_swap_timestamp"),
            "upi_registration_timestamp": acc.get("upi_registration_timestamp",
                                                    ts(t)),
            "last_seen": ts(t),
            "timestamp": ts(t),
            "event_timestamp": ts(t),
            "source_system": "FINACLE"
        })

        # Mule device change on reactivation (Signal 2 & 4)
        if acc["is_mule"] and acc.get("new_imei"):
            t2 = BASE_TIME + timedelta(hours=2)
            events.append({
                "event_id": str(uuid.uuid4()),
                "event_type": "UPI_DEVICE_CHANGED",
                "account_id": acc["account_id"],
                "imei": acc["new_imei"],
                "imei_prefix": acc["new_imei_prefix"],
                "sim_id": acc["sim_id"],
                "fingerprint": sha256(acc["new_imei"] + acc["sim_id"]),
                "is_blocked_imei_cluster": random.random() < 0.6,
                "previous_imei": acc["imei"],
                "sim_swap_timestamp": acc.get("sim_swap_timestamp"),
                "upi_registration_timestamp": acc.get("upi_registration_timestamp"),
                "last_seen": ts(t2),
                "timestamp": ts(t2),
                "event_timestamp": ts(t2),
                "source_system": "FINACLE"
            })

        # SIM swap event (Signal 6)
        if acc["is_mule"] and acc.get("sim_swap_timestamp"):
            events.append({
                "event_id": str(uuid.uuid4()),
                "event_type": "SIM_SWAP_DETECTED",
                "account_id": acc["account_id"],
                "imei": acc["imei"],
                "imei_prefix": acc["imei_prefix"],
                "sim_id": acc["sim_id"],
                "fingerprint": sha256(acc["imei"] + acc["sim_id"]),
                "is_blocked_imei_cluster": False,
                "previous_imei": None,
                "sim_swap_timestamp": acc["sim_swap_timestamp"],
                "upi_registration_timestamp": acc.get("upi_registration_timestamp"),
                "last_seen": acc["sim_swap_timestamp"],
                "timestamp": acc["sim_swap_timestamp"],
                "event_timestamp": acc["sim_swap_timestamp"],
                "source_system": "DOT_DIP"
            })

    return events


# ─── KYC Events ───────────────────────────────────────────────────────────────

def generate_kyc_events(accounts: list) -> list:
    events = []
    for acc in accounts:
        t = datetime.fromtimestamp(acc["created_at"] / 1000) + timedelta(hours=2)
        events.append({
            "event_id": str(uuid.uuid4()),
            "event_type": "KYC_COMPLETED",
            "account_id": acc["account_id"],
            "kyc_status": "VERIFIED",
            "triggered_by": "SYSTEM_INITIAL",
            "legal_authority": "RBI KYC Master Direction 2016 S.38",
            "mlro_id": None,
            "warmth_score_at_trigger": 0.0,
            "resolution_deadline": None,
            "timestamp": ts(t),
            "event_timestamp": ts(t),
            "source_system": "FINACLE"
        })

        # For mule accounts — KYC re-verification triggered at WarmthScore 60+
        if acc["is_mule"]:
            t2 = BASE_TIME + timedelta(hours=60)
            events.append({
                "event_id": str(uuid.uuid4()),
                "event_type": "RE_VERIFICATION_TRIGGERED",
                "account_id": acc["account_id"],
                "kyc_status": "RE_VERIFICATION_REQUIRED",
                "triggered_by": "WARMTH_SCORE_60",
                "legal_authority": "RBI KYC Master Direction 2016 S.38",
                "mlro_id": None,
                "warmth_score_at_trigger": round(random.uniform(60, 70), 2),
                "resolution_deadline": ts(t2 + timedelta(hours=48)),
                "timestamp": ts(t2),
                "event_timestamp": ts(t2),
                "source_system": "PRISM"
            })

    return events


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("ARGUS-PRISM Synthetic Data Generator")
    print("=" * 60)

    accounts = []
    transactions = []
    device_events = []
    kyc_events = []

    # ── Legitimate accounts (indices 0–149) ──────────────────────────────────
    print(f"Generating {LEGIT_ACCOUNTS} legitimate accounts...")
    for i in range(LEGIT_ACCOUNTS):
        accounts.append(generate_legit_account(i + 1))

    # ── Recruiter accounts (1 per campaign) ──────────────────────────────────
    recruiters = []
    print(f"Generating {NUM_CAMPAIGNS} recruiter accounts...")
    for c in range(NUM_CAMPAIGNS):
        idx = LEGIT_ACCOUNTS + 1 + c
        r = generate_recruiter_account(c + 1, idx)
        recruiters.append(r)
        accounts.append(r)

    # ── Mule accounts (10 per campaign) ──────────────────────────────────────
    print(f"Generating {MULE_ACCOUNTS} mule accounts across {NUM_CAMPAIGNS} campaigns...")
    all_mules = []
    for c in range(NUM_CAMPAIGNS):
        recruiter = recruiters[c]
        campaign_mules = []
        base_idx = LEGIT_ACCOUNTS + NUM_CAMPAIGNS + 1 + (c * MULES_PER_CAMPAIGN)

        for m in range(MULES_PER_CAMPAIGN):
            # Last 2 mules per campaign are dormant reactivation (Signal 4)
            is_dormant = m >= (MULES_PER_CAMPAIGN - 2)
            mule = generate_mule_account(
                base_idx + m, c + 1, recruiter["account_id"], is_dormant
            )
            campaign_mules.append(mule)
            accounts.append(mule)

        all_mules.extend(campaign_mules)

        # ── Generate campaign transactions ────────────────────────────────────
        campaign_start = BASE_TIME
        transactions += generate_test_credits(
            recruiter["account_id"], campaign_mules, campaign_start
        )
        transactions += generate_layering_chain(campaign_mules, campaign_start)
        transactions += generate_round_trip(campaign_mules, campaign_start)

        # Structuring on first mule of each campaign
        transactions.append(generate_illicit_credit(campaign_mules[0], campaign_start))
        transactions += generate_structuring(campaign_mules[0], campaign_start)

    # ── Legitimate background transactions ────────────────────────────────────
    print("Generating legitimate background transactions...")
    transactions += generate_legit_transactions(accounts)

    # ── Device and KYC events ─────────────────────────────────────────────────
    print("Generating device events...")
    device_events = generate_device_events(accounts)

    print("Generating KYC events...")
    kyc_events = generate_kyc_events(accounts)

    # ── Write output ──────────────────────────────────────────────────────────
    outputs = {
        "accounts.json": accounts,
        "transactions.json": transactions,
        "device_events.json": device_events,
        "kyc_events.json": kyc_events,
    }

    for filename, data in outputs.items():
        path = OUTPUT_DIR / filename
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        print(f"  [OK] {path.name}: {len(data)} records")

    # ── Summary ───────────────────────────────────────────────────────────────
    mule_count = sum(1 for a in accounts if a["is_mule"])
    recruiter_count = sum(1 for a in accounts if a.get("is_recruiter"))
    legit_count = sum(1 for a in accounts if not a["is_mule"] and not a.get("is_recruiter"))

    print()
    print("=" * 60)
    print("GENERATION COMPLETE")
    print(f"  Total accounts   : {len(accounts)}")
    print(f"  Legitimate       : {legit_count}")
    print(f"  Mule accounts    : {mule_count}")
    print(f"  Recruiter nodes  : {recruiter_count}")
    print(f"  Transactions     : {len(transactions)}")
    print(f"  Device events    : {len(device_events)}")
    print(f"  KYC events       : {len(kyc_events)}")
    print(f"  Output dir       : {OUTPUT_DIR}")
    print("=" * 60)

    # Verify mule tag
    assert mule_count == MULE_ACCOUNTS, f"Expected {MULE_ACCOUNTS} mules, got {mule_count}"
    print("[PASS] Acceptance check: 50 mule accounts confirmed")


if __name__ == "__main__":
    main()
