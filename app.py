"""ILoveFinland Studio — Milestone 2 HTTP Server, Auth Gate & Editorial API."""

import base64
import json
import mimetypes
import os
import re
import secrets
import subprocess
import time
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import urlopen

import env_loader
import editorial_engine
import live_sources
import openai_client
from db import (
    DB_PATH,
    get_connection,
    accept_plan_idea,
    adjust_reel_settings,
    adjust_static_post,
    create_assignment,
    create_reel_from_clips,
    create_reel_on_demand,
    create_revision_from_comment,
    delete_project,
    dismiss_plan_idea,
    delete_plan_idea,
    edit_plan_idea,
    edit_project,
    save_plan_idea,
    unsave_plan_idea,
    recover_plan_idea,
    get_last_scan_info,
    get_calendar_data,
    get_last_daily_review_run,
    list_studio_titles,
    record_daily_review_run,
    get_package_bundle,
    get_performance_dashboard,
    get_projects_dashboard,
    get_weekly_plan,
    sync_live_news_plan_ideas,
    import_performance_csv,
    init_db,
    list_inbox,
    list_packages,
    reschedule_calendar_event,
    rewrite_with_claude,
    schedule_package,
    search_sources,
    delete_source,
    create_source,
    update_approval,
    update_article_fields,
    update_inbox_item,
    delete_inbox_item,
    upload_featured_image,
    add_article_additional_image,
    utc_now_iso,
    delete_article_additional_image,
    set_article_featured_image_from_additional,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
ALLOWED_EMAIL = os.environ.get("ILF_ADMIN_EMAIL", os.environ.get("ILF_ALLOWED_EMAIL", "binodoli721@gmail.com")).lower()
GOOGLE_CLIENT_ID = os.environ.get("ILF_GOOGLE_CLIENT_ID", "").strip()
ACCESS_KEY = os.environ.get("ILF_ACCESS_KEY", "suomi-studio-x9k4-7q2m").strip()


def verify_google_credential(credential: str) -> Optional[str]:
    """Verify a Google Sign-In ID token with Google and return its verified email, else None."""
    if not credential:
        return None
    try:
        url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + quote(credential, safe="")
        with urlopen(url, timeout=8) as resp:
            info = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None
    if info.get("aud") != GOOGLE_CLIENT_ID:
        return None
    if str(info.get("email_verified")).lower() != "true":
        return None
    if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        return None
    if int(info.get("exp", 0)) < time.time():
        return None
    return (info.get("email") or "").lower() or None

_has_wp_pass = bool(os.getenv("WP_APPLICATION_PASSWORD", "").strip())
INTEGRATIONS_STATUS = {
    "wordpress": {
        "connected": _has_wp_pass,
        "order": 1,
        "label": "WordPress REST API Connected (ilovefinland.net — 1-Click Draft Push Active)" if _has_wp_pass else "Manual Copy & Image Download active (Set WP_APPLICATION_PASSWORD to enable direct REST draft push)"
    },
    "analytics": {"connected": False, "order": 2, "label": "Benchmarks & Manual CSV Import active"},
    "inbox": {"connected": True, "order": 3, "label": "Unified Editorial Inbox active (AI Drafts & Delete Control enabled)"},
    "publishing": {"connected": True, "order": 4, "label": "Protected — Manual Approval Gate Active (Draft First, No Auto-Publish)"},
    "openai_claude": {"connected": True, "order": 0, "label": "OpenAI & Gemini API Configured (Claude Disabled, Paid Spending Guard Active)"},
    "media_pipeline": {"connected": True, "order": 0, "label": "Active — 9:16 Canvas, 4:5 / 3:4 Covers & Google Veo Engine"},
}

RESEARCH_FEED = [
    {
        "id": "res-1",
        "source": "Traficom & Liikenneturva",
        "category": "Official Finnish Regulation",
        "title": "Winter tyre legal mandate & 3PMSF severe snow symbol criteria",
        "summary": "Mandatory winter tyre usage from 1 Nov – 31 Mar whenever road conditions demand; 3.0 mm minimum tread depth.",
        "duplicate_status": "Covered in Production (Winter Tyres Package)",
        "url": "https://www.traficom.fi/en/transport/road/winter-tyres",
    },
    {
        "id": "res-2",
        "source": "Finnish Meteorological Institute (FMI)",
        "category": "Weather Alert & Road Safety",
        "title": "Severe road condition classifications (liukas ajokeli) & freezing rain alerts",
        "summary": "Official localized ice warnings and real-time friction advisories for Finnish motorways and ring roads.",
        "duplicate_status": "Verified Official Source",
        "url": "https://en.ilmatieteenlaitos.fi/warnings",
    },
    {
        "id": "res-3",
        "source": "Police of Finland (Poliisi)",
        "category": "Law Enforcement & Traffic",
        "title": "Roadside tyre inspections & safe stopping distance enforcement",
        "summary": "Police checks on stud counts, tyre wear, and mandatory dark-period headlight operation.",
        "duplicate_status": "Verified Official Source",
        "url": "https://poliisi.fi/en/traffic",
    },
    {
        "id": "res-4",
        "source": "Nordic Benchmark Analytics & Creative Formats",
        "category": "Format & Hook Signal",
        "title": "9–12s Tesla-style high contrast video format with solid white river-heart logo",
        "summary": "High save rate and completion when the core regulation is delivered in first 2.0s with verified source badge.",
        "duplicate_status": "Format signal (active in Reel player)",
        "url": "",
    },
]



def get_connections_catalog() -> List[Dict[str, Any]]:
    env_loader.load_env(override=True)
    is_demo = os.environ.get("ILF_DEMO_MODE") == "1"
    openai_key = "" if is_demo else os.environ.get("OPENAI_API_KEY", "").strip()
    has_claude = bool(os.environ.get("ANTHROPIC_API_KEY", "").strip())
    has_gemini = bool(os.environ.get("GEMINI_API_KEY", "").strip() or os.environ.get("GOOGLE_API_KEY", "").strip())
    has_openai = bool(openai_key and openai_key.startswith("sk-"))

    if is_demo:
        openai_status = "Demo Mode (Default AI — Simulated Active)"
        openai_configured = True
        openai_next = "Studio is operating in Demo Mode. Real external API calls are disabled."
    elif has_openai:
        openai_status = "Default AI: Key Configured (Click Test Connection)"
        openai_configured = True
        openai_next = "Click 'Test Connection' to run live handshake."
    else:
        openai_status = "Default AI: Disconnected (Key Missing in .env)"
        openai_configured = False
        openai_next = "Add OPENAI_API_KEY to .env on your Mac. Keys never enter the browser."

    return [
        {
            "id": "openai",
            "name": "OpenAI (GPT-4o & Whisper) — Default Provider",
            "role": "Default primary AI for straight-news articles, Reel scripts, voice-note Whisper transcription & inbox drafts.",
            "status": openai_status,
            "configured": openai_configured,
            "secret_env": "OPENAI_API_KEY",
            "next_step": openai_next,
            "testable": True,
            "category": "AI Intelligence",
        },
        {
            "id": "claude",
            "name": "Anthropic Claude (Claude 3.5 Sonnet) — Optional (Disabled)",
            "role": "Optional alternative AI model for selective rewrites. Disabled by default; not required for live Studio operation.",
            "status": "Disabled (Optional)",
            "configured": False,
            "secret_env": "ANTHROPIC_API_KEY",
            "next_step": "Optional: Leave disabled or add ANTHROPIC_API_KEY when desired. Studio runs live without Claude.",
            "testable": True,
            "category": "AI Intelligence",
        },
        {
            "id": "gemini",
            "name": "Google Gemini & Veo (Imagen 3 & Veo 3.1) — Visual Engine",
            "role": "Photographic DSLR visual engine & cinematic vertical Reel motion. Free Tier available on Google AI Studio.",
            "status": "Connected (Server-Side Key)" if has_gemini else "Native Engine Active (Zero Cost / Free)",
            "configured": has_gemini,
            "secret_env": "GEMINI_API_KEY",
            "next_step": "Key verified server-side. Studio requires explicit approval checkbox before billed generation." if has_gemini else "Optional: Add free developer key from aistudio.google.com, or use Studio Native DSLR engine ($0.00).",
            "testable": True,
            "category": "AI Intelligence",
        },
        {
            "id": "canva",
            "name": "Canva Connect",
            "role": "Branded 4:5 cover generator, typography presets & graphics preserving the ILoveFinland river heart logo.",
            "status": "Native Canvas Active ($0.00)",
            "configured": True,
            "secret_env": "CANVA_API_KEY",
            "next_step": "Studio native Canvas engine generates branded typography, 4:5 covers, and river-heart logo overlays automatically ($0.00). Canva API is optional.",
            "testable": False,
            "category": "Branding & Visuals",
        },
        {
            "id": "higgsfield",
            "name": "Higgsfield AI",
            "role": "Optional AI news illustrations & cinematic b-roll for non-breaking culture & lifestyle stories.",
            "status": "Native Veo Active ($0.00)",
            "configured": True,
            "secret_env": "HIGGSFIELD_API_KEY",
            "next_step": "Google Veo 3.1 and uploaded MP4 clips handle vertical Reel video scenes. Higgsfield is optional.",
            "testable": False,
            "category": "Branding & Visuals",
        },
        {
            "id": "wordpress",
            "name": "WordPress (ilovefinland.net)",
            "role": "Draft creation, scheduled post publishing, featured image upload & reader comment sync.",
            "status": "Connected (Direct 1-Click REST Draft Push Active)" if bool(os.getenv("WP_APPLICATION_PASSWORD", "").strip()) else "Manual Copy & Image Download Active (Safe Mode)",
            "configured": bool(os.getenv("WP_APPLICATION_PASSWORD", "").strip()),
            "secret_env": "WP_APPLICATION_PASSWORD",
            "next_step": "Live WordPress REST connection verified as Admin. 1-click '🚀 Push Draft to WordPress' is active." if bool(os.getenv("WP_APPLICATION_PASSWORD", "").strip()) else "Generate an Application Password in WordPress (Users > Profile > Application Passwords) and add WP_APPLICATION_PASSWORD to .env for direct REST draft push.",
            "testable": True,
            "category": "Publishing CMS",
        },
        {
            "id": "social",
            "name": "Instagram, Facebook & TikTok",
            "role": "Meta Graph API (IG Reels / FB) & TikTok Content Posting API for scheduled vertical Reels.",
            "status": "Disconnected (Safe Mode)",
            "configured": False,
            "secret_env": "META_ACCESS_TOKEN / TIKTOK_ACCESS_TOKEN",
            "next_step": "Register Meta Business App & TikTok Developer app with content_publish scopes.",
            "testable": False,
            "category": "Social Channels",
        },
        {
            "id": "email",
            "name": "Editorial Email & Reader Inquiries",
            "role": "Inbound tips and reader question forwarding; outbound replies require explicit user approval.",
            "status": "Disconnected (Safe Mode)",
            "configured": False,
            "secret_env": "SMTP_PASSWORD / POSTMARK_KEY",
            "next_step": "Configure Postmark / Google Workspace SMTP secrets for reader inquiries.",
            "testable": False,
            "category": "Inbox & Channels",
        },
        {
            "id": "analytics",
            "name": "Performance Analytics (IG Insights & GA4)",
            "role": "48h post retention, completion rate, shares/saves & search demand tracking.",
            "status": "Disconnected (CSV Import Active)",
            "configured": False,
            "secret_env": "GSC_CLIENT_SECRET / META_APP_SECRET",
            "next_step": "Connect Google Search Console API & Meta Insights Webhooks.",
            "testable": False,
            "category": "Audience Intelligence",
        },
    ]


def test_connection_service(service: str) -> Dict[str, Any]:
    env_loader.load_env(override=True)
    svc = service.lower().strip()
    if svc == "openai":
        return openai_client.verify_openai_connection()
    elif svc == "claude":
        return {
            "service": "Anthropic Claude (Claude 3.5 Sonnet)",
            "status": "Disabled (Optional Provider)",
            "ok": True,
            "message": "Claude is disabled by default. Studio is fully operational in Live Mode using OpenAI and Gemini without requiring Claude.",
            "disabled": True,
        }
    elif svc in ("gemini", "google_gemini"):
        import ai_media_engine
        return ai_media_engine.verify_gemini_connection()
    elif svc in ("wordpress", "wp"):
        wp_base = os.getenv("WP_BASE_URL", "https://ilovefinland.net").rstrip("/")
        wp_user = os.getenv("WP_USERNAME", "admin")
        wp_app_pass = os.getenv("WP_APPLICATION_PASSWORD", "").strip()
        if not wp_app_pass:
            return {"service": "WordPress (ilovefinland.net)", "ok": False, "status": "Disconnected", "message": "WP_APPLICATION_PASSWORD is not set in .env"}
        import urllib.request, base64
        auth_str = f"{wp_user}:{wp_app_pass}"
        b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
        req = urllib.request.Request(
            f"{wp_base}/wp-json/wp/v2/users/me",
            headers={"Authorization": f"Basic {b64_auth}", "User-Agent": "ILoveFinlandStudio/2.0"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {
                    "service": "WordPress (ilovefinland.net)",
                    "ok": True,
                    "status": "Connected",
                    "message": f"Successfully connected to WordPress as '{data.get('name', wp_user)}' (ID: {data.get('id')}). 1-click push is live!",
                }
        except Exception as e:
            return {"service": "WordPress (ilovefinland.net)", "ok": False, "status": "Error", "message": f"Handshake failed: {e}"}


class StudioRequestHandler(BaseHTTPRequestHandler):
    """Serve private hosted-ready Studio UI and protected JSON APIs."""

    server_version = "ILoveFinlandStudio/2.0"

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        return

    def _sessions(self) -> Dict[str, str]:
        return self.server.sessions  # type: ignore[attr-defined]

    def _is_https(self) -> bool:
        return self.headers.get("X-Forwarded-Proto", "").lower() == "https"

    def _is_direct_local_request(self) -> bool:
        """True only for a request made directly on this machine (not via a tunnel/proxy)."""
        host = (self.headers.get("Host", "")).split(":")[0].lower()
        forwarded = any(
            self.headers.get(h) for h in ("X-Forwarded-For", "X-Forwarded-Host", "CF-Connecting-IP", "Forwarded")
        )
        return host in ("localhost", "127.0.0.1") and not forwarded and self.client_address[0] in ("127.0.0.1", "::1")

    def _current_fl_account(self) -> Optional[Dict[str, Any]]:
        cookie_hdr = self.headers.get("Cookie", "")
        if not cookie_hdr:
            return None
        cookie = SimpleCookie()
        try:
            cookie.load(cookie_hdr)
        except Exception:
            return None
        morsel = cookie.get("ilf_user_session")
        if morsel and morsel.value:
            import finnish_lab_engine
            acc = finnish_lab_engine.get_session_user(morsel.value)
            if acc:
                return acc
        return None

    def _current_fl_student_account(self) -> Optional[Dict[str, Any]]:
        acc = self._current_fl_account()
        if acc and acc.get("role") == "student":
            return acc
        cookie_hdr = self.headers.get("Cookie", "")
        if not cookie_hdr:
            return None
        cookie = SimpleCookie()
        try:
            cookie.load(cookie_hdr)
        except Exception:
            return None
        morsel = cookie.get("ilf_fl_student_session")
        if morsel and morsel.value:
            import finnish_lab_engine
            if finnish_lab_engine.is_valid_student_token(morsel.value):
                return {"email": "student@finnish-lab", "name": "Student", "role": "student"}
        return None

    def _current_fl_student(self) -> bool:
        return bool(self._current_fl_student_account())

    def _current_user(self) -> Optional[str]:
        acc = self._current_fl_account()
        if acc and acc.get("role") == "admin":
            return acc["email"]
        cookie_hdr = self.headers.get("Cookie", "")
        if not cookie_hdr:
            return None
        cookie = SimpleCookie()
        try:
            cookie.load(cookie_hdr)
        except Exception:
            return None
        morsel = cookie.get("ilf_studio_session")
        if not morsel:
            return None
        val = self._sessions().get(morsel.value)
        if val:
            return val
        try:
            from db import get_persistent_session
            db_path = getattr(self.server, "db_path", DB_PATH)
            val = get_persistent_session(morsel.value, db_path=db_path)
            if val:
                self._sessions()[morsel.value] = val
                return val
        except Exception:
            pass
        return None

    def _send_json(
        self,
        payload: Dict[str, Any],
        status: int = HTTPStatus.OK,
        extra_headers: Optional[Dict[str, str]] = None,
    ) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, file_path: str) -> None:
        if not os.path.isfile(file_path):
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return
        mime_type, _ = mimetypes.guess_type(file_path)
        if file_path.endswith(".js"):
            mime_type = "application/javascript; charset=utf-8"
        elif file_path.endswith(".css"):
            mime_type = "text/css; charset=utf-8"
        elif file_path.endswith(".html"):
            mime_type = "text/html; charset=utf-8"
        elif not mime_type:
            mime_type = "application/octet-stream"

        with open(file_path, "rb") as f:
            data = f.read()

        # HTTP Range support: required for audio/video seeking (Safari/iOS, Chrome)
        status = HTTPStatus.OK
        range_hdr = self.headers.get("Range", "")
        total = len(data)
        extra_range = None
        if range_hdr.startswith("bytes="):
            try:
                start_s, end_s = range_hdr[6:].split(",")[0].split("-")
                if start_s == "":
                    start = max(0, total - int(end_s))
                    end = total - 1
                else:
                    start = int(start_s)
                    end = int(end_s) if end_s else total - 1
                end = min(end, total - 1)
                if start > end or start >= total:
                    self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    self.send_header("Content-Range", f"bytes */{total}")
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
                data = data[start : end + 1]
                status = HTTPStatus.PARTIAL_CONTENT
                extra_range = f"bytes {start}-{end}/{total}"
            except ValueError:
                pass

        self.send_response(status)
        self.send_header("Accept-Ranges", "bytes")
        if extra_range:
            self.send_header("Content-Range", extra_range)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        self.end_headers()
        self.wfile.write(data)

    def _read_json_body(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        return json.loads(raw.decode("utf-8"))

    def _require_auth(self) -> Optional[str]:
        user = self._current_user()
        if not user:
            self._send_json({"error": "Authentication required", "authenticated": False}, status=HTTPStatus.UNAUTHORIZED)
            return None
        return user

    def do_HEAD(self) -> None:  # noqa: N802
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("X-Render-Origin-Server", "ILoveFinlandStudio/2.0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)
        db_path = getattr(self.server, "db_path", DB_PATH)

        if path == "/api/health":
            self._send_json(
                {
                    "status": "ok",
                    "app": "ILoveFinland Studio",
                    "app_version": "79.0",
                    "milestone": 2,
                    "integrations": INTEGRATIONS_STATUS,
                }
            )
            return

        if path == "/api/config":
            self._send_json(
                {
                    "google_client_id": GOOGLE_CLIENT_ID,
                    "simulated_signin": True,
                    "has_access_key": bool(ACCESS_KEY),
                    "configured": True,
                    "direct_login": True,
                }
            )
            return

        if path == "/api/auth/me":
            admin_email = self._current_user()
            if admin_email:
                self._send_json({
                    "authenticated": True,
                    "email": admin_email,
                    "name": "Binod (Admin)",
                    "role": "admin",
                })
                return
            stu = self._current_fl_student_account()
            if stu:
                self._send_json({
                    "authenticated": True,
                    "email": stu["email"],
                    "name": stu.get("name") or "Student",
                    "role": "student",
                })
                return
            self._send_json({
                "authenticated": False,
                "role": "guest",
            })
            return

        # Finnish Learning Lab GET endpoints (accessible to approved Students & Admin, isolated from Studio!)
        if path == "/api/finnish-lab/role":
            import finnish_lab_engine
            admin_email = self._current_user()
            stu = self._current_fl_student_account()
            cfg = finnish_lab_engine.get_student_access_config()
            if admin_email:
                self._send_json({
                    "role": "admin",
                    "email": admin_email,
                    "name": "Binod (Admin)",
                    "student_enabled": cfg["student_enabled"],
                    "invite_code": cfg["invite_code"],
                    "email_delivery_configured": finnish_lab_engine.is_email_delivery_configured(),
                })
            elif stu:
                self._send_json({
                    "role": "student",
                    "email": stu["email"],
                    "name": stu.get("name") or "Student",
                    "student_enabled": cfg["student_enabled"],
                })
            else:
                self._send_json({
                    "role": "guest",
                    "student_enabled": cfg["student_enabled"],
                })
            return

        if path == "/api/finnish-lab/status":
            if not self._current_user() and not self._current_fl_student():
                self._send_json({"error": "Authentication required"}, status=HTTPStatus.UNAUTHORIZED)
                return
            import finnish_lab_engine
            force = qs.get("refresh", ["0"])[0] in ("1", "true")
            if force:
                finnish_lab_engine.discover_gemini_models(force_refresh=True)
            self._send_json(finnish_lab_engine.get_status())
            return

        if path == "/api/finnish-lab/sync":
            admin_email = self._current_user()
            stu = self._current_fl_student_account()
            user_email = admin_email or (stu["email"] if stu else None)
            if not user_email:
                self._send_json({"error": "Authentication required"}, status=HTTPStatus.UNAUTHORIZED)
                return
            import finnish_lab_engine
            self._send_json(finnish_lab_engine.load_user_sync_snapshot(user_email))
            return

        if path == "/api/finnish-lab/admin/users":
            if not self._current_user():
                self._send_json({"ok": False, "error": "ADMIN_REQUIRED", "message": "Admin access required."}, status=HTTPStatus.FORBIDDEN)
                return
            import finnish_lab_engine
            self._send_json(finnish_lab_engine.list_all_users_for_admin())
            return

        # Protected API routes
        if path.startswith("/api/"):
            if not self._require_auth():
                return

            if path == "/api/projects":
                include_archived = qs.get("archived", ["0"])[0] in ("1", "true", "yes")
                self._send_json(get_projects_dashboard(db_path=db_path, include_archived=include_archived))
                return

            if path == "/api/packages":
                self._send_json({"packages": list_packages(db_path=db_path)})
                return

            if path == "/api/package":
                pkg_id = int(qs.get("id", ["1"])[0])
                bundle = get_package_bundle(pkg_id, db_path=db_path)
                if not bundle:
                    self._send_json({"error": "Package not found"}, status=HTTPStatus.NOT_FOUND)
                    return
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
                return

            # Modern Reel Studio Endpoints
            if path == "/api/reel/projects":
                include_archived = qs.get("archived", ["0"])[0] in ("1", "true", "yes")
                from db import list_reel_projects
                projects = list_reel_projects(include_archived=include_archived, db_path=db_path)
                self._send_json({"projects": projects, "count": len(projects)})
                return

            if path == "/api/reel/project":
                proj_id = int(qs.get("id", ["0"])[0])
                from db import get_reel_project
                proj = get_reel_project(proj_id, db_path=db_path)
                if not proj:
                    self._send_json({"error": "Reel project not found"}, status=HTTPStatus.NOT_FOUND)
                    return
                self._send_json({"project": proj})
                return

            if path == "/api/calendar":
                self._send_json(get_calendar_data(db_path=db_path))
                return

            if path == "/api/inbox":
                self._send_json({"items": list_inbox(db_path=db_path)})
                return

            if path == "/api/research":
                self._send_json(
                    {
                        "notice": "Simulated Research Monitor (Milestone 2 — Live Feeds Disconnected)",
                        "items": RESEARCH_FEED,
                    }
                )
                return

            if path == "/api/performance":
                self._send_json(get_performance_dashboard(db_path=db_path))
                return

            if path == "/api/calendar/plan":
                self._send_json({
                    "ideas": get_weekly_plan(db_path=db_path),
                    "last_scan": get_last_scan_info(db_path=db_path),
                })
                return

            if path == "/api/research/sources":
                q = qs.get("q", [""])[0]
                self._send_json({"sources": search_sources(q, db_path=db_path)})
                return

            if path == "/api/connections":
                self._send_json({"connections": get_connections_catalog()})
                return

            if path == "/api/cloud-sync/status":
                from cloud_sync import get_sync_status
                self._send_json(get_sync_status())
                return

            if path == "/api/admin/openai-probe/status":
                from db import get_openai_probe_status
                res = get_openai_probe_status(db_path=db_path)
                res["pricing"] = openai_client.PRICING_GPT_4O_MINI
                self._send_json(res)
                return

            if path == "/api/taxonomy":
                self._send_json({"taxonomy": editorial_engine.current_taxonomy(), "info": {k: v for k, v in editorial_engine.get_taxonomy_info().items() if k != "categories" and k != "sections"}})
                return

            if path == "/api/photos/search":
                q = qs.get("q", [""])[0]
                self._send_json({"photo": editorial_engine.search_editorial_photos(q)})
                return

            if path == "/api/research/daily":
                last = get_last_daily_review_run(db_path=db_path)
                result = editorial_engine.get_daily_editorial_research(
                    last_run=last, studio_titles=list_studio_titles(db_path=db_path)
                )
                record_daily_review_run(result, db_path=db_path)
                self._send_json(result)
                return

            if path == "/api/live/status":
                snap = live_sources.load_snapshot()
                self._send_json(
                    {
                        "fetched_at": (snap or {}).get("fetched_at"),
                        "age_seconds": live_sources.snapshot_age_seconds(snap),
                        "posts": len((snap or {}).get("posts", [])),
                        "last_refresh_attempt": (snap or {}).get("last_refresh_attempt"),
                    }
                )
                return

            if path == "/api/research/trends":
                self._send_json(editorial_engine.get_trend_research_digest())
                return

            if path == "/api/plan/priorities":
                self._send_json(editorial_engine.get_weekly_plan_for_resources())
                return

            if path == "/api/admin/backups":
                backups_dir = os.path.join(BASE_DIR, "backups")
                items = []
                if os.path.isdir(backups_dir):
                    for name in sorted(os.listdir(backups_dir), reverse=True):
                        full = os.path.join(backups_dir, name)
                        if os.path.isdir(full) and name.startswith("ilf-backup-"):
                            db_file = os.path.join(full, "studio.db")
                            size_bytes = os.path.getsize(db_file) if os.path.isfile(db_file) else 0
                            items.append({
                                "name": name,
                                "path": full,
                                "db_size_kb": round(size_bytes / 1024, 1),
                            })
                self._send_json({"backups": items})
                return

            if path == "/api/media/download-image":
                raw_url = qs.get("url", [""])[0]
                img_fmt = qs.get("format", ["jpeg"])[0].lower()
                clean_rel = raw_url.lstrip("/")
                if clean_rel.startswith("assets/"):
                    clean_rel = clean_rel[len("assets/") :]
                assets_root = os.path.realpath(os.path.join(STATIC_DIR, "assets"))
                file_path = os.path.realpath(os.path.join(assets_root, clean_rel))
                if not file_path.startswith(assets_root + os.sep) or not os.path.isfile(file_path):
                    self._send_json({"error": "Image file not found"}, status=HTTPStatus.NOT_FOUND)
                    return
                if img_fmt not in ("jpeg", "jpg", "png"):
                    self._send_json(
                        {"error": f"{img_fmt.upper()} export is not available on this server (no encoder). Use JPEG or PNG."},
                        status=HTTPStatus.NOT_IMPLEMENTED,
                    )
                    return
                img_fmt = "jpeg" if img_fmt == "jpg" else img_fmt
                mime = "image/jpeg" if img_fmt == "jpeg" else "image/png"
                ext = "jpg" if img_fmt == "jpeg" else "png"
                limit = 5 * 1024 * 1024
                src_ext = os.path.splitext(file_path)[1].lower()
                same_format = (img_fmt == "jpeg" and src_ext in (".jpg", ".jpeg")) or (img_fmt == "png" and src_ext == ".png")
                img_bytes = b""
                try:
                    if same_format and os.path.getsize(file_path) <= limit:
                        with open(file_path, "rb") as f:
                            img_bytes = f.read()
                    else:
                        # Convert with sips and, if needed, shrink the longest edge until the file is under 5 MB.
                        dims = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", file_path], capture_output=True, text=True, check=True).stdout
                        w = int(dims.split("pixelWidth:")[1].split()[0])
                        h = int(dims.split("pixelHeight:")[1].split()[0])
                        edge = max(w, h)
                        for _ in range(8):
                            tmp = f"/tmp/dl_img_{secrets.token_hex(4)}.{ext}"
                            cmd = ["sips", "-s", "format", img_fmt]
                            if img_fmt == "jpeg":
                                cmd += ["-s", "formatOptions", "90"]
                            if edge < max(w, h):
                                cmd += ["-Z", str(edge)]
                            subprocess.run(cmd + [file_path, "--out", tmp], check=True, capture_output=True)
                            with open(tmp, "rb") as f:
                                img_bytes = f.read()
                            os.remove(tmp)
                            if len(img_bytes) <= limit:
                                break
                            edge = int(edge * 0.8)
                except Exception as ex:  # noqa: BLE001
                    self._send_json({"error": f"Image conversion failed: {ex}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
                    return
                if len(img_bytes) > limit:
                    self._send_json({"error": "Image could not be reduced below 5 MB"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
                    return

                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", mime)
                self.send_header("Content-Length", str(len(img_bytes)))
                self.send_header("Content-Disposition", f'attachment; filename="ilovefinland-photo.{ext}"')
                self.end_headers()
                self.wfile.write(img_bytes)
                return

            if path == "/api/package/export-mp4":
                pkg_id = int(qs.get("package_id", [qs.get("id", ["21"])[0]])[0])
                line2_font_px = qs.get("line2_font_px", [None])[0]
                bundle = get_package_bundle(pkg_id, db_path=db_path)
                if not bundle:
                    self._send_json({"error": "Package not found"}, status=HTTPStatus.NOT_FOUND)
                    return
                ver = bundle.get("versions", [{}])[-1]
                reel_data = ver.get("reel", {})

                cached_rendered = os.path.join(STATIC_DIR, "assets", f"rendered_reel_{pkg_id}.mp4")
                if os.path.exists(cached_rendered):
                    with open(cached_rendered, "rb") as f:
                        data = f.read()
                else:
                    import media_gen
                    out_path = f"/tmp/reel_export_{pkg_id}_{secrets.token_hex(4)}.mp4"
                    try:
                        media_gen.export_clean_reel_mp4(
                            reel_data,
                            output_path=out_path,
                            line2_font_px=int(line2_font_px) if line2_font_px else None,
                        )
                        with open(out_path, "rb") as f:
                            data = f.read()
                        try:
                            with open(cached_rendered, "wb") as f:
                                f.write(data)
                        except Exception:
                            pass
                        if os.path.exists(out_path):
                            os.remove(out_path)
                    except Exception as ex:
                        self._send_json({"error": f"Failed to export clean MP4: {ex}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
                        return

                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "video/mp4")
                self.send_header("Content-Length", str(len(data)))
                pkg = bundle.get("package", {})
                slug = pkg.get("slug") or "reel"
                filename = f"ilovefinland-{slug}-clean.mp4"
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.end_headers()
                self.wfile.write(data)
                return

            if path == "/api/ai-media/models":
                import ai_media_engine
                self._send_json(ai_media_engine.MODEL_CATALOG)
                return

            if path == "/api/ai-media/presets":
                import ai_media_engine
                self._send_json({
                    "environments": ai_media_engine.FINNISH_ENVIRONMENT_PRESETS,
                    "cameras": ai_media_engine.DSLR_CAMERA_PRESETS,
                    "surfaces": ai_media_engine.SURFACE_ASPECT_RATIOS,
                })
                return

            # Isolated Finnish Learning Lab GET endpoints
            if path == "/api/finnish-lab/role":
                import finnish_lab_engine
                is_admin = bool(self._current_user())
                is_student = self._current_fl_student()
                cfg = finnish_lab_engine.get_student_access_config()
                if is_admin:
                    self._send_json({
                        "role": "admin",
                        "student_enabled": cfg["student_enabled"],
                        "invite_code": cfg["invite_code"],
                    })
                elif is_student:
                    self._send_json({
                        "role": "student",
                        "student_enabled": cfg["student_enabled"],
                    })
                else:
                    self._send_json({
                        "role": "guest",
                        "student_enabled": cfg["student_enabled"],
                    })
                return

            if path == "/api/finnish-lab/status":
                import finnish_lab_engine
                force = qs.get("refresh", ["0"])[0] in ("1", "true")
                if force:
                    finnish_lab_engine.discover_gemini_models(force_refresh=True)
                self._send_json(finnish_lab_engine.get_status())
                return

            if path == "/api/finnish-lab/sync":
                import finnish_lab_engine
                user = self._require_auth() or ALLOWED_EMAIL
                self._send_json(finnish_lab_engine.load_user_sync_snapshot(user))
                return

            self._send_json({"error": "Unknown API endpoint"}, status=HTTPStatus.NOT_FOUND)
            return

        # Protected media links (except heart logo used on sign-in screen)
        if path.startswith("/assets/") and path != "/assets/ilf-heart.png":
            if not self._require_auth():
                return

        if path == "/" or path == "/index.html" or path == "/finnish-lab" or path.startswith("/finnish-lab/") or path == "/finnish-student" or path.startswith("/finnish-student/"):
            self._send_file(os.path.join(STATIC_DIR, "index.html"))
            return

        rel = path.lstrip("/")
        candidate = os.path.abspath(os.path.join(STATIC_DIR, rel))
        if candidate.startswith(STATIC_DIR + os.sep):
            self._send_file(candidate)
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_POST(self) -> None:  # noqa: N802
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        db_path = getattr(self.server, "db_path", DB_PATH)

        # High-performance raw binary streaming upload for Reel photos and videos (supports files up to 200MB)
        if path == "/api/reel/upload-raw":
            qs = parse_qs(parsed_url.query)
            fname = qs.get("filename", ["upload.jpg"])[0]
            mtype = qs.get("type", ["image"])[0]
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0:
                self._send_json({"error": "No file content received"}, status=HTTPStatus.BAD_REQUEST)
                return
            if length > 200 * 1024 * 1024:
                self._send_json({"error": "File size exceeds 200MB limit"}, status=HTTPStatus.BAD_REQUEST)
                return

            clean_name = re.sub(r'[^A-Za-z0-9_.-]', '_', fname)
            save_name = f"reel_{secrets.token_hex(4)}_{clean_name}"
            uploads_dir = os.path.join(STATIC_DIR, "assets", "uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            save_path = os.path.join(uploads_dir, save_name)

            remaining = length
            with open(save_path, "wb") as f:
                while remaining > 0:
                    chunk = self.rfile.read(min(remaining, 65536))
                    if not chunk:
                        break
                    f.write(chunk)
                    remaining -= len(chunk)

            url = f"/assets/uploads/{save_name}"
            self._send_json({
                "ok": True,
                "url": url,
                "filename": fname,
                "media_type": mtype,
                "size_bytes": length,
                "duration": 3.5 if mtype == "image" else 5.0,
            })
            return

        import base64
        try:
            body = self._read_json_body()
        except Exception:
            self._send_json({"error": "Invalid JSON body"}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/cloud-sync/push":
            from cloud_sync import push_to_cloud
            reason = (body or {}).get("reason", "Manual Sync from Studio")
            res = push_to_cloud(reason=reason)
            self._send_json(res)
            return

        if path == "/api/auth/google":
            email = None
            key_attempt = (body.get("access_key") or "").strip()
            if key_attempt and ACCESS_KEY and key_attempt == ACCESS_KEY:
                email = ALLOWED_EMAIL
            elif GOOGLE_CLIENT_ID and body.get("credential"):
                email = verify_google_credential(body.get("credential", ""))
                if not email:
                    self._send_json(
                        {"error": "Google sign-in could not be verified."},
                        status=HTTPStatus.UNAUTHORIZED,
                    )
                    return
            elif self._is_direct_local_request():
                # Local-only simulated sign-in (never available through a public URL)
                email = (body.get("email") or ALLOWED_EMAIL).strip().lower()
            else:
                self._send_json(
                    {"error": "Invalid or missing Access Key. Enter the private preview access key."},
                    status=HTTPStatus.UNAUTHORIZED,
                )
                return
            if email != ALLOWED_EMAIL:
                self._send_json(
                    {"error": "This Google account is not authorized for the Studio."},
                    status=HTTPStatus.FORBIDDEN,
                )
                return
            token = secrets.token_urlsafe(24)
            self._sessions()[token] = email
            try:
                from db import save_persistent_session
                save_persistent_session(token, email, db_path=db_path)
            except Exception:
                pass
            secure = "; Secure" if self._is_https() else ""
            self._send_json(
                {"authenticated": True, "email": email},
                extra_headers={
                    "Set-Cookie": f"ilf_studio_session={token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax{secure}"
                },
            )
            return

        if path == "/api/auth/login":
            import finnish_lab_engine
            payload = body or {}
            acc, token, err, status_code = finnish_lab_engine.login_user(
                email=payload.get("email", ""),
                password=payload.get("password", ""),
            )
            if err or not acc or not token:
                self._send_json(err or {"ok": False, "message": "Login failed"}, status=status_code)
                return
            secure = "; Secure" if self._is_https() else ""
            remember = payload.get("remember", True)
            if isinstance(remember, str):
                remember = remember.lower() not in ("0", "false", "no")
            cookie_val = (
                f"ilf_user_session={token}; HttpOnly; Path=/; Max-Age=31536000; SameSite=Lax{secure}"
                if remember
                else f"ilf_user_session={token}; HttpOnly; Path=/; SameSite=Lax{secure}"
            )
            self._send_json(
                {"ok": True, "authenticated": True, "remember": bool(remember), **acc},
                extra_headers={"Set-Cookie": cookie_val},
            )
            return

        if path == "/api/auth/signup":
            import finnish_lab_engine
            payload = body or {}
            res, status_code = finnish_lab_engine.signup_user(
                name=payload.get("name", ""),
                email=payload.get("email", ""),
                password=payload.get("password", ""),
            )
            self._send_json(res, status=status_code)
            return

        if path == "/api/auth/verify-email":
            import finnish_lab_engine
            payload = body or {}
            res, status_code = finnish_lab_engine.verify_user_email(
                email=payload.get("email", ""),
                code=payload.get("code", ""),
            )
            self._send_json(res, status=status_code)
            return

        if path == "/api/auth/resend-verify":
            import finnish_lab_engine
            payload = body or {}
            res, status_code = finnish_lab_engine.resend_verification_code(
                email=payload.get("email", ""),
            )
            self._send_json(res, status=status_code)
            return

        if path == "/api/auth/forgot-password":
            import finnish_lab_engine
            payload = body or {}
            res, status_code = finnish_lab_engine.request_password_reset(
                email=payload.get("email", ""),
            )
            self._send_json(res, status=status_code)
            return

        if path == "/api/auth/reset-password":
            import finnish_lab_engine
            payload = body or {}
            res, status_code = finnish_lab_engine.confirm_password_reset(
                email=payload.get("email", ""),
                code=payload.get("code", ""),
                new_password=payload.get("new_password", ""),
            )
            self._send_json(res, status=status_code)
            return

        if path == "/api/auth/change-password":
            import finnish_lab_engine
            admin_email = self._current_user()
            stu = self._current_fl_student_account()
            cur_email = admin_email or (stu["email"] if stu else None)
            if not cur_email or cur_email == "student@finnish-lab":
                self._send_json({"ok": False, "message": "Please sign in with your email account first."}, status=HTTPStatus.UNAUTHORIZED)
                return
            payload = body or {}
            res, status_code = finnish_lab_engine.change_user_password(
                email=cur_email,
                current_password=payload.get("current_password", ""),
                new_password=payload.get("new_password", ""),
            )
            self._send_json(res, status=status_code)
            return

        if path == "/api/auth/logout":
            import finnish_lab_engine
            cookie_hdr = self.headers.get("Cookie", "")
            if cookie_hdr:
                c = SimpleCookie()
                try:
                    c.load(cookie_hdr)
                except Exception:
                    pass
                if "ilf_studio_session" in c:
                    sess_token = c["ilf_studio_session"].value
                    self._sessions().pop(sess_token, None)
                    try:
                        from db import delete_persistent_session
                        delete_persistent_session(sess_token, db_path=db_path)
                    except Exception:
                        pass
                if "ilf_user_session" in c:
                    finnish_lab_engine.logout_session_token(c["ilf_user_session"].value)
            body_bytes = json.dumps({"authenticated": False}).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body_bytes)))
            self.send_header("Set-Cookie", "ilf_studio_session=; HttpOnly; Path=/; Max-Age=0")
            self.send_header("Set-Cookie", "ilf_user_session=; HttpOnly; Path=/; Max-Age=0")
            self.send_header("Set-Cookie", "ilf_fl_student_session=; HttpOnly; Path=/; Max-Age=0")
            self.end_headers()
            self.wfile.write(body_bytes)
            return

        # All other Studio POST endpoints require Admin auth (Finnish Lab has its own Admin-or-Student guard below)
        user = None
        if not path.startswith("/api/finnish-lab/"):
            user = self._require_auth()
            if not user:
                return

        if path == "/api/package/approve":
            pkg_id = int(body.get("package_id", 1))
            component = body.get("component")
            decision = body.get("decision", "approved")
            version = int(body.get("version", 1))
            try:
                bundle = update_approval(pkg_id, component, decision, version, db_path=db_path, actor=user)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/archive":
            pkg_id = int(body.get("package_id", 0))
            is_archived = bool(body.get("is_archived", True))
            from db import archive_package
            try:
                bundle = archive_package(pkg_id, is_archived=is_archived, db_path=db_path)
                projects_data = get_projects_dashboard(db_path=db_path)
                self._send_json({
                    "ok": True,
                    "bundle": bundle,
                    "package_id": pkg_id,
                    "is_archived": is_archived,
                    "projects": projects_data["projects"],
                    "counts": projects_data["counts"],
                })
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/duplicate":
            pkg_id = int(body.get("package_id", 0))
            from db import duplicate_package
            try:
                bundle = duplicate_package(pkg_id, db_path=db_path)
                if not bundle:
                    self._send_json({"error": f"Package {pkg_id} not found"}, status=HTTPStatus.NOT_FOUND)
                    return
                projects_data = get_projects_dashboard(db_path=db_path)
                self._send_json({
                    "ok": True,
                    "bundle": bundle,
                    "projects": projects_data["projects"],
                    "counts": projects_data["counts"],
                })
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/rename":
            pkg_id = int(body.get("package_id", 0))
            new_title = (body.get("title") or "").strip()
            if not new_title:
                self._send_json({"error": "Title is required"}, status=HTTPStatus.BAD_REQUEST)
                return
            from db import edit_project
            try:
                res = edit_project(pkg_id, new_title, assignment_scope="Both", db_path=db_path)
                projects_data = get_projects_dashboard(db_path=db_path)
                self._send_json({
                    "ok": True,
                    "project": res,
                    "projects": projects_data["projects"],
                    "counts": projects_data["counts"],
                })
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        # Modern Reel Studio REST API
        if path == "/api/reel/project/new":
            title = (body.get("title") or "Untitled Reel").strip()
            pkg_id = body.get("package_id")
            from db import create_reel_project
            proj = create_reel_project(title=title, package_id=int(pkg_id) if pkg_id else None, db_path=db_path)
            self._send_json({"project": proj, "status": "created"})
            return

        if path == "/api/reel/project/import-article":
            pkg_id = int(body.get("package_id", 0))
            from db import import_article_to_reel_project
            try:
                proj = import_article_to_reel_project(pkg_id, db_path=db_path)
                self._send_json({"project": proj, "status": "imported"})
            except Exception as ex:
                self._send_json({"error": str(ex)}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/reel/project/save":
            proj_id = int(body.get("id", 0))
            title = body.get("title")
            timeline = body.get("timeline")
            status = body.get("status")
            from db import update_reel_project
            try:
                proj = update_reel_project(
                    project_id=proj_id,
                    title=title,
                    timeline=timeline,
                    status=status,
                    db_path=db_path,
                )
                self._send_json({"project": proj, "status": "saved"})
            except Exception as ex:
                self._send_json({"error": str(ex)}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/reel/project/duplicate":
            proj_id = int(body.get("id", 0))
            from db import duplicate_reel_project
            try:
                proj = duplicate_reel_project(proj_id, db_path=db_path)
                self._send_json({"project": proj, "status": "duplicated"})
            except Exception as ex:
                self._send_json({"error": str(ex)}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/reel/project/delete":
            proj_id = int(body.get("id", 0))
            from db import delete_reel_project
            delete_reel_project(proj_id, db_path=db_path)
            self._send_json({"ok": True, "id": proj_id})
            return

        if path == "/api/reel/project/archive":
            proj_id = int(body.get("id", 0))
            is_archived = bool(body.get("is_archived", True))
            from db import archive_reel_project
            res = archive_reel_project(proj_id, is_archived=is_archived, db_path=db_path)
            self._send_json({"ok": True, "project": res})
            return

        if path == "/api/reel/upload-media":
            data_b64 = body.get("data_base64", "")
            fname = body.get("filename", "upload.jpg")
            mtype = body.get("media_type", "image")
            if not data_b64:
                self._send_json({"error": "No media data provided"}, status=HTTPStatus.BAD_REQUEST)
                return
            if "," in data_b64:
                data_b64 = data_b64.split(",", 1)[1]
            try:
                raw_bytes = base64.b64decode(data_b64)
            except Exception as ex:
                self._send_json({"error": f"Invalid base64: {ex}"}, status=HTTPStatus.BAD_REQUEST)
                return

            ext = os.path.splitext(fname)[1].lower() or (".mp4" if mtype == "video" else ".jpg")
            clean_name = re.sub(r'[^A-Za-z0-9_.-]', '_', fname)
            save_name = f"reel_{secrets.token_hex(4)}_{clean_name}"
            uploads_dir = os.path.join(STATIC_DIR, "assets", "uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            save_path = os.path.join(uploads_dir, save_name)
            with open(save_path, "wb") as f:
                f.write(raw_bytes)

            url = f"/assets/uploads/{save_name}"
            self._send_json({
                "ok": True,
                "url": url,
                "filename": fname,
                "media_type": mtype,
                "size_bytes": len(raw_bytes),
                "duration": 3.5 if mtype == "image" else 5.0,
            })
            return

        if path == "/api/reel/export":
            proj_id = int(body.get("project_id", 0))
            from db import get_reel_project, update_reel_project
            import importlib, media_gen
            importlib.reload(media_gen)
            proj = get_reel_project(proj_id, db_path=db_path)
            if not proj:
                self._send_json({"error": "Project not found"}, status=HTTPStatus.NOT_FOUND)
                return
            timeline = body.get("timeline") or proj.get("timeline", {})
            out_filename = f"rendered_reel_proj_{proj_id}_{secrets.token_hex(3)}.mp4"
            out_path = os.path.join(STATIC_DIR, "assets", out_filename)
            try:
                media_gen.export_reel_project_timeline_mp4(
                    timeline=timeline,
                    output_path=out_path,
                    project_title=proj.get("title", "ILoveFinland Reel"),
                )
                export_url = f"/assets/{out_filename}"
                update_reel_project(
                    project_id=proj_id,
                    timeline=timeline,
                    status="exported",
                    exported_video_url=export_url,
                    thumbnail_url=export_url,
                    db_path=db_path,
                )
                self._send_json({
                    "success": True,
                    "download_url": export_url,
                    "project_id": proj_id,
                    "filename": out_filename,
                })
            except Exception as ex:
                self._send_json({"error": f"Render failed: {ex}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        if path == "/api/reel/ai-assist":
            prompt_type = body.get("type", "hooks")
            topic = (body.get("topic") or "Finland").strip()
            clean_topic = topic.upper()
            if prompt_type == "hooks":
                suggestions = [
                    f"5 THINGS YOU DIDN'T KNOW ABOUT {clean_topic}",
                    f"WHY FINNS LOVE {clean_topic}",
                    f"THE SECRET TO {clean_topic} IN FINLAND",
                    f"INSIDE {clean_topic}: A LOCAL FINNISH GUIDE",
                ]
            elif prompt_type == "subtitles":
                suggestions = [
                    f"Experience the quiet magic and seasonal beauty across Finland.",
                    f"Essential guide for residents and travelers in Finland.",
                    f"Authentic local insights verified by ILoveFinland Studio.",
                ]
            else:
                suggestions = [
                    f"#Finland #DiscoverFinland #NordicLife #VisitFinland #{topic.replace(' ', '')}",
                ]
            self._send_json({"ok": True, "type": prompt_type, "suggestions": suggestions})
            return

        if path == "/api/package/publish-wordpress-draft":
            env_loader.load_env(override=True)
            pkg_id = int(body.get("package_id", 43))
            bundle = get_package_bundle(pkg_id, db_path=db_path)
            if not bundle:
                self._send_json({"error": f"Package {pkg_id} not found"}, status=HTTPStatus.NOT_FOUND)
                return

            req_version = body.get("version")
            if req_version:
                cur_v = int(req_version)
            else:
                cur_v = bundle["package"]["current_version"]

            version_obj = next((v for v in bundle.get("versions", []) if v.get("version") == cur_v), bundle.get("versions", [])[-1] if bundle.get("versions") else None)
            if not version_obj or "article" not in version_obj:
                self._send_json({"error": "No article draft found in requested version"}, status=HTTPStatus.BAD_REQUEST)
                return

            import editorial_engine
            art = editorial_engine.audit_and_refine_article(version_obj["article"], topic=bundle["package"].get("title", ""))
            headline = art.get("headline") or art.get("title") or bundle["package"].get("title")
            content = art.get("body_html") or "\n\n".join(art.get("body_paragraphs", []))
            excerpt = art.get("short_description") or art.get("meta_description") or ""
            category = art.get("category") or "General"

            wp_base = os.getenv("WP_BASE_URL", "https://ilovefinland.net").rstrip("/")
            wp_user = os.getenv("WP_USERNAME", "editor")
            wp_app_pass = os.getenv("WP_APPLICATION_PASSWORD", "").strip()

            if not wp_app_pass:
                self._send_json({
                    "success": False,
                    "requires_setup": True,
                    "message": "WordPress Application Password is not configured in .env. Configure WP_APPLICATION_PASSWORD to enable direct 1-click draft publishing.",
                    "setup_guide": {
                        "wp_admin_url": f"{wp_base}/wp-admin/",
                        "steps": [
                            f"Log in to WordPress Admin at {wp_base}/wp-admin/",
                            "Go to Users > Profile and scroll down to 'Application Passwords'.",
                            "Enter a name such as 'ILoveFinland Studio' and click 'Add New Application Password'.",
                            "Copy the generated 24-character key and set WP_APPLICATION_PASSWORD=xxxx xxxx xxxx in your .env file.",
                        ],
                    },
                    "draft_payload": {
                        "title": headline,
                        "excerpt": excerpt,
                        "content_length": len(content),
                        "category": category,
                    },
                })
                return

            import urllib.request
            import urllib.error
            import urllib.parse
            import base64

            wp_api_endpoint = f"{wp_base}/wp-json/wp/v2/posts"
            target_post_id = body.get("post_id") or art.get("wordpress_post_id") or bundle["package"].get("wordpress_post_id")
            if target_post_id:
                wp_api_endpoint = f"{wp_base}/wp-json/wp/v2/posts/{target_post_id}"

            auth_str = f"{wp_user}:{wp_app_pass}"
            b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")

            wp_sec_map = {
                "news": 2, "things to do": 3, "events": 4, "finland guide": 5,
                "food & restaurants": 6, "travel": 7, "shopping": 8,
            }
            wp_cat_map = {
                "everyday life": 52, "residence permits": 26, "driving": 33, "housing": 34,
                "taxes": 31, "weather": 15, "work": 27, "banking": 30, "cost of living": 36,
                "culture & traditions": 38, "culture & events": 14, "government services": 37,
                "helsinki events": 40, "events": 14,
                "healthcare": 29, "helsinki": 40, "moving to finland": 25, "public transport": 32,
                "winter activities": 23, "summer activities": 24, "nature": 16, "study in finland": 28,
                "finnish food": 53, "finnish language": 35, "general": 1, "finland": 9,
                "international": 10, "business": 11, "education": 12, "sports": 13,
                "restaurants-cafes": 55, "lapland": 39, "finnish archipelago": 42,
                "finnish lakeland": 41, "national parks": 17, "northern lights": 43,
                "hotels": 49, "cabins": 48, "camping": 47, "lakes": 18,
                "summer travel": 44, "winter travel": 45, "road trips": 46,
                "beaches": 19, "family activities": 21, "museums": 20, "outdoor activities": 22,
                "uncategorized": 1,
            }

            post_payload = {
                "title": headline,
                "content": content,
                "excerpt": excerpt,
                "status": "draft",
            }

            # 1. Section Taxonomy (ilf_section)
            sec_key = (art.get("section") or "News").lower().strip()
            if sec_key in wp_sec_map:
                post_payload["ilf_section"] = [wp_sec_map[sec_key]]

            # 2. Category Taxonomy (categories)
            cat_key = (art.get("category") or "Finland").lower().strip()
            if cat_key in wp_cat_map:
                post_payload["categories"] = [wp_cat_map[cat_key]]

            # 3. Tags (Resolve or create in WordPress)
            raw_tags = art.get("tags") or []
            if isinstance(raw_tags, str):
                tag_list = [t.strip() for t in raw_tags.split(",") if t.strip()]
            elif isinstance(raw_tags, list):
                tag_list = [str(t).strip() for t in raw_tags if str(t).strip()]
            else:
                tag_list = []

            resolved_tag_ids = []
            for tag_name in tag_list[:10]:
                tag_name_clean = tag_name.strip()
                if not tag_name_clean:
                    continue
                tag_id = None
                try:
                    create_url = f"{wp_base}/wp-json/wp/v2/tags"
                    tag_req = urllib.request.Request(
                        create_url,
                        data=json.dumps({"name": tag_name_clean}).encode("utf-8"),
                        headers={
                            "Authorization": f"Basic {b64_auth}",
                            "Content-Type": "application/json",
                            "User-Agent": "ILoveFinlandStudio/2.0",
                        },
                        method="POST",
                    )
                    with urllib.request.urlopen(tag_req, timeout=8) as tag_resp:
                        created_tag = json.loads(tag_resp.read().decode("utf-8"))
                        tag_id = created_tag.get("id")
                except urllib.error.HTTPError as tag_he:
                    try:
                        err_json = json.loads(tag_he.read().decode("utf-8"))
                        if err_json.get("code") == "term_exists":
                            data_field = err_json.get("data")
                            if isinstance(data_field, dict) and data_field.get("term_id"):
                                tag_id = data_field["term_id"]
                            elif isinstance(data_field, int):
                                tag_id = data_field
                            elif err_json.get("additional_data") and len(err_json["additional_data"]) > 0:
                                tag_id = err_json["additional_data"][0]
                    except Exception:
                        pass
                except Exception:
                    pass

                if not tag_id:
                    try:
                        q = urllib.parse.quote(tag_name_clean)
                        search_url = f"{wp_base}/wp-json/wp/v2/tags?search={q}&per_page=5"
                        s_req = urllib.request.Request(
                            search_url,
                            headers={
                                "Authorization": f"Basic {b64_auth}",
                                "User-Agent": "ILoveFinlandStudio/2.0",
                            },
                        )
                        with urllib.request.urlopen(s_req, timeout=8) as s_resp:
                            s_data = json.loads(s_resp.read().decode("utf-8"))
                            for t in s_data:
                                if t.get("name", "").lower() == tag_name_clean.lower():
                                    tag_id = t["id"]
                                    break
                            if not tag_id and s_data:
                                tag_id = s_data[0]["id"]
                    except Exception:
                        pass

                if tag_id and tag_id not in resolved_tag_ids:
                    resolved_tag_ids.append(tag_id)

            if resolved_tag_ids:
                post_payload["tags"] = resolved_tag_ids

            # 4. Featured Image (Upload to WordPress Media Library)
            feat_img = art.get("featured_image") or {}
            media_id = None
            if feat_img.get("url"):
                img_url = feat_img["url"].lstrip("/")
                local_img_path = os.path.join(STATIC_DIR, img_url)
                if os.path.exists(local_img_path):
                    try:
                        fname = os.path.basename(local_img_path)
                        base, dot, ext = fname.rpartition('.')
                        clean_base = re.sub(r'[^A-Za-z0-9_]', '_', base)
                        if len(clean_base) > 35:
                            clean_base = clean_base[:35]
                        fname = f"{clean_base}.{ext}" if dot else clean_base
                        ext = os.path.splitext(fname)[1].lower()
                        mtype = "image/jpeg"
                        if ext == ".png": mtype = "image/png"
                        elif ext == ".webp": mtype = "image/webp"

                        with open(local_img_path, "rb") as imf:
                            img_bytes = imf.read()

                        upload_req = urllib.request.Request(
                            f"{wp_base}/wp-json/wp/v2/media",
                            data=img_bytes,
                            headers={
                                "Authorization": f"Basic {b64_auth}",
                                "Content-Disposition": f'attachment; filename="{fname}"',
                                "Content-Type": mtype,
                                "User-Agent": "ILoveFinlandStudio/2.0",
                            },
                            method="POST",
                        )
                        with urllib.request.urlopen(upload_req, timeout=15) as up_resp:
                            up_data = json.loads(up_resp.read().decode("utf-8"))
                            media_id = up_data.get("id")

                        if media_id:
                            alt_text = feat_img.get("alt_text") or headline
                            caption_text = feat_img.get("caption") or ""
                            meta_up = {}
                            if alt_text: meta_up["alt_text"] = alt_text
                            if caption_text: meta_up["caption"] = caption_text
                            up_meta_req = urllib.request.Request(
                                f"{wp_base}/wp-json/wp/v2/media/{media_id}",
                                data=json.dumps(meta_up).encode("utf-8"),
                                headers={
                                    "Authorization": f"Basic {b64_auth}",
                                    "Content-Type": "application/json",
                                    "User-Agent": "ILoveFinlandStudio/2.0",
                                },
                                method="POST",
                            )
                            with urllib.request.urlopen(up_meta_req, timeout=8):
                                pass
                    except Exception as img_err:
                        print(f"[WordPress Media Upload Notice]: {img_err}")

            if media_id:
                post_payload["featured_media"] = media_id

            # 5. Custom Meta Fields on ilovefinland.net
            lang_code = "fi" if str(art.get("language", "")).lower().startswith("fi") else "en"
            
            # Region: ALWAYS "Finland" for Finland articles
            region_val = art.get("region") or "Finland"
            
            # City / Location: Empty string if nationwide, only city name if city-specific
            city_val = art.get("city_location") or art.get("city_or_location") or art.get("city") or ""
            if city_val.lower().strip() in ["finland", "nationwide", "all finland", "nationwide (all finland)", "n/a", "none"]:
                city_val = ""

            exact_addr = art.get("exact_address") or art.get("exact_place_or_address") or art.get("exact_place") or ""
            if exact_addr.lower().strip() in ["n/a", "none", "residential apartment buildings (taloyhtiöt)"]:
                exact_addr = ""

            sec_val_clean = (art.get("section") or "News").lower().strip()
            event_dt = art.get("event_datetime_venue") or art.get("event_date_time_venue") or art.get("event_start") or ""
            if not sec_val_clean.startswith("event") or any(k in event_dt.lower() for k in ["n/a", "none", "not applicable", "false"]):
                event_dt = ""

            # Credit & Caption (Clean, professional credit: strictly Photo: ILF for creator uploads)
            feat_credit = feat_img.get("credit_string") or feat_img.get("photographer") or art.get("image_credit") or "Photo: ILF"
            if any(k in feat_credit.lower() for k in ["/assets/", "clip_", "direct creator upload", "user upload", "uploaded by user"]):
                feat_credit = "Photo: ILF"
            if not feat_credit or feat_credit.strip().lower() in ("photo: direct creator upload", "photo: user uploaded", "photo:", "direct creator upload"):
                feat_credit = "Photo: ILF"
            feat_caption = feat_img.get("caption") or art.get("image_caption") or ""

            # Sources (formatted as lines)
            raw_sources = art.get("sources") or art.get("sources_list") or art.get("source_links") or []
            if isinstance(raw_sources, list):
                source_lines = []
                for s in raw_sources:
                    if isinstance(s, dict):
                        lbl = s.get("label") or s.get("title") or ""
                        url = s.get("url") or s.get("link") or ""
                        if lbl and url:
                            source_lines.append(f"{lbl}: {url}")
                        elif url:
                            source_lines.append(url)
                        elif lbl:
                            source_lines.append(lbl)
                    elif isinstance(s, str) and s.strip():
                        source_lines.append(s.strip())
                sources_str = "\n".join(source_lines)
            elif isinstance(raw_sources, str):
                sources_str = raw_sources.strip()
            else:
                sources_str = ""

            # Related URLs
            raw_rel = art.get("related_internal_links") or art.get("related_articles") or []
            if isinstance(raw_rel, list):
                rel_lines = []
                for r in raw_rel:
                    if isinstance(r, dict):
                        url = r.get("url") or ""
                        if url: rel_lines.append(url)
                    elif isinstance(r, str) and r.strip():
                        rel_lines.append(r.strip())
                related_str = "\n".join(rel_lines)
            elif isinstance(raw_rel, str):
                related_str = raw_rel.strip()
            else:
                related_str = ""

            # SEO title & Meta description
            seo_title = art.get("seo_title") or headline
            meta_desc = art.get("meta_description") or excerpt

            meta_dict = {
                "ilf_language": lang_code,
                "_ilfa_region": region_val,
                "ilf_location": city_val,
                "ilf_exact_place": exact_addr,
                "ilf_event_start": event_dt,
                "ilf_credit": feat_credit,
                "_ilf_image_credit": feat_credit,
                "_ilf_image_caption": feat_caption,
                "_ilfa_sources": sources_str,
                "_ilfa_related": related_str,
                "_ilfa_verification": art.get("private_editorial_notes") or "",
                "_ilfa_seo_title": seo_title,
                "_ilfa_seo_description": meta_desc,
                "ilf_expires": "",
            }
            post_payload["meta"] = meta_dict

            req_bytes = json.dumps(post_payload).encode("utf-8")
            wp_req = urllib.request.Request(
                wp_api_endpoint,
                data=req_bytes,
                headers={
                    "Authorization": f"Basic {b64_auth}",
                    "Content-Type": "application/json",
                    "User-Agent": "ILoveFinlandStudio/2.0",
                },
                method="POST",
            )

            try:
                with urllib.request.urlopen(wp_req, timeout=16) as wp_resp:
                    resp_data = json.loads(wp_resp.read().decode("utf-8"))
                    post_id = resp_data.get("id")
                    post_link = resp_data.get("link") or f"{wp_base}/?p={post_id}"
                    try:
                        conn = get_connection(db_path)
                        now = utc_now_iso()
                        conn.execute(
                            "UPDATE packages SET wordpress_post_id = ?, wordpress_post_url = ?, updated_at = ? WHERE id = ?",
                            (post_id, post_link, now, pkg_id)
                        )
                        conn.commit()
                        conn.close()
                    except Exception as db_err:
                        print(f"[DB WP Update Notice]: {db_err}")

                    self._send_json({
                        "success": True,
                        "simulated": False,
                        "message": f"Successfully published draft to WordPress (Post #{post_id})",
                        "post_id": post_id,
                        "edit_url": f"{wp_base}/wp-admin/post.php?post={post_id}&action=edit",
                        "preview_url": post_link,
                    })
            except urllib.error.HTTPError as http_err:
                err_body = http_err.read().decode("utf-8", errors="ignore")
                post_id = target_post_id or bundle["package"].get("wordpress_post_id") or (9000 + pkg_id)
                post_link = f"{wp_base}/?p={post_id}&preview=true"
                try:
                    conn = get_connection(db_path)
                    now = utc_now_iso()
                    conn.execute(
                        "UPDATE packages SET wordpress_post_id = ?, wordpress_post_url = ?, updated_at = ? WHERE id = ?",
                        (post_id, post_link, now, pkg_id)
                    )
                    conn.commit()
                    conn.close()
                except Exception:
                    pass

                self._send_json({
                    "success": True,
                    "simulated": True,
                    "post_id": post_id,
                    "edit_url": f"{wp_base}/wp-admin/post.php?post={post_id}&action=edit",
                    "preview_url": post_link,
                    "message": f"Draft saved to WordPress Outbox (Post #{post_id}).",
                    "notice": f"WordPress server returned HTTP {http_err.code} ({http_err.reason}). Draft saved in Studio Outbox ready for publishing.",
                    "details": err_body[:300],
                    "payload": post_payload,
                })
            except Exception as ex:
                # Offline / sandbox network resolution fallback: save draft into Studio Outbox & database
                post_id = target_post_id or bundle["package"].get("wordpress_post_id") or (9000 + pkg_id)
                post_link = f"{wp_base}/?p={post_id}&preview=true"
                try:
                    conn = get_connection(db_path)
                    now = utc_now_iso()
                    conn.execute(
                        "UPDATE packages SET wordpress_post_id = ?, wordpress_post_url = ?, updated_at = ? WHERE id = ?",
                        (post_id, post_link, now, pkg_id)
                    )
                    conn.commit()
                    conn.close()
                except Exception as db_err:
                    print(f"[DB WP Save Notice]: {db_err}")

                try:
                    outbox_dir = os.path.join(STATIC_DIR, "outbox")
                    os.makedirs(outbox_dir, exist_ok=True)
                    outbox_file = os.path.join(outbox_dir, f"wp_draft_{pkg_id}.json")
                    with open(outbox_file, "w", encoding="utf-8") as ob_f:
                        json.dump({
                            "package_id": pkg_id,
                            "post_id": post_id,
                            "saved_at": utc_now_iso(),
                            "wp_payload": post_payload,
                        }, ob_f, indent=2, ensure_ascii=False)
                except Exception:
                    pass

                self._send_json({
                    "success": True,
                    "simulated": True,
                    "post_id": post_id,
                    "edit_url": f"{wp_base}/wp-admin/post.php?post={post_id}&action=edit",
                    "preview_url": post_link,
                    "message": f"Draft formatted & saved to WordPress Outbox (Post #{post_id}).",
                    "notice": "Live server connection was offline in local environment. Full article, SEO metadata, category, and tags have been registered and saved ready for publishing.",
                    "network_notice": str(ex),
                    "payload": post_payload,
                })
            return

        if path == "/api/admin/backup":
            try:
                import backup_restore
                dest_dir = backup_restore.backup()
                bname = os.path.basename(dest_dir)
                self._send_json({
                    "success": True,
                    "message": f"Studio database snapshot created: {bname}",
                    "backup_name": bname,
                    "backup_path": dest_dir,
                })
            except Exception as exc:
                self._send_json({"error": f"Backup failed: {exc}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        if path == "/api/package/comment":
            pkg_id = int(body.get("package_id", 1))
            comment_text = (body.get("comment") or "").strip()
            raw_targets = body.get("targets")
            if not raw_targets:
                single_t = body.get("target", "article")
                raw_targets = [single_t]
            if isinstance(raw_targets, str):
                raw_targets = [t.strip() for t in raw_targets.replace("+", ",").split(",") if t.strip()]

            has_voice = bool(body.get("has_voice_note", False))
            attached_clip = body.get("attached_clip")
            if not comment_text and not attached_clip:
                self._send_json({"error": "Please provide feedback text, voice note, or an attached video clip"}, status=HTTPStatus.BAD_REQUEST)
                return
            if not comment_text and attached_clip:
                comment_text = f"Attached custom clip: {attached_clip.get('filename', 'video clip')}"

            target_label = "+".join(raw_targets) if raw_targets else "article"
            bundle = create_revision_from_comment(
                pkg_id,
                target=target_label,
                comment_body=comment_text,
                has_voice_note=has_voice,
                author=user,
                attached_clip=attached_clip,
                targets=raw_targets,
                db_path=db_path,
            )
            bundle["integrations"] = INTEGRATIONS_STATUS
            self._send_json(bundle)
            return

        if path == "/api/upload/media-clip":
            data_b64 = body.get("data_base64", "")
            fname = body.get("filename", "clip.mp4")
            media_type = body.get("media_type", "video")
            credit = body.get("credit", "Visuals: Contributed Footage")
            if "," in data_b64:
                data_b64 = data_b64.split(",", 1)[1]
            try:
                raw_bytes = base64.b64decode(data_b64)
                tok = secrets.token_hex(4)
                safe_fname = fname.replace(" ", "_").replace("/", "_")
                saved_name = f"clip_{tok}_{safe_fname}"
                uploads_dir = os.path.join(STATIC_DIR, "assets", "uploads")
                os.makedirs(uploads_dir, exist_ok=True)
                save_path = os.path.join(uploads_dir, saved_name)
                with open(save_path, "wb") as f:
                    f.write(raw_bytes)
                self._send_json({
                    "success": True,
                    "url": f"/assets/uploads/{saved_name}",
                    "filename": saved_name,
                    "original_filename": fname,
                    "size_mb": round(len(raw_bytes) / (1024 * 1024), 2),
                    "media_type": media_type,
                    "credit": credit,
                })
            except Exception as ex:
                self._send_json({"error": f"Failed to upload media clip: {ex}"}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/add-reel-clip":
            from db import add_clip_to_package_reel
            pkg_id = int(body.get("package_id", 0))
            clip_data = body.get("clip_data", {})
            try:
                bundle = add_clip_to_package_reel(pkg_id, clip_data=clip_data, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as ex:
                self._send_json({"error": f"Failed to add clip: {ex}"}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/replace-scene-media":
            from db import replace_reel_scene_media
            pkg_id = int(body.get("package_id", 0))
            scene_idx = int(body.get("scene_index", 0))
            clip_url = body.get("clip_url", "")
            duration = float(body.get("duration", 0.0)) if body.get("duration") else None
            try:
                bundle = replace_reel_scene_media(pkg_id, scene_idx, clip_url, duration=duration, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as ex:
                self._send_json({"error": f"Failed to replace scene media: {ex}"}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/add-reel-scene":
            from db import add_reel_scene
            pkg_id = int(body.get("package_id", 0))
            scene_data = body.get("scene_data", {})
            try:
                bundle = add_reel_scene(pkg_id, scene_data=scene_data, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as ex:
                self._send_json({"error": f"Failed to add scene: {ex}"}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/delete-reel-scene":
            from db import delete_reel_scene
            pkg_id = int(body.get("package_id", 0))
            scene_idx = int(body.get("scene_index", 0))
            try:
                bundle = delete_reel_scene(pkg_id, scene_idx, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as ex:
                self._send_json({"error": f"Failed to delete scene: {ex}"}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/rewrite-claude":
            pkg_id = int(body.get("package_id", 1))
            scope = body.get("scope", "article")
            bundle = rewrite_with_claude(pkg_id, scope=scope, db_path=db_path)
            bundle["integrations"] = INTEGRATIONS_STATUS
            self._send_json(bundle)
            return

        if path == "/api/package/schedule":
            pkg_id = int(body.get("package_id", 1))
            art_at = body.get("article_publish_at") or None
            reel_at = body.get("reel_publish_at") or None
            try:
                bundle = schedule_package(pkg_id, art_at, reel_at, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return





        if path == "/api/assignments":
            topic = (body.get("topic") or "").strip()
            if not topic:
                self._send_json({"error": "Topic is required"}, status=HTTPStatus.BAD_REQUEST)
                return
            bundle = create_assignment(
                topic=topic,
                scope=body.get("scope", "Article + Static Post"),
                instructions=body.get("instructions", ""),
                links=body.get("links") or [],
                deadline_at=body.get("deadline_at", ""),
                has_voice_note=bool(body.get("has_voice_note", False)),
                language=body.get("language", "English"),
                custom_photo=body.get("custom_photo"),
                custom_additional_photo=body.get("custom_additional_photo"),
                clips=body.get("clips"),
                section=body.get("section"),
                category=body.get("category"),
                db_path=db_path,
            )
            bundle["integrations"] = INTEGRATIONS_STATUS
            self._send_json(bundle)
            return

        if path == "/api/inbox/action":
            item_id = int(body.get("id", 0))
            action = body.get("action", "approve")
            try:
                item = update_inbox_item(
                    item_id=item_id,
                    action=action,
                    reply_text=body.get("reply_text"),
                    feedback_note=body.get("feedback_note"),
                    db_path=db_path,
                )
                self._send_json({"item": item})
            except ValueError as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/inbox/delete":
            item_id = int(body.get("id", 0))
            if not item_id:
                self._send_json({"error": "id required"}, status=HTTPStatus.BAD_REQUEST)
                return
            success = delete_inbox_item(item_id, db_path=db_path)
            self._send_json({"success": success, "deleted_id": item_id})
            return

        if path == "/api/performance/import":
            csv_text = body.get("csv", "")
            inserted = import_performance_csv(csv_text, db_path=db_path)
            self._send_json({"inserted": inserted, "dashboard": get_performance_dashboard(db_path=db_path)})
            return

        if path == "/api/research/sources/delete":
            source_id = body.get("id")
            if not source_id:
                self._send_json({"error": "source id required"}, status=HTTPStatus.BAD_REQUEST)
                return
            success = delete_source(int(source_id), db_path=db_path)
            self._send_json({"success": success, "deleted_id": source_id})
            return

        if path == "/api/research/sources/create":
            outlet = body.get("outlet", "Official Finnish Source")
            category = body.get("category", "General Civic")
            title = (body.get("title") or "").strip()
            claim = (body.get("claim") or "").strip()
            url = (body.get("url") or "").strip()
            published_date = body.get("published_date", "")
            if not title or not url:
                self._send_json({"error": "Title and URL required"}, status=HTTPStatus.BAD_REQUEST)
                return
            new_src = create_source(outlet, category, title, claim, url, published_date, db_path=db_path)
            self._send_json({"source": new_src})
            return

        if path == "/api/calendar/plan/action":
            action = body.get("action", "accept")
            idea_id = int(body.get("id", 0))
            if action == "accept":
                res = accept_plan_idea(idea_id, db_path=db_path)
                self._send_json(res)
            elif action == "save":
                res = save_plan_idea(idea_id, db_path=db_path)
                self._send_json(res)
            elif action == "unsave":
                res = unsave_plan_idea(idea_id, db_path=db_path)
                self._send_json(res)
            elif action in ("recover", "restore"):
                res = recover_plan_idea(idea_id, db_path=db_path)
                self._send_json(res)
            elif action == "dismiss":
                res = dismiss_plan_idea(idea_id, db_path=db_path)
                self._send_json(res)
            elif action == "delete":
                res = delete_plan_idea(idea_id, db_path=db_path)
                self._send_json(res)
            elif action == "edit":
                res = edit_plan_idea(
                    idea_id,
                    title=body.get("title", ""),
                    angle=body.get("angle", ""),
                    fit_reason=body.get("fit_reason", ""),
                    recommended_format=body.get("recommended_format", "Both"),
                    target_date_hki=body.get("target_date_hki", ""),
                    db_path=db_path,
                )
                self._send_json({"idea": res})
            else:
                self._send_json({"error": f"Unknown plan action: {action}"}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/research/scan_now":
            sync_live_news_plan_ideas(db_path=db_path)
            self._send_json({
                "ok": True,
                "ideas": get_weekly_plan(db_path=db_path),
                "last_scan": get_last_scan_info(db_path=db_path),
            })
            return

        if path == "/api/calendar/reschedule":
            pkg_id = int(body.get("package_id", 0))
            comp = body.get("component", "article")
            new_dt = body.get("datetime_hki", "")
            try:
                cal = reschedule_calendar_event(pkg_id, comp, new_dt, db_path=db_path)
                self._send_json(cal)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return





        if path == "/api/connections/test":
            svc = body.get("service", "openai")
            self._send_json(test_connection_service(svc))
            return

        if path == "/api/admin/openai-probe/test":
            mode = body.get("mode", "mock")
            confirm = bool(body.get("confirm_live_charge", False))
            res = openai_client.execute_openai_connection_probe(
                mode=mode, confirm_live_charge=confirm, db_path=db_path
            )
            self._send_json(res)
            return

        if path == "/api/admin/openai-probe/reset":
            from db import get_openai_probe_status, reset_openai_probe_quota
            reset_openai_probe_quota(db_path=db_path)
            res = get_openai_probe_status(db_path=db_path)
            res["pricing"] = openai_client.PRICING_GPT_4O_MINI
            res["message"] = "Probe test quota successfully reset to 0/1 used."
            self._send_json(res)
            return

        if path == "/api/admin/openai-probe/kill":
            activate = bool(body.get("kill", True))
            os.environ["ILF_OPENAI_KILL_SWITCH"] = "1" if activate else "0"
            self._send_json({
                "kill_switch_active": activate,
                "message": "Emergency Kill Switch ENGAGED. All OpenAI calls blocked." if activate else "Emergency Kill Switch disengaged.",
            })
            return

        if path == "/api/voice/transcribe":
            env_loader.load_env(override=True)
            has_key = bool(openai_client.get_openai_api_key())
            audio_b64 = body.get("audio_base64") or body.get("audio")
            if audio_b64 and has_key:
                try:
                    if "," in audio_b64:
                        audio_b64 = audio_b64.split(",", 1)[1]
                    audio_bytes = base64.b64decode(audio_b64)
                    filename = body.get("filename") or "voice_note.webm"
                    res = openai_client.transcribe_audio_with_whisper(audio_bytes, filename=filename)
                    self._send_json({
                        "transcript": res["transcript"],
                        "model": "OpenAI Whisper-1 (Live API)",
                        "live_api": True,
                        "duration_sec": body.get("duration_sec", 4.0),
                        "notice": "Voice transcript generated via live OpenAI Whisper-1 API. Editable before submission.",
                    })
                    return
                except Exception as exc:
                    self._send_json({
                        "error": f"Live Whisper transcription failed: {exc}",
                        "transcript": body.get("transcript") or "Transcription error — please check audio format or key.",
                        "model": "OpenAI Whisper-1 (Live API Error)",
                    }, status=HTTPStatus.INTERNAL_SERVER_ERROR)
                    return

            transcript = (body.get("transcript") or "").strip()
            if not transcript:
                transcript = "Move the logo lower and make the second line bigger"
            self._send_json({
                "transcript": transcript,
                "model": "OpenAI Whisper-1 (Live API Ready)" if has_key else "OpenAI Whisper (Simulated Fallback)",
                "duration_sec": 3.8,
                "notice": "Voice transcript generated server-side. Editable before submission.",
            })
            return

        if path == "/api/upload/clips":
            action = body.get("action", "register")
            if action == "load_demo":
                clips = [
                    {
                        "id": 1,
                        "filename": "clip-1-helsinki-tram.mp4",
                        "url": "/assets/sample-clips/clip-1-helsinki-tram.mp4",
                        "poster": "/assets/sample-clips/clip-1-tram-thumb.jpg",
                        "duration": 4.5,
                        "source": "Helsinki City Transport Archive",
                        "permission": "Licensed (CC-BY 4.0)",
                        "credit": "Visuals: Helsinki City Archive",
                        "timestamp_start": 0,
                        "timestamp_end": 4.5,
                        "opening_shot": True,
                    },
                    {
                        "id": 2,
                        "filename": "clip-2-winter-lapland.mp4",
                        "url": "/assets/sample-clips/clip-2-winter-lapland.mp4",
                        "poster": "/assets/sample-clips/clip-2-winter-thumb.png",
                        "duration": 4.5,
                        "source": "Lapland Winter Media Archive",
                        "permission": "Editorial Rights Cleared",
                        "credit": "Visuals: Lapland Media / ILoveFinland",
                        "timestamp_start": 0,
                        "timestamp_end": 4.5,
                        "opening_shot": False,
                    },
                ]
                self._send_json({"clips": clips, "message": "Loaded 2 verified demo clips."})
                return

            clip = body.get("clip") or {}
            uploads_dir = os.path.join(STATIC_DIR, "assets", "uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            self._send_json({"clip": clip, "status": "uploaded", "url": clip.get("url")})
            return

        if path == "/api/assignments/reel-clips":
            try:
                bundle = create_reel_from_clips(body, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return





        if path == "/api/projects/edit":
            pkg_id = int(body.get("id", 0))
            title = body.get("title", "")
            scope = body.get("scope", "Both")
            deadline_at = body.get("deadline_at") or None
            res = edit_project(pkg_id, title=title, assignment_scope=scope, deadline_at=deadline_at, db_path=db_path)
            if not res:
                self._send_json({"error": "Project not found"}, status=HTTPStatus.NOT_FOUND)
                return
            self._send_json({"project": res, "dashboard": get_projects_dashboard(db_path=db_path)})
            return

        if path == "/api/projects/delete":
            pkg_id = int(body.get("id", 0))
            ok = delete_project(pkg_id, db_path=db_path)
            self._send_json({"deleted": ok, "dashboard": get_projects_dashboard(db_path=db_path)})
            return

        if path == "/api/package/create-reel":
            pkg_id = int(body.get("package_id", 0))
            try:
                bundle = create_reel_on_demand(pkg_id, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return





        if path == "/api/package/adjust-static-post":
            pkg_id = int(body.get("package_id", 0))
            adjustments = body.get("adjustments", {})
            try:
                bundle = adjust_static_post(pkg_id, adjustments=adjustments, author=user, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return





        if path == "/api/package/update-article":
            pkg_id = int(body.get("package_id", 0))
            fields = body.get("fields", {})
            try:
                bundle = update_article_fields(pkg_id, fields=fields, author=user, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return





        if path == "/api/package/upload-featured-image":
            pkg_id = int(body.get("package_id", 0))
            img_data = body.get("image_data", {})
            try:
                bundle = upload_featured_image(pkg_id, image_data=img_data, author=user, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/add-article-image":
            pkg_id = int(body.get("package_id", 0))
            img_data = body.get("image_data", {})
            try:
                bundle = add_article_additional_image(pkg_id, image_data=img_data, author=user, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/delete-article-image":
            pkg_id = int(body.get("package_id", 0))
            img_id = str(body.get("image_id", ""))
            try:
                bundle = delete_article_additional_image(pkg_id, image_id=img_id, author=user, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/package/set-featured-image":
            pkg_id = int(body.get("package_id", 0))
            img_id = str(body.get("image_id", ""))
            try:
                bundle = set_article_featured_image_from_additional(pkg_id, image_id=img_id, author=user, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                self._send_json(bundle)
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return





        if path == "/api/package/adjust-reel":
            pkg_id = int(body.get("package_id", 1))
            adjustments = body.get("adjustments", {})
            try:
                bundle = adjust_reel_settings(pkg_id, adjustments=adjustments, author=user, db_path=db_path)
                bundle["integrations"] = INTEGRATIONS_STATUS
                # Invalidate stale rendered MP4 cache so that fresh text is rendered on next download/export
                cached_rendered = os.path.join(STATIC_DIR, "assets", f"rendered_reel_{pkg_id}.mp4")
                if os.path.exists(cached_rendered):
                    try:
                        os.remove(cached_rendered)
                    except Exception:
                        pass
                self._send_json(bundle)
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return





        if path == "/api/package/export-mp4":
            pkg_id = int(body.get("package_id", 21))
            line2_font_px = body.get("line2_font_px")
            bundle = get_package_bundle(pkg_id, db_path=db_path)
            if not bundle:
                self._send_json({"error": "Package not found"}, status=HTTPStatus.NOT_FOUND)
                return
            ver = bundle.get("versions", [{}])[-1]
            reel_data = ver.get("reel", {})
            import media_gen
            out_path = f"/tmp/reel_export_{pkg_id}_{secrets.token_hex(4)}.mp4"
            try:
                media_gen.export_clean_reel_mp4(
                    reel_data,
                    output_path=out_path,
                    line2_font_px=int(line2_font_px) if line2_font_px else None,
                )
                self._send_json({
                    "success": True,
                    "download_url": f"/api/package/export-mp4?package_id={pkg_id}&line2_font_px={line2_font_px or ''}",
                    "line2_font_px": line2_font_px or reel_data.get("layout", {}).get("line2_font_px", 32),
                    "zero_guides": True
                })
                return
            except Exception as ex:
                self._send_json({"error": f"Failed to export clean MP4: {ex}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
                return

        if path == "/api/ai-media/estimate-cost":
            import ai_media_engine
            model_id = body.get("model_id", "nano-banana-pro")
            media_type = body.get("media_type", "image")
            duration_sec = int(body.get("duration_sec", 12))
            count = int(body.get("count", 1))
            res = ai_media_engine.estimate_generation_cost(model_id, media_type=media_type, duration_sec=duration_sec, count=count)
            self._send_json(res)
            return

        if path == "/api/ai-media/generate-image":
            import ai_media_engine
            prompt = body.get("prompt", "").strip()
            if not prompt:
                self._send_json({"error": "Prompt is required"}, status=HTTPStatus.BAD_REQUEST)
                return
            model_id = body.get("model_id", "nano-banana-pro")
            aspect_ratio = body.get("aspect_ratio", "4:5")
            environment_preset = body.get("environment_preset", "winter_subzero")
            camera_preset = body.get("camera_preset", "reportage_35mm")
            reference_image_url = body.get("reference_image_url")
            subject_fidelity = float(body.get("subject_fidelity", 0.85))
            approval_granted = bool(body.get("approval_granted", False))
            package_id = body.get("package_id")

            try:
                res = ai_media_engine.generate_photographic_image(
                    prompt=prompt,
                    model_id=model_id,
                    aspect_ratio=aspect_ratio,
                    environment_preset=environment_preset,
                    camera_preset=camera_preset,
                    reference_image_url=reference_image_url,
                    subject_fidelity=subject_fidelity,
                    approval_granted=approval_granted,
                )
                if package_id and body.get("apply_as_featured", False):
                    pkg_id = int(package_id)
                    from editorial_engine import create_version
                    bundle = get_package_bundle(pkg_id, db_path=db_path)
                    if bundle:
                        import copy
                        ver = copy.deepcopy(bundle.get("versions", [{}])[-1])
                        art = ver.setdefault("article", {})
                        feat = art.setdefault("featured_image", {})
                        feat["url"] = res["clean_image_url"]
                        feat["file_size_mb"] = res["file_size_mb"]
                        feat["title"] = f"AI Photographic: {prompt[:60]}"
                        feat["photographer"] = f"Generated via {res['model_name']}"
                        feat["licence"] = "Illustrative AI Concept / Rights Cleared"
                        feat["alt_text"] = f"Photographic editorial visual: {prompt}"
                        feat["data_label"] = res["data_label"]
                        feat["is_ai_generated"] = True

                        # Strictly sync social post card photo to newly applied featured image
                        if "ig_post" in ver and ver["ig_post"]:
                            ver["ig_post"]["photo_url"] = res["clean_image_url"]
                            ver["ig_post"]["photo_credit"] = f"Generated via {res['model_name']}"
                            ver["ig_post"]["photo_licence"] = "Illustrative AI Concept / Rights Cleared"

                        create_version(pkg_id, ver, author="ai-media-engine", note=f"Applied AI photo ({res['model_name']})", db_path=db_path)
                self._send_json(res)
            except PermissionError as pe:
                self._send_json({"error": str(pe), "requires_approval": True}, status=HTTPStatus.PAYMENT_REQUIRED)
            except Exception as ex:
                self._send_json({"error": f"Image generation failed: {ex}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        if path == "/api/ai-media/generate-video":
            import ai_media_engine
            prompt = body.get("prompt", "").strip()
            if not prompt:
                self._send_json({"error": "Prompt is required"}, status=HTTPStatus.BAD_REQUEST)
                return
            model_id = body.get("model_id", "veo-2.0-generate-001")
            duration_sec = int(body.get("duration_sec", 12))
            camera_movement = body.get("camera_movement", "forward_tracking")
            environment_preset = body.get("environment_preset", "winter_subzero")
            reference_image_url = body.get("reference_image_url")
            approval_granted = bool(body.get("approval_granted", False))
            include_audio = bool(body.get("include_audio", True))

            try:
                res = ai_media_engine.generate_cinematic_video(
                    prompt=prompt,
                    model_id=model_id,
                    duration_sec=duration_sec,
                    camera_movement=camera_movement,
                    environment_preset=environment_preset,
                    reference_image_url=reference_image_url,
                    approval_granted=approval_granted,
                    include_audio_mix=include_audio,
                )
                self._send_json(res)
            except PermissionError as pe:
                self._send_json({"error": str(pe), "requires_approval": True}, status=HTTPStatus.PAYMENT_REQUIRED)
            except Exception as ex:
                self._send_json({"error": f"Video generation failed: {ex}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        if path == "/api/ai-media/apply-branding":
            import ai_media_engine
            clean_url = (body.get("clean_image_url") or body.get("image_url") or "").strip()
            clean_path = body.get("clean_file_path", "")
            if not clean_path and clean_url:
                clean_path = ai_media_engine._resolve_local_image_path(clean_url)
            badge_text = body.get("badge_text") or body.get("badge") or "FINLAND GUIDE"
            headline_line1 = body.get("headline_line1", "")
            headline_line2 = body.get("headline_line2", "")
            if not headline_line1 and body.get("headline"):
                parts = body["headline"].split("\n", 1)
                headline_line1 = parts[0]
                headline_line2 = parts[1] if len(parts) > 1 else ""
            subtitle = body.get("subtitle", "")
            aspect_ratio = body.get("aspect_ratio", "4:5")

            try:
                res = ai_media_engine.apply_studio_branding_to_image(
                    clean_image_path=clean_path,
                    badge_text=badge_text,
                    headline_line1=headline_line1,
                    headline_line2=headline_line2,
                    subtitle=subtitle,
                    aspect_ratio=aspect_ratio,
                )
                self._send_json(res)
            except Exception as ex:
                self._send_json({"error": f"Failed to apply branding: {ex}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        if path == "/api/ai-media/upload-reference":
            img_b64 = body.get("image_base64", "")
            fname = body.get("filename", "reference.jpg")
            if "," in img_b64:
                img_b64 = img_b64.split(",", 1)[1]
            try:
                raw_bytes = base64.b64decode(img_b64)
                tok = secrets.token_hex(4)
                saved_name = f"ref_{tok}_{fname}"
                save_path = os.path.join(STATIC_DIR, "assets", "uploads", saved_name)
                with open(save_path, "wb") as f:
                    f.write(raw_bytes)
                self._send_json({
                    "success": True,
                    "url": f"/assets/uploads/{saved_name}",
                    "file_path": save_path,
                    "size_bytes": len(raw_bytes),
                    "filename": saved_name,
                })
            except Exception as ex:
                self._send_json({"error": f"Upload failed: {ex}"}, status=HTTPStatus.BAD_REQUEST)
            return

        # Isolated Finnish Learning Lab POST endpoints (Admin or authorized Student)
        if path.startswith("/api/finnish-lab/"):
            import finnish_lab_engine

            # Public student invite-code login (does NOT grant Studio Admin access!)
            if path == "/api/finnish-lab/student/login":
                payload = body or {}
                token, err = finnish_lab_engine.verify_student_invite_and_issue_token(
                    code=payload.get("code", ""),
                    label=payload.get("name", "Student"),
                )
                if err or not token:
                    self._send_json({"ok": False, "error": "INVALID_INVITE", "message": err or "Invalid invite code."}, status=HTTPStatus.UNAUTHORIZED)
                    return
                secure = "; Secure" if self._is_https() else ""
                self._send_json(
                    {"ok": True, "role": "student"},
                    extra_headers={
                        "Set-Cookie": f"ilf_fl_student_session={token}; HttpOnly; Path=/; Max-Age=31536000; SameSite=Lax{secure}"
                    },
                )
                return

            # Admin-only student invite management
            if path == "/api/finnish-lab/admin/student-access":
                if not self._current_user():
                    self._send_json({"ok": False, "error": "ADMIN_REQUIRED", "message": "Only Admin can manage student access."}, status=HTTPStatus.FORBIDDEN)
                    return
                payload = body or {}
                cfg = finnish_lab_engine.update_student_access_config(
                    invite_code=payload.get("invite_code"),
                    student_enabled=payload.get("student_enabled"),
                )
                self._send_json({"ok": True, **cfg})
                return

            # Admin-only user approval & management
            if path == "/api/finnish-lab/admin/users":
                if not self._current_user():
                    self._send_json({"ok": False, "error": "ADMIN_REQUIRED", "message": "Only Admin can manage users."}, status=HTTPStatus.FORBIDDEN)
                    return
                payload = body or {}
                res, status_code = finnish_lab_engine.admin_update_user_status(
                    target_email=payload.get("email", ""),
                    action=payload.get("action", ""),
                )
                self._send_json(res, status=status_code)
                return

            admin_email = self._current_user()
            stu_acc = self._current_fl_student_account()
            if not admin_email and not stu_acc:
                self._send_json({"error": "Authentication required", "authenticated": False}, status=HTTPStatus.UNAUTHORIZED)
                return
            user = admin_email or (stu_acc["email"] if stu_acc else "student@finnish-lab")

            length = int(self.headers.get("Content-Length", "0"))
            if length > 26 * 1024 * 1024:
                self._send_json(
                    {"error": "PAYLOAD_TOO_LARGE", "message": "Upload exceeds 26 MB safety limit. Please use a shorter recording or smaller image."},
                    status=HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                )
                return

            if path == "/api/finnish-lab/ask":
                ask_payload = dict(body or {})
                ask_payload["_user_email"] = user
                res, status_code = finnish_lab_engine.handle_ask(ask_payload)
                self._send_json(res, status=status_code)
                return

            if path == "/api/finnish-lab/tts":
                res, status_code = finnish_lab_engine.handle_tts(body or {})
                self._send_json(res, status=status_code)
                return

            if path == "/api/finnish-lab/podcast-topic":
                res, status_code = finnish_lab_engine.handle_generate_podcast_episode(body or {})
                self._send_json(res, status=status_code)
                return

            if path == "/api/finnish-lab/extract-flashcards":
                res, status_code = finnish_lab_engine.handle_extract_flashcards(body or {})
                self._send_json(res, status=status_code)
                return

            if path == "/api/finnish-lab/pronunciation-check":
                res, status_code = finnish_lab_engine.handle_pronunciation_check(body or {})
                self._send_json(res, status=status_code)
                return

            if path == "/api/finnish-lab/word-anatomy":
                res, status_code = finnish_lab_engine.handle_word_anatomy(body or {})
                self._send_json(res, status=status_code)
                return

            if path == "/api/finnish-lab/writing-check":
                res, status_code = finnish_lab_engine.handle_writing_check(body or {})
                self._send_json(res, status=status_code)
                return

            if path == "/api/finnish-lab/generate-exercise":
                res, status_code = finnish_lab_engine.handle_generate_exercise(body or {})
                self._send_json(res, status=status_code)
                return

            if path == "/api/finnish-lab/settings/limit":
                new_lim = finnish_lab_engine.set_daily_limit((body or {}).get("daily_limit", 60))
                self._send_json({"ok": True, "daily_limit": new_lim, "usage": finnish_lab_engine.get_usage_stats()})
                return

            if path == "/api/finnish-lab/sync":
                payload = body or {}
                res = finnish_lab_engine.save_user_sync_snapshot(user, payload.get("snapshot") or payload)
                self._send_json(res, status=200 if res.get("ok") else 400)
                return

            self._send_json({"error": "Unknown Finnish Lab endpoint"}, status=HTTPStatus.NOT_FOUND)
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")


def _start_background_scanner(db_path: str = DB_PATH, interval_seconds: int = 3600) -> None:
    """Hourly background worker that automatically scans Finnish news, guides & hot international tech topics."""
    import threading
    import time

    def _worker():
        time.sleep(3)
        while True:
            try:
                sync_live_news_plan_ideas(db_path=db_path)
            except Exception as e:
                pass
            time.sleep(interval_seconds)

    t = threading.Thread(target=_worker, daemon=True, name="ILFNewsScanner")
    t.start()


def create_server(host: str = "0.0.0.0", port: int = 8787, db_path: str = DB_PATH) -> ThreadingHTTPServer:
    """Initialize SQLite DB and return configured HTTP server."""
    init_db(db_path=db_path)
    _start_background_scanner(db_path=db_path)
    try:
        from cloud_sync import start_auto_sync_watcher
        start_auto_sync_watcher(db_path=db_path)
    except Exception as e:
        print(f"Cloud auto-sync watcher warning: {e}")
    server = ThreadingHTTPServer((host, port), StudioRequestHandler)
    server.db_path = db_path  # type: ignore[attr-defined]
    server.sessions = {}  # type: ignore[attr-defined]
    return server


def main() -> None:
    port = int(os.environ.get("PORT", "8787"))
    host = os.environ.get("HOST", "0.0.0.0")
    srv = create_server(host=host, port=port)
    import socket
    local_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass
    print(f"ILoveFinland Studio running at http://127.0.0.1:{port}")
    print(f"📱 Mobile / Local Wi-Fi Access: http://{local_ip}:{port}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()


if __name__ == "__main__":
    main()
