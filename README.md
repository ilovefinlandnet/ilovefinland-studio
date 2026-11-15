# ILoveFinland Studio (Milestone 1 — Local Review & Revision Prototype)

Private, mobile-friendly editorial review app, completely separate from the live WordPress site.

## Run Locally

```bash
python3 app.py
```

Open `http://127.0.0.1:8787` in your browser (or mobile responsive mode).

## Run Automated Review Cycle Test

```bash
python3 tests/test_review_cycle.py
```

## What Works in Milestone 1

- **Mobile-first private review UI** (`/`): Single-column tabbed view on mobile, side-by-side workspace on desktop.
- **FI-Alert sample package** (local reconstruction, clearly labeled):
  - Straight-news English article with key fact first, short description, body, and linked official sources (`112.fi`, `intermin.fi`, `traficom.fi`).
  - Playable 9:16 vertical Reel (`HTML5 Canvas` + `nordic-pulse.wav` sample music) with original ILoveFinland heart logo (white river detail preserved), 4:5 profile-grid safe-area overlay toggle, 4:5 cover crop preview, caption, music credit, and `5/5` hashtags.
  - Zero synthetic narration (on-screen text + music only).
- **Separate approvals**: Article and Reel can be approved independently.
- **Comment-to-revision loop**: Leaving a comment (e.g., `"move the logo lower and make the second line bigger"`) generates `v2`, preserves `v1` in the version switcher, resets approval on the revised asset, and asks for re-approval.

## What Needs Connecting for Full Automation

1. **Automated Trend Research**: Connect Finnish news RSS/APIs (Yle, STT, Traficom, 112/pelastustoimi, THL) and social trend signals.
2. **LLM & Media Production Pipeline**: Connect an editorial LLM for drafting + FFmpeg/video rendering for MP4 export, licensed stock/original media library, and optional human voice-note upload.
3. **Performance Feedback Loop**: Connect Instagram Insights / TikTok Analytics APIs so format, hook, pacing, and music choices use real historical performance data.
4. **Publishing & Auth**: Connect WordPress REST API (application passwords/OAuth), Meta Graph API / TikTok Content Posting API, and private authentication (e.g., Tailscale, Cloudflare Access, or OAuth) for phone access outside localhost.
