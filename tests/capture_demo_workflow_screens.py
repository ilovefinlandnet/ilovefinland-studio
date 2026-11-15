#!/usr/bin/env python3
"""Capture visual proof of the complete demo workflow in Chrome."""

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
    user_data = "/tmp/chrome-demo-profile"
    p = subprocess.Popen([
        CHROME, "--headless=new", "--remote-debugging-port=9344",
        f"--user-data-dir={user_data}",
        "--disable-gpu", "--no-sandbox", "--window-size=1440,1050"
    ])
    t = None
    for _ in range(20):
        try:
            raw = urlopen("http://127.0.0.1:9344/json", timeout=1).read()
            t = json.loads(raw)
            if t:
                break
        except Exception:
            time.sleep(0.5)
    assert t, "Failed to connect to Chrome DevTools"
    try:
        ws = WS(t[0]["webSocketDebuggerUrl"])
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
        time.sleep(2)

        # 2. View Projects & Stories Hub
        ws.evaluate("document.querySelector('.nav-item[data-view=\"projects\"]')?.click()")
        time.sleep(2)
        ws.snap("demo-projects-hub.png")

        # 3. Switch to Review & Revisions
        ws.evaluate("document.querySelector('.nav-item[data-view=\"review\"]')?.click()")
        time.sleep(2)
        ws.snap("demo-review-approved-package.png")

        # 4. Scroll to Direct Reel Editor
        ws.evaluate("""
            const el = document.getElementById('reel-direct-editor');
            if (el) el.scrollIntoView({behavior:'instant', block:'center'});
        """)
        time.sleep(1.5)
        ws.snap("demo-direct-reel-editor.png")

        # 5. Switch to Connections View
        ws.evaluate("document.querySelector('.nav-item[data-view=\"connections\"]')?.click()")
        time.sleep(1.5)
        ws.snap("demo-connections-mode.png")

    finally:
        p.terminate()
        p.wait()


if __name__ == "__main__":
    main()
