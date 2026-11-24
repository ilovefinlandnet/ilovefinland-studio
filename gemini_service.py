"""Centralized $0 Free-Tier Google Gemini Backend Service for ILoveFinland Studio.

Powers BOTH Editorial Studio AI and the Finnish Study Lab using GEMINI_API_KEY
from Google AI Studio (Free Tier — zero paid billing required).

Model priority:
  1. gemini-3.8-flash (primary text / multimodal vision / chat / rewrites)
  2. gemini-3.5-flash-lite (fast free-tier fallback)
  3. Automatic free-tier Flash fallback chain (gemini-flash-latest / 2.5-flash / 2.0-flash)
     if a preview model alias returns 404 or hits per-minute quota.

Never calls paid-only image/video/pro-TTS endpoints.
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple


FREE_TIER_MODELS: List[str] = [
    "models/gemini-3.8-flash",
    "models/gemini-3.5-flash-lite",
    "models/gemini-flash-latest",
    "models/gemini-2.5-flash",
    "models/gemini-2.5-flash-lite",
    "models/gemini-2.0-flash",
]

ILOVEFINLAND_EDITORIAL_SYSTEM_PROMPT = """You are the Senior Managing Editor for ilovefinland.net (ILoveFinland Studio).
Always follow these strict publication standards:
1. Active Website Sections (ONLY these 6 — never suggest Jobs, Classifieds, or Shopping):
   - News: Finland, Weather, Business, Education, Sports, Culture & Events, International
   - Events: Culture & Events
   - Finland Guide: Housing, Everyday Life, Residence Permits, Driving, Public Transport, Work, Study in Finland, Moving to Finland, Banking, Cost of Living, Healthcare, Finnish Language, Government Services, Taxes
   - Things to Do: Nature, Outdoor Activities, Family Activities, Winter Activities, Summer Activities, Beaches, Museums, Culture & Traditions
   - Food & Restaurants: Finnish Food, Restaurants & Cafes
   - Travel: Lapland, Helsinki, Finnish Lakeland, Finnish Archipelago, National Parks, Northern Lights, Hotels, Cabins, Camping, Lakes, Summer Travel, Winter Travel, Road Trips
2. Writing Style Rules:
   - Fast News Wire ('news'): Inverted pyramid, 5-Ws in the first paragraph, clear factual reporting, Finland impact first, crisp subheadings.
   - Local Insider Guide ('guide'): Practical, warm, trustworthy Finland-first local guide with real costs in EUR, actionable steps, Finnish etiquette, and zero fluff.
3. Location Rules:
   - National stories keep City and Address blank. Only populate City for city-specific stories. Only populate Event Date/Venue for the Events section.
4. Accuracy & Tone:
   - Never fabricate official rules, statistics, or URLs. Keep prose clear, scannable, and authentic to life in Finland.
