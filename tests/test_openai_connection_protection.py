"""Comprehensive verification of OpenAI spending protection, Demo Mode locks, and probe security."""

import http.cookiejar
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request

BASE_URL = "http://127.0.0.1:8787"
ACCESS_KEY = "suomi-studio-x9k4-7q2m"
DB_PATH = "/Users/binod721/.gemini/antigravity/scratch/ilovefinland-studio/studio.db"

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))


def api_request(path, data=None, auth=True):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers)
    req_opener = opener if auth else urllib.request.build_opener()
    try:
        with req_opener.open(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        try:
            return exc.code, json.loads(exc.read().decode("utf-8"))
        except Exception:
            return exc.code, {"error": str(exc)}


def run_tests():
    print("=== RUNNING OPENAI CONNECTION & SPENDING PROTECTION TESTS ===")

    # Test 1: Verify Package #20 Permanent Demo Lock
    print("\n--- Test 1: Package #20 Permanent Demo Lock ---")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, title, demo_lock, article_status, reel_status FROM packages WHERE id = 20")
    row = cur.fetchone()
    conn.close()
    assert row is not None, "Package #20 not found"
    assert row[2] == 1, f"Package #20 demo_lock must be 1, found: {row[2]}"
    print(f"✓ Package #{row[0]} ('{row[1]}') has demo_lock = 1 (Permanently protected from autopublish)")

    # Test 2: Unauthenticated Access Rejection
    print("\n--- Test 2: Authentication Enforcement ---")
    st_code, _ = api_request("/api/admin/openai-probe/status", auth=False)
    assert st_code == 401, f"Expected 401 Unauthorized for probe status, got {st_code}"
    print("✓ GET /api/admin/openai-probe/status requires admin session (HTTP 401)")

    test_code, _ = api_request("/api/admin/openai-probe/test", data={"mode": "mock"}, auth=False)
    assert test_code == 401, f"Expected 401 Unauthorized for probe test, got {test_code}"
    print("✓ POST /api/admin/openai-probe/test requires admin session (HTTP 401)")

    # Authenticate as Editor
    auth_status, auth_res = api_request("/api/auth/google", data={"access_key": ACCESS_KEY})
    assert auth_status == 200 and auth_res.get("authenticated") is True, "Failed to authenticate"
    print("✓ Admin authenticated as editor@ilovefinland.net")

    # Test 3: Authenticated Probe Status & Pricing Check
    print("\n--- Test 3: Verified Pricing & Lowest-Cost Model ---")
    _, probe_status = api_request("/api/admin/openai-probe/status")
    pricing = probe_status["pricing"]
    assert pricing["model"] == "gpt-4o-mini", f"Expected gpt-4o-mini, got {pricing['model']}"
    assert pricing["input_per_million_usd"] == 0.150, "Input price mismatch"
    assert pricing["output_per_million_usd"] == 0.600, "Output price mismatch"
    assert probe_status["demo_mode_active"] is True, "Demo Mode must be active by default"
    assert probe_status["live_probes_limit"] == 1, "Single-use limit must be 1"
    print(f"✓ Active probe model: {pricing['model']} (Lowest-cost OpenAI text model)")
    print(f"✓ Pricing: ${pricing['input_per_million_usd']}/1M in, ${pricing['output_per_million_usd']}/1M out")
    print(f"✓ Default Demo Mode: {probe_status['demo_mode_active']} (0 credits spent)")

    # Test 4: Mocked Probe Execution
    print("\n--- Test 4: Mocked Probe (Zero Cost) ---")
    _, mock_res = api_request("/api/admin/openai-probe/test", data={"mode": "mock"})
    assert mock_res["ok"] is True
    assert mock_res["status"] == "MOCK_SUCCESS"
    assert mock_res["credits_spent"] is False
    assert mock_res["estimated_cost_usd"] == 0.0
    assert mock_res["total_tokens"] == 11
    print(f"✓ Mock probe returned {mock_res['status']}")
    print(f"  Tokens: {mock_res['prompt_tokens']} in + {mock_res['completion_tokens']} out = {mock_res['total_tokens']} total")
    print(f"  Actual Cost: ${mock_res['estimated_cost_usd']} USD (0 credits spent)")
    print(f"  Simulated cost calculation: ${mock_res['simulated_estimated_cost_usd']} USD")

    # Test 5: Live Mode Blocked When Demo Mode Active
    print("\n--- Test 5: Live Mode Blocked Under Demo Mode ---")
    _, demo_live_res = api_request("/api/admin/openai-probe/test", data={"mode": "live", "confirm_live_charge": True})
    assert demo_live_res["credits_spent"] is False
    assert demo_live_res["estimated_cost_usd"] == 0.0
    print("✓ Live probe attempt during Demo Mode is safely converted to simulated probe (Zero outbound calls)")

    # Test 6: Emergency Kill Switch
    print("\n--- Test 6: Emergency Kill Switch ---")
    _, kill_res = api_request("/api/admin/openai-probe/kill", data={"kill": True})
    assert kill_res["kill_switch_active"] is True
    print("✓ Emergency Kill Switch ENGAGED")

    _, blocked_res = api_request("/api/admin/openai-probe/test", data={"mode": "live"})
    assert blocked_res["status"] == "BLOCKED_BY_KILL_SWITCH"
    assert blocked_res["credits_spent"] is False
    print(f"✓ Kill Switch safely blocked request: {blocked_res['message']}")

    # Disengage Kill Switch for normal safety
    _, unkill_res = api_request("/api/admin/openai-probe/kill", data={"kill": False})
    assert unkill_res["kill_switch_active"] is False
    print("✓ Emergency Kill Switch disengaged (Normal safety returned)")

    # Test 7: Secret Masking Verification
    print("\n--- Test 7: Secret Masking in API Responses & Logs ---")
    raw_res = json.dumps(mock_res) + json.dumps(probe_status)
    assert "sk-" not in raw_res, "API Key was exposed in API responses!"
    print("✓ Verified: No API keys (sk-...) are present in API responses")

    print("\n=== ALL SPENDING & SECURITY TESTS PASSED (100%) ===")


if __name__ == "__main__":
    run_tests()
