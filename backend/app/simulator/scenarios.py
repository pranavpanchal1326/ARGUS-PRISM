"""Deterministic scenario plans for the simulator.

A scenario is turned into an ordered list of plan items (create account, register
device, post transaction). The same seed always produces the same plan, so a demo
replays identically — but every item still flows through the *real* pipeline, so the
scores and alerts it produces are genuine, not scripted.
"""

from __future__ import annotations

import random
from typing import Any

# Plan item kinds: {"kind": "account"|"device"|"txn", ...}
PlanItem = dict[str, Any]

INDIAN_NAMES = [
    "Rohan Sharma", "Priya Nair", "Aditya Kulkarni", "Sneha Reddy", "Vikram Singh",
    "Ananya Das", "Karan Malhotra", "Meera Iyer", "Rahul Verma", "Divya Menon",
    "Sameer Khan", "Pooja Bhatt", "Arjun Pillai", "Nisha Gupta", "Tarun Rao",
    "Isha Joshi", "Manish Patel", "Kavya Shetty", "Deepak Yadav", "Riya Chopra",
]


def _account_id(index: int) -> str:
    return f"UBI-2026-{index:06d}"


def build_legit_baseline(rng: random.Random, params: dict, start_index: int) -> list[PlanItem]:
    """Ordinary salary/retail traffic — the calm the alerts stand out against."""
    n = int(params.get("accounts", 40))
    plan: list[PlanItem] = []
    ids: list[str] = []
    for i in range(n):
        acct_id = _account_id(start_index + i)
        ids.append(acct_id)
        segment = rng.choice(["salary", "retail", "salary", "senior", "student"])
        plan.append(
            {
                "kind": "account",
                "id": acct_id,
                "holder": rng.choice(INDIAN_NAMES),
                "segment": segment,
                "branch": rng.choice(["Mumbai Main", "Pune FC Road", "Delhi CP", "Bengaluru MG"]),
                "campaign": None,
                "mule": False,
            }
        )
    # A little routine traffic: salary credit + a couple of ordinary spends.
    for acct_id in ids:
        plan.append({"kind": "txn", "src": None, "dst": acct_id,
                     "amount": rng.choice([45000, 62000, 38000, 55000]), "channel": "NEFT",
                     "desc": "Salary credit"})
        for _ in range(rng.randint(1, 3)):
            plan.append({"kind": "txn", "src": acct_id, "dst": None,
                         "amount": rng.randint(1500, 9000), "channel": "UPI",
                         "desc": "Retail purchase"})
    return plan


def build_recruiter_fanout(rng: random.Random, params: dict, start_index: int) -> list[PlanItem]:
    """A coordinator fans out small 'test' payments to fresh mules, who then
    round-trip larger inflows straight back out — the classic warming pattern."""
    n_mules = int(params.get("accounts", 23))
    seed_funds = float(params.get("seed_funds", 4_200_000))
    plan: list[PlanItem] = []

    recruiter_id = _account_id(start_index)
    plan.append({
        "kind": "account", "id": recruiter_id, "holder": rng.choice(INDIAN_NAMES),
        "segment": "business", "branch": "Surat Ring Road",
        "campaign": params.get("name", "recruiter_fanout"), "mule": True, "recruiter": True,
    })
    # Recruiter is funded from outside the bank.
    plan.append({"kind": "txn", "src": None, "dst": recruiter_id,
                 "amount": seed_funds, "channel": "IMPS", "desc": "Inbound consolidation"})

    mule_ids: list[str] = []
    for i in range(1, n_mules + 1):
        acct_id = _account_id(start_index + i)
        mule_ids.append(acct_id)
        dormant = rng.random() < 0.4
        new_device = rng.random() < 0.6
        plan.append({
            "kind": "account", "id": acct_id, "holder": rng.choice(INDIAN_NAMES),
            "segment": rng.choice(["student", "retail"]), "branch": "Surat Ring Road",
            "campaign": params.get("name", "recruiter_fanout"), "mule": True,
            "dormant": dormant, "new_device": new_device,
        })
        if new_device:
            plan.append({"kind": "device", "account": acct_id,
                         "imei": f"3540{rng.randint(10**10, 10**11 - 1)}", "event": "REGISTERED"})
            plan.append({"kind": "device", "account": acct_id,
                         "imei": f"3560{rng.randint(10**10, 10**11 - 1)}", "event": "UPI_DEVICE_CHANGED"})
        if rng.random() < 0.35:
            for _ in range(rng.randint(2, 3)):
                plan.append({"kind": "device", "account": acct_id,
                             "imei": f"3570{rng.randint(10**10, 10**11 - 1)}", "event": "SIM_SWAP"})

    # Fan-out: recruiter sends small test payments to each mule.
    for acct_id in mule_ids:
        plan.append({"kind": "txn", "src": recruiter_id, "dst": acct_id,
                     "amount": rng.choice([4500, 4800, 4200, 4900]), "channel": "UPI",
                     "desc": "Test payment"})

    # Layering: each mule receives a larger inflow, then rapidly cycles it out in
    # many sub-threshold transfers (structuring) within a short window.
    for acct_id in mule_ids:
        inflow = rng.choice([280_000, 360_000, 440_000, 320_000])
        plan.append({"kind": "txn", "src": None, "dst": acct_id,
                     "amount": inflow, "channel": "IMPS", "desc": "Layering inflow"})
        remaining = inflow * rng.uniform(0.9, 0.98)
        while remaining > 15_000:
            # Bias chunk sizes into the 30k–48k structuring band.
            chunk = min(remaining, rng.randint(31_000, 47_000))
            plan.append({"kind": "txn", "src": acct_id, "dst": None,
                         "amount": round(chunk, 2), "channel": "UPI", "desc": "Rapid outflow"})
            remaining -= chunk
    return plan


_BUILDERS = {
    "legit_baseline": build_legit_baseline,
    "recruiter_fanout": build_recruiter_fanout,
}


def build_plan(name: str, rng: random.Random, params: dict, start_index: int) -> list[PlanItem]:
    builder = _BUILDERS.get(name)
    if builder is None:
        raise KeyError(f"unknown scenario: {name}")
    params = {**params, "name": name}
    return builder(rng, params, start_index)


def known_scenarios() -> list[str]:
    return sorted(_BUILDERS.keys())