"""


def get_gemini_api_key() -> str:
    return (
        os.environ.get("GEMINI_API_KEY", "").strip()
        or os.environ.get("GOOGLE_API_KEY", "").strip()
    )


def _normalize_model_name(model_name: str) -> str:
    m = (model_name or "").strip()
    if not m:
        return FREE_TIER_MODELS[0]
    return m if m.startswith("models/") else f"models/{m}"


def _extract_json_block(text: str) -> Optional[Dict[str, Any]]:
    raw = (text or "").strip()
    if not raw:
        return None
    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw)
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    m = re.search(r"\{[\s\S]*\}", raw)
    if m:
        try:
            parsed = json.loads(m.group(0))
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return None


def generate_content(
    *,
    system_prompt: str = "",
    user_prompt: str = "",
    contents: Optional[List[Dict[str, Any]]] = None,
    image_b64: Optional[str] = None,
    image_mime: str = "image/jpeg",
    preferred_model: Optional[str] = None,
    json_mode: bool = False,
    temperature: float = 0.45,
    max_output_tokens: int = 2400,
    timeout_sec: int = 35,
) -> Dict[str, Any]:
    """Call Google Gemini Free-Tier generateContent with automatic model fallback.

    Returns dict: {"ok": bool, "text": str, "json": dict|None, "model": str, "error": str, "status_code": int}
    """
    api_key = get_gemini_api_key()
    if not api_key:
        return {
            "ok": False,
            "text": "",
            "json": None,
            "model": "",
            "status_code": 400,
            "error": "GEMINI_API_KEY is not configured on the server. Add your free Google AI Studio key in .env or Render Environment.",
        }

    models_to_try: List[str] = []
    if preferred_model:
        models_to_try.append(_normalize_model_name(preferred_model))
    for m in FREE_TIER_MODELS:
        if m not in models_to_try:
            models_to_try.append(m)

    if contents is None:
        parts: List[Dict[str, Any]] = []
        if user_prompt:
            parts.append({"text": user_prompt})
        if image_b64:
            clean_b64 = image_b64.split(",", 1)[1] if "," in image_b64 else image_b64
            parts.append({
                "inlineData": {
                    "mimeType": image_mime or "image/jpeg",
                    "data": clean_b64,
                }
            })
        req_contents = [{"role": "user", "parts": parts}]
    else:
        req_contents = contents

    gen_config: Dict[str, Any] = {
        "temperature": temperature,
        "maxOutputTokens": max_output_tokens,
    }
    if json_mode:
        gen_config["responseMimeType"] = "application/json"

    payload: Dict[str, Any] = {
        "contents": req_contents,
        "generationConfig": gen_config,
    }
    if system_prompt:
        payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

    body_bytes = json.dumps(payload).encode("utf-8")
    last_error = "Gemini request failed."
    last_status = 502

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={api_key}"
        req = urllib.request.Request(
            url,
            data=body_bytes,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates") or []
            text_parts: List[str] = []
            if candidates:
                c_parts = (candidates[0].get("content") or {}).get("parts") or []
                for p in c_parts:
                    if isinstance(p, dict) and p.get("text"):
                        text_parts.append(p["text"])
            reply_text = "\n".join(text_parts).strip()
            if not reply_text:
                last_error = f"Empty response from {model_name}."
                continue
            parsed_json = _extract_json_block(reply_text) if json_mode else None
            return {
                "ok": True,
                "text": reply_text,
                "json": parsed_json,
                "model": model_name.replace("models/", ""),
                "status_code": 200,
                "error": "",
            }
        except urllib.error.HTTPError as he:
            last_status = he.code
            try:
                err_raw = he.read().decode("utf-8", errors="ignore")
                err_obj = json.loads(err_raw)
                err_msg = (err_obj.get("error") or {}).get("message") or err_raw[:220]
            except Exception:
                err_msg = str(he)

            # 401 / 403 = invalid API key -> stop immediately with clear message
            if he.code in (401, 403):
                return {
                    "ok": False,
                    "text": "",
                    "json": None,
                    "model": model_name.replace("models/", ""),
                    "status_code": he.code,
                    "error": f"Google Gemini API key rejected ({he.code}): {err_msg}",
                }
            # 404 (preview alias unavailable) or 429 (free-tier rate limit) -> try next free-tier model
            if he.code in (404, 429, 500, 503):
                last_error = f"Gemini {model_name.replace('models/', '')} ({he.code}): {err_msg}"
                continue
            last_error = f"Gemini error ({he.code}): {err_msg}"
            break
        except Exception as ex:
            last_status = 502
            last_error = f"Network error calling Gemini ({model_name.replace('models/', '')}): {ex}"
            continue

    if last_status == 429:
        last_error = (
            "Google AI Studio Free Tier rate limit reached temporarily. "
            "Wait ~30 seconds and retry — no paid billing is triggered."
        )
    return {
        "ok": False,
        "text": "",
        "json": None,
        "model": "",
        "status_code": last_status,
        "error": last_error,
    }


def verify_gemini_connection() -> Dict[str, Any]:
    """Quick $0 free-tier verification for Platform Connections UI."""
    api_key = get_gemini_api_key()
    if not api_key:
        return {
            "service": "Google Gemini (Default — Free Tier)",
            "ok": False,
            "status": "Not Configured",
            "message": "GEMINI_API_KEY is not set. Add your free Google AI Studio key to .env or Render secrets.",
        }
    res = generate_content(
        system_prompt="Reply with only the single word OK.",
        user_prompt="Ping",
        max_output_tokens=8,
        temperature=0.0,
        timeout_sec=15,
    )
    if res["ok"]:
        return {
            "service": "Google Gemini (Default — Free Tier)",
            "ok": True,
            "status": f"Connected ({res['model']} • $0 Free Tier)",
            "model": res["model"],
            "message": f"Live Gemini Free Tier verified via {res['model']} (Studio AI + Finnish Study Lab active).",
        }
    return {
        "service": "Google Gemini (Default — Free Tier)",
        "ok": False,
        "status": "Connection Error",
        "message": res["error"],
    }


def preview_article_rewrite(
    article: Dict[str, Any],
    writing_style: str = "guide",
    instruction: str = "",
) -> Dict[str, Any]:
    """Generate a Gemini article rewrite preview (returns diff payload without overwriting DB)."""
    style_clean = "news" if str(writing_style).lower().strip() == "news" else "guide"
    style_desc = (
        "Fast News Wire (inverted pyramid, factual lead, 5-Ws first, crisp subheadings)"
        if style_clean == "news"
        else "Local Insider Guide (practical local tips, real EUR costs, Finnish etiquette, scannable sections)"
    )
    user_prompt = f"""Rewrite and elevate the following ilovefinland.net article draft using style: {style_desc}.
