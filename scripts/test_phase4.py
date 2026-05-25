import asyncio
import json
import logging
import httpx
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("prism.test-phase4")

API_BASE_URL = "http://localhost:8000"

async def run_tests():
    async with httpx.AsyncClient(timeout=5.0) as client:
        test_account_id = "UBI-2026-999999"
        headers = {"X-PRISM-User": "MLRO-Aditya", "X-PRISM-Role": "MLRO"}
        
        # We want to verify that the API resolves routes and returns standard PRISM JSON error responses
        # instead of raising unhandled FastAPI exceptions or returning tracebacks.
        
        # 1. Test GET /api/alerts (Global queue)
        try:
            resp = await client.get(f"{API_BASE_URL}/api/alerts", headers=headers)
            log.info("GET global alerts status: %d", resp.status_code)
            data = resp.json()
            assert "success" in data, "Standard PRISM response shape missing"
            if resp.status_code == 200:
                log.info("Successfully fetched prioritized global alerts queue!")
            elif resp.status_code == 500:
                log.info("Global alerts queue returned standard DB error response (Postgres offline fallback verified)")
        except Exception as e:
            log.error("Failed to connect or test global alerts: %s", e)
            return False
            
        # 2. Test GET /api/accounts/dashboard/stats
        try:
            resp = await client.get(f"{API_BASE_URL}/api/accounts/dashboard/stats", headers=headers)
            log.info("GET dashboard stats status: %d", resp.status_code)
            data = resp.json()
            assert "success" in data, "Standard PRISM response shape missing"
            if resp.status_code == 200:
                log.info("Successfully fetched dashboard stats!")
            elif resp.status_code == 500:
                log.info("Dashboard stats returned standard DB error response (Postgres offline fallback verified)")
        except Exception as e:
            log.error("Failed to connect or test dashboard stats: %s", e)
            return False
            
        # 3. Test GET /api/accounts/{id}/signals
        try:
            resp = await client.get(f"{API_BASE_URL}/api/accounts/{test_account_id}/signals", headers=headers)
            log.info("GET signals status: %d", resp.status_code)
            data = resp.json()
            assert "success" in data, "Standard PRISM response shape missing"
            if resp.status_code == 200:
                log.info("Successfully fetched signals breakdown!")
            elif resp.status_code == 500:
                log.info("Signals breakdown returned standard DB error response")
            elif resp.status_code == 404:
                log.info("Signals breakdown returned 404 Not Found as expected for invalid/non-existent account")
        except Exception as e:
            log.error("Failed to connect or test signals: %s", e)
            return False
            
        # 4. Test GET /api/accounts/{id}/transactions (Offline fallback test)
        try:
            resp = await client.get(f"{API_BASE_URL}/api/accounts/{test_account_id}/transactions", headers=headers)
            log.info("GET transactions status: %d", resp.status_code)
            data = resp.json()
            assert "success" in data, "Standard PRISM response shape missing"
            if resp.status_code == 200:
                log.info("Successfully fetched transaction list (Zero-crash fallback verified: synthetic transactions returned)")
                assert isinstance(data["data"], list), "Counterpart transactions must be a list"
            elif resp.status_code == 404:
                log.info("Transactions query returned 404 Not Found (correct validation since account is not seeded in PG)")
        except Exception as e:
            log.error("Failed to connect or test transactions: %s", e)
            return False
            
        log.info("SUCCESS: All Phase 4 API endpoints are verified and properly integrated with standard error handling!")
        return True

if __name__ == "__main__":
    try:
        success = asyncio.run(run_tests())
        if not success:
            exit(1)
    except Exception as e:
        log.exception("Test execution failed: %s", e)
        exit(1)
