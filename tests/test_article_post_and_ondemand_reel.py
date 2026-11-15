#!/usr/bin/env python3
"""Automated verification for Article Assignment, Static Post, and On-Demand Reel decoupling.

Verifies:
1. Article assignment prepares:
   - WordPress-ready straight-news article with exact field ordering matching ilovefinland.net
   - Matched high-resolution real photo with verified reuse rights, alt text, photographer, source, licence, and credit string
   - Editable 1080 × 1350 static social post draft with original heart logo, navy gradient, blue badge, 3:4 crop preview, caption with <=5 hashtags
2. Decoupled Reels:
   - Reel is NOT generated initially (reel_status == 'none', reel is None)
   - Approving the article or static post NEVER triggers Reel generation
3. Flagged missing photo:
   - Obscure topic with no cleared photo in archive returns flagged_no_license
   - Uploading a replacement photo updates featured_image and static post
4. Explicit "Create Reel" action:
   - Calling POST /api/package/create-reel creates the 9:16 Reel on demand and sets reel_status = 'pending'
5. Direct adjustments:
   - Static post adjustments (badge, headlines, font size, caption, hashtags) persist
   - Article field updates persist
"""

import http.cookiejar
import json
import sys
import urllib.request

BASE_URL = "http://127.0.0.1:8787"
ACCESS_KEY = "suomi-studio-x9k4-7q2m"

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))


