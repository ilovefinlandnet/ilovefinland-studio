import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import db

class TestArticleSuggestionsRedesign(unittest.TestCase):
    def setUp(self):
        db.init_db()

    def test_01_get_weekly_plan_and_enrichment(self):
        ideas = db.get_weekly_plan()
        self.assertIsInstance(ideas, list)
        self.assertGreater(len(ideas), 0)
        
        # Verify enrichment
        first = ideas[0]
        self.assertIn("title", first)
        self.assertIn("section", first)
        self.assertIn("category", first)
        self.assertIn("outlet", first)
        self.assertTrue(len(first["outlet"]) > 0)
        self.assertIn("is_covered", first)
        self.assertIn("published_time", first)

    def test_02_save_unsave_dismiss_recover_flow(self):
        ideas = db.get_weekly_plan()
        self.assertGreater(len(ideas), 0)
        test_id = ideas[0]["id"]

        # 1. Save
        res_save = db.save_plan_idea(test_id)
        self.assertEqual(res_save["status"], "saved")
        conn = db.get_connection()
        row = conn.execute("SELECT status FROM plan_ideas WHERE id = ?", (test_id,)).fetchone()
        self.assertEqual(row["status"], "saved")

        # 2. Unsave
        res_unsave = db.unsave_plan_idea(test_id)
        self.assertEqual(res_unsave["status"], "suggested")
        row = conn.execute("SELECT status FROM plan_ideas WHERE id = ?", (test_id,)).fetchone()
        self.assertEqual(row["status"], "suggested")

        # 3. Dismiss
        res_dismiss = db.dismiss_plan_idea(test_id)
        self.assertEqual(res_dismiss["status"], "dismissed")
        row = conn.execute("SELECT status FROM plan_ideas WHERE id = ?", (test_id,)).fetchone()
        self.assertEqual(row["status"], "dismissed")

        # 4. Recover
        res_rec = db.recover_plan_idea(test_id)
        self.assertEqual(res_rec["status"], "suggested")
        row = conn.execute("SELECT status FROM plan_ideas WHERE id = ?", (test_id,)).fetchone()
        self.assertEqual(row["status"], "suggested")
        conn.close()

    def test_03_scan_runs_tracking(self):
        # Record a test scan run
        run_info = db.record_scan_run(success=True, items_found=35, items_added=3, message="Test scan")
        self.assertTrue(run_info["success"])
        self.assertEqual(run_info["items_found"], 35)

        # Retrieve last scan
        last = db.get_last_scan_info()
        self.assertIsNotNone(last)
        self.assertEqual(last["success"], 1)
        self.assertIn("ran_at", last)

    def test_04_infer_outlet_names(self):
        self.assertEqual(db.infer_outlet_name("https://yle.fi/uutiset/123", ""), "Yle Uutiset")
        self.assertEqual(db.infer_outlet_name("https://yle.fi/news/456", "english"), "Yle News (English)")
        self.assertEqual(db.infer_outlet_name("https://en.ilmatieteenlaitos.fi/warnings", ""), "Ilmatieteen laitos (FMI)")
        self.assertEqual(db.infer_outlet_name("https://www.is.fi/kotimaa", ""), "Ilta-Sanomat")
        self.assertEqual(db.infer_outlet_name("https://slush.org", ""), "Slush Official")

if __name__ == "__main__":
    unittest.main()
