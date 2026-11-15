"""Drive headless Chrome over CDP (stdlib only) to test the Studio UI at 3 widths."""

import base64
import json
import os
import socket
import struct
import subprocess
import sys
import time
from urllib.request import Request, urlopen

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE = "http://127.0.0.1:8787"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/shots"
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
            msg += self._recv_exact(n)
            if b1 & 0x80:
                return msg.decode()

    def call(self, method, **params):
        self.i += 1
        self._send(json.dumps({"id": self.i, "method": method, "params": params}))
        while True:
            m = json.loads(self._recv())
            if m.get("id") == self.i:
                if "error" in m:
                    raise RuntimeError(m["error"])
                return m["result"]

    def js(self, expr):
        r = self.call("Runtime.evaluate", expression=expr, awaitPromise=True, returnByValue=True, userGesture=True)
        if "exceptionDetails" in r:
            raise RuntimeError(r["exceptionDetails"])
        return r["result"].get("value")


def shot(ws, name):
    r = ws.call("Page.captureScreenshot", format="png", captureBeyondViewport=False)
    path = os.path.join(OUT, name)
    open(path, "wb").write(base64.b64decode(r["data"]))
    print("saved", path)


def wait(ws, expr, timeout=8):
    t = time.time()
    while time.time() - t < timeout:
        if ws.js(expr):
            return True
        time.sleep(0.2)
    return False


