import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import db

class TestThreeWorkspacesE2E(unittest.TestCase):
    def setUp(self):
        db.init_db()

    def test_01_article_and_social_post_creation_zero_reel(self):
        """Verify Article + Social Post creation contains ZERO automated Reel."""
        topic = "Helsinki Winter Cycling Network Expands in 2026"
        instructions = "Highlight heated bicycle lanes and winter maintenance equipment in Baana."
        links = ["https://www.hel.fi/en"]
        
        bundle = db.create_assignment(
            topic=topic,
            scope="Article + Static Post",
            instructions=instructions,
            links=links,
            deadline_at="2026-11-20T10:00:00Z",
        )
        self.assertIsNotNone(bundle)
        pkg = bundle["package"]
        pkg_id = pkg["id"]
        v = bundle["versions"][-1]
        
        # 1. Article Workspace checks
        self.assertIsNotNone(v.get("article"))
        art = v["article"]
        self.assertIn("headline", art)
        self.assertIn("Helsinki", art["headline"])
        self.assertIn("body_html", art)
        self.assertIn("featured_image", art)
        self.assertEqual(pkg["article_status"], "pending")
        
        # 2. Social Post Workspace checks
        self.assertIsNotNone(v.get("ig_post"))
        post = v["ig_post"]
        self.assertIn("headline_line1", post)
        self.assertIn("caption", post)
        self.assertIn("hashtags", post)
        self.assertEqual(pkg["ig_post_status"], "pending")
        
        # 3. ZERO Reel guarantee
        self.assertIsNone(v.get("reel"))
        self.assertEqual(pkg["reel_status"], "none")

        # 4. Independent Article Approval
        cur_ver = pkg["current_version"]
        app_art = db.update_approval(pkg_id, "article", "approved", cur_ver)["package"]
        self.assertEqual(app_art["article_status"], "approved")
        self.assertEqual(app_art["ig_post_status"], "pending")  # Social post stays pending
        self.assertEqual(app_art["reel_status"], "none") # Reel remains none

        # 5. Independent Social Post Approval
        app_post = db.update_approval(pkg_id, "ig_post", "approved", cur_ver)["package"]
        self.assertEqual(app_post["article_status"], "approved")
        self.assertEqual(app_post["ig_post_status"], "approved")
        self.assertEqual(app_post["reel_status"], "none")

        # 6. On-demand Bridge: User chooses to import Article into Reel Editor
        reel_proj = db.import_article_to_reel_project(pkg_id)
        self.assertIsNotNone(reel_proj)
        self.assertEqual(reel_proj["package_id"], pkg_id)
        self.assertIn("timeline", reel_proj)
        self.assertGreater(len(reel_proj["timeline"]["tracks"]["text"]), 0)

        # Cleanup test package & reel project
        db.delete_reel_project(reel_proj["id"])
        # verify reel deleted
        self.assertIsNone(db.get_reel_project(reel_proj["id"]))

    def test_02_reel_editor_workspace_isolation(self):
        """Verify Reel Editor operates completely independently without affecting articles."""
        proj = db.create_reel_project(title="Independent Lapland Snowmobiling Reel")
        self.assertIsNotNone(proj)
        proj_id = proj["id"]
        self.assertIsNone(proj.get("package_id"))
        self.assertEqual(proj["aspect_ratio"], "9:16")

        # Modify timeline
        timeline = proj["timeline"]
        timeline["tracks"]["text"].append({
            "id": "custom-txt-1",
            "type": "title",
            "content": "LAPLAND ARCTIC SAFARI",
            "start": 0.0,
            "end": 5.0,
            "style": {"font_size": 52, "color": "#ffffff"}
        })
        saved = db.update_reel_project(proj_id, title="Updated Lapland Safari", timeline=timeline)
        self.assertTrue(saved)

        fetched = db.get_reel_project(proj_id)
        self.assertEqual(fetched["title"], "Updated Lapland Safari")
        self.assertEqual(len(fetched["timeline"]["tracks"]["text"]), 3) # default hook title + subtitle + custom-txt-1

        # Delete project
        db.delete_reel_project(proj_id)
        self.assertIsNone(db.get_reel_project(proj_id))

if __name__ == "__main__":
    unittest.main()
