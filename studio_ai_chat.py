"""
ILoveFinland Studio — Admin-Only Studio AI Command Chat Engine (v81.0).

Strictly Admin-only (binodoli721@gmail.com). Completely separate from Finnish Learning Lab.
Capabilities inside one unified ChatGPT-style room:
1. General AI Chat + Multimodal Photo/PDF analysis (Gemini Flash).
2. Live Web Fact-Checking ("Is this news true?") via Gemini Google Search Grounding.
3. Real Photo Search ("Find me pictures for this title") via Wikimedia Commons & Openverse (free, high-res).
4. AI Image Generation ("Create an AI picture for this title") via Gemini Image / Pollinations fallback.
"""

from __future__ import annotations

import base64
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

import finnish_lab_engine


def _get_gemini_key() -> str:
    return (
        os.environ.get("GEMINI_API_KEY", "").strip()
        or os.environ.get("GOOGLE_API_KEY", "").strip()
    )


def _detect_intent(msg: str) -> str:
    low = (msg or "").lower()
    if any(k in low for k in (
        "create ai picture", "create an ai picture", "create a picture", "create image",
        "generate image", "generate a picture", "generate ai", "make a picture", "make an image",
        "draw ", "create photo", "generate photo", "ai picture for", "ai image for",
    )):
        return "generate_image"
    if any(k in low for k in (
        "find picture", "find me picture", "find photo", "find me photo", "find images",
        "search photo", "search picture", "stock photo", "real photo", "picture related to",
        "photos for", "pictures for", "image for this title",
    )):
        return "find_photos"
    if any(k in low for k in (
        "is this true", "is this news true", "fact check", "fact-check", "verify this",
        "check this news", "fake news", "latest news", "did finland", "is it true",
    )):
        return "fact_check"
    return "general"


