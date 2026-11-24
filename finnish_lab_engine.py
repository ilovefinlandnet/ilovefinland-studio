"""
Finnish Learning Lab — Isolated Backend Engine for ILoveFinland Studio.

Completely isolated from ILoveFinland editorial workflows and studio.db.
- Uses dedicated SQLite database: finnish_lab.db (quota tracking, response cache, optional sync backup).
- Uses Google AI Studio / Gemini via secure server-side integration.
- Dynamically discovers supported models via /v1beta/models (never hardcodes unverified IDs).
- Prefers free-tier multimodal Flash models (text, images, audio, PDFs).
- Enforces configurable daily and per-minute request limits; never auto-switches to paid usage.
"""

from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import re
import secrets
import sqlite3
import threading
import time
import urllib.error
import urllib.request
import wave
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def _resolve_lab_db_path() -> str:
    env_db = os.environ.get("FINNISH_LAB_DB_PATH")
    if env_db:
        return env_db
    data_dir = "/data"
    if os.path.exists(data_dir) and os.path.isdir(data_dir):
        persistent_db = os.path.join(data_dir, "finnish_lab.db")
        default_db = os.path.join(BASE_DIR, "finnish_lab.db")
        if not os.path.exists(persistent_db) and os.path.exists(default_db):
            try:
                import shutil
                shutil.copy2(default_db, persistent_db)
            except Exception:
                pass
        return persistent_db
    return os.path.join(BASE_DIR, "finnish_lab.db")

FINNISH_LAB_DB_PATH = _resolve_lab_db_path()

# Configurable free-tier safety limits (never auto-upgrade to paid)
DEFAULT_DAILY_LIMIT = int(os.environ.get("FINNISH_LAB_DAILY_LIMIT", "300"))
DEFAULT_RPM_LIMIT = int(os.environ.get("FINNISH_LAB_RPM_LIMIT", "30"))
MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024  # 18 MB per attachment safety cap

_MODEL_CACHE_LOCK = threading.Lock()
_MODEL_CACHE: Dict[str, Any] = {
    "fetched_at": 0.0,
    "models": [],
    "selected_model": None,
    "fallback_models": [],
    "capabilities": {
        "text": False,
        "image": False,
        "audio": False,
        "pdf": False,
    },
    "error": None,
}
_MODEL_CACHE_TTL_SEC = 6 * 3600  # 6 hours

_RPM_LOCK = threading.Lock()
_RPM_TIMESTAMPS: List[float] = []


def _get_gemini_key() -> str:
    return (os.environ.get("GEMINI_API_KEY") or "").strip()


