import unittest
import json
import db
import editorial_engine

class TestPipelineIsolation(unittest.TestCase):
    def test_article_mode_generates_zero_reel(self):
        """Mode 1: Creating an Article + Static Post must produce reel_status='none' and zero reel scenes."""
        bundle = db.create_assignment(
            topic="Finland’s President Stubb Urges Europe to Hold Direct Talks With Putin Over Ukraine War",
            scope="Article + Static Post",
            instructions="Write news article on this subject with focus on diplomacy.",
            links=["https://yle.fi/uutiset"],
            custom_photo={"url": "/assets/photos/finland-nato-defense-diplomacy.jpg", "filename": "stubb-diplomacy.jpg"},
            clips=None,
        )
        self.assertIsNotNone(bundle)
        version = bundle["versions"][-1]

        # Verify Reel is strictly NOT generated
        self.assertEqual(bundle["package"]["reel_status"], "none")
        self.assertIsNone(version["reel"])

        # Verify Article is generated with clean dynamic headline
        art = version["article"]
        self.assertIn("STUBB", art["headline"].upper())
        self.assertNotIn("NVIDIA", art["headline"].upper())
        self.assertNotIn("BLACKWELL", art["headline"].upper())

        # Verify Static Post has 2-3 clean lines matching Stubb
        ig = version["ig_post"]
        self.assertIsNotNone(ig)
        headline_combined = (ig.get("headline_line1", "") + " " + ig.get("headline_line2", "") + " " + ig.get("headline_line3", "")).upper()
        self.assertIn("STUBB", headline_combined)

    def test_reel_mode_generates_reel_scenes(self):
        """Mode 2: Creating a Reel must produce reel_status='pending' with parsed scenes."""
        clips = [
            {"id": 1, "filename": "clip1.jpg", "url": "/assets/sample-clips/clip-1-tram-thumb.jpg", "duration": 3.5},
            {"id": 2, "filename": "clip2.jpg", "url": "/assets/sample-clips/clip-2-winter-thumb.png", "duration": 3.5},
        ]
        bundle = db.create_assignment(
            topic="Lapland Winter Tourism Hits Historic Highs",
            scope="Reel",
            instructions="3.5s\nIMAGE 1\nLAPLAND WINTER\nTOURISM BOOMS\nRECORD VISITOR NUMBERS\n\n3.5s\nIMAGE 2\nNORTHERN LIGHTS\nDRAW GLOBAL CROWDS\nFLIGHTS FULL",
            clips=clips,
            target_length_sec=15,
        )
        self.assertIsNotNone(bundle)
        version = bundle["versions"][-1]

        self.assertEqual(bundle["package"]["reel_status"], "pending")
        rj = version["reel"]
        self.assertIsNotNone(rj)
        scenes = rj.get("scenes", [])
        self.assertGreaterEqual(len(scenes), 2)
        # Verify outro card is appended
        self.assertTrue(any(s.get("is_outro") for s in scenes))

    def test_headline_split_is_balanced_and_dynamic(self):
        """Verify dynamic headline splitting does not use mock rules."""
        topic = "Posti Launches Sunday Home Delivery in Tampere Region"
        article = {"headline": topic, "summary": "Posti expands services across Pirkanmaa region."}
        lines = editorial_engine.split_headline_into_card_lines(topic, article)
        self.assertIn(len(lines), [2, 3])
        self.assertTrue(all(len(l) > 0 for l in lines))
        # Ensure it contains Posti or Delivery, never canned Nvidia/Tires
        joined = " ".join(lines)
        self.assertIn("POSTI", joined)
        self.assertNotIn("BLACKWELL", joined)

if __name__ == "__main__":
    unittest.main()
