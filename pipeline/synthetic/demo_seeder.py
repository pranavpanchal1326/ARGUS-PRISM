"""
ARGUS-PRISM — Unified Demo Seeder (Cloud Run Job)
===================================================
Seeds demo campaigns into BOTH PostgreSQL and Neo4j.

PostgreSQL tables seeded:
  - accounts   — recruiters + mules (with warmth_risk_level for API filtering)
  - alerts     — WarmthScore + FlowGraph alerts per mule
  - cases      — One case per campaign
  - audit_log  — System actions

Neo4j nodes/relationships seeded:
  - Account nodes with warmth/taint scores
  - TRANSACTED relationships (layering, structuring, taint chains)
  - WarmthEvent timeline nodes (72-hour history)

Campaign tiers:
  SMALL    — 7  mules  (CAMPAIGN_COORDINATOR)
  MEDIUM   — 15 mules  (INDUSTRIAL_ORCHESTRATOR)
  PLATFORM — 28 mules  (PLATFORM_SCALE)

Usage (Cloud Run job):
    python pipeline/synthetic/demo_seeder.py
    python pipeline/synthetic/demo_seeder.py --wipe
"""

import sys
import os
import argparse
import hashlib
import random
import uuid
import json
import traceback
from datetime import datetime, timezone, timedelta

# ── Neo4j config ──────────────────────────────────────────────────────────────

NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "prism_password")

# ── PostgreSQL config (sync DSN for psycopg2) ────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "")

def _build_pg_dsn():
    """Convert asyncpg DATABASE_URL to psycopg2-compatible DSN."""
    dsn = DATABASE_URL
    if not dsn:
        return "postgresql://prism_user:prism_password@localhost:5432/prism_db"

    # Strip asyncpg scheme
    dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")

    # Handle Cloud SQL socket path: ?host=/cloudsql/...
    if "?host=/cloudsql/" in dsn:
        parts = dsn.split("?host=")
        base = parts[0]
        socket_dir = parts[1]
        # psycopg2 uses 'host' param in DSN
        dsn = base + "?host=" + socket_dir
    return dsn


PG_DSN = _build_pg_dsn()

random.seed(2026)
NOW = datetime.now(timezone.utc)

# ── Campaign specifications ───────────────────────────────────────────────────

CAMPAIGNS = [
    {
        "name":           "small",
        "label":          "Campaign Coordinator",
        "recruiter_id":   "DEMO-SM-REC",
        "mule_prefix":    "DEMO-SM-M",
        "mule_count":     7,
        "tier":           "CAMPAIGN_COORDINATOR",
        "total_flow":     "Rs.12L",
        "risk_narrative": "Small coordinated mule ring. 7 accounts, Rs.12L total flow.",
    },
    {
        "name":           "medium",
        "label":          "Industrial Orchestrator",
        "recruiter_id":   "DEMO-MD-REC",
        "mule_prefix":    "DEMO-MD-M",
        "mule_count":     15,
        "tier":           "INDUSTRIAL_ORCHESTRATOR",
        "total_flow":     "Rs.47L",
        "risk_narrative": "Industrial-scale orchestrator. 15 accounts, Rs.47L total flow.",
    },
    {
        "name":           "platform",
        "label":          "Platform Scale",
        "recruiter_id":   "DEMO-PT-REC",
        "mule_prefix":    "DEMO-PT-M",
        "mule_count":     28,
        "tier":           "PLATFORM_SCALE",
        "total_flow":     "Rs.2.3Cr",
        "risk_narrative": "Platform-scale operation. 28 accounts, Rs.2.3Cr total flow.",
    },
]

MLRO_IDS  = ["MLRO-001", "MLRO-002", "MLRO-003"]


def sha(v: str) -> str:
    return hashlib.sha256(v.encode()).hexdigest()[:16]


def ago(**kw) -> datetime:
    return NOW - timedelta(**kw)


def compute_risk_level(score: float) -> str:
    if score >= 85:
        return "CRITICAL"
    elif score >= 75:
        return "HIGH"
    elif score >= 60:
        return "MEDIUM"
    elif score >= 30:
        return "MONITORING"
    return "CLEAN"


