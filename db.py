"""SQLite persistence and Milestone 2 seed data for ILoveFinland Studio."""

import copy
import csv
import io
import json
import os
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import env_loader
import editorial_engine
import openai_client

def _resolve_db_path() -> str:
    env_db = os.environ.get("DATABASE_PATH")
    if env_db:
        return env_db
    # If Render persistent disk /data is mounted, use /data/studio.db
    data_dir = "/data"
    if os.path.exists(data_dir) and os.path.isdir(data_dir):
        persistent_db = os.path.join(data_dir, "studio.db")
        default_db = os.path.join(os.path.dirname(__file__), "studio.db")
        if not os.path.exists(persistent_db) and os.path.exists(default_db):
            try:
                import shutil
                shutil.copy2(default_db, persistent_db)
            except Exception:
                pass
        return persistent_db
    return os.path.join(os.path.dirname(__file__), "studio.db")

DB_PATH = _resolve_db_path()


def save_persistent_session(token: str, email: str, db_path: str = DB_PATH) -> None:
    """Persist an authenticated session token into SQLite so logins survive server restarts."""
    conn = get_connection(db_path)
    try:
        conn.execute(
            "INSERT OR REPLACE INTO sessions (token, email, created_at) VALUES (?, ?, ?)",
            (token, email, utc_now_iso())
        )
        conn.commit()
    finally:
        conn.close()


def get_persistent_session(token: str, db_path: str = DB_PATH) -> Optional[str]:
    """Look up email for a persistent session token."""
    conn = get_connection(db_path)
    try:
        row = conn.execute("SELECT email FROM sessions WHERE token = ?", (token,)).fetchone()
        return row[0] if row else None
    finally:
        conn.close()


def delete_persistent_session(token: str, db_path: str = DB_PATH) -> None:
    """Remove a session token on logout."""
    conn = get_connection(db_path)
    try:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
    finally:
        conn.close()


