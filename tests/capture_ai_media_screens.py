#!/usr/bin/env python3
"""Capture high-resolution visual proof of the new AI Media Studio in ILoveFinland Studio:
1. AI Media Studio Navigation & Controls (Modes, Models, Finnish presets, Cost estimate & gate).
2. Clean Photo vs Stage 2 Branded Graphic dual output.
3. Integration with WordPress Article Form and Ethical Provenance Notice.
"""

import base64
import json
import os
import socket
import struct
import subprocess
import time
from urllib.request import urlopen

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE = "http://127.0.0.1:8787"
OUT = "/Users/binod721/.gemini/antigravity/brain/a0dbb212-db32-47b4-a483-aba8450fc174/ai_media_screens"
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
        return self.cmd("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True).get("result", {}).get("value")

    def snap(self, filename):
        r = self.cmd("Page.captureScreenshot", format="png", captureBeyondViewport=True)
        data = base64.b64decode(r.get("data", ""))
        target = os.path.join(OUT, filename)
        with open(target, "wb") as f:
            f.write(data)
        print(f"Captured: {filename} ({len(data)} bytes)")
        return target


def main():
    # 1. Obtain session token directly via local API
    import urllib.request
    login_req = urllib.request.Request(
        f"{BASE}/api/auth/google",
        data=b'{"access_key": "suomi-studio-x9k4-7q2m"}',
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(login_req) as resp:
        cookies = resp.headers.get_all("Set-Cookie")
        cookie_val = [c.split(";")[0].split("=")[1] for c in cookies if "ilf_studio_session" in c][0]
    print("Obtained session token:", cookie_val)

    port = 9452
    u_dir = f"/tmp/ch_ai_{int(time.time())}"
    chrome_proc = subprocess.Popen([
        CHROME,
        "--headless=new",
        f"--remote-debugging-port={port}",
        f"--user-data-dir={u_dir}",
        "--window-size=1440,1100",
        "--disable-gpu",
        "about:blank"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.0)

    try:
        raw = urlopen(f"http://127.0.0.1:{port}/json", timeout=5).read()
        ws_url = json.loads(raw)[0]["webSocketDebuggerUrl"]
        ws = WS(ws_url)

        ws.cmd("Page.enable")
        ws.cmd("DOM.enable")
        ws.cmd("Network.enable")
        ws.cmd("Network.setCookie", name="ilf_studio_session", value=cookie_val, domain="127.0.0.1", path="/")
        ws.cmd("Emulation.setDeviceMetricsOverride", width=1440, height=1100, deviceScaleFactor=2, mobile=False)

        # 1. Open Studio
        ws.cmd("Page.navigate", url=f"{BASE}/")
        time.sleep(2.5)

        # Override window.alert to prevent blocking dialogs
        ws.evaluate("""
            window.alert = (msg) => console.log('ALERT:', msg);
            window.loadPackage(26);
        """)
        time.sleep(1.0)

        # 2. Switch to AI Media Studio
        ws.evaluate("""
            window.switchView('ai-media');
        """)
        time.sleep(1.5)

        # Set values to showcase the Winter Tyres in Finland setup
        ws.evaluate("""
            document.getElementById('ai-prompt-input').value = 'Close-up of studded winter tyre (nastarenkaat) rolling on snow-packed road in Lapland, low winter sunset light, crisp tread texture and metal studs visible';
            document.getElementById('ai-model-select').value = 'imagen-3.0-generate-002';
            document.getElementById('ai-env-select').value = 'winter_subzero';
            document.getElementById('ai-camera-select').value = 'macro_100mm';
            window.updateAiCostDisplay();
        """)
        time.sleep(0.5)

        ws.snap("01_ai_media_studio_controls_configured.png")

        # 3. Trigger generation in Studio UI
        print("Triggering AI generation via UI...")
        ws.evaluate("""
            document.getElementById('btn-ai-generate').click();
        """)

        # Poll until generation completes (check if ai-result-clean-img has src)
        for i in range(40):
            time.sleep(0.5)
            done = ws.evaluate("""
                const img = document.getElementById('ai-result-clean-img');
                img && img.src && img.src.length > 20 && !img.parentElement.parentElement.classList.contains('hidden');
            """)
            if done:
                print(f"UI Generation completed successfully after {(i+1)*0.5}s!")
                break

        time.sleep(1.0)
        # Snapshot dual preview
        ws.snap("02_ai_media_studio_dual_preview_results.png")

        # Toggle to show branded version
        ws.evaluate("""
            const brandedBtn = document.getElementById('btn-show-branded');
            if (brandedBtn) brandedBtn.click();
        """)
        time.sleep(0.8)
        ws.snap("02b_ai_media_studio_branded_preview.png")

        # 4. Click "Set as Article Featured Photo" to test seamless workflow handoff
        print("Clicking Apply to Article Featured Photo...")
        ws.evaluate("""
            const btn = document.getElementById('ai-btn-apply-to-featured');
            if (btn) btn.click();
        """)
        time.sleep(2.0)

        # We are now in review view; ensure article tab is active
        ws.evaluate("""
            const tabBtn = document.getElementById('tab-btn-article');
            if (tabBtn) tabBtn.click();
        """)
        time.sleep(1.0)
        ws.snap("03_article_form_with_ai_featured_photo.png")

        # 5. Switch to Static Post tab to show AI asset in 1080x1350 canvas
        print("Testing Static Post Editor handoff...")
        ws.evaluate("""
            const igTab = document.getElementById('tab-btn-ig');
            if (igTab) igTab.click();
        """)
        time.sleep(1.5)
        ws.snap("04_static_post_editor_with_ai_background.png")

        print("All visual proof screens captured successfully!")

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except Exception:
            chrome_proc.kill()


if __name__ == "__main__":
    main()
