#!/usr/bin/env python3
"""Capture high-resolution visual proof of the complete ILoveFinland Studio Editorial Suite:
1. WordPress Article Form matching ilovefinland.net field order, visual/code views, downloads, copy controls.
2. Static Social Post Editor (1080×1350 dual canvas preview, restored opaque river logo, 3:4 crop).
3. On-Demand Reel Generator with 2s hook analysis, music recommendations, and human voiceover badge.
4. Daily Editorial Research rotating across core verticals and trend signals from comparable Nordic accounts.
5. Top 3 Priorities for Limited Resources in Plan My Week.
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
OUT = "/Users/binod721/.gemini/antigravity/brain/a0dbb212-db32-47b4-a483-aba8450fc174/screens"
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

    u_dir = f"/tmp/ch_ilf_{int(time.time())}"
    proc = subprocess.Popen([
        CHROME,
        "--headless=new",
        "--remote-debugging-port=9445",
        f"--user-data-dir={u_dir}",
        "--window-size=1440,1100",
        "--disable-gpu",
        "about:blank"
    ])
    time.sleep(1.8)

    try:
        tabs = json.loads(urlopen("http://127.0.0.1:9445/json").read())
        ws_url = tabs[0]["webSocketDebuggerUrl"]
        ws = WS(ws_url)

        # Set session cookie before navigation
        ws.cmd("Network.enable")
        ws.cmd("Network.setCookie", name="ilf_studio_session", value=cookie_val, domain="127.0.0.1", path="/")

        # Navigate to Studio
        ws.cmd("Page.navigate", url=f"{BASE}/")
        time.sleep(2.5)

        # 2. Open Package #26 (Sauna & Ice Swimming assignment) or #21 (Tesla News)
        ws.evaluate("""
            window.loadPackage(26);
            window.switchView('review');
        """)
        time.sleep(2.5)

        # Screen 1: WordPress Article Form
        ws.evaluate("""
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('tab-btn-article')?.classList.add('active');
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-mobile'));
            document.getElementById('panel-article')?.classList.add('active-mobile');
            document.getElementById('panel-article')?.scrollIntoView({ behavior: 'instant', block: 'start' });
        """)
        time.sleep(1.2)
        ws.snap("editorial-wordpress-article-form.png")

        # Screen 2: Static Social Post Editor (1080×1350 dual canvas preview)
        ws.evaluate("""
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('tab-btn-ig')?.classList.add('active');
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-mobile'));
            const panel = document.getElementById('panel-ig');
            panel.classList.remove('hidden');
            panel.classList.add('active-mobile');
            panel.scrollIntoView({ behavior: 'instant', block: 'start' });
        """)
        time.sleep(1.5)
        ws.snap("editorial-static-post-dual-canvas.png")

        # Screen 3: Vertical Reel Workspace (with 2s hook analysis, music alternatives, voiceover badge)
        ws.evaluate("""
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('tab-btn-reel')?.classList.add('active');
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-mobile'));
            const panel = document.getElementById('panel-reel');
            panel.classList.remove('hidden');
            panel.classList.add('active-mobile');
            panel.scrollIntoView({ behavior: 'instant', block: 'start' });
        """)
        time.sleep(1.5)
        ws.snap("editorial-reel-workspace-and-audio.png")

        # Screen 4: Research View (Daily Review & Nordic Account Trends)
        ws.evaluate("""
            window.switchView('research');
            window.loadResearch();
        """)
        time.sleep(2.0)
        ws.snap("editorial-daily-research-and-trends.png")

        # Screen 5: Plan My Week (Top 3 Priorities for Limited Resources)
        ws.evaluate("""
            window.switchView('calendar');
            window.loadWeeklyPlan();
        """)
        time.sleep(2.0)
        ws.snap("editorial-weekly-plan-priorities.png")

        print("All editorial screenshots successfully captured!")

    finally:
        proc.terminate()
        proc.wait()


if __name__ == "__main__":
    main()
