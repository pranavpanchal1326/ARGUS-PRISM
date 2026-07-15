"""Demo seeding — populates the Docket (cases) and the Bound Register (audit
chain) so those sheets show real, chain-valid data. Dev/demo only.

Run: .venv/Scripts/python.exe seed_demo.py
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.db.session import SessionLocal, get_engine, init_db
from app.models.account import Account
from app.models.alert import Alert
from app.models.audit import Case, CaseActivity, CaseNote
from app.services import audit

MLRO = "mlro@unionbank.co.in"
ANALYST = "analyst@unionbank.co.in"


def main() -> None:
    init_db()
    if SessionLocal.kw.get("bind") is None:
        SessionLocal.configure(bind=get_engine())
    db = SessionLocal()
    try:
        # ── Cases ────────────────────────────────────────────────────────
        existing = db.execute(select(Case)).scalars().all()
        if existing:
            print(f"cases already present ({len(existing)}); skipping case seed")
        else:
            alerts = db.execute(select(Alert).limit(12)).scalars().all()
            accounts = db.execute(select(Account).limit(12)).scalars().all()
            acc_ids = [a.id for a in accounts]
            alert_ids = [a.id for a in alerts]

            specs = [
                ("Round-trip ring · Andheri cluster", "PENDING_MLRO", ANALYST,
                 ["OPEN", "UNDER_REVIEW", "PENDING_MLRO"],
                 ["Fourteen accounts cycling ₹9,400 avg within a 14-minute window.",
                  "Device churn on three holders inside 48h. Escalating for MLRO seal."]),
                ("Salary-mule fan-out · Recruiter UBI-…-0055", "UNDER_REVIEW", ANALYST,
                 ["OPEN", "UNDER_REVIEW"],
                 ["Test payments of ₹1 preceding bulk inflow. Classic recruiter signature."]),
                ("Dormant-then-hot · single holder", "OPEN", ANALYST,
                 ["OPEN"],
                 ["Account dormant 11 months, then 6.8x retail-profile inflow overnight."]),
                ("Structuring below CTR threshold", "CLOSED_CONFIRMED_MULE", MLRO,
                 ["OPEN", "UNDER_REVIEW", "PENDING_MLRO", "CLOSED_CONFIRMED_MULE"],
                 ["Deposits consistently ₹49,000 to stay under the ₹50,000 CTR line.",
                  "Confirmed mule. STR filed, account frozen. Sealed."]),
                ("False positive · festival remittance", "CLOSED_FALSE_POSITIVE", MLRO,
                 ["OPEN", "UNDER_REVIEW", "CLOSED_FALSE_POSITIVE"],
                 ["Spike explained by verified wedding remittances from 4 relatives.",
                  "Returned — no mule behaviour. Basis recorded."]),
            ]

            base = datetime.now(UTC) - timedelta(days=6)
            for i, (title, status, owner, trail, notes) in enumerate(specs):
                created = base + timedelta(days=i, hours=i)
                case = Case(
                    title=title, status=status,
                    account_ids=acc_ids[i:i + 2],
                    alert_ids=alert_ids[i:i + 3],
                    evidence=[{"type": "graph_export", "name": f"plate-{i+1}.svg"}] if i % 2 == 0 else [],
                    created_by=owner, created_at=created, updated_at=created,
                )
                db.add(case)
                db.flush()
                # notes
                for j, body in enumerate(notes):
                    db.add(CaseNote(case_id=case.id, author=owner,
                                    body=body, created_at=created + timedelta(hours=j + 1)))
                # lifecycle activity
                prev = None
                for k, st in enumerate(trail):
                    db.add(CaseActivity(case_id=case.id, actor=owner if k < len(trail) - 1 else (MLRO if "CLOSED" in st else owner),
                                        action="transition", from_status=prev, to_status=st,
                                        at=created + timedelta(hours=k)))
                    prev = st
                # audit trail for the case (chain-valid via the real recorder)
                audit.record(db, actor=owner, action="case.opened", target=case.id,
                             detail={"title": title})
                if status.startswith("CLOSED"):
                    audit.record(db, actor=MLRO, action="case.sealed", target=case.id,
                                 detail={"status": status})
            print(f"seeded {len(specs)} cases")

        # ── Audit register: add representative operator activity ─────────
        n_audit = len(db.execute(select(audit.AuditEntry)).scalars().all())
        if n_audit < 8:
            for actor, action, target, detail in [
                (ANALYST, "auth.login", ANALYST, {"ip": "10.4.1.22"}),
                (ANALYST, "alert.acknowledged", "AL-2214", {}),
                (ANALYST, "alert.escalated", "AL-2231", {"to": "MLRO"}),
                (MLRO, "auth.login", MLRO, {"ip": "10.4.1.9"}),
                (MLRO, "account.frozen", "UBI-2026-000041", {"reason": "confirmed_mule"}),
                (MLRO, "package.sealed", "STR-000012", {"fingerprint": "A3F8·90D1"}),
                (MLRO, "ledger.verified", "audit", {"entries": "n"}),
            ]:
                audit.record(db, actor=actor, action=action, target=target, detail=detail)
            print("seeded audit register activity")

        db.commit()

        # verify the chain we just wrote
        result = audit.verify_chain(db)
        print("chain verify:", result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
