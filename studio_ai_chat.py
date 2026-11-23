"""
ILoveFinland Studio — Admin-Only Studio AI Editorial Command Center (v84.0).

Strictly Admin-only (binodoli721@gmail.com). Completely separate from Finnish Learning Lab.
Capabilities inside one unified ChatGPT-style room:
1. Chief Editor Brain: Reads linked article + last 20 Studio articles (Draft vs Published) to give
   concrete Website SEO & Instagram growth advice tailored to ilovefinland.net & @ilovefinland.
2. Direct Draft Updates: Update linked article's headline, excerpt, or Instagram caption directly in Studio.
3. Paste Any News Link -> Expat Angle: Fetches & summarizes Yle/Migri/Kela/Finnish links + 1-tap Turn into Article.
4. Carousel & Reel Script Mode: Turns any linked article into a 5-7 slide Carousel or 20s Reel script.
5. Weekly Growth Planner: Combines your recent Studio articles + live Finland web trends.
6. Live Fact-Checking, Real Photo Search (+ Article), AI Image Generation (+ Article), Create Full Article.
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


def _strip_html(html: str) -> str:
    txt = re.sub(r"<script\b[^>]*>.*?</script>", " ", html or "", flags=re.I | re.S)
    txt = re.sub(r"<style\b[^>]*>.*?</style>", " ", txt, flags=re.I | re.S)
    txt = re.sub(r"<[^>]+>", " ", txt)
    return re.sub(r"\s+", " ", txt).strip()


def _fetch_url_preview(url: str) -> Optional[Dict[str, str]]:
    """Safely fetch a pasted news/reference URL (title + clean text snippet) for expat breakdown."""
    if not url or not re.match(r"^https?://", url, flags=re.I):
        return None
    # Block localhost / private IPs for SSRF safety
    parsed = urllib.parse.urlparse(url)
    host = (parsed.hostname or "").lower()
    if not host or host in ("localhost", "127.0.0.1", "0.0.0.0") or host.startswith(("10.", "192.168.", "172.")):
        return None
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; ILoveFinlandStudio/1.0)",
                "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9",
            },
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw = resp.read(250 * 1024).decode("utf-8", errors="ignore")
        m_title = re.search(r"<title[^>]*>(.*?)</title>", raw, flags=re.I | re.S)
        title = re.sub(r"\s+", " ", m_title.group(1)).strip()[:140] if m_title else host
        body_text = _strip_html(raw)[:2800]
        if len(body_text) < 40:
            return None
        return {"url": url, "title": title, "snippet": body_text}
    except Exception:
        return None


def _load_recent_studio_summary(db_path: str = db.DB_PATH, limit: int = 20) -> str:
    """Compact live snapshot of recent Studio articles so Studio AI knows your real content catalog."""
    try:
        pkgs = _list_recent_packages(db_path=db_path, limit=limit)
    except Exception:
        return "Studio catalog unavailable."
    if not pkgs:
        return "No articles in Studio yet."
    lines = [f"- #{p['id']} [{p['status']}] {p['title']}" for p in pkgs]
    return "\n".join(lines)


def _load_linked_article_context(package_id: Optional[int], db_path: str = db.DB_PATH) -> Optional[Dict[str, Any]]:
    """Load concise context of the currently linked Studio article so Studio AI can read & act on it."""
    if not package_id:
        return None
    try:
        bundle = db.get_package_bundle(int(package_id), db_path=db_path)
        if not bundle:
            return None
        pkg = bundle.get("package") or {}
        versions = bundle.get("versions") or []
        latest = versions[-1] if versions else {}
        art = latest.get("article") or {}
        ig = latest.get("ig_post") or {}
        body_raw = art.get("body_html") or art.get("body") or ""
        return {
            "id": int(pkg.get("id") or package_id),
            "title": pkg.get("title") or art.get("headline") or f"Article #{package_id}",
            "status": pkg.get("article_status") or ("Pushed to WP" if pkg.get("wordpress_post_id") else "Draft"),
            "category": art.get("category") or "",
            "excerpt": (art.get("excerpt") or "")[:350],
            "body_snippet": _strip_html(body_raw)[:1800],
            "ig_caption": (ig.get("caption") or "")[:500],
        }
    except Exception:
        return None


def update_linked_article_field(
    package_id: int,
    field: str,
    value: str,
    db_path: str = db.DB_PATH,
) -> Tuple[Dict[str, Any], int]:
    """Safely update headline, excerpt, or ig_caption on a Studio draft package (never auto-publishes)."""
    clean_val = (value or "").strip()
    if not clean_val:
        return {"ok": False, "message": "New text cannot be empty."}, 400
    field_key = (field or "").strip().lower()
    if field_key not in ("headline", "title", "excerpt", "ig_caption", "caption"):
        return {"ok": False, "message": "Supported fields: headline, excerpt, ig_caption."}, 400

    conn = db.get_connection(db_path)
    try:
        pkg = conn.execute("SELECT * FROM packages WHERE id = ?", (int(package_id),)).fetchone()
        if not pkg:
            return {"ok": False, "message": f"Article #{package_id} not found."}, 404
        cur_ver = pkg["current_version"]
        ver_row = conn.execute(
            "SELECT * FROM package_versions WHERE package_id = ? AND version = ?",
            (int(package_id), cur_ver),
        ).fetchone()
        if not ver_row:
            return {"ok": False, "message": "Article version not found."}, 404

        article = json.loads(ver_row["article_json"])
        ig_post = json.loads(ver_row["ig_post_json"]) if ver_row["ig_post_json"] else {}
        new_pkg_title = pkg["title"]

        if field_key in ("headline", "title"):
            article["headline"] = clean_val[:200]
            new_pkg_title = clean_val[:200]
            label = "Headline"
        elif field_key == "excerpt":
            article["excerpt"] = clean_val[:400]
            label = "Meta Excerpt"
        else:
            ig_post["caption"] = clean_val[:2200]
            label = "Instagram Caption"

        now = db.utc_now_iso()
        conn.execute(
            "UPDATE package_versions SET article_json = ?, ig_post_json = ? WHERE id = ?",
            (json.dumps(article), json.dumps(ig_post), ver_row["id"]),
        )
        conn.execute(
            "UPDATE packages SET title = ?, updated_at = ? WHERE id = ?",
            (new_pkg_title, now, int(package_id)),
        )
        conn.commit()
        return {
            "ok": True,
            "package_id": int(package_id),
            "package_title": new_pkg_title,
            "field_label": label,
            "value": clean_val,
        }, 200
    except Exception as exc:
        return {"ok": False, "message": f"Update failed: {str(exc)[:140]}"}, 500
    finally:
        conn.close()


def _detect_intent(msg: str, has_recent_media: bool = False, has_linked_article: bool = False) -> str:
    low = (msg or "").lower().strip()

    # 1. Direct draft update on linked article
    if any(k in low for k in (
        "update the headline", "change the headline", "set the headline", "use headline",
        "update headline", "save this as the headline", "update the title",
        "update the caption", "save this as the instagram caption", "save this caption",
        "update instagram caption", "set the caption", "use this caption",
        "update the excerpt", "update meta description", "set the excerpt",
    )):
        return "update_article"

    # 2. Create a new Studio article + social post from a title/topic
    if any(k in low for k in (
        "make an article", "make the article", "make article",
        "create an article", "create the article", "create article",
        "write an article for studio", "new article for", "create a story",
        "make a story", "draft an article", "publish an article",
        "article for this title", "article about this", "turn into studio article",
        "turn this into an article",
    )):
        return "create_article"

    # 3. Attach a photo/image to an article
    short_attach = (
        has_recent_media
        and re.match(
            r"^(please\s+)?(add|use|put|set|attach)\s+(photo|picture|image|pic|this one|this photo|this image|number|#?\d)",
            low,
        )
        is not None
    )
    if short_attach or (
        any(k in low for k in (
            "add this to", "add this one to", "add photo", "add picture", "add image",
            "put photo", "put picture", "put this photo", "put this image",
            "use photo", "use picture", "use this photo", "use this image", "use this one",
            "set as featured", "set photo", "attach photo", "attach this",
            "to this article", "to the article", "to my article", "article photo",
        ))
        and any(w in low for w in ("photo", "picture", "image", "this one", "featured"))
        and (has_linked_article or any(w in low for w in ("article", "post", "story", "featured", "#")))
    ):
        return "attach_photo"

    # 4. Generate an AI image
    if any(k in low for k in (
        "create ai picture", "create an ai picture", "create a picture", "create image",
        "generate image", "generate a picture", "generate ai", "make a picture", "make an image",
        "draw ", "create photo", "generate photo", "ai picture for", "ai image for",
        "ai photo for", "create an ai photo",
    )):
        return "generate_image"

    # 5. Find real stock photos
    if any(k in low for k in (
        "find picture", "find me picture", "find photo", "find me photo", "find images",
        "find real photo", "search photo", "search picture", "stock photo", "real photo",
        "picture related to", "photos for", "pictures for", "image for this title",
        "photo for this article", "photos for this article",
    )):
        return "find_photos"

    # 6. Weekly Growth Planner (live Finland trends + content gap analysis)
    if any(k in low for k in (
        "what should i post", "weekly plan", "weekly growth", "content plan",
        "topics this week", "missing this week", "grow website", "grow instagram",
        "what to post this week", "content calendar ideas",
    )):
        return "weekly_plan"

    # 7. Fact-check news
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
        dl_data_url, _ = _download_image_to_data_url(img_url)
        if dl_data_url and dl_data_url.startswith("data:image/"):
            data_url = dl_data_url
        else:
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
            "SELECT id, title, article_status, wordpress_post_id, updated_at FROM packages WHERE COALESCE(is_archived, 0) = 0 ORDER BY updated_at DESC, id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [
            {
                "id": int(r["id"]),
                "title": r["title"],
                "status": "Pushed to WP" if r["wordpress_post_id"] else (r["article_status"] or "Draft"),
            }
            for r in rows
        ]
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

    m_id = re.search(r"(?:#|article\s*#?|post\s*#?|story\s*#?)(\d{1,5})\b", low)
    if m_id:
        target_id = int(m_id.group(1))
        for p in pkgs:
            if p["id"] == target_id:
                return p

    if active_package_id and any(k in low for k in ("this article", "current article", "that article", "this story", "this post")):
        for p in pkgs:
            if p["id"] == int(active_package_id):
                return p

    stop = {
        "add", "put", "use", "set", "attach", "this", "one", "that", "the", "to", "for", "in", "on",
        "my", "article", "post", "story", "photo", "picture", "image", "featured", "as", "please",
        "first", "second", "third", "fourth", "fifth", "sixth", "last", "number", "num", "extra",
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

    if active_package_id:
        for p in pkgs:
            if p["id"] == int(active_package_id):
                return p

    return None


def _pick_photo_from_recent(
    message: str,
    recent_media: Dict[str, Any],
    attachments: Optional[List[Dict[str, Any]]] = None,
) -> Optional[Tuple[Dict[str, Any], str]]:
    low = (message or "").lower()
    photos = recent_media.get("photos") or []
    gen = recent_media.get("generated_image")
    uploaded = recent_media.get("uploaded_image")

    # 0. If user attached an image directly in THIS message, prioritize it!
    for att in attachments or []:
        mime = (att.get("mime_type") or "").lower()
        b64 = att.get("data_base64") or ""
        if mime.startswith("image/") and b64:
            return {
                "data_url": f"data:{mime};base64,{b64}",
                "title": (att.get("name") or "Uploaded Photo")[:80],
                "source": "ILF",
                "photographer": "ILF",
            }, "your uploaded photo"

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
    if uploaded and idx is None:
        return uploaded, "your uploaded photo"
    if gen and (idx is None or "ai" in low or "generated" in low):
        return gen, "your AI image"
    if photos:
        return photos[0], "Photo #1"
    return None


def _extract_article_topic(message: str) -> str:
    cleaned = re.sub(
        r"^\s*(please\s+)?(can you\s+)?(make|create|write|draft|build|generate|turn\s+this\s+into)\s+(me\s+)?(an?|the|new)?\s*(studio\s+)?(article|story|post)\s*(like that\s*)?(for|about|on|titled|with title|title)?\s*(this\s+title)?\s*[:\-–—]?\s*",
        "",
        message.strip(),
        flags=re.I,
    ).strip()
    cleaned = re.sub(r"\s+(and\s+)?(use|with)\s+(photo|picture|image|this photo|this image).*$", "", cleaned, flags=re.I).strip()
    cleaned = cleaned.strip("\"' ")
    return cleaned or message.strip()


def _extract_update_value(message: str, history: List[Dict[str, Any]], field: str) -> Optional[str]:
    """Extract the new headline/excerpt/caption either inline from user's message or from the previous assistant reply."""
    # 1. Explicit inline text after 'to' / ':'
    m_inline = re.search(r"(?:headline|title|caption|excerpt|description)\s*(?:to|:)\s*(.+)$", message, flags=re.I | re.S)
    if m_inline:
        val = m_inline.group(1).strip().strip("\"' ")
        if len(val) >= 4 and not re.match(r"^#?\d+$", val):
            return val

    # 2. Look at the previous assistant message (e.g. "use headline #2" or "save this as the Instagram caption")
    last_ai = ""
    for turn in reversed(history):
        if turn.get("role") in ("assistant", "model") and (turn.get("text") or "").strip():
            last_ai = turn["text"].strip()
            break
    if not last_ai:
        return None

    m_num = re.search(r"(?:#|option\s*|headline\s*)(\d)\b", message, flags=re.I)
    if m_num and field in ("headline", "title"):
        n = m_num.group(1)
        m_item = re.search(rf"(?:^|\n)\s*(?:\*\*)?{n}[\.\)\:]\s*(.+)", last_ai)
        if m_item:
            return re.sub(r"\*+", "", m_item.group(1)).strip().strip("\"' ")

    # Ask Gemini to cleanly extract the exact requested text from the previous reply
    extract_prompt = (
        f"Extract ONLY the exact new {field} text requested by the user ('{message}') from the assistant's previous message below. "
        "Return ONLY the clean text itself with no quotes, no labels, no explanation.\n\n"
        f"Previous assistant message:\n{last_ai[:2200]}"
    )
    extracted, _, _ = _call_studio_gemini(
        contents=[{"role": "user", "parts": [{"text": extract_prompt}]}],
        system_instruction="Return only the extracted text, nothing else.",
        use_search=False,
    )
    if extracted:
        return extracted.strip().strip("\"' ")
    return None


