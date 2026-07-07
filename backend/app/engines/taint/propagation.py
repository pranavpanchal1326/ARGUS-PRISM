"""Taint propagation (proven V2 IP).

When a mule is confirmed (frozen), taint is written N hops deep into its transaction
network so the ring can't hide by going dormant. Taint decays with distance and is
added as a network contribution to each account's WarmthScore — pushing genuinely
connected accounts into CRITICAL/IMMINENT while leaving distant strangers untouched.
"""

from __future__ import annotations

import logging
from collections import deque

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.models.account import Account, Transaction
from app.services.event_bus import emit

log = logging.getLogger("prism.taint")

# Taint injected at the seed, and the per-hop decay multiplier.
_SEED_TAINT = 55.0
_DECAY = 0.62


def _neighbors(db: DbSession, account_id: str) -> set[str]:
    rows = db.execute(
        select(Transaction.src_account, Transaction.dst_account).where(
            (Transaction.src_account == account_id) | (Transaction.dst_account == account_id)
        )
    ).all()
    out: set[str] = set()
    for src, dst in rows:
        if src and src != account_id:
            out.add(src)
        if dst and dst != account_id:
            out.add(dst)
    return out


def propagate_taint(db: DbSession, seed_account_id: str, *, max_hops: int | None = None) -> int:
    """BFS taint from a confirmed mule up to ``max_hops``. Rescoring is left to the
    caller so a single commit covers the whole propagation. Returns #accounts tainted.
    """
    from app.services.pipeline import rescore_account  # local import avoids a cycle

    settings = get_settings()
    hops = max_hops if max_hops is not None else settings.taint_max_hops

    seed = db.get(Account, seed_account_id)
    if seed is None:
        return 0

    visited: set[str] = {seed_account_id}
    frontier: deque[tuple[str, int]] = deque([(seed_account_id, 0)])
    tainted_count = 0

    while frontier:
        node_id, depth = frontier.popleft()
        if depth >= hops:
            continue
        taint_value = round(_SEED_TAINT * (_DECAY ** depth), 2)
        for neighbor_id in _neighbors(db, node_id):
            if neighbor_id in visited:
                continue
            visited.add(neighbor_id)
            neighbor = db.get(Account, neighbor_id)
            if neighbor is None:
                continue
            # Taint is a high-water mark — never lower an existing stronger taint.
            if taint_value > neighbor.taint_score:
                neighbor.taint_score = taint_value
                neighbor.tainted = True
                tainted_count += 1
                rescore_account(db, neighbor)  # fold taint into the score + alert
            frontier.append((neighbor_id, depth + 1))

    if tainted_count:
        emit(
            db,
            "taint.propagated",
            {"seed": seed_account_id[-4:], "tainted": tainted_count, "hops": hops},
        )
        log.info("Taint from %s reached %d accounts (%d hops)", seed_account_id, tainted_count, hops)
    return tainted_count
