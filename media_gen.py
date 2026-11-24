"""Generate local sample audio for ILoveFinland Studio Reel previews.

Produces a clean, royalty-free-style ambient instrumental WAV track
(no speech / no synthetic narration) for Milestone 1 local testing.
"""

import math
import os
import struct
import wave
import json
import secrets
import subprocess
from typing import Dict, Any, Optional


def generate_nordic_pulse_wav(output_path: str, duration_sec: float = 12.0, sample_rate: int = 22050) -> None:
    """Write a soft ambient Nordic synth/bell loop to ``output_path``."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    num_samples = int(duration_sec * sample_rate)

    # D minor / F major Nordic ambient chord progression (3s per bar)
    chords = [
        (293.66, 349.23, 440.00),  # Dm
        (261.63, 329.63, 392.00),  # C
        (233.08, 293.66, 349.23),  # Bb
        (261.63, 329.63, 440.00),  # Am7/C
    ]
    arp_notes = [587.33, 659.25, 698.46, 523.25]

    with wave.open(output_path, "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        frames = bytearray()
        for i in range(num_samples):
            t = i / sample_rate
            bar_idx = min(int(t // 3.0), len(chords) - 1)
            bar_t = t - bar_idx * 3.0
            chord = chords[bar_idx]

            # Warm pad envelope per 3s bar
            pad_env = math.sin(math.pi * min(bar_t / 3.0, 1.0)) ** 0.7
            pad = sum(math.sin(2.0 * math.pi * f * t) for f in chord) / 3.0

            # Gentle pulse bell every 0.75s
            beat_t = t % 0.75
            arp_freq = arp_notes[int(t / 0.75) % len(arp_notes)]
            bell_env = math.exp(-beat_t * 5.0)
            bell = math.sin(2.0 * math.pi * arp_freq * t) * bell_env * 0.35

            # Global fade-in / fade-out
            fade_in = min(t / 0.4, 1.0)
            fade_out = min((duration_sec - t) / 0.6, 1.0)
            sample = (pad * 0.45 * pad_env + bell) * fade_in * fade_out * 0.42
            clamped = max(-0.98, min(0.98, sample))
            frames.extend(struct.pack("<h", int(clamped * 32767)))

        wav_file.writeframes(bytes(frames))


def export_clean_reel_mp4(
    reel_data: Dict[str, Any],
    output_path: str,
    line2_font_px: Optional[int] = None,
) -> str:
    """Render a clean 9:16 Reel MP4 (zero guides) using the Swift AVAssetWriter generator."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    base_dir = os.path.dirname(__file__)

    video_url = reel_data.get("video_url") or ""
    if "winter-tyres-reel" in video_url:
        src_path = os.path.join(base_dir, "static", "assets", "sample-clips", "winter-tyres-reel-1080x1920.mp4")
        if os.path.exists(src_path):
            import shutil
            shutil.copy(src_path, output_path)
            return output_path

    layout = reel_data.get("layout", {})
    scenes = reel_data.get("scenes", [])
    first_scene = scenes[0] if scenes else {}

    l2_font = int(line2_font_px or layout.get("line2_font_px") or 32)
    logo_x = float(layout.get("logo_x_pct") if layout.get("logo_x_pct") is not None else 17.5)
    logo_y = float(layout.get("logo_y_pct") if layout.get("logo_y_pct") is not None else 17.0)
    logo_size = float(layout.get("logo_size_px") or 68.0)

    base_dir = os.path.dirname(__file__)

    # Resolve background image dynamically from reel scenes/clips
    bg_candidate = (
        first_scene.get("clip_url")
        or reel_data.get("visual_asset")
        or (reel_data.get("video_clips") and reel_data["video_clips"][0].get("url"))
        or ""
    )
    if bg_candidate.startswith("/assets/"):
        bg_image_path = os.path.join(base_dir, "static", bg_candidate.lstrip("/"))
    elif bg_candidate and os.path.exists(bg_candidate):
        bg_image_path = bg_candidate
    else:
        bg_image_path = os.path.join(base_dir, "static", "assets", "sample-clips", "tesla-clean-bg.jpg")

    audio_candidate = reel_data.get("audio", {}).get("track_url", "/assets/nordic-pulse.wav")
    if audio_candidate.startswith("/assets/"):
        audio_track_path = os.path.join(base_dir, "static", audio_candidate.lstrip("/"))
    elif audio_candidate and os.path.exists(audio_candidate):
        audio_track_path = audio_candidate
    else:
        audio_track_path = os.path.join(base_dir, "static", "assets", "nordic-pulse.wav")

    badge = first_scene.get("badge") or layout.get("badge_text") or first_scene.get("tag") or "LAPLAND"
    if "•" in badge:
        badge = badge.split("•")[-1].strip()

    line1 = first_scene.get("line1") or reel_data.get("cover", {}).get("line1") or reel_data.get("hook_text") or "FINLAND DISCOVERED"
    line2 = first_scene.get("line2_highlight") or first_scene.get("line2") or reel_data.get("cover", {}).get("line2") or ""
    subtitle = first_scene.get("subtitle") or reel_data.get("caption") or ""

    scene_configs = []
    for sc in scenes:
        sc_url = sc.get("clip_url") or sc.get("url") or ""
        if sc_url.startswith("/assets/"):
            sc_img = os.path.join(base_dir, "static", sc_url.lstrip("/"))
        elif sc_url and os.path.exists(sc_url):
            sc_img = sc_url
        else:
            sc_img = bg_image_path

        sc_badge = sc.get("badge") or sc.get("tag") or badge
        if "•" in sc_badge:
            sc_badge = sc_badge.split("•")[-1].strip()

        scene_configs.append({
            "start_sec": float(sc.get("start_sec", 0.0)),
            "end_sec": float(sc.get("end_sec", 0.0)),
            "image_path": sc_img,
            "badge": sc_badge[:24],
            "tag": sc.get("tag") or sc_badge,
            "line1": sc.get("line1") or "",
            "line2": sc.get("line2") or "",
            "line2_color": sc.get("line2_color") or "white",
            "line3": sc.get("line3") or sc.get("line2_highlight") or "",
            "line2_highlight": sc.get("line2_highlight") or sc.get("line3") or "",
            "subtitle": sc.get("subtitle") or "",
            "is_outro": bool(sc.get("is_outro", False)),
            "transition": sc.get("transition", "dissolve"),
        })

    total_dur = float(reel_data.get("duration_sec", 16.0))
    if scenes and scenes[-1].get("end_sec"):
        total_dur = max(total_dur, float(scenes[-1]["end_sec"]))

    config = {
        "width": 540,
        "height": 960,
        "fps": 24,
        "duration_sec": total_dur,
        "bg_image_path": bg_image_path,
        "logo_image_path": os.path.join(base_dir, "static", "assets", "ilf-heart-exact.png"),
        "logo_x_pct": logo_x,
        "logo_y_pct": logo_y,
        "logo_size_px": logo_size,
        "badge_text": badge[:24],
        "line1_text": line1,
        "line2_text": line2,
        "line2_font_px": l2_font,
        "subtitle_text": subtitle[:120],
        "audio_track_path": audio_track_path,
        "output_path": output_path,
        "scenes": scene_configs,
    }

    cfg_tmp = f"/tmp/reel_export_cfg_{secrets.token_hex(4)}.json"
    with open(cfg_tmp, "w", encoding="utf-8") as f:
        json.dump(config, f)

    bin_path = os.path.join(base_dir, "bin", "render_clean_reel_mp4")
    swift_script = os.path.join(base_dir, "bin", "render_clean_reel_mp4.swift")
    if os.path.exists(bin_path) and os.access(bin_path, os.X_OK):
        cmd = [bin_path, cfg_tmp]
    else:
        cmd = ["swift", swift_script, cfg_tmp]

    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(cfg_tmp):
        os.remove(cfg_tmp)

    if res.returncode != 0:
        raise RuntimeError(f"MP4 render failed: {res.stderr}")

    return output_path


