"""
ARGUS-PRISM — PostgreSQL Case Management Seeder — Day 8
========================================================
Seeds realistic case management data into PostgreSQL for the 3 demo campaigns.

Tables seeded:
  - accounts  — 3 recruiters + 50 mules from demo campaigns
  - alerts    — FlowGraph + WarmthScore alerts per mule
  - cases     — One case per campaign (MLRO investigation workflow)
  - audit_log — Every action taken on the accounts

Run:
    python pg_seeder.py
    python pg_seeder.py --wipe    # Truncate demo data first

Requires:
    pip install asyncpg sqlalchemy psycopg2-binary
"""

import sys
import os
import uuid
import random
import hashlib
import argparse
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'services', 'pipeline'))
try:
    from config import POSTGRES_DSN
except ImportError:
    POSTGRES_DSN = os.getenv(
        "POSTGRES_DSN",
        "postgresql://prism_user:prism_password@localhost:5432/prism_db"
    )

import psycopg2

random.seed(2026)
NOW = datetime.now(timezone.utc)


CAMPAIGNS = [
    {
        "name":         "small",
        "recruiter_id": "DEMO-SM-REC",
        "mule_prefix":  "DEMO-SM-M",
        "mule_count":   7,
        "tier":         "CAMPAIGN_COORDINATOR",
        "total_flow":   "Rs.12L",
    },
    {
        "name":         "medium",
        "recruiter_id": "DEMO-MD-REC",
        "mule_prefix":  "DEMO-MD-M",
        "mule_count":   15,
        "tier":         "INDUSTRIAL_ORCHESTRATOR",
        "total_flow":   "Rs.47L",
    },
    {
        "name":         "platform",
        "recruiter_id": "DEMO-PT-REC",
        "mule_prefix":  "DEMO-PT-M",
        "mule_count":   28,
        "tier":         "PLATFORM_SCALE",
        "total_flow":   "Rs.2.3Cr",
    },
]

MLRO_IDS = ["MLRO-001", "MLRO-002", "MLRO-003"]
ANALYSTS  = ["ANALYST-001", "ANALYST-002"]


def sha(v: str) -> str:
    return hashlib.sha256(v.encode()).hexdigest()[:16]


def ago(**kw) -> datetime:
    return NOW - timedelta(**kw)


def get_conn():
    conn = psycopg2.connect(POSTGRES_DSN)
    conn.autocommit = True
    return conn


def wipe_demo_data(cur):
    print("  Wiping existing DEMO data from PostgreSQL...")
    # audit_log is immutable (trigger prevents DELETE) — skip
    cur.execute("DELETE FROM alerts     WHERE account_id LIKE 'DEMO-%'")
    cur.execute("DELETE FROM cases      WHERE account_id LIKE 'DEMO-%'")
    cur.execute("DELETE FROM accounts   WHERE account_id LIKE 'DEMO-%'")
    print("  Done")


def seed_account(cur, account_id, is_recruiter=False, warmth_score=0.0,
                 taint_score=0.0, status="ACTIVE", kyc_income=200000,
                 campaign_name=None, campaign_tier=None):
    try:
        cur.execute("""
            INSERT INTO accounts (
                account_id, account_holder_name, account_type,
                branch_code, ifsc_code, mobile_number,
                kyc_status, account_status,
                current_warmth_score, taint_score,
                is_confirmed_mule, account_opened_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) ON CONFLICT (account_id) DO UPDATE SET
                current_warmth_score = EXCLUDED.current_warmth_score,
                taint_score          = EXCLUDED.taint_score,
                account_status       = EXCLUDED.account_status
        """, (
            account_id,
            f"{'Recruiter' if is_recruiter else 'Mule'} {account_id[-6:]}",
            "CURRENT" if is_recruiter else "SAVINGS",
            "UBI-DEMO",
            "UBIN0000001",
            sha(account_id + "-mobile")[:15],
            "COMPLETE",
            status,
            warmth_score,
            taint_score,
            not is_recruiter,
            ago(days=random.randint(1, 30)),
        ))
    except Exception as e:
        print(f"    [WARN] account {account_id}: {e}")


def seed_alert(cur, account_id, alert_type, severity, description, hours_ago=24):
    try:
        cur.execute("""
            INSERT INTO alerts (
                account_id, alert_type, severity,
                alert_message, warmth_score_at_alert,
                threshold_crossed, is_acknowledged, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            account_id,
            alert_type[:50],
            severity[:20],
            description,
            round(random.uniform(60.0, 95.0), 2),
            75.0,
            False,
            ago(hours=hours_ago),
        ))
    except Exception as e:
        print(f"    [WARN] alert for {account_id}: {e}")


def seed_case(cur, case_id, recruiter_id, campaign, status="UNDER_INVESTIGATION"):
    try:
        mlro = random.choice(MLRO_IDS)
        cur.execute("""
            INSERT INTO cases (
                account_id, case_status, assigned_mlro,
                peak_warmth_score, peak_risk_level, mlro_notes, opened_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            recruiter_id,
            "OPEN",
            mlro,
            round(random.uniform(80.0, 95.0), 2),
            "CRITICAL" if campaign["tier"] == "PLATFORM_SCALE" else "HIGH",
            (
                f"{campaign['tier']} detected. Recruiter {recruiter_id} "
                f"coordinated {campaign['mule_count']} mule accounts. "
                f"Total campaign flow: {campaign['total_flow']}."
            ),
            ago(hours=random.randint(1, 48)),
        ))
    except Exception as e:
        print(f"    [WARN] case {case_id}: {e}")


