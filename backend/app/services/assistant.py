"""PRISM Assistant — on-prem, scoped, grounded (PRD §5.11).

Facts are fetched live from the same data the API serves (never guessed), so the bot
can't claim more than the DB says or more than the user's role may see. It is hard-
scoped to PRISM matters and refuses everything else in character. When Ollama is
offline it degrades gracefully — the widget says so, and still reports live figures.
"""

from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import CurrentUser
from app.auth.rbac import Permission
from app.core.config import get_settings
from app.models.account import Account
from app.models.alert import Alert

log = logging.getLogger("prism.assistant")

_ON_TOPIC = {
    "alert", "alerts", "account", "accounts", "mule", "warmth", "score", "case",
    "cases", "recruiter", "freeze", "frozen", "str", "autostr", "taint", "graph",
    "transaction", "risk", "compliance", "audit", "kyc", "severity", "critical",
    "imminent", "network", "campaign", "sla", "prism", "watched", "pulse",
}

_SUGGESTIONS = {
    "alerts": [
        "How many alerts need attention right now?",
        "Which alert is closest to its SLA deadline?",
        "Summarise the most critical alert.",
    ],
    "account": [
        "Summarise this account's risk.",
        "Why did this account's WarmthScore rise?",
        "Is this account linked to a known recruiter?",
    ],
    "graph": [
        "Who is the recruiter in this network?",
        "How many accounts are tainted?",
        "Show the round-trip pattern here.",
    ],
    "default": [
        "How many open alerts are there?",
        "How many accounts are being watched?",
        "What is the highest-risk account?",
    ],
}


def suggestions(screen: str | None) -> list[str]:
    return _SUGGESTIONS.get((screen or "").lower(), _SUGGESTIONS["default"])


def is_on_topic(message: str) -> bool:
    words = {w.strip(".,?!").lower() for w in message.split()}
    return bool(words & _ON_TOPIC)


def live_facts(db: DbSession, user: CurrentUser, screen_context: dict | None) -> dict:
    """Fetch real, role-appropriate figures the assistant may cite."""
    facts: dict = {}
    if user.can(Permission.VIEW_ALERTS):
        facts["open_alerts"] = int(
            db.execute(
                select(func.count(Alert.id)).where(Alert.status.notin_(["RESOLVED", "FALSE_POSITIVE"]))
            ).scalar()
            or 0
        )
    if user.can(Permission.VIEW_ACCOUNTS):
        facts["accounts_watched"] = int(
            db.execute(
                select(func.count(Account.id)).where(Account.severity != "CLEAN")
            ).scalar()
            or 0
        )
        top = db.execute(
            select(Account).order_by(Account.warmth_score.desc()).limit(1)
        ).scalar_one_or_none()
        if top is not None:
            from app.services.pipeline import mask_ref

            facts["highest_risk"] = {
                "account_ref": mask_ref(top.id),
                "warmth_score": round(top.warmth_score, 1),
                "severity": top.severity,
            }
    # Screen-aware: if focused on an account the user may see, add its summary.
    account_id = (screen_context or {}).get("account_id")
    if account_id and user.can(Permission.VIEW_ACCOUNTS):
        acct = db.get(Account, account_id)
        if acct is not None:
            from app.services.pipeline import mask_ref

            facts["focused_account"] = {
                "account_ref": mask_ref(acct.id),
                "warmth_score": round(acct.warmth_score, 1),
                "severity": acct.severity,
                "status": acct.status,
                "tainted": acct.tainted,
                "top_signals": (acct.shap or [])[:2],
            }
    return facts


def _grounded_reply(message: str, facts: dict) -> str:
    """A deterministic, live-grounded answer for the common intents — used as the
    Ollama-offline fallback so figures are still real, never invented."""
    m = message.lower()
    if "open alert" in m or ("how many" in m and "alert" in m):
        return f"There are {facts.get('open_alerts', 0)} open alerts requiring attention."
    if "watched" in m or ("how many" in m and "account" in m):
        return f"{facts.get('accounts_watched', 0)} accounts are currently being watched."
    if "highest" in m or "top" in m:
        hr = facts.get("highest_risk")
        if hr:
            return (
                f"The highest-risk account is {hr['account_ref']} at WarmthScore "
                f"{hr['warmth_score']} ({hr['severity']})."
            )
    if facts.get("focused_account"):
        fa = facts["focused_account"]
        return (
            f"Account {fa['account_ref']} has WarmthScore {fa['warmth_score']} "
            f"({fa['severity']}), status {fa['status']}"
            + (", and is in a tainted network." if fa["tainted"] else ".")
        )
    return "I can summarise alerts, accounts, and networks from live data — ask me about those."


def ollama_available() -> bool:
    settings = get_settings()
    if not settings.assistant_enabled:
        return False
    try:
        import httpx

        resp = httpx.get(
            f"{settings.ollama_url}/api/tags", headers=settings.ollama_headers, timeout=3.0
        )
        return resp.status_code == 200
    except Exception:  # noqa: BLE001
        return False