def _search_real_photos(query: str, limit: int = 6) -> List[Dict[str, str]]:
    """Search free high-res real photos via Wikimedia Commons & Openverse (zero API key needed)."""
    clean_q = re.sub(
        r"\b(find|me|pictures?|photos?|images?|related|to|this|title|for|about|please|search|stock|real)\b",
        " ",
        query,
        flags=re.I,
    )
    clean_q = re.sub(r"\s+", " ", clean_q).strip()[:80] or "Finland landscape"
    results: List[Dict[str, str]] = []

    # 1. Openverse (Creative Commons / Flickr / Wikimedia high-res photos)
    try:
        url = f"https://api.openverse.org/v1/images/?q={urllib.parse.quote(clean_q)}&page_size={limit}"
        req = urllib.request.Request(url, headers={"User-Agent": "ILoveFinlandStudio/1.0", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        for it in data.get("results") or []:
            img_url = it.get("url") or it.get("thumbnail")
            thumb = it.get("thumbnail") or img_url
            if img_url and img_url.startswith("http"):
                results.append({
                    "url": img_url,
                    "thumb": thumb,
                    "title": (it.get("title") or clean_q)[:64],
                    "source": it.get("source") or "Openverse",
                    "creator": (it.get("creator") or "")[:40],
                })
    except Exception:
        pass

    # 2. Wikimedia Commons fallback if needed
    if len(results) < 4:
        try:
            url = (
                "https://commons.wikimedia.org/w/api.php?action=query&generator=search"
                f"&gsrsearch={urllib.parse.quote(clean_q + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit={limit}"
                "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json"
            )
            req = urllib.request.Request(url, headers={"User-Agent": "ILoveFinlandStudio/1.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            pages = (data.get("query") or {}).get("pages") or {}
            for p in pages.values():
                info = (p.get("imageinfo") or [{}])[0]
                u = info.get("thumburl") or info.get("url")
                if u and u.startswith("http"):
                    results.append({
                        "url": info.get("url") or u,
                        "thumb": u,
                        "title": (p.get("title") or clean_q).replace("File:", "")[:64],
                        "source": "Wikimedia Commons",
                        "creator": "",
                    })
        except Exception:
            pass

    return results[:limit]


def _generate_ai_image(prompt_text: str) -> Tuple[Optional[Dict[str, str]], Optional[str]]:
    """Generate a high-res editorial AI image (tries Gemini native image gen first, then Pollinations free fallback)."""
    clean_prompt = re.sub(
        r"\b(create|generate|make|an?|ai|picture|image|photo|for|this|title|please)\b",
        " ",
        prompt_text,
        flags=re.I,
    )
    subject = re.sub(r"\s+", " ", clean_prompt).strip() or prompt_text.strip()
    editorial_prompt = (
        f"Authentic editorial DSLR photograph, {subject}, Finland Nordic natural lighting, "
        "sharp 35mm lens, realistic colors, zero text, zero watermark, magazine quality"
    )

    key = _get_gemini_key()
    if key:
        for model in ("models/gemini-2.0-flash-exp-image-generation", "models/gemini-2.5-flash-image"):
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={key}"
                body = json.dumps({
                    "contents": [{"role": "user", "parts": [{"text": editorial_prompt}]}],
                    "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
                }).encode("utf-8")
                req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
                with urllib.request.urlopen(req, timeout=28) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
                for cand in payload.get("candidates") or []:
                    for part in (cand.get("content") or {}).get("parts") or []:
                        inl = part.get("inlineData") or part.get("inline_data")
                        if inl and inl.get("data"):
                            mime = inl.get("mimeType") or inl.get("mime_type") or "image/png"
                            data_url = f"data:{mime};base64,{inl['data']}"
                            return {"url": data_url, "prompt": subject, "provider": "Gemini Image"}, None
            except Exception:
                continue

    # Free reliable Pollinations editorial fallback (renders directly in browser!)
    encoded = urllib.parse.quote(editorial_prompt[:320])
    img_url = f"https://image.pollinations.ai/prompt/{encoded}?width=1080&height=1350&nologo=true"
    return {"url": img_url, "prompt": subject, "provider": "AI Image Generator"}, None


def _call_studio_gemini(
    contents: List[Dict[str, Any]],
    system_instruction: str,
    use_search: bool = False,
) -> Tuple[Optional[str], List[Dict[str, str]], Optional[str]]:
    key = _get_gemini_key()
    if not key:
        return None, [], "GEMINI_API_KEY is not configured on the server."

    discovery = finnish_lab_engine.discover_gemini_models()
    models_to_try: List[str] = []
    if discovery.get("selected_model"):
        models_to_try.append(discovery["selected_model"])
    for fb in discovery.get("fallback_models", []):
        if fb not in models_to_try:
            models_to_try.append(fb)
    if not models_to_try:
        models_to_try = ["models/gemini-flash-lite-latest", "models/gemini-2.0-flash"]

    last_err = "Could not reach Gemini."
    for model_id in models_to_try[:3]:
        url = f"https://generativelanguage.googleapis.com/v1beta/{model_id}:generateContent?key={key}"
        req_body: Dict[str, Any] = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.45, "maxOutputTokens": 2048},
        }
        if use_search:
            req_body["tools"] = [{"google_search": {}}]

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(req_body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=28) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            cands = data.get("candidates") or []
            if not cands:
                continue
            cand = cands[0]
            parts = (cand.get("content") or {}).get("parts") or []
            text_out = "\n".join(p.get("text", "") for p in parts if p.get("text")).strip()
            sources: List[Dict[str, str]] = []
            gm = cand.get("groundingMetadata") or {}
            for chunk in gm.get("groundingChunks") or []:
                web = chunk.get("web") or {}
                if web.get("uri"):
                    sources.append({"title": web.get("title") or web["uri"][:48], "url": web["uri"]})
            if text_out:
                return text_out, sources[:6], None
        except urllib.error.HTTPError as he:
            # If search grounding not supported on this model, retry once without search tool
            if use_search and he.code == 400:
                return _call_studio_gemini(contents, system_instruction, use_search=False)
            last_err = f"HTTP {he.code}"
        except Exception as exc:
            last_err = str(exc).replace(key, "***")[:120]

    return None, [], last_err


def handle_studio_chat(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    """Unified Admin-only Studio AI Chat handler (General Chat + Fact-Check + Photo Search + AI Image Gen)."""
    message = (payload.get("message") or "").strip()
    history = payload.get("history") or []
    attachments = payload.get("attachments") or []
    forced_action = (payload.get("action") or "").strip().lower()

    if not message and not attachments:
        return {"ok": False, "error": "EMPTY", "message": "Type a message or attach a photo/PDF."}, 400

    intent = forced_action or _detect_intent(message)
    found_photos: List[Dict[str, str]] = []
    generated_image: Optional[Dict[str, str]] = None

    if intent == "find_photos":
        found_photos = _search_real_photos(message, limit=6)
        reply = (
            f"Found **{len(found_photos)} real high-res photos** for your title! Tap any photo to open full size or download it."
            if found_photos
            else "I couldn't find matching free stock photos for that exact phrasing — try shorter keywords (e.g. `Helsinki winter snow`) or ask me to **create an AI picture** instead!"
        )
        return {"ok": True, "reply": reply, "intent": intent, "photos": found_photos, "generated_image": None, "sources": []}, 200

    if intent == "generate_image":
        generated_image, gen_err = _generate_ai_image(message)
        if generated_image:
            return {
                "ok": True,
                "reply": f"Here is your editorial AI image for **{generated_image['prompt']}**! Tap **Download** to save it for ILoveFinland.net or Instagram.",
                "intent": intent,
                "photos": [],
                "generated_image": generated_image,
                "sources": [],
            }, 200
        return {"ok": False, "error": "GEN_FAILED", "message": gen_err or "Could not generate image."}, 503

    # Build multimodal conversation history
    contents: List[Dict[str, Any]] = []
    for turn in history[-12:]:
        role = "model" if turn.get("role") in ("assistant", "model") else "user"
        t_text = (turn.get("text") or "").strip()
        if t_text:
            contents.append({"role": role, "parts": [{"text": t_text}]})

    cur_parts, val_err = finnish_lab_engine._validate_and_build_parts(message, attachments)
    if val_err:
        return {"ok": False, "error": "INVALID_INPUT", "message": val_err}, 400
    contents.append({"role": "user", "parts": cur_parts})

    sys_prompt = (
        "You are Binod's private AI assistant inside ILoveFinland Studio (for ilovefinland.net & @ilovefinland Instagram, plus general personal/business help). "
        "Be sharp, concise, practical, and direct like ChatGPT.\n"
        "- When fact-checking news or claims about Finland or the world, give a clear verdict (**✅ True**, **⚠️ Partly True / Unverified**, or **❌ False**), cite real facts/dates, and prioritize official sources (Yle, Migri, Traficom, Kela, FMI, Reuters).\n"
        "- When asked for article outlines, Instagram captions, Reel hooks, emails, or general advice, give clean, ready-to-use output."
    )
    text_out, sources, err = _call_studio_gemini(
        contents=contents,
        system_instruction=sys_prompt,
        use_search=(intent == "fact_check"),
    )
    if err or not text_out:
        return {"ok": False, "error": "AI_ERROR", "message": err or "AI could not respond right now."}, 503

    return {
        "ok": True,
        "reply": text_out,
        "intent": intent,
        "photos": [],
        "generated_image": None,
        "sources": sources,
    }, 200