def seed_audit(cur, actor, action, target_id, detail):
    try:
        import json
        cur.execute("""
            INSERT INTO audit_log (
                actor, actor_role, action, target_type, target_id, details, timestamp
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            actor,
            "SYSTEM" if actor.startswith("PRISM") else "MLRO",
            action,
            "Account",
            target_id,
            json.dumps({"detail": detail}),
            ago(hours=random.randint(0, 72)),
        ))
    except Exception as e:
        print(f"    [WARN] audit {action}/{target_id}: {e}")


def seed_campaign(cur, campaign):
    name       = campaign["name"]
    rec_id     = campaign["recruiter_id"]
    prefix     = campaign["mule_prefix"]
    count      = campaign["mule_count"]
    case_id    = f"PRISM-DEMO-{name.upper()}-001"

    print(f"  [{campaign['tier']}] Seeding '{name}' campaign...")

    # Recruiter account
    seed_account(cur, rec_id, is_recruiter=True, warmth_score=15.0,
                 kyc_income=800000, campaign_name=name, campaign_tier=campaign["tier"])

    seed_audit(cur, "PRISM_SYSTEM", "RECRUITER_DETECTED", rec_id,
               f"Recruiter {rec_id} detected as {campaign['tier']}")

    # Mule accounts + alerts
    for i in range(count):
        mid = f"{prefix}{i:03d}"
        final_ws = round(random.uniform(72.0, 95.0), 2)
        final_ts = 80.0 if i == 0 else 0.0  # Only first mule confirmed tainted
        seed_account(cur, mid, warmth_score=final_ws, taint_score=final_ts,
                     status="FROZEN", campaign_name=name, campaign_tier=campaign["tier"])

        # Warmth threshold alert
        seed_alert(cur, mid, "WARMTH_THRESHOLD", "HIGH",
                   f"WarmthScore {final_ws:.1f} exceeded threshold 75 — KYC re-verification triggered",
                   hours_ago=random.randint(12, 60))

        # FlowGraph alert
        seed_alert(cur, mid, "FLOW_GRAPH_LAYERING", "HIGH",
                   f"Account {mid} detected in 3-hop layering chain within 6hr window",
                   hours_ago=random.randint(1, 24))

        if i == count - 1:
            # Last mule = dormant activation
            seed_alert(cur, mid, "DORMANT_ACTIVATION", "MEDIUM",
                       f"Account inactive 120 days reactivated with ₹{random.randint(2,9)*10000:,} credit",
                       hours_ago=random.randint(24, 48))

        # Audit: account frozen
        seed_audit(cur, "PRISM_RECRUITER_ENGINE", "ACCOUNT_FROZEN", mid,
                   f"Frozen as part of campaign {case_id}")

        # Audit: warmth score update
        seed_audit(cur, "PRISM_WARMTHSCORE", "WARMTH_UPDATED", mid,
                   f"WarmthScore updated to {final_ws:.1f}")

    # Case
    seed_case(cur, case_id, rec_id, campaign)

    # Audit: case opened
    mlro = random.choice(MLRO_IDS)
    seed_audit(cur, f"DEMO-{mlro}", "CASE_OPENED", rec_id,
               f"Case {case_id} opened for {campaign['tier']} campaign investigation")

    print(f"    Seeded: recruiter + {count} mules + {count * 2} alerts + case + audit log")


def main():
    parser = argparse.ArgumentParser(description="PRISM PostgreSQL Demo Seeder")
    parser.add_argument("--wipe", action="store_true",
                        help="Delete existing DEMO data before seeding")
    args = parser.parse_args()

    print("=" * 60)
    print("ARGUS-PRISM PostgreSQL Demo Seeder - Day 8")
    print("=" * 60)

    conn = get_conn()
    cur  = conn.cursor()

    if args.wipe:
        wipe_demo_data(cur)

    for campaign in CAMPAIGNS:
        seed_campaign(cur, campaign)

    cur.close()
    conn.close()

    total_mules = sum(c["mule_count"] for c in CAMPAIGNS)
    print()
    print("=" * 60)
    print("POSTGRESQL SEED COMPLETE")
    print(f"  Campaigns : {len(CAMPAIGNS)}")
    print(f"  Recruiters: {len(CAMPAIGNS)}")
    print(f"  Mules     : {total_mules}")
    print(f"  Cases     : {len(CAMPAIGNS)}")
    print(f"  DSN       : {POSTGRES_DSN[:40]}...")
    print("=" * 60)


if __name__ == "__main__":
    main()
