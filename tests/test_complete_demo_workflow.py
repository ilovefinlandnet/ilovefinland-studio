"""Test complete ILoveFinland Studio demo workflow in strict simulation mode.

Workflow steps:
1. Create article draft and Reel script from sample story and 2 clips
2. In-Studio Direct Reel Editor: adjust text, audio, safe area, and logo
3. Editorial feedback revision: apply revision comment
4. Separate approvals: approve article first, then approve reel separately
5. Confirm publishing times (Europe/Helsinki) and simulate scheduling
"""

import http.cookiejar
import json
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

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
    print("=== STARTING COMPLETE DEMO WORKFLOW TEST ===")

    # Step 0: Auth with preview access key
    auth_res = api("/api/auth/google", {"access_key": ACCESS_KEY})
    assert auth_res.get("authenticated") is True, "Authentication failed"
    print("✓ Auth Gate Passed (editor@ilovefinland.net)")

    # Step 0b: Verify Demo Mode Connection Catalog
    conns = api("/api/connections")
    openai_conn = next(c for c in conns["connections"] if c["id"] == "openai")
    print(f"✓ OpenAI Status: {openai_conn['status']} (Configured: {openai_conn['configured']})")
    assert "Demo Mode" in openai_conn["status"] or "Simulated" in openai_conn["status"], "Expected Demo Mode"

    # Step 1: Create article draft & Reel script from sample story + clips
    print("\n--- Step 1: Create Article Draft & Reel Script (Multi-Clip Assignment) ---")
    clip_payload = {
        "title": "Winter Transit in Finland: Tramways to Lapland Wilderness",
        "instructions": (
            "Feature Helsinki green tram navigating snow-covered streets in the opening shot, "
            "then contrast with Lapland arctic snow. Write clear straight-news facts on winter transit reliability."
        ),
        "target_length_sec": 9,
        "audio_mode": "authentic_source_and_music",
        "music_choice": "Nordic Pulse (Ambient Loop)",
        "opening_shot_note": "Clip 1: Helsinki Green Tram Movement",
        "clips": [
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
        ],
    }
    bundle = api("/api/assignments/reel-clips", clip_payload)
    pkg = bundle["package"]
    pkg_id = pkg["id"]
    ver_v1 = bundle["versions"][-1]
    print(f"✓ Created Package ID #{pkg_id}: '{pkg['title']}'")
    print(f"  Version: {ver_v1['version']} | AI Model: {ver_v1['ai_model']}")
    print(f"  Article Headline: {ver_v1['article']['headline']}")
    print(f"  Reel Duration: {ver_v1['reel']['duration_sec']}s across {len(ver_v1['reel']['scenes'])} scenes")
    assert ver_v1["ai_model"] == "OpenAI (Default — Simulated)", f"Unexpected model: {ver_v1['ai_model']}"
    assert pkg["article_status"] == "pending"
    assert pkg["reel_status"] == "pending"

    # Step 2: Edit the Reel directly in the In-Studio Reel Editor
    print("\n--- Step 2: In-Studio Direct Reel Editor Adjustments ---")
    editor_adjustments = {
        "hook_text": "ARCTIC COMMUTE",
        "subtitle_text": "Helsinki trams glide through sub-zero sleet",
        "hook_y_pct": 58,
        "logo_y_pct": 22,
        "logo_size_px": 68,
        "audio_mode": "field_and_nordic",
        "music_volume": 65,
        "field_volume": 90,
        "duration_sec": 9,
    }
    adj_bundle = api("/api/package/adjust-reel", {"package_id": pkg_id, "adjustments": editor_adjustments})
    ver_v2 = adj_bundle["versions"][-1]
    print(f"✓ Reel Editor Changes Saved as Version {ver_v2['version']}")
    print(f"  Change summary: {ver_v2['change_summary']}")
    print(f"  Adjusted Scene 1 Hook: {ver_v2['reel']['scenes'][0]['line1']}")
    print(f"  Adjusted Layout: text_y={ver_v2['reel']['layout']['text_y_pct']}%, logo_size={ver_v2['reel']['layout']['logo_size_px']}px")
    assert ver_v2["version"] == 2
    assert ver_v2["reel"]["scenes"][0]["line1"] == "ARCTIC COMMUTE"

    # Step 3: Request an editorial feedback revision
    print("\n--- Step 3: Request AI Editorial Revision ---")
    rev_payload = {
        "package_id": pkg_id,
        "target": "both",
        "comment": "Add commuter winter tire & foot safety reminder to article body and sharpen Reel scene 2 text.",
    }
    rev_bundle = api("/api/package/comment", rev_payload)
    ver_v3 = rev_bundle["versions"][-1]
    print(f"✓ AI Revision Saved as Version {ver_v3['version']}")
    print(f"  Change summary: {ver_v3['change_summary']}")
    print(f"  Revision Model: {ver_v3['ai_model']}")
    assert ver_v3["version"] == 3
    assert "Applied" in ver_v3["change_summary"] or "Revision" in ver_v3["change_summary"]

    # Step 4: Separate Approvals (Article first, then Reel separately)
    print("\n--- Step 4: Separate Approvals (Article First, Reel Second) ---")
    # 4a: Approve Article
    app_art = api("/api/package/approve", {"package_id": pkg_id, "component": "article", "decision": "approved", "version": 3})
    pkg_art_app = app_art["package"]
    print(f"✓ Article Approved: article_status='{pkg_art_app['article_status']}', reel_status='{pkg_art_app['reel_status']}'")
    assert pkg_art_app["article_status"] == "approved"
    assert pkg_art_app["reel_status"] != "approved", "Reel should not be approved before explicit reel approval"

    # 4b: Approve Reel separately
    app_reel = api("/api/package/approve", {"package_id": pkg_id, "component": "reel", "decision": "approved", "version": 3})
    pkg_both_app = app_reel["package"]
    print(f"✓ Reel Approved Separately: article_status='{pkg_both_app['article_status']}', reel_status='{pkg_both_app['reel_status']}'")
    assert pkg_both_app["article_status"] == "approved"
    assert pkg_both_app["reel_status"] == "approved"

    # Step 5: Confirm Europe/Helsinki Publishing Times & Simulate Scheduling
    print("\n--- Step 5: Confirm Publishing Times (Europe/Helsinki) & Schedule ---")
    hki_tz = timezone(timedelta(hours=2))
    tomorrow_hki = datetime.now(hki_tz) + timedelta(days=1)
    article_publish_hki = tomorrow_hki.strftime("%Y-%m-%dT09:00")
    reel_publish_hki = tomorrow_hki.strftime("%Y-%m-%dT18:00")

    print(f"  Confirmed Target Publishing Times (Europe/Helsinki / EET):")
    print(f"  • Article Draft Scheduled: {article_publish_hki} EET (Helsinki Morning Civic Feed)")
    print(f"  • Vertical Reel Scheduled:  {reel_publish_hki} EET (Helsinki Evening Commute Prime)")

    sched_bundle = api("/api/package/schedule", {
        "package_id": pkg_id,
        "article_publish_at": article_publish_hki,
        "reel_publish_at": reel_publish_hki,
    })
    final_pkg = sched_bundle["package"]
    print(f"✓ Package Scheduled Successfully!")
    print(f"  Article Status: {final_pkg['article_status']} | Reel Status: {final_pkg['reel_status']}")
    print(f"  Scheduled Times Stored: Article at {final_pkg['article_publish_at']}, Reel at {final_pkg['reel_publish_at']}")
    assert final_pkg["article_status"] == "approved"
    assert final_pkg["reel_status"] == "approved"
    assert final_pkg["article_publish_at"] == article_publish_hki
    assert final_pkg["reel_publish_at"] == reel_publish_hki

    # Step 6: Verify in Projects Hub
    print("\n--- Step 6: Verify in Projects & Stories Hub ---")
    projects_res = api("/api/projects")
    project_row = next((p for p in projects_res["projects"] if p["id"] == pkg_id), None)
    assert project_row is not None, "Package not found in projects dashboard"
    print(f"✓ Package Verified in Projects Hub:")
    print(f"  ID: #{project_row['id']} | Title: '{project_row['title']}'")
    print(f"  Pipeline Stage: {project_row['pipeline_stage']} | Badge: {project_row['stage_badge']}")
    print(f"  Version: v{project_row['current_version']}")
    print(f"  Stage Counts: {projects_res['counts']}")
    assert project_row["pipeline_stage"] in ("Scheduled", "Approved & Scheduled")

    print("\n=== ALL WORKFLOW ASSERTIONS PASSED (100% SUCCESS) ===")
    return pkg_id


if __name__ == "__main__":
    run()
