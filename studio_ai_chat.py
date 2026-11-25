"""
ILoveFinland Studio — Admin-Only Studio AI Editorial Partner (v87.0).

Strictly Admin-only (binodoli721@gmail.com). Completely separate from Finnish Learning Lab.
Capabilities:
1. Auto-detects pasted article titles (or #ID) in ANY message — automatically loads & links that draft.
2. Natural conversational AI Router (no rigid commands — talk casually by text or Mic).
3. Full AI-Written Articles + IG Cover Text (Line 1/2) + IG Caption saved straight to Articles & Posts.
4. Direct Draft Editing ("change this and that"): updates Headline, Excerpt/Meta, Article Body, IG Cover Text, or IG Caption.
5. Smart Online Photo Finder (AI visual keyword translation + filters out old text scans/drawings) + 1-tap "+ Article".
6. AI Image Generation, Live Fact-Checking, Pasted News URL Breakdown, Weekly Growth Planner, and Studio Stats awareness.
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


def _parse_json_object(raw: str) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    txt = raw.strip()
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", txt, flags=re.S | re.I)
    if m:
        txt = m.group(1)
    else:
        s = txt.find("{")
        e = txt.rfind("}")
        if s != -1 and e > s:
            txt = txt[s : e + 1]
    try:
        obj = json.loads(txt)
        return obj if isinstance(obj, dict) else None
    except Exception:
        return None


def _fetch_url_preview(url: str) -> Optional[Dict[str, str]]:
    """Safely fetch a pasted news/reference URL (title + clean text snippet) for expat breakdown."""
    if not url or not re.match(r"^https?://", url, flags=re.I):
        return None
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


def _list_recent_packages(db_path: str = db.DB_PATH, limit: int = 80) -> List[Dict[str, Any]]:
    conn = db.get_connection(db_path)
    try:
        rows = conn.execute(
            "SELECT id, title, article_status, wordpress_post_id, updated_at FROM packages WHERE COALESCE(is_archived, 0) = 0 ORDER BY updated_at DESC, id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [
            {
                "id": int(r["id"]),
                "title": r["title"] or "",
                "status": "Pushed to WP" if r["wordpress_post_id"] else (r["article_status"] or "Draft"),
            }
            for r in rows
        ]
    finally:
        conn.close()


def _load_recent_studio_summary(db_path: str = db.DB_PATH, limit: int = 20) -> str:
    """Compact live snapshot of Studio stats & recent articles."""
    try:
        all_pkgs = _list_recent_packages(db_path=db_path, limit=200)
    except Exception:
        return "Studio catalog unavailable."
    if not all_pkgs:
        return "No articles in Studio yet."
    total = len(all_pkgs)
    pushed = sum(1 for p in all_pkgs if p["status"] == "Pushed to WP")
    drafts = total - pushed
    lines = [f"Studio Stats: {total} active articles ({pushed} Pushed to WordPress, {drafts} Drafts/Review). Recent {min(limit, total)}:"]
    for p in all_pkgs[:limit]:
        lines.append(f"- #{p['id']} [{p['status']}] {p['title']}")
    return "\n".join(lines)


def _auto_detect_mentioned_article(message: str, db_path: str = db.DB_PATH) -> Optional[Dict[str, Any]]:
    """
    If Binod pastes an article title (or #ID) directly into chat without clicking 'Link Article',
    automatically match it against his Studio articles!
    """
    msg = (message or "").strip()
    if len(msg) < 3:
        return None
    try:
        pkgs = _list_recent_packages(db_path=db_path, limit=150)
    except Exception:
        return None
    if not pkgs:
        return None

    low = msg.lower()
    # 1. Explicit #ID (e.g. "#179" or "article 179")
    m_id = re.search(r"(?:#|article\s*#?|post\s*#?|story\s*#?)(\d{1,5})\b", low)
    if m_id:
        tid = int(m_id.group(1))
        for p in pkgs:
            if p["id"] == tid:
                return p

    # 2. Direct substring match of any existing article title (normalized)
    norm_msg = re.sub(r"[^a-z0-9äöå]+", " ", low).strip()
    for p in pkgs:
        t = (p["title"] or "").strip()
        norm_t = re.sub(r"[^a-z0-9äöå]+", " ", t.lower()).strip()
        if len(norm_t) >= 12 and norm_t in norm_msg:
            return p

    # 3. High word-overlap match (e.g. user pasted most of a title or slightly trimmed it)
    stop = {
        "the", "and", "for", "with", "this", "that", "from", "into", "about", "what", "how", "why",
        "change", "check", "update", "make", "edit", "write", "article", "post", "caption", "headline",
        "title", "please", "can", "you", "better", "more", "shorter", "longer", "photo", "image",
    }
    msg_words = {w for w in norm_msg.split() if len(w) >= 3 and w not in stop}
    if len(msg_words) >= 3:
        best = None
        best_ratio = 0.0
        best_hits = 0
        for p in pkgs:
            norm_t = re.sub(r"[^a-z0-9äöå]+", " ", (p["title"] or "").lower()).strip()
            t_words = {w for w in norm_t.split() if len(w) >= 3 and w not in stop}
            if len(t_words) < 2:
                continue
            hits = len(msg_words & t_words)
            ratio = hits / len(t_words)
            if (hits >= 4 or (hits >= 3 and ratio >= 0.42)) and (hits > best_hits or (hits == best_hits and ratio > best_ratio)):
                best_ratio = ratio
                best_hits = hits
                best = p
        if best:
            return best
    return None


def _load_linked_article_context(package_id: Optional[int], db_path: str = db.DB_PATH) -> Optional[Dict[str, Any]]:
    """Load full editorial context of a Studio article so Studio AI can review or edit it accurately."""
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
        body_raw = art.get("body_html") or ""
        if not body_raw and art.get("body_paragraphs"):
            body_raw = "\n\n".join(str(p) for p in art["body_paragraphs"])
        return {
            "id": int(pkg.get("id") or package_id),
            "title": pkg.get("title") or art.get("headline") or f"Article #{package_id}",
            "status": "Pushed to WP" if pkg.get("wordpress_post_id") else (pkg.get("article_status") or "Draft"),
            "category": art.get("category") or "",
            "section": art.get("section") or "",
            "excerpt": (art.get("short_description") or art.get("meta_description") or "")[:400],
            "body_html": body_raw[:4500],
            "body_snippet": _strip_html(body_raw)[:2200],
            "ig_caption": (ig.get("caption") or "")[:900],
            "ig_cover_line1": ig.get("headline_line1") or ig.get("headline") or "",
            "ig_cover_line2": ig.get("headline_line2") or "",
            "tags": art.get("tags") or [],
        }
    except Exception:
        return None


def update_linked_article_fields(
    package_id: int,
    updates: Dict[str, Any],
    db_path: str = db.DB_PATH,
) -> Tuple[Dict[str, Any], int]:
    """
    Safely apply one or more editorial updates (headline, excerpt, body_html, ig_caption, ig_cover_line1, ig_cover_line2, hashtags)
    directly to a Studio draft package (never auto-publishes to WordPress).
    """
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
        changed_labels: List[str] = []

        if updates.get("headline"):
            h = str(updates["headline"]).strip()[:200]
            article["headline"] = h
            article["seo_title"] = h
            new_pkg_title = h
            changed_labels.append("Headline")

        if updates.get("excerpt"):
            ex = str(updates["excerpt"]).strip()[:400]
            article["short_description"] = ex
            article["meta_description"] = ex
            changed_labels.append("Meta/Excerpt")

        if updates.get("body_html"):
            bh = str(updates["body_html"]).strip()
            article["body_html"] = bh
            # Also keep body_paragraphs synced cleanly
            paras = [re.sub(r"<[^>]+>", "", p).strip() for p in re.findall(r"<p[^>]*>(.*?)</p>", bh, flags=re.I | re.S)]
            if paras:
                article["body_paragraphs"] = [p for p in paras if p]
            changed_labels.append("Article Body")

        if updates.get("ig_caption"):
            ig_post["caption"] = str(updates["ig_caption"]).strip()[:2200]
            changed_labels.append("Instagram Caption")

        if updates.get("ig_cover_line1"):
            l1 = str(updates["ig_cover_line1"]).strip()[:90]
            ig_post["headline_line1"] = l1
            ig_post["headline"] = l1
            ig_post["slide_title"] = l1
            changed_labels.append("Post Cover Text")

        if updates.get("ig_cover_line2"):
            l2 = str(updates["ig_cover_line2"]).strip()[:120]
            ig_post["headline_line2"] = l2
            ig_post["slide_body"] = l2
            if "Post Cover Text" not in changed_labels:
                changed_labels.append("Post Cover Text")

        if updates.get("hashtags") and isinstance(updates["hashtags"], list):
            ig_post["hashtags"] = [str(x).strip() for x in updates["hashtags"][:12] if str(x).strip()]

        if updates.get("tags") and isinstance(updates["tags"], list):
            article["tags"] = [str(x).strip() for x in updates["tags"][:10] if str(x).strip()]

        if not changed_labels:
            return {"ok": False, "message": "No valid changes to save."}, 400

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
            "changed_labels": changed_labels,
        }, 200
    except Exception as exc:
        return {"ok": False, "message": f"Update failed: {str(exc)[:140]}"}, 500
    finally:
        conn.close()


def update_linked_article_field(
    package_id: int,
    field: str,
    value: str,
    db_path: str = db.DB_PATH,
) -> Tuple[Dict[str, Any], int]:
    """Backwards-compatible single-field wrapper."""
    fk = (field or "").strip().lower()
    mapping = {
        "headline": "headline",
        "title": "headline",
        "excerpt": "excerpt",
        "meta": "excerpt",
        "body": "body_html",
        "body_html": "body_html",
        "ig_caption": "ig_caption",
        "caption": "ig_caption",
        "ig_cover": "ig_cover_line1",
    }
    key = mapping.get(fk)
    if not key:
        return {"ok": False, "message": "Unsupported field."}, 400
    res, code = update_linked_article_fields(package_id, {key: value}, db_path=db_path)
    if code == 200:
        res["field_label"] = ", ".join(res.get("changed_labels") or [fk])
        res["value"] = value
    return res, code


def _fallback_detect_intent(msg: str, has_recent_media: bool = False, has_linked_article: bool = False) -> Dict[str, Any]:
    low = (msg or "").lower().strip()
    if any(k in low for k in ("update the headline", "change the headline", "use headline", "save this as the instagram caption", "save this caption", "update the caption", "change the body", "rewrite this article", "update this article", "save this to the post")):
        return {"action": "update_article"}
    if any(k in low for k in ("make an article", "make the article", "create an article", "create the article", "write an article", "save it in articles", "save this as an article", "turn into studio article", "turn this into an article", "article for this title")):
        return {"action": "create_article"}
    if (has_recent_media and re.match(r"^(please\s+)?(add|use|put|set|attach)\s+(photo|picture|image|pic|this one|this photo|this image|number|#?\d)", low)) or (
        any(k in low for k in ("add photo", "use photo", "use this image", "use this photo", "set as featured", "attach photo", "to this article"))
        and any(w in low for w in ("photo", "picture", "image", "this one", "featured"))
    ):
        return {"action": "attach_photo"}
    if any(k in low for k in ("create ai picture", "create an ai picture", "generate image", "generate a picture", "ai image for", "ai picture for", "create an ai photo")):
        return {"action": "generate_image"}
    if any(k in low for k in ("find picture", "find me picture", "find photo", "find me photo", "find images", "find real photo", "search photo", "stock photo", "photos for", "pictures for")):
        return {"action": "find_photos"}
    if any(k in low for k in ("what should i post", "weekly plan", "weekly growth", "content plan", "topics this week")):
        return {"action": "weekly_plan"}
    if any(k in low for k in ("is this true", "is this news true", "fact check", "fact-check", "verify this", "check this news", "is it true")):
        return {"action": "fact_check"}
    return {"action": "chat"}


def _route_studio_intent(
    message: str,
    history: List[Dict[str, Any]],
    linked_article: Optional[Dict[str, Any]],
    has_recent_media: bool,
) -> Dict[str, Any]:
    """
    Fast LLM natural-language router so Binod can talk casually (just like talking to a human partner!)
    and Studio AI automatically picks the right tool + clean visual photo keywords.
    """
    recent_turns = "\n".join(
        f"{t.get('role', 'user')}: {(t.get('text') or '')[:220]}"
        for t in history[-4:]
        if (t.get("text") or "").strip()
    )
    linked_info = f"#{linked_article['id']} '{linked_article['title']}'" if linked_article else "None"

    router_prompt = (
        "You are the intent router for Binod's ILoveFinland Studio AI editorial assistant.\n"
        "Classify the user's latest message into ONE action JSON object. Be smart about casual speech, typos, and follow-ups.\n\n"
        "ACTIONS:\n"
        '- "create_article": User wants to write/create/save a NEW article into Articles & Posts (e.g. "write an article about X", "save this as an article", "make an article for this title").\n'
        '- "update_article": User wants to CHANGE/EDIT/UPDATE/SAVE edits directly onto an existing/linked article (headline, body, excerpt, IG cover text, or IG caption — e.g. "change the headline to...", "make the intro shorter and update it", "use headline #2", "save this caption to the post").\n'
        '- "attach_photo": User wants to put/use/attach a recent or uploaded photo onto an article.\n'
        '- "find_photos": User wants to find/search real photos online.\n'
        '- "generate_image": User wants to generate/create a new AI image.\n'
        '- "fact_check": User wants to verify if a news item/claim is true or check latest Finland news.\n'
        '- "weekly_plan": User wants content/posting strategy for the week or ideas to grow website & Instagram.\n'
        '- "chat": Normal conversation, reviewing/auditing an article, brainstorming, writing draft captions/carousels/hooks WITHOUT asking to overwrite/save yet, or breaking down a pasted link.\n\n'
        f"Context:\n- Linked article: {linked_info}\n- Has recent/uploaded photo in chat: {has_recent_media}\n"
        f"- Recent turns:\n{recent_turns or '(none)'}\n\n"
        f"Latest user message: {message}\n\n"
        "Return ONLY valid JSON:\n"
        '{"action":"...","topic":"clean article topic if create_article else empty","search_query":"2 to 5 clean visual photography keywords in English if find_photos or generate_image (e.g. \'Helsinki winter snowy tram\'), never include news questions or phone numbers","want_attach_photo":false}'
    )
    raw, _, _ = _call_studio_gemini(
        contents=[{"role": "user", "parts": [{"text": router_prompt}]}],
        system_instruction="Output ONLY compact valid JSON with no markdown or commentary.",
        use_search=False,
        max_tokens=220,
        temperature=0.1,
    )
    parsed = _parse_json_object(raw or "")
    if parsed and parsed.get("action") in (
        "chat", "fact_check", "weekly_plan", "find_photos", "generate_image",
        "create_article", "update_article", "attach_photo",
    ):
        return parsed
    return _fallback_detect_intent(message, has_recent_media=has_recent_media, has_linked_article=bool(linked_article))


def _download_image_to_data_url(image_url: str) -> Tuple[Optional[str], Optional[str]]:
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


def _collect_all_uploaded_photos(
    recent_media: Dict[str, Any],
    attachments: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Return all uploaded images from the current message (preferred) or the latest user upload turn."""
    cur_imgs: List[Dict[str, Any]] = []
    for att in attachments or []:
        mime = (att.get("mime_type") or "").lower()
        b64 = att.get("data_base64") or ""
        if mime.startswith("image/") and b64:
            cur_imgs.append({
                "data_url": f"data:{mime};base64,{b64}",
                "title": (att.get("name") or "Uploaded Photo")[:80],
                "source": "ILF",
                "photographer": "ILF",
            })
    if cur_imgs:
        return cur_imgs
    up_list = recent_media.get("uploaded_images") or []
    if up_list:
        return up_list
    if recent_media.get("uploaded_image"):
        return [recent_media["uploaded_image"]]
    return []


def _pick_photo_from_recent(
    message: str,
    recent_media: Dict[str, Any],
    attachments: Optional[List[Dict[str, Any]]] = None,
) -> Optional[Tuple[Dict[str, Any], str]]:
    low = (message or "").lower()
    photos = recent_media.get("photos") or []
    gen = recent_media.get("generated_image")
    uploaded_list = _collect_all_uploaded_photos(recent_media, attachments=attachments)

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
    if idx is None and "last" in low:
        if uploaded_list and not photos:
            idx = len(uploaded_list)
        elif photos:
            idx = len(photos)

    # If user attached photos in THIS message, prioritize them (supporting #1..#6!)
    cur_has_upload = any((a.get("mime_type") or "").lower().startswith("image/") and a.get("data_base64") for a in (attachments or []))
    if cur_has_upload and uploaded_list:
        if idx is not None and 1 <= idx <= len(uploaded_list):
            return uploaded_list[idx - 1], f"Uploaded Photo #{idx}"
        return uploaded_list[0], "your uploaded photo"

    if idx is not None and 1 <= idx <= len(photos):
        return photos[idx - 1], f"Photo #{idx}"
    if idx is not None and 1 <= idx <= len(uploaded_list):
        return uploaded_list[idx - 1], f"Uploaded Photo #{idx}"
    if uploaded_list and idx is None:
        return uploaded_list[0], "your uploaded photo"
    if gen and (idx is None or "ai" in low or "generated" in low):
        return gen, "your AI image"
    if photos:
        return photos[0], "Photo #1"
    return None


def _is_junk_scan(title: str, url: str) -> bool:
    """Filter out old archival scans, PDFs, book pages, maps, and diagrams so photo results stay photographic."""
    comb = f"{title} {url}".lower()
    if any(comb.endswith(ext) for ext in (".svg", ".pdf", ".tif", ".tiff", ".gif")):
        return True
    bad_words = ("manuscript", "letter", "handwriting", "scan", "page_", "djvu", "diagram", "chart", "engraving", "newspaper", "book_page", "coat_of_arms", "logo")
    return any(b in comb for b in bad_words)


def _search_real_photos(query: str, limit: int = 6) -> List[Dict[str, str]]:
    """Search clean high-res photography via Openverse & Wikimedia Commons (filtered for real photos)."""
    clean_q = re.sub(
        r"\b(find|me|pictures?|photos?|images?|related|to|this|title|article|for|about|please|search|stock|real|online)\b",
        " ",
        query,
        flags=re.I,
    )
    clean_q = re.sub(r"\s+", " ", clean_q).strip()[:80] or "Finland landscape"
    results: List[Dict[str, str]] = []

    try:
        url = f"https://api.openverse.org/v1/images/?q={urllib.parse.quote(clean_q)}&category=photograph&page_size={limit + 4}"
        req = urllib.request.Request(url, headers={"User-Agent": "ILoveFinlandStudio/1.0", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        for it in data.get("results") or []:
            img_url = it.get("url") or it.get("thumbnail")
            thumb = it.get("thumbnail") or img_url
            title = (it.get("title") or clean_q)[:64]
            if img_url and img_url.startswith("http") and not _is_junk_scan(title, img_url):
                results.append({
                    "url": img_url,
                    "thumb": thumb,
                    "title": title,
                    "source": it.get("source") or "Openverse",
                    "creator": (it.get("creator") or "")[:40],
                })
    except Exception:
        pass

    if len(results) < 4:
        try:
            url = (
                "https://commons.wikimedia.org/w/api.php?action=query&generator=search"
                f"&gsrsearch={urllib.parse.quote(clean_q + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit={limit + 4}"
                "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json"
            )
            req = urllib.request.Request(url, headers={"User-Agent": "ILoveFinlandStudio/1.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            pages = (data.get("query") or {}).get("pages") or {}
            for p in pages.values():
                info = (p.get("imageinfo") or [{}])[0]
                u = info.get("thumburl") or info.get("url")
                full_u = info.get("url") or u
                title = (p.get("title") or clean_q).replace("File:", "")[:64]
                if u and u.startswith("http") and not _is_junk_scan(title, full_u or u):
                    results.append({
                        "url": full_u,
                        "thumb": u,
                        "title": title,
                        "source": "Wikimedia Commons",
                        "creator": "",
                    })
        except Exception:
            pass

    return results[:limit]


def _generate_ai_image(prompt_text: str) -> Tuple[Optional[Dict[str, str]], Optional[str]]:
    import random
    import uuid as _uuid

    clean_prompt = re.sub(
        r"\b(create|generate|make|regenerate|another|an?|ai|picture|image|photo|for|this|title|article|please)\b",
        " ",
        prompt_text,
        flags=re.I,
    )
    subject = re.sub(r"\s+", " ", clean_prompt).strip() or prompt_text.strip()

    # Step 1: Use Gemini ($0 free tier) as an Editorial Art Director for a vivid, realistic photography prompt
    editorial_prompt = (
        f"Authentic editorial DSLR photograph of {subject}, Nordic natural lighting, "
        "sharp 35mm f/2.0 lens, lifelike textures, magazine quality, zero text, zero watermark, no logos"
    )
    try:
        dir_prompt, _, _ = _call_studio_gemini(
            contents=[{
                "role": "user",
                "parts": [{
                    "text": (
                        f"Write ONE concise photorealistic editorial photography prompt (max 38 words) for: {subject}. "
                        "Describe subject, camera framing, Nordic natural lighting, realistic colors, and atmosphere. "
                        "Include 'no text, no watermarks'. Return ONLY the prompt sentence."
                    )
                }],
            }],
            system_instruction="You are an award-winning Nordic magazine photo director. Output ONLY a single clean image generation prompt.",
            use_search=False,
            max_tokens=120,
            temperature=0.55,
        )
        if dir_prompt and len(dir_prompt.strip()) > 15:
            cleaned_dir = dir_prompt.strip().strip('"').strip("'").replace("\n", " ")
            editorial_prompt = cleaned_dir[:320]
    except Exception:
        pass

    uploads_dir = db.resolve_uploads_dir()

    def _save_image_bytes(img_bytes: bytes, ext: str = "jpg") -> Optional[str]:
        try:
            if not img_bytes or len(img_bytes) < 2500:
                return None
            fname = f"ai_gen_{_uuid.uuid4().hex[:10]}.{ext}"
            fpath = uploads_dir / fname
            fpath.write_bytes(img_bytes)
            return f"/assets/uploads/{fname}"
        except Exception:
            return None

    # Step 2: Try Gemini native image generation models first ($0 free tier when enabled)
    key = _get_gemini_key()
    if key:
        for model in ("models/gemini-2.5-flash-image-preview", "models/gemini-2.5-flash-image", "models/gemini-2.0-flash-exp-image-generation"):
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
                            ext = "png" if "png" in mime else "jpg"
                            raw_bytes = base64.b64decode(inl["data"])
                            local_url = _save_image_bytes(raw_bytes, ext=ext)
                            final_url = local_url or f"data:{mime};base64,{inl['data']}"
                            return {"url": final_url, "prompt": subject, "provider": "Gemini Image (Editorial)"}, None
            except Exception:
                continue

    # Step 3: High-Quality Flux Photorealistic Engine ($0 free) + server-side caching into /assets/uploads/
    seed = random.randint(1000, 999999)
    encoded = urllib.parse.quote(editorial_prompt[:320])
    flux_url = f"https://image.pollinations.ai/prompt/{encoded}?model=flux&width=1080&height=1350&enhance=true&nologo=true&seed={seed}"
    try:
        req = urllib.request.Request(flux_url, headers={"User-Agent": "ILoveFinlandStudio/1.0"})
        with urllib.request.urlopen(req, timeout=32) as resp:
            ctype = (resp.headers.get("Content-Type") or "").lower()
            img_bytes = resp.read()
        if "image" in ctype or len(img_bytes) > 8000:
            ext = "png" if "png" in ctype else "jpg"
            local_url = _save_image_bytes(img_bytes, ext=ext)
            if local_url:
                return {"url": local_url, "prompt": subject, "provider": "Flux Editorial AI"}, None
    except Exception:
        pass

    return {"url": flux_url, "prompt": subject, "provider": "Flux Editorial AI"}, None


def _call_studio_gemini(
    contents: List[Dict[str, Any]],
    system_instruction: str,
    use_search: bool = False,
    max_tokens: int = 2400,
    temperature: float = 0.45,
) -> Tuple[Optional[str], List[Dict[str, str]], Optional[str]]:
    key = _get_gemini_key()
    if not key:
        return None, [], "GEMINI_API_KEY is not configured on the server."

    discovery = finnish_lab_engine.discover_gemini_models()
    models_to_try: List[str] = ["models/gemini-3.8-flash", "models/gemini-3.5-flash-lite"]
    if discovery.get("selected_model") and discovery["selected_model"] not in models_to_try:
        models_to_try.append(discovery["selected_model"])
    for fb in discovery.get("fallback_models", []):
        if fb not in models_to_try:
            models_to_try.append(fb)
    for extra in ("models/gemini-flash-latest", "models/gemini-2.5-flash", "models/gemini-2.0-flash"):
        if extra not in models_to_try:
            models_to_try.append(extra)

    last_err = "Could not reach Gemini."
    for model_id in models_to_try[:5]:
        url = f"https://generativelanguage.googleapis.com/v1beta/{model_id}:generateContent?key={key}"
        req_body: Dict[str, Any] = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
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
            with urllib.request.urlopen(req, timeout=30) as resp:
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
                return _call_studio_gemini(contents, system_instruction, use_search=False, max_tokens=max_tokens, temperature=temperature)
            last_err = f"HTTP {he.code}"
        except Exception as exc:
            last_err = str(exc).replace(key, "***")[:120]

    return None, [], last_err


def _write_and_save_ai_article(
    topic: str,
    message: str,
    history: List[Dict[str, Any]],
    extra_notes: str,
    recent_media: Dict[str, Any],
    attachments: List[Dict[str, Any]],
    db_path: str,
    author: str,
) -> Tuple[Dict[str, Any], int]:
    """Use Gemini + Live Search to write a rich WordPress article + IG Cover Text & Caption and save it to Articles & Posts."""
    chat_context = "\n".join(
        f"{t.get('role', 'user')}: {(t.get('text') or '')[:500]}"
        for t in history[-6:]
        if (t.get("text") or "").strip()
    )
    write_prompt = (
        f"Write a complete, publish-ready editorial package for ilovefinland.net and @ilovefinland Instagram.\n"
        f"Topic / Request: {topic or message}\n"
        f"User's exact request: {message}\n"
        f"Recent conversation context:\n{chat_context or '(none)'}\n"
        f"Extra verified notes:\n{extra_notes[:1200] or '(none)'}\n\n"
        "Return ONLY valid JSON with these exact keys:\n"
        "{\n"
        '  "headline": "High-CTR SEO headline for ilovefinland.net (max 85 chars)",\n'
        '  "excerpt": "Compelling 140-char Google meta description",\n'
        '  "body_html": "Clean WordPress HTML using <p>, <h2>, <h3>, <ul><li> (450-700 words, factual, helpful for expats/students/travelers in Finland, zero fluff)",\n'
        '  "ig_cover_line1": "3-6 punchy words for the Instagram 4:5 cover graphic",\n'
        '  "ig_cover_line2": "Short 6-11 word subtitle for the graphic",\n'
        '  "ig_caption": "Scroll-stopping Instagram/Facebook caption with short hook, 3 crisp bullet takeaways, question CTA for comments/saves, and 5-8 Finland hashtags",\n'
        '  "tags": ["Finland", "Helsinki", "..."]\n'
        "}"
    )
    raw, sources, _ = _call_studio_gemini(
        contents=[{"role": "user", "parts": [{"text": write_prompt}]}],
        system_instruction="You are the Chief Editor of ilovefinland.net. Write crisp, accurate, engaging journalism for expats and travelers in Finland. Output ONLY valid JSON.",
        use_search=True,
        max_tokens=3000,
        temperature=0.4,
    )
    ai_pkg = _parse_json_object(raw or "")

    final_title = (ai_pkg.get("headline") if ai_pkg else "") or topic or message[:100]
    links = re.findall(r"https?://[^\s]+", message)
    bundle = db.create_assignment(
        topic=final_title[:180],
        scope="Article + Static Post",
        instructions=f"AI-authored from Studio AI Chat: {message[:400]}",
        links=links,
        language="English",
        db_path=db_path,
    )
    pkg = bundle.get("package") or {}
    pkg_id = int(pkg.get("id") or 0)
    pkg_title = pkg.get("title") or final_title

    # Overwrite template body/social with Gemini's rich editorial package!
    if pkg_id and ai_pkg:
        update_linked_article_fields(
            pkg_id,
            {
                "headline": ai_pkg.get("headline"),
                "excerpt": ai_pkg.get("excerpt"),
                "body_html": ai_pkg.get("body_html"),
                "ig_cover_line1": ai_pkg.get("ig_cover_line1"),
                "ig_cover_line2": ai_pkg.get("ig_cover_line2"),
                "ig_caption": ai_pkg.get("ig_caption"),
                "tags": ai_pkg.get("tags"),
            },
            db_path=db_path,
        )
        pkg_title = ai_pkg.get("headline") or pkg_title

    # Auto-attach ALL uploaded photos (1st = Featured, 2nd..6th = Extra Photos) or the picked photo!
    attached_note = ""
    all_uploaded = _collect_all_uploaded_photos(recent_media, attachments=attachments)
    if pkg_id and len(all_uploaded) > 1:
        ok_count = 0
        for i, up_img in enumerate(all_uploaded[:6]):
            m_mode = "featured" if i == 0 else "additional"
            _, a_code = attach_photo_to_article(pkg_id, up_img, mode=m_mode, db_path=db_path, author=author)
            if a_code == 200:
                ok_count += 1
        if ok_count:
            attached_note = f"\n- **Photos:** Set Photo #1 as **Featured Photo** and added **{ok_count - 1} Extra Photos** to the article."
    else:
        picked = _pick_photo_from_recent(message, recent_media, attachments=attachments)
        if pkg_id and picked:
            p_obj, p_lbl = picked
            _, a_code = attach_photo_to_article(pkg_id, p_obj, mode="featured", db_path=db_path, author=author)
            if a_code == 200:
                attached_note = f"\n- **Photo:** Attached **{p_lbl}** as the Featured Image."

    cover_preview = ""
    if ai_pkg and ai_pkg.get("ig_cover_line1"):
        cover_preview = f"\n- **IG Cover Text:** *{ai_pkg['ig_cover_line1']}* — {ai_pkg.get('ig_cover_line2', '')}"

    return {
        "ok": True,
        "reply": (
            f"Wrote and saved your full AI Article & Social Post into **Articles & Posts**!\n"
            f"- **Title:** {pkg_title}\n"
            f"- **Article ID:** #{pkg_id} (auto-linked to this chat){cover_preview}{attached_note}\n\n"
            f"Tap **Open Article →** to review & push to WordPress, or tell me anything you want to tweak (*\"make the caption shorter\"*, *\"find real photos for this\"*)."
        ),
        "intent": "create_article",
        "photos": [],
        "generated_image": None,
        "sources": sources,
        "linked_article": {"id": pkg_id, "title": pkg_title},
        "article_action": {
            "package_id": pkg_id,
            "title": pkg_title,
            "label": "Open Article →",
        },
    }, 200


def _apply_smart_edit_to_article(
    linked_article: Dict[str, Any],
    message: str,
    history: List[Dict[str, Any]],
    db_path: str,
) -> Tuple[Dict[str, Any], int]:
    """Use Gemini to apply Binod's exact requested edits ('change this and that') directly to the linked Studio draft."""
    last_ai = ""
    for turn in reversed(history):
        if turn.get("role") in ("assistant", "model") and (turn.get("text") or "").strip():
            last_ai = turn["text"].strip()[:2000]
            break

    edit_prompt = (
        f"You are editing Binod's Studio draft article #{linked_article['id']} based on his exact instruction.\n\n"
        f"CURRENT DRAFT:\n"
        f"- Headline: {linked_article['title']}\n"
        f"- Excerpt: {linked_article['excerpt']}\n"
        f"- IG Cover Line 1: {linked_article['ig_cover_line1']}\n"
        f"- IG Cover Line 2: {linked_article['ig_cover_line2']}\n"
        f"- IG Caption: {linked_article['ig_caption']}\n"
        f"- Article Body HTML:\n{linked_article['body_html'][:3500]}\n\n"
        f"PREVIOUS ASSISTANT SUGGESTION (if user refers to option #1/#2/#3 or 'save this'):\n{last_ai or '(none)'}\n\n"
        f"USER'S EDIT INSTRUCTION: {message}\n\n"
        "Return ONLY valid JSON containing ONLY the fields that should change (omit unchanged fields!), plus a short 'summary' sentence:\n"
        "{\n"
        '  "headline": "...",\n'
        '  "excerpt": "...",\n'
        '  "body_html": "...",\n'
        '  "ig_cover_line1": "...",\n'
        '  "ig_cover_line2": "...",\n'
        '  "ig_caption": "...",\n'
        '  "summary": "Brief 1-sentence summary of what you updated"\n'
        "}"
    )
    raw, _, err = _call_studio_gemini(
        contents=[{"role": "user", "parts": [{"text": edit_prompt}]}],
        system_instruction="Apply the exact editorial edits requested by the user. Preserve clean WordPress HTML for body_html. Output ONLY valid JSON.",
        use_search=False,
        max_tokens=2800,
        temperature=0.3,
    )
    parsed = _parse_json_object(raw or "")
    if not parsed:
        return {"ok": False, "error": "EDIT_PARSE_FAILED", "message": err or "Could not apply that edit right now — try again."}, 503

    summary = parsed.pop("summary", "") or "Updated your Studio draft."
    res, code = update_linked_article_fields(linked_article["id"], parsed, db_path=db_path)
    if code != 200:
        return {"ok": False, "error": "UPDATE_FAILED", "message": res.get("message") or "Could not save draft changes."}, code

    labels = ", ".join(res.get("changed_labels") or ["Draft"])
    return {
        "ok": True,
        "reply": f"Done! Updated **{labels}** on **#{res['package_id']} {res['package_title']}** (saved as draft — not published yet).\n\n- {summary}",
        "intent": "update_article",
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


def handle_studio_chat(
    payload: Dict[str, Any],
    db_path: str = db.DB_PATH,
    author: str = "binodoli721@gmail.com",
) -> Tuple[Dict[str, Any], int]:
    """Unified Admin-only Studio AI Editorial Partner handler."""
    message = (payload.get("message") or "").strip()
    history = payload.get("history") or []
    attachments = payload.get("attachments") or []
    forced_action = (payload.get("action") or "").strip().lower()
    recent_media = payload.get("recent_media") or {}
    active_pkg_raw = payload.get("active_package_id")
    active_package_id = int(active_pkg_raw) if str(active_pkg_raw or "").isdigit() else None

    if not message and not attachments:
        return {"ok": False, "error": "EMPTY", "message": "Type a message or attach a photo/PDF."}, 400

    # 0. AUTO-DETECT PASTED ARTICLE TITLE OR #ID (even without tapping 'Link Article'!)
    auto_matched = _auto_detect_mentioned_article(message, db_path=db_path)
    if auto_matched:
        active_package_id = auto_matched["id"]

    linked_article = _load_linked_article_context(active_package_id, db_path=db_path)
    linked_return = {"id": linked_article["id"], "title": linked_article["title"]} if (auto_matched and linked_article) else None

    has_att_image = any((a.get("mime_type") or "").lower().startswith("image/") and a.get("data_base64") for a in attachments)
    has_recent_media = bool((recent_media.get("photos") or []) or recent_media.get("generated_image") or recent_media.get("uploaded_image") or has_att_image)

    # Smart LLM Router (understands casual speech, typos, pasted titles, and follow-ups!)
    if forced_action:
        route = {"action": forced_action}
    else:
        route = _route_studio_intent(message, history, linked_article, has_recent_media)
    intent = route.get("action") or "chat"

    # 1. DIRECT SMART EDIT ON LINKED / PASTED ARTICLE
    if intent == "update_article":
        if not linked_article:
            return {
                "ok": True,
                "reply": "Paste the **article title** (or tap **Link Article** below) so I know which Studio draft to edit!",
                "intent": intent,
                "photos": [],
                "generated_image": None,
                "sources": [],
            }, 200
        return _apply_smart_edit_to_article(linked_article, message, history, db_path=db_path)

    # 2. ATTACH PHOTO(S) TO ARTICLE
    if intent == "attach_photo":
        all_uploaded = _collect_all_uploaded_photos(recent_media, attachments=attachments)
        wants_all = len(all_uploaded) > 1 and any(k in message.lower() for k in ("all", "these photos", "these pictures", "these images", "both"))
        if wants_all and linked_article:
            ok_count = 0
            last_res = None
            for i, up_img in enumerate(all_uploaded[:6]):
                m_mode = "featured" if i == 0 else "additional"
                r_i, c_i = attach_photo_to_article(linked_article["id"], up_img, mode=m_mode, db_path=db_path, author=author)
                if c_i == 200:
                    ok_count += 1
                    last_res = r_i
            if ok_count and last_res:
                return {
                    "ok": True,
                    "reply": f"Done! Added all **{ok_count} uploaded photos** to **{last_res['package_title']}** (#{last_res['package_id']}) — Photo #1 as **Featured Photo** and {ok_count - 1} as **Extra Photos**.",
                    "intent": intent,
                    "photos": [],
                    "generated_image": None,
                    "sources": [],
                    "linked_article": {"id": last_res["package_id"], "title": last_res["package_title"]},
                    "article_action": {"package_id": last_res["package_id"], "title": last_res["package_title"], "label": "Open Article →"},
                }, 200

        picked = _pick_photo_from_recent(message, recent_media, attachments=attachments)
        if not picked:
            return {
                "ok": True,
                "reply": "I don't see a photo yet! Upload one with **+**, ask me to **find photos online**, or tap **+ Article** under any photo.",
                "intent": intent,
                "photos": [],
                "generated_image": None,
                "sources": [],
            }, 200
        photo_obj, photo_label = picked
        mode = "additional" if any(k in message.lower() for k in ("extra", "additional", "gallery", "second photo")) else "featured"
        if not linked_article:
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
        res, code = attach_photo_to_article(linked_article["id"], photo_obj, mode=mode, db_path=db_path, author=author)
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

    # 3. WRITE & SAVE FULL AI ARTICLE + SOCIAL POST TO ARTICLES & POSTS
    if intent == "create_article":
        topic = (route.get("topic") or "").strip() or message
        extra_notes = (payload.get("extra_instructions") or "").strip()
        try:
            return _write_and_save_ai_article(
                topic=topic,
                message=message,
                history=history,
                extra_notes=extra_notes,
                recent_media=recent_media,
                attachments=attachments,
                db_path=db_path,
                author=author,
            )
        except Exception as exc:
            return {"ok": False, "error": "CREATE_ARTICLE_FAILED", "message": f"Could not create article: {str(exc)[:140]}"}, 500

    # 4. SMART ONLINE PHOTO FINDER (uses Gemini's clean visual photography query!)
    if intent == "find_photos":
        visual_q = (route.get("search_query") or "").strip()
        if not visual_q:
            visual_q = linked_article["title"] if (linked_article and len(message.split()) <= 10) else message
        found_photos = _search_real_photos(visual_q, limit=6)
        reply = (
            f"Found **{len(found_photos)} real high-res photos** for *{visual_q}*! Tap **+ Article** on any photo, or just say *\"use photo 2\"*."
            if found_photos
            else f"Couldn't find clean free photos for *{visual_q}* — try another visual keyword or ask me to **create an AI picture**!"
        )
        out: Dict[str, Any] = {"ok": True, "reply": reply, "intent": intent, "photos": found_photos, "generated_image": None, "sources": []}
        if linked_return:
            out["linked_article"] = linked_return
        return out, 200

    # 5. GENERATE AI IMAGE
    if intent == "generate_image":
        gen_prompt = (route.get("search_query") or "").strip() or (linked_article["title"] if linked_article and len(message.split()) <= 12 else message)
        generated_image, gen_err = _generate_ai_image(gen_prompt)
        if generated_image:
            out = {
                "ok": True,
                "reply": f"Here is your editorial AI image for **{generated_image['prompt']}**! Tap **+ Article** or say *\"use this photo\"* to attach it.",
                "intent": intent,
                "photos": [],
                "generated_image": generated_image,
                "sources": [],
            }
            if linked_return:
                out["linked_article"] = linked_return
            return out, 200
        return {"ok": False, "error": "GEN_FAILED", "message": gen_err or "Could not generate image."}, 503

    # 6. NATURAL CONVERSATIONAL CHIEF EDITOR / GROWTH STRATEGIST / URL BREAKDOWN / FACT-CHECK
    contents: List[Dict[str, Any]] = []
    for turn in history[-12:]:
        role = "model" if turn.get("role") in ("assistant", "model") else "user"
        t_text = (turn.get("text") or "").strip()
        if t_text:
            contents.append({"role": role, "parts": [{"text": t_text}]})

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
                "Break this down clearly for expats/students/travelers in Finland and suggest an original ilovefinland.net headline + IG hook."
            )

    cur_parts, val_err = finnish_lab_engine._validate_and_build_parts(message + url_context_block, attachments)
    if val_err:
        return {"ok": False, "error": "INVALID_INPUT", "message": val_err}, 400
    contents.append({"role": "user", "parts": cur_parts})

    recent_catalog = _load_recent_studio_summary(db_path=db_path, limit=20)
    linked_block = ""
    if linked_article:
        linked_block = (
            f"\n\nACTIVE / MATCHED STUDIO ARTICLE (#{linked_article['id']}):\n"
            f"- Title: {linked_article['title']}\n"
            f"- Status: {linked_article['status']}\n"
            f"- Category: {linked_article['category']}\n"
            f"- Excerpt: {linked_article['excerpt']}\n"
            f"- IG Cover Line 1: {linked_article['ig_cover_line1']}\n"
            f"- IG Cover Line 2: {linked_article['ig_cover_line2']}\n"
            f"- IG Caption: {linked_article['ig_caption']}\n"
            f"- Body snippet: {linked_article['body_snippet']}\n"
        )

    sys_prompt = (
        "You are Binod's smart, natural-talking Chief Editor & Growth Partner inside ILoveFinland Studio (ilovefinland.net & @ilovefinland Instagram). "
        "Talk like a sharp, helpful human co-founder — clear, direct, practical, zero robotic corporate talk.\n\n"
        "WHAT YOU UNDERSTAND ABOUT BINOD'S STUDIO:\n"
        "- He publishes Finland news, expat/student guides, and travel stories to ilovefinland.net + 4:5 Instagram posts & Reels.\n"
        "- He can paste any article title directly in chat and ask you to check or change it, ask you to write & save a full new article to Articles & Posts, find clean photos online, write IG cover text & captions, or apply edits directly to his draft.\n\n"
        "GUIDELINES:\n"
        "- When reviewing an article: give a Website SEO Score (/10), Instagram Score (/10), top 3 concrete fixes, 3 stronger numbered headlines, and a monetization tip (VR/tours/hotels/eSIM). Tell him he can just reply 'use headline #2' or 'save this caption' to update his draft.\n"
        "- When helping with a Social Post or Instagram Slide Post / Carousel (5-6 photos):\n"
        "  Break it down clearly slide-by-slide so he can publish directly:\n"
        "  * Slide 1 (Cover 4:5): High-curiosity hook title, category badge, and 'Link in bio • ilovefinland.net →'.\n"
        "  * Slides 2–5 (Story & Insights): Photo idea + slide number ('01/05') + 1-2 punchy sentences per slide (no cluttered text).\n"
        "  * Slide 6 (Closing & CTA): Photo idea + engaging question for comments + 'Save this post 📌' + 'Read full story at ilovefinland.net (Link in bio)'.\n"
        "  * Complete Caption: Matching hook line + bulleted recap + 5-7 high-engagement hashtags (#FinlandLife #DiscoverFinland, etc.).\n"
        "- When asked for a weekly plan or growth ideas: check his recent 20 Studio articles below so you never repeat them, and suggest 5 high-impact ideas mixing fast-share Finland news + evergreen SEO guides.\n"
        "- When fact-checking: give a clear verdict (**✅ True**, **⚠️ Partly True / Unverified**, or **❌ False**) using official sources (Yle, Migri, Traficom, Kela, FMI, Reuters).\n\n"
        f"{recent_catalog}"
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

    out = {
        "ok": True,
        "reply": text_out,
        "intent": intent,
        "photos": [],
        "generated_image": None,
        "sources": sources,
        "turn_into_article_topic": turn_into_article_topic,
    }
    if linked_return:
        out["linked_article"] = linked_return
    return out, 200
