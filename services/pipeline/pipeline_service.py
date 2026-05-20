"""
ARGUS-PRISM Pipeline — Cloud Run Service Wrapper
==================================================
Wraps the Kafka→Neo4j pipeline consumer in a background thread and
exposes a minimal HTTP health endpoint on $PORT so Cloud Run keeps
the container alive.

The pipeline consumes from all 4 Kafka topics (account_events,
txn_events, device_events, kyc_events), writes to Neo4j, and
auto-triggers WarmthScore re-computation.
"""

import os
import sys
import json
import time
import signal
import logging
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("prism.pipeline-service")

# Ensure KAFKA_BOOTSTRAP is set from KAFKA_BOOTSTRAP_SERVERS if needed
_kafka = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "")
if _kafka and not os.environ.get("KAFKA_BOOTSTRAP"):
    os.environ["KAFKA_BOOTSTRAP"] = _kafka


# ── Global state ──────────────────────────────────────────────────────────────
_pipeline_thread = None
_pipeline_instance = None
_started_at = time.time()
_error = None


# ── Health endpoint ───────────────────────────────────────────────────────────

class HealthHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler for Cloud Run health probes."""

    def do_GET(self):
        uptime = int(time.time() - _started_at)
        status = {
            "service": "prism-pipeline",
            "status": "running" if _pipeline_thread and _pipeline_thread.is_alive() else "starting",
            "uptime_seconds": uptime,
            "error": _error,
        }
        # Add pipeline stats if available
        if _pipeline_instance and hasattr(_pipeline_instance, '_stats'):
            status["stats"] = _pipeline_instance._stats

        code = 200 if status["status"] == "running" else 503
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(status).encode())

    def log_message(self, format, *args):
        """Suppress default access logs — too noisy."""
        pass


# ── Pipeline thread ──────────────────────────────────────────────────────────

def _run_pipeline():
    """Import and run the PRISMPipeline. Runs forever in a daemon thread."""
    global _pipeline_instance, _error
    try:
        # Import from the same directory (PYTHONPATH includes services/pipeline)
        from flink_pipeline import PRISMPipeline
        _pipeline_instance = PRISMPipeline()
        log.info("Pipeline instance created — starting Kafka consumer loop (no timeout)")
        # Run with no timeout = run forever
        _pipeline_instance.run(timeout_seconds=None)
    except Exception as e:
        _error = str(e)
        log.exception("Pipeline crashed: %s", e)


# ── Entrypoint ────────────────────────────────────────────────────────────────

def main():
    global _pipeline_thread

    port = int(os.environ.get("PORT", 8080))
    log.info("Starting PRISM Pipeline Service on port %d", port)

    # Start pipeline consumer in background thread
    _pipeline_thread = threading.Thread(target=_run_pipeline, daemon=True, name="pipeline-main")
    _pipeline_thread.start()
    log.info("Pipeline thread started")

    # Run HTTP server in main thread (blocks forever)
    server = HTTPServer(("0.0.0.0", port), HealthHandler)

    def _shutdown(signum, frame):
        log.info("Received signal %d — shutting down", signum)
        if _pipeline_instance:
            _pipeline_instance._running = False
        server.shutdown()

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    log.info("Health endpoint ready at http://0.0.0.0:%d/", port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        log.info("Pipeline service stopped")


if __name__ == "__main__":
    main()