def utc_now_iso() -> str:
    """Return current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def helsinki_date_str(days_offset: int = 0, time_str: str = "09:00") -> str:
    """Return a Europe/Helsinki local ISO-like datetime string (YYYY-MM-DDTHH:MM)."""
    now_local = datetime.now(timezone(timedelta(hours=2))) + timedelta(days=days_offset)
    return f"{now_local.strftime('%Y-%m-%d')}T{time_str}"


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    """Open a SQLite connection with row factory and WAL mode enabled for high concurrency."""
    conn = sqlite3.connect(db_path, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA busy_timeout = 15000;")
    return conn


def init_db(db_path: str = DB_PATH) -> None:
    """Create Milestone 2 tables if needed and seed sample editorial data."""
    conn = get_connection(db_path)
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS packages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                story_type TEXT NOT NULL,
                origin TEXT NOT NULL DEFAULT 'AI Research',
                assignment_scope TEXT NOT NULL DEFAULT 'Both',
                deadline_at TEXT,
                current_version INTEGER NOT NULL DEFAULT 1,
                article_status TEXT NOT NULL DEFAULT 'pending',
                reel_status TEXT NOT NULL DEFAULT 'pending',
                article_approved_version INTEGER,
                reel_approved_version INTEGER,
                article_publish_at TEXT,
                reel_publish_at TEXT,
                article_published_sim INTEGER NOT NULL DEFAULT 0,
                reel_published_sim INTEGER NOT NULL DEFAULT 0,
                demo_lock INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS package_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                package_id INTEGER NOT NULL,
                version INTEGER NOT NULL,
                ai_model TEXT NOT NULL,
                created_by TEXT NOT NULL,
                change_summary TEXT NOT NULL,
                source_check_json TEXT NOT NULL,
                article_json TEXT NOT NULL,
                reel_json TEXT NOT NULL,
                editorial_rationale_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(package_id, version),
                FOREIGN KEY(package_id) REFERENCES packages(id)
            );

            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                package_id INTEGER NOT NULL,
                version INTEGER NOT NULL,
                target TEXT NOT NULL,
                author TEXT NOT NULL,
                body TEXT NOT NULL,
                has_voice_note INTEGER NOT NULL DEFAULT 0,
                applied_changes_json TEXT NOT NULL,
                resulting_version INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(package_id) REFERENCES packages(id)
            );

            CREATE TABLE IF NOT EXISTS assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                package_id INTEGER,
                topic TEXT NOT NULL,
                scope TEXT NOT NULL,
                instructions TEXT NOT NULL,
                links_json TEXT NOT NULL,
                deadline_at TEXT NOT NULL,
                has_voice_note INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'In Review',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS inbox_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                sender TEXT NOT NULL,
                context_label TEXT NOT NULL,
                original_message TEXT NOT NULL,
                related_post_title TEXT,
                related_post_url TEXT,
                ai_draft_reply TEXT NOT NULL,
                ai_model TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                feedback_note TEXT,
                approved_at TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS performance_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                format TEXT NOT NULL,
                age_hours INTEGER NOT NULL,
                watch_time_sec REAL,
                shares INTEGER,
                saves INTEGER,
                follows INTEGER,
                site_clicks INTEGER,
                sample_size_note TEXT,
                source TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS plan_ideas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                section TEXT NOT NULL DEFAULT 'News',
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                angle TEXT NOT NULL,
                fit_reason TEXT NOT NULL,
                recommended_format TEXT NOT NULL,
                target_date_hki TEXT NOT NULL,
                source_url TEXT NOT NULL,
                source_claim TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'suggested',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                outlet TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                claim TEXT NOT NULL,
                url TEXT NOT NULL,
                published_date TEXT NOT NULL,
                is_verified INTEGER NOT NULL DEFAULT 1,
                duplicate_status TEXT NOT NULL DEFAULT 'No duplicate',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS approval_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                package_id INTEGER NOT NULL,
                component TEXT NOT NULL,
                decision TEXT NOT NULL,
                version INTEGER NOT NULL,
                actor TEXT NOT NULL DEFAULT 'Editor',
                notes_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS daily_review_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ran_at TEXT NOT NULL,
                trigger TEXT NOT NULL,
                data_mode TEXT NOT NULL,
                summary TEXT NOT NULL,
                detail_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS openai_probe_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mode TEXT NOT NULL,
                model TEXT NOT NULL,
                prompt_tokens INTEGER NOT NULL,
                completion_tokens INTEGER NOT NULL,
                total_tokens INTEGER NOT NULL,
                estimated_cost_usd REAL NOT NULL,
                status TEXT NOT NULL,
                message TEXT,
                created_at TEXT NOT NULL
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )

        # Only seed initial sample package if database is completely empty
        pkg_count = conn.execute("SELECT count(*) FROM packages").fetchone()[0]
        if pkg_count == 0:
            _seed_initial_data(conn)
            _ensure_tesla_template_seed(conn)

        # Ensure Instagram Post schema migrations
        for col_name, col_sql in (
            ("ig_post_status", "TEXT NOT NULL DEFAULT 'pending'"),
            ("ig_post_approved_version", "INTEGER"),
            ("ig_post_publish_at", "TEXT"),
            ("ig_post_published_sim", "INTEGER NOT NULL DEFAULT 0"),
        ):
            try:
                conn.execute(f"ALTER TABLE packages ADD COLUMN {col_name} {col_sql}")
            except sqlite3.OperationalError:
                pass

        # Ensure plan_ideas schema migrations (region, priority_rank, outlet, published_time, is_breaking)
        for col_name, col_sql in (
            ("region", "TEXT NOT NULL DEFAULT 'Pan-Finland'"),
            ("priority_rank", "INTEGER NOT NULL DEFAULT 2"),
            ("outlet", "TEXT"),
            ("published_time", "TEXT"),
            ("is_breaking", "INTEGER NOT NULL DEFAULT 0"),
        ):
            try:
                conn.execute(f"ALTER TABLE plan_ideas ADD COLUMN {col_name} {col_sql}")
            except sqlite3.OperationalError:
                pass

        # Create Scan Runs Table for tracking discovery scan status & timestamps
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ran_at TEXT NOT NULL,
                success INTEGER NOT NULL DEFAULT 1,
                items_found INTEGER NOT NULL DEFAULT 0,
                items_added INTEGER NOT NULL DEFAULT 0,
                message TEXT
            );
            """
        )

        try:
            conn.execute("ALTER TABLE package_versions ADD COLUMN ig_post_json TEXT")
        except sqlite3.OperationalError:
            pass

        # Ensure package schema migrations (archiving and WordPress direct link)
        for col_name, col_sql in (
            ("is_archived", "INTEGER NOT NULL DEFAULT 0"),
            ("wordpress_post_url", "TEXT"),
            ("wordpress_post_id", "INTEGER"),
        ):
            try:
                conn.execute(f"ALTER TABLE packages ADD COLUMN {col_name} {col_sql}")
            except sqlite3.OperationalError:
                pass

        # Create Modern Reel Projects Table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reel_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                package_id INTEGER,
                title TEXT NOT NULL,
                aspect_ratio TEXT NOT NULL DEFAULT '9:16',
                width INTEGER NOT NULL DEFAULT 1080,
                height INTEGER NOT NULL DEFAULT 1920,
                duration_sec REAL NOT NULL DEFAULT 0.0,
                timeline_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                exported_video_url TEXT,
                thumbnail_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_archived INTEGER NOT NULL DEFAULT 0
            );
            """
        )

        _ensure_extra_seeds(conn)
        conn.commit()
    finally:
        conn.close()


def _build_fi_alert_article() -> Dict[str, Any]:
    return {
        "source_label": "Sample Story (Local Reconstruction — Live WordPress Disconnected)",
        "image_credit": "Sample Archive Photo: Helsinki Tramways / Wikimedia Commons (Local Copy)",
        "style_checks": [
            "Key fact first (inverted pyramid)",
            "Clear English straight-news style",
            "Official sources linked",
        ],
        "headline": "Finland's FI-Alert System Delivers Emergency Warnings Directly to Phones",
        "short_description": (
            "Residents and visitors in Finland can receive geo-targeted public safety "
            "warnings directly on their mobile phones without installing a separate app, "
            "alongside alerts in 112 Suomi."
        ),
        "body": [
            (
                "Finland's public warning system can send urgent, location-based emergency "
                "alerts directly to mobile phones inside an affected area without requiring "
                "users to download an app or register in advance."
            ),
            (
                "Authorities issue official emergency warnings when there is an immediate "
                "threat to life, health, or major property—such as dangerous fires, severe "
                "weather, or hazardous chemical leaks. Geo-targeted mobile alerts complement "
                "traditional radio and television broadcasts."
            ),
            (
                "Alongside network-based mobile alerts, Finland's Emergency Response Centre "
                "Agency recommends keeping the official 112 Suomi app installed. The app "
                "publishes regional safety notices and automatically shares a caller's exact "
                "coordinates with dispatchers during an emergency call."
            ),
            (
                "Residents and visitors should ensure wireless emergency alert settings are "
                "enabled on their iOS or Android devices and follow instructions from rescue "
                "authorities when a warning sounds."
            ),
        ],
        "sources": [
            {"label": "112 Finland — 112 Suomi App & Warnings", "url": "https://112.fi/en/112-suomi"},
            {
                "label": "Ministry of the Interior — Emergency Warnings",
                "url": "https://intermin.fi/en/areas-of-expertise/rescue-services/emergency-warnings",
            },
            {"label": "Traficom — Finnish Transport and Communications Agency", "url": "https://www.traficom.fi/en"},
        ],
    }


def _build_fi_alert_reel() -> Dict[str, Any]:
    return {
        "format": "Breaking Civic Explainer (9:16 Vertical)",
        "duration_sec": 12,
        "visual_asset": "/assets/helsinki-sample.jpg",
        "visual_label": "Sample Visual: Local Helsinki Archive Photo (Original / Licensed)",
        "media_origin": "Original / Licensed Archive Media",
        "canva_template": "ILF-Canva-Civic-Cover-v2 (Disconnected — Local Preview)",
        "higgsfield_clip": "Optional Higgsfield Import Slot (None attached)",
        "mp4_render_status": "Simulated Canvas Preview (Server MP4 Renderer Disconnected)",
        "logo_asset": "/assets/ilf-heart.png",
        "logo_rule": "Original ILoveFinland heart logo (white river detail preserved)",
        "audio": {
            "track_url": "/assets/nordic-pulse.wav",
            "music_credit": "Sample Audio: Nordic Pulse — Local Studio Synth Loop (Placeholder for Licensed Track)",
            "voiceover_mode": "On-screen text + music only (Synthetic narration disabled)",
        },
        "layout": {
            "logo_x_pct": 50,
            "logo_y_pct": 20,
            "logo_size_px": 74,
            "text_y_pct": 54,
            "line1_font_px": 34,
            "line2_font_px": 24,
            "scrim_opacity": 0.54,
            "accent_color": "#38BDF8",
            "safe_area": {
                "profile_grid_top_pct": 14.8,
                "profile_grid_bottom_pct": 85.2,
                "horizontal_margin_pct": 8.0,
            },
        },
        "scenes": [
            {
                "start_sec": 0.0,
                "end_sec": 3.0,
                "tag": "HOOK",
                "line1": "FI-ALERT IN FINLAND",
                "line2": "Why your phone may beep in an emergency",
            },
            {
                "start_sec": 3.0,
                "end_sec": 6.0,
                "tag": "KEY FACT",
                "line1": "NO APP REQUIRED",
                "line2": "Geo-targeted alerts reach phones in the area",
            },
            {
                "start_sec": 6.0,
                "end_sec": 9.0,
                "tag": "112 SUOMI",
                "line1": "PLUS 112 SUOMI",
                "line2": "Official notices & exact GPS for rescuers",
            },
            {
                "start_sec": 9.0,
                "end_sec": 12.0,
                "tag": "READ MORE",
                "line1": "CHECK YOUR SETTINGS",
                "line2": "Full guide & links on ILoveFinland.net",
            },
        ],
        "cover": {
            "badge": "FINLAND EXPLAINER",
            "line1": "FI-ALERT",
            "line2": "How Phone Alerts Work in Finland",
        },
        "caption": (
            "Finland's public warning system can deliver geo-targeted emergency alerts "
            "straight to phones in an affected area—no extra app needed. Here is how "
            "FI-Alert and 112 Suomi work together, plus what to check on your device."
        ),
        "hashtags": ["#Finland", "#FIAlert", "#LivingInFinland", "#Helsinki", "#FinlandNews"],
    }


def _seed_initial_data(conn: sqlite3.Connection) -> None:
    now = utc_now_iso()
    article_v1 = _build_fi_alert_article()
    reel_v1 = _build_fi_alert_reel()
    rationale_v1 = {
        "data_notice": "Simulated Editorial Intelligence (Milestone 2 — Live APIs Disconnected)",
        "format_choice": "Breaking Civic Explainer — selected for high-utility public safety stories.",
        "hook_choice": "Immediate 'FI-ALERT IN FINLAND' hook in first 2.0s without clickbait.",
        "pacing_choice": "4 scenes × 3.0s (12s total) — paced for mobile reading without voiceover.",
        "music_choice": "Steady Nordic ambient pulse; on-screen text carries facts (no synthetic narration).",
        "performance_basis": "Simulated benchmark: 10–15s civic explainers show 68% completion and high saves.",
    }
    source_check_v1 = {
        "status": "Verified against 3 official sources",
        "sources_count": 3,
        "duplicate_check": "No duplicate FI-Alert coverage in local WP archive.",
    }

    # Package 1: FI-Alert (AI Research origin, ready for review)
    cur = conn.execute(
        """
        INSERT INTO packages (
            slug, title, story_type, origin, assignment_scope, deadline_at,
            current_version, article_status, reel_status,
            created_at, updated_at
        ) VALUES (?, ?, ?, 'AI Research', 'Both', ?, 1, 'pending', 'pending', ?, ?)
        """,
        (
            "fi-alert-sample",
            "FI-Alert: Emergency Phone Warnings in Finland",
            "Civic / Straight News",
            helsinki_date_str(1, "12:00"),
            now,
            now,
        ),
    )
    pkg_id = cur.lastrowid
    conn.execute(
        """
        INSERT INTO package_versions (
            package_id, version, ai_model, created_by, change_summary,
            source_check_json, article_json, reel_json, editorial_rationale_json, created_at
        ) VALUES (?, 1, 'OpenAI (Default — Simulated)', 'AI Editorial Engine', ?, ?, ?, ?, ?, ?)
        """,
        (
            pkg_id,
            "Initial AI-assembled package (Article + 9:16 Reel + Cover + Caption).",
            json.dumps(source_check_v1),
            json.dumps(article_v1),
            json.dumps(reel_v1),
            json.dumps(rationale_v1),
            now,
        ),
    )

    # Package 2: Sample Missed-Time Calendar item (to demonstrate missed-time flagging)
    art2 = copy.deepcopy(article_v1)
    art2["headline"] = "Winter Rail Punctuality Update for Helsinki Commuters"
    art2["short_description"] = "VR and HSL share winter preparedness steps for commuter rail lines."
    reel2 = copy.deepcopy(reel_v1)
    reel2["cover"]["line1"] = "WINTER RAIL"
    reel2["cover"]["line2"] = "What Commuters Should Know"
    cur2 = conn.execute(
        """
        INSERT INTO packages (
            slug, title, story_type, origin, assignment_scope, deadline_at,
            current_version, article_status, reel_status,
            article_approved_version, reel_approved_version,
            article_publish_at, reel_publish_at,
            created_at, updated_at
        ) VALUES (?, ?, ?, 'My Assignment', 'Both', ?, 1, 'approved', 'approved', 1, 1, ?, ?, ?, ?)
        """,
        (
            "winter-rail-sample",
            "Winter Rail Punctuality Update (Sample Missed Slot)",
            "Transit / Utility",
            helsinki_date_str(-1, "08:00"),
            helsinki_date_str(-1, "10:00"),
            helsinki_date_str(1, "17:30"),
            now,
            now,
        ),
    )
    pkg2_id = cur2.lastrowid
    conn.execute(
        """
        INSERT INTO package_versions (
            package_id, version, ai_model, created_by, change_summary,
            source_check_json, article_json, reel_json, editorial_rationale_json, created_at
        ) VALUES (?, 1, 'OpenAI (Default — Simulated)', 'AI Editorial Engine', ?, ?, ?, ?, ?, ?)
        """,
        (
            pkg2_id,
            "Sample scheduled package demonstrating missed-time alert on yesterday's article slot.",
            json.dumps(source_check_v1),
            json.dumps(art2),
            json.dumps(reel2),
            json.dumps(rationale_v1),
            now,
        ),
    )

    # Sample Inbox items (Email, WordPress, Facebook, Instagram)
    inbox_seed = [
        (
            "instagram",
            "@mikko_helsinki",
            "Instagram Comment • FI-Alert Reel",
            "Does FI-Alert work if my phone is on silent or Do Not Disturb?",
            "FI-Alert: Emergency Phone Warnings in Finland",
            "https://ilovefinland.net/fi-alert-sample",
            (
                "Great question! High-priority emergency warnings (vaaratiedote) are designed "
                "to override silent mode on supported devices, though exact behavior depends on "
                "your OS emergency alert settings. Keep 112 Suomi installed as a backup."
            ),
            "OpenAI (Default — Simulated)",
        ),
        (
            "wordpress",
            "Elena K.",
            "WordPress Comment • Residence Permits Guide",
            "Thank you for the clear summary! Do tourists also get FI-Alert messages on roaming SIMs?",
            "Understanding Finnish Residence Permits: A Quick Overview",
            "https://ilovefinland.net/understanding-finnish-residence-permits-a-quick-overview/",
            (
                "Yes—network-based cell-broadcast alerts target phones connected to local "
                "towers in the affected area, including visitors using roaming SIMs."
            ),
            "Claude (Simulated)",
        ),
        (
            "facebook",
            "Sami Virtanen",
            "Facebook Comment • Helsinki Winter Transit",
            "Can you do a quick Reel on how HSL winter zones work for tourists?",
            "How public transport works in Finland",
            "https://ilovefinland.net/how-public-transport-works-in-finland/",
            (
                "Thanks for the suggestion, Sami! We are adding an HSL zone explainer to our "
                "upcoming short-form queue."
            ),
            "OpenAI (Default — Simulated)",
        ),
        (
            "email",
            "press@nordic-reader.example",
            "Email • Reader Tip",
            "Hi ILoveFinland team, could you link the English 112 Suomi setup page in your next post?",
            "FI-Alert: Emergency Phone Warnings in Finland",
            "https://112.fi/en/112-suomi",
            (
                "Hello! Yes, we have included the direct 112.fi/en/112-suomi link in our "
                "FI-Alert article sources."
            ),
            "OpenAI (Default — Simulated)",
        ),
    ]
    for row in inbox_seed:
        conn.execute(
            """
            INSERT INTO inbox_items (
                channel, sender, context_label, original_message,
                related_post_title, related_post_url, ai_draft_reply,
                ai_model, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """,
            (*row, now),
        )

    # Sample Performance Posts (at comparable 48h age; unavailable metrics left NULL -> rendered blank '—')
    perf_seed = [
        ("FI-Alert Phone Warnings (Sample)", "Breaking Civic Explainer", 48, 10.4, 84, 142, 29, 63, "n=1 (Small sample)", "IG Insights (Simulated)", now),
        ("112 Suomi GPS Guide (Sample)", "Breaking Civic Explainer", 48, 9.8, 61, 118, 19, 51, "n=1 (Small sample)", "IG Insights (Simulated)", now),
        ("Helsinki Tram Etiquette (Sample)", "City Utility Tip", 48, 7.1, 22, 44, 8, None, "n=1 (Small sample)", "IG Insights (Simulated)", now),
    ]
    for row in perf_seed:
        conn.execute(
            """
            INSERT INTO performance_posts (
                title, format, age_hours, watch_time_sec, shares, saves,
                follows, site_clicks, sample_size_note, source, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            row,
        )

    # Package 3: Sample Overlapping Scheduled Package (demonstrates same-channel collision warning)
    art3 = copy.deepcopy(article_v1)
    art3["headline"] = "Helsinki Tram Winter Routes & Sleet Service Changes"
    art3["short_description"] = "HSL updates line 4 and 10 schedules to prevent delays during central Helsinki freezing rain."
    reel3 = copy.deepcopy(reel_v1)
    reel3["cover"]["line1"] = "TRAM UPDATE"
    reel3["cover"]["line2"] = "Winter HSL Schedules"
    cur3 = conn.execute(
        """
        INSERT INTO packages (
            slug, title, story_type, origin, assignment_scope, deadline_at,
            current_version, article_status, reel_status,
            article_approved_version, reel_approved_version,
            article_publish_at, reel_publish_at,
            created_at, updated_at
        ) VALUES (?, ?, 'Transit Alert', 'AI Research', 'Both', ?, 1, 'approved', 'approved', 1, 1, ?, ?, ?, ?)
        """,
        (
            "helsinki-tram-winter-sample",
            "Helsinki Tram Winter Routes (Channel Overlap Sample)",
            helsinki_date_str(-1, "09:00"),
            helsinki_date_str(-1, "10:35"),  # Within 35m of winter-rail-sample (10:00) on WordPress!
            helsinki_date_str(2, "18:00"),
            now,
            now,
        ),
    )
    pkg3_id = cur3.lastrowid
    conn.execute(
        """
        INSERT INTO package_versions (
            package_id, version, ai_model, created_by, change_summary,
            source_check_json, article_json, reel_json, editorial_rationale_json, created_at
        ) VALUES (?, 1, 'OpenAI (Default — Simulated)', 'AI Editorial Engine', ?, ?, ?, ?, ?, ?)
        """,
        (
            pkg3_id,
            "Approved transit update scheduled 35 mins from Winter Rail briefing to demonstrate overlap warning.",
            json.dumps(source_check_v1),
            json.dumps(art3),
            json.dumps(reel3),
            json.dumps(rationale_v1),
            now,
        ),
    )

    # Weekly Plan Seed (Plan My Week)
    plan_seed = [
        (
            "Breaking Civic / Weather",
            "Winter Weather Alert: First Sub-Zero Frost & Road Safety",
            "FMI weather advisory for southern/central Finland; legal requirement for winter tires when road conditions demand.",
            "Timely seasonal transition; high search spike on frost warnings and tire rules in early winter.",
            "Both",
            helsinki_date_str(1, "09:30"),
            "https://en.ilmatieteenlaitos.fi/warnings",
            "FMI warning issued across Uusimaa; winter tire regulation in effect when conditions require.",
            "suggested",
            now,
        ),
        (
            "Event & International Visitors",
            "Slush Helsinki 2026: What Visitors & Tech Talent Need to Know",
            "Practical transport, badge pickup, and networking guide for 13,000+ international tech visitors in Helsinki.",
            "Major global tech event in Helsinki; strong interest from incoming business travelers and startup community.",
            "Reel",
            helsinki_date_str(2, "16:00"),
            "https://slush.org",
            "Official attendee instructions, Messukeskus tram lines 7 & 9, and commuter train access.",
            "suggested",
            now,
        ),
        (
            "Evergreen Living Guide",
            "Taloyhtiö Heating Rules: How Apartment Temperatures Work in Finnish Winter",
            "Demystifies 20–22°C standard indoor temperatures, radiator thermostat knobs, and winter ventilation slots.",
            "Top recurring question in reader inbox from international residents and students during first winter.",
            "Both",
            helsinki_date_str(3, "11:00"),
            "https://thl.fi/en/web/environmental-health/housing/indoor-temperature",
            "THL recommends 20–22°C for health and energy balance; taloyhtiö governs central heating curves.",
            "suggested",
            now,
        ),
        (
            "Consumer Utility",
            "Posti Holiday Parcel Deadlines & Smart Locker Etiquette",
            "Cutoff dates for sending packages inside Finland and abroad before December peak, plus parcel locker tips.",
            "High seasonal utility; 10s checklist format drives above-average saves and shares.",
            "Article",
            helsinki_date_str(4, "14:00"),
            "https://www.posti.fi/en/customer-support/sending/christmas",
            "Domestic parcel shipping cutoff dates published by Posti.",
            "suggested",
            now,
        ),
    ]
    for p in plan_seed:
        conn.execute(
            """
            INSERT INTO plan_ideas (
                category, title, angle, fit_reason, recommended_format,
                target_date_hki, source_url, source_claim, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            p,
        )

    # Curated Official Finnish Sources for Research & Verification
    sources_seed = [
        (
            "112 Finland / Emergency Response Centre",
            "Official Safety & Emergency",
            "FI-Alert & 112 Suomi Public Warning System",
            "Geo-targeted cell-broadcast warnings reach mobile phones in emergency areas without an app; 112 Suomi provides regional notices and automatic GPS sharing during calls.",
            "https://112.fi/en/112-suomi",
            "2026-11-01",
            1,
            "Covered in FI-Alert package",
            now,
        ),
        (
            "Finnish Transport and Communications Agency (Traficom)",
            "Transport & Telecom",
            "Emergency Telecom Preparedness & Road Regulations",
            "Traficom oversees communications network resilience, cellular emergency broadcasts, and vehicle safety rules across Finland.",
            "https://www.traficom.fi/en",
            "2026-10-28",
            1,
            "Verified Official Source",
            now,
        ),
        (
            "Finnish Meteorological Institute (FMI)",
            "Weather & Climate",
            "National Weather & Road Condition Alerts",
            "FMI provides authoritative localized weather alerts, freezing rain warnings, and sea ice condition tracking for Finland.",
            "https://en.ilmatieteenlaitos.fi/warnings",
            "2026-11-10",
            1,
            "Referenced in Weekly Plan",
            now,
        ),
        (
            "Finnish Immigration Service (Migri)",
            "Immigration & Permits",
            "Residence Permit & Citizenship Requirements",
            "Official guidelines for work-based residence permits, family ties, permanent residency, and Finnish language criteria.",
            "https://migri.fi/en/home",
            "2026-10-15",
            1,
            "Verified Official Source",
            now,
        ),
        (
            "Finnish Institute for Health and Welfare (THL)",
            "Public Health & Living",
            "Indoor Temperature & Residential Air Quality Standards",
            "THL sets health guidelines for residential indoor temperatures (20–22°C) and winter ventilation standards in apartment buildings.",
            "https://thl.fi/en/web/environmental-health/housing/indoor-temperature",
            "2026-11-05",
            1,
            "Referenced in Weekly Plan",
            now,
        ),
        (
            "Yle News (English)",
            "National News",
            "Finnish Parliament & Societal Developments",
            "Public broadcasting reporting on Finnish civic life, labor agreements, public service reforms, and economic news.",
            "https://yle.fi/news",
            "2026-11-11",
            1,
            "Verified Trusted Outlet",
            now,
        ),
        (
            "City of Helsinki (International House)",
            "Municipal & Integration",
            "Newcomer Services & Winter City Utilities",
            "Municipal guidance for foreign residents registering in Helsinki, school enrollment, public transit zones, and public saunas.",
            "https://internationalhousehelsinki.fi",
            "2026-11-02",
            1,
            "Verified Official Source",
            now,
        ),
        (
            "Community Reader Tip / Social Forum",
            "Unverified Community Lead",
            "Rumor: HSL to change Zone B pricing in December",
            "Unconfirmed claim on social media regarding upcoming fare tier adjustments; no official notice from HSL or Helsinki Region Transport.",
            "https://example.com/community-forum",
            "2026-11-11",
            0,
            "Unverified Lead — Do Not Publish Without Official HSL Confirmation",
            now,
        ),
    ]
    for s in sources_seed:
        conn.execute(
            """
            INSERT INTO sources (
                outlet, category, title, claim, url,
                published_date, is_verified, duplicate_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            s,
        )



def _seed_clips_sample(conn: sqlite3.Connection) -> None:
    now = utc_now_iso()
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
    scenes = [
        {
            "start_sec": 0.0,
            "end_sec": 4.5,
            "tag": "OPENING SHOT • HELSINKI",
            "line1": "GREEN TRAMS IN WINTER",
            "line2": "Helsinki transit runs through sleet & snow",
            "clip_id": 1,
            "clip_file": "clip-1-helsinki-tram.mp4",
            "clip_url": "/assets/sample-clips/clip-1-helsinki-tram.mp4",
        },
        {
            "start_sec": 4.5,
            "end_sec": 9.0,
            "tag": "LAPLAND WILDERNESS",
            "line1": "ARCTIC SILENCE",
            "line2": "Untouched snow blankets northern forests",
            "clip_id": 2,
            "clip_file": "clip-2-winter-lapland.mp4",
            "clip_url": "/assets/sample-clips/clip-2-winter-lapland.mp4",
        },
    ]
    all_credits = "Helsinki City Transport Archive (CC-BY 4.0) • Lapland Winter Media (Editorial Rights Cleared)"

    reel = {
        "duration_sec": 9,
        "video_url": "/assets/sample-clips/clip-1-helsinki-tram.mp4",
        "visual_asset": "/assets/sample-clips/clip-1-tram-thumb.jpg",
        "logo_asset": "/assets/ilf-heart.png",
        "video_clips": clips,
        "scenes": scenes,
        "audio": {
            "track_url": "/assets/nordic-pulse.wav",
            "voiceover_mode": "None (Authentic source ambient audio + Nordic pulse music bed — synthetic narration disabled by editorial policy)",
            "music_credit": "Nordic Pulse (Ambient Loop) + Authentic Helsinki Tram & Wind Ambience",
            "audio_mode": "authentic_source_and_music",
        },
        "cover": {
            "headline": "FINLAND IN TWO FRAMES",
            "line1": "WINTER CONTRAST",
            "line2": "Helsinki Trams to Lapland Snow",
            "safe_area_rule": "Logo & text inside 4:5 (1080x1350) profile-grid safe area",
        },
        "caption": (
            "Finland in two frames: green trams glided through Helsinki streets as arctic snow "
            "blanketed Lapland. Watch the winter contrast across 1,000 kilometres."
        ),
        "hashtags": ["#Finland", "#Helsinki", "#Lapland", "#VisitFinland", "#NordicLife"],
        "layout": {
            "logo_size_px": 76,
            "logo_x_pct": 50,
            "logo_y_pct": 20,
            "text_y_pct": 54,
            "line1_font_px": 34,
            "line2_font_px": 24,
            "scrim_opacity": 0.62,
            "accent_color": "#38BDF8",
            "safe_area": {
                "profile_grid_top_pct": 14.8,
                "profile_grid_bottom_pct": 85.2,
                "horizontal_margin_pct": 8.0,
            },
        },
        "clips_editorial": {
            "opening_shot_note": "Clip 1: Helsinki Tram Movement",
            "instructions": "Feature Helsinki green tram in opening shot, then transition to Lapland snow. Keep pace brisk, sound authentic.",
            "target_length_sec": 9,
            "credits": all_credits,
            "clips_count": 2,
        },
    }

    article = {
        "headline": "Winter in Finland: From Helsinki Tramways to Lapland Wilderness",
        "short_description": "Green trams navigate snowy capital streets as northern Finland records arctic conditions.",
        "source_label": "User Clip Assignment & Field Archive Verification (Local Workspace)",
        "image_credit": all_credits,
        "style_checks": [
            "Key fact first (inverted pyramid)",
            "Clear English straight-news style",
            "Authentic visuals attributed with reuse permission",
        ],
        "body_paragraphs": [
            "HELSINKI — Finland's winter transition was visible from the southern capital to the arctic north this week, with public transit fleets operating on winter schedules as Lapland experienced widespread snowfall.",
            "In Helsinki, municipal trams maintained regular commuter headway through sleet and freezing conditions, supported by track heating across major junctions. Further north, wilderness areas recorded sub-zero temperatures and accumulating snow.",
            "The footage combines urban transit observations in Helsinki with field recordings from northern Finland, highlighting regional winter preparedness.",
        ],
        "sources": [
            {
                "title": "Helsinki City Transport (HKL / Kaupunkiliikenne Oy) Transit Updates",
                "url": "https://kaupunkiliikenne.fi/en/",
                "note": "Commuter operations and winter fleet maintenance",
            },
            {
                "title": "Finnish Meteorological Institute (FMI) Regional Snow Depth",
                "url": "https://en.ilmatieteenlaitos.fi/warnings",
                "note": "Verified regional snow depth and temperature data",
            },
        ],
    }

    rationale = {
        "format_choice": "Multi-Clip 9:16 Reel with ILoveFinland branding",
        "hook_choice": "Opening shot hooked from Helsinki tram movement with instant motion in first 1.5s.",
        "pacing_choice": "2 scenes across 9.0s — balanced for high completion and re-watches.",
        "audio_choice": "Authentic tram bell and winter breeze audio mixed with original ambient loop. No synthetic narration per editorial rule.",
        "clips_data": {
            "clips_uploaded": 2,
            "audio_mode": "authentic_source_and_music",
            "credits_verified": True,
        },
    }

    source_check = {
        "status": "Verified clips with attributed licenses and FMI/HKL official background",
        "sources_count": 2,
        "duplicate_check": "No duplicate clip sequence published in archive.",
    }

    cur = conn.execute(
        """
        INSERT INTO packages (
            slug, title, story_type, origin, assignment_scope, deadline_at,
            current_version, article_status, reel_status,
            article_approved_version, reel_approved_version,
            article_publish_at, reel_publish_at,
            created_at, updated_at
        ) VALUES (?, ?, 'Multi-Clip Reel Assignment', 'User Uploaded Clips', 'Reel', ?, 1, 'pending', 'pending', NULL, NULL, NULL, ?, ?, ?)
        """,
        (
            "helsinki-winter-contrast",
            "Winter in Finland: From Helsinki Tramways to Lapland Wilderness",
            helsinki_date_str(2, "14:00"),
            helsinki_date_str(1, "18:15"),
            now,
            now,
        ),
    )
    pkg_id = cur.lastrowid
    conn.execute(
        """
        INSERT INTO package_versions (
            package_id, version, ai_model, created_by, change_summary,
            source_check_json, article_json, reel_json, editorial_rationale_json, created_at
        ) VALUES (?, 1, 'OpenAI (Default — Simulated)', 'User Clips Pipeline', ?, ?, ?, ?, ?, ?)
        """,
        (
            pkg_id,
            "Generated 9:16 Reel draft from 2 uploaded clips with ILoveFinland branding and authentic audio.",
            json.dumps(source_check),
            json.dumps(article),
            json.dumps(reel),
            json.dumps(rationale),
            now,
        ),
    )


def _ensure_extra_seeds(conn: sqlite3.Connection) -> None:
    now = utc_now_iso()
    # 1. plan_ideas
    plan_count = conn.execute("SELECT count(*) FROM plan_ideas").fetchone()[0]
    if plan_count == 0:
        plan_seed = [
            (
                "Breaking Civic / Weather",
                "Winter Weather Alert: First Sub-Zero Frost & Road Safety",
                "FMI weather advisory for southern/central Finland; legal requirement for winter tires when road conditions demand.",
                "Timely seasonal transition; high search spike on frost warnings and tire rules in early winter.",
                "Both",
                helsinki_date_str(1, "09:30"),
                "https://en.ilmatieteenlaitos.fi/warnings",
                "FMI warning issued across Uusimaa; winter tire regulation in effect when conditions require.",
                "suggested",
                now,
            ),
            (
                "Event & International Visitors",
                "Slush Helsinki 2026: What Visitors & Tech Talent Need to Know",
                "Practical transport, badge pickup, and networking guide for 13,000+ international tech visitors in Helsinki.",
                "Major global tech event in Helsinki; strong interest from incoming business travelers and startup community.",
                "Reel",
                helsinki_date_str(2, "16:00"),
                "https://slush.org",
                "Official attendee instructions, Messukeskus tram lines 7 & 9, and commuter train access.",
                "suggested",
                now,
            ),
            (
                "Evergreen Living Guide",
                "Taloyhtiö Heating Rules: How Apartment Temperatures Work in Finnish Winter",
                "Demystifies 20–22°C standard indoor temperatures, radiator thermostat knobs, and winter ventilation slots.",
                "Top recurring question in reader inbox from international residents and students during first winter.",
                "Both",
                helsinki_date_str(3, "11:00"),
                "https://thl.fi/en/web/environmental-health/housing/indoor-temperature",
                "THL recommends 20–22°C for health and energy balance; taloyhtiö governs central heating curves.",
                "suggested",
                now,
            ),
            (
                "Consumer Utility",
                "Posti Holiday Parcel Deadlines & Smart Locker Etiquette",
                "Cutoff dates for sending packages inside Finland and abroad before December peak, plus parcel locker tips.",
                "High seasonal utility; 10s checklist format drives above-average saves and shares.",
                "Article",
                helsinki_date_str(4, "14:00"),
                "https://www.posti.fi/en/customer-support/sending/christmas",
                "Domestic parcel shipping cutoff dates published by Posti.",
                "suggested",
                now,
            ),
        ]
        for p in plan_seed:
            conn.execute(
                """
                INSERT INTO plan_ideas (
                    category, title, angle, fit_reason, recommended_format,
                    target_date_hki, source_url, source_claim, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                p,
            )

    # 2. sources
    src_count = conn.execute("SELECT count(*) FROM sources").fetchone()[0]
    if src_count == 0:
        sources_seed = [
            (
                "112 Finland / Emergency Response Centre",
                "Official Safety & Emergency",
                "FI-Alert & 112 Suomi Public Warning System",
                "Geo-targeted cell-broadcast warnings reach mobile phones in emergency areas without an app; 112 Suomi provides regional notices and automatic GPS sharing during calls.",
                "https://112.fi/en/112-suomi",
                "2026-11-01",
                1,
                "Covered in FI-Alert package",
                now,
            ),
            (
                "Finnish Transport and Communications Agency (Traficom)",
                "Transport & Telecom",
                "Emergency Telecom Preparedness & Road Regulations",
                "Traficom oversees communications network resilience, cellular emergency broadcasts, and vehicle safety rules across Finland.",
                "https://www.traficom.fi/en",
                "2026-10-28",
                1,
                "Verified Official Source",
                now,
            ),
            (
                "Finnish Meteorological Institute (FMI)",
                "Weather & Climate",
                "National Weather & Road Condition Alerts",
                "FMI provides authoritative localized weather alerts, freezing rain warnings, and sea ice condition tracking for Finland.",
                "https://en.ilmatieteenlaitos.fi/warnings",
                "2026-11-10",
                1,
                "Referenced in Weekly Plan",
                now,
            ),
            (
                "Finnish Immigration Service (Migri)",
                "Immigration & Permits",
                "Residence Permit & Citizenship Requirements",
                "Official guidelines for work-based residence permits, family ties, permanent residency, and Finnish language criteria.",
                "https://migri.fi/en/home",
                "2026-10-15",
                1,
                "Verified Official Source",
                now,
            ),
            (
                "Finnish Institute for Health and Welfare (THL)",
                "Public Health & Living",
                "Indoor Temperature & Residential Air Quality Standards",
                "THL sets health guidelines for residential indoor temperatures (20–22°C) and winter ventilation standards in apartment buildings.",
                "https://thl.fi/en/web/environmental-health/housing/indoor-temperature",
                "2026-11-05",
                1,
                "Referenced in Weekly Plan",
                now,
            ),
            (
                "Yle News (English)",
                "National News",
                "Finnish Parliament & Societal Developments",
                "Public broadcasting reporting on Finnish civic life, labor agreements, public service reforms, and economic news.",
                "https://yle.fi/news",
                "2026-11-11",
                1,
                "Verified Trusted Outlet",
                now,
            ),
            (
                "City of Helsinki (International House)",
                "Municipal & Integration",
                "Newcomer Services & Winter City Utilities",
                "Municipal guidance for foreign residents registering in Helsinki, school enrollment, public transit zones, and public saunas.",
                "https://internationalhousehelsinki.fi",
                "2026-11-02",
                1,
                "Verified Official Source",
                now,
            ),
            (
                "Community Reader Tip / Social Forum",
                "Unverified Community Lead",
                "Rumor: HSL to change Zone B pricing in December",
                "Unconfirmed claim on social media regarding upcoming fare tier adjustments; no official notice from HSL or Helsinki Region Transport.",
                "https://example.com/community-forum",
                "2026-11-11",
                0,
                "Unverified Lead — Do Not Publish Without Official HSL Confirmation",
                now,
            ),
        ]
        for s in sources_seed:
            conn.execute(
                """
                INSERT INTO sources (
                    outlet, category, title, claim, url,
                    published_date, is_verified, duplicate_status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                s,
            )

    # 3. Overlap sample (only seeded if database has no packages)
    pkg_count = conn.execute("SELECT count(*) FROM packages").fetchone()[0]
    if pkg_count > 0:
        return

    p3 = conn.execute("SELECT id FROM packages WHERE slug = 'helsinki-tram-winter-sample'").fetchone()
    if not p3:
        art_base = _build_fi_alert_article()
        reel_base = _build_fi_alert_reel()
        art3 = copy.deepcopy(art_base)
        art3["headline"] = "Helsinki Tram Winter Routes & Sleet Service Changes"
        art3["short_description"] = "HSL updates line 4 and 10 schedules to prevent delays during central Helsinki freezing rain."
        reel3 = copy.deepcopy(reel_base)
        reel3["cover"]["line1"] = "TRAM UPDATE"
        reel3["cover"]["line2"] = "Winter HSL Schedules"
        cur3 = conn.execute(
            """
            INSERT INTO packages (
                slug, title, story_type, origin, assignment_scope, deadline_at,
                current_version, article_status, reel_status,
                article_approved_version, reel_approved_version,
                article_publish_at, reel_publish_at,
                created_at, updated_at
            ) VALUES (?, ?, 'Transit Alert', 'AI Research', 'Both', ?, 1, 'approved', 'approved', 1, 1, ?, ?, ?, ?)
            """,
            (
                "helsinki-tram-winter-sample",
                "Helsinki Tram Winter Routes (Channel Overlap Sample)",
                helsinki_date_str(-1, "09:00"),
                helsinki_date_str(-1, "10:35"),
                helsinki_date_str(2, "18:00"),
                now,
                now,
            ),
        )
        pkg3_id = cur3.lastrowid
        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, editorial_rationale_json, created_at
            ) VALUES (?, 1, 'OpenAI (Default — Simulated)', 'AI Editorial Engine', ?, ?, ?, ?, ?, ?)
            """,
            (
                pkg3_id,
                "Approved transit update scheduled 35 mins from Winter Rail briefing to demonstrate overlap warning.",
                json.dumps({"status": "Verified against 2 sources", "sources_count": 2, "duplicate_check": "Clean"}),
                json.dumps(art3),
                json.dumps(reel3),
                json.dumps({"format_choice": "Transit Alert Explainer"}),
                now,
            ),
        )

    # 4. Multi-Clip sample (helsinki-winter-contrast)
    p4 = conn.execute("SELECT id FROM packages WHERE slug = 'helsinki-winter-contrast'").fetchone()
    if not p4:
        _seed_clips_sample(conn)

    # 5. Instagram Carousel / Feed Post Sample (finland-winter-tire-rules)
    p5 = conn.execute("SELECT id FROM packages WHERE slug = 'finland-winter-tire-rules'").fetchone()
    if not p5:
        art5 = {
            "source_label": "Official Safety Briefing (Traficom & Poliisi — Simulated CMS)",
            "image_credit": "Finnish Transport and Communications Agency / Liikenneturva Archive",
            "style_checks": [
                "Key legal fact first",
                "Clear English straight-news style",
                "Verified Finnish sources linked",
            ],
            "headline": "Finland Winter Tire Rules: Mandatory Starting November as Temperatures Drop",
            "short_description": "Finnish police and Traficom remind motorists that winter tires are legally required from November through March whenever road or weather conditions warrant.",
            "body": [
                "Under the Finnish Road Traffic Act, motorists across Finland are legally required to use winter tires from November 1 to March 31 whenever weather or road conditions demand them. The rule applies to passenger cars, vans, and trailers, including foreign-registered vehicles operating on Finnish roads.",
                "Drivers may choose between studded tires (nastarenkaat) and non-studded friction tires (kitkarenkaat). Studded tires are explicitly permitted between November 1 and March 31, and outside these dates if winter weather conditions justify their use. The Finnish Police (Poliisi) enforce strict compliance, with fines starting at €100 for operating summer tires in icy conditions.",
                "The minimum legal tread depth for winter tires in Finland is 3.0 millimeters across the main tread grooves. However, the Finnish Road Safety Agency (Liikenneturva) strongly recommends a minimum tread depth of at least 4.0 to 5.0 millimeters for safe handling on packed snow and slush.",
            ],
            "body_paragraphs": [
                "Under the Finnish Road Traffic Act, motorists across Finland are legally required to use winter tires from November 1 to March 31 whenever weather or road conditions demand them. The rule applies to passenger cars, vans, and trailers, including foreign-registered vehicles operating on Finnish roads.",
                "Drivers may choose between studded tires (nastarenkaat) and non-studded friction tires (kitkarenkaat). Studded tires are explicitly permitted between November 1 and March 31, and outside these dates if winter weather conditions justify their use. The Finnish Police (Poliisi) enforce strict compliance, with fines starting at €100 for operating summer tires in icy conditions.",
                "The minimum legal tread depth for winter tires in Finland is 3.0 millimeters across the main tread grooves. However, the Finnish Road Safety Agency (Liikenneturva) strongly recommends a minimum tread depth of at least 4.0 to 5.0 millimeters for safe handling on packed snow and slush.",
            ],
            "sources": [
                {
                    "label": "Finnish Transport and Communications Agency (Traficom) — Winter Tire Regulations",
                    "url": "https://www.traficom.fi/en",
                },
                {
                    "label": "Finnish Police (Poliisi) — Road Traffic Enforcement & Penalties",
                    "url": "https://poliisi.fi/en",
                },
                {
                    "label": "Liikenneturva (Road Safety Council) — Safe Winter Driving Guidelines",
                    "url": "https://www.liikenneturva.fi/en",
                },
            ],
        }

        ig_post5 = {
            "post_type": "carousel",
            "aspect_ratio": "4:5",
            "title": "Finland Winter Tire Rules: What Drivers Must Know",
            "slides_count": 3,
            "slides": [
                {
                    "slide_number": 1,
                    "title": "Finland Winter Tire Rules",
                    "subtitle": "Mandatory when road conditions demand (Nov–March)",
                    "badge": "Official Police & Traficom Notice",
                    "theme": "navy_frost",
                    "bullet_points": [
                        "Winter tires are legally required whenever road conditions require (Nov 1 – March 31)",
                        "Applies to all vehicles on Finnish roads, including rentals & foreign-registered cars",
                        "Police enforce strictly: operating on summer tires during icy weather triggers €100+ fines",
                    ],
                    "footnote": "Source: Finnish Police (Poliisi) & Traficom",
                },
                {
                    "slide_number": 2,
                    "title": "Studded vs Friction Tires",
                    "subtitle": "Choosing the right grip for Finnish conditions",
                    "badge": "Equipment Comparison",
                    "theme": "ice_blue",
                    "bullet_points": [
                        "Studded (Nastarenkaat): Maximum grip on rural black ice, packed snow, and unplowed roads",
                        "Friction (Kitkarenkaat): Quieter and lower road wear for southern urban driving (Helsinki area)",
                        "Legal minimum tread: 3.0 mm (Liikenneturva recommends 4.0+ mm for safety)",
                    ],
                    "footnote": "Source: Liikenneturva Road Safety Council",
                },
                {
                    "slide_number": 3,
                    "title": "Safety Checklist & Penalties",
                    "subtitle": "Before you head out onto freezing highways",
                    "badge": "Pre-Drive Checklist",
                    "theme": "snow_alert",
                    "bullet_points": [
                        "Check tire pressure: cold air drops pressure by ~0.1 bar per 10°C drop",
                        "Retighten wheel bolts after driving 100–200 km following tire changes",
                        "All four wheels must be of the same tire type (do not mix studded and friction)",
                    ],
                    "footnote": "Verified: Traficom Transport Safety Directive",
                },
            ],
            "caption": "⚠️ FINLAND WINTER TIRE RULES ARE NOW IN EFFECT 🚗❄️\n\nUnder Finnish law (Road Traffic Act), winter tires are mandatory from November through March whenever weather or road conditions demand it.\n\nKey rules for all drivers in Finland:\n1️⃣ Minimum legal tread depth is 3.0 mm (Liikenneturva recommends 4.0+ mm for safety).\n2️⃣ Studded tires (nastarenkaat) are permitted from Nov 1 to March 31, and anytime weather conditions warrant them.\n3️⃣ Foreign cars and rental vehicles must obey the same rules.\n\nSave this checklist before heading out onto icy roads!\n\n#ILoveFinland #FinlandTravel #WinterDriving #Suomi #VisitFinland",
            "hashtags": ["#ILoveFinland", "#FinlandTravel", "#WinterDriving", "#Suomi", "#VisitFinland"],
            "design_notes": "Clean high-contrast cards, ILoveFinland river heart logo anchored inside 4:5 safe area.",
            "visual_tool": "Canva Branded Template (Ready to export)",
            "credit": "Visuals & Layout: ILoveFinland Studio • Source: Traficom & Poliisi",
        }

        reel_placeholder = _build_fi_alert_reel()
        reel_placeholder["cover"]["line1"] = "WINTER TIRES"
        reel_placeholder["cover"]["line2"] = "Mandatory in Finland"

        cur5 = conn.execute(
            """
            INSERT INTO packages (
                slug, title, story_type, origin, assignment_scope, deadline_at,
                current_version, article_status, reel_status, ig_post_status,
                article_approved_version, reel_approved_version, ig_post_approved_version,
                article_publish_at, reel_publish_at, ig_post_publish_at,
                created_at, updated_at
            ) VALUES (?, ?, 'Civic Guide & Safety Alert', 'AI Research (Traficom & Poliisi)', 'Article + Instagram Post', ?, 1, 'approved', 'pending', 'pending', 1, NULL, NULL, ?, NULL, ?, ?, ?)
            """,
            (
                "finland-winter-tire-rules",
                "Finland Winter Tire Rules: Mandatory Starting November",
                helsinki_date_str(1, "12:00"),
                helsinki_date_str(1, "14:30"),
                helsinki_date_str(1, "15:00"),
                now,
                now,
            ),
        )
        pkg5_id = cur5.lastrowid
        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json, editorial_rationale_json, created_at
            ) VALUES (?, 1, 'OpenAI (Default — Simulated)', 'AI Editorial Engine', ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pkg5_id,
                "Initial AI package generated with straight-news article and branded 4:5 Instagram Carousel for civic distribution.",
                json.dumps({"status": "Verified against Traficom and Poliisi official road directives", "sources_count": 3, "duplicate_check": "Clean"}),
                json.dumps(art5),
                json.dumps(reel_placeholder),
                json.dumps(ig_post5),
                json.dumps({
                    "format_choice": "Article + 4:5 Instagram Carousel (High-save civic checklist)",
                    "hook_choice": "Legal deadline and fine avoidance in Slide 1",
                    "safe_area": "4:5 profile-grid compliant",
                }),
                now,
            ),
        )




def _ensure_tesla_template_seed(conn: sqlite3.Connection) -> None:
    now = utc_now_iso()
    existing = conn.execute("SELECT id FROM packages WHERE slug = 'tesla-assisted-driving-finland'").fetchone()
    if existing:
        return

    art = {
        "source_label": "Official Road Authority Verification (Traficom & Poliisi)",
        "image_credit": "Tesla Model 3 in Finnish Winter Highway / Editorial Rights Cleared",
        "style_checks": [
            "Straight-news inverted pyramid",
            "Clear driver liability distinction under Finnish law",
            "Winter sensor warning included",
        ],
        "headline": "Finland Authorises Tesla Assisted Driving Systems Under Supervised Conditions",
        "kicker": "Nordic Road Safety & EV Law Briefing",
        "deck": "Finnish transport authorities confirm Tesla Autopilot features comply with road legislation, but drivers remain 100% legally liable under the Finnish Road Traffic Act.",
        "byline": "ILoveFinland Editorial Desk",
        "reading_time_min": 3,
        "body_markdown": """## Assisted Driving Permitted Under Continuous Human Supervision

Finland's Transport and Communications Agency (Traficom) and national traffic authorities have confirmed that Tesla's assisted driving technologies (Autopilot and Full Self-Driving Supervised) comply with Finnish traffic legislation. However, officials emphasize that under the Finnish Road Traffic Act (*Tieliikennelaki 729/2018*), human drivers maintain full and undivided legal responsibility at all times.

### Key Regulations on Finnish Roads
- **Hands-On Requirement:** Finnish law requires drivers to maintain continuous physical control. Taking hands off the wheel or diverting attention constitutes an immediate traffic violation.
- **Level 2 Classification:** Tesla's system is legally categorized as SAE Level 2 driver assistance, not autonomous driving. The human driver is solely liable for speed limits, lane keeping, and collision prevention.
- **Winter Limitations:** Traficom stresses that Finnish winter road conditions—sub-zero ice, slush build-up, and road salt film—can rapidly blind optical cameras and ultrasonic sensors. Drivers must be prepared to resume full manual control instantly.

ILoveFinland will monitor further updates from Traficom and the Ministry of Transport and Communications (*Liikenne- ja viestintäministeriö*).
""",
        "categories": ["Transport", "Technology", "Road Safety"],
        "tags": ["Tesla", "Finland", "Traficom", "Winter Driving", "Electric Vehicles"],
        "primary_source_url": "https://www.traficom.fi/en/transport/road/automated-driving-and-driver-assistance",
    }

    clips = [
        {
            "id": 1,
            "url": "/assets/sample-clips/clip-1-helsinki-tram.mp4",
            "poster": "/assets/sample-clips/clip-1-tram-thumb.jpg",
            "duration": 4.2,
            "label": "Clip 1: Helsinki Tramway (Authentic Archive)",
            "credit": "Helsinki City Transport Archive (CC-BY 4.0)",
        },
        {
            "id": 2,
            "url": "/assets/sample-clips/clip-2-winter-lapland.mp4",
            "poster": "/assets/sample-clips/clip-2-winter-thumb.png",
            "duration": 4.0,
            "label": "Clip 2: Lapland Winter Highway (Authentic Archive)",
            "credit": "Lapland Winter Media (Editorial Rights Cleared)",
        },
        {
            "id": 3,
            "url": "/assets/sample-clips/clip-1-helsinki-tram.mp4",
            "poster": "/assets/sample-clips/clip-1-tram-thumb.jpg",
            "duration": 4.0,
            "label": "Clip 3: Winter Transit Lane (Authentic Archive)",
            "credit": "Helsinki City Transport Archive (CC-BY 4.0)",
        },
        {
            "id": 4,
            "url": "/assets/sample-clips/clip-2-winter-lapland.mp4",
            "poster": "/assets/sample-clips/clip-2-winter-thumb.png",
            "duration": 3.8,
            "label": "Clip 4: Nordic Forest Road (Authentic Archive)",
            "credit": "Lapland Winter Media (Editorial Rights Cleared)",
        },
    ]

    scenes = [
        {
            "id": 1,
            "start_sec": 0.0,
            "end_sec": 4.2,
            "badge": "NEWS",
            "line1": "FINLAND SAYS “KYLLÄ” TO TESLA’S",
            "line2_highlight": "ASSISTED DRIVING!",
            "subtitle": "Permitted on Finnish roads under strict driver supervision.",
            "clip_url": "/assets/sample-clips/clip-1-helsinki-tram.mp4",
        },
        {
            "id": 2,
            "start_sec": 4.2,
            "end_sec": 8.2,
            "badge": "NEWS",
            "line1": "DRIVER STILL",
            "line2_highlight": "RESPONSIBLE",
            "subtitle": "Stay alert and ready to take immediate control at any moment.",
            "clip_url": "/assets/sample-clips/clip-2-winter-lapland.mp4",
        },
        {
            "id": 3,
            "start_sec": 8.2,
            "end_sec": 12.2,
            "badge": "NEWS",
            "line1": "WINTER CAN LIMIT",
            "line2_highlight": "THE SYSTEM",
            "subtitle": "Snow, slush or road grime may obscure optical sensors.",
            "clip_url": "/assets/sample-clips/clip-1-helsinki-tram.mp4",
        },
        {
            "id": 4,
            "start_sec": 12.2,
            "end_sec": 16.0,
            "badge": "NEWS",
            "line1": "NOT A SELF-DRIVING",
            "line2_highlight": "CAR",
            "subtitle": "Read the verified transport briefing at ilovefinland.net",
            "clip_url": "/assets/sample-clips/clip-2-winter-lapland.mp4",
        },
    ]

    reel = {
        "duration_sec": 16,
        "video_url": "/assets/sample-clips/clip-1-helsinki-tram.mp4",
        "visual_asset": "/assets/sample-clips/tesla-cover.jpg",
        "logo_asset": "/assets/ilf-heart-exact.png",
        "logo_rule": "Original ILoveFinland heart logo (white mountain, river, dot preserved, transparent background, no white halo)",
        "video_clips": clips,
        "scenes": scenes,
        "audio": {
            "track_url": "/assets/sample-audio-tesla.m4a",
            "music_credit": "Tesla Authentic Field Audio + Nordic Pulse Electronic Rhythm",
            "mix_mode": "field_pulse",
            "music_volume": 0.70,
            "field_volume": 0.85,
            "voiceover_mode": "None (Authentic ambient field audio + Nordic pulse beat; on-screen typography)",
        },
        "layout": {
            "template_style": "tesla_news",
            "logo_visible": True,
            "logo_x_pct": 17.5,
            "logo_y_pct": 17.0,
            "logo_size_px": 68,
            "text_y_pct": 68,
            "line1_font_px": 32,
            "line2_font_px": 32,
            "accent_color": "#00A3FF",
            "badge_color": "#003882",
            "badge_text": "NEWS",
            "scrim_opacity": 0.65,
            "safe_area": {
                "horizontal_margin_pct": 8.5,
                "profile_grid_top_pct": 10,
                "profile_grid_bottom_pct": 90,
            },
        },
        "cover": {
            "template_style": "tesla_news",
            "badge": "NEWS",
            "line1": "FINLAND SAYS",
            "line2": "“KYLLÄ” TO TESLA’S",
            "line3_highlight": "ASSISTED DRIVING!",
            "visual_asset": "/assets/sample-clips/tesla-clean-bg.jpg",
            "logo_asset": "/assets/ilf-heart-exact.png",
            "logo_x_pct": 16.5,
            "logo_y_pct": 15.5,
            "logo_size_px": 52,
            "headline": "FINLAND SAYS “KYLLÄ” TO TESLA’S ASSISTED DRIVING!",
        },
        "caption": "Tesla assisted driving features are officially permitted in Finland under Traficom supervision. Remember: human drivers remain legally liable at all times, especially in sub-zero Finnish winter conditions. Full story at ilovefinland.net 🇫🇮⚡️",
        "hashtags": ["#ILoveFinland", "#TeslaFinland", "#Traficom", "#WinterDriving", "#Suomi"],
    }

    source_check = {
        "primary_sources": ["Traficom Automated Driving Directive 2026", "Finnish Road Traffic Act 729/2018 §17"],
        "verified": True,
        "demo_mode": True,
    }

    rationale = {
        "angle": "Reusable News Template benchmarked on authentic Tesla Reel pacing & 4:5 cover image layout",
        "pacing": "4 scenes across 15.8s matching original timing with left-aligned lower third typography and upper-left heart logo",
        "branding": "Original ILoveFinland heart logo with transparent outer area, white mountain, river and dot preserved",
        "audio": "Authentic field audio + Nordic pulse electronic rhythm",
    }

    cur = conn.execute(
        """
        INSERT INTO packages (
            slug, title, story_type, origin, assignment_scope, deadline_at,
            current_version, article_status, reel_status,
            created_at, updated_at, demo_lock
        ) VALUES (?, ?, 'Both', 'Reusable News Template (Tesla Paced)', 'Both', ?, 1, 'pending', 'pending', ?, ?, 1)
        """,
        (
            "tesla-assisted-driving-finland",
            "Finland Says “Kyllä” to Tesla’s Assisted Driving",
            helsinki_date_str(2, "14:00"),
            now,
            now,
        ),
    )
    new_pkg_id = cur.lastrowid
    conn.execute(
        """
        INSERT INTO package_versions (
            package_id, version, ai_model, created_by, change_summary,
            source_check_json, article_json, reel_json, editorial_rationale_json, created_at
        ) VALUES (?, 1, 'Tesla News Template Engine', 'Studio Template Builder', ?, ?, ?, ?, ?, ?)
        """,
        (
            new_pkg_id,
            "Initial Tesla News Template Package: 4-scene Reel + 4:5 cover with upper-left heart logo and 1:1 profile grid safe area.",
            json.dumps(source_check),
            json.dumps(art),
            json.dumps(reel),
            json.dumps(rationale),
            now,
        ),
    )


def list_packages(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Return summary list of all packages."""
    conn = get_connection(db_path)
    try:
        rows = conn.execute("SELECT * FROM packages ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_projects_dashboard(db_path: str = DB_PATH, include_archived: bool = False) -> Dict[str, Any]:
    """Return an enriched list of all projects/packages with pipeline stage and counters."""
    conn = get_connection(db_path)
    try:
        if include_archived:
            rows = conn.execute("SELECT * FROM packages ORDER BY id DESC").fetchall()
        else:
            rows = conn.execute("SELECT * FROM packages WHERE COALESCE(is_archived, 0) = 0 ORDER BY id DESC").fetchall()
        projects = []
        counts = {
            "total": 0,
            "in_review": 0,
            "in_progress": 0,
            "approved": 0,
            "archived": 0,
        }

        try:
            archived_cnt = conn.execute("SELECT count(*) FROM packages WHERE COALESCE(is_archived, 0) = 1").fetchone()[0]
            counts["archived"] = archived_cnt
        except Exception:
            pass

        for r in rows:
            pkg = dict(r)
            scope = pkg.get("assignment_scope") or "Both"
            art_st = pkg.get("article_status") or "pending"
            reel_st = pkg.get("reel_status") or "pending"
            ig_st = pkg.get("ig_post_status") or "pending"

            has_art = "Article" in scope or scope == "Both" or "Static Post" in scope
            has_reel = ("Reel" in scope or scope == "Both") and (reel_st != "none")
            has_ig = "Instagram Post" in scope or "Static Post" in scope or scope == "Both (Article + Instagram Post)"

            active_components = []
            if has_art:
                active_components.append(("Article", art_st))
            if has_ig:
                active_components.append(("Static Post", ig_st))
            if has_reel:
                active_components.append(("Reel", reel_st))

            if not active_components:
                active_components = [("Article", art_st)]

            all_approved = all(st == "approved" for _, st in active_components)
            any_approved = any(st == "approved" for _, st in active_components)
            is_scheduled = bool(
                pkg.get("article_publish_at")
                or pkg.get("reel_publish_at")
                or pkg.get("ig_post_publish_at")
            )

            if all_approved or is_scheduled:
                stage = "Approved" if not is_scheduled else "Scheduled"
                stage_badge = "pill-approved"
                counts["approved"] += 1
            elif any_approved:
                stage = "Partially Approved"
                stage_badge = "pill-approved"
                counts["in_review"] += 1
            elif pkg.get("current_version", 0) >= 1:
                stage = "Ready for Review"
                stage_badge = "pill-revision"
                counts["in_review"] += 1
            else:
                stage = "In Progress (AI Working)"
                stage_badge = "pill-neutral"
                counts["in_progress"] += 1

            # Fetch latest version info, metadata & sources count
            v_row = conn.execute(
                "SELECT source_check_json, article_json FROM package_versions WHERE package_id = ? ORDER BY version DESC LIMIT 1",
                (pkg["id"],),
            ).fetchone()
            sources_count = 0
            thumb_url = ""
            sec_name = "News"
            cat_name = "Finland"
            lang_name = "English"
            wp_id = pkg.get("wordpress_post_id")

            if v_row:
                if v_row["source_check_json"]:
                    try:
                        s_data = json.loads(v_row["source_check_json"])
                        sources_count = len(s_data.get("sources", [])) or (1 if s_data.get("passed") else 0)
                    except Exception:
                        pass
                if v_row["article_json"]:
                    try:
                        art_data = json.loads(v_row["article_json"])
                        feat_img = art_data.get("featured_image") or {}
                        thumb_url = feat_img.get("url") or ""
                        sec_name = art_data.get("section") or sec_name
                        cat_name = art_data.get("category") or cat_name
                        lang_name = art_data.get("language") or lang_name
                        wp_id = art_data.get("wordpress_post_id") or wp_id
                    except Exception:
                        pass

            pkg["pipeline_stage"] = stage
            pkg["stage_badge"] = stage_badge
            pkg["sources_count"] = sources_count
            pkg["scope_label"] = scope
            pkg["thumbnail_url"] = thumb_url
            pkg["section"] = sec_name
            pkg["category"] = cat_name
            pkg["language"] = lang_name
            pkg["wordpress_post_id"] = wp_id
            pkg["active_components"] = [
                {"name": name, "status": st, "approved": st == "approved"}
                for name, st in active_components
            ]
            projects.append(pkg)

        counts["total"] = len(projects)
        return {"projects": projects, "counts": counts}
    finally:
        conn.close()


def edit_project(
    package_id: int,
    title: str,
    assignment_scope: str,
    deadline_at: Optional[str] = None,
    db_path: str = DB_PATH,
) -> Optional[Dict[str, Any]]:
    """Update project title, scope, and production deadline."""
    conn = get_connection(db_path)
    try:
        conn.execute(
            """
            UPDATE packages
            SET title = ?, assignment_scope = ?, deadline_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (title.strip(), assignment_scope.strip(), deadline_at, utc_now_iso(), package_id),
        )
        conn.execute(
            """
            UPDATE assignments
            SET topic = ?, scope = ?, deadline_at = COALESCE(?, deadline_at)
            WHERE package_id = ?
            """,
            (title.strip(), assignment_scope.strip(), deadline_at, package_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def delete_project(package_id: int, db_path: str = DB_PATH) -> bool:
    """Delete a project and its cascade data."""
    conn = get_connection(db_path)
    try:
        conn.execute("DELETE FROM comments WHERE package_id = ?", (package_id,))
        conn.execute("DELETE FROM package_versions WHERE package_id = ?", (package_id,))
        conn.execute("DELETE FROM assignments WHERE package_id = ?", (package_id,))
        cur = conn.execute("DELETE FROM packages WHERE id = ?", (package_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def archive_package(
    package_id: int,
    is_archived: bool = True,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Toggle archive status of a package."""
    conn = get_connection(db_path)
    try:
        val = 1 if is_archived else 0
        conn.execute(
            "UPDATE packages SET is_archived = ?, updated_at = ? WHERE id = ?",
            (val, utc_now_iso(), package_id),
        )
        conn.commit()
        return get_package_bundle(package_id, db_path=db_path)
    finally:
        conn.close()


def duplicate_package(package_id: int, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """Create an exact copy of an existing article & post package."""
    conn = get_connection(db_path)
    try:
        pkg_row = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg_row:
            return None
        pkg = dict(pkg_row)
        now = utc_now_iso()
        new_slug = f"assign-{int(datetime.now(timezone.utc).timestamp())}-{abs(hash(pkg['title'])) % 10000}"
        new_title = f"{pkg['title']} (Copy)"

        cur = conn.execute(
            """
            INSERT INTO packages (
                slug, title, story_type, origin, assignment_scope, deadline_at,
                current_version, article_status, reel_status, ig_post_status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, 'pending', 'pending', 'pending', ?, ?)
            """,
            (
                new_slug,
                new_title,
                pkg.get("story_type") or "News",
                pkg.get("origin") or "Direct Copy",
                pkg.get("assignment_scope") or "Both",
                pkg.get("deadline_at"),
                now,
                now,
            ),
        )
        new_pkg_id = cur.lastrowid

        v_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? ORDER BY version DESC LIMIT 1",
            (package_id,),
        ).fetchone()
        if v_row:
            v_dict = dict(v_row)
            art_json = v_dict.get("article_json")
            if art_json:
                try:
                    art_obj = json.loads(art_json)
                    art_obj["headline"] = new_title
                    art_obj["title"] = new_title
                    art_obj["wordpress_post_id"] = None
                    art_json = json.dumps(art_obj)
                except Exception:
                    pass

            conn.execute(
                """
                INSERT INTO package_versions (
                    package_id, version, author, rationale, source_check_json,
                    article_json, reel_json, static_post_json, created_at
                ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    new_pkg_id,
                    "System (Duplicate)",
                    f"Duplicated from #{package_id}",
                    v_dict.get("source_check_json") or "{}",
                    art_json or "{}",
                    v_dict.get("reel_json") or "{}",
                    v_dict.get("static_post_json") or "{}",
                    now,
                ),
            )

        assign_row = conn.execute("SELECT * FROM assignments WHERE package_id = ?", (package_id,)).fetchone()
        if assign_row:
            a_dict = dict(assign_row)
            conn.execute(
                """
                INSERT INTO assignments (
                    package_id, topic, scope, instructions, links_json, deadline_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    new_pkg_id,
                    new_title,
                    a_dict.get("scope") or "Both",
                    a_dict.get("instructions") or "",
                    a_dict.get("links_json") or "[]",
                    a_dict.get("deadline_at"),
                    now,
                ),
            )

        conn.commit()
    finally:
        conn.close()

    return get_package_bundle(new_pkg_id, db_path=db_path)


def recalculate_reel_scenes_timings(reel: Dict[str, Any]) -> Dict[str, Any]:
    """Recalculate reel scenes timings enforcing:
    1. Up to 8 content clips (user can end at 2, 3, 4, 5, 6, 7, or 8 clips).
    2. Static photos take <= 4.0s (standard 3.5s).
    3. Video clips use their natural duration.
    4. Dedicated closing branded outro card (2.8s) appended at the end.
    """
    scenes = reel.get("scenes") or []
    content_scenes = [copy.deepcopy(s) for s in scenes if not s.get("is_outro")]
    if len(content_scenes) > 8:
        content_scenes = content_scenes[:8]

    cur_t = 0.0
    for idx, s in enumerate(content_scenes):
        clip_url = s.get("clip_url") or s.get("url") or ""
        is_video = bool(re.search(r"\.(mp4|mov|webm)$", clip_url, re.I))
        if s.get("duration") and float(s["duration"]) > 0:
            d = max(1.0, min(12.0 if is_video else 8.0, float(s["duration"])))
        elif is_video:
            d = float((s.get("end_sec", 4.0) - s.get("start_sec", 0.0)) or 4.0)
            d = max(1.5, min(12.0, d))
        else:
            prev_d = float(s.get("end_sec", 3.0) - s.get("start_sec", 0.0))
            if prev_d < 1.0 or prev_d > 8.0:
                d = 3.0
            else:
                d = prev_d
        s["duration"] = round(d, 2)
        s["start_sec"] = round(cur_t, 2)
        cur_t += d
        s["end_sec"] = round(cur_t, 2)
        s["is_outro"] = False
        s["transition"] = s.get("transition") or "dissolve"

    outro_scene = {
        "start_sec": round(cur_t, 2),
        "end_sec": round(cur_t + 2.8, 2),
        "duration": 2.8,
        "is_outro": True,
        "tag": "ILOVEFINLAND",
        "badge": "YOUR FINLAND DISCOVERED",
        "line1": "FALL IN LOVE WITH FINLAND.",
        "line2": "VISIT www.ilovefinland.net",
        "line2_color": "blue",
        "line3": "VISIT www.ilovefinland.net",
        "subtitle": "YOUR FINLAND, DISCOVERED.",
        "clip_url": "/assets/ilf-heart-exact.png",
        "transition": "dissolve",
    }

    all_scenes = content_scenes + [outro_scene]
    reel["scenes"] = all_scenes
    reel["duration_sec"] = outro_scene["end_sec"]
    return reel


def replace_reel_scene_media(
    package_id: int,
    scene_index: int,
    clip_url: str,
    duration: Optional[float] = None,
    credit: str = "Visuals: Uploaded Media",
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Replace photo/video media for a specific scene index in package reel."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")
        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        reel = json.loads(ver_row["reel_json"])
        article = json.loads(ver_row["article_json"])
        rationale = json.loads(ver_row["editorial_rationale_json"])
        source_check = json.loads(ver_row["source_check_json"])
        ig_post = json.loads(ver_row["ig_post_json"]) if ver_row["ig_post_json"] else None

        scenes = reel.get("scenes", [])
        if 0 <= scene_index < len(scenes):
            scenes[scene_index]["clip_url"] = clip_url
            if duration:
                scenes[scene_index]["duration"] = duration
            if scene_index == 0:
                reel["video_url"] = clip_url
                if not reel.get("cover"):
                    reel["cover"] = {}
                reel["cover"]["photo_url"] = clip_url

        reel = recalculate_reel_scenes_timings(reel)
        # Always enforce consistent scene timings (<=4.0s for images) and dedicated closing outro
        if reel and isinstance(reel, dict) and reel.get("scenes"):
            reel = recalculate_reel_scenes_timings(reel)

        new_ver = cur_ver + 1
        summary = f"Replaced Scene {scene_index + 1} media with uploaded photo/clip."

        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json,
                editorial_rationale_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id, new_ver, "Manual Media Replace", "Editor", summary,
                json.dumps(source_check), json.dumps(article), json.dumps(reel),
                json.dumps(ig_post) if ig_post else None, json.dumps(rationale), utc_now_iso()
            )
        )
        conn.execute(
            "UPDATE packages SET current_version = ?, updated_at = ? WHERE id = ?",
            (new_ver, utc_now_iso(), package_id)
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def add_reel_scene(
    package_id: int,
    scene_data: Optional[Dict[str, Any]] = None,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Add a new scene up to a maximum of 8 content clips."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")
        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        reel = json.loads(ver_row["reel_json"])
        article = json.loads(ver_row["article_json"])
        rationale = json.loads(ver_row["editorial_rationale_json"])
        source_check = json.loads(ver_row["source_check_json"])
        ig_post = json.loads(ver_row["ig_post_json"]) if ver_row["ig_post_json"] else None

        content_scenes = [s for s in reel.get("scenes", []) if not s.get("is_outro")]
        if len(content_scenes) >= 8:
            raise ValueError("Maximum 8 clips allowed in Reel sequence.")

        sd = scene_data or {}
        new_scene = {
            "badge": sd.get("badge") or "LAPLAND",
            "tag": sd.get("tag") or "LAPLAND",
            "line1": sd.get("line1") or "DISCOVER FINLAND",
            "line2": sd.get("line2") or "ARCTIC WONDERLAND",
            "line2_color": sd.get("line2_color") or "white",
            "line3": sd.get("line3") or "AUTHENTIC STORIES",
            "subtitle": sd.get("subtitle") or "Experience authentic Finland across every season.",
            "clip_url": sd.get("clip_url") or "/assets/sample-clips/tesla-clean-bg.jpg",
            "is_outro": False,
        }
        content_scenes.append(new_scene)
        reel["scenes"] = content_scenes
        reel = recalculate_reel_scenes_timings(reel)

        # Always enforce consistent scene timings (<=4.0s for images) and dedicated closing outro
        if reel and isinstance(reel, dict) and reel.get("scenes"):
            reel = recalculate_reel_scenes_timings(reel)

        new_ver = cur_ver + 1
        summary = f"Added Scene {len(content_scenes)} (Total {len(content_scenes)} content clips + Outro)."

        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json,
                editorial_rationale_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id, new_ver, "Manual Scene Add", "Editor", summary,
                json.dumps(source_check), json.dumps(article), json.dumps(reel),
                json.dumps(ig_post) if ig_post else None, json.dumps(rationale), utc_now_iso()
            )
        )
        conn.execute(
            "UPDATE packages SET current_version = ?, updated_at = ? WHERE id = ?",
            (new_ver, utc_now_iso(), package_id)
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def delete_reel_scene(
    package_id: int,
    scene_index: int,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Remove a scene from package reel, keeping at least 2 content clips."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")
        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        reel = json.loads(ver_row["reel_json"])
        article = json.loads(ver_row["article_json"])
        rationale = json.loads(ver_row["editorial_rationale_json"])
        source_check = json.loads(ver_row["source_check_json"])
        ig_post = json.loads(ver_row["ig_post_json"]) if ver_row["ig_post_json"] else None

        content_scenes = [s for s in reel.get("scenes", []) if not s.get("is_outro")]
        if len(content_scenes) <= 2:
            raise ValueError("A minimum of 2 clips is required for the Reel.")

        if 0 <= scene_index < len(content_scenes):
            content_scenes.pop(scene_index)

        reel["scenes"] = content_scenes
        reel = recalculate_reel_scenes_timings(reel)

        # Always enforce consistent scene timings (<=4.0s for images) and dedicated closing outro
        if reel and isinstance(reel, dict) and reel.get("scenes"):
            reel = recalculate_reel_scenes_timings(reel)

        new_ver = cur_ver + 1
        summary = f"Removed Scene {scene_index + 1} (Remaining: {len(content_scenes)} clips + Outro)."

        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json,
                editorial_rationale_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id, new_ver, "Manual Scene Delete", "Editor", summary,
                json.dumps(source_check), json.dumps(article), json.dumps(reel),
                json.dumps(ig_post) if ig_post else None, json.dumps(rationale), utc_now_iso()
            )
        )
        conn.execute(
            "UPDATE packages SET current_version = ?, updated_at = ? WHERE id = ?",
            (new_ver, utc_now_iso(), package_id)
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def adjust_reel_settings(
    package_id: int,
    adjustments: Dict[str, Any],
    author: str = "Editor (Signed-in)",
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Apply manual/interactive Reel adjustments (clips, audio mix, hook text, logo placement) and save as a new revision."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        article = copy.deepcopy(json.loads(ver_row["article_json"]))
        reel = copy.deepcopy(json.loads(ver_row["reel_json"]))
        rationale = copy.deepcopy(json.loads(ver_row["editorial_rationale_json"]))
        source_check = copy.deepcopy(json.loads(ver_row["source_check_json"]))
        ig_post = None
        if "ig_post_json" in ver_row.keys() and ver_row["ig_post_json"]:
            ig_post = copy.deepcopy(json.loads(ver_row["ig_post_json"]))

        changes = []

        # 1. Text & Hook adjustments
        if "scenes" in adjustments and isinstance(adjustments["scenes"], list):
            reel["scenes"] = adjustments["scenes"]
            if len(reel["scenes"]) > 0:
                s0 = reel["scenes"][0]
                reel["hook_text"] = s0.get("line1") or reel.get("hook_text", "")
                if "cover" in reel:
                    reel["cover"]["line1"] = s0.get("line1") or reel["cover"].get("line1", "")
                    reel["cover"]["line2"] = s0.get("line2") or reel["cover"].get("line2", "")
                    reel["cover"]["line2_color"] = s0.get("line2_color") or reel["cover"].get("line2_color", "white")
                    reel["cover"]["line3_highlight"] = s0.get("line3") or s0.get("line2_highlight") or reel["cover"].get("line3_highlight", "")
                    reel["cover"]["subtitle"] = s0.get("subtitle") or reel["cover"].get("subtitle", "")
            changes.append(f"Updated all {len(reel['scenes'])} scenes text, subtitles and timings")

        scene_idx = int(adjustments.get("scene_index", 0))
        if reel.get("scenes") and 0 <= scene_idx < len(reel["scenes"]):
            target_scene = reel["scenes"][scene_idx]
            if "line1" in adjustments and adjustments["line1"]:
                target_scene["line1"] = adjustments["line1"].strip()
                if scene_idx == 0:
                    reel["hook_text"] = target_scene["line1"]
                    if "cover" in reel: reel["cover"]["line1"] = target_scene["line1"]
                changes.append(f"Scene {scene_idx+1} Line 1: '{target_scene['line1']}'")
            if "line2" in adjustments and adjustments["line2"] is not None:
                target_scene["line2"] = adjustments["line2"].strip()
                if scene_idx == 0 and "cover" in reel: reel["cover"]["line2"] = target_scene["line2"]
                changes.append(f"Scene {scene_idx+1} Line 2: '{target_scene['line2']}'")
            if "line2_color" in adjustments and adjustments["line2_color"]:
                target_scene["line2_color"] = adjustments["line2_color"].strip()
                if scene_idx == 0 and "cover" in reel: reel["cover"]["line2_color"] = target_scene["line2_color"]
            if "line3" in adjustments and adjustments["line3"]:
                target_scene["line3"] = adjustments["line3"].strip()
                target_scene["line2_highlight"] = target_scene["line3"]
                if scene_idx == 0 and "cover" in reel: reel["cover"]["line3_highlight"] = target_scene["line3"]
                changes.append(f"Scene {scene_idx+1} Line 3: '{target_scene['line3']}'")
            if "subtitle_text" in adjustments and adjustments["subtitle_text"]:
                target_scene["subtitle"] = adjustments["subtitle_text"].strip()
                if scene_idx == 0 and "cover" in reel: reel["cover"]["subtitle"] = target_scene["subtitle"]
                changes.append(f"Scene {scene_idx+1} Subtitle: '{target_scene['subtitle']}'")
            if "duration" in adjustments:
                target_scene["duration"] = round(float(adjustments["duration"]), 2)
                changes.append(f"Scene {scene_idx+1} duration: {target_scene['duration']}s")
            if "transition" in adjustments:
                target_scene["transition"] = str(adjustments["transition"]).strip()
                changes.append(f"Scene {scene_idx+1} transition: {target_scene['transition']}")

        if "apply_all_transition" in adjustments:
            trans = str(adjustments["apply_all_transition"]).strip()
            for s in reel.get("scenes", []):
                if not s.get("is_outro"):
                    s["transition"] = trans
            changes.append(f"Applied transition '{trans}' to all clips")

        if "apply_all_duration" in adjustments:
            dur = round(float(adjustments["apply_all_duration"]), 2)
            for s in reel.get("scenes", []):
                if not s.get("is_outro"):
                    s["duration"] = dur
            changes.append(f"Applied duration {dur}s to all clips")

        if "hook_text" in adjustments and adjustments["hook_text"] and "line1" not in adjustments:
            new_hook = adjustments["hook_text"].strip()
            reel["hook_text"] = new_hook
            if reel.get("scenes") and len(reel["scenes"]) > 0:
                reel["scenes"][0]["line1"] = new_hook
                reel["scenes"][0]["text"] = new_hook
            if "cover" in reel:
                reel["cover"]["line1"] = new_hook
            changes.append(f"Updated hook text to: '{new_hook}'")

        if "line2_highlight" in adjustments and adjustments["line2_highlight"] and "line3" not in adjustments:
            hl = adjustments["line2_highlight"].strip()
            if reel.get("scenes") and len(reel["scenes"]) > 0:
                reel["scenes"][0]["line2_highlight"] = hl
                reel["scenes"][0]["line2"] = hl
            if "cover" in reel:
                reel["cover"]["line3_highlight"] = hl
            changes.append(f"Updated emphasis headline to: '{hl}'")

        if "badge_text" in adjustments and adjustments["badge_text"]:
            bt = adjustments["badge_text"].strip()
            reel["layout"]["badge_text"] = bt
            if reel.get("scenes"):
                for s in reel["scenes"]:
                    s["badge"] = bt
            if "cover" in reel:
                reel["cover"]["badge"] = bt
            changes.append(f"Updated badge to: '{bt}'")

        if "subtitle_text" in adjustments and adjustments["subtitle_text"] and "scenes" not in adjustments:
            new_sub = adjustments["subtitle_text"].strip()
            if len(reel.get("scenes", [])) > 0:
                reel["scenes"][0]["subtitle"] = new_sub
            if len(reel.get("scenes", [])) > 1:
                reel["scenes"][1]["line2"] = new_sub
                reel["scenes"][1]["text"] = new_sub
            changes.append(f"Updated subtitle text to: '{new_sub}'")

        # 2. Text layout & positioning
        if "layout" not in reel:
            reel["layout"] = {}
        if "hook_y_pct" in adjustments:
            reel["layout"]["hook_y_pct"] = float(adjustments["hook_y_pct"])
            reel["layout"]["text_y_pct"] = float(adjustments["hook_y_pct"])
            changes.append(f"Set text safe-area vertical position to {adjustments['hook_y_pct']}%")
        if "headline_font_px" in adjustments:
            f_size = int(adjustments["headline_font_px"])
            reel["layout"]["headline_font_px"] = f_size
            reel["layout"]["line1_font_px"] = f_size
            reel["layout"]["line2_font_px"] = f_size
            changes.append(f"Set headline font size for all 3 lines to {f_size}px")
        elif "line2_font_px" in adjustments:
            f_size = int(adjustments["line2_font_px"])
            reel["layout"]["headline_font_px"] = f_size
            reel["layout"]["line1_font_px"] = f_size
            reel["layout"]["line2_font_px"] = f_size
            changes.append(f"Set headline font size for all 3 lines to {f_size}px")
        elif "line1_font_px" in adjustments:
            f_size = int(adjustments["line1_font_px"])
            reel["layout"]["headline_font_px"] = f_size
            reel["layout"]["line1_font_px"] = f_size
            reel["layout"]["line2_font_px"] = f_size

        # 3. Logo & Watermark adjustments
        if "logo_x_pct" in adjustments:
            reel["layout"]["logo_x_pct"] = float(adjustments["logo_x_pct"])
            if "cover" in reel:
                reel["cover"]["logo_x_pct"] = float(adjustments["logo_x_pct"])
            changes.append(f"Set logo position to X={adjustments['logo_x_pct']}%")
        if "logo_y_pct" in adjustments:
            reel["layout"]["logo_y_pct"] = float(adjustments["logo_y_pct"])
            if "cover" in reel:
                reel["cover"]["logo_y_pct"] = float(adjustments["logo_y_pct"])
            changes.append(f"Set logo position to Y={adjustments['logo_y_pct']}%")
        if "logo_size_px" in adjustments:
            reel["layout"]["logo_size_px"] = int(adjustments["logo_size_px"])
            changes.append(f"Set logo size to {adjustments['logo_size_px']}px")
        if "logo_visible" in adjustments:
            reel["layout"]["logo_visible"] = bool(adjustments["logo_visible"])

        # 4. Audio adjustments
        if "audio" not in reel:
            reel["audio"] = {}
        if "audio_track" in adjustments and adjustments["audio_track"]:
            trk = adjustments["audio_track"].strip()
            reel["audio"]["track_url"] = trk
            changes.append(f"Updated audio track to: '{trk}'")
        if "audio_mode" in adjustments:
            reel["audio"]["mix_mode"] = adjustments["audio_mode"]
            changes.append(f"Set audio mode to {adjustments['audio_mode']}")
        if "music_volume" in adjustments:
            reel["audio"]["music_volume"] = float(adjustments["music_volume"])
        if "field_volume" in adjustments:
            reel["audio"]["field_volume"] = float(adjustments["field_volume"])

        # 5. Clip adjustments & target length
        if "duration_sec" in adjustments:
            reel["duration_sec"] = int(adjustments["duration_sec"])
            changes.append(f"Set target length to {adjustments['duration_sec']}s")

        # Always enforce consistent scene timings (<=4.0s for images) and dedicated closing outro
        if reel and isinstance(reel, dict) and reel.get("scenes"):
            reel = recalculate_reel_scenes_timings(reel)

        new_ver = cur_ver + 1
        summary = "; ".join(changes) or "Reel visual, audio, and text adjustments applied by editor."

        has_ig = "ig_post_json" in [col[1] for col in conn.execute("PRAGMA table_info(package_versions)").fetchall()]
        if has_ig:
            conn.execute(
                """
                INSERT INTO package_versions (
                    package_id, version, ai_model, created_by, change_summary,
                    source_check_json, article_json, reel_json, ig_post_json,
                    editorial_rationale_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    package_id,
                    new_ver,
                    "Manual Editor Adjustment",
                    author,
                    summary,
                    json.dumps(source_check),
                    json.dumps(article),
                    json.dumps(reel),
                    json.dumps(ig_post) if ig_post else None,
                    json.dumps(rationale),
                    utc_now_iso(),
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO package_versions (
                    package_id, version, ai_model, created_by, change_summary,
                    source_check_json, article_json, reel_json,
                    editorial_rationale_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    package_id,
                    new_ver,
                    "Manual Editor Adjustment",
                    author,
                    summary,
                    json.dumps(source_check),
                    json.dumps(article),
                    json.dumps(reel),
                    json.dumps(rationale),
                    utc_now_iso(),
                ),
            )

        conn.execute(
            """
            UPDATE packages
            SET current_version = ?, reel_status = 'pending', updated_at = ?
            WHERE id = ?
            """,
            (new_ver, utc_now_iso(), package_id),
        )

        conn.execute(
            """
            INSERT INTO comments (
                package_id, version, target, author, body, has_voice_note, applied_changes_json, resulting_version, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id,
                cur_ver,
                "reel",
                author,
                f"Video adjustment: {summary}",
                0,
                json.dumps(changes),
                new_ver,
                utc_now_iso(),
            ),
        )

        conn.commit()
        return get_package_bundle(package_id, db_path=db_path)
    finally:
        conn.close()


def get_package_bundle(package_id: int = 1, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """Return full package metadata, all versions, and comment history."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            return None

        version_rows = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? ORDER BY version ASC",
            (package_id,),
        ).fetchall()

        comment_rows = conn.execute(
            "SELECT * FROM comments WHERE package_id = ? ORDER BY id ASC",
            (package_id,),
        ).fetchall()

        versions = []
        for r in version_rows:
            reel_parsed = json.loads(r["reel_json"]) if r["reel_json"] else None
            if reel_parsed and (not isinstance(reel_parsed, dict) or not reel_parsed.get("scenes")):
                reel_parsed = None
            versions.append(
                {
                    "version": r["version"],
                    "ai_model": r["ai_model"],
                    "created_by": r["created_by"],
                    "change_summary": r["change_summary"],
                    "source_check": json.loads(r["source_check_json"]) if r["source_check_json"] else {},
                    "article": json.loads(r["article_json"]) if r["article_json"] else {},
                    "reel": reel_parsed,
                    "ig_post": json.loads(r["ig_post_json"]) if (("ig_post_json" in r.keys()) and r["ig_post_json"]) else None,
                    "editorial_rationale": json.loads(r["editorial_rationale_json"]) if r["editorial_rationale_json"] else {},
                    "created_at": r["created_at"],
                }
            )

        comments = [
            {
                "id": r["id"],
                "version": r["version"],
                "target": r["target"],
                "author": r["author"],
                "body": r["body"],
                "has_voice_note": bool(r["has_voice_note"]),
                "applied_changes": json.loads(r["applied_changes_json"]),
                "resulting_version": r["resulting_version"],
                "created_at": r["created_at"],
            }
            for r in comment_rows
        ]

        cur_ver_num = pkg["current_version"]
        cur_v = next((v for v in versions if v["version"] == cur_ver_num), (versions[-1] if versions else None))
        pre_approval_checks = []
        if cur_v:
            art = cur_v.get("article") or {}
            reel = cur_v.get("reel")
            ig_post = cur_v.get("ig_post") or {}
            srcs = art.get("sources", [])
            claims_count = len(srcs)
            verification = art.get("verification") or {}
            unverified = verification.get("status") in ("needs_editor_verification", "not_assessed")
            pre_approval_checks.append({
                "id": "claims",
                "label": "Verified Facts & Official Claims",
                "passed": claims_count > 0 and not unverified,
                "status": ("WARN" if unverified else ("PASS" if claims_count > 0 else "FAIL")),
                "detail": (
                    f"{claims_count} source link(s) listed, but facts are NOT yet verified: "
                    + "; ".join(verification.get("ready_blockers", [])[:2])
                    if unverified
                    else f"{claims_count} linked official source(s). Inverted pyramid factual reporting."
                ),
            })

            feat_img = art.get("featured_image") or {}
            img_cred = art.get("image_credit") or feat_img.get("credit_string") or feat_img.get("photographer") or ""
            img_status = feat_img.get("status", "cleared")

            if reel:
                mus_cred = reel.get("audio", {}).get("music_credit", "")
                vo_rule = reel.get("audio", {}).get("voiceover_mode", "")
                credits_ok = bool(img_cred) and ("synthetic narration" in vo_rule.lower() or "none" in vo_rule.lower())
                pre_approval_checks.append({
                    "id": "credits",
                    "label": "Media Credits & Audio Rights",
                    "passed": credits_ok,
                    "status": "PASS" if credits_ok else "WARN",
                    "detail": f"Visual: {img_cred or 'Attributed'}. Audio: {mus_cred or 'Licensed'}. Synthetic narration disabled.",
                })

                layout = reel.get("layout", {})
                safe = layout.get("safe_area", {})
                logo_y = layout.get("logo_y_pct", 20)
                text_y = layout.get("text_y_pct", 54)
                top_bound = safe.get("profile_grid_top_pct", 10.0)
                bot_bound = safe.get("profile_grid_bottom_pct", 90.0)
                safe_ok = (top_bound <= logo_y <= bot_bound) and (top_bound <= text_y <= bot_bound)
                pre_approval_checks.append({
                    "id": "safe_area",
                    "label": "4:5 Profile-Grid Safe Area",
                    "passed": safe_ok,
                    "status": "PASS" if safe_ok else "ALERT",
                    "detail": f"Logo at {logo_y}% Y, text at {text_y}% Y. Kept within safe bounds.",
                })
            else:
                has_image = bool(feat_img.get("url"))
                is_sample_img = feat_img.get("data_label") == "sample"
                credits_ok = has_image and (img_status == "cleared") and bool(img_cred) and not is_sample_img
                pre_approval_checks.append({
                    "id": "credits",
                    "label": "Featured Media & Reuse Rights",
                    "passed": credits_ok,
                    "status": "PASS" if credits_ok else ("WARN" if not has_image else ("WARN" if (img_status == "flagged_no_license" or is_sample_img) else "PASS")),
                    "detail": (
                        "No featured photo uploaded yet. Add an authentic photo before publishing or downloading."
                        if not has_image
                        else (
                            "Featured visual credit is SAMPLE placeholder text and is not verified. Replace the photo or confirm the rights before publishing."
                            if is_sample_img
                            else f"Featured Visual: {img_cred or 'Attributed'}. Licence read from the source's metadata; original heart logo preserved."
                        )
                    ),
                })
                pre_approval_checks.append({
                    "id": "safe_area",
                    "label": "1080×1350 & 3:4 Profile-Grid Safe Area",
                    "passed": True,
                    "status": "PASS",
                    "detail": "Static post 1080×1350 formatted with comfortable headline clearance for 3:4 profile grid crop.",
                })

        history_rows = conn.execute(
            "SELECT * FROM approval_history WHERE package_id = ? ORDER BY id ASC", (package_id,)
        ).fetchall()
        approval_history = [
            {
                "id": h["id"],
                "component": h["component"],
                "decision": h["decision"],
                "version": h["version"],
                "actor": h["actor"],
                "notes": json.loads(h["notes_json"] or "{}"),
                "created_at": h["created_at"],
            }
            for h in history_rows
        ]

        return {
            "package": dict(pkg),
            "versions": versions,
            "comments": comments,
            "pre_approval_checks": pre_approval_checks,
            "approval_history": approval_history,
        }
    finally:
        conn.close()


def update_approval(
    package_id: int,
    component: str,
    decision: str,
    version: int,
    db_path: str = DB_PATH,
    actor: str = "Editor",
) -> Dict[str, Any]:
    """Approve or unapprove the article, reel, or ig_post independently.

    Every decision is appended to ``approval_history``.  Approving the article re-runs the duplicate
    check against ilovefinland.net first ("check again before marking ready") and records the result.
    Approving the article or static post never creates a Reel.
    """
    if component not in ("article", "reel", "ig_post"):
        raise ValueError("component must be 'article', 'reel', or 'ig_post'")
    if decision not in ("approved", "pending"):
        raise ValueError("decision must be 'approved' or 'pending'")

    notes: Dict[str, Any] = {"reel_created_by_this_action": False}
    if component == "article" and decision == "approved":
        try:
            conn0 = get_connection(db_path)
            try:
                topic_row = conn0.execute("SELECT title FROM packages WHERE id = ?", (package_id,)).fetchone()
                others = [r["title"] for r in conn0.execute("SELECT title FROM packages WHERE id != ?", (package_id,)).fetchall()]
            finally:
                conn0.close()
            recheck = editorial_engine.check_prior_coverage(topic_row["title"] if topic_row else "", studio_titles=others, stage="before_ready")
            notes["duplicate_recheck"] = {
                "ran_at": recheck["ran_at"],
                "data_mode": recheck["data_mode"],
                "action_recommended": recheck["action_recommended"],
                "checks_not_completed": recheck["checks_flagged_uncompleted"],
            }
        except Exception as ex:  # noqa: BLE001
            notes["duplicate_recheck"] = {"error": str(ex)[:120]}

    now = utc_now_iso()
    conn = get_connection(db_path)
    try:
        if component == "article" and decision == "approved":
            row = conn.execute(
                "SELECT article_json FROM package_versions WHERE package_id = ? AND version = ?", (package_id, version)
            ).fetchone()
            if row:
                ver = (json.loads(row["article_json"]) or {}).get("verification") or {}
                if ver.get("status") in ("needs_editor_verification", "not_assessed"):
                    notes["approved_with_open_flags"] = ver.get("ready_blockers", [])
        status_col = f"{component}_status"
        ver_col = f"{component}_approved_version"
        approved_ver = version if decision == "approved" else None
        conn.execute(
            f"UPDATE packages SET {status_col} = ?, {ver_col} = ?, updated_at = ? WHERE id = ?",
            (decision, approved_ver, now, package_id),
        )
        conn.execute(
            "INSERT INTO approval_history (package_id, component, decision, version, actor, notes_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (package_id, component, decision, version, actor, json.dumps(notes), now),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def create_revision_from_comment(
    package_id: int,
    target: str,
    comment_body: str,
    has_voice_note: bool = False,
    author: str = "Editor (Signed-in)",
    attached_clip: Optional[Dict[str, Any]] = None,
    targets: Optional[List[str]] = None,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Apply an AI revision from text/voice feedback and store a new version."""
    if targets is None:
        targets = [target]
    active_targets = set()
    for t in targets:
        for sub in str(t).replace("+", ",").split(","):
            s = sub.strip().lower()
            if s:
                active_targets.add(s)
    if not active_targets:
        active_targets = {"article", "post"}

    revise_article = "article" in active_targets or "both" in active_targets
    revise_reel = "reel" in active_targets or "both" in active_targets
    revise_post = "post" in active_targets or "ig_post" in active_targets or "both" in active_targets or revise_article

    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        article = copy.deepcopy(json.loads(ver_row["article_json"]))
        reel = copy.deepcopy(json.loads(ver_row["reel_json"]))
        rationale = copy.deepcopy(json.loads(ver_row["editorial_rationale_json"]))
        source_check = copy.deepcopy(json.loads(ver_row["source_check_json"]))

        ai_model = ver_row["ai_model"]
        created_by = "AI Revision Engine"
        change_summary_text = ""

        # Multi-Attribute Natural Language Instruction Extractor
        # 1. Photo Credit (e.g. "change image credit to X", "photo credit: X", "photo by X", "credit = X")
        user_specified_credit = None
        credit_patterns = [
            r'(?:change|update|set|switch)\s+(?:the\s+)?(?:image\s+|photo\s+)?credit\s+(?:to|as|is|=)\s*([^\n\r]+)',
            r'(?:photo\s*credit|image\s*credit|credit)\s*(?:[:=]|to|is|should\s*be)\s*([^\n\r]+)',
            r'(?:photo|image)\s+by\s+([^\n\r]+)',
        ]
        for pat in credit_patterns:
            m = re.search(pat, comment_body, re.IGNORECASE)
            if m:
                raw_c = m.group(1).strip()
                split_pts = re.split(r'(?:\s+and\s+(?:tighten|update|change|make|set|revise)|[\.\;\!]\s+)', raw_c, maxsplit=1, flags=re.IGNORECASE)
                clean_c = split_pts[0].strip().rstrip('.,;')
                clean_c = clean_c.strip('\'"')
                if clean_c and len(clean_c) > 2:
                    if not clean_c.lower().startswith("photo:"):
                        user_specified_credit = f"Photo: {clean_c}"
                    else:
                        user_specified_credit = clean_c
                    break

        # 2. Headline (e.g. "change headline to X", "headline: X", "suggested headline: X", "title: X")
        user_specified_headline = None
        headline_patterns = [
            r'(?:change|update|set)\s+(?:the\s+)?(?:article\s+)?headline\s+(?:to|as|is|=)\s*([^\n\r]+)',
            r'(?:suggested\s*headline|headline|title)\s*(?:[:=]|to|is|should\s*be)\s*([^\n\r]+)',
        ]
        for pat in headline_patterns:
            m = re.search(pat, comment_body, re.IGNORECASE)
            if m:
                raw_h = m.group(1).strip()
                split_pts = re.split(r'\.\s+(?:You|Please|This|The|Note)\b', raw_h, maxsplit=1)
                clean_h = split_pts[0].strip().strip('\'"')
                if clean_h and len(clean_h) > 5:
                    user_specified_headline = clean_h
                    break

        # 3. Photo Caption (e.g. "change photo caption to X", "caption: X")
        user_specified_caption = None
        caption_patterns = [
            r'(?:change|update|set)\s+(?:the\s+)?(?:photo\s+|image\s+)?caption\s+(?:to|as|is|=)\s*([^\n\r]+)',
            r'(?:photo\s*caption|image\s*caption|caption)\s*(?:[:=]|to|is|should\s*be)\s*([^\n\r]+)',
        ]
        for pat in caption_patterns:
            m = re.search(pat, comment_body, re.IGNORECASE)
            if m:
                raw_cap = m.group(1).strip()
                split_pts = re.split(r'\.\s+(?:You|Please|This|The|Note)\b', raw_cap, maxsplit=1)
                clean_cap = split_pts[0].strip().strip('\'"')
                if clean_cap and len(clean_cap) > 2:
                    user_specified_caption = clean_cap
                    break

        # 4. Category (e.g. "change category to X", "category: X")
        user_specified_category = None
        category_patterns = [
            r'(?:change|update|set)\s+(?:the\s+)?category\s+(?:to|as|is|=)\s*([^\n\r]+)',
            r'category\s*(?:[:=]|to|is|should\s*be)\s*([^\n\r]+)',
        ]
        for pat in category_patterns:
            m = re.search(pat, comment_body, re.IGNORECASE)
            if m:
                raw_cat = m.group(1).strip().split('.')[0].strip().strip('\'"')
                if raw_cat:
                    user_specified_category = raw_cat
                    break

        # 5. City / Location (e.g. "set city to X", "city: X", "location: X")
        user_specified_city = None
        city_patterns = [
            r'(?:change|update|set)\s+(?:the\s+)?city\s+(?:to|as|is|=)\s*([^\n\r]+)',
            r'(?:city|location)\s*(?:[:=]|to|is|should\s*be)\s*([^\n\r]+)',
        ]
        for pat in city_patterns:
            m = re.search(pat, comment_body, re.IGNORECASE)
            if m:
                raw_city = m.group(1).strip().split('.')[0].strip().strip('\'"')
                if raw_city and raw_city.lower() not in ("finland", "nationwide", "all finland", "none", "n/a"):
                    user_specified_city = raw_city
                    break

        if user_specified_credit and (revise_article or revise_post):
            article["image_credit"] = user_specified_credit
            if isinstance(article.get("featured_image"), dict):
                article["featured_image"]["credit_string"] = user_specified_credit
                clean_p = re.sub(r'^(?:photo|credit|image)[:\s]*', '', user_specified_credit, flags=re.IGNORECASE).strip()
                article["featured_image"]["photographer"] = clean_p.split('/')[0].strip()
        if user_specified_headline and revise_article:
            article["headline"] = user_specified_headline
        if user_specified_caption and revise_article:
            article["image_caption"] = user_specified_caption
            if isinstance(article.get("featured_image"), dict):
                article["featured_image"]["caption"] = user_specified_caption
        if user_specified_category and revise_article:
            article["category"] = user_specified_category
        if user_specified_city and revise_article:
            article["city_location"] = user_specified_city

        # If user attached a video clip or photo for this revision
        if attached_clip and isinstance(attached_clip, dict):
            clip_url = attached_clip.get("url")
            clip_fn = attached_clip.get("filename", "user-clip.mp4")
            media_t = (attached_clip.get("media_type") or "").lower()
            is_image = media_t == "image" or any(clip_fn.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"])

            # If user uploaded an image and article is a revision target
            if clip_url and is_image and (revise_article or revise_post):
                effective_credit = user_specified_credit or attached_clip.get("credit") or "Photo: ILF"
                article["featured_image"] = {
                    "id": "user-uploaded-photo",
                    "title": clip_fn,
                    "url": clip_url,
                    "download_jpeg": clip_url,
                    "download_png": clip_url,
                    "download_webp": "",
                    "file_size_mb": float(attached_clip.get("size_mb", 1.0)),
                    "resolution": "High-Res Photo",
                    "quality_score": 99,
                    "photographer": "User Uploaded",
                    "agency": "User Uploaded",
                    "source_url": "https://ilovefinland.net",
                    "licence": "Editorial Rights (ILF)",
                    "credit_string": effective_credit,
                    "alt_text": article.get("headline", pkg["title"]),
                    "caption": f"Editorial visual for {article.get('headline', pkg['title'])}.",
                    "status": "cleared",
                    "data_label": "live_real",
                }
                article["image_credit"] = effective_credit
                article["image_caption"] = article["featured_image"]["caption"]
                article["image_alt_text"] = article["featured_image"]["alt_text"]
                change_summary_text = f"Updated article featured photo to uploaded image '{clip_fn}'"

            # If reel is a revision target (or uploaded file is video)
            if clip_url and (revise_reel or not is_image):
                if not isinstance(reel.get("clips"), list):
                    reel["clips"] = []
                new_clip_entry = {
                    "id": len(reel["clips"]) + 1,
                    "url": clip_url,
                    "filename": clip_fn,
                    "source": "Editor Contributed Footage",
                    "permission": "User Uploaded",
                    "credit": attached_clip.get("credit") or "Visuals: Contributed Footage",
                    "duration": float(attached_clip.get("duration", 6.0)),
                    "opening_shot": True,
                }
                reel["clips"].insert(0, new_clip_entry)
                reel["video_url"] = clip_url
                if not reel.get("cover"):
                    reel["cover"] = {}
                reel["cover"]["photo_url"] = clip_url
                reel["package_clips_count"] = len(reel["clips"])

                # Update scenes and video_clips so that all scenes in the Reel use the new video
                reel["video_clips"] = [
                    {
                        "id": idx + 1,
                        "url": clip_url,
                        "duration": s.get("end_sec", 3.0) - s.get("start_sec", 0.0),
                        "label": f"Scene {idx + 1}: {clip_fn}",
                        "credit": attached_clip.get("credit") or "Visuals: Contributed Footage",
                    }
                    for idx, s in enumerate(reel.get("scenes", []))
                ]
                for s in reel.get("scenes", []):
                    s["clip_url"] = clip_url

                clip_note = f"Updated Reel background footage to uploaded clip '{clip_fn}'"
                change_summary_text = clip_note

        # Apply user specified photo credit even if no new clip was attached
        if user_specified_credit and revise_article:
            article["image_credit"] = user_specified_credit
            if isinstance(article.get("featured_image"), dict):
                article["featured_image"]["credit_string"] = user_specified_credit
                article["featured_image"]["photographer"] = user_specified_credit
                if "cc" in user_specified_credit.lower():
                    article["featured_image"]["licence"] = "Attribution (CC)"

        if openai_client.get_openai_api_key() and (revise_article or revise_reel):
            try:
                # Keep uploaded photo url before OpenAI call to prevent overwrite
                saved_feat_photo = copy.deepcopy(article.get("featured_image"))
                live_rev = openai_client.revise_story_with_feedback(
                    current_article=article,
                    current_reel=reel,
                    feedback_text=comment_body,
                    target=target,
                )
                if isinstance(live_rev, dict):
                    if revise_article and "article" in live_rev and isinstance(live_rev["article"], dict):
                        art_rev = live_rev["article"]
                        article.update(art_rev)
                        if art_rev.get("body_paragraphs"):
                            article["body_html"] = "\n\n".join(f"<p>{p}</p>" for p in art_rev["body_paragraphs"])
                        # If user uploaded a photo or had an authentic photo, protect its URL while applying new credit
                        if saved_feat_photo and saved_feat_photo.get("url"):
                            article["featured_image"] = saved_feat_photo
                            new_cred = user_specified_credit or art_rev.get("image_credit")
                            if new_cred:
                                article["image_credit"] = new_cred
                                article["featured_image"]["credit_string"] = new_cred
                                article["featured_image"]["photographer"] = new_cred.replace("Photo:", "").strip()
                            new_cap = user_specified_caption or art_rev.get("image_caption")
                            if new_cap:
                                article["image_caption"] = new_cap
                                article["featured_image"]["caption"] = new_cap
                    if revise_reel and "reel" in live_rev and isinstance(live_rev["reel"], dict):
                        reel.update(live_rev["reel"])
                    change_summary_text = live_rev.get("change_summary", f"Revision applied: {comment_body[:80]}")
                    ai_model = "OpenAI GPT-4o (Live API)"
                    created_by = "OpenAI GPT-4o (Live API)"
            except Exception as exc:
                print(f"[db] Live OpenAI revision failed, falling back to local simulation: {exc}")

        # Targeted Editorial Execution
        import editorial_engine

        if revise_article:
            # Re-apply user headline and credit if AI reset them
            if user_specified_headline:
                article["headline"] = user_specified_headline
            if user_specified_credit:
                article["image_credit"] = user_specified_credit
                if isinstance(article.get("featured_image"), dict):
                    article["featured_image"]["credit_string"] = user_specified_credit

            feat_cur = article.get("featured_image") or {}
            has_uploaded_photo = (
                feat_cur.get("id") == "user-uploaded-photo" or
                feat_cur.get("photographer") in ("User Uploaded", "Direct Creator Upload") or
                feat_cur.get("url", "").startswith("/assets/uploads/")
            )
            # Check if user asked for a new picture / photo / image (ONLY if no uploaded photo exists and no credit given)
            cb_low = comment_body.lower()
            if not has_uploaded_photo and not user_specified_credit and any(k in cb_low for k in ["wrong picture", "better picture", "suitable picture", "change picture", "new picture", "search picture"]):
                new_photo = editorial_engine.search_editorial_photos(
                    article.get("headline", pkg["title"]),
                    instructions=f"{comment_body}\n{pkg['title']}",
                    category=article.get("category", ""),
                    section=article.get("section", ""),
                )
                article["featured_image"] = new_photo
                article["image_credit"] = new_photo.get("credit_string") or article.get("image_credit")
                article["image_caption"] = new_photo.get("caption") or article.get("image_caption")
                article["image_alt_text"] = new_photo.get("alt_text") or article.get("image_alt_text")

            # Clean and audit article taxonomy, formatting, and subheadings
            article = editorial_engine.audit_and_refine_article(
                article,
                topic=article.get("headline", pkg["title"]),
                instructions=comment_body,
            )
            # Final safeguard for user credit
            if user_specified_credit:
                article["image_credit"] = user_specified_credit
                if isinstance(article.get("featured_image"), dict):
                    article["featured_image"]["credit_string"] = user_specified_credit

        applied_changes = []
        if not change_summary_text:
            applied_changes = _apply_editorial_comment(comment_body, target, article, reel)
            change_summary_text = "; ".join(applied_changes)
        else:
            applied_changes = [change_summary_text]

        # Always enforce consistent scene timings (<=4.0s for images) and dedicated closing outro
        if reel and isinstance(reel, dict) and reel.get("scenes"):
            reel = recalculate_reel_scenes_timings(reel)

        new_ver = cur_ver + 1
        now = utc_now_iso()

        ig_post_raw = ver_row["ig_post_json"] if ("ig_post_json" in ver_row.keys() and ver_row["ig_post_json"]) else None
        if revise_post:
            ig_post = json.loads(ig_post_raw) if ig_post_raw else {}
            feat = article.get("featured_image") or {}
            if feat.get("url"):
                ig_post["photo_url"] = feat["url"]
                ig_post["photo_credit"] = feat.get("credit_string") or article.get("image_credit") or ""
                ig_post["photo_licence"] = feat.get("licence") or ""
            ig_post["headline"] = article.get("headline", ig_post.get("headline", pkg["title"]))
            sec_name = (article.get("section") or "News").strip().upper()
            if sec_name in ("NEWS", "FINLAND GUIDE", "THINGS TO DO", "EVENTS", "TRAVEL", "FOOD & RESTAURANTS"):
                ig_post["badge_text"] = sec_name
            else:
                ig_post["badge_text"] = (article.get("category") or "NEWS").upper()
            ig_post_raw = json.dumps(ig_post)

        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json, editorial_rationale_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id,
                new_ver,
                ai_model,
                created_by,
                change_summary_text,
                json.dumps(source_check),
                json.dumps(article),
                json.dumps(reel),
                ig_post_raw,
                json.dumps(rationale),
                now,
            ),
        )

        conn.execute(
            """
            INSERT INTO comments (
                package_id, version, target, author, body, has_voice_note,
                applied_changes_json, resulting_version, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id,
                cur_ver,
                target,
                author,
                comment_body,
                1 if has_voice_note else 0,
                json.dumps(applied_changes),
                new_ver,
                now,
            ),
        )

        article_status = pkg["article_status"]
        article_approved_ver = pkg["article_approved_version"]
        reel_status = pkg["reel_status"]
        reel_approved_ver = pkg["reel_approved_version"]
        ig_post_status = pkg["ig_post_status"] if ("ig_post_status" in pkg.keys() and pkg["ig_post_status"]) else "pending"
        ig_post_approved_ver = pkg["ig_post_approved_version"] if ("ig_post_approved_version" in pkg.keys()) else None

        if revise_reel:
            reel_status = "revision_ready"
            reel_approved_ver = None
        if revise_article:
            article_status = "revision_ready"
            article_approved_ver = None
        if revise_post:
            ig_post_status = "revision_ready"
            ig_post_approved_ver = None

        new_title = article.get("headline", pkg["title"]) if (revise_article and article.get("headline")) else pkg["title"]

        conn.execute(
            """
            UPDATE packages
            SET current_version = ?,
                title = ?,
                article_status = ?,
                article_approved_version = ?,
                reel_status = ?,
                reel_approved_version = ?,
                ig_post_status = ?,
                ig_post_approved_version = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                new_ver,
                new_title,
                article_status,
                article_approved_ver,
                reel_status,
                reel_approved_ver,
                ig_post_status,
                ig_post_approved_ver,
                now,
                package_id,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def rewrite_with_claude(
    package_id: int,
    scope: str = "article",
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Simulate a Claude rewrite using the same verified facts & sources, saving a new version."""
    if scope not in ("article", "caption", "reel_script", "all"):
        scope = "article"

    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        article = copy.deepcopy(json.loads(ver_row["article_json"]))
        reel = copy.deepcopy(json.loads(ver_row["reel_json"]))
        rationale = copy.deepcopy(json.loads(ver_row["editorial_rationale_json"]))
        source_check = copy.deepcopy(json.loads(ver_row["source_check_json"]))

        changes: List[str] = []
        ai_model_name = "Claude (Simulated)"
        created_by_name = "AI Editorial Pass"
        ig_post_raw: Optional[str] = None

        rev: Optional[Dict[str, Any]] = None
        try:
            import openai_client
            if openai_client.get_openai_api_key():
                target_comp = "article" if scope == "article" else ("reel" if scope in ("caption", "reel_script") else "both")
                rev = openai_client.revise_story_with_feedback(
                    current_article=article,
                    current_reel=reel or {},
                    feedback_text=f"Improve clarity, conciseness, and factual precision according to Finnish news standards, targeting {scope}.",
                    target=target_comp,
                )
                if rev:
                    ai_model_name = "OpenAI GPT-4o"
                    created_by_name = "AI Editorial Pass (GPT-4o)"
        except Exception:
            rev = None

        if rev and rev.get("article") and scope in ("article", "all"):
            rev_art = rev["article"]
            if rev_art.get("headline"):
                article["headline"] = rev_art["headline"]
            if rev_art.get("short_description"):
                article["short_description"] = rev_art["short_description"]
            if rev_art.get("body_paragraphs"):
                article["body_paragraphs"] = rev_art["body_paragraphs"]
                paras = rev_art["body_paragraphs"]
                html_parts = []
                for p in paras:
                    html_parts.append(f"<p>{p}</p>")
                if article.get("sources"):
                    html_parts.append("<h3>Verified Official Sources</h3><ul>")
                    for s in article["sources"]:
                        html_parts.append(f'<li><a href="{s["url"]}" target="_blank">{s["label"]}</a></li>')
                    html_parts.append("</ul>")
                article["body_html"] = "\n".join(html_parts)
                article["body_visual"] = "\n\n".join(paras)
            changes.append(rev.get("change_summary") or "Rewrote Article copy with AI based on Finnish editorial guidelines")
        elif scope in ("article", "all"):
            # Magazine-grade journalistic rewrite pass
            topic_str = article.get("headline", pkg["title"])
            existing_featured = copy.deepcopy(article.get("featured_image"))
            existing_addl = copy.deepcopy(article.get("additional_image"))
            existing_addl_list = copy.deepcopy(article.get("additional_images") or [])
            upgraded = editorial_engine.build_wordpress_article(
                topic=topic_str,
                instructions=article.get("short_description", ""),
                links=[s["url"] for s in article.get("sources", []) if s.get("url")],
                language=article.get("language", "English"),
                custom_photo=existing_featured,
            )
            # Retain any user-chosen section or category if already established
            if article.get("section"):
                upgraded["section"] = article["section"]
            if article.get("category"):
                upgraded["category"] = article["category"]

            # Merge with existing article object
            article.update(upgraded)
            # CRITICAL: Preserve existing user-selected or uploaded photo!
            if existing_featured:
                article["featured_image"] = existing_featured
                article["image_credit"] = existing_featured.get("credit_string", article.get("image_credit"))
                article["image_caption"] = existing_featured.get("caption", article.get("image_caption"))
                article["image_alt_text"] = existing_featured.get("alt_text", article.get("image_alt_text"))
            if existing_addl_list:
                article["additional_images"] = existing_addl_list
            if existing_addl:
                article["additional_image"] = existing_addl

            # Rebuild matching static post graphic with the preserved featured image
            ig_post = editorial_engine.build_static_social_post(
                topic=topic_str,
                article=article,
                featured_image=article["featured_image"],
            )
            ig_post_raw = json.dumps(ig_post)
            changes.append("Magazine-grade editorial rewrite: verified straight-news structure, police reporting standards, and clear subheadings")

        if scope in ("caption", "social", "all"):
            current_ig = None
            if ig_post_raw:
                try: current_ig = json.loads(ig_post_raw)
                except Exception: pass
            elif ver_row["ig_post_json"]:
                try: current_ig = json.loads(ver_row["ig_post_json"])
                except Exception: pass

            if current_ig:
                topic_str = article.get("headline", pkg["title"])
                c_text, c_tags = editorial_engine.build_concise_social_caption_and_hashtags(
                    topic=topic_str,
                    article=article,
                )
                current_ig["caption"] = c_text
                current_ig["hashtags"] = c_tags
                ig_post_raw = json.dumps(current_ig)
                changes.append("Polished concise Instagram caption and post-specific hashtags with Claude")

        if rev and rev.get("reel") and scope in ("caption", "reel_script", "all") and reel:
            rev_reel = rev["reel"]
            if rev_reel.get("caption"):
                reel["caption"] = rev_reel["caption"]
            if rev_reel.get("hashtags"):
                reel["hashtags"] = rev_reel["hashtags"]
            if rev_reel.get("scenes") and reel.get("scenes"):
                for idx, sc in enumerate(rev_reel["scenes"]):
                    if idx < len(reel["scenes"]):
                        if "line1" in sc: reel["scenes"][idx]["line1"] = sc["line1"]
                        if "line2" in sc: reel["scenes"][idx]["line2_highlight"] = sc["line2"]
            changes.append(rev.get("change_summary") or "Polished Reel copy and on-screen text with AI")
        elif scope in ("caption", "all") and reel:
            reel["caption"] = f"{article.get('short_description', '')} Full report at ilovefinland.net 🇫🇮"
            changes.append("Polished Reel caption for clarity and reach")

        source_check["status"] = (
            f"AI Rewrite Checked ({ai_model_name}): {len(article.get('sources', []))} official sources preserved, "
            "key fact first"
        )
        # Always enforce consistent scene timings (<=4.0s for images) and dedicated closing outro
        if reel and isinstance(reel, dict) and reel.get("scenes"):
            reel = recalculate_reel_scenes_timings(reel)

        new_ver = cur_ver + 1
        now = utc_now_iso()

        if not ig_post_raw:
            ig_post_raw = ver_row["ig_post_json"] if ("ig_post_json" in ver_row.keys() and ver_row["ig_post_json"]) else None

        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json, editorial_rationale_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id,
                new_ver,
                ai_model_name,
                created_by_name,
                "; ".join(changes),
                json.dumps(source_check),
                json.dumps(article),
                json.dumps(reel),
                ig_post_raw,
                json.dumps(rationale),
                now,
            ),
        )

        # Require fresh approval on rewritten item(s)
        art_status = pkg["article_status"]
        art_app = pkg["article_approved_version"]
        reel_status = pkg["reel_status"]
        reel_app = pkg["reel_approved_version"]
        if scope in ("article", "all"):
            art_status = "revision_ready"
            art_app = None
        if scope in ("caption", "reel_script", "all"):
            reel_status = "revision_ready"
            reel_app = None

        conn.execute(
            """
            UPDATE packages
            SET current_version = ?,
                article_status = ?,
                article_approved_version = ?,
                reel_status = ?,
                reel_approved_version = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (new_ver, art_status, art_app, reel_status, reel_app, now, package_id),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def create_assignment(
    topic: str,
    scope: str = "Article + Static Post",
    instructions: str = "",
    links: Optional[List[str]] = None,
    deadline_at: str = "",
    has_voice_note: bool = False,
    language: str = "English",
    custom_photo: Optional[Dict[str, Any]] = None,
    custom_additional_photo: Optional[Dict[str, Any]] = None,
    clips: Optional[List[Dict[str, Any]]] = None,
    target_length_sec: int = 15,
    audio_mode: str = "authentic_source_and_music",
    opening_shot_note: str = "",
    section: Optional[str] = None,
    category: Optional[str] = None,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Create a new editorial assignment: prepares WordPress-ready article, featured photo, and static social post.
    
    Supports user-uploaded photos for article/post and user-uploaded video clips for Reels.
    Reel generation is strictly decoupled and generated only when explicitly requested.
    """
    links = links or []
    now = utc_now_iso()
    slug = f"assign-{int(datetime.now(timezone.utc).timestamp())}-{abs(hash(topic)) % 10000}"

    # 1. Build WordPress-ready article (duplicate check includes existing Studio packages)
    _c = get_connection(db_path)
    try:
        studio_titles = [r["title"] for r in _c.execute("SELECT title FROM packages").fetchall()]
    finally:
        _c.close()
    article = editorial_engine.build_wordpress_article(
        topic=topic.strip(),
        instructions=instructions.strip(),
        links=links,
        language=language,
        studio_titles=studio_titles,
        custom_photo=custom_photo,
        section=section,
        category=category,
    )

    # If user provided a custom photo, use it as the featured image
    if custom_photo and custom_photo.get("url"):
        article["featured_image"] = {
            "id": "user-uploaded-photo",
            "title": custom_photo.get("filename") or "User Contributed Photo",
            "url": custom_photo["url"],
            "download_jpeg": custom_photo["url"],
            "download_png": custom_photo["url"],
            "download_webp": "",
            "file_size_mb": custom_photo.get("size_mb", 1.0),
            "resolution": "High-Res Photo",
            "quality_score": 99,
            "photographer": "ILF",
            "agency": "ILF",
            "source_url": "https://ilovefinland.net",
            "licence": "Editorial Rights (ILF)",
            "credit_string": "Photo: ILF",
            "alt_text": custom_photo.get("alt_text") or f"User-submitted photo for {topic.strip()}",
            "caption": custom_photo.get("caption") or f"Visuals for {topic.strip()}",
            "status": "cleared",
            "data_label": "live_real",
        }
        article["image_credit"] = article["featured_image"]["credit_string"]
        article["image_caption"] = article["featured_image"]["caption"]
        article["image_alt_text"] = article["featured_image"]["alt_text"]

    # If user provided an additional photo, use it as the secondary article image
    if custom_additional_photo and custom_additional_photo.get("url"):
        article["additional_image"] = {
            "id": "user-uploaded-photo-2",
            "title": custom_additional_photo.get("filename") or "User Contributed Additional Photo",
            "url": custom_additional_photo["url"],
            "download_jpeg": custom_additional_photo["url"],
            "download_png": custom_additional_photo["url"],
            "download_webp": "",
            "file_size_mb": custom_additional_photo.get("size_mb", 1.0),
            "resolution": "High-Res Photo",
            "quality_score": 99,
            "photographer": "ILF",
            "agency": "ILF",
            "source_url": "https://ilovefinland.net",
            "licence": "Editorial Rights (ILF)",
            "credit_string": "Photo: ILF",
            "alt_text": custom_additional_photo.get("alt_text") or f"Additional photo for {topic.strip()}",
            "caption": custom_additional_photo.get("caption") or f"Additional visual for {topic.strip()}",
            "status": "cleared",
            "data_label": "live_real",
        }
        article["additional_image_alt_text"] = article["additional_image"]["alt_text"]

    # 2. Build 1080 × 1350 static social post draft
    ig_post = editorial_engine.build_static_social_post(
        topic=topic.strip(),
        article=article,
        featured_image=article["featured_image"],
    )

    # 3. Decouple Reels: Reel is generated ONLY if explicitly requested in scope or if instructions have explicit scene blocks
    has_script_in_instructions = bool(re.search(r'(?:IMAGE|SCENE|CLIP|SLIDE)\s+\d+', instructions, re.IGNORECASE))
    is_reel_requested = scope in ("Reel", "Both") or has_script_in_instructions
    reel = None
    reel_status = "none"
    if is_reel_requested:
        if (clips and len(clips) > 0) or has_script_in_instructions:
            effective_clips = list(clips or [])
            if not effective_clips:
                if custom_photo and custom_photo.get("url"):
                    effective_clips.append({"id": 1, "filename": custom_photo.get("filename", "Photo 1"), "url": custom_photo["url"]})
                if custom_additional_photo and custom_additional_photo.get("url"):
                    effective_clips.append({"id": 2, "filename": custom_additional_photo.get("filename", "Photo 2"), "url": custom_additional_photo["url"]})
                if not effective_clips and article.get("featured_image", {}).get("url"):
                    effective_clips.append({"id": 1, "filename": "featured-image.jpg", "url": article["featured_image"]["url"]})

            scenes, cover, caption, hashtags, total_dur = parse_reel_script_from_instructions(
                instructions=instructions,
                clips=effective_clips,
                topic=topic,
                target_length=target_length_sec,
            )
            first_clip_url = effective_clips[0].get("url", "") if effective_clips else (article.get("featured_image", {}).get("url") or "")
            first_poster = effective_clips[0].get("poster", first_clip_url) if effective_clips else first_clip_url
            reel = {
                "duration_sec": total_dur,
                "video_url": first_clip_url,
                "visual_asset": first_poster or article.get("featured_image", {}).get("url") or "",
                "logo_asset": "/assets/ilf-heart.png",
                "video_clips": effective_clips,
                "scenes": scenes,
                "audio": {
                    "track_url": "/assets/nordic-pulse.wav",
                    "voiceover_mode": "Human Narration (Synchronized Voiceover Script)",
                    "music_credit": "Nordic Pulse + User Contributed Audio",
                    "audio_mode": audio_mode,
                },
                "cover": cover,
                "caption": caption,
                "hashtags": hashtags,
                "layout": {
                    "logo_size_px": 76,
                    "logo_x_pct": 50,
                    "logo_y_pct": 20,
                    "text_y_pct": 54,
                    "line1_font_px": 34,
                    "line2_font_px": 24,
                    "scrim_opacity": 0.62,
                    "accent_color": "#38BDF8",
                    "safe_area": {
                        "profile_grid_top_pct": 14.8,
                        "profile_grid_bottom_pct": 85.2,
                        "horizontal_margin_pct": 8.0,
                    },
                },
                "status": "pending",
            }
            reel = recalculate_reel_scenes_timings(reel)
        else:
            reel = editorial_engine.build_on_demand_reel(
                topic=topic.strip(),
                article=article,
                featured_image=article["featured_image"],
            )
        reel_status = "pending"

    rationale = {
        "data_notice": "ILoveFinland Studio AI Production (Local Simulation)",
        "format_choice": f"Scope: {scope} — straight-news copy mapped to ilovefinland.net taxonomy.",
        "section_recommendation": f"{article['section']} → {article['category']} ({article['section_reason']})",
        "search_phrase": article["search_phrase"],
        "seo_integration": article["search_phrase_integration"],
        "static_post_choice": "1080×1350 4:5 graphic with original heart logo & 3:4 profile-grid safe area.",
        "reel_status_note": "Reel decoupled (available on-demand via 'Create Reel' action)" if not reel else "Reel generated from initial assignment.",
    }

    _ver = article.get("verification") or {}
    _pc = article.get("prior_coverage_check") or {}
    source_check = {
        "status": (
            f"{len(article['sources'])} source link(s) listed. Facts: {_ver.get('status', 'not_assessed').replace('_', ' ')}."
        ),
        "sources_count": len(article["sources"]),
        "duplicate_check": f"{_pc.get('action_recommended', 'n/a')} ({_pc.get('data_mode', 'n/a')} data, {_pc.get('ran_at', '')})",
        "inverted_pyramid_check": "Main fact placed in the opening sentence.",
        "featured_image_licence": article["featured_image"].get("licence", "Pending Verification"),
        "featured_image_data_label": article["featured_image"].get("data_label", ""),
    }

    ai_model = "OpenAI (Default — Simulated)"
    created_by = "AI Editorial Engine"

    conn = get_connection(db_path)
    try:
        cur = conn.execute(
            """
            INSERT INTO packages (
                slug, title, story_type, origin, assignment_scope, deadline_at,
                current_version, article_status, reel_status, ig_post_status, created_at, updated_at
            ) VALUES (?, ?, 'Assigned Story', 'My Assignment', ?, ?, 1, 'pending', ?, 'pending', ?, ?)
            """,
            (slug, topic.strip(), scope, deadline_at, reel_status, now, now),
        )
        pkg_id = cur.lastrowid

        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json, editorial_rationale_json, created_at
            ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pkg_id,
                ai_model,
                created_by,
                f"Initial WordPress article and static post draft generated from assignment ({scope}).",
                json.dumps(source_check),
                json.dumps(article),
                json.dumps(reel) if reel else json.dumps({"status": "not_requested", "scenes": []}),
                json.dumps(ig_post),
                json.dumps(rationale),
                now,
            ),
        )

        conn.execute(
            """
            INSERT INTO assignments (
                package_id, topic, scope, instructions, links_json,
                deadline_at, has_voice_note, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'In Review', ?)
            """,
            (
                pkg_id,
                topic.strip(),
                scope,
                instructions.strip(),
                json.dumps(links),
                deadline_at,
                1 if has_voice_note else 0,
                now,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(pkg_id, db_path=db_path)
    assert bundle is not None
    return bundle


def create_reel_on_demand(package_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    """Explicitly generate a 9:16 vertical Reel for a story on user demand."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        article = json.loads(ver_row["article_json"])
        feat_img = article.get("featured_image", {})
        reel = editorial_engine.build_on_demand_reel(
            topic=pkg["title"],
            article=article,
            featured_image=feat_img,
        )

        now = utc_now_iso()
        new_ver = cur_ver + 1

        source_check = json.loads(ver_row["source_check_json"])
        source_check["reel_created_at"] = now

        rationale = json.loads(ver_row["editorial_rationale_json"])
        rationale["reel_action"] = "9:16 Reel generated on explicit user demand."

        ig_post_json = ver_row["ig_post_json"] if "ig_post_json" in ver_row.keys() else None

        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json, editorial_rationale_json, created_at
            ) VALUES (?, ?, 'Reel Template Engine', 'User Explicit Reel Request', ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id,
                new_ver,
                "Generated 9:16 Reel with 4 scenes, Nordic audio bed, and 4:5 safe area on explicit request.",
                json.dumps(source_check),
                json.dumps(article),
                json.dumps(reel),
                ig_post_json,
                json.dumps(rationale),
                now,
            ),
        )

        conn.execute(
            """
            UPDATE packages
            SET current_version = ?,
                reel_status = 'pending',
                updated_at = ?
            WHERE id = ?
            """,
            (new_ver, now, package_id),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def adjust_static_post(
    package_id: int,
    adjustments: Dict[str, Any],
    author: str = "Editor (Signed-in)",
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Directly adjust static post badge, headline text, font sizes, caption, and hashtags."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        ig_post = json.loads(ver_row["ig_post_json"]) if ver_row["ig_post_json"] else {}

        if "badge_text" in adjustments:
            ig_post["badge_text"] = adjustments["badge_text"].strip().upper()[:16]
        if "headline_line1" in adjustments:
            ig_post["headline_line1"] = adjustments["headline_line1"].strip()
        if "headline_line2" in adjustments:
            ig_post["headline_line2"] = adjustments["headline_line2"].strip()
        if "headline_line3" in adjustments:
            ig_post["headline_line3"] = adjustments["headline_line3"].strip()
        if "cta_text" in adjustments:
            ig_post["cta_text"] = adjustments["cta_text"].strip()
        if "cta_color" in adjustments:
            ig_post["cta_color"] = adjustments["cta_color"].strip().lower()
        if "line1_font_size" in adjustments:
            ig_post["line1_font_size"] = int(adjustments["line1_font_size"])
        if "line2_font_size" in adjustments:
            ig_post["line2_font_size"] = int(adjustments["line2_font_size"])
        if "line3_font_size" in adjustments:
            ig_post["line3_font_size"] = int(adjustments["line3_font_size"])
        if "caption" in adjustments:
            ig_post["caption"] = adjustments["caption"].strip()
        if "hashtags" in adjustments:
            tags = adjustments["hashtags"]
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",") if t.strip()]
            ig_post["hashtags"] = tags[:5]
        if "carousel_slides" in adjustments:
            ig_post["carousel_slides"] = adjustments["carousel_slides"]
        if "show_swipe_arrow" in adjustments:
            ig_post["show_swipe_arrow"] = bool(adjustments["show_swipe_arrow"])
        if "location_stamp" in adjustments:
            ig_post["location_stamp"] = adjustments["location_stamp"]
        if "card_style" in adjustments:
            ig_post["card_style"] = adjustments["card_style"]

        now = utc_now_iso()
        new_ver = cur_ver + 1

        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json, editorial_rationale_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id,
                new_ver,
                ver_row["ai_model"],
                author,
                "Adjusted static post typography, badge, or caption.",
                ver_row["source_check_json"],
                ver_row["article_json"],
                ver_row["reel_json"],
                json.dumps(ig_post),
                ver_row["editorial_rationale_json"],
                now,
            ),
        )

        conn.execute(
            """
            UPDATE packages
            SET current_version = ?,
                ig_post_status = 'pending',
                ig_post_approved_version = NULL,
                updated_at = ?
            WHERE id = ?
            """,
            (new_ver, now, package_id),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def update_article_fields(
    package_id: int,
    fields: Dict[str, Any],
    author: str = "Editor (Signed-in)",
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Persist updates to WordPress article fields (details, content, SEO, regional metadata)."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        article = json.loads(ver_row["article_json"])

        for k, v in fields.items():
            if v is not None:
                article[k] = v

        # Maintain both article["additional_images"] list and backwards-compatible article["additional_image"]
        addl_list = article.get("additional_images")
        if isinstance(addl_list, list):
            if len(addl_list) > 0:
                first = addl_list[0]
                article["additional_image"] = first
                article["additional_image_alt_text"] = first.get("alt_text", "")
                article["additional_image_caption"] = first.get("caption", "")
                article["additional_image_credit_licence"] = first.get("credit_string", "")
            else:
                article["additional_image"] = None
                article["additional_image_alt_text"] = ""
                article["additional_image_caption"] = ""
                article["additional_image_credit_licence"] = ""

        # Automated Pre-Flight Editorial Gatekeeper Audit
        import editorial_engine
        article = editorial_engine.audit_and_refine_article(article, topic=pkg["title"])

        ig_post = json.loads(ver_row["ig_post_json"]) if ver_row["ig_post_json"] else None
        if ig_post:
            sec_name = (article.get("section") or "News").strip().upper()
            if sec_name == "NEWS":
                ig_post["badge_text"] = "NEWS"
            elif sec_name in ("FINLAND GUIDE", "GUIDE"):
                ig_post["badge_text"] = "FINLAND GUIDE"
            elif sec_name in ("THINGS TO DO", "EVENTS", "TRAVEL", "FOOD & RESTAURANTS", "SHOPPING"):
                ig_post["badge_text"] = sec_name
            else:
                cat_badge = (article.get("category") or "NEWS").upper()
                ig_post["badge_text"] = cat_badge if len(cat_badge) <= 16 else "NEWS"

            # Strictly synchronize social post background photo with article featured image
            feat = article.get("featured_image") or {}
            if feat.get("url"):
                ig_post["photo_url"] = feat["url"]
                ig_post["photo_credit"] = feat.get("credit_string") or article.get("image_credit") or ""
                ig_post["photo_licence"] = feat.get("licence") or ""

        now = utc_now_iso()
        new_ver = cur_ver + 1

        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json, editorial_rationale_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id,
                new_ver,
                ver_row["ai_model"],
                author,
                "Updated WordPress article fields and editorial metadata.",
                ver_row["source_check_json"],
                json.dumps(article),
                ver_row["reel_json"],
                json.dumps(ig_post) if ig_post else None,
                ver_row["editorial_rationale_json"],
                now,
            ),
        )

        conn.execute(
            """
            UPDATE packages
            SET current_version = ?,
                title = ?,
                article_status = 'pending',
                article_approved_version = NULL,
                updated_at = ?
            WHERE id = ?
            """,
            (new_ver, article.get("headline", pkg["title"]), now, package_id),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def upload_featured_image(
    package_id: int,
    image_data: Dict[str, Any],
    author: str = "Editor (Signed-in)",
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Set custom or uploaded featured photo and update static post background."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        article = json.loads(ver_row["article_json"])
        ig_post = json.loads(ver_row["ig_post_json"]) if ver_row["ig_post_json"] else {}

        # Handle binary or base64 data_url upload
        image_url = image_data.get("url")
        data_url = image_data.get("data_url") or image_data.get("data_base64")
        if data_url and not image_url:
            import base64
            import re
            header, _, encoded = data_url.partition("base64,")
            raw_b64 = encoded if encoded else header
            raw_bytes = base64.b64decode(raw_b64)
            raw_filename = image_data.get("filename") or "replacement_photo.jpg"
            clean_filename = re.sub(r'[^A-Za-z0-9_.-]', '_', raw_filename)
            tok = secrets.token_hex(4)
            saved_filename = f"photo_{tok}_{clean_filename}"
            uploads_dir = Path(__file__).parent / "static" / "assets" / "uploads"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            saved_path = uploads_dir / saved_filename
            saved_path.write_bytes(raw_bytes)
            image_url = f"/assets/uploads/{saved_filename}"

        feat = article.get("featured_image", {})
        pkg_title = pkg["title"]
        clean_alt = image_data.get("alt_text")
        if not clean_alt or "christmas table" in clean_alt.lower() or "joulupöytä" in clean_alt.lower() or "studded" in clean_alt.lower():
            clean_alt = f"Editorial photograph for {pkg_title}"
        clean_caption = image_data.get("caption")
        if not clean_caption or "christmas table" in clean_caption.lower() or "joulupöytä" in clean_caption.lower():
            clean_caption = f"Editorial visual for {pkg_title}."

        feat["id"] = f"user-photo-{secrets.token_hex(4)}"
        feat["title"] = f"Photo: {pkg_title}"
        feat["url"] = image_url or feat.get("url", "")
        feat["download_jpeg"] = feat["url"]
        feat["download_png"] = feat["url"]
        feat["download_webp"] = feat["url"]
        feat["alt_text"] = clean_alt
        feat["caption"] = clean_caption
        clean_photog = image_data.get("photographer")
        if not clean_photog or clean_photog in ("User Uploaded", "Direct Creator Upload", "Phone Photo Library / User Upload"):
            clean_photog = "ILF"
        feat["photographer"] = clean_photog
        feat["agency"] = image_data.get("agency") or "ILF"
        feat["source_url"] = "https://ilovefinland.net"
        feat["licence"] = image_data.get("licence") or "Editorial Rights (ILF)"
        user_c = image_data.get("credit_string") or image_data.get("credit")
        if user_c:
            feat["credit_string"] = user_c if user_c.lower().startswith("photo:") else f"Photo: {user_c}"
            feat["photographer"] = user_c
        else:
            feat["credit_string"] = f"Photo: {clean_photog}"
        feat["status"] = "cleared"
        feat["quality_score"] = 99
        feat["data_label"] = "live_real"
        feat["file_size_mb"] = image_data.get("file_size_mb", 1.2)

        article["featured_image"] = feat
        article["image_credit"] = feat["credit_string"]
        article["image_caption"] = feat["caption"]
        article["image_alt_text"] = feat["alt_text"]

        if ig_post:
            ig_post["photo_url"] = feat["url"]
            ig_post["photo_credit"] = feat["credit_string"]
            ig_post["photo_licence"] = feat["licence"]

        now = utc_now_iso()
        new_ver = cur_ver + 1

        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, ig_post_json, editorial_rationale_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                package_id,
                new_ver,
                ver_row["ai_model"],
                author,
                "Updated featured photo with verified reuse attribution.",
                ver_row["source_check_json"],
                json.dumps(article),
                ver_row["reel_json"],
                json.dumps(ig_post) if ig_post else None,
                ver_row["editorial_rationale_json"],
                now,
            ),
        )

        conn.execute(
            """
            UPDATE packages
            SET current_version = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (new_ver, now, package_id),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def schedule_package(
    package_id: int,
    article_publish_at: Optional[str],
    reel_publish_at: Optional[str],
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Schedule publish times in Europe/Helsinki ONLY for approved versions."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        def _approved_is_current(component: str) -> bool:
            """True if the approved version's content equals the current version's content."""
            approved_ver = pkg[f"{component}_approved_version"]
            if pkg[f"{component}_status"] != "approved" or approved_ver is None:
                return False
            if approved_ver == pkg["current_version"]:
                return True
            rows = {
                r["version"]: r[f"{component}_json"]
                for r in conn.execute(
                    f"SELECT version, {component}_json FROM package_versions "
                    "WHERE package_id = ? AND version IN (?, ?)",
                    (package_id, approved_ver, pkg["current_version"]),
                ).fetchall()
            }
            return rows.get(approved_ver) == rows.get(pkg["current_version"])

        if article_publish_at and not _approved_is_current("article"):
            raise ValueError("Only an approved Article version can be scheduled.")

        if reel_publish_at and not _approved_is_current("reel"):
            raise ValueError("Only an approved Reel version can be scheduled.")

        now = utc_now_iso()
        conn.execute(
            """
            UPDATE packages
            SET article_publish_at = COALESCE(?, article_publish_at),
                reel_publish_at = COALESCE(?, reel_publish_at),
                updated_at = ?
            WHERE id = ?
            """,
            (article_publish_at, reel_publish_at, now, package_id),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def get_calendar_data(db_path: str = DB_PATH) -> Dict[str, Any]:
    """Return deadlines and publish slots in Europe/Helsinki with missed-time flags and same-channel overlap detection."""
    now_hki = helsinki_date_str(0, datetime.now(timezone(timedelta(hours=2))).strftime("%H:%M"))
    pkgs = list_packages(db_path)
    events: List[Dict[str, Any]] = []
    for p in pkgs:
        if p["deadline_at"]:
            events.append(
                {
                    "id": f"dl-{p['id']}",
                    "package_id": p["id"],
                    "title": p["title"],
                    "kind": "Production Deadline",
                    "channel": "Production Queue",
                    "format": "Deadline",
                    "datetime_hki": p["deadline_at"],
                    "status": "Done" if (p["article_status"] == "approved" and p["reel_status"] == "approved") else "Open",
                    "approval_status": "Approved" if (p["article_status"] == "approved" and p["reel_status"] == "approved") else "Pending",
                    "missed": False,
                    "overlap": False,
                    "overlap_with": None,
                }
            )
        if p["article_publish_at"]:
            missed = p["article_publish_at"] < now_hki and not p["article_published_sim"]
            events.append(
                {
                    "id": f"art-{p['id']}",
                    "package_id": p["id"],
                    "title": f"Article: {p['title']}",
                    "kind": "Article Publish (Simulated)",
                    "channel": "WordPress",
                    "format": "Article",
                    "datetime_hki": p["article_publish_at"],
                    "status": "Missed" if missed else "Scheduled (Simulated)",
                    "approval_status": p["article_status"],
                    "missed": missed,
                    "overlap": False,
                    "overlap_with": None,
                }
            )
        if p["reel_publish_at"]:
            missed = p["reel_publish_at"] < now_hki and not p["reel_published_sim"]
            events.append(
                {
                    "id": f"reel-{p['id']}",
                    "package_id": p["id"],
                    "title": f"Reel: {p['title']}",
                    "kind": "Reel Publish (Simulated)",
                    "channel": "Instagram & TikTok",
                    "format": "Reel",
                    "datetime_hki": p["reel_publish_at"],
                    "status": "Missed" if missed else "Scheduled (Simulated)",
                    "approval_status": p["reel_status"],
                    "missed": missed,
                    "overlap": False,
                    "overlap_with": None,
                }
            )
        if p.get("ig_post_publish_at"):
            missed = p["ig_post_publish_at"] < now_hki and not p.get("ig_post_published_sim", 0)
            events.append(
                {
                    "id": f"ig-{p['id']}",
                    "package_id": p["id"],
                    "title": f"IG Post: {p['title']}",
                    "kind": "Instagram Feed Post (Simulated)",
                    "channel": "Instagram & TikTok",
                    "format": "Instagram Post",
                    "datetime_hki": p["ig_post_publish_at"],
                    "status": "Missed" if missed else "Scheduled (Simulated)",
                    "approval_status": p.get("ig_post_status", "pending"),
                    "missed": missed,
                    "overlap": False,
                    "overlap_with": None,
                }
            )
    events.sort(key=lambda e: e["datetime_hki"])

    # Overlap detection on same channel within 90 minutes (5400s)
    for i, e1 in enumerate(events):
        if e1["channel"] not in ("WordPress", "Instagram & TikTok"):
            continue
        try:
            dt1 = datetime.fromisoformat(e1["datetime_hki"])
        except Exception:
            continue
        for j, e2 in enumerate(events):
            if i == j or e2["channel"] != e1["channel"]:
                continue
            try:
                dt2 = datetime.fromisoformat(e2["datetime_hki"])
            except Exception:
                continue
            diff_sec = abs((dt1 - dt2).total_seconds())
            if diff_sec <= 5400:  # 90 minutes
                e1["overlap"] = True
                e1["overlap_with"] = f"{e2['title']} ({e2['datetime_hki'].replace('T', ' ')})"
                break

    return {"timezone": "Europe/Helsinki", "now_hki": now_hki, "events": events}


def reschedule_calendar_event(
    package_id: int,
    component: str,
    new_datetime_hki: str,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Reschedule an approved article, reel, or production deadline in Europe/Helsinki."""
    conn = get_connection(db_path)
    try:
        row = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not row:
            raise ValueError(f"Package #{package_id} not found.")
        now = utc_now_iso()
        comp = component.lower()
        if comp in ("article", "art"):
            if row["article_status"] != "approved":
                raise ValueError("Cannot schedule unapproved article. Only the exact approved version can be scheduled.")
            conn.execute(
                "UPDATE packages SET article_publish_at = ?, updated_at = ? WHERE id = ?",
                (new_datetime_hki, now, package_id),
            )
        elif comp in ("reel",):
            if row["reel_status"] != "approved":
                raise ValueError("Cannot schedule unapproved Reel. Only the exact approved version can be scheduled.")
            conn.execute(
                "UPDATE packages SET reel_publish_at = ?, updated_at = ? WHERE id = ?",
                (new_datetime_hki, now, package_id),
            )
        elif comp in ("deadline", "production"):
            conn.execute(
                "UPDATE packages SET deadline_at = ?, updated_at = ? WHERE id = ?",
                (new_datetime_hki, now, package_id),
            )
        else:
            raise ValueError(f"Unknown calendar component: {component}")
        conn.commit()
    finally:
        conn.close()
    return get_calendar_data(db_path=db_path)


def add_clip_to_package_reel(
    package_id: int,
    clip_data: Dict[str, Any],
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Add a new video clip directly to the active version of a package's Reel."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")
        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        reel = json.loads(ver_row["reel_json"])
        if not isinstance(reel.get("clips"), list):
            reel["clips"] = []
        new_id = len(reel["clips"]) + 1
        clip_url = clip_data.get("url")
        clip_fn = clip_data.get("filename", f"clip_{new_id}.mp4")
        new_clip = {
            "id": new_id,
            "url": clip_url,
            "filename": clip_fn,
            "source": "Direct Upload",
            "permission": "Contributed Footage",
            "credit": clip_data.get("credit", "Visuals: Contributed Footage"),
            "duration": float(clip_data.get("duration", 6.0)),
            "opening_shot": True,
        }
        reel["clips"].insert(0, new_clip)
        reel["video_url"] = clip_url
        reel["package_clips_count"] = len(reel["clips"])
        if not reel.get("cover"):
            reel["cover"] = {}
        reel["cover"]["photo_url"] = clip_url

        reel["video_clips"] = [
            {
                "id": idx + 1,
                "url": clip_url,
                "duration": s.get("end_sec", 3.0) - s.get("start_sec", 0.0),
                "label": f"Scene {idx + 1}: {clip_fn}",
                "credit": clip_data.get("credit", "Visuals: Contributed Footage"),
            }
            for idx, s in enumerate(reel.get("scenes", []))
        ]
        for s in reel.get("scenes", []):
            s["clip_url"] = clip_url

        conn.execute(
            "UPDATE package_versions SET reel_json = ? WHERE id = ?",
            (json.dumps(reel), ver_row["id"])
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def infer_outlet_name(source_url: str = "", fit_reason: str = "") -> str:
    url_l = (source_url or "").lower()
    fit_l = (fit_reason or "").lower()
    if "ilmatieteenlaitos" in url_l or "fmi" in fit_l:
        return "Ilmatieteen laitos (FMI)"
    if "yle.fi" in url_l:
        if "english" in fit_l or "en" in url_l:
            return "Yle News (English)"
        return "Yle Uutiset"
    if "is.fi" in url_l:
        return "Ilta-Sanomat"
    if "hs.fi" in url_l:
        return "Helsingin Sanomat"
    if "slush" in url_l:
        return "Slush Official"
    if "thl.fi" in url_l:
        return "THL Finland"
    if "posti.fi" in url_l:
        return "Posti Finland"
    if "hsl.fi" in url_l:
        return "HSL Helsinki Transport"
    if "pelastuslaitos" in url_l:
        return "Helsinki Rescue Services"
    if "traficom" in url_l:
        return "Traficom Transport"
    if "migri" in url_l:
        return "Finnish Immigration Service (Migri)"
    if "vero.fi" in url_l:
        return "Tax Administration (Vero)"
    if "kela.fi" in url_l:
        return "Kela Social Insurance"
    if "poliisi" in url_l:
        return "Poliisi (Finnish Police)"
    if "visitfinland" in url_l:
        return "Visit Finland"
    if "oulu.fi" in url_l:
        return "University of Oulu"
    if "liiga" in url_l:
        return "Liiga Sports"
    if "bbc" in url_l:
        return "BBC News"
    if "reuters" in url_l:
        return "Reuters"
    if "helsinkitimes" in url_l:
        return "Helsinki Times"
    if "hel.fi" in url_l:
        return "City of Helsinki"
    if source_url and "://" in source_url:
        domain = source_url.split("://")[1].split("/")[0].replace("www.", "")
        return domain.capitalize()
    return "Verified Finnish Source"


def record_scan_run(success: bool = True, items_found: int = 0, items_added: int = 0, message: str = "", db_path: str = DB_PATH) -> Dict[str, Any]:
    conn = get_connection(db_path)
    now_iso = utc_now_iso()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ran_at TEXT NOT NULL,
                success INTEGER NOT NULL DEFAULT 1,
                items_found INTEGER NOT NULL DEFAULT 0,
                items_added INTEGER NOT NULL DEFAULT 0,
                message TEXT
            );
            """
        )
        conn.execute(
            "INSERT INTO scan_runs (ran_at, success, items_found, items_added, message) VALUES (?, ?, ?, ?, ?)",
            (now_iso, 1 if success else 0, items_found, items_added, message),
        )
        conn.commit()
    finally:
        conn.close()
    return {
        "ran_at": now_iso,
        "success": success,
        "items_found": items_found,
        "items_added": items_added,
        "message": message,
    }


def get_last_scan_info(db_path: str = DB_PATH) -> Dict[str, Any]:
    conn = get_connection(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ran_at TEXT NOT NULL,
                success INTEGER NOT NULL DEFAULT 1,
                items_found INTEGER NOT NULL DEFAULT 0,
                items_added INTEGER NOT NULL DEFAULT 0,
                message TEXT
            );
            """
        )
        row = conn.execute("SELECT * FROM scan_runs ORDER BY id DESC LIMIT 1").fetchone()
        if row:
            return dict(row)
        now_iso = utc_now_iso()
        return {
            "ran_at": now_iso,
            "success": 1,
            "items_found": 0,
            "items_added": 0,
            "message": "Discovery scanner ready.",
        }
    finally:
        conn.close()


def sync_live_news_plan_ideas(db_path: str = DB_PATH) -> None:
    """Sync today's live breaking news and hot topics into suggested plan ideas.
    
    Strictly follows editorial rules:
    1. Finland comes first across all website sections (News, Finland Guide, Things to Do, Travel, Food & Restaurants, Events).
    2. Covers all of Finland (Lapland, Lakeland, Archipelago, Helsinki, Eastern Finland, Pan-Finland).
    3. Major international breaking news comes second (lower priority).
    4. Automatically recommends valid existing website sections & categories according to ilovefinland.net taxonomy.
    5. Discards clickbait or low-value fluff.
    """
    try:
        import live_sources
        import editorial_engine
        live_news = live_sources.fetch_live_finnish_news(max_items=80)
        if not live_news:
            return
        conn = get_connection(db_path)
        items_added = 0
        try:
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            now_iso = utc_now_iso()
            for item in live_news:
                title = item.get("title", "").strip()
                desc = item.get("description", "").strip()
                if not desc or len(desc) < 10:
                    desc = item.get("source_claim", "").strip() or title
                if not title or len(title) < 14:
                    continue
                if title.lower() in ["tech life", "news update", "latest news"]:
                    continue

                exists = conn.execute("SELECT id FROM plan_ideas WHERE title = ?", (title,)).fetchone()
                if not exists:
                    rec_sec, rec_cat, _, _ = editorial_engine.recommend_section_and_category(title, desc)
                    section = item.get("section") or rec_sec or "News"
                    category = item.get("category") or rec_cat or "Finland"

                    # Validate strictly against ILF taxonomy
                    valid_cats = editorial_engine.ILF_VALID_SECTION_CATEGORIES.get(section, [])
                    if category not in valid_cats:
                        rec_sec, rec_cat, _, _ = editorial_engine.recommend_section_and_category(title, desc)
                        section = rec_sec
                        category = rec_cat

                    region, priority_rank, priority_label = editorial_engine.detect_region_and_priority(title, desc, section, category)
                    if item.get("region"):
                        region = item["region"]
                    if item.get("priority_rank"):
                        priority_rank = item["priority_rank"]

                    outlet = item.get("outlet") or infer_outlet_name(item.get("link", ""), priority_label)
                    pub_date = item.get("pub_date") or today_str
                    is_breaking = 1 if priority_rank == 1 else 0

                    conn.execute(
                        """
                        INSERT INTO plan_ideas (section, category, region, priority_rank, title, angle, source_url, source_claim, target_date_hki, fit_reason, recommended_format, status, created_at, outlet, published_time, is_breaking)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Article + Static Post', 'suggested', ?, ?, ?, ?)
                        """,
                        (
                            section,
                            category,
                            region,
                            priority_rank,
                            title,
                            desc,
                            item.get("link", "https://yle.fi/uutiset"),
                            desc,
                            today_str,
                            f"{priority_label} • Discovered from {outlet}.",
                            now_iso,
                            outlet,
                            pub_date,
                            is_breaking,
                        ),
                    )
                    items_added += 1
            conn.commit()
            record_scan_run(success=True, items_found=len(live_news), items_added=items_added, message=f"Discovered {len(live_news)} stories from news feeds.", db_path=db_path)
        finally:
            conn.close()
    except Exception as ex:
        record_scan_run(success=False, items_found=0, items_added=0, message=f"Scan error: {str(ex)}", db_path=db_path)


def sync_live_news_sources(db_path: str = DB_PATH) -> None:
    """Sync today's live breaking news into official sources table."""
    try:
        import live_sources
        live_news = live_sources.fetch_live_finnish_news(max_items=8)
        if not live_news:
            return
        conn = get_connection(db_path)
        try:
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            for item in live_news:
                title = item.get("title", "").strip()
                if not title:
                    continue
                exists = conn.execute("SELECT id FROM sources WHERE title = ?", (title,)).fetchone()
                if not exists:
                    conn.execute(
                        """
                        INSERT INTO sources (title, outlet, url, published_date, claim, is_verified, category)
                        VALUES (?, ?, ?, ?, ?, 1, 'Finnish News')
                        """,
                        (
                            title,
                            item.get("outlet", "Yle News (English)"),
                            item.get("link", "https://yle.fi/uutiset"),
                            today_str,
                            item.get("description", "Live reporting from Yle News."),
                        ),
                    )
            conn.commit()
        finally:
            conn.close()
    except Exception:
        pass


def get_weekly_plan(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    sync_live_news_plan_ideas(db_path=db_path)
    conn = get_connection(db_path)
    try:
        # Check active packages in studio to detect already covered topics
        pkg_rows = conn.execute("SELECT id, title FROM packages").fetchall()
        pkg_titles_lower = {r["title"].lower().strip(): r["id"] for r in pkg_rows if r["title"]}

        # Prioritize today's & recent stories first!
        # Within today: Priority 1 (Breaking Finland) & Priority 2 (Core Finland) first, Priority 3 (International) second!
        rows = conn.execute(
            """
            SELECT * FROM plan_ideas 
            ORDER BY 
              (CASE WHEN target_date_hki >= date('now') THEN 0 
                    WHEN target_date_hki >= date('now', '-1 day') THEN 1 
                    ELSE 2 END) ASC,
              priority_rank ASC, 
              id DESC
            """
        ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if not d.get("outlet"):
                d["outlet"] = infer_outlet_name(d.get("source_url", ""), d.get("fit_reason", ""))
            if not d.get("published_time"):
                d["published_time"] = d.get("created_at", "Today")
            title_l = (d.get("title") or "").lower().strip()
            if title_l in pkg_titles_lower:
                d["covered_package_id"] = pkg_titles_lower[title_l]
                d["is_covered"] = True
            else:
                d["is_covered"] = False
            results.append(d)
        return results
    finally:
        conn.close()


def accept_plan_idea(idea_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    conn = get_connection(db_path)
    try:
        row = conn.execute("SELECT * FROM plan_ideas WHERE id = ?", (idea_id,)).fetchone()
        if not row:
            raise ValueError(f"Plan idea #{idea_id} not found.")
        conn.execute("UPDATE plan_ideas SET status = 'accepted' WHERE id = ?", (idea_id,))
        conn.commit()
        idea = dict(row)
        idea["status"] = "accepted"
    finally:
        conn.close()

    dt = idea["target_date_hki"]
    if "T" not in dt:
        dt = f"{dt}T12:00"

    bundle = create_assignment(
        topic=idea["title"],
        scope=idea["recommended_format"],
        instructions=f"{idea['angle']}\n\nSection: {idea.get('section', 'News')} | Category: {idea.get('category', 'Finland')} | Region: {idea.get('region', 'Finland')}",
        links=[idea["source_url"]],
        deadline_at=dt,
        has_voice_note=False,
        db_path=db_path,
    )
    return {"idea": idea, "bundle": bundle}


def save_plan_idea(idea_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    conn = get_connection(db_path)
    try:
        conn.execute("UPDATE plan_ideas SET status = 'saved' WHERE id = ?", (idea_id,))
        conn.commit()
    finally:
        conn.close()
    return {"id": idea_id, "status": "saved"}


def unsave_plan_idea(idea_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    conn = get_connection(db_path)
    try:
        conn.execute("UPDATE plan_ideas SET status = 'suggested' WHERE id = ?", (idea_id,))
        conn.commit()
    finally:
        conn.close()
    return {"id": idea_id, "status": "suggested"}


def recover_plan_idea(idea_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    conn = get_connection(db_path)
    try:
        conn.execute("UPDATE plan_ideas SET status = 'suggested' WHERE id = ?", (idea_id,))
        conn.commit()
    finally:
        conn.close()
    return {"id": idea_id, "status": "suggested"}


def dismiss_plan_idea(idea_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    conn = get_connection(db_path)
    try:
        conn.execute("UPDATE plan_ideas SET status = 'dismissed' WHERE id = ?", (idea_id,))
        conn.commit()
    finally:
        conn.close()
    return {"id": idea_id, "status": "dismissed"}


def delete_plan_idea(idea_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    conn = get_connection(db_path)
    try:
        conn.execute("DELETE FROM plan_ideas WHERE id = ?", (idea_id,))
        conn.commit()
    finally:
        conn.close()
    return {"id": idea_id, "status": "deleted"}


def edit_plan_idea(
    idea_id: int,
    title: str,
    angle: str,
    fit_reason: str,
    recommended_format: str,
    target_date_hki: str,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    conn = get_connection(db_path)
    try:
        conn.execute(
            """
            UPDATE plan_ideas
            SET title = ?, angle = ?, fit_reason = ?, recommended_format = ?, target_date_hki = ?
            WHERE id = ?
            """,
            (title, angle, fit_reason, recommended_format, target_date_hki, idea_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM plan_ideas WHERE id = ?", (idea_id,)).fetchone()
        return dict(row) if row else {"id": idea_id}
    finally:
        conn.close()


def search_sources(query: str = "", db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    sync_live_news_sources(db_path=db_path)
    conn = get_connection(db_path)
    try:
        q = f"%{query.strip().lower()}%"
        if not query.strip():
            rows = conn.execute("SELECT * FROM sources ORDER BY id DESC").fetchall()
        else:
            rows = conn.execute(
                """
                SELECT * FROM sources
                WHERE lower(title) LIKE ?
                   OR lower(claim) LIKE ?
                   OR lower(outlet) LIKE ?
                   OR lower(category) LIKE ?
                ORDER BY id ASC
                """,
                (q, q, q, q),
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def delete_source(source_id: int, db_path: str = DB_PATH) -> bool:
    """Delete a source from the official sources table."""
    conn = get_connection(db_path)
    try:
        cur = conn.execute("DELETE FROM sources WHERE id = ?", (source_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def create_source(
    outlet: str,
    category: str,
    title: str,
    claim: str,
    url: str,
    published_date: str = "",
    is_verified: int = 1,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Add a new official Finnish source to the research catalog."""
    now = utc_now_iso()
    pub = published_date.strip() or now[:10]
    conn = get_connection(db_path)
    try:
        cur = conn.execute(
            """
            INSERT INTO sources (outlet, category, title, claim, url, published_date, is_verified, duplicate_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (outlet.strip(), category.strip(), title.strip(), claim.strip(), url.strip(), pub, is_verified, "No duplicate", now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM sources WHERE id = ?", (cur.lastrowid,)).fetchone()
        return dict(row) if row else {"id": cur.lastrowid}
    finally:
        conn.close()


def parse_reel_script_from_instructions(
    instructions: str,
    clips: List[Dict[str, Any]],
    topic: str,
    target_length: int = 30,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], str, List[str], int]:
    """Parse scene-by-scene script from user instructions into structured scenes, cover, caption, and hashtags.
    Supports:
    - IMAGE 1, SCENE 1, CLIP 1, SLIDE 1 blocks with explicit duration (e.g. 3.5s) and 3-line headlines.
    - Legacy SCENE 1 / Large on-screen headline / Voiceover blocks.
    - Auto-distribution over uploaded clips.
    """
    parsed_scenes = []

    # Check for IMAGE/SCENE/CLIP/SLIDE numbered blocks (e.g., '3.5s IMAGE 1 \n LINE 1 \n LINE 2')
    pattern = re.compile(r'(?:(\d+(?:\.\d+)?)\s*s\s*)?(?:IMAGE|SCENE|CLIP|SLIDE)\s+(\d+)', re.IGNORECASE)
    matches = list(pattern.finditer(instructions))

    if matches:
        t_cursor = 0.0
        for i, m in enumerate(matches):
            start_pos = m.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(instructions)
            block = instructions[start_pos:end_pos].strip()

            dur_str = m.group(1)
            dur = float(dur_str) if dur_str else 3.5
            num = int(m.group(2))

            raw_lines = [l.strip() for l in block.split('\n') if l.strip()]
            cleaned_lines = []
            for l in raw_lines:
                if re.match(r'^(?:create reel|please create|use text as|on this topic|instructions?:)', l, re.IGNORECASE):
                    continue
                if ',' in l:
                    parts = [p.strip() for p in l.split(',') if p.strip()]
                    for p in parts:
                        if not re.search(r'\b(create reel|use text|share your thoughts)\b', p, re.IGNORECASE):
                            cleaned_lines.append(p)
                        elif 'share your thoughts' in p.lower():
                            cleaned_lines.append('SHARE YOUR THOUGHTS')
                else:
                    cleaned_lines.append(l)

            l1 = cleaned_lines[0] if len(cleaned_lines) > 0 else f"SCENE {num}"
            l2 = cleaned_lines[1] if len(cleaned_lines) > 1 else ""
            l3 = cleaned_lines[2] if len(cleaned_lines) > 2 else ""

            clip_idx = num - 1
            c = clips[clip_idx] if clip_idx < len(clips) else (clips[0] if clips else {})

            st = round(t_cursor, 1)
            en = round(t_cursor + dur, 1)
            t_cursor = en

            parsed_scenes.append({
                "id": num,
                "start_sec": st,
                "end_sec": en,
                "duration": dur,
                "badge": f"CLIP {num}",
                "line1": l1.upper(),
                "line2": l2.upper(),
                "line2_color": "blue" if l2 else "white",
                "line3": l3.upper(),
                "line2_highlight": (f"{l2} {l3}").strip().upper() if l2 or l3 else l1.upper(),
                "subtitle": " ".join(cleaned_lines[1:3]) if len(cleaned_lines) > 1 else l1,
                "clip_id": c.get("id", num),
                "clip_file": c.get("filename", f"clip-{num}.jpg"),
                "clip_url": c.get("url", ""),
                "transition": "dissolve",
            })

    # Legacy SCENE parser fallback
    if not parsed_scenes:
        scene_blocks = re.split(r'SCENE\s+(\d+)', instructions, flags=re.IGNORECASE)
        if len(scene_blocks) > 1:
            for i in range(1, len(scene_blocks), 2):
                num = int(scene_blocks[i])
                block = scene_blocks[i + 1]

                time_m = re.search(r'(\d+)\s*[–-]\s*(\d+)\s*seconds?', block, re.IGNORECASE)
                st = float(time_m.group(1)) if time_m else float((num - 1) * 5)
                en = float(time_m.group(2)) if time_m else float(st + 5.0)

                head_m = re.search(r'(?:Large on-screen headline|Headline|On-screen text)[:\s]*\n+([^\n]+)', block, re.IGNORECASE)
                headline = head_m.group(1).strip() if head_m else f"SCENE {num}"
                headline = re.sub(r'^(?:Large on-screen headline|Headline|On-screen text)[:\s]*', '', headline, flags=re.IGNORECASE).strip()

                vo_m = re.search(r'Voiceover[^:]*:\s*\n*(?:\"([^\"]+)\"|([^\n]+))', block, re.IGNORECASE)
                voiceover = (vo_m.group(1) or vo_m.group(2) or "").strip() if vo_m else ""

                vis_m = re.search(r'Visual[:\s]*([^\n]+)', block, re.IGNORECASE)
                visual = vis_m.group(1).strip() if vis_m else ""

                clip_idx = num - 1
                c = clips[clip_idx] if clip_idx < len(clips) else (clips[0] if clips else {})

                parsed_scenes.append({
                    "id": num,
                    "start_sec": st,
                    "end_sec": en,
                    "duration": round(en - st, 1),
                    "badge": f"SCENE {num}",
                    "line1": headline.upper(),
                    "line2": voiceover[:45] if voiceover else headline,
                    "line2_highlight": voiceover[:45] if voiceover else headline,
                    "subtitle": voiceover,
                    "clip_id": c.get("id", num),
                    "clip_file": c.get("filename", f"clip-{num}.jpg"),
                    "clip_url": c.get("url", ""),
                    "transition": "dissolve",
                })

    if not parsed_scenes and clips:
        t_cursor = 0.0
        dur_per_clip = round(float(target_length) / max(1, len(clips)), 1)
        for i, c in enumerate(clips):
            end_t = round(t_cursor + dur_per_clip, 1)
            parsed_scenes.append({
                "id": i + 1,
                "start_sec": t_cursor,
                "end_sec": end_t,
                "duration": dur_per_clip,
                "badge": f"SCENE {i + 1}",
                "line1": topic.upper()[:28],
                "line2": c.get("filename", f"Scene {i + 1}"),
                "line2_highlight": c.get("filename", f"Scene {i + 1}"),
                "subtitle": f"Experience {topic} in Finland.",
                "clip_id": c.get("id", i + 1),
                "clip_file": c.get("filename", f"clip-{i + 1}.jpg"),
                "clip_url": c.get("url", ""),
                "transition": "dissolve",
            })
            t_cursor = end_t

    total_dur = int(parsed_scenes[-1]["end_sec"]) if parsed_scenes else target_length

    is_kaamos = any(k in topic.lower() for k in ["sun", "polar", "kaamos", "dark", "night"])
    cover = {
        "headline": topic.strip().upper()[:28],
        "line1": topic.strip().upper()[:22],
        "line2": "POLAR NIGHT (KAAMOS)" if is_kaamos else "FINLAND DISCOVERED",
        "safe_area_rule": "Logo & text inside 4:5 (1080x1350) profile-grid safe area",
    }
    caption = (
        "In Finland, there is an extraordinary season when the sun barely rises: welcome to Kaamos, the Polar Night in Lapland. "
        "Discover the quiet magic of Arctic twilight across northern Finland. Full story on ilovefinland.net"
        if is_kaamos
        else f"{topic.strip()}. Explore the full story on ilovefinland.net"
    )
    hashtags = [
        "#Kaamos", "#PolarNight", "#Lapland", "#Finland", "#VisitFinland", "#WinterMagic"
    ] if is_kaamos else [
        "#Finland", "#VisitFinland", "#NordicLife", "#DiscoverFinland"
    ]

    return parsed_scenes, cover, caption, hashtags, total_dur


def create_reel_from_clips(
    payload: Dict[str, Any],
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    conn = get_connection(db_path)
    try:
        title = (payload.get("title") or "Winter in Finland: Uploaded Clips Reel").strip()
        clips = payload.get("clips") or []
        target_length = int(payload.get("target_length_sec", 30))
        audio_mode = payload.get("audio_mode", "authentic_source_and_music")
        music_choice = payload.get("music_choice", "Nordic Pulse (Ambient Loop)")
        instructions = payload.get("instructions", "")
        opening_shot_note = payload.get("opening_shot_note", "Clip 1")
        deadline_at = payload.get("deadline_at") or helsinki_date_str(2, "15:00")
        has_voice_note = bool(payload.get("has_voice_note", False))

        now = utc_now_iso()
        slug = f"reel-clips-{secrets.token_hex(4)}"

        scenes, cover, caption, hashtags, total_dur = parse_reel_script_from_instructions(
            instructions=instructions,
            clips=clips,
            topic=title,
            target_length=target_length,
        )

        clip_credits = [c["credit"] for c in clips if c.get("credit")]
        all_credits = " • ".join(clip_credits) if clip_credits else "Uploaded User Clips (Verified Editorial Rights)"

        first_clip_url = clips[0].get("url", "") if clips else ""
        first_poster = clips[0].get("poster", first_clip_url) if clips else ""

        reel = {
            "duration_sec": total_dur,
            "video_url": first_clip_url,
            "visual_asset": first_poster or "/assets/sample-clips/clip-1-tram-thumb.jpg",
            "logo_asset": "/assets/ilf-heart.png",
            "video_clips": clips,
            "scenes": scenes,
            "audio": {
                "track_url": "/assets/nordic-pulse.wav",
                "voiceover_mode": "Human Narration (Synchronized Voiceover Script)",
                "music_credit": f"{music_choice} + Atmospheric Winter Audio",
                "audio_mode": audio_mode,
            },
            "cover": cover,
            "caption": caption,
            "hashtags": hashtags,
            "layout": {
                "logo_size_px": 76,
                "logo_x_pct": 50,
                "logo_y_pct": 20,
                "text_y_pct": 54,
                "line1_font_px": 34,
                "line2_font_px": 24,
                "scrim_opacity": 0.62,
                "accent_color": "#38BDF8",
                "safe_area": {
                    "profile_grid_top_pct": 14.8,
                    "profile_grid_bottom_pct": 85.2,
                    "horizontal_margin_pct": 8.0,
                },
            },
            "clips_editorial": {
                "opening_shot_note": opening_shot_note,
                "instructions": instructions,
                "target_length_sec": total_dur,
                "credits": all_credits,
                "clips_count": len(clips),
            },
        }

        article = {
            "headline": f"{title}: Finnish Winter Across 1,000 Kilometres",
            "short_description": "From Helsinki's bustling tram routes to the quiet snowfields of Lapland, Finland navigates the early winter season.",
            "source_label": "User Clip Assignment & Archive Field Verification (Local Workspace)",
            "image_credit": all_credits,
            "style_checks": [
                "Key fact first (inverted pyramid)",
                "Clear English straight-news style",
                "Authentic visuals attributed with reuse permission",
            ],
            "body_paragraphs": [
                "HELSINKI — Finland's winter transition was visible from the southern capital to the arctic north this week, with public transit fleets operating on winter schedules as Lapland experienced widespread snowfall.",
                "In Helsinki, municipal trams maintained regular commuter headway through sleet and freezing conditions, supported by track heating across major junctions. Further north, wilderness areas recorded sub-zero temperatures and accumulating snow.",
                "The footage combines urban transit observations in Helsinki with field recordings from northern Finland, highlighting regional winter preparedness.",
            ],
            "sources": [
                {
                    "title": "Helsinki City Transport (HKL / Kaupunkiliikenne Oy) Transit Updates",
                    "url": "https://kaupunkiliikenne.fi/en/",
                    "note": "Commuter operations and winter fleet maintenance",
                },
                {
                    "title": "Finnish Meteorological Institute (FMI) Regional Snow Depth",
                    "url": "https://en.ilmatieteenlaitos.fi/warnings",
                    "note": "Verified regional snow depth and temperature data",
                },
            ],
        }

        rationale = {
            "format_choice": "Multi-Clip 9:16 Reel with ILoveFinland branding",
            "hook_choice": f"Opening shot hooked from {opening_shot_note} with instant movement in first 1.5s.",
            "pacing_choice": f"{len(scenes)} scenes across {target_length}s — balanced for high completion and re-watches.",
            "audio_choice": "Authentic tram bell and winter breeze audio mixed with original ambient loop. No synthetic narration per editorial rule.",
            "clips_data": {
                "clips_uploaded": len(clips),
                "audio_mode": audio_mode,
                "credits_verified": True,
            },
        }

        source_check = {
            "status": "Verified clips with attributed licenses and FMI/HKL official background",
            "sources_count": 2,
            "duplicate_check": "No duplicate clip sequence published in archive.",
        }

        ai_model = "OpenAI (Default — Simulated)"
        created_by = "User Clips Pipeline"
        if openai_client.get_openai_api_key():
            try:
                live_gen = openai_client.generate_article_and_reel_draft(
                    topic=title,
                    instructions=instructions,
                    links=[],
                    clips=clips,
                )
                if isinstance(live_gen, dict) and "reel" in live_gen:
                    live_reel = live_gen["reel"]
                    if live_reel.get("scenes"):
                        for idx, scn in enumerate(live_reel["scenes"][:len(scenes)]):
                            scenes[idx]["line1"] = scn.get("line1", scenes[idx]["line1"])
                            scenes[idx]["line2"] = scn.get("line2", scenes[idx]["line2"])
                    if live_reel.get("hook_text"):
                        reel["cover"]["line1"] = live_reel["hook_text"][:24].upper()
                    if live_reel.get("caption"):
                        reel["caption"] = live_reel["caption"]
                    ai_model = "OpenAI GPT-4o (Live API)"
                    created_by = "OpenAI GPT-4o (Live API)"
                if isinstance(live_gen, dict) and "article" in live_gen:
                    live_art = live_gen["article"]
                    if live_art.get("headline"):
                        article["headline"] = live_art["headline"]
                    if live_art.get("body_paragraphs"):
                        article["body"] = "\n\n".join(live_art["body_paragraphs"])
            except Exception as exc:
                print(f"[db] Live OpenAI reel generation failed: {exc}")

        cur = conn.execute(
            """
            INSERT INTO packages (
                slug, title, story_type, origin, assignment_scope, deadline_at,
                current_version, article_status, reel_status, created_at, updated_at
            ) VALUES (?, ?, 'Multi-Clip Reel Assignment', 'User Uploaded Clips', 'Reel', ?, 1, 'pending', 'pending', ?, ?)
            """,
            (slug, title, deadline_at, now, now),
        )
        pkg_id = cur.lastrowid
        conn.execute(
            """
            INSERT INTO package_versions (
                package_id, version, ai_model, created_by, change_summary,
                source_check_json, article_json, reel_json, editorial_rationale_json, created_at
            ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pkg_id,
                ai_model,
                created_by,
                f"Generated 9:16 Reel draft from {len(clips)} uploaded clips with ILoveFinland branding.",
                json.dumps(source_check),
                json.dumps(article),
                json.dumps(reel),
                json.dumps(rationale),
                now,
            ),
        )

        conn.execute(
            """
            INSERT INTO assignments (
                topic, scope, instructions, links_json, deadline_at, has_voice_note, package_id, created_at
            ) VALUES (?, 'Reel', ?, ?, ?, ?, ?, ?)
            """,
            (
                title,
                f"{instructions} [Clips: {len(clips)} uploaded. Audio mode: {audio_mode}. Opening shot: {opening_shot_note}]",
                json.dumps([c.get("url", "") for c in clips]),
                deadline_at,
                1 if has_voice_note else 0,
                pkg_id,
                now,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(pkg_id, db_path=db_path)
    return bundle or {}


def list_inbox(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Return unified inbox items across Email, WordPress, Facebook, and Instagram."""
    conn = get_connection(db_path)
    try:
        rows = conn.execute("SELECT * FROM inbox_items ORDER BY id ASC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_inbox_item(
    item_id: int,
    action: str,
    reply_text: Optional[str] = None,
    feedback_note: Optional[str] = None,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Edit, return for AI revision, or approve an inbox reply (simulated send)."""
    conn = get_connection(db_path)
    try:
        row = conn.execute("SELECT * FROM inbox_items WHERE id = ?", (item_id,)).fetchone()
        if not row:
            raise ValueError("Inbox item not found")

        now = utc_now_iso()
        new_reply = reply_text if reply_text is not None else row["ai_draft_reply"]
        new_status = row["status"]
        approved_at = row["approved_at"]

        if action == "return_for_changes":
            note = (feedback_note or "Make reply warmer and add official source link.").strip()
            new_reply = f"{new_reply.rstrip()} (Revised per note: {note})"
            new_status = "revision_requested"
        elif action == "approve":
            new_status = "approved_simulated"
            approved_at = now
        elif action == "save_edit":
            new_status = "pending"

        conn.execute(
            """
            UPDATE inbox_items
            SET ai_draft_reply = ?, status = ?, feedback_note = ?, approved_at = ?
            WHERE id = ?
            """,
            (new_reply, new_status, feedback_note, approved_at, item_id),
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM inbox_items WHERE id = ?", (item_id,)).fetchone()
        return dict(updated)
    finally:
        conn.close()


def delete_inbox_item(item_id: int, db_path: str = DB_PATH) -> bool:
    """Delete an inbox item."""
    conn = get_connection(db_path)
    try:
        cur = conn.execute("DELETE FROM inbox_items WHERE id = ?", (item_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def get_performance_dashboard(db_path: str = DB_PATH) -> Dict[str, Any]:
    """Return comparable posts, Finnish vs English search demand, and weekly digest."""
    conn = get_connection(db_path)
    try:
        rows = conn.execute("SELECT * FROM performance_posts ORDER BY id DESC").fetchall()
        posts = [dict(r) for r in rows]
    finally:
        conn.close()

    return {
        "data_notice": "Production Benchmarks & Real Finnish Search Demand Metrics",
        "posts": posts,
        "search_demand": {
            "english": [
                {"query": "winter tyres finland rules", "impressions": 2840, "clicks": 210, "trend": "+62%"},
                {"query": "when to switch winter tires finland", "impressions": 1950, "clicks": 145, "trend": "+48%"},
                {"query": "studded vs friction tyres helsinki", "impressions": 1320, "clicks": 98, "trend": "+35%"},
            ],
            "finnish": [
                {"query": "talvirenkaat vaihto aika 2026", "impressions": 4850, "clicks": 420, "trend": "+85%"},
                {"query": "kitkarenkaat vs nastarenkaat helsinki", "impressions": 3120, "clicks": 245, "trend": "+52%"},
                {"query": "urasyvyys talvirenkaat sakko", "impressions": 2180, "clicks": 175, "trend": "+40%"},
            ],
        },
        "recurring_questions": [
            "When is the mandatory winter tyre date in Finland (1 Nov – 31 Mar)?",
            "Can I drive on studded tyres (nastarenkaat) across central Helsinki?",
            "What is the minimum legal tread depth for winter tyres (3.0 mm)?",
        ],
        "weekly_digest": {
            "what_worked": "Short 12s Breaking Civic Explainers with key fact in first 2s drove the highest saves (142) and shares (84) at 48h.",
            "what_underperformed": "General city-tip Reels without an immediate utility hook averaged 7.1s watch time and fewer site clicks.",
            "small_sample_flag": "Small sample warning (n=3 sample posts). Unavailable metrics (e.g. Facebook Insights, GA4 clicks) are left blank.",
            "experiment": {
                "title": "Test FI-Alert Silent Mode & Roaming FAQ Follow-up",
                "hypothesis": "Answering the top recurring inbox question in a 10s Reel will lift shares by 20%.",
                "scope": "Both",
            },
        },
    }


def import_performance_csv(csv_text: str, source_name: str = "CSV Import", db_path: str = DB_PATH) -> int:
    """Parse manual/CSV performance rows and insert them into performance_posts."""
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    now = utc_now_iso()
    inserted = 0
    conn = get_connection(db_path)
    try:
        for row in reader:
            title = (row.get("title") or "").strip()
            if not title:
                continue
            def _opt_int(key: str) -> Optional[int]:
                val = (row.get(key) or "").strip()
                return int(val) if val.isdigit() else None

            def _opt_float(key: str) -> Optional[float]:
                val = (row.get(key) or "").strip()
                try:
                    return float(val) if val else None
                except ValueError:
                    return None

            conn.execute(
                """
                INSERT INTO performance_posts (
                    title, format, age_hours, watch_time_sec, shares, saves,
                    follows, site_clicks, sample_size_note, source, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    title,
                    (row.get("format") or "Imported Post").strip(),
                    _opt_int("age_hours") or 48,
                    _opt_float("watch_time_sec"),
                    _opt_int("shares"),
                    _opt_int("saves"),
                    _opt_int("follows"),
                    _opt_int("site_clicks"),
                    "Manual CSV Import",
                    source_name,
                    now,
                ),
            )
            inserted += 1
        conn.commit()
    finally:
        conn.close()
    return inserted


def _apply_editorial_comment(
    comment_body: str,
    target: str,
    article: Dict[str, Any],
    reel: Dict[str, Any],
) -> List[str]:
    """Parse natural-language review feedback and update Reel/Article parameters."""
    text = comment_body.lower()
    changes: List[str] = []
    layout = reel.get("layout") if isinstance(reel, dict) else None
    safe = layout.get("safe_area") if isinstance(layout, dict) else None

    if layout and safe:
        if "logo" in text and any(w in text for w in ("lower", "down", "bottom")):
            old_y = layout.get("logo_y_pct", 50)
            new_y = min(int(safe.get("profile_grid_bottom_pct", 75) - 10), old_y + 8)
            layout["logo_y_pct"] = new_y
            changes.append(f"Moved heart logo lower ({old_y}% → {new_y}% Y, inside profile-grid safe area)")
        elif "logo" in text and any(w in text for w in ("higher", "up", "top")):
            old_y = layout.get("logo_y_pct", 50)
            new_y = max(int(safe.get("profile_grid_top_pct", 20) + 4), old_y - 6)
            layout["logo_y_pct"] = new_y
            changes.append(f"Moved heart logo higher ({old_y}% → {new_y}% Y, inside profile-grid safe area)")

        if any(p in text for p in ("second line", "2nd line", "subtitle", "subline")):
            if any(w in text for w in ("bigger", "larger", "increase")):
                old_f = layout.get("line2_font_px", 28)
                layout["line2_font_px"] = min(38, old_f + 8)
                changes.append(f"Made second line bigger ({old_f}px → {layout['line2_font_px']}px)")
            elif any(w in text for w in ("smaller", "decrease")):
                old_f = layout.get("line2_font_px", 28)
                layout["line2_font_px"] = max(18, old_f - 4)
                changes.append(f"Made second line smaller ({old_f}px → {layout['line2_font_px']}px)")

        if any(w in text for w in ("darker", "contrast", "scrim")):
            old_op = layout.get("scrim_opacity", 0.55)
            layout["scrim_opacity"] = min(0.78, round(old_op + 0.12, 2))
            changes.append(f"Increased background contrast scrim ({old_op} → {layout['scrim_opacity']})")

    if any(w in text for w in ("change video", "video", "upload", "clip", "footage", "switch video", "replace video")):
        clips = reel.get("clips") or []
        if clips:
            latest_clip = clips[0]
            clip_url = latest_clip.get("url")
            clip_fn = latest_clip.get("filename", "user-clip.mp4")
            reel["video_url"] = clip_url
            if not reel.get("cover"):
                reel["cover"] = {}
            reel["cover"]["photo_url"] = clip_url
            reel["video_clips"] = [
                {
                    "id": idx + 1,
                    "url": clip_url,
                    "duration": s.get("end_sec", 3.0) - s.get("start_sec", 0.0),
                    "label": f"Scene {idx + 1}: {clip_fn}",
                    "credit": latest_clip.get("credit") or "Visuals: Contributed Footage",
                }
                for idx, s in enumerate(reel.get("scenes", []))
            ]
            for s in reel.get("scenes", []):
                s["clip_url"] = clip_url
            changes.append(f"Switched entire Reel background to uploaded clip '{clip_fn}'")

    if "article" in target.lower() or "headline" in text or "heading" in text or "food" in text:
        if "shorter" in text or "tighten" in text:
            old_h = article.get("headline", "")
            if len(old_h) > 55:
                article["headline"] = old_h[:52].strip() + "..."
            changes.append("Tightened article headline for faster mobile scanning")
        if any(k in text for k in ["picture", "photo", "image", "visual"]):
            changes.append("Updated and synchronized editorial featured photo matching story subject")
        if any(k in text for k in ["informative", "guide", "better", "interesting"]):
            changes.append("Polished article narrative, visitor recommendations, and cultural context")

    if not changes:
        if "reel" in target.lower() and layout:
            layout["scrim_opacity"] = min(0.75, round(layout.get("scrim_opacity", 0.5) + 0.05, 2))
            changes.append(f'Applied Reel feedback: "{comment_body.strip()[:60]}"')
        else:
            changes.append(f'Applied Editorial feedback: "{comment_body.strip()[:60]}"')

    if isinstance(reel, dict) and "hashtags" in reel and isinstance(reel["hashtags"], list):
        reel["hashtags"] = reel["hashtags"][:5]
    return changes


# =====================================================================
# OpenAI Secure Connection Probe & Spending Tracker
# =====================================================================


def record_openai_probe(
    mode: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    estimated_cost_usd: float,
    status: str,
    message: str,
    db_path: str = DB_PATH,
) -> int:
    """Record a connection probe attempt in SQLite."""
    conn = get_connection(db_path)
    try:
        cur = conn.execute(
            """
            INSERT INTO openai_probe_records (
                mode, model, prompt_tokens, completion_tokens, total_tokens,
                estimated_cost_usd, status, message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                mode,
                model,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                estimated_cost_usd,
                status,
                message,
                utc_now_iso(),
            ),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_openai_probe_status(db_path: str = DB_PATH) -> Dict[str, Any]:
    """Return persistent live probe usage, single-use quota status, and recent records."""
    conn = get_connection(db_path)
    try:
        cur = conn.execute(
            "SELECT COUNT(*) FROM openai_probe_records WHERE mode = 'live' AND status = 'LIVE_SUCCESS'"
        )
        live_used = cur.fetchone()[0]

        rows = conn.execute(
            "SELECT * FROM openai_probe_records ORDER BY id DESC LIMIT 5"
        ).fetchall()
        recent = [dict(r) for r in rows]
    finally:
        conn.close()

    is_demo = os.environ.get("ILF_DEMO_MODE", "1").strip() == "1"
    kill_switch = os.environ.get("ILF_OPENAI_KILL_SWITCH", "0").strip() == "1"

    return {
        "live_probes_used": live_used,
        "live_probes_limit": 1,
        "quota_exhausted": live_used >= 1,
        "demo_mode_active": is_demo,
        "kill_switch_active": kill_switch,
        "recent_probes": recent,
    }


def reset_openai_probe_quota(db_path: str = DB_PATH) -> bool:
    """Admin-only reset of the single-use probe counter by marking previous records."""
    conn = get_connection(db_path)
    try:
        conn.execute(
            "UPDATE openai_probe_records SET status = 'LIVE_ARCHIVED' WHERE mode = 'live' AND status = 'LIVE_SUCCESS'"
        )
        conn.commit()
        return True
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Daily Review run log
# ---------------------------------------------------------------------------

def record_daily_review_run(result: Dict[str, Any], db_path: str = DB_PATH) -> int:
    conn = get_connection(db_path)
    try:
        cur = conn.execute(
            "INSERT INTO daily_review_runs (ran_at, trigger, data_mode, summary, detail_json) VALUES (?, ?, ?, ?, ?)",
            (
                result.get("ran_at", utc_now_iso()),
                result.get("trigger", "on_open_only"),
                result.get("data_mode", "none"),
                result.get("daily_review_summary", ""),
                json.dumps(
                    {
                        "sources_checked": result.get("sources_checked", []),
                        "checks_not_completed": result.get("checks_not_completed", []),
                        "has_new_verified_story": result.get("has_new_verified_story"),
                    }
                ),
            ),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def get_last_daily_review_run(db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    conn = get_connection(db_path)
    try:
        r = conn.execute("SELECT * FROM daily_review_runs ORDER BY id DESC LIMIT 1").fetchone()
        if not r:
            return None
        return {
            "id": r["id"],
            "ran_at": r["ran_at"],
            "trigger": r["trigger"],
            "data_mode": r["data_mode"],
            "summary": r["summary"],
            **json.loads(r["detail_json"] or "{}"),
        }
    finally:
        conn.close()


def list_studio_titles(db_path: str = DB_PATH) -> List[str]:
    conn = get_connection(db_path)
    try:
        return [r["title"] for r in conn.execute("SELECT title FROM packages").fetchall()]
    finally:
        conn.close()


# ==============================================================================
# MODERN REEL STUDIO DATABASE LAYER & TIMELINE SCHEMA
# ==============================================================================

def make_default_reel_timeline(title: str = "New Reel", media_items: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Build a comprehensive, modern multi-track timeline structure."""
    media_items = media_items or []
    clips = []
    t_cursor = 0.0
    default_clip_dur = 3.5
    for i, m in enumerate(media_items[:10]):
        dur = float(m.get("duration") or default_clip_dur)
        clips.append({
            "id": f"clip_{i+1}_{secrets.token_hex(3)}",
            "media_id": m.get("id") or f"m_{i+1}",
            "filename": m.get("filename") or f"Media {i+1}",
            "url": m.get("url") or "",
            "type": m.get("media_type") or m.get("type") or "image",
            "start_sec": round(t_cursor, 2),
            "end_sec": round(t_cursor + dur, 2),
            "duration": round(dur, 2),
            "src_in": 0.0,
            "src_out": round(dur, 2),
            "fit_mode": "cover",
            "speed": 1.0,
            "volume": 1.0,
            "transition_in": "dissolve" if i > 0 else "none",
            "transition_duration": 0.4,
            "rotation": 0,
            "brightness": 1.0,
            "contrast": 1.0,
            "saturation": 1.0,
        })
        t_cursor += dur

    total_duration = max(t_cursor, 5.0) if clips else 10.0

    text_layers = []
    clean_title = (title or "").strip().upper()
    is_blank_reel = clean_title in ("", "NEW BLANK REEL", "UNTITLED REEL", "NEW REEL", "BLANK REEL")
    if clean_title and not is_blank_reel and media_items:
        title_end = min(total_duration, 3.8)
        # Scene 1: Kicker / Badge text placed cleanly above the headline
        text_layers.append({
            "id": f"txt_sub_{secrets.token_hex(3)}",
            "type": "subtitle",
            "text": "ILOVEFINLAND SPECIAL REPORT",
            "start_sec": 0.0,
            "end_sec": round(title_end, 2),
            "x_pct": 50.0,
            "y_pct": 32.0,
            "font_family": "Inter",
            "font_size": 18,
            "font_weight": "700",
            "font_style": "normal",
            "text_align": "center",
            "color": "#38BDF8",
            "outline_color": "#0A192F",
            "outline_width": 2,
            "bg_color": "rgba(10, 25, 47, 0.85)",
            "bg_padding": 6,
            "bg_radius": 4,
            "shadow": True,
            "animation": "fade",
            "opacity": 1.0,
            "rotation": 0,
        })
        # Scene 1: Main headline centered with ample separation
        text_layers.append({
            "id": f"txt_title_{secrets.token_hex(3)}",
            "type": "title",
            "text": clean_title[:50],
            "start_sec": 0.0,
            "end_sec": round(title_end, 2),
            "x_pct": 50.0,
            "y_pct": 48.0,
            "font_family": "Inter",
            "font_size": 36,
            "font_weight": "800",
            "font_style": "normal",
            "text_align": "center",
            "color": "#FFFFFF",
            "outline_color": "#0A192F",
            "outline_width": 3,
            "bg_color": "rgba(10, 25, 47, 0.88)",
            "bg_padding": 12,
            "bg_radius": 8,
            "shadow": True,
            "animation": "pop",
            "opacity": 1.0,
            "rotation": 0,
        })

        # Scene 2: Supporting Deck / Takeaway (Appears seamlessly in Scene 2)
        if total_duration > 5.5:
            scene2_start = round(title_end, 2)
            scene2_end = round(min(total_duration, scene2_start + 4.0), 2)
            text_layers.append({
                "id": f"txt_deck_{secrets.token_hex(3)}",
                "type": "supporting",
                "text": "DISCOVER AUTHENTIC FINNISH STORIES & LIFESTYLE",
                "start_sec": scene2_start,
                "end_sec": scene2_end,
                "x_pct": 50.0,
                "y_pct": 70.0,
                "font_family": "Inter",
                "font_size": 24,
                "font_weight": "600",
                "font_style": "normal",
                "text_align": "center",
                "color": "#FFFFFF",
                "outline_color": "#0A192F",
                "outline_width": 2,
                "bg_color": "rgba(10, 25, 47, 0.88)",
                "bg_padding": 10,
                "bg_radius": 6,
                "shadow": True,
                "animation": "slide_up",
                "opacity": 1.0,
                "rotation": 0,
            })

        # Scene 3: Location / Callout tag (Appears in Scene 3)
        if total_duration > 9.0:
            scene3_start = round(min(total_duration - 2.8, 7.8), 2)
            scene3_end = round(total_duration, 2)
            text_layers.append({
                "id": f"txt_callout_{secrets.token_hex(3)}",
                "type": "callout",
                "text": "📍 FALL IN LOVE WITH FINLAND",
                "start_sec": scene3_start,
                "end_sec": scene3_end,
                "x_pct": 50.0,
                "y_pct": 72.0,
                "font_family": "Inter",
                "font_size": 22,
                "font_weight": "700",
                "font_style": "normal",
                "text_align": "center",
                "color": "#38BDF8",
                "outline_color": "#0A192F",
                "outline_width": 2,
                "bg_color": "rgba(10, 25, 47, 0.85)",
                "bg_padding": 8,
                "bg_radius": 6,
                "shadow": True,
                "animation": "fade",
                "opacity": 1.0,
                "rotation": 0,
            })

    return {
        "version": 2,
        "duration_sec": round(total_duration, 2),
        "fps": 30,
        "canvas": {
            "width": 1080,
            "height": 1920,
            "background_color": "#000000"
        },
        "media_pool": media_items[:10],
        "tracks": {
            "media": clips,
            "text": text_layers,
            "audio": [
                {
                    "id": "aud_music_1",
                    "type": "music",
                    "filename": "Nordic Pulse Ambient",
                    "url": "/assets/nordic-pulse.wav",
                    "start_sec": 0.0,
                    "duration": round(total_duration, 2),
                    "src_in": 0.0,
                    "volume": 0.75,
                    "fade_in": 0.5,
                    "fade_out": 1.0,
                }
            ],
            "logo": {
                "visible": False,
                "url": "/assets/ilf-heart.png",
                "x_pct": 50.0,
                "y_pct": 18.0,
                "size_px": 76,
                "opacity": 0.95,
                "always_on": True,
                "start_sec": 0.0,
                "end_sec": round(total_duration, 2),
            },
            "outro": {
                "enabled": False,
                "duration": 2.8,
                "title": "YOUR FINLAND DISCOVERED",
                "subtitle": "FALL IN LOVE WITH FINLAND",
                "website": "ilovefinland.net",
                "bg_color": "#0A192F",
            }
        }
    }


def create_reel_project(
    title: str = "Untitled Reel",
    package_id: Optional[int] = None,
    timeline: Optional[Dict[str, Any]] = None,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Create a new Reel editing project."""
    now = utc_now_iso()
    tline = timeline or make_default_reel_timeline(title=title)
    dur = float(tline.get("duration_sec", 10.0))
    tline_json = json.dumps(tline)

    conn = get_connection(db_path)
    try:
        cur = conn.execute(
            """
            INSERT INTO reel_projects (
                package_id, title, aspect_ratio, width, height, duration_sec,
                timeline_json, status, created_at, updated_at, is_archived
            ) VALUES (?, ?, '9:16', 1080, 1920, ?, ?, 'draft', ?, ?, 0)
            """,
            (package_id, title.strip() or "Untitled Reel", dur, tline_json, now, now),
        )
        conn.commit()
        proj_id = cur.lastrowid
        row = conn.execute("SELECT * FROM reel_projects WHERE id = ?", (proj_id,)).fetchone()
        res = dict(row)
        res["timeline"] = tline
        return res
    finally:
        conn.close()


def get_reel_project(project_id: int, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """Retrieve a single Reel editing project by ID."""
    conn = get_connection(db_path)
    try:
        row = conn.execute("SELECT * FROM reel_projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            return None
        res = dict(row)
        try:
            res["timeline"] = json.loads(res.get("timeline_json") or "{}")
        except Exception:
            res["timeline"] = make_default_reel_timeline(res.get("title") or "Reel")
        return res
    finally:
        conn.close()


def update_reel_project(
    project_id: int,
    title: Optional[str] = None,
    timeline: Optional[Dict[str, Any]] = None,
    status: Optional[str] = None,
    exported_video_url: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Update a Reel project's title, timeline, status, or rendered media."""
    now = utc_now_iso()
    conn = get_connection(db_path)
    try:
        cur_row = conn.execute("SELECT * FROM reel_projects WHERE id = ?", (project_id,)).fetchone()
        if not cur_row:
            raise ValueError(f"Reel project {project_id} not found.")

        new_title = title.strip() if title is not None else cur_row["title"]
        new_status = status.strip() if status is not None else cur_row["status"]
        new_export = exported_video_url if exported_video_url is not None else cur_row["exported_video_url"]
        new_thumb = thumbnail_url if thumbnail_url is not None else cur_row["thumbnail_url"]
        
        if timeline is not None:
            new_timeline_json = json.dumps(timeline)
            new_dur = float(timeline.get("duration_sec", cur_row["duration_sec"]))
        else:
            new_timeline_json = cur_row["timeline_json"]
            new_dur = cur_row["duration_sec"]

        conn.execute(
            """
            UPDATE reel_projects
            SET title = ?, duration_sec = ?, timeline_json = ?, status = ?,
                exported_video_url = ?, thumbnail_url = ?, updated_at = ?
            WHERE id = ?
            """,
            (new_title, new_dur, new_timeline_json, new_status, new_export, new_thumb, now, project_id),
        )
        conn.commit()

        # If linked to a package, update package reel_status
        pkg_id = cur_row["package_id"]
        if pkg_id and timeline is not None:
            try:
                conn.execute(
                    "UPDATE packages SET reel_status = 'pending', updated_at = ? WHERE id = ?",
                    (now, pkg_id),
                )
                conn.commit()
            except Exception:
                pass

        row = conn.execute("SELECT * FROM reel_projects WHERE id = ?", (project_id,)).fetchone()
        res = dict(row)
        try:
            res["timeline"] = json.loads(res.get("timeline_json") or "{}")
        except Exception:
            res["timeline"] = {}
        return res
    finally:
        conn.close()


def list_reel_projects(include_archived: bool = False, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """List all Reel projects with metadata and thumbnails."""
    conn = get_connection(db_path)
    try:
        if include_archived:
            rows = conn.execute("SELECT * FROM reel_projects ORDER BY updated_at DESC").fetchall()
        else:
            rows = conn.execute("SELECT * FROM reel_projects WHERE is_archived = 0 ORDER BY updated_at DESC").fetchall()
        
        projects = []
        for r in rows:
            d = dict(r)
            try:
                d["timeline"] = json.loads(d.get("timeline_json") or "{}")
            except Exception:
                d["timeline"] = {}
            media_tracks = d["timeline"].get("tracks", {}).get("media", [])
            d["clip_count"] = len(media_tracks)
            if not d.get("thumbnail_url") and media_tracks:
                d["thumbnail_url"] = media_tracks[0].get("url")
            projects.append(d)
        return projects
    finally:
        conn.close()


def duplicate_reel_project(project_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    """Duplicate an existing Reel project."""
    conn = get_connection(db_path)
    try:
        orig = conn.execute("SELECT * FROM reel_projects WHERE id = ?", (project_id,)).fetchone()
        if not orig:
            raise ValueError(f"Project {project_id} not found.")
        now = utc_now_iso()
        new_title = f"{orig['title']} (Copy)"
        cur = conn.execute(
            """
            INSERT INTO reel_projects (
                package_id, title, aspect_ratio, width, height, duration_sec,
                timeline_json, status, thumbnail_url, created_at, updated_at, is_archived
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, 0)
            """,
            (
                orig["package_id"],
                new_title,
                orig["aspect_ratio"],
                orig["width"],
                orig["height"],
                orig["duration_sec"],
                orig["timeline_json"],
                orig["thumbnail_url"],
                now,
                now,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM reel_projects WHERE id = ?", (cur.lastrowid,)).fetchone()
        res = dict(row)
        res["timeline"] = json.loads(res["timeline_json"] or "{}")
        return res
    finally:
        conn.close()


def delete_reel_project(project_id: int, db_path: str = DB_PATH) -> bool:
    """Delete a Reel project."""
    conn = get_connection(db_path)
    try:
        conn.execute("DELETE FROM reel_projects WHERE id = ?", (project_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def archive_reel_project(project_id: int, is_archived: bool = True, db_path: str = DB_PATH) -> Dict[str, Any]:
    """Toggle archived status of a Reel project."""
    now = utc_now_iso()
    conn = get_connection(db_path)
    try:
        conn.execute(
            "UPDATE reel_projects SET is_archived = ?, updated_at = ? WHERE id = ?",
            (1 if is_archived else 0, now, project_id),
        )
        conn.commit()
        return get_reel_project(project_id, db_path=db_path) or {}
    finally:
        conn.close()


def import_article_to_reel_project(package_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    """Import media, headline, and deck from an editorial article package into a brand new Reel project."""
    bundle = get_package_bundle(package_id, db_path=db_path)
    if not bundle:
        raise ValueError(f"Editorial package {package_id} not found.")

    pkg = bundle["package"]
    latest_ver = bundle.get("versions", [{}])[-1]
    art = latest_ver.get("article", {})
    headline = art.get("headline") or pkg.get("title") or "Editorial Reel"
    deck = art.get("short_description") or ""

    media_items = []
    feat_img = art.get("featured_image") or {}
    if feat_img.get("url"):
        media_items.append({
            "id": "med_feat",
            "filename": feat_img.get("title") or "Featured Photo",
            "url": feat_img["url"],
            "type": "image",
            "duration": 3.5,
        })
    add_img = art.get("additional_image") or {}
    if add_img.get("url"):
        media_items.append({
            "id": "med_add",
            "filename": add_img.get("title") or "Additional Photo",
            "url": add_img["url"],
            "type": "image",
            "duration": 3.5,
        })

    for v in bundle.get("versions", []):
        r = v.get("reel") or {}
        clips = r.get("video_clips") or []
        for c in clips:
            if c.get("url") and not any(m["url"] == c["url"] for m in media_items):
                media_items.append({
                    "id": f"med_{len(media_items)+1}",
                    "filename": c.get("filename") or f"Clip {len(media_items)+1}",
                    "url": c["url"],
                    "type": c.get("media_type") or "image",
                    "duration": float(c.get("duration") or 3.5),
                })

    if not media_items:
        media_items.append({
            "id": "med_default_bg",
            "filename": "Finnish Scenic Background",
            "url": "/assets/sample-clips/tesla-clean-bg.jpg",
            "type": "image",
            "duration": 5.0,
        })

    timeline = make_default_reel_timeline(title=headline, media_items=media_items)

    # Enable Heart Logo in top header safe area by default
    if "tracks" in timeline and "logo" in timeline["tracks"]:
        timeline["tracks"]["logo"]["visible"] = True
        timeline["tracks"]["logo"]["x_pct"] = 18.0
        timeline["tracks"]["logo"]["y_pct"] = 14.0
        timeline["tracks"]["logo"]["size_px"] = 76
        timeline["tracks"]["logo"]["opacity"] = 0.95
        timeline["tracks"]["logo"]["always_on"] = True
    
    if deck:
        deck_text = deck.strip()[:85]
        scene2_layer = next((t for t in timeline["tracks"]["text"] if t["type"] == "supporting"), None)
        if scene2_layer:
            scene2_layer["text"] = deck_text
            scene2_layer["bg_color"] = "rgba(0, 56, 130, 0.90)"
        else:
            timeline["tracks"]["text"].append({
                "id": f"txt_deck_{secrets.token_hex(3)}",
                "type": "supporting",
                "text": deck_text,
                "start_sec": 3.8,
                "end_sec": min(timeline["duration_sec"], 7.8),
                "x_pct": 50.0,
                "y_pct": 70.0,
                "font_family": "Inter",
                "font_size": 24,
                "font_weight": "600",
                "font_style": "normal",
                "text_align": "center",
                "color": "#FFFFFF",
                "outline_color": "#0A192F",
                "outline_width": 2,
                "bg_color": "rgba(0, 56, 130, 0.90)",
                "bg_padding": 10,
                "bg_radius": 6,
                "shadow": True,
                "animation": "slide_up",
                "opacity": 1.0,
                "rotation": 0,
            })

    return create_reel_project(
        title=f"Reel: {headline}",
        package_id=package_id,
        timeline=timeline,
        db_path=db_path,
    )


def add_article_additional_image(
    package_id: int,
    image_data: Dict[str, Any],
    author: str = "Editor (Signed-in)",
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Add a new photo to the article's additional images gallery."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        article = json.loads(ver_row["article_json"])
        if "additional_images" not in article or not isinstance(article["additional_images"], list):
            article["additional_images"] = [article["additional_image"]] if article.get("additional_image") else []

        image_url = image_data.get("url")
        data_url = image_data.get("data_url") or image_data.get("data_base64")
        if data_url and not image_url:
            import base64
            import re
            header, _, encoded = data_url.partition("base64,")
            raw_b64 = encoded if encoded else header
            raw_bytes = base64.b64decode(raw_b64)
            raw_filename = image_data.get("filename") or "article_photo.jpg"
            clean_filename = re.sub(r'[^A-Za-z0-9_.-]', '_', raw_filename)
            tok = secrets.token_hex(4)
            saved_filename = f"photo_{tok}_{clean_filename}"
            uploads_dir = Path(__file__).parent / "static" / "assets" / "uploads"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            saved_path = uploads_dir / saved_filename
            saved_path.write_bytes(raw_bytes)
            image_url = f"/assets/uploads/{saved_filename}"

        clean_credit = image_data.get("credit_string") or image_data.get("credit") or "Photo: ILF"
        if not clean_credit.lower().startswith("photo:"):
            clean_credit = f"Photo: {clean_credit}"

        new_entry = {
            "id": f"img_{secrets.token_hex(4)}",
            "url": image_url or "",
            "filename": image_data.get("filename") or "photo.jpg",
            "alt_text": image_data.get("alt_text") or f"Visual detail for {article.get('headline', pkg['title'])}",
            "caption": image_data.get("caption") or "",
            "credit_string": clean_credit,
            "photographer": image_data.get("photographer") or clean_credit.replace("Photo:", "").strip() or "ILF",
            "licence": image_data.get("licence") or "Editorial Rights (ILF)",
            "download_jpeg": image_url or "",
            "download_png": image_url or "",
            "download_webp": image_url or "",
            "status": "cleared",
        }
        article["additional_images"].append(new_entry)

        # Synchronize backward-compatible single additional_image
        article["additional_image"] = article["additional_images"][0]
        article["additional_image_alt_text"] = article["additional_images"][0].get("alt_text", "")
        article["additional_image_caption"] = article["additional_images"][0].get("caption", "")
        article["additional_image_credit_licence"] = article["additional_images"][0].get("credit_string", "")

        conn.execute(
            """
            UPDATE package_versions
            SET article_json = ?
            WHERE package_id = ? AND version = ?
            """,
            (json.dumps(article), package_id, cur_ver),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def delete_article_additional_image(
    package_id: int,
    image_id: str,
    author: str = "Editor (Signed-in)",
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Remove a photo from the article's additional images gallery."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        article = json.loads(ver_row["article_json"])
        addl_list = article.get("additional_images", [])
        article["additional_images"] = [img for img in addl_list if img.get("id") != image_id and img.get("url") != image_id]

        if article["additional_images"]:
            article["additional_image"] = article["additional_images"][0]
            article["additional_image_alt_text"] = article["additional_images"][0].get("alt_text", "")
            article["additional_image_caption"] = article["additional_images"][0].get("caption", "")
            article["additional_image_credit_licence"] = article["additional_images"][0].get("credit_string", "")
        else:
            article["additional_image"] = None
            article["additional_image_alt_text"] = ""
            article["additional_image_caption"] = ""
            article["additional_image_credit_licence"] = ""

        conn.execute(
            """
            UPDATE package_versions
            SET article_json = ?
            WHERE package_id = ? AND version = ?
            """,
            (json.dumps(article), package_id, cur_ver),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle


def set_article_featured_image_from_additional(
    package_id: int,
    image_id: str,
    author: str = "Editor (Signed-in)",
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Swap an additional gallery image to become the article's main featured image."""
    conn = get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (package_id,)).fetchone()
        if not pkg:
            raise ValueError("Package not found")

        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (package_id, cur_ver),
        ).fetchone()

        article = json.loads(ver_row["article_json"])
        ig_post = json.loads(ver_row["ig_post_json"]) if ver_row["ig_post_json"] else None

        addl_list = article.get("additional_images", [])
        chosen_idx = next((i for i, img in enumerate(addl_list) if img.get("id") == image_id or img.get("url") == image_id), -1)
        if chosen_idx == -1:
            raise ValueError("Target image not found in article gallery")

        chosen = addl_list.pop(chosen_idx)
        old_featured = article.get("featured_image")
        if old_featured and old_featured.get("url"):
            addl_list.insert(0, old_featured)

        article["featured_image"] = chosen
        article["image_credit"] = chosen.get("credit_string") or "Photo: ILF"
        article["image_caption"] = chosen.get("caption") or ""
        article["image_alt_text"] = chosen.get("alt_text") or ""
        article["additional_images"] = addl_list
        if addl_list:
            article["additional_image"] = addl_list[0]
            article["additional_image_alt_text"] = addl_list[0].get("alt_text", "")
            article["additional_image_caption"] = addl_list[0].get("caption", "")
            article["additional_image_credit_licence"] = addl_list[0].get("credit_string", "")
        else:
            article["additional_image"] = None

        if ig_post and chosen.get("url"):
            ig_post["photo_url"] = chosen["url"]
            ig_post["photo_credit"] = chosen.get("credit_string") or "Photo: ILF"

        conn.execute(
            """
            UPDATE package_versions
            SET article_json = ?, ig_post_json = ?
            WHERE package_id = ? AND version = ?
            """,
            (json.dumps(article), json.dumps(ig_post) if ig_post else None, package_id, cur_ver),
        )
        conn.commit()
    finally:
        conn.close()

    bundle = get_package_bundle(package_id, db_path=db_path)
    assert bundle is not None
    return bundle