Optional editor instruction: {instruction or 'Improve clarity, hook strength, SEO phrasing, and scannable HTML formatting (<p>, <h2>, <ul><li>).'}

CURRENT DRAFT:
Section: {article.get('section', 'News')}
Category: {article.get('category', 'Finland')}
Language: {article.get('language', 'English')}
Headline: {article.get('headline', '')}
Short Description: {article.get('short_description', '')}
Body HTML:
{(article.get('body_html') or '')[:6000]}

Return STRICT JSON with keys:
{{
  "headline": "Improved punchy headline",
  "short_description": "1-2 sentence compelling summary",
  "body_html": "Clean WordPress-ready HTML using <p>, <h2>, <ul>, <li>, <strong> (no <h1>, no markdown fences)",
  "seo_title": "Max 60 chars SEO title",
  "meta_description": "Max 155 chars meta description",
  "change_summary": "Brief 1-sentence note on what improved"
}}"""
    res = generate_content(
        system_prompt=ILOVEFINLAND_EDITORIAL_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        json_mode=True,
        temperature=0.45,
        max_output_tokens=2800,
    )
    if not res["ok"]:
        return res
    data = res["json"] or {}
    if not data.get("headline") and not data.get("body_html"):
        return {
            "ok": False,
            "status_code": 502,
            "error": "Gemini returned an unexpected format. Please retry.",
        }
    return {
        "ok": True,
        "model": res["model"],
        "proposal": {
            "headline": data.get("headline") or article.get("headline", ""),
            "short_description": data.get("short_description") or article.get("short_description", ""),
            "body_html": data.get("body_html") or article.get("body_html", ""),
            "seo_title": (data.get("seo_title") or article.get("seo_title", ""))[:60],
            "meta_description": (data.get("meta_description") or article.get("meta_description", ""))[:155],
            "change_summary": data.get("change_summary") or f"Polished with Google Gemini ({res['model']}).",
        },
    }


def preview_caption_polish(
    article: Dict[str, Any],
    ig_post: Dict[str, Any],
    instruction: str = "",
) -> Dict[str, Any]:
    """Generate a Gemini social caption, hook lines & hashtag preview (no DB overwrite yet)."""
    user_prompt = f"""Polish the Instagram & Facebook caption, cover hook lines, and 5 hashtags for this ilovefinland.net story.