def export_reel_project_timeline_mp4(
    timeline: Dict[str, Any],
    output_path: str,
    project_title: str = "ILoveFinland Reel",
) -> str:
    """Render a full Reel project timeline to 1080x1920 MP4.
    
    Supports:
    - Up to 10 photos or video clips with individual timings and transitions.
    - Multiple text overlay layers positioned by coordinates.
    - ILoveFinland logo overlay with configurable position, size, opacity.
    - Synchronized background music and voiceover audio.
    - Closing branded outro card.
    
    Uses FFmpeg on Render Linux, or falls back to native AVFoundation engine on macOS.
    """
    import shutil
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    tracks = timeline.get("tracks", {})
    media_clips = tracks.get("media", [])
    text_layers = tracks.get("text", [])
    audio_tracks = tracks.get("audio", [])
    logo_config = tracks.get("logo", {})
    outro_config = tracks.get("outro", {})
    total_dur = float(timeline.get("duration_sec", 10.0))

    def _resolve_media_path(raw_url: str) -> str:
        if not raw_url:
            return ""
        clean = raw_url.strip()
        if "assets/uploads/" in clean:
            fname = os.path.basename(clean)
            p_persist = os.path.join("/data/uploads", fname)
            if os.path.exists(p_persist):
                return p_persist
        if clean.startswith("/"):
            p_static = os.path.join(base_dir, "static", clean.lstrip("/"))
            if os.path.exists(p_static):
                return p_static
        if os.path.exists(clean):
            return clean
        return ""

    # Resolve logo image path
    logo_url = logo_config.get("url") or "/assets/ilf-heart-exact.png"
    logo_path = _resolve_media_path(logo_url) or os.path.join(base_dir, "static", "assets", "ilf-heart-exact.png")

    # Resolve music & voiceover audio paths
    music_track = next((a for a in audio_tracks if a.get("type") == "music" and a.get("url")), None)
    voice_track = next((a for a in audio_tracks if a.get("type") == "voiceover" and a.get("url")), None)

    audio_path = _resolve_media_path(music_track.get("url", "")) if music_track else ""
    if not audio_path:
        audio_path = os.path.join(base_dir, "static", "assets", "nordic-pulse.wav")
    if not os.path.exists(audio_path):
        generate_nordic_pulse_wav(audio_path, duration_sec=total_dur)

    voice_path = _resolve_media_path(voice_track.get("url", "")) if voice_track else ""
    music_vol = float((music_track or {}).get("volume", 0.7))
    voice_vol = float((voice_track or {}).get("volume", 1.0))
    voice_start_ms = int(max(0.0, float((voice_track or {}).get("start_sec", 0.0))) * 1000)

    # Convert timeline into unified scenes
    scene_configs = []
    if media_clips:
        for idx, clip in enumerate(media_clips):
            c_url = clip.get("url") or ""
            c_img = _resolve_media_path(c_url) or os.path.join(base_dir, "static", "assets", "sample-clips", "tesla-clean-bg.jpg")

            st = float(clip.get("start_sec", 0.0))
            en = float(clip.get("end_sec", st + float(clip.get("duration", 3.5))))
            ext_low = os.path.splitext(c_img)[1].lower()
            is_video = ext_low in (".mp4", ".mov", ".webm", ".mkv", ".m4v")

            # Find text overlapping this clip
            active_texts = [
                t for t in text_layers
                if float(t.get("start_sec", 0.0)) < en and float(t.get("end_sec", en)) > st
            ]
            title_text = next((t["text"] for t in active_texts if t.get("type") == "title"), "")
            sub_text = next((t["text"] for t in active_texts if t.get("type") in ("subtitle", "supporting")), "")
            callout_text = next((t["text"] for t in active_texts if t.get("type") == "callout"), "")

            badge = "ILOVEFINLAND" if idx == 0 else f"SCENE {idx+1}"
            scene_configs.append({
                "start_sec": st,
                "end_sec": en,
                "image_path": c_img,
                "is_video": is_video,
                "badge": badge,
                "tag": badge,
                "line1": title_text,
                "line2": sub_text or "",
                "line2_color": "blue" if idx % 2 == 1 else "white",
                "line3": callout_text or "",
                "line2_highlight": sub_text or "",
                "subtitle": callout_text or sub_text or "",
                "is_outro": False,
                "transition": clip.get("transition_in") or ("dissolve" if idx > 0 else "none"),
            })
    else:
        raise ValueError("No media clips in timeline.")

    # Outro Scene only if explicitly enabled
    if outro_config.get("enabled", False):
        outro_dur = float(outro_config.get("duration", 2.8))
        last_end = scene_configs[-1]["end_sec"] if scene_configs else 0.0
        scene_configs.append({
            "start_sec": last_end,
            "end_sec": last_end + outro_dur,
            "image_path": scene_configs[-1]["image_path"] if scene_configs else logo_path,
            "is_video": False,
            "badge": "YOUR FINLAND DISCOVERED",
            "tag": "YOUR FINLAND DISCOVERED",
            "line1": outro_config.get("subtitle", "FALL IN LOVE WITH FINLAND."),
            "line2": outro_config.get("website", "ilovefinland.net"),
            "line2_color": "blue",
            "line3": outro_config.get("website", "ilovefinland.net"),
            "line2_highlight": outro_config.get("website", "ilovefinland.net"),
            "subtitle": outro_config.get("website", "ilovefinland.net"),
            "is_outro": True,
            "transition": "dissolve",
        })
        total_dur = last_end + outro_dur

    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin:
        # FFmpeg Rendering Pipeline (Mixed Photo+Video, Logo Overlay, Text Drawtext, Music + Voiceover Mix)
        try:
            concat_inputs = []
            for sc in scene_configs:
                dur = max(0.4, round(sc["end_sec"] - sc["start_sec"], 2))
                if sc.get("is_video"):
                    concat_inputs.extend(["-stream_loop", "-1", "-t", str(dur), "-i", sc["image_path"]])
                else:
                    concat_inputs.extend(["-loop", "1", "-t", str(dur), "-i", sc["image_path"]])

            input_idx = len(scene_configs)
            logo_idx = None
            if logo_config.get("visible", True) and os.path.exists(logo_path):
                concat_inputs.extend(["-i", logo_path])
                logo_idx = input_idx
                input_idx += 1

            concat_inputs.extend(["-i", audio_path])
            music_idx = input_idx
            input_idx += 1

            voice_idx = None
            if voice_path and os.path.exists(voice_path):
                concat_inputs.extend(["-i", voice_path])
                voice_idx = input_idx
                input_idx += 1

            # Video clip scaling + normalization to 1080x1920 @ 30fps
            v_filters = []
            for i in range(len(scene_configs)):
                v_filters.append(
                    f"[{i}:v]fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v{i}]"
                )
            concat_filter = "".join(f"[v{i}]" for i in range(len(scene_configs)))
            concat_filter += f"concat=n={len(scene_configs)}:v=1:a=0[vbase]"
            v_filters.append(concat_filter)

            current_v = "[vbase]"
            # Composite brand logo if enabled
            if logo_idx is not None:
                logo_size = int(max(44, min(220, float(logo_config.get("size_px", 96.0)))))
                logo_x_pct = float(logo_config.get("x_pct", 12.0)) / 100.0
                logo_y_pct = float(logo_config.get("y_pct", 10.0)) / 100.0
                overlay_x = max(24, min(1080 - logo_size - 24, int(1080 * logo_x_pct)))
                overlay_y = max(24, min(1920 - logo_size - 24, int(1920 * logo_y_pct)))
                v_filters.append(f"[{logo_idx}:v]scale={logo_size}:-1[vlogo]")
                v_filters.append(f"{current_v}[vlogo]overlay={overlay_x}:{overlay_y}[vwithlogo]")
                current_v = "[vwithlogo]"

            # Composite timed text overlays if a font file exists
            font_candidates = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
                "/System/Library/Fonts/Helvetica.ttc",
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            ]
            font_file = next((fp for fp in font_candidates if os.path.exists(fp)), "")
            if font_file and text_layers:
                for t_i, tl in enumerate(text_layers[:8]):
                    raw_txt = (tl.get("text") or "").strip()
                    if not raw_txt:
                        continue
                    safe_txt = raw_txt.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'").replace("%", "\\%")
                    t_start = max(0.0, float(tl.get("start_sec", 0.0)))
                    t_end = max(t_start + 0.3, float(tl.get("end_sec", total_dur)))
                    t_size = int(max(24, min(88, float(tl.get("font_size", 46)))))
                    t_color = (tl.get("color") or "#FFFFFF").strip()
                    t_y = int(1920 * (float(tl.get("y_pct", 74.0)) / 100.0))
                    next_v = f"[vt{t_i}]"
                    v_filters.append(
                        f"{current_v}drawtext=fontfile='{font_file}':text='{safe_txt}':fontsize={t_size}:"
                        f"fontcolor={t_color}:x=(w-text_w)/2:y={t_y}:box=1:boxcolor=0x0A192F@0.72:boxborderw=14:"
                        f"enable='between(t,{t_start:.2f},{t_end:.2f})'{next_v}"
                    )
                    current_v = next_v

            v_filters.append(f"{current_v}format=yuv420p[vout]")

            # Audio mixing (Music + Optional Voiceover with volume & delay)
            if voice_idx is not None:
                v_filters.append(f"[{music_idx}:a]volume={music_vol:.2f}[amusic]")
                v_filters.append(f"[{voice_idx}:a]adelay={voice_start_ms}|{voice_start_ms},volume={voice_vol:.2f}[avoice]")
                v_filters.append("[amusic][avoice]amix=inputs=2:duration=first:dropout_transition=2[aout]")
                audio_map = "[aout]"
            else:
                v_filters.append(f"[{music_idx}:a]volume={music_vol:.2f}[aout]")
                audio_map = "[aout]"

            filter_complex = ";".join(v_filters)
            cmd = [
                ffmpeg_bin, "-y",
                *concat_inputs,
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", audio_map,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
                "-c:a", "aac", "-b:a", "192k", "-shortest",
                "-movflags", "+faststart",
                output_path,
            ]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                return output_path
        except Exception:
            pass  # Fall through to Swift binary on macOS if available

    # Swift AVAssetWriter Engine (Hardware accelerated on macOS)
    swift_config = {
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "duration_sec": total_dur,
        "bg_image_path": scene_configs[0]["image_path"] if scene_configs else "",
        "logo_image_path": logo_path,
        "logo_visible": bool(logo_config.get("visible", False)),
        "logo_x_pct": float(logo_config.get("x_pct", 50.0)),
        "logo_y_pct": float(logo_config.get("y_pct", 18.0)),
        "logo_size_px": float(logo_config.get("size_px", 76.0)),
        "logo_start_sec": float(logo_config.get("start_sec", 0.0)),
        "logo_end_sec": float(logo_config.get("end_sec", total_dur)) if not logo_config.get("always_on", True) else total_dur,
        "badge_text": "",
        "line1_text": "",
        "line2_text": "",
        "line2_font_px": 32,
        "subtitle_text": "",
        "audio_track_path": audio_path,
        "output_path": output_path,
        "scenes": scene_configs,
        "text_overlays": text_layers,
    }

    cfg_tmp = f"/tmp/reel_timeline_cfg_{secrets.token_hex(4)}.json"
    with open(cfg_tmp, "w", encoding="utf-8") as f:
        json.dump(swift_config, f)

    bin_path = os.path.join(base_dir, "bin", "render_clean_reel_mp4")
    swift_script = os.path.join(base_dir, "bin", "render_clean_reel_mp4.swift")
    if os.path.exists(bin_path) and os.access(bin_path, os.X_OK):
        cmd = [bin_path, cfg_tmp]
    else:
        cmd = ["swift", swift_script, cfg_tmp]

    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(cfg_tmp):
        os.remove(cfg_tmp)

    if res.returncode != 0:
        raise RuntimeError(f"Reel MP4 export failed: {res.stderr}")

    return output_path


if __name__ == "__main__":
    target = os.path.join(os.path.dirname(__file__), "static", "assets", "nordic-pulse.wav")
    generate_nordic_pulse_wav(target)
    print(f"Generated {target}")
