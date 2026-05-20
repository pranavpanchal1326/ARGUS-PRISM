#!/usr/bin/env python3
"""
ARGUS-PRISM — Daily Cleanup Script
====================================
Purges stale simulation data older than 24 hours while preserving
accounts and their current risk scores.

Deletes from:
  - warmth_scores   (historical scoring events)
  - alerts          (old alerts)
  - cases + autostr_packages  (closed/old cases with cascading packages)
  - device_events   (old device activity)
  - audit_log       (old audit entries)

Keeps:
  - accounts        (all accounts preserved with current scores)
  - DEMO-* seeded accounts (permanent fixture data)

Usage:
    python scripts/cleanup.py              # 24-hour default
    python scripts/cleanup.py --hours 12   # custom retention
    python scripts/cleanup.py --dry-run    # show what would be deleted
"""

import os
import sys
import time
import logging
import argparse
from datetime import datetime, timedelta, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger("prism.cleanup")


def get_pg_dsn() -> str:
    """Build a psycopg2-compatible DSN from DATABASE_URL."""
    dsn = os.environ.get("DATABASE_URL", "")
    if not dsn:
        dsn = os.environ.get(
            "POSTGRES_DSN",
            "postgresql://prism_user:prism_password@localhost:5432/prism_db"
        )
    # Strip asyncpg driver prefix
    dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")
    return dsn


def run_cleanup(hours: int = 24, dry_run: bool = False):
    """Execute cleanup against PostgreSQL."""
    import psycopg2

    dsn = get_pg_dsn()
    log.info("Connecting to PostgreSQL...")
    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    cur = conn.cursor()

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    log.info("Cutoff time: %s (%d hours ago)", cutoff.isoformat(), hours)
    log.info("Dry run: %s", dry_run)

    # ── Measure DB size before ────────────────────────────────────────────
    cur.execute("SELECT pg_database_size(current_database())")
    db_size_before = cur.fetchone()[0]

    # ── Count rows in each table ──────────────────────────────────────────
    tables_info = {}
    for table in ["accounts", "warmth_scores", "alerts", "cases",
                  "autostr_packages", "device_events", "audit_log"]:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            tables_info[table] = cur.fetchone()[0]
        except Exception:
            conn.rollback()
            tables_info[table] = "N/A"

    log.info("── Table row counts BEFORE cleanup ──")
    for t, c in tables_info.items():
        log.info("  %-20s %s rows", t, c)

    # ── Delete stale data ─────────────────────────────────────────────────
    deleted = {}

    # 1. autostr_packages (FK to cases — delete first)
    cur.execute("""
        SELECT COUNT(*) FROM autostr_packages ap
        JOIN cases c ON ap.case_id = c.case_id
        WHERE c.opened_at < %s
    """, (cutoff,))
    deleted["autostr_packages"] = cur.fetchone()[0]
    if not dry_run:
        cur.execute("""
            DELETE FROM autostr_packages
            WHERE case_id IN (
                SELECT case_id FROM cases WHERE opened_at < %s
            )
        """, (cutoff,))

    # 2. alerts (FK to warmth_scores, accounts)
    cur.execute("SELECT COUNT(*) FROM alerts WHERE created_at < %s", (cutoff,))
    deleted["alerts"] = cur.fetchone()[0]
    if not dry_run:
        cur.execute("DELETE FROM alerts WHERE created_at < %s", (cutoff,))

    # 3. cases (FK to accounts)
    cur.execute("SELECT COUNT(*) FROM cases WHERE opened_at < %s", (cutoff,))
    deleted["cases"] = cur.fetchone()[0]
    if not dry_run:
        cur.execute("DELETE FROM cases WHERE opened_at < %s", (cutoff,))

    # 4. warmth_scores (FK to accounts)
    cur.execute("SELECT COUNT(*) FROM warmth_scores WHERE computed_at < %s", (cutoff,))
    deleted["warmth_scores"] = cur.fetchone()[0]
    if not dry_run:
        cur.execute("DELETE FROM warmth_scores WHERE computed_at < %s", (cutoff,))

    # 5. device_events (FK to accounts)
    cur.execute("SELECT COUNT(*) FROM device_events WHERE recorded_at < %s", (cutoff,))
    deleted["device_events"] = cur.fetchone()[0]
    if not dry_run:
        cur.execute("DELETE FROM device_events WHERE recorded_at < %s", (cutoff,))

    # 6. audit_log (no FK, standalone)
    cur.execute("SELECT COUNT(*) FROM audit_log WHERE timestamp < %s", (cutoff,))
    deleted["audit_log"] = cur.fetchone()[0]
    if not dry_run:
        cur.execute("DELETE FROM audit_log WHERE timestamp < %s", (cutoff,))

    # 7. Delete LIVE-* accounts older than 24h (simulator ephemeral data)
    #    Keep DEMO-* accounts (permanent seed data)
    cur.execute("""
        SELECT COUNT(*) FROM accounts
        WHERE account_id LIKE 'LIVE-%%'
        AND created_at < %s
    """, (cutoff,))
    deleted["accounts_live"] = cur.fetchone()[0]
    if not dry_run:
        # Must delete child records first
        cur.execute("""
            DELETE FROM warmth_scores WHERE account_id IN (
                SELECT account_id FROM accounts
                WHERE account_id LIKE 'LIVE-%%' AND created_at < %s
            )
        """, (cutoff,))
        cur.execute("""
            DELETE FROM alerts WHERE account_id IN (
                SELECT account_id FROM accounts
                WHERE account_id LIKE 'LIVE-%%' AND created_at < %s
            )
        """, (cutoff,))
        cur.execute("""
            DELETE FROM device_events WHERE account_id IN (
                SELECT account_id FROM accounts
                WHERE account_id LIKE 'LIVE-%%' AND created_at < %s
            )
        """, (cutoff,))
        cur.execute("""
            DELETE FROM cases WHERE account_id IN (
                SELECT account_id FROM accounts
                WHERE account_id LIKE 'LIVE-%%' AND created_at < %s
            )
        """, (cutoff,))
        cur.execute("""
            DELETE FROM accounts
            WHERE account_id LIKE 'LIVE-%%'
            AND created_at < %s
        """, (cutoff,))

    # ── Commit ────────────────────────────────────────────────────────────
    if not dry_run:
        conn.commit()
        log.info("Changes committed.")
    else:
        conn.rollback()
        log.info("DRY RUN — no changes committed.")

    # ── Measure DB size after ─────────────────────────────────────────────
    cur.execute("SELECT pg_database_size(current_database())")
    db_size_after = cur.fetchone()[0]

    # ── Summary ───────────────────────────────────────────────────────────
    total_deleted = sum(v for v in deleted.values() if isinstance(v, int))
    prefix = "[DRY RUN] " if dry_run else ""

    log.info("")
    log.info("═" * 60)
    log.info("%sCLEANUP SUMMARY", prefix)
    log.info("═" * 60)
    log.info("  Cutoff           : %s", cutoff.isoformat())
    log.info("  DB size before   : %.2f MB", db_size_before / 1024 / 1024)
    log.info("  DB size after    : %.2f MB", db_size_after / 1024 / 1024)
    log.info("  Space freed      : %.2f MB", (db_size_before - db_size_after) / 1024 / 1024)
    log.info("  ─────────────────────────────────")
    for table, count in deleted.items():
        log.info("  %-20s %d rows %sdeleted", table, count, prefix)
    log.info("  ─────────────────────────────────")
    log.info("  TOTAL            : %d rows %sdeleted", total_deleted, prefix)
    log.info("═" * 60)

    cur.close()
    conn.close()
    log.info("Cleanup complete. Exiting.")


