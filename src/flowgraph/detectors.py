"""
ARGUS-PRISM FlowGraph Detectors
================================
All 5 PS3-mandated pattern detectors implemented as Cypher queries on Neo4j.
Each detector is a standalone class with a detect() method.

PS3 Coverage:
  Detector 1 — Layering          : "rapid layering through multiple accounts"
  Detector 2 — Round-Trip        : "circular transactions (round-tripping)"
  Detector 3 — Structuring       : "structuring below reporting thresholds"
  Detector 4 — Dormant Activation: "sudden activation of dormant accounts"
  Detector 5 — Profile Mismatch  : "mismatches between declared customer profiles"
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from neo4j import GraphDatabase

log = logging.getLogger("prism.flowgraph.detectors")


# ── Alert dataclass ────────────────────────────────────────────────────────────

@dataclass
class FlowAlert:
    detector: str
    account_ids: list
    severity: str          # LOW | MEDIUM | HIGH | CRITICAL
    description: str
    evidence: dict = field(default_factory=dict)
    detected_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ── Base Detector ──────────────────────────────────────────────────────────────

class BaseDetector:
    name: str = "base"
    description: str = ""
    severity: str = "HIGH"

    def __init__(self, driver):
        self.driver = driver

    def detect(self) -> list[FlowAlert]:
        raise NotImplementedError

    def _run(self, query: str, **params) -> list[dict]:
        with self.driver.session() as session:
            result = session.run(query, **params)
            return [dict(r) for r in result]


# ── Detector 1: Layering ───────────────────────────────────────────────────────

class LayeringDetector(BaseDetector):
    """
    PS3: "rapid layering through multiple accounts"
    Pattern: 3+ accounts in a chain, all transactions within 6-hour window.
    Signals industrial mule pipeline testing before large fund movement.
    """
    name = "LAYERING"
    description = "3+ accounts in transaction chain within 6-hour window"
    severity = "CRITICAL"

    QUERY = """
    MATCH path = (source:Account)-[:TRANSACTED*3..]->(sink:Account)
    WHERE ALL(r IN relationships(path) WHERE
        r.timestamp > datetime() - duration('PT6H'))
    AND size(nodes(path)) >= 4
    AND source <> sink
    RETURN
        source.account_id AS source_id,
        sink.account_id   AS sink_id,
        [n IN nodes(path) | n.account_id] AS chain,
        size(nodes(path)) - 1 AS hop_count,
        [r IN relationships(path) | r.amount] AS amounts
    LIMIT 100
    """

    def detect(self) -> list[FlowAlert]:
        rows = self._run(self.QUERY)
        alerts = []
        seen = set()
        for row in rows:
            key = tuple(sorted(row["chain"]))
            if key in seen:
                continue
            seen.add(key)
            alerts.append(FlowAlert(
                detector=self.name,
                account_ids=row["chain"],
                severity=self.severity,
                description=(
                    f"Layering chain: {row['hop_count']} hops, "
                    f"source={row['source_id']} → sink={row['sink_id']}"
                ),
                evidence={
                    "chain": row["chain"],
                    "hop_count": row["hop_count"],
                    "amounts_paise": row["amounts"],
                },
            ))
        if alerts:
            log.warning("[LAYERING] %d chains detected", len(alerts))
        return alerts

    @staticmethod
    def cypher_hint() -> str:
        """Returns the raw Cypher for documentation / manual inspection."""
        return LayeringDetector.QUERY


# ── Detector 2: Round-Trip ────────────────────────────────────────────────────

class RoundTripDetector(BaseDetector):
    """
    PS3: "circular transactions (round-tripping)"
    Pattern: Funds return to origin account through 2+ intermediaries within 72h.
    Directed cycle detection in transaction graph.
    """
    name = "ROUND_TRIP"
    description = "Funds return to origin through 2+ intermediaries within 72hr"
    severity = "CRITICAL"

    QUERY = """
    MATCH cycle = (a:Account)-[:TRANSACTED*3..8]->(a)
    WHERE ALL(r IN relationships(cycle) WHERE
        r.timestamp > datetime() - duration('PT72H'))
    RETURN
        a.account_id AS origin_id,
        length(cycle) AS hop_count,
        REDUCE(s=0, r IN relationships(cycle) | s + r.amount) AS total_flow_paise,
        [n IN nodes(cycle) | n.account_id] AS participants
    LIMIT 50
    """

    def detect(self) -> list[FlowAlert]:
        rows = self._run(self.QUERY)
        alerts = []
        seen = set()
        for row in rows:
            key = (row["origin_id"], row["hop_count"])
            if key in seen:
                continue
            seen.add(key)
            alerts.append(FlowAlert(
                detector=self.name,
                account_ids=list(set(row["participants"])),
                severity=self.severity,
                description=(
                    f"Round-trip cycle: origin={row['origin_id']}, "
                    f"{row['hop_count']} hops, "
                    f"total flow=₹{row['total_flow_paise'] / 100:,.0f}"
                ),
                evidence={
                    "origin_id": row["origin_id"],
                    "hop_count": row["hop_count"],
                    "total_flow_paise": row["total_flow_paise"],
                    "participants": row["participants"],
                },
            ))
        if alerts:
            log.warning("[ROUND_TRIP] %d cycles detected", len(alerts))
        return alerts


# ── Detector 3: Structuring ────────────────────────────────────────────────────

class StructuringDetector(BaseDetector):
    """
    PS3: "structuring below reporting thresholds"
    Pattern: Multiple transactions just below ₹10L in same day from connected accounts.
    ₹10L = 1,000,000 INR = 100,000,000 paise.
    """
    name = "STRUCTURING"
    description = "Multiple sub-₹10L transactions from same account in 24hr"
    severity = "HIGH"

    # Structuring threshold: ₹9L–₹9.99L (just below ₹10L reporting threshold)
    THRESHOLD_LOW_PAISE  = 90_000_000   # ₹9,00,000
    THRESHOLD_HIGH_PAISE = 99_999_900   # ₹9,99,999

    QUERY = """
    MATCH (a:Account)-[t:TRANSACTED]->()
    WHERE t.amount < $high AND t.amount > $low
        AND t.timestamp > datetime() - duration('PT24H')
    WITH a, count(t) AS txn_count, sum(t.amount) AS total_paise,
         collect(t.txn_id) AS txn_ids
    WHERE txn_count >= 3
    RETURN
        a.account_id    AS account_id,
        txn_count,
        total_paise,
        txn_ids,
        a.kyc_income    AS kyc_income,
        a.kyc_occupation AS kyc_occupation
    ORDER BY txn_count DESC
    LIMIT 100
    """

    def detect(self) -> list[FlowAlert]:
        rows = self._run(
            self.QUERY,
            high=self.THRESHOLD_HIGH_PAISE,
            low=self.THRESHOLD_LOW_PAISE,
        )
        alerts = []
        for row in rows:
            alerts.append(FlowAlert(
                detector=self.name,
                account_ids=[row["account_id"]],
                severity=self.severity,
                description=(
                    f"Structuring: {row['txn_count']} transactions "
                    f"totalling ₹{row['total_paise'] / 100:,.0f} in 24hr "
                    f"(occupation: {row.get('kyc_occupation', 'unknown')})"
                ),
                evidence={
                    "account_id": row["account_id"],
                    "txn_count": row["txn_count"],
                    "total_paise": row["total_paise"],
                    "txn_ids": row["txn_ids"],
                    "kyc_income": row.get("kyc_income"),
                },
            ))
        if alerts:
            log.warning("[STRUCTURING] %d accounts flagged", len(alerts))
        return alerts


# ── Detector 4: Dormant Activation ────────────────────────────────────────────

class DormantActivationDetector(BaseDetector):
    """
    PS3: "sudden activation of dormant accounts for high-value transfers"
    Pattern: Account with 90+ days of inactivity receives a credit.
    Combined with WarmthScore Signal 4 for strongest pre-crime indicator.
    """
    name = "DORMANT_ACTIVATION"
    description = "Account dormant 90+ days receives sudden credit"
    severity = "HIGH"

    QUERY = """
    MATCH (a:Account)
    WHERE a.last_active IS NOT NULL
      AND a.last_active < datetime() - duration('P90D')
    MATCH (a)<-[t:TRANSACTED]-()
    WHERE t.timestamp > datetime() - duration('PT48H')
      AND t.type = 'CREDIT'
    RETURN
        a.account_id        AS account_id,
        a.last_active       AS last_active,
        a.kyc_occupation    AS kyc_occupation,
        t.amount            AS amount_paise,
        t.timestamp         AS reactivation_ts,
        t.txn_id            AS txn_id,
        duration.inDays(a.last_active, datetime()).days AS dormant_days
    ORDER BY dormant_days DESC
    LIMIT 100
    """

    def detect(self) -> list[FlowAlert]:
        rows = self._run(self.QUERY)
        alerts = []
        for row in rows:
            dormant_days = row.get("dormant_days", 0)
            # Escalate severity if dormancy > 180 days
            sev = "CRITICAL" if dormant_days >= 180 else "HIGH"
            alerts.append(FlowAlert(
                detector=self.name,
                account_ids=[row["account_id"]],
                severity=sev,
                description=(
                    f"Dormant activation: account silent for "
                    f"{dormant_days}d, received "
                    f"₹{row['amount_paise'] / 100:,.0f}"
                ),
                evidence={
                    "account_id": row["account_id"],
                    "dormant_days": dormant_days,
                    "amount_paise": row["amount_paise"],
                    "txn_id": row["txn_id"],
                    "kyc_occupation": row.get("kyc_occupation"),
                },
            ))
        if alerts:
            log.warning("[DORMANT_ACTIVATION] %d accounts flagged", len(alerts))
        return alerts


# ── Detector 5: Profile Mismatch ──────────────────────────────────────────────

class ProfileMismatchDetector(BaseDetector):
    """
    PS3: "mismatches between declared customer profiles and actual fund movement"
    Pattern: Account's KYC-declared income/occupation is inconsistent with
    actual transaction volume or frequency.

    Examples:
      - Vegetable vendor receiving ₹50L in 48hr
      - Student account with 50+ transactions per month
    """
    name = "PROFILE_MISMATCH"
    description = "KYC declared profile inconsistent with actual transaction behaviour"
    severity = "HIGH"

    # Thresholds
    HIGH_VALUE_INCOME_THRESHOLD = 30_000_000    # ₹3,00,000 declared income
    HIGH_VALUE_TXN_THRESHOLD    = 50_000_000    # ₹5,00,000 avg transaction
    HIGH_FREQ_OCCUPATION_LIST   = ["student", "farmer", "homemaker", "retired"]
    HIGH_FREQ_TXN_COUNT         = 50            # 50+ transactions per month

    QUERY = """
    MATCH (a:Account)-[t:TRANSACTED]->()
    WHERE t.timestamp > datetime() - duration('P30D')
    WITH a, avg(t.amount) AS avg_txn_paise, count(t) AS txn_freq,
         sum(t.amount) AS total_paise
    WHERE (a.kyc_income IS NOT NULL
           AND a.kyc_income < $income_threshold
           AND avg_txn_paise > $high_avg_txn)
       OR (a.kyc_occupation IN $high_freq_occupations
           AND txn_freq > $high_freq_count)
    RETURN
        a.account_id        AS account_id,
        a.kyc_income        AS kyc_income,
        a.kyc_occupation    AS kyc_occupation,
        avg_txn_paise,
        txn_freq,
        total_paise,
        a.is_mule           AS is_mule
    ORDER BY avg_txn_paise DESC
    LIMIT 100
    """

    def detect(self) -> list[FlowAlert]:
        rows = self._run(
            self.QUERY,
            income_threshold=self.HIGH_VALUE_INCOME_THRESHOLD,
            high_avg_txn=self.HIGH_VALUE_TXN_THRESHOLD,
            high_freq_occupations=self.HIGH_FREQ_OCCUPATION_LIST,
            high_freq_count=self.HIGH_FREQ_TXN_COUNT,
        )
        alerts = []
        for row in rows:
            avg_inr = row["avg_txn_paise"] / 100
            income = row.get("kyc_income", 0) or 0
            reason = (
                f"avg txn ₹{avg_inr:,.0f} vs declared income ₹{income:,}"
                if avg_inr * 12 > income * 2
                else f"high frequency ({row['txn_freq']} txns) for {row.get('kyc_occupation')}"
            )
            alerts.append(FlowAlert(
                detector=self.name,
                account_ids=[row["account_id"]],
                severity=self.severity,
                description=(
                    f"Profile mismatch: {row.get('kyc_occupation', 'unknown')} — {reason}"
                ),
                evidence={
                    "account_id": row["account_id"],
                    "kyc_income": row.get("kyc_income"),
                    "kyc_occupation": row.get("kyc_occupation"),
                    "avg_txn_paise": row["avg_txn_paise"],
                    "txn_freq_30d": row["txn_freq"],
                    "total_paise_30d": row["total_paise"],
                },
            ))
        if alerts:
            log.warning("[PROFILE_MISMATCH] %d accounts flagged", len(alerts))
        return alerts


# ── Registry ───────────────────────────────────────────────────────────────────

ALL_DETECTORS = [
    LayeringDetector,
    RoundTripDetector,
    StructuringDetector,
    DormantActivationDetector,
    ProfileMismatchDetector,
]
