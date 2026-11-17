"""
test_reel_inspector_and_calendar_design.py
Tests verifying:
1. Reel Editor CapCut-style 4-panel architecture (Left drawer, Center 9:16 preview, Right inspector, Bottom resizable timeline).
2. Right inspector cannot be covered by the timeline or placed underneath the preview.
3. 8 editing modes (photo, video, text, logo, music, voiceover, transition, visual effects).
4. Publishing Calendar layout and styling matching the user's reference screenshot.
"""

import unittest
from pathlib import Path

WORKSPACE = Path(__file__).parent.parent
INDEX_HTML = WORKSPACE / "static" / "index.html"
REEL_CSS = WORKSPACE / "static" / "reel-studio.css"
REEL_JS = WORKSPACE / "static" / "reel-studio.js"
STYLES_CSS = WORKSPACE / "static" / "styles.css"
APP_JS = WORKSPACE / "static" / "app.js"


class TestReelInspectorAndCalendarDesign(unittest.TestCase):

    def test_reel_editor_4_panel_html_structure(self):
        html = INDEX_HTML.read_text(encoding="utf-8")
        
        # 1. Left Tool Drawer with tabs & panels
        self.assertIn('id="reel-left-drawer"', html)
        self.assertIn('data-drawer="media"', html)
        self.assertIn('data-drawer="transitions"', html)
        self.assertIn('data-drawer="effects"', html)
        self.assertIn('data-drawer="text"', html)
        self.assertIn('data-drawer="audio"', html)
        self.assertIn('data-drawer="logo"', html)
        self.assertIn('data-drawer="outro"', html)
        self.assertIn('id="drawer-panel-effects"', html)

        # 2. Centre Preview Stage
        self.assertIn('class="reel-center-stage"', html)
        self.assertIn('id="reel-canvas-viewport"', html)
        self.assertIn('class="reel-transport-bar"', html)

        # 3. Dedicated Right Inspector
        self.assertIn('id="reel-inspector-panel"', html)
        self.assertIn('id="inspector-heading"', html)
        self.assertIn('id="inspector-content"', html)

        # 4. Timeline Resizer & Multi-Track Timeline
        self.assertIn('id="reel-timeline-resizer"', html)
        self.assertIn('class="reel-bottom-timeline"', html)

    def test_reel_editor_css_grid_and_inspector_placement(self):
        css = REEL_CSS.read_text(encoding="utf-8")
        
        # Grid rows for container (header, workspace, resizer, timeline)
        self.assertIn("grid-template-rows: 52px 1fr auto auto", css)
        self.assertIn("height: calc(100vh - 30px)", css)
        self.assertIn("overflow: hidden", css)

        # 3-column workspace body
        self.assertIn("grid-template-columns: 290px minmax(320px, 1fr) 330px", css)

        # Center stage 9:16 aspect ratio constraint
        self.assertIn("aspect-ratio: 9 / 16", css)
        self.assertIn("max-height: calc(100% - 46px)", css)

        # Inspector panel is a static grid column on desktop, never absolute under preview
        self.assertIn(".reel-right-inspector {", css)
        self.assertIn("overflow-y: auto", css)

        # Desktop override forces static positioning
        self.assertIn("position: static !important", css)
        self.assertIn("transform: none !important", css)

        # Timeline resizer handle styles
        self.assertIn(".reel-timeline-resizer {", css)
        self.assertIn("cursor: row-resize", css)

        # Clickable transition pill on seam
        self.assertIn(".reel-timeline-trans-btn", css)

    def test_reel_studio_js_8_editing_modes_and_helpers(self):
        js = REEL_JS.read_text(encoding="utf-8")

        # Resizer binding & mobile threshold
        self.assertIn("bindTimelineResizer()", js)
        self.assertIn("window.innerWidth <= 580", js)

        # Clickable transition buttons rendered in timeline seam
        self.assertIn("reel-timeline-trans-btn", js)

        # getFilterString helper & canvas filter integration
        self.assertIn("getFilterString(name)", js)
        self.assertIn("nordic_warm", js)
        self.assertIn("arctic_vivid", js)
        self.assertIn("mono_bnw", js)
        self.assertIn("vintage_film", js)
        self.assertIn("high_contrast", js)
        self.assertIn("ctx.filter = this.getFilterString(clip.filter)", js)

        # 8 editing modes supported in inspector
        self.assertIn('this.selectedTrack === "media"', js)
        self.assertIn('this.selectedTrack === "text"', js)
        self.assertIn('this.selectedTrack === "logo"', js)
        self.assertIn('this.selectedTrack === "music"', js)
        self.assertIn('this.selectedTrack === "voiceover"', js)
        self.assertIn('this.selectedTrack === "transition"', js)
        self.assertIn('this.selectedTrack === "effect"', js)
        self.assertIn('renderEmptyInspector()', js)

        # Transition inspector controls
        self.assertIn("prop-trans-type", js)
        self.assertIn("prop-slider-transdur-direct", js)
        self.assertIn("btn-prop-apply-trans-all", js)
        self.assertIn("btn-prop-remove-trans", js)
        self.assertIn("btn-prop-reset-trans", js)

    def test_publishing_calendar_design_matches_reference_screenshot(self):
        html = INDEX_HTML.read_text(encoding="utf-8")
        styles = STYLES_CSS.read_text(encoding="utf-8")
        app_js = APP_JS.read_text(encoding="utf-8")

        # HTML elements
        self.assertIn('class="calendar-main-title">Publishing Calendar</h1>', html)
        self.assertIn('class="calendar-sub-title">Plan, schedule and track your content</p>', html)
        self.assertIn('class="calendar-header-icon"', html)
        self.assertIn('id="cal-month-display"', html)
        self.assertIn('class="cal-tz-pill">Europe/Helsinki</div>', html)
        self.assertIn('class="cal-segmented-capsule"', html)
        self.assertIn('Week Agenda', html)
        self.assertIn('id="btn-cal-plan-toggle" class="cal-plan-week-btn">Plan My Week</button>', html)
        self.assertIn('id="calendar-body"', html)
        self.assertIn('class="cal-legend-bar"', html)
        self.assertIn('Illustrative calendar layout — example items only.', html)

        # CSS styling matching dark theme palette
        self.assertIn(".calendar-hero-card {", styles)
        self.assertIn("background: #0B0F16", styles)
        self.assertIn(".cal-dark-cell {", styles)
        self.assertIn(".cal-pill-article {", styles)
        self.assertIn(".cal-pill-social {", styles)
        self.assertIn(".cal-pill-reel {", styles)
        self.assertIn(".cal-pill-published {", styles)

        # JS rendering matching exact pills from reference screenshot
        self.assertIn('title="Article">Article</div>', app_js)
        self.assertIn('title="Social Post">Social</div>', app_js)
        self.assertIn('title="Reel">Reel</div>', app_js)
        self.assertIn('title="Published">Published</div>', app_js)


if __name__ == "__main__":
    unittest.main()
