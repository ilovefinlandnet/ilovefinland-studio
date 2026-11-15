"""ILoveFinland Studio — read-only live public-source access.

Everything here performs plain HTTP GET requests against *public* pages and public
WordPress REST endpoints (no credentials, no writes, no paid APIs, no publishing).
It is used for duplicate checks against the live ilovefinland.net site.

If the network is unavailable (for example when Studio runs inside a sandbox) the last
saved snapshot is used instead and every result is labelled with its true origin:
  * "live"      — fetched from the public site during this request
  * "snapshot"  — last successful live fetch, with its timestamp and age
  * "sample"    — built-in sample data (only when no snapshot exists at all)
"""

import json
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html import unescape
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("ILF_DATA_DIR", os.path.join(BASE_DIR, "data"))
SNAPSHOT_PATH = os.path.join(DATA_DIR, "live_snapshot.json")
SITE = "https://ilovefinland.net"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# Words that carry no topical meaning for duplicate matching.
STOPWORDS = {
    "the", "and", "for", "with", "from", "that", "this", "finnish", "finland", "how", "what", "why",
    "about", "into", "your", "guide", "news", "new", "now", "are", "was", "will", "has", "have",
    "suomi", "suomen", "ja", "on", "in", "of", "to", "a", "an", "is", "at", "by", "or",
}

