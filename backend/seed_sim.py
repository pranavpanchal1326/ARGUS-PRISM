"""One-shot simulator seeding — populates accounts/alerts/transactions.

Additive: runs the same pipeline as the live faucet but synchronously, so the
dashboards have data on login without touching the seeded cases/audit chain.

Idempotent by default: if accounts already exist it skips, so re-running the
launcher never stacks duplicate data. Pass --force to append another scenario.

    python seed_sim.py                 # recruiter_fanout (+ auto baseline)
    python seed_sim.py legit_baseline  # calm background only
    python seed_sim.py --force         # append even if data already present
"""

from __future__ import annotations

import sys

from sqlalchemy import func, select

from app.db.session import SessionLocal, init_db
from app.models.account import Account
from app.simulator.engine import simulator


def main() -> None:
    init_db()  # bind the SQLAlchemy engine (normally done on app startup)
    args = [a for a in sys.argv[1:] if a != "--force"]
    force = "--force" in sys.argv
    scenario = args[0] if args else "recruiter_fanout"
    available = simulator.available_scenarios()
    if scenario not in available:
        print(f"unknown scenario '{scenario}'. available: {available}")
        raise SystemExit(1)

    with SessionLocal() as db:
        existing = db.execute(select(func.count(Account.id))).scalar() or 0
    if existing and not force:
        print(f"accounts already present ({existing}); skipping simulator seed. "
              f"Use --force to append another scenario.")
        return

    simulator.load(scenario)
    emitted = simulator.run_to_completion()
    st = simulator.status()
    print(f"scenario   : {scenario} (seed={st['seed']})")
    print(f"emitted    : {emitted} plan items into Postgres")
    print("done — accounts / transactions / alerts populated.")


if __name__ == "__main__":
    main()
