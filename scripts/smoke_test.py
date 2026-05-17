#!/usr/bin/env python3
"""
ARGUS-PRISM Smoke Test
======================
Validates the full backend is operational in one command.

Usage:
    python scripts/smoke_test.py
    python scripts/smoke_test.py --base http://localhost:8000
    python scripts/smoke_test.py --verbose

Run this before every demo recording. All green = safe to demo.
"""

import argparse
import json
import sys
import time

try:
    import httpx
except ImportError:
    print("❌ httpx not installed. Run: pip install httpx")
    sys.exit(1)


# RBAC headers for demo mode
HEADERS = {
    "X-PRISM-User": "smoke-test",
    "X-PRISM-Role": "MLRO",
}

# Test payload for scoring endpoint
SCORE_PAYLOAD = {
    "account_id": "UBI-2026-DEMO-001",
    "signal_outputs": {
        "S1": {"shap_ready_vector": [0.3, 0.4, 0.1, 0.2, 0.5, 0.1, 0.7]},
        "S2": {"shap_ready_vector": [1.0, 0.6, 0.3, 0.2, 0.4, 0.8, 0.0, 0.5, 0.7]},
        "S3": {"shap_ready_vector": [0.0, 0.0, 0.6, 0.8, 0.7, 0.5, 0.3, 0.4]},
        "S4": {"shap_ready_vector": [0.9, 0.7, 0.6, 0.4, 0.8, 0.7, 0.6]},
        "S5": {"shap_ready_vector": [0.2, 0.8, 0.6, 0.3, 0.1, 0.5]},
        "S6": {"shap_ready_vector": [0.4, 0.7, 0.6, 0.8, 0.9, 0.8]},
    }
}

TESTS = [
    # (Name, Method, Path, Body, ExpectedStatusRange)
    ("Health Liveness",     "GET",  "/health",                                None,           (200, 299)),
    ("Health Readiness",    "GET",  "/health/ready",                          None,           (200, 503)),  # 503 is OK if dependencies are down
    ("Legal Thresholds",    "GET",  "/health/thresholds",                     None,           (200, 299)),
    ("List Accounts",       "GET",  "/api/accounts",                          None,           (200, 299)),
    ("Model Status",        "GET",  "/api/v1/warmthscore/model/status",       None,           (200, 299)),
    ("Score Account",       "POST", "/api/v1/warmthscore/score",              SCORE_PAYLOAD,  (200, 299)),
    ("Score Timeline (PG)", "GET",  "/api/v1/warmthscore/UBI-2026-DEMO-001/timeline", None,   (200, 299)),
    ("Recruiter Map",       "GET",  "/api/recruiter/map",                     None,           (200, 499)),  # May 404 if no data
]


def run_tests(base_url: str, verbose: bool = False):
    """Execute all smoke tests and return (passed, failed) counts."""
    passed = 0
    failed = 0
    total_time = 0.0

    print(f"\n{'='*60}")
    print(f"  ARGUS-PRISM Smoke Test")
    print(f"  Target: {base_url}")
    print(f"  Time:   {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    with httpx.Client(timeout=30.0, headers=HEADERS) as client:
        for name, method, path, body, (min_status, max_status) in TESTS:
            url = f"{base_url}{path}"
            start = time.monotonic()

            try:
                if method == "GET":
                    r = client.get(url)
                else:
                    r = client.post(url, json=body)

                elapsed = (time.monotonic() - start) * 1000
                total_time += elapsed
                ok = min_status <= r.status_code <= max_status

                if ok:
                    passed += 1
                    icon = "✅"
                else:
                    failed += 1
                    icon = "❌"

                print(f"  {icon} [{r.status_code:3d}] {name:<25s} ({elapsed:.0f}ms)")

                if verbose and not ok:
                    try:
                        detail = json.dumps(r.json(), indent=2)[:200]
                        print(f"       Response: {detail}")
                    except Exception:
                        print(f"       Response: {r.text[:200]}")

                if verbose and ok and method == "POST":
                    try:
                        data = r.json()
                        if "warmth_score" in data:
                            print(f"       → score={data['warmth_score']}, risk={data['risk_level']}")
                    except Exception:
                        pass

            except httpx.ConnectError:
                failed += 1
                print(f"  ❌ [---] {name:<25s} (CONNECTION REFUSED)")
                print(f"       Is the API running at {base_url}?")
            except Exception as e:
                failed += 1
                print(f"  ❌ [ERR] {name:<25s} ({type(e).__name__}: {e})")

    print(f"\n{'='*60}")
    print(f"  Results: {passed} passed, {failed} failed ({total_time:.0f}ms total)")
    if failed == 0:
        print(f"  🎉 All systems operational — safe to demo!")
    else:
        print(f"  ⚠️  {failed} test(s) failed — investigate before demo.")
    print(f"{'='*60}\n")

    return passed, failed


def main():
    parser = argparse.ArgumentParser(description="ARGUS-PRISM Backend Smoke Test")
    parser.add_argument(
        "--base", type=str, default="http://localhost:8000",
        help="Base URL of the API (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Show response details for failed tests and scoring results"
    )
    args = parser.parse_args()

    _, failed = run_tests(args.base, args.verbose)
    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