# ══════════════════════════════════════════════════════════════════════════════
# POSTGRESQL SEEDER
# ══════════════════════════════════════════════════════════════════════════════

def pg_seed_account(cur, account_id, is_recruiter=False, warmth_score=0.0,
                    taint_score=0.0, status="ACTIVE", kyc_income=200000,
                    campaign_name=None, campaign_tier=None):
    risk_level = compute_risk_level(warmth_score)
    try:
        cur.execute("""
            INSERT INTO accounts (
                account_id, account_holder_name, account_type,
                branch_code, ifsc_code, mobile_number,
                kyc_status, account_status,
                current_warmth_score, warmth_risk_level,
                taint_score, is_confirmed_mule, account_opened_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) ON CONFLICT (account_id) DO UPDATE SET
                current_warmth_score = EXCLUDED.current_warmth_score,
                warmth_risk_level    = EXCLUDED.warmth_risk_level,
                taint_score          = EXCLUDED.taint_score,
                account_status       = EXCLUDED.account_status
        """, (
            account_id,
            f"{'Recruiter' if is_recruiter else 'Mule'} {account_id[-6:]}",
            "CURRENT" if is_recruiter else "SAVINGS",
            "UBI-DM",
            "UBIN0000001",
            sha(account_id + "-mobile")[:15],
            "COMPLETE",
            status,
            warmth_score,
            risk_level,
            taint_score,
            not is_recruiter,
            ago(days=random.randint(1, 30)),
        ))
    except Exception as e:
        print(f"    [WARN] pg account {account_id}: {e}")


def pg_seed_alert(cur, account_id, alert_type, severity, description, hours_ago=24):
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
        print(f"    [WARN] pg alert for {account_id}: {e}")


def pg_seed_case(cur, case_id, recruiter_id, campaign):
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
        print(f"    [WARN] pg case {case_id}: {e}")


def pg_seed_audit(cur, actor, action, target_id, detail):
    try:
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
        print(f"    [WARN] pg audit {action}/{target_id}: {e}")


def pg_seed_campaign(cur, campaign):
    name   = campaign["name"]
    rec_id = campaign["recruiter_id"]
    prefix = campaign["mule_prefix"]
    count  = campaign["mule_count"]

    # Recruiter
    pg_seed_account(cur, rec_id, is_recruiter=True, warmth_score=15.0,
                    kyc_income=800000, campaign_name=name, campaign_tier=campaign["tier"])

    pg_seed_audit(cur, "PRISM_SYSTEM", "RECRUITER_DETECTED", rec_id,
                  f"Recruiter {rec_id} detected as {campaign['tier']}")

    # Mules + alerts
    for i in range(count):
        mid = f"{prefix}{i:03d}"
        final_ws = round(random.uniform(72.0, 95.0), 2)
        final_ts = 80.0 if i == 0 else 0.0
        pg_seed_account(cur, mid, warmth_score=final_ws, taint_score=final_ts,
                        status="FROZEN", campaign_name=name, campaign_tier=campaign["tier"])

        pg_seed_alert(cur, mid, "WARMTH_THRESHOLD", "HIGH",
                      f"WarmthScore {final_ws:.1f} exceeded threshold 75",
                      hours_ago=random.randint(12, 60))

        pg_seed_alert(cur, mid, "FLOW_GRAPH_LAYERING", "HIGH",
                      f"Account {mid} detected in 3-hop layering chain within 6hr window",
                      hours_ago=random.randint(1, 24))

        if i == count - 1:
            pg_seed_alert(cur, mid, "DORMANT_ACTIVATION", "MEDIUM",
                          f"Account inactive 120 days reactivated with credit",
                          hours_ago=random.randint(24, 48))

        pg_seed_audit(cur, "PRISM_RECRUITER_ENGINE", "ACCOUNT_FROZEN", mid,
                      f"Frozen as part of campaign {name}")
        pg_seed_audit(cur, "PRISM_WARMTHSCORE", "WARMTH_UPDATED", mid,
                      f"WarmthScore updated to {final_ws:.1f}")

    # Case
    case_id = f"PRISM-DEMO-{name.upper()}-001"
    pg_seed_case(cur, case_id, rec_id, campaign)

    mlro = random.choice(MLRO_IDS)
    pg_seed_audit(cur, f"DEMO-{mlro}", "CASE_OPENED", rec_id,
                  f"Case {case_id} opened for {campaign['tier']} investigation")

    print(f"    [PG] Seeded: recruiter + {count} mules + alerts + case")


