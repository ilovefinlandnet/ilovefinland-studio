"""OpenAI live API client for ILoveFinland Studio.

Handles live GPT-4o drafting and Whisper transcription with clear labeling
between live OpenAI API steps and simulated local rendering steps.
"""

import json
import os
import secrets
import urllib.error
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen

import env_loader


def get_openai_api_key() -> str:
    """Return the trimmed OPENAI_API_KEY from environment or .env file, unless Demo Mode is active."""
    env_loader.load_env(override=True)
    if os.environ.get("ILF_DEMO_MODE") == "1":
        return ""
    return os.environ.get("OPENAI_API_KEY", "").strip()


def verify_openai_connection(key: Optional[str] = None) -> Dict[str, Any]:
    """Perform a live HTTP handshake with OpenAI /v1/models to verify the API key."""
    env_loader.load_env(override=True)
    if os.environ.get("ILF_DEMO_MODE") == "1":
        return {
            "service": "OpenAI (GPT-4o & Whisper)",
            "status": "Demo Mode (Simulated AI Active)",
            "ok": True,
            "message": "Demo Mode is enforced. Simulated AI editorial engine and Whisper fallback are active with zero live external API calls.",
            "demo_mode": True,
        }
    api_key = (key or get_openai_api_key()).strip()
    if not api_key:
        return {
            "service": "OpenAI (GPT-4o & Whisper)",
            "status": "Disconnected",
            "ok": False,
            "message": "OPENAI_API_KEY is not set. Add your key to .env or environment secrets.",
        }
    if not api_key.startswith("sk-"):
        return {
            "service": "OpenAI (GPT-4o & Whisper)",
            "status": "Disconnected (Malformed Key)",
            "ok": False,
            "message": "OPENAI_API_KEY must start with 'sk-'. Please check your key format.",
        }

    try:
        req = Request(
            "https://api.openai.com/v1/models",
            headers={
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "ILoveFinlandStudio/2.0",
            },
        )
        with urlopen(req, timeout=12) as resp:
            if resp.status == 200:
                body = json.loads(resp.read().decode("utf-8"))
                models = [m.get("id", "") for m in body.get("data", [])]
                has_gpt4o = any("gpt-4o" in m for m in models)
                has_whisper = any("whisper" in m for m in models)
                return {
                    "service": "OpenAI (GPT-4o & Whisper)",
                    "status": "Connected",
                    "ok": True,
                    "message": f"Live OpenAI handshake succeeded (HTTP 200). Verified models: GPT-4o ({'Available' if has_gpt4o else 'Standard tier'}) and Whisper-1 ({'Available' if has_whisper else 'Standard tier'}).",
                    "live_api": True,
                }
            return {
                "service": "OpenAI (GPT-4o & Whisper)",
                "status": "Disconnected",
                "ok": False,
                "message": f"OpenAI returned HTTP status {resp.status}.",
            }
    except urllib.error.HTTPError as exc:
        err_text = ""
        try:
            err_body = json.loads(exc.read().decode("utf-8"))
            err_text = err_body.get("error", {}).get("message", str(exc))
        except Exception:
            err_text = str(exc)
        return {
            "service": "OpenAI (GPT-4o & Whisper)",
            "status": "Disconnected (Auth Rejected)",
            "ok": False,
            "message": f"OpenAI API error ({exc.code}): {err_text}",
        }
    except Exception as exc:
        return {
            "service": "OpenAI (GPT-4o & Whisper)",
            "status": "Disconnected (Network Error)",
            "ok": False,
            "message": f"Connection check failed: {exc}",
        }