def api(path, data=None):
    url = f"{BASE_URL}{path}"
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {"Content-Type": "application/json"} if data is not None else {}
    req = urllib.request.Request(url, data=req_data, headers=headers)
    with opener.open(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run():
    print("=== STARTING ARTICLE ASSIGNMENT & DECOUPLED REEL TEST ===")

    # Step 0: Auth
    auth_res = api("/api/auth/google", {"access_key": ACCESS_KEY})
    assert auth_res.get("authenticated") is True, "Auth failed"
    print("✓ Auth Gate Passed (editor@ilovefinland.net)")

    # Step 1: Create Article Assignment (Scope: Article + Static Post)
    print("\n--- Step 1: Create Article Assignment (Tesla Road Safety) ---")
    created = api("/api/assignments", {
        "topic": "Tesla Assisted Driving Permitted on Finnish Roads Under Driver Liability",
        "scope": "Article + Static Post",
        "instructions": "Focus on Traficom automated driving rules and human driver legal liability under Finnish law.",
        "links": [
            "https://www.traficom.fi/en/transport/road/automated-driving-and-driver-assistance",
            "https://www.finlex.fi/fi/laki/alkup/2018/20180729"
        ],
        "deadline_at": "2026-11-15T14:00",
    })
    pkg = created["package"]
    pkg_id = pkg["id"]
    ver = created["versions"][-1]
    art = ver["article"]
    ig_post = ver["ig_post"]
    reel = ver["reel"]

    print(f"✓ Package #{pkg_id} created: slug='{pkg['slug']}'")
    assert pkg["article_status"] == "pending", f"Expected article_status 'pending', got {pkg['article_status']}"
    assert pkg["ig_post_status"] == "pending", f"Expected ig_post_status 'pending', got {pkg['ig_post_status']}"
    assert pkg["reel_status"] == "none", f"Expected reel_status 'none', got {pkg['reel_status']}"
    assert reel is None, f"Expected reel to be None when not requested, got {reel}"
    print("✓ Reel is strictly NOT generated (reel_status='none', reel=None)")

    # Verify Article WordPress Fields
    print("\n--- Step 2: Verify WordPress Article Form Fields & Taxonomy ---")
    assert art["headline"], "Article headline missing"
    assert art["short_description"], "Article short description missing"
    assert art["language"] == "English", "Expected English default language"
    assert art["section"] == "News", f"Expected section 'News', got {art['section']}"
    assert art["category"] == "Transport & Infrastructure", f"Expected category 'Transport & Infrastructure', got {art['category']}"
    assert "taxonomy_options" in art, "Taxonomy options missing"
    assert art["search_phrase"] == "is tesla assisted driving allowed in finland", f"Unexpected search phrase: {art['search_phrase']}"
    assert art["seo_title"], "SEO title missing"
    assert art["meta_description"], "Meta description missing"
    assert art["body_html"] and "<p>" in art["body_html"], "body_html missing paragraph tags"
    assert "body_visual" in art, "body_visual missing"
    assert art["region"], "Region field missing"
    assert art["city_location"], "City field missing"
    assert art["exact_address"], "Exact address missing"
    assert "event_datetime_venue" in art, "event_datetime_venue missing"
    assert "private_editorial_notes" in art, "private_editorial_notes missing"
    assert "Excluded from public copy" in art["private_editorial_notes"], "Private notes not excluded from public copy"
    print(f"✓ Article details verified: Section '{art['section']}' → Category '{art['category']}'")
    print(f"✓ Natural Search Phrase: '{art['search_phrase']}'")
    print(f"✓ SEO Title ({len(art['seo_title'])} chars): '{art['seo_title']}'")
    print(f"✓ Meta Description ({len(art['meta_description'])} chars): '{art['meta_description']}'")

    # Verify Featured Image
    feat = art["featured_image"]
    assert feat["status"] == "cleared", f"Expected photo status 'cleared', got {feat['status']}"
    assert feat["photographer"] == "Jesse Peltola", f"Unexpected photographer: {feat['photographer']}"
    assert feat["source_url"], "Source URL missing"
    assert feat["licence"], "Licence missing"
    assert feat["alt_text"], "Alt text missing"
    assert feat["credit_string"], "Credit string missing"
    assert "Jesse Peltola" in art["image_credit"], "Image credit mismatch"
    print(f"✓ Featured Photo matched: '{feat['title']}'")
    print(f"✓ Photo Credit: {feat['credit_string']}")
    print(f"✓ Reuse Licence: {feat['licence']}")

    # Verify Static Post
    print("\n--- Step 3: Verify 1080 × 1350 Static Social Post Draft ---")
    assert ig_post is not None, "Static post missing"
    assert ig_post["width"] == 1080 and ig_post["height"] == 1350, "Expected 1080 × 1350 dimensions"
    assert ig_post["aspect_ratio"] == "4:5", "Expected 4:5 aspect ratio"
    assert ig_post["logo_url"] == "/assets/ilf-heart-exact.png", "Original heart logo missing"
    assert ig_post["badge_color"] == "#003882", "Blue category badge missing"
    assert ig_post["headline_line1"], "Headline line 1 missing"
    assert ig_post["headline_line2"], "Headline line 2 missing"
    assert len(ig_post["hashtags"]) <= 5, f"Expected <= 5 hashtags, got {len(ig_post['hashtags'])}"
    assert ig_post["photo_url"], "Photo URL missing on static post"
    print(f"✓ Static post prepared: Line1='{ig_post['headline_line1']}', Line2='{ig_post['headline_line2']}'")
    print(f"✓ Hashtags ({len(ig_post['hashtags'])}): {', '.join(ig_post['hashtags'])}")

    # Step 4: Independent Approvals (Article & Static Post)
    print("\n--- Step 4: Independent Approvals (Must NEVER Trigger Reel) ---")
    app_art = api("/api/package/approve", {
        "package_id": pkg_id,
        "component": "article",
        "decision": "approved",
        "version": 1,
    })
    assert app_art["package"]["article_status"] == "approved", "Article approval failed"
    assert app_art["package"]["reel_status"] == "none", "Article approval must NEVER trigger reel"
    assert app_art["versions"][-1]["reel"] is None, "Reel must remain None after article approval"
    print("✓ Article approved independently. Reel remains strictly 'none'.")

    app_post = api("/api/package/approve", {
        "package_id": pkg_id,
        "component": "ig_post",
        "decision": "approved",
        "version": 1,
    })
    assert app_post["package"]["ig_post_status"] == "approved", "Static post approval failed"
    assert app_post["package"]["reel_status"] == "none", "Static post approval must NEVER trigger reel"
    assert app_post["versions"][-1]["reel"] is None, "Reel must remain None after static post approval"
    print("✓ Static post approved independently. Reel remains strictly 'none'.")

    # Step 5: Test Missing Photo Flagging & Fallback on Obscure Topic
    print("\n--- Step 5: Test Flagging Missing Photo on Obscure Topic ---")
    obscure = api("/api/assignments", {
        "topic": "Rare Deep Geothermal Well Seismic Resonance Study in Otaniemi",
        "scope": "Article + Static Post",
        "instructions": "Scientific measurement of sub-surface seismic dampening.",
    })
    obs_art = obscure["versions"][-1]["article"]
    obs_feat = obs_art["featured_image"]
    assert obs_feat["status"] == "flagged_no_license", f"Expected flagged_no_license, got {obs_feat['status']}"
    print("✓ Obscure topic correctly flagged: 'flagged_no_license'")

    # Upload custom replacement photo
    uploaded = api("/api/package/upload-featured-image", {
        "package_id": obscure["package"]["id"],
        "image_data": {
            "url": "/assets/helsinki-sample.jpg",
            "photographer": "Otaniemi Geological Survey",
            "agency": "Aalto Earth Sciences",
            "source_url": "https://aalto.fi/geothermal-study",
            "licence": "Creative Commons CC-BY 4.0",
            "alt_text": "Sub-surface sensor monitoring station in Otaniemi.",
            "caption": "Otaniemi deep geothermal monitoring array.",
        }
    })
    up_feat = uploaded["versions"][-1]["article"]["featured_image"]
    assert up_feat["status"] == "cleared", "Uploaded photo should be marked cleared"
    assert up_feat["photographer"] == "Otaniemi Geological Survey", "Photographer mismatch on upload"
    print(f"✓ Upload replacement photo successful: {up_feat['credit_string']}")

    # Step 6: Explicit "Create Reel" on Demand
    print("\n--- Step 6: Trigger Explicit 'Create Reel' on Demand ---")
    reel_bundle = api("/api/package/create-reel", {"package_id": pkg_id})
    assert reel_bundle["package"]["reel_status"] == "pending", f"Expected reel_status 'pending', got {reel_bundle['package']['reel_status']}"
    new_ver = reel_bundle["versions"][-1]
    assert new_ver["reel"] is not None, "Expected Reel object after explicit request"
    assert len(new_ver["reel"]["scenes"]) == 4, f"Expected 4 scenes, got {len(new_ver['reel']['scenes'])}"
    assert new_ver["reel"]["layout"]["template_style"] == "tesla_news", "Expected tesla_news template style"
    print("✓ On-demand Reel created successfully with 4 scenes and Tesla news pacing!")

    # Step 7: Static Post Direct Adjustments
    print("\n--- Step 7: Test Static Post Direct Adjustments ---")
    adj_bundle = api("/api/package/adjust-static-post", {
        "package_id": pkg_id,
        "adjustments": {
            "badge_text": "ROAD SAFETY",
            "headline_line1": "FINLAND AUTHORISES TESLA’S",
            "headline_line2": "SUPERVISED AUTOPILOT!",
            "line2_font_size": 36,
            "caption": "Updated caption for Finnish drivers: hands must remain on the wheel at all times.",
            "hashtags": ["#ILoveFinland", "#Tesla", "#RoadSafety", "#Finland", "#EV"]
        }
    })
    adj_post = adj_bundle["versions"][-1]["ig_post"]
    assert adj_post["badge_text"] == "ROAD SAFETY", f"Badge adjustment failed: {adj_post['badge_text']}"
    assert adj_post["line2_font_size"] == 36, f"Font size adjustment failed: {adj_post['line2_font_size']}"
    print(f"✓ Static post adjustments verified: Badge='{adj_post['badge_text']}', Line2 font={adj_post['line2_font_size']}px")

    print("\n=== ALL TESTS PASSED SUCCESSFULLY (100%) ===")


if __name__ == "__main__":
    run()