def pg_wipe(cur):
    print("  [PG] Wiping existing DEMO data...")
    cur.execute("DELETE FROM alerts     WHERE account_id LIKE 'DEMO-%'")
    cur.execute("DELETE FROM cases      WHERE account_id LIKE 'DEMO-%'")
    cur.execute("DELETE FROM accounts   WHERE account_id LIKE 'DEMO-%'")
    print("  [PG] Wiped")


def run_pg_seeder(wipe=False):
    import psycopg2
    print(f"\n  [PG] Connecting to: {PG_DSN[:50]}...")
    conn = psycopg2.connect(PG_DSN)
    conn.autocommit = True
    cur = conn.cursor()

    if wipe:
        pg_wipe(cur)

    for campaign in CAMPAIGNS:
        pg_seed_campaign(cur, campaign)

    total_mules = sum(c["mule_count"] for c in CAMPAIGNS)
    print(f"  [PG] COMPLETE: {len(CAMPAIGNS)} campaigns, {total_mules} mules seeded")

    cur.close()
    conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# NEO4J SEEDER
# ══════════════════════════════════════════════════════════════════════════════

def neo_seed_account(s, account_id, warmth_score=0.0, taint_score=0.0,
                     status="ACTIVE", is_mule=False, is_recruiter=False,
                     kyc_income=200000, kyc_occupation="farmer",
                     dormant_days=None, **extra):
    props = dict(
        name=f"Demo Account {account_id}",
        kyc_status="VERIFIED",
        kyc_income=kyc_income,
        kyc_occupation=kyc_occupation,
        account_type="SAVINGS" if not is_recruiter else "CURRENT",
        branch_code="UBI-DEMO-BR",
        mobile_number=sha(account_id + "-mobile"),
        warmth_score=warmth_score,
        taint_score=taint_score,
        final_risk_score=min(100.0, taint_score * 0.6 + warmth_score * 0.4),
        status=status,
        is_mule=is_mule,
        is_recruiter=is_recruiter,
        fri_score=random.randint(5, 20) if is_mule else random.randint(30, 80),
    )
    props.update(extra)
    if dormant_days:
        s.run(
            "MERGE (a:Account {account_id: $id}) SET a += $p, "
            "a.last_active = datetime() - duration($ago)",
            id=account_id, p=props, ago=f"P{dormant_days}D"
        )
    else:
        s.run("MERGE (a:Account {account_id: $id}) SET a += $p",
              id=account_id, p=props)


def neo_seed_txn(s, src, dst, txn_id, amount, hours_ago=2, channel="UPI",
                 pattern_tag=None):
    s.run("""
        MATCH (a:Account {account_id: $src})
        MATCH (b:Account {account_id: $dst})
        MERGE (a)-[r:TRANSACTED {txn_id: $tid}]->(b)
        SET r.amount    = $amount,
            r.type      = 'CREDIT',
            r.channel   = $channel,
            r.status    = 'SUCCESS',
            r.timestamp = datetime() - duration($ago)
    """, src=src, dst=dst, tid=txn_id, amount=amount,
         channel=channel, ago=f"PT{hours_ago}H")