def call_openai_chat(
    system_prompt: str,
    user_prompt: str,
    model: str = "gpt-4o",
    temperature: float = 0.3,
    response_json: bool = True,
    key: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute a chat completion request to OpenAI."""
    api_key = (key or get_openai_api_key()).strip()
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set. Cannot run live OpenAI request.")

    payload: Dict[str, Any] = {
        "model": model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    if response_json:
        payload["response_format"] = {"type": "json_object"}

    data = json.dumps(payload).encode("utf-8")
    req = Request(
        "https://api.openai.com/v1/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "ILoveFinlandStudio/2.0",
        },
    )

    with urlopen(req, timeout=40) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        content = result["choices"][0]["message"]["content"]
        return json.loads(content) if response_json else {"text": content}


def generate_article_and_reel_draft(
    topic: str,
    instructions: str,
    links: List[str],
    clips: Optional[List[Dict[str, Any]]] = None,
    key: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate straight-news article and synchronized Reel script using OpenAI GPT-4o."""
    system_prompt = (
        "You are the senior editorial director and lead news writer for ILoveFinland.net, an independent Finnish "
        "news and lifestyle publication upholding BBC/CNN-level editorial standards.\n\n"
        "EDITORIAL & WRITING STANDARDS:\n"
        "1. Voice & Tone: Write natural, human-sounding, objective, and engaging English. "
        "Strictly avoid robotic AI phrasing, filler, repetitiveness, or mechanical transitions. Make every article captivating and easy for ordinary readers to understand.\n"
        "2. Structure:\n"
        "   - Paragraph 1 (Lead Introduction): MUST be a strong, comprehensive opening overview (2-3 sentences) clearly explaining WHAT happened, WHERE, WHEN, and WHY it matters. NEVER place an H2 heading above the intro paragraph, and NEVER use wire-service datelines like 'HELSINKI — ' or 'HELSINKI, Finland — '.\n"
        "   - Subsections: Follow with 3 to 5 topical subsections. Each subsection MUST have a complete, meaningful, human-sounding H2 subheading (3 to 8 words; NEVER sentence fragments, dangling prepositions like 'Youth To', or mechanically truncated phrases). Follow each subheading with 2-3 focused, cohesive sentences.\n"
        "   - Flow & Conclusion: Ensure smooth logical progression and a concise, natural conclusion summarizing future developments or practical next steps.\n"
        "3. Factuality & Sourcing: Verify names, dates, figures, locations, and claims against reliable Finnish sources. Never invent facts, statistics, or quotes. Clearly distinguish confirmed facts from speculation or allegations.\n"
        "4. SEO & Taxonomy: Generate an engaging, SEO-friendly headline, a meta description (under 155 chars), an SEO title (under 60 chars), 6 to 10 rich tags, and appropriate section/category.\n"
        "5. Reel Script: Scene 1 hook, clear text for 3-second scenes (up to 12s total), safe-area compliant (line1 <= 28 chars, line2 <= 45 chars).\n"
        "6. Output strictly valid JSON with keys:\n"
        "   - 'article': {\n"
        "       'headline': '<engaging, SEO-friendly headline>',\n"
        "       'short_description': '<clear 1-2 sentence overview>',\n"
        "       'body_paragraphs': [<intro paragraph first>, <subsection 1 paragraph>, <subsection 2 paragraph>, ...],\n"
        "       'subheadings': [<subheading 1 title>, <subheading 2 title>, ...],\n"
        "       'section': '<News | Finland Guide | Things to Do | Food & Restaurants | Travel | Events>',\n"
        "       'category': '<valid category for section>',\n"
        "       'region': 'Finland',\n"
        "       'city_location': '<specific city e.g. Helsinki, or empty string if nationwide>',\n"
        "       'seo_title': '<under 60 chars>',\n"
        "       'meta_description': '<under 155 chars>',\n"
        "       'tags': ['Tag1', 'Tag2', ...],\n"
        "       'sources': [{'label': '<Source Name & Context>', 'url': '<source URL>'}]\n"
        "     },\n"
        "   - 'reel': {'hook_text': '...', 'scenes': [{'start_sec': 0, 'end_sec': 3, 'tag': '...', 'line1': '...', 'line2': '...'}], 'caption': '...', 'hashtags': ['#...']}\n"
    )

    clips_info = ""
    if clips:
        clips_info = f"Uploaded Clips: {', '.join([c.get('filename', '') + ' (' + str(c.get('duration', '')) + 's)' for c in clips])}"

    user_prompt = (
        f"Topic / Story Title: {topic}\n"
        f"Instructions & Angle: {instructions}\n"
        f"Source Links:\n" + "\n".join(links) + "\n"
        f"{clips_info}\n\n"
        "Generate the complete JSON draft."
    )

    return call_openai_chat(system_prompt, user_prompt, model="gpt-4o-mini", key=key)


def revise_story_with_feedback(
    current_article: Dict[str, Any],
    current_reel: Dict[str, Any],
    feedback_text: str,
    target: str = "both",
    key: Optional[str] = None,
) -> Dict[str, Any]:
    """Apply editorial feedback to article and/or Reel using OpenAI."""
    system_prompt = (
        "You are the senior editorial assistant for ILoveFinland.net. "
        "The editor has provided specific revision feedback. Apply the requested edits precisely while "
        "preserving Finnish factual accuracy, neutral journalistic style, and safe-area constraints. "
        "Output valid JSON with keys: 'article' (headline, short_description, body_paragraphs), "
        "'reel' (caption, hashtags, scenes [line1, line2]), and 'change_summary'."
    )

    clean_art = {
        "headline": current_article.get("headline", ""),
        "short_description": current_article.get("short_description", ""),
        "body_paragraphs": current_article.get("body_paragraphs", []),
    }
    clean_reel = {
        "caption": current_reel.get("caption", ""),
        "hashtags": current_reel.get("hashtags", []),
        "scenes": [
            {"line1": s.get("line1", ""), "line2": s.get("line2_highlight", s.get("line2", ""))}
            for s in current_reel.get("scenes", [])
        ],
    }

    user_prompt = (
        f"Target Component: {target}\n"
        f"Editor Feedback: {feedback_text}\n\n"
        f"Current Article Copy:\n{json.dumps(clean_art, indent=1)}\n\n"
        f"Current Reel Copy:\n{json.dumps(clean_reel, indent=1)}\n\n"
        "Return the revised article and reel in valid JSON."
    )

    return call_openai_chat(system_prompt, user_prompt, model="gpt-4o-mini", key=key)


def generate_polished_caption_with_gpt(
    headline: str,
    article_summary: str,
    current_caption: str = "",
    model: str = "gpt-4o",
) -> Dict[str, Any]:
    """Uses ChatGPT (GPT-4o) to write or polish an engaging Instagram/social post caption and hashtags."""
    system_prompt = (
        "You are an expert social media editor for ILoveFinland.net, Finland's leading English publication. "
        "Your task is to write a high-engagement, factual Instagram/Facebook post caption and 5 relevant hashtags "
        "based strictly on the news story provided. Never invent facts. Follow this exact format:\n"
        "1. Hook headline with 1-2 relevant emojis (e.g. 🇫🇮🛡️ or 🇫🇮⚠️).\n"
        "2. 1-2 sentence core factual summary.\n"
        "3. 'Here's what you should know 👇' followed by 3-4 bullet points starting with ✅, ⚠️, 📌, or 💡.\n"
        "4. Engagement question asking followers for their perspective.\n"
        "5. Final line: '📲 Read the full verified report at ilovefinland.net (link in bio)'.\n\n"
        "Return strictly JSON with keys:\n"
        "{\n"
        '  "caption": "Full formatted caption string with bullet points and line breaks",\n'
        '  "hashtags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4", "#Tag5"]\n'
        "}"
    )
    user_prompt = (
        f"Story Headline: {headline}\n"
        f"Article Summary / Facts: {article_summary}\n"
        + (f"Current Draft Caption: {current_caption}\n" if current_caption else "")
        + "Write the polished, authentic social caption and 5 hashtags matching the exact story topic."
    )
    return call_openai_chat(system_prompt, user_prompt, model=model)


def transcribe_audio_with_whisper(
    audio_bytes: bytes,
    filename: str = "voice_note.wav",
    key: Optional[str] = None,
) -> Dict[str, Any]:
    """Transcribe voice audio bytes directly using OpenAI Whisper-1 API."""
    api_key = (key or get_openai_api_key()).strip()
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set.")

    boundary = f"----WebKitFormBoundary{secrets.token_hex(16)}"
    body = bytearray()

    # Field 1: model
    body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\nwhisper-1\r\n".encode("utf-8"))

    # Field 2: file
    content_type = "audio/wav"
    if filename.endswith(".mp3"):
        content_type = "audio/mpeg"
    elif filename.endswith(".m4a"):
        content_type = "audio/m4a"
    elif filename.endswith(".webm"):
        content_type = "audio/webm"

    body.extend(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: {content_type}\r\n\r\n".encode(
            "utf-8"
        )
    )
    body.extend(audio_bytes)
    body.extend(b"\r\n")

    # Closing boundary
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = Request(
        "https://api.openai.com/v1/audio/transcriptions",
        data=bytes(body),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "ILoveFinlandStudio/2.0",
        },
    )

    with urlopen(req, timeout=35) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        return {
            "transcript": result.get("text", "").strip(),
            "model": "OpenAI Whisper-1 (Live API)",
            "live_api": True,
            "status": "Transcribed successfully with live Whisper API",
        }


