import httpx
import json
import time

def verify_api():
    base_url = "http://127.0.0.1:8000/api/v1/warmthscore"
    
    # Payload
    signal_outputs = {
        "S1": {"features": [1.0] * 7},
        "S2": {"features": [1.0] * 9},
        "S3": {"features": [1.0] * 8},
        "S4": {"features": [1.0] * 7},
        "S5": {"features": [1.0] * 6},
        "S6": {"features": [1.0] * 6}
    }
    
    # Test POST /score
    try:
        response = httpx.post(f"{base_url}/score", json={
            "account_id": "API_TEST_01",
            "signal_outputs": signal_outputs
        }, timeout=10.0)
        print(f"POST /score Status: {response.status_code}")
        if response.status_code == 200:
            res = response.json()
            print(f"Score: {res['warmth_score']}, Risk: {res['risk_level']}")
    except Exception as e:
        print(f"POST /score failed (is server running?): {e}")

    # Test Missing Signal (AC 5)
    bad_payload = signal_outputs.copy()
    del bad_payload["S4"]
    response = httpx.post(f"{base_url}/score", json={
        "account_id": "API_TEST_BAD",
        "signal_outputs": bad_payload
    })
    print(f"Missing S4 Status: {response.status_code} (Expected 422)")
    print(f"Detail: {response.json().get('detail')}")

    # Test Batch 51 (AC 7)
    batch = [{"account_id": f"A_{i}", "signal_outputs": signal_outputs} for i in range(51)]
    response = httpx.post(f"{base_url}/score/batch", json=batch)
    print(f"Batch 51 Status: {response.status_code} (Expected 422)")
    print(f"Detail: {response.json().get('detail')}")

if __name__ == "__main__":
    verify_api()
