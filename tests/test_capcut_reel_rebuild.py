import os
import sys
import json
import base64
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

import db
import media_gen

class TestCapCutReelRebuild(unittest.TestCase):
    def setUp(self):
        db.init_db()

    def test_01_media_pool_upload_multi_items(self):
        """Test uploading both photo and video items up to 10 items in DB project."""
        p = db.create_reel_project(title="CapCut Multi Media Reel")
        self.assertIsNotNone(p)
        proj_id = p["id"]

        sample_png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02\x00\x00\x00\x02"
            b"\x08\x02\x00\x00\x00\xfd\xd4\x9as\x00\x00\x00\tIDATx\x9cc\xf8\xff\x9f"
            b"\x01\x00\x03\x02\x01\x02\x8d\xda\xedn\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        upload_dir = os.path.join(BASE_DIR, "static", "assets", "uploads")
        os.makedirs(upload_dir, exist_ok=True)

        media_pool = []
        for idx in range(1, 11):
            fn = f"test_clip_{idx}.png"
            dest = os.path.join(upload_dir, fn)
            with open(dest, "wb") as f:
                f.write(sample_png)
            media_pool.append({
                "id": f"media_{idx}",
                "filename": fn,
                "url": f"/static/assets/uploads/{fn}",
                "type": "video" if idx % 2 == 0 else "photo",
                "duration": 3.0
            })

        tl = p.get("timeline", {})
        tl["media_pool"] = media_pool
        updated = db.update_reel_project(proj_id, timeline=tl)
        self.assertIsNotNone(updated)

        # Retrieve and verify all 10 items persisted
        fetched = db.get_reel_project(proj_id)
        self.assertEqual(len(fetched["timeline"]["media_pool"]), 10)
        self.assertEqual(fetched["timeline"]["media_pool"][0]["type"], "photo")
        self.assertEqual(fetched["timeline"]["media_pool"][1]["type"], "video")

        # Cleanup
        db.delete_reel_project(proj_id)

    def test_02_timeline_tracks_and_voiceover_lane(self):
        """Verify HTML timeline has Ruler, Media, Text, Logo, Music, and Voiceover tracks."""
        html_path = os.path.join(BASE_DIR, "static", "index.html")
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()

        self.assertIn('id="lane-media"', html)
        self.assertIn('id="lane-text"', html)
        self.assertIn('id="lane-logo"', html)
        self.assertIn('id="lane-audio"', html)
        self.assertIn('id="lane-voiceover"', html)
        self.assertIn('🎙️ Voice', html)

    def test_03_trim_handles_and_canvas_interaction_logic(self):
        """Verify reel-studio.js contains trim handles, canvas rotation, corner resize, and snapping."""
        js_path = os.path.join(BASE_DIR, "static", "reel-studio.js")
        with open(js_path, "r", encoding="utf-8") as f:
            js = f.read()

        # Trimming
        self.assertIn("bindTrimHandle", js)
        self.assertIn("reel-trim-handle-left", js)
        self.assertIn("reel-trim-handle-right", js)

        # Interactive Canvas
        self.assertIn("mode: \"rotate\"", js)
        self.assertIn("mode: \"resize\"", js)
        self.assertIn("mode: \"move\"", js)
        self.assertIn("rotation_deg", js)
        self.assertIn("showGuideX", js)
        self.assertIn("showGuideY", js)

        # Voiceover Lane
        self.assertIn("laneVoiceover", js)
        self.assertIn("voiceoverEl", js)

    def test_04_mp4_export_with_hardware_binary(self):
        """Render a real 1080x1920 MP4 reel project via media_gen and verified binary."""
        p = db.create_reel_project(title="CapCut Hardware Export Reel")
        proj_id = p["id"]
        output_mp4 = f"/tmp/test_capcut_reel_output_{proj_id}.mp4"
        if os.path.exists(output_mp4):
            os.remove(output_mp4)

        try:
            path = media_gen.export_reel_project_timeline_mp4(p, output_path=output_mp4)
            self.assertTrue(os.path.exists(path), "Exported MP4 does not exist")
            size = os.path.getsize(path)
            self.assertGreater(size, 200000, f"MP4 file is too small ({size} bytes)")
            print(f"\n[PASS] Verified CapCut Reel Export: {path} ({size} bytes)")
        finally:
            db.delete_reel_project(proj_id)

if __name__ == "__main__":
    unittest.main()