# ── Neo4j cleanup ────────────────────────────────────────────────────────────

def run_neo4j_cleanup(hours: int = 24, dry_run: bool = False):
    """Delete old LIVE-* nodes from Neo4j."""
    try:
        from neo4j import GraphDatabase

        uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
        user = os.environ.get("NEO4J_USER", "neo4j")
        password = os.environ.get("NEO4J_PASSWORD", "")

        driver = GraphDatabase.driver(uri, auth=(user, password))

        with driver.session() as session:
            # Count nodes to delete
            result = session.run("""
                MATCH (a:Account)
                WHERE a.account_id STARTS WITH 'LIVE-'
                AND a.created_at < datetime() - duration({hours: $hours})
                RETURN count(a) AS cnt
            """, hours=hours)
            count = result.single()["cnt"]
            log.info("Neo4j: %d LIVE-* account nodes older than %dh", count, hours)

            if not dry_run and count > 0:
                session.run("""
                    MATCH (a:Account)
                    WHERE a.account_id STARTS WITH 'LIVE-'
                    AND a.created_at < datetime() - duration({hours: $hours})
                    DETACH DELETE a
                """, hours=hours)
                log.info("Neo4j: Deleted %d old LIVE-* nodes", count)

        driver.close()
    except Exception as e:
        log.warning("Neo4j cleanup skipped: %s", e)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PRISM daily cleanup")
    parser.add_argument("--hours", type=int, default=24,
                        help="Delete data older than N hours (default: 24)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview deletions without committing")
    args = parser.parse_args()

    log.info("ARGUS-PRISM Cleanup — retaining last %d hours", args.hours)

    # PostgreSQL cleanup
    run_cleanup(hours=args.hours, dry_run=args.dry_run)

    # Neo4j cleanup
    run_neo4j_cleanup(hours=args.hours, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