def main():
    proc = subprocess.Popen([CHROME, "--headless=new", "--remote-debugging-port=9333", "--no-first-run",
                             "--autoplay-policy=no-user-gesture-required", "--user-data-dir=/tmp/ilf-chrome",
                             "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                tabs = json.loads(urlopen("http://127.0.0.1:9333/json").read())
                break
            except Exception:
                time.sleep(0.3)
        page = [t for t in tabs if t["type"] == "page"][0]
        ws = WS(page["webSocketDebuggerUrl"])
        ws.call("Page.enable")
        results = {}

        for label, w, h, mobile in (("phone", 390, 844, True), ("tablet-portrait", 820, 1180, True), ("tablet-landscape", 1180, 820, True), ("desktop", 1440, 900, False)):
            ws.call("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=1, mobile=mobile)
            ws.call("Network.enable")
            ws.call("Network.clearBrowserCookies")
            ws.call("Page.navigate", url=BASE + "/")
            wait(ws, "document.readyState==='complete'")
            shot(ws, f"{label}-0-signin.png")
            ws.js("document.getElementById('btn-google-signin').click()")
            ok = wait(ws, "!document.getElementById('studio-shell').classList.contains('hidden') && document.getElementById('article-headline').textContent.length>0")
            results[f"{label}: signed in and article rendered"] = ok
            time.sleep(0.8)
            shot(ws, f"{label}-1-review.png")

            # Readability / overflow / tap-target checks
            info = ws.js("""(()=>{
              const de=document.documentElement;
              const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
              const btns=['btn-approve-article','btn-approve-reel','btn-play','btn-fullscreen'].map(id=>{
                const e=document.getElementById(id);const r=e.getBoundingClientRect();
                return {id,visible:vis(e),w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top)}});
              return {hScroll:de.scrollWidth>de.clientWidth+1,
                bodyFont:getComputedStyle(document.querySelector('.article-body p')).fontSize,
                articleVisible:vis(document.getElementById('panel-article')),
                reelVisible:vis(document.getElementById('panel-reel')),
                btns}})()""")
            results[f"{label}: no horizontal scroll"] = not info["hScroll"]
            bar = ws.js("""(()=>{const ids=['btn-approve-article-m','btn-approve-reel-m','btn-approve-article','btn-approve-reel'];
              for(const [a,b] of [[0,1],[2,3]]){const A=document.getElementById(ids[a]).getBoundingClientRect(),B=document.getElementById(ids[b]).getBoundingClientRect();
                if(A.width>0&&B.width>0)return {ids:[ids[a],ids[b]],inView:A.bottom<=innerHeight&&B.bottom<=innerHeight&&A.top>=0,h:[Math.round(A.height),Math.round(B.height)]}}
              return null})()""")
            print(label, "approve buttons", json.dumps(bar))
            clip = ws.js("""(()=>{const c=document.querySelector('.player-controls').getBoundingClientRect();
              return [...document.querySelectorAll('.player-controls > *')].every(e=>{const r=e.getBoundingClientRect();return r.left>=c.left-1&&r.right<=c.right+1})})()""")
            results[f"{label}: all player controls inside their column (none clipped)"] = bool(clip)
            results[f"{label}: both approve buttons visible on screen & >=40px tall"] = bool(bar and bar["inView"] and min(bar["h"]) >= 40)
            print(label, json.dumps(info))

            if label in ("phone", "tablet-portrait"):
                # tabs layout: Reel tab is default; open Article tab and shoot it
                ws.js("document.querySelector('.tab-btn[data-tab=article]').click()")
                time.sleep(0.4)
                shot(ws, f"{label}-2-article-tab.png")
                ws.js("document.querySelector('.tab-btn[data-tab=reel]').click()")
                time.sleep(0.4)

            # Reel playback with sound
            play = ws.js("""(async()=>{
              const a=document.getElementById('reel-audio');a.muted=false;a.volume=1;
              document.getElementById('btn-play').click();
              await new Promise(r=>setTimeout(r,1800));
              const out={paused:a.paused,muted:a.muted,t:a.currentTime,ready:a.readyState,
                dur:a.duration,src:a.currentSrc,scrub:document.getElementById('reel-scrubber').value};
              document.getElementById('btn-play').click();return out})()""")
            print(label, "audio", json.dumps(play))
            results[f"{label}: audio plays (time advances, unmuted)"] = bool(play and play["t"] > 0.5 and not play["muted"])
            shot(ws, f"{label}-3-reel-playing.png")

            ws.js("document.getElementById('btn-fullscreen').scrollIntoView({block:'center'})")
            time.sleep(0.3)
            pos = ws.js("(()=>{const r=document.getElementById('btn-fullscreen').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
            for typ in ("mousePressed", "mouseReleased"):
                ws.call("Input.dispatchMouseEvent", type=typ, x=pos[0], y=pos[1], button="left", clickCount=1)
            time.sleep(1.6)
            fs = ws.js("""({native:!!document.fullscreenElement,pseudo:document.getElementById('phone-frame').classList.contains('pseudo-fs'),
              rect:(r=>[Math.round(r.width),Math.round(r.height)])(document.getElementById('phone-frame').getBoundingClientRect()),
              vp:[innerWidth,innerHeight],closeVisible:getComputedStyle(document.getElementById('btn-fs-close')).display!=='none'})""")
            print(label, "fullscreen", json.dumps(fs))
            shot(ws, f"{label}-3b-fullscreen.png")
            results[f"{label}: fullscreen opens (native or in-page)"] = (fs["native"] or fs["pseudo"]) and fs["closeVisible"]
            ws.js("document.getElementById('btn-fs-close').click()")
            time.sleep(0.4)
            # Force the iPhone-style fallback path (no element fullscreen API)
            ws.js("document.getElementById('phone-frame').requestFullscreen=undefined;document.getElementById('phone-frame').webkitRequestFullscreen=undefined;document.getElementById('btn-fullscreen').click()")
            time.sleep(0.5)
            fb = ws.js("(()=>{const f=document.getElementById('phone-frame');const r=f.getBoundingClientRect();return {pseudo:f.classList.contains('pseudo-fs'),fills:Math.round(r.height)===innerHeight}})()")
            results[f"{label}: iPhone-style fullscreen fallback fills screen"] = fb["pseudo"] and fb["fills"]
            if label == "phone":
                shot(ws, "phone-3c-fullscreen-fallback.png")
            ws.js("document.getElementById('btn-fs-close').click()")
            time.sleep(0.3)

            if label == "desktop":
                # Approve article, then request a Reel revision
                ws.js("document.getElementById('btn-approve-article').click()")
                wait(ws, "document.getElementById('status-article-pill').textContent.includes('Approved')")
                ws.js("""(()=>{document.getElementById('comment-target').value='reel';
                  document.getElementById('comment-input').value='move the logo lower and make the second line bigger';
                  document.getElementById('btn-submit-comment').click()})()""")
                wait(ws, "document.getElementById('revision-banner').textContent.includes('v2')")
                time.sleep(0.8)
                st = ws.js("""({art:document.getElementById('status-article-pill').textContent,
                  reel:document.getElementById('status-reel-pill').textContent,
                  tabs:[...document.querySelectorAll('.ver-btn')].map(b=>b.textContent),
                  banner:document.getElementById('revision-banner').textContent,
                  artBtn:document.getElementById('btn-approve-article').textContent,
                  readout:document.getElementById('layout-readout').textContent})""")
                print("after revision", json.dumps(st))
                results["revision: v1 and v2 tabs present"] = len(st["tabs"]) == 2
                results["revision: article approval intact"] = "Approved" in st["art"]
                results["revision: reel needs fresh approval"] = "Revision" in st["reel"]
                shot(ws, "desktop-4-after-revision.png")
                ws.js("document.querySelector('.ver-btn').click()")
                time.sleep(0.5)
                v1 = ws.js("document.getElementById('layout-readout').textContent")
                results["revision: v1 still viewable with original layout"] = v1 != st["readout"]
                print("v1 readout", v1, "| v2 readout", st["readout"])
                shot(ws, "desktop-5-v1-viewed.png")
                ws.js("document.querySelectorAll('.ver-btn')[1].click()")
                time.sleep(0.3)
                ws.js("document.getElementById('btn-approve-reel').click()")
                wait(ws, "document.getElementById('status-reel-pill').textContent.includes('Approved')")
                st2 = ws.js("[document.getElementById('status-article-pill').textContent,document.getElementById('status-reel-pill').textContent]")
                results["approvals: both approved separately"] = all("Approved" in x for x in st2)
                print("final pills", st2)

        print("\n=== RESULTS ===")
        for k, v in results.items():
            print(("PASS " if v else "FAIL ") + k)
    finally:
        proc.terminate()


if __name__ == "__main__":
    main()
