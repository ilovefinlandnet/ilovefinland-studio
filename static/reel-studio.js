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

      // Media Uploads
      const dropzone = document.getElementById("reel-media-dropzone");
      const fileInput = document.getElementById("reel-media-file-input");
      dropzone?.addEventListener("click", () => fileInput?.click());
      dropzone?.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.style.borderColor = "#38bdf8"; });
      dropzone?.addEventListener("dragleave", (e) => { e.preventDefault(); dropzone.style.borderColor = "#475569"; });
      dropzone?.addEventListener("drop", async (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "#475569";
        if (e.dataTransfer && e.dataTransfer.files) {
          await this.handleMediaFilesUpload(Array.from(e.dataTransfer.files));
        }
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
      document.getElementById("input-music-fadeout")?.addEventListener("input", (e) => {
        const music = this.getAudioTrack("music");
        if (music) { music.fade_out = parseFloat(e.target.value) || 0.0; this.scheduleAutosave(); }
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
      try {
        const res = await (await fetch("/api/reel/project/new", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        })).json();
        if (res.project) {
          await this.openProject(res.project.id);
        }
      } catch (err) {
        alert(`Failed to create project: ${err.message}`);
      }
    }

    async openProject(id) {
      if (!this.editorScreen || !this.canvas) this.bindElements();
      try {
        const res = await (await fetch(`/api/reel/project?id=${id}`)).json();
        if (!res.project) throw new Error("Project not found");
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

      for (const file of files) {
        if (pool.length >= 10) break;
        try {
          const isImg = file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|gif)$/i.test(file.name);
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const res = await (await fetch("/api/reel/upload-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data_base64: base64Data,
              filename: file.name,
              media_type: isImg ? "image" : "video",
            }),
          })).json();

          if (res.ok && res.url) {
            pool.push({
              id: `med_${pool.length + 1}_${Date.now().toString(36)}`,
              filename: file.name,
              url: res.url,
              type: isImg ? "image" : "video",
              duration: isImg ? 3.5 : (res.duration || 5.0),
            });
          }
        } catch (err) {
          alert(`Failed to upload ${file.name}: ${err.message}`);
        }
      }

      this.currentProject.timeline.media_pool = pool;
      this.renderMediaPoolUI();

      // If timeline is empty, auto-populate with uploaded media
      const mediaClips = this.currentProject.timeline.tracks.media;
      if (mediaClips.length === 0 && pool.length > 0) {
        this.addAllMediaToTimeline();
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
        <div class="reel-media-pool-card" data-idx="${idx}">
          <img src="${m.url}" alt="${escapeHtml(m.filename)}" onerror="this.src='/assets/sample-clips/tesla-clean-bg.jpg'" />
          <div class="reel-pool-card-hover">
            <button type="button" class="btn btn-sm btn-primary btn-add-pool-clip" data-idx="${idx}" style="font-size:0.7rem;padding:4px 8px;">
              + Add to Reel
            </button>
            <button type="button" class="btn btn-sm btn-ghost btn-del-pool-clip" data-idx="${idx}" style="color:#ef4444;font-size:0.7rem;padding:2px 6px;">
              ✕ Remove
            </button>
          </div>
          <span style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,0.7);color:#fff;font-size:0.65rem;padding:2px 4px;border-radius:3px;">
            ${m.type === 'video' ? '🎬 Video' : '📷 Photo'}
          </span>
        </div>
      `).join("");

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

      this.recalculateTotalDuration();
      this.pushState();
      this.renderTimeline();
      this.render();
    }

    // =========================================================================
    // TEXT OVERLAYS & PRESETS
    // =========================================================================

    addTextBox(text = "NEW TEXT OVERLAY", type = "custom", yPct = 50.0) {
      if (!this.currentProject) return;
      const textLayers = this.currentProject.timeline.tracks.text;
      const dur = Math.min(4.0, this.getTotalDuration() - this.currentTime);
      const st = round1(this.currentTime);
      const en = round1(st + Math.max(2.0, dur));

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
        this.addTextBox("DISCOVER FINLAND'S MAGIC", "title", 68.0);
        this.addTextBox("EXPERIENCE AUTHENTIC NORDIC LIFE", "subtitle", 60.0);
      } else if (preset === "scenic_callout") {
        this.addTextBox("📍 ROVANIEMI, LAPLAND", "callout", 25.0);
      } else if (preset === "breaking_news") {
        this.addTextBox("🚨 BREAKING UPDATE", "title", 50.0);
      }
    }

    // =========================================================================
    // AUDIO ENGINE
    // =========================================================================

    getAudioTrack(type = "music") {
      if (!this.currentProject) return null;
      return (this.currentProject.timeline.tracks.audio || []).find((a) => a.type === type);
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
      if (window.innerWidth < 900) {
        document.getElementById("reel-left-drawer")?.classList.remove("mobile-sheet-open");
        document.getElementById("reel-inspector-panel")?.classList.add("mobile-sheet-open");
        document.getElementById("reel-mobile-backdrop")?.classList.add("active");
      }
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
        const xPct = ((clientX - rect.left) / rect.width) * 100.0;
        const yPct = ((clientY - rect.top) / rect.height) * 100.0;
        return { xPct, yPct };
      };

      const onPointerDown = (e) => {
        if (!this.currentProject) return;
        const { xPct, yPct } = getCanvasPoint(e);
        const t = this.currentTime;

        // 1. Check if clicking Logo
        const logo = this.currentProject.timeline.tracks.logo;
        if (logo.visible) {
          const dist = Math.hypot(xPct - logo.x_pct, yPct - logo.y_pct);
          if (dist < 8.0) {
            this.selectedTrack = "logo";
            this.selectedId = "logo";
            this.canvasDrag = { origXPct: logo.x_pct, origYPct: logo.y_pct, startXPct: xPct, startYPct: yPct, target: logo };
            this.renderInspector();
            this.openMobileInspector();
            this.render();
            return;
          }
        }

        // 2. Check if clicking active text layer
        const textLayers = (this.currentProject.timeline.tracks.text || []).filter(
          (txt) => t >= txt.start_sec && t <= txt.end_sec
        );
        for (let i = textLayers.length - 1; i >= 0; i--) {
          const txt = textLayers[i];
          const dist = Math.hypot(xPct - txt.x_pct, yPct - txt.y_pct);
          if (dist < 14.0) {
            this.selectedTrack = "text";
            this.selectedId = txt.id;
            this.canvasDrag = { origXPct: txt.x_pct, origYPct: txt.y_pct, startXPct: xPct, startYPct: yPct, target: txt };
            this.renderTimeline();
            this.renderInspector();
            this.openMobileInspector();
            this.render();
            return;
          }
        }

        // Clicked empty canvas
        this.selectedTrack = null;
        this.selectedId = null;
        this.renderTimeline();
        this.renderInspector();
        this.render();
      };

      const onPointerMove = (e) => {
        if (!this.canvasDrag) return;
        if (e.cancelable) e.preventDefault();
        const { xPct, yPct } = getCanvasPoint(e);
        const dx = xPct - this.canvasDrag.startXPct;
        const dy = yPct - this.canvasDrag.startYPct;

        let newX = this.canvasDrag.origXPct + dx;
        let newY = this.canvasDrag.origYPct + dy;

        // Snapping: Center X (snap to 50% if within 2%)
        if (Math.abs(newX - 50.0) < 2.0) newX = 50.0;
        // Snapping: Instagram safe boundaries
        if (Math.abs(newY - 20.0) < 1.5) newY = 20.0;
        if (Math.abs(newY - 80.0) < 1.5) newY = 80.0;

        this.canvasDrag.target.x_pct = Math.max(5, Math.min(95, round1(newX)));
        this.canvasDrag.target.y_pct = Math.max(5, Math.min(95, round1(newY)));
        this.render();
      };

      const onPointerUp = () => {
        if (this.canvasDrag) {
          this.canvasDrag = null;
          this.pushState();
        }
      };

      this.canvas.addEventListener("mousedown", onPointerDown);
      window.addEventListener("mousemove", onPointerMove);
      window.addEventListener("mouseup", onPointerUp);

      // Mobile Touch Interaction with preventDefault to stop scroll while dragging
      this.canvas.addEventListener("touchstart", (e) => {
        onPointerDown(e);
      }, { passive: false });

      window.addEventListener("touchmove", (e) => {
        if (this.canvasDrag) {
          if (e.cancelable) e.preventDefault();
          onPointerMove(e);
        }
      }, { passive: false });

      window.addEventListener("touchend", onPointerUp);
      window.addEventListener("touchcancel", onPointerUp);
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
        mediaClips.forEach((c) => {
          const leftPx = c.start_sec * this.zoomPxPerSec;
          const widthPx = c.duration * this.zoomPxPerSec;
          const block = document.createElement("div");
          block.className = `reel-clip-block ${this.selectedId === c.id ? "active" : ""}`;
          block.style.left = `${leftPx}px`;
          block.style.width = `${widthPx}px`;
          block.dataset.id = c.id;
          block.innerHTML = `
            <div class="reel-trim-handle-left"></div>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.68rem;">${escapeHtml(c.filename)}</span>
            <div class="reel-trim-handle-right"></div>
          `;
          block.addEventListener("click", (e) => {
            e.stopPropagation();
            this.selectedTrack = "media";
            this.selectedId = c.id;
            this.renderTimeline();
            this.renderInspector();
            this.openMobileInspector();
          });
          this.laneMedia.appendChild(block);
        });
      }

      // 3. Render Text Layers
      if (this.laneText) {
        this.laneText.innerHTML = "";
        const textLayers = this.currentProject.timeline.tracks.text || [];
        textLayers.forEach((txt) => {
          const leftPx = txt.start_sec * this.zoomPxPerSec;
          const widthPx = (txt.end_sec - txt.start_sec) * this.zoomPxPerSec;
          const block = document.createElement("div");
          block.className = `reel-clip-block type-text ${this.selectedId === txt.id ? "active" : ""}`;
          block.style.left = `${leftPx}px`;
          block.style.width = `${widthPx}px`;
          block.dataset.id = txt.id;
          block.innerHTML = `
            <div class="reel-trim-handle-left"></div>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.68rem;">🔤 ${escapeHtml(txt.text)}</span>
            <div class="reel-trim-handle-right"></div>
          `;
          block.addEventListener("click", (e) => {
            e.stopPropagation();
            this.selectedTrack = "text";
            this.selectedId = txt.id;
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
          const widthPx = ((logo.always_on ? totalDur : logo.end_sec) - (logo.start_sec || 0)) * this.zoomPxPerSec;
          const block = document.createElement("div");
          block.className = `reel-clip-block type-logo ${this.selectedId === "logo" ? "active" : ""}`;
          block.style.left = `${leftPx}px`;
          block.style.width = `${widthPx}px`;
          block.innerHTML = `<span>💙 ILoveFinland Logo (${Math.round(logo.opacity * 100)}%)</span>`;
          block.addEventListener("click", (e) => {
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
          block.className = "reel-clip-block type-audio";
          block.style.left = `${leftPx}px`;
          block.style.width = `${widthPx}px`;
          block.innerHTML = `<span>🎵 ${escapeHtml(music.filename || 'Background Music')} (Vol: ${Math.round((music.volume || 0.75) * 100)}%)</span>`;
          this.laneAudio.appendChild(block);
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
    }

    pause() {
      this.isPlaying = false;
      if (this.iconPlay) this.iconPlay.classList.remove("hidden");
      if (this.iconPause) this.iconPause.classList.add("hidden");
      if (this.audioEl) this.audioEl.pause();
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
        const currentClip = mediaClips.find((c) => t >= c.start_sec && t <= c.end_sec) || mediaClips[0];
        if (currentClip && currentClip.url) {
          this.drawMediaClip(ctx, currentClip, t);
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
      }
    }

    drawMediaClip(ctx, clip, t) {
      let img = this.cachedImages[clip.url];
      if (!img) {
        img = new Image();
        img.src = clip.url;
        img.onload = () => this.render();
        this.cachedImages[clip.url] = img;
        return;
      }

      if (!img.complete || img.naturalWidth === 0) return;

      ctx.save();
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const scale = Math.max(CANVAS_W / imgW, CANVAS_H / imgH);
      const dw = imgW * scale;
      const dh = imgH * scale;
      const dx = (CANVAS_W - dw) / 2.0;
      const dy = (CANVAS_H - dh) / 2.0;

      // Dissolve Transition In
      if (clip.transition_in === "dissolve" && t < clip.start_sec + 0.4) {
        ctx.globalAlpha = Math.min(1.0, (t - clip.start_sec) / 0.4);
      }

      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }

    drawTextLayer(ctx, txt, isSelected) {
      ctx.save();
      const x = (txt.x_pct / 100.0) * CANVAS_W;
      const y = (txt.y_pct / 100.0) * CANVAS_H;
      const fontSize = (txt.font_size || 40) * 2; // High-res subpixel scale

      ctx.font = `${txt.font_style || ''} ${txt.font_weight || '800'} ${fontSize}px "${txt.font_family || 'Inter'}", sans-serif`;
      ctx.textAlign = txt.text_align || "center";
      ctx.textBaseline = "middle";

      const metrics = ctx.measureText(txt.text);
      const textW = metrics.width;
      const textH = fontSize * 1.2;
      const pad = (txt.bg_padding || 10) * 2;

      // Draw Background Box if present
      if (txt.bg_color && txt.bg_color !== "transparent") {
        ctx.save();
        ctx.fillStyle = txt.bg_color;
        const boxX = x - (txt.text_align === "center" ? textW / 2 + pad : pad);
        const boxY = y - textH / 2 - pad / 2;
        const boxW = textW + pad * 2;
        const boxH = textH + pad;
        const rad = (txt.bg_radius || 6) * 2;

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(boxX, boxY, boxW, boxH, rad) : ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();
        ctx.restore();
      }

      // Draw Shadow / Halo
      if (txt.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
      }

      // Draw Text Outline
      if (txt.outline_width && txt.outline_color) {
        ctx.strokeStyle = txt.outline_color;
        ctx.lineWidth = (txt.outline_width || 3) * 2;
        ctx.lineJoin = "round";
        ctx.strokeText(txt.text, x, y);
      }

      // Fill Text
      ctx.fillStyle = txt.color || "#FFFFFF";
      ctx.fillText(txt.text, x, y);

      // Selection bounding box on canvas
      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = "#38BDF8";
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        const selX = x - (txt.text_align === "center" ? textW / 2 + pad + 6 : pad + 6);
        const selY = y - textH / 2 - pad / 2 - 6;
        const selW = textW + pad * 2 + 12;
        const selH = textH + pad + 12;
        ctx.strokeRect(selX, selY, selW, selH);

        // Corner handles
        ctx.fillStyle = "#FFFFFF";
        ctx.setLineDash([]);
        const hSize = 14;
        [[selX, selY], [selX + selW, selY], [selX, selY + selH], [selX + selW, selY + selH]].forEach(([hx, hy]) => {
          ctx.fillRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
        });
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
        ctx.strokeStyle = "#38BDF8";
        ctx.lineWidth = 4;
        ctx.strokeRect(x - size / 2 - 6, y - size / 2 - 6, size + 12, size + 12);
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
            <label class="reel-prop-label">Font Family</label>
            <select id="prop-text-font" class="reel-prop-select">
              <option value="Inter" ${txt.font_family === 'Inter' ? 'selected' : ''}>Inter (Brand Standard)</option>
              <option value="Helvetica" ${txt.font_family === 'Helvetica' ? 'selected' : ''}>Helvetica Bold</option>
              <option value="Impact" ${txt.font_family === 'Impact' ? 'selected' : ''}>Impact (Bold News)</option>
              <option value="Georgia" ${txt.font_family === 'Georgia' ? 'selected' : ''}>Georgia (Editorial)</option>
            </select>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Font Size: <span id="prop-val-fontsize">${txt.font_size}px</span></label>
            <input type="range" id="prop-slider-fontsize" min="20" max="72" value="${txt.font_size}" style="width:100%;" />
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Color Presets</label>
            <div class="reel-color-row">
              <div class="reel-color-swatch" data-col="#FFFFFF" style="background:#FFFFFF;"></div>
              <div class="reel-color-swatch" data-col="#38BDF8" style="background:#38BDF8;"></div>
              <div class="reel-color-swatch" data-col="#0A192F" style="background:#0A192F;border:1px solid #475569;"></div>
              <div class="reel-color-swatch" data-col="#003882" style="background:#003882;"></div>
              <div class="reel-color-swatch" data-col="#EF4444" style="background:#EF4444;"></div>
            </div>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Background Box</label>
            <select id="prop-text-bg" class="reel-prop-select">
              <option value="rgba(10, 25, 47, 0.85)" ${txt.bg_color.includes('10, 25, 47') ? 'selected' : ''}>Navy Box (#0A192F)</option>
              <option value="rgba(0, 56, 130, 0.88)" ${txt.bg_color.includes('0, 56, 130') ? 'selected' : ''}>Blue Box (#003882)</option>
              <option value="transparent" ${txt.bg_color === 'transparent' ? 'selected' : ''}>No Background (Transparent)</option>
            </select>
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
        document.getElementById("prop-slider-fontsize")?.addEventListener("input", (e) => {
          txt.font_size = parseInt(e.target.value, 10);
          document.getElementById("prop-val-fontsize").textContent = `${txt.font_size}px`;
          this.render();
          this.scheduleAutosave();
        });
        this.inspectorContent.querySelectorAll(".reel-color-swatch").forEach((s) => {
          s.addEventListener("click", () => {
            txt.color = s.dataset.col;
            this.render();
            this.scheduleAutosave();
          });
        });
        document.getElementById("prop-text-bg")?.addEventListener("change", (e) => {
          txt.bg_color = e.target.value;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("btn-prop-del-text")?.addEventListener("click", () => this.deleteSelected());
      } else if (this.selectedTrack === "media" && this.selectedId) {
        const c = this.currentProject?.timeline?.tracks?.media?.find((x) => x.id === this.selectedId);
        if (!c) { this.renderEmptyInspector(); return; }

        if (this.inspectorHeading) this.inspectorHeading.textContent = "Media Clip";
        if (this.inspectorIcon) this.inspectorIcon.textContent = "📹";

        this.inspectorContent.innerHTML = `
          <div class="reel-prop-group">
            <label class="reel-prop-label">File</label>
            <div style="font-size:0.82rem;font-weight:700;color:#fff;word-break:break-all;">${escapeHtml(c.filename)}</div>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Duration: <span id="prop-val-clipdur">${c.duration.toFixed(1)}s</span></label>
            <input type="range" id="prop-slider-clipdur" min="1.0" max="12.0" step="0.5" value="${c.duration}" style="width:100%;" />
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Fit Mode</label>
            <select id="prop-clip-fit" class="reel-prop-select">
              <option value="cover" ${c.fit_mode === 'cover' ? 'selected' : ''}>Cover (Fill 9:16 Frame)</option>
              <option value="contain" ${c.fit_mode === 'contain' ? 'selected' : ''}>Contain (Fit with Background)</option>
            </select>
          </div>
          <div class="reel-prop-group">
            <label class="reel-prop-label">Transition In</label>
            <select id="prop-clip-trans" class="reel-prop-select">
              <option value="none" ${c.transition_in === 'none' ? 'selected' : ''}>None (Cut)</option>
              <option value="dissolve" ${c.transition_in === 'dissolve' ? 'selected' : ''}>Dissolve / Crossfade</option>
              <option value="fade" ${c.transition_in === 'fade' ? 'selected' : ''}>Fade from Black</option>
            </select>
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

        document.getElementById("prop-slider-clipdur")?.addEventListener("input", (e) => {
          const newDur = parseFloat(e.target.value);
          const diff = newDur - c.duration;
          c.duration = round1(newDur);
          c.end_sec = round1(c.start_sec + newDur);
          // Shift subsequent clips
          const clips = this.currentProject.timeline.tracks.media;
          const idx = clips.indexOf(c);
          for (let i = idx + 1; i < clips.length; i++) {
            clips[i].start_sec = round1(clips[i].start_sec + diff);
            clips[i].end_sec = round1(clips[i].end_sec + diff);
          }
          this.recalculateTotalDuration();
          this.renderTimeline();
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("prop-clip-trans")?.addEventListener("change", (e) => {
          c.transition_in = e.target.value;
          this.render();
          this.scheduleAutosave();
        });
        document.getElementById("btn-prop-split-clip")?.addEventListener("click", () => this.splitAtPlayhead());
        document.getElementById("btn-prop-dup-clip")?.addEventListener("click", () => this.duplicateSelected());
        document.getElementById("btn-prop-del-clip")?.addEventListener("click", () => this.deleteSelected());
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
    return Math.round(num * 10.0) / 10.0;
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
