"""
ARGUS-PRISM Simulator — Cloud Run Service Wrapper
===================================================
Wraps the LiveSimulator in a background thread and exposes a minimal
HTTP health endpoint on $PORT so Cloud Run keeps the container alive.

Cloud Run requires every service to respond to HTTP requests.
The actual work (Kafka publishing, DB writes) happens in a daemon thread.
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
log = logging.getLogger("prism.simulator-service")

# ── Fix DATABASE_URL for psycopg2 ────────────────────────────────────────────
# The shared env var uses postgresql+asyncpg:// but psycopg2 needs postgresql://
_db_url = os.environ.get("DATABASE_URL", "")
if "+asyncpg" in _db_url:
    os.environ["DATABASE_URL"] = _db_url.replace("+asyncpg", "")
    log.info("Fixed DATABASE_URL: stripped +asyncpg for psycopg2 compatibility")

# Ensure KAFKA_BOOTSTRAP is set from KAFKA_BOOTSTRAP_SERVERS if needed
_kafka = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "")
if _kafka and not os.environ.get("KAFKA_BOOTSTRAP"):
    os.environ["KAFKA_BOOTSTRAP"] = _kafka


# ── Global state ──────────────────────────────────────────────────────────────
_simulator_thread = None
_simulator_instance = None
_started_at = time.time()
_error = None


# ── Health endpoint ───────────────────────────────────────────────────────────

class HealthHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler for Cloud Run health probes."""

    def do_GET(self):
        uptime = int(time.time() - _started_at)
        status = {
            "service": "prism-simulator",
            "status": "running" if _simulator_thread and _simulator_thread.is_alive() else "starting",
            "uptime_seconds": uptime,
            "error": _error,
        }
        # Add simulator stats if available
        if _simulator_instance and hasattr(_simulator_instance, 'accounts'):
            status["active_accounts"] = len(_simulator_instance.accounts)

        code = 200 if status["status"] == "running" else 503
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(status).encode())

    def log_message(self, format, *args):
        """Suppress default access logs — too noisy."""
        pass


# ── Simulator thread ─────────────────────────────────────────────────────────

def _run_simulator():
    """Import and run the LiveSimulator. Runs forever in a daemon thread."""
    global _simulator_instance, _error
    try:
        # Import from the same directory (PYTHONPATH includes services/pipeline)
        from demo_live_simulator import LiveSimulator
        _simulator_instance = LiveSimulator()
        log.info("Simulator instance created — starting main loop")
        _simulator_instance.run()
    except Exception as e:
        _error = str(e)
        log.exception("Simulator crashed: %s", e)


# ── Entrypoint ────────────────────────────────────────────────────────────────

def main():
    global _simulator_thread

    port = int(os.environ.get("PORT", 8080))
    log.info("Starting PRISM Simulator Service on port %d", port)

    # Start simulator in background thread
    _simulator_thread = threading.Thread(target=_run_simulator, daemon=True, name="simulator-main")
    _simulator_thread.start()
    log.info("Simulator thread started")

    # Run HTTP server in main thread (blocks forever)
    server = HTTPServer(("0.0.0.0", port), HealthHandler)

    def _shutdown(signum, frame):
        log.info("Received signal %d — shutting down", signum)
        if _simulator_instance:
            _simulator_instance.running = False
        server.shutdown()

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    log.info("Health endpoint ready at http://0.0.0.0:%d/", port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        log.info("Simulator service stopped")


if __name__ == "__main__":
    main()