def build_warmth_timeline(account_id: str, is_mule: bool) -> list:
    timeline = []
    score = 0.0
    for hour in range(72):
        if is_mule:
            if hour < 12:
                delta = random.uniform(0.2, 0.8)
            elif hour < 36:
                delta = random.uniform(1.0, 2.5)
            else:
                delta = random.uniform(3.0, 6.0)
            if hour == 6:    delta += 8.0
            if hour == 12:   delta += 5.0
            if hour == 24:   delta += 12.0
            if hour == 48:   delta += 10.0
            if hour == 60:   delta += 8.0
        else:
            delta = random.uniform(-0.5, 1.2)

        score = max(0.0, min(100.0, score + delta))
        risk_level = compute_risk_level(score)

        if is_mule:
            if hour < 6:       primary_signal = "test_credit_pattern"
            elif hour < 12:    primary_signal = "sim_swap_velocity"
            elif hour < 24:    primary_signal = "device_fingerprint"
            elif hour < 48:    primary_signal = "dormant_reactivation"
            elif hour < 60:    primary_signal = "velocity_derivative"
            else:              primary_signal = "fri_contradiction"
        else:
            primary_signal = "clean_baseline"

        timeline.append({
            "account_id":     account_id,
            "hour":           hour,
            "warmth_score":   round(score, 2),
            "risk_level":     risk_level,
            "primary_signal": primary_signal,
            "computed_at":    (NOW - timedelta(hours=72 - hour)).isoformat(),
        })
    return timeline


def neo_seed_warmth_timeline(s, account_id: str, is_mule: bool):
    timeline = build_warmth_timeline(account_id, is_mule)
    for point in timeline:
        s.run("""
            MERGE (w:WarmthEvent {account_id: $aid, hour: $hr})
            SET w.warmth_score  = $score,
                w.risk_level    = $risk,
                w.primary_signal = $signal,
                w.computed_at   = $ts
        """,
              aid=point["account_id"], hr=point["hour"],
              score=point["warmth_score"], risk=point["risk_level"],
              signal=point["primary_signal"], ts=point["computed_at"])

    final_score = timeline[-1]["warmth_score"]
    s.run("MATCH (a:Account {account_id: $id}) SET a.warmth_score = $score",
          id=account_id, score=final_score)
    return timeline


def neo_seed_campaign(s, campaign: dict):
    name   = campaign["name"]
    rec_id = campaign["recruiter_id"]
    prefix = campaign["mule_prefix"]
    count  = campaign["mule_count"]

    # Recruiter
    neo_seed_account(s, rec_id, warmth_score=15.0, is_recruiter=True,
                     kyc_income=800000, kyc_occupation="business_owner",
                     campaign_name=name, campaign_tier=campaign["tier"])
    neo_seed_warmth_timeline(s, rec_id, is_mule=False)

    mule_ids = []
    for i in range(count):
        mid = f"{prefix}{i:03d}"
        mule_ids.append(mid)
        is_dormant = (i == count - 1)

        neo_seed_account(
            s, mid,
            warmth_score=0.0,
            is_mule=True,
            kyc_income=random.randint(80000, 250000),
            kyc_occupation=random.choice(["student", "farmer", "homemaker"]),
            campaign_name=name,
            campaign_tier=campaign["tier"],
            recruiter_id=rec_id,
            dormant_days=120 if is_dormant else None,
        )
        neo_seed_txn(s, rec_id, mid,
                     txn_id=f"TXN-WARM-{name.upper()}-{i:03d}",
                     amount=random.randint(500, 3000),
                     hours_ago=random.randint(2, 46), channel="UPI")
        neo_seed_warmth_timeline(s, mid, is_mule=True)

    # Layering chain
    if count >= 4:
        for i in range(3):
            neo_seed_txn(s, mule_ids[i], mule_ids[i + 1],
                         txn_id=f"TXN-LAY-{name.upper()}-{i}",
                         amount=random.randint(5_000_000, 15_000_000),
                         hours_ago=random.randint(1, 5), channel="NEFT",
                         pattern_tag="LAYERING")

    # Structuring
    for j in range(5):
        neo_seed_txn(s, rec_id, mule_ids[1],
                     txn_id=f"TXN-STRUCT-{name.upper()}-{j}",
                     amount=random.randint(920_000, 990_000),
                     hours_ago=random.randint(1, 24), channel="NEFT",
                     pattern_tag="STRUCTURING")

    # Taint chain
    hop_ids = [f"DEMO-{name.upper()}-HOP{h}" for h in range(4, 0, -1)]
    for hi, hop_id in enumerate(hop_ids):
        neo_seed_account(s, hop_id, warmth_score=30.0 + hi * 5,
                         kyc_income=300000, kyc_occupation="salaried",
                         campaign_name=name)
        if hi < len(hop_ids) - 1:
            neo_seed_txn(s, hop_ids[hi], hop_ids[hi + 1],
                         txn_id=f"TXN-HOP-{name.upper()}-{hi}",
                         amount=random.randint(10_000_000, 50_000_000),
                         hours_ago=random.randint(3, 12), channel="RTGS")
    neo_seed_txn(s, hop_ids[-1], mule_ids[0],
                 txn_id=f"TXN-HOP-{name.upper()}-FINAL",
                 amount=random.randint(10_000_000, 50_000_000),
                 hours_ago=2, channel="RTGS")

    print(f"    [NEO4J] Seeded: recruiter + {count} mules + layering + structuring + taint")
    return mule_ids