def _utc_today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_finnish_lab_db(db_path: str = FINNISH_LAB_DB_PATH) -> None:
    """Initialize isolated Finnish Lab SQLite database."""
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fl_usage_daily (
                day TEXT PRIMARY KEY,
                request_count INTEGER NOT NULL DEFAULT 0,
                cache_hits INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fl_response_cache (
                cache_key TEXT PRIMARY KEY,
                endpoint TEXT NOT NULL,
                model_id TEXT NOT NULL,
                response_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fl_user_sync (
                user_email TEXT PRIMARY KEY,
                snapshot_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fl_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fl_audio_cache (
                cache_key TEXT PRIMARY KEY,
                mime_type TEXT NOT NULL,
                audio_base64 TEXT NOT NULL,
                model_id TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fl_student_sessions (
                token TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fl_users (
                email TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                status TEXT NOT NULL DEFAULT 'pending',
                email_verified INTEGER NOT NULL DEFAULT 0,
                verify_code TEXT DEFAULT '',
                verify_expires REAL DEFAULT 0,
                reset_code TEXT DEFAULT '',
                reset_expires REAL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fl_user_sessions (
                token TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()
    _ensure_admin_account(db_path)


def _get_daily_limit(db_path: str = FINNISH_LAB_DB_PATH) -> int:
    try:
        conn = sqlite3.connect(db_path)
        row = conn.execute(
            "SELECT value FROM fl_settings WHERE key='daily_limit'"
        ).fetchone()
        conn.close()
        if row and row[0]:
            val = int(row[0])
            if 5 <= val <= 500:
                return val
    except Exception:
        pass
    return DEFAULT_DAILY_LIMIT


def set_daily_limit(limit: int, db_path: str = FINNISH_LAB_DB_PATH) -> int:
    init_finnish_lab_db(db_path)
    clamped = max(5, min(500, int(limit)))
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "INSERT OR REPLACE INTO fl_settings (key, value) VALUES ('daily_limit', ?)",
            (str(clamped),),
        )
        conn.commit()
    finally:
        conn.close()
    return clamped


def get_usage_stats(db_path: str = FINNISH_LAB_DB_PATH) -> Dict[str, Any]:
    init_finnish_lab_db(db_path)
    today = _utc_today()
    limit = _get_daily_limit(db_path)
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            "SELECT request_count, cache_hits FROM fl_usage_daily WHERE day=?",
            (today,),
        ).fetchone()
        count = int(row[0]) if row else 0
        hits = int(row[1]) if row else 0
    finally:
        conn.close()
    return {
        "day": today,
        "used": count,
        "limit": limit,
        "remaining": max(0, limit - count),
        "cache_hits": hits,
        "rpm_limit": DEFAULT_RPM_LIMIT,
    }


def _record_usage(is_cache_hit: bool = False, db_path: str = FINNISH_LAB_DB_PATH) -> None:
    init_finnish_lab_db(db_path)
    today = _utc_today()
    now = _utc_now_iso()
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO fl_usage_daily (day, request_count, cache_hits, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(day) DO UPDATE SET
                request_count = request_count + excluded.request_count,
                cache_hits = cache_hits + excluded.cache_hits,
                updated_at = excluded.updated_at
            """,
            (today, 0 if is_cache_hit else 1, 1 if is_cache_hit else 0, now),
        )
        conn.commit()
    finally:
        conn.close()


def _check_rate_limits(db_path: str = FINNISH_LAB_DB_PATH) -> Optional[Dict[str, Any]]:
    stats = get_usage_stats(db_path)
    if stats["remaining"] <= 0:
        return {
            "error": "QUOTA_LIMIT_REACHED",
            "message": (
                f"Daily free-tier safety limit reached ({stats['used']}/{stats['limit']} AI requests today). "
                "No paid usage was triggered. Your saved notes, flashcards, offline grammar guide, and cached lessons remain 100% available."
            ),
            "usage": stats,
        }

    now = time.time()
    with _RPM_LOCK:
        _RPM_TIMESTAMPS[:] = [t for t in _RPM_TIMESTAMPS if now - t < 60.0]
        if len(_RPM_TIMESTAMPS) >= DEFAULT_RPM_LIMIT:
            wait_sec = max(1, int(60 - (now - _RPM_TIMESTAMPS[0])))
            return {
                "error": "RATE_LIMIT_REACHED",
                "message": (
                    f"Short cooldown active ({DEFAULT_RPM_LIMIT} requests/minute limit to protect your free tier). "
                    f"Please wait about {wait_sec} seconds and try again."
                ),
                "retry_after_sec": wait_sec,
                "usage": stats,
            }
        _RPM_TIMESTAMPS.append(now)
    return None


def discover_gemini_models(force_refresh: bool = False) -> Dict[str, Any]:
    """
    Dynamically discover supported Gemini models from Google AI Studio.
    Prefers free-tier multimodal Flash models without hardcoding unverified IDs.
    """
    now = time.time()
    with _MODEL_CACHE_LOCK:
        if (
            not force_refresh
            and _MODEL_CACHE["fetched_at"] > 0
            and (now - _MODEL_CACHE["fetched_at"]) < _MODEL_CACHE_TTL_SEC
            and _MODEL_CACHE["selected_model"]
        ):
            return dict(_MODEL_CACHE)

    key = _get_gemini_key()
    if not key:
        res = {
            "fetched_at": now,
            "models": [],
            "selected_model": None,
            "fallback_models": [],
            "capabilities": {"text": False, "image": False, "audio": False, "pdf": False},
            "error": "GEMINI_API_KEY is not configured on the server.",
        }
        with _MODEL_CACHE_LOCK:
            _MODEL_CACHE.update(res)
        return res

    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        raw_models = payload.get("models", [])
    except Exception as exc:
        err_text = str(exc).replace(key, "***")
        res = {
            "fetched_at": now,
            "models": [],
            "selected_model": None,
            "fallback_models": [],
            "capabilities": {"text": False, "image": False, "audio": False, "pdf": False},
            "error": f"Could not discover Gemini models: {err_text}",
        }
        with _MODEL_CACHE_LOCK:
            _MODEL_CACHE.update(res)
        return res

    # Filter models that support generateContent and exclude image-only / tts-only / embedding / computer-use models
    candidates: List[Dict[str, Any]] = []
    for m in raw_models:
        name = m.get("name", "")
        methods = m.get("supportedGenerationMethods") or []
        if "generateContent" not in methods:
            continue
        low = name.lower()
        if any(skip in low for skip in ("tts", "-image", "embedding", "imagen", "veo", "computer-use", "robotics", "aqa")):
            continue
        if "gemini" not in low:
            continue
        candidates.append(
            {
                "name": name,
                "display_name": m.get("displayName", name),
                "input_token_limit": m.get("inputTokenLimit", 0),
                "output_token_limit": m.get("outputTokenLimit", 0),
            }
        )

    # Preference ranking: Google Gemini Free-Tier Flash priority (3.8-flash -> 3.5-flash-lite -> live fallbacks)
    preferred_order = [
        "models/gemini-3.8-flash",
        "models/gemini-3.5-flash-lite",
        "models/gemini-flash-latest",
        "models/gemini-2.5-flash",
        "models/gemini-2.5-flash-lite",
        "models/gemini-3-flash-preview",
        "models/gemini-3.1-flash-lite-preview",
        "models/gemini-flash-lite-latest",
    ]
    available_names = {c["name"] for c in candidates}
    ordered_selected: List[str] = [p for p in preferred_order if p in available_names]
    # Add any other discovered flash models as secondary fallbacks
    for c in candidates:
        n = c["name"]
        if n not in ordered_selected and "flash" in n.lower():
            ordered_selected.append(n)
    if not ordered_selected and candidates:
        ordered_selected.append(candidates[0]["name"])

    selected = ordered_selected[0] if ordered_selected else None
    fallbacks = ordered_selected[1:6]
    is_multimodal = bool(selected and ("2.5" in selected or "2.0" in selected or "flash" in selected or "3." in selected))

    res = {
        "fetched_at": now,
        "models": candidates[:12],
        "selected_model": selected,
        "fallback_models": fallbacks,
        "capabilities": {
            "text": bool(selected),
            "image": is_multimodal,
            "audio": is_multimodal,
            "pdf": is_multimodal,
        },
        "error": None if selected else "No compatible Gemini generateContent model found.",
    }
    with _MODEL_CACHE_LOCK:
        _MODEL_CACHE.update(res)
    return res


def get_status(db_path: str = FINNISH_LAB_DB_PATH) -> Dict[str, Any]:
    discovery = discover_gemini_models(force_refresh=False)
    usage = get_usage_stats(db_path)
    return {
        "ok": bool(discovery.get("selected_model")),
        "configured": bool(_get_gemini_key()),
        "selected_model": discovery.get("selected_model"),
        "fallback_models": discovery.get("fallback_models", []),
        "capabilities": discovery.get("capabilities", {}),
        "discovery_error": discovery.get("error"),
        "usage": usage,
        "free_tier_only": True,
        "privacy": {
            "storage_mode": "device_indexeddb_plus_optional_sync",
            "isolated_from_studio": True,
        },
    }


def _cache_lookup(cache_key: str, db_path: str = FINNISH_LAB_DB_PATH) -> Optional[Dict[str, Any]]:
    init_finnish_lab_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            "SELECT model_id, response_json, created_at FROM fl_response_cache WHERE cache_key=?",
            (cache_key,),
        ).fetchone()
        if not row:
            return None
        data = json.loads(row[1])
        data["cached"] = True
        data["model"] = row[0]
        return data
    except Exception:
        return None
    finally:
        conn.close()


def _cache_store(
    cache_key: str,
    endpoint: str,
    model_id: str,
    response_obj: Dict[str, Any],
    db_path: str = FINNISH_LAB_DB_PATH,
) -> None:
    init_finnish_lab_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO fl_response_cache (cache_key, endpoint, model_id, response_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (cache_key, endpoint, model_id, json.dumps(response_obj, ensure_ascii=False), _utc_now_iso()),
        )
        conn.commit()
    finally:
        conn.close()


def _call_gemini_generate(
    system_instruction: str,
    contents: List[Dict[str, Any]],
    expect_json: bool = False,
    temperature: float = 0.35,
    max_output_tokens: int = 2048,
) -> Tuple[Optional[str], Optional[str], Optional[Dict[str, Any]]]:
    """
    Call Google AI Studio Gemini generateContent API using dynamically discovered free-tier models.
    Returns (text_output, model_used, error_dict).
    """
    key = _get_gemini_key()
    if not key:
        return None, None, {
            "error": "AI_NOT_CONFIGURED",
            "message": "Gemini API key is not configured on the server. Offline lessons, flashcards, and saved notes still work.",
        }

    discovery = discover_gemini_models()
    models_to_try: List[str] = []
    if discovery.get("selected_model"):
        models_to_try.append(discovery["selected_model"])
    for fb in discovery.get("fallback_models", []):
        if fb not in models_to_try:
            models_to_try.append(fb)

    if not models_to_try:
        return None, None, {
            "error": "NO_MODEL_AVAILABLE",
            "message": discovery.get("error") or "No Gemini model available right now.",
        }

    gen_config: Dict[str, Any] = {
        "temperature": temperature,
        "maxOutputTokens": max_output_tokens,
    }
    if expect_json:
        gen_config["responseMimeType"] = "application/json"

    body_dict: Dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": contents,
        "generationConfig": gen_config,
    }
    body_bytes = json.dumps(body_dict, ensure_ascii=False).encode("utf-8")

    last_err: Dict[str, Any] = {
        "error": "GEMINI_REQUEST_FAILED",
        "message": "Could not reach Gemini AI service.",
    }

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={key}"
        req = urllib.request.Request(
            url,
            data=body_bytes,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=22) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates") or []
            if not candidates:
                last_err = {
                    "error": "EMPTY_AI_RESPONSE",
                    "message": "The AI returned an empty response. Please try rephrasing or uploading a clearer clip/photo.",
                }
                continue
            parts = (candidates[0].get("content") or {}).get("parts") or []
            text_out = "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
            if not text_out:
                last_err = {
                    "error": "EMPTY_AI_RESPONSE",
                    "message": "No text was returned by the AI model.",
                }
                continue
            return text_out, model_name, None
        except urllib.error.HTTPError as http_err:
            err_body = ""
            try:
                err_body = http_err.read().decode("utf-8", errors="ignore")
            except Exception:
                pass
            if http_err.code == 429:
                last_err = {
                    "error": "GEMINI_FREE_QUOTA_EXCEEDED",
                    "message": (
                        "Google AI Studio free-tier quota is temporarily full. "
                        "No paid billing was triggered and none of your saved notes or flashcards were lost. "
                        "Please wait a minute and try again, or study your saved flashcards and offline lessons."
                    ),
                }
                # Try next discovered free-tier flash fallback model before giving up
                continue
            if http_err.code in (400, 404):
                last_err = {
                    "error": "MODEL_OR_INPUT_ERROR",
                    "message": f"The AI could not process that input ({http_err.code}). Try a smaller image/audio file or shorter prompt.",
                }
                if http_err.code == 404:
                    continue
                break
            last_err = {
                "error": f"HTTP_{http_err.code}",
                "message": f"Gemini AI returned HTTP {http_err.code}. Please try again shortly.",
            }
        except urllib.error.URLError:
            return None, None, {
                "error": "NETWORK_UNAVAILABLE",
                "message": "Could not connect to Gemini AI (network unavailable or timed out). Your saved notes and offline tools are still available.",
            }
        except Exception as exc:
            last_err = {
                "error": "UNEXPECTED_AI_ERROR",
                "message": f"AI request failed: {str(exc).replace(key, '***')[:160]}",
            }

    return None, None, last_err


def _build_system_prompt(mode: str, level: str, roast_mode: bool = True) -> str:
    lvl = level if level in ("A1", "A2", "B1") else "A1"
    persona = (
        f"You are a fun, warm, and encouraging Finnish language tutor helping an adult beginner at CEFR {lvl} level. "
        "Keep the vibe upbeat, approachable, and genuinely supportive — light friendly banter is great, with ZERO harshness, zero insults, and zero profanity. "
        "SCHOOL-GRADE BILINGUAL FINNISH RULES:\n"
        "- Always teach clear, accurate, standard school-grade Finnish (kirjakieli) suitable for Finnish class and exams, adding helpful everyday spoken notes only when useful.\n"
        "- ALWAYS show BOTH Finnish AND English clearly on every question, example, and answer so the learner never has to guess.\n"
        "- Celebrate progress warmly and correct mistakes gently with a clear, memorable 1-line grammar tip.\n"
        "- INDIVIDUAL PERSONAL MEMORY: Remember helpful details the learner shares (city, class topics, goals) to personalize examples naturally.\n"
        if mode != "live_translate"
        else f"You are a silent real-time Finnish classroom interpreter helping an adult {lvl} learner follow their teacher live in class. "
    )
    base = (
        persona
        + "The learner's explanation language is English, and they want to master standard beginner Finnish alongside clear English.\n"
        "CRITICAL HONESTY, PHOTO MEMORY & ACCURACY RULES:\n"
        "- NUMBERED PICTURE / PDF / AUDIO MEMORY: Uploaded items in this chat are labeled [Picture #1], [Picture #2], [PDF #1], [Audio #1], etc. Whenever the learner refers to a numbered attachment, inspect that exact attachment and answer accurately.\n"
        "- Never invent missing audio words or unreadable text. Mark unclear audio as [inaudible] or [uncertain: ...].\n"
        "- Use accurate Finnish morphology (perusmuoto, partitive, genitive, local cases, olla, -ko/-kö). Keep examples beginner-friendly.\n"
    )

    if mode == "live_translate":
        return base + (
            "\nSILENT CLASSROOM LIVE HELPER CARD MODE (NEVER SPEAKS OUT LOUD — TEXT ONLY).\n"
            "The learner is sitting quietly in a real Finnish classroom while the teacher speaks or plays audio.\n"
            "- If the input has ONLY silence, room noise, coughing, or no intelligible Finnish speech, reply with ONLY: [SILENCE]\n"
            "- Otherwise, ALWAYS respond with this EXACT scannable 3-part Classroom Helper Card (zero extra intro, zero fluff):\n\n"
            "🇫🇮 **What was said (Finnish):** <Exact Finnish sentence(s) heard>\n"
            "🇬🇧 **What it means (English):** <Clear, natural English translation>\n"
            "💬 **Suggested Replies to Say to Your Teacher:**\n"
            "- **<Simple school-level Finnish reply 1>** — *<English meaning 1>*\n"
            "- **<Simple school-level Finnish reply 2>** — *<English meaning 2>*\n"
            "- **<Simple school-level Finnish reply 3>** — *<English meaning 3>*"
        )

    if mode == "quick_class":
        return base + (
            "\nQUICK CLASSROOM MODE IS ON. The learner is in a live Finnish class and needs an ultra-fast, scannable response.\n"
            "Format your response EXACTLY like this (short, clear, zero fluff):\n"
            "🇫🇮 Question: <Finnish question or key sentence>\n"
            "🇬🇧 English: <clear English meaning>\n"
            "🇫🇮 Answer: <short beginner A1 Finnish answer>\n"
            "🇬🇧 Meaning: <English meaning of the answer>\n"
            "If the learner uploaded a picture AND audio, answer the spoken question using what is visible in the picture.\n"
            "Keep the whole reply concise so it can be read in 3 seconds."
        )

    if mode == "teacher_recording":
        return base + (
            "\nTEACHER RECORDING ASSISTANT MODE. The learner recorded their Finnish teacher speaking (and may also have attached a worksheet/classroom photo).\n"
            "Listen carefully to the audio. Do NOT invent missing audio words; mark uncertain or inaudible words clearly as [uncertain] or [inaudible].\n"
            "You MUST structure your reply with these exact clear headings:\n"
            "### A. ORIGINAL FINNISH\n"
            "(Write down what the teacher actually said in Finnish. For longer audio, split into readable timestamped segments like [00:00–00:10].)\n\n"
            "### B. ENGLISH TRANSLATION\n"
            "(Natural, understandable English translation.)\n\n"
            "### C. SELITYS SUOMEKSI\n"
            "(Explain the meaning in very simple A1-level Finnish.)\n\n"
            "### D. EXPLANATION IN ENGLISH\n"
            "(Explain patiently what the teacher means and what the student should do.)\n\n"
            "### E. IMPORTANT VOCABULARY\n"
            "(Bullet list: **word** (base form: *perusmuoto*) — English meaning)\n\n"
            "### F. GRAMMAR\n"
            "(Explain 1–3 key endings or grammar structures used, in simple terms.)\n\n"
            "### G. QUESTION & ANSWER\n"
            "(If the teacher asked a question—or asked about an attached photo—show the Finnish question, English meaning, a suggested beginner A1 Finnish answer grounded in any attached photo, and its English translation. If no question was asked, provide a useful polite Finnish response the student could say.)"
        )

    if mode == "homework_hint":
        return base + (
            "\nHOMEWORK MODE: HINT FIRST.\n"
            "Do NOT immediately reveal the final answer! First clearly separate any extracted worksheet text from your guidance. "
            "Give a gentle, helpful hint in simple English + a small Finnish clue (e.g. which verb/case to think about) so the learner can try answering themselves."
        )

    if mode == "homework_explain":
        return base + (
            "\nHOMEWORK MODE: EXPLAIN.\n"
            "Separate the original worksheet text from your explanation. Teach the instructions, vocabulary (with base forms), and grammar needed to solve the exercise in simple English and simple Finnish."
        )

    if mode == "homework_check":
        return base + (
            "\nHOMEWORK MODE: CHECK MY ANSWER.\n"
            "Check what the learner wrote gently and encouragingly. Show: 1) What is already right, 2) Corrected Finnish version (preserving their meaning), 3) Why each correction matters (simple grammar), 4) English translation."
        )

    if mode == "homework_answer":
        return base + (
            "\nHOMEWORK MODE: SHOW ANSWER.\n"
            "Separate original worksheet text from your answer. Provide the clear Finnish answer, its English translation, simple Finnish explanation (Selitys suomeksi), and why it is correct."
        )

    if mode == "quick_answer":
        return base + (
            "\nANSWER MODE: NATURAL EVERYDAY BILINGUAL TUTOR (CONCISE, ZERO TEXT WALLS).\n"
            "The learner may ask ANY everyday question (like weather, time, food, shopping, daily life) OR a Finnish language question.\n"
            "- If they ask a real-life question (e.g. 'How is the weather today?'), ALWAYS answer their real question naturally first (using any [LIVE REAL-TIME WEATHER DATA] provided), AND immediately teach the exact Finnish for both asking and saying it!\n"
            "Use this clean, scannable format:\n"
            "🇬🇧 **Answer:** <Short, warm real answer in English>\n"
            "🇫🇮 **In Finnish:** <How to ask and/or say it in clear school-grade A1 Finnish, with English meaning>\n"
            "💡 **Key Words:**\n"
            "- **<word>** (*<base form>*) — <English meaning> (1–3 brief bullets max)\n"
            "If an image/homework sheet was attached, answer or explain it concisely in Finnish + English."
        )

    if mode == "practice":
        return base + (
            "\nANSWER MODE: PRACTICE WITH ME.\n"
            "Act as a warm, encouraging Finnish teacher. Keep it concise:\n"
            "1) Praise what worked or gently show the corrected Finnish + English.\n"
            "2) Give 1 brief grammar tip.\n"
            "3) Ask ONE short A1 Finnish follow-up question (with English translation)."
        )

    # Default: teach_me (natural everyday bilingual card)
    return base + (
        "\nANSWER MODE: NATURAL EVERYDAY BILINGUAL TUTOR.\n"
        "Answer any real-world or Finnish question warmly and concisely (no long walls of text):\n"
        "🇬🇧 **Answer:** <Clear English answer or explanation>\n"
        "🇫🇮 **In Finnish:** <Natural school-grade A1 Finnish way to ask/say it + English translation>\n"
        "💡 **Key Words:**\n"
        "- <1–3 brief vocab/grammar bullets with base form (perusmuoto)>"
    )


def _validate_and_build_parts(
    text: str,
    attachments: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    parts: List[Dict[str, Any]] = []
    for att in attachments or []:
        mime = (att.get("mime_type") or "").strip().lower()
        b64 = (att.get("data_base64") or "").strip()
        if not mime or not b64:
            continue
        # Strip data URL prefix if accidentally sent
        if "," in b64 and b64.startswith("data:"):
            b64 = b64.split(",", 1)[1]
        # Validate allowed multimodal MIME types
        allowed_prefixes = ("image/", "audio/", "application/pdf")
        if not mime.startswith(allowed_prefixes):
            return [], f"Unsupported file type: {mime}. Please upload images, audio, or PDF files."
        approx_bytes = (len(b64) * 3) // 4
        if approx_bytes > MAX_ATTACHMENT_BYTES:
            return [], f"File is too large ({approx_bytes // (1024 * 1024)} MB). Maximum allowed is 18 MB."
        parts.append({"inlineData": {"mimeType": mime, "data": b64}})

    if text:
        parts.append({"text": text})
    elif not parts:
        return [], "Please type a question, record audio, or attach an image/PDF."
    else:
        parts.append({"text": "Please analyze the attached classroom material and help me understand it in simple Finnish and English."})

    return parts, None


def handle_ask(payload: Dict[str, Any], db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    """
    Unified Multimodal Ask AI handler.
    Supports text + multiple images + PDFs + audio recordings + multi-turn conversation history.
    """
    prompt_text = (payload.get("message") or "").strip()
    mode = (payload.get("mode") or "teach_me").strip()
    level = (payload.get("level") or "A1").strip().upper()
    history = payload.get("history") or []
    attachments = payload.get("attachments") or []
    worksheet_context = (payload.get("worksheet_context") or "").strip()
    roast_mode = payload.get("roast_mode", True)
    if isinstance(roast_mode, str):
        roast_mode = roast_mode.lower() not in ("0", "false", "no", "off")
    roast_mode = bool(roast_mode)

    # Check if cacheable — strictly scoped to THIS individual user's email & never caches live weather or personalized memory
    cache_key = None
    user_email_scope = (payload.get("_user_email") or "anon").strip().lower()
    has_personal_ctx = bool(payload.get("user_memory") or payload.get("user_name"))
    is_live_weather = any(w in prompt_text.lower() for w in ("weather", "sää", "saa", "temperature", "forecast", "tomorrow", "huomenna"))
    if not attachments and len(history) == 0 and prompt_text and not has_personal_ctx and not is_live_weather:
        raw_sig = f"ask|{user_email_scope}|{mode}|{level}|roast={int(roast_mode)}|{prompt_text.lower()}"
        cache_key = hashlib.sha256(raw_sig.encode("utf-8")).hexdigest()
        cached = _cache_lookup(cache_key, db_path)
        if cached:
            _record_usage(is_cache_hit=True, db_path=db_path)
            cached["usage"] = get_usage_stats(db_path)
            return cached, 200

    limit_err = _check_rate_limits(db_path)
    if limit_err:
        return limit_err, 429

    contents: List[Dict[str, Any]] = []

    # Preserve recent conversation context (up to last 14 turns)
    for turn in history[-14:]:
        role = "model" if turn.get("role") in ("assistant", "model") else "user"
        turn_text = (turn.get("text") or "").strip()
        turn_atts = turn.get("attachments") or []
        turn_parts, err = _validate_and_build_parts(turn_text, turn_atts)
        if err:
            continue
        if turn_parts:
            contents.append({"role": role, "parts": turn_parts})

    # Combine current user turn
    combined_prompt = prompt_text
    if worksheet_context:
        combined_prompt = f"[Saved Worksheet Context]\n{worksheet_context}\n\n[Learner Question]\n{prompt_text}"

    # Inject THIS individual user's private friend memory (name, city, life facts, inside jokes across chats)
    user_memory = payload.get("user_memory") or []
    user_name = (payload.get("user_name") or "").strip()[:48]
    mem_lines = []
    if user_name and user_name.lower() not in ("student", "signed in"):
        mem_lines.append(f"Friend's name: {user_name}")
    if isinstance(user_memory, list):
        mem_lines.extend([str(x).strip()[:140] for x in user_memory[:15] if str(x).strip()])
    if mem_lines:
        combined_prompt = (
            "[PRIVATE MEMORY FOR THIS SPECIFIC USER — use naturally for warm check-ins & inside jokes]\n"
            + "\n".join(f"- {m}" for m in mem_lines)
            + "\n\n"
            + combined_prompt
        )

    # Inject live real-time weather if user asks about weather in Finland (Pori, Helsinki, etc.)
    weather_ctx = _maybe_fetch_live_weather(prompt_text, history, user_memory=user_memory)
    if weather_ctx:
        combined_prompt = f"{weather_ctx}\n\n[Learner Message]\n{combined_prompt}"

    cur_parts, val_err = _validate_and_build_parts(combined_prompt, attachments)
    if val_err:
        return {"error": "INVALID_INPUT", "message": val_err}, 400

    contents.append({"role": "user", "parts": cur_parts})

    system_prompt = _build_system_prompt(mode, level, roast_mode=roast_mode)
    text_out, model_used, ai_err = _call_gemini_generate(
        system_instruction=system_prompt,
        contents=contents,
        expect_json=False,
        temperature=0.2 if mode == "live_translate" else (0.35 if mode in ("quick_class", "teacher_recording", "homework_check") else (0.65 if roast_mode else 0.45)),
        max_output_tokens=450 if mode == "live_translate" else 2200,
    )

    if ai_err:
        status = 429 if "QUOTA" in ai_err.get("error", "") else 503
        ai_err["usage"] = get_usage_stats(db_path)
        return ai_err, status

    _record_usage(is_cache_hit=False, db_path=db_path)

    # Extract a short Finnish phrase for quick TTS playback if present
    finnish_tts_hint = _extract_primary_finnish(text_out or "", mode)

    result = {
        "ok": True,
        "reply": text_out,
        "mode": mode,
        "level": level,
        "model": model_used,
        "finnish_tts": finnish_tts_hint,
        "cached": False,
        "usage": get_usage_stats(db_path),
    }

    if cache_key:
        _cache_store(cache_key, "ask", model_used or "", result, db_path)

    return result, 200


def _extract_primary_finnish(reply: str, mode: str) -> str:
    """Extract the most useful Finnish sentence from a response for 1-click Listen / Slow playback."""
    lines = [ln.strip() for ln in reply.splitlines() if ln.strip()]
    if mode == "live_translate":
        for ln in lines:
            if "finnish:" in ln.lower() or ln.startswith("🇫🇮"):
                return ln.split(":", 1)[-1].replace("**", "").strip()[:260]
    if mode == "quick_class":
        for ln in lines:
            if ln.startswith("🇫🇮 Answer:") or ln.lower().startswith("answer:"):
                return ln.split(":", 1)[1].strip()
        for ln in lines:
            if ln.startswith("🇫🇮 Question:"):
                return ln.split(":", 1)[1].strip()
    if mode == "teacher_recording":
        capture = False
        buf: List[str] = []
        for ln in lines:
            low = ln.lower()
            if "original finnish" in low:
                capture = True
                continue
            if capture and ln.startswith("#"):
                break
            if capture:
                buf.append(ln)
        if buf:
            return " ".join(buf)[:400]
    # Fallback: first non-heading line
    for ln in lines:
        if not ln.startswith("#") and len(ln) > 3:
            return ln.replace("**", "").replace("*", "")[:240]
    return ""


def handle_word_anatomy(payload: Dict[str, Any], db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    """Structured Finnish Word Anatomy & Vocabulary Search."""
    word = (payload.get("word") or "").strip()
    level = (payload.get("level") or "A1").strip().upper()
    if not word:
        return {"error": "INVALID_INPUT", "message": "Please enter a Finnish word or phrase to analyze."}, 400
    if len(word) > 120:
        return {"error": "INVALID_INPUT", "message": "Please enter a shorter word or phrase (max 120 characters)."}, 400

    cache_key = hashlib.sha256(f"word_anatomy|{level}|{word.lower()}".encode("utf-8")).hexdigest()
    cached = _cache_lookup(cache_key, db_path)
    if cached:
        _record_usage(is_cache_hit=True, db_path=db_path)
        cached["usage"] = get_usage_stats(db_path)
        return cached, 200

    limit_err = _check_rate_limits(db_path)
    if limit_err:
        return limit_err, 429

    sys_prompt = (
        "You are an expert Finnish linguistics & A1/A2 language teacher. "
        "Analyze the given Finnish word or short phrase accurately. "
        "NEVER blindly attach suffixes to words that do not inflect that way. "
        "If any form is uncertain or not applicable, set it to null or explain clearly in 'notes'.\n"
        "Return ONLY valid JSON with this exact schema:\n"
        "{\n"
        '  "original_word": string,\n'
        '  "base_form": string,\n'
        '  "english_meaning": string,\n'
        '  "word_class": string,\n'
        '  "syllables": string,\n'
        '  "pronunciation_guide": string,\n'
        '  "stem_and_kpt_note": string,\n'
        '  "forms": {\n'
        '    "partitive": string or null,\n'
        '    "genitive": string or null,\n'
        '    "inessive": string or null,\n'
        '    "elative": string or null,\n'
        '    "illative": string or null,\n'
        '    "present_conjugation": [string] or null\n'
        "  },\n"
        '  "spoken_finnish": string or null,\n'
        '  "examples": [{"fi": string, "en": string}],\n'
        '  "uncertainty_note": string or null\n'
        "}"
    )

    text_out, model_used, ai_err = _call_gemini_generate(
        system_instruction=sys_prompt,
        contents=[{"role": "user", "parts": [{"text": f"Analyze this Finnish word/phrase for a {level} learner: {word}"}]}],
        expect_json=True,
        temperature=0.2,
        max_output_tokens=1400,
    )
    if ai_err:
        status = 429 if "QUOTA" in ai_err.get("error", "") else 503
        ai_err["usage"] = get_usage_stats(db_path)
        return ai_err, status

    try:
        parsed = json.loads(text_out or "{}")
    except Exception:
        return {"error": "PARSE_ERROR", "message": "AI returned malformed JSON for word anatomy. Please try again."}, 500

    _record_usage(is_cache_hit=False, db_path=db_path)
    result = {
        "ok": True,
        "anatomy": parsed,
        "model": model_used,
        "cached": False,
        "usage": get_usage_stats(db_path),
    }
    _cache_store(cache_key, "word_anatomy", model_used or "", result, db_path)
    return result, 200


def handle_writing_check(payload: Dict[str, Any], db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    """Side-by-side beginner Finnish writing correction."""
    text = (payload.get("text") or "").strip()
    topic = (payload.get("topic") or "General writing practice").strip()
    level = (payload.get("level") or "A1").strip().upper()

    if not text:
        return {"error": "INVALID_INPUT", "message": "Please write at least one Finnish sentence to check."}, 400

    limit_err = _check_rate_limits(db_path)
    if limit_err:
        return limit_err, 429

    sys_prompt = (
        f"You are a gentle, encouraging Finnish teacher checking a {level} learner's writing.\n"
        "Preserve the learner's intended meaning and keep vocabulary at A1/A2 level.\n"
        "Return ONLY valid JSON with this exact schema:\n"
        "{\n"
        '  "original": string,\n'
        '  "corrected": string,\n'
        '  "natural_version": string,\n'
        '  "english_meaning": string,\n'
        '  "praise": string,\n'
        '  "mistakes": [{"wrong": string, "right": string, "why_en": string, "why_fi": string}],\n'
        '  "tip": string\n'
        "}"
    )

    text_out, model_used, ai_err = _call_gemini_generate(
        system_instruction=sys_prompt,
        contents=[{"role": "user", "parts": [{"text": f"Topic: {topic}\nLearner's Finnish text:\n{text}"}]}],
        expect_json=True,
        temperature=0.25,
        max_output_tokens=1600,
    )
    if ai_err:
        status = 429 if "QUOTA" in ai_err.get("error", "") else 503
        ai_err["usage"] = get_usage_stats(db_path)
        return ai_err, status

    try:
        parsed = json.loads(text_out or "{}")
    except Exception:
        return {"error": "PARSE_ERROR", "message": "Could not parse writing feedback. Please try again."}, 500

    _record_usage(is_cache_hit=False, db_path=db_path)
    return {
        "ok": True,
        "feedback": parsed,
        "model": model_used,
        "usage": get_usage_stats(db_path),
    }, 200


def handle_generate_exercise(payload: Dict[str, Any], db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    """Generate Reading passages, Listening dialogues, or Speaking/Roleplay exercises (cached)."""
    kind = (payload.get("kind") or "reading").strip().lower()
    topic = (payload.get("topic") or "Everyday life in Finland").strip()
    level = (payload.get("level") or "A1").strip().upper()
    custom_text = (payload.get("custom_text") or "").strip()

    cache_key = None
    if not custom_text:
        sig = f"exercise|{kind}|{level}|{topic.lower()}|{_utc_today()}"
        cache_key = hashlib.sha256(sig.encode("utf-8")).hexdigest()
        cached = _cache_lookup(cache_key, db_path)
        if cached:
            _record_usage(is_cache_hit=True, db_path=db_path)
            cached["usage"] = get_usage_stats(db_path)
            return cached, 200

    limit_err = _check_rate_limits(db_path)
    if limit_err:
        return limit_err, 429

    if kind == "reading":
        sys_prompt = (
            f"Create or analyze a short {level} Finnish reading passage about the given topic (or analyze the learner's pasted Finnish text).\n"
            "Return ONLY valid JSON:\n"
            "{\n"
            '  "title": string,\n'
            '  "text_type": string,\n'
            '  "sentences": [{"fi": string, "en": string, "spoken_fi": string or null}],\n'
            '  "vocabulary": [{"word": string, "base_form": string, "en": string}],\n'
            '  "grammar_note": string,\n'
            '  "questions": [{"q_fi": string, "q_en": string, "options": [string], "answer_index": number, "explanation": string}]\n'
            "}"
        )
        user_msg = (
            f"Analyze this pasted Finnish text for a {level} learner:\n{custom_text}"
            if custom_text
            else f"Write a realistic, practical {level} Finnish reading passage (5–7 short sentences) about: {topic}"
        )
    elif kind == "listening":
        sys_prompt = (
            f"Create a short, natural {level} Finnish listening dialogue (4–6 short lines) for everyday life in Finland.\n"
            "Return ONLY valid JSON:\n"
            "{\n"
            '  "title": string,\n'
            '  "situation": string,\n'
            '  "lines": [{"speaker": string, "fi": string, "en": string}],\n'
            '  "vocabulary": [{"word": string, "base_form": string, "en": string}],\n'
            '  "questions": [{"q_en": string, "q_fi": string, "options": [string], "answer_index": number}]\n'
            "}"
        )
        user_msg = f"Create a {level} Finnish listening exercise for situation: {topic}"
    else:
        return {"error": "INVALID_INPUT", "message": f"Unsupported exercise kind: {kind}"}, 400

    text_out, model_used, ai_err = _call_gemini_generate(
        system_instruction=sys_prompt,
        contents=[{"role": "user", "parts": [{"text": user_msg}]}],
        expect_json=True,
        temperature=0.4,
        max_output_tokens=1800,
    )
    if ai_err:
        status = 429 if "QUOTA" in ai_err.get("error", "") else 503
        ai_err["usage"] = get_usage_stats(db_path)
        return ai_err, status

    try:
        parsed = json.loads(text_out or "{}")
    except Exception:
        return {"error": "PARSE_ERROR", "message": "Could not parse generated exercise. Please try again."}, 500

    _record_usage(is_cache_hit=False, db_path=db_path)
    result = {
        "ok": True,
        "kind": kind,
        "exercise": parsed,
        "model": model_used,
        "cached": False,
        "usage": get_usage_stats(db_path),
    }
    if cache_key:
        _cache_store(cache_key, f"exercise_{kind}", model_used or "", result, db_path)
    return result, 200


def save_user_sync_snapshot(
    user_email: str,
    snapshot: Dict[str, Any],
    db_path: str = FINNISH_LAB_DB_PATH,
) -> Dict[str, Any]:
    """Optional authenticated server-side backup/sync for cross-device recovery."""
    init_finnish_lab_db(db_path)
    now = _utc_now_iso()
    encoded = json.dumps(snapshot, ensure_ascii=False)
    if len(encoded.encode("utf-8")) > 10 * 1024 * 1024:
        return {"ok": False, "error": "Backup snapshot exceeds 10 MB limit."}
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "INSERT OR REPLACE INTO fl_user_sync (user_email, snapshot_json, updated_at) VALUES (?, ?, ?)",
            (user_email, encoded, now),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True, "updated_at": now}


def load_user_sync_snapshot(
    user_email: str,
    db_path: str = FINNISH_LAB_DB_PATH,
) -> Dict[str, Any]:
    init_finnish_lab_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            "SELECT snapshot_json, updated_at FROM fl_user_sync WHERE user_email=?",
            (user_email,),
        ).fetchone()
        if not row:
            return {"ok": True, "has_snapshot": False, "snapshot": None, "updated_at": None}
        return {
            "ok": True,
            "has_snapshot": True,
            "snapshot": json.loads(row[0]),
            "updated_at": row[1],
        }
    finally:
        conn.close()


def _pcm_to_wav_base64(pcm_b64: str, sample_rate: int = 24000) -> str:
    """Wrap raw 16-bit signed little-endian mono PCM into a standard browser-playable WAV."""
    pcm_bytes = base64.b64decode(pcm_b64)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _pcm_to_compact_audio_base64(pcm_b64: str, sample_rate: int = 24000) -> Tuple[str, str]:
    """Compress raw 16-bit mono PCM to lightweight 48kbps MP3 via ffmpeg (8x smaller on 4G), falling back to WAV."""
    import subprocess
    pcm_bytes = base64.b64decode(pcm_b64)
    try:
        proc = subprocess.run(
            [
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-f", "s16le", "-ar", str(sample_rate), "-ac", "1", "-i", "pipe:0",
                "-codec:a", "libmp3lame", "-b:a", "48k", "-f", "mp3", "pipe:1",
            ],
            input=pcm_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10,
        )
        if proc.returncode == 0 and proc.stdout and len(proc.stdout) > 200:
            return base64.b64encode(proc.stdout).decode("ascii"), "audio/mpeg"
    except Exception:
        pass
    return _pcm_to_wav_base64(pcm_b64, sample_rate=sample_rate), "audio/wav"


def handle_tts(payload: Dict[str, Any], db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    """
    Generate warm, natural human-voiced Finnish (or bilingual Walking Podcast) audio
    using Google AI Studio's Gemini Neural TTS models, cached in fl_audio_cache.
    """
    text = (payload.get("text") or "").strip()
    mode = (payload.get("mode") or "phrase").strip().lower()  # phrase | slow | podcast
    voice = (payload.get("voice") or "Aoede").strip()
    if not text:
        return {"error": "INVALID_INPUT", "message": "No text provided for speech."}, 400
    if len(text) > 2200:
        text = text[:2200]

    init_finnish_lab_db(db_path)
    cache_key = hashlib.sha256(f"tts|{mode}|{voice}|{text}".encode("utf-8")).hexdigest()
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            "SELECT mime_type, audio_base64, model_id FROM fl_audio_cache WHERE cache_key=?",
            (cache_key,),
        ).fetchone()
        if row:
            _record_usage(is_cache_hit=True, db_path=db_path)
            return {
                "ok": True,
                "mime_type": row[0],
                "audio_base64": row[1],
                "model": row[2],
                "cached": True,
                "usage": get_usage_stats(db_path),
            }, 200
    finally:
        conn.close()

    key = _get_gemini_key()
    if not key:
        return {"error": "AI_NOT_CONFIGURED", "message": "Gemini API key not configured."}, 503

    limit_err = _check_rate_limits(db_path)
    if limit_err:
        return limit_err, 429

    if mode == "slow":
        tts_prompt = (
            "Speak the following Finnish text slowly, warmly, and very clearly like a patient Finnish language teacher "
            "helping a beginner hear every vowel and double consonant. Do not add any extra commentary:\n\n"
            + text
        )
    elif mode == "podcast":
        tts_prompt = (
            "Read the following short bilingual Finnish-English walking podcast lesson in a warm, natural, friendly human teacher voice. "
            "Pronounce every Finnish phrase with authentic, clear Finnish pronunciation, pause briefly between sentences so the listener can repeat aloud, "
            "and speak the English explanations naturally:\n\n"
            + text
        )
    else:
        tts_prompt = (
            "Speak the following Finnish text naturally and warmly in authentic, clear Finnish like a friendly native teacher. "
            "Do not add extra words:\n\n"
            + text
        )

    tts_models = [
        "models/gemini-2.5-flash-preview-tts",
        "models/gemini-3.1-flash-tts-preview",
        "models/gemini-3.8-flash-lite-tts",
    ]
    req_body = json.dumps(
        {
            "contents": [{"parts": [{"text": tts_prompt}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}
                },
            },
        },
        ensure_ascii=False,
    ).encode("utf-8")

    last_err = {"error": "TTS_FAILED", "message": "Could not generate human voice right now."}
    for model_name in tts_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={key}"
        req = urllib.request.Request(url, data=req_body, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
            inline = None
            for p in parts:
                if isinstance(p, dict) and p.get("inlineData"):
                    inline = p["inlineData"]
                    break
            if not inline or not inline.get("data"):
                continue

            raw_mime = (inline.get("mimeType") or "").lower()
            raw_b64 = inline["data"]
            if "pcm" in raw_mime or "l16" in raw_mime:
                rate = 24000
                if "rate=" in raw_mime:
                    try:
                        rate = int(raw_mime.split("rate=")[1].split(";")[0].strip())
                    except Exception:
                        rate = 24000
                out_b64, out_mime = _pcm_to_compact_audio_base64(raw_b64, sample_rate=rate)
            else:
                out_b64 = raw_b64
                out_mime = raw_mime or "audio/mpeg"

            conn = sqlite3.connect(db_path)
            try:
                conn.execute(
                    "INSERT OR REPLACE INTO fl_audio_cache (cache_key, mime_type, audio_base64, model_id, created_at) VALUES (?, ?, ?, ?, ?)",
                    (cache_key, out_mime, out_b64, model_name, _utc_now_iso()),
                )
                conn.commit()
            finally:
                conn.close()

            _record_usage(is_cache_hit=False, db_path=db_path)
            return {
                "ok": True,
                "mime_type": out_mime,
                "audio_base64": out_b64,
                "model": model_name,
                "cached": False,
                "usage": get_usage_stats(db_path),
            }, 200
        except urllib.error.HTTPError as he:
            if he.code == 429:
                last_err = {
                    "error": "GEMINI_FREE_QUOTA_EXCEEDED",
                    "message": "Free voice quota temporarily full — falling back to device voice.",
                }
                continue
            last_err = {"error": f"HTTP_{he.code}", "message": f"Voice service returned HTTP {he.code}."}
            if he.code in (404, 500, 502, 503):
                continue
            break
        except Exception as exc:
            last_err = {"error": "TTS_ERROR", "message": str(exc).replace(key, "***")[:140]}

    return last_err, 503


# ---------- ADMIN & STUDENT INVITE-CODE ACCESS ----------
DEFAULT_STUDENT_CODE = os.environ.get("FINNISH_LAB_STUDENT_CODE", "suomi2026")


def get_student_access_config(db_path: str = FINNISH_LAB_DB_PATH) -> Dict[str, Any]:
    init_finnish_lab_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        rows = dict(conn.execute("SELECT key, value FROM fl_settings WHERE key IN ('student_invite_code', 'student_access_enabled')").fetchall())
    finally:
        conn.close()
    code = (rows.get("student_invite_code") or DEFAULT_STUDENT_CODE).strip()
    enabled = rows.get("student_access_enabled", "1") != "0"
    return {"invite_code": code, "student_enabled": enabled}


def update_student_access_config(
    invite_code: Optional[str] = None,
    student_enabled: Optional[bool] = None,
    db_path: str = FINNISH_LAB_DB_PATH,
) -> Dict[str, Any]:
    init_finnish_lab_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        if invite_code is not None and invite_code.strip():
            conn.execute(
                "INSERT OR REPLACE INTO fl_settings (key, value) VALUES ('student_invite_code', ?)",
                (invite_code.strip()[:40],),
            )
        if student_enabled is not None:
            conn.execute(
                "INSERT OR REPLACE INTO fl_settings (key, value) VALUES ('student_access_enabled', ?)",
                ("1" if student_enabled else "0",),
            )
            if not student_enabled:
                conn.execute("DELETE FROM fl_student_sessions")
        conn.commit()
    finally:
        conn.close()
    return get_student_access_config(db_path)


def verify_student_invite_and_issue_token(
    code: str,
    label: str = "Family/Friend Student",
    db_path: str = FINNISH_LAB_DB_PATH,
) -> Tuple[Optional[str], Optional[str]]:
    cfg = get_student_access_config(db_path)
    if not cfg["student_enabled"]:
        return None, "Student access is currently paused by the Admin."
    if (code or "").strip().lower() != cfg["invite_code"].strip().lower():
        return None, "Incorrect invite code. Please ask the Admin for the current code."
    token = secrets.token_urlsafe(24)
    init_finnish_lab_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "INSERT INTO fl_student_sessions (token, label, created_at) VALUES (?, ?, ?)",
            (token, (label or "Student")[:40], _utc_now_iso()),
        )
        conn.commit()
    finally:
        conn.close()
    return token, None


def is_valid_student_token(token: str, db_path: str = FINNISH_LAB_DB_PATH) -> bool:
    if not token:
        return False
    cfg = get_student_access_config(db_path)
    if not cfg["student_enabled"]:
        return False
    init_finnish_lab_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute("SELECT 1 FROM fl_student_sessions WHERE token=?", (token,)).fetchone()
        return bool(row)
    finally:
        conn.close()


# ---------- UNIFIED ACCOUNTS, EMAIL VERIFICATION, PASSWORD RESET & ADMIN APPROVAL ----------
import hmac

ADMIN_EMAIL = os.environ.get("ILF_ADMIN_EMAIL", "binodoli721@gmail.com").strip().lower()
DEFAULT_ADMIN_PASSWORD = os.environ.get("ILF_ADMIN_PASSWORD", "Binod@721")
SESSION_SECRET = (
    os.environ.get("ILF_SESSION_SECRET", "").strip()
    or os.environ.get("ILF_ACCESS_KEY", "").strip()
    or "ilf-finland-persistent-hmac-v67-secret-key"
)


def _sign_session_token(email: str, name: str, role: str, max_age_sec: int = 31536000) -> str:
    """Create a stateless HMAC-SHA256 signed token that survives Render container restarts."""
    payload = {
        "e": email.strip().lower(),
        "n": (name or email.split("@")[0])[:48],
        "r": role,
        "exp": int(time.time()) + max_age_sec,
    }
    raw = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")
    sig = hmac.new(SESSION_SECRET.encode("utf-8"), raw.encode("ascii"), hashlib.sha256).hexdigest()[:32]
    return f"v1.{raw}.{sig}"


def _verify_signed_session_token(token: str) -> Optional[Dict[str, Any]]:
    if not token or not token.startswith("v1."):
        return None
    parts = token.split(".")
    if len(parts) != 3:
        return None
    _, raw, sig = parts
    expected = hmac.new(SESSION_SECRET.encode("utf-8"), raw.encode("ascii"), hashlib.sha256).hexdigest()[:32]
    if not secrets.compare_digest(sig, expected):
        return None
    try:
        pad = "=" * (-len(raw) % 4)
        data = json.loads(base64.urlsafe_b64decode((raw + pad).encode("ascii")).decode("utf-8"))
        if int(data.get("exp", 0)) < int(time.time()):
            return None
        return {"email": data["e"], "name": data.get("n") or data["e"], "role": data.get("r") or "student", "status": "approved"}
    except Exception:
        return None


FINLAND_CITY_COORDS = {
    "pori": (61.4851, 21.7974, "Pori"),
    "helsinki": (60.1699, 24.9384, "Helsinki"),
    "espoo": (60.2055, 24.6559, "Espoo"),
    "vantaa": (60.2934, 25.0378, "Vantaa"),
    "tampere": (61.4978, 23.7610, "Tampere"),
    "turku": (60.4518, 22.2666, "Turku"),
    "oulu": (65.0121, 25.4651, "Oulu"),
    "jyväskylä": (62.2426, 25.7473, "Jyväskylä"),
    "jyvaskyla": (62.2426, 25.7473, "Jyväskylä"),
    "lahti": (60.9827, 25.6612, "Lahti"),
    "kuopio": (62.8924, 27.6770, "Kuopio"),
    "rovaniemi": (66.5039, 25.7294, "Rovaniemi"),
    "vaasa": (63.0951, 21.6165, "Vaasa"),
    "joensuu": (62.6010, 29.7636, "Joensuu"),
    "lappeenranta": (61.0587, 28.1887, "Lappeenranta"),
    "rauma": (61.1272, 21.5113, "Rauma"),
    "kotka": (60.4664, 26.9458, "Kotka"),
    "hämeenlinna": (60.9960, 24.4643, "Hämeenlinna"),
    "hameenlinna": (60.9960, 24.4643, "Hämeenlinna"),
    "seinäjoki": (62.7903, 22.8403, "Seinäjoki"),
    "seinajoki": (62.7903, 22.8403, "Seinäjoki"),
}

_WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Icy fog", 51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Heavy freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Rain showers", 81: "Moderate showers", 85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm",
}


def _maybe_fetch_live_weather(prompt_text: str, history: List[Dict[str, Any]], user_memory: Optional[List[str]] = None) -> str:
    """Only fetch live weather when the CURRENT message actually asks about weather/sää (never leak into unrelated questions!)."""
    cur_low = (prompt_text or "").lower()
    weather_words = ("weather", "sää", "saa", "temperature", "forecast", "degrees", "raining", "snowing", "freezing", "cold outside")
    # Also allow short city-only follow-ups like "In pori" if the immediately previous message was about weather
    prev_text = str((history or [{}])[-1].get("text") or "").lower() if history else ""
    is_city_followup = (len(cur_low) <= 32 and any(c in cur_low for c in FINLAND_CITY_COORDS) and any(w in prev_text for w in ("weather", "sää", "°c", "forecast", "temperature")))
    if not any(w in cur_low for w in weather_words) and not is_city_followup:
        return ""
    recent_text = " ".join([cur_low] + [str(h.get("text") or "").lower() for h in (history or [])[-2:]])
    mem_text = " ".join([str(x) for x in (user_memory or [])]).lower()
    city_info = None
    # Prefer city mentioned in current message -> recent history -> saved friend memory -> Helsinki
    for search_text in (cur_low, recent_text, mem_text):
        for key, val in FINLAND_CITY_COORDS.items():
            if key in search_text:
                city_info = val
                break
        if city_info:
            break
    if not city_info:
        city_info = FINLAND_CITY_COORDS["helsinki"]
    lat, lon, city_name = city_info
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m"
            "&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe%2FHelsinki&forecast_days=2"
        )
        req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "ILoveFinlandStudio/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        cur = data.get("current") or {}
        daily = data.get("daily") or {}
        cur_temp = cur.get("temperature_2m")
        feels = cur.get("apparent_temperature")
        wind = cur.get("wind_speed_10m")
        cur_cond = _WMO_CODES.get(int(cur.get("weather_code", 3)), "Cloudy")
        tom_max = (daily.get("temperature_2m_max") or [None, None])[1]
        tom_min = (daily.get("temperature_2m_min") or [None, None])[1]
        tom_cond = _WMO_CODES.get(int((daily.get("weather_code") or [3, 3])[1]), "Cloudy")
        return (
            f"[LIVE REAL-TIME WEATHER DATA FOR {city_name.upper()}, FINLAND — USE THIS ACCURATE DATA]\n"
            f"- Right now in {city_name}: {cur_temp}°C (feels like {feels}°C), {cur_cond}, wind {wind} km/h.\n"
            f"- Tomorrow in {city_name}: {tom_min}°C to {tom_max}°C, {tom_cond}.\n"
            "Give the user this real weather naturally (and include a short Finnish weather sentence + English meaning!)."
        )
    except Exception:
        return ""


def _hash_password(password: str, salt: Optional[str] = None) -> str:
    s = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), s.encode("utf-8"), 120000).hex()
    return f"pbkdf2_sha256${s}${dk}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        parts = (stored_hash or "").split("$")
        if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
            return False
        _, salt, expected = parts
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
        return secrets.compare_digest(actual, expected)
    except Exception:
        return False


def _ensure_admin_account(db_path: str = FINNISH_LAB_DB_PATH) -> None:
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute("SELECT email FROM fl_users WHERE email=?", (ADMIN_EMAIL,)).fetchone()
        if not row:
            now = _utc_now_iso()
            conn.execute(
                """
                INSERT INTO fl_users (email, name, password_hash, role, status, email_verified, created_at, updated_at)
                VALUES (?, ?, ?, 'admin', 'approved', 1, ?, ?)
                """,
                (ADMIN_EMAIL, "Binod (Admin)", _hash_password(DEFAULT_ADMIN_PASSWORD), now, now),
            )
            conn.commit()
    finally:
        conn.close()


def is_email_delivery_configured() -> bool:
    return bool(
        os.environ.get("RESEND_API_KEY", "").strip()
        or (os.environ.get("SMTP_HOST", "").strip() and os.environ.get("SMTP_USER", "").strip() and os.environ.get("SMTP_PASS", "").strip())
    )


def _send_auth_email(to_email: str, subject: str, body_text: str) -> Tuple[bool, str]:
    """Send verification/reset email via Resend API or SMTP (e.g. Gmail App Password)."""
    resend_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_addr = os.environ.get("SMTP_FROM", "").strip() or os.environ.get("SMTP_USER", "").strip() or "onboarding@resend.dev"
    if resend_key:
        try:
            payload = json.dumps({
                "from": from_addr,
                "to": [to_email],
                "subject": subject,
                "text": body_text,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=payload,
                headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                if 200 <= resp.status < 300:
                    return True, "sent_resend"
        except Exception as exc:
            return False, f"resend_error: {str(exc)[:100]}"

    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    smtp_port = int(os.environ.get("SMTP_PORT", "587") or 587)
    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_pass = os.environ.get("SMTP_PASS", "").strip()
    if smtp_host and smtp_user and smtp_pass:
        try:
            import smtplib
            from email.message import EmailMessage
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = from_addr
            msg["To"] = to_email
            msg.set_content(body_text)
            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12) as server:
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
            return True, "sent_smtp"
        except Exception as exc:
            return False, f"smtp_error: {str(exc)[:100]}"

    return False, "not_configured"


def _gen_6digit_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def signup_user(name: str, email: str, password: str, db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    init_finnish_lab_db(db_path)
    clean_email = (email or "").strip().lower()
    clean_name = (name or "").strip()[:60] or clean_email.split("@")[0]
    if not clean_email or "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        return {"ok": False, "error": "INVALID_EMAIL", "message": "Please enter a valid email address."}, 400
    if len(password or "") < 6:
        return {"ok": False, "error": "WEAK_PASSWORD", "message": "Password must be at least 6 characters."}, 400
    if clean_email == ADMIN_EMAIL:
        return {"ok": False, "error": "EMAIL_EXISTS", "message": "This is the Admin email. Please Sign In instead."}, 409

    code = _gen_6digit_code()
    expires = time.time() + 1800  # 30 minutes
    now = _utc_now_iso()

    conn = sqlite3.connect(db_path)
    try:
        existing = conn.execute("SELECT email, email_verified, status FROM fl_users WHERE email=?", (clean_email,)).fetchone()
        if existing:
            return {"ok": False, "error": "EMAIL_EXISTS", "message": "An account with this email already exists. Please Sign In or use Forgot Password."}, 409
        conn.execute(
            """
            INSERT INTO fl_users (email, name, password_hash, role, status, email_verified, verify_code, verify_expires, created_at, updated_at)
            VALUES (?, ?, ?, 'student', 'pending', 0, ?, ?, ?, ?)
            """,
            (clean_email, clean_name, _hash_password(password), code, expires, now, now),
        )
        conn.commit()
    finally:
        conn.close()

    sent, info = _send_auth_email(
        clean_email,
        "Verify your Finnish Learning Lab account",
        f"Hei {clean_name}!\n\nYour Finnish Learning Lab verification code is: {code}\n\nThis code expires in 30 minutes.\nAfter verifying, wait for the Admin (Binod) to approve your access.",
    )
    return {
        "ok": True,
        "email": clean_email,
        "email_sent": sent,
        "needs_verification": True,
        "message": (
            f"We sent a 6-digit verification code to {clean_email}."
            if sent
            else "Account created! Ask Admin (Binod) for your 6-digit verification code or approval."
        ),
    }, 200


def verify_user_email(email: str, code: str, db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    init_finnish_lab_db(db_path)
    clean_email = (email or "").strip().lower()
    clean_code = (code or "").strip()
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            "SELECT verify_code, verify_expires, status, email_verified FROM fl_users WHERE email=?",
            (clean_email,),
        ).fetchone()
        if not row:
            return {"ok": False, "error": "NOT_FOUND", "message": "Account not found."}, 404
        saved_code, expires, status, verified = row
        if verified:
            return {"ok": True, "status": status, "message": "Email already verified!"}, 200
        if not saved_code or clean_code != saved_code:
            return {"ok": False, "error": "INVALID_CODE", "message": "Incorrect verification code."}, 400
        if expires and time.time() > float(expires):
            return {"ok": False, "error": "CODE_EXPIRED", "message": "Verification code expired. Request a new one."}, 400
        conn.execute(
            "UPDATE fl_users SET email_verified=1, verify_code='', verify_expires=0, updated_at=? WHERE email=?",
            (_utc_now_iso(), clean_email),
        )
        conn.commit()
    finally:
        conn.close()
    return {
        "ok": True,
        "status": status,
        "message": (
            "Email verified! You can Sign In now."
            if status == "approved"
            else "Email verified! Waiting for Admin (Binod) to approve your account."
        ),
    }, 200


def resend_verification_code(email: str, db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    init_finnish_lab_db(db_path)
    clean_email = (email or "").strip().lower()
    code = _gen_6digit_code()
    expires = time.time() + 1800
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute("SELECT name, email_verified FROM fl_users WHERE email=?", (clean_email,)).fetchone()
        if not row:
            return {"ok": False, "error": "NOT_FOUND", "message": "Account not found."}, 404
        if row[1]:
            return {"ok": True, "email_sent": False, "message": "Email is already verified."}, 200
        conn.execute(
            "UPDATE fl_users SET verify_code=?, verify_expires=?, updated_at=? WHERE email=?",
            (code, expires, _utc_now_iso(), clean_email),
        )
        conn.commit()
        name = row[0]
    finally:
        conn.close()
    sent, _ = _send_auth_email(
        clean_email,
        "Your new Finnish Learning Lab verification code",
        f"Hei {name}!\n\nYour new verification code is: {code}\n\nThis code expires in 30 minutes.",
    )
    return {
        "ok": True,
        "email_sent": sent,
        "message": f"New code sent to {clean_email}." if sent else "New code generated — check with Admin (Binod).",
    }, 200


def login_user(email: str, password: str, db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[Dict[str, Any]], int]:
    init_finnish_lab_db(db_path)
    clean_email = (email or "").strip().lower()
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            "SELECT email, name, password_hash, role, status, email_verified FROM fl_users WHERE email=?",
            (clean_email,),
        ).fetchone()
    finally:
        conn.close()

    if not row or not _verify_password(password or "", row[2]):
        return None, None, {"ok": False, "error": "INVALID_CREDENTIALS", "message": "Incorrect email or password."}, 401

    u_email, u_name, _, u_role, u_status, u_verified = row
    if u_role != "admin":
        if not u_verified:
            return None, None, {
                "ok": False,
                "error": "EMAIL_NOT_VERIFIED",
                "email": u_email,
                "message": "Please verify your email with the 6-digit code first.",
            }, 403
        if u_status == "pending":
            return None, None, {
                "ok": False,
                "error": "PENDING_APPROVAL",
                "message": "Your email is verified! Waiting for Admin (Binod) to approve your access.",
            }, 403
        if u_status != "approved":
            return None, None, {
                "ok": False,
                "error": "ACCESS_REVOKED",
                "message": "Your access has been disabled by the Admin.",
            }, 403

    token = _sign_session_token(u_email, u_name, u_role, max_age_sec=2592000 if u_role == "admin" else 31536000)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "INSERT OR REPLACE INTO fl_user_sessions (token, email, role, created_at) VALUES (?, ?, ?, ?)",
            (token, u_email, u_role, _utc_now_iso()),
        )
        conn.commit()
    finally:
        conn.close()

    return {"email": u_email, "name": u_name, "role": u_role, "status": u_status}, token, None, 200


def get_session_user(token: str, db_path: str = FINNISH_LAB_DB_PATH) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    init_finnish_lab_db(db_path)

    # 1. Verify stateless HMAC-signed token first (survives Render restarts/redeploys!)
    signed = _verify_signed_session_token(token)
    if signed:
        conn = sqlite3.connect(db_path)
        try:
            row = conn.execute(
                "SELECT status, email_verified, name, role FROM fl_users WHERE email=?",
                (signed["email"],),
            ).fetchone()
        finally:
            conn.close()
        if row:
            u_status, u_verified, u_name, u_role = row
            if u_role != "admin" and (u_status != "approved" or not u_verified):
                return None
            return {"email": signed["email"], "name": u_name, "role": u_role, "status": u_status}
        # If container restarted and wiped ephemeral SQLite, still honor valid signed Admin/Student token!
        return signed

    # 2. Legacy DB session fallback
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            """
            SELECT u.email, u.name, u.role, u.status, u.email_verified
            FROM fl_user_sessions s
            JOIN fl_users u ON u.email = s.email
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    u_email, u_name, u_role, u_status, u_verified = row
    if u_role != "admin" and (u_status != "approved" or not u_verified):
        return None
    return {"email": u_email, "name": u_name, "role": u_role, "status": u_status}


def logout_session_token(token: str, db_path: str = FINNISH_LAB_DB_PATH) -> None:
    if not token:
        return
    init_finnish_lab_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("DELETE FROM fl_user_sessions WHERE token=?", (token,))
        conn.commit()
    finally:
        conn.close()


def request_password_reset(email: str, db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    init_finnish_lab_db(db_path)
    clean_email = (email or "").strip().lower()
    code = _gen_6digit_code()
    expires = time.time() + 900  # 15 minutes
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute("SELECT name FROM fl_users WHERE email=?", (clean_email,)).fetchone()
        if not row:
            return {"ok": False, "error": "NOT_FOUND", "message": "No account found with that email."}, 404
        name = row[0]
        conn.execute(
            "UPDATE fl_users SET reset_code=?, reset_expires=?, updated_at=? WHERE email=?",
            (code, expires, _utc_now_iso(), clean_email),
        )
        conn.commit()
    finally:
        conn.close()
    sent, _ = _send_auth_email(
        clean_email,
        "Reset your Finnish Learning Lab password",
        f"Hei {name}!\n\nYour password reset code is: {code}\n\nThis code expires in 15 minutes.",
    )
    return {
        "ok": True,
        "email_sent": sent,
        "message": (
            f"We sent a 6-digit password reset code to {clean_email}."
            if sent
            else "Reset code generated! Ask Admin (Binod) for your 6-digit reset code."
        ),
    }, 200


def confirm_password_reset(email: str, code: str, new_password: str, db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    init_finnish_lab_db(db_path)
    clean_email = (email or "").strip().lower()
    clean_code = (code or "").strip()
    if len(new_password or "") < 6:
        return {"ok": False, "error": "WEAK_PASSWORD", "message": "New password must be at least 6 characters."}, 400
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute("SELECT reset_code, reset_expires FROM fl_users WHERE email=?", (clean_email,)).fetchone()
        if not row:
            return {"ok": False, "error": "NOT_FOUND", "message": "Account not found."}, 404
        saved_code, expires = row
        if not saved_code or clean_code != saved_code:
            return {"ok": False, "error": "INVALID_CODE", "message": "Incorrect reset code."}, 400
        if expires and time.time() > float(expires):
            return {"ok": False, "error": "CODE_EXPIRED", "message": "Reset code expired. Please request a new one."}, 400
        conn.execute(
            "UPDATE fl_users SET password_hash=?, reset_code='', reset_expires=0, updated_at=? WHERE email=?",
            (_hash_password(new_password), _utc_now_iso(), clean_email),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True, "message": "Password updated! You can Sign In with your new password."}, 200


def change_user_password(email: str, current_password: str, new_password: str, db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    init_finnish_lab_db(db_path)
    clean_email = (email or "").strip().lower()
    if len(new_password or "") < 6:
        return {"ok": False, "error": "WEAK_PASSWORD", "message": "New password must be at least 6 characters."}, 400
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute("SELECT password_hash FROM fl_users WHERE email=?", (clean_email,)).fetchone()
        if not row or not _verify_password(current_password or "", row[0]):
            return {"ok": False, "error": "INVALID_PASSWORD", "message": "Current password is incorrect."}, 401
        conn.execute(
            "UPDATE fl_users SET password_hash=?, updated_at=? WHERE email=?",
            (_hash_password(new_password), _utc_now_iso(), clean_email),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True, "message": "Password changed successfully!"}, 200


def list_all_users_for_admin(db_path: str = FINNISH_LAB_DB_PATH) -> Dict[str, Any]:
    init_finnish_lab_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute(
            """
            SELECT email, name, role, status, email_verified, verify_code, reset_code, created_at
            FROM fl_users
            WHERE role != 'admin'
            ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, created_at DESC
            """
        ).fetchall()
    finally:
        conn.close()
    users = [
        {
            "email": r[0],
            "name": r[1],
            "role": r[2],
            "status": r[3],
            "email_verified": bool(r[4]),
            "verify_code": r[5] or "",
            "reset_code": r[6] or "",
            "created_at": r[7],
        }
        for r in rows
    ]
    return {
        "ok": True,
        "admin_email": ADMIN_EMAIL,
        "email_delivery_configured": is_email_delivery_configured(),
        "users": users,
    }


def admin_update_user_status(target_email: str, action: str, db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    init_finnish_lab_db(db_path)
    clean_email = (target_email or "").strip().lower()
    if not clean_email or clean_email == ADMIN_EMAIL:
        return {"ok": False, "error": "INVALID_TARGET", "message": "Cannot modify Admin account."}, 400
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute("SELECT email FROM fl_users WHERE email=?", (clean_email,)).fetchone()
        if not row:
            return {"ok": False, "error": "NOT_FOUND", "message": "User not found."}, 404
        now = _utc_now_iso()
        if action == "approve":
            conn.execute("UPDATE fl_users SET status='approved', email_verified=1, verify_code='', updated_at=? WHERE email=?", (now, clean_email))
        elif action == "deny" or action == "revoke":
            conn.execute("UPDATE fl_users SET status='revoked', updated_at=? WHERE email=?", (now, clean_email))
            conn.execute("DELETE FROM fl_user_sessions WHERE email=?", (clean_email,))
        elif action == "delete":
            conn.execute("DELETE FROM fl_user_sessions WHERE email=?", (clean_email,))
            conn.execute("DELETE FROM fl_users WHERE email=?", (clean_email,))
        else:
            return {"ok": False, "error": "INVALID_ACTION", "message": "Unknown action."}, 400
        conn.commit()
    finally:
        conn.close()
    return list_all_users_for_admin(db_path), 200


# ---------- LONGER 20+ MIN BEGINNER WALK & LISTEN AUDIO COURSE (30-40 ITEMS, $0 FREE TIER) ----------
def handle_generate_podcast_episode(payload: Dict[str, Any], db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    """Generate a 30-40 item (~20+ min) beginner Walk & Listen passive memorization course from topic OR homework photo."""
    topic = (payload.get("topic") or "").strip()[:140]
    level = (payload.get("level") or "A1").strip().upper()
    attachments = payload.get("attachments") or []
    item_count = max(20, min(40, int(payload.get("count", 34) or 34)))
    if not topic and not attachments:
        return {"ok": False, "error": "INVALID_INPUT", "message": "Please pick a beginner preset, type a topic, or upload a homework photo."}, 400

    cache_key = ""
    if not attachments:
        raw_sig = f"podcast_course_v2|{level}|{item_count}|{topic.lower()}"
        cache_key = hashlib.sha256(raw_sig.encode("utf-8")).hexdigest()
        cached = _cache_lookup(cache_key, db_path)
        if cached:
            _record_usage(is_cache_hit=True, db_path=db_path)
            cached["usage"] = get_usage_stats(db_path)
            return cached, 200

    limit_err = _check_rate_limits(db_path)
    if limit_err:
        return limit_err, 429

    sys_prompt = (
        f"You design calm, high-retention {level}-level Finnish 'Walk & Listen' passive memorization audio courses (10–15+ minutes). "
        "Return ONLY valid JSON with keys: "
        "title (short clean English title, max 42 chars), "
        f"items (array of {item_count} objects, each with keys: fi (clear standard school-grade Finnish word or short phrase), en (clear natural English meaning), note (optional brief 3–6 word grammar/category tag)). "
        "Order items from easiest single words to short practical beginner sentences so learners memorize naturally while walking."
    )
    user_ask = (
        f"Extract and expand {item_count} beginner Finnish memorization items from this uploaded homework/class photo"
        + (f" focusing on: {topic}." if topic else ".")
        if attachments
        else f"Create a {item_count}-item beginner Finnish 'Walk & Listen' memorization course for: {topic}."
    )
    parts, val_err = _validate_and_build_parts(user_ask, attachments)
    if val_err:
        return {"ok": False, "error": "INVALID_INPUT", "message": val_err}, 400

    text_out, model_used, ai_err = _call_gemini_generate(
        system_instruction=sys_prompt,
        contents=[{"role": "user", "parts": parts}],
        expect_json=True,
        temperature=0.35,
        max_output_tokens=2800,
    )
    if ai_err:
        status = 429 if "QUOTA" in ai_err.get("error", "") else 503
        ai_err["usage"] = get_usage_stats(db_path)
        return ai_err, status

    try:
        raw_clean = (text_out or "{}").strip()
        raw_clean = re.sub(r"^```(?:json)?\s*", "", raw_clean, flags=re.IGNORECASE)
        raw_clean = re.sub(r"\s*```$", "", raw_clean)
        parsed = json.loads(raw_clean)
    except Exception:
        return {"ok": False, "error": "PARSE_ERROR", "message": "Could not build Walk & Listen course. Please try again."}, 502

    raw_items = parsed.get("items") or []
    items = [
        {
            "fi": str(it.get("fi") or "").strip(),
            "en": str(it.get("en") or "").strip(),
            "note": str(it.get("note") or "").strip(),
        }
        for it in raw_items
        if str(it.get("fi") or "").strip() and str(it.get("en") or "").strip()
    ][:30]
    if not items:
        return {"ok": False, "error": "EMPTY_EPISODE", "message": "Could not generate items for that topic/photo."}, 502

    est_mins = max(8, round(len(items) * 0.55))
    _record_usage(is_cache_hit=False, db_path=db_path)
    result = {
        "ok": True,
        "title": str(parsed.get("title") or topic or "Homework Audio Course").strip()[:48],
        "duration": f"~{est_mins}–{est_mins + 3} min",
        "items": items,
        "model": model_used,
        "cached": False,
        "usage": get_usage_stats(db_path),
    }
    if cache_key:
        _cache_store(cache_key, "podcast_topic", model_used or "", result, db_path)
    return result, 200


def handle_extract_flashcards(payload: Dict[str, Any], db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    """Extract clean Finnish -> English flashcards from a chat reply or textbook/whiteboard photo."""
    text = (payload.get("text") or "").strip()[:3000]
    attachments = payload.get("attachments") or []
    if not text and not attachments:
        return {"ok": False, "error": "INVALID_INPUT", "message": "Provide text or a photo to extract vocabulary."}, 400

    limit_err = _check_rate_limits(db_path)
    if limit_err:
        return limit_err, 429

    parts, val_err = _validate_and_build_parts(
        text or "Extract the useful Finnish vocabulary words and phrases from this photo/page.",
        attachments,
    )
    if val_err:
        return {"ok": False, "error": "INVALID_INPUT", "message": val_err}, 400

    sys_prompt = (
        "You extract clean Finnish study flashcards from teacher notes, chat explanations, or textbook/whiteboard photos. "
        "Return ONLY valid JSON with key: cards (array of 3 to 8 objects, each with keys: "
        "fi (Finnish word or short phrase), en (clear concise English meaning), example (optional tiny Finnish example)). "
        "Skip generic English filler; include only genuinely useful Finnish vocabulary."
    )
    text_out, model_used, ai_err = _call_gemini_generate(
        system_instruction=sys_prompt,
        contents=[{"role": "user", "parts": parts}],
        expect_json=True,
        temperature=0.25,
        max_output_tokens=1000,
    )
    if ai_err:
        status = 429 if "QUOTA" in ai_err.get("error", "") else 503
        ai_err["usage"] = get_usage_stats(db_path)
        return ai_err, status

    try:
        parsed = json.loads((text_out or "{}").strip().strip("`"))
    except Exception:
        return {"ok": False, "error": "PARSE_ERROR", "message": "Could not extract flashcards. Please try again."}, 502

    cards = [
        {
            "fi": str(c.get("fi") or "").strip()[:80],
            "en": str(c.get("en") or "").strip()[:100],
            "example": str(c.get("example") or "").strip()[:140],
        }
        for c in (parsed.get("cards") or [])
        if str(c.get("fi") or "").strip() and str(c.get("en") or "").strip()
    ][:10]
    _record_usage(is_cache_hit=False, db_path=db_path)
    return {"ok": True, "cards": cards, "model": model_used, "usage": get_usage_stats(db_path)}, 200


def handle_pronunciation_check(payload: Dict[str, Any], db_path: str = FINNISH_LAB_DB_PATH) -> Tuple[Dict[str, Any], int]:
    """Listen to a learner's spoken Finnish audio clip and give natural pronunciation feedback + score."""
    target_phrase = (payload.get("target_phrase") or "").strip()[:200]
    audio_b64 = (payload.get("audio_base64") or "").strip()
    mime_type = (payload.get("mime_type") or "audio/webm").strip().lower()
    roast_mode = bool(payload.get("roast_mode", True))
    if not target_phrase or not audio_b64:
        return {"ok": False, "error": "INVALID_INPUT", "message": "Please record your voice saying the phrase first."}, 400

    limit_err = _check_rate_limits(db_path)
    if limit_err:
        return limit_err, 429

    parts, val_err = _validate_and_build_parts(
        f'The learner tried to pronounce this Finnish phrase: "{target_phrase}". Listen carefully to their audio.',
        [{"mime_type": mime_type, "data_base64": audio_b64}],
    )
    if val_err:
        return {"ok": False, "error": "INVALID_INPUT", "message": val_err}, 400

    tone = "Be a warm, upbeat, encouraging Finnish pronunciation coach (light friendly humor, zero harshness)."
    sys_prompt = (
        f"{tone} Return ONLY valid JSON with keys: "
        "score (integer 1 to 10), heard (what you actually heard them say), "
        "verdict (short 1-line punchy reaction), tip (1 concrete pronunciation tip focusing on Finnish vowels ä/ö/y, stress on 1st syllable, or double letters)."
    )
    text_out, model_used, ai_err = _call_gemini_generate(
        system_instruction=sys_prompt,
        contents=[{"role": "user", "parts": parts}],
        expect_json=True,
        temperature=0.35,
        max_output_tokens=500,
    )
    if ai_err:
        status = 429 if "QUOTA" in ai_err.get("error", "") else 503
        ai_err["usage"] = get_usage_stats(db_path)
        return ai_err, status

    try:
        parsed = json.loads((text_out or "{}").strip().strip("`"))
    except Exception:
        parsed = {"score": 7, "heard": target_phrase, "verdict": "Nice try!", "tip": "Keep stress on the first syllable."}

    _record_usage(is_cache_hit=False, db_path=db_path)
    return {
        "ok": True,
        "feedback": {
            "score": int(parsed.get("score") or 7),
            "heard": str(parsed.get("heard") or ""),
            "verdict": str(parsed.get("verdict") or "Good effort!"),
            "tip": str(parsed.get("tip") or ""),
        },
        "model": model_used,
        "usage": get_usage_stats(db_path),
    }, 200






# =============================================================================
# NATURAL NEURAL FINNISH & ENGLISH TTS (edge-tts — $0 Free, No API Key Required)
# Cached persistently in /data/uploads/finnish_tts/
# =============================================================================
EDGE_FI_VOICES = ("fi-FI-NooraNeural", "fi-FI-SelmaNeural")
EDGE_EN_VOICES = ("en-US-AriaNeural", "en-GB-SoniaNeural")


def _resolve_tts_cache_dir() -> str:
    data_dir = "/data"
    if os.path.exists(data_dir) and os.path.isdir(data_dir):
        target = os.path.join(data_dir, "uploads", "finnish_tts")
    else:
        target = os.path.join(BASE_DIR, "static", "assets", "uploads", "finnish_tts")
    os.makedirs(target, exist_ok=True)
    return target


def _rate_float_to_edge_str(rate_val: Any) -> str:
    try:
        r = float(rate_val)
    except Exception:
        r = 1.0
    if r <= 0.72:
        return "-30%"
    if r <= 0.78:
        return "-25%"
    if r <= 0.84:
        return "-20%"
    if r <= 0.93:
        return "-10%"
    if r >= 1.10:
        return "+10%"
    return "+0%"


def _estimate_mp3_duration_sec(mp3_path: str) -> float:
    """Estimate MP3 duration cleanly using ffprobe if available, else bitrate fallback (~24kbps/48kbps edge-tts)."""
    import shutil
    import subprocess

    ffprobe = shutil.which("ffprobe")
    if ffprobe and os.path.exists(mp3_path):
        try:
            out = subprocess.check_output(
                [
                    ffprobe,
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    mp3_path,
                ],
                stderr=subprocess.DEVNULL,
                timeout=8,
            ).decode("utf-8", errors="ignore").strip()
            val = float(out)
            if val > 0:
                return val
        except Exception:
            pass
    try:
        # edge-tts emits 24kHz 48kbps mono MP3 (~6000 bytes/sec)
        sz = os.path.getsize(mp3_path)
        return max(0.35, round(sz / 6000.0, 2))
    except Exception:
        return 1.2


def _run_edge_tts_sync(text: str, voice: str, rate_str: str, dest_path: str) -> None:
    import asyncio
    import edge_tts

    async def _gen():
        comm = edge_tts.Communicate(text=text, voice=voice, rate=rate_str)
        await comm.save(dest_path)

    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(_gen())
    finally:
        loop.close()


def synthesize_edge_tts_mp3(
    text: str,
    lang: str = "fi",
    rate: Any = 1.0,
    voice: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """Synthesize or retrieve cached neural MP3 clip in /data/uploads/finnish_tts/.

    Returns: (local_path, public_url, voice_used, error_msg)
    """
    clean = re.sub(r"[*_`#>]+", "", str(text or "")).strip()[:800]
    if not clean:
        return None, None, None, "Empty text."

    rate_str = rate if isinstance(rate, str) and rate.endswith("%") else _rate_float_to_edge_str(rate)
    is_en = str(lang or "fi").lower().startswith("en")
    voices_to_try = [voice] if voice else list(EDGE_EN_VOICES if is_en else EDGE_FI_VOICES)

    cache_dir = _resolve_tts_cache_dir()
    key_sig = f"edge_v1|{voices_to_try[0]}|{rate_str}|{clean}"
    fname = f"tts_{hashlib.sha256(key_sig.encode('utf-8')).hexdigest()[:20]}.mp3"
    dest_path = os.path.join(cache_dir, fname)
    public_url = f"/assets/uploads/finnish_tts/{fname}"

    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 400:
        return dest_path, public_url, voices_to_try[0], None

    try:
        import edge_tts  # noqa: F401
    except ImportError:
        return None, None, None, "edge-tts package is not installed on this server."

    last_err = "edge-tts synthesis failed."
    tmp_path = dest_path + f".tmp_{os.getpid()}_{threading.get_ident()}"
    for v_name in voices_to_try:
        if not v_name:
            continue
        try:
            _run_edge_tts_sync(clean, v_name, rate_str, tmp_path)
            if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 400:
                os.replace(tmp_path, dest_path)
                # Mirror to static/assets/uploads/finnish_tts if separate from /data/uploads
                local_mirror_dir = os.path.join(BASE_DIR, "static", "assets", "uploads", "finnish_tts")
                if os.path.abspath(cache_dir) != os.path.abspath(local_mirror_dir):
                    try:
                        import shutil
                        os.makedirs(local_mirror_dir, exist_ok=True)
                        shutil.copy2(dest_path, os.path.join(local_mirror_dir, fname))
                    except Exception:
                        pass
                return dest_path, public_url, v_name, None
        except Exception as exc:
            last_err = str(exc)
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass
            continue

    return None, None, None, last_err


def handle_edge_tts(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    """$0 Free Neural Finnish/English TTS endpoint returning cached MP3 URL."""
    text = (payload.get("text") or "").strip()
    if not text:
        return {"ok": False, "error": "EMPTY_TEXT", "message": "Text is required."}, 400
    lang = (payload.get("lang") or "fi").strip().lower()
    rate = payload.get("rate", 1.0)
    voice = (payload.get("voice") or "").strip() or None

    local_path, public_url, used_voice, err = synthesize_edge_tts_mp3(
        text=text, lang=lang, rate=rate, voice=voice
    )
    if err or not public_url:
        return {"ok": False, "error": "TTS_UNAVAILABLE", "message": err or "Neural TTS unavailable."}, 503

    return {
        "ok": True,
        "audio_url": public_url,
        "voice": used_voice,
        "rate": _rate_float_to_edge_str(rate),
        "duration_sec": _estimate_mp3_duration_sec(local_path or ""),
    }, 200


def _ensure_silence_mp3(duration_sec: float, cache_dir: str) -> Optional[str]:
    """Generate a tiny cached silence MP3 matching edge-tts 24kHz mono 48kbps format."""
    import shutil
    import subprocess

    ms = int(round(duration_sec * 1000))
    sil_path = os.path.join(cache_dir, f"silence_{ms}ms.mp3")
    if os.path.exists(sil_path) and os.path.getsize(sil_path) > 100:
        return sil_path
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        return None
    try:
        res = subprocess.run(
            [
                ffmpeg_bin,
                "-y",
                "-f",
                "lavfi",
                "-i",
                "anullsrc=r=24000:cl=mono",
                "-t",
                f"{duration_sec:.2f}",
                "-c:a",
                "libmp3lame",
                "-b:a",
                "48k",
                sil_path,
            ],
            capture_output=True,
            timeout=10,
        )
        if res.returncode == 0 and os.path.exists(sil_path) and os.path.getsize(sil_path) > 100:
            return sil_path
    except Exception:
        pass
    return None


def handle_walk_listen_audio(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    """Build a single continuous seamless MP3 track for Walk & Listen (lock-screen iPhone/iPad safe!).

    Pattern per item:
      Slow Finnish (selected speed) -> 0.35s pause -> "means [English]" -> 1.25s pause -> Second Slow Finnish repeat -> 0.85s pause
    """
    import shutil
    import subprocess

    raw_items = payload.get("items") or []
    items = [
        {"fi": str(it.get("fi") or "").strip(), "en": str(it.get("en") or "").strip()}
        for it in raw_items
        if str(it.get("fi") or "").strip() and str(it.get("en") or "").strip()
    ][:45]
    if not items:
        return {"ok": False, "error": "EMPTY_ITEMS", "message": "No Walk & Listen items provided."}, 400

    rate = payload.get("rate", 0.75)
    rate_str = _rate_float_to_edge_str(rate)
    cache_dir = _resolve_tts_cache_dir()

    sig = json.dumps({"v": 2, "rate": rate_str, "items": items}, ensure_ascii=False, sort_keys=True)
    digest = hashlib.sha256(sig.encode("utf-8")).hexdigest()[:20]
    out_mp3_name = f"walk_course_{digest}.mp3"
    out_mp3_path = os.path.join(cache_dir, out_mp3_name)
    out_meta_path = os.path.join(cache_dir, f"walk_course_{digest}.json")
    public_url = f"/assets/uploads/finnish_tts/{out_mp3_name}"

    if os.path.exists(out_mp3_path) and os.path.getsize(out_mp3_path) > 1000 and os.path.exists(out_meta_path):
        try:
            meta = json.loads(open(out_meta_path, "r", encoding="utf-8").read())
            meta["cached"] = True
            return meta, 200
        except Exception:
            pass

    sil_short = _ensure_silence_mp3(0.35, cache_dir)
    sil_pause = _ensure_silence_mp3(1.25, cache_dir)
    sil_gap = _ensure_silence_mp3(0.85, cache_dir)

    segment_paths: List[str] = []
    item_offsets: List[float] = []
    running_sec = 0.0
    used_voice = EDGE_FI_VOICES[0]

    # Synthesize all Finnish + English clips concurrently (6 workers -> ~6s for 24 items, 0ms when cached)
    from concurrent.futures import ThreadPoolExecutor

    def _synth_pair(it_obj: Dict[str, str]):
        fi_p, _, v_fi, e_fi = synthesize_edge_tts_mp3(it_obj["fi"], lang="fi", rate=rate_str)
        if e_fi or not fi_p:
            return None, None, None, e_fi or "Neural TTS unavailable."
        en_p, _, _, e_en = synthesize_edge_tts_mp3(f"means {it_obj['en']}", lang="en", rate="+0%")
        if e_en or not en_p:
            return None, None, None, e_en or "English neural TTS unavailable."
        return fi_p, en_p, v_fi, None

    with ThreadPoolExecutor(max_workers=6) as pool:
        pair_results = list(pool.map(_synth_pair, items))

    for fi_path, en_path, v_fi, pair_err in pair_results:
        if pair_err or not fi_path or not en_path:
            return {"ok": False, "error": "TTS_UNAVAILABLE", "message": pair_err or "Neural TTS unavailable."}, 503
        if v_fi:
            used_voice = v_fi

        fi_dur = _estimate_mp3_duration_sec(fi_path)
        en_dur = _estimate_mp3_duration_sec(en_path)

        item_offsets.append(round(running_sec, 2))

        # 1. Slow Finnish
        segment_paths.append(fi_path)
        running_sec += fi_dur
        if sil_short:
            segment_paths.append(sil_short)
            running_sec += 0.35
        # 2. "means [English meaning]"
        segment_paths.append(en_path)
        running_sec += en_dur
        # 3. Short memorization pause
        if sil_pause:
            segment_paths.append(sil_pause)
            running_sec += 1.25
        # 4. Second slow Finnish repeat
        segment_paths.append(fi_path)
        running_sec += fi_dur
        # 5. Transition pause
        if sil_gap:
            segment_paths.append(sil_gap)
            running_sec += 0.85

    # Concatenate into single seamless MP3 (ffmpeg concat demuxer first, pure-Python MP3 byte join fallback)
    ffmpeg_bin = shutil.which("ffmpeg")
    built_ok = False
    if ffmpeg_bin:
        list_file = os.path.join(cache_dir, f"concat_{digest}.txt")
        try:
            with open(list_file, "w", encoding="utf-8") as lf:
                for sp in segment_paths:
                    safe_p = sp.replace("'", "'\\''")
                    lf.write(f"file '{safe_p}'\n")
            res = subprocess.run(
                [
                    ffmpeg_bin,
                    "-y",
                    "-f",
                    "concat",
                    "-safe",
                    "0",
                    "-i",
                    list_file,
                    "-c:a",
                    "libmp3lame",
                    "-ar",
                    "24000",
                    "-ac",
                    "1",
                    "-b:a",
                    "48k",
                    out_mp3_path,
                ],
                capture_output=True,
                timeout=60,
            )
            if res.returncode == 0 and os.path.exists(out_mp3_path) and os.path.getsize(out_mp3_path) > 1000:
                built_ok = True
        except Exception:
            pass
        finally:
            try:
                if os.path.exists(list_file):
                    os.remove(list_file)
            except Exception:
                pass

    if not built_ok:
        try:
            with open(out_mp3_path, "wb") as out_f:
                for sp in segment_paths:
                    with open(sp, "rb") as in_f:
                        out_f.write(in_f.read())
            built_ok = os.path.exists(out_mp3_path) and os.path.getsize(out_mp3_path) > 1000
        except Exception as exc:
            return {"ok": False, "error": "CONCAT_FAILED", "message": str(exc)}, 500

    # Mirror to static/assets/uploads/finnish_tts if separate from /data/uploads
    local_mirror_dir = os.path.join(BASE_DIR, "static", "assets", "uploads", "finnish_tts")
    if os.path.abspath(cache_dir) != os.path.abspath(local_mirror_dir):
        try:
            os.makedirs(local_mirror_dir, exist_ok=True)
            shutil.copy2(out_mp3_path, os.path.join(local_mirror_dir, out_mp3_name))
        except Exception:
            pass

    total_dur = _estimate_mp3_duration_sec(out_mp3_path)
    meta = {
        "ok": True,
        "audio_url": public_url,
        "voice": used_voice,
        "rate": rate_str,
        "item_offsets": item_offsets,
        "total_duration": round(total_dur, 2),
        "item_count": len(items),
        "cached": False,
    }
    try:
        with open(out_meta_path, "w", encoding="utf-8") as mf:
            json.dump(meta, mf)
    except Exception:
        pass
    return meta, 200
