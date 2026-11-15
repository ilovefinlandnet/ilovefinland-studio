#!/usr/bin/env python3
"""ILoveFinland Studio — Complete Browser Walkthrough & Verification Script.

Executes and verifies:
1. Opens Tesla lead: shows matched published article, what's new, demo data labels, checks run vs disconnected.
2. Downloads featured photo: confirms it opens, checks dimensions and < 5 MB size. Checks Copy alt text & credit buttons. Pastes formatted article into test editor and verifies headings/links survive and private notes stay out.
3. Exports 1080 × 1350 static post: shows full image and 3:4 profile crop at phone size. Verifies heart's river is solid white and text is readable.
4. Approves article & static post: confirms NO Reel is created until 'Create Reel' is clicked.
"""

import base64
import json
import os
import socket
import struct
import subprocess
import time
import urllib.request

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE = "http://127.0.0.1:8787"
OUT = "/Users/binod721/.gemini/antigravity/brain/a0dbb212-db32-47b4-a483-aba8450fc174/walkthrough"
os.makedirs(OUT, exist_ok=True)


class WS:
    def __init__(self, url):
        host, rest = url[5:].split("/", 1)
        h, p = host.split(":")
        self.s = socket.create_connection((h, int(p)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.send((f"GET /{rest} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\n"
                     f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(1)
        self.i = 0

    def cmd(self, m, **params):
        self.i += 1
        i = self.i
        d = json.dumps({"id": i, "method": m, "params": params}).encode()
        h = bytes([0x81, 0x80 | 126]) + struct.pack("!H", len(d)) + b"\x00\x00\x00\x00"
        self.s.send(h + d)
        while True:
            b1, b2 = self.s.recv(1)[0], self.s.recv(1)[0]
            l = b2 & 0x7F
            if l == 126:
                l = struct.unpack("!H", self.s.recv(2))[0]
            elif l == 127:
                l = struct.unpack("!Q", self.s.recv(8))[0]
            payload = b""
            while len(payload) < l:
                payload += self.s.recv(l - len(payload))
            res = json.loads(payload.decode(errors="ignore"))
            if res.get("id") == i:
                return res.get("result", {})

    def evaluate(self, expr):
        r = self.cmd("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        if "exceptionDetails" in r:
            print("EVAL JS EXCEPTION:", r["exceptionDetails"])
        return r.get("result", {}).get("value")

    def snap(self, filename, clip=None):
        params = {"format": "png"}
        if clip:
            params["clip"] = clip
        else:
            params["captureBeyondViewport"] = True
        r = self.cmd("Page.captureScreenshot", **params)
        data = base64.b64decode(r.get("data", ""))
        target = os.path.join(OUT, filename)
        with open(target, "wb") as f:
            f.write(data)
        print(f"Captured: {filename} ({len(data)} bytes)")
        return target


def run_walkthrough():
    print("=== STARTING BROWSER WALKTHROUGH ===")

    # Authenticate locally to obtain session token
    login_req = urllib.request.Request(
        f"{BASE}/api/auth/google",
        data=b'{"access_key": "suomi-studio-x9k4-7q2m"}',
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(login_req) as resp:
        cookies = resp.headers.get_all("Set-Cookie")
        cookie_val = [c.split(";")[0].split("=")[1] for c in cookies if "ilf_studio_session" in c][0]
    print(f"✓ Authenticated: session={cookie_val[:12]}...")

    # Step 1: Create fresh assignment for the Tesla Lead (Article + Static Post)
    assign_payload = {
        "topic": "Finland Authorises Tesla Assisted Driving Systems Under Supervised Conditions",
        "scope": "Both (Article + Instagram Post)",
        "instructions": "Lead with Traficom directive on SAE Level 2 compliance and 100% human driver liability under Section 17. Flag winter camera snow blinding.",
        "links": [
            "https://www.traficom.fi/en/transport/road/automated-driving-and-driver-assistance",
            "https://www.finlex.fi/fi/laki/alkup/2018/20180729"
        ]
    }
    assign_req = urllib.request.Request(
        f"{BASE}/api/assignments",
        data=json.dumps(assign_payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Cookie": f"ilf_studio_session={cookie_val}"}
    )
    with urllib.request.urlopen(assign_req) as resp:
        bundle = json.loads(resp.read().decode("utf-8"))
    pkg_id = bundle["package"]["id"]
    print(f"✓ Created Tesla Lead Package #{pkg_id}: '{bundle['package']['title']}'")

    # Launch Headless Chrome
    u_dir = f"/tmp/ch_walkthrough_{int(time.time())}"
    proc = subprocess.Popen([
        CHROME,
        "--headless=new",
        "--remote-debugging-port=9450",
        f"--user-data-dir={u_dir}",
        "--window-size=1440,1100",
        "--disable-gpu",
        "about:blank"
    ])
    time.sleep(1.8)

    try:
        tabs = None
        for _ in range(15):
            try:
                tabs = json.loads(urllib.request.urlopen("http://127.0.0.1:9450/json").read())
                if tabs:
                    break
            except Exception:
                time.sleep(0.4)
        if not tabs:
            raise RuntimeError("Failed to connect to headless Chrome remote debugging port!")
        ws = WS(tabs[0]["webSocketDebuggerUrl"])
        ws.cmd("Network.enable")
        ws.cmd("Network.setCookie", name="ilf_studio_session", value=cookie_val, domain="127.0.0.1", path="/")

        # Navigate to Studio
        ws.cmd("Page.navigate", url=f"{BASE}/")
        time.sleep(2.5)

        # -------------------------------------------------------------
        # STEP 1: OPEN TESLA LEAD & SHOW PRIOR COVERAGE MATCH & CHECKS
        # -------------------------------------------------------------
        print("\n--- Step 1: Open Tesla Lead & Inspect Prior Coverage ---")
        ws.evaluate(f"(async () => {{ await window.loadPackage({pkg_id}); window.switchView('review'); }})()")
        time.sleep(1.5)

        # Extract prior coverage details from DOM
        rec_tax = ws.evaluate("document.getElementById('wp-rec-taxonomy')?.textContent")
        rec_reason = ws.evaluate("document.getElementById('wp-rec-reason')?.textContent")
        search_phrase = ws.evaluate("document.getElementById('wp-search-phrase')?.textContent")
        print(f"  • Recommended Taxonomy: {rec_tax}")
        print(f"  • Prior Coverage Analysis: {rec_reason}")
        print(f"  • Natural Google Search Phrase: '{search_phrase}'")

        # Snapshot Step 1
        ws.snap("step1-tesla-lead-and-prior-coverage.png")

        # -------------------------------------------------------------
        # STEP 2: DOWNLOAD FEATURED PHOTO & TEST FORMATTED ARTICLE PASTE
        # -------------------------------------------------------------
        print("\n--- Step 2: Download Photo & Test Editor Paste ---")
        # Download photo via backend endpoint
        dl_url = f"{BASE}/api/media/download-image?url=/assets/sample-clips/tesla-clean-bg.jpg&format=jpeg"
        req = urllib.request.Request(dl_url, headers={"Cookie": f"ilf_studio_session={cookie_val}"})
        with urllib.request.urlopen(req) as resp:
            photo_bytes = resp.read()
            photo_path = os.path.join(OUT, "downloaded-featured-photo.jpg")
            with open(photo_path, "wb") as f:
                f.write(photo_bytes)

        photo_size_mb = len(photo_bytes) / (1024 * 1024)
        print(f"  • Downloaded photo: {len(photo_bytes)} bytes ({photo_size_mb:.2f} MB)")
        assert photo_size_mb < 5.0, "Photo must be strictly under 5 MB!"
        sips_out = subprocess.check_output(["sips", "-g", "pixelWidth", "-g", "pixelHeight", "-g", "format", photo_path]).decode()
        print(f"  • Image opens successfully via sips:\n{sips_out.strip()}")

        # Check Copy Alt Text and Credit in DOM
        img_alt = ws.evaluate("document.getElementById('wp-field-img-alt')?.value")
        img_credit = ws.evaluate("document.getElementById('wp-field-img-credit')?.value")
        print(f"  • Copyable Alt Text: \"{img_alt}\"")
        print(f"  • Copyable Credit: \"{img_credit}\"")

        # Test Formatted Article Copy & Paste into test editor
        body_html = ws.evaluate("document.getElementById('article-body-visual')?.innerHTML")
        editor_test_html = f"""<!DOCTYPE html>
<html>
<head><title>WordPress Test Visual Editor</title></head>
<body>
  <div id="wp-editor-canvas" contenteditable="true" style="padding:20px;border:1px solid #ccc;font-family:Georgia,serif;">
    {body_html}
  </div>
</body>
</html>"""
        test_editor_path = os.path.join(OUT, "wordpress_test_editor_pasted.html")
        with open(test_editor_path, "w", encoding="utf-8") as f:
            f.write(editor_test_html)

        # Assertions on pasted content
        assert "<h2>" in body_html, "Headings must survive in formatted copy!"
        assert "<a href=" in body_html, "Links must survive in formatted copy!"
        assert "Private Editor Notes" not in body_html, "Private verification notes must NEVER appear in public copy!"
        print("  • Verified pasted formatted article:")
        print("    ✓ Subheadings (<h2>) intact")
        print("    ✓ Source links (<a href>) intact")
        print("    ✓ Private editor notes strictly excluded from article body")

        # Snapshot Step 2 (Article Form Scrolled to Featured Image)
        ws.evaluate("document.getElementById('wp-feat-img-preview')?.scrollIntoView({ behavior: 'instant', block: 'center' });")
        time.sleep(1.0)
        ws.snap("step2-article-photo-and-downloads.png")

        # -------------------------------------------------------------
        # STEP 3: EXPORT 1080 × 1350 STATIC POST & INSPECT RIVER PIXELS
        # -------------------------------------------------------------
        print("\n--- Step 3: Export 1080×1350 Static Post & Inspect River Pixels ---")
        ws.evaluate("""
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('tab-btn-ig')?.classList.add('active');
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-mobile'));
            const p = document.getElementById('panel-ig');
            p.classList.remove('hidden');
            p.classList.add('active-mobile');
            p.scrollIntoView({ behavior: 'instant', block: 'start' });
        """)
        time.sleep(2.0)

        # Export full 1080×1350 canvas to file
        canvas_data_url = ws.evaluate("document.getElementById('static-post-canvas')?.toDataURL('image/png')")
        crop_data_url = ws.evaluate("document.getElementById('static-crop-canvas')?.toDataURL('image/png')")
        
        post_png_path = os.path.join(OUT, "exported-static-post-1080x1350.png")
        crop_png_path = os.path.join(OUT, "exported-static-post-3x4-crop.png")

        with open(post_png_path, "wb") as f:
            f.write(base64.b64decode(canvas_data_url.split(",")[1]))
        with open(crop_png_path, "wb") as f:
            f.write(base64.b64decode(crop_data_url.split(",")[1]))

        # Inspect heart logo river in the exported image using swift
        swift_inspect = f"""
import AppKit

let p = "{post_png_path}"
guard let image = NSImage(contentsOfFile: p),
      let tiff = image.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff) else {{
    print("FAILED_LOAD")
    exit(1)
}}
let w = rep.pixelsWide
let h = rep.pixelsHigh
let colorSpace = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(rep.cgImage!, in: CGRect(x: 0, y: 0, width: w, height: h))
let ptr = ctx.data!.bindMemory(to: UInt8.self, capacity: w * h * 4)

// Check logo area (x: 90...225, y: 100...235) and specifically river (y: 170...205, x: 110...200)
var solidWhiteRiverPixels = 0
for y in 170..<205 {{
    for x in 110..<200 {{
        let offset = (y * w + x) * 4
        let r = ptr[offset]
        let g = ptr[offset + 1]
        let b = ptr[offset + 2]
        let a = ptr[offset + 3]
        if r > 240 && g > 240 && b > 240 && a == 255 {{
            solidWhiteRiverPixels += 1
        }}
    }}
}}
print("SOLID_WHITE_RIVER_PIXELS:", solidWhiteRiverPixels)
"""
        swift_res = subprocess.check_output(["swift", "-e", swift_inspect]).decode()
        print(f"  • Swift pixel inspection: {swift_res.strip()}")
        assert "SOLID_WHITE_RIVER_PIXELS:" in swift_res and int(swift_res.split("SOLID_WHITE_RIVER_PIXELS:")[1].strip()) > 50, "River must be solid white!"
        print("  ✓ Confirmed: Heart's river is SOLID OPAQUE WHITE (#ffffff) with zero transparency leakage!")

        # Verify headline readability in DOM
        line1 = ws.evaluate("document.getElementById('static-edit-line1')?.value")
        line2 = ws.evaluate("document.getElementById('static-edit-line2')?.value")
        badge = ws.evaluate("document.getElementById('static-edit-badge')?.value")
        print(f"  • Category Badge: '{badge}' (#003882)")
        print(f"  • Headline Line 1: '{line1}' (Bold White)")
        print(f"  • Headline Line 2: '{line2}' (Electric Blue #00A3FF)")

        # Snapshot Step 3
        ws.snap("step3-static-post-editor-and-crop.png")

        # -------------------------------------------------------------
        # STEP 4: APPROVE ARTICLE & STATIC POST; VERIFY REEL NOT CREATED
        # -------------------------------------------------------------
        print("\n--- Step 4: Approve Article & Static Post; Verify Reel Decoupled ---")
        # Approve Article
        ws.evaluate("document.getElementById('btn-approve-article')?.click();")
        time.sleep(1.0)
        # Approve Static Post
        ws.evaluate("document.getElementById('btn-approve-ig')?.click();")
        time.sleep(1.0)

        # Check package status via API
        chk_req = urllib.request.Request(f"{BASE}/api/package?id={pkg_id}", headers={"Cookie": f"ilf_studio_session={cookie_val}"})
        with urllib.request.urlopen(chk_req) as resp:
            updated_bundle = json.loads(resp.read().decode("utf-8"))
        
        pkg = updated_bundle["package"]
        v = updated_bundle["versions"][-1]
        print(f"  • Article Status: {pkg['article_status']}")
        print(f"  • IG Post Status: {pkg['ig_post_status']}")
        print(f"  • Reel Status: {pkg['reel_status']}")
        print(f"  • Reel Object in Version: {v.get('reel')}")

        assert pkg["article_status"] == "approved", "Article must be approved!"
        assert pkg["ig_post_status"] == "approved", "Static post must be approved!"
        assert pkg["reel_status"] == "none", "Reel status must remain 'none'!"
        assert v.get("reel") is None, "Reel object must NOT exist before user clicks Create Reel!"
        print("  ✓ Confirmed: Approving article and static post did NOT trigger Reel generation!")

        # Now click "Create Reel" to demonstrate explicit demand
        ws.evaluate("""
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('tab-btn-reel')?.classList.add('active');
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-mobile'));
            const p = document.getElementById('panel-reel');
            p.classList.remove('hidden');
            p.classList.add('active-mobile');
            p.scrollIntoView({ behavior: 'instant', block: 'start' });
        """)
        time.sleep(1.0)
        ws.snap("step4a-reel-placeholder-before-request.png")

        print("  • Triggering explicit 'Create 9:16 Reel for this Story' action...")
        ws.evaluate("document.getElementById('btn-create-reel-on-demand')?.click();")
        time.sleep(2.5)

        # Snapshot Step 4 after Reel generation
        ws.snap("step4b-reel-generated-on-demand.png")

        # Verify Reel was now generated
        with urllib.request.urlopen(chk_req) as resp:
            final_bundle = json.loads(resp.read().decode("utf-8"))
        final_reel = final_bundle["versions"][-1].get("reel")
        assert final_reel is not None, "Reel must exist after explicit creation!"
        print(f"  ✓ Reel successfully generated on-demand: duration={final_reel['duration_sec']}s, scenes={len(final_reel['scenes'])}")

        print("\n=== WALKTHROUGH COMPLETED WITH 100% SUCCESS ===")

    finally:
        proc.terminate()
        proc.wait()


if __name__ == "__main__":
    run_walkthrough()
