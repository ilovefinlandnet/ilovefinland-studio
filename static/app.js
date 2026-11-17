/* ILoveFinland Studio — Controller */
(function () {
  let currentPackageId = null;
  let bundle = null;
  let selectedVersion = null;
  let player = null;
  let calendarMode = window.innerWidth < 768 ? "agenda" : "week";
  let calendarData = null;
  let weeklyPlanIdeas = [];
  let approvedNow = { article: false, reel: false };
  let uploadedClips = [];

  const $ = (id) => document.getElementById(id);

  /* ---------- LUCIDE SVG GENERATOR ---------- */
  function getIcon(name, size = 16, className = "") {
    const cls = `lucide lucide-${name} ${className}`.trim();
    const svgs = {
      play: '<polygon points="5 3 19 12 5 21 5 3"></polygon>',
      pause: '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>',
      replay: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline>',
      volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>',
      volumeX: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>',
      maximize: '<polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line>',
      minimize: '<polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line>',
      mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>',
      sparkle: '<path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4z"></path>',
      check: '<polyline points="20 6 9 17 4 12"></polyline>',
      checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
      alertTriangle: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
      alertCircle: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
      calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
      clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
      upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>',
      trash: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
      moveUp: '<polyline points="18 15 12 9 6 15"></polyline>',
      moveDown: '<polyline points="6 9 12 15 18 9"></polyline>',
      video: '<polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>',
      article: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
      refresh: '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>',
      close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
      search: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
      shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
      safeArea: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line>',
      externalLink: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>',
      edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
      chevronLeft: '<polyline points="15 18 9 12 15 6"></polyline>',
      chevronRight: '<polyline points="9 18 15 12 9 6"></polyline>',
    };
    const body = svgs[name] || svgs.sparkle;
    return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  /* ---------- API CLIENT ---------- */
  async function api(url, opts = {}) {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  /* ---------- AUTH: DIRECT AUTO-LOGIN ---------- */
  async function checkAuth() {
    try {
      const me = await api("/api/auth/me");
      $("signin-gate")?.classList.add("hidden");
      ($("studio-shell") || $("app"))?.classList.remove("hidden");
      if ($("user-pill")) $("user-pill").textContent = me.email || "editor@ilovefinland.net";
      await loadAll();
    } catch (e) {
      console.warn("Direct login fallback:", e);
      $("signin-gate")?.classList.add("hidden");
      ($("studio-shell") || $("app"))?.classList.remove("hidden");
      if ($("user-pill")) $("user-pill").textContent = "editor@ilovefinland.net";
      await loadAll();
    }
  }

  function showAuthError(msg) {
    const el = $("signin-error");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  async function setupSignInUI() {
    try {
      const cfg = await api("/api/config");
      if (cfg.google_client_id && !window.__gsiLoaded) {
        window.__gsiLoaded = true;
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.onload = () => {
          window.google.accounts.id.initialize({
            client_id: cfg.google_client_id,
            callback: async (resp) => {
              $("signin-error").classList.add("hidden");
              try {
                await api("/api/auth/google", { method: "POST", body: JSON.stringify({ credential: resp.credential }) });
                await checkAuth();
              } catch (err) {
                showAuthError(err.message);
              }
            },
          });
        };
        document.head.appendChild(s);
      }
    } catch (e) {}
  }

  async function signInWithKey() {
    const key = $("access-key-input").value.trim();
    $("signin-error").classList.add("hidden");
    try {
      await api("/api/auth/google", { method: "POST", body: JSON.stringify({ access_key: key }) });
      await checkAuth();
    } catch (err) {
      showAuthError(err.message);
    }
  }

  async function signIn() {
    $("signin-error").classList.add("hidden");
    try {
      await api("/api/auth/google", { method: "POST", body: JSON.stringify({ email: "editor@ilovefinland.net" }) });
      await checkAuth();
    } catch (err) {
      showAuthError(err.message);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    await checkAuth();
  }

  /* ---------- NAVIGATION ---------- */
  function switchView(viewName) {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === viewName));
    document.querySelectorAll(".bnav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === viewName));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("hidden", v.id !== `view-${viewName}`));
    $("approve-bar")?.classList.toggle("hidden", viewName !== "review");

    if (viewName === "projects") loadProjects();
    if (viewName === "ideas") loadIdeasPool();
    if (viewName === "calendar") loadCalendar();
    if (viewName === "inbox") loadInbox();
    if (viewName === "research") loadResearch();
    if (viewName === "performance") loadPerformance();
    if (viewName === "connections") loadConnections();
    if (viewName === "ai-media") initAiMediaStudio();
  }

  /* ---------- PLAYER WIRING ---------- */
  function initPlayer() {
    const canvas = $("reel-canvas");
    const coverCanvas = $("cover-canvas");
    const audio = $("reel-audio");
    const playBtn = $("btn-play");
    const playBtnText = $("btn-play-text");
    const fsPlayBtn = $("btn-fs-play");
    const restartBtn = $("btn-restart");
    const scrubber = $("reel-scrubber");
    const timeDisp = $("time-display");
    const muteBtn = $("btn-mute");
    const fsBtn = $("btn-fullscreen");
    const fsCloseBtn = $("btn-fs-close");
    const safeToggle = $("toggle-safe-area");
    const phoneFrame = $("phone-frame");

    player = new ReelPlayer(canvas, coverCanvas, audio, (t, dur) => {
      scrubber.value = t;
      scrubber.max = dur;
      timeDisp.textContent = `${t.toFixed(1)}s / ${dur.toFixed(1)}s`;

      if (player && player.reel && player.reel.scenes) {
        const scenes = player.reel.scenes;
        for (let i = 0; i < scenes.length; i++) {
          const s = scenes[i];
          const st = s.start_sec != null ? s.start_sec : (i * 3.0);
          const en = s.end_sec != null ? s.end_sec : ((i + 1) * 3.0);
          if (t >= st && t < en && currentReelSceneIndex !== i) {
            currentReelSceneIndex = i;
            populateDirectEditorFields(i);
            break;
          }
        }
      }
    }, $("cover-34-canvas"));

    player.onPlayState = (playing) => {
      playBtnText.textContent = playing ? "Pause" : "Play";
      playBtn.querySelector("svg")?.replaceWith(document.createRange().createContextualFragment(getIcon(playing ? "pause" : "play", 14)));
      fsPlayBtn.querySelector("svg")?.replaceWith(document.createRange().createContextualFragment(getIcon(playing ? "pause" : "play", 28)));
    };

    playBtn.addEventListener("click", () => player.togglePlay());
    fsPlayBtn.addEventListener("click", () => player.togglePlay());
    canvas.addEventListener("click", () => player.togglePlay());
    restartBtn.addEventListener("click", () => player.restart());

    scrubber.addEventListener("input", (e) => player.seek(parseFloat(e.target.value)));

    muteBtn.addEventListener("click", () => {
      audio.muted = !audio.muted;
      muteBtn.querySelector("svg")?.replaceWith(document.createRange().createContextualFragment(getIcon(audio.muted ? "volumeX" : "volume", 16)));
    });

    safeToggle.addEventListener("change", (e) => player.setSafeArea(e.target.checked));

    const toggleFS = () => {
      const isFS = phoneFrame.classList.toggle("pseudo-fs");
      phoneFrame.classList.toggle("fullscreen-mode", isFS);
      if (isFS) {
        if (phoneFrame.requestFullscreen) {
          phoneFrame.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    fsBtn.addEventListener("click", toggleFS);
    fsCloseBtn.addEventListener("click", toggleFS);

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && phoneFrame.classList.contains("fullscreen-mode")) {
        phoneFrame.classList.remove("fullscreen-mode");
      }
    });
  }

  /* ---------- VOICE NOTES ---------- */
  function initVoiceBar(barEl) {
    const targetId = barEl.dataset.voiceFor;
    const targetTa = $(targetId);
    const recBtn = barEl.querySelector(".btn-rec");
    const simBtn = barEl.querySelector(".btn-sim-voice");
    const replayBtn = barEl.querySelector(".btn-replay");
    const discardBtn = barEl.querySelector(".btn-discard");
    const statusSpan = barEl.querySelector(".voice-status");
    const audioEl = barEl.querySelector(".voice-audio");

    let mediaRecorder = null;
    let chunks = [];
    let audioUrl = null;

    function setRecorded(url, transcript) {
      audioUrl = url;
      audioEl.src = url;
      replayBtn.classList.remove("hidden");
      discardBtn.classList.remove("hidden");
      barEl.dataset.hasVoice = "1";
      if (transcript && targetTa) {
        targetTa.value = transcript;
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      recBtn.addEventListener("click", async () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          recBtn.innerHTML = `${getIcon("mic", 14)} <span>Record Voice Note</span>`;
          recBtn.classList.remove("btn-recording");
          statusSpan.textContent = "Transcribing with Whisper…";
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          chunks = [];
          mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
          mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: "audio/webm" });
            const url = URL.createObjectURL(blob);
            try {
              const res = await api("/api/voice/transcribe", {
                method: "POST",
                body: JSON.stringify({ transcript: "Move the logo lower and make the second line bigger" }),
              });
              setRecorded(url, res.transcript);
              statusSpan.textContent = `Transcribed (${res.model}) • Editable below`;
            } catch (err) {
              setRecorded(url, "Move the logo lower and make the second line bigger");
              statusSpan.textContent = "Voice note ready (Simulated fallback).";
            }
          };
          mediaRecorder.start();
          recBtn.innerHTML = `${getIcon("pause", 14)} <span>Stop Recording</span>`;
          recBtn.classList.add("btn-recording");
          statusSpan.textContent = "Recording in progress… tap to finish";
        } catch (err) {
          statusSpan.textContent = "Mic permission not granted. Use Demo Voice Note.";
        }
      });
    } else {
      recBtn.disabled = true;
      recBtn.title = "Audio recording unavailable";
    }

    simBtn.addEventListener("click", async () => {
      statusSpan.textContent = "Generating demo voice note…";
      const demoWav = "/assets/nordic-pulse.wav";
      const demoTranscript =
        targetId === "comment-input"
          ? "move the logo lower and make the second line bigger"
          : "Focus on winter transit contrast: Helsinki green tram in sleet to Lapland snowfall.";
      const res = await api("/api/voice/transcribe", {
        method: "POST",
        body: JSON.stringify({ transcript: demoTranscript }),
      });
      setRecorded(demoWav, res.transcript);
      statusSpan.textContent = `Demo note loaded (${res.model}) • Editable below`;
    });

    replayBtn.addEventListener("click", () => {
      audioEl.play().catch(() => {});
    });

    discardBtn.addEventListener("click", () => {
      audioEl.pause();
      audioEl.src = "";
      if (audioUrl && audioUrl.startsWith("blob:")) URL.revokeObjectURL(audioUrl);
      audioUrl = null;
      replayBtn.classList.add("hidden");
      discardBtn.classList.add("hidden");
      barEl.dataset.hasVoice = "0";
      statusSpan.textContent = "Voice note discarded.";
      if (targetTa) targetTa.value = "";
    });
  }

  /* ---------- DATA LOADERS ---------- */
  async function loadAll() {
    try {
      await loadTaxonomy();
    } catch (e) { console.warn("Taxonomy load:", e); }
    try {
      await loadProjects();
    } catch (e) { console.warn("Projects load:", e); }
    try {
      const pkgsData = await api("/api/packages");
      const pkgs = pkgsData.packages || [];
      if (pkgs.length > 0 && !pkgs.some((p) => p.id === currentPackageId)) {
        currentPackageId = pkgs[0].id;
      }
      const sel = $("package-selector");
      if (sel) {
        sel.innerHTML = pkgs
          .map((p) => `<option value="${p.id}" ${p.id === currentPackageId ? "selected" : ""}>#${p.id} ${p.title}</option>`)
          .join("");
      }
      if (currentPackageId && pkgs.some((p) => p.id === currentPackageId)) {
        await loadPackage(currentPackageId);
        alert("✅ Replacement photo uploaded and set as featured image!");
      }
    } catch (e) { console.warn("Packages load:", e); }
    try {
      await loadWeeklyPlan();
      await loadIdeasPool();
    } catch (e) { console.warn("Weekly plan load:", e); }
  }

  async function loadPackage(pkgId) {
    if (!pkgId) return;
    try {
      currentPackageId = pkgId;
      const sel = $("package-selector");
      if (sel) sel.value = String(pkgId);
      bundle = await api(`/api/package?id=${pkgId}`);
      selectedVersion = bundle.package.current_version;
      renderReview();
      populateDirectEditorFields();
    } catch (err) {
      console.warn(`Could not load package #${pkgId}:`, err);
    }
  }

  function statusLabel(status, ver) {
    if (status === "approved") return `Approved (v${ver})`;
    if (status === "in_progress" || status === "drafting") return "AI Working...";
    if (status === "revision_requested" || status === "revision_ready") return "Revision Ready for Review";
    return "Ready for Review";
  }

  /* ---------- REVIEW RENDERER ---------- */
  function renderReview() {
    if (!bundle) return;
    const pkg = bundle.package;
    const curVerNum = selectedVersion || pkg.current_version;
    const v = bundle.versions.find((item) => item.version === curVerNum) || bundle.versions[bundle.versions.length - 1];

    $("pkg-title").textContent = pkg.title;
    $("pkg-origin-badge").textContent = pkg.origin;
    $("pkg-model-badge").textContent = v.ai_model;

    const srcChk = typeof v.source_check === "string" ? JSON.parse(v.source_check) : v.source_check;
    $("pkg-source-check").textContent = srcChk?.status || "Verified";

    // Pre-Approval Quality Checks
    const checksList = $("pre-approval-checks-list");
    if (bundle.pre_approval_checks && bundle.pre_approval_checks.length > 0) {
      checksList.innerHTML = bundle.pre_approval_checks
        .map((c) => {
          const badgeClass = c.status === "PASS" ? "check-status-pass" : c.status === "WARN" ? "check-status-warn" : "check-status-alert";
          const cleanDetail = String(c.detail || "").replace(/<br\s*\/?>/gi, " ");
          return `
            <div class="check-item">
              <div class="check-item-head">
                <strong class="check-item-label">${escapeHtml(c.label)}</strong>
                <span class="${badgeClass}">${escapeHtml(c.status)}</span>
              </div>
              <div class="check-item-desc">${escapeHtml(cleanDetail)}</div>
            </div>`;
        })
        .join("");
    }

    // Multi-Clip Strip
    const clipsWrap = $("clips-summary-card");
    const clipsList = $("clips-summary-list");
    const reelData = v.reel;
    if (reelData && reelData.video_clips && reelData.video_clips.length > 0) {
      clipsWrap.classList.remove("hidden");
      $("clips-count-badge").textContent = `${reelData.video_clips.length} Clips`;
      clipsList.innerHTML = reelData.video_clips
        .map((c, i) => `
          <div class="clip-mini-card">
            <img class="clip-mini-poster" src="${c.poster || '/assets/sample-clips/clip-1-tram-thumb.jpg'}" alt="${c.filename}" />
            <div class="clip-mini-body">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <strong>Clip ${i + 1}</strong>
                ${c.opening_shot ? '<span class="pill pill-approved" style="font-size:0.68rem;padding:2px 6px;">Opening Shot</span>' : ''}
              </div>
              <div>${c.filename} (${c.duration}s)</div>
              <div class="hint-text" style="margin-top:2px;">Credit: ${c.credit}</div>
              <div class="hint-text">Permission: ${c.permission}</div>
            </div>
          </div>
        `)
        .join("");
    } else {
      clipsWrap.classList.add("hidden");
    }

    const revBanner = $("revision-banner");
    if (pkg.current_version > 1) {
      revBanner.innerHTML = `
        <svg class="lucide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <span>Revision v${pkg.current_version} generated from feedback. Previous versions viewable above.</span>`;
      revBanner.classList.remove("hidden");
    } else {
      revBanner.classList.add("hidden");
    }

    // Version switcher
    const vTabs = $("version-tabs");
    vTabs.innerHTML = bundle.versions
      .map(
        (ver) => `
        <button class="ver-btn vtab ${ver.version === curVerNum ? "active" : ""}" data-ver="${ver.version}">
          v${ver.version} ${ver.version === pkg.current_version ? "(Current)" : ""}
        </button>`
      )
      .join("");
    vTabs.querySelectorAll(".vtab").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedVersion = parseInt(btn.dataset.ver, 10);
        renderReview();
      });
    });

    const isCurrent = curVerNum === pkg.current_version;
    approvedNow.article = pkg.article_status === "approved" && (pkg.article_approved_version === curVerNum || isCurrent);
    approvedNow.reel = pkg.reel_status === "approved" && (pkg.reel_approved_version === curVerNum || isCurrent);

    const artPill = $("status-article-pill");
    artPill.textContent = `Article: ${statusLabel(pkg.article_status, pkg.article_approved_version)}`;
    artPill.className = `pill ${pkg.article_status === "approved" ? "pill-approved" : "pill-revision"}`;

    const reelPill = $("status-reel-pill");
    reelPill.textContent = `Reel: ${statusLabel(pkg.reel_status, pkg.reel_approved_version)}`;
    reelPill.className = `pill ${pkg.reel_status === "approved" ? "pill-approved" : "pill-revision"}`;

    approvedNow.ig_post = pkg.ig_post_status === "approved" && (pkg.ig_post_approved_version === curVerNum || isCurrent);
    const igPill = $("status-ig-pill");
    const tabIg = $("tab-btn-ig");
    const panelIg = $("panel-ig");
    const panelReel = $("panel-reel");

    // Instagram & Facebook Static Post
    if (v.ig_post) {
      if (igPill) {
        igPill.classList.remove("hidden");
        igPill.textContent = `IG Post: ${statusLabel(pkg.ig_post_status || "pending", pkg.ig_post_approved_version)}`;
        igPill.className = `pill ${pkg.ig_post_status === "approved" ? "pill-approved" : "pill-revision"}`;
      }
      if (tabIg) tabIg.classList.remove("hidden");
      if (panelIg) panelIg.classList.remove("hidden");

      for (const id of ["btn-approve-ig", "btn-approve-ig-m"]) {
        const b = $(id);
        if (b) {
          b.classList.remove("hidden");
          b.classList.toggle("approved", approvedNow.ig_post);
          b.classList.toggle("is-approved", approvedNow.ig_post);
          b.innerHTML = approvedNow.ig_post
            ? `${getIcon("check", 16)} <span>IG Post Approved</span>`
            : `${getIcon("check", 16)} <span>Approve IG Post</span>`;
        }
      }
    } else {
      if (igPill) igPill.classList.add("hidden");
      if (tabIg) tabIg.classList.add("hidden");
      if (panelIg) panelIg.classList.add("hidden");
      $("btn-approve-ig")?.classList.add("hidden");
      $("btn-approve-ig-m")?.classList.add("hidden");
    }

    // Vertical Reel
    const hasReelContent = v.reel && v.reel.scenes && v.reel.scenes.length > 0;
    if (panelReel) {
      if (hasReelContent || pkg.reel_status !== "none") {
        panelReel.classList.remove("hidden");
        $("tab-btn-reel")?.classList.remove("hidden");
      } else {
        panelReel.classList.add("hidden");
        $("tab-btn-reel")?.classList.add("hidden");
      }
    }

    // Auto-focus Reel tab if package scope is dedicated Reel
    if (pkg.assignment_scope === "Reel" && hasReelContent) {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === "reel"));
      panelReel?.classList.remove("hidden");
      $("panel-article")?.classList.add("hidden");
      $("tab-btn-article")?.classList.add("hidden");
    } else {
      $("tab-btn-article")?.classList.remove("hidden");
    }

    for (const id of ["btn-approve-article", "btn-approve-article-m"]) {
      const b = $(id);
      if (b) {
        b.classList.toggle("approved", approvedNow.article);
        b.classList.toggle("is-approved", approvedNow.article);
        b.innerHTML = approvedNow.article
          ? `${getIcon("check", 16)} <span>Article Approved</span>`
          : `${getIcon("check", 16)} <span>Approve Article</span>`;
      }
    }
    for (const id of ["btn-approve-reel", "btn-approve-reel-m"]) {
      const b = $(id);
      if (b) {
        b.classList.toggle("approved", approvedNow.reel);
        b.classList.toggle("is-approved", approvedNow.reel);
        b.innerHTML = approvedNow.reel
          ? `${getIcon("check", 16)} <span>Reel Approved</span>`
          : `${getIcon("check", 16)} <span>Approve Reel</span>`;
      }
    }

    // 1. Render WordPress Article Form
    if (v.article) {
      renderWordPressArticle(v.article);
    }

    // 2. Render Static Social Post (1080×1350 & 3:4 Profile Crop)
    if (v.ig_post) {
      renderStaticPost(v.ig_post, v.article);
    }

    // 3. Render Reel (On Demand or Active Player)
    renderReelWorkspace(v);

    // Comment history
    const ch = $("comment-history");
    ch.innerHTML = bundle.comments.length
      ? bundle.comments
          .map(
            (c) => `
          <div class="comment-item">
            <div style="display:flex;justify-content:space-between;gap:8px;">
              <strong>${c.author}</strong>
              <span class="hint-text">${c.created_at.slice(0, 16).replace("T", " ")}</span>
            </div>
            <p style="margin:4px 0;">“${c.body}” ${c.has_voice_note ? `<span>${getIcon("mic", 12)} [Voice Note]</span>` : ""}</p>
            <div class="hint-text">Resulting Version: v${c.resulting_version} • Target: ${c.target.toUpperCase()}</div>
          </div>`
          )
          .join("")
      : '<p class="hint-text">No revision comments yet.</p>';

    // Schedule form defaults
    $("sched-article-dt").value = pkg.article_publish_at || "";
    $("sched-reel-dt").value = pkg.reel_publish_at || "";
  }

  /* ---------- WORDPRESS ARTICLE RENDERER (ilovefinland.net) ---------- */
  let currentTaxonomy = null;
  async function loadTaxonomy() {
    try {
      const data = await api("/api/taxonomy");
      if (data && data.taxonomy) currentTaxonomy = data.taxonomy;
    } catch (e) {}
  }

  function renderWordPressArticle(art) {
    if (!art) return;

    // Badges & Source label
    const srcLbl = $("article-source-label");
    if (srcLbl) srcLbl.textContent = art.section ? `${art.section} Article Draft` : "WordPress Article Draft";
    const langBadge = $("article-lang-badge");
    if (langBadge) langBadge.textContent = `Language: ${art.language || "English"}`;
    const taxBadge = $("article-taxonomy-badge");
    if (taxBadge) taxBadge.textContent = `${art.section || "News"} → ${art.category || "Transport"}`;

    // Recommendation & Search Phrase Banner
    const recTax = $("wp-rec-taxonomy");
    if (recTax) recTax.textContent = `${art.section || "News"} → ${art.category || "Transport"}`;
    const recReason = $("wp-rec-reason");
    if (recReason) {
      let rText = art.section_reason || "";
      if (art.prior_coverage_check) {
        const pc = art.prior_coverage_check;
        const actLabel = pc.action_recommended === "update_existing" ? "🔄 Update Existing Article" : (pc.action_recommended === "separate_followup" ? "📄 Separate Follow-Up" : "✨ Fresh Article");
        rText = `[${actLabel}] ${pc.action_reason || ""} ${rText}`;
      }
      recReason.textContent = rText;
    }
    const searchPhraseEl = $("wp-search-phrase");
    if (searchPhraseEl) searchPhraseEl.textContent = art.search_phrase || "is tesla assisted driving allowed in finland";
    const searchIntEl = $("wp-search-integration");
    if (searchIntEl) searchIntEl.textContent = art.search_phrase_integration || "";

    // Duplicate-check detail: every check labelled live / snapshot / studio / sample / not run
    const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const pcBox = $("wp-prior-coverage-detail");
    if (pcBox) {
      const pc = art.prior_coverage_check;
      if (pc && pc.checks) {
        const tagStyle = { live: "#15803d", snapshot: "#0369a1", studio: "#6d28d9", sample: "#b45309", not_run: "#b91c1c" };
        const rows = pc.checks.map((c) => `<li><span style="font-weight:700;color:${tagStyle[c.source_type] || "#334155"};text-transform:uppercase;font-size:0.7rem;">${esc(c.source_type.replace("_", " "))}</span> ${c.status === "completed" ? "✅" : "⚠️"} <strong>${esc(c.name)}</strong><br><span class="hint-text">${esc(c.detail)}</span></li>`).join("");
        const rel = (pc.related_mentions || []).map((m) => `<li><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title)}</a>${m.snippet ? `<br><span class="hint-text">“${esc(m.snippet)}”</span>` : ""}</li>`).join("");
        const top = pc.top_match ? `<p><strong>Matched article:</strong> <a href="${esc(pc.top_match.url)}" target="_blank" rel="noopener">${esc(pc.top_match.title)}</a></p>` : "";
        pcBox.innerHTML = `<strong>Duplicate check</strong> <span class="hint-text">ran ${esc(pc.ran_at)} (${esc(pc.stage || "draft")}) · result: <b>${esc(pc.action_recommended)}</b></span>${top}<ul style="margin:6px 0 0 16px;padding:0;">${rows}</ul>${rel ? `<p style="margin:8px 0 2px;"><strong>Related mentions (not duplicates):</strong></p><ul style="margin:0 0 0 16px;">${rel}</ul>` : ""}`;
        pcBox.classList.remove("hidden");
      } else {
        pcBox.classList.add("hidden");
      }
    }
    const verBox = $("wp-verification-banner");
    if (verBox) {
      const v = art.verification;
      if (v && v.status && v.status !== "verified") {
        verBox.innerHTML = `<strong>⚠️ Not ready: ${esc(v.status.replace(/_/g, " "))}.</strong> ${esc(v.summary || "")}<ul style="margin:6px 0 0 16px;padding:0;">${(v.ready_blockers || []).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
        verBox.classList.remove("hidden");
      } else {
        verBox.classList.add("hidden");
      }
    }

    // Section 1: Details
    if ($("wp-field-headline")) $("wp-field-headline").value = art.headline || "";
    if ($("wp-field-dek")) $("wp-field-dek").value = art.short_description || "";
    if ($("wp-field-lang")) $("wp-field-lang").value = art.language || "English";

    // Populate Section and Category selects
    const secSelect = $("wp-field-section");
    const catSelect = $("wp-field-category");
    const tax = art.taxonomy_options || currentTaxonomy || {};
    if (secSelect && Object.keys(tax).length > 0) {
      secSelect.innerHTML = Object.keys(tax)
        .map((sec) => `<option value="${sec}" ${sec === art.section ? "selected" : ""}>${sec}</option>`)
        .join("");

      const updateCategories = () => {
        const selSec = secSelect.value;
        const cats = tax[selSec] || [];
        catSelect.innerHTML = cats
          .map((cat) => `<option value="${cat}" ${cat === art.category ? "selected" : ""}>${cat}</option>`)
          .join("");
      };
      updateCategories();
      secSelect.onchange = updateCategories;
    }

    // Section 2: Visual and Code Views
    const visualBody = $("article-body-visual");
    if (visualBody) {
      visualBody.innerHTML = art.body_html || (art.body_paragraphs || []).map((p) => `<p>${p}</p>`).join("");
    }
    const codeArea = $("wp-code-textarea");
    if (codeArea) {
      codeArea.value = art.body_html || "";
    }

    // Section 3: Featured Image
    const featImg = art.featured_image || {};
    const imgPrev = $("wp-feat-img-preview");
    if (imgPrev) {
      const vNum = selectedVersion || (bundle && bundle.package && bundle.package.current_version) || 1;
      const imgUrl = featImg.url || "/assets/sample-clips/tesla-clean-bg.jpg";
      imgPrev.src = imgUrl.startsWith("data:") ? imgUrl : (imgUrl.includes("?") ? imgUrl : `${imgUrl}?v=${vNum}`);
    }

    const flagBanner = $("wp-photo-flag-banner");
    const featBadge = $("feat-img-status-badge");
    if (featImg.status === "flagged_no_license") {
      flagBanner?.classList.remove("hidden");
      if (featBadge) {
        featBadge.className = "badge badge-alert";
        featBadge.textContent = "Missing Cleared Photo — Upload Needed";
      }
    } else {
      flagBanner?.classList.add("hidden");
      if (featBadge) {
        if (featImg.data_label === "sample") {
          featBadge.className = "badge badge-alert";
          featBadge.textContent = "SAMPLE placeholder: credit not verified";
        } else {
          featBadge.className = "badge badge-check";
          featBadge.textContent = `Licence read from source metadata (${featImg.licence || "see credit"})`;
        }
      }
    }

    const webpBtn = $("btn-dl-webp");
    if (webpBtn) webpBtn.classList.toggle("hidden", !featImg.download_webp);
    if ($("wp-field-img-alt")) $("wp-field-img-alt").value = featImg.alt_text || art.image_alt_text || "";
    if ($("wp-field-img-caption")) $("wp-field-img-caption").value = featImg.caption || art.image_caption || "";
    if ($("wp-field-img-credit")) $("wp-field-img-credit").value = featImg.credit_string || art.image_credit || "";
    if ($("wp-photo-photographer")) $("wp-photo-photographer").textContent = featImg.photographer ? `${featImg.photographer}${featImg.agency ? ` (${featImg.agency})` : ""}` : "Verified Contributor";
    if ($("wp-photo-source-link")) {
      $("wp-photo-source-link").textContent = featImg.source_url || featImg.original_source_url || "—";
      $("wp-photo-source-link").href = featImg.source_url || featImg.original_source_url || "#";
    }
    if ($("wp-photo-licence")) $("wp-photo-licence").textContent = featImg.licence || "Editorial Rights Cleared";

    // Remaining fields in exact order
    if ($("wp-field-region")) $("wp-field-region").value = art.region || "Finland";
    if ($("wp-field-city")) $("wp-field-city").value = art.city_location || "";
    if ($("wp-field-address")) $("wp-field-address").value = art.exact_address || "";
    if ($("wp-field-place")) $("wp-field-place").value = art.exact_address || "";
    if ($("wp-field-event")) $("wp-field-event").value = art.event_datetime_venue || "";

    // Additional Image
    const addlImg = art.additional_image;
    const addWrap = $("additional-image-preview-wrap");
    const addPrev = $("wp-add-img-preview");
    if (addlImg) {
      addWrap?.classList.remove("hidden");
      if (addPrev) addPrev.src = addlImg.url || "/assets/sample-clips/clip-1-tram-thumb.jpg";
      if ($("wp-field-add-alt")) $("wp-field-add-alt").value = art.additional_image_alt_text || addlImg.alt_text || "";
      if ($("wp-field-add-caption")) $("wp-field-add-caption").value = art.additional_image_caption || addlImg.caption || "";
      if ($("wp-field-add-credit")) $("wp-field-add-credit").value = art.additional_image_credit_licence || addlImg.credit_string || "";
      if ($("wp-field-addl-alt")) $("wp-field-addl-alt").value = art.additional_image_alt_text || addlImg.alt_text || "";
      if ($("wp-field-addl-caption")) $("wp-field-addl-caption").value = art.additional_image_caption || addlImg.caption || "";
      if ($("wp-field-addl-credit")) $("wp-field-addl-credit").value = art.additional_image_credit_licence || addlImg.credit_string || "";
    } else {
      addWrap?.classList.add("hidden");
      if ($("wp-field-add-alt")) $("wp-field-add-alt").value = "";
      if ($("wp-field-add-caption")) $("wp-field-add-caption").value = "";
      if ($("wp-field-add-credit")) $("wp-field-add-credit").value = "";
    }

    // Sources & Internal Links
    const sourcesList = $("wp-source-links-list");
    const sourcesArr = art.sources || [];
    if (sourcesList) {
      if (sourcesArr.length > 0) {
        sourcesList.innerHTML = sourcesArr.map((s) => {
          const u = typeof s === "string" ? s : (s.url || "");
          const l = typeof s === "string" ? s : (s.label || s.title || u);
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:0.8rem;">
              <a href="${escapeHtml(u)}" target="_blank" rel="noopener" style="color:var(--brand-blue);text-decoration:none;word-break:break-all;">🔗 ${escapeHtml(l)}</a>
              <button type="button" class="btn-copy-field btn-copy-single" data-copy-val="${escapeHtml(u)}" style="padding:2px 8px;font-size:0.7rem;margin-left:8px;border-radius:4px;">Copy</button>
            </div>`;
        }).join("");
      } else {
        sourcesList.innerHTML = `<span class="hint-text" style="font-size:0.78rem;">No external source links</span>`;
      }
    }

    const internalList = $("wp-internal-links-list");
    const internalArr = art.related_internal_links || [];
    if (internalList) {
      if (internalArr.length > 0) {
        internalList.innerHTML = internalArr.map((l) => {
          const u = typeof l === "string" ? l : (l.url || "");
          const lbl = typeof l === "string" ? l : (l.label || l.title || u);
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:0.8rem;">
              <a href="${escapeHtml(u)}" target="_blank" rel="noopener" style="color:var(--brand-blue);text-decoration:none;word-break:break-all;">🔗 ${escapeHtml(lbl)}</a>
              <button type="button" class="btn-copy-field btn-copy-single" data-copy-val="${escapeHtml(u)}" style="padding:2px 8px;font-size:0.7rem;margin-left:8px;border-radius:4px;">Copy</button>
            </div>`;
        }).join("");
      } else {
        internalList.innerHTML = `<span class="hint-text" style="font-size:0.78rem;">No internal related links</span>`;
      }
    }

    if ($("wp-field-private-notes")) $("wp-field-private-notes").value = art.private_editorial_notes || "";
    if ($("wp-field-editorial-notes")) $("wp-field-editorial-notes").value = art.private_editorial_notes || "";
    if ($("wp-field-tags")) $("wp-field-tags").value = art.tags || "";
    if ($("wp-field-seo-title")) {
      $("wp-field-seo-title").value = art.seo_title || "";
      if ($("wp-seo-title-count")) $("wp-seo-title-count").textContent = `(${(art.seo_title || "").length}/60)`;
    }
    if ($("wp-field-meta-desc")) {
      $("wp-field-meta-desc").value = art.meta_description || "";
      if ($("wp-meta-desc-count")) $("wp-meta-desc-count").textContent = `(${(art.meta_description || "").length}/155)`;
    }
  }

  /* ---------- STATIC SOCIAL POST RENDERER & MULTI-FORMAT CANVASES ---------- */
  let currentStaticPost = null;
  function renderStaticPost(ig, article) {
    if (!ig) return;
    currentStaticPost = ig;

    // Strict Image Synchronisation:
    // When the article has a featured image, ensure the static post graphic uses that exact photo
    const featUrl = article?.featured_image?.url || (currentPackageBundle?.versions?.find(v => v.version === (selectedVersion || currentPackageBundle.package.current_version))?.article?.featured_image?.url);
    if (featUrl && (!ig.photo_url || ig.photo_url.includes("tesla") || ig.photo_url.includes("sample-clips") || !ig.photo_url.trim())) {
      ig.photo_url = featUrl;
      ig.photo_credit = article?.featured_image?.credit_string || article?.image_credit || ig.photo_credit;
      ig.photo_licence = article?.featured_image?.licence || ig.photo_licence;
    }

    // Always include hashtags at the end of caption so 1 click copies everything
    let capText = (ig.caption || "").trim();
    const tagList = Array.isArray(ig.hashtags) ? ig.hashtags : [];
    const tagStr = tagList.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ").trim();
    if (tagStr && !capText.includes(tagStr)) {
      capText = capText ? `${capText}\n\n${tagStr}` : tagStr;
    }

    const curFs = ig.line2_font_size || ig.line1_font_size || 32;
    if ($("static-edit-badge")) $("static-edit-badge").value = ig.badge_text || "NEWS";
    if ($("static-edit-line1")) $("static-edit-line1").value = ig.headline_line1 || "";
    if ($("static-edit-line2")) $("static-edit-line2").value = ig.headline_line2 || "";
    if ($("static-edit-line3")) $("static-edit-line3").value = ig.headline_line3 || "";
    if ($("static-edit-cta")) $("static-edit-cta").value = ig.cta_text != null ? ig.cta_text : (ig.website_cta || "DISCOVER MORE AT ILOVEFINLAND.NET");
    if ($("static-edit-cta-color")) $("static-edit-cta-color").value = (ig.cta_color || "white").toLowerCase() === "blue" ? "blue" : "white";
    if ($("static-edit-fontsize")) $("static-edit-fontsize").value = curFs;
    if ($("static-line2-size-val")) $("static-line2-size-val").textContent = `${curFs}px`;
    if ($("static-edit-caption")) $("static-edit-caption").value = capText;
    if ($("static-edit-hashtags")) $("static-edit-hashtags").value = tagStr;

    const pillWrap = $("static-hashtags-pills");
    if (pillWrap) {
      pillWrap.innerHTML = (ig.hashtags || []).map((h) => `<span class="hashtag">${h}</span>`).join("");
      const cnt = $("static-hashtag-count");
      if (cnt) cnt.textContent = (ig.hashtags || []).length;
    }

    drawStaticPostCanvases(ig);
  }

  function fitHeadlineFontSize(ctx, text, baseSize, maxWidth) {
    if (!text || !text.trim()) return baseSize;
    let size = baseSize;
    ctx.font = `900 ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    while (size > 20 && ctx.measureText(text.trim()).width > maxWidth) {
      size -= 1;
      ctx.font = `900 ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    }
    return size;
  }

  function drawStaticPostCanvases(ig) {
    const canvas45 = $("static-post-canvas");
    const canvas34 = $("static-crop-canvas");
    if (!canvas45 || !canvas34) return;

    const ctx45 = canvas45.getContext("2d");
    const w = 1080;
    const h = 1350;

    // Safety Zone Margins (safe for both full 4:5 and 3:4 profile grid crop)
    const safeLeft = w * 0.085; // 92px
    const maxTextWidth = 860;   // Leaves >= 60px breathing room inside 3:4 crop

    // 1. Load background photo
    const photoImg = new Image();
    photoImg.crossOrigin = "anonymous";
    photoImg.src = ig.photo_url || "/assets/sample-clips/tesla-clean-bg.jpg";
    photoImg.onload = () => {
      // Draw photo cover
      ctx45.clearRect(0, 0, w, h);
      const imgAspect = photoImg.width / photoImg.height;
      const canvasAspect = w / h;
      let drawW, drawH, drawX, drawY;
      if (imgAspect > canvasAspect) {
        drawH = h;
        drawW = h * imgAspect;
        drawX = (w - drawW) / 2;
        drawY = 0;
      } else {
        drawW = w;
        drawH = w / imgAspect;
        drawX = 0;
        drawY = (h - drawH) / 2;
      }
      ctx45.drawImage(photoImg, drawX, drawY, drawW, drawH);

      // 2. Draw dark navy bottom gradient scrim (covers text area richly)
      const grad = ctx45.createLinearGradient(0, h * 0.44, 0, h);
      grad.addColorStop(0, "rgba(11, 26, 44, 0)");
      grad.addColorStop(0.30, "rgba(11, 26, 44, 0.60)");
      grad.addColorStop(0.65, "rgba(11, 26, 44, 0.90)");
      grad.addColorStop(1.0, "rgba(11, 26, 44, 0.98)");
      ctx45.fillStyle = grad;
      ctx45.fillRect(0, 0, w, h);

      // 3. Draw Heart Logo (Original transparent asset with opaque white river & elements)
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = ig.logo_url || "/assets/ilf-heart-exact.png";
      logoImg.onload = () => {
        const logoSize = 130;
        const logoX = safeLeft;
        const logoY = h * 0.075;

        ctx45.save();
        ctx45.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx45.restore();

        // 4. Headline Lines (supports 2 to 3 lines) + Optional Website CTA Line
        const line1 = (ig.headline_line1 || "").trim();
        const line2 = (ig.headline_line2 || "").trim();
        const line3 = (ig.headline_line3 || "").trim();
        const has3Lines = Boolean(line3);
        const ctaText = (ig.cta_text != null ? ig.cta_text : (ig.website_cta || "")).trim();
        const hasCta = Boolean(ctaText);
        const ctaColorChoice = (ig.cta_color || "white").toLowerCase();
        const ctaColor = ctaColorChoice === "blue" ? "#00A3FF" : "#FFFFFF";
        const ctaShadow = ctaColorChoice === "blue" ? "rgba(0, 163, 255, 0.45)" : "rgba(0, 0, 0, 0.85)";

        // Proportional font scaling factor from user slider (baseline: 32px)
        const scaleVal = parseInt(ig.line2_font_size || ig.line1_font_size || 32, 10);
        const fontScale = Math.max(0.6, Math.min(1.6, scaleVal / 32.0));

        // 5. Draw Category Badge (#003882) positioned above headlines - SCALES ALL PROPORTIONALLY
        const badgeText = (ig.badge_text || "NEWS").toUpperCase();
        const badgeFontSize = Math.round(28 * fontScale);
        ctx45.font = `bold ${badgeFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        const badgeMetric = ctx45.measureText(badgeText);
        const bPadH = Math.round(24 * fontScale);
        const bPadV = Math.round(10 * fontScale);
        const bW = badgeMetric.width + bPadH * 2;
        const bH = badgeFontSize + bPadV * 2;
        const badgeX = safeLeft;

        // Base headline font sizes scaled proportionally for all lines
        const baseLineSize = Math.round(48 * fontScale);
        const baseEmphasisSize = Math.round(52 * fontScale);
        const lineGap = Math.round(12 * fontScale);

        // Keep all headlines and badge comfortably at the exact original vertical baseline
        const estimatedHeadlinesHeight = (has3Lines ? 3 : 2) * (baseLineSize + lineGap) + bH + Math.round(40 * fontScale);
        const badgeY = Math.min(h * 0.94 - estimatedHeadlinesHeight, has3Lines ? h * 0.63 : h * 0.69);

        ctx45.fillStyle = ig.badge_color || "#003882";
        ctx45.beginPath();
        ctx45.roundRect(badgeX, badgeY, bW, bH, Math.max(6, Math.round(10 * fontScale)));
        ctx45.fill();

        ctx45.fillStyle = "#ffffff";
        ctx45.fillText(badgeText, badgeX + bPadH, badgeY + bH - bPadV - Math.round(4 * fontScale));

        // 6. Draw Headline Lines within Safety Zone - UNIFIED FONT SIZE ACROSS LINES 1, 2, 3
        let currentY = badgeY + bH + Math.round(44 * fontScale);

        ctx45.save();
        ctx45.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx45.shadowBlur = Math.round(8 * fontScale);
        ctx45.shadowOffsetY = 2;

        // Unified font size: All lines 1, 2, and 3 have the EXACT same font size!
        const fit1 = fitHeadlineFontSize(ctx45, line1, baseLineSize, maxTextWidth);
        const fit2 = fitHeadlineFontSize(ctx45, line2, baseLineSize, maxTextWidth);
        const fit3 = has3Lines ? fitHeadlineFontSize(ctx45, line3, baseLineSize, maxTextWidth) : fit2;
        const unifiedSize = has3Lines ? Math.min(fit1, fit2, fit3) : Math.min(fit1, fit2);

        if (has3Lines) {
          // --- 3-LINE LAYOUT (All 3 lines share the exact same font size!) ---
          // Line 1: White Bold
          ctx45.font = `900 ${unifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = "#ffffff";
          ctx45.fillText(line1, badgeX, currentY);

          // Line 2: White Bold
          currentY += unifiedSize + lineGap;
          ctx45.font = `900 ${unifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = "#ffffff";
          ctx45.fillText(line2, badgeX, currentY);

          // Line 3: Electric Blue Emphasis (Exact same size as 1 & 2!)
          currentY += unifiedSize + lineGap;
          ctx45.font = `900 ${unifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = "#00A3FF";
          ctx45.shadowColor = "rgba(0, 56, 130, 0.85)";
          ctx45.shadowBlur = Math.round(10 * fontScale);
          ctx45.fillText(line3, badgeX, currentY);
        } else {
          // --- 2-LINE LAYOUT (Both lines share the exact same font size!) ---
          // Line 1: White Bold
          ctx45.font = `900 ${unifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = "#ffffff";
          ctx45.fillText(line1, badgeX, currentY);

          // Line 2: Electric Blue Emphasis
          currentY += unifiedSize + lineGap + 4;
          ctx45.font = `900 ${unifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = "#00A3FF";
          ctx45.shadowColor = "rgba(0, 56, 130, 0.85)";
          ctx45.shadowBlur = Math.round(10 * fontScale);
          ctx45.fillText(line2, badgeX, currentY);
        }

        // 7. Optional Website CTA / Footer Line (White by Default, or Electric Blue)
        if (hasCta) {
          currentY += unifiedSize + Math.round(20 * fontScale);
          const ctaSize = Math.max(16, Math.round(unifiedSize * 0.50));
          ctx45.font = `800 ${ctaSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = ctaColor;
          ctx45.shadowColor = ctaShadow;
          ctx45.shadowBlur = Math.round(8 * fontScale);
          ctx45.fillText(ctaText.toUpperCase(), badgeX, currentY);
        }
        ctx45.restore();

        // 7. Update 3:4 Profile-Grid Crop Canvas (1012.5 × 1350)
        const ctx34 = canvas34.getContext("2d");
        const cropW = 1012.5;
        const cropX = (w - cropW) / 2;
        ctx34.clearRect(0, 0, 1012, 1350);
        ctx34.drawImage(canvas45, cropX, 0, cropW, h, 0, 0, 1012, 1350);

        // 8. Update Facebook Landscape Post Canvas (1200 × 630 • 1.91:1)
        const canvasFb = $("static-fb-canvas");
        if (canvasFb) {
          const ctxFb = canvasFb.getContext("2d");
          const fbW = 1200;
          const fbH = 630;
          ctxFb.clearRect(0, 0, fbW, fbH);

          // Draw cover photo
          const fbAspect = fbW / fbH;
          let fbDrawW, fbDrawH, fbDrawX, fbDrawY;
          if (imgAspect > fbAspect) {
            fbDrawH = fbH;
            fbDrawW = fbH * imgAspect;
            fbDrawX = (fbW - fbDrawW) / 2;
            fbDrawY = 0;
          } else {
            fbDrawW = fbW;
            fbDrawH = fbW / imgAspect;
            fbDrawX = 0;
            fbDrawY = (fbH - fbDrawH) / 2;
          }
          ctxFb.drawImage(photoImg, fbDrawX, fbDrawY, fbDrawW, fbDrawH);

          // Navy gradient scrim (protects text contrast)
          const fbGrad = ctxFb.createLinearGradient(0, fbH * 0.35, 0, fbH);
          fbGrad.addColorStop(0, "rgba(11, 26, 44, 0)");
          fbGrad.addColorStop(0.35, "rgba(11, 26, 44, 0.65)");
          fbGrad.addColorStop(0.70, "rgba(11, 26, 44, 0.90)");
          fbGrad.addColorStop(1.0, "rgba(11, 26, 44, 0.98)");
          ctxFb.fillStyle = fbGrad;
          ctxFb.fillRect(0, 0, fbW, fbH);

          // Heart logo top left
          const fbLogoSize = 80;
          ctxFb.drawImage(logoImg, 60, 36, fbLogoSize, fbLogoSize);

          // Category Badge scaled
          const fbBadgeFontSize = Math.round(22 * fontScale);
          const fbBH = Math.round(36 * fontScale);
          ctxFb.font = `bold ${fbBadgeFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          const fbBadgeMetric = ctxFb.measureText(badgeText);
          const fbBW = fbBadgeMetric.width + Math.round(36 * fontScale);
          const fbBadgeY = Math.min(fbH * 0.72 - (fbBH + Math.round(80 * fontScale)), fbH * 0.52);

          ctxFb.fillStyle = ig.badge_color || "#003882";
          ctxFb.beginPath();
          ctxFb.roundRect(60, fbBadgeY, fbBW, fbBH, Math.max(4, Math.round(8 * fontScale)));
          ctxFb.fill();
          ctxFb.fillStyle = "#ffffff";
          ctxFb.fillText(badgeText, 60 + Math.round(18 * fontScale), fbBadgeY + fbBH - Math.round(11 * fontScale));

          // Headlines scaled proportionally
          ctxFb.save();
          ctxFb.shadowColor = "rgba(0,0,0,0.85)";
          ctxFb.shadowBlur = 8;
          ctxFb.shadowOffsetY = 2;

          let fbY = fbBadgeY + fbBH + Math.round(38 * fontScale);
          const fbLine1 = line1;
          const fbLine2 = has3Lines ? `${line2} ${line3}` : line2;

          const fbFit1 = fitHeadlineFontSize(ctxFb, fbLine1, Math.round(38 * fontScale), 1080);
          const fbFit2 = fitHeadlineFontSize(ctxFb, fbLine2, Math.round(38 * fontScale), 1080);
          const fbUnifiedSize = Math.min(fbFit1, fbFit2);

          ctxFb.font = `900 ${fbUnifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctxFb.fillStyle = "#ffffff";
          ctxFb.fillText(fbLine1, 60, fbY);

          fbY += fbUnifiedSize + Math.round(10 * fontScale);
          ctxFb.font = `900 ${fbUnifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctxFb.fillStyle = "#00A3FF";
          ctxFb.shadowColor = "rgba(0, 56, 130, 0.85)";
          ctxFb.fillText(fbLine2, 60, fbY);

          // Website CTA Line on Facebook
          if (hasCta) {
            fbY += fbUnifiedSize + Math.round(14 * fontScale);
            const fbCtaSize = Math.round(18 * fontScale);
            ctxFb.font = `800 ${fbCtaSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            ctxFb.fillStyle = ctaColor;
            ctxFb.shadowColor = ctaShadow;
            ctxFb.shadowBlur = 6;
            ctxFb.fillText(ctaText.toUpperCase(), 60, fbY);
          }
          ctxFb.restore();
        }
      };
    };
  }

  /* ---------- REEL WORKSPACE RENDERER (On-Demand or Active Player) ---------- */
  function renderReelWorkspace(v) {
    const noticeEl = $("reel-on-demand-notice");
    const workspaceEl = $("reel-player-workspace");
    const reelData = v.reel;

    const hasReel = reelData && reelData.scenes && reelData.scenes.length > 0;
    if (!hasReel) {
      noticeEl?.classList.remove("hidden");
      workspaceEl?.classList.add("hidden");
      return;
    }

    noticeEl?.classList.add("hidden");
    workspaceEl?.classList.remove("hidden");

    player.load(reelData);
    updateLayoutReadout();

    const capEl = $("reel-caption");
    if (capEl) capEl.textContent = reelData.caption || "";
    const musEl = $("reel-music");
    if (musEl) musEl.textContent = `Music: ${reelData.audio?.music_credit || "Nordic Pulse Bed"}`;
    const voEl = $("reel-vo-rule");
    if (voEl) voEl.textContent = `Voice-over: ${reelData.audio?.voiceover_mode || "Human voice-over needed"}`;

    const higgsEl = $("reel-higgsfield");
    if (higgsEl && reelData.audio?.main_music_track) {
      const mt = reelData.audio.main_music_track;
      const at = reelData.audio.alternative_music_track;
      higgsEl.innerHTML = `
        <div style="margin-top:6px;font-size:0.78rem;">
          <div><strong>Main Track:</strong> ${mt.title} (${mt.fit_reason}) • <em>${mt.channel_suitability}</em></div>
          <div style="margin-top:4px;"><strong>Alternative Track:</strong> ${at.title} (${at.fit_reason}) • <span class="badge badge-check" style="font-size:0.68rem;">${at.license}</span></div>
        </div>
      `;
    }

    const hashWrap = $("reel-hashtags");
    const hashes = (reelData.hashtags || []).slice(0, 5);
    const hashCnt = $("hashtag-count");
    if (hashCnt) hashCnt.textContent = hashes.length;
    if (hashWrap) hashWrap.innerHTML = hashes.map((h) => `<span class="hashtag">${h}</span>`).join("");

    populateDirectEditorFields(currentReelSceneIndex || 0);
    renderReelScenesOverview();
  }

  /* ---------- UPLOAD MEDIA & CLIPS IN ASSIGNMENTS ---------- */
  function renderUploadedClips() {
    const list = $("clips-list");
    const dropzone = $("clip-dropzone");
    if (!list || !dropzone) return;
    list.innerHTML = "";

    const dropText = dropzone.querySelector(".dropzone-text");
    if (uploadedClips.length > 0) {
      dropzone.classList.add("has-clips");
      if (dropText) {
        dropText.innerHTML = "<strong>+ Add another photo or video clip</strong> <span class='hint-inline'>(tap or drag &amp; drop)</span>";
      }
    } else {
      dropzone.classList.remove("has-clips");
      if (dropText) {
        dropText.innerHTML = "<strong>Choose Photos or Video Clips</strong> from phone photo library or computer <span class='hint-inline'>(drag &amp; drop or tap to browse JPG, PNG, MP4, MOV)</span>";
      }
      list.innerHTML = `<p class="hint-text" style="text-align:center;padding:12px 0;">No media added yet. Choose photos for your article/post or video clips for your reel above, or tap "Load Sample Clips".</p>`;
      return;
    }

    uploadedClips.forEach((clip, index) => {
      const card = document.createElement("div");
      card.className = "clip-card-enlarged";
      const isImg = clip.media_type === "image" || /\.(jpe?g|png|webp|heic|gif)$/i.test(clip.filename);
      card.innerHTML = `
        <div class="clip-thumb-wrap">
          <img src="${clip.poster || clip.url || '/assets/sample-clips/clip-1-tram-thumb.jpg'}" alt="${escapeHtml(clip.filename)}" style="width:100%;height:100%;object-fit:cover;" />
          <span class="clip-dur-badge" style="${isImg ? 'background:#059669;' : ''}">${isImg ? '📷 Photo' : (clip.duration ? clip.duration + 's' : '4.5s')}</span>
          ${isImg && index === 0 ? '<span class="clip-hook-badge" style="background:#0284c7;">Featured Photo</span>' : (!isImg && index === 0 ? '<span class="clip-hook-badge">Opening Hook</span>' : '')}
        </div>
        <div class="clip-info-col">
          <div class="clip-title-row">
            <span class="clip-title-text">${isImg ? 'Photo' : 'Clip'} ${index + 1}: ${escapeHtml(clip.filename)}</span>
            <span class="pill ${isImg ? 'pill-scheduled' : 'pill-approved'}" style="font-size:0.68rem;padding:2px 6px;">${isImg ? 'Article Featured Photo' : 'Ready for Reel'}</span>
          </div>
          <div class="clip-fields-row">
            <div>
              <label class="label-sm">${isImg ? 'Photo Credit / Photographer' : 'Source / Rights'}</label>
              <input type="text" class="clip-source-input" value="${escapeHtml(clip.source || (isImg ? 'Original Photograph' : 'Original Footage'))}" />
            </div>
            <div>
              <label class="label-sm">Attribution Licence</label>
              <input type="text" class="clip-credit-input" value="${escapeHtml(clip.credit || 'Direct Creator Licence (Verified)')}" />
            </div>
          </div>
          ${isImg ? `
          <div class="clip-fields-row">
            <div style="grid-column:1/-1;">
              <label class="label-sm">Alt Text / Subject Description</label>
              <input type="text" class="clip-alt-input" placeholder="e.g., Authentic photograph describing the story subject" value="${escapeHtml(clip.alt_text || '')}" />
            </div>
          </div>
          ` : `
          <div class="clip-fields-row">
            <div>
              <label class="label-sm">Start Timestamp (s)</label>
              <input type="number" class="clip-start-input" step="0.5" value="${clip.timestamp_start || 0}" />
            </div>
            <div>
              <label class="label-sm">End Timestamp (s)</label>
              <input type="number" class="clip-end-input" step="0.5" value="${clip.timestamp_end || 4.5}" />
            </div>
          </div>
          `}
        </div>
        <div class="clip-actions-col">
          <button type="button" class="btn btn-ghost btn-sm btn-move-up" ${index === 0 ? "disabled" : ""} title="Move Up">
            ${getIcon("moveUp", 14)} <span>Up</span>
          </button>
          <button type="button" class="btn btn-ghost btn-sm btn-move-down" ${index === uploadedClips.length - 1 ? "disabled" : ""} title="Move Down">
            ${getIcon("moveDown", 14)} <span>Down</span>
          </button>
          <button type="button" class="btn btn-ghost btn-sm btn-remove" style="color:var(--red);" title="Remove">
            ${getIcon("trash", 14)} <span>Delete</span>
          </button>
        </div>
      `;

      card.querySelector(".btn-move-up")?.addEventListener("click", () => {
        if (index > 0) {
          const temp = uploadedClips[index - 1];
          uploadedClips[index - 1] = uploadedClips[index];
          uploadedClips[index] = temp;
          renderUploadedClips();
        }
      });

      card.querySelector(".btn-move-down")?.addEventListener("click", () => {
        if (index < uploadedClips.length - 1) {
          const temp = uploadedClips[index + 1];
          uploadedClips[index + 1] = uploadedClips[index];
          uploadedClips[index] = temp;
          renderUploadedClips();
        }
      });

      card.querySelector(".btn-remove")?.addEventListener("click", () => {
        uploadedClips.splice(index, 1);
        renderUploadedClips();
      });

      card.querySelector(".clip-source-input")?.addEventListener("input", (e) => {
        clip.source = e.target.value;
      });
      card.querySelector(".clip-credit-input")?.addEventListener("input", (e) => {
        clip.credit = e.target.value;
      });
      card.querySelector(".clip-alt-input")?.addEventListener("input", (e) => {
        clip.alt_text = e.target.value;
      });
      card.querySelector(".clip-start-input")?.addEventListener("input", (e) => {
        clip.timestamp_start = parseFloat(e.target.value) || 0;
      });
      card.querySelector(".clip-end-input")?.addEventListener("input", (e) => {
        clip.timestamp_end = parseFloat(e.target.value) || 4.5;
      });

      list.appendChild(card);
    });
  }

  function setupClipsUpload() {
    const dropzone = $("clip-dropzone");
    const fileInput = $("clip-file-input");
    const demoBtn = $("btn-load-demo-clips");
    const progressWrap = $("upload-progress-wrap");
    const progressBar = $("upload-progress-bar");
    const progressText = $("upload-progress-text");

    if (!dropzone || !fileInput) return;

    demoBtn?.addEventListener("click", async () => {
      progressWrap.classList.remove("hidden");
      progressBar.style.width = "40%";
      progressText.textContent = "Loading demo clips…";
      const res = await api("/api/upload/clips", { method: "POST", body: JSON.stringify({ action: "load_demo" }) });
      progressBar.style.width = "100%";
      progressText.textContent = "Loaded 2 demo clips!";
      setTimeout(() => progressWrap.classList.add("hidden"), 800);
      uploadedClips = res.clips;
      renderUploadedClips();
    });

    async function processFiles(files) {
      if (!files || !files.length) return;
      progressWrap.classList.remove("hidden");
      progressBar.style.width = "10%";
      progressText.textContent = `Uploading ${files.length} media file(s)…`;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImg = file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|gif)$/i.test(file.name);
        progressText.textContent = `Uploading ${file.name} (${i + 1}/${files.length})…`;
        progressBar.style.width = `${Math.round(((i + 0.5) / files.length) * 85)}%`;

        try {
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const res = await api("/api/upload/media-clip", {
            method: "POST",
            body: JSON.stringify({
              data_base64: base64Data,
              filename: file.name,
              media_type: isImg ? "image" : "video",
              credit: isImg ? "Photo: ILF" : `Footage: ILF (${file.name})`,
            }),
          });

          uploadedClips.push({
            id: uploadedClips.length + 1,
            filename: file.name,
            url: res.url,
            poster: isImg ? res.url : (uploadedClips.length % 2 === 0 ? "/assets/sample-clips/clip-1-tram-thumb.jpg" : "/assets/sample-clips/clip-2-winter-thumb.png"),
            duration: isImg ? 0 : 4.5,
            media_type: isImg ? "image" : "video",
            source: "ILF",
            permission: "Verified Rights Granted",
            credit: isImg ? "Photo: ILF" : `Footage: ILF (${file.name})`,
            alt_text: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
            timestamp_start: 0,
            timestamp_end: isImg ? 0 : 4.5,
            opening_shot: uploadedClips.length === 0,
          });
        } catch (err) {
          console.error("Upload error:", err);
          alert(`Failed to upload "${file.name}": ${err.message}`);
        }
      }

      progressBar.style.width = "100%";
      progressText.textContent = "Upload complete!";
      setTimeout(() => progressWrap.classList.add("hidden"), 1000);
      fileInput.value = "";
      renderUploadedClips();
    }

    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      processFiles(files);
    });

    // Drag and Drop support
    dropzone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("has-clips");
    });
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("has-clips");
    });
    dropzone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploadedClips.length === 0) dropzone.classList.remove("has-clips");
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploadedClips.length === 0) dropzone.classList.remove("has-clips");
      if (e.dataTransfer && e.dataTransfer.files) {
        processFiles(Array.from(e.dataTransfer.files));
      }
    });

    // Tap/Click dropzone to trigger input
    dropzone.addEventListener("click", (e) => {
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });

    renderUploadedClips();
  }

  /* ---------- PLAN MY WEEK ---------- */
  let weeklyPriorities = null;
  async function loadWeeklyPlan() {
    try {
      const data = await api("/api/calendar/plan");
      weeklyPlanIdeas = data.ideas || [];
      const priData = await api("/api/plan/priorities");
      weeklyPriorities = priData.priorities || [];
      renderWeeklyPlan();
    } catch (e) {}
  }

  function renderWeeklyPlan() {
    const grid = $("plan-ideas-grid");
    if (!grid) return;

    let priHtml = "";
    if (weeklyPriorities && weeklyPriorities.length > 0) {
      priHtml = `
        <div style="grid-column:1/-1;background:var(--icy-bg);border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="color:var(--navy);">🎯 Top 3 Priorities for Limited Resources (Home Production Ready)</strong>
            <span class="badge badge-check">Zero Travel Shoot Needed</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:8px;">
            ${weeklyPriorities
              .map(
                (p) => `
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span class="badge badge-origin" style="font-size:0.7rem;">Priority #${p.priority_num} • ${p.section}</span>
                  <span class="pill pill-scheduled" style="font-size:0.68rem;">${p.rough_effort}</span>
                </div>
                <strong style="font-size:0.86rem;color:var(--navy);display:block;margin-bottom:4px;">${p.topic}</strong>
                <div class="hint-text" style="font-size:0.75rem;margin-bottom:4px;"><strong>Format:</strong> ${p.recommended_format}</div>
                <div class="hint-text" style="font-size:0.75rem;margin-bottom:4px;"><strong>Assets:</strong> ${p.assets_needed}</div>
                <div style="font-size:0.74rem;color:var(--brand-blue);margin-top:4px;"><strong>Reel Recommendation:</strong> ${p.reel_worth_score}</div>
              </div>`
              )
              .join("")}
          </div>
        </div>
      `;
    }

    grid.innerHTML = priHtml + weeklyPlanIdeas
      .map(
        (idea) => `
        <div class="plan-card ${idea.status}" data-id="${idea.id}">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
              <span class="badge badge-origin">${idea.category}</span>
              <span class="pill ${idea.status === "accepted" ? "pill-approved" : idea.status === "dismissed" ? "pill-missed" : ""}">${idea.status.toUpperCase()}</span>
            </div>
            <h4 style="margin:8px 0 4px;font-size:0.96rem;color:var(--navy);">${idea.title}</h4>
            <div class="hint-text">${idea.angle}</div>
            <div class="plan-reason-box" style="margin-top:8px;">
              <strong>Why This Week:</strong> ${idea.fit_reason}
            </div>
            <div style="margin-top:6px;font-size:0.8rem;">
              Format: <strong>${idea.recommended_format}</strong> • Slot: <strong>${idea.target_date_hki.replace("T", " ")}</strong>
            </div>
          </div>
          <div class="plan-actions">
            ${
              idea.status === "suggested"
                ? `
              <button class="btn btn-primary btn-sm btn-accept-plan">
                ${getIcon("check", 14)} <span>Accept &amp; Generate</span>
              </button>
              <button class="btn btn-ghost btn-sm btn-dismiss-plan">
                ${getIcon("close", 14)} <span>Dismiss</span>
              </button>`
                : `<span class="hint-text">${idea.status === "accepted" ? "Added to production queue" : "Dismissed from plan"}</span>`
            }
          </div>
        </div>`
      )
      .join("");

    grid.querySelectorAll(".btn-accept-plan").forEach((b) => {
      b.addEventListener("click", async (e) => {
        const id = parseInt(e.target.closest(".plan-card").dataset.id, 10);
        const res = await api("/api/calendar/plan/action", {
          method: "POST",
          body: JSON.stringify({ action: "accept", id }),
        });
        currentPackageId = res.bundle.package.id;
        await loadAll();
        switchView("review");
      });
    });

    grid.querySelectorAll(".btn-dismiss-plan").forEach((b) => {
      b.addEventListener("click", async (e) => {
        const id = parseInt(e.target.closest(".plan-card").dataset.id, 10);
        await api("/api/calendar/plan/action", {
          method: "POST",
          body: JSON.stringify({ action: "dismiss", id }),
        });
        loadWeeklyPlan();
        loadIdeasPool();
      });
    });
  }

  /* ---------- ARTICLE SUGGESTIONS POOL ---------- */
  let activeIdeaScope = "all";
  let activeIdeaSection = "all";
  let activeIdeaSearch = "";
  let cachedSuggestions = [];

  function formatIdeaDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr.replace(" ", "T"));
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("en-US", { month: "short" });
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${day} ${month} ${year}, ${hours}:${mins}`;
    } catch (e) {
      return dateStr;
    }
  }

  async function loadIdeasPool() {
    try {
      const data = await api("/api/calendar/plan");
      const allIdeas = data.ideas || [];
      const suggestions = allIdeas.filter((i) => i.status === "suggested");
      cachedSuggestions = suggestions;

      // Update counters for Scope
      const countTotal = suggestions.length;
      const countFinland = suggestions.filter((i) => i.priority_rank !== 3 && (i.region || "").toLowerCase() !== "international" && (i.category || "").toLowerCase() !== "international").length;
      const countIntl = suggestions.filter((i) => i.priority_rank === 3 || (i.region || "").toLowerCase() === "international" || (i.category || "").toLowerCase() === "international").length;

      // Update counters for Website Sections (ilovefinland.net taxonomy)
      const countNews = suggestions.filter((i) => (i.section || "").toLowerCase() === "news").length;
      const countGuide = suggestions.filter((i) => (i.section || "").toLowerCase() === "finland guide").length;
      const countThings = suggestions.filter((i) => (i.section || "").toLowerCase() === "things to do").length;
      const countTravel = suggestions.filter((i) => (i.section || "").toLowerCase() === "travel").length;
      const countFood = suggestions.filter((i) => (i.section || "").toLowerCase() === "food & restaurants").length;
      const countEvents = suggestions.filter((i) => (i.section || "").toLowerCase() === "events").length;

      const badgeCount = $("badge-ideas-count");
      if (badgeCount) badgeCount.textContent = countTotal;
      const inlineCount = $("btn-ideas-count-inline");
      if (inlineCount) inlineCount.textContent = countTotal;
      const tabCount = $("suggestions-tab-count");
      if (tabCount) tabCount.textContent = countTotal;

      // Scope counts
      if ($("ideas-filter-count-all")) $("ideas-filter-count-all").textContent = countTotal;
      if ($("ideas-filter-count-finland")) $("ideas-filter-count-finland").textContent = countFinland;
      if ($("ideas-filter-count-intl")) $("ideas-filter-count-intl").textContent = countIntl;

      // Section counts
      if ($("ideas-sec-count-all")) $("ideas-sec-count-all").textContent = countTotal;
      if ($("ideas-sec-count-news")) $("ideas-sec-count-news").textContent = countNews;
      if ($("ideas-sec-count-guide")) $("ideas-sec-count-guide").textContent = countGuide;
      if ($("ideas-sec-count-things")) $("ideas-sec-count-things").textContent = countThings;
      if ($("ideas-sec-count-travel")) $("ideas-sec-count-travel").textContent = countTravel;
      if ($("ideas-sec-count-food")) $("ideas-sec-count-food").textContent = countFood;
      if ($("ideas-sec-count-events")) $("ideas-sec-count-events").textContent = countEvents;

      renderIdeasCards(suggestions);
    } catch (err) {
      console.warn("Could not load ideas pool:", err);
    }
  }

  function renderIdeasCards(suggestions) {
    const grid = $("ideas-cards-grid");
    if (!grid) return;

    let filtered = suggestions || cachedSuggestions;

    // Filter by Scope (Finland First vs International vs All)
    if (activeIdeaScope !== "all") {
      filtered = filtered.filter((i) => {
        const isIntl = i.priority_rank === 3 || (i.region || "").toLowerCase() === "international" || (i.category || "").toLowerCase() === "international";
        if (activeIdeaScope === "finland") return !isIntl;
        if (activeIdeaScope === "international") return isIntl;
        return true;
      });
    }

    // Filter by Website Section (News, Finland Guide, Things to Do, Travel, Food & Restaurants, Events)
    if (activeIdeaSection !== "all") {
      filtered = filtered.filter((i) => (i.section || "").toLowerCase() === activeIdeaSection.toLowerCase());
    }

    // Filter by Search Query
    if (activeIdeaSearch && activeIdeaSearch.trim()) {
      const q = activeIdeaSearch.trim().toLowerCase();
      filtered = filtered.filter((i) => {
        const t = (i.title || "").toLowerCase();
        const a = (i.angle || "").toLowerCase();
        const s = (i.section || "").toLowerCase();
        const c = (i.category || "").toLowerCase();
        const f = (i.fit_reason || "").toLowerCase();
        const u = (i.source_url || "").toLowerCase();
        return t.includes(q) || a.includes(q) || s.includes(q) || c.includes(q) || f.includes(q) || u.includes(q);
      });
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:48px 16px;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;">
          <div style="font-size:2rem;margin-bottom:8px;">🔍</div>
          <h3 style="margin:0 0 6px;color:var(--navy);">No matching article suggestions found</h3>
          <p style="margin:0 0 16px;color:var(--text-muted);font-size:0.875rem;">
            Try switching your section filter or resetting scope to view all available ideas.
          </p>
          <button type="button" class="btn btn-outline btn-sm btn-clear-filters" style="margin-right:8px;">
            Reset Filters
          </button>
          <button type="button" class="btn btn-primary btn-sm btn-trigger-scan">
            ⚡ Scan News Feeds Now
          </button>
        </div>`;
      grid.querySelector(".btn-clear-filters")?.addEventListener("click", () => {
        activeIdeaScope = "all";
        activeIdeaSection = "all";
        activeIdeaSearch = "";
        const searchInput = $("ideas-search-input");
        if (searchInput) searchInput.value = "";
        document.querySelectorAll(".filter-idea-scope").forEach((b) => b.classList.toggle("active", b.dataset.scope === "all"));
        document.querySelectorAll(".filter-idea-sec").forEach((b) => b.classList.toggle("active", b.dataset.sec === "all"));
        renderIdeasCards(cachedSuggestions);
      });
      grid.querySelector(".btn-trigger-scan")?.addEventListener("click", triggerScanNow);
      return;
    }

    grid.innerHTML = filtered.map((idea) => {
      const dateDisplay = formatIdeaDate(idea.created_at || idea.target_date_hki);
      const isIntl = idea.priority_rank === 3 || (idea.region || "").toLowerCase() === "international" || (idea.category || "").toLowerCase() === "international";
      const isBreaking = idea.priority_rank === 1;

      let priorityPill = `<span class="badge" style="font-size:0.72rem;background:#eff6ff;color:#1e40af;margin-left:auto;font-weight:700;padding:2px 8px;border-radius:4px;">🇫🇮 Finland (Top Priority)</span>`;
      if (isBreaking) {
        priorityPill = `<span class="badge" style="font-size:0.72rem;background:#fee2e2;color:#991b1b;margin-left:auto;font-weight:700;padding:2px 8px;border-radius:4px;">⭐ Finland Breaking</span>`;
      } else if (isIntl) {
        priorityPill = `<span class="badge" style="font-size:0.72rem;background:#f3e8ff;color:#6b21a8;margin-left:auto;font-weight:600;padding:2px 8px;border-radius:4px;">🌐 International News</span>`;
      }

      // Clean editorial reason
      let cleanReason = idea.fit_reason || "";
      if (isIntl) {
        cleanReason = cleanReason.replace(/⭐\s*Finland\s*Breaking\s*•?\s*/gi, "").replace(/🇫🇮\s*Finland\s*Story\s*•?\s*/gi, "");
        if (!cleanReason.includes("International")) {
          cleanReason = `🌐 Major International Development. ${cleanReason}`.trim();
        }
      }

      return `
        <div class="card idea-card" data-id="${idea.id}" style="display:flex;flex-direction:column;justify-content:space-between;padding:16px;border:1px solid ${isIntl ? '#cbd5e1' : '#bfdbfe'};border-radius:10px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.05);transition:box-shadow 0.15s ease;">
          <div>
            <!-- Official ilovefinland.net Section, Category & Priority Badges -->
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
              <span class="badge" style="font-size:0.72rem;background:#003882;color:#fff;font-weight:600;padding:2px 8px;border-radius:4px;">
                📂 ${escapeHtml(idea.section || 'News')}
              </span>
              <span class="badge" style="font-size:0.72rem;background:#e0f2fe;color:#0369a1;font-weight:600;padding:2px 8px;border-radius:4px;">
                🏷️ ${escapeHtml(idea.category || 'Finland')}
              </span>
              ${priorityPill}
            </div>

            <!-- Discovery Date -->
            <div style="font-size:0.74rem;color:#64748b;display:flex;align-items:center;gap:4px;margin-bottom:8px;">
              <span>🕒 Discovered: <strong>${escapeHtml(dateDisplay || 'Recent')}</strong></span>
            </div>

            <!-- Headline -->
            <h3 style="font-size:1.05rem;line-height:1.4;margin:0 0 8px;color:var(--navy);font-weight:700;">
              ${escapeHtml(idea.title)}
            </h3>

            <!-- Angle / Summary -->
            <p style="font-size:0.825rem;line-height:1.45;color:#334155;margin:0 0 10px;">
              ${escapeHtml(idea.angle || '')}
            </p>

            ${cleanReason ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;"><strong>Editorial Context:</strong> ${escapeHtml(cleanReason)}</div>` : ''}

            ${idea.source_url ? `
              <div style="font-size:0.75rem;margin-bottom:12px;">
                <a href="${escapeHtml(idea.source_url)}" target="_blank" rel="noopener" style="color:var(--navy);text-decoration:underline;display:inline-flex;align-items:center;gap:4px;">
                  🔗 Source: ${escapeHtml(idea.source_url.length > 40 ? idea.source_url.slice(0, 37) + '...' : idea.source_url)}
                </a>
              </div>` : ''}
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid #f1f5f9;gap:6px;">
            <button type="button" class="btn btn-primary btn-sm btn-approve-idea" style="font-size:0.78rem;padding:6px 10px;flex:1;">
              ✓ Work on this
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-dismiss-idea" style="font-size:0.78rem;padding:6px 8px;color:#64748b;" title="Dismiss from suggestions">
              ✕ No need
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-delete-idea" style="font-size:0.78rem;padding:6px 8px;color:#ef4444;" title="Delete permanently">
              🗑
            </button>
          </div>
        </div>
      `;
    }).join("");

    // Wire actions
    grid.querySelectorAll(".btn-approve-idea").forEach((b) => {
      b.addEventListener("click", async (e) => {
        const card = e.target.closest(".idea-card");
        const id = parseInt(card.dataset.id, 10);
        b.disabled = true;
        b.innerHTML = "⏳ AI Working (Drafting)...";
        try {
          const res = await api("/api/calendar/plan/action", {
            method: "POST",
            body: JSON.stringify({ action: "accept", id }),
          });
          currentPackageId = res.bundle.package.id;
          await loadAll();
          switchView("review");
        } catch (err) {
          alert(`Could not start project: ${err.message}`);
          b.disabled = false;
          b.innerHTML = "✓ Work on this";
        }
      });
    });

    grid.querySelectorAll(".btn-dismiss-idea").forEach((b) => {
      b.addEventListener("click", async (e) => {
        const card = e.target.closest(".idea-card");
        const id = parseInt(card.dataset.id, 10);
        await api("/api/calendar/plan/action", {
          method: "POST",
          body: JSON.stringify({ action: "dismiss", id }),
        });
        await loadIdeasPool();
      });
    });

    grid.querySelectorAll(".btn-delete-idea").forEach((b) => {
      b.addEventListener("click", async (e) => {
        const card = e.target.closest(".idea-card");
        const id = parseInt(card.dataset.id, 10);
        if (confirm("Delete this suggestion permanently?")) {
          await api("/api/calendar/plan/action", {
            method: "POST",
            body: JSON.stringify({ action: "delete", id }),
          });
          await loadIdeasPool();
        }
      });
    });
  }

  async function triggerScanNow() {
    const btn = $("btn-scan-now");
    const origHtml = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Scanning news feeds...";
    }
    try {
      await api("/api/research/scan_now", { method: "POST", body: "{}" });
      await loadIdeasPool();
    } catch (err) {
      console.warn("Scan failed:", err);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }

  /* ---------- CALENDAR ---------- */
  async function loadCalendar() {
    calendarData = await api("/api/calendar");
    renderCalendar();
  }

  function renderCalendar() {
    if (!calendarData) return;
    document.querySelectorAll(".cal-mode").forEach((b) => b.classList.toggle("active", b.dataset.cal === calendarMode));
    const body = $("calendar-body");
    const events = calendarData.events;

    // Filters
    const chanFilter = $("cal-filter-channel").value;
    const formatFilter = $("cal-filter-format").value;
    const statusFilter = $("cal-filter-status").value;

    const filtered = events.filter((e) => {
      if (chanFilter !== "all" && e.channel !== chanFilter) return false;
      if (formatFilter !== "all" && e.format !== formatFilter) return false;
      if (statusFilter === "scheduled" && !e.status.includes("Scheduled")) return false;
      if (statusFilter === "overlap" && !e.overlap) return false;
      if (statusFilter === "missed" && !e.missed) return false;
      return true;
    });

    if (calendarMode === "agenda") {
      body.innerHTML = `
        <div class="cal-list">
          ${filtered
            .map(
              (e) => `
            <div class="cal-event-card ${e.overlap ? "overlap-warning" : ""} ${e.missed ? "missed-slot" : ""}" data-id="${e.package_id}" data-comp="${e.format}">
              <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <strong>${e.title}</strong>
                <span class="pill ${e.missed ? "pill-missed" : "pill-approved"}">${e.status}</span>
              </div>
              <div class="hint-text" style="margin-top:4px;">
                ${e.channel} • ${e.datetime_hki.replace("T", " ")} (Europe/Helsinki)
              </div>
              ${e.overlap ? `<div class="overlap-tag">${getIcon("alertTriangle", 12)} Overlap Warning: Scheduled within 90m of ${e.overlap_with}</div>` : ""}
            </div>`
            )
            .join("")}
        </div>`;
      wireCalendarCards(body);
      return;
    }

    if (calendarMode === "week") {
      // 7 Days Week Grid (Mon-Sun)
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const today = new Date();
      const currentDay = today.getDay(); // 0 is Sun
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

      let colsHtml = "";
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + mondayOffset + i);
        const dateStr = d.toISOString().split("T")[0];
        const dayEvents = filtered.filter((e) => e.datetime_hki.startsWith(dateStr));
        const isToday = i === (currentDay === 0 ? 6 : currentDay - 1);

        colsHtml += `
          <div class="cal-week-col ${isToday ? "today" : ""}">
            <div class="cal-week-head">${days[i]}<br/><span style="font-weight:normal;font-size:0.75rem;">${dateStr.slice(5)}</span></div>
            <div class="cal-week-events">
              ${dayEvents
                .map(
                  (e) => `
                <div class="cal-event-card ${e.overlap ? "overlap-warning" : ""} ${e.missed ? "missed-slot" : ""}" data-id="${e.package_id}" data-comp="${e.format}">
                  <div style="font-weight:700;font-size:0.8rem;color:var(--navy);">${e.title}</div>
                  <div class="hint-text" style="font-size:0.72rem;">${e.channel.split(" ")[0]} • ${e.datetime_hki.split("T")[1]}</div>
                  <span class="pill ${e.missed ? "pill-missed" : "pill-approved"}" style="font-size:0.65rem;padding:1px 4px;margin-top:2px;">${e.status}</span>
                  ${e.overlap ? `<div class="overlap-tag" style="font-size:0.65rem;">${getIcon("alertTriangle", 10)} Channel Overlap</div>` : ""}
                </div>`
                )
                .join("")}
            </div>
          </div>`;
      }

      body.innerHTML = `<div class="cal-week-grid">${colsHtml}</div>`;
      wireCalendarCards(body);
      return;
    }

    // Month Grid
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let cells = "";
    for (let d = 1; d <= daysInMonth; d++) {
      const datePrefix = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEvents = filtered.filter((e) => e.datetime_hki.startsWith(datePrefix));
      cells += `
        <div class="cal-cell" data-date="${datePrefix}">
          <strong>${d}</strong>
          ${dayEvents.map((e) => `<div style="margin-top:2px;color:${e.overlap ? "#b91c1c" : "#003580"}">• ${e.format}</div>`).join("")}
        </div>`;
    }
    body.innerHTML = `<div class="cal-month-grid">${cells}</div>`;
    body.querySelectorAll(".cal-cell").forEach((cell) => {
      cell.addEventListener("click", () => {
        $("assign-deadline").value = `${cell.dataset.date}T12:00`;
        switchView("assignments");
      });
    });
  }

  function wireCalendarCards(container) {
    container.querySelectorAll(".cal-event-card").forEach((card) => {
      card.addEventListener("click", () => {
        const pkgId = parseInt(card.dataset.id, 10);
        if (pkgId) {
          loadPackage(pkgId);
          switchView("review");
        }
      });
    });
  }

  /* ---------- INBOX ---------- */
  async function loadInbox() {
    const data = await api("/api/inbox");
    const list = $("inbox-list");
    list.innerHTML = "";
    data.items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "inbox-card";
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
          <div>
            <span class="badge badge-origin">${item.channel}</span>
            <strong>${item.sender}</strong> • <span class="hint-text">${item.context_label}</span>
          </div>
          <span class="pill ${item.status === "approved_simulated" ? "pill-approved" : item.status === "revision_requested" ? "pill-revision" : ""}">${item.status}</span>
        </div>
        <p style="margin:8px 0;">“${item.original_message}”</p>
        ${item.related_post_title ? `<div class="hint-text">Related: <a href="${item.related_post_url}" target="_blank">${item.related_post_title}</a></div>` : ""}
        <div style="margin-top:8px;">
          <div class="label-sm">AI Drafted Reply (${item.ai_model})</div>
          <textarea class="inbox-reply" rows="2">${item.ai_draft_reply}</textarea>
        </div>
        <div class="inbox-actions">
          <button class="btn btn-approve btn-sm btn-inbox-approve">
            ${getIcon("check", 14)} <span>Approve &amp; Authorize Send</span>
          </button>
          <button class="btn btn-ghost btn-sm btn-inbox-revise">
            ${getIcon("edit", 14)} <span>Return for Changes</span>
          </button>
          <button class="btn btn-ghost btn-sm btn-inbox-delete" style="color:#ef4444;" title="Delete this reader query">
            ${getIcon("trash", 14)} <span>Delete</span>
          </button>
        </div>
      `;
      const ta = div.querySelector(".inbox-reply");
      div.querySelector(".btn-inbox-approve").addEventListener("click", async () => {
        await api("/api/inbox/action", {
          method: "POST",
          body: JSON.stringify({ id: item.id, action: "approve", reply_text: ta.value }),
        });
        loadInbox();
      });
      div.querySelector(".btn-inbox-revise").addEventListener("click", async () => {
        await api("/api/inbox/action", {
          method: "POST",
          body: JSON.stringify({ id: item.id, action: "return_for_changes", reply_text: ta.value, feedback_note: "Make shorter" }),
        });
        loadInbox();
      });
      div.querySelector(".btn-inbox-delete").addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete this reader query?")) return;
        await api("/api/inbox/delete", {
          method: "POST",
          body: JSON.stringify({ id: item.id }),
        });
        loadInbox();
      });
      list.appendChild(div);
    });
  }

  /* ---------- RESEARCH & OFFICIAL SOURCES ---------- */
  async function loadResearch() {
    const q = $("source-search-input").value.trim();
    const data = await api(`/api/research/sources?q=${encodeURIComponent(q)}`);
    const results = $("sources-results-list");

    // Fetch daily editorial research & trend signals
    let dailyRes = null;
    let trendRes = null;
    try {
      dailyRes = await api("/api/research/daily");
      trendRes = await api("/api/research/trends");
    } catch (e) {}

    let html = "";

    // Daily Research Banner
    if (dailyRes) {
      html += `
        <div style="grid-column:1/-1;background:var(--icy-bg);border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="color:var(--navy);">📅 Daily Editorial Review &amp; Rotation (${dailyRes.date_label})</strong>
            <span class="badge ${dailyRes.has_new_verified_story ? "badge-check" : "badge-sample"}">${dailyRes.has_new_verified_story ? "New verified story" : "No new verified story today"}</span>
          </div>
          <p style="font-size:0.85rem;color:var(--ink);margin:0 0 10px;">${dailyRes.daily_review_summary}</p>
          <div style="font-size:0.78rem;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:10px;">
            <div><strong>Runs:</strong> ${dailyRes.automatic_schedule}</div>
            <div><strong>This run:</strong> ${dailyRes.ran_at} &nbsp; <strong>Previous run:</strong> ${dailyRes.last_run ? dailyRes.last_run.ran_at : "none recorded"}</div>
            <div style="margin-top:4px;"><strong>Sources checked:</strong></div>
            <ul style="margin:2px 0 0 16px;padding:0;">${(dailyRes.sources_checked || []).map((c) => `<li><b style="text-transform:uppercase;font-size:0.68rem;">${c.source_type.replace("_", " ")}</b> ${c.status === "completed" ? "✅" : "⚠️ not completed"} ${c.name}: <span class="hint-text">${c.detail}</span></li>`).join("")}</ul>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:8px;">
            ${(dailyRes.vertical_rotation || [])
              .map(
                (v) => `
              <div class="rotation-card" data-title="${encodeURIComponent(v.title)}" style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;margin-bottom:4px;">
                  <div style="display:flex;gap:4px;align-items:center;">
                    <span class="badge badge-origin" style="padding:2px 6px;">${v.section}</span>
                    <span class="badge badge-sample" style="padding:2px 6px;">${(v.data_label || "sample").toUpperCase()}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span class="hint-text">${v.category}</span>
                    <button class="btn-dismiss-rotation" data-title="${v.title}" title="Dismiss / Remove this suggestion" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:0.95rem;padding:0 3px;line-height:1;border-radius:3px;">✕</button>
                  </div>
                </div>
                <strong style="font-size:0.84rem;color:var(--navy);display:block;">${v.title}</strong>
                <p style="font-size:0.78rem;color:var(--muted);margin:4px 0;">${v.angle}</p>
                <div class="hint-text" style="font-size:0.72rem;"><strong>Assets:</strong> ${v.assets_ready}</div>
                <div class="hint-text" style="font-size:0.72rem;margin-bottom:6px;"><strong>Live duplicate check:</strong> ${v.live_duplicate_check && v.live_duplicate_check.covered ? "already covered: " + v.live_duplicate_check.matches.map((m) => `<a href="${m.url}" target="_blank">${m.title}</a>`).join(", ") : (v.live_duplicate_check && v.live_duplicate_check.covered === false ? "not covered on live site" : "not checked")}</div>
                <button class="btn btn-primary btn-sm btn-draft-rotation" data-title="${encodeURIComponent(v.title)}" data-angle="${encodeURIComponent(v.angle || '')}" data-url="${encodeURIComponent(v.source_url || '')}" style="width:100%;font-size:0.75rem;padding:4px 8px;display:flex;align-items:center;justify-content:center;gap:4px;">
                  ✍️ <span>Draft Story with AI</span>
                </button>
              </div>`
              )
              .join("")}
          </div>
        </div>
      `;
    }

    html += (data.sources || [])
      .map(
        (s, idx) => `
        <div class="source-card" data-source-id="${s.id}">
          <div>
            <div style="display:flex;justify-content:space-between;gap:6px;">
              <span class="badge badge-origin">${s.category}</span>
              <span class="badge ${s.is_verified ? "badge-check" : "badge-sample"}">${s.is_verified ? "Official Verified" : "Unverified Lead"}</span>
            </div>
            <h4 style="margin:6px 0 4px;color:var(--navy);">${s.title}</h4>
            <div class="hint-text"><strong>${s.outlet}</strong> • ${s.published_date}</div>
            <p style="margin:6px 0;font-size:0.85rem;">${s.claim}</p>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid #eef2f6;">
            <a href="${s.url}" target="_blank" rel="noopener" class="hint-text" style="color:var(--brand-blue);display:inline-flex;align-items:center;gap:4px;">
              ${getIcon("externalLink", 12)} Official Source
            </a>
            <div style="display:flex;align-items:center;gap:6px;">
              <button class="btn btn-ghost btn-sm btn-delete-source" data-id="${s.id}" data-title="${s.title}" style="color:#ef4444;padding:4px 8px;font-size:0.75rem;display:inline-flex;align-items:center;gap:4px;" title="Delete this official source">
                ${getIcon("trash", 12)} <span>Delete</span>
              </button>
              <button class="btn btn-secondary btn-sm btn-turn-assign" data-idx="${idx}">
                ${getIcon("sparkle", 12)} <span>Turn into Assignment</span>
              </button>
            </div>
          </div>
        </div>`
      )
      .join("");

    results.innerHTML = html;

    results.querySelectorAll(".btn-draft-rotation").forEach((b) => {
      b.addEventListener("click", () => {
        const title = decodeURIComponent(b.dataset.title || "");
        const angle = decodeURIComponent(b.dataset.angle || "");
        const url = decodeURIComponent(b.dataset.url || "");
        if (!title) return;
        $("assign-topic").value = title;
        $("assign-instructions").value = angle ? `${angle}\n\nLive reporting via Yle News / Official Finnish Source` : "";
        $("assign-links").value = url;
        switchView("assignments");
      });
    });

    results.querySelectorAll(".btn-turn-assign").forEach((b) => {
      b.addEventListener("click", () => {
        const idx = parseInt(b.dataset.idx, 10);
        const s = data.sources[idx];
        if (!s) return;
        $("assign-topic").value = s.title;
        $("assign-instructions").value = `${s.claim}\n\nSource: ${s.outlet} (${s.published_date})`;
        $("assign-links").value = s.url;
        switchView("assignments");
      });
    });

    results.querySelectorAll(".btn-delete-source").forEach((b) => {
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = b.dataset.id;
        const title = b.dataset.title;
        if (!confirm(`Are you sure you want to delete this official source?\n\n"${title}"`)) return;
        try {
          await api("/api/research/sources/delete", {
            method: "POST",
            body: JSON.stringify({ id: parseInt(id, 10) }),
          });
          loadResearch();
        } catch (err) {
          alert(`Failed to delete source: ${err.message}`);
        }
      });
    });

    results.querySelectorAll(".btn-dismiss-rotation").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const title = b.dataset.title;
        const card = b.closest(".rotation-card");
        if (card) {
          card.style.opacity = "0.3";
          setTimeout(() => card.remove(), 200);
        }
      });
    });

    // Trend signals & comparable Nordic accounts
    let trendHtml = "";
    if (trendRes && trendRes.comparable_accounts) {
      trendHtml += trendRes.comparable_accounts
        .map(
          (c) => `
        <div class="research-card" style="border-left:3px solid var(--brand-blue);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:var(--navy);font-size:0.88rem;">${c.account}</strong>
            <span class="badge badge-check" style="font-size:0.7rem;">Verified Nordic Benchmark</span>
          </div>
          <div style="font-size:0.82rem;margin:4px 0;"><strong>Format:</strong> ${c.recent_example.format}</div>
          <p class="hint-text" style="margin:2px 0;"><strong>Hook:</strong> ${c.recent_example.hook}</p>
          <div style="font-size:0.78rem;color:var(--ink);margin:4px 0;"><strong>Takeaway:</strong> ${c.recent_example.takeaway}</div>
          <div class="hint-text" style="font-size:0.72rem;color:var(--green);"><strong>Evidence:</strong> ${c.recent_example.trending_evidence}</div>
        </div>`
        )
        .join("");
    }

    const rData = await api("/api/research");
    trendHtml += (rData.items || [])
      .map(
        (item) => `
        <div class="research-card">
          <span class="badge badge-origin">${item.category}</span>
          <span class="badge badge-check">${item.duplicate_status}</span>
          <h4 style="margin:6px 0 4px;font-size:0.95rem;">${item.title}</h4>
          <p class="hint-text">${item.source} — ${item.summary}</p>
        </div>`
      )
      .join("");

    $("research-list").innerHTML = trendHtml;
  }

  /* ---------- PERFORMANCE ---------- */
  async function loadPerformance() {
    const data = await api("/api/performance");
    $("perf-notice").textContent = data.data_notice;
    const d = data.weekly_digest;
    $("perf-digest").innerHTML = `
      <div class="digest-row">
        <span class="digest-tag tag-worked">What Worked</span>
        <div style="font-size:0.88rem;color:var(--ink);">${d.what_worked}</div>
      </div>
      <div class="digest-row">
        <span class="digest-tag tag-under">Underperformed</span>
        <div style="font-size:0.88rem;color:var(--ink);">${d.what_underperformed}</div>
      </div>
      <div class="perf-warning-callout">
        <svg class="lucide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div><strong>Small Sample Notice (N=3 posts):</strong> Unavailable metrics (e.g. Facebook Insights, GA4 Clicks) are left blank until accounts are connected.</div>
      </div>
      <div class="digest-row">
        <span class="digest-tag tag-exp">Next Experiment</span>
        <div style="font-size:0.88rem;color:var(--navy);"><strong>${d.experiment.title}</strong> — ${d.experiment.hypothesis}</div>
      </div>
    `;

    const tbody = $("perf-table").querySelector("tbody");
    tbody.innerHTML = data.posts
      .map(
        (p) => {
          const isCarousel = (p.format || "").includes("Carousel");
          const fmtTag = isCarousel ? `<span class="badge badge-ig">Carousel (4:5)</span>` : `<span class="badge badge-origin">Reel (9:16)</span>`;
          return `
          <tr>
            <td>
              <div style="font-weight:600;color:var(--navy);font-size:0.9rem;">${p.title}</div>
              <div style="margin-top:2px;">${fmtTag} <span class="hint-text" style="font-size:0.75rem;">${p.sample_size_note || p.source}</span></div>
            </td>
            <td><strong>${p.watch_time_sec ? p.watch_time_sec + "s" : "—"}</strong></td>
            <td><strong style="color:var(--brand-blue);">${p.shares ?? "—"}</strong></td>
            <td><strong style="color:#059669;">${p.saves ?? "—"}</strong></td>
            <td>${p.follows ? "+" + p.follows : "—"}</td>
            <td>${p.site_clicks ?? "—"}</td>
          </tr>`;
        }
      )
      .join("");

    $("search-demand-box").innerHTML = `
      <div class="demand-card">
        <div class="label-sm" style="margin-bottom:6px;">English Search Demand</div>
        ${data.search_demand.english.map((q) => `
          <div class="demand-query-row">
            <span>${q.query}</span>
            <span class="trend-pill">${q.trend}</span>
          </div>`).join("")}
      </div>
      <div class="demand-card">
        <div class="label-sm" style="margin-bottom:6px;">Finnish Search Demand</div>
        ${data.search_demand.finnish.map((q) => `
          <div class="demand-query-row">
            <span>${q.query}</span>
            <span class="trend-pill">${q.trend}</span>
          </div>`).join("")}
      </div>
    `;
  }

  /* ---------- CONNECTIONS CATALOG ---------- */
  async function loadConnections() {
    const data = await api("/api/connections");
    const grid = $("connections-catalog");
    grid.innerHTML = data.connections
      .map(
        (c) => `
        <div class="conn-card-new" data-service="${c.id}">
          <div>
            <div class="conn-head">
              <div>
                <strong style="color:var(--navy);font-size:0.98rem;">${c.name}</strong>
                <div class="hint-text">${c.category}</div>
              </div>
              <span class="pill ${c.configured ? "pill-approved" : "pill-missed"}">${c.status}</span>
            </div>
            <p style="margin:8px 0;font-size:0.85rem;">${c.role}</p>
            <div>
              <div class="label-sm">Host Environment Secret</div>
              <code class="secret-env-tag">${c.secret_env}</code>
            </div>
            <p class="hint-text" style="margin-top:6px;">${c.next_step}</p>
          </div>
          <div>
            ${
              c.testable
                ? `
              <button class="btn btn-secondary btn-sm btn-test-conn" data-service="${c.id}">
                ${getIcon("sparkle", 12)} <span>Test Connection</span>
              </button>
              <div class="conn-test-box hidden"></div>`
                : ""
            }
          </div>
        </div>`
      )
      .join("");

    // Secure Probe Panel Wiring
    setupOpenAIProbeWiring();

    // Database Backups Wiring
    setupBackupsWiring();
  }

  async function loadBackups() {
    try {
      const data = await api("/api/admin/backups");
      const tbody = $("backups-tbody");
      if (!tbody) return;
      if (!data.backups || data.backups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding:10px;color:#64748b;text-align:center;">No backups found yet. Click "Create Backup Snapshot Now" to create one.</td></tr>`;
        return;
      }
      tbody.innerHTML = data.backups.map(b => `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:6px 8px;font-weight:600;color:var(--navy);">${escapeHtml(b.name)}</td>
          <td style="padding:6px 8px;color:#475569;">${b.db_size_kb} KB</td>
          <td style="padding:6px 8px;font-family:monospace;font-size:0.75rem;color:#64748b;">${escapeHtml(b.path)}</td>
        </tr>
      `).join("");
    } catch (err) {
      console.error("Failed to load backups", err);
    }
  }

  function setupBackupsWiring() {
    loadBackups();
    const btn = $("btn-trigger-backup");
    if (!btn || btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", async () => {
      const statusBox = $("backup-status-msg");
      btn.disabled = true;
      btn.innerHTML = `<span>⏳ Backing up...</span>`;
      try {
        const res = await api("/api/admin/backup", { method: "POST", body: "{}" });
        if (statusBox) {
          statusBox.classList.remove("hidden");
          if (res.success) {
            statusBox.style.background = "#f0fdf4";
            statusBox.style.color = "#166534";
            statusBox.style.border = "1px solid #bbf7d0";
            statusBox.textContent = `✓ ${res.message}`;
          } else {
            statusBox.style.background = "#fef2f2";
            statusBox.style.color = "#991b1b";
            statusBox.style.border = "1px solid #fecaca";
            statusBox.textContent = res.error || "Backup failed";
          }
        }
        await loadBackups();
      } catch (err) {
        if (statusBox) {
          statusBox.classList.remove("hidden");
          statusBox.style.background = "#fef2f2";
          statusBox.style.color = "#991b1b";
          statusBox.textContent = `Backup failed: ${err.message}`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>💾 Create Backup Snapshot Now</span>`;
      }
    });
  }

  function updateProbeUI(data) {
    if (!data) return;
    const demoPill = $("probe-demo-pill");
    const quotaPill = $("probe-quota-pill");
    const killPill = $("probe-kill-pill");
    const killBtn = $("btn-toggle-kill-switch");
    const liveBtn = $("btn-run-live-probe");

    if (demoPill) {
      demoPill.textContent = data.demo_mode_active ? "Demo Mode Active (0 Outbound Calls)" : "Live AI Enabled";
      demoPill.className = `pill ${data.demo_mode_active ? "pill-approved" : "pill-missed"}`;
    }
    if (quotaPill) {
      quotaPill.textContent = `${data.live_probes_used || 0}/${data.live_probes_limit || 1} Tests Used`;
      quotaPill.className = `pill ${(data.live_probes_used || 0) >= (data.live_probes_limit || 1) ? "pill-missed" : "pill-scheduled"}`;
    }
    if (killPill) {
      killPill.classList.toggle("hidden", !data.kill_switch_active);
    }
    if (killBtn) {
      killBtn.textContent = data.kill_switch_active ? "🟢 Disengage Kill Switch" : "🛑 Emergency Kill Switch";
      killBtn.style.color = data.kill_switch_active ? "#16A34A" : "#DC2626";
    }
    if (liveBtn) {
      if (data.demo_mode_active) {
        liveBtn.disabled = true;
        liveBtn.style.opacity = "0.6";
        liveBtn.style.cursor = "not-allowed";
        liveBtn.title = "Locked: Demo Mode blocks all paid API calls. Requires user approval.";
      } else if ((data.live_probes_used || 0) >= (data.live_probes_limit || 1)) {
        liveBtn.disabled = true;
        liveBtn.style.opacity = "0.6";
        liveBtn.style.cursor = "not-allowed";
        liveBtn.title = "Quota exhausted: Max 1 test allowed. Reset quota to run another.";
      }
    }
  }

  function setupOpenAIProbeWiring() {
    api("/api/admin/openai-probe/status").then(updateProbeUI).catch(() => {});

    $("btn-run-mock-probe")?.addEventListener("click", async () => {
      const box = $("probe-result-box");
      box.classList.remove("hidden");
      box.innerHTML = "<em>Executing mocked probe (zero cost)…</em>";
      const res = await api("/api/admin/openai-probe/test", {
        method: "POST",
        body: JSON.stringify({ mode: "mock" }),
      });
      box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="color:var(--green);">✓ ${escapeHtml(res.status)}: Mock Probe Verified</strong>
          <span class="pill pill-approved">Cost: $0.00000000 USD</span>
        </div>
        <p style="margin:4px 0 8px;font-size:0.86rem;">${escapeHtml(res.message)}</p>
        <div style="font-size:0.8rem;background:#F8FAFC;padding:8px;border-radius:6px;border:1px solid #E2E8F0;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;">
          <div><strong>Model:</strong> ${escapeHtml(res.model)}</div>
          <div><strong>Tokens:</strong> ${res.prompt_tokens} in + ${res.completion_tokens} out = ${res.total_tokens} total</div>
          <div><strong>Simulated Cost:</strong> $${res.simulated_estimated_cost_usd} USD</div>
          <div><strong>Outbound Network:</strong> None (Blocked)</div>
        </div>
      `;
      const st = await api("/api/admin/openai-probe/status");
      updateProbeUI(st);
    });

    $("btn-toggle-kill-switch")?.addEventListener("click", async () => {
      const st = await api("/api/admin/openai-probe/status");
      const targetKill = !st.kill_switch_active;
      const res = await api("/api/admin/openai-probe/kill", {
        method: "POST",
        body: JSON.stringify({ kill: targetKill }),
      });
      const box = $("probe-result-box");
      box.classList.remove("hidden");
      box.innerHTML = `<strong>Kill Switch Notice:</strong> ${escapeHtml(res.message)}`;
      const updated = await api("/api/admin/openai-probe/status");
      updateProbeUI(updated);
    });

    $("btn-reset-probe-quota")?.addEventListener("click", async () => {
      const res = await api("/api/admin/openai-probe/reset", { method: "POST", body: "{}" });
      const box = $("probe-result-box");
      box.classList.remove("hidden");
      box.innerHTML = `<strong style="color:var(--navy);">Quota Reset:</strong> ${escapeHtml(res.message)}`;
      updateProbeUI(res);
    });
  }

  /* ---------- HELPER FUNCTIONS ---------- */
  function escapeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- PROJECTS & STORIES HUB ---------- */
  let projectsData = [];
  let currentProjFilter = "all";

  async function loadProjects() {
    try {
      const data = await api("/api/projects");
      projectsData = data.projects;

      if ($("chip-count-total")) $("chip-count-total").textContent = data.counts.total;
      if ($("active-work-count")) $("active-work-count").textContent = data.counts.total;
      if ($("chip-count-review")) $("chip-count-review").textContent = data.counts.in_review;
      if ($("chip-count-progress")) $("chip-count-progress").textContent = data.counts.in_progress;
      if ($("chip-count-approved")) $("chip-count-approved").textContent = data.counts.approved;

      loadIdeasPool();
      renderProjectsTable();
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  }

  function renderProjectsTable() {
    const tbody = $("projects-tbody");
    if (!tbody) return;

    const query = ($("proj-search-input")?.value || "").toLowerCase().trim();
    const fmt = $("proj-format-filter")?.value || "all";

    const filtered = projectsData.filter((p) => {
      if (currentProjFilter === "in_review") {
        if (!p.pipeline_stage.includes("Review") && !p.pipeline_stage.includes("Partially")) return false;
      } else if (currentProjFilter === "in_progress") {
        if (!p.pipeline_stage.includes("Progress") && !p.pipeline_stage.includes("Working")) return false;
      } else if (currentProjFilter === "approved") {
        if (!p.pipeline_stage.includes("Approved") && !p.pipeline_stage.includes("Scheduled")) return false;
      }

      if (fmt !== "all") {
        if (!p.scope_label.includes(fmt) && p.scope_label !== fmt) return false;
      }

      if (query) {
        const hay = `${p.id} ${p.title} ${p.scope_label} ${p.pipeline_stage}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--muted);">No projects found matching filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((p) => {
      let fmtBadges = "";
      if (p.scope_label === "Both" || p.scope_label.includes("Reel")) {
        fmtBadges += `<span class="badge badge-origin" style="margin-right:4px;">Reel (9:16)</span>`;
      }
      if (p.scope_label.includes("Instagram Post")) {
        fmtBadges += `<span class="badge badge-ig" style="margin-right:4px;">IG Carousel (4:5)</span>`;
      }
      if (p.scope_label === "Both" || p.scope_label.includes("Article")) {
        fmtBadges += `<span class="badge badge-check" style="margin-right:4px;">Article</span>`;
      }

      const dlFormatted = p.deadline_at ? p.deadline_at.replace("T", " ") : "Flexible";

      return `
        <tr data-id="${p.id}">
          <td style="font-weight:700;color:var(--muted);">${p.id}</td>
          <td>
            <a class="proj-title-link" data-id="${p.id}">${escapeHtml(p.title)}</a>
            <div style="font-size:0.75rem;color:var(--muted);margin-top:2px;">Created: ${p.created_at ? p.created_at.slice(0, 10) : "Recent"}</div>
          </td>
          <td>${fmtBadges}</td>
          <td><span class="pill ${p.stage_badge}">${p.pipeline_stage}</span></td>
          <td><span class="badge badge-model">v${p.current_version}</span></td>
          <td><span style="font-weight:600;color:#059669;">${p.sources_count || 1} verified</span></td>
          <td style="font-family:monospace;font-size:0.8rem;color:var(--navy);">${dlFormatted}</td>
          <td style="text-align:right;white-space:nowrap;">
            <button type="button" class="btn btn-primary btn-sm btn-tbl-action btn-open-project" data-id="${p.id}" title="Open in Review">
              <svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              <span>Open</span>
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-tbl-action btn-edit-project" data-id="${p.id}" title="Edit Project">
              <svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <span>Edit</span>
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-tbl-action btn-tbl-del btn-del-project" data-id="${p.id}" title="Delete Project">
              <svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".proj-title-link, .btn-open-project").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        openProjectInReview(id);
      });
    });

    tbody.querySelectorAll(".btn-edit-project").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        openEditProjectModal(id);
      });
    });

    tbody.querySelectorAll(".btn-del-project").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.id, 10);
        const proj = projectsData.find((x) => x.id === id);
        const title = proj ? proj.title : `#${id}`;
        if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
          const res = await api("/api/projects/delete", {
            method: "POST",
            body: JSON.stringify({ id }),
          });
          if (res.deleted) {
            await loadProjects();
            const pkgsData = await api("/api/packages");
            const sel = $("package-selector");
            sel.innerHTML = pkgsData.packages
              .map((p) => `<option value="${p.id}" ${p.id === currentPackageId ? "selected" : ""}>#${p.id} ${p.title}</option>`)
              .join("");
          }
        }
      });
    });
  }

  function openProjectInReview(id) {
    loadPackage(id);
    switchView("review");
  }

  function openEditProjectModal(id) {
    const proj = projectsData.find((x) => x.id === id);
    if (!proj) return;
    $("edit-proj-id").value = proj.id;
    $("edit-proj-title").value = proj.title;
    $("edit-proj-scope").value = proj.assignment_scope || proj.scope_label || "Both";
    $("edit-proj-deadline").value = proj.deadline_at || "";
    $("modal-edit-proj").classList.remove("hidden");
  }

  /* ---------- DIRECT REEL STUDIO EDITOR ---------- */
  let currentAudioMode = "field_pulse";
  let currentTargetDuration = 12;
  let currentLogoY = 20;
  let currentLogoX = 50;
  let currentLogoVisible = true;

  function updateLayoutReadout() {
    const readout = $("layout-readout");
    if (!readout || !player || !player.reel) return;
    const layout = player.reel.layout || {};
    const l2 = layout.headline_font_px || layout.line2_font_px || 28;
    readout.textContent = `Safe Area: Top Left • Headline Font: ${l2}px`;
  }

  function setupDirectReelEditor() {
    const toggleBtn = $("btn-toggle-reel-editor");
    const editorDock = $("reel-direct-editor");
    if (!toggleBtn || !editorDock) return;

    toggleBtn.addEventListener("click", () => {
      const isHidden = editorDock.classList.toggle("hidden");
      $("reel-editor-toggle-text").textContent = isHidden
        ? "Direct Edit Reel (Text, Audio, Clips, Logo)"
        : "Hide Direct Editor";
      if (!isHidden) {
        populateDirectEditorFields();
      }
    });

    document.querySelectorAll(".reel-edit-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const t = tab.dataset.tab;
        document.querySelectorAll(".reel-edit-tab").forEach((b) => b.classList.toggle("active", b === tab));
        document.querySelectorAll(".reel-edit-pane").forEach((p) => p.classList.toggle("hidden", p.id !== `pane-reel-${t}`));
      });
    });

    // Scene Selector Pills in Direct Editor
    document.querySelectorAll(".re-scene-pill").forEach((p) => {
      p.addEventListener("click", () => {
        const idx = parseInt(p.dataset.scene, 10);
        selectReelScene(idx);
      });
    });

    function syncActiveSceneText() {
      if (!player || !player.reel) return;
      if (!player.reel.scenes) player.reel.scenes = [];
      while (player.reel.scenes.length <= currentReelSceneIndex) {
        player.reel.scenes.push({ id: player.reel.scenes.length + 1 });
      }
      const sc = player.reel.scenes[currentReelSceneIndex];
      const l1 = $("re-line1-text")?.value || $("re-hook-text")?.value || "";
      const l2 = $("re-line2-text")?.value || "";
      const l2Col = document.querySelector("input[name='re-line2-color-choice']:checked")?.value || "white";
      const l3 = $("re-line3-text")?.value || $("re-hl-text")?.value || "";
      const sub = $("re-sub-text")?.value || "";
      const badge = $("re-badge-text")?.value || "FINLAND GUIDE";

      sc.line1 = l1;
      sc.line2 = l2;
      sc.line2_color = l2Col;
      sc.line3 = l3;
      sc.line2_highlight = l3;
      sc.subtitle = sub;
      sc.badge = badge;

      if (currentReelSceneIndex === 0) {
        player.reel.hook_text = l1;
        if (!player.reel.cover) player.reel.cover = {};
        player.reel.cover.line1 = l1;
        player.reel.cover.line2 = l2;
        player.reel.cover.line2_color = l2Col;
        player.reel.cover.line3_highlight = l3;
        player.reel.cover.line3 = l3;
        player.reel.cover.subtitle = sub;
        player.reel.cover.badge = badge;
      }

      player.render();
      renderReelScenesOverview();
    }

    $("re-line1-text")?.addEventListener("input", syncActiveSceneText);
    $("re-line2-text")?.addEventListener("input", syncActiveSceneText);
    document.querySelectorAll("input[name='re-line2-color-choice']").forEach((r) => r.addEventListener("change", syncActiveSceneText));
    $("re-line3-text")?.addEventListener("input", syncActiveSceneText);
    $("re-sub-text")?.addEventListener("input", syncActiveSceneText);

    // Backward compatibility for old element IDs
    $("re-hook-text")?.addEventListener("input", syncActiveSceneText);
    $("re-hl-text")?.addEventListener("input", syncActiveSceneText);

    $("re-badge-text")?.addEventListener("input", (e) => {
      if (player && player.reel) {
        if (!player.reel.layout) player.reel.layout = {};
        player.reel.layout.badge_text = e.target.value;
      }
      syncActiveSceneText();
    });

    $("re-line2-size")?.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      $("re-line2-size-val").textContent = `${val}px`;
      if (player && player.reel) {
        if (!player.reel.layout) player.reel.layout = {};
        player.reel.layout.headline_font_px = val;
        player.reel.layout.line1_font_px = val;
        player.reel.layout.line2_font_px = val;
        updateLayoutReadout();
        player.render();
      }
    });

    $("re-hook-y")?.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      $("re-hook-y-val").textContent = `${Math.round(val)}%`;
      if (player && player.reel) {
        if (!player.reel.layout) player.reel.layout = {};
        player.reel.layout.text_y_pct = val;
        player.reel.layout.hook_y_pct = val;
        player.render();
      }
    });

    document.querySelectorAll(".preset-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const y = parseFloat(b.dataset.hookY);
        $("re-hook-y").value = y;
        $("re-hook-y-val").textContent = `${y}%`;
        if (player && player.reel) {
          if (!player.reel.layout) player.reel.layout = {};
          player.reel.layout.text_y_pct = y;
          player.reel.layout.hook_y_pct = y;
          player.render();
        }
      });
    });

    document.querySelectorAll(".audio-mode-btn").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".audio-mode-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        currentAudioMode = b.dataset.mode;
        if (player && player.reel) {
          if (!player.reel.audio) player.reel.audio = {};
          player.reel.audio.mix_mode = currentAudioMode;
        }
      });
    });

    $("re-audio-track")?.addEventListener("change", (e) => {
      if (player && player.reel) {
        if (!player.reel.audio) player.reel.audio = {};
        player.reel.audio.track_url = e.target.value;
        player.audio.src = e.target.value;
      }
    });

    $("re-music-vol")?.addEventListener("input", (e) => {
      $("re-music-vol-val").textContent = `${e.target.value}%`;
      if (player && player.reel) {
        if (!player.reel.audio) player.reel.audio = {};
        player.reel.audio.music_volume = parseFloat(e.target.value) / 100;
      }
    });

    $("re-field-vol")?.addEventListener("input", (e) => {
      $("re-field-vol-val").textContent = `${e.target.value}%`;
      if (player && player.reel) {
        if (!player.reel.audio) player.reel.audio = {};
        player.reel.audio.field_volume = parseFloat(e.target.value) / 100;
      }
    });

    document.querySelectorAll(".re-dur-btn").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".re-dur-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        currentTargetDuration = parseInt(b.dataset.dur, 10);
        if (player && player.reel) {
          player.reel.duration_sec = currentTargetDuration;
          player.render();
        }
      });
    });

    document.querySelectorAll(".re-logo-pos-btn").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".re-logo-pos-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        if (b.dataset.hide) {
          currentLogoVisible = false;
        } else {
          currentLogoVisible = true;
          currentLogoY = parseFloat(b.dataset.y);
          currentLogoX = parseFloat(b.dataset.x);
          if ($("re-logo-x")) {
            $("re-logo-x").value = currentLogoX;
            $("re-logo-x-val").textContent = `${currentLogoX}%`;
          }
          if ($("re-logo-y")) {
            $("re-logo-y").value = currentLogoY;
            $("re-logo-y-val").textContent = `${currentLogoY}%`;
          }
        }
        if (player && player.reel) {
          if (!player.reel.layout) player.reel.layout = {};
          player.reel.layout.logo_y_pct = currentLogoY;
          player.reel.layout.logo_x_pct = currentLogoX;
          player.reel.layout.logo_visible = currentLogoVisible;
          updateLayoutReadout();
          player.render();
        }
      });
    });

    $("re-logo-x")?.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      $("re-logo-x-val").textContent = `${Math.round(val)}%`;
      currentLogoX = val;
      if (player && player.reel) {
        if (!player.reel.layout) player.reel.layout = {};
        player.reel.layout.logo_x_pct = val;
        updateLayoutReadout();
        player.render();
      }
    });

    $("re-logo-y")?.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      $("re-logo-y-val").textContent = `${Math.round(val)}%`;
      currentLogoY = val;
      if (player && player.reel) {
        if (!player.reel.layout) player.reel.layout = {};
        player.reel.layout.logo_y_pct = val;
        updateLayoutReadout();
        player.render();
      }
    });

    $("re-logo-size")?.addEventListener("input", (e) => {
      $("re-logo-size-val").textContent = `${e.target.value}px`;
      if (player && player.reel) {
        if (!player.reel.layout) player.reel.layout = {};
        player.reel.layout.logo_size_px = parseInt(e.target.value, 10);
        updateLayoutReadout();
        player.render();
      }
    });

    $("btn-toggle-profile-crop")?.addEventListener("click", () => {
      if (player) {
        player.toggleProfileCropGuide();
      }
    });

    $("btn-export-cover-45")?.addEventListener("click", () => {
      if (!player) return;
      const dataUrl = player.exportCleanCover("4:5");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ilovefinland-cover-4x5-pkg${currentPackageId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    $("btn-export-cover-34")?.addEventListener("click", () => {
      if (!player) return;
      const dataUrl = player.exportCleanCover("3:4");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ilovefinland-cover-3x4-crop-pkg${currentPackageId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    $("btn-export-reel-mp4")?.addEventListener("click", () => {
      const l2 = player?.reel?.layout?.line2_font_px || 32;
      window.location.href = `/api/package/export-mp4?package_id=${currentPackageId}&line2_font_px=${l2}`;
    });

    $("btn-toggle-trio-view")?.addEventListener("click", () => {
      const panel = $("panel-reel");
      if (panel) {
        const isWide = panel.classList.toggle("wide-format-mode");
        $("btn-toggle-trio-view").textContent = isWide ? "⊟ Standard View" : "⊞ Side-by-Side View";
      }
    });

    $("btn-re-reset")?.addEventListener("click", () => {
      loadPackage(currentPackageId);
    });

    $("btn-re-save")?.addEventListener("click", async () => {
      const activeScenes = (player && player.reel && player.reel.scenes) ? player.reel.scenes : [];
      const s0 = activeScenes[0] || {};
      const adjustments = {
        scenes: activeScenes,
        hook_text: s0.line1 || $("re-line1-text")?.value || $("re-hook-text")?.value || "",
        line1: s0.line1 || $("re-line1-text")?.value || "",
        line2: s0.line2 || $("re-line2-text")?.value || "",
        line2_color: s0.line2_color || document.querySelector("input[name='re-line2-color-choice']:checked")?.value || "white",
        line3: s0.line3 || s0.line2_highlight || $("re-line3-text")?.value || "",
        line2_highlight: s0.line3 || s0.line2_highlight || $("re-line3-text")?.value || "",
        subtitle_text: s0.subtitle || $("re-sub-text")?.value || "",
        badge_text: $("re-badge-text")?.value || "FINLAND GUIDE",
        hook_y_pct: parseFloat($("re-hook-y")?.value || 68),
        headline_font_px: parseInt($("re-line2-size")?.value || 28, 10),
        line2_font_px: parseInt($("re-line2-size")?.value || 28, 10),
        line1_font_px: parseInt($("re-line2-size")?.value || 28, 10),
        audio_mode: currentAudioMode,
        audio_track: $("re-audio-track")?.value || "/assets/audio/arctic-kaamos-ambient.wav",
        music_volume: parseFloat($("re-music-vol")?.value || 70) / 100,
        field_volume: parseFloat($("re-field-vol")?.value || 85) / 100,
        logo_x_pct: currentLogoX,
        logo_y_pct: currentLogoY,
        logo_size_px: parseInt($("re-logo-size")?.value || 48, 10),
        duration_sec: currentTargetDuration || (player?.reel?.duration_sec) || 33,
      };

      const updated = await api("/api/package/adjust-reel", {
        method: "POST",
        body: JSON.stringify({
          package_id: currentPackageId,
          adjustments,
        }),
      });

      bundle = updated;
      selectedVersion = bundle.package.current_version;
      renderReview();
      await loadProjects();
      alert("Reel video & 3-line scene scripts saved successfully as a new revision!");
    });
  }

  let currentReelSceneIndex = 0;

  function selectReelScene(idx) {
    currentReelSceneIndex = idx;
    if (player && player.reel && player.reel.scenes && player.reel.scenes[idx]) {
      const s = player.reel.scenes[idx];
      const startSec = s.start_sec != null ? s.start_sec : (idx * 3.0);
      player.seek(startSec);
    }
    populateDirectEditorFields(idx);
  }

  function initScenesCollapse() {
    const bar = $("btn-toggle-scenes-collapse");
    const minMaxBtn = $("btn-scenes-minmax");
    const body = $("scenes-collapsible-body");
    const icon = $("scenes-collapse-icon");
    const text = $("scenes-minmax-text");

    const toggle = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!body) return;
      const isHidden = body.classList.contains("hidden");
      if (isHidden) {
        body.classList.remove("hidden");
        if (icon) icon.textContent = "▼";
        if (text) text.textContent = "➖ Minimize";
      } else {
        body.classList.add("hidden");
        if (icon) icon.textContent = "▶";
        if (text) text.textContent = "➕ Maximize / View Script";
      }
    };

    bar?.addEventListener("click", toggle);
    minMaxBtn?.addEventListener("click", toggle);
  }

  async function handleReplaceScenePhotoFile(sceneIdx, file) {
    if (!file || !currentPackageId) return;
    const isVideo = file.type.startsWith("video") || /\.(mp4|mov|webm)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const uploadRes = await api("/api/upload/media-clip", {
          method: "POST",
          body: JSON.stringify({
            data_base64: reader.result,
            filename: file.name,
            media_type: isVideo ? "video" : "image",
            credit: "Visuals: Uploaded Media",
          }),
        });

        const updated = await api("/api/package/replace-scene-media", {
          method: "POST",
          body: JSON.stringify({
            package_id: currentPackageId,
            scene_index: sceneIdx,
            clip_url: uploadRes.url,
            duration: isVideo ? 6.0 : 3.5,
          }),
        });

        bundle = updated;
        selectedVersion = bundle.package.current_version;
        renderReview();
        await loadProjects();
        alert(`✅ Scene ${sceneIdx + 1} photo updated! Duration auto-calculated (3.5s for static photos, outro appended).`);
      } catch (err) {
        alert(`Failed to replace photo: ${err.message}`);
      }
    };
    reader.readAsDataURL(file);
  }

  function renderReelScenesOverview() {
    const wrap = $("reel-scenes-table-wrap");
    if (!wrap || !bundle) return;
    const curVerNum = selectedVersion || bundle.package.current_version;
    const v = bundle.versions.find((ver) => ver.version === curVerNum) || bundle.versions[bundle.versions.length - 1];
    if (!v || !v.reel || !v.reel.scenes) return;
    const scenes = (player && player.reel && player.reel.scenes) ? player.reel.scenes : v.reel.scenes;

    const contentScenes = scenes.filter((s) => !s.is_outro);
    const countBadge = $("scenes-count-badge");
    if (countBadge) {
      const totDur = (v.reel && v.reel.duration_sec) ? v.reel.duration_sec : ((contentScenes.length * 3.5) + 2.8).toFixed(1);
      countBadge.textContent = `${contentScenes.length} Clips + Brand Outro • ${totDur}s`;
    }

    // Dynamic scene selector pills
    const pillsWrap = $("re-scene-selector-pills");
    if (pillsWrap && scenes.length > 0) {
      pillsWrap.innerHTML = scenes.map((s, idx) => {
        const isOutro = Boolean(s.is_outro);
        const label = isOutro ? "❤️ Brand Outro (2.8s)" : `🎬 Scene ${idx + 1} (${s.start_sec != null ? s.start_sec : (idx * 3.5)}–${s.end_sec != null ? s.end_sec : ((idx + 1) * 3.5)}s)`;
        return `<button type="button" class="btn btn-ghost btn-sm re-scene-pill ${idx === currentReelSceneIndex ? 'active' : ''}" data-scene="${idx}">${label}</button>`;
      }).join("");

      pillsWrap.querySelectorAll(".re-scene-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          const sIdx = parseInt(btn.dataset.scene, 10);
          selectReelScene(sIdx);
        });
      });
    }

    wrap.innerHTML = scenes.map((s, idx) => {
      const isActive = idx === currentReelSceneIndex;
      const isOutro = Boolean(s.is_outro);
      const startS = s.start_sec != null ? s.start_sec : (idx * 3.5);
      const endS = s.end_sec != null ? s.end_sec : ((idx + 1) * 3.5);

      if (isOutro) {
        // Dedicated Closing Branded Outro Card
        return `
          <div style="background:#030b1c;border:2px solid #00A3FF;border-radius:10px;padding:14px;box-shadow:0 4px 14px rgba(0,163,255,0.18);display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #1e293b;padding-bottom:6px;">
                <span style="font-weight:800;color:#00A3FF;font-size:0.84rem;display:flex;align-items:center;gap:6px;">
                  ✨ Closing Branded Outro Card (${startS}s – ${endS}s)
                </span>
                <span class="badge" style="background:#003882;color:#60a5fa;font-size:0.7rem;font-weight:700;">2.8s Dedicated</span>
              </div>
              <div style="text-align:center;padding:12px 8px;background:radial-gradient(circle at center, rgba(0,163,255,0.18) 0%, rgba(3,11,28,0.95) 75%);border-radius:8px;border:1px solid #0c2146;margin-bottom:10px;">
                <img src="/assets/ilf-heart-exact.png" alt="ILoveFinland Logo" style="width:72px;height:72px;display:block;margin:0 auto 10px;filter:drop-shadow(0 0 18px rgba(0,163,255,0.85));" />
                <span style="background:#003882;color:#ffffff;font-size:0.72rem;font-weight:800;padding:3px 12px;border-radius:10px;display:inline-block;letter-spacing:0.04em;margin-bottom:6px;">DISCOVER MORE</span>
                <div style="font-weight:800;font-size:0.92rem;color:#ffffff;letter-spacing:0.02em;">FALL IN LOVE WITH FINLAND.</div>
                <div style="font-weight:800;font-size:0.84rem;color:#00A3FF;margin-top:4px;">VISIT www.ilovefinland.net</div>
                <div style="font-size:0.75rem;font-weight:700;color:#e2e8f0;margin-top:4px;letter-spacing:0.04em;">YOUR FINLAND, DISCOVERED.</div>
              </div>
            </div>
            <div style="font-size:0.72rem;color:#64748b;line-height:1.4;text-align:center;padding-top:4px;">
              🛡️ Permanent brand closing card. Plays 2.8s with smooth audio fade-out.
            </div>
          </div>
        `;
      }

      // Regular Content Scene Card (1..8)
      const l1 = s.line1 || (idx === 0 ? v.reel.hook_text : "") || "—";
      const l2 = s.line2 || "—";
      const isBlue = s.line2_color === "blue";
      const l3 = s.line3 || s.line2_highlight || "—";
      const sub = s.subtitle || "—";
      const fallbackPoster = (v.article && v.article.featured_image && v.article.featured_image.url) || (v.reel && v.reel.visual_asset) || '/assets/ai-generated/ilf_ai_nano-banana-pro_4x5_208ae1cccd4f.jpg';
      const clipSrc = s.clip_url || (v.reel && v.reel.visual_asset) || fallbackPoster;
      const isVideo = clipSrc && /\.(mp4|mov|webm)$/i.test(clipSrc);
      const curDur = s.duration != null ? s.duration : (Math.round((endS - startS) * 10) / 10);
      const curTrans = s.transition || "dissolve";

      return `
        <div class="storyboard-clip-card" data-scene="${idx}" style="background:#fff;border:1.5px solid ${isActive ? 'var(--brand-blue)' : '#cbd5e1'};border-radius:10px;padding:12px;font-size:0.8rem;box-shadow:${isActive ? '0 0 0 2px rgba(0,56,130,0.22)' : '0 2px 4px rgba(0,0,0,0.03)'};display:flex;flex-direction:column;justify-content:space-between;transition:border-color 0.15s, box-shadow 0.15s;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #f1f5f9;padding-bottom:6px;">
              <span style="font-weight:800;color:var(--navy);font-size:0.84rem;">🎬 Clip ${idx + 1} (${startS}s – ${endS}s)</span>
              <span class="badge" style="background:#f1f5f9;color:#334155;font-size:0.7rem;font-weight:700;">${curDur}s ${isVideo ? 'Video' : 'Photo'}</span>
            </div>

            <!-- Thumbnail Preview & One-Click Photo Replacement Drop Zone -->
            <div class="clip-thumb-dropzone" data-scene="${idx}" style="position:relative;width:100%;height:130px;border-radius:6px;overflow:hidden;background:#091e3a;margin-bottom:8px;border:1.5px dashed #cbd5e1;cursor:pointer;display:flex;align-items:center;justify-content:center;">
              ${isVideo ? `
                <video src="${clipSrc}" muted playsinline loop style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>
              ` : `
                <img src="${clipSrc}" alt="Clip ${idx + 1}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.src='${escapeHtml(fallbackPoster)}'" />
              `}
              <div class="thumb-hover-overlay" style="position:absolute;inset:0;background:rgba(2,6,23,0.55);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:4px;opacity:0;transition:opacity 0.15s;">
                <span style="font-size:1.1rem;">🔄</span>
                <span style="font-size:0.74rem;font-weight:700;">Click or Drop Photo</span>
              </div>
            </div>

            <!-- Timing & Transition Controls Per-Clip -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;background:#f8fafc;padding:6px 8px;border-radius:6px;border:1px solid #e2e8f0;">
              <div>
                <label style="font-size:0.68rem;font-weight:700;color:#64748b;display:block;margin-bottom:2px;">⏱️ Duration:</label>
                <select class="clip-duration-select" data-scene="${idx}" style="width:100%;font-size:0.75rem;padding:3px 4px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;font-weight:600;cursor:pointer;">
                  ${[1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0].map(d => `<option value="${d}" ${Math.abs(curDur - d) < 0.1 ? 'selected' : ''}>${d}s</option>`).join("")}
                  ${![1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0].some(d => Math.abs(curDur - d) < 0.1) ? `<option value="${curDur}" selected>${curDur}s (Custom)</option>` : ''}
                </select>
              </div>
              <div>
                <label style="font-size:0.68rem;font-weight:700;color:#64748b;display:block;margin-bottom:2px;">✨ Transition:</label>
                <select class="clip-transition-select" data-scene="${idx}" style="width:100%;font-size:0.75rem;padding:3px 4px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;font-weight:600;cursor:pointer;">
                  <option value="dissolve" ${curTrans === 'dissolve' ? 'selected' : ''}>🎬 Dissolve</option>
                  <option value="zoom_push" ${curTrans === 'zoom_push' ? 'selected' : ''}>🔍 Zoom Push</option>
                  <option value="fade_black" ${curTrans === 'fade_black' ? 'selected' : ''}>🌑 Dip Black</option>
                  <option value="cut" ${curTrans === 'cut' ? 'selected' : ''}>✂️ Cut</option>
                </select>
              </div>
            </div>

            <!-- Action Buttons: Replace Photo, Edit Script, Delete -->
            <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary btn-xs btn-trigger-replace-photo" data-scene="${idx}" style="font-size:0.74rem;padding:4px 8px;font-weight:700;gap:4px;">
                🔄 Replace Photo
              </button>
              <input type="file" class="hidden scene-single-file-input" data-scene="${idx}" accept="image/*,video/*" />
              <button type="button" class="btn btn-ghost btn-xs btn-jump-edit-scene" data-scene="${idx}" style="font-size:0.72rem;padding:4px 8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600;">
                ✏️ Edit Text
              </button>
              ${contentScenes.length > 2 ? `
                <button type="button" class="btn btn-ghost btn-xs btn-delete-scene" data-scene="${idx}" style="font-size:0.72rem;padding:4px 6px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;font-weight:700;margin-left:auto;" title="Remove this clip">
                  🗑️
                </button>
              ` : ''}
            </div>

            <div style="display:grid;grid-template-columns:95px 1fr;gap:3px 6px;margin-bottom:6px;line-height:1.3;font-size:0.76rem;">
              <span style="color:#64748b;font-weight:600;">Line 1 (White):</span>
              <span style="font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(l1)}</span>
              <span style="color:#64748b;font-weight:600;">Line 2 (${isBlue ? 'Blue' : 'White'}):</span>
              <span style="font-weight:700;color:${isBlue ? '#0284c7' : '#334155'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(l2)}</span>
              <span style="color:#64748b;font-weight:600;">Line 3 (Blue):</span>
              <span style="font-weight:700;color:#0284c7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(l3)}</span>
            </div>
          </div>

          <div style="background:#f1f5f9;padding:6px 8px;border-radius:6px;border:1px solid #e2e8f0;margin-top:4px;">
            <div style="color:#475569;font-weight:700;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;">Subtitle:</div>
            <div style="color:#0f172a;font-size:0.75rem;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(sub)}</div>
          </div>
        </div>
      `;
    }).join("");

    // Overlay hover styling
    wrap.querySelectorAll(".clip-thumb-dropzone").forEach((zone) => {
      const overlay = zone.querySelector(".thumb-hover-overlay");
      zone.addEventListener("mouseenter", () => { if (overlay) overlay.style.opacity = "1"; });
      zone.addEventListener("mouseleave", () => { if (overlay) overlay.style.opacity = "0"; });
      
      // Click thumbnail -> replace photo
      zone.addEventListener("click", () => {
        const idx = parseInt(zone.dataset.scene, 10);
        const input = wrap.querySelector(`.scene-single-file-input[data-scene="${idx}"]`);
        input?.click();
      });

      // Drag & Drop
      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        zone.style.borderColor = "#00A3FF";
        zone.style.boxShadow = "0 0 0 3px rgba(0,163,255,0.25)";
      });
      zone.addEventListener("dragleave", () => {
        zone.style.borderColor = "#cbd5e1";
        zone.style.boxShadow = "none";
      });
      zone.addEventListener("drop", async (e) => {
        e.preventDefault();
        zone.style.borderColor = "#cbd5e1";
        zone.style.boxShadow = "none";
        const file = e.dataTransfer?.files?.[0];
        if (file) {
          const idx = parseInt(zone.dataset.scene, 10);
          await handleReplaceScenePhotoFile(idx, file);
        }
      });
    });

    // 1-Click Replace Photo button trigger
    wrap.querySelectorAll(".btn-trigger-replace-photo").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.scene, 10);
        const input = wrap.querySelector(`.scene-single-file-input[data-scene="${idx}"]`);
        input?.click();
      });
    });

    // File input change listener
    wrap.querySelectorAll(".scene-single-file-input").forEach((inp) => {
      inp.addEventListener("change", async () => {
        const file = inp.files?.[0];
        if (file) {
          const idx = parseInt(inp.dataset.scene, 10);
          await handleReplaceScenePhotoFile(idx, file);
        }
      });
    });

    // Edit Text button listener
    wrap.querySelectorAll(".btn-jump-edit-scene").forEach((b) => {
      b.addEventListener("click", () => {
        const idx = parseInt(b.dataset.scene, 10);
        selectReelScene(idx);
        const ed = $("reel-direct-editor");
        if (ed && ed.classList.contains("hidden")) {
          $("btn-toggle-reel-editor")?.click();
        }
        document.querySelector(".reel-edit-tab[data-tab='text']")?.click();
        $("reel-direct-editor")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    // Delete Scene button listener
    wrap.querySelectorAll(".btn-delete-scene").forEach((b) => {
      b.addEventListener("click", async () => {
        const idx = parseInt(b.dataset.scene, 10);
        if (!confirm(`Are you sure you want to remove Scene ${idx + 1}? Total duration will adjust accordingly.`)) return;
        try {
          const updated = await api("/api/package/delete-reel-scene", {
            method: "POST",
            body: JSON.stringify({
              package_id: currentPackageId,
              scene_index: idx,
            }),
          });
          bundle = updated;
          selectedVersion = bundle.package.current_version;
          renderReview();
          await loadProjects();
          alert(`✅ Removed Scene ${idx + 1}. Duration and Outro auto-recalculated!`);
        } catch (err) {
          alert(`Failed to delete scene: ${err.message}`);
        }
      });
    });

    // Per-Clip Duration Dropdown Listener
    wrap.querySelectorAll(".clip-duration-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const idx = parseInt(sel.dataset.scene, 10);
        const dur = parseFloat(sel.value);
        if (isNaN(dur) || dur <= 0 || !currentPackageId) return;
        try {
          const updated = await api("/api/package/adjust-reel", {
            method: "POST",
            body: JSON.stringify({
              package_id: currentPackageId,
              adjustments: {
                scene_index: idx,
                duration: dur,
              },
            }),
          });
          bundle = updated;
          selectedVersion = bundle.package.current_version;
          renderReview();
          await loadProjects();
        } catch (err) {
          alert(`Failed to adjust scene duration: ${err.message}`);
        }
      });
    });

    // Per-Clip Transition Selector Listener
    wrap.querySelectorAll(".clip-transition-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const idx = parseInt(sel.dataset.scene, 10);
        const trans = sel.value;
        if (!trans || !currentPackageId) return;
        try {
          const updated = await api("/api/package/adjust-reel", {
            method: "POST",
            body: JSON.stringify({
              package_id: currentPackageId,
              adjustments: {
                scene_index: idx,
                transition: trans,
              },
            }),
          });
          bundle = updated;
          selectedVersion = bundle.package.current_version;
          renderReview();
          await loadProjects();
        } catch (err) {
          alert(`Failed to adjust scene transition: ${err.message}`);
        }
      });
    });
  }

  // Hook up Add Scene, Batch Multi-Upload, and Pacing Presets buttons once
  function initStoryboardControls() {
    // 1-Click Pacing Presets (Fast 2.0s, Cinematic 3.0s, Story 4.0s)
    document.querySelectorAll(".btn-pacing-preset").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!currentPackageId || !bundle) return;
        const dur = parseFloat(btn.dataset.duration);
        if (isNaN(dur)) return;
        try {
          const updated = await api("/api/package/adjust-reel", {
            method: "POST",
            body: JSON.stringify({
              package_id: currentPackageId,
              adjustments: {
                apply_all_duration: dur,
              },
            }),
          });
          bundle = updated;
          selectedVersion = bundle.package.current_version;
          renderReview();
          await loadProjects();
        } catch (err) {
          alert(`Failed to apply pacing preset: ${err.message}`);
        }
      });
    });

    // Apply Transition to All Clips Dropdown
    const applyAllTransSelect = $("select-apply-all-transition");
    applyAllTransSelect?.addEventListener("change", async () => {
      if (!currentPackageId || !bundle || !applyAllTransSelect.value) return;
      const trans = applyAllTransSelect.value;
      try {
        const updated = await api("/api/package/adjust-reel", {
          method: "POST",
          body: JSON.stringify({
            package_id: currentPackageId,
            adjustments: {
              apply_all_transition: trans,
            },
          }),
        });
        bundle = updated;
        selectedVersion = bundle.package.current_version;
        renderReview();
        await loadProjects();
      } catch (err) {
        alert(`Failed to apply transition to all clips: ${err.message}`);
      } finally {
        applyAllTransSelect.value = "";
      }
    });

    $("btn-add-reel-scene")?.addEventListener("click", async () => {
      if (!currentPackageId || !bundle) return;
      try {
        const updated = await api("/api/package/add-reel-scene", {
          method: "POST",
          body: JSON.stringify({
            package_id: currentPackageId,
            scene_data: {
              badge: "LAPLAND",
              line1: "DISCOVER FINLAND",
              line2: "ARCTIC WONDERLAND",
              line3: "AUTHENTIC STORIES",
              subtitle: "Experience authentic Finland across every season.",
            },
          }),
        });
        bundle = updated;
        selectedVersion = bundle.package.current_version;
        renderReview();
        await loadProjects();
        alert("✅ Added new scene clip (up to 8)! Duration and Outro auto-calculated.");
      } catch (err) {
        alert(`Failed to add scene: ${err.message}`);
      }
    });

    const batchInput = $("batch-scene-file-input");
    batchInput?.addEventListener("change", async () => {
      const files = Array.from(batchInput.files || []);
      if (files.length === 0 || !currentPackageId) return;
      if (files.length > 8) {
        alert("Please select at most 8 photos for the reel sequence.");
        return;
      }
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const isVideo = file.type.startsWith("video") || /\.(mp4|mov|webm)$/i.test(file.name);
          const reader = new FileReader();
          await new Promise((resolve, reject) => {
            reader.onload = async () => {
              try {
                const upRes = await api("/api/upload/media-clip", {
                  method: "POST",
                  body: JSON.stringify({
                    data_base64: reader.result,
                    filename: file.name,
                    media_type: isVideo ? "video" : "image",
                    credit: "Visuals: Uploaded Media",
                  }),
                });
                // If scene exists, replace; else add
                const curScenes = (bundle.package_version && bundle.package_version.reel && bundle.package_version.reel.scenes) || [];
                const contentCount = curScenes.filter(s => !s.is_outro).length;
                if (i < contentCount) {
                  bundle = await api("/api/package/replace-scene-media", {
                    method: "POST",
                    body: JSON.stringify({
                      package_id: currentPackageId,
                      scene_index: i,
                      clip_url: upRes.url,
                      duration: isVideo ? 6.0 : 3.5,
                    }),
                  });
                } else if (contentCount < 8) {
                  bundle = await api("/api/package/add-reel-scene", {
                    method: "POST",
                    body: JSON.stringify({
                      package_id: currentPackageId,
                      scene_data: {
                        badge: "LAPLAND",
                        line1: "DISCOVER FINLAND",
                        line2: "ARCTIC WONDERLAND",
                        line3: "AUTHENTIC STORIES",
                        subtitle: "Experience authentic Finland across every season.",
                        clip_url: upRes.url,
                      },
                    }),
                  });
                }
                resolve();
              } catch (e) {
                reject(e);
              }
            };
            reader.readAsDataURL(file);
          });
        }
        selectedVersion = bundle.package.current_version;
        renderReview();
        await loadProjects();
        alert(`✅ Batch uploaded ${files.length} photos! Storyboard and Outro timings updated.`);
      } catch (err) {
        alert(`Batch upload error: ${err.message}`);
      } finally {
        batchInput.value = "";
      }
    });
  }

  function populateDirectEditorFields(targetSceneIdx = 0) {
    if (!bundle || !bundle.versions) return;
    const v = bundle.versions.find((ver) => ver.version === selectedVersion) || bundle.versions[bundle.versions.length - 1];
    if (!v || !v.reel) return;
    const r = (player && player.reel) ? player.reel : v.reel;

    currentReelSceneIndex = targetSceneIdx;
    const scenes = r.scenes || [];
    const sc = scenes[targetSceneIdx] || scenes[0] || {};

    const l1Val = sc.line1 || (targetSceneIdx === 0 ? r.hook_text : "") || "";
    const l2Val = sc.line2 || "";
    const l2Color = sc.line2_color || "white";
    const l3Val = sc.line3 || sc.line2_highlight || "";
    const subVal = sc.subtitle || "";
    const badgeVal = sc.badge || (r.layout && r.layout.badge_text) || "FINLAND GUIDE";

    if ($("re-line1-text")) $("re-line1-text").value = l1Val;
    if ($("re-line2-text")) $("re-line2-text").value = l2Val;
    const radioWhite = document.querySelector("input[name='re-line2-color-choice'][value='white']");
    const radioBlue = document.querySelector("input[name='re-line2-color-choice'][value='blue']");
    if (radioWhite && radioBlue) {
      if (l2Color === "blue") radioBlue.checked = true;
      else radioWhite.checked = true;
    }
    if ($("re-line3-text")) $("re-line3-text").value = l3Val;
    if ($("re-sub-text")) $("re-sub-text").value = subVal;
    if ($("re-badge-text")) $("re-badge-text").value = badgeVal;

    // Backward compat for old inputs
    if ($("re-hook-text")) $("re-hook-text").value = l1Val;
    if ($("re-hl-text")) $("re-hl-text").value = l3Val;

    const startSec = sc.start_sec != null ? sc.start_sec : (targetSceneIdx * 3.0);
    const endSec = sc.end_sec != null ? sc.end_sec : ((targetSceneIdx + 1) * 3.0);
    if ($("re-active-scene-time")) {
      $("re-active-scene-time").textContent = `Scene ${targetSceneIdx + 1} (${startSec}s – ${endSec}s)`;
    }

    // Update scene selector pills
    document.querySelectorAll(".re-scene-pill").forEach((p) => {
      p.classList.toggle("active", parseInt(p.dataset.scene, 10) === targetSceneIdx);
    });

    const l2Size = (r.layout && (r.layout.headline_font_px || r.layout.line2_font_px || r.layout.line1_font_px)) ? (r.layout.headline_font_px || r.layout.line2_font_px || r.layout.line1_font_px) : 28;
    if ($("re-line2-size")) {
      $("re-line2-size").value = l2Size;
      $("re-line2-size-val").textContent = `${l2Size}px`;
    }

    if (r.duration_sec) {
      currentTargetDuration = r.duration_sec;
      document.querySelectorAll(".re-dur-btn").forEach((b) => {
        b.classList.toggle("active", parseInt(b.dataset.dur, 10) === r.duration_sec);
      });
    } else if (scenes.length > 0 && scenes[scenes.length - 1].end_sec) {
      currentTargetDuration = Math.round(scenes[scenes.length - 1].end_sec);
    }

    const yPct = (r.layout && (r.layout.text_y_pct || r.layout.hook_y_pct)) ? (r.layout.text_y_pct || r.layout.hook_y_pct) : 68;
    if ($("re-hook-y")) {
      $("re-hook-y").value = yPct;
      $("re-hook-y-val").textContent = `${Math.round(yPct)}%`;
    }

    const lx = (r.layout && r.layout.logo_x_pct != null) ? r.layout.logo_x_pct : 17.5;
    const ly = (r.layout && r.layout.logo_y_pct != null) ? r.layout.logo_y_pct : 17.0;
    currentLogoX = lx;
    currentLogoY = ly;

    if ($("re-logo-x")) {
      $("re-logo-x").value = lx;
      $("re-logo-x-val").textContent = `${Math.round(lx)}%`;
    }
    if ($("re-logo-y")) {
      $("re-logo-y").value = ly;
      $("re-logo-y-val").textContent = `${Math.round(ly)}%`;
    }

    const logoSize = (r.layout && r.layout.logo_size_px) ? r.layout.logo_size_px : 68;
    if ($("re-logo-size")) {
      $("re-logo-size").value = logoSize;
      $("re-logo-size-val").textContent = `${logoSize}px`;
    }
    updateLayoutReadout();

    if ($("re-audio-track") && r.audio && r.audio.track_url) {
      $("re-audio-track").value = r.audio.track_url;
    }

    const clipsList = $("re-clips-list");
    if (clipsList) {
      const activeClips = (r.video_clips && r.video_clips.length > 0) ? r.video_clips : (r.clips || []);
      if (activeClips && activeClips.length > 0) {
        clipsList.innerHTML = activeClips.map((c, i) => `
          <div style="display:flex;align-items:center;gap:8px;background:var(--icy-bg);padding:6px;border-radius:6px;font-size:0.75rem;">
            <video src="${c.url || ''}" muted style="width:40px;height:26px;object-fit:cover;border-radius:3px;background:#001a33;"></video>
            <div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong>Clip ${i+1}:</strong> ${c.filename || c.label || "Uploaded Video Footage"}</div>
            <span style="font-weight:700;color:var(--navy);">${c.duration || 3}s</span>
          </div>
        `).join("");
      } else {
        clipsList.innerHTML = `<div class="hint-text" style="font-size:0.78rem;">Visual Asset: ${r.visual_label || "Field Archival"} (${r.duration_sec || 12}s)</div>`;
      }
    }

    renderReelScenesOverview();
  }

  /* ---------- AI MEDIA STUDIO (GOOGLE GEMINI & VEO) ---------- */
  let aiMediaModels = null;
  let aiMediaPresets = null;
  let currentAiMode = "text_to_image";
  let currentCleanResult = null;
  let currentBrandedResult = null;
  let currentUploadedRefUrl = null;

  async function initAiMediaStudio() {
    try {
      if (!aiMediaModels) {
        aiMediaModels = await api("/api/ai-media/models");
      }
      if (!aiMediaPresets) {
        aiMediaPresets = await api("/api/ai-media/presets");
      }

      const badge = $("ai-demo-badge");
      if (badge && aiMediaModels) {
        if (aiMediaModels.demo_mode) {
          badge.textContent = "Demo Mode: 0 Credit Spend";
          badge.className = "badge badge-info";
        } else {
          badge.textContent = "Live Production Mode: Manual Approval Required";
          badge.className = "badge badge-success";
        }
      }

      populateAiMediaControls();
      updateAiCostDisplay();
      wireAiMediaEvents();
    } catch (e) {
      console.error("Failed to initialize AI Media Studio:", e);
    }
  }

  function populateAiMediaControls() {
    // Populate model options based on current mode
    const modelSel = $("ai-model-select");
    if (modelSel && aiMediaModels) {
      const isVideo = currentAiMode.includes("video");
      const list = isVideo ? aiMediaModels.video_models : aiMediaModels.image_models;
      const grpLabel = isVideo ? "Google Veo Video Models" : "Google Gemini Image Models";
      modelSel.innerHTML = `
        <optgroup label="${grpLabel}">
          ${list.map((m) => `<option value="${m.id}">${m.name} (${isVideo ? `$${m.cost_per_second_usd}/s` : `$${m.cost_per_image_usd}`})</option>`).join("")}
        </optgroup>
      `;
    }

    // Populate environment presets
    const envSel = $("ai-env-select");
    if (envSel && aiMediaPresets && aiMediaPresets.environments) {
      envSel.innerHTML = Object.entries(aiMediaPresets.environments)
        .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
        .join("");
    }

    // Populate camera presets
    const camSel = $("ai-camera-select");
    if (camSel && aiMediaPresets && aiMediaPresets.cameras) {
      camSel.innerHTML = Object.entries(aiMediaPresets.cameras)
        .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
        .join("");
    }
  }

  async function updateAiCostDisplay() {
    const modelId = $("ai-model-select")?.value || "nano-banana-pro";
    const isVideo = currentAiMode.includes("video");
    const duration = parseInt($("ai-duration-select")?.value || "12", 10);

    try {
      const est = await api("/api/ai-media/estimate-cost", {
        method: "POST",
        body: JSON.stringify({
          model_id: modelId,
          media_type: isVideo ? "video" : "image",
          duration_sec: duration,
        }),
      });

      const costDisp = $("ai-cost-display");
      const gate = $("ai-approval-gate");
      const sub = $("ai-approval-subtext");

      if (costDisp) {
        if (est.is_free) {
          costDisp.textContent = "$0.00 USD (Demo Mode)";
          costDisp.style.color = "var(--primary)";
        } else {
          costDisp.textContent = `$${est.estimated_api_cost_usd.toFixed(2)} USD`;
          costDisp.style.color = "#b91c1c";
        }
      }

      if (gate) {
        gate.classList.toggle("hidden", !est.requires_approval);
      }
      if (sub) {
        sub.textContent = est.approval_statement;
      }
    } catch (e) {
      console.warn("Cost estimate error:", e);
    }
  }

  function setAiMode(mode) {
    currentAiMode = mode;
    document.querySelectorAll(".ai-mode-tab").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));

    const isVideo = mode.includes("video");
    const isImgTo = mode.includes("image_to");

    $("ai-ref-group")?.classList.toggle("hidden", !isImgTo);
    $("ai-video-controls")?.classList.toggle("hidden", !isVideo);

    const btnText = $("btn-ai-generate-text");
    if (btnText) {
      btnText.textContent = isVideo ? "🎬 Generate Veo Motion Scene (Stage 1)" : "✨ Generate Photographic Visual (Stage 1)";
    }

    populateAiMediaControls();
    updateAiCostDisplay();
  }

  let aiEventsWired = false;
  function wireAiMediaEvents() {
    if (aiEventsWired) return;
    aiEventsWired = true;

    // Mode tabs
    document.querySelectorAll(".ai-mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => setAiMode(tab.dataset.mode));
    });

    // Model & Surface change
    $("ai-model-select")?.addEventListener("change", updateAiCostDisplay);
    $("ai-duration-select")?.addEventListener("change", updateAiCostDisplay);

    // Subject fidelity slider
    $("ai-fidelity-slider")?.addEventListener("input", (e) => {
      if ($("ai-fidelity-val")) $("ai-fidelity-val").textContent = `${e.target.value}%`;
    });

    // Reference file upload
    $("ai-ref-file-input")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await api("/api/ai-media/upload-reference", {
            method: "POST",
            body: JSON.stringify({ image_base64: reader.result, filename: file.name }),
          });
          currentUploadedRefUrl = res.url;
          if ($("ai-ref-preview-img")) $("ai-ref-preview-img").src = res.url;
          if ($("ai-ref-name")) $("ai-ref-name").textContent = file.name;
          $("ai-ref-preview-wrap")?.classList.remove("hidden");
        } catch (err) {
          alert(`Reference upload failed: ${err.message}`);
        }
      };
      reader.readAsDataURL(file);
    });

    // Use current story photo as reference
    $("ai-btn-use-featured-ref")?.addEventListener("click", () => {
      const art = packagesData[currentPackageId]?.article;
      const featUrl = art?.featured_image?.url;
      if (featUrl) {
        currentUploadedRefUrl = featUrl;
        if ($("ai-ref-preview-img")) $("ai-ref-preview-img").src = featUrl;
        if ($("ai-ref-name")) $("ai-ref-name").textContent = "Story Featured Image";
        $("ai-ref-preview-wrap")?.classList.remove("hidden");
      } else {
        alert("No featured photo available in the current story.");
      }
    });

    // Generate button
    $("btn-ai-generate")?.addEventListener("click", runAiMediaGeneration);
    $("btn-ai-regen")?.addEventListener("click", runAiMediaGeneration);

    // Stage toggle (Clean vs Branded)
    $("btn-show-clean")?.addEventListener("click", () => {
      $("btn-show-clean")?.classList.add("active");
      $("btn-show-branded")?.classList.remove("active");
      $("ai-result-clean-img")?.classList.remove("hidden");
      $("ai-result-branded-img")?.classList.add("hidden");
    });

    $("btn-show-branded")?.addEventListener("click", () => {
      $("btn-show-branded")?.classList.add("active");
      $("btn-show-clean")?.classList.remove("active");
      $("ai-result-clean-img")?.classList.add("hidden");
      $("ai-result-branded-img")?.classList.remove("hidden");
    });

    // Apply to story triggers
    $("ai-btn-apply-to-featured")?.addEventListener("click", applyAiImageToFeaturedStory);
    $("ai-btn-apply-to-post")?.addEventListener("click", applyAiImageToStaticPost);
    $("ai-btn-apply-to-reel")?.addEventListener("click", applyAiVideoToReel);
  }

  async function runAiMediaGeneration() {
    const prompt = $("ai-prompt-input")?.value.trim();
    if (!prompt) {
      alert("Please enter a visual brief or prompt for generation.");
      $("ai-prompt-input")?.focus();
      return;
    }

    const modelId = $("ai-model-select")?.value || "nano-banana-pro";
    const isVideo = currentAiMode.includes("video");
    const aspect = $("ai-surface-select")?.value || "4:5";
    const env = $("ai-env-select")?.value || "winter_subzero";
    const cam = $("ai-camera-select")?.value || "reportage_35mm";
    const motion = $("ai-camera-motion-select")?.value || "forward_tracking";
    const duration = parseInt($("ai-duration-select")?.value || "12", 10);
    const approved = $("ai-approval-checkbox")?.checked || false;
    const fidelity = parseInt($("ai-fidelity-slider")?.value || "85", 10) / 100.0;

    const btn = $("btn-ai-generate");
    const sp = $("btn-ai-generate-spinner");
    const txt = $("btn-ai-generate-text");

    if (btn) btn.disabled = true;
    if (sp) sp.classList.remove("hidden");
    if (txt) txt.textContent = isVideo ? "Generating Veo motion scene..." : "Synthesizing DSLR photography...";

    try {
      if (isVideo) {
        const res = await api("/api/ai-media/generate-video", {
          method: "POST",
          body: JSON.stringify({
            prompt,
            model_id: modelId,
            duration_sec: duration,
            camera_movement: motion,
            environment_preset: env,
            reference_image_url: currentAiMode.includes("image_to") ? currentUploadedRefUrl : null,
            approval_granted: approved,
          }),
        });
        displayAiVideoResult(res);
      } else {
        const res = await api("/api/ai-media/generate-image", {
          method: "POST",
          body: JSON.stringify({
            prompt,
            model_id: modelId,
            aspect_ratio: aspect,
            environment_preset: env,
            camera_preset: cam,
            reference_image_url: currentAiMode.includes("image_to") ? currentUploadedRefUrl : null,
            subject_fidelity: fidelity,
            approval_granted: approved,
            package_id: currentPackageId,
          }),
        });
        await displayAiImageResult(res);
      }
      $("btn-ai-regen")?.classList.remove("hidden");
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      if (btn) btn.disabled = false;
      if (sp) sp.classList.add("hidden");
      if (txt) txt.textContent = isVideo ? "🎬 Generate Veo Motion Scene (Stage 1)" : "✨ Generate Photographic Visual (Stage 1)";
    }
  }

  async function displayAiImageResult(res) {
    currentCleanResult = res;

    $("ai-preview-placeholder")?.classList.add("hidden");
    $("ai-preview-active")?.classList.remove("hidden");
    $("ai-img-container")?.classList.remove("hidden");
    $("ai-vid-container")?.classList.add("hidden");

    if ($("ai-result-clean-img")) $("ai-result-clean-img").src = res.clean_image_url;
    if ($("ai-btn-download-clean")) {
      $("ai-btn-download-clean").href = res.clean_image_url;
      $("ai-btn-download-clean").download = `clean-photo-${res.id}.jpg`;
    }

    // Automatically render Stage 2 Branded variant in background
    try {
      const art = packagesData[currentPackageId]?.article || {};
      const branded = await api("/api/ai-media/apply-branding", {
        method: "POST",
        body: JSON.stringify({
          clean_image_url: res.clean_image_url,
          clean_file_path: res.clean_file_path,
          badge_text: art.category ? art.category.toUpperCase() : "FINLAND GUIDE",
          headline_line1: art.headline ? art.headline.slice(0, 36).toUpperCase() : "WINTER IN FINLAND",
          headline_line2: "EXPLORE THE FULL GUIDE",
          subtitle: art.short_description ? art.short_description.slice(0, 70) : "Official editorial guide at ilovefinland.net",
          aspect_ratio: res.aspect_ratio || "4:5",
        }),
      });
      currentBrandedResult = branded;
      if ($("ai-result-branded-img")) $("ai-result-branded-img").src = branded.branded_image_url;
      if ($("ai-btn-download-branded")) {
        $("ai-btn-download-branded").href = branded.branded_image_url;
        $("ai-btn-download-branded").download = `ilovefinland-branded-${res.id}.png`;
      }
    } catch (e) {
      console.warn("Failed to generate branded variant:", e);
    }

    // Populate metadata & ethics
    const metaBox = $("ai-meta-specs");
    if (metaBox) {
      metaBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <strong>${res.model_name}</strong>
          <span class="badge badge-success">${res.resolution} · ${res.file_size_mb} MB</span>
        </div>
        <div style="font-size:11px;color:#555;margin-bottom:6px;"><strong>Optical settings:</strong> ${res.camera_preset} · <strong>Environment:</strong> ${res.environment_preset}</div>
        <div style="font-size:11px;color:#1e3a8a;background:#e0f2fe;padding:6px;border-radius:4px;">
          🏷️ <strong>Editorial Notice:</strong> ${res.editorial_ethics?.provenance || "AI Illustrative Visual"}
        </div>
      `;
    }
  }

  function displayAiVideoResult(res) {
    currentCleanResult = res;

    $("ai-preview-placeholder")?.classList.add("hidden");
    $("ai-preview-active")?.classList.remove("hidden");
    $("ai-img-container")?.classList.add("hidden");
    $("ai-vid-container")?.classList.remove("hidden");

    const vid = $("ai-result-video");
    if (vid) {
      vid.src = res.clean_video_url;
      vid.load();
    }
    if ($("ai-btn-download-clean")) {
      $("ai-btn-download-clean").href = res.clean_video_url;
      $("ai-btn-download-clean").download = `clean-footage-${res.id}.mp4`;
    }
    if ($("ai-btn-download-branded")) {
      $("ai-btn-download-branded").href = res.clean_video_url;
      $("ai-btn-download-branded").download = `ilovefinland-reel-${res.id}.mp4`;
    }

    const metaBox = $("ai-meta-specs");
    if (metaBox) {
      metaBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <strong>${res.model_name}</strong>
          <span class="badge badge-success">${res.resolution} · ${res.duration_sec}s @ ${res.framerate}fps · ${res.file_size_mb} MB</span>
        </div>
        <div style="font-size:11px;color:#555;margin-bottom:6px;"><strong>Camera movement:</strong> ${res.camera_movement} · <strong>Motion Physics:</strong> Realistic wheel rotation & snow spray</div>
        <div style="font-size:11px;color:#1e3a8a;background:#e0f2fe;padding:6px;border-radius:4px;">
          🏷️ <strong>Editorial Notice:</strong> ${res.editorial_ethics?.provenance || "Google Veo Illustrative Scene"}
        </div>
      `;
    }
  }

  async function applyAiImageToFeaturedStory() {
    if (!currentCleanResult || !currentPackageId) return;
    try {
      const art = packagesData[currentPackageId]?.article;
      if (!art) return;
      const updated = await api("/api/package/upload-featured-image", {
        method: "POST",
        body: JSON.stringify({
          package_id: currentPackageId,
          image_data: {
            url: currentCleanResult.clean_image_url,
            photographer: `Generated via ${currentCleanResult.model_name}`,
            agency: "Google Gemini / ILoveFinland Studio",
            source_url: currentCleanResult.clean_image_url,
            licence: "Illustrative Concept / Studio Cleared",
            alt_text: `Photographic concept visual: ${currentCleanResult.prompt}`,
            caption: `Illustrative photographic image depicting ${currentCleanResult.prompt}.`,
          },
        }),
      });
      await loadPackage(currentPackageId);
      alert("✅ AI Photographic Image applied as Article Featured Image!");
      switchView("review");
    } catch (e) {
      alert(`Failed to apply to story: ${e.message}`);
    }
  }

  async function applyAiImageToStaticPost() {
    if (!currentCleanResult || !currentPackageId) return;
    try {
      await api("/api/package/adjust-static-post", {
        method: "POST",
        body: JSON.stringify({
          package_id: currentPackageId,
          adjustments: {
            photo_url: currentCleanResult.clean_image_url,
          },
        }),
      });
      await loadPackage(currentPackageId);
      alert("✅ AI Photographic Image applied as Static Post Background!");
      switchView("review");
    } catch (e) {
      alert(`Failed to apply to post: ${e.message}`);
    }
  }

  async function applyAiVideoToReel() {
    const videoUrl = currentCleanResult?.video_url || (currentCleanResult?.clean_image_url && /\.(mp4|mov|webm)$/i.test(currentCleanResult.clean_image_url) ? currentCleanResult.clean_image_url : null);
    if (!videoUrl || !currentPackageId) {
      alert("No video clip is currently available in the output preview. Generate or upload a video clip first.");
      return;
    }
    try {
      await api("/api/package/add-reel-clip", {
        method: "POST",
        body: JSON.stringify({
          package_id: currentPackageId,
          clip_data: {
            url: videoUrl,
            filename: "veo_motion_scene.mp4",
            duration: currentCleanResult.duration_sec || 6.0,
            credit: `Visuals: ${currentCleanResult.model_name || "Google Veo AI Engine"}`,
          },
        }),
      });
      await loadPackage(currentPackageId);
      alert("✅ Video applied to Reel sequence! Switched to Reel Review.");
      switchView("review");
      document.querySelector('[data-subtab="reel"]')?.click();
    } catch (e) {
      alert(`Failed to apply video to Reel: ${e.message}`);
    }
  }

  function openAiStudioFromStory() {
    switchView("ai-media");
    const art = packagesData[currentPackageId]?.article;
    if (art && $("ai-prompt-input")) {
      $("ai-prompt-input").value = `${art.headline}. ${art.short_description || ''}`;
      if (art.featured_image?.url) {
        currentUploadedRefUrl = art.featured_image.url;
        if ($("ai-ref-preview-img")) $("ai-ref-preview-img").src = art.featured_image.url;
        if ($("ai-ref-name")) $("ai-ref-name").textContent = "Story Featured Image";
        $("ai-ref-preview-wrap")?.classList.remove("hidden");
      }
    }
  }

  /* ---------- EVENT WIRING ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initPlayer();
    setupClipsUpload();
    initScenesCollapse();
    initStoryboardControls();
    $("btn-quick-ai-photo")?.addEventListener("click", openAiStudioFromStory);
    document.querySelectorAll(".voice-bar").forEach(initVoiceBar);

    // Revision Target Checkbox styling sync
    ["rev-target-article", "rev-target-post", "rev-target-reel"].forEach((id) => {
      const chk = $(id);
      if (chk) {
        const updatePill = () => {
          const parent = chk.closest(".rev-target-pill");
          if (!parent) return;
          if (chk.checked) {
            parent.style.borderColor = "#3b82f6";
            parent.style.background = "#eff6ff";
            parent.style.color = "#1e40af";
          } else {
            parent.style.borderColor = "#cbd5e1";
            parent.style.background = "#fff";
            parent.style.color = "#64748b";
          }
        };
        chk.addEventListener("change", updatePill);
        updatePill();
      }
    });

    $("btn-google-signin").addEventListener("click", signIn);
    $("btn-key-signin").addEventListener("click", signInWithKey);
    $("btn-logout").addEventListener("click", signOut);

    // Mobile Drawer Hamburger Toggle & Backdrop
    const toggleSidebar = (force) => {
      const drawer = $("sidebar-drawer");
      const backdrop = $("sidebar-backdrop");
      if (!drawer || !backdrop) return;
      const willOpen = typeof force === "boolean" ? force : !drawer.classList.contains("open");
      drawer.classList.toggle("open", willOpen);
      backdrop.classList.toggle("hidden", !willOpen);
    };

    $("btn-sidebar-toggle")?.addEventListener("click", () => toggleSidebar(true));
    $("btn-close-sidebar")?.addEventListener("click", () => toggleSidebar(false));
    $("sidebar-backdrop")?.addEventListener("click", () => toggleSidebar(false));
    $("mobile-brand-link")?.addEventListener("click", () => {
      toggleSidebar(false);
      switchView("projects");
    });
    $("btn-mobile-new-story")?.addEventListener("click", () => {
      toggleSidebar(false);
      switchView("assignments");
    });

    document.querySelectorAll(".nav-item, .bnav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggleSidebar(false);
        switchView(btn.dataset.view);
      });
    });

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const t = btn.dataset.tab;
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
        const target = $("panel-" + t);
        if (target) {
          target.classList.remove("hidden");
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    $("package-selector").addEventListener("change", (e) => loadPackage(parseInt(e.target.value, 10)));

    const toggleApproval = async (component) => {
      const decision = approvedNow[component] ? "pending" : "approved";
      bundle = await api("/api/package/approve", {
        method: "POST",
        body: JSON.stringify({ package_id: currentPackageId, component, decision, version: selectedVersion }),
      });
      renderReview();
    };
    for (const id of ["btn-approve-article", "btn-approve-article-m"]) {
      $(id).addEventListener("click", () => toggleApproval("article"));
    }
    for (const id of ["btn-approve-reel", "btn-approve-reel-m"]) {
      $(id).addEventListener("click", () => toggleApproval("reel"));
    }
    for (const id of ["btn-approve-ig", "btn-approve-ig-m"]) {
      $(id)?.addEventListener("click", () => toggleApproval("ig_post"));
    }

    $("btn-ig-prev")?.addEventListener("click", () => {
      if (!bundle) return;
      const curVerNum = selectedVersion || bundle.package.current_version;
      const v = bundle.versions.find((item) => item.version === curVerNum) || bundle.versions[bundle.versions.length - 1];
      if (currentIgSlide > 0) {
        currentIgSlide--;
        renderIgCarousel(v.ig_post);
      }
    });

    $("btn-ig-next")?.addEventListener("click", () => {
      if (!bundle) return;
      const curVerNum = selectedVersion || bundle.package.current_version;
      const v = bundle.versions.find((item) => item.version === curVerNum) || bundle.versions[bundle.versions.length - 1];
      if (v.ig_post && currentIgSlide < v.ig_post.slides.length - 1) {
        currentIgSlide++;
        renderIgCarousel(v.ig_post);
      }
    });

    $("btn-copy-caption")?.addEventListener("click", () => {
      if (!bundle) return;
      const curVerNum = selectedVersion || bundle.package.current_version;
      const v = bundle.versions.find((item) => item.version === curVerNum) || bundle.versions[bundle.versions.length - 1];
      if (v.ig_post?.caption) {
        navigator.clipboard.writeText(v.ig_post.caption);
        const textEl = $("copy-caption-text");
        if (textEl) {
          textEl.textContent = "Copied!";
          setTimeout(() => { textEl.textContent = "Copy Caption"; }, 1500);
        }
      }
    });

    $("btn-demo-csv")?.addEventListener("click", () => {
      $("csv-import-input").value = "Finland Winter Tire Rules,Instagram Carousel (4:5),48,,108,235,41,88";
    });

    $("btn-load-demo-ig")?.addEventListener("click", () => {
      $("assign-topic").value = "Finland Winter Tire Rules: Mandatory Starting November";
      $("assign-scope").value = "Both (Article + Instagram Post)";
      $("assign-scope").dispatchEvent(new Event("change"));
      $("assign-instructions").value = "Key angle: Legal requirement starting November, €100+ fine enforcement by police, studded vs friction tire tread depth (3.0mm min).";
      $("assign-links").value = "https://www.traficom.fi/en\nhttps://poliisi.fi/en";
      $("ig-slide-count").value = "3";
      $("ig-theme-select").value = "navy_frost";
    });

    const updateScopeUploadUI = () => {
      const scopeSelect = $("assign-scope");
      if (!scopeSelect) return;
      const val = scopeSelect.value;
      const hasReel = val === "Both" || val === "Reel" || val.includes("Reel");
      const hasIg = val === "Instagram Post" || val.includes("Instagram Post");
      const reelOptions = document.querySelector(".clips-editorial-box");
      if (reelOptions) {
        reelOptions.classList.toggle("hidden", !hasReel);
      }
      $("ig-post-section")?.classList.toggle("hidden", !hasIg);

      const titleEl = $("clips-section-title");
      const hintEl = $("clips-section-hint");
      const dropText = document.querySelector("#clip-dropzone .dropzone-text");
      if (!hasReel) {
        if (titleEl) titleEl.innerHTML = `<svg class="lucide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Primary Featured Photo for Article &amp; Post (JPG, PNG, WebP)`;
        if (hintEl) hintEl.innerHTML = `Attach your authentic primary photo. It is automatically set as the featured image for WordPress and your Instagram post card.`;
        if (dropText && uploadedClips.length === 0) {
          dropText.innerHTML = `<strong>Choose Primary Featured Photo</strong> from phone photo library or computer <span class="hint-inline">(drag &amp; drop or tap to browse JPG, PNG, WebP)</span>`;
        }
      } else {
        if (titleEl) titleEl.innerHTML = `<svg class="lucide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Upload Photos or Video Clips (JPG, PNG, WebP, MP4, MOV)`;
        if (hintEl) hintEl.innerHTML = `Upload your own authentic photos (used as featured image and reel stills) or video clips (used for Reels). Drag &amp; drop or tap to browse.`;
        if (dropText && uploadedClips.length === 0) {
          dropText.innerHTML = `<strong>Choose Photos or Video Clips</strong> from phone photo library or computer <span class="hint-inline">(drag &amp; drop or tap to browse JPG, PNG, MP4, MOV)</span>`;
        }
      }
    };

    $("assign-scope")?.addEventListener("change", updateScopeUploadUI);
    // Initialize scope UI state
    setTimeout(updateScopeUploadUI, 50);

    $("btn-claude-article")?.addEventListener("click", async () => {
      if (!currentPackageId) return;
      const btn = $("btn-claude-article");
      const orig = btn ? btn.innerHTML : "";
      if (btn) btn.innerHTML = "⏳ Rewriting Article with AI…";
      try {
        bundle = await api("/api/package/rewrite-claude", {
          method: "POST",
          body: JSON.stringify({ package_id: currentPackageId, scope: "article" }),
        });
        selectedVersion = bundle.package.current_version;
        renderReview();
        populateDirectEditorFields();
      } catch (err) {
        alert(`Failed to rewrite article: ${err.message}`);
      } finally {
        if (btn) btn.innerHTML = orig;
      }
    });

    $("btn-claude-reel")?.addEventListener("click", async () => {
      if (!currentPackageId) return;
      const btn = $("btn-claude-reel");
      const orig = btn ? btn.innerHTML : "";
      if (btn) btn.innerHTML = "⏳ Rewriting Reel Script…";
      try {
        bundle = await api("/api/package/rewrite-claude", {
          method: "POST",
          body: JSON.stringify({ package_id: currentPackageId, scope: "reel_script" }),
        });
        selectedVersion = bundle.package.current_version;
        renderReview();
      } catch (err) {
        alert(`Failed to rewrite reel script: ${err.message}`);
      } finally {
        if (btn) btn.innerHTML = orig;
      }
    });

    const triggerPolishCaption = async () => {
      if (!currentPackageId) return;
      const btnTop = $("btn-claude-caption-top");
      const btnBottom = $("btn-claude-caption-bottom");
      if (btnTop) btnTop.innerHTML = "⏳ Polishing with ChatGPT…";
      if (btnBottom) btnBottom.innerHTML = "⏳ Polishing with ChatGPT…";
      try {
        bundle = await api("/api/package/rewrite-claude", {
          method: "POST",
          body: JSON.stringify({ package_id: currentPackageId, scope: "caption" }),
        });
        selectedVersion = bundle.package.current_version;
        renderReview();
      } catch (err) {
        alert(`Failed to polish caption: ${err.message}`);
      } finally {
        if (btnTop) btnTop.innerHTML = "✨ Polish Caption with ChatGPT";
        if (btnBottom) btnBottom.innerHTML = "✨ Polish Caption with ChatGPT";
      }
    };
    $("btn-claude-caption-top")?.addEventListener("click", triggerPolishCaption);
    $("btn-claude-caption-bottom")?.addEventListener("click", triggerPolishCaption);

    document.querySelectorAll(".chip-btn").forEach((c) => {
      c.addEventListener("click", () => {
        $("comment-input").value = c.dataset.comment || "";
      });
    });

    let attachedFeedbackClip = null;

    // Attach custom video clip or photo for Feedback & Revision
    $("feedback-clip-file")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const isVideo = file.type.startsWith("video/");
      const isImg = file.type.startsWith("image/");
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const res = await api("/api/upload/media-clip", {
            method: "POST",
            body: JSON.stringify({
              data_base64: reader.result,
              filename: file.name,
              media_type: isVideo ? "video" : "image",
              credit: "Visuals: Contributed Footage",
            }),
          });

          attachedFeedbackClip = {
            url: res.url,
            filename: file.name,
            size_mb: res.size_mb,
            media_type: res.media_type,
            credit: res.credit,
          };

          if ($("feedback-clip-name")) $("feedback-clip-name").textContent = file.name;
          if ($("feedback-clip-meta")) {
            $("feedback-clip-meta").textContent = `${res.size_mb} MB · ${isVideo ? "Video Clip" : "Photo"} ready to stitch into new Reel revision`;
          }

          if (isVideo) {
            if ($("feedback-clip-thumb")) {
              $("feedback-clip-thumb").src = res.url;
              $("feedback-clip-thumb").style.display = "block";
            }
            if ($("feedback-img-thumb")) $("feedback-img-thumb").style.display = "none";
          } else if (isImg) {
            if ($("feedback-img-thumb")) {
              $("feedback-img-thumb").src = res.url;
              $("feedback-img-thumb").style.display = "block";
            }
            if ($("feedback-clip-thumb")) $("feedback-clip-thumb").style.display = "none";
          }

          $("feedback-clip-preview-wrap")?.classList.remove("hidden");
          $("btn-feedback-clear-clip")?.classList.remove("hidden");
        } catch (err) {
          alert(`Failed to upload media clip: ${err.message}`);
        }
      };
      reader.readAsDataURL(file);
    });

    $("btn-feedback-clear-clip")?.addEventListener("click", () => {
      attachedFeedbackClip = null;
      if ($("feedback-clip-file")) $("feedback-clip-file").value = "";
      $("feedback-clip-preview-wrap")?.classList.add("hidden");
      $("btn-feedback-clear-clip")?.classList.add("hidden");
      if ($("feedback-clip-thumb")) {
        $("feedback-clip-thumb").src = "";
        $("feedback-clip-thumb").style.display = "none";
      }
      if ($("feedback-img-thumb")) {
        $("feedback-img-thumb").src = "";
        $("feedback-img-thumb").style.display = "none";
      }
    });

    // Direct Reel Editor: Upload Video Clip directly
    $("direct-reel-clip-file")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const statusEl = $("direct-reel-clip-status");
      if (statusEl) {
        statusEl.textContent = `Uploading ${file.name}...`;
        statusEl.classList.remove("hidden");
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await api("/api/upload/media-clip", {
            method: "POST",
            body: JSON.stringify({
              data_base64: reader.result,
              filename: file.name,
              media_type: "video",
              credit: "Visuals: User Contributed Clip",
            }),
          });

          bundle = await api("/api/package/add-reel-clip", {
            method: "POST",
            body: JSON.stringify({
              package_id: currentPackageId,
              clip_data: {
                url: res.url,
                filename: file.name,
                duration: 6.0,
                credit: "Visuals: User Contributed Clip",
              },
            }),
          });

          if (statusEl) {
            statusEl.textContent = `✅ Attached "${file.name}" to Reel sequence!`;
            setTimeout(() => statusEl.classList.add("hidden"), 3500);
          }
          renderReview();
        } catch (err) {
          if (statusEl) statusEl.textContent = `Upload failed: ${err.message}`;
          alert(`Failed to upload clip: ${err.message}`);
        }
      };
      reader.readAsDataURL(file);
    });

    $("comment-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = $("comment-input").value.trim();
      if (!text && !attachedFeedbackClip) {
        alert("Please provide feedback notes, record a voice note, or attach a video clip.");
        return;
      }
      const voiceBar = document.querySelector('[data-voice-for="comment-input"]');
      const feedbackComment = text || (attachedFeedbackClip ? `Attached custom video clip: ${attachedFeedbackClip.filename}` : "Feedback revision");

      const selectedTargets = [];
      if ($("rev-target-article")?.checked) selectedTargets.push("article");
      if ($("rev-target-post")?.checked) selectedTargets.push("post");
      if ($("rev-target-reel")?.checked) selectedTargets.push("reel");

      if (selectedTargets.length === 0) {
        alert("Please tick at least one component to revise (Article, Static Post, or Reel).");
        return;
      }

      bundle = await api("/api/package/comment", {
        method: "POST",
        body: JSON.stringify({
          package_id: currentPackageId,
          target: selectedTargets.join("+"),
          targets: selectedTargets,
          comment: feedbackComment,
          has_voice_note: voiceBar?.dataset?.hasVoice === "1",
          attached_clip: attachedFeedbackClip,
        }),
      });

      selectedVersion = bundle.package.current_version;
      $("comment-input").value = "";

      // Reset attachment preview
      attachedFeedbackClip = null;
      if ($("feedback-clip-file")) $("feedback-clip-file").value = "";
      $("feedback-clip-preview-wrap")?.classList.add("hidden");
      $("btn-feedback-clear-clip")?.classList.add("hidden");

      renderReview();
    });

    $("btn-save-schedule").addEventListener("click", async () => {
      $("schedule-msg").textContent = "";
      try {
        bundle = await api("/api/package/schedule", {
          method: "POST",
          body: JSON.stringify({
            package_id: currentPackageId,
            article_publish_at: $("sched-article-dt").value || null,
            reel_publish_at: $("sched-reel-dt").value || null,
          }),
        });
        $("schedule-msg").textContent = "Scheduled (Simulated) in Europe/Helsinki.";
      } catch (err) {
        $("schedule-msg").textContent = err.message;
      }
    });

    // Assignments form submit
    $("assignment-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = $("assignment-form").querySelector("button[type='submit']");
      const origBtnHtml = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳ Drafting Story with AI...</span>`;
      }

      try {
        const scope = $("assign-scope").value;
        const links = $("assign-links").value.split("\n").map((s) => s.trim()).filter(Boolean);
        const voiceBar = document.querySelector('[data-voice-for="assign-instructions"]');

        const photos = uploadedClips.filter((c) => c.media_type === "image" || /\.(jpe?g|png|webp|heic|gif)$/i.test(c.filename));
        const videoClips = uploadedClips.filter((c) => c.media_type !== "image" && !/\.(jpe?g|png|webp|heic|gif)$/i.test(c.filename));

        let customPhoto = null;
        if (photos.length > 0) {
          const p = photos[0];
          customPhoto = {
            url: p.url,
            filename: p.filename,
            photographer: "ILF",
            credit_string: "Photo: ILF",
            source_url: "https://ilovefinland.net",
            licence: "Editorial Rights (ILF)",
            alt_text: p.alt_text || $("assign-topic").value.trim() || p.filename.replace(/\.[^.]+$/, ""),
            caption: `Photo for ${$("assign-topic").value.trim()}`,
          };
        }

        let customAdditionalPhoto = null;
        if (photos.length > 1) {
          const p2 = photos[1];
          customAdditionalPhoto = {
            url: p2.url,
            filename: p2.filename,
            photographer: "ILF",
            credit_string: "Photo: ILF",
            source_url: "https://ilovefinland.net",
            licence: "Editorial Rights (ILF)",
            alt_text: p2.alt_text || $("assign-topic").value.trim() || p2.filename.replace(/\.[^.]+$/, ""),
            caption: `Additional photo for ${$("assign-topic").value.trim()}`,
          };
        }

        const targetLength = $("clip-target-length") ? parseInt($("clip-target-length").value, 10) : 15;
        const audioMode = $("clip-audio-mode") ? $("clip-audio-mode").value : "authentic_source_and_music";
        const openingShot = $("clip-opening-select") ? $("clip-opening-select").value : "Clip 1";

        const isReelRequested = scope === "Reel" || scope === "Both" || /(?:IMAGE|SCENE|CLIP|SLIDE)\s+\d+/i.test($("assign-instructions").value);

        const payload = {
          topic: $("assign-topic").value.trim(),
          scope,
          instructions: $("assign-instructions").value.trim(),
          links,
          deadline_at: $("assign-deadline").value,
          has_voice_note: voiceBar ? voiceBar.dataset.hasVoice === "1" : false,
          custom_photo: customPhoto,
          custom_additional_photo: customAdditionalPhoto,
          clips: isReelRequested && uploadedClips.length > 0 ? uploadedClips : undefined,
          target_length_sec: targetLength,
          audio_mode: audioMode,
          opening_shot_note: openingShot,
        };

        const created = await api("/api/assignments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        currentPackageId = created.package.id;
        uploadedClips = [];
        renderUploadedClips();
        await loadAll();
        switchView("review");
      } catch (err) {
        alert(`Failed to draft assignment: ${err.message}`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
      }
    });

    // Calendar view & filter wiring
    document.querySelectorAll(".cal-mode").forEach((b) => {
      b.addEventListener("click", () => {
        calendarMode = b.dataset.cal;
        renderCalendar();
      });
    });

    ["cal-filter-channel", "cal-filter-format", "cal-filter-status"].forEach((id) => {
      $(id).addEventListener("change", renderCalendar);
    });

    $("btn-refresh-plan").addEventListener("click", loadWeeklyPlan);

    // Research search
    $("btn-search-sources").addEventListener("click", loadResearch);
    $("source-search-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadResearch();
    });

    // Toggle / Cancel / Save Custom Official Source
    $("btn-toggle-add-source")?.addEventListener("click", () => {
      const wrap = $("add-source-form-wrap");
      if (wrap) wrap.classList.toggle("hidden");
    });

    $("btn-cancel-add-source")?.addEventListener("click", () => {
      $("add-source-form-wrap")?.classList.add("hidden");
    });

    $("btn-save-new-source")?.addEventListener("click", async () => {
      const outlet = $("new-src-outlet")?.value?.trim() || "Official Finnish Source";
      const category = $("new-src-category")?.value?.trim() || "General Civic";
      const title = $("new-src-title")?.value?.trim();
      const url = $("new-src-url")?.value?.trim();
      const claim = $("new-src-claim")?.value?.trim() || "";

      if (!title || !url) {
        alert("Please provide at least a source Title and URL.");
        return;
      }

      try {
        await api("/api/research/sources/create", {
          method: "POST",
          body: JSON.stringify({ outlet, category, title, url, claim }),
        });
        if ($("new-src-outlet")) $("new-src-outlet").value = "";
        if ($("new-src-category")) $("new-src-category").value = "";
        if ($("new-src-title")) $("new-src-title").value = "";
        if ($("new-src-url")) $("new-src-url").value = "";
        if ($("new-src-claim")) $("new-src-claim").value = "";
        $("add-source-form-wrap")?.classList.add("hidden");
        loadResearch();
      } catch (err) {
        alert(`Failed to save official source: ${err.message}`);
      }
    });

    // Performance CSV import
    $("btn-import-csv").addEventListener("click", async () => {
      const csvText = $("csv-import-input").value.trim();
      if (!csvText) return;
      await api("/api/performance/import", { method: "POST", body: JSON.stringify({ csv: csvText }) });
      loadPerformance();
    });

    // Direct Reel Editor setup
    setupDirectReelEditor();

    // Clipboard copy helper with reliable execCommand fallback
    const copyToClipboard = async (text, btnEl, successLabel = "Copied!") => {
      if (text === undefined || text === null) text = "";
      let success = false;

      // 1. Try modern Async Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          success = true;
        } catch (err) {
          console.warn("navigator.clipboard.writeText failed, falling back:", err);
        }
      }

      // 2. Fallback for iOS / Safari / unsecure or restricted contexts
      if (!success) {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          ta.style.top = "0";
          ta.style.opacity = "0";
          ta.setAttribute("readonly", "");
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          ta.setSelectionRange(0, 99999);
          success = document.execCommand("copy");
          document.body.removeChild(ta);
        } catch (err2) {
          console.error("execCommand fallback failed:", err2);
        }
      }

      if (btnEl) {
        const original = btnEl.innerHTML;
        btnEl.innerHTML = success ? `✓ ${successLabel}` : `⚠️ Copy failed`;
        setTimeout(() => { btnEl.innerHTML = original; }, 1800);
      }
      return success;
    };

    // Generic copy buttons (supports input, textarea, select, links, and text elements)
    document.addEventListener("click", (e) => {
      const copyBtn = e.target.closest(".btn-copy-field, .btn-copy-field-mini");
      if (!copyBtn) return;
      const targetId = copyBtn.dataset.copyTarget;
      if (!targetId) return;
      const targetEl = $(targetId);
      if (!targetEl) return;
      let val = "";
      if (targetEl.tagName === "INPUT" || targetEl.tagName === "TEXTAREA" || targetEl.tagName === "SELECT") {
        val = targetEl.value;
      } else if (targetEl.tagName === "A" && targetEl.href && !targetEl.href.endsWith("#")) {
        val = targetEl.href;
      } else {
        val = targetEl.innerText || targetEl.textContent || "";
      }
      copyToClipboard(val, copyBtn);
    });

    // Dedicated listeners for social post caption and hashtags
    $("btn-copy-static-caption")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = $("static-edit-caption")?.value || "";
      copyToClipboard(val, $("btn-copy-static-caption"), "Caption + Tags Copied!");
    });
    $("btn-copy-static-hashtags")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = $("static-edit-hashtags")?.value || "";
      copyToClipboard(val, $("btn-copy-static-hashtags"), "Hashtags Copied!");
    });

    // WordPress Visual / Code tabs
    $("wp-tab-visual")?.addEventListener("click", () => {
      $("wp-tab-visual").classList.add("active");
      $("wp-tab-code")?.classList.remove("active");
      $("wp-visual-view")?.classList.remove("hidden");
      $("wp-code-view")?.classList.add("hidden");
    });
    $("wp-tab-code")?.addEventListener("click", () => {
      $("wp-tab-code").classList.add("active");
      $("wp-tab-visual")?.classList.remove("active");
      $("wp-code-view")?.classList.remove("hidden");
      $("wp-visual-view")?.classList.add("hidden");
    });

    // Copy formatted visual article (Rich text HTML + Plain text)
    $("btn-copy-visual-article")?.addEventListener("click", async () => {
      const visualEl = $("article-body-visual");
      const btn = $("btn-copy-visual-article");
      if (!visualEl) return;
      try {
        const html = visualEl.innerHTML;
        const plain = visualEl.innerText;
        const blobHtml = new Blob([html], { type: "text/html" });
        const blobPlain = new Blob([plain], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobPlain,
          }),
        ]);
        if (btn) {
          const orig = btn.innerHTML;
          btn.innerHTML = "✓ Formatted Article Copied for WordPress!";
          setTimeout(() => { btn.innerHTML = orig; }, 1800);
        }
      } catch (err) {
        copyToClipboard(visualEl.innerText, btn, "Article Copied (Plain)!");
      }
    });

    // Copy raw HTML for WordPress Code Editor
    $("btn-copy-html-article")?.addEventListener("click", () => {
      const codeArea = $("wp-code-textarea");
      const btn = $("btn-copy-html-article");
      if (codeArea) {
        copyToClipboard(codeArea.value, btn, "HTML Copied!");
      }
    });

    // Copy full credit, sources, internal links
    $("btn-copy-full-credit")?.addEventListener("click", () => {
      const val = $("wp-field-img-credit")?.value || "";
      copyToClipboard(val, $("btn-copy-full-credit"));
    });
    $("btn-copy-addl-credit")?.addEventListener("click", () => {
      const val = $("wp-field-add-credit")?.value || $("wp-field-addl-credit")?.value || "";
      copyToClipboard(val, $("btn-copy-addl-credit"));
    });
    $("btn-copy-all-sources")?.addEventListener("click", () => {
      const art = (bundle && bundle.versions) ? (bundle.versions.find((v) => v.version === selectedVersion) || bundle.versions[bundle.versions.length - 1] || {}).article || {} : {};
      const sources = (art.sources || []).map((s) => typeof s === "string" ? s : `${s.label || s.title || ""}: ${s.url || ""}`).join("\n");
      copyToClipboard(sources, $("btn-copy-all-sources"), "All Sources Copied!");
    });
    $("btn-copy-internal-links")?.addEventListener("click", () => {
      const art = (bundle && bundle.versions) ? (bundle.versions.find((v) => v.version === selectedVersion) || bundle.versions[bundle.versions.length - 1] || {}).article || {} : {};
      const links = (art.related_internal_links || []).map((l) => typeof l === "string" ? l : `${l.label || l.title || ""}: ${l.url || ""}`).join("\n");
      copyToClipboard(links, $("btn-copy-internal-links"), "Internal Links Copied!");
    });

    document.addEventListener("click", (e) => {
      const singleCopyBtn = e.target.closest(".btn-copy-single");
      if (singleCopyBtn && singleCopyBtn.dataset.copyVal) {
        copyToClipboard(singleCopyBtn.dataset.copyVal, singleCopyBtn, "Copied!");
      }
    });

    // Mobile Direct "Save to Photos" & Camera Roll Helper
    let activeModalBlob = null;
    let activeModalFilename = "ilovefinland-photo.jpg";

    async function saveImageDirectlyToMobilePhotos(srcOrCanvas, filename = "ilovefinland-post.jpg", mime = "image/jpeg", title = "ILoveFinland Media") {
      let blob = null;
      let dataUrl = "";

      try {
        if (srcOrCanvas instanceof HTMLCanvasElement) {
          dataUrl = srcOrCanvas.toDataURL(mime, 0.95);
          const res = await fetch(dataUrl);
          blob = await res.blob();
        } else if (typeof srcOrCanvas === "string") {
          if (srcOrCanvas.startsWith("data:")) {
            dataUrl = srcOrCanvas;
            const res = await fetch(srcOrCanvas);
            blob = await res.blob();
          } else {
            const res = await fetch(srcOrCanvas);
            blob = await res.blob();
            dataUrl = URL.createObjectURL(blob);
          }
        } else if (srcOrCanvas instanceof Blob) {
          blob = srcOrCanvas;
          dataUrl = URL.createObjectURL(blob);
        }
      } catch (err) {
        console.error("Error preparing image for mobile photos:", err);
      }

      activeModalBlob = blob;
      activeModalFilename = filename;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.innerWidth < 1024);

      // Method 1: Web Share API (Triggers native iOS "Save Image" straight to Apple Photos)
      if (blob && navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: mime });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: title || "ILoveFinland Post",
              text: "Save to Camera Roll / Photos or share to Instagram / Facebook",
            });
            return;
          }
        } catch (shareErr) {
          if (shareErr.name === "AbortError") return; // User intentionally dismissed share sheet
          console.warn("navigator.share unavailable or cancelled:", shareErr);
        }
      }

      // Method 2: Mobile Tap & Hold Viewer Modal (Works 100% on any iPhone or Android phone)
      if (isMobile) {
        const modal = $("modal-save-to-photos");
        const modalImg = $("save-photos-modal-img");
        if (modal && modalImg) {
          modalImg.src = dataUrl;
          modal.classList.remove("hidden");
        }
        return;
      }

      // Method 3: Desktop fallback standard file download
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Modal Save to Photos buttons
    $("btn-close-save-photos")?.addEventListener("click", () => $("modal-save-to-photos")?.classList.add("hidden"));
    $("btn-close-save-photos-done")?.addEventListener("click", () => $("modal-save-to-photos")?.classList.add("hidden"));
    $("btn-save-photos-native-share")?.addEventListener("click", async () => {
      if (activeModalBlob && navigator.canShare) {
        try {
          const file = new File([activeModalBlob], activeModalFilename, { type: "image/jpeg" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "ILoveFinland Post" });
          }
        } catch (e) {
          console.warn("Native share cancelled or failed:", e);
        }
      }
    });

    // Mobile "Save to Photos" direct buttons for Featured Image and Additional Image
    $("btn-save-photos-featured")?.addEventListener("click", () => {
      const imgPrev = $("wp-feat-img-preview");
      const srcUrl = imgPrev ? imgPrev.getAttribute("src") : "/assets/sample-clips/tesla-clean-bg.jpg";
      saveImageDirectlyToMobilePhotos(srcUrl, "ilovefinland-featured-photo.jpg", "image/jpeg", "Featured Article Photo");
    });

    $("btn-save-photos-addl")?.addEventListener("click", () => {
      const imgPrev = $("wp-add-img-preview");
      const srcUrl = imgPrev ? imgPrev.getAttribute("src") : "";
      if (srcUrl) {
        saveImageDirectlyToMobilePhotos(srcUrl, "ilovefinland-additional-photo.jpg", "image/jpeg", "Additional Article Photo");
      }
    });

    // Mobile "Save to Photos" direct buttons for Social Formats
    $("btn-save-photos-45")?.addEventListener("click", () => {
      saveImageDirectlyToMobilePhotos($("static-post-canvas"), "ilovefinland-feed-post-1080x1350.jpg", "image/jpeg", "Instagram & Facebook Feed Post");
    });

    $("btn-save-photos-fb")?.addEventListener("click", () => {
      saveImageDirectlyToMobilePhotos($("static-fb-canvas"), "ilovefinland-facebook-landscape-1200x630.jpg", "image/jpeg", "Facebook Landscape Post");
    });

    $("btn-save-photos-crop")?.addEventListener("click", () => {
      saveImageDirectlyToMobilePhotos($("static-crop-canvas"), "ilovefinland-profile-grid-crop.jpg", "image/jpeg", "Instagram Profile Grid Crop");
    });

    // Social Formats Switch Tabs
    document.querySelectorAll(".social-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".social-tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const targetId = btn.dataset.formatTarget;
        document.querySelectorAll(".format-col").forEach((col) => {
          col.classList.toggle("active-format", col.id === targetId);
        });
        // Also highlight matching guide item
        const guideFeed = $("guide-item-feed");
        const guideFb = $("guide-item-fb");
        const guideCrop = $("guide-item-crop");
        guideFeed?.classList.toggle("active-guide", targetId === "format-view-feed");
        guideFb?.classList.toggle("active-guide", targetId === "format-view-fb");
        guideCrop?.classList.toggle("active-guide", targetId === "format-view-crop");
      });
    });

    // Featured Image & Additional Image Downloads
    document.addEventListener("click", (e) => {
      const dlBtn = e.target.closest(".btn-download-img");
      if (!dlBtn) return;
      const fmt = dlBtn.dataset.format || "jpeg";
      const isAddl = dlBtn.id.includes("addl") || dlBtn.id.includes("add-");
      const imgPrev = isAddl ? $("wp-add-img-preview") : $("wp-feat-img-preview");
      const srcUrl = imgPrev ? imgPrev.getAttribute("src") : "/assets/sample-clips/tesla-clean-bg.jpg";
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // If tapped on mobile phone, divert to Save to Photos helper so it goes directly to Gallery/Photos!
      if (isMobile) {
        saveImageDirectlyToMobilePhotos(srcUrl, `ilovefinland-${isAddl ? "additional" : "featured"}-photo.${fmt === "jpeg" ? "jpg" : fmt}`, `image/${fmt === "jpg" ? "jpeg" : fmt}`, "Story Photo");
        return;
      }

      const dlUrl = `/api/media/download-image?url=${encodeURIComponent(srcUrl)}&format=${fmt}`;
      const link = document.createElement("a");
      link.href = dlUrl;
      link.download = `ilovefinland-${isAddl ? "additional" : "featured"}-photo.${fmt === "jpeg" ? "jpg" : fmt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // Static Post Canvas Downloads (4:5, Facebook Landscape 1200x630, and 3:4 profile grid crop)
    const downloadCanvas = (canvasId, filename, mime) => {
      const canvas = $(canvasId);
      if (!canvas) return;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        saveImageDirectlyToMobilePhotos(canvas, filename, mime, "ILoveFinland Post");
        return;
      }
      const dataUrl = canvas.toDataURL(mime, 0.95);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    $("btn-dl-static-45-jpg")?.addEventListener("click", () => {
      downloadCanvas("static-post-canvas", "ilovefinland-feed-post-1080x1350.jpg", "image/jpeg");
    });
    $("btn-dl-static-45-png")?.addEventListener("click", () => {
      downloadCanvas("static-post-canvas", "ilovefinland-feed-post-1080x1350.png", "image/png");
    });
    $("btn-dl-static-fb-jpg")?.addEventListener("click", () => {
      downloadCanvas("static-fb-canvas", "ilovefinland-facebook-landscape-1200x630.jpg", "image/jpeg");
    });
    $("btn-dl-static-fb-png")?.addEventListener("click", () => {
      downloadCanvas("static-fb-canvas", "ilovefinland-facebook-landscape-1200x630.png", "image/png");
    });
    $("btn-dl-static-34-jpg")?.addEventListener("click", () => {
      downloadCanvas("static-crop-canvas", "ilovefinland-profile-grid-crop.jpg", "image/jpeg");
    });
    $("btn-dl-static-34-png")?.addEventListener("click", () => {
      downloadCanvas("static-crop-canvas", "ilovefinland-profile-grid-crop.png", "image/png");
    });

    // Static Post Live Adjustments (scales Badge, Line 1, Line 2, Line 3 together)
    const updateStaticPostLive = () => {
      if (!currentStaticPost) return;
      currentStaticPost.badge_text = $("static-edit-badge")?.value || "NEWS";
      currentStaticPost.headline_line1 = $("static-edit-line1")?.value || "";
      currentStaticPost.headline_line2 = $("static-edit-line2")?.value || "";
      currentStaticPost.headline_line3 = $("static-edit-line3")?.value || "";
      currentStaticPost.cta_text = $("static-edit-cta")?.value || "";
      currentStaticPost.cta_color = $("static-edit-cta-color")?.value || "white";
      const fs = parseInt($("static-edit-fontsize")?.value, 10) || 32;
      currentStaticPost.line1_font_size = fs;
      currentStaticPost.line2_font_size = fs;
      currentStaticPost.line3_font_size = fs;
      const sizeVal = $("static-line2-size-val");
      if (sizeVal) sizeVal.textContent = `${fs}px`;
      drawStaticPostCanvases(currentStaticPost);
    };

    $("static-edit-badge")?.addEventListener("input", updateStaticPostLive);
    $("static-edit-line1")?.addEventListener("input", updateStaticPostLive);
    $("static-edit-line2")?.addEventListener("input", updateStaticPostLive);
    $("static-edit-line3")?.addEventListener("input", updateStaticPostLive);
    $("static-edit-cta")?.addEventListener("input", updateStaticPostLive);
    $("static-edit-cta-color")?.addEventListener("change", updateStaticPostLive);
    $("static-edit-fontsize")?.addEventListener("input", updateStaticPostLive);

    document.querySelectorAll(".btn-preset-static-cta").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ctaVal = btn.dataset.cta || "";
        const inp = $("static-edit-cta");
        if (inp) {
          inp.value = ctaVal;
          updateStaticPostLive();
        }
      });
    });

    $("btn-save-static-post")?.addEventListener("click", async () => {
      if (!currentPackageId || !currentStaticPost) return;
      const fs = parseInt($("static-edit-fontsize")?.value, 10) || 32;
      const adjustments = {
        badge_text: $("static-edit-badge")?.value || "NEWS",
        headline_line1: $("static-edit-line1")?.value || "",
        headline_line2: $("static-edit-line2")?.value || "",
        headline_line3: $("static-edit-line3")?.value || "",
        cta_text: $("static-edit-cta")?.value || "",
        cta_color: $("static-edit-cta-color")?.value || "white",
        line1_font_size: fs,
        line2_font_size: fs,
        line3_font_size: fs,
        caption: $("static-edit-caption")?.value || "",
        hashtags: ($("static-edit-hashtags")?.value || "").split(/\s+/).filter((h) => h.startsWith("#")),
      };
      const res = await api("/api/package/adjust-static-post", {
        method: "POST",
        body: JSON.stringify({ package_id: currentPackageId, adjustments }),
      });
      loadPackage(currentPackageId);
    });

    // Save Article Edits
    $("btn-save-article-edits")?.addEventListener("click", async () => {
      if (!currentPackageId) return;
      const fields = {
        headline: $("wp-field-headline")?.value || "",
        short_description: $("wp-field-dek")?.value || "",
        language: $("wp-field-lang")?.value || "English",
        section: $("wp-field-section")?.value || "News",
        category: $("wp-field-category")?.value || "Transport & Infrastructure",
        body_html: $("wp-code-textarea")?.value || "",
        region: $("wp-field-region")?.value || "Finland",
        city_location: $("wp-field-city")?.value || "",
        exact_address: $("wp-field-address")?.value || $("wp-field-place")?.value || "",
        event_datetime_venue: $("wp-field-event")?.value || "",
        tags: $("wp-field-tags")?.value || "",
        seo_title: $("wp-field-seo-title")?.value || "",
        meta_description: $("wp-field-meta-desc")?.value || "",
      };
      await api("/api/package/update-article", {
        method: "POST",
        body: JSON.stringify({ package_id: currentPackageId, fields }),
      });
      await loadPackage(currentPackageId);
      const btn = $("btn-save-article-edits");
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = "✓ Saved!";
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
      }
    });

    // Push Draft directly to WordPress
    $("btn-push-wordpress-draft")?.addEventListener("click", async () => {
      if (!currentPackageId) return;
      const btn = $("btn-push-wordpress-draft");
      const banner = $("wp-verification-banner");
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = "<span>⏳ Pushing to WordPress...</span>";
      try {
        const curVerNum = selectedVersion || (bundle ? bundle.package.current_version : 7);
        const res = await api("/api/package/publish-wordpress-draft", {
          method: "POST",
          body: JSON.stringify({ package_id: currentPackageId, version: curVerNum }),
        });
        if (banner) {
          banner.classList.remove("hidden");
          if (res.success) {
            banner.style.background = "#f0fdf4";
            banner.style.color = "#166534";
            banner.style.borderColor = "#86efac";
            banner.innerHTML = `<strong>✓ Draft Published to WordPress!</strong> Post ID: #${res.post_id}. <a href="${res.edit_url}" target="_blank" style="text-decoration:underline;font-weight:600;color:#15803d;margin-left:8px;">Open Post in WP Admin →</a>`;
          } else if (res.requires_setup) {
            banner.style.background = "#fff7ed";
            banner.style.color = "#9a3412";
            banner.style.borderColor = "#fdba74";
            banner.innerHTML = `
              <strong>WordPress REST Setup Needed for Direct Push:</strong>
              <div style="margin-top:6px;font-size:0.8rem;line-height:1.4;">
                ${escapeHtml(res.message)}<br/>
                1. In WP Admin: <em>Users → Profile → Application Passwords</em>.<br/>
                2. Create 'ILoveFinland Studio' and add to <code>.env</code> as <code>WP_APPLICATION_PASSWORD</code>.<br/>
                3. Meanwhile, use the <strong>📋 Copy</strong> buttons below to paste directly into WordPress.
              </div>
            `;
          } else {
            banner.style.background = "#fef2f2";
            banner.style.color = "#991b1b";
            banner.style.borderColor = "#fecaca";
            banner.innerHTML = `<strong>WordPress Push Notice:</strong> ${escapeHtml(res.error || res.message || "Failed to push draft")}`;
          }
        }
      } catch (err) {
        if (banner) {
          banner.classList.remove("hidden");
          banner.style.background = "#fef2f2";
          banner.style.color = "#991b1b";
          banner.innerHTML = `<strong>Error:</strong> ${escapeHtml(err.message)}`;
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });

    // Replacement photo upload
    $("input-upload-featured")?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !currentPackageId) return;
      const labelSpan = e.target.closest("label")?.querySelector("span");
      const origText = labelSpan ? labelSpan.innerHTML : "";
      if (labelSpan) labelSpan.innerHTML = "⏳ Uploading Replacement Photo…";
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await api("/api/package/upload-featured-image", {
          method: "POST",
          body: JSON.stringify({
            package_id: currentPackageId,
            image_data: {
              data_url: base64,
              filename: file.name,
              photographer: "ILF",
              source_url: "https://ilovefinland.net",
              licence: "Editorial Rights (ILF)",
              alt_text: $("wp-field-img-alt")?.value || file.name.replace(/\.[^.]+$/, ""),
            },
          }),
        });
        await loadPackage(currentPackageId);
        alert("✅ Replacement photo uploaded and set as featured image!");
      } catch (err) {
        alert(`Failed to upload replacement photo: ${err.message}`);
      } finally {
        if (labelSpan) labelSpan.innerHTML = origText || "📷 Upload Replacement Photo (Max 5 MB)";
        e.target.value = "";
      }
    });

    // On-Demand Reel Creation
    $("btn-create-reel-on-demand")?.addEventListener("click", async () => {
      if (!currentPackageId) return;
      const btn = $("btn-create-reel-on-demand");
      if (btn) btn.innerHTML = "⏳ Creating 9:16 Reel…";
      await api("/api/package/create-reel", {
        method: "POST",
        body: JSON.stringify({ package_id: currentPackageId }),
      });
      await loadPackage(currentPackageId);
    });

    // Export Clean Reel MP4
    $("btn-export-reel-mp4")?.addEventListener("click", () => {
      if (!currentPackageId) return;
      const dlUrl = `/api/package/export-mp4?package_id=${currentPackageId}`;
      const link = document.createElement("a");
      link.href = dlUrl;
      link.download = `ilovefinland-reel-${currentPackageId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // Projects Hub wiring
    $("btn-back-to-projects")?.addEventListener("click", () => switchView("projects"));
    $("btn-proj-new")?.addEventListener("click", () => switchView("assignments"));

    // Filter chips
    document.querySelectorAll(".proj-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".proj-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        currentProjFilter = chip.dataset.filter;
        renderProjectsTable();
      });
    });

    // Search input & format filter
    $("proj-search-input")?.addEventListener("input", renderProjectsTable);
    $("proj-format-filter")?.addEventListener("change", renderProjectsTable);

    // Edit Project Modal
    $("btn-close-edit-modal")?.addEventListener("click", () => {
      $("modal-edit-proj").classList.add("hidden");
    });
    $("btn-cancel-edit-proj")?.addEventListener("click", () => {
      $("modal-edit-proj").classList.add("hidden");
    });
    $("form-edit-proj")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = parseInt($("edit-proj-id").value, 10);
      const title = $("edit-proj-title").value.trim();
      const scope = $("edit-proj-scope").value;
      const deadline_at = $("edit-proj-deadline").value || null;

      await api("/api/projects/edit", {
        method: "POST",
        body: JSON.stringify({ id, title, scope, deadline_at }),
      });
      $("modal-edit-proj").classList.add("hidden");
      await loadProjects();
      const pkgsData = await api("/api/packages");
      const sel = $("package-selector");
      sel.innerHTML = pkgsData.packages
        .map((p) => `<option value="${p.id}" ${p.id === currentPackageId ? "selected" : ""}>#${p.id} ${p.title}</option>`)
        .join("");
    });

    // Suggestions & Ideas Pool Wiring
    $("tab-btn-active-pipeline")?.addEventListener("click", () => switchView("projects"));
    $("tab-btn-suggestions-pool")?.addEventListener("click", () => switchView("ideas"));
    $("btn-goto-ideas")?.addEventListener("click", () => switchView("ideas"));
    $("btn-back-to-projects")?.addEventListener("click", () => switchView("projects"));
    $("btn-scan-now")?.addEventListener("click", triggerScanNow);

    // Scope filter buttons (All, Finland First, International)
    document.querySelectorAll(".filter-idea-scope").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".filter-idea-scope").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        activeIdeaScope = b.dataset.scope || "all";
        renderIdeasCards(cachedSuggestions);
      });
    });

    // Website Section filter buttons (All, News, Finland Guide, Things to Do, Travel, Food & Restaurants, Events)
    document.querySelectorAll(".filter-idea-sec").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".filter-idea-sec").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        activeIdeaSection = b.dataset.sec || "all";
        renderIdeasCards(cachedSuggestions);
      });
    });

    const searchInput = $("ideas-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        activeIdeaSearch = e.target.value || "";
        renderIdeasCards(cachedSuggestions);
      });
    }

    // Export helpers for automation & testing
    window.loadPackage = loadPackage;
    window.switchView = switchView;
    window.loadResearch = loadResearch;
    window.loadWeeklyPlan = loadWeeklyPlan;
    window.loadIdeasPool = loadIdeasPool;
    window.triggerScanNow = triggerScanNow;
    window.renderReview = renderReview;
    window.loadAll = loadAll;

    // Cloud Auto-Sync Status & One-Click Sync
    async function checkCloudSyncStatus() {
      try {
        const res = await api("/api/cloud-sync/status");
        const deskBadge = $("desktop-sync-status-badge");
        const mobBadge = $("mobile-cloud-pill");
        if (!res || !res.enabled) return;

        if (res.is_syncing) {
          if (deskBadge) { deskBadge.textContent = "Syncing… ⏳"; deskBadge.className = "pill"; }
          if (mobBadge) { mobBadge.textContent = "☁️ Syncing… ⏳"; }
        } else if (res.pending_changes) {
          if (deskBadge) { deskBadge.textContent = "Changes Pending 🟡"; deskBadge.className = "pill"; }
          if (mobBadge) { mobBadge.textContent = "☁️ Pending 🟡"; }
        } else {
          if (deskBadge) { deskBadge.textContent = "Live 🟢"; deskBadge.className = "pill pill-approved"; }
          if (mobBadge) { mobBadge.textContent = "☁️ Synced 🟢"; }
        }
      } catch (e) {
        // quiet ignore
      }
    }

    async function triggerManualCloudSync() {
      const deskBadge = $("desktop-sync-status-badge");
      const mobBadge = $("mobile-cloud-pill");
      if (deskBadge) deskBadge.textContent = "Syncing… ⏳";
      if (mobBadge) mobBadge.textContent = "☁️ Syncing… ⏳";
      showToast("Syncing latest database to Cloud...", "info");
      try {
        const res = await api("/api/cloud-sync/push", {
          method: "POST",
          body: JSON.stringify({ reason: "Manual Sync from Studio" }),
        });
        if (res.ok) {
          showToast("Cloud synced! Render is deploying your updates.", "success");
          if (deskBadge) { deskBadge.textContent = "Live 🟢"; deskBadge.className = "pill pill-approved"; }
          if (mobBadge) mobBadge.textContent = "☁️ Synced 🟢";
        } else {
          showToast(res.error || "Sync error", "warning");
        }
      } catch (err) {
        showToast("Sync failed: " + err.message, "error");
      }
    }

    $("btn-cloud-sync-desktop")?.addEventListener("click", triggerManualCloudSync);
    $("mobile-cloud-pill")?.addEventListener("click", triggerManualCloudSync);

    // Check sync status every 25 seconds
    setInterval(checkCloudSyncStatus, 25000);
    setTimeout(checkCloudSyncStatus, 3000);

    checkAuth();
  });
})();