def _search_real_photos(query: str, limit: int = 6) -> List[Dict[str, str]]:
    """Search free high-res real photos via Openverse & Wikimedia Commons (zero API key needed)."""
    clean_q = re.sub(
        r"\b(find|me|pictures?|photos?|images?|related|to|this|title|article|for|about|please|search|stock|real)\b",
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
        r"\b(create|generate|make|an?|ai|picture|image|photo|for|this|title|article|please)\b",
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
    """Unified Admin-only Studio AI Editorial Command Center handler."""
    message = (payload.get("message") or "").strip()
    history = payload.get("history") or []
    attachments = payload.get("attachments") or []
    forced_action = (payload.get("action") or "").strip().lower()
    recent_media = payload.get("recent_media") or {}
    active_pkg_raw = payload.get("active_package_id")
    active_package_id = int(active_pkg_raw) if str(active_pkg_raw or "").isdigit() else None

    if not message and not attachments:
        return {"ok": False, "error": "EMPTY", "message": "Type a message or attach a photo/PDF."}, 400

    linked_article = _load_linked_article_context(active_package_id, db_path=db_path)
    has_att_image = any((a.get("mime_type") or "").lower().startswith("image/") and a.get("data_base64") for a in attachments)
    has_recent_media = bool((recent_media.get("photos") or []) or recent_media.get("generated_image") or recent_media.get("uploaded_image") or has_att_image)
    intent = forced_action or _detect_intent(message, has_recent_media=has_recent_media, has_linked_article=bool(linked_article))

    # 1. DIRECT DRAFT UPDATE (Headline / Excerpt / Instagram Caption)
    if intent == "update_article":
        if not linked_article:
            return {
                "ok": True,
                "reply": "Tap **Link Article** at the bottom first so I know which Studio draft to update!",
                "intent": intent,
                "photos": [],
                "generated_image": None,
                "sources": [],
            }, 200
        low = message.lower()
        if "caption" in low:
            field = "ig_caption"
        elif "excerpt" in low or "meta" in low:
            field = "excerpt"
        else:
            field = "headline"
        new_val = _extract_update_value(message, history, field)
        if not new_val:
            return {
                "ok": True,
                "reply": f"Tell me the exact new {field} text to save (e.g. *Update the headline to: Why Helsinki Winters Feel Magical*).",
                "intent": intent,
                "photos": [],
                "generated_image": None,
                "sources": [],
            }, 200
        res, code = update_linked_article_field(linked_article["id"], field, new_val, db_path=db_path)
        if code != 200:
            return {"ok": False, "error": "UPDATE_FAILED", "message": res.get("message") or "Could not update article."}, code
        return {
            "ok": True,
            "reply": f"Updated **{res['field_label']}** for **#{res['package_id']} {res['package_title']}** (draft saved in Studio — not published yet):\n\n> {res['value']}",
            "intent": intent,
            "photos": [],
            "generated_image": None,
            "sources": [],
            "linked_article": {"id": res["package_id"], "title": res["package_title"]},
            "article_action": {
                "package_id": res["package_id"],
                "title": res["package_title"],
                "label": "Open Article →",
            },
        }, 200

    # 2. ATTACH PHOTO TO ARTICLE
    if intent == "attach_photo":
        picked = _pick_photo_from_recent(message, recent_media, attachments=attachments)
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
            "linked_article": {"id": res["package_id"], "title": res["package_title"]},
            "article_action": {
                "package_id": res["package_id"],
                "title": res["package_title"],
                "label": "Open Article →",
            },
        }, 200

    # 3. CREATE FULL STUDIO ARTICLE + SOCIAL POST
    if intent == "create_article":
        topic = _extract_article_topic(message)
        if len(topic) < 4:
            return {
                "ok": True,
                "reply": "Tell me the title or topic for the article! Example: *Make an article for this title: Why Helsinki Winters Feel Magical*",
                "intent": intent,
                "photos": [],
                "generated_image": None,
                "sources": [],
            }, 200
        try:
            links = re.findall(r"https?://[^\s]+", message)
            extra_notes = (payload.get("extra_instructions") or "").strip()
            instr = f"Created from Studio AI Chat: {message[:400]}"
            if extra_notes:
                instr = f"{instr}\nVerified context:\n{extra_notes[:1200]}"
            bundle = db.create_assignment(
                topic=topic[:180],
                scope="Article + Static Post",
                instructions=instr,
                links=links,
                language="English",
                db_path=db_path,
            )
            pkg = bundle.get("package") or {}
            pkg_id = int(pkg.get("id") or 0)
            pkg_title = pkg.get("title") or topic

            attached_note = ""
            if pkg_id and any(k in message.lower() for k in ("with this photo", "use photo", "use this photo", "use this image", "with photo", "use picture")):
                picked = _pick_photo_from_recent(message, recent_media, attachments=attachments)
                if picked:
                    p_obj, p_lbl = picked
                    _, a_code = attach_photo_to_article(pkg_id, p_obj, mode="featured", db_path=db_path, author=author)
                    if a_code == 200:
                        attached_note = f"\n- Also set **{p_lbl}** as its **Featured Photo**."

            return {
                "ok": True,
                "reply": (
                    f"Created your new Studio Article & Social Post!\n"
                    f"- **Title:** {pkg_title}\n"
                    f"- **Article ID:** #{pkg_id} (linked to this chat & saved in **Articles & Posts**){attached_note}\n\n"
                    f"You can now say *\"Find real photos for this article\"*, *\"Review this article\"*, or tap **Open Article →** below."
                ),
                "intent": intent,
                "photos": [],
                "generated_image": None,
                "sources": [],
                "linked_article": {"id": pkg_id, "title": pkg_title},
                "article_action": {
                    "package_id": pkg_id,
                    "title": pkg_title,
                    "label": "Open Article →",
                },
            }, 200
        except Exception as exc:
            return {"ok": False, "error": "CREATE_ARTICLE_FAILED", "message": f"Could not create article: {str(exc)[:140]}"}, 500

    # 4. FIND REAL PHOTOS
    if intent == "find_photos":
        query_for_search = message
        if linked_article and any(k in message.lower() for k in ("this article", "this story", "this post", "my article")) and len(message.split()) <= 10:
            query_for_search = linked_article["title"]
        found_photos = _search_real_photos(query_for_search, limit=6)
        hint_target = f" for **{linked_article['title']}**" if linked_article and query_for_search == linked_article["title"] else ""
        reply = (
            f"Found **{len(found_photos)} real high-res photos**{hint_target}! Tap **+ Article** on any photo, or say *\"Add photo 2\"*."
            if found_photos
            else "I couldn't find matching free stock photos for that exact phrasing — try shorter keywords (e.g. `Helsinki winter snow`) or ask me to **create an AI picture** instead!"
        )
        return {"ok": True, "reply": reply, "intent": intent, "photos": found_photos, "generated_image": None, "sources": []}, 200

    # 5. GENERATE AI IMAGE
    if intent == "generate_image":
        gen_prompt = message
        if linked_article and any(k in message.lower() for k in ("this article", "this story", "this post", "my article")) and len(message.split()) <= 12:
            gen_prompt = linked_article["title"]
        generated_image, gen_err = _generate_ai_image(gen_prompt)
        if generated_image:
            return {
                "ok": True,
                "reply": f"Here is your editorial AI image for **{generated_image['prompt']}**! Tap **+ Article** or say *\"Use this photo\"* to set it as your article photo.",
                "intent": intent,
                "photos": [],
                "generated_image": generated_image,
                "sources": [],
            }, 200
        return {"ok": False, "error": "GEN_FAILED", "message": gen_err or "Could not generate image."}, 503

    # 6. CHIEF EDITOR / GROWTH / URL BREAKDOWN / FACT-CHECK / CAROUSEL & REEL (GEMINI)
    contents: List[Dict[str, Any]] = []
    for turn in history[-12:]:
        role = "model" if turn.get("role") in ("assistant", "model") else "user"
        t_text = (turn.get("text") or "").strip()
        if t_text:
            contents.append({"role": role, "parts": [{"text": t_text}]})

    # If user pasted a news/reference URL, fetch its clean text so Studio AI can break it down for expats!
    pasted_urls = re.findall(r"https?://[^\s<>\"']+", message)
    url_context_block = ""
    fetched_url_title = ""
    if pasted_urls:
        preview = _fetch_url_preview(pasted_urls[0])
        if preview:
            fetched_url_title = preview["title"]
            url_context_block = (
                f"\n\n[FETCHED CONTENT FROM PASTED LINK: {preview['url']}]\n"
                f"Page Title: {preview['title']}\n"
                f"Content Snippet: {preview['snippet']}\n"
                "Summarize the key facts clearly for expats/students/travelers in Finland, and suggest a fresh original ilovefinland.net article headline + Instagram hook."
            )

    cur_parts, val_err = finnish_lab_engine._validate_and_build_parts(message + url_context_block, attachments)
    if val_err:
        return {"ok": False, "error": "INVALID_INPUT", "message": val_err}, 400
    contents.append({"role": "user", "parts": cur_parts})

    recent_catalog = _load_recent_studio_summary(db_path=db_path, limit=20)
    linked_block = ""
    if linked_article:
        linked_block = (
            f"\n\nCURRENTLY LINKED STUDIO ARTICLE (#{linked_article['id']}):\n"
            f"- Title: {linked_article['title']}\n"
            f"- Status: {linked_article['status']}\n"
            f"- Category: {linked_article['category']}\n"
            f"- Excerpt: {linked_article['excerpt']}\n"
            f"- Body snippet: {linked_article['body_snippet']}\n"
            f"- IG Caption: {linked_article['ig_caption']}\n"
            "When Binod asks to review, improve, score, or repurpose 'this article', analyze THIS exact draft."
        )

    sys_prompt = (
        "You are Binod's Chief Editor & Growth Strategist inside ILoveFinland Studio, helping grow:\n"
        "1. Website: ilovefinland.net (Google SEO, high-CTR headlines, helpful Finland expat/student/travel guides, affiliate monetization with tours/hotels/eSIM).\n"
        "2. Instagram: @ilovefinland (scroll-stopping 3-second hooks, saveable Carousels, 20s Reels, shareable Finland news & culture).\n\n"
        "RULES:\n"
        "- Be sharp, honest, practical, and concise — zero generic fluff.\n"
        "- When reviewing an article: give a **Website SEO Score (/10)** and **Instagram Potential Score (/10)**, top 3 concrete fixes, 3 stronger numbered headline options (1., 2., 3.), and a monetization tip. Remind Binod he can say 'Use headline #2' or 'Save this as the Instagram caption' to update his draft directly.\n"
        "- When asked for a Carousel or Reel: write exact short punchy text per slide (Slide 1..6) OR a 20s Reel script (Hook / Visuals / Voiceover / Caption + CTA).\n"
        "- When asked for a weekly plan or what to post: check Binod's recent Studio articles below so you don't repeat them, and suggest 5 high-impact ideas mixing fast-share Finland news (IG growth) + evergreen SEO guides (website + affiliate revenue).\n"
        "- When fact-checking news: give a clear verdict (**✅ True**, **⚠️ Partly True / Unverified**, or **❌ False**) using official sources (Yle, Migri, Traficom, Kela, FMI, Reuters).\n\n"
        f"BINOD'S RECENT STUDIO ARTICLES (Last 20):\n{recent_catalog}"
        + linked_block
    )

    use_search = intent in ("fact_check", "weekly_plan")
    text_out, sources, err = _call_studio_gemini(
        contents=contents,
        system_instruction=sys_prompt,
        use_search=use_search,
    )
    if err or not text_out:
        return {"ok": False, "error": "AI_ERROR", "message": err or "AI could not respond right now."}, 503

    turn_into_article_topic = None
    if intent == "fact_check" and "❌ false" not in text_out.lower()[:120]:
        clean_t = re.sub(r"\b(is this news true|is this true|fact[- ]?check|verify this|check this news|please)\b[:?\s]*", "", message, flags=re.I).strip(" ?.")
        turn_into_article_topic = (clean_t or message)[:110]
    elif fetched_url_title:
        turn_into_article_topic = fetched_url_title[:110]

    return {
        "ok": True,
        "reply": text_out,
        "intent": intent,
        "photos": [],
        "generated_image": None,
        "sources": sources,
        "turn_into_article_topic": turn_into_article_topic,
    }, 200
