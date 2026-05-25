"""
ARGUS-PRISM FlowGraph Detector Runner
======================================
Orchestrates all 5 FlowGraph detectors and aggregates results into
a structured report. Entry point for both scheduled runs and real-time
Flink-triggered evaluations.

Usage:
    python detector_runner.py                   # run all detectors
    python detector_runner.py --detector 1      # run Detector 1 only
    python detector_runner.py --json            # output as JSON
"""

import os
import sys
import json
import logging
import argparse
from dataclasses import asdict
from datetime import datetime, timezone
from neo4j import GraphDatabase

# Allow running from repo root or src/flowgraph
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'services', 'pipeline'))

try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

from detectors import (
    LayeringDetector,
    RoundTripDetector,
    StructuringDetector,
    DormantActivationDetector,
    ProfileMismatchDetector,
    ALL_DETECTORS,
    FlowAlert,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("prism.flowgraph.runner")


class FlowGraphRunner:
    """
    Runs all 5 FlowGraph detectors sequentially and returns a
    consolidated DetectionReport.
    """

    def __init__(self, uri: str = NEO4J_URI,
                 user: str = NEO4J_USER,
                 password: str = NEO4J_PASSWORD):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        log.info("FlowGraphRunner connected to %s", uri)

    def close(self):
        self.driver.close()

    def run_all(self) -> dict:
        """Run all 5 detectors. Returns consolidated report dict."""
        report = {
            "run_id": datetime.now(timezone.utc).isoformat(),
            "detectors_run": len(ALL_DETECTORS),
            "total_alerts": 0,
            "by_detector": {},
            "all_alerts": [],
        }

        for DetectorClass in ALL_DETECTORS:
            detector = DetectorClass(self.driver)
            log.info("Running %s...", detector.name)
            try:
                alerts = detector.detect()
                report["by_detector"][detector.name] = {
                    "count": len(alerts),
                    "severity": detector.severity,
                    "description": detector.description,
                    "alerts": [asdict(a) for a in alerts],
                }
                report["all_alerts"].extend([asdict(a) for a in alerts])
                report["total_alerts"] += len(alerts)
                log.info("  %s: %d alert(s)", detector.name, len(alerts))
            except Exception as e:
                log.error("  %s FAILED: %s", detector.name, e)
                report["by_detector"][detector.name] = {
                    "count": 0,
                    "error": str(e),
                }

        log.info("FlowGraph run complete — %d total alerts", report["total_alerts"])
        return report

    def run_one(self, detector_index: int) -> dict:
        """Run a single detector by 1-based index."""
        if not 1 <= detector_index <= len(ALL_DETECTORS):
            raise ValueError(f"Detector index must be 1–{len(ALL_DETECTORS)}")
        DetectorClass = ALL_DETECTORS[detector_index - 1]
        detector = DetectorClass(self.driver)
        log.info("Running %s...", detector.name)
        alerts = detector.detect()
        return {
            "detector": detector.name,
            "count": len(alerts),
            "alerts": [asdict(a) for a in alerts],
        }

    def print_summary(self, report: dict):
        """Human-readable summary to stdout."""
        print("\n" + "=" * 60)
        print("ARGUS-PRISM FlowGraph Detection Report")
        print(f"Run ID : {report['run_id']}")
        print(f"Alerts : {report['total_alerts']} total")
        print("=" * 60)
        for name, result in report["by_detector"].items():
            status = f"{result['count']} alert(s)" if "error" not in result else f"ERROR: {result['error']}"
            print(f"  [{name}] {status}")
        print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="PRISM FlowGraph Detector Runner")
    parser.add_argument(
        "--detector", type=int, default=None,
        help="Run single detector by number (1-5). Default: run all."
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output results as JSON"
    )
    args = parser.parse_args()

    runner = FlowGraphRunner()
    try:
        if args.detector:
            result = runner.run_one(args.detector)
        else:
            result = runner.run_all()
            if not args.json:
                runner.print_summary(result)

        if args.json:
            print(json.dumps(result, indent=2, default=str))
    finally:
        runner.close()


if __name__ == "__main__":
    main()
