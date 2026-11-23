"""
ILoveFinland Studio — Admin-Only Studio AI Command Chat Engine (v82.0).

Strictly Admin-only (binodoli721@gmail.com). Completely separate from Finnish Learning Lab.
Capabilities inside one unified ChatGPT-style room:
1. General AI Chat + Multimodal Photo/PDF analysis (Gemini Flash).
2. Live Web Fact-Checking ("Is this news true?") via Gemini Google Search Grounding.
3. Real Photo Search ("Find me pictures for this title") via Openverse & Wikimedia Commons (free, high-res).
4. AI Image Generation ("Create an AI picture for this title") via Gemini Image / Pollinations fallback.
5. Attach Photo to Article ("Add photo 2 to my Helsinki article" / 1-tap "+ Article" button).
6. Create Studio Article + Social Post directly from chat ("Make an article for this title: ...").
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

import db
import finnish_lab_engine


def _get_gemini_key() -> str:
    return (
        os.environ.get("GEMINI_API_KEY", "").strip()
        or os.environ.get("GOOGLE_API_KEY", "").strip()
    )


def _detect_intent(msg: str) -> str:
    low = (msg or "").lower().strip()
    # 1. Attach a photo/image to an article
    if (
        any(k in low for k in (
            "add this to", "add this one to", "add photo", "add picture", "add image",
            "put photo", "put picture", "put this photo", "put this image",
            "use photo", "use picture", "use this photo", "use this image", "use this one",
            "set as featured", "set photo", "attach photo", "attach this",
            "to this article", "to the article", "to my article", "article photo",
        ))
        and any(w in low for w in ("photo", "picture", "image", "this one", "featured"))
        and any(w in low for w in ("article", "post", "story", "featured", "#"))
    ):
        return "attach_photo"

    # 2. Create a new Studio article + social post from a title/topic
    if any(k in low for k in (
        "make an article", "make the article", "make article",
        "create an article", "create the article", "create article",
        "write an article for studio", "new article for", "create a story",
        "make a story", "draft an article", "publish an article",
        "article for this title", "article about this",
    )):
        return "create_article"

    # 3. Generate an AI image
    if any(k in low for k in (
        "create ai picture", "create an ai picture", "create a picture", "create image",
        "generate image", "generate a picture", "generate ai", "make a picture", "make an image",
        "draw ", "create photo", "generate photo", "ai picture for", "ai image for",
    )):
        return "generate_image"

    # 4. Find real stock photos
    if any(k in low for k in (
        "find picture", "find me picture", "find photo", "find me photo", "find images",
        "search photo", "search picture", "stock photo", "real photo", "picture related to",
        "photos for", "pictures for", "image for this title",
    )):
        return "find_photos"

    # 5. Fact-check news
    if any(k in low for k in (
        "is this true", "is this news true", "fact check", "fact-check", "verify this",
        "check this news", "fake news", "latest news", "did finland", "is it true",
    )):
        return "fact_check"

    return "general"


def _download_image_to_data_url(image_url: str) -> Tuple[Optional[str], Optional[str]]:
    """Download an external HTTP(S) image into a base64 data URL so Studio saves it locally."""
    if not image_url:
        return None, "Missing image URL."
    if image_url.startswith("data:image/"):
        return image_url, None
    if image_url.startswith("/assets/"):
        return image_url, None
    try:
        req = urllib.request.Request(
            image_url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; ILoveFinlandStudio/1.0)",
                "Accept": "image/*,*/*;q=0.8",
            },
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read(12 * 1024 * 1024)
            ctype = (resp.headers.get("Content-Type") or "image/jpeg").split(";")[0].strip().lower()
            if not ctype.startswith("image/"):
                ctype = "image/jpeg"
        if not raw or len(raw) < 200:
            return None, "Downloaded image was empty."
        b64 = base64.b64encode(raw).decode("ascii")
        return f"data:{ctype};base64,{b64}", None
    except Exception as exc:
        return None, f"Could not download photo: {str(exc)[:100]}"


def attach_photo_to_article(
    package_id: int,
    photo_obj: Dict[str, Any],
    mode: str = "featured",
    db_path: str = db.DB_PATH,
    author: str = "binodoli721@gmail.com",
) -> Tuple[Dict[str, Any], int]:
    """Attach a chat photo or generated AI image to a Studio article package."""
    img_url = (photo_obj.get("url") or photo_obj.get("image_url") or photo_obj.get("thumb") or "").strip()
    data_url = (photo_obj.get("data_url") or "").strip()

    if not data_url and img_url.startswith("data:image/"):
        data_url = img_url
        img_url = ""

    local_url = ""
    if not data_url and img_url.startswith("http"):
        dl_data_url, dl_err = _download_image_to_data_url(img_url)
        if dl_data_url and dl_data_url.startswith("data:image/"):
            data_url = dl_data_url
        else:
            # Fallback to direct URL if download blocked
            local_url = img_url
    elif img_url.startswith("/assets/"):
        local_url = img_url

    if not data_url and not local_url:
        return {"ok": False, "error": "NO_IMAGE", "message": "No valid image found to attach."}, 400

    title_hint = (photo_obj.get("title") or photo_obj.get("prompt") or "Studio AI Photo")[:80]
    creator = (photo_obj.get("creator") or photo_obj.get("photographer") or "").strip()
    source = (photo_obj.get("source") or photo_obj.get("provider") or "ILF").strip()
    ext = "png" if "image/png" in data_url else "jpg"
    image_data: Dict[str, Any] = {
        "filename": f"studio_ai_photo.{ext}",
        "alt_text": title_hint,
        "caption": title_hint,
        "photographer": creator or source or "ILF",
        "agency": source or "ILF",
        "licence": "Creative Commons / Editorial" if source.lower() in ("flickr", "openverse", "wikimedia commons") else "Editorial Rights (ILF)",
    }
    if data_url:
        image_data["data_url"] = data_url
    else:
        image_data["url"] = local_url

    try:
        if mode == "additional":
            bundle = db.add_article_additional_image(int(package_id), image_data=image_data, author=author, db_path=db_path)
        else:
            bundle = db.upload_featured_image(int(package_id), image_data=image_data, author=author, db_path=db_path)
        pkg = bundle.get("package") or {}
        return {
            "ok": True,
            "package_id": int(pkg.get("id") or package_id),
            "package_title": pkg.get("title") or f"Article #{package_id}",
            "mode": mode,
        }, 200
    except Exception as exc:
        return {"ok": False, "error": "ATTACH_FAILED", "message": str(exc)[:180]}, 400


def _list_recent_packages(db_path: str = db.DB_PATH, limit: int = 30) -> List[Dict[str, Any]]:
    conn = db.get_connection(db_path)
    try:
        rows = conn.execute(
            "SELECT id, title, status, updated_at FROM packages WHERE COALESCE(is_archived, 0) = 0 ORDER BY updated_at DESC, id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [{"id": int(r["id"]), "title": r["title"], "status": r["status"]} for r in rows]
    finally:
        conn.close()


def _find_matching_package(
    message: str,
    active_package_id: Optional[int],
    db_path: str = db.DB_PATH,
) -> Optional[Dict[str, Any]]:
    pkgs = _list_recent_packages(db_path=db_path, limit=60)
    if not pkgs:
        return None
    low = (message or "").lower()

    # 1. Explicit #ID or "article 58"
    m_id = re.search(r"(?:#|article\s*#?|post\s*#?|story\s*#?)(\d{1,5})\b", low)
    if m_id:
        target_id = int(m_id.group(1))
        for p in pkgs:
            if p["id"] == target_id:
                return p

    # 2. "this article" / "current article" when an article is currently open in Studio
    if active_package_id and any(k in low for k in ("this article", "current article", "that article", "this story", "this post")):
        for p in pkgs:
            if p["id"] == int(active_package_id):
                return p

    # 3. Keyword overlap against article titles
    stop = {
        "add", "put", "use", "set", "attach", "this", "one", "that", "the", "to", "for", "in", "on",
        "my", "article", "post", "story", "photo", "picture", "image", "featured", "as", "please",
        "first", "second", "third", "fourth", "fifth", "sixth", "last", "number", "num",
    }
    words = [w for w in re.findall(r"[a-zA-ZäöåÄÖÅ0-9]{3,}", low) if w not in stop and not w.isdigit()]
    if words:
        best = None
        best_score = 0
        for p in pkgs:
            t_low = (p["title"] or "").lower()
            score = sum(1 for w in words if w in t_low)
            if score > best_score:
                best_score = score
                best = p
        if best and best_score >= 1:
            return best

    # 4. Fallback to active_package_id if user is actively reviewing one
    if active_package_id:
        for p in pkgs:
            if p["id"] == int(active_package_id):
                return p

    return None


def _pick_photo_from_recent(message: str, recent_media: Dict[str, Any]) -> Optional[Tuple[Dict[str, Any], str]]:
    low = (message or "").lower()
    photos = recent_media.get("photos") or []
    gen = recent_media.get("generated_image")

    # Check explicit number: "photo 2", "#3", "second", "last"
    idx: Optional[int] = None
    word_map = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6}
    for w, n in word_map.items():
        if re.search(rf"\b{w}\b", low):
            idx = n
            break
    if idx is None:
        m_num = re.search(r"(?:photo|picture|image|pic|number|#)\s*(\d)\b", low)
        if m_num:
            idx = int(m_num.group(1))
    if idx is None and "last" in low and photos:
        idx = len(photos)

    if idx is not None and 1 <= idx <= len(photos):
        return photos[idx - 1], f"Photo #{idx}"
    if gen and (idx is None or "ai" in low or "generated" in low):
        return gen, "your AI image"
    if photos:
        return photos[0], "Photo #1"
    return None


def _extract_article_topic(message: str) -> str:
    # Strip leading command phrases cleanly
    cleaned = re.sub(
        r"^\s*(please\s+)?(can you\s+)?(make|create|write|draft|build|generate)\s+(me\s+)?(an?|the|new)\s+(studio\s+)?(article|story|post)\s*(like that\s*)?(for|about|on|titled|with title|title)?\s*(this\s+title)?\s*[:\-–—]?\s*",
        "",
        message.strip(),
        flags=re.I,
    ).strip()
    cleaned = cleaned.strip("\"' ")
    return cleaned or message.strip()


def _search_real_photos(query: str, limit: int = 6) -> List[Dict[str, str]]:
    """Search free high-res real photos via Openverse & Wikimedia Commons (zero API key needed)."""
    clean_q = re.sub(
        r"\b(find|me|pictures?|photos?|images?|related|to|this|title|for|about|please|search|stock|real)\b",
        " ",
        query,
        flags=re.I,
    )
    clean_q = re.sub(r"\s+", " ", clean_q).strip()[:80] or "Finland landscape"
    results: List[Dict[str, str]] = []

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
            if use_search and he.code == 400:
                return _call_studio_gemini(contents, system_instruction, use_search=False)
            last_err = f"HTTP {he.code}"
        except Exception as exc:
            last_err = str(exc).replace(key, "***")[:120]

    return None, [], last_err


def handle_studio_chat(
    payload: Dict[str, Any],
    db_path: str = db.DB_PATH,
    author: str = "binodoli721@gmail.com",
) -> Tuple[Dict[str, Any], int]:
    """Unified Admin-only Studio AI Chat handler."""
    message = (payload.get("message") or "").strip()
    history = payload.get("history") or []
    attachments = payload.get("attachments") or []
    forced_action = (payload.get("action") or "").strip().lower()
    recent_media = payload.get("recent_media") or {}
    active_pkg_raw = payload.get("active_package_id")
    active_package_id = int(active_pkg_raw) if str(active_pkg_raw or "").isdigit() else None

    if not message and not attachments:
        return {"ok": False, "error": "EMPTY", "message": "Type a message or attach a photo/PDF."}, 400

    intent = forced_action or _detect_intent(message)

    # 1. ATTACH PHOTO TO ARTICLE
    if intent == "attach_photo":
        picked = _pick_photo_from_recent(message, recent_media)
        if not picked:
            return {
                "ok": True,
                "reply": "I don't see a recent photo in this chat yet! First ask me to **find real photos** or **create an AI image**, or tap **+ Article** right under any photo.",
                "intent": intent,
                "photos": [],
                "generated_image": None,
                "sources": [],
            }, 200
        photo_obj, photo_label = picked
        mode = "additional" if any(k in message.lower() for k in ("extra", "additional", "gallery", "second photo")) else "featured"
        target_pkg = _find_matching_package(message, active_package_id, db_path=db_path)
        if not target_pkg:
            recent_pkgs = _list_recent_packages(db_path=db_path, limit=6)
            return {
                "ok": True,
                "reply": f"Which article should I add **{photo_label}** to? Tap one below:",
                "intent": intent,
                "photos": [],
                "generated_image": None,
                "sources": [],
                "pick_article_for_photo": {
                    "photo": photo_obj,
                    "photo_label": photo_label,
                    "mode": mode,
                    "articles": recent_pkgs,
                },
            }, 200
        res, code = attach_photo_to_article(target_pkg["id"], photo_obj, mode=mode, db_path=db_path, author=author)
        if code != 200:
            return {"ok": False, "error": "ATTACH_FAILED", "message": res.get("message") or "Could not attach photo."}, code
        role_word = "Extra Photo" if mode == "additional" else "Featured Photo"
        return {
            "ok": True,
            "reply": f"Done! Added **{photo_label}** as the **{role_word}** for **{res['package_title']}** (#{res['package_id']}).",
            "intent": intent,
            "photos": [],
            "generated_image": None,
            "sources": [],
            "article_action": {
                "package_id": res["package_id"],
                "title": res["package_title"],
                "label": "Open Article →",
            },
        }, 200

    # 2. CREATE FULL STUDIO ARTICLE + SOCIAL POST
    if intent == "create_article":
        topic = _extract_article_topic(message)
        if len(topic) < 4:
            return {
                "ok": True,
                "reply": "Tell me the title or topic for the article! Example: *Make an article for this title: Why Helsinki Winters Are Magical*",
                "intent": intent,
                "photos": [],
                "generated_image": None,
                "sources": [],
            }, 200
        try:
            links = re.findall(r"https?://[^\s]+", message)
            bundle = db.create_assignment(
                topic=topic[:180],
                scope="Article + Static Post",
                instructions=f"Created from Studio AI Chat request: {message[:400]}",
                links=links,
                language="English",
                db_path=db_path,
            )
            pkg = bundle.get("package") or {}
            pkg_id = int(pkg.get("id") or 0)
            pkg_title = pkg.get("title") or topic

            # If user also mentioned using a recent photo ("and use photo 2" / "with this photo"), attach it automatically!
            attached_note = ""
            if pkg_id and any(k in message.lower() for k in ("with this photo", "use photo", "use this photo", "use this image", "with photo", "use picture")):
                picked = _pick_photo_from_recent(message, recent_media)
                if picked:
                    p_obj, p_lbl = picked
                    a_res, a_code = attach_photo_to_article(pkg_id, p_obj, mode="featured", db_path=db_path, author=author)
                    if a_code == 200:
                        attached_note = f"\n- Also set **{p_lbl}** as its **Featured Photo**."

            return {
                "ok": True,
                "reply": (
                    f"Created your new Studio Article & Social Post!\n"
                    f"- **Title:** {pkg_title}\n"
                    f"- **Article ID:** #{pkg_id} (saved in **Articles & Posts**){attached_note}\n\n"
                    f"Tap **Open Article →** below to review, edit, or push to WordPress."
                ),
                "intent": intent,
                "photos": [],
                "generated_image": None,
                "sources": [],
                "article_action": {
                    "package_id": pkg_id,
                    "title": pkg_title,
                    "label": "Open Article →",
                },
            }, 200
        except Exception as exc:
            return {"ok": False, "error": "CREATE_ARTICLE_FAILED", "message": f"Could not create article: {str(exc)[:140]}"}, 500

    # 3. FIND REAL PHOTOS
    if intent == "find_photos":
        found_photos = _search_real_photos(message, limit=6)
        reply = (
            f"Found **{len(found_photos)} real high-res photos**! Tap **+ Article** on any photo to add it straight to an article, or tell me *\"Add photo 2 to my article\"*."
            if found_photos
            else "I couldn't find matching free stock photos for that exact phrasing — try shorter keywords (e.g. `Helsinki winter snow`) or ask me to **create an AI picture** instead!"
        )
        return {"ok": True, "reply": reply, "intent": intent, "photos": found_photos, "generated_image": None, "sources": []}, 200

    # 4. GENERATE AI IMAGE
    if intent == "generate_image":
        generated_image, gen_err = _generate_ai_image(message)
        if generated_image:
            return {
                "ok": True,
                "reply": f"Here is your editorial AI image for **{generated_image['prompt']}**! Tap **+ Article** to set it as an article photo, or **Download** to save it.",
                "intent": intent,
                "photos": [],
                "generated_image": generated_image,
                "sources": [],
            }, 200
        return {"ok": False, "error": "GEN_FAILED", "message": gen_err or "Could not generate image."}, 503

    # 5. GENERAL CHAT + FACT-CHECK (MULTIMODAL GEMINI)
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
        "- When asked for article outlines, Instagram captions, Reel hooks, emails, or general advice, give clean, ready-to-use output.\n"
        "- Remind Binod naturally if relevant that he can say 'Make an article for this title: ...' or 'Add photo 2 to my article' to save directly to Studio."
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
