#!/usr/bin/env python3
"""Build and render a realistic cinematic vertical Reel (1080x1920, 9:16, 12s) for Finnish Winter Tyres.

Generates:
1. Layered audio mix:
   - Subtle winter ambience (sub-zero arctic wind swell)
   - Tyre-on-snow sound (rhythmic crunching of studded tyres on packed snow)
   - Cinematic Nordic background music (ambient pad + resonant melodic pulse)
2. 4-Scene cinematic 1080x1920 MP4 video:
   - Scene 1 (0–3s): Close-up of studded winter tyre rolling on snowy/icy road with metal studs and tread clearly visible + light snow spray.
   - Scene 2 (3–6s): Wide shot tracking car driving through snowy Finnish road with pine trees and low winter sun.
   - Scene 3 (6–9s): Low-angle moving shot of car driving safely on winter road showing tyre grip and road texture.
   - Scene 4 (9–12s): Beautiful Finnish winter landscape with car moving through calm Nordic atmosphere.
3. Clean safe-area typography:
   - "WINTER TYRES IN FINLAND"
   - "STUDDED TYRES FOR ICY ROADS"
   - "DRIVE SAFE THIS WINTER"
   - "CHECK BEFORE YOU DRIVE"
"""

import json
import math
import os
import random
import struct
import subprocess
import wave

BASE_DIR = "/Users/binod721/.gemini/antigravity/scratch/ilovefinland-studio"
AUDIO_DIR = os.path.join(BASE_DIR, "static", "assets", "audio")
CLIPS_DIR = os.path.join(BASE_DIR, "static", "assets", "sample-clips")
PHOTOS_DIR = os.path.join(BASE_DIR, "static", "assets", "photos")
ASSETS_DIR = os.path.join(BASE_DIR, "static", "assets")
ARTIFACT_DIR = "/Users/binod721/.gemini/antigravity/brain/a0dbb212-db32-47b4-a483-aba8450fc174"

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(CLIPS_DIR, exist_ok=True)


def generate_winter_audio(output_wav_path: str, duration: float = 12.0, sr: int = 44100):
    print(f"Generating layered winter tyre audio track ({duration}s @ {sr}Hz)...")
    total = int(duration * sr)
    chords = [
        (293.66, 349.23, 440.00),  # Dm (Scene 1)
        (261.63, 329.63, 392.00),  # C  (Scene 2)
        (233.08, 293.66, 349.23),  # Bb (Scene 3)
        (220.00, 261.63, 329.63),  # Am (Scene 4)
    ]
    arp = [587.33, 659.25, 698.46, 523.25]

    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
    frames = bytearray()
    random.seed(42)

    for i in range(total):
        t = i / sr
        bar = min(int(t // 3.0), 3)
        bar_t = t - bar * 3.0

        # 1. Subtle Winter Ambience (sub-zero arctic wind swell)
        white = random.uniform(-1.0, 1.0)
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        b6 = white * 0.115926
        pink *= 0.08
        wind_mod = 0.65 + 0.35 * math.sin(2.0 * math.pi * 0.18 * t)
        wind = pink * wind_mod * 0.28

        # 2. Tyre-on-Snow Sound (rhythmic crunching & metallic stud clicks)
        tyre_phase = (t * 5.2) % 1.0
        crunch_env = math.exp(-tyre_phase * 11.0)
        stud_click = (
            (math.sin(2.0 * math.pi * 3200.0 * t) + math.sin(2.0 * math.pi * 5100.0 * t))
            * crunch_env
            * (1.0 if tyre_phase < 0.12 else 0.0)
            * 0.20
        )
        snow_crunch = (random.uniform(-1.0, 1.0) * crunch_env * 0.24) + stud_click
        if bar == 0:
            tyre_gain = 0.90  # Scene 1 close-up
        elif bar == 1:
            tyre_gain = 0.42  # Scene 2 wide
        elif bar == 2:
            tyre_gain = 0.85  # Scene 3 low-angle
        else:
            tyre_gain = 0.38  # Scene 4 landscape
        tyre_sound = snow_crunch * tyre_gain

        # 3. Cinematic Nordic Music
        chord = chords[bar]
        pad_env = math.sin(math.pi * min(bar_t / 3.0, 1.0)) ** 0.65
        pad = sum(math.sin(2.0 * math.pi * f * t) for f in chord) / 3.0 * 0.38 * pad_env

        beat_t = t % 0.75
        bell_f = arp[int(t / 0.75) % len(arp)]
        bell_env = math.exp(-beat_t * 6.0)
        bell = math.sin(2.0 * math.pi * bell_f * t) * bell_env * 0.20
        sub = math.sin(2.0 * math.pi * (chord[0] / 2.0) * t) * 0.24 * pad_env
        music = (pad + bell + sub) * 0.58

        fade_in = min(t / 0.4, 1.0)
        fade_out = min((duration - t) / 0.7, 1.0)
        master = (wind + tyre_sound + music) * fade_in * fade_out * 0.78
        clamped = max(-0.95, min(0.95, master))
        frames.extend(struct.pack("<h", int(clamped * 32767)))

    with wave.open(output_wav_path, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(bytes(frames))
    print(f"✓ Audio generated: {output_wav_path} ({len(frames)} bytes)")


def main():
    audio_path = os.path.join(AUDIO_DIR, "winter-tyre-cinematic-bed.wav")
    generate_winter_audio(audio_path, duration=12.0)

    config = {
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "duration_sec": 12.0,
        "user_photo_path": os.path.join(PHOTOS_DIR, "user-studded-winter-tyre.jpg"),
        "macro_photo_path": os.path.join(PHOTOS_DIR, "studded-winter-tyre-original.jpg"),
        "landscape_photo_path": os.path.join(PHOTOS_DIR, "user-studded-winter-tyre.jpg"),
        "logo_photo_path": os.path.join(ASSETS_DIR, "ilf-heart-exact.png"),
        "audio_wav_path": audio_path,
    }

    cfg_tmp = "/tmp/winter_tyre_reel_cfg.json"
    with open(cfg_tmp, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    output_mp4 = os.path.join(CLIPS_DIR, "winter-tyres-reel-1080x1920.mp4")
    swift_script = os.path.join(BASE_DIR, "bin", "render_winter_tyre_reel.swift")

    print(f"Launching Swift video renderer for 1080x1920 vertical Reel...")
    res = subprocess.run(["swift", swift_script, cfg_tmp, output_mp4], capture_output=True, text=True)
    print(res.stdout)
    if res.returncode != 0:
        print("ERROR:", res.stderr)
        raise RuntimeError(f"Swift render failed: {res.stderr}")

    # Copy to artifact dir for user review
    art_mp4 = os.path.join(ARTIFACT_DIR, "winter-tyres-reel-1080x1920.mp4")
    subprocess.run(["cp", output_mp4, art_mp4], check=True)
    print(f"✓ Copied to artifacts: {art_mp4}")

    # Sips inspection
    sips_res = subprocess.check_output(["sips", "-g", "pixelWidth", "-g", "pixelHeight", "-g", "format", output_mp4]).decode()
    print(f"Video specs:\n{sips_res.strip()}")


if __name__ == "__main__":
    main()