# English <-> Finnish topical synonyms so a Finnish-language article is found for an English topic.
SYNONYMS: Dict[str, List[str]] = {
    "tyre": ["tyre", "tyres", "tire", "tires", "rengas", "renkaat", "renkaan", "renkaita", "renkaanvaihto", "talvirenkaat", "nastarenkaat", "kitkarenkaat"],
    "tire": ["tyre", "tyres", "tire", "tires", "rengas", "renkaat", "renkaan", "renkaita", "renkaanvaihto", "talvirenkaat", "nastarenkaat", "kitkarenkaat"],
    "change": ["change", "changing", "swap", "vaihto", "vaihtaminen"],
    "sauna": ["sauna", "saunas", "sauna"],
    "tesla": ["tesla"],
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _http_get(url: str, timeout: float) -> Tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json, text/xml, */*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read()


def _strip(html_text: str) -> str:
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", html_text or ""))).strip()


# ---------------------------------------------------------------------------
# Snapshot of the public site
# ---------------------------------------------------------------------------

def load_snapshot() -> Optional[Dict[str, Any]]:
    try:
        with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def snapshot_age_seconds(snap: Optional[Dict[str, Any]]) -> Optional[float]:
    if not snap or not snap.get("fetched_at"):
        return None
    try:
        t = datetime.fromisoformat(snap["fetched_at"])
        return (datetime.now(timezone.utc) - t).total_seconds()
    except Exception:
        return None


def refresh_snapshot(timeout: float = 12.0) -> Dict[str, Any]:
    """Fetch the public ilovefinland.net post list, sections and categories. Never raises."""
    log: List[Dict[str, Any]] = []

    def fetch(label: str, url: str) -> Optional[bytes]:
        t0 = time.time()
        try:
            status, body = _http_get(url, timeout)
            log.append({"check": label, "url": url, "ok": True, "http_status": status, "ms": int((time.time() - t0) * 1000)})
            return body
        except Exception as ex:  # noqa: BLE001
            log.append({"check": label, "url": url, "ok": False, "error": str(ex)[:120], "ms": int((time.time() - t0) * 1000)})
            return None

    posts: List[Dict[str, Any]] = []
    page = 1
    while page <= 5:
        body = fetch(
            f"WordPress REST: published posts page {page}",
            f"{SITE}/wp-json/wp/v2/posts?per_page=100&page={page}&_fields=id,date,modified,link,slug,title,categories,ilf_section",
        )
        if not body:
            break
        try:
            batch = json.loads(body.decode("utf-8"))
        except Exception:
            break
        if not isinstance(batch, list) or not batch:
            break
        for p in batch:
            posts.append(
                {
                    "id": p.get("id"),
                    "url": p.get("link"),
                    "slug": p.get("slug"),
                    "title": _strip((p.get("title") or {}).get("rendered", "")),
                    "date": p.get("date"),
                    "modified": p.get("modified"),
                    "category_ids": p.get("categories") or [],
                    "section_ids": p.get("ilf_section") or [],
                }
            )
        if len(batch) < 100:
            break
        page += 1

    sitemap_urls: List[str] = []
    body = fetch("Public sitemap: wp-sitemap-posts-post-1.xml", f"{SITE}/wp-sitemap-posts-post-1.xml")
    if body:
        sitemap_urls = re.findall(r"<loc>(.*?)</loc>", body.decode("utf-8", "replace"))

    sections: List[Dict[str, Any]] = []
    body = fetch("WordPress REST: Website sections (ilf_section)", f"{SITE}/wp-json/wp/v2/ilf_section?per_page=100&_fields=id,name,slug,count")
    if body:
        try:
            sections = [{"id": s["id"], "name": unescape(s["name"]), "slug": s["slug"], "count": s.get("count", 0)} for s in json.loads(body.decode("utf-8"))]
        except Exception:
            sections = []

    categories: List[Dict[str, Any]] = []
    body = fetch("WordPress REST: Categories", f"{SITE}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count")
    if body:
        try:
            categories = [{"id": c["id"], "name": unescape(c["name"]), "slug": c["slug"], "count": c.get("count", 0)} for c in json.loads(body.decode("utf-8"))]
        except Exception:
            categories = []

    ok = bool(posts) or bool(sitemap_urls)
    prev = load_snapshot()
    if not ok and prev:
        prev["last_refresh_attempt"] = {"at": _now_iso(), "ok": False, "log": log}
        return prev

    snap = {
        "fetched_at": _now_iso() if ok else None,
        "site": SITE,
        "posts": posts,
        "sitemap_urls": sitemap_urls,
        "sections": sections,
        "categories": categories,
        "last_refresh_attempt": {"at": _now_iso(), "ok": ok, "log": log},
    }
    if ok:
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp = SNAPSHOT_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(snap, f, ensure_ascii=False, indent=1)
        os.replace(tmp, SNAPSHOT_PATH)
    return snap


def get_context(max_age_seconds: float = 900.0, allow_live: bool = True, timeout: float = 8.0) -> Dict[str, Any]:
    """Return {'snapshot', 'mode', 'age_seconds', 'refresh_log'}.

    mode == "live"     : the public site was fetched during this call.
    mode == "snapshot" : cached copy of an earlier live fetch (age shown), either because it is
                         still fresh or because the live fetch failed.
    mode == "none"     : nothing available (caller must fall back to labelled sample data).
    """
    snap = load_snapshot()
    age = snapshot_age_seconds(snap)
    refresh_log: List[Dict[str, Any]] = []
    if allow_live and (snap is None or age is None or age > max_age_seconds):
        fresh = refresh_snapshot(timeout=timeout)
        attempt = fresh.get("last_refresh_attempt", {})
        refresh_log = attempt.get("log", [])
        if attempt.get("ok"):
            return {"snapshot": fresh, "mode": "live", "age_seconds": 0.0, "refresh_log": refresh_log}
        if fresh.get("fetched_at"):
            snap, age = fresh, snapshot_age_seconds(fresh)
    if snap and snap.get("fetched_at"):
        return {"snapshot": snap, "mode": "snapshot", "age_seconds": age, "refresh_log": refresh_log or snap.get("last_refresh_attempt", {}).get("log", [])}
    return {"snapshot": None, "mode": "none", "age_seconds": None, "refresh_log": refresh_log}


# ---------------------------------------------------------------------------
# Duplicate matching
# ---------------------------------------------------------------------------

def topic_terms(topic: str, extra: str = "") -> List[str]:
    """Core topical words plus English/Finnish synonyms."""
    words = [w for w in re.findall(r"[\wäöåÄÖÅ]+", f"{topic} {extra}".lower()) if len(w) > 2 and w not in STOPWORDS]
    terms: List[str] = []
    for w in words:
        for t in SYNONYMS.get(w, [w]):
            if t not in terms:
                terms.append(t)
    return terms


def core_words(topic: str) -> List[str]:
    return [w for w in re.findall(r"[\wäöåÄÖÅ]+", topic.lower()) if len(w) > 2 and w not in STOPWORDS]


def match_posts(snapshot: Dict[str, Any], topic: str) -> Dict[str, List[Dict[str, Any]]]:
    """Classify published posts as strong (title/slug) or weak (mention only) matches."""
    cores = core_words(topic)
    syn_groups: List[List[str]] = [SYNONYMS.get(w, [w]) for w in cores]
    strong: List[Dict[str, Any]] = []
    for p in snapshot.get("posts", []):
        hay = f"{p.get('title', '')} {p.get('slug', '')}".lower()
        groups_hit = sum(1 for grp in syn_groups if any(t in hay for t in grp))
        if syn_groups and groups_hit >= max(1, (len(syn_groups) + 1) // 2) and groups_hit >= 1:
            strong.append({**p, "matched_groups": groups_hit, "of_groups": len(syn_groups)})
    strong.sort(key=lambda x: x["matched_groups"], reverse=True)
    return {"strong": strong}


def live_rest_search(topic: str, extra_terms: Optional[List[str]] = None, timeout: float = 8.0) -> Dict[str, Any]:
    """Live WordPress REST search (title + body text) for each topical term. Never raises."""
    terms = (extra_terms or topic_terms(topic))[:10]
    hits: Dict[int, Dict[str, Any]] = {}
    checks: List[Dict[str, Any]] = []
    for term in terms:
        url = f"{SITE}/wp-json/wp/v2/search?search={urllib.parse.quote(term)}&per_page=20&_fields=id,title,url,subtype"
        t0 = time.time()
        try:
            status, body = _http_get(url, timeout)
            data = json.loads(body.decode("utf-8"))
            posts = [d for d in data if d.get("subtype") == "post"]
            checks.append({"term": term, "ok": True, "http_status": status, "post_hits": len(posts), "ms": int((time.time() - t0) * 1000)})
            for d in posts:
                h = hits.setdefault(d["id"], {"id": d["id"], "title": _strip((d.get("title") or "")) if isinstance(d.get("title"), str) else _strip((d.get("title") or {}).get("rendered", "")), "url": d.get("url"), "terms": []})
                h["terms"].append(term)
        except Exception as ex:  # noqa: BLE001
            checks.append({"term": term, "ok": False, "error": str(ex)[:100]})
    return {"hits": list(hits.values()), "checks": checks, "all_failed": bool(checks) and not any(c["ok"] for c in checks)}


def fetch_mention_snippet(post_id: int, terms: List[str], timeout: float = 8.0) -> str:
    """Pull the sentence that mentions the topic from a live post (so 'related mention' is explained)."""
    try:
        status, body = _http_get(f"{SITE}/wp-json/wp/v2/posts/{post_id}?_fields=content", timeout)
        text = _strip(json.loads(body.decode("utf-8"))["content"]["rendered"])
        for sent in re.split(r"(?<=[.!?])\s+", text):
            if any(t in sent.lower() for t in terms):
                return sent[:240]
    except Exception:
        return ""
    return ""


def verify_urls(urls: List[str], timeout: float = 8.0) -> Dict[str, Dict[str, Any]]:
    """HEAD/GET check that a URL resolves (used for internal-link verification)."""
    out: Dict[str, Dict[str, Any]] = {}
    for u in urls:
        t0 = time.time()
        try:
            req = urllib.request.Request(u, headers={"User-Agent": USER_AGENT}, method="GET")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                out[u] = {"ok": resp.status == 200, "http_status": resp.status, "ms": int((time.time() - t0) * 1000)}
        except Exception as ex:  # noqa: BLE001
            out[u] = {"ok": False, "error": str(ex)[:100]}
    return out


YLE_RSS_URL = "https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_NEWS"
HELSINKI_TIMES_RSS = "https://www.helsinkitimes.fi/?format=feed&type=rss"
GOOD_NEWS_FINLAND_RSS = "https://www.goodnewsfinland.com/en/feed/"
BBC_WORLD_RSS = "https://feeds.bbci.co.uk/news/world/rss.xml"
BBC_TECH_RSS = "https://feeds.bbci.co.uk/news/technology/rss.xml"
ARS_TECHNICA_RSS = "https://feeds.arstechnica.com/arstechnica/index"
YLE_CACHE_PATH = os.path.join(DATA_DIR, "yle_news_cache.json")


def _get_curated_seed_stories() -> List[Dict[str, Any]]:
    """Comprehensive editorial seed pool ensuring balanced coverage across all 6 sections and regions of Finland.
    
    1. Finland comes first across all sections (News, Finland Guide, Things to Do, Travel, Food & Restaurants, Events).
    2. Covers all regions of Finland (Lapland & Arctic, Lakeland, Archipelago & Coast, Eastern Finland, Helsinki Capital Region, Pan-Finland).
    3. Genuinely important international news comes second (lower priority).
    """
    return [
        # --- SECTION: NEWS (Finland Breaking & Regional) ---
        {
            "title": "FMI Issues Severe Gale Warning for Baltic Coastal Waters & Archipelago Sea",
            "link": "https://en.ilmatieteenlaitos.fi/warnings",
            "pub_date": "Breaking Weather",
            "description": "The Finnish Meteorological Institute warns of near-gale to severe gale force winds across the Gulf of Finland and Archipelago Sea, impacting passenger ferry operations.",
            "outlet": "Ilmatieteen laitos (FMI)",
            "category": "Weather",
            "section": "News",
            "region": "Coast & Archipelago",
            "priority_rank": 1,
            "is_verified": True,
        },
        {
            "title": "Winter Weather Alert: First Sub-Zero Frost & Road Safety Warnings Across Finland",
            "link": "https://en.ilmatieteenlaitos.fi/warnings",
            "pub_date": "Today",
            "description": "Road safety authorities and meteorologists urge drivers and pedestrians to prepare for black ice, rapid freezing, and slippery conditions across Finland.",
            "outlet": "Ilmatieteen laitos / Liikenneturva",
            "category": "Weather",
            "section": "News",
            "region": "Pan-Finland",
            "priority_rank": 1,
            "is_verified": True,
        },
        {
            "title": "Oulu 6G Flagship Unveils World-First 6G Test Architecture for Nordic Industry",
            "link": "https://www.oulu.fi/en/6g-flagship",
            "pub_date": "Tech & Innovation",
            "description": "Researchers at the University of Oulu roll out next-generation sub-terahertz radio testbeds, cementing northern Finland's role as a global telecom pioneer.",
            "outlet": "University of Oulu / Business Finland",
            "category": "Business",
            "section": "News",
            "region": "Coast & North",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Finnish Ice Hockey Liiga Heats Up as Winter Standings Tighten",
            "link": "https://liiga.fi/en",
            "pub_date": "Sports Desk",
            "description": "Mid-season championship battle intensifies across Tampere, Helsinki, and Oulu arenas with tight playoff contention and record crowd attendance.",
            "outlet": "Liiga Official",
            "category": "Sports",
            "section": "News",
            "region": "Pan-Finland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Ostrobothnia Expands Renewable Grid Capacity for Western Finland Wind Energy",
            "link": "https://www.fingrid.fi/en",
            "pub_date": "Energy & Infrastructure",
            "description": "Fingrid completes major western transmission corridor enhancements to connect new onshore wind farms along the Gulf of Bothnia to the national grid.",
            "outlet": "Fingrid / Energy Finland",
            "category": "Business",
            "section": "News",
            "region": "Coast & Archipelago",
            "priority_rank": 2,
            "is_verified": True,
        },

        # --- SECTION: FINLAND GUIDE (Everyday Life, Housing, Driving, Taxes, Permits) ---
        {
            "title": "Tax Card (Verokortti) Annual Reset for 2027: How Expats and Freelancers Should Prepare",
            "link": "https://www.vero.fi/en",
            "pub_date": "Living Guide",
            "description": "Finnish Tax Administration (Vero) opens online tax card adjustments. Key guidance on income estimates, avoiding default withholding rates, and deductible work expenses.",
            "outlet": "Vero Skatt",
            "category": "Taxes",
            "section": "Finland Guide",
            "region": "Pan-Finland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Taloyhtiö Heating Rules: How Apartment Temperatures Work in Finnish Winter",
            "link": "https://thl.fi/en/web/environmental-health/housing/indoor-temperature",
            "pub_date": "Seasonal Guide",
            "description": "How Finnish housing cooperatives regulate radiator temperatures, the 20–22°C baseline rule from THL, and what tenants should do if rooms feel cold.",
            "outlet": "THL / Kiinteistöliitto",
            "category": "Housing",
            "section": "Finland Guide",
            "region": "Pan-Finland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Winter Tyre Change in Finland: When to Switch and What the Rules Say",
            "link": "https://www.traficom.fi/en",
            "pub_date": "Driving Guide",
            "description": "Finnish transport authorities remind drivers that winter tyres are mandatory whenever weather or road conditions demand it between 1 November and 31 March.",
            "outlet": "Traficom / Liikenneturva",
            "category": "Driving",
            "section": "Finland Guide",
            "region": "Pan-Finland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Migri Fast-Track Digital Residence Permits for Tech Specialists & Researchers",
            "link": "https://migri.fi/en",
            "pub_date": "Immigration & Work",
            "description": "The Finnish Immigration Service streamlines 14-day D-visa fast tracking for international tech specialists, executive hires, and visiting researchers.",
            "outlet": "Finnish Immigration Service (Migri)",
            "category": "Residence Permits",
            "section": "Finland Guide",
            "region": "Pan-Finland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Helsinki Introduces New 24-Hour Public Transport Contactless Fare Cap",
            "link": "https://www.hsl.fi/en",
            "pub_date": "Transit Update",
            "description": "HSL expands contactless tap-to-ride payment caps across all metro, tram, bus, and ferry lines, saving daily commuters and visitors money without separate cards.",
            "outlet": "HSL News",
            "category": "Public Transport",
            "section": "Finland Guide",
            "region": "Helsinki Region",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Moving to Finland Checklist: DVV Registration, Finnish Personal Identity Code & First Steps",
            "link": "https://dvv.fi/en",
            "pub_date": "Relocation Guide",
            "description": "Step-by-step relocation guide on booking DVV appointments, registering municipality of residence, and setting up initial administrative essentials.",
            "outlet": "Digital and Population Data Services Agency (DVV)",
            "category": "Moving to Finland",
            "section": "Finland Guide",
            "region": "Pan-Finland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Everyday Waste Sorting in Finland: Bio-Waste, Plastic & Bottle Return (Pantti) Rules",
            "link": "https://www.hsy.fi/en",
            "pub_date": "Everyday Living",
            "description": "Practical household recycling guidelines in Finnish apartment cooperatives, including 7-fraction sorting and the automated Pantti deposit system.",
            "outlet": "HSY / Palpa",
            "category": "Everyday Life",
            "section": "Finland Guide",
            "region": "Pan-Finland",
            "priority_rank": 2,
            "is_verified": True,
        },

        # --- SECTION: THINGS TO DO (Across All of Finland) ---
        {
            "title": "Winter Ice Swimming & Public Saunas in Tampere: The World Sauna Capital Guide",
            "link": "https://visittampere.fi/en",
            "pub_date": "Culture & Wellness",
            "description": "Opening hours, cold plunge etiquette, and historical wood-heated public saunas in Tampere, the officially declared Sauna Capital of the World.",
            "outlet": "Visit Tampere / Finnish Sauna Society",
            "category": "Winter Activities",
            "section": "Things to Do",
            "region": "Finnish Lakeland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Koli National Park Winter Hiking: Overlooking Lake Pielinen from the Highest Peaks",
            "link": "https://www.nationalparks.fi/kolinp",
            "pub_date": "Outdoor Nature",
            "description": "Snowshoe trails, winter safety guidelines, and panoramic views from Ukko-Koli across frozen Lake Pielinen in North Karelia.",
            "outlet": "Metsähallitus National Parks",
            "category": "Outdoor Activities",
            "section": "Things to Do",
            "region": "Eastern Finland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Nuuksio Reindeer Park & Forest Trails: Easy Winter Day Trips from Helsinki",
            "link": "https://www.nationalparks.fi/nuuksionp",
            "pub_date": "Family & Nature",
            "description": "How to feed reindeer lichen by hand, explore marked lake trails, and enjoy wilderness campfires just 40 minutes from downtown Helsinki.",
            "outlet": "Visit Espoo / Nuuksio Park Desk",
            "category": "Family Activities",
            "section": "Things to Do",
            "region": "Helsinki Region",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Cross-Country Skiing in Ylläs & Levi: Miles of Illuminated Arctic Tracks",
            "link": "https://www.yllas.fi/en",
            "pub_date": "Winter Recreation",
            "description": "Beginner and advanced ski track maps, ski waxing tips for arctic snow conditions, and cozy ski cafe stops in Finnish Lapland.",
            "outlet": "Visit Ylläs / Ski Lapland",
            "category": "Winter Activities",
            "section": "Things to Do",
            "region": "Lapland & Arctic",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Visiting Amos Rex & Helsinki Modern Art Spaces in Winter",
            "link": "https://amosrex.fi/en",
            "pub_date": "Culture & Arts",
            "description": "Subterranean exhibition spaces, architectural skylights at Lasipalatsi square, and ticket booking advice for Helsinki's premier contemporary art hub.",
            "outlet": "MyHelsinki Culture",
            "category": "Museums",
            "section": "Things to Do",
            "region": "Helsinki Region",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Finnish Coffee Culture (Kahvitauko): Traditions, Pullapäivä, and Coffee Etiquette",
            "link": "https://www.visitfinland.com/en/articles/finnish-coffee-culture",
            "pub_date": "Culture & Traditions",
            "description": "Why Finns drink more coffee per capita than anyone else on Earth, the statutory workplace coffee break law, and traditional cardamom bun pairings.",
            "outlet": "Visit Finland / Finnish Cultural Foundation",
            "category": "Culture & Traditions",
            "section": "Things to Do",
            "region": "Pan-Finland",
            "priority_rank": 2,
            "is_verified": True,
        },

        # --- SECTION: TRAVEL (Across All of Finland) ---
        {
            "title": "Lapland Northern Lights Forecast: Prime Aurora Spots from Rovaniemi to Inari",
            "link": "https://www.visitfinland.com/en/places-to-go/lapland",
            "pub_date": "Seasonal Travel",
            "description": "Peak solar geomagnetic activity creates prime northern lights viewing conditions across northern Finnish Lapland. Best fells, glass igloos, and camera settings.",
            "outlet": "Visit Finland / FMI Space Weather",
            "category": "Northern Lights",
            "section": "Travel",
            "region": "Lapland & Arctic",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Turku Archipelago Trail in Winter: Ferry Schedules, Icebound Routes and Island Life",
            "link": "https://www.visitarchipelago.net/en",
            "pub_date": "Regional Travel",
            "description": "How to explore the coastal islands and icebound ferry routes of the Turku Archipelago (Saaristo) during the quiet winter season.",
            "outlet": "Visit Turku Archipelago",
            "category": "Finnish Archipelago",
            "section": "Travel",
            "region": "Coast & Archipelago",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Saimaa Lake Winter Cottages: Mökki Life and Ringed Seal Conservation",
            "link": "https://www.visitsaimaa.fi/en",
            "pub_date": "Nature & Travel",
            "description": "Experience secluded lakeside cabin life, frozen lake ski trails, and winter nesting snowbank conservation for the endangered Saimaa ringed seal.",
            "outlet": "Visit Saimaa / Metsähallitus",
            "category": "Finnish Lakeland",
            "section": "Travel",
            "region": "Finnish Lakeland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Old Town Porvoo in Winter: Historic Wooden Quarters, Artisan Boutiques & Riverside Walks",
            "link": "https://www.porvoo.fi/en",
            "pub_date": "Coastal Travel",
            "description": "Walk among 18th-century red ochre riverside warehouses, sample artisan chocolates, and explore cobblestone alleys in Finland’s second-oldest town.",
            "outlet": "Visit Porvoo",
            "category": "Helsinki",
            "section": "Travel",
            "region": "Coast & Archipelago",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Kuopio & Savonlinna Winter Getaway: Lake Cruises, Castles and Smoke Saunas",
            "link": "https://www.visitsavonlinna.fi/en",
            "pub_date": "Lakeland Travel",
            "description": "Explore medieval Olavinlinna Castle surrounded by icy lake waters, taste regional kalakukko fish pasties, and unwind in authentic savusaunas.",
            "outlet": "Visit Lakeland / Savonlinna Travel",
            "category": "Finnish Lakeland",
            "section": "Travel",
            "region": "Finnish Lakeland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Pallas-Yllästunturi National Park: Trekking Under the Purest Air on Earth",
            "link": "https://www.nationalparks.fi/pallas-yllastunturinp",
            "pub_date": "Arctic Nature",
            "description": "Scientific air monitoring stations confirm the world's cleanest breathable air along the rolling fells and taiga forests of western Lapland.",
            "outlet": "Metsähallitus / FMI Sammaltunturi",
            "category": "National Parks",
            "section": "Travel",
            "region": "Lapland & Arctic",
            "priority_rank": 2,
            "is_verified": True,
        },

        # --- SECTION: FOOD & RESTAURANTS ---
        {
            "title": "Traditional Finnish Salmon Soup (Lohikeitto): Best Helsinki Kauppahalli Spots & Recipe",
            "link": "https://www.myhelsinki.fi/en/eat-and-drink/restaurants/traditional-finnish-food",
            "pub_date": "Food & Dining",
            "description": "Where to taste the creamiest traditional salmon soup in Helsinki market halls, plus authentic home cooking steps with fresh dill, butter, and dark rye bread.",
            "outlet": "MyHelsinki / Food & Dining",
            "category": "Finnish Food",
            "section": "Food & Restaurants",
            "region": "Helsinki Region",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Authentic Karelian Pies (Karjalanpiirakka): Joensuu Bakeries & Traditional Recipes",
            "link": "https://www.visitkarelia.fi/en",
            "pub_date": "Regional Food",
            "description": "How traditional rye-crust rice pies earned EU protected status (TSG), where to find fresh-baked pies in North Karelia, and how to whip authentic munavoi egg butter.",
            "outlet": "Visit Karelia / Finnish Food Heritage",
            "category": "Finnish Food",
            "section": "Food & Restaurants",
            "region": "Eastern Finland",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Tampere Market Hall & Tammelantori: The Essential Guide to Mustamakkara",
            "link": "https://visittampere.fi/en",
            "pub_date": "Food & Dining",
            "description": "A foodie journey through Tampere’s beloved black sausage heritage, ordered by the euro amount at morning market stalls with lingonberry jam and cold milk.",
            "outlet": "Visit Tampere / Culinary Guild",
            "category": "restaurants-cafes",
            "section": "Food & Restaurants",
            "region": "Finnish Lakeland",
            "priority_rank": 2,
            "is_verified": True,
        },

        # --- SECTION: EVENTS ---
        {
            "title": "Helsinki Christmas Market at Senate Square: Dates, Stalls, and Visiting Tips",
            "link": "https://www.myhelsinki.fi/en/see-and-do/events/helsinki-christmas-market",
            "pub_date": "Seasonal Event",
            "description": "Over 100 artisan stalls, traditional spiced glögi, merry-go-round, and visiting tips for Finland's most atmospheric holiday market in central Helsinki.",
            "outlet": "MyHelsinki Events",
            "category": "Culture & Events",
            "section": "Events",
            "region": "Helsinki Region",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Slush Helsinki 2026: Europe’s Leading Startup & Venture Capital Gathering",
            "link": "https://slush.org",
            "pub_date": "Upcoming Event",
            "description": "Key takeaways for founders, international tech investors, and engineers gathering at Messukeskus Helsinki for the world's most founder-focused event.",
            "outlet": "Slush Media Desk",
            "category": "Culture & Events",
            "section": "Events",
            "region": "Helsinki Region",
            "priority_rank": 2,
            "is_verified": True,
        },
        {
            "title": "Lux Helsinki Light Festival: Interactive Art Illuminating Capital City Landmarks",
            "link": "https://luxhelsinki.fi/en",
            "pub_date": "Arts & Events",
            "description": "Annual January light art route transforming Helsinki architecture into glowing outdoor installations, welcoming hundreds of thousands of winter spectators.",
            "outlet": "Helsinki Events Foundation",
            "category": "Culture & Events",
            "section": "Events",
            "region": "Helsinki Region",
            "priority_rank": 2,
            "is_verified": True,
        },

        # --- SECTION: INTERNATIONAL NEWS (Second Priority, ~15% Minority) ---
        {
            "title": "Global Climate Action: Scientists Assess 1.5°C Warming Threshold and Clean Energy Transition",
            "link": "https://www.ipcc.ch",
            "pub_date": "Global Science",
            "description": "Leading climate scientists analyze the critical 1.5°C global temperature threshold, highlighting the urgent acceleration of solar and wind energy transition.",
            "outlet": "IPCC / International Science Disclosures",
            "category": "International",
            "section": "News",
            "region": "International",
            "priority_rank": 3,
            "is_verified": True,
        },
        {
            "title": "European Union Finalizes Implementation Roadmap for Artificial Intelligence Act",
            "link": "https://digital-strategy.ec.europa.eu",
            "pub_date": "Policy & Tech",
            "description": "EU AI Office publishes compliance guidelines and governance requirements for high-risk generative models across all member states.",
            "outlet": "European Commission / Tech Policy",
            "category": "International",
            "section": "News",
            "region": "International",
            "priority_rank": 3,
            "is_verified": True,
        },
        {
            "title": "Next-Gen AI Compute Architectures Reshape Global Supercomputing & Energy Demand",
            "link": "https://www.reuters.com/technology",
            "pub_date": "Global Tech",
            "description": "Technology leaders highlight surging global demand for high-efficiency AI compute clusters and Nordic green data center infrastructure.",
            "outlet": "Reuters / Tech Global",
            "category": "International",
            "section": "News",
            "region": "International",
            "priority_rank": 3,
            "is_verified": True,
        },
        {
            "title": "US–Iran Tensions Escalate Over Regional Security and Strait of Hormuz Navigation",
            "link": "https://www.reuters.com/world/middle-east",
            "pub_date": "World News",
            "description": "Diplomatic and maritime security concerns mount across the Persian Gulf following heightened military positioning and sanctions enforcement.",
            "outlet": "Reuters / World News",
            "category": "International",
            "section": "News",
            "region": "International",
            "priority_rank": 3,
            "is_verified": True,
        },
        {
            "title": "Commercial Spaceflight Milestone: Heavy Orbital Launch Systems Expand Deep Space Missions",
            "link": "https://www.reuters.com/science",
            "pub_date": "Aerospace & Tech",
            "description": "Major aerospace agencies and commercial launch providers validate reusable heavy rocket architecture for long-duration lunar and orbital logistics.",
            "outlet": "Reuters / Global Science",
            "category": "International",
            "section": "News",
            "region": "International",
            "priority_rank": 3,
            "is_verified": True,
        },
    ]


_TRANSLATION_CACHE: Dict[str, str] = {}


def _translate_finnish_headline_to_english(finnish_title: str) -> str:
    """Translate a domestic Finnish headline into clear English journalistic headline."""
    if not finnish_title or len(finnish_title) < 5:
        return finnish_title
    if finnish_title in _TRANSLATION_CACHE:
        return _TRANSLATION_CACHE[finnish_title]

    try:
        import env_loader
        env_loader.load_env()
    except Exception:
        pass

    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if key and os.environ.get("ILF_DEMO_MODE") != "1":
        try:
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "User-Agent": USER_AGENT,
                },
                data=json.dumps({
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional Finnish-to-English news headline translator for ILoveFinland. Output strictly the clear English headline without quotes."
                        },
                        {
                            "role": "user",
                            "content": f"Translate to concise English news headline: {finnish_title}"
                        }
                    ],
                    "max_tokens": 40,
                    "temperature": 0.2
                }).encode("utf-8")
            )
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                res = json.loads(resp.read())
                translated = res["choices"][0]["message"]["content"].strip().strip('"').strip("'")
                if translated and len(translated) > 8:
                    _TRANSLATION_CACHE[finnish_title] = translated
                    return translated
        except Exception:
            pass

    _TRANSLATION_CACHE[finnish_title] = finnish_title
    return finnish_title


def fetch_live_finnish_news(max_items: int = 40, timeout: float = 2.5) -> List[Dict[str, Any]]:
    """Fetch live Finnish breaking news and curated hot international topics with disk caching."""
    import xml.etree.ElementTree as ET

    items: List[Dict[str, Any]] = []

    # Feed definitions: (url, outlet, category, is_intl)
    # Domestic Finnish feeds (Police, Civic, Emergency, Capital Region) are prioritized first
    feed_targets = [
        ("https://yle.fi/rss/t/18-34953/fi", "Yle Helsinki & Uusimaa (Police & Civic)", "Finnish News", False),
        ("https://yle.fi/rss/t/18-34837/fi", "Yle Kotimaa (Domestic Wire)", "Finnish News", False),
        ("https://www.is.fi/rss/kotimaa.xml", "IS Kotimaa (Emergency & Crime Wire)", "Finnish News", False),
        (YLE_RSS_URL, "Yle News (English)", "Finnish News", False),
        (HELSINKI_TIMES_RSS, "Helsinki Times", "Finnish News", False),
        ("https://feeds.bbci.co.uk/news/world/rss.xml", "BBC News (World)", "International", True),
        ("https://feeds.bbci.co.uk/news/technology/rss.xml", "BBC Tech / Global", "International", True),
    ]

    for feed_url, outlet, category, is_intl in feed_targets:
        try:
            feed_timeout = 1.5 if is_intl else timeout
            status, body = _http_get(feed_url, timeout=feed_timeout)
            if status == 200 and body:
                root = ET.fromstring(body)
                max_feed = 2 if ("yle.fi" in feed_url or "is.fi" in feed_url) and not outlet.endswith("(English)") else 6
                for it in root.findall("./channel/item")[:max_feed]:
                    title = it.find("title").text if it.find("title") is not None else ""
                    clean_title = re.sub(r"<[^>]+>", "", title).strip()
                    link = it.find("link").text if it.find("link") is not None else ""
                    pub_date = it.find("pubDate").text if it.find("pubDate") is not None else ""
                    desc = it.find("description").text if it.find("description") is not None else ""
                    clean_desc = re.sub(r"<[^>]+>", "", desc).strip()
                    if not clean_title or len(clean_title) < 14:
                        continue

                    # Filter low-substance international blurbs
                    if is_intl and len(clean_desc) < 25:
                        continue

                    display_title = clean_title
                    source_claim = clean_desc or clean_title
                    region = None
                    if "Helsinki" in feed_url or "Helsinki" in outlet or "helsinki" in clean_title.lower() or "helsingin" in clean_title.lower():
                        region = "Helsinki"

                    # Translate Finnish domestic headlines to English for editorial clarity
                    if ("yle.fi" in feed_url or "is.fi" in feed_url) and not is_intl and not outlet.endswith("(English)"):
                        translated = _translate_finnish_headline_to_english(clean_title)
                        if translated and translated != clean_title:
                            display_title = translated
                            source_claim = f"Finnish original: {clean_title}. {clean_desc}"

                    items.append({
                        "title": display_title,
                        "link": link.strip(),
                        "pub_date": pub_date.strip() or "Today",
                        "description": clean_desc,
                        "source_claim": source_claim,
                        "outlet": outlet,
                        "category": "International" if is_intl else category,
                        "region": region,
                        "is_verified": True,
                    })
        except Exception:
            continue
            continue

    # Merge with curated editorial pool to guarantee a rich 20+ item selection
    seen_titles = {i["title"].lower().strip() for i in items}
    for seed in _get_curated_seed_stories():
        if seed["title"].lower().strip() not in seen_titles:
            items.append(seed)
            seen_titles.add(seed["title"].lower().strip())

    if items:
        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(YLE_CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(items, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    return items[:max_items]



if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "refresh":
        s = refresh_snapshot()
        print(json.dumps({"fetched_at": s.get("fetched_at"), "posts": len(s.get("posts", [])), "sitemap_urls": len(s.get("sitemap_urls", [])), "sections": len(s.get("sections", [])), "categories": len(s.get("categories", [])), "log": s["last_refresh_attempt"]["log"]}, indent=1))
    else:
        print("usage: python3 live_sources.py refresh")