def neo_wipe(s):
    print("  [NEO4J] Wiping existing DEMO nodes...")
    s.run("MATCH (a:Account) WHERE a.account_id STARTS WITH 'DEMO-' DETACH DELETE a")
    s.run("MATCH (w:WarmthEvent) WHERE w.account_id STARTS WITH 'DEMO-' DELETE w")
    print("  [NEO4J] Wiped")


def run_neo4j_seeder(wipe=False):
    from neo4j import GraphDatabase
    print(f"\n  [NEO4J] Connecting to: {NEO4J_URI}...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    driver.verify_connectivity()
    print("  [NEO4J] Connected!")

    with driver.session() as s:
        if wipe:
            neo_wipe(s)

        total_mules = 0
        for campaign in CAMPAIGNS:
            mule_ids = neo_seed_campaign(s, campaign)
            total_mules += len(mule_ids)

    print(f"  [NEO4J] COMPLETE: {len(CAMPAIGNS)} campaigns, {total_mules} mules seeded")
    driver.close()


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="PRISM Unified Demo Seeder")
    parser.add_argument("--wipe", action="store_true",
                        help="Delete existing demo data before seeding")
    parser.add_argument("--pg-only", action="store_true",
                        help="Seed only PostgreSQL")
    parser.add_argument("--neo4j-only", action="store_true",
                        help="Seed only Neo4j")
    args = parser.parse_args()

    print("=" * 60)
    print("ARGUS-PRISM Unified Demo Seeder")
    print(f"  Time:  {NOW.isoformat()}")
    print(f"  PG:    {PG_DSN[:50]}...")
    print(f"  Neo4j: {NEO4J_URI}")
    print("=" * 60)

    errors = []

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    if not args.neo4j_only:
        try:
            run_pg_seeder(wipe=args.wipe)
        except Exception as e:
            print(f"\n  [PG] ERROR: {e}")
            traceback.print_exc()
            errors.append(("PostgreSQL", str(e)))

    # ── Neo4j ─────────────────────────────────────────────────────────────────
    if not args.pg_only:
        try:
            run_neo4j_seeder(wipe=args.wipe)
        except Exception as e:
            print(f"\n  [NEO4J] ERROR: {e}")
            traceback.print_exc()
            errors.append(("Neo4j", str(e)))

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    if errors:
        print("SEEDER COMPLETED WITH ERRORS:")
        for db, err in errors:
            print(f"  FAILED: {db} — {err}")
        print("=" * 60)
        sys.exit(1)
    else:
        total_mules = sum(c["mule_count"] for c in CAMPAIGNS)
        print("DEMO SEED COMPLETE — ALL DATABASES")
        print(f"  Campaigns   : {len(CAMPAIGNS)}")
        print(f"  Total mules : {total_mules}")
        print(f"  Recruiters  : {len(CAMPAIGNS)}")
        print("=" * 60)
        sys.exit(0)


if __name__ == "__main__":
    main()