Optional editor instruction: {instruction or 'Make the opening hook scroll-stopping, add 3 scannable bullet insights, end with a clear CTA to ilovefinland.net, and include exactly 5 relevant Finland hashtags.'}

ARTICLE CONTEXT:
Title: {article.get('headline', '')}
Summary: {article.get('short_description', '')}
Section / Category: {article.get('section', 'News')} / {article.get('category', 'Finland')}

CURRENT SOCIAL POST:
Headline Line 1: {ig_post.get('headline_line1', '')}
Headline Line 2: {ig_post.get('headline_line2', '')}
Current Caption:
{(ig_post.get('caption') or '')[:1800]}

Return STRICT JSON with keys:
{{
  "caption": "Engaging social caption with hook, concise insights, and CTA to ilovefinland.net (without repeating hashtags twice)",
  "hashtags": ["#Finland", "#ILoveFinland", "#Tag3", "#Tag4", "#Tag5"],
  "headline_line1": "Short punchy 3-5 word cover line 1",
  "headline_line2": "Short punchy 3-5 word cover line 2",
  "change_summary": "Brief 1-sentence summary of improvements"
}}"""
    res = generate_content(
        system_prompt=ILOVEFINLAND_EDITORIAL_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        json_mode=True,
        temperature=0.6,
        max_output_tokens=1200,
    )
    if not res["ok"]:
        return res
    data = res["json"] or {}
    tags = data.get("hashtags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split() if t.strip()]
    clean_tags = [t if t.startswith("#") else f"#{t.lstrip('#')}" for t in tags[:5]]
    return {
        "ok": True,
        "model": res["model"],
        "proposal": {
            "caption": (data.get("caption") or ig_post.get("caption", "")).strip(),
            "hashtags": clean_tags or (ig_post.get("hashtags") or []),
            "headline_line1": (data.get("headline_line1") or ig_post.get("headline_line1", "")).strip(),
            "headline_line2": (data.get("headline_line2") or ig_post.get("headline_line2", "")).strip(),
            "change_summary": data.get("change_summary") or f"Polished with Google Gemini ({res['model']}).",
        },
    }


def generate_reel_ai_assist(topic: str, prompt_type: str = "hooks") -> Dict[str, Any]:
    """Generate live Gemini Free-Tier hooks, subtitles, or hashtags for Reels Studio."""
    clean_topic = (topic or "Finland").strip()
    kind = (prompt_type or "hooks").strip().lower()
    if kind == "hooks":
        ask = f"Generate 4 scroll-stopping 9:16 Instagram Reel opening hooks (max 8 words each, punchy, Finland-authentic) about: {clean_topic}."
    elif kind == "subtitles":
        ask = f"Generate 4 crisp on-screen Reel subtitle sentences (max 12 words each) about: {clean_topic}."
    else:
        ask = f"Generate 3 hashtag sets (5 hashtags each, starting with #) tailored for Finland Instagram Reels about: {clean_topic}."

    res = generate_content(
        system_prompt=ILOVEFINLAND_EDITORIAL_SYSTEM_PROMPT,
        user_prompt=f'{ask}\nReturn STRICT JSON: {{"suggestions": ["item 1", "item 2", "item 3", "item 4"]}}',
        json_mode=True,
        temperature=0.65,
        max_output_tokens=600,
    )
    if res["ok"] and res["json"] and isinstance(res["json"].get("suggestions"), list):
        return {
            "ok": True,
            "type": kind,
            "model": res["model"],
            "suggestions": [str(s).strip() for s in res["json"]["suggestions"] if str(s).strip()][:5],
        }
    return {
        "ok": False,
        "type": kind,
        "error": res.get("error") or "Unable to generate suggestions.",
        "suggestions": [],
    }
