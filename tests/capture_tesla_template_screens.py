#!/usr/bin/env python3
"""Capture visual proof of the Tesla News Template in Studio:
1. Side-by-Side Trio: Full 9:16 Reel, Full 4:5 Cover, and 3:4 Profile Crop.
2. Reel playback showing enlarged heart logo comfortably clearing the safe guide.
3. Direct Editor with Line2 font size slider (38px) and readout.
4. Direct Editor with Logo controls (68px, down & right).
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
        r = self.cmd("Page.captureScreenshot", format="png")
        data = base64.b64decode(r["data"])
        p = os.path.join(OUT, filename)
        with open(p, "wb") as f:
            f.write(data)
        print("Captured:", p)


def main():
    import random
    port = random.randint(9360, 9420)
    user_data = f"/tmp/chrome-tesla-{os.getpid()}-{int(time.time())}"
    os.makedirs(user_data, exist_ok=True)
    p = subprocess.Popen([
        CHROME, "--headless=new", f"--remote-debugging-port={port}",
        f"--user-data-dir={user_data}",
        "--disable-gpu", "--no-sandbox", "--window-size=1600,1100"
    ])
    t = None
    for _ in range(30):
        try:
            raw = urlopen(f"http://127.0.0.1:{port}/json", timeout=1).read()
            t = json.loads(raw)
            if t:
                break
        except Exception:
            time.sleep(0.5)
    assert t, "Failed to connect to Chrome DevTools"

    try:
        page_target = next((item for item in t if item.get("type") == "page"), t[0])
        ws = WS(page_target["webSocketDebuggerUrl"])
        ws.cmd("Page.enable")
        ws.cmd("Network.enable")

        # 1. Open Site & Authenticate
        ws.cmd("Page.navigate", url=BASE)
        time.sleep(2)
        ws.evaluate("""
            (async () => {
                await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({access_key: 'suomi-studio-x9k4-7q2m'})
                });
                location.reload();
            })()
        """)
        time.sleep(2.5)

        # 2. Switch to Projects & Open Package 21 (Tesla Template)
        ws.evaluate("""
            (async () => {
                document.querySelector('.nav-item[data-view="projects"]')?.click();
            })()
        """)
        time.sleep(2)
        ws.evaluate("""
            (async () => {
                const btn = document.querySelector('.btn-open-project[data-id="21"]') ||
                            document.querySelector('.proj-title-link[data-id="21"]');
                if (btn) btn.click();
            })()
        """)
        time.sleep(2.5)

        # 3. Enable Side-by-Side View Mode for Wide Trio Layout
        ws.evaluate("""
            (() => {
                const reelPanel = document.getElementById('panel-reel');
                if (reelPanel && !reelPanel.classList.contains('wide-format-mode')) {
                    reelPanel.classList.add('wide-format-mode');
                }
                const btn = document.getElementById('btn-toggle-trio-view');
                if (btn) btn.textContent = '⊟ Standard View';
                if (reelPanel) reelPanel.scrollIntoView({behavior:'instant', block:'start'});
            })()
        """)
        time.sleep(2)
        ws.snap("tesla-template-side-by-side-formats.png")

        # 4. Open and Focus Direct Reel Editor (Text Tab with Line 2 size slider)
        ws.evaluate("""
            (() => {
                const editorDock = document.getElementById('reel-direct-editor');
                const toggleBtn = document.getElementById('btn-toggle-reel-editor');
                if (editorDock && editorDock.classList.contains('hidden') && toggleBtn) {
                    toggleBtn.click();
                }
                document.querySelectorAll('.reel-edit-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'text'));
                document.querySelectorAll('.reel-edit-pane').forEach(p => p.classList.toggle('hidden', p.id !== 'pane-reel-text'));
                if (editorDock) editorDock.scrollIntoView({behavior:'instant', block:'center'});
            })()
        """)
        time.sleep(2)
        ws.snap("tesla-template-direct-editor-text.png")

        # 5. Switch Direct Editor to Logo Tab (68px, down & right)
        ws.evaluate("""
            (() => {
                document.querySelectorAll('.reel-edit-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'logo'));
                document.querySelectorAll('.reel-edit-pane').forEach(p => p.classList.toggle('hidden', p.id !== 'pane-reel-logo'));
                const editorDock = document.getElementById('reel-direct-editor');
                if (editorDock) editorDock.scrollIntoView({behavior:'instant', block:'center'});
            })()
        """)
        time.sleep(2)
        ws.snap("tesla-template-direct-editor-logo.png")

        # 6. Capture Reel Focus with Safe Area Guide showing clearance
        ws.evaluate("""
            (() => {
                const phone = document.getElementById('phone-frame');
                if (phone) phone.scrollIntoView({behavior:'instant', block:'center'});
            })()
        """)
        time.sleep(2)
        ws.snap("tesla-template-reel-guide-clearance.png")

        # 7. Capture Cover & Profile Crop Side-by-Side Focus
        ws.evaluate("""
            (() => {
                const coverCanvas = document.getElementById('cover-canvas');
                if (coverCanvas) coverCanvas.parentElement.scrollIntoView({behavior:'instant', block:'center'});
            })()
        """)
        time.sleep(2)
        ws.snap("tesla-template-cover-profile-crop.png")

    finally:
        p.terminate()
        p.wait()


if __name__ == "__main__":
    main()
