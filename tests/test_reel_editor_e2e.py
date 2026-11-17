import os
import sys
import json
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import db
import media_gen

class TestReelEditorE2E(unittest.TestCase):
    def setUp(self):
        db.init_db()

    def test_01_create_blank_project_and_persist(self):
        p = db.create_reel_project(title="Test E2E Aurora Reel")
        self.assertIsNotNone(p)
        self.assertEqual(p["title"], "Test E2E Aurora Reel")
        self.assertEqual(p["aspect_ratio"], "9:16")
        self.assertEqual(p["width"], 1080)
        self.assertEqual(p["height"], 1920)
        
        proj_id = p["id"]
        # Verify retrieved from DB
        fetched = db.get_reel_project(proj_id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["title"], "Test E2E Aurora Reel")
        self.assertIn("timeline", fetched)
        self.assertIn("tracks", fetched["timeline"])
        self.assertIn("outro", fetched["timeline"]["tracks"])
        self.assertEqual(fetched["timeline"]["tracks"]["outro"]["website"], "ilovefinland.net")

        # Test duplicate
        dup = db.duplicate_reel_project(proj_id)
        self.assertIsNotNone(dup)
        self.assertTrue(dup["title"].endswith("(Copy)"))

        # Test archive & delete
        arch = db.archive_reel_project(dup["id"], is_archived=True)
        self.assertTrue(arch)
        
        del_res = db.delete_reel_project(dup["id"])
        self.assertTrue(del_res)
        self.assertIsNone(db.get_reel_project(dup["id"]))

        # Cleanup original
        db.delete_reel_project(proj_id)

    def test_02_import_article_to_reel(self):
        pkgs = db.list_packages()
        if not pkgs:
            self.skipTest("No packages in db to import")
        pkg_id = pkgs[0]["id"]
        p = db.import_article_to_reel_project(pkg_id)
        self.assertIsNotNone(p)
        self.assertEqual(p["package_id"], pkg_id)
        self.assertIn("tracks", p["timeline"])
        self.assertGreater(len(p["timeline"]["tracks"]["text"]), 0)
        
        # Cleanup
        db.delete_reel_project(p["id"])

    def test_03_timeline_update_and_slice(self):
        p = db.create_reel_project(title="Slice and Trim Reel")
        proj_id = p["id"]
        timeline = p["timeline"]
        timeline["duration_sec"] = 10.0
        
        # Add 2 media clips with virtual slicing
        timeline["tracks"]["media"] = [
            {
                "id": "clip-1",
                "url": "/assets/sample_clip_1.mp4",
                "type": "video",
                "start_sec": 0.0,
                "end_sec": 5.0,
                "src_in": 1.0,
                "src_out": 6.0,
                "volume": 0.8
            },
            {
                "id": "clip-2",
                "url": "/assets/sample_clip_2.mp4",
                "type": "video",
                "start_sec": 5.0,
                "end_sec": 10.0,
                "src_in": 0.0,
                "src_out": 5.0,
                "volume": 1.0
            }
        ]
        
        # Add 2 text tracks
        timeline["tracks"]["text"] = [
            {
                "id": "txt-1",
                "type": "title",
                "text": "FINLAND'S WINTER SECRET",
                "start_sec": 0.0,
                "end_sec": 4.5,
                "x_pct": 50.0,
                "y_pct": 35.0,
                "font_size": 42,
                "color": "#FFFFFF",
                "bg_color": "#003580"
            },
            {
                "id": "txt-2",
                "type": "subtitle",
                "text": "Lapland's frozen wilderness",
                "start_sec": 4.5,
                "end_sec": 10.0,
                "x_pct": 50.0,
                "y_pct": 65.0,
                "font_size": 24,
                "color": "#38BDF8",
                "bg_color": "#0A192F"
            }
        ]
        
        updated = db.update_reel_project(proj_id, title="Slice and Trim Reel (Updated)", timeline=timeline)
        self.assertIsNotNone(updated)
        self.assertEqual(len(updated["timeline"]["tracks"]["media"]), 2)
        self.assertEqual(len(updated["timeline"]["tracks"]["text"]), 2)
        self.assertEqual(updated["duration_sec"], 10.0)

        # Cleanup
        db.delete_reel_project(proj_id)

    def test_04_export_reel_project_mp4_generation(self):
        # Create minimal project for export test
        p = db.create_reel_project(title="Export Test Reel")
        proj_id = p["id"]
        out_path = f"/tmp/test_reel_e2e_{proj_id}.mp4"
        
        try:
            # Test exporter
            res_path = media_gen.export_reel_project_timeline_mp4(p, output_path=out_path)
            self.assertTrue(os.path.exists(res_path))
            self.assertGreater(os.path.getsize(res_path), 50000)
            print(f"\n[PASS] Exported MP4 verified: {res_path} ({os.path.getsize(res_path)} bytes)")
        finally:
            if os.path.exists(out_path):
                os.remove(out_path)
            db.delete_reel_project(proj_id)

if __name__ == "__main__":
    unittest.main()