# =====================================================================
# Lowest-Cost Probe Configuration & Spending Guard
# =====================================================================

PROBE_MODEL = "gpt-4o-mini"
PRICING_GPT_4O_MINI = {
    "model": "gpt-4o-mini",
    "input_per_million_usd": 0.150,
    "output_per_million_usd": 0.600,
    "input_cost_per_token": 0.150 / 1_000_000,   # $0.00000015
    "output_cost_per_token": 0.600 / 1_000_000,  # $0.00000060
    "description": "OpenAI's lowest cost supported text model ($0.150 / 1M input, $0.600 / 1M output)",
}


def is_kill_switch_active() -> bool:
    """Return True if emergency kill switch is engaged."""
    env_loader.load_env(override=True)
    return os.environ.get("ILF_OPENAI_KILL_SWITCH", "0").strip() == "1"


def is_demo_mode_active() -> bool:
    """Return True if Demo Mode is active."""
    env_loader.load_env(override=True)
    return os.environ.get("ILF_DEMO_MODE", "1").strip() == "1"


def execute_openai_connection_probe(
    mode: str = "mock",
    confirm_live_charge: bool = False,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute a single connection probe with strict spending protection.

    Rules enforced:
    1. Emergency kill switch check.
    2. Demo Mode enforcement (blocks all live calls by default).
    3. Explicit admin charge confirmation check.
    4. Server-side single-use quota limit (max 1 test).
    5. Lowest-cost model (gpt-4o-mini) with tiny max_tokens=5.
    6. Masked errors and responses (API key never exposed).
    """
    env_loader.load_env(override=True)
    import db

    status_info = db.get_openai_probe_status(db_path=db_path) if db_path else {"live_probes_used": 0}
    probes_used = status_info.get("live_probes_used", 0)

    # 1. Kill Switch Check
    if is_kill_switch_active():
        return {
            "ok": False,
            "status": "BLOCKED_BY_KILL_SWITCH",
            "message": "EMERGENCY KILL SWITCH ACTIVE: All OpenAI API requests are strictly blocked.",
            "mode": mode,
            "credits_spent": False,
            "estimated_cost_usd": 0.0,
            "pricing": PRICING_GPT_4O_MINI,
        }

    # 2. Mock Mode or Demo Mode (Zero Credits Spent)
    if mode == "mock" or is_demo_mode_active():
        sim_prompt_tokens = 9
        sim_completion_tokens = 2
        sim_total_tokens = sim_prompt_tokens + sim_completion_tokens
        sim_cost = (sim_prompt_tokens * PRICING_GPT_4O_MINI["input_cost_per_token"]) + (
            sim_completion_tokens * PRICING_GPT_4O_MINI["output_cost_per_token"]
        )
        msg = (
            "Demo Mode is active. Simulated probe returned successfully with 0 live API calls."
            if is_demo_mode_active()
            else "Mocked probe executed successfully with 0 API credits spent."
        )
        if db_path:
            db.record_openai_probe(
                mode="mock",
                model=f"{PROBE_MODEL} (Simulated)",
                prompt_tokens=sim_prompt_tokens,
                completion_tokens=sim_completion_tokens,
                total_tokens=sim_total_tokens,
                estimated_cost_usd=0.0,
                status="MOCK_SUCCESS",
                message=msg,
                db_path=db_path,
            )
        return {
            "ok": True,
            "status": "MOCK_SUCCESS",
            "message": msg,
            "mode": "mock",
            "model": f"{PROBE_MODEL} (Simulated Probe)",
            "prompt_tokens": sim_prompt_tokens,
            "completion_tokens": sim_completion_tokens,
            "total_tokens": sim_total_tokens,
            "estimated_cost_usd": 0.0,
            "simulated_estimated_cost_usd": round(sim_cost, 8),
            "credits_spent": False,
            "live_probes_used": probes_used,
            "live_probes_limit": 1,
            "pricing": PRICING_GPT_4O_MINI,
        }

    # 3. Live Mode Safety Validations
    if not confirm_live_charge:
        return {
            "ok": False,
            "status": "BLOCKED_CONFIRMATION_REQUIRED",
            "message": "Explicit administrator approval required to spend API credits.",
            "mode": "live",
            "credits_spent": False,
            "estimated_cost_usd": 0.0,
            "pricing": PRICING_GPT_4O_MINI,
        }

    if probes_used >= 1:
        return {
            "ok": False,
            "status": "BLOCKED_QUOTA_EXHAUSTED",
            "message": f"Single-use test quota reached ({probes_used}/1 tests used). Must be manually reset by admin.",
            "mode": "live",
            "credits_spent": False,
            "estimated_cost_usd": 0.0,
            "pricing": PRICING_GPT_4O_MINI,
        }

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key or not api_key.startswith("sk-"):
        return {
            "ok": False,
            "status": "BLOCKED_KEY_MISSING",
            "message": "Valid OPENAI_API_KEY starting with sk- is missing in host environment.",
            "mode": "live",
            "credits_spent": False,
            "estimated_cost_usd": 0.0,
            "pricing": PRICING_GPT_4O_MINI,
        }

    # 4. Execute 1 Tiny Single Probe Request
    payload = {
        "model": PROBE_MODEL,
        "messages": [
            {"role": "system", "content": "Reply 'OK'."},
            {"role": "user", "content": "ping"},
        ],
        "max_tokens": 5,
        "temperature": 0.0,
    }

    try:
        req = Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "ILoveFinlandStudio/2.0-Probe",
            },
        )
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            usage = data.get("usage", {})
            p_tok = usage.get("prompt_tokens", 14)
            c_tok = usage.get("completion_tokens", 2)
            tot_tok = usage.get("total_tokens", p_tok + c_tok)
            cost = (p_tok * PRICING_GPT_4O_MINI["input_cost_per_token"]) + (
                c_tok * PRICING_GPT_4O_MINI["output_cost_per_token"]
            )
            reply = data["choices"][0]["message"]["content"].strip()
            msg = f"Live OpenAI probe succeeded (HTTP 200). Probe reply: '{reply}'."

            if db_path:
                db.record_openai_probe(
                    mode="live",
                    model=PROBE_MODEL,
                    prompt_tokens=p_tok,
                    completion_tokens=c_tok,
                    total_tokens=tot_tok,
                    estimated_cost_usd=cost,
                    status="LIVE_SUCCESS",
                    message=msg,
                    db_path=db_path,
                )

            return {
                "ok": True,
                "status": "LIVE_SUCCESS",
                "message": msg,
                "mode": "live",
                "model": PROBE_MODEL,
                "reply": reply,
                "prompt_tokens": p_tok,
                "completion_tokens": c_tok,
                "total_tokens": tot_tok,
                "estimated_cost_usd": round(cost, 8),
                "credits_spent": True,
                "live_probes_used": probes_used + 1,
                "live_probes_limit": 1,
                "pricing": PRICING_GPT_4O_MINI,
            }

    except urllib.error.HTTPError as exc:
        err_msg = ""
        try:
            err_json = json.loads(exc.read().decode("utf-8"))
            err_msg = err_json.get("error", {}).get("message", str(exc))
        except Exception:
            err_msg = str(exc)
        return {
            "ok": False,
            "status": f"HTTP_{exc.code}",
            "message": f"OpenAI API returned HTTP {exc.code}: {err_msg}",
            "mode": "live",
            "credits_spent": False,
            "estimated_cost_usd": 0.0,
            "pricing": PRICING_GPT_4O_MINI,
        }
    except Exception as exc:
        return {
            "ok": False,
            "status": "NETWORK_ERROR",
            "message": f"Connection failed: {exc}",
            "mode": "live",
            "credits_spent": False,
            "estimated_cost_usd": 0.0,
            "pricing": PRICING_GPT_4O_MINI,
        }
