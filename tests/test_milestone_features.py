#!/usr/bin/env python3
"""Automated verification of Weekly Plan, Multi-Clip Reels, Calendar Overlaps, and Connections."""

import json
import os
import unittest
import urllib.request
import http.cookiejar

BASE_URL = "http://127.0.0.1:8787"
ACCESS_KEY = "suomi-studio-preview"

class MilestoneFeaturesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cj = http.cookiejar.CookieJar()
        cls.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cls.cj))
        # Authenticate
        login_req = urllib.request.Request(
            f"{BASE_URL}/api/auth/google",
            data=json.dumps({"access_key": ACCESS_KEY}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        resp = cls.opener.open(login_req)
        assert resp.status == 200

    def api_get(self, path):
        req = urllib.request.Request(f"{BASE_URL}{path}")
        with self.opener.open(req) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def api_post(self, path, payload):
        req = urllib.request.Request(
            f"{BASE_URL}{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with self.opener.open(req) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def test_01_weekly_plan_and_accept(self):
        """Test Plan My Week ideas retrieval and acceptance into production queue."""
        plan = self.api_get("/api/calendar/plan")
        self.assertIn("ideas", plan)
        self.assertGreaterEqual(len(plan["ideas"]), 4)

        idea = plan["ideas"][0]
        self.assertIn("title", idea)
        self.assertIn("fit_reason", idea)
        self.assertIn("recommended_format", idea)

        # Accept idea 1
        res = self.api_post("/api/calendar/plan/action", {"action": "accept", "id": idea["id"]})
        self.assertEqual(res["idea"]["status"], "accepted")
        self.assertIn("package", res["bundle"])
        self.assertEqual(res["bundle"]["package"]["title"], idea["title"])

    def test_02_calendar_overlaps_and_missed_slots(self):
        """Test Europe/Helsinki calendar with same-channel overlap and missed slots."""
        cal = self.api_get("/api/calendar")
        self.assertEqual(cal["timezone"], "Europe/Helsinki")
        events = cal["events"]
        self.assertGreaterEqual(len(events), 6)

        # Check for missed slots
        missed = [e for e in events if e.get("missed")]
        self.assertTrue(len(missed) > 0, "Should flag missed slots from past date")

        # Check for same-channel overlaps within 90 minutes
        overlaps = [e for e in events if e.get("overlap")]
        self.assertTrue(len(overlaps) > 0, "Should detect same-channel collision within 90 mins")
        for o in overlaps:
            self.assertIn(o["channel"], ("WordPress", "Instagram & TikTok"))
            self.assertIsNotNone(o["overlap_with"])

    def test_03_multi_clip_reel_assignment_and_review(self):
        """Test uploading clips to create a 9:16 Reel assignment with safe area & pre-approval checks."""
        # 1. Load demo clips
        demo_resp = self.api_post("/api/upload/clips", {"action": "load_demo"})
        self.assertEqual(len(demo_resp["clips"]), 2)
        clips = demo_resp["clips"]

        # 2. Create multi-clip assignment
        payload = {
            "title": "Winter Transit in Finland: Tramways to Lapland Wilderness",
            "clips": clips,
            "target_length_sec": 9,
            "audio_mode": "authentic_source_and_music",
            "opening_shot_note": "Clip 1: Helsinki Tram",
            "instructions": "Feature Helsinki green tram in opening shot, then transition to Lapland snow.",
            "has_voice_note": True,
        }
        bundle = self.api_post("/api/assignments/reel-clips", payload)
        pkg_id = bundle["package"]["id"]
        self.assertEqual(bundle["package"]["origin"], "User Uploaded Clips")
        self.assertEqual(bundle["package"]["assignment_scope"], "Reel")

        # Verify Reel layout has safe area and logo inside bounds
        v1 = bundle["versions"][0]
        reel = v1["reel"]
        self.assertEqual(len(reel["video_clips"]), 2)
        self.assertIn("safe_area", reel["layout"])

        # Verify Pre-Approval Checks
        checks = bundle["pre_approval_checks"]
        self.assertEqual(len(checks), 3)
        for c in checks:
            self.assertEqual(c["status"], "PASS")

        # 3. Test Revision: Request Reel logo and text modification
        rev_bundle = self.api_post(
            "/api/package/comment",
            {
                "package_id": pkg_id,
                "target": "reel",
                "comment": "move the logo lower and make the second line bigger",
                "has_voice_note": True,
            },
        )
        self.assertEqual(rev_bundle["package"]["current_version"], 2)
        v2 = rev_bundle["versions"][-1]
        self.assertGreater(v2["reel"]["layout"]["logo_y_pct"], v1["reel"]["layout"]["logo_y_pct"])
        self.assertGreater(v2["reel"]["layout"]["line2_font_px"], v1["reel"]["layout"]["line2_font_px"])

        # 4. Approve Reel v2
        app_bundle = self.api_post(
            "/api/package/approve",
            {"package_id": pkg_id, "component": "reel", "decision": "approved", "version": 2},
        )
        self.assertEqual(app_bundle["package"]["reel_status"], "approved")

    def test_04_connections_catalog_and_secrets(self):
        """Test Settings -> Connections catalog and server-side secret guidance."""
        conn_data = self.api_get("/api/connections")
        cards = conn_data["connections"]
        self.assertEqual(len(cards), 8)

        card_ids = [c["id"] for c in cards]
        for expected in ("openai", "claude", "canva", "higgsfield", "wordpress", "social", "email", "analytics"):
            self.assertIn(expected, card_ids)

        # Test OpenAI connection handshake
        oa_test = self.api_post("/api/connections/test", {"service": "openai"})
        self.assertIn("status", oa_test)
        self.assertIn("OPENAI_API_KEY", oa_test["message"])

        # Test Claude connection handshake
        cl_test = self.api_post("/api/connections/test", {"service": "claude"})
        self.assertIn("status", cl_test)
        self.assertIn("ANTHROPIC_API_KEY", cl_test["message"])

    def test_05_official_sources_search(self):
        """Test official Finnish sources search with claims, links and dates."""
        res = self.api_get("/api/research/sources?q=fmi")
        self.assertGreaterEqual(len(res["sources"]), 1)
        src = res["sources"][0]
        self.assertIn("claim", src)
        self.assertIn("url", src)
        self.assertIn("published_date", src)
        self.assertEqual(src["is_verified"], 1)

if __name__ == "__main__":
    unittest.main()
