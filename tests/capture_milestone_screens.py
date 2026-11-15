#!/usr/bin/env python3
"""Capture high-resolution screenshots for the milestone features."""

import base64
import json
import os
import socket
import struct
import subprocess
import time
from urllib.request import Request, urlopen

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
    proc = subprocess.Popen([
        CHROME,
        "--headless=new",
        "--remote-debugging-port=9334",
        "--no-first-run",
        "--autoplay-policy=no-user-gesture-required",
        "--user-data-dir=/tmp/ilf-chrome-milestone",
        "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        tabs = None
        for _ in range(50):
            try:
                tabs = json.loads(urlopen("http://127.0.0.1:9334/json").read())
                break
            except Exception:
                time.sleep(0.3)
        page = [t for t in tabs if t["type"] == "page"][0]
        ws = WS(page["webSocketDebuggerUrl"])
        ws.call("Page.enable")

        # 1. Desktop - 1440x900
        ws.call("Emulation.setDeviceMetricsOverride", width=1440, height=900, deviceScaleFactor=1, mobile=False)
        ws.call("Page.navigate", url=BASE + "/")
        wait(ws, "document.readyState==='complete'")
        ws.js("document.getElementById('btn-google-signin').click()")
        wait(ws, "!document.getElementById('studio-shell').classList.contains('hidden')")
        time.sleep(0.8)

        # 2. Upload Clips View (Assignments Tab)
        ws.js("document.getElementById('nav-assignments').click()")
        time.sleep(0.5)
        # Click "Load 2 Demo Clips (Tram & Lapland)"
        ws.js("document.getElementById('btn-load-demo-clips').click()")
        time.sleep(0.8)
        shot(ws, "desktop-assignments-upload-clips.png")

        # 3. Calendar View (Week view with Plan My Week & Overlaps)
        ws.js("document.getElementById('nav-calendar').click()")
        time.sleep(0.8)
        shot(ws, "desktop-calendar-week-plan.png")

        # 4. Review Queue with Multi-Clip Reel (Package 4: Winter Transit)
        ws.js("document.getElementById('nav-review').click()")
        time.sleep(0.5)
        # Select package 4 (Winter Transit)
        ws.js("""(()=>{
          const sel = document.getElementById('package-select');
          if (sel) {
            for (let opt of sel.options) {
              if (opt.text.includes('Winter Transit') || opt.value.includes('helsinki-winter-contrast')) {
                sel.value = opt.value;
                sel.dispatchEvent(new Event('change'));
                break;
              }
            }
          }
        })()""")
        time.sleep(1.0)
        shot(ws, "desktop-review-multi-clip-checks.png")

        # 5. Connections View
        ws.js("document.getElementById('nav-connections').click()")
        time.sleep(0.5)
        # Click Test OpenAI
        ws.js("const btn = document.querySelector('.btn-test-conn[data-conn=\"openai\"]'); if (btn) btn.click();")
        time.sleep(0.5)
        shot(ws, "desktop-connections-settings.png")

        # 6. Research View (Source Search)
        ws.js("document.getElementById('nav-research').click()")
        time.sleep(0.5)
        ws.js("""(()=>{
          const inp = document.getElementById('source-search-input');
          if (inp) {
            inp.value = 'FMI';
            inp.dispatchEvent(new Event('input'));
          }
        })()""")
        time.sleep(0.8)
        shot(ws, "desktop-research-sources.png")

        # 7. Mobile Phone View of Calendar Agenda
        ws.call("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=1, mobile=True)
        ws.js("document.getElementById('nav-calendar').click()")
        time.sleep(0.8)
        shot(ws, "phone-calendar-agenda.png")

        print("All milestone screenshots captured successfully!")
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
