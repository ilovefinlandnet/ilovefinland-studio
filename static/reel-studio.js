/* ==============================================================================
   ILOVEFINLAND REEL STUDIO — CONTROLLER & CANVAS TIMELINE ENGINE
   ============================================================================== */

(function () {
  const CANVAS_W = 1080;
  const CANVAS_H = 1920;

  class ReelStudioApp {
    constructor() {
      this.currentProject = null;
      this.undoStack = [];
      this.redoStack = [];
      this.isPlaying = false;
      this.currentTime = 0.0;
      this.selectedTrack = null; // 'media', 'text', 'logo', 'audio'
      this.selectedId = null;
      this.zoomPxPerSec = 40; // Pixels per second on timeline
      this.safeAreaVisible = false;

      this.cachedImages = {};
      this.cachedVideos = {};
      this.logoImg = new Image();
      this.logoImg.src = "/assets/ilf-heart.png";
      this.logoReady = false;
      this.logoImg.onload = () => { this.logoReady = true; };

      this.audioEl = new Audio();
      this.audioEl.loop = false;
      this.animFrameId = null;
      this.lastAnimTimestamp = 0;

      // Drag states
      this.canvasDrag = null; // { startX, startY, origXPct, origYPct, item }
      this.timelineDrag = null; // { mode: 'move'|'trim_left'|'trim_right', startX, origStart, origEnd, item }
      this.isScrubbing = false;

      this.autosaveTimer = null;
    }

    init() {
      this.bindElements();
      this.bindEvents();
      this.loadHubProjects();
    }

    bindElements() {
      this.hubScreen = document.getElementById("reel-hub-screen");
      this.editorScreen = document.getElementById("reel-editor-screen");
      this.cardsGrid = document.getElementById("reel-projects-cards-container");
      this.canvas = document.getElementById("reel-canvas");
      this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
      this.viewport = document.getElementById("reel-canvas-viewport");
      this.safeAreaOverlay = document.getElementById("reel-safe-area-overlay");

      // Controls
      this.titleInput = document.getElementById("reel-title-input");
      this.autosaveBadge = document.getElementById("reel-autosave-status");
      this.timecodeCur = document.getElementById("reel-timecode-cur");
      this.timecodeTotal = document.getElementById("reel-timecode-total");
      this.playBtn = document.getElementById("btn-transport-play");
      this.iconPlay = document.getElementById("icon-play");
      this.iconPause = document.getElementById("icon-pause");

      // Timeline
      this.tracksViewport = document.getElementById("reel-tracks-viewport");
      this.timeRuler = document.getElementById("reel-time-ruler");
      this.playhead = document.getElementById("reel-playhead");
      this.laneMedia = document.getElementById("lane-media");
      this.laneText = document.getElementById("lane-text");
      this.laneLogo = document.getElementById("lane-logo");
      this.laneAudio = document.getElementById("lane-audio");
      this.laneVoiceover = document.getElementById("lane-voiceover");
      this.voiceoverEl = new Audio();

      // Inspector
      this.inspectorHeading = document.getElementById("inspector-heading");
      this.inspectorIcon = document.getElementById("inspector-icon");
      this.inspectorContent = document.getElementById("inspector-content");
    }

    bindEvents() {
      // Hub Actions
      document.getElementById("btn-reel-hub-new")?.addEventListener("click", () => this.createNewProject());
      document.getElementById("btn-reel-hub-import")?.addEventListener("click", () => this.showArticleImportModal());
      document.getElementById("btn-refresh-reel-projects")?.addEventListener("click", () => this.loadHubProjects());
      document.getElementById("btn-close-reel-editor")?.addEventListener("click", () => this.closeEditor());

      // Editor Topbar
      this.titleInput?.addEventListener("input", () => {
        if (this.currentProject) {
          this.currentProject.title = this.titleInput.value.trim() || "Untitled Reel";
          this.scheduleAutosave();
        }
      });
      document.getElementById("btn-reel-undo")?.addEventListener("click", () => this.undo());
      document.getElementById("btn-reel-redo")?.addEventListener("click", () => this.redo());
      document.getElementById("btn-save-reel-manual")?.addEventListener("click", () => this.saveProject(true));
      document.getElementById("btn-toggle-safe-area")?.addEventListener("click", () => this.toggleSafeArea());
      document.getElementById("btn-export-reel-trigger")?.addEventListener("click", () => this.exportMP4());

      // Drawer Tabs
      document.querySelectorAll(".reel-tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".reel-tab-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const target = btn.dataset.drawer;
          document.querySelectorAll(".drawer-panel").forEach((p) => p.classList.add("hidden"));
          const panel = document.getElementById(`drawer-panel-${target}`);
          if (panel) panel.classList.remove("hidden");
        });
      });

      // Mobile Bottom Sheet Dock Triggers (< 900px)
      document.querySelectorAll(".reel-mobile-dock-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".reel-mobile-dock-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.openMobileDrawer(btn.dataset.dock);
        });
      });

      document.getElementById("btn-close-mobile-drawer")?.addEventListener("click", () => this.closeMobileSheets());
      document.getElementById("btn-close-mobile-inspector")?.addEventListener("click", () => this.closeMobileSheets());
      document.getElementById("reel-mobile-backdrop")?.addEventListener("click", () => this.closeMobileSheets());
      this.bindTimelineResizer();

      // Media Uploads & Universal Drop Handling
      const dropzone = document.getElementById("reel-media-dropzone");
      const fileInput = document.getElementById("reel-media-file-input");
      dropzone?.addEventListener("click", () => fileInput?.click());

      // Universal drag & drop upload: allow dropping photos/videos anywhere in the Reel Editor (dropzone, preview, timeline, drawer)
      const uploadTargets = [
        dropzone,
        document.getElementById("drawer-panel-media"),
        document.getElementById("reel-media-pool-items"),
        document.getElementById("reel-preview-canvas"),
        document.querySelector(".reel-center-preview"),
        document.getElementById("reel-tracks-viewport"),
        document.getElementById("lane-media"),
        document.querySelector(".reel-bottom-timeline"),
      ].filter(Boolean);

      uploadTargets.forEach((el) => {
        el.addEventListener("dragover", (e) => {
          if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            if (dropzone) dropzone.style.borderColor = "#38bdf8";
          }
        });
        el.addEventListener("dragleave", (e) => {
          if (dropzone) dropzone.style.borderColor = "#475569";
        });
        el.addEventListener("drop", async (e) => {
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            if (dropzone) dropzone.style.borderColor = "#475569";
            await this.handleMediaFilesUpload(Array.from(e.dataTransfer.files));
          }
        });
      });

      fileInput?.addEventListener("change", async (e) => {
        if (e.target.files) {
          await this.handleMediaFilesUpload(Array.from(e.target.files));
        }
      });
      document.getElementById("btn-add-all-media-timeline")?.addEventListener("click", () => this.addAllMediaToTimeline());

      // Text presets & add
      document.getElementById("btn-add-custom-text")?.addEventListener("click", () => this.addTextBox());
      document.querySelectorAll(".btn-preset-text").forEach((btn) => {
        btn.addEventListener("click", () => this.addTextPreset(btn.dataset.preset));
      });

      // Audio & Voiceover
      document.getElementById("reel-music-select")?.addEventListener("change", (e) => this.onMusicSelectChange(e.target.value));
      document.getElementById("slider-music-vol")?.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        document.getElementById("val-music-vol").textContent = `${val}%`;
        const music = this.getAudioTrack("music");
        if (music) { music.volume = val / 100.0; this.scheduleAutosave(); }
      });
      document.getElementById("input-music-fadein")?.addEventListener("input", (e) => {
        const music = this.getAudioTrack("music");
        if (music) { music.fade_in = parseFloat(e.target.value) || 0.0; this.scheduleAutosave(); }
      });
      // Transitions wiring
      let currentSelectedTransition = "dissolve";
      document.querySelectorAll(".btn-transition-card").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".btn-transition-card").forEach((b) => {
            b.classList.remove("active");
            b.style.borderColor = "#303B4D";
          });
          btn.classList.add("active");
          btn.style.borderColor = "var(--brand-blue)";
          currentSelectedTransition = btn.dataset.trans;

          // If a media clip is selected in the timeline, apply immediately
          if (this.selectedTrack === "media" && this.selectedId && this.currentProject) {
            const clip = this.currentProject.timeline.tracks.media.find(c => c.id === this.selectedId);
            if (clip) {
              clip.transition_in = currentSelectedTransition;
              this.renderTimeline();
              this.renderInspector();
              this.render();
              this.scheduleAutosave();
            }
          }
        });
      });

      document.getElementById("slider-transition-dur")?.addEventListener("input", (e) => {
        const dur = parseFloat(e.target.value);
        const valEl = document.getElementById("val-transition-dur");
        if (valEl) valEl.textContent = `${dur.toFixed(1)}s`;
        if (this.selectedTrack === "media" && this.selectedId && this.currentProject) {
          const clip = this.currentProject.timeline.tracks.media.find(c => c.id === this.selectedId);
          if (clip) {
            clip.transition_duration = dur;
            this.render();
            this.scheduleAutosave();
          }
        }
      });

      document.getElementById("btn-apply-transition-all")?.addEventListener("click", () => {
        if (!this.currentProject) return;
        const dur = parseFloat(document.getElementById("slider-transition-dur")?.value || "0.5");
        const mediaClips = this.currentProject.timeline.tracks.media || [];
        mediaClips.forEach((c, idx) => {
          if (idx > 0) {
            c.transition_in = currentSelectedTransition;
            c.transition_duration = dur;
          }
        });
        this.pushState();
        this.renderTimeline();
        this.render();
        alert(`Applied '${currentSelectedTransition}' transition (${dur}s) across all clips!`);
      });

      // Visual Effects Wiring (Left Drawer)
      let currentSelectedEffect = "none";
      document.querySelectorAll(".btn-effect-preset").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".btn-effect-preset").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          currentSelectedEffect = btn.dataset.effect || "none";
          if (this.currentProject) {
            const mediaClips = this.currentProject.timeline.tracks.media || [];
            const clip = (this.selectedTrack === "media" && this.selectedId)
              ? mediaClips.find(c => c.id === this.selectedId)
              : mediaClips[0];
            if (clip) {
              clip.filter = currentSelectedEffect;
              this.renderInspector();
              this.render();
              this.scheduleAutosave();
            }
          }
        });
      });

      document.getElementById("btn-apply-effect-all")?.addEventListener("click", () => {
        if (!this.currentProject) return;
        const mediaClips = this.currentProject.timeline.tracks.media || [];
        mediaClips.forEach(c => { c.filter = currentSelectedEffect; });
        this.pushState();
        this.render();
        this.scheduleAutosave();
        alert(`Applied effect '${currentSelectedEffect}' across all clips!`);
      });

      // Microphone Voiceover Recording
      let mediaRecorder = null;
      let recordedChunks = [];
      let recTimerInterval = null;
      let recStartTime = 0;

      document.getElementById("btn-record-voiceover")?.addEventListener("click", async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          recordedChunks = [];
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunks.push(e.data);
          };
          mediaRecorder.onstop = async () => {
            clearInterval(recTimerInterval);
            stream.getTracks().forEach(t => t.stop());
            const blob = new Blob(recordedChunks, { type: "audio/webm" });
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const res = await (await fetch("/api/reel/upload-media", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    data_base64: reader.result,
                    filename: `voiceover_${Date.now()}.webm`,
                    media_type: "audio"
                  })
                })).json();
                if (res.ok && res.url) {
                  this.setAudioTrack("voiceover", res.url, "Recorded Voiceover");
                  alert("Voiceover recorded and attached successfully!");
                }
              } catch (err) {
                alert(`Failed to save voiceover: ${err.message}`);
              }
            };
            reader.readAsDataURL(blob);
            document.getElementById("voice-recording-status")?.classList.add("hidden");
          };

          mediaRecorder.start();
          recStartTime = Date.now();
          const statusBox = document.getElementById("voice-recording-status");
          const timerEl = document.getElementById("voice-rec-timer");
          if (statusBox) statusBox.classList.remove("hidden");
          recTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recStartTime) / 1000);
            const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
            const s = String(elapsed % 60).padStart(2, "0");
            if (timerEl) timerEl.textContent = `${m}:${s}`;
          }, 500);
        } catch (err) {
          alert(`Could not access microphone: ${err.message}`);
        }
      });

      document.getElementById("btn-stop-voiceover")?.addEventListener("click", () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      });

      // Logo properties
      document.getElementById("chk-logo-visible")?.addEventListener("change", (e) => {
        if (this.currentProject) {
          this.currentProject.timeline.tracks.logo.visible = e.target.checked;
          this.pushState();
          this.render();
        }
      });
      document.getElementById("slider-logo-size")?.addEventListener("input", (e) => {
        const px = parseInt(e.target.value, 10);
        document.getElementById("val-logo-size").textContent = `${px}px`;
        if (this.currentProject) {
          this.currentProject.timeline.tracks.logo.size_px = px;
          this.render();
          this.scheduleAutosave();
        }
      });
      document.getElementById("slider-logo-opacity")?.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        document.getElementById("val-logo-opacity").textContent = `${val}%`;
        if (this.currentProject) {
          this.currentProject.timeline.tracks.logo.opacity = val / 100.0;
          this.render();
          this.scheduleAutosave();
        }
      });
      document.querySelectorAll(".btn-logo-pos").forEach((b) => {
        b.addEventListener("click", () => this.setLogoPositionPreset(b.dataset.pos));
      });

      // Outro properties
      document.getElementById("chk-outro-enabled")?.addEventListener("change", (e) => {
        if (this.currentProject) {
          this.currentProject.timeline.tracks.outro.enabled = e.target.checked;
          this.recalculateTotalDuration();
          this.pushState();
          this.render();
        }
      });
      document.getElementById("slider-outro-dur")?.addEventListener("input", (e) => {
        const dur = parseFloat(e.target.value);
        document.getElementById("val-outro-dur").textContent = `${dur.toFixed(1)}s`;
        if (this.currentProject) {
          this.currentProject.timeline.tracks.outro.duration = dur;
          this.recalculateTotalDuration();
          this.render();
          this.scheduleAutosave();
        }
      });
      ["title", "sub", "web"].forEach((k) => {
        document.getElementById(`input-outro-${k}`)?.addEventListener("input", (e) => {
          if (this.currentProject) {
            const outro = this.currentProject.timeline.tracks.outro;
            if (k === "title") outro.title = e.target.value;
            if (k === "sub") outro.subtitle = e.target.value;
            if (k === "web") outro.website = e.target.value;
            this.render();
            this.scheduleAutosave();
          }
        });
      });

      // AI Assist
      document.querySelectorAll(".btn-ai-suggest").forEach((b) => {
        b.addEventListener("click", () => this.requestAiSuggestions(b.dataset.type));
      });

      // Transport controls
      document.getElementById("btn-transport-play")?.addEventListener("click", () => this.togglePlay());
      document.getElementById("btn-transport-rewind")?.addEventListener("click", () => this.seekTo(0));
      document.getElementById("btn-transport-step-back")?.addEventListener("click", () => this.seekTo(Math.max(0, this.currentTime - 1.0)));
      document.getElementById("btn-transport-step-fwd")?.addEventListener("click", () => this.seekTo(Math.min(this.getTotalDuration(), this.currentTime + 1.0)));

      // Timeline Tools
      document.getElementById("btn-timeline-split")?.addEventListener("click", () => this.splitAtPlayhead());
      document.getElementById("btn-timeline-duplicate")?.addEventListener("click", () => this.duplicateSelected());
      document.getElementById("btn-timeline-delete")?.addEventListener("click", () => this.deleteSelected());
      document.getElementById("btn-timeline-zoom-in")?.addEventListener("click", () => this.adjustZoom(1.25));
      document.getElementById("btn-timeline-zoom-out")?.addEventListener("click", () => this.adjustZoom(0.8));

      // Canvas Direct Manipulation (Mouse & Touch)
      this.bindCanvasInteraction();

      // Timeline Scrubbing & Dragging
      this.bindTimelineInteraction();

      // Keyboard shortcuts
      window.addEventListener("keydown", (e) => {
        if (!this.editorScreen || this.editorScreen.classList.contains("hidden")) return;
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.code === "Space") { e.preventDefault(); this.togglePlay(); }
        else if (e.code === "KeyS") { e.preventDefault(); this.splitAtPlayhead(); }
        else if (e.code === "KeyD" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); this.duplicateSelected(); }
        else if (e.code === "Delete" || e.code === "Backspace") { e.preventDefault(); this.deleteSelected(); }
        else if (e.code === "KeyZ" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (e.shiftKey) this.redo(); else this.undo();
        }
      });

      // Modals
      document.getElementById("btn-close-export-modal")?.addEventListener("click", () => {
        document.getElementById("reel-export-modal")?.classList.add("hidden");
      });
      document.getElementById("btn-cancel-import-article")?.addEventListener("click", () => {
        document.getElementById("reel-import-article-modal")?.classList.add("hidden");
      });
      document.getElementById("btn-confirm-import-article")?.addEventListener("click", () => this.executeArticleImport());
    }

    // =========================================================================
    // PROJECT LIFECYCLE & HUB
    // =========================================================================

    async loadHubProjects() {
      if (!this.cardsGrid) this.bindElements();
      if (!this.cardsGrid) return;
      this.cardsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);">⏳ Loading Reel projects…</div>`;
      try {
        const res = await (await fetch("/api/reel/projects")).json();
        const projs = res.projects || [];
        if (projs.length === 0) {
          this.cardsGrid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px 20px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1;">
              <div style="font-size:2.4rem;margin-bottom:8px;">🎬</div>
              <h3 style="font-size:1.1rem;font-weight:700;color:var(--navy);margin-bottom:4px;">No Reels Created Yet</h3>
              <p style="font-size:0.85rem;color:var(--muted);max-width:440px;margin:0 auto 16px;">
                Start a fresh blank Reel or import media and headlines from your article projects.
              </p>
              <button type="button" class="btn btn-primary" onclick="window.ReelStudio.createNewProject()">✨ Create First Reel</button>
            </div>
          `;
          return;
        }

        this.cardsGrid.innerHTML = projs.map((p) => {
          const thumb = p.thumbnail_url || (p.timeline?.tracks?.media?.[0]?.url) || "/assets/sample-clips/tesla-clean-bg.jpg";
          const dur = (p.duration_sec || 0).toFixed(1);
          const clips = p.clip_count || p.timeline?.tracks?.media?.length || 0;
          return `
            <div class="reel-card-item" data-id="${p.id}">
              <div class="reel-card-thumb-wrap">
                <img src="${thumb}" alt="${escapeHtml(p.title)}" class="reel-card-thumb" onerror="this.src='/assets/sample-clips/tesla-clean-bg.jpg'" />
                <span class="reel-card-badge">${p.status === 'exported' ? '✓ Exported' : 'Draft'}</span>
                <span class="reel-card-dur">${dur}s</span>
              </div>
              <div class="reel-card-body">
                <div class="reel-card-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</div>
                <div class="reel-card-meta">${clips} clips · Updated ${p.updated_at ? p.updated_at.slice(0, 10) : 'Recent'}</div>
                <div class="reel-card-actions">
                  <button type="button" class="btn btn-primary btn-sm btn-open-reel" data-id="${p.id}" style="flex:1;">
                    Edit Reel
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm btn-dup-reel" data-id="${p.id}" title="Duplicate">
                    📋
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm btn-del-reel" data-id="${p.id}" style="color:#ef4444;" title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("");

        // Bind card clicks
        this.cardsGrid.querySelectorAll(".btn-open-reel").forEach((b) => {
          b.addEventListener("click", (e) => { e.stopPropagation(); this.openProject(parseInt(b.dataset.id, 10)); });
        });
        this.cardsGrid.querySelectorAll(".reel-card-item").forEach((card) => {
          card.addEventListener("click", () => this.openProject(parseInt(card.dataset.id, 10)));
        });
        this.cardsGrid.querySelectorAll(".btn-dup-reel").forEach((b) => {
          b.addEventListener("click", async (e) => {
            e.stopPropagation();
            await fetch("/api/reel/project/duplicate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: parseInt(b.dataset.id, 10) }) });
            await this.loadHubProjects();
          });
        });
        this.cardsGrid.querySelectorAll(".btn-del-reel").forEach((b) => {
          b.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (confirm("Delete this Reel project?")) {
              await fetch("/api/reel/project/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: parseInt(b.dataset.id, 10) }) });
              await this.loadHubProjects();
            }
          });
        });
      } catch (err) {
        this.cardsGrid.innerHTML = `<div style="grid-column:1/-1;color:#ef4444;padding:20px;">Failed to load Reel projects: ${err.message}</div>`;
      }
    }

    async createNewProject(title = "New Blank Reel") {
      const btn = document.getElementById("btn-reel-hub-new");
      const origHtml = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">⏳ <span>Creating Blank Reel…</span></span>`;
      }
      try {
        const response = await fetch("/api/reel/project/new", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        const res = await response.json();
        if (!response.ok || !res.project) {
          throw new Error(res.error || `Server error (status ${response.status})`);
        }
        await this.openProject(res.project.id);
      } catch (err) {
        alert(`Failed to create project: ${err.message}`);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origHtml;
        }
      }
    }

    async openProject(id) {
      this.bindElements();
      try {
        const response = await fetch(`/api/reel/project?id=${id}`);
        const res = await response.json();
        if (!response.ok || !res.project) throw new Error(res.error || `Project #${id} not found`);
        this.currentProject = res.project;
        this.undoStack = [];
        this.redoStack = [];
        this.currentTime = 0.0;
        this.selectedTrack = null;
        this.selectedId = null;

        // Switch to editor screen
        if (this.hubScreen) this.hubScreen.classList.add("hidden");
        if (this.editorScreen) this.editorScreen.classList.remove("hidden");

        // Set title
        if (this.titleInput) this.titleInput.value = this.currentProject.title || "Untitled Reel";

        // Setup audio element
        const music = this.getAudioTrack("music");
        if (music && music.url) {
          this.audioEl.src = music.url;
        }

        this.renderMediaPoolUI();
        this.renderTimeline();
        this.renderInspector();
        this.seekTo(0);
        this.startRenderLoop();
      } catch (err) {
        alert(`Failed to open project: ${err.message}`);
      }
    }

    closeEditor() {
      this.pause();
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      if (this.editorScreen) this.editorScreen.classList.add("hidden");
      if (this.hubScreen) this.hubScreen.classList.remove("hidden");
      this.loadHubProjects();
    }

    async saveProject(showFeedback = false) {
      if (!this.currentProject) return;
      if (this.autosaveBadge) this.autosaveBadge.innerHTML = "<span>⏳</span> <span>Saving…</span>";
      try {
        await fetch("/api/reel/project/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: this.currentProject.id,
            title: this.titleInput?.value.trim() || this.currentProject.title,
            timeline: this.currentProject.timeline,
            status: this.currentProject.status || "draft",
          }),
        });
        if (this.autosaveBadge) this.autosaveBadge.innerHTML = "<span style='color:#10b981;'>✓</span> <span style='color:#10b981;'>Saved</span>";
        if (showFeedback) alert("Project saved successfully!");
      } catch (err) {
        if (this.autosaveBadge) this.autosaveBadge.innerHTML = "<span style='color:#ef4444;'>✕</span> <span style='color:#ef4444;'>Save Error</span>";
      }
    }

    scheduleAutosave() {
      if (this.autosaveBadge) this.autosaveBadge.innerHTML = "<span>•</span> <span>Unsaved edits</span>";
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = setTimeout(() => this.saveProject(false), 2000);
    }

    pushState() {
      if (!this.currentProject) return;
      this.undoStack.push(JSON.stringify(this.currentProject.timeline));
      if (this.undoStack.length > 25) this.undoStack.shift();
      this.redoStack = [];
      this.scheduleAutosave();
    }

    undo() {
      if (this.undoStack.length === 0) return;
      this.redoStack.push(JSON.stringify(this.currentProject.timeline));
      const prev = this.undoStack.pop();
      this.currentProject.timeline = JSON.parse(prev);
      this.renderTimeline();
      this.renderInspector();
      this.render();
      this.scheduleAutosave();
    }

    redo() {
      if (this.redoStack.length === 0) return;
      this.undoStack.push(JSON.stringify(this.currentProject.timeline));
      const next = this.redoStack.pop();
      this.currentProject.timeline = JSON.parse(next);
      this.renderTimeline();
      this.renderInspector();
      this.render();
      this.scheduleAutosave();
    }

    // =========================================================================
    // MEDIA & ASSET HANDLING
    // =========================================================================

    async handleMediaFilesUpload(files) {
      if (!this.currentProject) return;
      const pool = this.currentProject.timeline.media_pool || [];
      if (pool.length >= 10) {
        alert("Maximum 10 media files allowed per Reel.");
        return;
      }

      const progressBox = document.getElementById("reel-upload-progress-box");
      const statusText = document.getElementById("reel-upload-status-text");
      const statusPct = document.getElementById("reel-upload-status-pct");
      const progressBar = document.getElementById("reel-upload-progress-bar");

      if (progressBox) progressBox.classList.remove("hidden");

      const totalToUpload = Math.min(files.length, 10 - pool.length);
      let uploadedCount = 0;
      const newlyUploaded = [];

      for (let i = 0; i < files.length; i++) {
        if (pool.length >= 10) break;
        const file = files[i];

        // Format validation
        if (/\.heic$/i.test(file.name)) {
          alert(`"${file.name}" is an Apple HEIC file, which is not supported in web browsers. Please export as JPG or PNG and re-upload.`);
          continue;
        }

        // File size check: up to 200MB
        if (file.size > 200 * 1024 * 1024) {
          alert(`"${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum file size is 200MB.`);
          continue;
        }

        try {
          if (statusText) statusText.textContent = `Uploading ${i + 1} of ${totalToUpload}: ${file.name}...`;
          const pct = Math.round(((i) / totalToUpload) * 100);
          if (statusPct) statusPct.textContent = `${pct}%`;
          if (progressBar) progressBar.style.width = `${pct}%`;

          const isImg = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
          const localBlobUrl = URL.createObjectURL(file);

          let finalUrl = localBlobUrl;
          let remoteDuration = null;
          try {
            // Fast direct binary streaming upload (supports files up to 200MB without base64 overhead)
            const uploadEndpoint = `/api/reel/upload-raw?filename=${encodeURIComponent(file.name)}&type=${isImg ? "image" : "video"}`;
            const resp = await fetch(uploadEndpoint, {
              method: "POST",
              headers: { "Content-Type": file.type || "application/octet-stream" },
              body: file,
            });
            if (resp.ok) {
              const res = await resp.json();
              if (res.ok && res.url) {
                finalUrl = res.url;
                if (res.duration) remoteDuration = res.duration;
              }
            }
          } catch (netErr) {
            console.warn("Upload streaming failed, falling back to instant local preview:", netErr);
          }

          const item = {
            id: `med_${pool.length + 1}_${Date.now().toString(36)}`,
            filename: file.name,
            url: finalUrl,
            type: isImg ? "image" : "video",
            duration: isImg ? 3.5 : (remoteDuration || 5.0),
          };

          if (isImg) {
            const img = new Image();
            img.onload = () => this.render();
            img.src = finalUrl;
            this.cachedImages[finalUrl] = img;
            this.cachedImages[localBlobUrl] = img;
          }

          pool.push(item);
          newlyUploaded.push(item);
          uploadedCount++;
        } catch (err) {
          alert(`Failed to upload ${file.name}: ${err.message}`);
        }
      }

      if (statusPct) statusPct.textContent = "100%";
      if (progressBar) progressBar.style.width = "100%";
      setTimeout(() => {
        if (progressBox) progressBox.classList.add("hidden");
      }, 700);

      this.currentProject.timeline.media_pool = pool;
      this.renderMediaPoolUI();

      // Auto-add newly uploaded photos/videos to the timeline sequence and jump to preview
      if (newlyUploaded.length > 0) {
        newlyUploaded.forEach((item) => this.addMediaItemToTimeline(item));
      } else {
        this.pushState();
      }
    }

    renderMediaPoolUI() {
      const container = document.getElementById("reel-media-pool-items");
      const countEl = document.getElementById("reel-media-pool-count");
      if (!container || !this.currentProject) return;
      const pool = this.currentProject.timeline.media_pool || [];
      if (countEl) countEl.textContent = pool.length;

      container.innerHTML = pool.map((m, idx) => `
        <div class="reel-media-pool-card" data-idx="${idx}" draggable="true" data-id="${m.id}" title="Drag clip to timeline or click '+ Add to Reel'">
          ${m.type === 'video'
            ? `<video src="${m.url}#t=0.5" muted preload="metadata" style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>`
            : `<img src="${m.url}" alt="${escapeHtml(m.filename)}" onerror="this.src='/assets/sample-clips/tesla-clean-bg.jpg'" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" />`
          }
          <div class="reel-pool-card-hover">
            <button type="button" class="btn btn-sm btn-primary btn-add-pool-clip" data-idx="${idx}" style="font-size:0.7rem;padding:4px 8px;">
              + Add to Reel
            </button>
            <button type="button" class="btn btn-sm btn-ghost btn-del-pool-clip" data-idx="${idx}" style="color:#ef4444;font-size:0.7rem;padding:2px 6px;">
              ✕ Remove
            </button>
          </div>
          <span style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,0.75);color:#fff;font-size:0.65rem;padding:2px 5px;border-radius:3px;">
            ${m.type === 'video' ? '🎬 Video' : '📷 Photo'}
          </span>
        </div>
      `).join("");

      // Click or tap media card to immediately add to timeline and display on preview
      container.querySelectorAll(".reel-media-pool-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest(".btn-del-pool-clip")) return;
          const idx = parseInt(card.dataset.idx, 10);
          if (pool[idx]) this.addMediaItemToTimeline(pool[idx]);
        });
      });

      // Drag and drop from media pool
      container.querySelectorAll(".reel-media-pool-card").forEach((card) => {
        card.addEventListener("dragstart", (e) => {
          const idx = parseInt(card.dataset.idx, 10);
          e.dataTransfer.setData("application/json", JSON.stringify({ action: "add_clip", index: idx }));
        });
      });

      // Timeline drop targets
      const mediaLane = document.getElementById("lane-media");
      const tracksViewport = document.getElementById("reel-tracks-viewport");
      [mediaLane, tracksViewport].forEach((target) => {
        if (!target || target._hasReelDrop) return;
        target._hasReelDrop = true;
        target.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        });
        target.addEventListener("drop", (e) => {
          e.preventDefault();
          try {
            const raw = e.dataTransfer.getData("application/json");
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data && data.action === "add_clip" && typeof data.index === "number") {
              const item = this.currentProject.timeline.media_pool[data.index];
              if (item) this.addMediaItemToTimeline(item);
            }
          } catch (_) {}
        });
      });

      container.querySelectorAll(".btn-add-pool-clip").forEach((b) => {
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          this.addMediaItemToTimeline(pool[parseInt(b.dataset.idx, 10)]);
        });
      });
      container.querySelectorAll(".btn-del-pool-clip").forEach((b) => {
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          pool.splice(parseInt(b.dataset.idx, 10), 1);
          this.renderMediaPoolUI();
          this.pushState();
        });
      });
    }

    addAllMediaToTimeline() {
      if (!this.currentProject) return;
      const pool = this.currentProject.timeline.media_pool || [];
      const mediaClips = this.currentProject.timeline.tracks.media;
      let tCursor = mediaClips.length > 0 ? mediaClips[mediaClips.length - 1].end_sec : 0.0;

      for (const m of pool) {
        const dur = m.duration || 3.5;
        mediaClips.push({
          id: `clip_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
          media_id: m.id,
          filename: m.filename,
          url: m.url,
          type: m.type,
          start_sec: round1(tCursor),
          end_sec: round1(tCursor + dur),
          duration: round1(dur),
          src_in: 0.0,
          src_out: round1(dur),
          fit_mode: "cover",
          speed: 1.0,
          volume: 1.0,
          transition_in: mediaClips.length > 0 ? "dissolve" : "none",
          transition_duration: 0.4,
          rotation: 0,
        });
        tCursor += dur;
      }

      this.recalculateTotalDuration();
      this.pushState();
      this.renderTimeline();
      this.render();
    }

    addMediaItemToTimeline(m) {
      if (!this.currentProject || !m) return;
      const mediaClips = this.currentProject.timeline.tracks.media;
      const tCursor = mediaClips.length > 0 ? mediaClips[mediaClips.length - 1].end_sec : 0.0;
      const dur = m.duration || 3.5;

      const newClip = {
        id: `clip_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
        media_id: m.id,
        filename: m.filename,
        url: m.url,
        type: m.type,
        start_sec: round1(tCursor),
        end_sec: round1(tCursor + dur),
        duration: round1(dur),
        src_in: 0.0,
        src_out: round1(dur),
        fit_mode: "cover",
        speed: 1.0,
        volume: 1.0,
        transition_in: mediaClips.length > 0 ? "dissolve" : "none",
        transition_duration: 0.4,
        rotation: 0,
      };
      mediaClips.push(newClip);

      this.selectedTrack = "media";
      this.selectedId = newClip.id;
      this.recalculateTotalDuration();
      // Seek past any transition so the photo is 100% visible immediately on the preview canvas
      const targetSeek = round2(tCursor + Math.min(0.5, dur / 2));
      this.seekTo(targetSeek);
      this.pushState();
      this.renderTimeline();
      this.renderInspector();
      this.render();
      this.scheduleAutosave();
    }

    // =========================================================================
    // TEXT OVERLAYS & PRESETS
    // =========================================================================

    addTextBox(text = "NEW TEXT OVERLAY", type = "custom", yPct = null) {
      if (!this.currentProject) return;
      const textLayers = this.currentProject.timeline.tracks.text;
      const dur = Math.min(4.0, Math.max(2.0, this.getTotalDuration() - this.currentTime));
      const st = round1(this.currentTime);
      const en = round1(st + Math.max(2.0, dur));

      if (yPct == null) {
        // Choose intelligent non-colliding vertical position relative to active layers
        const activeLayers = textLayers.filter((t) => st < t.end_sec && en > t.start_sec);
        const usedY = activeLayers.map((l) => l.y_pct ?? 50.0);
        const candidates = [50.0, 68.0, 32.0, 80.0, 22.0];
        yPct = candidates.find((c) => !usedY.some((y) => Math.abs(y - c) < 9)) || (50.0 + (activeLayers.length * 10) % 35);
      }

      const newText = {
        id: `txt_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        text,
        start_sec: st,
        end_sec: en,
        x_pct: 50.0,
        y_pct: yPct,
        font_family: "Inter",
        font_size: 40,
        font_weight: "800",
        font_style: "normal",
        text_align: "center",
        color: "#FFFFFF",
        outline_color: "#0A192F",
        outline_width: 3,
        bg_color: "rgba(10, 25, 47, 0.85)",
        bg_padding: 10,
        bg_radius: 6,
        shadow: true,
        animation: "pop",
        opacity: 1.0,
        rotation: 0,
      };

      textLayers.push(newText);
      this.selectedTrack = "text";
      this.selectedId = newText.id;
      this.pushState();
      this.renderTimeline();
      this.renderInspector();
      this.render();
    }

    addTextPreset(preset) {
      if (!this.currentProject) return;
      if (preset === "headline_sub") {
        this.addTextBox("DISCOVER FINLAND'S MAGIC", "title", 48.0);
        this.addTextBox("EXPERIENCE AUTHENTIC NORDIC LIFE", "subtitle", 68.0);
      } else if (preset === "scenic_callout") {
        this.addTextBox("📍 ROVANIEMI, LAPLAND", "callout", 25.0);
      } else if (preset === "breaking_news") {
        this.addTextBox("🚨 BREAKING UPDATE", "title", 36.0);
      }
    }

    // =========================================================================
    // AUDIO ENGINE
    // =========================================================================

    getAudioTrack(type = "music") {
      if (!this.currentProject) return null;
      return (this.currentProject.timeline.tracks.audio || []).find((a) => a.type === type);
    }

    setAudioTrack(type = "voiceover", url, filename = "Audio Track") {
      if (!this.currentProject) return;
      if (!this.currentProject.timeline.tracks.audio) {
        this.currentProject.timeline.tracks.audio = [];
      }
      let aud = this.getAudioTrack(type);
      if (!aud) {
        aud = {
          id: `aud_${type}_${Date.now().toString(36)}`,
          type: type,
          filename: filename,
          url: url,
          start_sec: 0,
          duration: this.getTotalDuration(),
          volume: 1.0,
          fade_in: 0.2,
          fade_out: 0.5
        };
        this.currentProject.timeline.tracks.audio.push(aud);
      } else {
        aud.url = url;
        aud.filename = filename;
      }
      this.pushState();
      this.renderTimeline();
    }

    onMusicSelectChange(val) {
      if (!this.currentProject) return;
      let music = this.getAudioTrack("music");
      if (!music) {
        music = { id: "aud_music_1", type: "music", filename: "Music", url: "", start_sec: 0, duration: this.getTotalDuration(), volume: 0.75, fade_in: 0.5, fade_out: 1.0 };
        this.currentProject.timeline.tracks.audio.push(music);
      }

      if (val === "none") {
        music.url = "";
        this.audioEl.pause();
      } else if (val === "custom") {
        document.getElementById("reel-custom-audio-input")?.click();
      } else {
        music.url = val;
        this.audioEl.src = val;
      }
      this.pushState();
    }

    setLogoPositionPreset(preset) {
      if (!this.currentProject) return;
      const logo = this.currentProject.timeline.tracks.logo;
      if (preset === "top_center") { logo.x_pct = 50.0; logo.y_pct = 18.0; }
      else if (preset === "top_left") { logo.x_pct = 15.0; logo.y_pct = 18.0; }
      else if (preset === "bottom_center") { logo.x_pct = 50.0; logo.y_pct = 82.0; }
      else if (preset === "safe_header") { logo.x_pct = 50.0; logo.y_pct = 22.0; }
      this.pushState();
      this.render();
    }

    // =========================================================================
    // TIMELINE SCRIPTING & VIRTUAL SLICING
    // =========================================================================

    splitAtPlayhead() {
      if (!this.currentProject) return;
      const t = round1(this.currentTime);

      if (this.selectedTrack === "media" && this.selectedId) {
        const clips = this.currentProject.timeline.tracks.media;
        const idx = clips.findIndex((c) => c.id === this.selectedId);
        if (idx !== -1) {
          const c = clips[idx];
          if (t > c.start_sec + 0.3 && t < c.end_sec - 0.3) {
            const firstEnd = t;
            const secondStart = t;
            const secondEnd = c.end_sec;
            const dur1 = round1(firstEnd - c.start_sec);
            const dur2 = round1(secondEnd - secondStart);

            const c1 = { ...c, end_sec: firstEnd, duration: dur1, src_out: round1(c.src_in + dur1) };
            const c2 = {
              ...c,
              id: `clip_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
              start_sec: secondStart,
              end_sec: secondEnd,
              duration: dur2,
              src_in: round1(c.src_in + dur1),
              src_out: c.src_out,
            };

            clips.splice(idx, 1, c1, c2);
            this.selectedId = c2.id;
            this.pushState();
            this.renderTimeline();
            this.render();
          }
        }
      } else if (this.selectedTrack === "text" && this.selectedId) {
        const texts = this.currentProject.timeline.tracks.text;
        const idx = texts.findIndex((x) => x.id === this.selectedId);
        if (idx !== -1) {
          const item = texts[idx];
          if (t > item.start_sec + 0.3 && t < item.end_sec - 0.3) {
            const item1 = { ...item, end_sec: t };
            const item2 = {
              ...item,
              id: `txt_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
              start_sec: t,
            };
            texts.splice(idx, 1, item1, item2);
            this.selectedId = item2.id;
            this.pushState();
            this.renderTimeline();
            this.render();
          }
        }
      }
    }

    duplicateSelected() {
      if (!this.currentProject) return;
      if (this.selectedTrack === "media" && this.selectedId) {
        const clips = this.currentProject.timeline.tracks.media;
        const idx = clips.findIndex((c) => c.id === this.selectedId);
        if (idx !== -1) {
          const c = clips[idx];
          const cloned = {
            ...c,
            id: `clip_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
            start_sec: c.end_sec,
            end_sec: round1(c.end_sec + c.duration),
          };
          // Shift subsequent clips
          for (let i = idx + 1; i < clips.length; i++) {
            clips[i].start_sec = round1(clips[i].start_sec + c.duration);
            clips[i].end_sec = round1(clips[i].end_sec + c.duration);
          }
          clips.splice(idx + 1, 0, cloned);
          this.recalculateTotalDuration();
          this.selectedId = cloned.id;
          this.pushState();
          this.renderTimeline();
          this.render();
        }
      } else if (this.selectedTrack === "text" && this.selectedId) {
        const texts = this.currentProject.timeline.tracks.text;
        const item = texts.find((x) => x.id === this.selectedId);
        if (item) {
          const dur = item.end_sec - item.start_sec;
          const cloned = {
            ...item,
            id: `txt_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
            start_sec: item.end_sec,
            end_sec: round1(item.end_sec + dur),
            y_pct: Math.min(85, item.y_pct + 5),
          };
          texts.push(cloned);
          this.selectedId = cloned.id;
          this.pushState();
          this.renderTimeline();
          this.renderInspector();
          this.render();
        }
      }
    }

    deleteSelected() {
      if (!this.currentProject) return;
      if (this.selectedTrack === "media" && this.selectedId) {
        const clips = this.currentProject.timeline.tracks.media;
        const idx = clips.findIndex((c) => c.id === this.selectedId);
        if (idx !== -1) {
          const deletedDur = clips[idx].duration;
          clips.splice(idx, 1);
          // Shift forward
          for (let i = idx; i < clips.length; i++) {
            clips[i].start_sec = round1(clips[i].start_sec - deletedDur);
            clips[i].end_sec = round1(clips[i].end_sec - deletedDur);
          }
          this.selectedId = null;
          this.recalculateTotalDuration();
          this.pushState();
          this.renderTimeline();
          this.renderInspector();
          this.render();
        }
      } else if (this.selectedTrack === "text" && this.selectedId) {
        const texts = this.currentProject.timeline.tracks.text;
        const idx = texts.findIndex((x) => x.id === this.selectedId);
        if (idx !== -1) {
          texts.splice(idx, 1);
          this.selectedId = null;
          this.pushState();
          this.renderTimeline();
          this.renderInspector();
          this.render();
        }
      }
    }

    recalculateTotalDuration() {
      if (!this.currentProject) return;
      const mediaClips = this.currentProject.timeline.tracks.media;
      let total = 0.0;
      if (mediaClips.length > 0) {
        total = mediaClips[mediaClips.length - 1].end_sec;
      }
      if (this.currentProject.timeline.tracks.outro?.enabled) {
        total += (this.currentProject.timeline.tracks.outro.duration || 2.8);
      }
      this.currentProject.timeline.duration_sec = round1(Math.max(total, 5.0));
      if (this.timecodeTotal) this.timecodeTotal.textContent = formatSec(this.currentProject.timeline.duration_sec);
    }

    getTotalDuration() {
      return this.currentProject?.timeline?.duration_sec || 10.0;
    }

    adjustZoom(factor) {
      this.zoomPxPerSec = Math.max(15, Math.min(120, this.zoomPxPerSec * factor));
      this.renderTimeline();
    }

    // =========================================================================
    // MOBILE BOTTOM SHEET DRAWER & INSPECTOR (< 900px)
    // =========================================================================

    openMobileDrawer(drawerName) {
      const leftDrawer = document.getElementById("reel-left-drawer");
      const backdrop = document.getElementById("reel-mobile-backdrop");
      const titleEl = document.getElementById("mobile-drawer-title");

      const titles = {
        media: "📁 Media Pool (Photos & Videos)",
        text: "🔤 Add Text Overlays",
        audio: "🎵 Background Music & Audio",
        logo: "❤️ ILoveFinland Logo",
        outro: "🎬 Closing Outro Card",
        ai: "✨ AI Hooks & Captions",
      };

      if (titleEl && titles[drawerName]) titleEl.textContent = titles[drawerName];

      // Switch active tab
      document.querySelectorAll(".reel-tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.drawer === drawerName));
      document.querySelectorAll(".drawer-panel").forEach((p) => p.classList.add("hidden"));
      const panel = document.getElementById(`drawer-panel-${drawerName}`);
      if (panel) panel.classList.remove("hidden");

      // Slide up sheet
      leftDrawer?.classList.add("mobile-sheet-open");
      backdrop?.classList.add("active");

      // Close inspector if open
      document.getElementById("reel-inspector-panel")?.classList.remove("mobile-sheet-open");
    }

    closeMobileSheets() {
      document.getElementById("reel-left-drawer")?.classList.remove("mobile-sheet-open");
      document.getElementById("reel-inspector-panel")?.classList.remove("mobile-sheet-open");
      document.getElementById("reel-mobile-backdrop")?.classList.remove("active");
      document.querySelectorAll(".reel-mobile-dock-btn").forEach((b) => b.classList.remove("active"));
    }

    openMobileInspector() {
      if (window.innerWidth <= 580) {
        document.getElementById("reel-left-drawer")?.classList.remove("mobile-sheet-open");
        document.getElementById("reel-inspector-panel")?.classList.add("mobile-sheet-open");
        document.getElementById("reel-mobile-backdrop")?.classList.add("active");
      }
    }

    bindTimelineResizer() {
      const resizer = document.getElementById("reel-timeline-resizer");
      const timeline = document.querySelector(".reel-bottom-timeline");
      if (!resizer || !timeline) return;

      let startY = 0;
      let startH = 0;

      const onMove = (e) => {
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        if (!clientY) return;
        const delta = startY - clientY;
        const newH = Math.max(130, Math.min(420, startH + delta));
        timeline.style.height = `${newH}px`;
        this.render();
      };

      const onUp = () => {
        resizer.classList.remove("is-resizing");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onUp);
      };

      const onDown = (e) => {
        startY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        startH = timeline.offsetHeight;
        resizer.classList.add("is-resizing");
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("touchend", onUp);
      };

      resizer.addEventListener("pointerdown", onDown);
      resizer.addEventListener("touchstart", onDown, { passive: false });
    }

    // =========================================================================
    // DIRECT CANVAS INTERACTION (DRAG & RESIZE TEXT / LOGO)
    // =========================================================================

    bindCanvasInteraction() {
      if (!this.canvas) return;

      const getCanvasPoint = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
        const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
        const xCanvas = ((clientX - rect.left) / rect.width) * CANVAS_W;
        const yCanvas = ((clientY - rect.top) / rect.height) * CANVAS_H;
        return { xCanvas, yCanvas, xPct: (xCanvas / CANVAS_W) * 100.0, yPct: (yCanvas / CANVAS_H) * 100.0 };
      };

      const onPointerDown = (e) => {
        if (!this.currentProject) return;
        const { xCanvas, yCanvas, xPct, yPct } = getCanvasPoint(e);
        const t = this.currentTime;

        // Check if currently selected text layer was clicked on its handles
        if (this.selectedTrack === "text" && this.selectedId) {
          const selTxt = (this.currentProject.timeline.tracks.text || []).find((x) => x.id === this.selectedId);
          if (selTxt && selTxt._bounds) {
            const b = selTxt._bounds;
            const dx = xCanvas - b.cx;
            const dy = yCanvas - b.cy;
            const localX = dx * Math.cos(-b.rotRad) - dy * Math.sin(-b.rotRad);
            const localY = dx * Math.sin(-b.rotRad) + dy * Math.cos(-b.rotRad);

            // 1. Check Rotation Handle Knob
            const knobX = b.selX + b.selW / 2;
            const knobY = b.selY - 44;
            if (Math.hypot(localX - knobX, localY - knobY) < 32) {
              this.canvasDrag = {
                mode: "rotate",
                target: selTxt,
                origRot: selTxt.rotation_deg || 0,
                startCanvasX: xCanvas,
                startCanvasY: yCanvas,
                centerX: b.cx,
                centerY: b.cy
              };
              return;
            }

            // 2. Check Corner Resize Handles
            const corners = [
              [b.selX, b.selY],
              [b.selX + b.selW, b.selY],
              [b.selX, b.selY + b.selH],
              [b.selX + b.selW, b.selY + b.selH]
            ];
            for (let c = 0; c < corners.length; c++) {
              if (Math.hypot(localX - corners[c][0], localY - corners[c][1]) < 28) {
                const startDist = Math.hypot(dx, dy);
                this.canvasDrag = {
                  mode: "resize",
                  target: selTxt,
                  origFontSize: selTxt.font_size || 40,
                  startDist: Math.max(20, startDist),
                  centerX: b.cx,
                  centerY: b.cy
                };
                return;
              }
            }

            // 3. Check Inside Bounding Box (Move)
            if (localX >= b.selX - 10 && localX <= b.selX + b.selW + 10 &&
                localY >= b.selY - 10 && localY <= b.selY + b.selH + 10) {
              this.canvasDrag = {
                mode: "move",
                target: selTxt,
                origXPct: selTxt.x_pct,
                origYPct: selTxt.y_pct,
                startXPct: xPct,
                startYPct: yPct
              };
              return;
            }
          }
        }

        // Check if clicking Logo
        const logo = this.currentProject.timeline.tracks.logo;
        if (logo && logo.visible) {
          const logoX = (logo.x_pct / 100.0) * CANVAS_W;
          const logoY = (logo.y_pct / 100.0) * CANVAS_H;
          const logoSize = (logo.size_px || 76) * 2;
          const distLogo = Math.hypot(xCanvas - logoX, yCanvas - logoY);

          if (this.selectedTrack === "logo" && distLogo < (logoSize / 2 + 30)) {
            const cornerDist = Math.hypot(Math.abs(xCanvas - logoX) - logoSize / 2, Math.abs(yCanvas - logoY) - logoSize / 2);
            if (cornerDist < 30) {
              this.canvasDrag = {
                mode: "resize_logo",
                target: logo,
                origSize: logo.size_px || 76,
                startDist: distLogo,
                centerX: logoX,
                centerY: logoY
              };
              return;
            }
          }

          if (distLogo < logoSize / 2 + 10) {
            this.selectedTrack = "logo";
            this.selectedId = "logo";
            this.canvasDrag = {
              mode: "move",
              target: logo,
              origXPct: logo.x_pct,
              origYPct: logo.y_pct,
              startXPct: xPct,
              startYPct: yPct
            };
            this.renderTimeline();
            this.renderInspector();
            this.openMobileInspector();
            this.render();
            return;
          }
        }

        // Check if clicking another visible text layer
        const textLayers = (this.currentProject.timeline.tracks.text || []).filter(
          (txt) => t >= txt.start_sec && t <= txt.end_sec
        );
        for (let i = textLayers.length - 1; i >= 0; i--) {
          const txt = textLayers[i];
          const tx = (txt.x_pct / 100.0) * CANVAS_W;
          const ty = (txt.y_pct / 100.0) * CANVAS_H;
          if (Math.hypot(xCanvas - tx, yCanvas - ty) < 90) {
            this.selectedTrack = "text";
            this.selectedId = txt.id;
            this.canvasDrag = {
              mode: "move",
              target: txt,
              origXPct: txt.x_pct,
              origYPct: txt.y_pct,
              startXPct: xPct,
              startYPct: yPct
            };
            this.renderTimeline();
            this.renderInspector();
            this.openMobileInspector();
            this.render();
            return;
          }
        }

        // Clicked background: deselect
        this.selectedTrack = null;
        this.selectedId = null;
        this.renderTimeline();
        this.renderInspector();
        this.render();
      };

      const onPointerMove = (e) => {
        if (!this.canvasDrag) return;
        if (e.cancelable) e.preventDefault();
        const { xCanvas, yCanvas, xPct, yPct } = getCanvasPoint(e);

        if (this.canvasDrag.mode === "move") {
          const dx = xPct - this.canvasDrag.startXPct;
          const dy = yPct - this.canvasDrag.startYPct;
          let newX = this.canvasDrag.origXPct + dx;
          let newY = this.canvasDrag.origYPct + dy;

          // Alignment Guides Snapping
          if (Math.abs(newX - 50.0) < 2.5) {
            newX = 50.0;
            this.showGuideX = true;
          } else {
            this.showGuideX = false;
          }

          if (Math.abs(newY - 50.0) < 2.0) {
            newY = 50.0;
            this.showGuideY = true;
          } else {
            this.showGuideY = false;
          }

          this.canvasDrag.target.x_pct = Math.max(5, Math.min(95, round1(newX)));
          this.canvasDrag.target.y_pct = Math.max(5, Math.min(95, round1(newY)));
          this.render();
        } else if (this.canvasDrag.mode === "resize") {
          const curDist = Math.hypot(xCanvas - this.canvasDrag.centerX, yCanvas - this.canvasDrag.centerY);
          const ratio = curDist / this.canvasDrag.startDist;
          const newSize = Math.max(16, Math.min(120, Math.round(this.canvasDrag.origFontSize * ratio)));
          this.canvasDrag.target.font_size = newSize;
          const slider = document.getElementById("prop-slider-fontsize");
          if (slider) slider.value = newSize;
          const label = document.getElementById("prop-val-fontsize");
          if (label) label.textContent = `${newSize}px`;
          this.render();
        } else if (this.canvasDrag.mode === "rotate") {
          const dx = xCanvas - this.canvasDrag.centerX;
          const dy = yCanvas - this.canvasDrag.centerY;
          let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
          [-180, -90, 0, 90, 180, 270, 360].forEach((snap) => {
            if (Math.abs(angle - snap) < 4.0) angle = snap;
          });
          const normalized = Math.round(((angle % 360) + 360) % 360);
          const degFinal = normalized > 180 ? normalized - 360 : normalized;
          this.canvasDrag.target.rotation_deg = degFinal;
          const rotSlider = document.getElementById("prop-slider-rotation");
          if (rotSlider) rotSlider.value = degFinal;
          const rotLabel = document.getElementById("prop-val-rotation");
          if (rotLabel) rotLabel.textContent = `${degFinal}°`;
          this.render();
        } else if (this.canvasDrag.mode === "resize_logo") {
          const curDist = Math.hypot(xCanvas - this.canvasDrag.centerX, yCanvas - this.canvasDrag.centerY);
          const ratio = curDist / Math.max(20, this.canvasDrag.startDist);
          const newSize = Math.max(30, Math.min(220, Math.round(this.canvasDrag.origSize * ratio)));
          this.canvasDrag.target.size_px = newSize;
          const slider = document.getElementById("prop-slider-logosize");
          if (slider) slider.value = newSize;
          const label = document.getElementById("prop-val-logosize");
          if (label) label.textContent = `${newSize}px`;
          this.render();
        }
      };

      const onPointerUp = () => {
        if (this.canvasDrag) {
          this.canvasDrag = null;
          this.showGuideX = false;
          this.showGuideY = false;
          this.pushState();
          this.render();
        }
      };

      this.canvas.addEventListener("mousedown", onPointerDown);
      window.addEventListener("mousemove", onPointerMove);
      window.addEventListener("mouseup", onPointerUp);

      this.canvas.addEventListener("touchstart", onPointerDown, { passive: false });
      window.addEventListener("touchmove", onPointerMove, { passive: false });
      window.addEventListener("touchend", onPointerUp);
      window.addEventListener("touchcancel", onPointerUp);
    }

    bindTrimHandle(handleEl, targetType, targetObj, isLeft, blockEl) {
      if (!handleEl || !blockEl) return;

      handleEl.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      const onStart = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
        const startX = clientX;

        const origStart = targetObj.start_sec || 0;
        const origEnd = targetObj.end_sec || (origStart + (targetObj.duration || 5));
        const origDur = targetObj.duration || (origEnd - origStart);

        // Snapshot subsequent clips for media right-edge trim to avoid cumulative drift
        const clips = (targetType === "media" && !isLeft) ? (this.currentProject.timeline.tracks.media || []) : [];
        const idx = clips.indexOf(targetObj);
        const subSnapshots = [];
        if (idx !== -1) {
          for (let i = idx + 1; i < clips.length; i++) {
            subSnapshots.push({ clip: clips[i], origStart: clips[i].start_sec, origEnd: clips[i].end_sec });
          }
        }

        blockEl.classList.add("is-trimming");

        const onMove = (me) => {
          if (me.cancelable) me.preventDefault();
          const curX = me.touches && me.touches.length > 0 ? me.touches[0].clientX : (me.changedTouches ? me.changedTouches[0].clientX : me.clientX);
          const deltaSec = (curX - startX) / this.zoomPxPerSec;

          if (targetType === "media") {
            if (!isLeft) {
              const newDur = Math.max(0.5, Math.min(60.0, round2(origDur + deltaSec)));
              targetObj.duration = newDur;
              targetObj.end_sec = round2(targetObj.start_sec + newDur);
              targetObj.src_out = round2((targetObj.src_in || 0) + newDur);
              blockEl.style.width = `${newDur * this.zoomPxPerSec}px`;

              // Shift subsequent clips visually using fixed snapshot deltas
              const diff = newDur - origDur;
              for (const sub of subSnapshots) {
                sub.clip.start_sec = round2(sub.origStart + diff);
                sub.clip.end_sec = round2(sub.origEnd + diff);
                const nextBlock = this.laneMedia.querySelector(`.reel-clip-block[data-id="${sub.clip.id}"]`);
                if (nextBlock) nextBlock.style.left = `${sub.clip.start_sec * this.zoomPxPerSec}px`;
              }

              // Live update inspector inputs if currently visible
              const durSlider = document.getElementById("prop-slider-photodur");
              if (durSlider) durSlider.value = newDur;
              const durText = document.getElementById("prop-val-photodur");
              if (durText) durText.textContent = `${newDur}s`;

              this.seekTo(targetObj.end_sec);
            } else {
              const newStart = Math.max(0, round2(origStart + deltaSec));
              const newDur = Math.max(0.5, round2(origEnd - newStart));
              targetObj.start_sec = newStart;
              targetObj.duration = newDur;
              blockEl.style.left = `${newStart * this.zoomPxPerSec}px`;
              blockEl.style.width = `${newDur * this.zoomPxPerSec}px`;
              this.seekTo(newStart);
            }
          } else if (targetType === "text" || targetType === "logo") {
            if (targetType === "logo") targetObj.always_on = false;
            if (isLeft) {
              const newStart = Math.max(0, Math.min(origEnd - 0.5, round2(origStart + deltaSec)));
              targetObj.start_sec = newStart;
              blockEl.style.left = `${newStart * this.zoomPxPerSec}px`;
              blockEl.style.width = `${Math.max(10, (origEnd - newStart) * this.zoomPxPerSec)}px`;
              this.seekTo(newStart);
            } else {
              const newEnd = Math.max(origStart + 0.5, round2(origEnd + deltaSec));
              targetObj.end_sec = newEnd;
              blockEl.style.width = `${Math.max(10, (newEnd - origStart) * this.zoomPxPerSec)}px`;
              this.seekTo(newEnd);
            }
          } else if (targetType === "audio" || targetType === "voiceover") {
            if (isLeft) {
              const newStart = Math.max(0, round2(origStart + deltaSec));
              targetObj.start_sec = newStart;
              blockEl.style.left = `${newStart * this.zoomPxPerSec}px`;
              this.seekTo(newStart);
            } else {
              const newDur = Math.max(0.5, round2(origDur + deltaSec));
              targetObj.duration = newDur;
              targetObj.end_sec = round2((targetObj.start_sec || 0) + newDur);
              blockEl.style.width = `${newDur * this.zoomPxPerSec}px`;
              this.seekTo(targetObj.end_sec);
            }
          }
        };

        const onEnd = () => {
          this._lastDragEndTime = Date.now();
          blockEl.classList.remove("is-trimming");
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onEnd);
          window.removeEventListener("touchmove", onMove);
          window.removeEventListener("touchend", onEnd);
          window.removeEventListener("touchcancel", onEnd);
          this.recalculateTotalDuration();
          this.pushState();
          this.renderTimeline();
          this.renderInspector();
          this.render();
          this.scheduleAutosave();
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onEnd);
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("touchend", onEnd);
        window.addEventListener("touchcancel", onEnd);
      };

      handleEl.addEventListener("mousedown", onStart);
      handleEl.addEventListener("touchstart", onStart, { passive: false });
    }

    bindClipMove(blockEl, targetType, targetObj) {
      if (!blockEl) return;

      let isDragging = false;
      let startX = 0;
      let origStart = 0;
      let origEnd = 0;

      const onMouseDown = (e) => {
        if (e.target.classList.contains("reel-trim-handle-left") || e.target.classList.contains("reel-trim-handle-right")) {
          return;
        }
        startX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        origStart = targetObj.start_sec || 0;
        origEnd = targetObj.end_sec || (origStart + (targetObj.duration || 5));
        isDragging = false;

        const onMouseMove = (me) => {
          const curX = me.clientX || (me.touches && me.touches[0] ? me.touches[0].clientX : 0);
          const deltaPx = curX - startX;
          if (Math.abs(deltaPx) > 4) {
            isDragging = true;
          }
          if (!isDragging) return;

          const deltaSec = deltaPx / this.zoomPxPerSec;
          const dur = (targetObj.duration) || (origEnd - origStart);
          const newStart = Math.max(0, round2(origStart + deltaSec));

          targetObj.start_sec = newStart;
          if (targetObj.end_sec) {
            targetObj.end_sec = round2(newStart + dur);
          }
          if (targetType === "logo") {
            targetObj.always_on = false;
          }

          blockEl.style.left = `${newStart * this.zoomPxPerSec}px`;
        };

        const onMouseUp = () => {
          this._lastDragEndTime = Date.now();
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
          window.removeEventListener("touchmove", onMouseMove);
          window.removeEventListener("touchend", onMouseUp);

          if (isDragging) {
            this.recalculateTotalDuration();
            this.pushState();
            this.renderTimeline();
            this.renderInspector();
            this.render();
            this.scheduleAutosave();
          }
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchmove", onMouseMove, { passive: false });
        window.addEventListener("touchend", onMouseUp);
      };

      blockEl.addEventListener("mousedown", onMouseDown);
      blockEl.addEventListener("touchstart", onMouseDown, { passive: false });
    }

    // =========================================================================
    // TIMELINE RENDERING & INTERACTION
    // =========================================================================

    renderTimeline() {
      if (!this.currentProject) return;
      const totalDur = this.getTotalDuration();
      const totalWidthPx = Math.max(800, totalDur * this.zoomPxPerSec + 120);

      // Width of timeline tracks viewport
      if (this.timeRuler) this.timeRuler.style.width = `${totalWidthPx}px`;
      if (this.laneMedia) this.laneMedia.style.width = `${totalWidthPx}px`;
      if (this.laneText) this.laneText.style.width = `${totalWidthPx}px`;
      if (this.laneLogo) this.laneLogo.style.width = `${totalWidthPx}px`;
      if (this.laneAudio) this.laneAudio.style.width = `${totalWidthPx}px`;
      if (this.laneVoiceover) this.laneVoiceover.style.width = `${totalWidthPx}px`;

      // 1. Draw Time Ruler Marks
      if (this.timeRuler) {
        this.timeRuler.innerHTML = "";
        const stepSec = this.zoomPxPerSec > 50 ? 1 : 2;
        for (let s = 0; s <= totalDur + 1; s += stepSec) {
          const mark = document.createElement("div");
          mark.style.cssText = `position:absolute;left:${s * this.zoomPxPerSec}px;top:0;bottom:0;display:flex;align-items:center;font-size:0.65rem;font-family:monospace;color:#94a3b8;padding-left:4px;border-left:1px solid #475569;pointer-events:none;`;
          mark.textContent = `${s}s`;
          this.timeRuler.appendChild(mark);
        }
      }

      // 2. Render Media Clips
      if (this.laneMedia) {
        this.laneMedia.innerHTML = "";
        const mediaClips = this.currentProject.timeline.tracks.media || [];
        mediaClips.forEach((c, idx) => {
          const leftPx = c.start_sec * this.zoomPxPerSec;
          const widthPx = c.duration * this.zoomPxPerSec;
          const block = document.createElement("div");
          block.className = `reel-clip-block ${this.selectedId === c.id ? "active" : ""}`;
          block.style.left = `${leftPx}px`;
          block.style.width = `${widthPx}px`;
          block.dataset.id = c.id;

          const transBadge = (idx > 0 && c.transition_in && c.transition_in !== "none")
            ? `<span style="background:rgba(22,139,255,0.3);border:1px solid #168BFF;color:#38bdf8;font-size:0.6rem;padding:1px 4px;border-radius:3px;margin-right:4px;">⚡${c.transition_in}</span>`
            : "";

          block.innerHTML = `
            <div class="reel-trim-handle-left" title="Trim start"></div>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.68rem;display:flex;align-items:center;">
              ${transBadge} ${c.type === 'video' ? '🎬' : '📷'} ${escapeHtml(c.filename)}
            </span>
            <div class="reel-trim-handle-right" title="Trim end / duration"></div>
          `;

          const hLeft = block.querySelector(".reel-trim-handle-left");
          const hRight = block.querySelector(".reel-trim-handle-right");
          this.bindTrimHandle(hLeft, "media", c, true, block);
          this.bindTrimHandle(hRight, "media", c, false, block);

          if (idx > 0) {
            const transBtn = document.createElement("button");
            transBtn.type = "button";
            transBtn.className = `reel-timeline-trans-btn ${this.selectedTrack === 'transition' && this.selectedId === c.id ? 'active' : ''}`;
            transBtn.style.left = `${Math.max(0, leftPx - 11)}px`;
            transBtn.title = `Transition: ${c.transition_in || 'cut'}`;
            transBtn.innerHTML = `⚡`;
            transBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              this.selectedTrack = "transition";
              this.selectedId = c.id;
              this.renderTimeline();
              this.renderInspector();
              this.openMobileInspector();
            });
            this.laneMedia.appendChild(transBtn);
          }

          block.addEventListener("click", (e) => {
            if (Date.now() - (this._lastDragEndTime || 0) < 250) return;
            e.stopPropagation();
            this.selectedTrack = "media";
            this.selectedId = c.id;
            this.seekTo(c.start_sec);
            this.renderTimeline();
            this.renderInspector();
            this.openMobileInspector();
          });
          this.laneMedia.appendChild(block);
        });
      }

      // 3. Render Text Layers (Multi-row dynamic stacking for overlapping text clips)
      if (this.laneText) {
        this.laneText.innerHTML = "";
        const textLayers = this.currentProject.timeline.tracks.text || [];

        // Compute sub-row per clip so overlapping text clips stack cleanly without obscuring each other
        const rowEndTimes = [];
        const clipRows = [];
        textLayers.forEach((txt) => {
          let assignedRow = -1;
          for (let r = 0; r < rowEndTimes.length; r++) {
            if (rowEndTimes[r] <= (txt.start_sec || 0) + 0.05) {
              assignedRow = r;
              rowEndTimes[r] = txt.end_sec || 5.0;
              break;
            }
          }
          if (assignedRow === -1) {
            assignedRow = rowEndTimes.length;
            rowEndTimes.push(txt.end_sec || 5.0);
          }
          clipRows.push(assignedRow);
        });

        const totalRows = Math.max(1, rowEndTimes.length);
        const rowH = 32;
        const totalLaneH = totalRows * rowH + 4;
        this.laneText.style.height = `${totalLaneH}px`;
        const textHeader = document.getElementById("header-text");
        if (textHeader) textHeader.style.height = `${totalLaneH}px`;

        textLayers.forEach((txt, idx) => {
          const rowIdx = clipRows[idx];
          const leftPx = (txt.start_sec || 0) * this.zoomPxPerSec;
          const widthPx = Math.max(28, ((txt.end_sec || 5.0) - (txt.start_sec || 0)) * this.zoomPxPerSec);
          const block = document.createElement("div");
          block.className = `reel-clip-block type-text ${this.selectedId === txt.id ? "active" : ""}`;
          block.style.left = `${leftPx}px`;
          block.style.width = `${widthPx}px`;
          block.style.top = `${rowIdx * rowH + 2}px`;
          block.style.bottom = "auto";
          block.style.height = `${rowH - 4}px`;
          block.dataset.id = txt.id;
          block.innerHTML = `
            <div class="reel-trim-handle-left" title="Trim start"></div>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.68rem;">🔤 ${escapeHtml(txt.text)}</span>
            <div class="reel-trim-handle-right" title="Trim end / stretch duration"></div>
          `;

          const hLeft = block.querySelector(".reel-trim-handle-left");
          const hRight = block.querySelector(".reel-trim-handle-right");
          this.bindTrimHandle(hLeft, "text", txt, true, block);
          this.bindTrimHandle(hRight, "text", txt, false, block);
          this.bindClipMove(block, "text", txt);

          block.addEventListener("click", (e) => {
            if (Date.now() - (this._lastDragEndTime || 0) < 250) return;
            e.stopPropagation();
            this.selectedTrack = "text";
            this.selectedId = txt.id;
            this.seekTo(txt.start_sec || 0);
            this.renderTimeline();
            this.renderInspector();
            this.openMobileInspector();
          });
          this.laneText.appendChild(block);
        });
      }

      // 4. Render Logo Track
      if (this.laneLogo) {
        this.laneLogo.innerHTML = "";
        const logo = this.currentProject.timeline.tracks.logo;
        if (logo && logo.visible) {
          const leftPx = (logo.start_sec || 0) * this.zoomPxPerSec;
          const widthPx = ((logo.always_on ? totalDur : (logo.end_sec || totalDur)) - (logo.start_sec || 0)) * this.zoomPxPerSec;
          const block = document.createElement("div");
          block.className = `reel-clip-block type-logo ${this.selectedTrack === "logo" ? "active" : ""}`;
          block.style.left = `${leftPx}px`;
          block.style.width = `${Math.max(24, widthPx)}px`;
          block.innerHTML = `
            <div class="reel-trim-handle-left" title="Trim start"></div>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.68rem;">💙 ILoveFinland Logo (${Math.round((logo.opacity || 0.95) * 100)}%)</span>
            <div class="reel-trim-handle-right" title="Trim end / stretch duration"></div>
          `;

          const hLeft = block.querySelector(".reel-trim-handle-left");
          const hRight = block.querySelector(".reel-trim-handle-right");
          this.bindTrimHandle(hLeft, "logo", logo, true, block);
          this.bindTrimHandle(hRight, "logo", logo, false, block);
          this.bindClipMove(block, "logo", logo);

          block.addEventListener("click", (e) => {
            if (Date.now() - (this._lastDragEndTime || 0) < 250) return;
            e.stopPropagation();
            this.selectedTrack = "logo";
            this.selectedId = "logo";
            this.renderTimeline();
            this.renderInspector();
            this.openMobileInspector();
          });
          this.laneLogo.appendChild(block);
        }
      }

      // 5. Render Music Track
      if (this.laneAudio) {
        this.laneAudio.innerHTML = "";
        const music = this.getAudioTrack("music");
        if (music && music.url) {
          const leftPx = (music.start_sec || 0) * this.zoomPxPerSec;
          const widthPx = (music.duration || totalDur) * this.zoomPxPerSec;
          const block = document.createElement("div");
          block.className = `reel-clip-block type-audio ${this.selectedTrack === 'music' ? 'active' : ''}`;
          block.style.left = `${leftPx}px`;
          block.style.width = `${Math.max(24, widthPx)}px`;
          block.innerHTML = `
            <div class="reel-trim-handle-left" title="Trim start"></div>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.68rem;">🎵 ${escapeHtml(music.filename || 'Background Music')} (Vol: ${Math.round((music.volume || 0.75) * 100)}%)</span>
            <div class="reel-trim-handle-right" title="Trim end / stretch duration"></div>
          `;

          const hLeft = block.querySelector(".reel-trim-handle-left");
          const hRight = block.querySelector(".reel-trim-handle-right");
          this.bindTrimHandle(hLeft, "audio", music, true, block);
          this.bindTrimHandle(hRight, "audio", music, false, block);
          this.bindClipMove(block, "audio", music);

          block.addEventListener("click", (e) => {
            if (Date.now() - (this._lastDragEndTime || 0) < 250) return;
            e.stopPropagation();
            this.selectedTrack = "music";
            this.selectedId = music.id;
            this.renderTimeline();
            this.renderInspector();
            this.openMobileInspector();
          });
          this.laneAudio.appendChild(block);
        }
      }

      // 6. Render Voiceover Track
      if (this.laneVoiceover) {
        this.laneVoiceover.innerHTML = "";
        const vo = this.getAudioTrack("voiceover");
        if (vo && vo.url) {
          const leftPx = (vo.start_sec || 0) * this.zoomPxPerSec;
          const widthPx = (vo.duration || totalDur) * this.zoomPxPerSec;
          const block = document.createElement("div");
          block.className = `reel-clip-block type-voiceover ${this.selectedTrack === 'voiceover' ? 'active' : ''}`;
          block.style.left = `${leftPx}px`;
          block.style.width = `${Math.max(24, widthPx)}px`;
          block.innerHTML = `
            <div class="reel-trim-handle-left" title="Trim start"></div>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.68rem;">🎙️ ${escapeHtml(vo.filename || 'Voiceover')} (Vol: ${Math.round((vo.volume || 1.0) * 100)}%)</span>
            <div class="reel-trim-handle-right" title="Trim end / stretch duration"></div>
          `;

          const hLeft = block.querySelector(".reel-trim-handle-left");
          const hRight = block.querySelector(".reel-trim-handle-right");
          this.bindTrimHandle(hLeft, "voiceover", vo, true, block);
          this.bindTrimHandle(hRight, "voiceover", vo, false, block);
          this.bindClipMove(block, "voiceover", vo);

          block.addEventListener("click", (e) => {
            if (Date.now() - (this._lastDragEndTime || 0) < 250) return;
            e.stopPropagation();
            this.selectedTrack = "voiceover";
            this.selectedId = vo.id;
            this.renderTimeline();
            this.renderInspector();
            this.openMobileInspector();
          });
          this.laneVoiceover.appendChild(block);
        }
      }

      this.updatePlayheadPosition();
    }

    bindTimelineInteraction() {
      if (!this.tracksViewport) return;

      const getTimeFromEvent = (e) => {
        const rect = this.tracksViewport.getBoundingClientRect();
        const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
        const scrollLeft = this.tracksViewport.scrollLeft;
        const xPx = clientX - rect.left + scrollLeft;
        return Math.max(0, Math.min(this.getTotalDuration(), xPx / this.zoomPxPerSec));
      };

      const startScrub = (e) => {
        this.isScrubbing = true;
        this.seekTo(getTimeFromEvent(e));
      };

      const moveScrub = (e) => {
        if (this.isScrubbing) {
          if (e.cancelable) e.preventDefault();
          this.seekTo(getTimeFromEvent(e));
        }
      };

      const endScrub = () => {
        this.isScrubbing = false;
      };

      this.timeRuler?.addEventListener("mousedown", startScrub);
      this.playhead?.addEventListener("mousedown", startScrub);
      window.addEventListener("mousemove", moveScrub);
      window.addEventListener("mouseup", endScrub);

      // Mobile Touch Scrubbing
      this.timeRuler?.addEventListener("touchstart", (e) => {
        if (e.cancelable) e.preventDefault();
        startScrub(e);
      }, { passive: false });
      this.playhead?.addEventListener("touchstart", (e) => {
        if (e.cancelable) e.preventDefault();
        startScrub(e);
      }, { passive: false });
      window.addEventListener("touchmove", moveScrub, { passive: false });
      window.addEventListener("touchend", endScrub);
      window.addEventListener("touchcancel", endScrub);
    }

    updatePlayheadPosition() {
      if (!this.playhead) return;
      const xPx = this.currentTime * this.zoomPxPerSec;
      this.playhead.style.left = `${xPx}px`;
      if (this.timecodeCur) this.timecodeCur.textContent = formatSec(this.currentTime);
    }

    seekTo(sec) {
      this.currentTime = Math.max(0, Math.min(this.getTotalDuration(), sec));
      if (this.audioEl && !isNaN(this.audioEl.duration)) {
        this.audioEl.currentTime = this.currentTime;
      }
      if (this.voiceoverEl && !isNaN(this.voiceoverEl.duration)) {
        const vo = this.getAudioTrack("voiceover");
        const voOffset = Math.max(0, this.currentTime - ((vo && vo.start_sec) || 0));
        this.voiceoverEl.currentTime = voOffset;
      }
      this.updatePlayheadPosition();
      this.render();
    }

    togglePlay() {
      if (this.isPlaying) this.pause(); else this.play();
    }

    play() {
      this.isPlaying = true;
      if (this.iconPlay) this.iconPlay.classList.add("hidden");
      if (this.iconPause) this.iconPause.classList.remove("hidden");
      this.lastAnimTimestamp = performance.now();
      if (this.audioEl && this.audioEl.src && this.currentTime < this.getTotalDuration()) {
        this.audioEl.currentTime = this.currentTime;
        this.audioEl.play().catch(() => {});
      }
      const vo = this.getAudioTrack("voiceover");
      if (vo && vo.url) {
        if (!this.voiceoverEl) this.voiceoverEl = new Audio();
        if (this.voiceoverEl.src !== vo.url) this.voiceoverEl.src = vo.url;
        this.voiceoverEl.volume = vo.volume ?? 1.0;
        const voOffset = Math.max(0, this.currentTime - (vo.start_sec || 0));
        if (this.currentTime >= (vo.start_sec || 0) && this.currentTime <= ((vo.start_sec || 0) + (vo.duration || 60))) {
          this.voiceoverEl.currentTime = voOffset;
          this.voiceoverEl.play().catch(() => {});
        }
      }
    }

    pause() {
      this.isPlaying = false;
      if (this.iconPlay) this.iconPlay.classList.remove("hidden");
      if (this.iconPause) this.iconPause.classList.add("hidden");
      if (this.audioEl) this.audioEl.pause();
      if (this.voiceoverEl) this.voiceoverEl.pause();
    }

    startRenderLoop() {
      const loop = (ts) => {
        if (this.isPlaying) {
          const deltaSec = (ts - this.lastAnimTimestamp) / 1000.0;
          this.currentTime += deltaSec;
          if (this.currentTime >= this.getTotalDuration()) {
            this.currentTime = this.getTotalDuration();
            this.pause();
          }
          this.updatePlayheadPosition();
          this.render();
        }
        this.lastAnimTimestamp = ts;
        this.animFrameId = requestAnimationFrame(loop);
      };
      this.lastAnimTimestamp = performance.now();
      this.animFrameId = requestAnimationFrame(loop);
    }

    // =========================================================================
    // CANVAS RENDERING ENGINE (9:16 INTERACTIVE PREVIEW)
    // =========================================================================

    render() {
      if (!this.ctx || !this.currentProject) return;
      const ctx = this.ctx;
      const t = this.currentTime;
      const tracks = this.currentProject.timeline.tracks;
      const mediaClips = tracks.media || [];
      const textLayers = tracks.text || [];
      const logo = tracks.logo || {};
      const outro = tracks.outro || {};
      const totalDur = this.getTotalDuration();

      // Clear Canvas
      ctx.fillStyle = "#0A192F"; // Default deep brand navy
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Check if Outro is currently active
      const isOutroActive = outro.enabled && (t >= totalDur - (outro.duration || 2.8));

      if (isOutroActive) {
        this.renderOutroCard(ctx, outro);
      } else {
        // 1. Render Current Media Clip
        const currentClipIndex = mediaClips.findIndex((c) => t >= c.start_sec && t <= c.end_sec);
        const currentClip = currentClipIndex >= 0 ? mediaClips[currentClipIndex] : mediaClips[0];
        if (currentClip && currentClip.url) {
          // If in transition during active playback, draw outgoing clip underneath so dissolve blends seamlessly
          if (this.isPlaying && currentClipIndex > 0 && currentClip.transition_in && currentClip.transition_in !== "none") {
            const transDur = currentClip.transition_duration || 0.5;
            if (t < currentClip.start_sec + transDur) {
              const prevClip = mediaClips[currentClipIndex - 1];
              if (prevClip && prevClip.url) {
                this.drawMediaClip(ctx, prevClip, t, false);
              }
            }
          }
          this.drawMediaClip(ctx, currentClip, t, true);
        }

        // 2. Render Text Overlays
        textLayers.forEach((txt) => {
          if (t >= txt.start_sec && t <= txt.end_sec) {
            this.drawTextLayer(ctx, txt, this.selectedId === txt.id);
          }
        });

        // 3. Render Logo
        if (logo.visible) {
          const isLogoTime = logo.always_on || (t >= (logo.start_sec || 0) && t <= (logo.end_sec || totalDur));
          if (isLogoTime) {
            this.drawLogo(ctx, logo, this.selectedId === "logo");
          }
        }

        // 4. Render Alignment & Safe Area Guidelines during drag
        if (this.canvasDrag) {
          ctx.save();
          // Safe Margins (Instagram Reels 9:16 safe area)
          ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(60, 280); ctx.lineTo(CANVAS_W - 60, 280);
          ctx.moveTo(60, CANVAS_H - 380); ctx.lineTo(CANVAS_W - 60, CANVAS_H - 380);
          ctx.stroke();

          // Magnetic Center Guides
          if (this.showGuideX) {
            ctx.strokeStyle = "#168BFF";
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(CANVAS_W / 2, 0);
            ctx.lineTo(CANVAS_W / 2, CANVAS_H);
            ctx.stroke();
          }
          if (this.showGuideY) {
            ctx.strokeStyle = "#168BFF";
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(0, CANVAS_H / 2);
            ctx.lineTo(CANVAS_W, CANVAS_H / 2);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }

    getFilterString(name) {
      switch (name) {
        case "nordic_warm": return "sepia(0.25) saturate(1.2) brightness(1.05)";
        case "arctic_vivid": return "contrast(1.15) saturate(1.35) hue-rotate(-5deg)";
        case "mono_bnw": return "grayscale(1) contrast(1.2)";
        case "vintage_film": return "sepia(0.35) contrast(0.95) brightness(1.1)";
        case "high_contrast": return "contrast(1.4) brightness(1.05)";
        default: return "none";
      }
    }

    drawMediaClip(ctx, clip, t, applyTrans = true) {
      const isVideo = clip.type === "video" || /\.(mp4|mov|webm)$/i.test(clip.url);
      const transDur = clip.transition_duration || 0.5;

      const applyTransition = () => {
        // Crucial fix: Only apply transition transparency during active playback!
        // When paused / scrubbing / editing a frame, always display the photo at full visibility!
        if (applyTrans && this.isPlaying && clip.transition_in && clip.transition_in !== "none" && t < clip.start_sec + transDur) {
          const p = Math.min(1.0, Math.max(0.0, (t - clip.start_sec) / transDur));
          if (clip.transition_in === "fade" || clip.transition_in === "fade_black" || clip.transition_in === "dissolve") {
            ctx.globalAlpha = p;
          } else if (clip.transition_in === "slide_left") {
            const slideOffset = (1.0 - p) * CANVAS_W;
            ctx.translate(slideOffset, 0);
          } else if (clip.transition_in === "zoom") {
            const zScale = 0.8 + 0.2 * p;
            ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
            ctx.scale(zScale, zScale);
            ctx.translate(-CANVAS_W / 2, -CANVAS_H / 2);
            ctx.globalAlpha = p;
          }
        }
      };

      const fitMode = clip.fit_mode || "cover";

      if (isVideo) {
        let vid = this.cachedImages[clip.url];
        if (!vid || !(vid instanceof HTMLVideoElement)) {
          vid = document.createElement("video");
          vid.src = clip.url;
          vid.muted = true;
          vid.playsInline = true;
          vid.preload = "auto";
          vid.onloadeddata = () => this.render();
          this.cachedImages[clip.url] = vid;
          return;
        }

        if (vid.readyState >= 2) {
          const clipOffset = Math.max(0, (t - clip.start_sec) * (clip.speed || 1.0) + (clip.src_in || 0));
          if (this.isPlaying) {
            if (vid.paused) vid.play().catch(() => {});
          } else {
            if (!vid.paused) vid.pause();
            if (Math.abs(vid.currentTime - clipOffset) > 0.15) {
              vid.currentTime = clipOffset;
            }
          }

          ctx.save();
          applyTransition();
          if (clip.filter && clip.filter !== "none") {
            ctx.filter = this.getFilterString(clip.filter);
          }
          const vW = vid.videoWidth || 1080;
          const vH = vid.videoHeight || 1920;
          const scale = fitMode === "contain" ? Math.min(CANVAS_W / vW, CANVAS_H / vH) : Math.max(CANVAS_W / vW, CANVAS_H / vH);
          const dw = vW * scale;
          const dh = vH * scale;
          const dx = (CANVAS_W - dw) / 2.0;
          const dy = (CANVAS_H - dh) / 2.0;
          ctx.drawImage(vid, dx, dy, dw, dh);
          ctx.restore();
          return;
        }
      }

      let img = this.cachedImages[clip.url];
      if (!img) {
        img = new Image();
        img.src = clip.url;
        img.onload = () => this.render();
        img.onerror = () => {
          console.warn("Failed to load image, using fallback:", clip.url);
          if (clip.url !== "/assets/sample-clips/tesla-clean-bg.jpg") {
            img.src = "/assets/sample-clips/tesla-clean-bg.jpg";
          }
        };
        this.cachedImages[clip.url] = img;
        return;
      }

      if (!img.complete || img.naturalWidth === 0) return;

      ctx.save();
      applyTransition();
      if (clip.filter && clip.filter !== "none") {
        ctx.filter = this.getFilterString(clip.filter);
      }
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const scale = fitMode === "contain" ? Math.min(CANVAS_W / imgW, CANVAS_H / imgH) : Math.max(CANVAS_W / imgW, CANVAS_H / imgH);
      const dw = imgW * scale;
      const dh = imgH * scale;
      const dx = (CANVAS_W - dw) / 2.0;
      const dy = (CANVAS_H - dh) / 2.0;

      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }

    drawTextLayer(ctx, txt, isSelected) {
      if (!txt || !txt.text) return;
      ctx.save();
      const x = (txt.x_pct / 100.0) * CANVAS_W;
      const y = (txt.y_pct / 100.0) * CANVAS_H;
      const fontSize = (txt.font_size || 40) * 2; // High-res subpixel scale
      const rotDeg = txt.rotation_deg || 0;
      const rotRad = (rotDeg * Math.PI) / 180;

      ctx.translate(x, y);
      if (rotDeg) {
        ctx.rotate(rotRad);
      }

      ctx.font = `${txt.font_style || ''} ${txt.font_weight || '800'} ${fontSize}px "${txt.font_family || 'Inter'}", sans-serif`;
      ctx.textAlign = txt.text_align || "center";
      ctx.textBaseline = "middle";

      // Calculate automatic word wrapping so long titles never spill off screen
      const maxW = Math.min(CANVAS_W * 0.84, 900);
      const rawParagraphs = String(txt.text).split("\n");
      const lines = [];

      for (const para of rawParagraphs) {
        const words = para.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
          lines.push("");
          continue;
        }
        let currentLine = "";
        for (let w = 0; w < words.length; w++) {
          const word = words[w];
          const testLine = currentLine ? currentLine + " " + word : word;
          if (ctx.measureText(testLine).width > maxW && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
      }
      if (lines.length === 0) lines.push(txt.text);

      const lineHeight = fontSize * 1.25;
      const totalTextH = lines.length * lineHeight;
      const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const pad = (txt.bg_padding || 12) * 2;

      // Draw Background Box if present
      if (txt.bg_color && txt.bg_color !== "transparent") {
        ctx.save();
        ctx.fillStyle = txt.bg_color;
        let boxX = - maxLineW / 2 - pad;
        if (txt.text_align === "left") boxX = - pad;
        else if (txt.text_align === "right") boxX = - maxLineW - pad;

        const boxY = - totalTextH / 2 - pad / 2;
        const boxW = maxLineW + pad * 2;
        const boxH = totalTextH + pad;
        const rad = (txt.bg_radius || 8) * 2;

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(boxX, boxY, boxW, boxH, rad) : ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();
        ctx.restore();
      }

      // Draw Shadow / Halo
      if (txt.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
      }

      // Starting baseline for centered multiline block
      let textOriginX = 0;
      if (txt.text_align === "left") textOriginX = - maxLineW / 2;
      else if (txt.text_align === "right") textOriginX = maxLineW / 2;

      const startY = - (totalTextH / 2) + (lineHeight / 2);

      // Render each line (outline + fill)
      lines.forEach((lineText, idx) => {
        const lineY = startY + (idx * lineHeight);

        if (txt.outline_width && txt.outline_color) {
          ctx.strokeStyle = txt.outline_color;
          ctx.lineWidth = (txt.outline_width || 3) * 2;
          ctx.lineJoin = "round";
          ctx.strokeText(lineText, textOriginX, lineY);
        }

        ctx.fillStyle = txt.color || "#FFFFFF";
        ctx.fillText(lineText, textOriginX, lineY);
      });

      // Bounding box calculations relative to origin (0,0)
      let selX = - maxLineW / 2 - pad - 8;
      if (txt.text_align === "left") selX = - pad - 8;
      else if (txt.text_align === "right") selX = - maxLineW - pad - 8;

      const selY = - totalTextH / 2 - pad / 2 - 8;
      const selW = maxLineW + pad * 2 + 16;
      const selH = totalTextH + pad + 16;

      // Cache unrotated geometry bounds for exact hit-testing
      txt._bounds = {
        cx: x,
        cy: y,
        rotDeg: rotDeg,
        rotRad: rotRad,
        selX: selX,
        selY: selY,
        selW: selW,
        selH: selH,
        fontSize: txt.font_size || 40
      };

      // Selection bounding box & interactive handles on canvas
      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = "#168BFF";
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(selX, selY, selW, selH);

        // 4 Corner resize handles
        ctx.setLineDash([]);
        const hSize = 18;
        const corners = [
          [selX, selY],
          [selX + selW, selY],
          [selX, selY + selH],
          [selX + selW, selY + selH]
        ];
        corners.forEach(([hx, hy]) => {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
          ctx.strokeStyle = "#168BFF";
          ctx.lineWidth = 3;
          ctx.strokeRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
        });

        // Top rotation handle stem & circular knob
        const rotKnobY = selY - 44;
        ctx.beginPath();
        ctx.strokeStyle = "#168BFF";
        ctx.lineWidth = 3;
        ctx.moveTo(selX + selW / 2, selY);
        ctx.lineTo(selX + selW / 2, rotKnobY);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = "#168BFF";
        ctx.arc(selX + selW / 2, rotKnobY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(selX + selW / 2, rotKnobY, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.restore();
    }

    drawLogo(ctx, logo, isSelected) {
      if (!this.logoReady || !this.logoImg) return;
      ctx.save();
      const x = (logo.x_pct / 100.0) * CANVAS_W;
      const y = (logo.y_pct / 100.0) * CANVAS_H;
      const size = (logo.size_px || 76) * 2;

      ctx.globalAlpha = logo.opacity || 0.95;
      ctx.drawImage(this.logoImg, x - size / 2, y - size / 2, size, size);

      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = "#168BFF";
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(x - size / 2 - 8, y - size / 2 - 8, size + 16, size + 16);

        // 4 Corner resize handles
        ctx.setLineDash([]);
        const hSize = 18;
        const corners = [
          [x - size / 2 - 8, y - size / 2 - 8],
          [x + size / 2 + 8, y - size / 2 - 8],
          [x - size / 2 - 8, y + size / 2 + 8],
          [x + size / 2 + 8, y + size / 2 + 8]
        ];
        corners.forEach(([hx, hy]) => {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
          ctx.strokeStyle = "#168BFF";
          ctx.lineWidth = 3;
          ctx.strokeRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
        });
        ctx.restore();
      }
      ctx.restore();
    }

    renderOutroCard(ctx, outro) {
      ctx.save();
      ctx.fillStyle = outro.bg_color || "#0A192F";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Outro Logo
      if (this.logoReady && this.logoImg) {
        const logoSize = 160;
        ctx.drawImage(this.logoImg, (CANVAS_W - logoSize) / 2, 600, logoSize, logoSize);
      }

      // Title
      ctx.font = '800 64px "Inter", sans-serif';
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(outro.title || "DISCOVER MORE", CANVAS_W / 2, 850);

      // Subtitle
      ctx.font = '700 48px "Inter", sans-serif';
      ctx.fillStyle = "#38BDF8"; // Ice blue
      ctx.fillText(outro.subtitle || "FALL IN LOVE WITH FINLAND", CANVAS_W / 2, 930);

      // Website CTA Pill
      const pillW = 420;
      const pillH = 72;
      const pillX = (CANVAS_W - pillW) / 2;
      const pillY = 1040;
      ctx.fillStyle = "#003882";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(pillX, pillY, pillW, pillH, 36) : ctx.rect(pillX, pillY, pillW, pillH);
      ctx.fill();

      ctx.font = '800 36px "Inter", sans-serif';
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(outro.website || "ilovefinland.net", CANVAS_W / 2, pillY + 46);

      ctx.restore();
    }

    toggleSafeArea() {
      this.safeAreaVisible = !this.safeAreaVisible;
      if (this.safeAreaOverlay) {
        this.safeAreaOverlay.classList.toggle("active", this.safeAreaVisible);
      }
    }

    // =========================================================================
    // RIGHT INSPECTOR PANEL (DYNAMIC PROPERTIES)
    // =========================================================================

    renderInspector() {
      if (!this.inspectorContent) return;

      if (this.selectedTrack) {
        this.openMobileInspector();
      }

      if (this.selectedTrack === "text" && this.selectedId) {
        const txt = this.currentProject?.timeline?.tracks?.text?.find((x) => x.id === this.selectedId);
        if (!txt) { this.renderEmptyInspector(); return; }

        if (this.inspectorHeading) this.inspectorHeading.textContent = "Text Layer";
        if (this.inspectorIcon) this.inspectorIcon.textContent = "🔤";

        this.inspectorContent.innerHTML = `
          <div class="reel-prop-group">
            <label class="reel-prop-label">Wording</label>
            <textarea id="prop-text-content" class="reel-prop-textarea" rows="2">${escapeHtml(txt.text)}</textarea>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Font Family &amp; Alignment</label>
            <select id="prop-text-font" class="reel-prop-select" style="margin-bottom:6px;">
              <option value="Inter" ${txt.font_family === 'Inter' ? 'selected' : ''}>Inter (Brand Standard)</option>
              <option value="Helvetica" ${txt.font_family === 'Helvetica' ? 'selected' : ''}>Helvetica Bold</option>
              <option value="Impact" ${txt.font_family === 'Impact' ? 'selected' : ''}>Impact (Bold News)</option>
              <option value="Georgia" ${txt.font_family === 'Georgia' ? 'selected' : ''}>Georgia (Editorial)</option>
            </select>
            <div style="display:flex;gap:4px;">
              <button type="button" class="btn btn-sm btn-outline btn-text-align" data-align="left" style="flex:1;color:#fff;border-color:#303B4D;${txt.text_align === 'left' ? 'background:#003580;' : ''}">Left</button>
              <button type="button" class="btn btn-sm btn-outline btn-text-align" data-align="center" style="flex:1;color:#fff;border-color:#303B4D;${(!txt.text_align || txt.text_align === 'center') ? 'background:#003580;' : ''}">Center</button>
              <button type="button" class="btn btn-sm btn-outline btn-text-align" data-align="right" style="flex:1;color:#fff;border-color:#303B4D;${txt.text_align === 'right' ? 'background:#003580;' : ''}">Right</button>
            </div>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Font Size: <span id="prop-val-fontsize">${txt.font_size}px</span></label>
            <input type="range" id="prop-slider-fontsize" min="16" max="96" value="${txt.font_size}" style="width:100%;" />
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Rotation: <span id="prop-val-rotation">${txt.rotation_deg || 0}°</span></label>
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="range" id="prop-slider-rotation" min="-180" max="180" value="${txt.rotation_deg || 0}" style="flex:1;" />
              <button type="button" id="btn-reset-rotation" class="btn btn-sm btn-outline" style="padding:2px 8px;font-size:0.7rem;color:#B8C4D4;border-color:#303B4D;" title="Reset to 0°">0°</button>
            </div>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Color &amp; Custom Hex</label>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="reel-color-row" style="flex:1;">
                <div class="reel-color-swatch" data-col="#FFFFFF" style="background:#FFFFFF;"></div>
                <div class="reel-color-swatch" data-col="#38BDF8" style="background:#38BDF8;"></div>
                <div class="reel-color-swatch" data-col="#0A192F" style="background:#0A192F;border:1px solid #475569;"></div>
                <div class="reel-color-swatch" data-col="#003580" style="background:#003580;"></div>
                <div class="reel-color-swatch" data-col="#EF4444" style="background:#EF4444;"></div>
              </div>
              <input type="color" id="prop-text-color-picker" value="${txt.color || '#FFFFFF'}" title="Pick custom color" style="width:32px;height:32px;border:none;background:transparent;cursor:pointer;" />
            </div>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Background Box</label>
            <select id="prop-text-bg" class="reel-prop-select">
              <option value="rgba(10, 25, 47, 0.85)" ${txt.bg_color && txt.bg_color.includes('10, 25, 47') ? 'selected' : ''}>Navy Box (#0A192F)</option>
              <option value="rgba(0, 56, 130, 0.88)" ${txt.bg_color && txt.bg_color.includes('0, 56, 130') ? 'selected' : ''}>Blue Box (#003580)</option>
              <option value="transparent" ${txt.bg_color === 'transparent' ? 'selected' : ''}>No Background (Transparent)</option>
            </select>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="prop-chk-text-shadow" ${txt.shadow ? 'checked' : ''} />
              <span>Drop Shadow / Contrast Halo</span>
            </label>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Timing (Start &amp; End Seconds)</label>
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="number" id="prop-num-text-start" min="0" max="60" step="0.5" value="${(txt.start_sec || 0).toFixed(1)}" class="reel-prop-select" style="flex:1;" />
              <span style="color:#B8C4D4;font-size:0.8rem;">to</span>
              <input type="number" id="prop-num-text-end" min="0.5" max="60" step="0.5" value="${(txt.end_sec || 5).toFixed(1)}" class="reel-prop-select" style="flex:1;" />
            </div>
          </div>
          <div class="reel-prop-group">
            <button type="button" id="btn-prop-del-text" class="btn btn-sm btn-ghost" style="color:#ef4444;width:100%;margin-top:10px;">
              🗑️ Delete Text Layer
            </button>
          </div>
        `;

        document.getElementById("prop-text-content")?.addEventListener("input", (e) => {
          txt.text = e.target.value;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-text-font")?.addEventListener("change", (e) => {
          txt.font_family = e.target.value;
          this.render();
          this.scheduleAutosave();
        });
        this.inspectorContent.querySelectorAll(".btn-text-align").forEach((b) => {
          b.addEventListener("click", () => {
            txt.text_align = b.dataset.align;
            this.renderInspector();
            this.render();
            this.scheduleAutosave();
          });
        });
        document.getElementById("prop-slider-fontsize")?.addEventListener("input", (e) => {
          txt.font_size = parseInt(e.target.value, 10);
          document.getElementById("prop-val-fontsize").textContent = `${txt.font_size}px`;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-slider-rotation")?.addEventListener("input", (e) => {
          txt.rotation_deg = parseInt(e.target.value, 10);
          document.getElementById("prop-val-rotation").textContent = `${txt.rotation_deg}°`;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("btn-reset-rotation")?.addEventListener("click", () => {
          txt.rotation_deg = 0;
          this.renderInspector();
          this.render();
          this.scheduleAutosave();
        });
        this.inspectorContent.querySelectorAll(".reel-color-swatch").forEach((s) => {
          s.addEventListener("click", () => {
            txt.color = s.dataset.col;
            const cp = document.getElementById("prop-text-color-picker");
            if (cp) cp.value = s.dataset.col;
            this.render();
            this.scheduleAutosave();
          });
        });
        document.getElementById("prop-text-color-picker")?.addEventListener("input", (e) => {
          txt.color = e.target.value;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-text-bg")?.addEventListener("change", (e) => {
          txt.bg_color = e.target.value;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-chk-text-shadow")?.addEventListener("change", (e) => {
          txt.shadow = e.target.checked;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-num-text-start")?.addEventListener("change", (e) => {
          txt.start_sec = Math.max(0, parseFloat(e.target.value) || 0);
          this.renderTimeline();
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-num-text-end")?.addEventListener("change", (e) => {
          txt.end_sec = Math.max((txt.start_sec || 0) + 0.5, parseFloat(e.target.value) || 5);
          this.renderTimeline();
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("btn-prop-del-text")?.addEventListener("click", () => this.deleteSelected());
      } else if (this.selectedTrack === "media" && this.selectedId) {
        const c = this.currentProject?.timeline?.tracks?.media?.find((x) => x.id === this.selectedId);
        if (!c) { this.renderEmptyInspector(); return; }

        const isVideo = c.type === "video" || /\.(mp4|mov|webm)$/i.test(c.url || c.filename);

        if (this.inspectorHeading) this.inspectorHeading.textContent = isVideo ? "Video Clip" : "Photo Clip";
        if (this.inspectorIcon) this.inspectorIcon.textContent = isVideo ? "🎬" : "📷";

        const currentEffect = c.filter || "none";

        let mediaSpecificControls = "";
        if (isVideo) {
          mediaSpecificControls = `
            <div class="reel-prop-group">
              <label class="reel-prop-label">Playback Speed</label>
              <div style="display:flex;gap:4px;">
                <button type="button" class="btn btn-sm btn-outline btn-vid-speed" data-speed="0.5" style="flex:1;font-size:0.72rem;color:#B8C4D4;border-color:#303B4D;${c.speed === 0.5 ? 'background:#003580;color:#fff;' : ''}">0.5x</button>
                <button type="button" class="btn btn-sm btn-outline btn-vid-speed" data-speed="1.0" style="flex:1;font-size:0.72rem;color:#B8C4D4;border-color:#303B4D;${(!c.speed || c.speed === 1.0) ? 'background:#003580;color:#fff;' : ''}">1.0x</button>
                <button type="button" class="btn btn-sm btn-outline btn-vid-speed" data-speed="1.25" style="flex:1;font-size:0.72rem;color:#B8C4D4;border-color:#303B4D;${c.speed === 1.25 ? 'background:#003580;color:#fff;' : ''}">1.25x</button>
                <button type="button" class="btn btn-sm btn-outline btn-vid-speed" data-speed="1.5" style="flex:1;font-size:0.72rem;color:#B8C4D4;border-color:#303B4D;${c.speed === 1.5 ? 'background:#003580;color:#fff;' : ''}">1.5x</button>
                <button type="button" class="btn btn-sm btn-outline btn-vid-speed" data-speed="2.0" style="flex:1;font-size:0.72rem;color:#B8C4D4;border-color:#303B4D;${c.speed === 2.0 ? 'background:#003580;color:#fff;' : ''}">2.0x</button>
              </div>
            </div>
            <div class="reel-prop-group">
              <label class="reel-prop-label">Clip Length: <span style="color:#38bdf8;font-family:monospace;">${c.duration.toFixed(1)}s</span></label>
              <p style="font-size:0.72rem;color:#B8C4D4;margin:2px 0 0;">Drag the yellow handles on the timeline clip to trim start or end points.</p>
            </div>
          `;
        } else {
          mediaSpecificControls = `
            <div class="reel-prop-group">
              <label class="reel-prop-label">Photo Duration: <span id="prop-val-clipdur">${c.duration.toFixed(1)}s</span></label>
              <input type="range" id="prop-slider-clipdur" min="1.0" max="15.0" step="0.5" value="${c.duration}" style="width:100%;" />
              <div style="display:flex;gap:4px;margin-top:6px;">
                <button type="button" class="btn btn-sm btn-outline btn-chip-clipdur" data-dur="2.0" style="flex:1;font-size:0.7rem;color:#B8C4D4;border-color:#303B4D;">2s</button>
                <button type="button" class="btn btn-sm btn-outline btn-chip-clipdur" data-dur="3.0" style="flex:1;font-size:0.7rem;color:#B8C4D4;border-color:#303B4D;">3s</button>
                <button type="button" class="btn btn-sm btn-outline btn-chip-clipdur" data-dur="4.0" style="flex:1;font-size:0.7rem;color:#B8C4D4;border-color:#303B4D;">4s</button>
                <button type="button" class="btn btn-sm btn-outline btn-chip-clipdur" data-dur="5.0" style="flex:1;font-size:0.7rem;color:#B8C4D4;border-color:#303B4D;">5s</button>
              </div>
            </div>
          `;
        }

        this.inspectorContent.innerHTML = `
          <div class="reel-prop-group">
            <label class="reel-prop-label">File</label>
            <div style="font-size:0.82rem;font-weight:700;color:#fff;word-break:break-all;">${escapeHtml(c.filename)}</div>
          </div>
          ${mediaSpecificControls}
          <div class="reel-prop-group">
            <label class="reel-prop-label">Fit Mode</label>
            <select id="prop-clip-fit" class="reel-prop-select">
              <option value="cover" ${c.fit_mode === 'cover' ? 'selected' : ''}>Cover (Fill 9:16 Frame)</option>
              <option value="contain" ${c.fit_mode === 'contain' ? 'selected' : ''}>Contain (Letterbox / Background)</option>
            </select>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Visual Filter Effect</label>
            <select id="prop-clip-effect" class="reel-prop-select">
              <option value="none" ${currentEffect === 'none' ? 'selected' : ''}>Natural / None</option>
              <option value="nordic_warm" ${currentEffect === 'nordic_warm' ? 'selected' : ''}>Nordic Warm</option>
              <option value="arctic_vivid" ${currentEffect === 'arctic_vivid' ? 'selected' : ''}>Arctic Vivid</option>
              <option value="mono_bnw" ${currentEffect === 'mono_bnw' ? 'selected' : ''}>Monochrome B&amp;W</option>
              <option value="vintage_film" ${currentEffect === 'vintage_film' ? 'selected' : ''}>Vintage Film</option>
              <option value="high_contrast" ${currentEffect === 'high_contrast' ? 'selected' : ''}>High Contrast</option>
            </select>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Transition In</label>
            <select id="prop-clip-trans" class="reel-prop-select">
              <option value="none" ${c.transition_in === 'none' ? 'selected' : ''}>None (Cut)</option>
              <option value="dissolve" ${c.transition_in === 'dissolve' ? 'selected' : ''}>Dissolve / Crossfade</option>
              <option value="fade" ${c.transition_in === 'fade' || c.transition_in === 'fade_black' ? 'selected' : ''}>Fade from Black</option>
              <option value="slide_left" ${c.transition_in === 'slide_left' ? 'selected' : ''}>Slide Left</option>
              <option value="zoom" ${c.transition_in === 'zoom' ? 'selected' : ''}>Zoom In</option>
            </select>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Transition Duration: <span id="prop-val-transdur">${(c.transition_duration || 0.5).toFixed(1)}s</span></label>
            <input type="range" id="prop-slider-transdur" min="0.1" max="2.0" step="0.1" value="${c.transition_duration || 0.5}" style="width:100%;" />
          </div>
          <div style="display:flex;gap:6px;margin-top:14px;">
            <button type="button" id="btn-prop-split-clip" class="btn btn-sm btn-outline" style="flex:1;color:#fff;border-color:#475569;">
              ✂️ Split
            </button>
            <button type="button" id="btn-prop-dup-clip" class="btn btn-sm btn-outline" style="flex:1;color:#fff;border-color:#475569;">
              📋 Duplicate
            </button>
          </div>
          <button type="button" id="btn-prop-del-clip" class="btn btn-sm btn-ghost" style="color:#ef4444;width:100%;margin-top:10px;">
            🗑️ Delete Clip
          </button>
        `;

        if (isVideo) {
          this.inspectorContent.querySelectorAll(".btn-vid-speed").forEach((btn) => {
            btn.addEventListener("click", () => {
              c.speed = parseFloat(btn.dataset.speed) || 1.0;
              this.renderInspector();
              this.render();
              this.scheduleAutosave();
            });
          });
        } else {
          const setPhotoDur = (newDur) => {
            const diff = newDur - c.duration;
            c.duration = round1(newDur);
            c.end_sec = round1(c.start_sec + newDur);
            const clips = this.currentProject.timeline.tracks.media;
            const idx = clips.indexOf(c);
            for (let i = idx + 1; i < clips.length; i++) {
              clips[i].start_sec = round1(clips[i].start_sec + diff);
              clips[i].end_sec = round1(clips[i].end_sec + diff);
            }
            this.recalculateTotalDuration();
            this.renderTimeline();
            this.renderInspector();
            this.render();
            this.scheduleAutosave();
          };

          document.getElementById("prop-slider-clipdur")?.addEventListener("input", (e) => {
            setPhotoDur(parseFloat(e.target.value));
          });
          this.inspectorContent.querySelectorAll(".btn-chip-clipdur").forEach((btn) => {
            btn.addEventListener("click", () => setPhotoDur(parseFloat(btn.dataset.dur)));
          });
        }

        document.getElementById("prop-clip-fit")?.addEventListener("change", (e) => {
          c.fit_mode = e.target.value;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-clip-effect")?.addEventListener("change", (e) => {
          c.filter = e.target.value;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-clip-trans")?.addEventListener("change", (e) => {
          c.transition_in = e.target.value;
          this.renderTimeline();
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-slider-transdur")?.addEventListener("input", (e) => {
          c.transition_duration = parseFloat(e.target.value) || 0.5;
          const valEl = document.getElementById("prop-val-transdur");
          if (valEl) valEl.textContent = `${c.transition_duration.toFixed(1)}s`;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("btn-prop-split-clip")?.addEventListener("click", () => this.splitAtPlayhead());
        document.getElementById("btn-prop-dup-clip")?.addEventListener("click", () => this.duplicateSelected());
        document.getElementById("btn-prop-del-clip")?.addEventListener("click", () => this.deleteSelected());
      } else if (this.selectedTrack === "logo") {
        const logo = this.currentProject?.timeline?.tracks?.logo;
        if (!logo) { this.renderEmptyInspector(); return; }

        if (this.inspectorHeading) this.inspectorHeading.textContent = "Logo Overlay";
        if (this.inspectorIcon) this.inspectorIcon.textContent = "💙";

        this.inspectorContent.innerHTML = `
          <div class="reel-prop-group">
            <label class="reel-prop-label">Logo Size: <span id="prop-val-logosize">${logo.size_px || 76}px</span></label>
            <input type="range" id="prop-slider-logosize" min="36" max="180" value="${logo.size_px || 76}" style="width:100%;" />
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Opacity: <span id="prop-val-logoopacity">${Math.round((logo.opacity || 0.95) * 100)}%</span></label>
            <input type="range" id="prop-slider-logoopacity" min="0.1" max="1.0" step="0.05" value="${logo.opacity || 0.95}" style="width:100%;" />
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Position Presets</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <button type="button" class="btn btn-sm btn-outline btn-logo-preset" data-preset="top_left" style="color:#fff;border-color:#303B4D;">Top Left</button>
              <button type="button" class="btn btn-sm btn-outline btn-logo-preset" data-preset="top_center" style="color:#fff;border-color:#303B4D;">Top Center</button>
              <button type="button" class="btn btn-sm btn-outline btn-logo-preset" data-preset="safe_header" style="color:#fff;border-color:#303B4D;">Safe Header</button>
              <button type="button" class="btn btn-sm btn-outline btn-logo-preset" data-preset="bottom_center" style="color:#fff;border-color:#303B4D;">Bottom Center</button>
            </div>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="prop-chk-logo-always" ${logo.always_on !== false ? 'checked' : ''} />
              <span>Display throughout entire Reel</span>
            </label>
          </div>
        `;

        document.getElementById("prop-slider-logosize")?.addEventListener("input", (e) => {
          logo.size_px = parseInt(e.target.value, 10);
          document.getElementById("prop-val-logosize").textContent = `${logo.size_px}px`;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-slider-logoopacity")?.addEventListener("input", (e) => {
          logo.opacity = parseFloat(e.target.value);
          document.getElementById("prop-val-logoopacity").textContent = `${Math.round(logo.opacity * 100)}%`;
          this.render();
          this.scheduleAutosave();
        });
        this.inspectorContent.querySelectorAll(".btn-logo-preset").forEach((b) => {
          b.addEventListener("click", () => {
            this.setLogoPositionPreset(b.dataset.preset);
          });
        });
        document.getElementById("prop-chk-logo-always")?.addEventListener("change", (e) => {
          logo.always_on = e.target.checked;
          this.renderTimeline();
          this.render();
          this.scheduleAutosave();
        });
      } else if (this.selectedTrack === "voiceover" || this.selectedTrack === "music") {
        const isVoice = this.selectedTrack === "voiceover";
        const aud = this.getAudioTrack(isVoice ? "voiceover" : "music");
        if (!aud) { this.renderEmptyInspector(); return; }

        if (this.inspectorHeading) this.inspectorHeading.textContent = isVoice ? "Voiceover Track" : "Music Track";
        if (this.inspectorIcon) this.inspectorIcon.textContent = isVoice ? "🎙️" : "🎵";

        this.inspectorContent.innerHTML = `
          <div class="reel-prop-group">
            <label class="reel-prop-label">File</label>
            <div style="font-size:0.82rem;font-weight:700;color:#fff;word-break:break-all;">${escapeHtml(aud.filename || 'Audio Track')}</div>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Volume: <span id="prop-val-audvolume">${Math.round((aud.volume ?? 1.0) * 100)}%</span></label>
            <input type="range" id="prop-slider-audvolume" min="0" max="1.0" step="0.05" value="${aud.volume ?? 1.0}" style="width:100%;" />
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Fade In: <span id="prop-val-fadein">${(aud.fade_in || 0.2).toFixed(1)}s</span></label>
            <input type="range" id="prop-slider-fadein" min="0" max="2.0" step="0.1" value="${aud.fade_in || 0.2}" style="width:100%;" />
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Fade Out: <span id="prop-val-fadeout">${(aud.fade_out || 0.5).toFixed(1)}s</span></label>
            <input type="range" id="prop-slider-fadeout" min="0" max="2.0" step="0.1" value="${aud.fade_out || 0.5}" style="width:100%;" />
          </div>
          <button type="button" id="btn-prop-del-aud" class="btn btn-sm btn-ghost" style="color:#ef4444;width:100%;margin-top:10px;">
            🗑️ Remove ${isVoice ? 'Voiceover' : 'Music'}
          </button>
        `;

        document.getElementById("prop-slider-audvolume")?.addEventListener("input", (e) => {
          aud.volume = parseFloat(e.target.value);
          document.getElementById("prop-val-audvolume").textContent = `${Math.round(aud.volume * 100)}%`;
          if (isVoice && this.voiceoverEl) this.voiceoverEl.volume = aud.volume;
          if (!isVoice && this.audioEl) this.audioEl.volume = aud.volume;
          this.renderTimeline();
          this.scheduleAutosave();
        });
        document.getElementById("prop-slider-fadein")?.addEventListener("input", (e) => {
          aud.fade_in = parseFloat(e.target.value);
          document.getElementById("prop-val-fadein").textContent = `${aud.fade_in.toFixed(1)}s`;
          this.scheduleAutosave();
        });
        document.getElementById("prop-slider-fadeout")?.addEventListener("input", (e) => {
          aud.fade_out = parseFloat(e.target.value);
          document.getElementById("prop-val-fadeout").textContent = `${aud.fade_out.toFixed(1)}s`;
          this.scheduleAutosave();
        });
        document.getElementById("btn-prop-del-aud")?.addEventListener("click", () => {
          const list = this.currentProject.timeline.tracks.audio || [];
          const idx = list.indexOf(aud);
          if (idx !== -1) list.splice(idx, 1);
          if (isVoice && this.voiceoverEl) this.voiceoverEl.pause();
          if (!isVoice && this.audioEl) this.audioEl.pause();
          this.selectedTrack = null;
          this.selectedId = null;
          this.renderTimeline();
          this.renderInspector();
          this.render();
          this.scheduleAutosave();
        });
      } else if (this.selectedTrack === "transition") {
        const c = this.currentProject?.timeline?.tracks?.media?.find((x) => x.id === this.selectedId) || this.currentProject?.timeline?.tracks?.media?.[1];
        if (!c) { this.renderEmptyInspector(); return; }

        if (this.inspectorHeading) this.inspectorHeading.textContent = "Transition Editor";
        if (this.inspectorIcon) this.inspectorIcon.textContent = "⚡";

        const transType = c.transition_in || "dissolve";
        const transDur = c.transition_duration || 0.5;

        this.inspectorContent.innerHTML = `
          <div class="reel-prop-group">
            <label class="reel-prop-label">Transition Style</label>
            <select id="prop-trans-type" class="reel-prop-select">
              <option value="none" ${transType === 'none' ? 'selected' : ''}>None (Cut)</option>
              <option value="dissolve" ${transType === 'dissolve' ? 'selected' : ''}>Dissolve / Crossfade</option>
              <option value="fade" ${transType === 'fade' || transType === 'fade_black' ? 'selected' : ''}>Fade to Black</option>
              <option value="slide_left" ${transType === 'slide_left' ? 'selected' : ''}>Slide Left</option>
              <option value="zoom" ${transType === 'zoom' ? 'selected' : ''}>Zoom In</option>
            </select>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Duration: <span id="prop-val-transdur-direct">${transDur.toFixed(1)}s</span></label>
            <input type="range" id="prop-slider-transdur-direct" min="0.1" max="2.0" step="0.1" value="${transDur}" style="width:100%;" />
            <div style="display:flex;gap:4px;margin-top:6px;">
              <button type="button" class="btn btn-sm btn-outline btn-chip-transdur" data-dur="0.3" style="flex:1;font-size:0.7rem;color:#B8C4D4;border-color:#303B4D;">0.3s</button>
              <button type="button" class="btn btn-sm btn-outline btn-chip-transdur" data-dur="0.5" style="flex:1;font-size:0.7rem;color:#B8C4D4;border-color:#303B4D;">0.5s</button>
              <button type="button" class="btn btn-sm btn-outline btn-chip-transdur" data-dur="0.8" style="flex:1;font-size:0.7rem;color:#B8C4D4;border-color:#303B4D;">0.8s</button>
              <button type="button" class="btn btn-sm btn-outline btn-chip-transdur" data-dur="1.0" style="flex:1;font-size:0.7rem;color:#B8C4D4;border-color:#303B4D;">1.0s</button>
            </div>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Live Animated Preview</label>
            <div class="reel-trans-preview-box">
              <div class="reel-trans-preview-card ${transType}">
                <span>SAMPLE FRAME</span>
              </div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px;">
            <button type="button" id="btn-prop-apply-trans-all" class="btn btn-sm btn-primary" style="background:#003580;border:1px solid #168BFF;color:#fff;">
              ⚡ Apply To All Clips
            </button>
            <button type="button" id="btn-prop-remove-trans" class="btn btn-sm btn-outline" style="color:#B8C4D4;border-color:#303B4D;">
              🚫 Remove Transition (Cut)
            </button>
            <button type="button" id="btn-prop-reset-trans" class="btn btn-sm btn-ghost" style="color:#B8C4D4;font-size:0.75rem;">
              ↺ Reset Default (0.5s Dissolve)
            </button>
          </div>
        `;

        const updatePreview = (t) => {
          const card = this.inspectorContent.querySelector(".reel-trans-preview-card");
          if (card) {
            card.className = `reel-trans-preview-card ${t}`;
          }
        };

        document.getElementById("prop-trans-type")?.addEventListener("change", (e) => {
          c.transition_in = e.target.value;
          updatePreview(c.transition_in);
          this.renderTimeline();
          this.render();
          this.scheduleAutosave();
        });

        const setTransDur = (d) => {
          c.transition_duration = d;
          const valEl = document.getElementById("prop-val-transdur-direct");
          if (valEl) valEl.textContent = `${d.toFixed(1)}s`;
          const slider = document.getElementById("prop-slider-transdur-direct");
          if (slider) slider.value = d;
          this.render();
          this.scheduleAutosave();
        };

        document.getElementById("prop-slider-transdur-direct")?.addEventListener("input", (e) => {
          setTransDur(parseFloat(e.target.value) || 0.5);
        });

        this.inspectorContent.querySelectorAll(".btn-chip-transdur").forEach((btn) => {
          btn.addEventListener("click", () => setTransDur(parseFloat(btn.dataset.dur)));
        });

        document.getElementById("btn-prop-apply-trans-all")?.addEventListener("click", () => {
          const mediaClips = this.currentProject.timeline.tracks.media || [];
          mediaClips.forEach((m, idx) => {
            if (idx > 0) {
              m.transition_in = c.transition_in;
              m.transition_duration = c.transition_duration;
            }
          });
          this.pushState();
          this.renderTimeline();
          this.render();
          this.scheduleAutosave();
          alert(`Applied '${c.transition_in}' (${c.transition_duration}s) across all clips!`);
        });

        document.getElementById("btn-prop-remove-trans")?.addEventListener("click", () => {
          c.transition_in = "none";
          this.renderInspector();
          this.renderTimeline();
          this.render();
          this.scheduleAutosave();
        });

        document.getElementById("btn-prop-reset-trans")?.addEventListener("click", () => {
          c.transition_in = "dissolve";
          c.transition_duration = 0.5;
          this.renderInspector();
          this.renderTimeline();
          this.render();
          this.scheduleAutosave();
        });
      } else if (this.selectedTrack === "effect") {
        const c = this.currentProject?.timeline?.tracks?.media?.find((x) => x.id === this.selectedId) || this.currentProject?.timeline?.tracks?.media?.[0];
        if (!c) { this.renderEmptyInspector(); return; }

        if (this.inspectorHeading) this.inspectorHeading.textContent = "Visual Effects";
        if (this.inspectorIcon) this.inspectorIcon.textContent = "✨";

        const currentEffect = c.filter || "none";

        this.inspectorContent.innerHTML = `
          <div class="reel-prop-group">
            <label class="reel-prop-label">Visual Filter Preset</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
              <button type="button" class="btn btn-sm btn-outline btn-inspector-fx ${currentEffect === 'none' ? 'active' : ''}" data-fx="none" style="color:#fff;border-color:#303B4D;${currentEffect === 'none' ? 'background:#003580;' : ''}">None (Natural)</button>
              <button type="button" class="btn btn-sm btn-outline btn-inspector-fx ${currentEffect === 'nordic_warm' ? 'active' : ''}" data-fx="nordic_warm" style="color:#fff;border-color:#303B4D;${currentEffect === 'nordic_warm' ? 'background:#003580;' : ''}">Nordic Warm</button>
              <button type="button" class="btn btn-sm btn-outline btn-inspector-fx ${currentEffect === 'arctic_vivid' ? 'active' : ''}" data-fx="arctic_vivid" style="color:#fff;border-color:#303B4D;${currentEffect === 'arctic_vivid' ? 'background:#003580;' : ''}">Arctic Vivid</button>
              <button type="button" class="btn btn-sm btn-outline btn-inspector-fx ${currentEffect === 'mono_bnw' ? 'active' : ''}" data-fx="mono_bnw" style="color:#fff;border-color:#303B4D;${currentEffect === 'mono_bnw' ? 'background:#003580;' : ''}">Monochrome</button>
              <button type="button" class="btn btn-sm btn-outline btn-inspector-fx ${currentEffect === 'vintage_film' ? 'active' : ''}" data-fx="vintage_film" style="color:#fff;border-color:#303B4D;${currentEffect === 'vintage_film' ? 'background:#003580;' : ''}">Vintage Film</button>
              <button type="button" class="btn btn-sm btn-outline btn-inspector-fx ${currentEffect === 'high_contrast' ? 'active' : ''}" data-fx="high_contrast" style="color:#fff;border-color:#303B4D;${currentEffect === 'high_contrast' ? 'background:#003580;' : ''}">High Contrast</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px;">
            <button type="button" id="btn-prop-apply-fx-all" class="btn btn-sm btn-primary" style="background:#003580;border:1px solid #168BFF;color:#fff;">
              ✨ Apply Effect To All Clips
            </button>
            <button type="button" id="btn-prop-reset-fx" class="btn btn-sm btn-outline" style="color:#B8C4D4;border-color:#303B4D;">
              ↺ Reset to Normal
            </button>
          </div>
        `;

        this.inspectorContent.querySelectorAll(".btn-inspector-fx").forEach((btn) => {
          btn.addEventListener("click", () => {
            c.filter = btn.dataset.fx;
            this.renderInspector();
            this.render();
            this.scheduleAutosave();
          });
        });

        document.getElementById("btn-prop-apply-fx-all")?.addEventListener("click", () => {
          const mediaClips = this.currentProject.timeline.tracks.media || [];
          mediaClips.forEach(m => { m.filter = c.filter; });
          this.pushState();
          this.render();
          this.scheduleAutosave();
          alert(`Applied effect '${c.filter}' across all clips!`);
        });

        document.getElementById("btn-prop-reset-fx")?.addEventListener("click", () => {
          c.filter = "none";
          this.renderInspector();
          this.render();
          this.scheduleAutosave();
        });
      } else {
        this.renderEmptyInspector();
      }
    }

    renderEmptyInspector() {
      if (this.inspectorHeading) this.inspectorHeading.textContent = "Reel Settings";
      if (this.inspectorIcon) this.inspectorIcon.textContent = "⚙️";
      if (!this.inspectorContent) return;
      this.inspectorContent.innerHTML = `
        <div class="reel-prop-group">
          <label class="reel-prop-label">Aspect Ratio</label>
          <div style="font-weight:700;color:#fff;font-size:0.85rem;">9:16 Vertical (1080 × 1920)</div>
        </div>
        <div class="reel-prop-group">
          <label class="reel-prop-label">Total Duration</label>
          <div style="font-weight:700;color:#38bdf8;font-size:0.85rem;font-family:monospace;">${this.getTotalDuration().toFixed(1)} seconds</div>
        </div>
        <p style="font-size:0.75rem;color:var(--reel-text-muted);padding-top:10px;border-top:1px solid var(--reel-panel-border);">
          Tip: Tap any text overlay or clip in the timeline or preview to inspect and edit its styles.
        </p>
      `;
    }

    // =========================================================================
    // EXPORT 1080x1920 MP4
    // =========================================================================

    async exportMP4() {
      if (!this.currentProject) return;
      await this.saveProject();

      const modal = document.getElementById("reel-export-modal");
      const stateRendering = document.getElementById("export-modal-state-rendering");
      const stateSuccess = document.getElementById("export-modal-state-success");
      const dlBtn = document.getElementById("btn-download-exported-reel");

      if (modal) modal.classList.remove("hidden");
      if (stateRendering) stateRendering.classList.remove("hidden");
      if (stateSuccess) stateSuccess.classList.add("hidden");

      try {
        const res = await (await fetch("/api/reel/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: this.currentProject.id,
            timeline: this.currentProject.timeline,
          }),
        })).json();

        if (res.success && res.download_url) {
          if (stateRendering) stateRendering.classList.add("hidden");
          if (stateSuccess) stateSuccess.classList.remove("hidden");
          if (dlBtn) {
            dlBtn.href = res.download_url;
            dlBtn.download = res.filename || `ilovefinland-reel-${this.currentProject.id}.mp4`;
          }
        } else {
          throw new Error(res.error || "Export failed.");
        }
      } catch (err) {
        if (modal) modal.classList.add("hidden");
        alert(`Failed to export Reel MP4: ${err.message}`);
      }
    }

    // =========================================================================
    // ARTICLE TO REEL IMPORT
    // =========================================================================

    async showArticleImportModal() {
      const modal = document.getElementById("reel-import-article-modal");
      const select = document.getElementById("select-import-article-pkg");
      if (!modal || !select) return;

      select.innerHTML = `<option>Loading articles…</option>`;
      modal.classList.remove("hidden");

      try {
        const res = await (await fetch("/api/projects")).json();
        const projs = res.projects || [];
        if (projs.length === 0) {
          select.innerHTML = `<option value="">No article drafts found</option>`;
          return;
        }
        select.innerHTML = projs.map((p) => `
          <option value="${p.id}">#${p.id} — ${escapeHtml(p.title)}</option>
        `).join("");
      } catch (err) {
        select.innerHTML = `<option value="">Failed to load articles</option>`;
      }
    }

    async executeArticleImport() {
      const select = document.getElementById("select-import-article-pkg");
      const pkgId = parseInt(select?.value, 10);
      if (!pkgId) { alert("Please select an article to import."); return; }

      document.getElementById("reel-import-article-modal")?.classList.add("hidden");
      try {
        const res = await (await fetch("/api/reel/project/import-article", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ package_id: pkgId }),
        })).json();

        if (res.project) {
          await this.openProject(res.project.id);
        } else {
          throw new Error(res.error || "Import failed.");
        }
      } catch (err) {
        alert(`Failed to import article: ${err.message}`);
      }
    }

    async importArticleAndOpen(pkgId) {
      if (!pkgId) return;
      try {
        const res = await (await fetch("/api/reel/project/import-article", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ package_id: pkgId }),
        })).json();

        if (res.project) {
          if (window.switchView) window.switchView("reel-studio");
          await this.openProject(res.project.id);
        } else {
          throw new Error(res.error || "Import failed.");
        }
      } catch (err) {
        alert(`Failed to import article into Reel Editor: ${err.message}`);
      }
    }

    // =========================================================================
    // AI ASSIST (OPTIONAL)
    // =========================================================================

    async requestAiSuggestions(type) {
      const resultsContainer = document.getElementById("reel-ai-results");
      if (!resultsContainer || !this.currentProject) return;
      resultsContainer.innerHTML = `<div style="font-size:0.75rem;color:var(--reel-text-muted);">Generating suggestions…</div>`;

      try {
        const res = await (await fetch("/api/reel/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            topic: this.currentProject.title,
          }),
        })).json();

        const suggestions = res.suggestions || [];
        resultsContainer.innerHTML = suggestions.map((s) => `
          <div style="background:rgba(15,23,42,0.6);border:1px solid var(--reel-panel-border);border-radius:6px;padding:8px;display:flex;justify-content:space-between;align-items:center;gap:6px;">
            <div style="font-size:0.75rem;color:#fff;flex:1;">${escapeHtml(s)}</div>
            <button type="button" class="btn btn-sm btn-ghost btn-apply-ai-sug" style="color:#38bdf8;font-size:0.7rem;white-space:nowrap;padding:2px 6px;">
              Apply
            </button>
          </div>
        `).join("");

        resultsContainer.querySelectorAll(".btn-apply-ai-sug").forEach((b, idx) => {
          b.addEventListener("click", () => {
            if (type === "hooks") {
              this.addTextBox(suggestions[idx], "title", 68.0);
            } else {
              this.addTextBox(suggestions[idx], "subtitle", 60.0);
            }
          });
        });
      } catch (err) {
        resultsContainer.innerHTML = `<div style="font-size:0.75rem;color:#ef4444;">Failed to get AI suggestions.</div>`;
      }
    }
  }

  // Helpers
  function round1(num) {
    return Math.round(Number(num) * 10.0) / 10.0;
  }
  function round2(num) {
    return Math.round((Number(num) + Number.EPSILON) * 100.0) / 100.0;
  }
  function formatSec(sec) {
    const s = Math.floor(sec || 0);
    const ms = Math.floor(((sec || 0) % 1) * 10);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${m.toString().padStart(2, "0")}:${remS.toString().padStart(2, "0")}.${ms}`;
  }
  function escapeHtml(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Export globally and auto-initialize
  window.ReelStudio = new ReelStudioApp();
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => window.ReelStudio.init());
    } else {
      window.ReelStudio.init();
    }
  }
})();
