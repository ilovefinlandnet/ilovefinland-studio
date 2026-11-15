"""End-to-end test for ILoveFinland Studio Milestone 2 workflow."""

import http.cookiejar
import json
import os
import sys
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import create_server  # noqa: E402


class Milestone2WorkflowTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        self.server = create_server(host="127.0.0.1", port=0, db_path=self.tmp.name)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.cj = http.cookiejar.CookieJar()
        self.opener = build_opener(HTTPCookieProcessor(self.cj))

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        if os.path.exists(self.tmp.name):
            os.unlink(self.tmp.name)

    def _req(self, path: str, method: str = "GET", payload: dict = None) -> tuple:
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {"Content-Type": "application/json"} if payload is not None else {}
        req = Request(f"http://127.0.0.1:{self.port}{path}", data=data, headers=headers, method=method)
        with self.opener.open(req) as resp:
            raw = resp.read()
            ctype = resp.headers.get("Content-Type", "")
            body = json.loads(raw.decode("utf-8")) if "application/json" in ctype else raw
            return resp.status, body

    def test_full_milestone2_workflow(self) -> None:
        # 1. Protected previews & media return 401 when signed out
        with self.assertRaises(HTTPError) as ctx1:
            self._req("/api/package?id=1")
        self.assertEqual(ctx1.exception.code, 401)

        with self.assertRaises(HTTPError) as ctx2:
            self._req("/assets/nordic-pulse.wav")
        self.assertEqual(ctx2.exception.code, 401)

        # 2. Unauthorized email rejected (403); owner email succeeds (200)
        with self.assertRaises(HTTPError) as ctx3:
            self._req("/api/auth/google", "POST", {"email": "stranger@example.com"})
        self.assertEqual(ctx3.exception.code, 403)

        status, auth = self._req("/api/auth/google", "POST", {"email": "editor@ilovefinland.net"})
        self.assertEqual(status, 200)
        self.assertTrue(auth["authenticated"])

        # 3. FI-Alert package v1 + voice feedback -> v2
        _, bundle = self._req("/api/package?id=1")
        self.assertEqual(bundle["package"]["current_version"], 1)
        orig_y = bundle["versions"][0]["reel"]["layout"]["logo_y_pct"]

        _, bundle = self._req(
            "/api/package/comment",
            "POST",
            {
                "package_id": 1,
                "target": "reel",
                "comment": "move the logo lower and make the second line bigger",
                "has_voice_note": True,
            },
        )
        self.assertEqual(bundle["package"]["current_version"], 2)
        self.assertTrue(bundle["comments"][0]["has_voice_note"])
        self.assertGreater(bundle["versions"][1]["reel"]["layout"]["logo_y_pct"], orig_y)

        # 4. Rewrite with Claude -> v3, requires fresh approval
        _, bundle = self._req("/api/package/rewrite-claude", "POST", {"package_id": 1, "scope": "article"})
        self.assertEqual(bundle["package"]["current_version"], 3)
        self.assertEqual(bundle["versions"][2]["ai_model"], "Claude (Simulated)")

        # 5. Scheduling unapproved version is blocked (400)
        with self.assertRaises(HTTPError) as ctx4:
            self._req("/api/package/schedule", "POST", {"package_id": 1, "article_publish_at": "2026-11-15T10:00"})
        self.assertEqual(ctx4.exception.code, 400)

        # 6. Separate approvals + simulated Europe/Helsinki schedule
        self._req("/api/package/approve", "POST", {"package_id": 1, "component": "article", "decision": "approved", "version": 3})
        self._req("/api/package/approve", "POST", {"package_id": 1, "component": "reel", "decision": "approved", "version": 3})
        _, bundle = self._req(
            "/api/package/schedule",
            "POST",
            {"package_id": 1, "article_publish_at": "2026-11-15T10:00", "reel_publish_at": "2026-11-15T16:00"},
        )
        self.assertEqual(bundle["package"]["article_publish_at"], "2026-11-15T10:00")
        self.assertEqual(bundle["package"]["reel_publish_at"], "2026-11-15T16:00")

        # 7. Assignment creation + Calendar missed-time check
        _, assigned = self._req(
            "/api/assignments",
            "POST",
            {
                "topic": "HSL Winter Zone Guide",
                "scope": "Both",
                "instructions": "Explain ABC zones clearly.",
                "links": ["https://www.hsl.fi/en"],
                "deadline_at": "2026-11-16T12:00",
                "has_voice_note": True,
            },
        )
        self.assertEqual(assigned["package"]["origin"], "My Assignment")

        _, cal = self._req("/api/calendar")
        self.assertEqual(cal["timezone"], "Europe/Helsinki")
        self.assertTrue(any(e["missed"] for e in cal["events"]))

        # 8. Inbox reply approval (simulated) & Performance CSV import
        _, inbox = self._req("/api/inbox")
        first_id = inbox["items"][0]["id"]
        _, updated_item = self._req("/api/inbox/action", "POST", {"id": first_id, "action": "approve"})
        self.assertEqual(updated_item["item"]["status"], "approved_simulated")

        _, imp = self._req(
            "/api/performance/import",
            "POST",
            {"csv": "title,format,age_hours,watch_time_sec,shares,saves,follows,site_clicks\nImported Test,Reel,48,11.5,30,75,10,25"},
        )
        self.assertEqual(imp["inserted"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
