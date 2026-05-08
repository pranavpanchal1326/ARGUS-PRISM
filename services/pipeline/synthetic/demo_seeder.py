"""
ARGUS-PRISM — Demo Campaign Seeder — Day 8
==========================================
Seeds 3 named demo campaigns directly into Neo4j for the prototype showcase.

Campaign tiers (from WORKFLOW_ADITYA.md Day 8):
  SMALL   — UBI-DEMO-SMALL    — 7  warming accounts  (CAMPAIGN_COORDINATOR)
  MEDIUM  — UBI-DEMO-MEDIUM   — 15 warming accounts  (INDUSTRIAL_ORCHESTRATOR)
  PLATFORM— UBI-DEMO-PLATFORM — 28 warming accounts  (PLATFORM_SCALE)

Each campaign includes:
  - Recruiter account
  - N warming/mule accounts with warmth signal history (72hr)
  - Layering chain (FlowGraph D1)
  - Structuring transactions (FlowGraph D3)
  - Dormant mule (FlowGraph D4)
  - Taint back-trace chain (4 hops from confirmed mule)

Run:
    python demo_seeder.py
    python demo_seeder.py --wipe   # Clear existing demo data first
"""

import sys
import os
import argparse
import hashlib
import random
import uuid
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'services', 'pipeline'))
try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "prism_password")

from neo4j import GraphDatabase

random.seed(2026)

NOW = datetime.now(timezone.utc)

# ── Campaign specs ─────────────────────────────────────────────────────────────

CAMPAIGNS = [
    {
        "name":           "small",
        "label":          "Campaign Coordinator",
        "recruiter_id":   "UBI-DEMO-SMALL-REC",
        "mule_prefix":    "UBI-DEMO-SMALL-M",
        "mule_count":     7,
        "tier":           "CAMPAIGN_COORDINATOR",
        "risk_narrative": "Small coordinated mule ring. 7 accounts, ₹12L total flow.",
    },
    {
        "name":           "medium",
        "label":          "Industrial Orchestrator",
        "recruiter_id":   "UBI-DEMO-MED-REC",
        "mule_prefix":    "UBI-DEMO-MED-M",
        "mule_count":     15,
        "tier":           "INDUSTRIAL_ORCHESTRATOR",
        "risk_narrative": "Industrial-scale orchestrator. 15 accounts, ₹47L total flow.",
    },
    {
        "name":           "platform",
        "label":          "Platform Scale",
        "recruiter_id":   "UBI-DEMO-PLAT-REC",
        "mule_prefix":    "UBI-DEMO-PLAT-M",
        "mule_count":     28,
        "tier":           "PLATFORM_SCALE",
        "risk_narrative": "Platform-scale operation. 28 accounts, ₹2.3Cr total flow.",
    },
]


def sha(v: str) -> str:
    return hashlib.sha256(v.encode()).hexdigest()[:16]


def dt_ago(**kw) -> str:
    """Return neo4j datetime string for N hours/days ago."""
    return (NOW - timedelta(**kw)).strftime("datetime('%Y-%m-%dT%H:%M:%S+00:00')")


def seed_account(s, account_id, warmth_score=0.0, taint_score=0.0,
                 status="ACTIVE", is_mule=False, is_recruiter=False,
                 kyc_income=200000, kyc_occupation="farmer",
                 dormant_days=None, warmth_signal_history=None, **extra):
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
    # last_active: dormant mules were inactive for 90+ days
    if dormant_days:
        s.run(
            "MERGE (a:Account {account_id: $id}) SET a += $p, "
            "a.last_active = datetime() - duration($ago)",
            id=account_id, p=props, ago=f"P{dormant_days}D"
        )
    else:
        s.run("MERGE (a:Account {account_id: $id}) SET a += $p",
              id=account_id, p=props)


def seed_txn(s, src, dst, txn_id, amount, hours_ago=2, channel="UPI",
             pattern_tag=None):
    extra = {}
    if pattern_tag:
        extra["pattern_tag"] = pattern_tag
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


# ── 72-hour WarmthScore signal timeline ───────────────────────────────────────

def build_warmth_timeline(account_id: str, is_mule: bool) -> list[dict]:
    """
    Build a 72-point hourly warmth timeline for the account.
    Mule accounts show the characteristic 'hockey stick' curve.
    """
    timeline = []
    score = 0.0
    for hour in range(72):
        if is_mule:
            # Sigmoid-like growth accelerating after hour 36
            if hour < 12:
                delta = random.uniform(0.2, 0.8)
            elif hour < 36:
                delta = random.uniform(1.0, 2.5)
            else:
                delta = random.uniform(3.0, 6.0)
            # Signal spikes
            if hour == 6:    delta += 8.0   # SIM swap detected
            if hour == 12:   delta += 5.0   # Device change
            if hour == 24:   delta += 12.0  # Illicit credit arrives
            if hour == 48:   delta += 10.0  # Layering detected
            if hour == 60:   delta += 8.0   # KYC re-verification triggered
        else:
            delta = random.uniform(-0.5, 1.2)

        score = max(0.0, min(100.0, score + delta))

        if score >= 85:
            risk_level = "CRITICAL"
        elif score >= 75:
            risk_level = "HIGH"
        elif score >= 60:
            risk_level = "MEDIUM"
        elif score >= 30:
            risk_level = "MONITORING"
        else:
            risk_level = "CLEAN"

        # Signal attribution per hour
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
            "account_id":    account_id,
            "hour":          hour,
            "warmth_score":  round(score, 2),
            "risk_level":    risk_level,
            "primary_signal": primary_signal,
            "computed_at":   (NOW - timedelta(hours=72 - hour)).isoformat(),
        })
    return timeline


