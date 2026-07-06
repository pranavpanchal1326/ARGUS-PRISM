"""Seeded scenario simulator — the live transaction faucet (PRD §5.2).

A first-class service, not a demo script. It loads a YAML campaign, expands it into a
deterministic plan, and streams the plan through the *real* pipeline one tick at a
time so the whole UI feels alive — while every score and alert it produces is genuine.

State machine:  idle → loaded → running ⇄ paused  (→ idle on reset)
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from collections import deque
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import yaml
from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.account import Account, Device
from app.services.pipeline import ingest_transaction
from app.simulator.scenarios import PlanItem, build_plan, known_scenarios

log = logging.getLogger("prism.simulator")
_CAMPAIGN_DIR = Path(__file__).parent / "campaigns"
_BATCH_PER_TICK = 6


class SimulatorEngine:
    def __init__(self) -> None:
        self.state = "idle"
        self.scenario: str | None = None
        self.seed: int | None = None
        self.emitted = 0
        self._plan: deque[PlanItem] = deque()
        self._rng = random.Random()
        self._task: asyncio.Task | None = None
        self._txn_times: deque[float] = deque(maxlen=200)

    # ── Introspection ────────────────────────────────────────────
    def available_scenarios(self) -> list[str]:
        return known_scenarios()

    def _load_params(self, scenario: str) -> dict[str, Any]:
        path = _CAMPAIGN_DIR / f"{scenario}.yaml"
        if path.exists():
            return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return {}

    @property
    def tx_per_sec(self) -> float:
        now = time.monotonic()
        recent = [t for t in self._txn_times if now - t < 1.0]
        return float(len(recent))

    def status(self) -> dict[str, Any]:
        return {
            "state": self.state,
            "scenario": self.scenario,
            "seed": self.seed,
            "emitted": self.emitted,
            "tx_per_sec": round(self.tx_per_sec, 1),
            "available_scenarios": self.available_scenarios(),
        }

    # ── Controls ─────────────────────────────────────────────────
    def load(self, scenario: str, seed: int | None = None) -> None:
        if scenario not in known_scenarios():
            raise KeyError(scenario)
        settings = get_settings()
        self.seed = seed if seed is not None else settings.sim_default_seed
        self._rng = random.Random(self.seed)
        self.scenario = scenario
        self.emitted = 0

        with SessionLocal() as db:
            start_index = (db.execute(select(func.count(Account.id))).scalar() or 0) + 1
            plan: list[PlanItem] = []
            # Seed a legit baseline once so campaigns have a population to hide in.
            if start_index == 1 and scenario != "legit_baseline":
                base_params = {**self._load_params("legit_baseline"), "name": "legit_baseline"}
                plan += build_plan("legit_baseline", self._rng, base_params, start_index)
                start_index += int(base_params.get("accounts", 40))
            plan += build_plan(scenario, self._rng, self._load_params(scenario), start_index)

        self._plan = deque(plan)
        self.state = "loaded"
        log.info("Loaded scenario '%s' (seed=%s, %d plan items)", scenario, self.seed, len(plan))

    def start(self) -> None:
        if self.state not in {"loaded", "paused"}:
            raise RuntimeError(f"cannot start from state '{self.state}'")
        self.state = "running"
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run())

    def pause(self) -> None:
        if self.state == "running":
            self.state = "paused"

    def reset(self) -> None:
        self.state = "idle"
        self._plan.clear()
        self.scenario = None
        self.emitted = 0
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = None

    # ── Tick loop ────────────────────────────────────────────────
    async def _run(self) -> None:
        settings = get_settings()
        tick = max(0.05, settings.sim_tick_ms / 1000)
        try:
            while self.state in {"running", "paused"}:
                if self.state == "paused":
                    await asyncio.sleep(tick)
                    continue
                if not self._plan:
                    self.state = "loaded"  # plan exhausted; ready to reload/replay
                    log.info("Scenario '%s' complete: %d items emitted", self.scenario, self.emitted)
                    break
                self._drain_batch()
                await asyncio.sleep(tick)
        except asyncio.CancelledError:  # noqa: PERF203
            log.info("Simulator task cancelled")
            raise

    def run_to_completion(self) -> int:
        """Drain the entire plan synchronously (tests + one-shot seeding).

        Uses the same pipeline as the live loop, so the resulting scores/alerts are
        identical — just without the per-tick delay.
        """
        while self._plan:
            self._drain_batch()
        self.state = "loaded"
        return self.emitted

    def _drain_batch(self) -> None:
        with SessionLocal() as db:
            processed = 0
            while self._plan and processed < _BATCH_PER_TICK:
                item = self._plan.popleft()
                self._apply(db, item)
                processed += 1
            db.commit()

    def _apply(self, db, item: PlanItem) -> None:
        kind = item["kind"]
        if kind == "account":
            self._create_account(db, item)
        elif kind == "device":
            db.add(
                Device(
                    account_id=item["account"],
                    imei=item["imei"],
                    event_type=item.get("event", "REGISTERED"),
                    registered_at=datetime.now(UTC),
                )
            )
        elif kind == "txn":
            ingest_transaction(
                db,
                src=item.get("src"),
                dst=item.get("dst"),
                amount=item["amount"],
                channel=item.get("channel", "UPI"),
                description=item.get("desc"),
            )
            self._txn_times.append(time.monotonic())
        self.emitted += 1

    def _create_account(self, db, item: PlanItem) -> None:
        now = datetime.now(UTC)
        last_active = now - timedelta(days=self._rng.randint(120, 200)) if item.get("dormant") else now
        db.add(
            Account(
                id=item["id"],
                holder_name=item["holder"],
                branch=item.get("branch", "Mumbai Main"),
                segment=item.get("segment", "retail"),
                opened_at=now - timedelta(days=self._rng.randint(200, 1200)),
                last_active=last_active,
                campaign=item.get("campaign"),
                is_ground_truth_mule=bool(item.get("mule")),
            )
        )


simulator = SimulatorEngine()
