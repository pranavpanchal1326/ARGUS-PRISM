"""The pipeline proves Law 2: simulated transactions produce real, differentiated
scores and a real alert cascade — nothing hardcoded.
"""

from __future__ import annotations

from sqlalchemy import select

from app.core.domain import Severity
from app.db.session import SessionLocal
from app.models.account import Account
from app.models.alert import Alert, Event
from app.simulator.engine import simulator


def test_scores_differentiate_and_alerts_cascade() -> None:
    simulator.reset()
    simulator.load("recruiter_fanout", seed=4242)
    emitted = simulator.run_to_completion()
    assert emitted > 0

    with SessionLocal() as db:
        accounts = db.execute(select(Account)).scalars().all()
        legit = [a for a in accounts if not a.is_ground_truth_mule]
        mules = [a for a in accounts if a.is_ground_truth_mule]
        assert legit and mules

        avg_legit = sum(a.warmth_score for a in legit) / len(legit)
        avg_mule = sum(a.warmth_score for a in mules) / len(mules)
        # The whole point: mules score dramatically higher than ordinary customers.
        assert avg_mule > avg_legit + 25, f"legit={avg_legit:.1f} mule={avg_mule:.1f}"

        # WarmthScore alone drives clear mules into HOT (partial-freeze territory).
        # CRITICAL/IMMINENT emerge once the taint/graph engine adds network agreement.
        assert any(
            a.severity in {Severity.HOT.value, Severity.CRITICAL.value, Severity.IMMINENT.value}
            for a in mules
        )
        # Most legit accounts stay CLEAN.
        clean_legit = [a for a in legit if a.severity == Severity.CLEAN.value]
        assert len(clean_legit) >= len(legit) * 0.7

        # Alerts were raised and events streamed — the cascade fired.
        alerts = db.execute(select(Alert)).scalars().all()
        assert len(alerts) >= 1
        assert all(a.account_ref.count("*") >= 2 for a in alerts)  # masked refs (Law 3)
        events = db.execute(select(Event)).scalars().all()
        assert any(e.type == "alert.raised" for e in events)
        assert any(e.type == "transaction.posted" for e in events)
