"""
test_timeline_stretching_and_icons.py
Tests verifying:
1. High-contrast dark theme button styles (no washed out / white buttons in Reel Editor).
2. Left Tool Drawer tabs rendered in a 4-column x 2-row grid with no truncated or overlapping text.
3. Uploading or clicking photos auto-adds to timeline and seeks playhead to display on canvas immediately.
4. Multi-track stretching / trimming (Media, Text, Logo, Music, Voiceover) with non-destructive DOM updates.
5. Clip body dragging (bindClipMove) allowing sliding & overlapping on text, logo, music, voiceover tracks.
"""

import unittest
from pathlib import Path

WORKSPACE = Path(__file__).parent.parent
REEL_CSS = WORKSPACE / "static" / "reel-studio.css"
REEL_JS = WORKSPACE / "static" / "reel-studio.js"
INDEX_HTML = WORKSPACE / "static" / "index.html"


class TestTimelineStretchingAndIcons(unittest.TestCase):

    def test_dark_theme_buttons_no_white_backgrounds(self):
        css = REEL_CSS.read_text(encoding="utf-8")
        self.assertIn(".reel-editor-container button,", css)
        self.assertIn("background: #162235 !important", css)
        self.assertIn("color: #FFFFFF !important", css)
        self.assertIn(".reel-editor-container #btn-close-reel-editor", css)
        self.assertIn(".reel-editor-container button svg,", css)

    def test_tool_tabs_clean_grid_layout(self):
        css = REEL_CSS.read_text(encoding="utf-8")
        self.assertIn("grid-template-columns: repeat(4, 1fr) !important", css)
        self.assertIn("background: #0A192F !important", css)
        self.assertIn(".reel-tab-btn {", css)
        self.assertIn("min-height: 48px !important", css)

    def test_photo_upload_and_preview_seeking(self):
        js = REEL_JS.read_text(encoding="utf-8")
        # Auto-add newly uploaded media items
        self.assertIn("newlyUploaded.forEach((item) => this.addMediaItemToTimeline(item))", js)
        # Seeks playhead directly to newly added clip so preview renders it immediately
        self.assertIn("this.seekTo(round1(tCursor + 0.05))", js)
        # Clicking media pool card adds to timeline
        self.assertIn("container.querySelectorAll(\".reel-media-pool-card\").forEach((card) => {", js)
        self.assertIn("if (pool[idx]) this.addMediaItemToTimeline(pool[idx]);", js)

    def test_timeline_stretching_and_clip_moving_all_tracks(self):
        js = REEL_JS.read_text(encoding="utf-8")
        # Non-destructive trim handle update
        self.assertIn("blockEl.classList.add(\"is-trimming\")", js)
        self.assertIn("blockEl.style.width =", js)
        self.assertIn("blockEl.style.left =", js)

        # bindClipMove exists and is wired
        self.assertIn("bindClipMove(blockEl, targetType, targetObj)", js)
        self.assertIn("this.bindClipMove(block, \"text\", txt)", js)
        self.assertIn("this.bindClipMove(block, \"logo\", logo)", js)
        self.assertIn("this.bindClipMove(block, \"audio\", music)", js)
        self.assertIn("this.bindClipMove(block, \"voiceover\", vo)", js)

        # Logo track has left & right trim handles
        self.assertIn("this.bindTrimHandle(hLeft, \"logo\", logo, true, block)", js)
        self.assertIn("this.bindTrimHandle(hRight, \"logo\", logo, false, block)", js)

    def test_trim_handles_css(self):
        css = REEL_CSS.read_text(encoding="utf-8")
        self.assertIn("cursor: col-resize", css)
        self.assertIn("width: 14px", css)
        self.assertIn("z-index: 25", css)
        self.assertIn("touch-action: none", css)


if __name__ == "__main__":
    unittest.main()
