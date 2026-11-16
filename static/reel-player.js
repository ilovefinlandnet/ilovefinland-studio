/* Playable 9:16 Vertical Reel, 4:5 Cover & 3:4 Profile-Grid Preview Renderer with Tesla News Template */
(function () {
  const W = 540;
  const H = 960;

  class ReelPlayer {
    constructor(canvas, coverCanvas, audioEl, onTimeUpdate, cover34Canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.coverCanvas = coverCanvas;
      this.coverCtx = coverCanvas.getContext("2d");
      this.cover34Canvas = cover34Canvas || null;
      this.cover34Ctx = cover34Canvas ? cover34Canvas.getContext("2d") : null;
      this.audio = audioEl;
      this.onTimeUpdate = onTimeUpdate;

      this.reel = null;
      this.bgImg = new Image();
      this.logoImg = new Image();
      this.coverImg = new Image();
      this.bgReady = false;
      this.logoReady = false;
      this.coverImgReady = false;
      this.sceneImages = {};

      this.videoEl = document.createElement("video");
      this.videoEl.muted = true;
      this.videoEl.playsInline = true;
      this.videoEl.autoplay = false;
      this.videoEl.preload = "auto";
      this.videoEl.loop = true;
      this.videoReady = false;
      this.currentVideoSrc = null;

      const markVideoReady = () => {
        this.videoReady = true;
        this.render();
      };
      this.videoEl.addEventListener("canplay", markVideoReady);
      this.videoEl.addEventListener("loadeddata", markVideoReady);
      this.videoEl.addEventListener("loadedmetadata", markVideoReady);
      this.videoEl.addEventListener("playing", markVideoReady);
      this.videoEl.addEventListener("seeked", markVideoReady);
      this.videoEl.addEventListener("timeupdate", () => {
        if (!this.videoReady && this.videoEl.videoWidth > 0) {
          this.videoReady = true;
          this.render();
        }
      });

      this.playing = false;
      this.showSafeArea = true;
      this.showProfileCropGuide = true;
      this.exportMode = false;
      this.currentTime = 0;
      this.lastTs = null;
      this.rafId = null;

      this.bgImg.onload = () => {
        this.bgReady = true;
        this.render();
      };
      this.logoImg.onload = () => {
        this.logoReady = true;
        this.render();
      };
      this.coverImg.onload = () => {
        this.coverImgReady = true;
        this.render();
      };
    }

    load(reelData) {
      if (!reelData) return;
      const prevAudio = (this.reel && this.reel.audio) ? this.reel.audio.track_url : null;
      this.reel = reelData;

      // Pre-cache scene images
      this.sceneImages = this.sceneImages || {};
      if (reelData && reelData.scenes) {
        reelData.scenes.forEach((s) => {
          if (s.clip_url && /\.(jpe?g|png|webp|heic|gif)$/i.test(s.clip_url)) {
            if (!this.sceneImages[s.clip_url]) {
              const im = new Image();
              im.onload = () => this.render();
              im.src = s.clip_url;
              if (im.decode) im.decode().then(() => this.render()).catch(() => {});
              this.sceneImages[s.clip_url] = im;
            }
          }
        });
      }
      if (reelData && reelData.video_clips) {
        reelData.video_clips.forEach((c) => {
          if (c.url && /\.(jpe?g|png|webp|heic|gif)$/i.test(c.url)) {
            if (!this.sceneImages[c.url]) {
              const im = new Image();
              im.onload = () => this.render();
              im.src = c.url;
              this.sceneImages[c.url] = im;
            }
          }
        });
      }

      if (reelData.visual_asset && this.bgImg.getAttribute("src") !== reelData.visual_asset) {
        this.bgReady = false;
        this.bgImg.src = reelData.visual_asset;
      }
      const logoUrl = reelData.logo_asset || "/assets/ilf-heart-exact.png";
      if (this.logoImg.getAttribute("src") !== logoUrl) {
        this.logoReady = false;
        this.logoImg.src = logoUrl;
      }
      // Pre-cache all scene images immediately into memory to eliminate any slide-change flicker
      if (reelData.scenes) {
        for (const sc of reelData.scenes) {
          const u = sc.clip_url || sc.url;
          if (u && /\.(jpe?g|png|webp|heic|gif)$/i.test(u) && !this.sceneImages[u]) {
            const im = new Image();
            im.src = u;
            this.sceneImages[u] = im;
          }
        }
      }

      const coverUrl = (reelData.cover && reelData.cover.visual_asset) || reelData.visual_asset;
      if (coverUrl && this.coverImg.getAttribute("src") !== coverUrl) {
        this.coverImgReady = false;
        this.coverImg.src = coverUrl;
      }
      const trackUrl = (reelData.audio && reelData.audio.track_url) ? reelData.audio.track_url : null;
      if (trackUrl && prevAudio !== trackUrl) {
        this.audio.src = trackUrl;
      }

      // Resolve primary video URL across all possible fields, prioritizing direct MP4
      const hasDirectMp4 = reelData.video_url && /\.(mp4|mov|webm|m4v)$/i.test(reelData.video_url);
      const userClips = (reelData.clips && reelData.clips.length > 0) ? reelData.clips : [];
      const videoClips = (reelData.video_clips && reelData.video_clips.length > 0) ? reelData.video_clips : [];
      const firstClip = userClips[0] || videoClips[0];
      const firstClipUrl = hasDirectMp4 ? reelData.video_url : ((firstClip && (firstClip.url || firstClip)) || reelData.video_url ||
        (reelData.scenes && reelData.scenes[0] && reelData.scenes[0].clip_url) ||
        (reelData.cover && reelData.cover.photo_url && /\.(mp4|mov|webm)$/i.test(reelData.cover.photo_url) ? reelData.cover.photo_url : null));

      // If firstClipUrl is a video format, load it into HTML5 video; otherwise leave videoEl unset for canvas image rendering
      const isVideoFile = firstClipUrl && /\.(mp4|mov|webm|m4v)$/i.test(firstClipUrl);
      if (isVideoFile) {
        if (this.currentVideoSrc !== firstClipUrl) {
          this.currentVideoSrc = firstClipUrl;
          this.videoReady = false;
          this.videoEl.src = firstClipUrl;
          this.videoEl.load();
        }
      } else {
        this.currentVideoSrc = null;
        this.videoReady = false;
        this.videoEl.removeAttribute("src");
      }

      this.render();
      if (this.onTimeUpdate && this.reel) {
        this.onTimeUpdate(this.currentTime, this.reel.duration_sec);
      }
    }

    setSafeArea(enabled) {
      this.showSafeArea = enabled;
      this.render();
    }

    toggleProfileCropGuide() {
      this.showProfileCropGuide = !this.showProfileCropGuide;
      this.render();
      return this.showProfileCropGuide;
    }

    togglePlay() {
      if (this.playing) {
        this.pause();
      } else {
        this.play();
      }
      return this.playing;
    }

    play() {
      if (!this.reel || this.playing) return;
      this.playing = true;
      if (this.currentTime >= this.reel.duration_sec) {
        this.currentTime = 0;
      }
      const startAudio = () => {
        try {
          this.audio.currentTime = this.currentTime;
        } catch (e) {}
        this.audio.play().catch(() => {});
      };
      if (this.audio.readyState >= 1) {
        startAudio();
      } else {
        this.audio.addEventListener("loadedmetadata", startAudio, { once: true });
        this.audio.load();
        this.audio.play().catch(() => {});
      }

      if (this.videoEl.src) {
        try {
          if (this.videoEl.duration) {
            this.videoEl.currentTime = this.currentTime % this.videoEl.duration;
          }
        } catch (e) {}
        this.videoEl.play().catch(() => {});
      }

      if (this.onPlayState) this.onPlayState(true);
      this.lastTs = performance.now();
      const step = (ts) => {
        if (!this.playing) return;
        const dt = (ts - this.lastTs) / 1000;
        this.lastTs = ts;
        if (this.videoEl.src && !this.videoEl.paused && this.videoEl.currentTime > 0) {
          this.currentTime = this.videoEl.currentTime;
        } else {
          this.currentTime += dt;
        }
        if (this.currentTime >= this.reel.duration_sec) {
          this.currentTime = 0;
          this.audio.currentTime = 0;
          this.audio.volume = 1.0;
          this.audio.play().catch(() => {});
          if (this.videoEl.src) {
            this.videoEl.currentTime = 0;
            this.videoEl.play().catch(() => {});
          }
        } else if (this.audio) {
          const reelDur = this.reel.duration_sec || 16;
          const fadeStart = Math.max(0, reelDur - 2.0);
          if (this.currentTime >= fadeStart) {
            const rem = Math.max(0, reelDur - this.currentTime);
            this.audio.volume = Math.max(0, Math.min(1, rem / 2.0));
          } else {
            this.audio.volume = 1.0;
          }
        }
        if (this.videoEl.src && this.videoEl.paused) {
          this.videoEl.play().catch(() => {});
        }
        this.render();
        if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime, this.reel.duration_sec);
        this.rafId = requestAnimationFrame(step);
      };
      this.rafId = requestAnimationFrame(step);
    }

    pause() {
      this.playing = false;
      this.audio.pause();
      if (this.videoEl.src) {
        this.videoEl.pause();
      }
      if (this.onPlayState) this.onPlayState(false);
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    restart() {
      this.currentTime = 0;
      this.audio.currentTime = 0;
      if (this.videoEl.src) {
        this.videoEl.currentTime = 0;
      }
      this.render();
      if (this.onTimeUpdate && this.reel) {
        this.onTimeUpdate(0, this.reel.duration_sec);
      }
    }

    seek(sec) {
      if (!this.reel) return;
      this.currentTime = Math.max(0, Math.min(this.reel.duration_sec, sec));
      this.audio.currentTime = this.currentTime;
      if (this.videoEl.src) {
        try {
          this.videoEl.currentTime = this.currentTime;
        } catch (e) {}
      }
      this.render();
      if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime, this.reel.duration_sec);
    }

    _drawCoverImage(ctx, media, cw, ch, zoom = 1.0) {
      const iw = media.naturalWidth || media.videoWidth || cw;
      const ih = media.naturalHeight || media.videoHeight || ch;
      const scale = Math.max(cw / iw, ch / ih) * zoom;
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx.drawImage(media, dx, dy, dw, dh);
    }

    _wrapLines(ctx, text, maxWidth) {
      if (!text) return [];
      const rawText = String(text).trim();
      if (!rawText) return [];

      if (rawText.includes("\n")) {
        const parts = rawText.split("\n");
        const res = [];
        for (const p of parts) {
          res.push(...this._wrapLines(ctx, p, maxWidth));
        }
        return res;
      }

      if (ctx.measureText(rawText).width <= maxWidth) {
        return [rawText];
      }

      const words = rawText.split(/\s+/).filter(Boolean);
      if (words.length <= 1) return [rawText];

      // Greedy initial wrap
      const greedyLines = [];
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && current) {
          greedyLines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) greedyLines.push(current);

      // Balanced 2-line ratio (eliminates 1-word orphan lines like "4 words, 1 word")
      if (greedyLines.length === 2 && words.length >= 3) {
        let bestDiff = Infinity;
        let bestLines = greedyLines;
        for (let i = 1; i < words.length; i++) {
          const l1 = words.slice(0, i).join(" ");
          const l2 = words.slice(i).join(" ");
          const w1 = ctx.measureText(l1).width;
          const w2 = ctx.measureText(l2).width;
          if (w1 <= maxWidth && w2 <= maxWidth) {
            const diff = Math.abs(w1 - w2);
            const orphanPenalty = (words.slice(i).length === 1 && words.length >= 4) ? 200 : 0;
            if (diff + orphanPenalty < bestDiff) {
              bestDiff = diff + orphanPenalty;
              bestLines = [l1, l2];
            }
          }
        }
        return bestLines;
      }

      // 3+ lines orphan prevention: borrow 1 word from previous line if last line has only 1 word
      if (greedyLines.length > 2) {
        const lastLine = greedyLines[greedyLines.length - 1];
        const lastWords = lastLine.split(/\s+/);
        if (lastWords.length === 1) {
          const prevLine = greedyLines[greedyLines.length - 2];
          const prevWords = prevLine.split(/\s+/);
          if (prevWords.length >= 3) {
            const stolen = prevWords.pop();
            const newPrev = prevWords.join(" ");
            const newLast = `${stolen} ${lastLine}`;
            if (ctx.measureText(newLast).width <= maxWidth) {
              greedyLines[greedyLines.length - 2] = newPrev;
              greedyLines[greedyLines.length - 1] = newLast;
            }
          }
        }
      }

      return greedyLines;
    }

    _drawHeartLogo(ctx, cw, ch, layout) {
      if (!this.logoReady || layout.logo_visible === false) return;
      // Exact 12.0% width proportion matching Instagram Feed Post (130px on 1080p, 44px on 360p)
      const size = layout.logo_size_px && layout.logo_size_px < 100 && cw > 500
        ? Math.round((layout.logo_size_px / 1080) * cw)
        : Math.round(cw * 0.120);
      const safeMarginX = (cw * (layout.safe_area?.horizontal_margin_pct || 8.5)) / 100;
      const topSafeY = (ch * (layout.safe_area?.profile_grid_top_pct || 14.8)) / 100;

      // Position heart logo cleanly inside safe area, left-aligned with text badge
      // Top sits 14px below the top safe line, and left sits 8px inside left margin so it NEVER touches dashed border
      let lx = safeMarginX + 8;
      let ly = topSafeY + 14;

      if (layout.logo_x_pct != null && layout.logo_x_pct > 18) {
        lx = Math.max(safeMarginX + 4, (cw * layout.logo_x_pct) / 100 - size / 2);
      }
      if (layout.logo_y_pct != null && layout.logo_y_pct > 22) {
        ly = Math.max(topSafeY + 6, (ch * layout.logo_y_pct) / 100 - size / 2);
      }

      // Transparent outside, preserved white mountain/river/dot, drop shadow for snowy contrast
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(this.logoImg, lx, ly, size, size);
      ctx.restore();
    }

    render() {
      if (!this.reel) return;
      this._renderReelFrame();
      if (!this.playing) {
        this._renderCoverFrame();
        this._render34CoverFrame();
      }
    }

    _renderReelFrame() {
      const ctx = this.ctx;
      const reel = this.reel;
      const layout = reel.layout || {};
      const dur = reel.duration_sec || 16;
      const progress = Math.min(1, this.currentTime / dur);
      const isTeslaNews = layout.template_style !== "classic_center";

      // Active scene & clip selection with smooth cross-dissolve transitions
      const scenes = reel.scenes || [];
      let sceneIndex = scenes.findIndex((s) => this.currentTime >= s.start_sec && this.currentTime < s.end_sec);
      if (sceneIndex === -1) {
        sceneIndex = scenes.length > 0 ? (this.currentTime >= (scenes[scenes.length - 1].end_sec || 0) ? scenes.length - 1 : 0) : 0;
      }
      const scene = scenes[sceneIndex] || {};

      // Video Clip or Background Photo
      const userClipUrl = (reel.clips && reel.clips.length > 0 && (reel.clips[0].url || reel.clips[0])) || null;
      const targetSrc = scene.clip_url || (reel.video_clips && reel.video_clips[0]?.url) || reel.video_url || userClipUrl || reel.visual_asset;
      const isImgClip = targetSrc && /\.(jpe?g|png|webp|heic|gif)$/i.test(targetSrc);

      const sStart = scene.start_sec != null ? scene.start_sec : 0;
      const sEnd = scene.end_sec != null ? scene.end_sec : (sStart + 5.0);
      const sDur = Math.max(1, sEnd - sStart);
      const sProgress = Math.max(0, Math.min(1, (this.currentTime - sStart) / sDur));
      const zoom = 1.02 + sProgress * 0.08;

      if (scene.is_outro) {
        // Dedicated Closing Branded Outro Card
        const transDur = 0.60;
        const isTransition = sceneIndex > 0 && (this.currentTime - sStart) < transDur;

        if (isTransition) {
          const prevScene = scenes[sceneIndex - 1];
          const prevSrc = prevScene?.clip_url || targetSrc;
          const prevImg = this.sceneImages[prevSrc] || this.bgImg;
          if (prevImg && prevImg.complete && prevImg.naturalWidth > 0) {
            this._drawCoverImage(ctx, prevImg, W, H, 1.09);
          }
          const p = (this.currentTime - sStart) / transDur;
          const blend = p * p * (3.0 - 2.0 * p);
          ctx.save();
          ctx.globalAlpha = blend;
          ctx.fillStyle = "#010410";
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        } else {
          ctx.fillStyle = "#010410";
          ctx.fillRect(0, 0, W, H);
        }

        // Radial glow behind center logo
        const outroLogoSize = 116;
        const outroLogoX = (W - outroLogoSize) / 2;
        const outroLogoY = H * 0.28;
        const logoCenterY = outroLogoY + outroLogoSize / 2;

        const radGrad = ctx.createRadialGradient(W / 2, logoCenterY, 10, W / 2, logoCenterY, W * 0.65);
        radGrad.addColorStop(0, "rgba(0, 163, 255, 0.42)");
        radGrad.addColorStop(1, "rgba(1, 4, 16, 0)");
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, W, H);

        const outroOpacity = Math.min(1.0, (this.currentTime - sStart) / 0.45);
        ctx.save();
        ctx.globalAlpha = outroOpacity;

        // Centered Glowing Heart Logo (116px - Prominent & Authoritative)
        if (this.logoReady && this.logoImg) {
          ctx.save();
          ctx.shadowColor = "rgba(0, 163, 255, 0.75)";
          ctx.shadowBlur = 24;
          ctx.drawImage(this.logoImg, outroLogoX, outroLogoY, outroLogoSize, outroLogoSize);
          ctx.restore();
        }

        // Centered Pill Badge: "DISCOVER MORE"
        const bText = "DISCOVER MORE";
        ctx.save();
        ctx.font = "800 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        const bTextW = ctx.measureText(bText).width;
        const bW = bTextW + 36;
        const bH = 28;
        const bX = (W - bW) / 2;
        const bY = outroLogoY + outroLogoSize + 22;
        ctx.fillStyle = "#003882";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bX, bY, bW, bH, 14);
        else ctx.rect(bX, bY, bW, bH);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(bText, W / 2, bY + bH / 2);
        ctx.restore();

        // Centered Bold Headline: "FALL IN LOVE WITH FINLAND."
        ctx.save();
        ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.65)";
        ctx.shadowBlur = 10;
        const titleY = bY + bH + 20;
        ctx.fillText("FALL IN LOVE WITH FINLAND.", W / 2, titleY);

        // Centered Call To Action: "VISIT www.ilovefinland.net"
        ctx.font = "800 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = "#00A3FF";
        const ctaY = titleY + 36;
        ctx.fillText("VISIT www.ilovefinland.net", W / 2, ctaY);

        // Centered Tagline: "YOUR FINLAND, DISCOVERED."
        ctx.font = "700 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = "#E2E8F0";
        const tagY = ctaY + 28;
        ctx.fillText("YOUR FINLAND, DISCOVERED.", W / 2, tagY);
        ctx.restore();

        ctx.restore(); // outroOpacity restore
        return;
      }

      if (isImgClip) {
        if (!this.sceneImages[targetSrc]) {
          const im = new Image();
          im.onload = () => this.render();
          im.src = targetSrc;
          this.sceneImages[targetSrc] = im;
        }
        const activeImg = this.sceneImages[targetSrc];
        const transDur = 0.60;
        const isTransition = sceneIndex > 0 && (this.currentTime - sStart) < transDur;

        if (isTransition) {
          const prevScene = scenes[sceneIndex - 1];
          const prevSrc = prevScene?.clip_url || targetSrc;
          const prevImg = this.sceneImages[prevSrc] || this.bgImg;
          if (prevImg && prevImg.complete && prevImg.naturalWidth > 0) {
            this._drawCoverImage(ctx, prevImg, W, H, 1.09);
          }
          const p = (this.currentTime - sStart) / transDur;
          const blend = p * p * (3.0 - 2.0 * p);
          if (activeImg && activeImg.complete && activeImg.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha = blend;
            this._drawCoverImage(ctx, activeImg, W, H, zoom);
            ctx.restore();
          }
        } else if (activeImg && activeImg.complete && activeImg.naturalWidth > 0) {
          this._drawCoverImage(ctx, activeImg, W, H, zoom);
        } else if (this.bgReady) {
          this._drawCoverImage(ctx, this.bgImg, W, H, zoom);
        } else {
          ctx.fillStyle = "#020617";
          ctx.fillRect(0, 0, W, H);
        }
      } else if (targetSrc) {
        if (this.currentVideoSrc !== targetSrc) {
          this.currentVideoSrc = targetSrc;
          this.videoReady = false;
          this.videoEl.src = targetSrc;
          this.videoEl.load();
          if (this.playing) {
            this.videoEl.play().catch(() => {});
          }
        }
        const hasVideo = this.videoEl.src && (this.videoReady || this.videoEl.readyState >= 2 || this.videoEl.currentTime > 0) && (this.videoEl.videoWidth > 0);
        if (hasVideo) {
          this._drawCoverImage(ctx, this.videoEl, W, H, 1.0);
        } else if (this.bgReady) {
          this._drawCoverImage(ctx, this.bgImg, W, H, 1.04 + progress * 0.08);
        } else {
          ctx.fillStyle = "#0b1f3a";
          ctx.fillRect(0, 0, W, H);
        }
      } else if (this.bgReady) {
        this._drawCoverImage(ctx, this.bgImg, W, H, 1.04 + progress * 0.08);
      } else {
        ctx.fillStyle = "#0b1f3a";
        ctx.fillRect(0, 0, W, H);
      }

      if (isTeslaNews) {
        // --- TESLA NEWS TEMPLATE STYLE ---
        // 1. Lower Third Navy Gradient Scrim (Protective Broadcast Grade Scrim - 100% Contrast against Snow & Daylight)
        const grad = ctx.createLinearGradient(0, H * 0.44, 0, H);
        grad.addColorStop(0, "rgba(2, 6, 23, 0)");
        grad.addColorStop(0.28, "rgba(2, 6, 23, 0.42)");
        grad.addColorStop(0.65, "rgba(2, 6, 23, 0.74)");
        grad.addColorStop(1, "rgba(2, 6, 23, 0.90)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, H * 0.44, W, H * 0.56);

        // 2. Original ILoveFinland Heart Logo (Upper Left, sized 62px, clearing guide)
        this._drawHeartLogo(ctx, W, H, layout);

        // 3. Left-Aligned Safe Area Typography with Smooth Fade Transitions (Zero Flicker)
        const textFadeIn = Math.min(1.0, (this.currentTime - sStart) / 0.40);
        const textFadeOut = (sceneIndex < scenes.length - 1) ? Math.min(1.0, (sEnd - this.currentTime) / 0.40) : 1.0;
        const textOpacity = Math.max(0.0, Math.min(1.0, textFadeIn * textFadeOut));

        ctx.save();
        ctx.globalAlpha = textOpacity;

        const safeMarginX = (W * (layout.safe_area?.horizontal_margin_pct || 9.5)) / 100;
        const maxTextWidth = W - safeMarginX * 2;
        const textAnchorY = (H * (layout.text_y_pct || 68)) / 100;

        // Pill Badge (NEWS)
        const badgeText = scene.badge || layout.badge_text || "NEWS";
        ctx.save();
        ctx.font = "800 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        const badgePadX = 14;
        const badgeTextW = ctx.measureText(badgeText).width;
        const badgeW = badgeTextW + badgePadX * 2;
        const badgeH = 28;
        const badgeY = textAnchorY - 96;

        ctx.fillStyle = layout.badge_color || "#003882";
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(safeMarginX, badgeY, badgeW, badgeH, 6);
        } else {
          ctx.rect(safeMarginX, badgeY, badgeW, badgeH);
        }
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, safeMarginX + badgeW / 2, badgeY + badgeH / 2);
        ctx.restore();

        // Left-Aligned Headline (Line 1: White, Line 2: Ice Blue, Line 3: Ice Blue)
        ctx.save();
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        // 3-Line News Headline (ALL 3 LINES SHARE THE SAME ADJUSTABLE FONT SIZE)
        const fHeadline = layout.headline_font_px || layout.line2_font_px || layout.line1_font_px || 28;
        let yCursor = badgeY + badgeH + 12;

        const drawCrispTextLine = (textLines, fillColor, fontPx) => {
          ctx.font = `800 ${fontPx}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          for (const line of textLines) {
            // 1. Protective dark contrast outline & deep shadow
            ctx.save();
            ctx.lineWidth = 3.5;
            ctx.lineJoin = "round";
            ctx.miterLimit = 2;
            ctx.strokeStyle = "rgba(2, 6, 23, 0.92)";
            ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            ctx.strokeText(line, safeMarginX, yCursor);
            ctx.restore();

            // 2. Crisp letter fill
            ctx.fillStyle = fillColor;
            ctx.fillText(line, safeMarginX, yCursor);
            yCursor += fontPx * 1.15;
          }
        };

        const l1Text = scene.line1 || reel.hook_text || "";
        const l1Lines = this._wrapLines(ctx, l1Text, maxTextWidth);
        drawCrispTextLine(l1Lines, "#ffffff", fHeadline);

        // Line 2: Blue or White (selectable via scene.line2_color, same fHeadline)
        const l2Text = scene.line2 || "";
        if (l2Text) {
          const l2Color = scene.line2_color === "blue" ? (layout.accent_color || "#38BDF8") : "#ffffff";
          const l2Lines = this._wrapLines(ctx, l2Text, maxTextWidth);
          drawCrispTextLine(l2Lines, l2Color, fHeadline);
        }

        // Line 3: Electric Blue Emphasis (#38BDF8) (Same fHeadline)
        const l3Text = scene.line3 || scene.line2_highlight || "";
        if (l3Text && l3Text !== l2Text) {
          const l3Color = layout.accent_color || "#38BDF8";
          const l3Lines = this._wrapLines(ctx, l3Text, maxTextWidth);
          drawCrispTextLine(l3Lines, l3Color, fHeadline);
        }

        // Secondary Explainer Subtitle (Prominent, High-Contrast Crisp Off-White)
        const subText = scene.subtitle || "";
        if (subText) {
          yCursor += 8;
          const fSub = layout.sub_font_px || 18;
          ctx.font = `600 ${fSub}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          const subLines = this._wrapLines(ctx, subText, maxTextWidth);
          for (const line of subLines) {
            ctx.save();
            ctx.lineWidth = 2.5;
            ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(2, 6, 23, 0.88)";
            ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
            ctx.shadowBlur = 6;
            ctx.strokeText(line, safeMarginX, yCursor);
            ctx.restore();

            ctx.fillStyle = "#F1F5F9";
            ctx.fillText(line, safeMarginX, yCursor);
            yCursor += fSub * 1.25;
          }
        }
        ctx.restore(); // headline restore
        ctx.restore(); // textOpacity restore
        ctx.restore();

      } else {
        // Classic centered style
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        const op = layout.scrim_opacity ?? 0.54;
        grad.addColorStop(0, `rgba(11, 31, 58, ${Math.min(0.85, op + 0.1)})`);
        grad.addColorStop(0.5, `rgba(15, 23, 42, ${op})`);
        grad.addColorStop(1, `rgba(2, 6, 23, ${Math.min(0.92, op + 0.25)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        this._drawHeartLogo(ctx, W, H, layout);

        const safeMarginX = (W * (layout.safe_area?.horizontal_margin_pct || 8)) / 100;
        const maxTextWidth = W - safeMarginX * 2;
        const textCenterY = (H * (layout.text_y_pct || 54)) / 100;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = "700 15px -apple-system, BlinkMacSystemFont, sans-serif";
        const tagText = scene.tag || "UPDATE";
        const tagW = ctx.measureText(tagText).width + 26;
        ctx.fillStyle = layout.accent_color || "#38BDF8";
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(W / 2 - tagW / 2, textCenterY - 82, tagW, 28, 14);
        } else {
          ctx.rect(W / 2 - tagW / 2, textCenterY - 82, tagW, 28);
        }
        ctx.fill();
        ctx.fillStyle = "#082f49";
        ctx.fillText(tagText, W / 2, textCenterY - 68);

        const f1 = layout.line1_font_px || 34;
        ctx.font = `800 ${f1}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 10;
        const l1Lines = this._wrapLines(ctx, scene.line1 || "", maxTextWidth);
        let yCursor = textCenterY - 18;
        for (const line of l1Lines) {
          ctx.fillText(line, W / 2, yCursor);
          yCursor += f1 * 1.18;
        }

        const f2 = layout.line2_font_px || 24;
        ctx.font = `600 ${f2}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = "#e2e8f0";
        const l2Lines = this._wrapLines(ctx, scene.line2 || "", maxTextWidth);
        yCursor += 8;
        for (const line of l2Lines) {
          ctx.fillText(line, W / 2, yCursor);
          yCursor += f2 * 1.24;
        }

        if (scene.subtitle) {
          const fSub = 14;
          ctx.font = `600 ${fSub}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          const subLines = this._wrapLines(ctx, scene.subtitle, maxTextWidth - 40);
          const subH = subLines.length * (fSub * 1.35) + 14;
          const subY = H * 0.77;
          ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
          const maxLineW = Math.max(...subLines.map((l) => ctx.measureText(l).width));
          const subBoxW = Math.min(maxTextWidth, maxLineW + 28);
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(W / 2 - subBoxW / 2, subY - 6, subBoxW, subH, 8);
            ctx.fill();
          } else {
            ctx.fillRect(W / 2 - subBoxW / 2, subY - 6, subBoxW, subH);
          }
          ctx.fillStyle = "#f8fafc";
          ctx.textAlign = "center";
          let sy = subY + 8;
          for (const l of subLines) {
            ctx.fillText(l, W / 2, sy);
            sy += fSub * 1.35;
          }
        }
        ctx.restore();
      }

      this._drawSafeAreaGuides(ctx, W, H, layout);
    }

    _drawSafeAreaGuides(ctx, W, H, layout) {
      if (!this.showSafeArea || this.exportMode) return;
      const topY = (H * (layout.safe_area?.profile_grid_top_pct || 10)) / 100;
      const botY = (H * (layout.safe_area?.profile_grid_bottom_pct || 90)) / 100;
      const sideX = (W * (layout.safe_area?.horizontal_margin_pct || 8.5)) / 100;

      ctx.save();
      ctx.fillStyle = "rgba(10, 25, 47, 0.40)";
      ctx.fillRect(0, 0, W, topY);
      ctx.fillRect(0, botY, W, H - botY);

      ctx.strokeStyle = "rgba(0, 163, 255, 0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(sideX, topY, W - sideX * 2, botY - topY);

      ctx.fillStyle = "#00A3FF";
      ctx.font = "700 12px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("Safe Area Guide", W - sideX - 10, topY + 18);
      ctx.restore();
    }

    _renderCoverFrame() {
      const ctx = this.coverCtx;
      const cw = this.coverCanvas.width;
      const ch = this.coverCanvas.height;
      const reel = this.reel;
      const layout = reel.layout || {};
      const coverData = reel.cover || {};
      const isTeslaNews = layout.template_style === "tesla_news" || !!coverData.badge || !!coverData.line3_highlight;

      ctx.clearRect(0, 0, cw, ch);

      // Background: cover image priority, then video frame, then bgImg
      const hasCoverVideo = this.videoEl.src && (this.videoReady || this.videoEl.readyState >= 2 || this.videoEl.currentTime > 0) && (this.videoEl.videoWidth > 0);
      if (this.coverImgReady && this.coverImg.naturalWidth > 0 && !/\.(mp4|mov|webm)$/i.test(this.coverImg.src)) {
        this._drawCoverImage(ctx, this.coverImg, cw, ch, 1.0);
      } else if (hasCoverVideo) {
        this._drawCoverImage(ctx, this.videoEl, cw, ch, 1.0);
      } else if (this.bgReady) {
        this._drawCoverImage(ctx, this.bgImg, cw, ch, 1.05);
      } else {
        ctx.fillStyle = "#0b1f3a";
        ctx.fillRect(0, 0, cw, ch);
      }

      if (isTeslaNews) {
        // --- 4:5 TESLA NEWS COVER LAYOUT ---
        // 1. Lower Gradient Scrim (Brought down by 50% for high visual transparency)
        const grad = ctx.createLinearGradient(0, ch * 0.50, 0, ch);
        grad.addColorStop(0, "rgba(2, 6, 23, 0)");
        grad.addColorStop(0.35, "rgba(2, 6, 23, 0.22)");
        grad.addColorStop(0.70, "rgba(2, 6, 23, 0.38)");
        grad.addColorStop(1, "rgba(2, 6, 23, 0.48)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, ch * 0.50, cw, ch * 0.50);

        // 2. Heart Logo at Upper Left (52px, X=16.5%, Y=15.5%) - comfortably inside 3:4 profile crop
        this._drawHeartLogo(ctx, cw, ch, {
          logo_visible: layout.logo_visible !== false,
          logo_size_px: layout.logo_size_px ? Math.round(layout.logo_size_px * 0.76) : 52,
          logo_x_pct: layout.logo_x_pct ?? 16.5,
          logo_y_pct: layout.logo_y_pct ?? 15.5,
          template_style: "tesla_news",
        });

        // 3. Lower Third Left-Aligned Content with comfortable 10% margin
        const leftMargin = cw * 0.10; // 36px on 360 width
        const badge = coverData.badge || "NEWS";

        // Blue NEWS badge
        ctx.save();
        ctx.font = "800 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        const bTextW = ctx.measureText(badge).width;
        const bW = bTextW + 24;
        const bH = 25;
        const bY = ch * 0.66;

        ctx.fillStyle = layout.badge_color || "#003882";
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(leftMargin, bY, bW, bH, 6);
        } else {
          ctx.rect(leftMargin, bY, bW, bH);
        }
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badge, leftMargin + bW / 2, bY + bH / 2);

        // Headline typography
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        const fH = 20;
        ctx.font = `800 ${fH}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = "#ffffff";

        let yCur = bY + bH + 10;
        const firstScene = (reel.scenes && reel.scenes[0]) ? reel.scenes[0] : {};
        const l1 = coverData.line1 || firstScene.line1 || reel.hook_text || "WINTER TYRES IN FINLAND";
        const l1Lines = this._wrapLines(ctx, l1, cw - leftMargin * 2);
        for (const line of l1Lines) {
          ctx.fillText(line, leftMargin, yCur);
          yCur += fH * 1.18;
        }

        const l2 = coverData.line2 || firstScene.line2 || "";
        if (l2) {
          const l2Color = (coverData.line2_color || firstScene.line2_color) === "blue" ? (layout.accent_color || "#00A3FF") : "#ffffff";
          ctx.fillStyle = l2Color;
          const l2Lines = this._wrapLines(ctx, l2, cw - leftMargin * 2);
          for (const line of l2Lines) {
            ctx.fillText(line, leftMargin, yCur);
            yCur += fH * 1.18;
          }
        }

        // Emphasis line 3: Electric Blue (#00A3FF)
        const fEmphasis = Math.round((layout.line2_font_px || 32) * 0.70);
        ctx.font = `800 ${fEmphasis}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = layout.accent_color || "#00A3FF";
        const l3 = coverData.line3_highlight || coverData.line3 || firstScene.line3 || firstScene.line2_highlight || "";
        if (l3 && l3 !== l2) {
          const l3Lines = this._wrapLines(ctx, l3, cw - leftMargin * 2);
          for (const line of l3Lines) {
            ctx.fillText(line, leftMargin, yCur);
            yCur += fEmphasis * 1.18;
          }
        }

        // Secondary Explainer Subtitle on Cover
        const covSub = coverData.subtitle || firstScene.subtitle || "";
        if (covSub) {
          yCur += 5;
          const fSub = 12;
          ctx.font = `600 ${fSub}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = "#E2E8F0";
          const subLines = this._wrapLines(ctx, covSub, cw - leftMargin * 2);
          for (const sline of subLines) {
            ctx.fillText(sline, leftMargin, yCur);
            yCur += fSub * 1.25;
          }
        }
        ctx.restore();

      } else {
        // Classic centered style
        const grad = ctx.createLinearGradient(0, 0, 0, ch);
        grad.addColorStop(0, "rgba(11, 31, 58, 0.65)");
        grad.addColorStop(0.6, "rgba(15, 23, 42, 0.55)");
        grad.addColorStop(1, "rgba(2, 6, 23, 0.85)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);

        this._drawHeartLogo(ctx, cw, ch, {
          logo_size_px: 52,
          logo_x_pct: 50,
          logo_y_pct: 22,
        });

        const l1 = coverData.line1 || "FINLAND UPDATE";
        const l2 = coverData.line2 || "Essential Nordic briefing";

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = "800 24px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(l1, cw / 2, ch * 0.58);

        ctx.font = "600 16px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(l2, cw / 2, ch * 0.68);

        ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(8, 8, cw - 16, ch - 16);
        ctx.restore();
      }

      // --- 3:4 INSTAGRAM PROFILE-GRID CROP OVERLAY - STRICTLY OMITTED IN EXPORT MODE ---
      if (this.showProfileCropGuide && !this.exportMode) {
        ctx.save();
        // 3:4 aspect ratio crop on 360x450:
        // Width in 3:4 is 450 * 0.75 = 337.5px. Side cut = (360 - 337.5) / 2 = 11.25px
        const sideCut = (cw - ch * 0.75) / 2; // 11.25px
        const rightCut = cw - sideCut;        // 348.75px

        // Shading on side strips
        ctx.fillStyle = "rgba(10, 25, 47, 0.45)";
        ctx.fillRect(0, 0, sideCut, ch);
        ctx.fillRect(rightCut, 0, sideCut, ch);

        // Dashed cyan line indicating 3:4 Instagram profile feed border
        ctx.strokeStyle = "rgba(0, 163, 255, 0.95)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(sideCut, 0, rightCut - sideCut, ch);

        // Pill badge in upper right corner of 3:4 crop
        ctx.fillStyle = "rgba(0, 163, 255, 0.95)";
        const labelW = 154;
        const labelH = 20;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(rightCut - labelW - 6, 8, labelW, labelH, 4);
        } else {
          ctx.rect(rightCut - labelW - 6, 8, labelW, labelH);
        }
        ctx.fill();

        ctx.fillStyle = "#001a33";
        ctx.font = "700 9px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("3:4 Instagram Profile Crop", rightCut - labelW / 2 - 6, 8 + labelH / 2);
        ctx.restore();
      }
    }

    _render34CoverFrame() {
      if (!this.cover34Canvas || !this.cover34Ctx) return;
      const ctx = this.cover34Ctx;
      const w34 = this.cover34Canvas.width;
      const h34 = this.cover34Canvas.height;
      ctx.clearRect(0, 0, w34, h34);

      // Temporarily disable crop guides to capture a clean 3:4 slice from coverCanvas
      const prevGuide = this.showProfileCropGuide;
      this.showProfileCropGuide = false;
      this._renderCoverFrame();

      const cw = this.coverCanvas.width;
      const ch = this.coverCanvas.height;
      const sideCut = (cw - ch * 0.75) / 2;
      const cropW = ch * 0.75;

      // Draw exact clean 3:4 center slice
      ctx.drawImage(this.coverCanvas, sideCut, 0, cropW, ch, 0, 0, w34, h34);

      // Restore guide state on 4:5 canvas
      this.showProfileCropGuide = prevGuide;
      this._renderCoverFrame();
    }

    // --- CLEAN EXPORT API (STRICTLY PREVENTS GUIDES IN ALL EXPORTS) ---
    exportCleanCover(cropFormat = "4:5") {
      this.exportMode = true;
      const prevGuide = this.showProfileCropGuide;
      this.showProfileCropGuide = false;
      this._renderCoverFrame();

      let dataUrl;
      if (cropFormat === "3:4") {
        const c34 = document.createElement("canvas");
        c34.width = 338;
        c34.height = 450;
        const ctx34 = c34.getContext("2d");
        const cw = this.coverCanvas.width;
        const ch = this.coverCanvas.height;
        const sideCut = (cw - ch * 0.75) / 2;
        ctx34.drawImage(this.coverCanvas, sideCut, 0, ch * 0.75, ch, 0, 0, 338, 450);
        dataUrl = c34.toDataURL("image/jpeg", 0.98);
      } else {
        dataUrl = this.coverCanvas.toDataURL("image/jpeg", 0.98);
      }

      this.exportMode = false;
      this.showProfileCropGuide = prevGuide;
      this.render();
      return dataUrl;
    }

    exportCleanReelFrame(sec = 0) {
      this.exportMode = true;
      const prevSafe = this.showSafeArea;
      this.showSafeArea = false;
      const prevTime = this.currentTime;
      this.currentTime = sec;

      this._renderReelFrame();
      const dataUrl = this.canvas.toDataURL("image/jpeg", 0.98);

      this.exportMode = false;
      this.showSafeArea = prevSafe;
      this.currentTime = prevTime;
      this.render();
      return dataUrl;
    }
  }

  window.ReelPlayer = ReelPlayer;
})();