def seed_warmth_timeline(s, account_id: str, is_mule: bool):
    """Write WarmthScore timeline events as Neo4j WarmthEvent nodes."""
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

    # Write final warmth_score back to Account node
    final_score = timeline[-1]["warmth_score"]
    s.run("MATCH (a:Account {account_id: $id}) SET a.warmth_score = $score",
          id=account_id, score=final_score)
    return timeline


# ── Campaign builder ───────────────────────────────────────────────────────────

def seed_campaign(s, campaign: dict):
    name = campaign["name"]
    rec_id = campaign["recruiter_id"]
    prefix = campaign["mule_prefix"]
    count = campaign["mule_count"]
    print(f"  [{campaign['tier']}] Seeding '{name}' campaign ({count} mules)...")

    # Recruiter account
    seed_account(s, rec_id, warmth_score=15.0, is_recruiter=True,
                 kyc_income=800000, kyc_occupation="business_owner",
                 campaign_name=name, campaign_tier=campaign["tier"])
    seed_warmth_timeline(s, rec_id, is_mule=False)

    mule_ids = []
    for i in range(count):
        mid = f"{prefix}{i:03d}"
        mule_ids.append(mid)
        is_dormant = (i == count - 1)   # Last mule is dormant reactivation

        seed_account(
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
        # Warming transactions from recruiter → mule (within 48hr)
        seed_txn(s, rec_id, mid,
                 txn_id=f"TXN-WARM-{name.upper()}-{i:03d}",
                 amount=random.randint(500, 3000),
                 hours_ago=random.randint(2, 46), channel="UPI")

        # Build 72hr warmth timeline
        seed_warmth_timeline(s, mid, is_mule=True)

    # ── Layering chain (D1): first 4 mules ────────────────────────────────────
    if count >= 4:
        for i in range(3):
            seed_txn(s, mule_ids[i], mule_ids[i + 1],
                     txn_id=f"TXN-LAY-{name.upper()}-{i}",
                     amount=random.randint(5_000_000, 15_000_000),
                     hours_ago=random.randint(1, 5), channel="NEFT",
                     pattern_tag="LAYERING")

    # ── Structuring (D3): mule[1] receives 5 sub-10L credits ──────────────────
    for j in range(5):
        seed_txn(s, rec_id, mule_ids[1],
                 txn_id=f"TXN-STRUCT-{name.upper()}-{j}",
                 amount=random.randint(920_000, 990_000),
                 hours_ago=random.randint(1, 24), channel="NEFT",
                 pattern_tag="STRUCTURING")

    # ── Taint chain: HOP4 → HOP3 → HOP2 → HOP1 → mule[0] ────────────────────
    hop_ids = [f"DEMO-{name.upper()}-HOP{h}" for h in range(4, 0, -1)]
    for hi, hop_id in enumerate(hop_ids):
        seed_account(s, hop_id, warmth_score=30.0 + hi * 5,
                     kyc_income=300000, kyc_occupation="salaried",
                     campaign_name=name)
        if hi < len(hop_ids) - 1:
            seed_txn(s, hop_ids[hi], hop_ids[hi + 1],
                     txn_id=f"TXN-HOP-{name.upper()}-{hi}",
                     amount=random.randint(10_000_000, 50_000_000),
                     hours_ago=random.randint(3, 12), channel="RTGS")
    # Connect last hop → mule
    seed_txn(s, hop_ids[-1], mule_ids[0],
             txn_id=f"TXN-HOP-{name.upper()}-FINAL",
             amount=random.randint(10_000_000, 50_000_000),
             hours_ago=2, channel="RTGS")

    print(f"    ✓ Seeded: recruiter + {count} mules + layering + structuring + taint chain")
    return mule_ids


# ── Wipe ───────────────────────────────────────────────────────────────────────

def wipe_demo_data(s):
    print("  Wiping existing DEMO nodes...")
    s.run("MATCH (a:Account) WHERE a.account_id STARTS WITH 'UBI-DEMO-' DETACH DELETE a")
    s.run("MATCH (a:Account) WHERE a.account_id STARTS WITH 'DEMO-' DETACH DELETE a")
    s.run("MATCH (w:WarmthEvent) WHERE w.account_id STARTS WITH 'UBI-DEMO-' DELETE w")
    print("  ✓ Wiped")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PRISM Demo Seeder")
    parser.add_argument("--wipe", action="store_true",
                        help="Delete existing demo data before seeding")
    args = parser.parse_args()

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    driver.verify_connectivity()

    print("=" * 60)
    print("ARGUS-PRISM Demo Campaign Seeder — Day 8")
    print("=" * 60)

    with driver.session() as s:
        if args.wipe:
            wipe_demo_data(s)

        total_mules = 0
        for campaign in CAMPAIGNS:
            mule_ids = seed_campaign(s, campaign)
            total_mules += len(mule_ids)

    print()
    print("=" * 60)
    print("DEMO SEED COMPLETE")
    print(f"  Campaigns seeded : {len(CAMPAIGNS)}")
    print(f"  Total mules      : {total_mules}")
    print(f"  Total recruiters : {len(CAMPAIGNS)}")
    print(f"  Neo4j URI        : {NEO4J_URI}")
    print("=" * 60)

    driver.close()


if __name__ == "__main__":
    main()
