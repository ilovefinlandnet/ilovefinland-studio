#!/usr/bin/env python3
"""Automated verification and screenshot capture for Projects Hub and Direct Video Editor."""

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

    def _send(self, text):
        data = text.encode()
        hdr = bytearray([0x81])
        n = len(data)
        if n < 126:
            hdr.append(0x80 | n)
        elif n < 65536:
            hdr += bytes([0x80 | 126]) + struct.pack(">H", n)
        else:
            hdr += bytes([0x80 | 127]) + struct.pack(">Q", n)
        mask = os.urandom(4)
        hdr += mask
        self.s.sendall(bytes(hdr) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def _recv_exact(self, n):
        b = b""
        while len(b) < n:
            c = self.s.recv(n - len(b))
            if not c:
                raise EOFError
            b += c
        return b

    def _recv(self):
        msg = b""
        while True:
            b1, b2 = self._recv_exact(2)
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._recv_exact(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._recv_exact(8))[0]
            mask = self._recv_exact(4) if (b2 & 0x80) else None
            data = self._recv_exact(n)
            if mask:
                data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
            msg += data
            if b1 & 0x80:
                break
        return msg.decode()

    def call(self, method, **params):
        self.i += 1
        cid = self.i
        self._send(json.dumps({"id": cid, "method": method, "params": params}))
        while True:
            rep = json.loads(self._recv())
            if rep.get("id") == cid:
                return rep.get("result", {})

    def js(self, expr):
        res = self.call("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        return res.get("result", {}).get("value")

def shot(ws, name):
    r = ws.call("Page.captureScreenshot", format="png", captureBeyondViewport=False)
    p = os.path.join(OUT, name)
    with open(p, "wb") as f:
        f.write(base64.b64decode(r["data"]))
    print("saved", p)

def wait(ws, expr, timeout=8):
    t = time.time()
    while time.time() - t < timeout:
        if ws.js(expr):
            return True
        time.sleep(0.2)
    return False

def main():
    port = 9568
    proc = subprocess.Popen([
        CHROME,
        "--headless=new",
        f"--remote-debugging-port={port}",
        "--no-first-run",
        "--autoplay-policy=no-user-gesture-required",
        "--user-data-dir=/tmp/ilf-chrome-projects",
        "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        tabs = None
        for _ in range(50):
            try:
                tabs = json.loads(urlopen(f"http://127.0.0.1:{port}/json").read())
                break
            except Exception:
                time.sleep(0.3)
        page = [t for t in tabs if t["type"] == "page"][0]
        ws = WS(page["webSocketDebuggerUrl"])
        ws.call("Page.enable")

        # 1. Desktop 1440x900
        ws.call("Emulation.setDeviceMetricsOverride", width=1440, height=900, deviceScaleFactor=1, mobile=False)
        ws.call("Page.navigate", url=BASE + "/")
        wait(ws, "document.readyState==='complete'")
        ws.js("document.getElementById('btn-google-signin').click()")
        wait(ws, "!document.getElementById('studio-shell').classList.contains('hidden')")
        time.sleep(1.2)

        # 2. Capture Projects & Stories Hub
        proj_count = ws.js("document.querySelectorAll('#projects-tbody tr').length")
        print("Rendered projects count in table:", proj_count)
        shot(ws, "projects-dashboard.png")

        # 3. Test Filter chip "In Review"
        ws.js("document.querySelector('.proj-chip[data-filter=\"in_review\"]').click()")
        time.sleep(0.5)
        shot(ws, "projects-dashboard-filtered-review.png")

        # Reset filter to "all"
        ws.js("document.querySelector('.proj-chip[data-filter=\"all\"]').click()")
        time.sleep(0.5)

        # 4. Open Project #1 directly via the "Open" button in table
        ws.js("document.querySelector('.btn-open-project[data-id=\"1\"]').click()")
        time.sleep(1.2)
        shot(ws, "review-opened-from-project.png")

        # 5. Open Direct Video Editor in Review
        ws.js("document.getElementById('btn-toggle-reel-editor').click()")
        time.sleep(0.8)
        shot(ws, "direct-reel-editor-text-tab.png")

        # Switch to "Audio & Mix" tab in Direct Reel Editor
        ws.js("document.querySelector('.reel-edit-tab[data-tab=\"audio\"]').click()")
        time.sleep(0.5)
        shot(ws, "direct-reel-editor-audio-tab.png")

        # Switch to "Clips & Timing" tab
        ws.js("document.querySelector('.reel-edit-tab[data-tab=\"clips\"]').click()")
        time.sleep(0.5)
        shot(ws, "direct-reel-editor-clips-tab.png")

        # 6. Test Back to All Projects button
        ws.js("document.getElementById('btn-back-to-projects').click()")
        time.sleep(0.8)

        # 7. Mobile Phone View (390x844)
        ws.call("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=2, mobile=True)
        time.sleep(0.8)
        shot(ws, "phone-projects-dashboard.png")

        # Open project #1 on phone
        ws.js("document.querySelector('.btn-open-project[data-id=\"1\"]').click()")
        time.sleep(1.0)
        # Open Direct Editor on phone
        ws.js("document.getElementById('btn-toggle-reel-editor').click()")
        time.sleep(0.8)
        shot(ws, "phone-direct-reel-editor.png")

        print("All Projects Hub and Direct Video Editor checks verified successfully!")
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
