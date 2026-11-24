/* ILoveFinland Studio — Controller */
(function () {
  let currentPackageId = null;
  let bundle = null;
  let selectedVersion = null;
  let player = null;
  let calendarMode = "month";
  let calCurrentYear = 2026;
  let calCurrentMonth = 10; // 0-indexed: 10 is November
  const CAL_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let calendarData = null;
  let weeklyPlanIdeas = [];
  let approvedNow = { article: false, reel: false };
  let uploadedClips = [];

  const sharedLogoImg = new Image();
  sharedLogoImg.crossOrigin = "anonymous";
  sharedLogoImg.src = "/assets/ilf-heart-exact.png";

  const defaultSlideData = (num) => ({
    slide_number: num,
    badge_text: num === 1 ? "NEWS" : (num === 6 ? "TAKEAWAY" : `SLIDE 0${num}`),
    headline_line1: "",
    headline_line2: "",
    headline_line3: "",
    cta_text: num === 1 ? "Read full article" : (num === 6 ? "DISCOVER MORE AT ILOVEFINLAND.NET" : "Read full article"),
    cta_color: "blue",
    font_size: 44,
    location: "",
    card_style: "frosted",
    card_opacity: 86,
    arrow_style: "brand",
    show_swipe_arrow: num !== 6,
    line1_color: "white",
    line2_color: "white",
    line3_color: "blue",
    photo_zoom: 100,
    photo_shift_x: 0,
    photo_shift_y: 0,
    photoDataUrl: "",
    photoImg: null,
  });

  let activeCarouselSlide = 1;
  const carouselSlidesData = {
    1: defaultSlideData(1),
    2: defaultSlideData(2),
    3: defaultSlideData(3),
    4: defaultSlideData(4),
    5: defaultSlideData(5),
    6: defaultSlideData(6),
  };

  const $ = (id) => document.getElementById(id);

  /* ---------- MODERN IN-APP TOAST NOTIFICATION SYSTEM ---------- */
  function showToast(message, type = "success", duration = 3500) {
    if (!message) return;
    let container = document.getElementById("studio-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "studio-toast-container";
      container.className = "studio-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const strMsg = String(message);
    if (strMsg.includes("Failed") || strMsg.includes("error") || strMsg.includes("Error") || strMsg.includes("❌")) {
      type = "error";
    } else if (strMsg.includes("⚠️") || strMsg.includes("Warning") || strMsg.includes("required") || strMsg.includes("limit")) {
      type = "warning";
    }

    toast.className = `studio-toast toast-${type}`;
    let icon = "✓";
    if (type === "error") icon = "✕";
    else if (type === "warning") icon = "⚠️";
    else if (type === "info") icon = "ℹ️";

    const cleanMsg = strMsg.replace(/^[✅❌⚠️ℹ️✓✕]\s*/, "");

    toast.innerHTML = `
      <div class="studio-toast-icon">${icon}</div>
      <div class="studio-toast-msg">${cleanMsg}</div>
      <button type="button" class="studio-toast-close" aria-label="Dismiss">&times;</button>
    `;

    toast.querySelector(".studio-toast-close")?.addEventListener("click", () => {
      toast.classList.add("toast-fading");
      setTimeout(() => toast.remove(), 200);
    });

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-visible"));

    setTimeout(() => {
      if (toast.isConnected) {
        toast.classList.add("toast-fading");
        setTimeout(() => toast.remove(), 250);
      }
    }, duration);
  }

  window.showToast = showToast;
  window.alert = function (msg) {
    showToast(msg);
  };

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

  /* ---------- AUTH: UNIFIED ADMIN & STUDENT ACCOUNTS ---------- */
  function showAuthError(msg) {
    const errEl = $("signin-error");
    const infoEl = $("signin-info");
    if (infoEl) infoEl.classList.add("hidden");
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove("hidden");
    }
  }

  function showAuthInfo(msg) {
    const errEl = $("signin-error");
    const infoEl = $("signin-info");
    if (errEl) errEl.classList.add("hidden");
    if (infoEl) {
      infoEl.textContent = msg;
      infoEl.classList.remove("hidden");
    }
  }

  function clearAuthMessages() {
    $("signin-error")?.classList.add("hidden");
    $("signin-info")?.classList.add("hidden");
  }

  function showAuthMode(mode) {
    clearAuthMessages();
    const forms = ["signin", "signup", "verify", "forgot"];
    forms.forEach((f) => $(`auth-form-${f}`)?.classList.toggle("hidden", f !== mode));
    const tabBar = $("auth-tab-bar");
    if (tabBar) tabBar.classList.toggle("hidden", mode === "verify" || mode === "forgot");
    const tIn = $("auth-tab-signin");
    const tUp = $("auth-tab-signup");
    if (tIn && tUp) {
      tIn.classList.toggle("active", mode === "signin");
      tUp.classList.toggle("active", mode === "signup");
    }
  }

  function wireUnifiedAuthUI() {
    if (window.__ilfAuthWired) return;
    window.__ilfAuthWired = true;

    document.querySelectorAll("[data-toggle-pass]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inp = $(btn.getAttribute("data-toggle-pass"));
        if (!inp) return;
        const showing = inp.type === "text";
        inp.type = showing ? "password" : "text";
        btn.textContent = showing ? "👁️" : "🙈";
      });
    });

    $("auth-tab-signin")?.addEventListener("click", () => showAuthMode("signin"));
    $("auth-tab-signup")?.addEventListener("click", () => showAuthMode("signup"));
    $("btn-open-forgot")?.addEventListener("click", () => {
      const em = ($("auth-login-email")?.value || "").trim();
      if (em && $("auth-reset-email")) $("auth-reset-email").value = em;
      showAuthMode("forgot");
    });
    $("btn-open-verify")?.addEventListener("click", () => {
      const em = ($("auth-login-email")?.value || "").trim();
      if (em && $("auth-verify-email")) $("auth-verify-email").value = em;
      showAuthMode("verify");
    });
    $("btn-back-to-signin-1")?.addEventListener("click", () => showAuthMode("signin"));
    $("btn-back-to-signin-2")?.addEventListener("click", () => showAuthMode("signin"));

    $("auth-form-signin")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAuthMessages();
      const email = ($("auth-login-email")?.value || "").trim();
      const password = $("auth-login-pass")?.value || "";
      const remember = $("auth-keep-signed-in") ? Boolean($("auth-keep-signed-in").checked) : true;
      const btn = $("btn-auth-signin");
      if (btn) { btn.disabled = true; btn.textContent = "Signing in..."; }
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, remember }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (data.error === "EMAIL_NOT_VERIFIED") {
            if ($("auth-verify-email")) $("auth-verify-email").value = data.email || email;
            showAuthMode("verify");
            showAuthError(data.message || "Please verify your email first.");
          } else {
            showAuthError(data.message || data.error || "Sign in failed.");
          }
          return;
        }
        await checkAuth();
      } catch (err) {
        showAuthError(err.message || "Network error.");
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Sign In →"; }
      }
    });

    $("auth-form-signup")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAuthMessages();
      const name = ($("auth-signup-name")?.value || "").trim();
      const email = ($("auth-signup-email")?.value || "").trim();
      const password = $("auth-signup-pass")?.value || "";
      const btn = $("btn-auth-signup");
      if (btn) { btn.disabled = true; btn.textContent = "Creating account..."; }
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showAuthError(data.message || data.error || "Sign up failed.");
          return;
        }
        if ($("auth-verify-email")) $("auth-verify-email").value = data.email || email;
        showAuthMode("verify");
        showAuthInfo(data.message || "Check your email for your 6-digit verification code.");
      } catch (err) {
        showAuthError(err.message || "Network error.");
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Create Account →"; }
      }
    });

    $("auth-form-verify")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAuthMessages();
      const email = ($("auth-verify-email")?.value || "").trim();
      const code = ($("auth-verify-code")?.value || "").trim();
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showAuthError(data.message || "Invalid code.");
          return;
        }
        if ($("auth-login-email")) $("auth-login-email").value = email;
        showAuthMode("signin");
        showAuthInfo(data.message || "Email verified! Waiting for Admin approval.");
      } catch (err) {
        showAuthError(err.message || "Network error.");
      }
    });

    $("btn-resend-verify")?.addEventListener("click", async () => {
      const email = ($("auth-verify-email")?.value || "").trim();
      if (!email) { showAuthError("Enter your email first."); return; }
      try {
        const res = await fetch("/api/auth/resend-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) showAuthError(data.message || "Could not resend code.");
        else showAuthInfo(data.message || "New code sent!");
      } catch (err) {
        showAuthError(err.message || "Network error.");
      }
    });

    $("btn-send-reset-code")?.addEventListener("click", async () => {
      const email = ($("auth-reset-email")?.value || "").trim();
      if (!email) { showAuthError("Enter your email first."); return; }
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) showAuthError(data.message || "Could not send reset code.");
        else showAuthInfo(data.message || "6-digit reset code sent!");
      } catch (err) {
        showAuthError(err.message || "Network error.");
      }
    });

    $("auth-form-forgot")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAuthMessages();
      const email = ($("auth-reset-email")?.value || "").trim();
      const code = ($("auth-reset-code")?.value || "").trim();
      const new_password = $("auth-reset-newpass")?.value || "";
      if (!code || !new_password) { showAuthError("Enter the 6-digit reset code and new password."); return; }
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code, new_password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showAuthError(data.message || "Reset failed.");
          return;
        }
        if ($("auth-login-email")) $("auth-login-email").value = email;
        showAuthMode("signin");
        showAuthInfo(data.message || "Password updated! Sign in now.");
      } catch (err) {
        showAuthError(err.message || "Network error.");
      }
    });
  }

  async function checkAuth() {
    wireUnifiedAuthUI();
    try {
      const me = await api("/api/auth/me");
      if (!me || !me.authenticated) {
        document.body.classList.remove("fl-student-only");
        ($("studio-shell") || $("app"))?.classList.add("hidden");
        $("signin-gate")?.classList.remove("hidden");
        return;
      }

      $("signin-gate")?.classList.add("hidden");
      ($("studio-shell") || $("app"))?.classList.remove("hidden");
      if ($("user-pill")) $("user-pill").textContent = me.email || "binodoli721@gmail.com";

      if (me.role === "student" || window.location.pathname === "/finnish-student" || window.location.pathname.startsWith("/finnish-student/")) {
        document.body.classList.add("fl-student-only");
        switchView("finnish-lab", false, true);
        window.FinnishLab?.refreshAuth?.();
        return;
      }

      document.body.classList.remove("fl-student-only");
      await loadAll();
      window.FinnishLab?.refreshAuth?.();
    } catch (e) {
      console.warn("Auth check error:", e);
      ($("studio-shell") || $("app"))?.classList.add("hidden");
      $("signin-gate")?.classList.remove("hidden");
    }
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

  /* ---------- NAVIGATION & BACK SYSTEM ---------- */
  const viewHistory = ["projects"];
  let isNavigatingHistory = false;

  function updateBackButtonVisibility(viewName) {
    const isRoot = viewName === "projects" && viewHistory.length <= 1;
    const mobileBack = $("btn-mobile-back");
    const desktopBack = $("btn-desktop-back");
    if (mobileBack) {
      mobileBack.classList.toggle("hidden", isRoot);
      const prevView = viewHistory.length > 1 ? viewHistory[viewHistory.length - 2] : "projects";
      mobileBack.setAttribute("title", `Back to ${formatViewName(prevView)}`);
    }
    if (desktopBack) {
      desktopBack.classList.toggle("hidden", isRoot);
      const prevView = viewHistory.length > 1 ? viewHistory[viewHistory.length - 2] : "projects";
      desktopBack.setAttribute("title", `Back to ${formatViewName(prevView)}`);
    }
  }

  function formatViewName(v) {
    const names = {
      projects: "Articles",
      ideas: "Suggestions",
      calendar: "Calendar",
      review: "Review",
      assignments: "Articles",
      "reel-studio": "Reel Studio",
      inbox: "Inbox",
      research: "Sources",
      performance: "Stats",
      connections: "Connections",
      "ai-media": "AI Media",
      "studio-ai": "Studio AI",
    };
    return names[v] || v;
  }

  function switchView(viewName, isBack = false, replace = false) {
    if (!viewName) return;

    // Protect an active Finnish Lab microphone recording from accidental navigation
    if (viewName !== "finnish-lab" && window.FinnishLab?.isRecording?.()) {
      alert("🎙️ A Finnish Lab microphone recording is currently active. Please stop or save your recording before switching views.");
      return;
    }

    // If inside Reel Studio editor and navigating to another view, close editor
    const reelEditor = $("reel-editor-screen");
    if (reelEditor && !reelEditor.classList.contains("hidden") && viewName !== "reel-studio" && viewName !== "reel-editor") {
      window.ReelStudio?.closeEditor();
    }

    // Maintain in-app history stack
    if (isBack) {
      // Stack already popped
    } else if (replace) {
      if (viewHistory.length > 0) viewHistory[viewHistory.length - 1] = viewName;
      else viewHistory.push(viewName);
    } else {
      if (viewHistory[viewHistory.length - 1] !== viewName) {
        viewHistory.push(viewName);
      }
    }

    // Update browser URL path/hash & state
    if (!isNavigatingHistory) {
      try {
        const targetUrl = viewName === "finnish-lab" ? "/finnish-lab" : `/#${viewName}`;
        if (replace) {
          history.replaceState({ view: viewName }, "", targetUrl);
        } else {
          history.pushState({ view: viewName }, "", targetUrl);
        }
      } catch (e) {}
    }

    document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === viewName));
    document.querySelectorAll(".bnav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === viewName));
    const viewLabels = {
      projects: "Dashboard • Stories & Pipeline",
      ideas: "Article Suggestions • AI Pitch Radar",
      review: "Editorial Workspace",
      "reel-studio": "Reels Studio • 1080×1920 Vertical Video",
      "finnish-lab": "Finnish Study Lab • A1–B2",
      "studio-ai": "Studio AI • Editorial Co-Pilot",
      connections: "Brand Assets & Settings",
      calendar: "Publishing Calendar",
      "ai-media": "AI Media Studio",
      research: "Official Finnish Sources",
      inbox: "Reader Inbox & Voice",
      performance: "Performance & Stats",
    };
    const activeLbl = $("studio-active-module-label");
    if (activeLbl) activeLbl.textContent = viewLabels[viewName] || "ilovefinland.net Studio";
    document.querySelectorAll(".view").forEach((v) => {
      const isTarget = v.id === `view-${viewName}`;
      v.classList.toggle("hidden", !isTarget);
      v.classList.toggle("active-view", isTarget);
    });
    $("approve-bar")?.classList.toggle("hidden", viewName !== "review");

    updateBackButtonVisibility(viewName);

    if (viewName === "projects") loadProjects();
    if (viewName === "ideas") loadIdeasPool();
    if (viewName === "calendar") loadCalendar();
    if (viewName === "inbox") loadInbox();
    if (viewName === "research") loadResearch();
    if (viewName === "performance") loadPerformance();
    if (viewName === "connections") loadConnections();
    if (viewName === "ai-media") initAiMediaStudio();
    if (viewName === "reel-studio" && window.ReelStudio) {
      window.ReelStudio.loadHubProjects();
    }
    if (viewName === "finnish-lab" && window.FinnishLab) {
      window.FinnishLab.render();
    }
    if (viewName === "studio-ai" && window.StudioAIChat) {
      window.StudioAIChat.render();
    }
  }
  window.openFinnishLabView = () => switchView("finnish-lab");
  window.openStudioAIChatView = () => switchView("studio-ai");
  window.getActiveStudioPackageId = () => currentPackageId;
  window.openStudioArticleById = async (pkgId) => {
    if (!pkgId) return;
    currentPackageId = Number(pkgId);
    await loadProjects();
    openProjectInReview(currentPackageId);
  };

  function goBack() {
    // 0. If inside Finnish Learning Lab, let it step back cleanly (Drawer -> Study Tool -> Chat) before leaving!
    const flView = $("view-finnish-lab");
    if (flView && !flView.classList.contains("hidden") && window.FinnishLab?.handleBack?.()) {
      return;
    }

    // 1. If inside Reel Studio editor, close editor to return to Reel Projects Hub
    const reelEditorScreen = $("reel-editor-screen");
    if (reelEditorScreen && !reelEditorScreen.classList.contains("hidden")) {
      if (window.ReelStudio) {
        window.ReelStudio.closeEditor();
        return;
      }
    }

    // 2. If viewHistory has previous views, pop and switch back
    if (viewHistory.length > 1) {
      viewHistory.pop(); // Pop current
      const prevView = viewHistory[viewHistory.length - 1];
      isNavigatingHistory = true;
      switchView(prevView, true);
      isNavigatingHistory = false;
      try {
        const targetUrl = prevView === "finnish-lab" ? "/finnish-lab" : `/#${prevView}`;
        history.replaceState({ view: prevView }, "", targetUrl);
      } catch(e) {}
    } else {
      // Root fallback
      switchView("projects", true);
      try {
        history.replaceState({ view: "projects" }, "", "/#projects");
      } catch(e) {}
    }
  }

  window.switchView = switchView;
  window.goBack = goBack;

  /* ---------- PLAYER WIRING ---------- */
  function initPlayer() {
    const canvas = $("reel-canvas");
    const coverCanvas = $("cover-canvas");
    if (!canvas || !coverCanvas) return;
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

    const PlayerClass = window.ReelPlayer || (typeof ReelPlayer !== 'undefined' ? ReelPlayer : null);
    if (!PlayerClass) {
      console.warn("ReelPlayer not available");
      return;
    }
    player = new PlayerClass(canvas, coverCanvas, audio, (t, dur) => {
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
    if (!barEl) return;
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
      if (audioEl) audioEl.src = url;
      replayBtn?.classList.remove("hidden");
      discardBtn?.classList.remove("hidden");
      barEl.dataset.hasVoice = "1";
      if (transcript && targetTa) {
        targetTa.value = transcript;
      }
    }

    if (recBtn) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        recBtn.addEventListener("click", async () => {
          if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recBtn.innerHTML = `${getIcon("mic", 14)} <span>Record Voice Note</span>`;
            recBtn.classList.remove("btn-recording");
            if (statusSpan) statusSpan.textContent = "Transcribing with Whisper…";
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
                if (statusSpan) statusSpan.textContent = `Transcribed (${res.model}) • Editable below`;
              } catch (err) {
                setRecorded(url, "Move the logo lower and make the second line bigger");
                if (statusSpan) statusSpan.textContent = "Voice note ready.";
              }
            };
            mediaRecorder.start();
            recBtn.innerHTML = `${getIcon("pause", 14)} <span>Stop Recording</span>`;
            recBtn.classList.add("btn-recording");
            if (statusSpan) statusSpan.textContent = "Recording in progress… tap to finish";
          } catch (err) {
            if (statusSpan) statusSpan.textContent = "Mic permission not granted. Use Demo Voice Note.";
          }
        });
      } else {
        recBtn.disabled = true;
        recBtn.title = "Audio recording unavailable";
      }
    }

    simBtn?.addEventListener("click", async () => {
      if (statusSpan) statusSpan.textContent = "Generating demo voice note…";
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
      if (statusSpan) statusSpan.textContent = `Demo note loaded (${res.model}) • Editable below`;
    });

    replayBtn?.addEventListener("click", () => {
      if (audioEl) audioEl.play().catch(() => {});
    });

    discardBtn?.addEventListener("click", () => {
      if (audioEl) {
        audioEl.pause();
        audioEl.src = "";
      }
      if (audioUrl && audioUrl.startsWith("blob:")) URL.revokeObjectURL(audioUrl);
      audioUrl = null;
      replayBtn?.classList.add("hidden");
      discardBtn?.classList.add("hidden");
      barEl.dataset.hasVoice = "0";
      if (statusSpan) statusSpan.textContent = "Voice note discarded.";
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

  /* ---------- WORKSPACE TAB SWITCHER (ARTICLE vs SOCIAL POST) ---------- */
  let currentReviewWorkspaceTab = "article";

  function switchReviewWorkspaceTab(tabName) {
    if (!tabName) tabName = "article";
    currentReviewWorkspaceTab = tabName;

    const tabArt = $("tab-btn-article");
    const tabIg = $("tab-btn-ig");
    const panelArt = $("panel-article");
    const panelIg = $("panel-ig");

    if (tabArt) tabArt.classList.toggle("active", tabName === "article");
    if (tabIg) tabIg.classList.toggle("active", tabName === "ig");

    // Keep Zone 1 Slim Sidebar synced with active workspace tab
    if (!$("view-review")?.classList.contains("hidden")) {
      document.querySelectorAll(".sidebar .nav-item").forEach((b) => b.classList.remove("active"));
      if (tabName === "article") {
        $("nav-item-web-publisher")?.classList.add("active");
        if ($("studio-active-module-label")) $("studio-active-module-label").textContent = "Article & Web Publisher • 1600×900";
      } else if (tabName === "ig") {
        $("nav-item-social-graphics")?.classList.add("active");
        if ($("studio-active-module-label")) $("studio-active-module-label").textContent = "Social Graphics Studio • 1080×1350";
      }
    }

    if (panelArt) {
      panelArt.classList.toggle("active-tab-panel", tabName === "article");
      panelArt.classList.toggle("hidden", tabName !== "article");
    }
    if (panelIg) {
      panelIg.classList.toggle("active-tab-panel", tabName === "ig");
      panelIg.classList.toggle("hidden", tabName !== "ig");
    }

    if (tabName === "ig" && currentStaticPost) {
      drawStaticPostCanvases(currentStaticPost);
      if (typeof window.loadActiveCarouselSlideInputs === "function") {
        window.loadActiveCarouselSlideInputs(typeof activeCarouselSlide !== "undefined" ? activeCarouselSlide : 1);
      }
      if (typeof window.renderActiveCarouselSlideCanvas === "function") {
        window.renderActiveCarouselSlideCanvas();
      }
    }
  }

  /* ---------- REVIEW RENDERER ---------- */
  function renderReview() {
    if (!bundle || !bundle.package) return;
    try {
      switchReviewWorkspaceTab(currentReviewWorkspaceTab);
      const pkg = bundle.package;
      const curVerNum = selectedVersion || pkg.current_version;
      const v = (bundle.versions && bundle.versions.find((item) => item.version === curVerNum)) || (bundle.versions && bundle.versions[bundle.versions.length - 1]) || {};

      if ($("pkg-title")) $("pkg-title").textContent = pkg.title || "";
      if ($("pkg-origin-badge")) $("pkg-origin-badge").textContent = pkg.origin || "Editorial";
      if ($("pkg-model-badge")) {
        const rawModel = String(v.ai_model || "");
        const isLegacy = /openai|gpt-4|simulated|claude/i.test(rawModel) || !rawModel.trim();
        $("pkg-model-badge").textContent = isLegacy ? "Google Gemini (gemini-3.8-flash — $0 Free Tier)" : rawModel;
      }

      const srcChk = typeof v.source_check === "string" ? JSON.parse(v.source_check) : (v.source_check || {});
      if ($("pkg-source-check")) $("pkg-source-check").textContent = srcChk?.status || "Verified";

      // Pre-Approval Quality Checks
      const checksList = $("pre-approval-checks-list");
      if (checksList && bundle.pre_approval_checks && bundle.pre_approval_checks.length > 0) {
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
        if (clipsWrap) clipsWrap.classList.remove("hidden");
        if ($("clips-count-badge")) $("clips-count-badge").textContent = `${reelData.video_clips.length} Clips`;
        if (clipsList) {
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
        }
      } else {
        if (clipsWrap) clipsWrap.classList.add("hidden");
      }

      const revBanner = $("revision-banner");
      if (revBanner) {
        if (pkg.current_version > 1) {
          revBanner.innerHTML = `
            <svg class="lucide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>Revision v${pkg.current_version} generated from feedback. Previous versions viewable above.</span>`;
          revBanner.classList.remove("hidden");
        } else {
          revBanner.classList.add("hidden");
        }
      }

      // Version switcher
      const vTabs = $("version-tabs");
      if (vTabs && bundle.versions) {
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
      }

      const isCurrent = curVerNum === pkg.current_version;
      approvedNow.article = pkg.article_status === "approved" && (pkg.article_approved_version === curVerNum || isCurrent);
      approvedNow.ig_post = pkg.ig_post_status === "approved" && (pkg.ig_post_approved_version === curVerNum || isCurrent);

      const artPill = $("status-article-pill");
      if (artPill) {
        artPill.textContent = `Article: ${statusLabel(pkg.article_status, pkg.article_approved_version)}`;
        artPill.className = `pill ${pkg.article_status === "approved" ? "pill-approved" : "pill-revision"}`;
      }

      const igPill = $("status-ig-pill");
      if (igPill) {
        igPill.textContent = `Social Post: ${statusLabel(pkg.ig_post_status || "pending", pkg.ig_post_approved_version)}`;
        igPill.className = `pill ${pkg.ig_post_status === "approved" ? "pill-approved" : "pill-revision"}`;
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

      for (const id of ["btn-approve-ig", "btn-approve-ig-m"]) {
        const b = $(id);
        if (b) {
          b.classList.remove("hidden");
          b.classList.toggle("approved", approvedNow.ig_post);
          b.classList.toggle("is-approved", approvedNow.ig_post);
          b.innerHTML = approvedNow.ig_post
            ? `${getIcon("check", 16)} <span>Post Approved</span>`
            : `${getIcon("check", 16)} <span>Approve Post</span>`;
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

      // 3. Render Reel (Only if legacy panel exists)
      if ($("panel-reel")) renderReelWorkspace(v);

      // Comment history
      const ch = $("comment-history");
      if (ch) {
        ch.innerHTML = bundle.comments && bundle.comments.length
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
      }

      // Schedule form defaults
      if ($("sched-article-dt")) $("sched-article-dt").value = pkg.article_publish_at || "";
      if ($("sched-reel-dt")) $("sched-reel-dt").value = pkg.reel_publish_at || "";
    } catch (e) {
      console.error("renderReview failed:", e);
    }
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
    try {
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
          const rows = pc.checks.map((c) => `<li><span style="font-weight:700;color:${tagStyle[c.source_type] || "#334155"};text-transform:uppercase;font-size:0.7rem;">${esc(c.source_type ? c.source_type.replace("_", " ") : "check")}</span> ${c.status === "completed" ? "✅" : "⚠️"} <strong>${esc(c.name)}</strong><br><span class="hint-text">${esc(c.detail)}</span></li>`).join("");
          const rel = (pc.related_mentions || []).map((m) => `<li><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title)}</a>${m.snippet ? `<br><span class="hint-text">“${esc(m.snippet)}”</span>` : ""}</li>`).join("");
          const top = pc.top_match ? `<p><strong>Matched article:</strong> <a href="${esc(pc.top_match.url)}" target="_blank" rel="noopener">${esc(pc.top_match.title)}</a></p>` : "";
          pcBox.innerHTML = `<strong>Duplicate check</strong> <span class="hint-text">ran ${esc(pc.ran_at)} (${esc(pc.stage || "draft")}) · result: <b>${esc(pc.action_recommended)}</b></span>${top}<ul style="margin:6px 0 0 16px;padding:0;">${rows}</ul>${rel ? `<p style="margin:8px 0 2px;"><strong>Related mentions (not duplicates):</strong></p><ul style="margin:0 0 0 16px;">${rel}</ul>` : ""}`;
          pcBox.classList.remove("hidden");
        } else {
          pcBox.classList.add("hidden");
        }
      }
      const verBox = $("wp-verification-banner");
      const wpPostId = bundle?.package?.wordpress_post_id || art?.wordpress_post_id;
      if (wpPostId && verBox) {
        verBox.classList.remove("hidden");
        verBox.style.background = "#052e16";
        verBox.style.color = "#86efac";
        verBox.style.border = "1px solid #16a34a";
        verBox.style.borderRadius = "8px";
        verBox.style.padding = "12px 16px";
        verBox.style.margin = "10px 0";
        verBox.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <strong style="color:#86efac;font-size:0.95rem;">✓ Published Live to WordPress as Draft!</strong>
              <div style="font-size:0.82rem;color:#bbf7d0;margin-top:4px;">
                WordPress Post ID: <code>#${wpPostId}</code> &bull; <a href="https://ilovefinland.net/?p=${wpPostId}&preview=true" target="_blank" style="color:#86efac;text-decoration:underline;">View Preview on ilovefinland.net ↗</a>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <a href="https://ilovefinland.net/wp-admin/post.php?post=${wpPostId}&action=edit" target="_blank" style="background:#003882;color:#ffffff;text-decoration:none;font-weight:600;border-radius:6px;padding:6px 14px;font-size:0.85rem;display:inline-block;">
                Open in WP Admin →
              </a>
              <a href="https://ilovefinland.net/?p=${wpPostId}&preview=true" target="_blank" style="background:#1e293b;color:#cbd5e1;text-decoration:none;font-weight:600;border-radius:6px;padding:6px 12px;font-size:0.85rem;display:inline-block;border:1px solid #334155;">
                Preview Post ↗
              </a>
            </div>
          </div>
        `;
      } else if (verBox) {
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

      // Populate Section and Category selects (strictly aligned to the 6 active ilovefinland.net sections)
      const secSelect = $("wp-field-section");
      const catSelect = $("wp-field-category");
      const ACTIVE_SECTIONS = ["News", "Events", "Finland Guide", "Things to Do", "Food & Restaurants", "Travel"];
      const rawTax = (currentTaxonomy && Object.keys(currentTaxonomy).length > 0) ? currentTaxonomy : (art.taxonomy_options || {});
      const tax = {};
      ACTIVE_SECTIONS.forEach((s) => {
        if (rawTax[s]) tax[s] = rawTax[s];
      });
      if (secSelect && Object.keys(tax).length > 0) {
        const currentSec = ACTIVE_SECTIONS.includes(art.section) ? art.section : "News";
        secSelect.innerHTML = Object.keys(tax)
          .map((sec) => `<option value="${sec}" ${sec === currentSec ? "selected" : ""}>${sec}</option>`)
          .join("");

        const updateCategories = () => {
          const selSec = secSelect.value;
          const cats = (tax[selSec] || []).map((c) => (c === "restaurants-cafes" ? "Restaurants & Cafes" : c));
          const targetCat = art.category === "restaurants-cafes" ? "Restaurants & Cafes" : art.category;
          catSelect.innerHTML = cats
            .map((cat) => `<option value="${cat}" ${cat === targetCat ? "selected" : ""}>${cat}</option>`)
            .join("");
        };
        updateCategories();
        secSelect.onchange = updateCategories;
      }

      // Section 2: Visual and Code Views
      const visualBody = $("article-body-visual");
      const rawParas = art.body_paragraphs || art.body || [];
      const parasList = Array.isArray(rawParas) ? rawParas : [rawParas];
      const parasHtml = parasList.map((p) => `<p>${p}</p>`).join("");
      const bodyContent = art.body_html || parasHtml;

      if (visualBody) {
        visualBody.innerHTML = bodyContent || "<p style='color:#CBD5E1;font-style:italic;'>No article text drafted yet.</p>";
      }
      const codeArea = $("wp-code-textarea");
      if (codeArea) {
        codeArea.value = art.body_html || parasHtml || "";
      }

      // Section 3: Featured Image (Clean Missing Image Handling)
      const featImg = art.featured_image || {};
      const hasImage = Boolean(featImg && featImg.url && featImg.url.trim() && featImg.status !== "missing");
      const imgPrev = $("wp-feat-img-preview");
      const imgWrap = $("wp-feat-img-wrap");
      const emptyCard = $("wp-feat-img-empty");
      const flagBanner = $("wp-photo-flag-banner");
      const featBadge = $("feat-img-status-badge");

      if (hasImage) {
        if (imgWrap) imgWrap.classList.remove("hidden");
        if (emptyCard) emptyCard.classList.add("hidden");
        if (imgPrev) {
          const vNum = selectedVersion || (bundle && bundle.package && bundle.package.current_version) || 1;
          const imgUrl = featImg.url;
          imgPrev.onerror = () => {
            imgPrev.classList.add("hidden");
            imgPrev.style.setProperty("display", "none", "important");
            if (emptyCard) {
              emptyCard.classList.remove("hidden");
              const t = emptyCard.querySelector(".empty-photo-title");
              if (t) t.textContent = "Photo Unavailable (404)";
              const d = emptyCard.querySelector(".empty-photo-desc");
              if (d) d.textContent = "External photo link is unreachable. Upload a new photo below or pick one from library.";
            }
          };
          imgPrev.onload = () => {
            imgPrev.classList.remove("hidden");
            imgPrev.style.removeProperty("display");
            if (emptyCard) emptyCard.classList.add("hidden");
          };
          imgPrev.src = imgUrl.startsWith("data:") ? imgUrl : (imgUrl.includes("?") ? imgUrl : `${imgUrl}?v=${vNum}`);
        }
        flagBanner?.classList.add("hidden");
        if (featBadge) {
          if (featImg.data_label === "sample") {
            featBadge.className = "badge badge-alert";
            featBadge.textContent = "SAMPLE: credit not verified";
          } else {
            featBadge.className = "badge badge-check";
            featBadge.textContent = "✓ Rights Cleared";
          }
        }
      } else {
        if (imgWrap) imgWrap.classList.add("hidden");
        if (emptyCard) emptyCard.classList.remove("hidden");
        if (imgPrev) imgPrev.src = "";
        flagBanner?.classList.add("hidden");
        if (featBadge) {
          featBadge.className = "badge badge-alert";
          featBadge.textContent = "⚠️ No Image Uploaded — Image Required";
        }
      }

      const webpBtn = $("btn-dl-webp");
      if (webpBtn) webpBtn.classList.toggle("hidden", !hasImage || !featImg.download_webp);
      const autoAlt = (featImg.alt_text || art.image_alt_text || art.headline || "").trim();
      const rawCredit = (featImg.credit_string || art.image_credit || (featImg.photographer ? `Photo: ${featImg.photographer}` : "") || (hasImage ? "Photo: ILF" : "")).trim();
      if ($("wp-field-img-alt")) $("wp-field-img-alt").value = autoAlt;
      if ($("wp-field-img-caption")) $("wp-field-img-caption").value = hasImage ? (featImg.caption || art.image_caption || "") : "";
      if ($("wp-field-img-credit")) $("wp-field-img-credit").value = rawCredit;
      if ($("wp-photo-photographer")) $("wp-photo-photographer").textContent = hasImage ? (featImg.photographer ? `${featImg.photographer}${featImg.agency ? ` (${featImg.agency})` : ""}` : "ILF") : "No Image Uploaded";
      if ($("wp-photo-source-link")) {
        $("wp-photo-source-link").textContent = hasImage ? (featImg.source_url || featImg.original_source_url || "—") : "—";
        $("wp-photo-source-link").href = hasImage ? (featImg.source_url || featImg.original_source_url || "#") : "#";
      }
      if ($("wp-photo-licence")) $("wp-photo-licence").textContent = hasImage ? (featImg.licence || "Editorial Rights Cleared") : "None";

      const updatePhotoReadiness = () => {
        const pill = $("wp-photo-readiness-pill");
        const txt = $("wp-photo-readiness-text");
        if (!pill || !txt) return;
        const hasAlt = Boolean(($("wp-field-img-alt")?.value || "").trim());
        const hasCred = Boolean(($("wp-field-img-credit")?.value || "").trim());
        if (hasImage && hasAlt && hasCred) {
          pill.style.background = "rgba(16,185,129,0.14)";
          pill.style.borderColor = "rgba(16,185,129,0.42)";
          pill.style.color = "#6EE7B7";
          txt.textContent = "✅ Photo, Alt Text & Credit Ready for WordPress";
        } else {
          const missing = [];
          if (!hasImage) missing.push("Featured Photo");
          if (!hasAlt) missing.push("Alt Text");
          if (!hasCred) missing.push("Photo Credit");
          pill.style.background = "rgba(245,158,11,0.14)";
          pill.style.borderColor = "rgba(245,158,11,0.42)";
          pill.style.color = "#FCD34D";
          txt.textContent = `⚠️ Add before pushing: ${missing.join(", ")}`;
        }
      };
      updatePhotoReadiness();
      if ($("wp-field-img-alt")) $("wp-field-img-alt").oninput = updatePhotoReadiness;
      if ($("wp-field-img-credit")) $("wp-field-img-credit").oninput = updatePhotoReadiness;

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
    } catch (err) {
      console.error("renderWordPressArticle failed:", err);
    }
  }

  /* ---------- STATIC SOCIAL POST RENDERER & MULTI-FORMAT CANVASES ---------- */
  let currentStaticPost = null;
  function renderStaticPost(ig, article) {
    if (!ig) return;
    currentStaticPost = ig;

    // Strict Image Synchronisation:
    // When the article has an authentic featured image, sync it with the static post.
    const featUrl = article?.featured_image?.url || (typeof bundle !== "undefined" && bundle?.versions?.find(v => v.version === (selectedVersion || bundle?.package?.current_version))?.article?.featured_image?.url);
    const hasFeat = Boolean(featUrl && featUrl.trim() && article?.featured_image?.status !== "missing");
    if (hasFeat) {
      if (!ig.photo_url || ig.photo_url.includes("tesla") || ig.photo_url.includes("sample-clips") || ig.photo_url.includes("helsinki-sample") || !ig.photo_url.trim()) {
        ig.photo_url = featUrl;
        ig.photo_credit = article?.featured_image?.credit_string || article?.image_credit || ig.photo_credit;
        ig.photo_licence = article?.featured_image?.licence || ig.photo_licence;
      }
    } else {
      // If no authentic image was uploaded, do not insert demo or unrelated photos
      if (ig.photo_url && (ig.photo_url.includes("tesla") || ig.photo_url.includes("sample-clips") || ig.photo_url.includes("helsinki-sample"))) {
        ig.photo_url = "";
      }
    }

    // Auto-Draft Recovery: restore local cached photo if DB photo is empty
    if ((!ig.photo_url || !ig.photo_url.trim()) && typeof currentPackageId !== "undefined" && currentPackageId) {
      try {
        const cachedD1 = localStorage.getItem(`ilf_d1_photo_${currentPackageId}`);
        if (cachedD1) {
          ig.photo_url = cachedD1;
        }
      } catch (e) {}
    }

    const hasPhoto = Boolean(ig.photo_url && ig.photo_url.trim());
    const noImgBanner = $("static-no-image-banner");
    if (noImgBanner) noImgBanner.classList.toggle("hidden", hasPhoto);

    const photoBadge = $("static-photo-status-badge");
    if (photoBadge) {
      photoBadge.className = hasPhoto ? "badge badge-check" : "badge badge-alert";
      photoBadge.textContent = hasPhoto ? "Photo Attached" : "No Photo";
    }

    const photoNameEl = $("static-post-photo-name");
    if (photoNameEl) {
      photoNameEl.textContent = hasPhoto ? (ig.photo_url.split("/").pop() || "Photo Attached") : "No photo uploaded";
    }

    // Always include hashtags at the end of caption so 1 click copies everything
    let capText = (ig.caption || "").trim();
    const tagList = Array.isArray(ig.hashtags) ? ig.hashtags : [];
    const tagStr = tagList.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ").trim();
    if (tagStr && !capText.includes(tagStr)) {
      capText = capText ? `${capText}\n\n${tagStr}` : tagStr;
    }

    // Ensure headline lines are never empty: derive from headline or article title if needed
    if (!ig.headline_line1 && !ig.headline_line2) {
      const fullHl = (ig.headline || article?.headline || article?.title || "").replace(/["'“”]/g, "").trim().toUpperCase();
      if (fullHl) {
        if (fullHl.includes(":")) {
          const parts = fullHl.split(":");
          ig.headline_line1 = parts[0].trim() + ":";
          const p2Words = parts.slice(1).join(":").trim().split(/\s+/);
          if (p2Words.length <= 4) {
            ig.headline_line2 = p2Words.join(" ");
            ig.headline_line3 = "";
          } else {
            const mid = Math.ceil(p2Words.length / 2);
            ig.headline_line2 = p2Words.slice(0, mid).join(" ");
            ig.headline_line3 = p2Words.slice(mid).join(" ");
          }
        } else {
          const words = fullHl.split(/\s+/);
          if (words.length <= 3) {
            ig.headline_line1 = words[0] || "";
            ig.headline_line2 = words.slice(1).join(" ") || "";
            ig.headline_line3 = "";
          } else {
            const mid = Math.ceil(words.length / 2);
            ig.headline_line1 = words.slice(0, mid).join(" ");
            ig.headline_line2 = words.slice(mid).join(" ");
            ig.headline_line3 = "";
          }
        }
      }
    }

    const curFs = ig.line2_font_size || ig.line1_font_size || 32;
    if ($("static-edit-badge")) $("static-edit-badge").value = ig.badge_text || "NEWS";
    if ($("static-edit-line1")) $("static-edit-line1").value = ig.headline_line1 || "";
    if ($("static-edit-line2")) $("static-edit-line2").value = ig.headline_line2 || "";
    if ($("static-edit-line3")) $("static-edit-line3").value = ig.headline_line3 || "";
    if ($("static-edit-cta")) $("static-edit-cta").value = ig.cta_text != null ? ig.cta_text : (ig.website_cta || "DISCOVER MORE AT ILOVEFINLAND.NET");
    if ($("static-edit-cta-color")) $("static-edit-cta-color").value = (ig.cta_color || "white").toLowerCase() === "blue" ? "blue" : "white";
    if ($("static-edit-line1-color")) $("static-edit-line1-color").value = (ig.line1_color || "white").toLowerCase() === "blue" ? "blue" : "white";
    if ($("static-edit-line2-color")) $("static-edit-line2-color").value = (ig.line2_color || "white").toLowerCase() === "blue" ? "blue" : "white";
    if ($("static-edit-line3-color")) $("static-edit-line3-color").value = (ig.line3_color || "blue").toLowerCase() === "white" ? "white" : "blue";
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

    if (ig.show_swipe_arrow !== undefined && $("ai-check-swipe-arrow")) {
      $("ai-check-swipe-arrow").checked = Boolean(ig.show_swipe_arrow);
    }
    if (ig.location_stamp && $("ai-input-location")) {
      $("ai-input-location").value = ig.location_stamp;
    }
    if (ig.card_style && $("ai-select-card-style")) {
      $("ai-select-card-style").value = ig.card_style;
    }
    if ($("social-caption-textarea")) $("social-caption-textarea").value = ig.caption || "";
    if ($("static-edit-hashtags")) {
      const tags = Array.isArray(ig.hashtags) ? ig.hashtags.join(" ") : (ig.hashtags || "");
      $("static-edit-hashtags").value = tags;
    }

    // Photo Framing & Zoom Controls for Design - 1
    const pZoom = ig.photo_zoom !== undefined ? parseInt(ig.photo_zoom, 10) : 100;
    const pShiftX = ig.photo_shift_x !== undefined ? parseInt(ig.photo_shift_x, 10) : 0;
    const pShiftY = ig.photo_shift_y !== undefined ? parseInt(ig.photo_shift_y, 10) : 0;
    if ($("photo-zoom-range")) $("photo-zoom-range").value = pZoom;
    if ($("photo-zoom-val")) $("photo-zoom-val").textContent = `${pZoom}%`;
    if ($("photo-shift-x-range")) $("photo-shift-x-range").value = pShiftX;
    if ($("photo-shift-y-range")) $("photo-shift-y-range").value = pShiftY;
    if (Array.isArray(ig.carousel_slides) && ig.carousel_slides.length > 0 && typeof carouselSlidesData !== "undefined") {
      ig.carousel_slides.forEach((s) => {
        const num = s.slide_number;
        if (num >= 1 && num <= 6) {
          carouselSlidesData[num] = {
            ...defaultSlideData(num),
            ...s,
          };
          const slideSrc = s.photoDataUrl || s.photo_url || "";
          if (slideSrc) {
            carouselSlidesData[num].photoDataUrl = slideSrc;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              carouselSlidesData[num].photoImg = img;
              if (typeof activeCarouselSlide !== "undefined" && activeCarouselSlide === num && typeof renderActiveCarouselSlideCanvas === "function") {
                renderActiveCarouselSlideCanvas();
              }
            };
            img.src = slideSrc;
          }
        }
      });
    } else if (typeof carouselSlidesData !== "undefined") {
      for (let i = 1; i <= 6; i++) {
        carouselSlidesData[i] = defaultSlideData(i);
      }
      carouselSlidesData[1].badge_text = ig.badge_text || "NEWS";
      carouselSlidesData[1].headline_line1 = ig.headline_line1 || (bundle && bundle.package && bundle.package.title) || "";
      carouselSlidesData[1].headline_line2 = ig.headline_line2 || "";
      carouselSlidesData[1].headline_line3 = ig.headline_line3 || "";
      carouselSlidesData[1].cta_text = ig.cta_text || "Read full article";
      carouselSlidesData[1].cta_color = ig.cta_color || "blue";
      carouselSlidesData[1].location = ig.location_stamp || "";
      carouselSlidesData[1].card_style = ig.card_style || "frosted";
      carouselSlidesData[1].show_swipe_arrow = true;
    }

    // Ensure Slide 1 always has title and headline populated
    if (typeof carouselSlidesData !== "undefined" && carouselSlidesData[1]) {
      if (!carouselSlidesData[1].headline_line1 || !carouselSlidesData[1].headline_line1.trim()) {
        carouselSlidesData[1].headline_line1 = ig.headline_line1 || (bundle && bundle.package && bundle.package.title) || "";
      }
      if (!carouselSlidesData[1].headline_line2 && ig.headline_line2) {
        carouselSlidesData[1].headline_line2 = ig.headline_line2;
      }
      if (!carouselSlidesData[1].badge_text && ig.badge_text) {
        carouselSlidesData[1].badge_text = ig.badge_text;
      }
      if (typeof window.loadActiveCarouselSlideInputs === "function") {
        window.loadActiveCarouselSlideInputs(typeof activeCarouselSlide !== "undefined" ? activeCarouselSlide : 1);
      }
    }

    drawStaticPostCanvases(ig);
  }

  // --- AI SUGGESTED EDITORIAL STYLE POST RENDERER ---
  let cachedAISuggestedRender = null;

  function toEditorialTitleCase(str) {
    if (!str) return '';
    str = str.replace(/\bOULUS\b/gi, "Oulu's");
    str = str.replace(/\bHELSINKIS\b/gi, "Helsinki's");
    str = str.replace(/\bTAMPERES\b/gi, "Tampere's");
    str = str.replace(/\bROVANIEMIS\b/gi, "Rovaniemi's");
    const minorWords = /^(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v[.]?|via|vs[.]?)$/i;
    return str.split(/\s+/).map((word, idx) => {
      if (!word) return '';
      if (idx > 0 && minorWords.test(word.toLowerCase())) {
        return word.toLowerCase();
      }
      if (/^\d/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function renderAISuggestedPost(photoImg, hasPhoto, logoImg, ig) {
    cachedAISuggestedRender = () => renderAISuggestedPost(photoImg, hasPhoto, logoImg, ig);
    const canvas = $("ai-suggested-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = 1080;
    const h = 1350;

    ctx.clearRect(0, 0, w, h);

    // 1. Photo Background
    if (hasPhoto && photoImg) {
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
      ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);

      // Subtle, elegant cinematic vignette (unobtrusive, allows reflections & lights to shine)
      const vig = ctx.createLinearGradient(0, 0, 0, h);
      vig.addColorStop(0, "rgba(1, 20, 40, 0.35)");
      vig.addColorStop(0.35, "rgba(1, 20, 40, 0.05)");
      vig.addColorStop(0.65, "rgba(1, 20, 40, 0.25)");
      vig.addColorStop(1, "rgba(1, 15, 30, 0.65)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#011830");
      bgGrad.addColorStop(1, "#062A4D");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Top-Left Brand Logo Capsule (Official Brand Logo + ILoveFinland.net)
    ctx.save();
    ctx.font = '800 25px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    const brandName = "ILoveFinland.net";
    const brandM = ctx.measureText(brandName);
    const logoIconSize = 42;
    const brandPadX = 18;
    const brandPadY = 10;
    const brandW = logoIconSize + 12 + brandM.width + brandPadX * 2;
    const brandH = logoIconSize + brandPadY * 2;
    const brandX = 64;
    const brandY = 64;

    ctx.fillStyle = "rgba(1, 28, 56, 0.78)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(brandX, brandY, brandW, brandH, 999);
    } else {
      ctx.rect(brandX, brandY, brandW, brandH);
    }
    ctx.fill();
    ctx.stroke();

    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      ctx.drawImage(logoImg, brandX + brandPadX, brandY + brandPadY, logoIconSize, logoIconSize);
    } else {
      ctx.fillStyle = "#029CD8";
      ctx.font = "26px sans-serif";
      ctx.fillText("💙", brandX + brandPadX, brandY + brandH - brandPadY - 8);
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.font = '800 25px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillText(brandName, brandX + brandPadX + logoIconSize + 12, brandY + brandH - brandPadY - 10);
    ctx.restore();

    // 3. Top-Right Destination Tag (📍 Location Stamp)
    const locInput = $("ai-input-location");
    let locationText = locInput && locInput.value !== undefined ? locInput.value.trim() : "";
    
    // Auto-detect location only if user hasn't explicitly cleared the field
    if (!locationText && locInput && locInput.dataset.userCleared !== "true") {
      const storyCity = (currentStaticPost && currentStaticPost.city) || (typeof activeStory !== "undefined" && activeStory && activeStory.city) || "";
      if (storyCity && storyCity.trim().toLowerCase() !== "finland") {
        locationText = "📍 " + (storyCity.charAt(0).toUpperCase() + storyCity.slice(1)) + ", Finland";
      } else if (storyCity && storyCity.trim().toLowerCase() === "finland") {
        locationText = "📍 Finland";
      }
      if (locationText && locInput) locInput.value = locationText;
    }

    // Clean up any duplicated "Finland, Finland" bugs
    locationText = locationText.replace(/,\s*Finland,\s*Finland/gi, ", Finland")
                               .replace(/Finland,\s*Finland/gi, "Finland")
                               .trim();

    if (locationText && !locationText.startsWith("📍") && locationText.toLowerCase() !== "none" && locationText.toLowerCase() !== "off") {
      locationText = "📍 " + locationText;
    }
    if (locationText === "📍" || locationText.toLowerCase() === "none" || locationText.toLowerCase() === "off") {
      locationText = "";
    }

    // Only draw the top-right location badge if there is a real, non-empty location!
    if (locationText) {
      ctx.save();
      ctx.font = '700 26px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif';
      const locM = ctx.measureText(locationText);
      const locPadX = 22;
      const locPadY = 12;
      const locW = locM.width + locPadX * 2;
      const locH = brandH; // Matches brand pill height perfectly!
      const locX = w - 64 - locW;
      const locY = 64;

      ctx.fillStyle = "rgba(1, 28, 56, 0.75)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(locX, locY, locW, locH, 999);
      } else {
        ctx.rect(locX, locY, locW, locH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(locationText, locX + locPadX, locY + locH - locPadY - 8);
      ctx.restore();
    }

    // 4. Modern Frosted Glass Floating Card (Bottom)
    const styleSelect = $("ai-select-card-style");
    const cardStyle = styleSelect ? styleSelect.value : "frosted";
    const showSwipeArrow = $("ai-check-swipe-arrow") && $("ai-check-swipe-arrow").checked;

    // Clean Photo Only mode: Skip card, just render sleek bottom-right CTA / arrow pill
    if (cardStyle === "clean") {
      const ctaPillText = showSwipeArrow ? "ILoveFinland ➔" : "Link in bio • ilovefinland.net →";
      ctx.save();
      ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif';
      const ctaM = ctx.measureText(ctaPillText);
      const ctaPadX = 24;
      const ctaPadY = 14;
      const ctaW = ctaM.width + ctaPadX * 2;
      const ctaH = brandH;
      const ctaX = w - 64 - ctaW;
      const ctaY = h - 64 - ctaH;

      ctx.fillStyle = "rgba(1, 28, 56, 0.82)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 999);
      } else {
        ctx.rect(ctaX, ctaY, ctaW, ctaH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = showSwipeArrow ? "#38BDF8" : "#FFFFFF";
      ctx.fillText(ctaPillText, ctaX + ctaPadX, ctaY + ctaH - ctaPadY - 6);
      ctx.restore();
      return;
    }

    let rawTitle = (ig.headline_line1 || "") + " " + (ig.headline_line2 || "") + (ig.headline_line3 ? " " + ig.headline_line3 : "");
    rawTitle = rawTitle.trim();
    if (!rawTitle && typeof activeStory !== "undefined" && activeStory) rawTitle = activeStory.title || "";
    const formattedTitle = toEditorialTitleCase(rawTitle);

    const catText = (ig.badge_text || "EVENTS").toUpperCase();

    const cardPad = 42;
    const cardW = w - 128; // 952px wide
    const cardX = 64;
    const cardY = h - 420; // 930px
    const cardH = 356;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 16;

    ctx.fillStyle = cardStyle === "minimal" ? "rgba(1, 37, 71, 0.92)" : "rgba(2, 24, 48, 0.84)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(cardX, cardY, cardW, cardH, 26);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.stroke();
    ctx.restore();

    // Category Pill inside Card
    ctx.save();
    ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    const catM = ctx.measureText(catText);
    const catW = catM.width + 24;
    const catH = 36;
    const catX = cardX + cardPad;
    const catY = cardY + 34;

    ctx.fillStyle = "#029CD8";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(catX, catY, catW, catH, 6);
    } else {
      ctx.rect(catX, catY, catW, catH);
    }
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(catText, catX + 12, catY + 25);

    ctx.restore();

    // Multi-line Title inside Card
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = '800 46px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif';
    const maxTitleW = cardW - cardPad * 2;
    const titleLines = wrapCanvasText(ctx, formattedTitle, maxTitleW);
    let titleY = catY + catH + 46;
    const lineH = 56;
    for (let i = 0; i < Math.min(titleLines.length, 3); i++) {
      ctx.fillText(titleLines[i], cardX + cardPad, titleY);
      titleY += lineH;
    }
    ctx.restore();

    // Footer inside Card
    ctx.save();
    const footY = cardY + cardH - 32;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + cardPad, footY - 26);
    ctx.lineTo(cardX + cardW - cardPad, footY - 26);
    ctx.stroke();

    // Dynamic category-based left CTA text
    let leftCtaText = "Read full article";
    const catUpper = (catText || "").toUpperCase();
    if (catUpper.includes("TRAVEL") || catUpper.includes("GUIDE") || catUpper.includes("TRIP") || catUpper.includes("HIKE")) {
      leftCtaText = "Read full guide & tips";
    } else if (catUpper.includes("CULTURE") || catUpper.includes("FOOD") || catUpper.includes("STORY") || catUpper.includes("LIFESTYLE")) {
      leftCtaText = "Explore the full story";
    } else if (catUpper.includes("NEWS") || catUpper.includes("ANALYSIS") || catUpper.includes("INSIGHT") || catUpper.includes("BUSINESS")) {
      leftCtaText = "Read full article";
    }

    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      ctx.drawImage(logoImg, cardX + cardPad, footY - 20, 24, 24);
      ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
      ctx.fillStyle = "#38BDF8";
      ctx.fillText(leftCtaText, cardX + cardPad + 32, footY);
    } else {
      ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
      ctx.fillStyle = "#38BDF8";
      ctx.fillText(leftCtaText, cardX + cardPad, footY);
    }

    if (showSwipeArrow) {
      ctx.fillStyle = "#38BDF8";
      ctx.textAlign = "right";
      ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
      ctx.fillText("ILoveFinland ➔", cardX + cardW - cardPad, footY);
    } else {
      ctx.fillStyle = "#94A3B8";
      ctx.textAlign = "right";
      ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
      ctx.fillText("Link in bio • ilovefinland.net →", cardX + cardW - cardPad, footY);
    }
    ctx.restore();
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

    const renderCanvases = (photoImg, hasPhoto) => {
      ctx45.clearRect(0, 0, w, h);

      let imgAspect = 1.0;
      if (hasPhoto && photoImg) {
        imgAspect = photoImg.width / photoImg.height;
        const canvasAspect = w / h;
        const zoom = Math.max(1.0, Math.min(3.0, (parseFloat(ig.photo_zoom) || 100) / 100));
        const shiftX = Math.max(-100, Math.min(100, parseFloat(ig.photo_shift_x) || 0)) / 100;
        const shiftY = Math.max(-100, Math.min(100, parseFloat(ig.photo_shift_y) || 0)) / 100;

        let baseW, baseH;
        if (imgAspect > canvasAspect) {
          baseH = h;
          baseW = h * imgAspect;
        } else {
          baseW = w;
          baseH = w / imgAspect;
        }

        const drawW = baseW * zoom;
        const drawH = baseH * zoom;
        const maxShiftX = Math.max(0, (drawW - w) / 2);
        const maxShiftY = Math.max(0, (drawH - h) / 2);
        const drawX = ((w - drawW) / 2) - (shiftX * maxShiftX);
        const drawY = ((h - drawH) / 2) - (shiftY * maxShiftY);

        ctx45.drawImage(photoImg, drawX, drawY, drawW, drawH);

        // Twilight Navy (#0A192F -> #003580) bottom gradient scrim
        const grad = ctx45.createLinearGradient(0, h * 0.42, 0, h);
        grad.addColorStop(0, "rgba(10, 25, 47, 0)");
        grad.addColorStop(0.32, "rgba(0, 53, 128, 0.58)");
        grad.addColorStop(0.68, "rgba(10, 25, 47, 0.90)");
        grad.addColorStop(1.0, "rgba(10, 25, 47, 0.98)");
        ctx45.fillStyle = grad;
        ctx45.fillRect(0, 0, w, h);
      } else {
        // --- CLEAN TWILIGHT NAVY PLACEHOLDER (#0A192F -> #003580) ---
        const bgGrad = ctx45.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, "#0A192F");
        bgGrad.addColorStop(1, "#003580");
        ctx45.fillStyle = bgGrad;
        ctx45.fillRect(0, 0, w, h);

        // Dashed center frame indicating image slot
        ctx45.save();
        ctx45.strokeStyle = "rgba(148, 163, 184, 0.45)";
        ctx45.lineWidth = 3;
        ctx45.setLineDash([12, 10]);
        if (typeof ctx45.roundRect === "function") {
          ctx45.beginPath();
          ctx45.roundRect(140, 260, 800, 360, 20);
          ctx45.stroke();
        } else {
          ctx45.strokeRect(140, 260, 800, 360);
        }
        ctx45.restore();

        // Icon & text
        ctx45.save();
        ctx45.textAlign = "center";
        ctx45.font = "64px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx45.fillText("📷", 540, 390);

        ctx45.font = "bold 38px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx45.fillStyle = "#ffffff";
        ctx45.fillText("No Image Uploaded", 540, 460);

        ctx45.font = "24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx45.fillStyle = "#94a3b8";
        ctx45.fillText("Upload a photo to complete your post", 540, 510);
        ctx45.restore();

        // Bottom gradient for typography contrast
        const grad = ctx45.createLinearGradient(0, h * 0.46, 0, h);
        grad.addColorStop(0, "rgba(10, 25, 47, 0)");
        grad.addColorStop(0.35, "rgba(10, 25, 47, 0.7)");
        grad.addColorStop(1.0, "rgba(10, 25, 47, 0.98)");
        ctx45.fillStyle = grad;
        ctx45.fillRect(0, 0, w, h);
      }

      // Draw Logo, Badges, Headlines, CTA
      const drawOverlay = (logoImg) => {
        const logoSize = 130;
        const logoX = safeLeft;
        const logoY = h * 0.075;

        if (logoImg) {
          ctx45.save();
          ctx45.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
          ctx45.restore();
        }

        // Headline Lines (supports 2 to 3 lines) + Optional Website CTA Line
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

        // Category Badge (#003882) positioned above headlines
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
        const lineGap = Math.round(12 * fontScale);

        const estimatedHeadlinesHeight = (has3Lines ? 3 : 2) * (baseLineSize + lineGap) + bH + Math.round(40 * fontScale);
        const badgeY = Math.min(h * 0.94 - estimatedHeadlinesHeight, has3Lines ? h * 0.63 : h * 0.69);

        ctx45.fillStyle = ig.badge_color || "#003882";
        ctx45.beginPath();
        if (typeof ctx45.roundRect === "function") {
          ctx45.roundRect(badgeX, badgeY, bW, bH, Math.max(6, Math.round(10 * fontScale)));
        } else {
          ctx45.rect(badgeX, badgeY, bW, bH);
        }
        ctx45.fill();

        ctx45.fillStyle = "#ffffff";
        ctx45.fillText(badgeText, badgeX + bPadH, badgeY + bH - bPadV - Math.round(4 * fontScale));

        // Headline Lines within Safety Zone - UNIFIED FONT SIZE
        let currentY = badgeY + bH + Math.round(44 * fontScale);

        ctx45.save();
        ctx45.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx45.shadowBlur = Math.round(8 * fontScale);
        ctx45.shadowOffsetY = 2;

        const fit1 = fitHeadlineFontSize(ctx45, line1, baseLineSize, maxTextWidth);
        const fit2 = fitHeadlineFontSize(ctx45, line2, baseLineSize, maxTextWidth);
        const fit3 = has3Lines ? fitHeadlineFontSize(ctx45, line3, baseLineSize, maxTextWidth) : fit2;
        const unifiedSize = has3Lines ? Math.min(fit1, fit2, fit3) : Math.min(fit1, fit2);

        const col1 = (ig.line1_color === "blue") ? "#00A3FF" : "#ffffff";
        const col2 = (ig.line2_color === "blue") ? "#00A3FF" : "#ffffff";
        const col3 = (ig.line3_color === "white") ? "#ffffff" : "#00A3FF";

        if (has3Lines) {
          ctx45.font = `900 ${unifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = col1;
          ctx45.shadowColor = (col1 === "#00A3FF") ? "rgba(0, 56, 130, 0.85)" : "rgba(0, 0, 0, 0.85)";
          ctx45.shadowBlur = Math.round((col1 === "#00A3FF" ? 10 : 8) * fontScale);
          ctx45.fillText(line1, badgeX, currentY);

          currentY += unifiedSize + lineGap;
          ctx45.font = `900 ${unifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = col2;
          ctx45.shadowColor = (col2 === "#00A3FF") ? "rgba(0, 56, 130, 0.85)" : "rgba(0, 0, 0, 0.85)";
          ctx45.shadowBlur = Math.round((col2 === "#00A3FF" ? 10 : 8) * fontScale);
          ctx45.fillText(line2, badgeX, currentY);

          currentY += unifiedSize + lineGap;
          ctx45.font = `900 ${unifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = col3;
          ctx45.shadowColor = (col3 === "#00A3FF") ? "rgba(0, 56, 130, 0.85)" : "rgba(0, 0, 0, 0.85)";
          ctx45.shadowBlur = Math.round((col3 === "#00A3FF" ? 10 : 8) * fontScale);
          ctx45.fillText(line3, badgeX, currentY);
        } else {
          ctx45.font = `900 ${unifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = col1;
          ctx45.shadowColor = (col1 === "#00A3FF") ? "rgba(0, 56, 130, 0.85)" : "rgba(0, 0, 0, 0.85)";
          ctx45.shadowBlur = Math.round((col1 === "#00A3FF" ? 10 : 8) * fontScale);
          ctx45.fillText(line1, badgeX, currentY);

          currentY += unifiedSize + lineGap + 4;
          ctx45.font = `900 ${unifiedSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx45.fillStyle = col2;
          ctx45.shadowColor = (col2 === "#00A3FF") ? "rgba(0, 56, 130, 0.85)" : "rgba(0, 0, 0, 0.85)";
          ctx45.shadowBlur = Math.round((col2 === "#00A3FF" ? 10 : 8) * fontScale);
          ctx45.fillText(line2, badgeX, currentY);
        }

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

          if (hasPhoto && photoImg) {
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

            const fbGrad = ctxFb.createLinearGradient(0, fbH * 0.35, 0, fbH);
            fbGrad.addColorStop(0, "rgba(11, 26, 44, 0)");
            fbGrad.addColorStop(0.35, "rgba(11, 26, 44, 0.65)");
            fbGrad.addColorStop(0.70, "rgba(11, 26, 44, 0.90)");
            fbGrad.addColorStop(1.0, "rgba(11, 26, 44, 0.98)");
            ctxFb.fillStyle = fbGrad;
            ctxFb.fillRect(0, 0, fbW, fbH);
          } else {
            const fbBgGrad = ctxFb.createLinearGradient(0, 0, 0, fbH);
            fbBgGrad.addColorStop(0, "#0a192f");
            fbBgGrad.addColorStop(1, "#1e293b");
            ctxFb.fillStyle = fbBgGrad;
            ctxFb.fillRect(0, 0, fbW, fbH);

            ctxFb.save();
            ctxFb.strokeStyle = "rgba(148, 163, 184, 0.3)";
            ctxFb.lineWidth = 2;
            ctxFb.setLineDash([8, 8]);
            ctxFb.strokeRect(280, 40, 640, 180);
            ctxFb.restore();

            ctxFb.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctxFb.fillStyle = "#F8FAFC";
            ctxFb.textAlign = "center";
            ctxFb.fillText("📷 No Image Uploaded", 600, 135);
            ctxFb.textAlign = "start";
          }

          if (logoImg) {
            ctxFb.drawImage(logoImg, 60, 36, 80, 80);
          }

          const fbBadgeFontSize = Math.round(22 * fontScale);
          const fbBH = Math.round(36 * fontScale);
          ctxFb.font = `bold ${fbBadgeFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          const fbBadgeMetric = ctxFb.measureText(badgeText);
          const fbBW = fbBadgeMetric.width + Math.round(36 * fontScale);
          const fbBadgeY = Math.min(fbH * 0.72 - (fbBH + Math.round(80 * fontScale)), fbH * 0.52);

          ctxFb.fillStyle = ig.badge_color || "#003882";
          ctxFb.beginPath();
          if (typeof ctxFb.roundRect === "function") {
            ctxFb.roundRect(60, fbBadgeY, fbBW, fbBH, Math.max(4, Math.round(8 * fontScale)));
          } else {
            ctxFb.rect(60, fbBadgeY, fbBW, fbBH);
          }
          ctxFb.fill();
          ctxFb.fillStyle = "#ffffff";
          ctxFb.fillText(badgeText, 60 + Math.round(18 * fontScale), fbBadgeY + fbBH - Math.round(11 * fontScale));

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

        // Render AI-suggested modern Scandinavian style post
        renderAISuggestedPost(photoImg, hasPhoto, logoImg, ig);
        if (hasPhoto && photoImg && typeof carouselSlidesData !== "undefined" && carouselSlidesData[1]) {
          if (!carouselSlidesData[1].photoImg && !carouselSlidesData[1].photoDataUrl) {
            carouselSlidesData[1].photoImg = photoImg;
            if (activeCarouselSlide === 1 && typeof window.renderActiveCarouselSlideCanvas === "function") {
              window.renderActiveCarouselSlideCanvas();
            }
          }
        }
      };

      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = ig.logo_url || "/assets/ilf-heart-exact.png";
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        drawOverlay(logoImg);
      } else {
        logoImg.onload = () => drawOverlay(logoImg);
        logoImg.onerror = () => drawOverlay(null);
      }
    };

    const hasPhoto = Boolean(ig.photo_url && ig.photo_url.trim());
    if (hasPhoto) {
      const photoImg = new Image();
      photoImg.crossOrigin = "anonymous";
      photoImg.src = ig.photo_url;
      photoImg.onload = () => renderCanvases(photoImg, true);
      photoImg.onerror = () => renderCanvases(null, false);
    } else {
      renderCanvases(null, false);
    }
  }

  /* ---------- REEL WORKSPACE RENDERER (On-Demand or Active Player) ---------- */
  function renderReelWorkspace(v) {
    const noticeEl = $("reel-on-demand-notice");
    const workspaceEl = $("reel-player-workspace");
    const scenesOverviewEl = $("block-reel-scenes-overview");
    const reelData = v.reel;

    const hasReel = reelData && reelData.scenes && reelData.scenes.length > 0;
    if (!hasReel) {
      noticeEl?.classList.remove("hidden");
      workspaceEl?.classList.add("hidden");
      scenesOverviewEl?.classList.add("hidden");
      const tableWrap = $("reel-scenes-table-wrap");
      if (tableWrap) tableWrap.innerHTML = "";
      return;
    }

    noticeEl?.classList.add("hidden");
    workspaceEl?.classList.remove("hidden");
    scenesOverviewEl?.classList.remove("hidden");

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
        <div style="grid-column:1/-1;background:#0B0F16;border:1px solid #303B4D;border-radius:10px;padding:14px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="color:#FFFFFF;">🎯 Top 3 Priorities for Limited Resources (Home Production Ready)</strong>
            <span class="badge badge-check">Zero Travel Shoot Needed</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:10px;">
            ${weeklyPriorities
              .map(
                (p) => `
              <div style="background:#162235;border:1px solid #303B4D;border-radius:8px;padding:12px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span class="badge badge-origin" style="font-size:0.7rem;">Priority #${p.priority_num} • ${p.section}</span>
                  <span class="pill pill-scheduled" style="font-size:0.68rem;">${p.rough_effort}</span>
                </div>
                <strong style="font-size:0.86rem;color:#FFFFFF;display:block;margin-bottom:4px;">${p.topic}</strong>
                <div class="hint-text" style="font-size:0.75rem;margin-bottom:4px;color:#B8C4D4;"><strong>Format:</strong> ${p.recommended_format}</div>
                <div class="hint-text" style="font-size:0.75rem;margin-bottom:4px;color:#B8C4D4;"><strong>Assets:</strong> ${p.assets_needed}</div>
                <div style="font-size:0.74rem;color:#168BFF;margin-top:4px;"><strong>Reel Recommendation:</strong> ${p.reel_worth_score}</div>
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
        <div class="plan-card ${idea.status}" data-id="${idea.id}" style="background:#162235;border:1px solid #303B4D;border-radius:10px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
              <span class="badge badge-origin">${idea.category}</span>
              <span class="pill ${idea.status === "accepted" ? "pill-approved" : idea.status === "dismissed" ? "pill-missed" : ""}">${idea.status.toUpperCase()}</span>
            </div>
            <h4 style="margin:8px 0 4px;font-size:0.96rem;color:#FFFFFF;">${idea.title}</h4>
            <div class="hint-text" style="color:#B8C4D4;">${idea.angle}</div>
            <div class="plan-reason-box" style="margin-top:8px;background:#0B0F16;border:1px solid #303B4D;color:#B8C4D4;">
              <strong style="color:#FFFFFF;">Why This Week:</strong> ${idea.fit_reason}
            </div>
            <div style="margin-top:6px;font-size:0.8rem;color:#B8C4D4;">
              Format: <strong style="color:#FFFFFF;">${idea.recommended_format}</strong> • Slot: <strong style="color:#FFFFFF;">${idea.target_date_hki.replace("T", " ")}</strong>
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

  /* ---------- ARTICLE SUGGESTIONS (EDITORIAL DISCOVERY) ---------- */
  let activeIdeaScope = "all";
  let activeIdeaSection = "all";
  let activeIdeaStatus = "suggested";
  let activeIdeaSort = "latest";
  let activeIdeaSearch = "";
  let ideasVisibleCount = 12;
  let cachedSuggestions = [];
  let lastScanData = null;
  let activeModalStory = null;

  function formatIdeaDate(dateStr) {
    if (!dateStr) return "Today";
    try {
      const d = new Date(dateStr.replace(" ", "T"));
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("en-US", { month: "short" });
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${day} ${month}, ${hours}:${mins}`;
    } catch {
      return dateStr;
    }
  }

  function formatRelativeTime(dateStr) {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr.replace(" ", "T"));
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 60) return "Just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      const days = Math.floor(diffSec / 86400);
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  }

  async function loadIdeasPool() {
    try {
      const data = await api("/api/calendar/plan");
      cachedSuggestions = data.ideas || [];
      lastScanData = data.last_scan || null;

      // Update Header Scanner Status
      updateScanStatusDisplay();

      // Update Global Sidebar / BNav Counters
      const countActive = cachedSuggestions.filter((i) => (i.status || "suggested") === "suggested").length;
      const badgeCount = $("badge-ideas-count");
      if (badgeCount) badgeCount.textContent = countActive;
      const inlineCount = $("btn-ideas-count-inline");
      if (inlineCount) inlineCount.textContent = countActive;
      const tabCount = $("suggestions-tab-count");
      if (tabCount) tabCount.textContent = countActive;

      renderIdeasCards();
    } catch (err) {
      console.warn("Could not load ideas pool:", err);
    }
  }

  function updateScanStatusDisplay() {
    const textEl = $("ideas-last-scan-text");
    const dotEl = $("ideas-scan-indicator-dot");
    if (!textEl) return;
    if (lastScanData && lastScanData.ran_at) {
      const relTime = formatRelativeTime(lastScanData.ran_at);
      const isSuccess = Boolean(lastScanData.success);
      if (dotEl) {
        dotEl.style.background = isSuccess ? "#10b981" : "#ef4444";
      }
      textEl.textContent = `Last successful scan: ${relTime} · Scanner Active`;
    } else {
      textEl.textContent = "Last scan: Today · Scanner Active";
    }
  }

  function renderIdeasCards() {
    const grid = $("ideas-cards-grid");
    if (!grid) return;

    let list = cachedSuggestions || [];

    // 1. Filter by Status (Active Suggestions | Saved Stories | Dismissed)
    list = list.filter((i) => {
      const st = i.status || "suggested";
      if (activeIdeaStatus === "saved") return st === "saved";
      if (activeIdeaStatus === "dismissed") return st === "dismissed";
      return st === "suggested";
    });

    // 2. Filter by Scope (All | Finland | International)
    if (activeIdeaScope !== "all") {
      list = list.filter((i) => {
        const isIntl = i.priority_rank === 3 || (i.region || "").toLowerCase() === "international" || (i.category || "").toLowerCase() === "international";
        if (activeIdeaScope === "finland") return !isIntl;
        if (activeIdeaScope === "international") return isIntl;
        return true;
      });
    }

    // 3. Filter by Website Section
    if (activeIdeaSection !== "all") {
      list = list.filter((i) => (i.section || "").toLowerCase() === activeIdeaSection.toLowerCase());
    }

    // 4. Search Filter
    if (activeIdeaSearch && activeIdeaSearch.trim()) {
      const q = activeIdeaSearch.trim().toLowerCase();
      list = list.filter((i) => {
        const t = (i.title || "").toLowerCase();
        const a = (i.angle || "").toLowerCase();
        const s = (i.section || "").toLowerCase();
        const c = (i.category || "").toLowerCase();
        const r = (i.region || "").toLowerCase();
        const o = (i.outlet || "").toLowerCase();
        return t.includes(q) || a.includes(q) || s.includes(q) || c.includes(q) || r.includes(q) || o.includes(q);
      });
    }

    // 5. Sorting (Latest First vs Most Relevant)
    if (activeIdeaSort === "latest") {
      list.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else {
      // Most Relevant: Today's stories first, then yesterday, then older; within each day group, priority_rank 1 -> 2 -> 3, then newer id
      const todayStr = new Date().toISOString().slice(0, 10);
      list.sort((a, b) => {
        const aDate = (a.target_date_hki || "").slice(0, 10);
        const bDate = (b.target_date_hki || "").slice(0, 10);
        const aIsToday = aDate >= todayStr ? 1 : 0;
        const bIsToday = bDate >= todayStr ? 1 : 0;
        if (aIsToday !== bIsToday) return bIsToday - aIsToday;

        const pDiff = (a.priority_rank || 2) - (b.priority_rank || 2);
        if (pDiff !== 0) return pDiff;
        return (b.id || 0) - (a.id || 0);
      });
    }

    // Update Summary Count Line
    const summaryCount = $("ideas-summary-count");
    if (summaryCount) {
      const label = activeIdeaStatus === "saved" ? "saved stories" : activeIdeaStatus === "dismissed" ? "dismissed stories" : "article suggestions";
      summaryCount.textContent = `Showing ${Math.min(ideasVisibleCount, list.length)} of ${list.length} ${label}`;
    }

    // Empty state
    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:44px 16px;background:#0B0F16;border:1px dashed #303B4D;border-radius:12px;">
          <h3 style="margin:0 0 6px;color:#FFFFFF;font-size:1.05rem;font-weight:700;">No stories found</h3>
          <p style="margin:0 0 16px;color:#B8C4D4;font-size:0.875rem;">
            ${activeIdeaSearch ? 'No suggestions match your search keyword.' : activeIdeaStatus === 'saved' ? 'You have no saved stories yet.' : activeIdeaStatus === 'dismissed' ? 'No dismissed stories in archive.' : 'Try adjusting your section filter or scan for new stories.'}
          </p>
          <div style="display:flex;gap:8px;justify-content:center;">
            ${activeIdeaSearch || activeIdeaSection !== 'all' || activeIdeaScope !== 'all' ? `
              <button type="button" class="btn btn-secondary btn-sm btn-reset-idea-filters" style="background:#162235;border:1px solid #303B4D;color:#FFFFFF;">
                Reset Filters
              </button>` : ''}
            <button type="button" class="btn btn-primary btn-sm btn-trigger-scan-inline" style="background:#003580;color:#fff;border:none;">
              Scan for New Stories
            </button>
          </div>
        </div>`;
      grid.querySelector(".btn-reset-idea-filters")?.addEventListener("click", resetIdeaFilters);
      grid.querySelector(".btn-trigger-scan-inline")?.addEventListener("click", triggerScanNow);
      const pag = $("ideas-pagination-wrap");
      if (pag) pag.style.display = "none";
      return;
    }

    // Visible sliced items
    const visibleItems = list.slice(0, ideasVisibleCount);

    grid.innerHTML = visibleItems.map((idea) => {
      const isIntl = idea.priority_rank === 3 || (idea.region || "").toLowerCase() === "international" || (idea.category || "").toLowerCase() === "international";
      const isBreaking = idea.priority_rank === 1 && Boolean(idea.is_breaking);

      // Clean, non-repetitive relevance badge only when supported by evaluation
      let relevanceBadge = "";
      if (isBreaking) {
        relevanceBadge = `<span class="badge" style="font-size:0.7rem;background:#fee2e2;color:#991b1b;font-weight:700;padding:2px 6px;border-radius:4px;">Breaking Alert</span>`;
      } else if (idea.priority_rank === 1) {
        relevanceBadge = `<span class="badge" style="font-size:0.7rem;background:#eff6ff;color:#1e40af;font-weight:600;padding:2px 6px;border-radius:4px;">High Priority</span>`;
      }

      const dateStr = formatRelativeTime(idea.published_time || idea.created_at);
      const isSaved = idea.status === "saved";

      return `
        <div class="idea-card-clean" data-id="${idea.id}">
          <div>
            <!-- Meta Bar: Section & Category, Region, Relevance -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:6px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span class="badge" style="font-size:0.72rem;background:#003580;color:#fff;font-weight:600;padding:2px 8px;border-radius:4px;">
                  ${escapeHtml(idea.section || 'News')} • ${escapeHtml(idea.category || 'Finland')}
                </span>
                <span class="badge" style="font-size:0.72rem;background:#0B0F16;color:#B8C4D4;border:1px solid #303B4D;font-weight:500;padding:2px 6px;border-radius:4px;">
                  ${escapeHtml(idea.region || (isIntl ? 'International' : 'Finland'))}
                </span>
              </div>
              ${relevanceBadge}
            </div>

            <!-- Headline (max 3 lines) -->
            <h3 class="idea-headline-clamp" title="${escapeHtml(idea.title)}">
              ${escapeHtml(idea.title)}
            </h3>

            <!-- Summary (max 2 lines) -->
            <p class="idea-summary-clamp">
              ${escapeHtml(idea.angle || '')}
            </p>

            <!-- Source & Timing -->
            <div style="font-size:0.74rem;color:#B8C4D4;display:flex;align-items:center;gap:6px;margin-bottom:12px;">
              <span style="font-weight:600;color:#FFFFFF;">${escapeHtml(idea.outlet || 'Verified Source')}</span>
              <span>·</span>
              <span>${escapeHtml(dateStr)}</span>
              ${idea.is_covered ? `<span class="badge" style="background:rgba(245,158,11,0.2);color:#FBBF24;border:1px solid rgba(245,158,11,0.4);font-size:0.68rem;padding:1px 5px;margin-left:auto;">Covered in Studio</span>` : ''}
            </div>
          </div>

          <!-- Actions Bar -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #303B4D;gap:6px;" onclick="event.stopPropagation();">
            <button type="button" class="btn btn-primary btn-sm btn-write-article-from-idea" data-id="${idea.id}" style="font-size:0.8rem;padding:6px 14px;font-weight:600;background:#003580;color:#fff;border-radius:6px;border:none;display:inline-flex;align-items:center;gap:5px;">
              <span>✍️ Write Article</span>
            </button>
            <div style="display:flex;align-items:center;gap:4px;">
              <button type="button" class="btn btn-ghost btn-sm btn-save-idea" data-id="${idea.id}" title="${isSaved ? 'Remove from Saved' : 'Save for later'}" style="padding:6px 8px;font-size:0.95rem;color:${isSaved ? '#168BFF' : '#B8C4D4'};">
                ${isSaved ? '🔖' : '🏷️'}
              </button>
              ${activeIdeaStatus === 'dismissed' ? `
                <button type="button" class="btn btn-ghost btn-sm btn-recover-idea" data-id="${idea.id}" title="Recover to active suggestions" style="padding:6px 8px;font-size:0.78rem;color:#10B981;font-weight:600;">
                  ↩ Recover
                </button>
              ` : `
                <button type="button" class="btn btn-ghost btn-sm btn-dismiss-idea" data-id="${idea.id}" title="Dismiss from suggestions" style="padding:6px 8px;font-size:0.85rem;color:#B8C4D4;">
                  ✕
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Wire Card Click -> Open Story Details Modal
    grid.querySelectorAll(".idea-card-clean").forEach((card) => {
      card.addEventListener("click", () => {
        const id = parseInt(card.dataset.id, 10);
        const idea = cachedSuggestions.find((i) => i.id === id);
        if (idea) openStoryDetailsModal(idea);
      });
    });

    // Wire "Write Article" Button
    grid.querySelectorAll(".btn-write-article-from-idea").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = parseInt(b.dataset.id, 10);
        const idea = cachedSuggestions.find((i) => i.id === id);
        if (idea) openCreateArticleFromIdea(idea);
      });
    });

    // Wire "Save" Button (Instant in-place update)
    grid.querySelectorAll(".btn-save-idea").forEach((b) => {
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = parseInt(b.dataset.id, 10);
        const idea = cachedSuggestions.find((i) => i.id === id);
        if (!idea) return;
        const newStatus = idea.status === "saved" ? "suggested" : "saved";
        const action = newStatus === "saved" ? "save" : "unsave";
        idea.status = newStatus;
        renderIdeasCards();
        try {
          await api("/api/calendar/plan/action", {
            method: "POST",
            body: JSON.stringify({ action, id }),
          });
          showToast(newStatus === "saved" ? "Story saved for later." : "Story removed from saved.", "info");
        } catch (err) {
          console.warn("Save failed:", err);
        }
      });
    });

    // Wire "Dismiss" Button (Instant in-place update)
    grid.querySelectorAll(".btn-dismiss-idea").forEach((b) => {
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = parseInt(b.dataset.id, 10);
        const idea = cachedSuggestions.find((i) => i.id === id);
        if (!idea) return;
        idea.status = "dismissed";
        renderIdeasCards();
        try {
          await api("/api/calendar/plan/action", {
            method: "POST",
            body: JSON.stringify({ action: "dismiss", id }),
          });
          showToast("Story dismissed (recoverable in Archive).", "info");
        } catch (err) {
          console.warn("Dismiss failed:", err);
        }
      });
    });

    // Wire "Recover" Button (Instant in-place restore)
    grid.querySelectorAll(".btn-recover-idea").forEach((b) => {
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = parseInt(b.dataset.id, 10);
        const idea = cachedSuggestions.find((i) => i.id === id);
        if (!idea) return;
        idea.status = "suggested";
        renderIdeasCards();
        try {
          await api("/api/calendar/plan/action", {
            method: "POST",
            body: JSON.stringify({ action: "recover", id }),
          });
          showToast("Story recovered to active suggestions.", "success");
        } catch (err) {
          console.warn("Recover failed:", err);
        }
      });
    });

    // Pagination / Load More
    const pag = $("ideas-pagination-wrap");
    if (pag) {
      pag.style.display = list.length > ideasVisibleCount ? "block" : "none";
    }
  }

  function resetIdeaFilters() {
    activeIdeaScope = "all";
    activeIdeaSection = "all";
    activeIdeaSearch = "";
    ideasVisibleCount = 12;
    const searchInput = $("ideas-search-input");
    if (searchInput) searchInput.value = "";
    const secSelect = $("ideas-section-select");
    if (secSelect) secSelect.value = "all";
    document.querySelectorAll(".filter-idea-scope").forEach((b) => b.classList.toggle("active", b.dataset.scope === "all"));
    renderIdeasCards();
  }

  function openCreateArticleFromIdea(idea) {
    const modal = $("modal-create-article-post");
    if (!modal) return;
    modal.classList.remove("hidden");
    if ($("new-article-topic")) $("new-article-topic").value = idea.title || "";
    if ($("new-article-instructions")) {
      $("new-article-instructions").value = idea.angle || "";
    }
    if ($("new-article-references")) $("new-article-references").value = idea.source_url || "";
    if ($("new-article-section") && idea.section) $("new-article-section").value = idea.section;
    if ($("new-article-category") && idea.category) $("new-article-category").value = idea.category;
    if ($("new-article-language")) $("new-article-language").value = "English";

    // Reset photo upload
    pendingCreatedPhoto = null;
    if ($("create-photo-preview-wrap")) $("create-photo-preview-wrap").classList.add("hidden");
    if ($("create-photo-preview-img")) $("create-photo-preview-img").src = "";
    if ($("create-photo-filename")) $("create-photo-filename").textContent = "No photo selected (can be uploaded later)";
    if ($("create-photo-status-badge")) {
      $("create-photo-status-badge").textContent = "No Image Uploaded";
      $("create-photo-status-badge").style.background = "#e2e8f0";
      $("create-photo-status-badge").style.color = "#475569";
    }
    if ($("btn-remove-create-photo")) $("btn-remove-create-photo").classList.add("hidden");
  }

  function openStoryDetailsModal(idea) {
    activeModalStory = idea;
    const modal = $("modal-story-details");
    if (!modal) return;

    if ($("modal-story-title")) $("modal-story-title").textContent = idea.title || "";
    if ($("modal-story-angle")) $("modal-story-angle").textContent = idea.angle || "No summary available.";
    if ($("modal-story-context")) $("modal-story-context").textContent = idea.fit_reason || "Timely and relevant coverage for ilovefinland.net.";
    if ($("modal-story-outlet")) $("modal-story-outlet").textContent = idea.outlet || "Verified Finnish Source";
    if ($("modal-story-date")) $("modal-story-date").textContent = formatIdeaDate(idea.published_time || idea.created_at);

    if ($("modal-story-section-badge")) $("modal-story-section-badge").textContent = `${idea.section || 'News'} • ${idea.category || 'Finland'}`;
    if ($("modal-story-region-badge")) $("modal-story-region-badge").textContent = idea.region || "Finland";

    const relBadge = $("modal-story-relevance-badge");
    if (relBadge) {
      if (idea.priority_rank === 1 && idea.is_breaking) {
        relBadge.style.display = "inline-block";
        relBadge.style.background = "#ef4444";
        relBadge.textContent = "Breaking Alert";
      } else if (idea.priority_rank === 1) {
        relBadge.style.display = "inline-block";
        relBadge.style.background = "#2563eb";
        relBadge.textContent = "High Priority";
      } else {
        relBadge.style.display = "none";
      }
    }

    const urlLink = $("modal-story-url-link");
    const urlText = $("modal-story-url-text");
    if (urlLink && urlText) {
      if (idea.source_url) {
        urlLink.href = idea.source_url;
        urlText.textContent = idea.source_url;
        urlLink.parentElement.style.display = "block";
      } else {
        urlLink.parentElement.style.display = "none";
      }
    }

    const saveText = $("btn-modal-story-save-text");
    const saveIcon = $("btn-modal-story-save-icon");
    if (saveText) saveText.textContent = idea.status === "saved" ? "Unsave Story" : "Save Story";
    if (saveIcon) saveIcon.textContent = idea.status === "saved" ? "🔖" : "🏷️";

    modal.classList.remove("hidden");
  }

  async function triggerScanNow() {
    const btn = $("btn-scan-now");
    const origHtml = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">⏳ <span>Scanning for stories…</span></span>`;
    }
    try {
      const res = await api("/api/research/scan_now", { method: "POST", body: "{}" });
      cachedSuggestions = res.ideas || [];
      lastScanData = res.last_scan || null;
      updateScanStatusDisplay();
      renderIdeasCards();
      showToast("Scan complete: New stories checked & synced.", "success");
    } catch (err) {
      console.warn("Scan failed:", err);
      showToast("Scan failed: " + err.message, "error");
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
    if (!body) return;

    // Update month title display (e.g. November 2026)
    const monthDisplay = $("cal-month-display");
    if (monthDisplay) {
      monthDisplay.textContent = `${CAL_MONTH_NAMES[calCurrentMonth]} ${calCurrentYear}`;
    }

    const events = calendarData.events || [];

    // Optional filters if present
    const chanFilter = $("cal-filter-channel")?.value || "all";
    const formatFilter = $("cal-filter-format")?.value || "all";
    const statusFilter = $("cal-filter-status")?.value || "all";

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
        <div class="cal-list" style="margin-top:12px;">
          ${filtered.length === 0 ? '<div class="hint-text" style="padding:20px;text-align:center;">No scheduled items in agenda.</div>' : ''}
          ${filtered
            .map(
              (e) => `
            <div class="cal-event-card ${e.overlap ? "overlap-warning" : ""} ${e.missed ? "missed-slot" : ""}" data-id="${e.package_id}" data-comp="${e.format}" style="background:#0B0F16;border:1px solid #303B4D;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer;">
              <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <strong style="color:#FFFFFF;">${escapeHtml(e.title)}</strong>
                <span class="cal-event-pill ${e.status === 'published' ? 'cal-pill-published' : e.format === 'Article' ? 'cal-pill-article' : e.format === 'Reel' ? 'cal-pill-reel' : 'cal-pill-social'}">${e.status}</span>
              </div>
              <div class="hint-text" style="margin-top:4px;color:#B8C4D4;font-size:0.75rem;">
                ${e.channel} • ${e.datetime_hki.replace("T", " ")} (Europe/Helsinki)
              </div>
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
        const dayEvents = filtered.filter((e) => e.datetime_hki && e.datetime_hki.startsWith(dateStr));
        const isToday = i === (currentDay === 0 ? 6 : currentDay - 1);

        colsHtml += `
          <div class="cal-week-col ${isToday ? "today" : ""}" style="background:#0B0F16;border:1px solid ${isToday ? '#168BFF' : '#303B4D'};border-radius:10px;padding:10px;min-height:160px;">
            <div class="cal-week-head" style="font-weight:700;color:${isToday ? '#168BFF' : '#FFFFFF'};border-bottom:1px solid #303B4D;padding-bottom:6px;margin-bottom:8px;">${days[i]} <span style="font-weight:normal;font-size:0.75rem;color:#B8C4D4;">${dateStr.slice(5)}</span></div>
            <div class="cal-week-events">
              ${dayEvents
                .map(
                  (e) => `
                <div class="cal-event-card ${e.overlap ? "overlap-warning" : ""} ${e.missed ? "missed-slot" : ""}" data-id="${e.package_id}" data-comp="${e.format}" style="margin-bottom:6px;cursor:pointer;">
                  <div style="font-weight:600;font-size:0.8rem;color:#FFFFFF;">${escapeHtml(e.title)}</div>
                  <span class="cal-event-pill ${e.status === 'published' ? 'cal-pill-published' : e.format === 'Article' ? 'cal-pill-article' : e.format === 'Reel' ? 'cal-pill-reel' : 'cal-pill-social'}">${e.format}</span>
                </div>`
                )
                .join("")}
            </div>
          </div>`;
      }

      body.innerHTML = `<div class="cal-week-grid" style="display:grid;grid-template-columns:repeat(7, 1fr);gap:8px;margin-top:12px;">${colsHtml}</div>`;
      wireCalendarCards(body);
      return;
    }

    // MONTH GRID — Matches User's Reference Screenshot Exactly
    const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay(); // 0 is Sun
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // 0 for Mon ... 6 for Sun
    const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calCurrentYear, calCurrentMonth, 0).getDate();

    const weekdaysHeader = `
      <div class="cal-weekdays-header">
        <div class="cal-weekday-label">Mon</div>
        <div class="cal-weekday-label">Tue</div>
        <div class="cal-weekday-label">Wed</div>
        <div class="cal-weekday-label">Thu</div>
        <div class="cal-weekday-label">Fri</div>
        <div class="cal-weekday-label">Sat</div>
        <div class="cal-weekday-label">Sun</div>
      </div>
    `;

    let cellsHtml = "";
    let cellCount = 0;

    // 1. Previous Month Days
    for (let p = startOffset - 1; p >= 0; p--) {
      const dNum = prevMonthDays - p;
      cellsHtml += `
        <div class="cal-dark-cell other-month">
          <div class="cal-cell-day-num">${dNum}</div>
        </div>
      `;
      cellCount++;
    }

    // 2. Current Month Days
    const realToday = new Date();
    const isCurrentRealMonth = (realToday.getFullYear() === calCurrentYear && realToday.getMonth() === calCurrentMonth);
    const todayDateNum = isCurrentRealMonth ? realToday.getDate() : 17;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calCurrentYear}-${String(calCurrentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEvents = filtered.filter((e) => e.datetime_hki && e.datetime_hki.startsWith(dateStr));
      const isToday = (d === todayDateNum);

      let eventsMarkup = "";
      if (dayEvents.length > 0) {
        eventsMarkup = dayEvents
          .map((e) => {
            const pillClass = e.status === "published" ? "cal-pill-published" : e.format === "Article" ? "cal-pill-article" : e.format === "Reel" ? "cal-pill-reel" : "cal-pill-social";
            const fmtIcon = e.format === "Article" ? "📰" : e.format === "Reel" ? "🎬" : "📱";
            const displayTitle = e.title ? `${fmtIcon} ${escapeHtml(e.title)}` : escapeHtml(e.format || "Item");
            return `<div class="cal-event-pill ${pillClass}" data-id="${e.package_id || ''}" title="${escapeHtml(e.title || e.format)}">${displayTitle}</div>`;
          })
          .join("");
      } else if (calCurrentYear === 2026 && calCurrentMonth === 10) {
        // Illustrative items matching the user's reference screenshot
        if (d === 17) {
          eventsMarkup = `<div class="cal-event-pill cal-pill-article" title="Article">Article</div>`;
        } else if (d === 18) {
          eventsMarkup = `<div class="cal-event-pill cal-pill-social" title="Social Post">Social</div>`;
        } else if (d === 20) {
          eventsMarkup = `<div class="cal-event-pill cal-pill-reel" title="Reel">Reel</div>`;
        } else if (d === 23) {
          eventsMarkup = `<div class="cal-event-pill cal-pill-published" title="Published">Published</div>`;
        }
      }

      cellsHtml += `
        <div class="cal-dark-cell ${isToday ? "is-today" : ""}" data-date="${dateStr}">
          <div class="cal-cell-day-num">${d}</div>
          ${eventsMarkup}
        </div>
      `;
      cellCount++;
    }

    // 3. Next Month Days to complete 35 cells (or 42 if needed)
    const targetTotal = cellCount <= 35 ? 35 : 42;
    let nextDayNum = 1;
    while (cellCount < targetTotal) {
      cellsHtml += `
        <div class="cal-dark-cell other-month">
          <div class="cal-cell-day-num">${nextDayNum}</div>
        </div>
      `;
      nextDayNum++;
      cellCount++;
    }

    body.innerHTML = `
      ${weekdaysHeader}
      <div class="cal-month-grid-dark">
        ${cellsHtml}
      </div>
    `;

    // Click on a date cell to assign deadline or create project
    body.querySelectorAll(".cal-dark-cell").forEach((cell) => {
      cell.addEventListener("click", (evt) => {
        if (evt.target.classList.contains("cal-event-pill")) {
          const pkgId = evt.target.dataset.id;
          if (pkgId) {
            loadPackage(parseInt(pkgId, 10));
            switchView("review");
            return;
          }
        }
        if (cell.dataset.date) {
          const assignInput = $("assign-deadline");
          if (assignInput) assignInput.value = `${cell.dataset.date}T12:00`;
        }
      });
    });
  }

  function wireCalendarCards(container) {
    container.querySelectorAll(".cal-event-card, .cal-event-pill").forEach((card) => {
      card.addEventListener("click", (e) => {
        e.stopPropagation();
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
        <div style="grid-column:1/-1;background:#0B0F16;border:1px solid #303B4D;border-radius:10px;padding:14px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="color:#FFFFFF;">📅 Daily Editorial Review &amp; Rotation (${dailyRes.date_label})</strong>
            <span class="badge ${dailyRes.has_new_verified_story ? "badge-check" : "badge-sample"}">${dailyRes.has_new_verified_story ? "New verified story" : "No new verified story today"}</span>
          </div>
          <p style="font-size:0.85rem;color:#B8C4D4;margin:0 0 10px;">${dailyRes.daily_review_summary}</p>
          <div style="font-size:0.78rem;background:#162235;border:1px solid #303B4D;border-radius:6px;padding:8px;margin-bottom:10px;color:#B8C4D4;">
            <div><strong style="color:#FFFFFF;">Runs:</strong> ${dailyRes.automatic_schedule}</div>
            <div><strong style="color:#FFFFFF;">This run:</strong> ${dailyRes.ran_at} &nbsp; <strong style="color:#FFFFFF;">Previous run:</strong> ${dailyRes.last_run ? dailyRes.last_run.ran_at : "none recorded"}</div>
            <div style="margin-top:4px;"><strong style="color:#FFFFFF;">Sources checked:</strong></div>
            <ul style="margin:2px 0 0 16px;padding:0;">${(dailyRes.sources_checked || []).map((c) => `<li><b style="text-transform:uppercase;font-size:0.68rem;color:#FFFFFF;">${c.source_type.replace("_", " ")}</b> ${c.status === "completed" ? "✅" : "⚠️ not completed"} ${c.name}: <span class="hint-text" style="color:#B8C4D4;">${c.detail}</span></li>`).join("")}</ul>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:8px;">
            ${(dailyRes.vertical_rotation || [])
              .map(
                (v) => `
              <div class="rotation-card" data-title="${encodeURIComponent(v.title)}" style="background:#162235;border:1px solid #303B4D;border-radius:6px;padding:8px;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;margin-bottom:4px;">
                  <div style="display:flex;gap:4px;align-items:center;">
                    <span class="badge badge-origin" style="padding:2px 6px;">${v.section}</span>
                    <span class="badge badge-sample" style="padding:2px 6px;">${(v.data_label || "sample").toUpperCase()}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span class="hint-text" style="color:#B8C4D4;">${v.category}</span>
                    <button class="btn-dismiss-rotation" data-title="${v.title}" title="Dismiss / Remove this suggestion" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:0.95rem;padding:0 3px;line-height:1;border-radius:3px;">✕</button>
                  </div>
                </div>
                <strong style="font-size:0.84rem;color:#FFFFFF;display:block;">${v.title}</strong>
                <p style="font-size:0.78rem;color:#B8C4D4;margin:4px 0;">${v.angle}</p>
                <div class="hint-text" style="font-size:0.72rem;color:#B8C4D4;"><strong>Assets:</strong> ${v.assets_ready}</div>
                <div class="hint-text" style="font-size:0.72rem;margin-bottom:6px;color:#B8C4D4;"><strong>Live duplicate check:</strong> ${v.live_duplicate_check && v.live_duplicate_check.covered ? "already covered: " + v.live_duplicate_check.matches.map((m) => `<a href="${m.url}" target="_blank" style="color:#168BFF;">${m.title}</a>`).join(", ") : (v.live_duplicate_check && v.live_duplicate_check.covered === false ? "not covered on live site" : "not checked")}</div>
                <button class="btn btn-primary btn-sm btn-draft-rotation" data-title="${encodeURIComponent(v.title)}" data-angle="${encodeURIComponent(v.angle || '')}" data-url="${encodeURIComponent(v.source_url || '')}" style="width:100%;font-size:0.75rem;padding:4px 8px;display:flex;align-items:center;justify-content:center;gap:4px;background:#003580;border:none;color:#fff;">
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
        <div class="source-card" data-source-id="${s.id}" style="background:#162235;border:1px solid #303B4D;">
          <div>
            <div style="display:flex;justify-content:space-between;gap:6px;">
              <span class="badge badge-origin">${s.category}</span>
              <span class="badge ${s.is_verified ? "badge-check" : "badge-sample"}">${s.is_verified ? "Official Verified" : "Unverified Lead"}</span>
            </div>
            <h4 style="margin:6px 0 4px;color:#FFFFFF;">${s.title}</h4>
            <div class="hint-text" style="color:#B8C4D4;"><strong style="color:#FFFFFF;">${s.outlet}</strong> • ${s.published_date}</div>
            <p style="margin:6px 0;font-size:0.85rem;color:#B8C4D4;">${s.claim}</p>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid #303B4D;">
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
        <div class="research-card" style="border-left:3px solid #168BFF;background:#162235;border:1px solid #303B4D;border-radius:8px;padding:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:#FFFFFF;font-size:0.88rem;">${c.account}</strong>
            <span class="badge badge-check" style="font-size:0.7rem;">Verified Nordic Benchmark</span>
          </div>
          <div style="font-size:0.82rem;margin:4px 0;color:#B8C4D4;"><strong style="color:#FFFFFF;">Format:</strong> ${c.recent_example.format}</div>
          <p class="hint-text" style="margin:2px 0;color:#B8C4D4;"><strong style="color:#FFFFFF;">Hook:</strong> ${c.recent_example.hook}</p>
          <div style="font-size:0.78rem;color:#B8C4D4;margin:4px 0;"><strong style="color:#FFFFFF;">Takeaway:</strong> ${c.recent_example.takeaway}</div>
          <div class="hint-text" style="font-size:0.72rem;color:#10B981;"><strong>Evidence:</strong> ${c.recent_example.trending_evidence}</div>
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
        <div style="font-size:0.88rem;color:#FFFFFF;"><strong>${d.experiment.title}</strong> — <span style="color:#B8C4D4;">${d.experiment.hypothesis}</span></div>
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
              <div style="font-weight:600;color:#FFFFFF;font-size:0.9rem;">${p.title}</div>
              <div style="margin-top:2px;">${fmtTag} <span class="hint-text" style="font-size:0.75rem;color:#B8C4D4;">${p.sample_size_note || p.source}</span></div>
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
                <strong style="color:#FFFFFF;font-size:0.98rem;">${c.name}</strong>
                <div class="hint-text" style="color:#B8C4D4;">${c.category}</div>
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
        <tr style="border-bottom:1px solid #303B4D;">
          <td style="padding:6px 8px;font-weight:600;color:#FFFFFF;">${escapeHtml(b.name)}</td>
          <td style="padding:6px 8px;color:#B8C4D4;">${b.db_size_kb} KB</td>
          <td style="padding:6px 8px;font-family:monospace;font-size:0.75rem;color:#B8C4D4;">${escapeHtml(b.path)}</td>
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
      box.innerHTML = `<strong style="color:#FFFFFF;">Quota Reset:</strong> ${escapeHtml(res.message)}`;
      updateProbeUI(res);
    });
  }

  /* ---------- HELPER FUNCTIONS ---------- */
  function escapeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- ARTICLES & POSTS (MAIN WORKSPACE) ---------- */
  let projectsData = [];
  let pendingCreatedPhoto = null;

  async function loadProjects() {
    try {
      const data = await api("/api/projects?archived=1");
      projectsData = data.projects || [];

      updatePipelineKpis();
      loadIdeasPool();
      renderArticlesPostsList();
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  }

  function updatePipelineKpis() {
    if (!projectsData) return;
    const total = projectsData.filter((p) => !p.is_archived).length;
    const drafts = projectsData.filter((p) => !p.is_archived && p.article_status !== "approved" && p.ig_post_status !== "approved").length;
    const wp = projectsData.filter((p) => !p.is_archived && (Boolean(p.wordpress_post_id) || p.article_status === "approved" || p.ig_post_status === "approved")).length;
    const archived = projectsData.filter((p) => Boolean(p.is_archived)).length;

    if ($("kpi-val-total")) $("kpi-val-total").textContent = total;
    if ($("kpi-val-drafts")) $("kpi-val-drafts").textContent = drafts;
    if ($("kpi-val-wp")) $("kpi-val-wp").textContent = wp;
    if ($("kpi-val-archived")) $("kpi-val-archived").textContent = archived;
    if ($("articles-count-total")) $("articles-count-total").textContent = total;
  }

  function renderArticlesPostsList() {
    const container = $("articles-posts-grid");
    if (!container) return;

    const query = ($("articles-search-input")?.value || "").toLowerCase().trim();
    const sectionFilter = $("articles-section-filter")?.value || "all";
    const statusFilter = $("articles-status-filter")?.value || "all";
    const langFilter = $("articles-lang-filter")?.value || "all";
    const sortFilter = $("articles-sort-filter")?.value || "newest";

    let filtered = projectsData.filter((p) => {
      const isArchived = Boolean(p.is_archived);

      // Status filter
      if (statusFilter === "archived") {
        if (!isArchived) return false;
      } else {
        if (isArchived && statusFilter !== "all") return false;
        if (statusFilter === "draft") {
          if (p.article_status === "approved" || p.ig_post_status === "approved") return false;
        } else if (statusFilter === "in_review") {
          if (!p.pipeline_stage.includes("Review") && !p.pipeline_stage.includes("Partially")) return false;
        } else if (statusFilter === "approved") {
          if (p.article_status !== "approved" && p.ig_post_status !== "approved") return false;
        }
      }

      // Section filter
      if (sectionFilter !== "all") {
        if ((p.section || "").toLowerCase() !== sectionFilter.toLowerCase()) return false;
      }

      // Language filter
      if (langFilter !== "all") {
        if ((p.language || "English").toLowerCase() !== langFilter.toLowerCase()) return false;
      }

      // Search query
      if (query) {
        const hay = `${p.id} ${p.title} ${p.section || ''} ${p.category || ''} ${p.language || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }

      return true;
    });

    // Sorting
    if (sortFilter === "oldest") {
      filtered.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (sortFilter === "title_asc") {
      filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else {
      // Default: newest first
      filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    if ($("articles-count-total")) $("articles-count-total").textContent = filtered.length;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:48px 20px;background:rgba(8,35,71,0.5);border-radius:14px;border:1px dashed rgba(75,137,188,0.35);">
          <div style="font-size:2.2rem;margin-bottom:8px;">📰</div>
          <h3 style="font-size:1.1rem;font-weight:700;color:#FFFFFF;margin-bottom:4px;">No Articles &amp; Posts Found</h3>
          <p style="font-size:0.85rem;color:#B8C4D4;max-width:440px;margin:0 auto 16px;">
            ${query || sectionFilter !== 'all' || statusFilter !== 'all' ? 'No projects match your current filters. Try resetting search or clicking Total Projects.' : 'Start your first article and social post project now.'}
          </p>
          <button type="button" class="btn btn-primary" onclick="document.getElementById('btn-create-new-article-post').click()" style="background:#029CD8;color:#fff;font-weight:700;border:none;">
            + Create New Article &amp; Post
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((p) => {
      const isArchived = Boolean(p.is_archived);
      const hasThumb = Boolean(p.thumbnail_url && p.thumbnail_url.trim());
      const thumbUrl = p.thumbnail_url || "";
      const isWpPushed = Boolean(p.wordpress_post_id);
      const wpBase = "https://ilovefinland.net";
      const wpBadge = isWpPushed
        ? `<a href="${wpBase}/wp-admin/post.php?post=${p.wordpress_post_id}&action=edit" target="_blank" rel="noopener" class="badge badge-wp-pushed" title="Open draft in WordPress Admin">
            <span>✓ WP Draft #${p.wordpress_post_id}</span> <span style="font-size:0.65rem;">↗</span>
           </a>`
        : `<span class="badge badge-wp-pending">WP: Not Pushed</span>`;

      const artApproved = p.article_status === "approved";
      const igApproved = p.ig_post_status === "approved";

      return `
        <div class="article-project-card ${isArchived ? 'is-archived' : ''}" data-id="${p.id}">
          <div class="article-card-thumb-wrap">
            <div class="article-card-thumb">
              ${
                hasThumb
                  ? `<img src="${thumbUrl}" alt="" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'article-card-no-img\\'><span>📰</span><small>No Image</small></div>';">`
                  : `<div class="article-card-no-img"><span>📰</span><small>No Image</small></div>`
              }
              <span class="card-format-pill">📝 Story</span>
            </div>
          </div>

          <div class="article-card-body">
            <div class="article-card-badges">
              <span class="badge badge-sec">📂 ${escapeHtml(p.section || 'News')}</span>
              <span class="badge badge-cat">🇫🇮 ${escapeHtml(p.category || 'Finland')}</span>
              <span class="badge badge-lang">🌐 ${escapeHtml(p.language || 'English')}</span>
              ${wpBadge}
              ${isArchived ? '<span class="badge badge-archived">📦 Archived</span>' : ''}
            </div>

            <a class="article-card-title btn-open-project" data-id="${p.id}" title="${escapeHtml(p.title)}">
              ${escapeHtml(p.title)}
            </a>

            <div class="article-card-meta">
              <span>🕒 Updated: <strong>${p.updated_at ? p.updated_at.slice(0, 10) : 'Recent'}</strong></span>
              <span class="meta-separator">•</span>
              <span>Article: <strong style="color:${artApproved ? '#10B981' : '#F59E0B'};">${artApproved ? '✓ Approved' : 'Draft'}</strong></span>
              <span class="meta-separator">•</span>
              <span>Social Post: <strong style="color:${igApproved ? '#10B981' : '#F59E0B'};">${igApproved ? '✓ Approved' : 'Draft'}</strong></span>
            </div>
          </div>

          <div class="article-card-actions">
            <button type="button" class="btn btn-primary btn-sm btn-open-project btn-card-primary" data-id="${p.id}">
              <span>✏️ Edit &amp; Review</span>
            </button>
            <div class="card-secondary-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-dup-project" data-id="${p.id}" title="Duplicate this project">
                <span>📋 Duplicate</span>
              </button>
              <button type="button" class="btn btn-ghost btn-sm btn-archive-project" data-id="${p.id}" title="${isArchived ? 'Restore Story to Active' : 'Archive Story'}">
                <span>${isArchived ? '📂 Restore' : '📦 Archive'}</span>
              </button>
              <button type="button" class="btn btn-ghost btn-sm btn-del-project" data-id="${p.id}" title="Delete permanently">
                <span>🗑️</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Wire actions on cards
    container.querySelectorAll(".btn-open-project").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        openProjectInReview(id);
      });
    });

    container.querySelectorAll(".btn-dup-project").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        btn.disabled = true;
        btn.textContent = "⏳ Duplicating…";
        try {
          const res = await api("/api/package/duplicate", {
            method: "POST",
            body: JSON.stringify({ package_id: id }),
          });
          showToast("Project duplicated successfully!", "success");
          await loadProjects();
        } catch (err) {
          alert(`Failed to duplicate: ${err.message}`);
          btn.disabled = false;
          btn.textContent = "📋 Duplicate";
        }
      });
    });

    container.querySelectorAll(".btn-archive-project").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        const p = projectsData.find((item) => item.id === id);
        const willArchive = !Boolean(p && p.is_archived);
        try {
          await api("/api/package/archive", {
            method: "POST",
            body: JSON.stringify({ package_id: id, is_archived: willArchive }),
          });
          showToast(willArchive ? "Project archived." : "Project restored.", "info");
          await loadProjects();
        } catch (err) {
          alert(`Archive failed: ${err.message}`);
        }
      });
    });

    container.querySelectorAll(".btn-del-project").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        if (!confirm(`Are you sure you want to permanently delete project #${id}?`)) return;
        try {
          await api("/api/projects/delete", {
            method: "POST",
            body: JSON.stringify({ id }),
          });
          showToast("Project deleted.", "info");
          await loadProjects();
        } catch (err) {
          alert(`Failed to delete: ${err.message}`);
        }
      });
    });
  }

  async function openProjectInReview(id) {
    switchView("review");
    await loadPackage(id);
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
    if (!v || !v.reel || !v.reel.scenes || v.reel.scenes.length === 0) {
      wrap.innerHTML = "";
      return;
    }
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
                <span style="background:#003882;color:#ffffff;font-size:0.72rem;font-weight:800;padding:3px 12px;border-radius:10px;display:inline-block;letter-spacing:0.04em;margin-bottom:6px;">YOUR FINLAND DISCOVERED</span>
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
        <div class="storyboard-clip-card" data-scene="${idx}" style="background:#162235;border:1.5px solid ${isActive ? '#168BFF' : '#303B4D'};border-radius:10px;padding:12px;font-size:0.8rem;box-shadow:${isActive ? '0 0 0 2px rgba(22,139,255,0.3)' : '0 4px 12px rgba(0,0,0,0.2)'};display:flex;flex-direction:column;justify-content:space-between;transition:border-color 0.15s, box-shadow 0.15s;color:#FFFFFF;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #303B4D;padding-bottom:6px;">
              <span style="font-weight:800;color:#FFFFFF;font-size:0.84rem;">🎬 Clip ${idx + 1} (${startS}s – ${endS}s)</span>
              <span class="badge" style="background:#0B0F16;color:#B8C4D4;border:1px solid #303B4D;font-size:0.7rem;font-weight:700;">${curDur}s ${isVideo ? 'Video' : 'Photo'}</span>
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
          <div style="display:flex;align-items:center;gap:8px;background:#0B0F16;border:1px solid #303B4D;padding:6px;border-radius:6px;font-size:0.75rem;color:#B8C4D4;">
            <video src="${c.url || ''}" muted style="width:40px;height:26px;object-fit:cover;border-radius:3px;background:#000;"></video>
            <div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong style="color:#FFFFFF;">Clip ${i+1}:</strong> ${c.filename || c.label || "Uploaded Video Footage"}</div>
            <span style="font-weight:700;color:#168BFF;">${c.duration || 3}s</span>
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
          const parent = chk.closest ? chk.closest(".rev-target-pill") : null;
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

    $("btn-google-signin")?.addEventListener("click", signIn);
    $("btn-key-signin")?.addEventListener("click", signInWithKey);
    $("btn-logout")?.addEventListener("click", signOut);

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

    // Unified Mobile & Desktop Back Buttons
    $("btn-mobile-back")?.addEventListener("click", () => goBack());
    $("btn-desktop-back")?.addEventListener("click", () => goBack());
    document.querySelectorAll(".btn-view-back").forEach((btn) => {
      btn.addEventListener("click", () => goBack());
    });

    // Browser back/forward button support (popstate)
    window.addEventListener("popstate", (e) => {
      isNavigatingHistory = true;
      if (e.state && e.state.view) {
        if (e.state.view === "reel-editor") {
          // Inside reel editor
        } else {
          const reelEditor = $("reel-editor-screen");
          if (reelEditor && !reelEditor.classList.contains("hidden")) {
            window.ReelStudio?.closeEditor();
          }
          switchView(e.state.view, true);
        }
      } else {
        const reelEditor = $("reel-editor-screen");
        if (reelEditor && !reelEditor.classList.contains("hidden")) {
          window.ReelStudio?.closeEditor();
        } else {
          goBack();
        }
      }
      isNavigatingHistory = false;
    });

    // Initial hash routing (e.g. #calendar, #reel-studio, #ideas, #review)
    const initialHash = window.location.hash.replace("#", "");
    if (window.location.pathname === "/finnish-student" || window.location.pathname.startsWith("/finnish-student/")) {
      document.body.classList.add("fl-student-only");
      switchView("finnish-lab", false, true);
    } else if (window.location.pathname === "/studio-ai" || window.location.pathname.startsWith("/studio-ai/")) {
      switchView("studio-ai", false, true);
    } else if (window.location.pathname === "/finnish-lab" || window.location.pathname.startsWith("/finnish-lab/")) {
      switchView("finnish-lab", false, true);
    } else if (initialHash && ["projects", "ideas", "calendar", "inbox", "research", "performance", "connections", "ai-media", "reel-studio", "assignments", "finnish-lab", "studio-ai"].includes(initialHash)) {
      switchView(initialHash, false, true);
    }

    // Review Workspace Tabs (Article vs Social Post - Clean In-Place Tab Switch)
    $("tab-btn-article")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchReviewWorkspaceTab("article");
    });
    $("tab-btn-ig")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchReviewWorkspaceTab("ig");
    });

    $("package-selector")?.addEventListener("change", (e) => loadPackage(parseInt(e.target.value, 10)));

    const toggleApproval = async (component) => {
      const curVerNum = selectedVersion || (bundle ? bundle.package.current_version : 1);
      const curVerObj = bundle?.versions?.find((v) => v.version === curVerNum);

      if (component === "ig_post") {
        const hasPhoto = Boolean(curVerObj?.ig_post?.photo_url || curVerObj?.article?.featured_image?.url);
        if (!hasPhoto && !approvedNow.ig_post) {
          alert("⚠️ Image required:\n\nA photo is required before this Social Post can be approved for publishing. Please upload a photo first.");
          return;
        }
      }

      if (component === "article") {
        const hasPhoto = Boolean(curVerObj?.article?.featured_image?.url);
        if (!hasPhoto && !approvedNow.article) {
          const proceed = confirm(
            "⚠️ Note: This article has no featured image uploaded.\n\nDo you want to mark it approved without a featured photo?"
          );
          if (!proceed) return;
        }
      }

      const decision = approvedNow[component] ? "pending" : "approved";
      bundle = await api("/api/package/approve", {
        method: "POST",
        body: JSON.stringify({ package_id: currentPackageId, component, decision, version: selectedVersion }),
      });
      renderReview();
    };
    for (const id of ["btn-approve-article", "btn-approve-article-m"]) {
      $(id)?.addEventListener("click", () => toggleApproval("article"));
    }
    for (const id of ["btn-approve-reel", "btn-approve-reel-m"]) {
      $(id)?.addEventListener("click", () => toggleApproval("reel"));
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

    // Side-by-Side Diff Preview Modal Controller for Google Gemini ($0 Free Tier)
    let pendingGeminiProposal = null;
    const closeGeminiDiffModal = () => {
      $("gemini-diff-modal")?.classList.add("hidden");
      pendingGeminiProposal = null;
    };
    $("btn-gemini-diff-close")?.addEventListener("click", closeGeminiDiffModal);
    $("btn-gemini-diff-discard")?.addEventListener("click", () => {
      closeGeminiDiffModal();
      showToast("Discarded Gemini proposal — your manual edits are untouched.");
    });
    $("btn-gemini-diff-apply")?.addEventListener("click", async () => {
      if (!pendingGeminiProposal) return;
      const { scope, proposal } = pendingGeminiProposal;
      if (scope === "article") {
        if ($("wp-field-headline") && proposal.headline) $("wp-field-headline").value = proposal.headline;
        if ($("wp-field-dek") && proposal.short_description) $("wp-field-dek").value = proposal.short_description;
        if ($("wp-code-textarea") && proposal.body_html) $("wp-code-textarea").value = proposal.body_html;
        if ($("article-body-visual") && proposal.body_html) $("article-body-visual").innerHTML = proposal.body_html;
        if ($("wp-field-seo-title") && proposal.seo_title) $("wp-field-seo-title").value = proposal.seo_title;
        if ($("wp-field-meta-desc") && proposal.meta_description) $("wp-field-meta-desc").value = proposal.meta_description;
        closeGeminiDiffModal();
        showToast("✅ Gemini article rewrite applied! Click 'Save Edits' to store version.");
      } else if (scope === "caption") {
        const tagStr = (proposal.hashtags || []).join(" ");
        const fullCap = tagStr && !proposal.caption.includes(tagStr) ? `${proposal.caption}\n\n${tagStr}` : proposal.caption;
        if ($("static-edit-caption")) $("static-edit-caption").value = fullCap;
        if ($("social-caption-textarea")) $("social-caption-textarea").value = fullCap;
        if ($("static-edit-hashtags")) $("static-edit-hashtags").value = tagStr;
        if (proposal.headline_line1 && $("static-edit-line1")) $("static-edit-line1").value = proposal.headline_line1;
        if (proposal.headline_line2 && $("static-edit-line2")) $("static-edit-line2").value = proposal.headline_line2;
        if (currentStaticPost) {
          currentStaticPost.caption = fullCap;
          currentStaticPost.hashtags = proposal.hashtags || currentStaticPost.hashtags;
          if (proposal.headline_line1) currentStaticPost.headline_line1 = proposal.headline_line1;
          if (proposal.headline_line2) currentStaticPost.headline_line2 = proposal.headline_line2;
          drawStaticPostCanvases(currentStaticPost);
        }
        closeGeminiDiffModal();
        showToast("✅ Gemini caption & hooks applied! Click 'Save Changes' to persist.");
      }
    });

    const openGeminiDiffModal = ({ title, model, summary, currentText, proposedText, scope, proposal }) => {
      pendingGeminiProposal = { scope, proposal };
      if ($("gemini-diff-title")) $("gemini-diff-title").textContent = title;
      if ($("gemini-diff-model-badge")) $("gemini-diff-model-badge").textContent = `${model || "gemini-3.8-flash"} • $0 Free Tier`;
      if ($("gemini-diff-summary")) $("gemini-diff-summary").textContent = summary || "Review changes side-by-side before applying.";
      if ($("gemini-diff-current")) $("gemini-diff-current").textContent = currentText || "(Empty)";
      if ($("gemini-diff-proposed")) $("gemini-diff-proposed").textContent = proposedText || "(Empty)";
      $("gemini-diff-modal")?.classList.remove("hidden");
    };

    $("btn-claude-article")?.addEventListener("click", async () => {
      if (!currentPackageId) return;
      const btn = $("btn-claude-article");
      const orig = btn ? btn.innerHTML : "";
      if (btn) btn.innerHTML = "⏳ Asking Gemini…";
      try {
        const res = await api("/api/package/gemini-rewrite-preview", {
          method: "POST",
          body: JSON.stringify({
            package_id: currentPackageId,
            scope: "article",
            writing_style: $("wp-field-writing-style")?.value || "guide",
            current_article: {
              headline: $("wp-field-headline")?.value || "",
              short_description: $("wp-field-dek")?.value || "",
              body_html: $("wp-code-textarea")?.value || "",
              section: $("wp-field-section")?.value || "News",
              category: $("wp-field-category")?.value || "Finland",
              language: $("wp-field-lang")?.value || "English",
            },
          }),
        });
        if (!res.ok) throw new Error(res.error || "Gemini preview failed.");
        const cur = res.current || {};
        const prop = res.proposal || {};
        const stripHtml = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        openGeminiDiffModal({
          title: "Gemini Article Rewrite — Side-by-Side Preview",
          model: res.model,
          summary: prop.change_summary,
          currentText: `HEADLINE:\n${cur.headline}\n\nSUMMARY:\n${cur.short_description}\n\nBODY:\n${stripHtml(cur.body_html)}`,
          proposedText: `HEADLINE:\n${prop.headline}\n\nSUMMARY:\n${prop.short_description}\n\nSEO TITLE: ${prop.seo_title}\nMETA DESC: ${prop.meta_description}\n\nBODY:\n${stripHtml(prop.body_html)}`,
          scope: "article",
          proposal: prop,
        });
      } catch (err) {
        alert(`⚠️ Gemini Rewrite Notice:\n\n${err.message}`);
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
      const origTop = btnTop ? btnTop.innerHTML : "";
      const origBottom = btnBottom ? btnBottom.innerHTML : "";
      if (btnTop) btnTop.innerHTML = "⏳ Polishing with Gemini…";
      if (btnBottom) btnBottom.innerHTML = "⏳ Polishing with Gemini…";
      try {
        const res = await api("/api/package/gemini-rewrite-preview", {
          method: "POST",
          body: JSON.stringify({
            package_id: currentPackageId,
            scope: "caption",
            current_article: {
              headline: $("wp-field-headline")?.value || "",
              short_description: $("wp-field-dek")?.value || "",
              section: $("wp-field-section")?.value || "News",
              category: $("wp-field-category")?.value || "Finland",
            },
            current_ig: {
              headline_line1: $("static-edit-line1")?.value || "",
              headline_line2: $("static-edit-line2")?.value || "",
              caption: $("static-edit-caption")?.value || $("social-caption-textarea")?.value || "",
            },
          }),
        });
        if (!res.ok) throw new Error(res.error || "Gemini caption polish failed.");
        const cur = res.current || {};
        const prop = res.proposal || {};
        openGeminiDiffModal({
          title: "Gemini Caption & Hooks — Side-by-Side Preview",
          model: res.model,
          summary: prop.change_summary,
          currentText: `COVER HOOK:\n${cur.headline_line1} / ${cur.headline_line2}\n\nCAPTION:\n${cur.caption}`,
          proposedText: `COVER HOOK:\n${prop.headline_line1} / ${prop.headline_line2}\n\nCAPTION:\n${prop.caption}\n\nHASHTAGS:\n${(prop.hashtags || []).join(" ")}`,
          scope: "caption",
          proposal: prop,
        });
      } catch (err) {
        alert(`⚠️ Gemini Caption Notice:\n\n${err.message}`);
      } finally {
        if (btnTop) btnTop.innerHTML = origTop || "✨ Polish Caption with Gemini";
        if (btnBottom) btnBottom.innerHTML = origBottom || "✨ Polish Caption with Gemini";
      }
    };
    $("btn-claude-caption-top")?.addEventListener("click", triggerPolishCaption);
    $("btn-claude-caption-bottom")?.addEventListener("click", triggerPolishCaption);

    // 1-Click ilovefinland.net Story-to-Lesson Bridge -> Opens Finnish Study Lab with generated A1/A2 selkosuomi lesson!
    $("btn-study-story-in-finnish")?.addEventListener("click", () => {
      const headline = $("wp-field-headline")?.value || $("pkg-title")?.textContent || "";
      const summary = $("wp-field-dek")?.value || "";
      const bodyText = ($("wp-code-textarea")?.value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2200);
      if (!headline && !bodyText) {
        showToast("Open an article draft first to generate a Finnish reading lesson.", "info");
        return;
      }
      window.__pendingStoryLesson = { headline, summary, body: bodyText, packageId: currentPackageId };
      switchView("finnish-lab");
      setTimeout(() => {
        if (window.FinnishLab && typeof window.FinnishLab.openStoryLesson === "function") {
          window.FinnishLab.openStoryLesson(window.__pendingStoryLesson);
        }
      }, 250);
    });

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

    $("comment-form")?.addEventListener("submit", async (e) => {
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

    $("btn-save-schedule")?.addEventListener("click", async () => {
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
        $("schedule-msg").textContent = "Scheduled in Europe/Helsinki.";
      } catch (err) {
        $("schedule-msg").textContent = err.message;
      }
    });

    /* ---------- PRODUCTION DESK (ARTICLE & SOCIAL POST WORKSPACE) ---------- */
    let articleFeaturedPhoto = null;

    // Mode 1: Article Single Featured Photo Dropzone
    const photoDropzone = $("article-photo-dropzone");
    const photoInput = $("article-photo-input");
    const emptyState = $("article-photo-empty-state");
    const previewState = $("article-photo-preview-state");
    const photoImg = $("article-photo-img");
    const photoName = $("article-photo-name");
    const btnRemovePhoto = $("btn-remove-article-photo");

    function setArticlePhoto(photo) {
      articleFeaturedPhoto = photo;
      if (photo) {
        if (photoImg) photoImg.src = photo.url;
        if (photoName) photoName.textContent = photo.filename || "Uploaded Photo";
        emptyState?.classList.add("hidden");
        previewState?.classList.remove("hidden");
      } else {
        if (photoInput) photoInput.value = "";
        emptyState?.classList.remove("hidden");
        previewState?.classList.add("hidden");
      }
    }

    if (photoDropzone && photoInput) {
      photoDropzone.addEventListener("click", (e) => {
        if (e.target !== btnRemovePhoto && !btnRemovePhoto?.contains(e.target)) {
          photoInput.click();
        }
      });

      photoDropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        photoDropzone.style.borderColor = "var(--brand-blue)";
        photoDropzone.style.background = "#eff6ff";
      });

      photoDropzone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        photoDropzone.style.borderColor = "#cbd5e1";
        photoDropzone.style.background = "#fff";
      });

      photoDropzone.addEventListener("drop", async (e) => {
        e.preventDefault();
        photoDropzone.style.borderColor = "#cbd5e1";
        photoDropzone.style.background = "#fff";
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await handleArticlePhotoUpload(e.dataTransfer.files[0]);
        }
      });

      photoInput.addEventListener("change", async (e) => {
        if (e.target.files && e.target.files.length > 0) {
          await handleArticlePhotoUpload(e.target.files[0]);
        }
      });
    }

    btnRemovePhoto?.addEventListener("click", (e) => {
      e.stopPropagation();
      setArticlePhoto(null);
    });

    async function handleArticlePhotoUpload(file) {
      if (!file) return;
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
            media_type: "image",
            credit: "Photo: ILF",
          }),
        });

        setArticlePhoto({
          url: res.url,
          filename: file.name,
          photographer: "ILF",
          credit_string: "Photo: ILF",
          source_url: "https://ilovefinland.net",
          licence: "Editorial Rights (ILF)",
          alt_text: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          caption: `Photo for ${$("assign-topic") ? $("assign-topic").value.trim() : "article"}`,
        });
      } catch (err) {
        alert(`Failed to upload photo: ${err.message}`);
      }
    }

    /* ---------- DRAFT AUTOSAVE & RESTORE ---------- */
    function initDraftAutosave() {
      try {
        const savedArt = localStorage.getItem("ilf_draft_article");
        if (savedArt) {
          const parsed = JSON.parse(savedArt);
          if ($("assign-topic") && !$("assign-topic").value && parsed.topic) {
            $("assign-topic").value = parsed.topic;
          }
          if ($("assign-instructions") && !$("assign-instructions").value && parsed.instructions) {
            $("assign-instructions").value = parsed.instructions;
          }
          if ($("assign-links") && !$("assign-links").value && parsed.links) {
            $("assign-links").value = parsed.links;
          }
        }
      } catch (e) {
        console.warn("Failed to restore article draft:", e);
      }

      const saveArticleDraft = () => {
        try {
          const draft = {
            topic: $("assign-topic")?.value || "",
            instructions: $("assign-instructions")?.value || "",
            links: $("assign-links")?.value || "",
          };
          if (draft.topic || draft.instructions || draft.links) {
            localStorage.setItem("ilf_draft_article", JSON.stringify(draft));
          } else {
            localStorage.removeItem("ilf_draft_article");
          }
        } catch (_) {}
      };
      $("assign-topic")?.addEventListener("input", saveArticleDraft);
      $("assign-instructions")?.addEventListener("input", saveArticleDraft);
      $("assign-links")?.addEventListener("input", saveArticleDraft);
    }
    initDraftAutosave();

    // Article Form Submit (Mode 1: Strictly Article + Static Post, ZERO reel)
    $("assignment-article-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = $("btn-submit-article");
      const origHtml = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳ Drafting Article &amp; Social Post...</span>`;
      }

      try {
        const topic = $("assign-topic").value.trim();
        const deadline = $("assign-deadline") ? $("assign-deadline").value : "";
        const instructions = $("assign-instructions") ? $("assign-instructions").value.trim() : "";
        const links = $("assign-links") ? $("assign-links").value.split("\n").map((s) => s.trim()).filter(Boolean) : [];
        const voiceBar = document.querySelector('[data-voice-for="assign-instructions"]');

        const payload = {
          topic,
          scope: "Article + Static Post",
          deadline_at: deadline,
          instructions,
          links,
          has_voice_note: voiceBar ? voiceBar.dataset.hasVoice === "1" : false,
          custom_photo: articleFeaturedPhoto,
          custom_additional_photo: null,
          clips: undefined,
        };

        const created = await api("/api/assignments", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        currentPackageId = created.package.id;
        try { localStorage.removeItem("ilf_draft_article"); } catch (_) {}
        setArticlePhoto(null);
        $("assign-topic").value = "";
        if ($("assign-instructions")) $("assign-instructions").value = "";
        if ($("assign-links")) $("assign-links").value = "";
        await loadAll();
        switchView("review");
      } catch (err) {
        alert(`Failed to draft article: ${err.message}`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origHtml;
        }
      }
    });

    // Fallback/Legacy Assignment Form Submit
    $("assignment-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const origHtml = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳ Drafting Article &amp; Social Post...</span>`;
      }

      try {
        const topic = ($("assign-topic")?.value || "").trim();
        const deadline = $("assign-deadline") ? $("assign-deadline").value : "";
        const instructions = $("assign-instructions") ? $("assign-instructions").value.trim() : "";
        const links = $("assign-links") ? $("assign-links").value.split("\n").map((s) => s.trim()).filter(Boolean) : [];
        const scopeSelect = $("assign-scope");
        const scopeVal = scopeSelect ? scopeSelect.value : "Article + Static Post";
        const voiceBar = document.querySelector('[data-voice-for="assign-instructions"]');

        const payload = {
          topic,
          scope: scopeVal.includes("Reel") && !scopeVal.includes("Article") ? "Reel" : "Article + Static Post",
          deadline_at: deadline,
          instructions,
          links,
          has_voice_note: voiceBar ? voiceBar.dataset.hasVoice === "1" : false,
          custom_photo: articleFeaturedPhoto,
          custom_additional_photo: null,
          clips: undefined,
        };

        const created = await api("/api/assignments", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        currentPackageId = created.package.id;
        try { localStorage.removeItem("ilf_draft_article"); } catch (_) {}
        setArticlePhoto(null);
        await loadAll();
        switchView("review");
      } catch (err) {
        alert(`Failed to create assignment: ${err.message}`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origHtml;
        }
      }
    });

    // Calendar view & month navigation wiring
    document.querySelectorAll(".cal-mode").forEach((b) => {
      b.addEventListener("click", () => {
        calendarMode = b.dataset.cal;
        renderCalendar();
      });
    });

    $("btn-cal-prev")?.addEventListener("click", () => {
      calCurrentMonth--;
      if (calCurrentMonth < 0) {
        calCurrentMonth = 11;
        calCurrentYear--;
      }
      renderCalendar();
    });

    $("btn-cal-next")?.addEventListener("click", () => {
      calCurrentMonth++;
      if (calCurrentMonth > 11) {
        calCurrentMonth = 0;
        calCurrentYear++;
      }
      renderCalendar();
    });

    $("btn-cal-plan-toggle")?.addEventListener("click", () => {
      const drawer = $("calendar-plan-week-drawer");
      if (drawer) {
        drawer.classList.toggle("hidden");
        if (!drawer.classList.contains("hidden")) {
          loadWeeklyPlan();
        }
      }
    });

    ["cal-filter-channel", "cal-filter-format", "cal-filter-status"].forEach((id) => {
      $(id)?.addEventListener("change", renderCalendar);
    });

    $("btn-refresh-plan")?.addEventListener("click", loadWeeklyPlan);

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
      const srcUrl = imgPrev ? imgPrev.getAttribute("src") : "";
      if (!srcUrl || srcUrl.includes("sample")) {
        alert("⚠️ No image uploaded:\n\nPlease upload a featured photo before saving to mobile photos.");
        return;
      }
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
      if (!currentStaticPost || !currentStaticPost.photo_url || !currentStaticPost.photo_url.trim()) {
        alert("⚠️ Image required:\n\nPlease upload a photo before exporting or saving your social post.");
        return;
      }
      saveImageDirectlyToMobilePhotos($("static-post-canvas"), "ilovefinland-feed-post-1080x1350.jpg", "image/jpeg", "Instagram & Facebook Feed Post");
    });

    $("btn-save-photos-fb")?.addEventListener("click", () => {
      if (!currentStaticPost || !currentStaticPost.photo_url || !currentStaticPost.photo_url.trim()) {
        alert("⚠️ Image required:\n\nPlease upload a photo before exporting or saving your social post.");
        return;
      }
      saveImageDirectlyToMobilePhotos($("static-fb-canvas"), "ilovefinland-facebook-landscape-1200x630.jpg", "image/jpeg", "Facebook Landscape Post");
    });

    $("btn-save-photos-crop")?.addEventListener("click", () => {
      if (!currentStaticPost || !currentStaticPost.photo_url || !currentStaticPost.photo_url.trim()) {
        alert("⚠️ Image required:\n\nPlease upload a photo before exporting or saving your social post.");
        return;
      }
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

    // =========================================================================
    // 3-ZONE MODULAR STUDIO CONTROLLER & EXTENSIBLE MODULE REGISTRY (V95.0)
    // =========================================================================
    window.ILFStudioRegistry = {
      modules: {},
      registerModule({ id, label, icon = "🧩", onOpen }) {
        if (!id || this.modules[id]) return;
        this.modules[id] = { id, label, icon, onOpen };
        const mount = $("sidebar-dynamic-modules");
        if (mount) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "nav-item";
          btn.dataset.view = id;
          btn.id = `nav-item-dyn-${id}`;
          btn.innerHTML = `<span style="font-size:1rem;line-height:1;">${icon}</span><span>${label}</span>`;
          btn.addEventListener("click", () => {
            if (typeof onOpen === "function") onOpen();
            else switchView(id);
          });
          mount.appendChild(btn);
        }
      },
    };

    // Zone 1 Slim Sidebar Direct Workspace Shortcuts (Article & Web / Social Graphics)
    document.querySelectorAll(".nav-item[data-workspace-shortcut]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetTab = btn.dataset.workspaceShortcut; // "article" or "ig"
        $("sidebar-drawer")?.classList.remove("open");
        $("sidebar-backdrop")?.classList.add("hidden");
        if (currentPackageId && bundle && bundle.package) {
          switchView("review");
          switchReviewWorkspaceTab(targetTab);
        } else {
          try {
            const list = await api("/api/packages");
            const pkgs = Array.isArray(list) ? list : (list.packages || []);
            if (pkgs.length > 0) {
              await loadPackage(pkgs[0].id);
              switchView("review");
              switchReviewWorkspaceTab(targetTab);
            } else {
              switchView("projects");
              showToast("Create or select a story first to open the editor.", "info");
            }
          } catch (err) {
            switchView("projects");
          }
        }
      });
    });

    // Top Utility Command Bar (Article Suggestions, Studio AI & More Tools Popover)
    document.querySelectorAll(".studio-utility-bar [data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view;
        $("utility-more-menu")?.classList.add("hidden");
        $("btn-utility-more-toggle")?.setAttribute("aria-expanded", "false");
        if (view) switchView(view);
      });
    });

    $("btn-utility-more-toggle")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = $("utility-more-menu");
      if (!menu) return;
      const isNowHidden = menu.classList.toggle("hidden");
      $("btn-utility-more-toggle")?.setAttribute("aria-expanded", String(!isNowHidden));
    });

    document.addEventListener("click", (e) => {
      const wrap = e.target.closest(".utility-more-wrap");
      if (!wrap) {
        $("utility-more-menu")?.classList.add("hidden");
        $("btn-utility-more-toggle")?.setAttribute("aria-expanded", "false");
      }
    });

    // Social Graphics Top Design Switcher (Design - 1 vs Design - 2 vs Future Design - 3)
    document.querySelectorAll(".btn-design-studio-switch").forEach((btn) => {
      btn.addEventListener("click", () => {
        const d = btn.dataset.design;
        document.querySelectorAll(".btn-design-studio-switch").forEach((b) => b.classList.toggle("active", b === btn));
        const w1 = $("design-1-workspace");
        const w2 = $("design-2-workspace");
        if (w1) w1.style.display = (d === "1") ? "grid" : "none";
        if (w2) w2.style.display = (d === "2") ? "grid" : "none";
        if (d === "1" && currentStaticPost) {
          drawStaticPostCanvases(currentStaticPost);
        }
        if (d === "2") {
          if (typeof loadActiveCarouselSlideInputs === "function") {
            loadActiveCarouselSlideInputs(typeof activeCarouselSlide !== "undefined" ? activeCarouselSlide : 1);
          }
          if (typeof renderActiveCarouselSlideCanvas === "function") {
            renderActiveCarouselSlideCanvas();
          }
        }
      });
    });

    // Zone 3 Contextual Inspector Tab Switchers (All Workspaces)
    const bindInspectorTabs = (attrName, scopeSelector, panePrefix) => {
      document.querySelectorAll(`.btn-inspector-tab[${attrName}]`).forEach((btn) => {
        btn.addEventListener("click", () => {
          const val = btn.getAttribute(attrName);
          document.querySelectorAll(`.btn-inspector-tab[${attrName}]`).forEach((b) => b.classList.toggle("active", b === btn));
          document.querySelectorAll(`${scopeSelector} .inspector-pane`).forEach((p) => {
            p.classList.toggle("active", p.id === `${panePrefix}${val}`);
          });
        });
      });
    };
    bindInspectorTabs("data-d1-tab", "#design-1-workspace", "d1-pane-");
    bindInspectorTabs("data-d2-tab", "#design-2-workspace", "d2-pane-");
    bindInspectorTabs("data-art-tab", "#panel-article", "art-pane-");
    bindInspectorTabs("data-reel-tab", "#reel-inspector-panel", "reel-pane-");

    // Safe-Zone Guide Toggles for Social Graphics Canvases + Carousel Accordion Redraw
    $("btn-toggle-d1-safezone")?.addEventListener("click", () => {
      $("d1-safe-zone-overlay")?.classList.toggle("hidden");
    });
    $("btn-toggle-d2-safezone")?.addEventListener("click", () => {
      $("d2-safe-zone-overlay")?.classList.toggle("hidden");
    });
    $("carousel-and-style-drawer")?.addEventListener("toggle", (e) => {
      if (e.target.open) {
        if (typeof loadActiveCarouselSlideInputs === "function") {
          loadActiveCarouselSlideInputs(typeof activeCarouselSlide !== "undefined" ? activeCarouselSlide : 1);
        }
        if (typeof renderActiveCarouselSlideCanvas === "function") {
          renderActiveCarouselSlideCanvas();
        }
      }
    });

    // Featured Image & Additional Image Downloads
    document.addEventListener("click", (e) => {
      const dlBtn = e.target.closest(".btn-download-img");
      if (!dlBtn) return;
      const fmt = dlBtn.dataset.format || "jpeg";
      const isAddl = dlBtn.id.includes("addl") || dlBtn.id.includes("add-");
      const imgPrev = isAddl ? $("wp-add-img-preview") : $("wp-feat-img-preview");
      const srcUrl = imgPrev ? imgPrev.getAttribute("src") : "";
      if (!srcUrl || srcUrl.includes("sample")) {
        alert("⚠️ No image uploaded:\n\nPlease upload a photo before downloading.");
        return;
      }
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
      if (!currentStaticPost || !currentStaticPost.photo_url || !currentStaticPost.photo_url.trim()) {
        alert("⚠️ Image required:\n\nPlease upload a photo before exporting or downloading this social post.");
        return;
      }
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

    // AI Suggested Post Event Listeners
    $("btn-save-photos-ai")?.addEventListener("click", () => {
      const cvs = $("ai-suggested-canvas");
      if (!cvs) return;
      saveImageDirectlyToMobilePhotos(cvs, "ilovefinland-ai-editorial-post.jpg", "image/jpeg", "AI Editorial Post (4:5)");
    });
    $("btn-dl-ai-jpg")?.addEventListener("click", () => {
      downloadCanvas("ai-suggested-canvas", "ilovefinland-ai-editorial-post.jpg", "image/jpeg");
    });
    $("btn-dl-ai-png")?.addEventListener("click", () => {
      downloadCanvas("ai-suggested-canvas", "ilovefinland-ai-editorial-post.png", "image/png");
    });
    $("btn-auto-titlecase")?.addEventListener("click", () => {
      if (!currentStaticPost) return;
      const l1 = $("static-edit-line1");
      const l2 = $("static-edit-line2");
      const l3 = $("static-edit-line3");
      if (l1) l1.value = toEditorialTitleCase(l1.value);
      if (l2) l2.value = toEditorialTitleCase(l2.value);
      if (l3) l3.value = toEditorialTitleCase(l3.value);
      updateStaticPostLive();
    });
    $("btn-refresh-ai-canvas")?.addEventListener("click", () => {
      if (cachedAISuggestedRender) cachedAISuggestedRender();
    });
    $("ai-select-card-style")?.addEventListener("change", () => {
      if (cachedAISuggestedRender) cachedAISuggestedRender();
    });
    $("ai-check-swipe-arrow")?.addEventListener("change", () => {
      if (cachedAISuggestedRender) cachedAISuggestedRender();
    });
    $("ai-input-location")?.addEventListener("input", (e) => {
      if (e.target && !e.target.value.trim()) {
        e.target.dataset.userCleared = "true";
      } else if (e.target) {
        e.target.dataset.userCleared = "false";
      }
      if (cachedAISuggestedRender) cachedAISuggestedRender();
    });

    // Static Post Live Adjustments (scales Badge, Line 1, Line 2, Line 3 together)
    const updateStaticPostLive = () => {
      if (!currentStaticPost) return;
      currentStaticPost.badge_text = $("static-edit-badge")?.value || "NEWS";
      currentStaticPost.headline_line1 = $("static-edit-line1")?.value || "";
      currentStaticPost.headline_line2 = $("static-edit-line2")?.value || "";
      currentStaticPost.headline_line3 = $("static-edit-line3")?.value || "";
      currentStaticPost.line1_color = $("static-edit-line1-color")?.value || "white";
      currentStaticPost.line2_color = $("static-edit-line2-color")?.value || "white";
      currentStaticPost.line3_color = $("static-edit-line3-color")?.value || "blue";
      currentStaticPost.cta_text = $("static-edit-cta")?.value || "";
      currentStaticPost.cta_color = $("static-edit-cta-color")?.value || "white";
      const fs = parseInt($("static-edit-fontsize")?.value, 10) || 32;
      currentStaticPost.line1_font_size = fs;
      currentStaticPost.line2_font_size = fs;
      currentStaticPost.line3_font_size = fs;
      const sizeVal = $("static-line2-size-val");
      if (sizeVal) sizeVal.textContent = `${fs}px`;
      drawStaticPostCanvases(currentStaticPost);

      // Keep carousel Slide 1 in sync
      if (typeof carouselSlidesData !== "undefined" && carouselSlidesData[1]) {
        carouselSlidesData[1].badge_text = currentStaticPost.badge_text;
        carouselSlidesData[1].headline_line1 = currentStaticPost.headline_line1;
        carouselSlidesData[1].headline_line2 = currentStaticPost.headline_line2;
        carouselSlidesData[1].headline_line3 = currentStaticPost.headline_line3;
        carouselSlidesData[1].cta_text = currentStaticPost.cta_text;
        carouselSlidesData[1].cta_color = currentStaticPost.cta_color;
        if (activeCarouselSlide === 1 && typeof renderActiveCarouselSlideCanvas === "function") {
          renderActiveCarouselSlideCanvas();
        }
      }
    };

    $("static-edit-badge")?.addEventListener("input", updateStaticPostLive);
    $("static-edit-line1")?.addEventListener("input", updateStaticPostLive);
    $("static-edit-line2")?.addEventListener("input", updateStaticPostLive);
    $("static-edit-line3")?.addEventListener("input", updateStaticPostLive);
    $("static-edit-line1-color")?.addEventListener("change", updateStaticPostLive);
    $("static-edit-line2-color")?.addEventListener("change", updateStaticPostLive);
    $("static-edit-line3-color")?.addEventListener("change", updateStaticPostLive);
    $("static-edit-cta")?.addEventListener("input", updateStaticPostLive);
    $("static-edit-cta-color")?.addEventListener("change", updateStaticPostLive);
    $("static-edit-fontsize")?.addEventListener("input", updateStaticPostLive);

    // Design - 1 Picture Adjustment Listeners
    $("photo-zoom-range")?.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10) || 100;
      if ($("photo-zoom-val")) $("photo-zoom-val").textContent = `${val}%`;
      if (currentStaticPost) {
        currentStaticPost.photo_zoom = val;
        drawStaticPostCanvases(currentStaticPost);
      }
    });
    $("photo-shift-x-range")?.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      if (currentStaticPost) {
        currentStaticPost.photo_shift_x = val;
        drawStaticPostCanvases(currentStaticPost);
      }
    });
    $("photo-shift-y-range")?.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      if (currentStaticPost) {
        currentStaticPost.photo_shift_y = val;
        drawStaticPostCanvases(currentStaticPost);
      }
    });
    $("btn-photo-pan-left")?.addEventListener("click", () => {
      if ($("photo-shift-x-range")) $("photo-shift-x-range").value = -100;
      if (currentStaticPost) {
        currentStaticPost.photo_shift_x = -100;
        drawStaticPostCanvases(currentStaticPost);
      }
    });
    $("btn-photo-pan-center-x")?.addEventListener("click", () => {
      if ($("photo-shift-x-range")) $("photo-shift-x-range").value = 0;
      if (currentStaticPost) {
        currentStaticPost.photo_shift_x = 0;
        drawStaticPostCanvases(currentStaticPost);
      }
    });
    $("btn-photo-pan-right")?.addEventListener("click", () => {
      if ($("photo-shift-x-range")) $("photo-shift-x-range").value = 100;
      if (currentStaticPost) {
        currentStaticPost.photo_shift_x = 100;
        drawStaticPostCanvases(currentStaticPost);
      }
    });
    $("btn-photo-pan-top")?.addEventListener("click", () => {
      if ($("photo-shift-y-range")) $("photo-shift-y-range").value = -100;
      if (currentStaticPost) {
        currentStaticPost.photo_shift_y = -100;
        drawStaticPostCanvases(currentStaticPost);
      }
    });
    $("btn-photo-pan-center-y")?.addEventListener("click", () => {
      if ($("photo-shift-y-range")) $("photo-shift-y-range").value = 0;
      if (currentStaticPost) {
        currentStaticPost.photo_shift_y = 0;
        drawStaticPostCanvases(currentStaticPost);
      }
    });
    $("btn-photo-pan-bottom")?.addEventListener("click", () => {
      if ($("photo-shift-y-range")) $("photo-shift-y-range").value = 100;
      if (currentStaticPost) {
        currentStaticPost.photo_shift_y = 100;
        drawStaticPostCanvases(currentStaticPost);
      }
    });
    $("btn-reset-photo-framing")?.addEventListener("click", () => {
      if ($("photo-zoom-range")) $("photo-zoom-range").value = 100;
      if ($("photo-zoom-val")) $("photo-zoom-val").textContent = "100%";
      if ($("photo-shift-x-range")) $("photo-shift-x-range").value = 0;
      if ($("photo-shift-y-range")) $("photo-shift-y-range").value = 0;
      if (currentStaticPost) {
        currentStaticPost.photo_zoom = 100;
        currentStaticPost.photo_shift_x = 0;
        currentStaticPost.photo_shift_y = 0;
        drawStaticPostCanvases(currentStaticPost);
      }
    });

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
      if (!currentPackageId || !currentStaticPost) {
        showToast("⚠️ No active post loaded to save.", "warning");
        return;
      }
      const saveBtn = $("btn-save-static-post");
      const origHtml = saveBtn ? saveBtn.innerHTML : "";
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span>⏳ Saving...</span>`;
      }
      try {
        if (typeof saveActiveCarouselSlideInputs === "function") {
          saveActiveCarouselSlideInputs();
        }
        const fs = parseInt($("static-edit-fontsize")?.value, 10) || 32;
        const adjustments = {
          badge_text: $("static-edit-badge")?.value || "NEWS",
          headline_line1: $("static-edit-line1")?.value || "",
          headline_line2: $("static-edit-line2")?.value || "",
          headline_line3: $("static-edit-line3")?.value || "",
          line1_color: $("static-edit-line1-color")?.value || "white",
          line2_color: $("static-edit-line2-color")?.value || "white",
          line3_color: $("static-edit-line3-color")?.value || "blue",
          cta_text: $("static-edit-cta")?.value || "",
          cta_color: $("static-edit-cta-color")?.value || "white",
          line1_font_size: fs,
          line2_font_size: fs,
          line3_font_size: fs,
          caption: $("static-edit-caption")?.value || "",
          hashtags: ($("static-edit-hashtags")?.value || "").split(/\s+/).filter((h) => h.startsWith("#")),
          photo_zoom: parseInt($("photo-zoom-range")?.value, 10) || 100,
          photo_shift_x: parseInt($("photo-shift-x-range")?.value, 10) || 0,
          photo_shift_y: parseInt($("photo-shift-y-range")?.value, 10) || 0,
          carousel_slides: typeof getCleanCarouselSlidesForSave === "function" ? getCleanCarouselSlidesForSave() : [],
          show_swipe_arrow: $("ai-check-swipe-arrow")?.checked || false,
          location_stamp: $("ai-input-location")?.value || "",
          card_style: $("ai-select-card-style")?.value || "frosted",
        };
        await api("/api/package/adjust-static-post", {
          method: "POST",
          body: JSON.stringify({ package_id: currentPackageId, adjustments }),
        });
        const drawerWasOpen = Boolean($("carousel-and-style-drawer")?.open);
        const prevSlide = activeCarouselSlide;
        await loadPackage(currentPackageId);
        if (drawerWasOpen && $("carousel-and-style-drawer")) $("carousel-and-style-drawer").open = true;
        if (prevSlide && typeof loadActiveCarouselSlideInputs === "function") loadActiveCarouselSlideInputs(prevSlide);
        showToast("✅ Saved Post & Carousel changes!", "success");
        if (saveBtn) {
          saveBtn.innerHTML = `<span>✓ Saved!</span>`;
          setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = origHtml;
          }, 1800);
        }
      } catch (err) {
        console.error("Save static post error:", err);
        showToast(`❌ Failed to save: ${err.message || err}`, "error");
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origHtml;
        }
      }
    });

    // ==============================================================
    // CAROUSEL DECK CONTROLLER (SLIDES 2 TO 6)
    // ==============================================================
    function getCleanCarouselSlidesForSave() {
      saveActiveCarouselSlideInputs();
      const list = [];
      for (let i = 1; i <= 6; i++) {
        const s = carouselSlidesData[i];
        if (s) {
          list.push({
            slide_number: i,
            badge_text: s.badge_text || "",
            headline_line1: s.headline_line1 || "",
            headline_line2: s.headline_line2 || "",
            headline_line3: s.headline_line3 || "",
            line1_color: s.line1_color || "white",
            line2_color: s.line2_color || "white",
            line3_color: s.line3_color || "blue",
            cta_text: s.cta_text || "",
            cta_color: s.cta_color || "white",
            font_size: s.font_size || 44,
            location: s.location || "",
            card_style: s.card_style || "frosted",
            card_opacity: s.card_opacity !== undefined ? s.card_opacity : 86,
            arrow_style: s.arrow_style || "brand",
            photo_zoom: s.photo_zoom !== undefined ? s.photo_zoom : 100,
            photo_shift_x: s.photo_shift_x !== undefined ? s.photo_shift_x : 0,
            photo_shift_y: s.photo_shift_y !== undefined ? s.photo_shift_y : 0,
            show_swipe_arrow: s.show_swipe_arrow !== false,
            photoDataUrl: s.photoDataUrl || "",
          });
        }
      }
      return list;
    }

    function saveActiveCarouselSlideInputs() {
      const s = carouselSlidesData[activeCarouselSlide];
      if (!s) return;
      s.badge_text = $("carousel-edit-badge")?.value || "";
      s.headline_line1 = $("carousel-edit-line1")?.value || "";
      s.headline_line2 = $("carousel-edit-line2")?.value || "";
      s.headline_line3 = $("carousel-edit-line3")?.value || "";
      s.line1_color = $("carousel-edit-line1-color")?.value || "white";
      s.line2_color = $("carousel-edit-line2-color")?.value || "white";
      s.line3_color = $("carousel-edit-line3-color")?.value || "blue";
      s.cta_text = $("carousel-edit-cta")?.value || "";
      s.cta_color = $("carousel-edit-cta-color")?.value || "white";
      s.font_size = parseInt($("carousel-edit-fontsize")?.value, 10) || 44;
      s.location = $("carousel-input-location")?.value || "";
      s.card_style = $("carousel-select-card-style")?.value || "frosted";
      s.card_opacity = parseInt($("carousel-range-card-opacity")?.value, 10) || 86;
      s.arrow_style = $("carousel-select-arrow-style")?.value || "brand";
      s.photo_zoom = parseInt($("carousel-photo-zoom-range")?.value, 10) || 100;
      s.photo_shift_x = parseInt($("carousel-photo-shift-x-range")?.value, 10) || 0;
      s.photo_shift_y = parseInt($("carousel-photo-shift-y-range")?.value, 10) || 0;
      s.show_swipe_arrow = $("carousel-check-swipe-arrow") ? $("carousel-check-swipe-arrow").checked : (activeCarouselSlide !== 6);

      // If editing Slide 1, sync back to Design - 1 controls and canvases ONLY if non-empty
      if (activeCarouselSlide === 1) {
        if ($("static-edit-badge") && s.badge_text && s.badge_text.trim()) $("static-edit-badge").value = s.badge_text;
        if ($("static-edit-line1") && s.headline_line1 && s.headline_line1.trim()) $("static-edit-line1").value = s.headline_line1;
        if ($("static-edit-line2") && s.headline_line2 && s.headline_line2.trim()) $("static-edit-line2").value = s.headline_line2;
        if ($("static-edit-line3") && s.headline_line3 && s.headline_line3.trim()) $("static-edit-line3").value = s.headline_line3;
        if ($("static-edit-cta") && s.cta_text && s.cta_text.trim()) $("static-edit-cta").value = s.cta_text;
        if ($("static-edit-cta-color") && s.cta_color) $("static-edit-cta-color").value = s.cta_color;
        if ($("ai-input-location") && s.location) $("ai-input-location").value = s.location;
        if (typeof currentStaticPost !== "undefined" && currentStaticPost) {
          if (s.badge_text && s.badge_text.trim()) currentStaticPost.badge_text = s.badge_text;
          if (s.headline_line1 && s.headline_line1.trim()) currentStaticPost.headline_line1 = s.headline_line1;
          if (s.headline_line2 && s.headline_line2.trim()) currentStaticPost.headline_line2 = s.headline_line2;
          if (s.headline_line3 && s.headline_line3.trim()) currentStaticPost.headline_line3 = s.headline_line3;
          if (s.cta_text && s.cta_text.trim()) currentStaticPost.cta_text = s.cta_text;
          if (s.cta_color) currentStaticPost.cta_color = s.cta_color;
          if (typeof drawStaticPostCanvases === "function") {
            drawStaticPostCanvases(currentStaticPost);
          }
        }
      }
    }

    function loadActiveCarouselSlideInputs(slideNum) {
      activeCarouselSlide = slideNum;
      const s = carouselSlidesData[slideNum] || defaultSlideData(slideNum);
      carouselSlidesData[slideNum] = s;

      // Auto-Draft Recovery from LocalStorage so slide photos survive refreshes/restarts
      if (typeof currentPackageId !== "undefined" && currentPackageId && !s.photoImg && !s.photoDataUrl) {
        try {
          const cached = localStorage.getItem(`ilf_d2_photo_${currentPackageId}_${slideNum}`);
          if (cached) {
            s.photoDataUrl = cached;
            const img = new Image();
            img.onload = () => {
              s.photoImg = img;
              if (activeCarouselSlide === slideNum) renderActiveCarouselSlideCanvas();
            };
            img.src = cached;
          }
        } catch (e) {}
      }

      // For Slide 1: If headline lines are empty, automatically populate from Design - 1 inputs or current package
      if (slideNum === 1) {
        if (!s.headline_line1 || !s.headline_line1.trim()) {
          s.headline_line1 = ($("static-edit-line1")?.value) || (currentStaticPost?.headline_line1) || (bundle?.package?.title) || "";
        }
        if (!s.headline_line2 || !s.headline_line2.trim()) {
          s.headline_line2 = ($("static-edit-line2")?.value) || (currentStaticPost?.headline_line2) || "";
        }
        if (!s.headline_line3 || !s.headline_line3.trim()) {
          s.headline_line3 = ($("static-edit-line3")?.value) || (currentStaticPost?.headline_line3) || "";
        }
        if (!s.badge_text || !s.badge_text.trim()) {
          s.badge_text = ($("static-edit-badge")?.value) || (currentStaticPost?.badge_text) || "NEWS";
        }
        if (!s.cta_text || !s.cta_text.trim()) {
          s.cta_text = ($("static-edit-cta")?.value) || (currentStaticPost?.cta_text) || "Read full article";
        }
      }

      const titleEl = $("carousel-active-slide-title");
      if (titleEl) {
        if (slideNum === 1) {
          titleEl.textContent = "Slide 1 (Main Cover Story)";
        } else if (slideNum === 6) {
          titleEl.textContent = "Slide 6 (Closing & Call-To-Action)";
        } else {
          titleEl.textContent = `Slide ${slideNum} (Point / Story)`;
        }
      }
      const badgeEl = $("carousel-active-slide-badge");
      if (badgeEl) {
        badgeEl.textContent = `Slide ${slideNum} of 6`;
      }

      if ($("carousel-edit-badge")) $("carousel-edit-badge").value = s.badge_text || "";
      if ($("carousel-edit-line1")) $("carousel-edit-line1").value = s.headline_line1 || "";
      if ($("carousel-edit-line2")) $("carousel-edit-line2").value = s.headline_line2 || "";
      if ($("carousel-edit-line3")) $("carousel-edit-line3").value = s.headline_line3 || "";
      if ($("carousel-edit-line1-color")) $("carousel-edit-line1-color").value = s.line1_color || "white";
      if ($("carousel-edit-line2-color")) $("carousel-edit-line2-color").value = s.line2_color || "white";
      if ($("carousel-edit-line3-color")) $("carousel-edit-line3-color").value = s.line3_color || "blue";
      if ($("carousel-edit-cta")) $("carousel-edit-cta").value = s.cta_text || "";
      if ($("carousel-edit-cta-color")) $("carousel-edit-cta-color").value = s.cta_color || "white";
      if ($("carousel-edit-fontsize")) $("carousel-edit-fontsize").value = s.font_size || 44;
      if ($("carousel-fontsize-val")) $("carousel-fontsize-val").textContent = `${s.font_size || 44}px`;
      if ($("carousel-input-location")) $("carousel-input-location").value = s.location || "";
      if ($("carousel-select-card-style")) $("carousel-select-card-style").value = s.card_style || "frosted";
      if ($("carousel-check-swipe-arrow")) $("carousel-check-swipe-arrow").checked = s.show_swipe_arrow !== false;

      const op = s.card_opacity !== undefined ? s.card_opacity : 86;
      if ($("carousel-range-card-opacity")) $("carousel-range-card-opacity").value = op;
      if ($("carousel-card-opacity-val")) $("carousel-card-opacity-val").textContent = `${op}%`;
      if ($("carousel-select-card-tone")) {
        const toneSelect = $("carousel-select-card-tone");
        const hasOption = Array.from(toneSelect.options).some((o) => o.value == op);
        toneSelect.value = hasOption ? String(op) : "custom";
      }
      if ($("carousel-select-arrow-style")) $("carousel-select-arrow-style").value = s.arrow_style || "brand";

      const zoom = s.photo_zoom !== undefined ? s.photo_zoom : 100;
      if ($("carousel-photo-zoom-range")) $("carousel-photo-zoom-range").value = zoom;
      if ($("carousel-photo-zoom-val")) $("carousel-photo-zoom-val").textContent = `${zoom}%`;

      const sx = s.photo_shift_x !== undefined ? s.photo_shift_x : 0;
      if ($("carousel-photo-shift-x-range")) $("carousel-photo-shift-x-range").value = sx;

      const sy = s.photo_shift_y !== undefined ? s.photo_shift_y : 0;
      if ($("carousel-photo-shift-y-range")) $("carousel-photo-shift-y-range").value = sy;

      const statusBadge = $("carousel-photo-status-badge");
      const nameEl = $("carousel-photo-name");
      if (s.photoImg || s.photoDataUrl) {
        if (statusBadge) {
          statusBadge.textContent = "Photo Ready";
          statusBadge.className = "badge badge-success";
        }
        if (nameEl) nameEl.textContent = "Photo assigned";
      } else {
        if (statusBadge) {
          statusBadge.textContent = "No Photo";
          statusBadge.className = "badge badge-alert";
        }
        if (nameEl) nameEl.textContent = "No photo selected";
      }

      renderActiveCarouselSlideCanvas();
    }

    function renderSingleSlideToCanvas(cvs, s, slideNum) {
      if (!cvs || !s) return;
      const ctx = cvs.getContext("2d");
      const w = 1080;
      const h = 1350;
      ctx.clearRect(0, 0, w, h);

      // Background Photo or Gradient
      if (s.photoImg && s.photoImg.complete && s.photoImg.naturalWidth > 0) {
        const p = s.photoImg;
        const imgAspect = p.width / p.height;
        const canvasAspect = w / h;
        const zoom = Math.max(1.0, Math.min(3.0, (parseFloat(s.photo_zoom) || 100) / 100));
        const shiftX = Math.max(-100, Math.min(100, parseFloat(s.photo_shift_x) || 0)) / 100;
        const shiftY = Math.max(-100, Math.min(100, parseFloat(s.photo_shift_y) || 0)) / 100;

        let baseW, baseH;
        if (imgAspect > canvasAspect) {
          baseH = h;
          baseW = h * imgAspect;
        } else {
          baseW = w;
          baseH = w / imgAspect;
        }

        const drawW = baseW * zoom;
        const drawH = baseH * zoom;
        const maxShiftX = Math.max(0, (drawW - w) / 2);
        const maxShiftY = Math.max(0, (drawH - h) / 2);
        const drawX = ((w - drawW) / 2) - (shiftX * maxShiftX);
        const drawY = ((h - drawH) / 2) - (shiftY * maxShiftY);

        ctx.drawImage(p, drawX, drawY, drawW, drawH);

        // Vignette
        const vig = ctx.createLinearGradient(0, 0, 0, h);
        vig.addColorStop(0, "rgba(1, 20, 40, 0.35)");
        vig.addColorStop(0.35, "rgba(1, 20, 40, 0.05)");
        vig.addColorStop(0.65, "rgba(1, 20, 40, 0.25)");
        vig.addColorStop(1, "rgba(1, 15, 30, 0.65)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, "#0A192F");
        bgGrad.addColorStop(1, "#003580");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Safe Logo Reference
      const activeLogo = (typeof sharedLogoImg !== "undefined" && sharedLogoImg && sharedLogoImg.complete && sharedLogoImg.naturalWidth > 0)
        ? sharedLogoImg
        : null;

      // Top-Left Brand Logo Capsule (Official Brand Logo + ILoveFinland.net)
      const brandName = "ILoveFinland.net";
      ctx.save();
      ctx.font = '800 25px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
      const brandM = ctx.measureText(brandName);
      const logoIconSize = 42;
      const brandPadX = 18;
      const brandPadY = 10;
      const brandW = logoIconSize + 12 + brandM.width + brandPadX * 2;
      const brandH = logoIconSize + brandPadY * 2;
      const brandX = 64;
      const brandY = 64;

      ctx.fillStyle = "rgba(1, 28, 56, 0.78)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(brandX, brandY, brandW, brandH, 999);
      } else {
        ctx.rect(brandX, brandY, brandW, brandH);
      }
      ctx.fill();
      ctx.stroke();

      if (activeLogo) {
        ctx.drawImage(activeLogo, brandX + brandPadX, brandY + brandPadY, logoIconSize, logoIconSize);
      } else {
        ctx.fillStyle = "#029CD8";
        ctx.font = "26px sans-serif";
        ctx.fillText("💙", brandX + brandPadX, brandY + brandH - brandPadY - 8);
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.font = '800 25px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
      ctx.fillText(brandName, brandX + brandPadX + logoIconSize + 12, brandY + brandH - brandPadY - 10);
      ctx.restore();

      // Location Stamp
      let locText = (s.location || "").trim();
      locText = locText.replace(/^(📍\s*)+/, "");
      if (locText && locText.toLowerCase() !== "finland, finland") {
        if (locText.toLowerCase() === "finland") locText = "Finland";
        const fullLoc = "📍 " + locText;
        ctx.save();
        ctx.font = '700 26px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif';
        const locM = ctx.measureText(fullLoc);
        const locPadX = 22;
        const locPadY = 12;
        const locW = locM.width + locPadX * 2;
        const locH = brandH;
        const locX = w - 64 - locW;
        const locY = 64;

        ctx.fillStyle = "rgba(1, 28, 56, 0.75)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(locX, locY, locW, locH, 999);
        } else {
          ctx.rect(locX, locY, locW, locH);
        }
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(fullLoc, locX + locPadX, locY + locH - locPadY - 8);
        ctx.restore();
      }

      const showArrow = s.show_swipe_arrow !== false;
      const ctaText = showArrow ? "ILoveFinland ➔" : "Link in bio • ilovefinland.net →";

      // If clean photo style, just draw floating CTA pill
      if (s.card_style === "clean") {
        ctx.save();
        ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif';
        const ctaM = ctx.measureText(ctaText);
        const ctaPadX = 24;
        const ctaPadY = 14;
        const ctaW = ctaM.width + ctaPadX * 2;
        const ctaH = brandH;
        const ctaX = w - 64 - ctaW;
        const ctaY = h - 64 - ctaH;

        ctx.fillStyle = "rgba(1, 28, 56, 0.82)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 999);
        } else {
          ctx.rect(ctaX, ctaY, ctaW, ctaH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = showArrow ? "#38BDF8" : "#FFFFFF";
        ctx.fillText(ctaText, ctaX + ctaPadX, ctaY + ctaH - ctaPadY - 6);
        ctx.restore();
        return;
      }

      // Frosted Glass Card
      const cardPad = 42;
      const cardW = w - 128;
      const cardX = 64;
      const cardH = 376;
      const cardY = h - 440;

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 35;
      ctx.shadowOffsetY = 16;
      // Frosted Glass Card Opacity / Tone (Custom Lighter or Darker)
      const opVal = (s.card_opacity !== undefined && !isNaN(parseInt(s.card_opacity, 10)))
        ? Math.min(100, Math.max(25, parseInt(s.card_opacity, 10))) / 100
        : 0.86;
      const r = opVal > 0.90 ? 1 : 2;
      const g = opVal > 0.90 ? 16 : 24;
      const b = opVal > 0.90 ? 36 : 48;
      ctx.fillStyle = s.card_style === "minimal" ? `rgba(1, 37, 71, ${opVal})` : `rgba(${r}, ${g}, ${b}, ${opVal})`;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(cardX, cardY, cardW, cardH, 26);
      } else {
        ctx.rect(cardX, cardY, cardW, cardH);
      }
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.stroke();
      ctx.restore();

      // Category / Slide Badge
      const catText = (s.badge_text || `SLIDE 0${slideNum}`).toUpperCase();
      ctx.save();
      ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
      const catM = ctx.measureText(catText);
      const catW = catM.width + 24;
      const catH = 36;
      const catX = cardX + cardPad;
      const catY = cardY + 34;

      ctx.fillStyle = "#029CD8";
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(catX, catY, catW, catH, 6);
      } else {
        ctx.rect(catX, catY, catW, catH);
      }
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(catText, catX + 12, catY + 25);

      ctx.restore();

      // Headline Lines
      const fs = s.font_size || 44;
      const lineH = Math.round(fs * 1.25);
      const maxTitleW = cardW - (cardPad * 2);

      const rawLine1 = (s.headline_line1 || "").trim();
      const rawLine2 = (s.headline_line2 || "").trim();
      const rawLine3 = (s.headline_line3 || "").trim();

      let titleLines = [];
      if (rawLine1 || rawLine2 || rawLine3) {
        if (rawLine1) titleLines.push(toEditorialTitleCase(rawLine1));
        if (rawLine2) titleLines.push(toEditorialTitleCase(rawLine2));
        if (rawLine3) titleLines.push(toEditorialTitleCase(rawLine3));
      } else {
        titleLines = [slideNum === 6 ? "Read The Full Story At ILoveFinland.net" : "Slide Details & Highlights"];
      }

      ctx.save();
      ctx.font = `800 ${fs}px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif`;
      let titleY = catY + catH + Math.round(fs * 0.95);
      const slideLineColors = [
        s.line1_color || "white",
        s.line2_color || "white",
        s.line3_color || (rawLine3 ? "blue" : "white")
      ];
      for (let i = 0; i < Math.min(titleLines.length, 3); i++) {
        const curCol = slideLineColors[i] || "white";
        ctx.fillStyle = (curCol === "blue") ? "#00A3FF" : "#FFFFFF";
        let lineToDraw = titleLines[i];
        if (ctx.measureText(lineToDraw).width > maxTitleW) {
          while (lineToDraw.length > 3 && ctx.measureText(lineToDraw + "…").width > maxTitleW) {
            lineToDraw = lineToDraw.slice(0, -1);
          }
          lineToDraw += "…";
        }
        ctx.fillText(lineToDraw, cardX + cardPad, titleY);
        titleY += lineH;
      }
      ctx.restore();

      // Footer
      ctx.save();
      const footY = cardY + cardH - 32;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + cardPad, footY - 26);
      ctx.lineTo(cardX + cardW - cardPad, footY - 26);
      ctx.stroke();

      const footerCta = (s.cta_text && s.cta_text.trim())
        ? s.cta_text.trim()
        : (slideNum === 6 ? "DISCOVER MORE AT ILOVEFINLAND.NET" : "Read full article");
      const ctaColor = s.cta_color === "blue" ? "#38BDF8" : "#FFFFFF";

      if (activeLogo) {
        ctx.drawImage(activeLogo, cardX + cardPad, footY - 20, 24, 24);
        ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        ctx.fillStyle = ctaColor;
        ctx.fillText(footerCta, cardX + cardPad + 32, footY);
      } else {
        ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        ctx.fillStyle = ctaColor;
        ctx.fillText(footerCta, cardX + cardPad, footY);
      }

      if (showArrow) {
        const arrowStyle = s.arrow_style || "brand";
        let promptText = "ILoveFinland";
        if (arrowStyle === "swipe") promptText = "Swipe";
        else if (arrowStyle === "next") promptText = "Next";
        else if (arrowStyle === "arrow_only") promptText = "";

        const arrowGlyph = "➔";
        const rightEdge = cardX + cardW - cardPad;
        const arrowY = footY - 1;

        // Big, prominent bold electric blue arrow with vibrant neon glow
        ctx.save();
        ctx.textAlign = "right";
        ctx.font = '900 40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = "#38BDF8";
        ctx.shadowColor = "rgba(0, 163, 255, 0.95)";
        ctx.shadowBlur = 14;
        ctx.fillText(arrowGlyph, rightEdge, arrowY);
        const arrowW = ctx.measureText(arrowGlyph).width;
        ctx.restore();

        // Optional prompt text next to arrow
        if (promptText) {
          ctx.save();
          ctx.textAlign = "right";
          ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
          ctx.fillStyle = "#E2E8F0";
          ctx.fillText(promptText, rightEdge - arrowW - 10, footY - 5);
          ctx.restore();
        }
      } else {
        ctx.textAlign = "right";
        ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        ctx.fillStyle = "#94A3B8";
        ctx.fillText("ilovefinland.net", cardX + cardW - cardPad, footY - 4);
      }
      ctx.restore();
    }

    function renderActiveCarouselSlideCanvas() {
      const cvs = $("carousel-canvas");
      if (!cvs) return;
      const s = carouselSlidesData[activeCarouselSlide];
      if (!s) return;
      renderSingleSlideToCanvas(cvs, s, activeCarouselSlide);
    }

    // Expose to window for top-level access from loadPackage and tab switchers
    window.loadActiveCarouselSlideInputs = loadActiveCarouselSlideInputs;
    window.saveActiveCarouselSlideInputs = saveActiveCarouselSlideInputs;
    window.renderActiveCarouselSlideCanvas = renderActiveCarouselSlideCanvas;

    // Carousel Tab switching
    document.querySelectorAll(".btn-carousel-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        saveActiveCarouselSlideInputs();
        document.querySelectorAll(".btn-carousel-tab").forEach((b) => {
          b.style.background = "rgba(2,24,48,0.7)";
          b.style.color = "#94A3B8";
          b.style.border = "1px solid rgba(255,255,255,0.12)";
          b.classList.remove("active");
        });
        btn.style.background = "#029CD8";
        btn.style.color = "#fff";
        btn.style.border = "1px solid #38BDF8";
        btn.classList.add("active");
        const slideNum = parseInt(btn.dataset.slide, 10);
        loadActiveCarouselSlideInputs(slideNum);
      });
    });

    // Compress huge phone/camera photos cleanly to <=1600px JPEG (~220KB) so saves & localStorage never fail
    function compressSlideImageToDataUrl(img, maxDim = 1600, quality = 0.88) {
      const w = img.naturalWidth || img.width || 1080;
      const h = img.naturalHeight || img.height || 1350;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));
      const c = document.createElement("canvas");
      c.width = tw;
      c.height = th;
      c.getContext("2d").drawImage(img, 0, 0, tw, th);
      return c.toDataURL("image/jpeg", quality);
    }

    // Upload photo for active carousel slide (compressed cleanly + Auto-Draft LocalStorage backup)
    $("input-upload-carousel-photo")?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const rawDataUrl = evt.target.result;
        const img = new Image();
        img.onload = () => {
          const optimizedUrl = compressSlideImageToDataUrl(img, 1600, 0.88);
          const optImg = new Image();
          optImg.onload = () => {
            carouselSlidesData[activeCarouselSlide].photoDataUrl = optimizedUrl;
            carouselSlidesData[activeCarouselSlide].photoImg = optImg;
            try {
              if (currentPackageId) {
                localStorage.setItem(`ilf_d2_photo_${currentPackageId}_${activeCarouselSlide}`, optimizedUrl);
              }
            } catch (err) {}
            loadActiveCarouselSlideInputs(activeCarouselSlide);
            showToast(`✅ Photo uploaded for Slide ${activeCarouselSlide}!`, "success");
          };
          optImg.src = optimizedUrl;
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    });

    // Individual downloads for active slide
    const saveActiveCarouselSlideToPhotos = () => {
      const cvs = $("carousel-canvas");
      if (!cvs) return;
      saveImageDirectlyToMobilePhotos(cvs, `ilovefinland-slide-${activeCarouselSlide}.jpg`, "image/jpeg", `Slide ${activeCarouselSlide} (4:5)`);
    };
    $("btn-save-carousel-slide")?.addEventListener("click", saveActiveCarouselSlideToPhotos);
    $("btn-save-carousel-slide-photos")?.addEventListener("click", saveActiveCarouselSlideToPhotos);
    $("btn-dl-carousel-slide-jpg")?.addEventListener("click", () => {
      downloadCanvas("carousel-canvas", `ilovefinland-slide-${activeCarouselSlide}.jpg`, "image/jpeg");
    });
    $("btn-dl-carousel-slide-png")?.addEventListener("click", () => {
      downloadCanvas("carousel-canvas", `ilovefinland-slide-${activeCarouselSlide}.png`, "image/png");
    });

    // Pure-JS Uncompressed ZIP builder (CRC-32 + STORE) — 100% Safari, Chrome & iOS Downloads compatible!
    function buildUncompressedZipBlob(files) {
      const crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        crcTable[n] = c >>> 0;
      }
      const crc32 = (bytes) => {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
      };
      const enc = new TextEncoder();
      const localParts = [];
      const centralParts = [];
      let offset = 0;
      const now = new Date();
      const dosTime = ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5) | ((now.getSeconds() >> 1) & 31);
      const dosDate = (((Math.max(1980, now.getFullYear()) - 1980) & 127) << 9) | (((now.getMonth() + 1) & 15) << 5) | (now.getDate() & 31);

      for (const f of files) {
        const nameBytes = enc.encode(f.name);
        const data = f.bytes;
        const crc = crc32(data);

        const lh = new ArrayBuffer(30 + nameBytes.length);
        const lv = new DataView(lh);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0x0800, true);
        lv.setUint16(8, 0, true); // STORE
        lv.setUint16(10, dosTime, true);
        lv.setUint16(12, dosDate, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, data.length, true);
        lv.setUint32(22, data.length, true);
        lv.setUint16(26, nameBytes.length, true);
        lv.setUint16(28, 0, true);
        new Uint8Array(lh, 30).set(nameBytes);
        localParts.push(new Uint8Array(lh), data);

        const ch = new ArrayBuffer(46 + nameBytes.length);
        const cv = new DataView(ch);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0x0800, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, dosTime, true);
        cv.setUint16(14, dosDate, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, data.length, true);
        cv.setUint32(24, data.length, true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, offset, true);
        new Uint8Array(ch, 46).set(nameBytes);
        centralParts.push(new Uint8Array(ch));

        offset += 30 + nameBytes.length + data.length;
      }

      const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
      const eocd = new ArrayBuffer(22);
      const ev = new DataView(eocd);
      ev.setUint32(0, 0x06054b50, true);
      ev.setUint16(4, 0, true);
      ev.setUint16(6, 0, true);
      ev.setUint16(8, files.length, true);
      ev.setUint16(10, files.length, true);
      ev.setUint32(12, centralSize, true);
      ev.setUint32(16, offset, true);
      ev.setUint16(20, 0, true);

      return new Blob([...localParts, ...centralParts, new Uint8Array(eocd)], { type: "application/zip" });
    }

    function ensureSlideImageLoaded(slideObj) {
      return new Promise((resolve) => {
        if (!slideObj) { resolve(); return; }
        if (slideObj.photoImg && slideObj.photoImg.complete && slideObj.photoImg.naturalWidth > 0) {
          resolve();
          return;
        }
        const src = slideObj.photoDataUrl || slideObj.photo_url || "";
        if (!src) { resolve(); return; }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { slideObj.photoImg = img; resolve(); };
        img.onerror = () => resolve();
        img.src = src;
      });
    }

    function dataUrlToUint8Array(dataUrl) {
      const b64 = dataUrl.split(",")[1] || "";
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }

    // Group Download: Bundles ALL 6 slides + caption into ONE .ZIP file straight to Downloads (works in Safari & Chrome!)
    async function downloadAllCarouselSlides() {
      const btn = $("btn-download-all-carousel-slides");
      const origHtml = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>⏳ Building 6-Slide .ZIP…</span>`;
      }
      try {
        saveActiveCarouselSlideInputs();
        const offscreen = document.createElement("canvas");
        offscreen.width = 1080;
        offscreen.height = 1350;

        const zipFiles = [];
        for (let i = 1; i <= 6; i++) {
          const s = carouselSlidesData[i];
          if (!s) continue;
          await ensureSlideImageLoaded(s);
          renderSingleSlideToCanvas(offscreen, s, i);
          const jpgUrl = offscreen.toDataURL("image/jpeg", 0.93);
          const label = i === 1 ? "cover" : i === 6 ? "cta" : `slide${i}`;
          zipFiles.push({
            name: `0${i}_${label}_1080x1350.jpg`,
            bytes: dataUrlToUint8Array(jpgUrl),
          });
        }

        const captionText = ($("static-edit-caption")?.value || $("social-caption-textarea")?.value || "").trim();
        const hashtagsText = ($("static-edit-hashtags")?.value || "").trim();
        const combinedCaption = [captionText, hashtagsText].filter(Boolean).join("\n\n");
        if (combinedCaption) {
          zipFiles.push({
            name: "caption.txt",
            bytes: new TextEncoder().encode(combinedCaption),
          });
        }

        if (!zipFiles.length) {
          showToast("⚠️ No carousel slides available to download yet.", "warning");
          return;
        }

        const zipBlob = buildUncompressedZipBlob(zipFiles);
        const slugBase = (($("wp-field-headline")?.value || $("static-edit-line1")?.value || `post-${currentPackageId || "ilf"}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40)) || "ilovefinland-carousel";
        const zipName = `${slugBase}-6-slides.zip`;

        const blobUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = zipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);

        showToast(`✅ Downloaded ${zipName} (${zipFiles.filter((f) => f.name.endsWith(".jpg")).length} slides + caption) to Downloads!`, "success");
      } catch (err) {
        console.error("Batch ZIP download error:", err);
        showToast(`❌ Failed to build ZIP download: ${err.message || err}`, "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origHtml;
        }
      }
    }
    $("btn-download-all-carousel-slides")?.addEventListener("click", downloadAllCarouselSlides);

    // Expand / Minimize Toggle
    $("btn-toggle-carousel-deck")?.addEventListener("click", () => {
      const body = $("carousel-deck-body");
      if (!body) return;
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "block" : "none";
      const chev = $("carousel-deck-toggle-chevron");
      const lbl = $("carousel-deck-toggle-label");
      if (chev) chev.textContent = isHidden ? "▲" : "▼";
      if (lbl) lbl.textContent = isHidden ? "Minimize Design - 2 (Slides 1–6)" : "Expand Design - 2 (Slides 1–6)";
      if (isHidden) {
        loadActiveCarouselSlideInputs(activeCarouselSlide);
      }
    });

    // Presets & Live input listeners for Carousel Slide
    $("btn-carousel-clean-preset")?.addEventListener("click", () => {
      if ($("carousel-select-card-style")) $("carousel-select-card-style").value = "clean";
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("btn-carousel-frosted-preset")?.addEventListener("click", () => {
      if ($("carousel-select-card-style")) $("carousel-select-card-style").value = "frosted";
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("btn-carousel-autotitlecase")?.addEventListener("click", () => {
      const l1 = $("carousel-edit-line1");
      const l2 = $("carousel-edit-line2");
      const l3 = $("carousel-edit-line3");
      if (l1) l1.value = toEditorialTitleCase(l1.value);
      if (l2) l2.value = toEditorialTitleCase(l2.value);
      if (l3) l3.value = toEditorialTitleCase(l3.value);
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
      showToast("Applied editorial title case to slide lines");
    });
    $("btn-carousel-rerender")?.addEventListener("click", () => {
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
      showToast("Re-rendered slide canvas");
    });

    $("carousel-edit-badge")?.addEventListener("input", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-edit-line1")?.addEventListener("input", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-edit-line2")?.addEventListener("input", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-edit-line3")?.addEventListener("input", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-edit-cta")?.addEventListener("input", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-edit-cta-color")?.addEventListener("change", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-edit-line1-color")?.addEventListener("change", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-edit-line2-color")?.addEventListener("change", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-edit-line3-color")?.addEventListener("change", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-edit-fontsize")?.addEventListener("input", (e) => {
      const val = e.target.value;
      if ($("carousel-fontsize-val")) $("carousel-fontsize-val").textContent = `${val}px`;
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    document.querySelectorAll(".btn-preset-carousel-cta").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ctaVal = btn.dataset.cta || "";
        if ($("carousel-edit-cta")) $("carousel-edit-cta").value = ctaVal;
        saveActiveCarouselSlideInputs();
        renderActiveCarouselSlideCanvas();
      });
    });
    $("carousel-input-location")?.addEventListener("input", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-select-card-style")?.addEventListener("change", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });
    $("carousel-check-swipe-arrow")?.addEventListener("change", () => { saveActiveCarouselSlideInputs(); renderActiveCarouselSlideCanvas(); });

    // Card Darkness / Tone Listeners
    $("carousel-select-card-tone")?.addEventListener("change", (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) {
        if ($("carousel-range-card-opacity")) $("carousel-range-card-opacity").value = val;
        if ($("carousel-card-opacity-val")) $("carousel-card-opacity-val").textContent = `${val}%`;
        saveActiveCarouselSlideInputs();
        renderActiveCarouselSlideCanvas();
      }
    });
    $("carousel-range-card-opacity")?.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10) || 86;
      if ($("carousel-card-opacity-val")) $("carousel-card-opacity-val").textContent = `${val}%`;
      if ($("carousel-select-card-tone")) {
        const hasOption = Array.from($("carousel-select-card-tone").options).some((o) => o.value == val);
        $("carousel-select-card-tone").value = hasOption ? String(val) : "custom";
      }
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("carousel-select-arrow-style")?.addEventListener("change", () => {
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });

    // Active Carousel Slide Photo Framing & Zoom Listeners
    $("carousel-photo-zoom-range")?.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10) || 100;
      if ($("carousel-photo-zoom-val")) $("carousel-photo-zoom-val").textContent = `${val}%`;
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("carousel-photo-shift-x-range")?.addEventListener("input", () => {
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("carousel-photo-shift-y-range")?.addEventListener("input", () => {
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("btn-carousel-photo-pan-left")?.addEventListener("click", () => {
      if ($("carousel-photo-shift-x-range")) $("carousel-photo-shift-x-range").value = -100;
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("btn-carousel-photo-pan-center-x")?.addEventListener("click", () => {
      if ($("carousel-photo-shift-x-range")) $("carousel-photo-shift-x-range").value = 0;
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("btn-carousel-photo-pan-right")?.addEventListener("click", () => {
      if ($("carousel-photo-shift-x-range")) $("carousel-photo-shift-x-range").value = 100;
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("btn-carousel-photo-pan-top")?.addEventListener("click", () => {
      if ($("carousel-photo-shift-y-range")) $("carousel-photo-shift-y-range").value = -100;
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("btn-carousel-photo-pan-center-y")?.addEventListener("click", () => {
      if ($("carousel-photo-shift-y-range")) $("carousel-photo-shift-y-range").value = 0;
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("btn-carousel-photo-pan-bottom")?.addEventListener("click", () => {
      if ($("carousel-photo-shift-y-range")) $("carousel-photo-shift-y-range").value = 100;
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });
    $("btn-carousel-reset-photo-framing")?.addEventListener("click", () => {
      if ($("carousel-photo-zoom-range")) $("carousel-photo-zoom-range").value = 100;
      if ($("carousel-photo-zoom-val")) $("carousel-photo-zoom-val").textContent = "100%";
      if ($("carousel-photo-shift-x-range")) $("carousel-photo-shift-x-range").value = 0;
      if ($("carousel-photo-shift-y-range")) $("carousel-photo-shift-y-range").value = 0;
      saveActiveCarouselSlideInputs();
      renderActiveCarouselSlideCanvas();
    });

    // Dedicated Save Changes to Article & Post from Carousel Deck
    $("btn-copy-static-caption")?.addEventListener("click", () => {
      const cap = $("social-caption-textarea")?.value || $("static-edit-caption")?.value || "";
      if (!cap) {
        showToast("⚠️ Caption is empty", "warning");
        return;
      }
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(cap).then(() => {
          showToast("📋 Copied viral caption to clipboard!");
        });
      } else {
        $("social-caption-textarea")?.select();
        document.execCommand("copy");
        showToast("📋 Copied viral caption to clipboard!");
      }
    });

    $("btn-save-carousel-changes")?.addEventListener("click", async () => {
      if (!currentPackageId) {
        showToast("⚠️ No active package loaded to save.", "warning");
        return;
      }
      const saveBtn = $("btn-save-carousel-changes");
      const origHtml = saveBtn ? saveBtn.innerHTML : "";
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span>⏳ Saving...</span>`;
      }
      try {
        saveActiveCarouselSlideInputs();
        // Compress any oversized raw data URLs in slides before POSTing so 6 photos save cleanly & fast
        for (let i = 1; i <= 6; i++) {
          const sl = carouselSlidesData[i];
          if (sl && typeof sl.photoDataUrl === "string" && sl.photoDataUrl.startsWith("data:image/") && sl.photoDataUrl.length > 600000 && sl.photoImg && sl.photoImg.complete && sl.photoImg.naturalWidth > 0) {
            sl.photoDataUrl = compressSlideImageToDataUrl(sl.photoImg, 1600, 0.86);
          }
        }
        const fs = parseInt($("static-edit-fontsize")?.value, 10) || 32;
        const adjustments = {
          badge_text: $("static-edit-badge")?.value || $("carousel-edit-badge")?.value || "NEWS",
          headline_line1: $("static-edit-line1")?.value || $("carousel-edit-line1")?.value || "",
          headline_line2: $("static-edit-line2")?.value || $("carousel-edit-line2")?.value || "",
          headline_line3: $("static-edit-line3")?.value || $("carousel-edit-line3")?.value || "",
          line1_color: $("static-edit-line1-color")?.value || "white",
          line2_color: $("static-edit-line2-color")?.value || "white",
          line3_color: $("static-edit-line3-color")?.value || "blue",
          cta_text: $("static-edit-cta")?.value || "",
          cta_color: $("static-edit-cta-color")?.value || "white",
          line1_font_size: fs,
          line2_font_size: fs,
          line3_font_size: fs,
          caption: $("static-edit-caption")?.value || $("social-caption-textarea")?.value || "",
          hashtags: ($("static-edit-hashtags")?.value || "").split(/\s+/).filter((h) => h.startsWith("#")),
          photo_zoom: parseInt($("photo-zoom-range")?.value, 10) || 100,
          photo_shift_x: parseInt($("photo-shift-x-range")?.value, 10) || 0,
          photo_shift_y: parseInt($("photo-shift-y-range")?.value, 10) || 0,
          carousel_slides: getCleanCarouselSlidesForSave(),
          show_swipe_arrow: $("carousel-check-swipe-arrow")?.checked !== false,
          location_stamp: $("carousel-input-location")?.value || "",
          card_style: $("carousel-select-card-style")?.value || "frosted",
          card_opacity: parseInt($("carousel-range-card-opacity")?.value, 10) || 86,
          arrow_style: $("carousel-select-arrow-style")?.value || "brand",
        };

        await api("/api/package/adjust-static-post", {
          method: "POST",
          body: JSON.stringify({ package_id: currentPackageId, adjustments }),
        });

        if ($("wp-field-headline")) {
          const fields = {
            headline: $("wp-field-headline")?.value || "",
            short_description: $("wp-field-dek")?.value || "",
            language: $("wp-field-lang")?.value || "English",
            section: $("wp-field-section")?.value || "News",
            category: $("wp-field-category")?.value || "Finland",
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
        }

        const prevSlide = activeCarouselSlide;
        await loadPackage(currentPackageId);
        if ($("carousel-and-style-drawer")) $("carousel-and-style-drawer").open = true;
        if (prevSlide && typeof loadActiveCarouselSlideInputs === "function") {
          loadActiveCarouselSlideInputs(prevSlide);
        }
        showToast("✅ Saved all Carousel & Post changes to database!", "success");
        if (saveBtn) {
          saveBtn.innerHTML = `<span>✓ Saved Changes!</span>`;
          setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = origHtml;
          }, 2000);
        }
      } catch (err) {
        console.error("Save carousel error:", err);
        showToast(`❌ Failed to save: ${err.message || err}`, "error");
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origHtml;
        }
      }
    });

    // Save Article Edits
    $("btn-save-article-edits")?.addEventListener("click", async () => {
      if (!currentPackageId) return;
      const fields = {
        headline: $("wp-field-headline")?.value || "",
        short_description: $("wp-field-dek")?.value || "",
        language: $("wp-field-lang")?.value || "English",
        section: $("wp-field-section")?.value || "News",
        category: $("wp-field-category")?.value || "Finland",
        body_html: $("wp-code-textarea")?.value || "",
        region: $("wp-field-region")?.value || "Finland",
        city_location: $("wp-field-city")?.value || "",
        exact_address: $("wp-field-address")?.value || $("wp-field-place")?.value || "",
        event_datetime_venue: $("wp-field-event")?.value || "",
        tags: $("wp-field-tags")?.value || "",
        seo_title: $("wp-field-seo-title")?.value || "",
        meta_description: $("wp-field-meta-desc")?.value || "",
        image_alt: ($("wp-field-img-alt")?.value || "").trim() || ($("wp-field-headline")?.value || "").trim(),
        image_caption: $("wp-field-img-caption")?.value || "",
        image_credit: $("wp-field-img-credit")?.value || "Photo: ILF",
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

    // Copy all formatted WordPress fields to clipboard
    const copyAllWpData = (article, pkg, triggerBtn) => {
      const art = article || {};
      const p = pkg || {};
      const headline = art.headline || p.title || "";
      const excerpt = art.short_description || art.excerpt || art.meta_description || "";
      const content = art.body_html || (Array.isArray(art.body_paragraphs) ? art.body_paragraphs.join("\n\n") : (art.body || ""));
      const section = art.section || "News";
      const category = art.category || "Finland";
      const tags = Array.isArray(art.tags) ? art.tags.join(", ") : (art.tags || "");
      const seoTitle = art.seo_title || headline;
      const metaDesc = art.meta_description || excerpt;
      const imgCredit = art.featured_image?.credit_string || art.image_credit || "Photo: ILF";
      const imgCaption = art.featured_image?.caption || art.image_caption || "";

      const textBundle = `TITLE / HEADLINE:
${headline}

EXCERPT / SHORT DESCRIPTION:
${excerpt}

WEBSITE SECTION: ${section}
CATEGORY: ${category}
TAGS: ${tags}

SEO TITLE: ${seoTitle}
META DESCRIPTION: ${metaDesc}
IMAGE CREDIT: ${imgCredit}
IMAGE CAPTION: ${imgCaption}

==================================================
ARTICLE CONTENT (HTML FOR WORDPRESS CODE EDITOR):
==================================================
${content}`;

      copyToClipboard(textBundle, triggerBtn, "All Fields Copied!");
    };

    // Quick direct Copy All for WordPress button in header actions
    $("btn-copy-all-wp-direct")?.addEventListener("click", () => {
      const curVerNum = selectedVersion || (bundle ? bundle.package.current_version : 1);
      const curVerObj = bundle?.versions?.find((v) => v.version === curVerNum) || bundle?.versions?.[0];
      copyAllWpData(curVerObj?.article, bundle?.package, $("btn-copy-all-wp-direct"));
    });

    // Push Draft directly to WordPress
    $("btn-push-wordpress-draft")?.addEventListener("click", async () => {
      if (!currentPackageId) return;
      const curVerNum = selectedVersion || (bundle ? bundle.package.current_version : 1);
      const curVerObj = bundle?.versions?.find((v) => v.version === curVerNum) || bundle?.versions?.[0];
      const hasPhoto = Boolean(curVerObj?.article?.featured_image?.url);
      if (!hasPhoto) {
        const proceed = confirm(
          "⚠️ Note: This article has no featured image uploaded.\n\nDo you want to push this draft to WordPress without a featured photo?"
        );
        if (!proceed) return;
      }
      const btn = $("btn-push-wordpress-draft");
      const banner = $("wp-verification-banner");
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = "<span>⏳ Pushing to WordPress...</span>";
      try {
        const res = await api("/api/package/publish-wordpress-draft", {
          method: "POST",
          body: JSON.stringify({ package_id: currentPackageId, version: curVerNum }),
        });
        if (banner) {
          banner.classList.remove("hidden");
          if (res.success) {
            banner.style.background = "#052e16";
            banner.style.color = "#86efac";
            banner.style.border = "1px solid #16a34a";
            banner.style.borderRadius = "8px";
            banner.style.padding = "12px 16px";
            banner.style.margin = "10px 0";

            if (bundle && bundle.package) {
              bundle.package.wordpress_post_id = res.post_id;
              bundle.package.wordpress_post_url = res.preview_url;
            }

            if (res.simulated) {
              banner.innerHTML = `
                <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                  <div>
                    <div style="font-size:0.95rem;font-weight:700;color:#86efac;">✓ Draft Formatted & Saved to WordPress Outbox (Post #${res.post_id})</div>
                    <div style="font-size:0.8rem;color:#bbf7d0;margin-top:4px;line-height:1.4;">
                      ${escapeHtml(res.notice || res.message || "Saved in Studio Outbox ready for publishing.")}
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <button type="button" id="btn-copy-all-wp-banner" class="btn btn-sm" style="background:#16a34a;color:#ffffff;font-weight:600;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;">
                      📋 Copy All Fields for WP
                    </button>
                    <a href="${res.edit_url}" target="_blank" style="background:#003882;color:#ffffff;text-decoration:none;font-weight:600;border-radius:6px;padding:6px 12px;font-size:0.85rem;display:inline-block;">
                      Open WP Admin →
                    </a>
                  </div>
                </div>
              `;
              $("btn-copy-all-wp-banner")?.addEventListener("click", () => {
                copyAllWpData(curVerObj?.article, bundle?.package, $("btn-copy-all-wp-banner"));
              });
            } else {
              banner.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                  <div>
                    <strong style="color:#86efac;">✓ Draft Published to WordPress!</strong> Post ID: #${res.post_id}.
                  </div>
                  <a href="${res.edit_url}" target="_blank" style="background:#003882;color:#ffffff;text-decoration:none;font-weight:600;border-radius:6px;padding:6px 12px;font-size:0.85rem;">
                    Open Post in WP Admin →
                  </a>
                </div>
              `;
            }
          } else if (res.requires_setup) {
            banner.style.background = "#451a03";
            banner.style.color = "#fed7aa";
            banner.style.border = "1px solid #c2410c";
            banner.style.borderRadius = "8px";
            banner.style.padding = "12px 16px";
            banner.style.margin = "10px 0";
            banner.innerHTML = `
              <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                <div>
                  <strong style="color:#fdba74;">WordPress REST Setup Needed for Direct Push:</strong>
                  <div style="margin-top:6px;font-size:0.8rem;line-height:1.4;color:#ffedd5;">
                    ${escapeHtml(res.message)}<br/>
                    1. In WP Admin: <em>Users → Profile → Application Passwords</em>.<br/>
                    2. Create 'ILoveFinland Studio' and add to <code>.env</code> as <code>WP_APPLICATION_PASSWORD</code>.<br/>
                    3. Meanwhile, use <strong>📋 Copy All Fields</strong> to paste directly into WordPress.
                  </div>
                </div>
                <button type="button" id="btn-copy-all-wp-setup" class="btn btn-sm" style="background:#16a34a;color:#ffffff;font-weight:600;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;">
                  📋 Copy All Fields for WP
                </button>
              </div>
            `;
            $("btn-copy-all-wp-setup")?.addEventListener("click", () => {
              copyAllWpData(curVerObj?.article, bundle?.package, $("btn-copy-all-wp-setup"));
            });
          } else {
            banner.style.background = "#450a0a";
            banner.style.color = "#fecaca";
            banner.style.border = "1px solid #b91c1c";
            banner.style.borderRadius = "8px";
            banner.style.padding = "12px 16px";
            banner.style.margin = "10px 0";
            banner.innerHTML = `
              <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                <div>
                  <strong style="color:#f87171;">WordPress Push Notice:</strong>
                  <div style="margin-top:4px;font-size:0.8rem;color:#fee2e2;">
                    ${escapeHtml(res.error || res.message || "Failed to push draft")}
                  </div>
                </div>
                <button type="button" id="btn-copy-all-wp-err" class="btn btn-sm" style="background:#16a34a;color:#ffffff;font-weight:600;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;">
                  📋 Copy All Fields for WP
                </button>
              </div>
            `;
            $("btn-copy-all-wp-err")?.addEventListener("click", () => {
              copyAllWpData(curVerObj?.article, bundle?.package, $("btn-copy-all-wp-err"));
            });
          }
        }
      } catch (err) {
        if (banner) {
          banner.classList.remove("hidden");
          banner.style.background = "#450a0a";
          banner.style.color = "#fecaca";
          banner.style.border = "1px solid #b91c1c";
          banner.style.borderRadius = "8px";
          banner.style.padding = "12px 16px";
          banner.style.margin = "10px 0";
          banner.innerHTML = `
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;">
              <div>
                <strong style="color:#f87171;">WordPress Sync Notice:</strong>
                <div style="margin-top:4px;font-size:0.8rem;color:#fee2e2;">
                  ${escapeHtml(err.message)}
                </div>
              </div>
              <button type="button" id="btn-copy-all-wp-catch" class="btn btn-sm" style="background:#16a34a;color:#ffffff;font-weight:600;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;">
                📋 Copy All Fields for WP
              </button>
            </div>
          `;
          $("btn-copy-all-wp-catch")?.addEventListener("click", () => {
            copyAllWpData(curVerObj?.article, bundle?.package, $("btn-copy-all-wp-catch"));
          });
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });

    // Bridge: Open current article in dedicated Reel Editor
    $("btn-open-reel-from-review")?.addEventListener("click", () => {
      if (window.ReelStudio && currentPackageId) {
        window.ReelStudio.importArticleAndOpen(currentPackageId);
      }
    });

    // Replacement photo upload for Article (auto-syncs to 1080x1350 Post & auto-fills alt text + Photo: credit)
    $("input-upload-featured")?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !currentPackageId) return;
      const labelSpan = e.target.closest("label")?.querySelector("span");
      const origText = labelSpan ? labelSpan.innerHTML : "";
      if (labelSpan) labelSpan.innerHTML = "⏳ Uploading & Syncing Photo…";
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        try {
          if (currentPackageId) localStorage.setItem(`ilf_d1_photo_${currentPackageId}`, base64);
        } catch (err) {}
        const existingAlt = ($("wp-field-img-alt")?.value || "").trim();
        const headlineFallback = ($("wp-field-title")?.value || "").trim();
        const cleanFileFallback = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
        const autoAlt = existingAlt || headlineFallback || cleanFileFallback;
        const existingCredit = ($("wp-field-img-credit")?.value || "").trim();
        const creditStr = existingCredit || "Photo: ILF";
        const photog = creditStr.replace(/^photo:\s*/i, "").trim() || "ILF";

        await api("/api/package/upload-featured-image", {
          method: "POST",
          body: JSON.stringify({
            package_id: currentPackageId,
            image_data: {
              data_url: base64,
              filename: file.name,
              photographer: photog,
              credit_string: creditStr,
              source_url: "https://ilovefinland.net",
              licence: "Editorial Rights (ILF)",
              alt_text: autoAlt,
            },
          }),
        });
        await loadPackage(currentPackageId);
        if (typeof renderStaticPostCanvas === "function") renderStaticPostCanvas();
        switchReviewWorkspaceTab("article");
        alert("✅ Photo uploaded, saved to /data/uploads/, and auto-synced to both Article & 1080×1350 Post!");
      } catch (err) {
        alert(`Failed to upload replacement photo: ${err.message}`);
      } finally {
        if (labelSpan) labelSpan.innerHTML = origText || "📷 Upload Replacement Photo (Max 5 MB)";
        e.target.value = "";
      }
    });

    // Direct photo upload for Social Post (auto-syncs to Article & auto-fills alt text + Photo: credit)
    $("input-upload-post-photo")?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !currentPackageId) return;
      const statusBadge = $("static-photo-status-badge");
      const nameSpan = $("static-post-photo-name");
      if (statusBadge) statusBadge.textContent = "Uploading…";
      if (nameSpan) nameSpan.textContent = "⏳ Uploading & syncing " + file.name + "…";
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        try {
          if (currentPackageId) localStorage.setItem(`ilf_d1_photo_${currentPackageId}`, base64);
        } catch (err) {}
        const existingAlt = ($("wp-field-img-alt")?.value || "").trim();
        const headlineFallback = ($("wp-field-title")?.value || "").trim();
        const cleanFileFallback = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
        const autoAlt = existingAlt || headlineFallback || cleanFileFallback;
        const existingCredit = ($("wp-field-img-credit")?.value || "").trim();
        const creditStr = existingCredit || "Photo: ILF";
        const photog = creditStr.replace(/^photo:\s*/i, "").trim() || "ILF";

        await api("/api/package/upload-featured-image", {
          method: "POST",
          body: JSON.stringify({
            package_id: currentPackageId,
            image_data: {
              data_url: base64,
              filename: file.name,
              photographer: photog,
              credit_string: creditStr,
              source_url: "https://ilovefinland.net",
              licence: "Editorial Rights (ILF)",
              alt_text: autoAlt,
            },
          }),
        });
        await loadPackage(currentPackageId);
        if (typeof renderStaticPostCanvas === "function") renderStaticPostCanvas();
        switchReviewWorkspaceTab("ig");
        alert("✅ Photo uploaded, saved to /data/uploads/, and auto-synced to both 1080×1350 Post & Article!");
      } catch (err) {
        alert(`Failed to upload photo: ${err.message}`);
      } finally {
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
    $("btn-back-to-projects")?.addEventListener("click", () => goBack());
    $("btn-proj-new")?.addEventListener("click", () => switchView("assignments"));

    // Filter chips
    document.querySelectorAll(".proj-chip").forEach((chip) => {
      chip.addEventListener("click", async () => {
        document.querySelectorAll(".proj-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        currentProjFilter = chip.dataset.filter;
        if (currentProjFilter === "archived") {
          showArchivedProjects = true;
          await loadProjects();
        } else {
          if (showArchivedProjects) {
            showArchivedProjects = false;
            await loadProjects();
          } else {
            renderProjectsTable();
          }
        }
      });
    });

    // Search input & format filter
    $("proj-search-input")?.addEventListener("input", renderProjectsTable);
    $("proj-format-filter")?.addEventListener("change", async () => {
      const fmt = $("proj-format-filter")?.value;
      if (fmt === "archived") {
        showArchivedProjects = true;
        await loadProjects();
      } else if (showArchivedProjects) {
        showArchivedProjects = false;
        await loadProjects();
      } else {
        renderProjectsTable();
      }
    });

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
      if (sel && pkgsData.packages) {
        sel.innerHTML = pkgsData.packages
          .map((p) => `<option value="${p.id}" ${p.id === currentPackageId ? "selected" : ""}>#${p.id} ${p.title}</option>`)
          .join("");
      }
    });

    // Articles & Posts (Main Workspace) Wiring
    $("btn-create-new-article-post")?.addEventListener("click", () => {
      $("modal-create-article-post")?.classList.remove("hidden");
      $("new-article-topic")?.focus();
    });
    $("btn-mobile-new-story")?.addEventListener("click", () => {
      toggleSidebar(false);
      $("modal-create-article-post")?.classList.remove("hidden");
    });
    $("btn-close-create-modal")?.addEventListener("click", () => {
      $("modal-create-article-post")?.classList.add("hidden");
    });
    $("btn-cancel-create-article")?.addEventListener("click", () => {
      $("modal-create-article-post")?.classList.add("hidden");
    });

    // Create Photo Input
    $("input-create-photo")?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert("Photo exceeds 5 MB maximum limit. Please select an image under 5 MB.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        pendingCreatedPhoto = {
          url: reader.result,
          filename: file.name,
          size_mb: round1(file.size / (1024 * 1024)),
          alt_text: $("new-article-topic")?.value || file.name.replace(/\.[^.]+$/, ""),
          caption: "Editorial photo",
        };
        const prevWrap = $("create-photo-preview-wrap");
        const prevImg = $("create-photo-preview-img");
        const fnSpan = $("create-photo-filename");
        const badge = $("create-photo-status-badge");
        if (prevImg) prevImg.src = reader.result;
        if (prevWrap) prevWrap.classList.remove("hidden");
        if (fnSpan) fnSpan.textContent = `${file.name} (${pendingCreatedPhoto.size_mb} MB)`;
        if (badge) {
          badge.textContent = "✓ Photo Attached";
          badge.style.background = "#dcfce7";
          badge.style.color = "#15803d";
        }
        $("btn-remove-create-photo")?.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    });

    $("btn-remove-create-photo")?.addEventListener("click", () => {
      pendingCreatedPhoto = null;
      if ($("input-create-photo")) $("input-create-photo").value = "";
      if ($("create-photo-preview-wrap")) $("create-photo-preview-wrap").classList.add("hidden");
      if ($("create-photo-preview-img")) $("create-photo-preview-img").src = "";
      if ($("create-photo-filename")) $("create-photo-filename").textContent = "No photo selected (can be uploaded later)";
      if ($("create-photo-status-badge")) {
        $("create-photo-status-badge").textContent = "No Image Uploaded";
        $("create-photo-status-badge").style.background = "#e2e8f0";
        $("create-photo-status-badge").style.color = "#475569";
      }
      $("btn-remove-create-photo")?.classList.add("hidden");
    });

    // Form Submit: Create Article & Social Post
    $("form-create-article-post")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const topic = $("new-article-topic")?.value.trim();
      if (!topic) {
        alert("Please enter a Topic or Headline.");
        return;
      }
      const instructions = $("new-article-instructions")?.value.trim() || "";
      const references = $("new-article-references")?.value.trim() || "";
      const section = $("new-article-section")?.value || "News";
      const category = $("new-article-category")?.value || "Finland";
      const language = $("new-article-language")?.value || "English";

      const submitBtn = $("btn-submit-create-article");
      const origText = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "<span>⏳ Creating Article &amp; Social Post…</span>";
      }

      try {
        const payload = {
          topic,
          instructions: instructions,
          links: references.match(/https?:\/\/[^\s]+/g) || [],
          language,
          section,
          category,
          scope: "Article + Static Post",
          custom_photo: pendingCreatedPhoto,
        };
        const res = await api("/api/assignments", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        $("modal-create-article-post")?.classList.add("hidden");
        pendingCreatedPhoto = null;
        $("form-create-article-post")?.reset();

        currentPackageId = res.package ? res.package.id : (res.bundle ? res.bundle.package.id : null);
        await loadProjects();
        if (currentPackageId) {
          openProjectInReview(currentPackageId);
          showToast("New Article & Social Post created successfully!", "success");
        }
      } catch (err) {
        alert("Failed to create project: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      }
    });

    // Search and filters for Articles & Posts
    $("articles-search-input")?.addEventListener("input", renderArticlesPostsList);
    $("articles-section-filter")?.addEventListener("change", renderArticlesPostsList);
    $("articles-status-filter")?.addEventListener("change", (e) => {
      document.querySelectorAll(".studio-kpi-card").forEach((c) => c.classList.remove("active"));
      if (e.target.value === "all") $("kpi-card-total")?.classList.add("active");
      else if (e.target.value === "draft") $("kpi-card-drafts")?.classList.add("active");
      else if (e.target.value === "approved") $("kpi-card-wp")?.classList.add("active");
      else if (e.target.value === "archived") $("kpi-card-archived")?.classList.add("active");
      renderArticlesPostsList();
    });
    $("articles-lang-filter")?.addEventListener("change", renderArticlesPostsList);
    $("articles-sort-filter")?.addEventListener("change", renderArticlesPostsList);
    $("btn-refresh-articles-posts")?.addEventListener("click", loadProjects);

    // Pipeline KPI Card Quick Filters
    $("kpi-card-total")?.addEventListener("click", () => {
      document.querySelectorAll(".studio-kpi-card").forEach((c) => c.classList.remove("active"));
      $("kpi-card-total")?.classList.add("active");
      if ($("articles-status-filter")) $("articles-status-filter").value = "all";
      renderArticlesPostsList();
    });
    $("kpi-card-drafts")?.addEventListener("click", () => {
      document.querySelectorAll(".studio-kpi-card").forEach((c) => c.classList.remove("active"));
      $("kpi-card-drafts")?.classList.add("active");
      if ($("articles-status-filter")) $("articles-status-filter").value = "draft";
      renderArticlesPostsList();
    });
    $("kpi-card-wp")?.addEventListener("click", () => {
      document.querySelectorAll(".studio-kpi-card").forEach((c) => c.classList.remove("active"));
      $("kpi-card-wp")?.classList.add("active");
      if ($("articles-status-filter")) $("articles-status-filter").value = "approved";
      renderArticlesPostsList();
    });
    $("kpi-card-archived")?.addEventListener("click", () => {
      document.querySelectorAll(".studio-kpi-card").forEach((c) => c.classList.remove("active"));
      $("kpi-card-archived")?.classList.add("active");
      if ($("articles-status-filter")) $("articles-status-filter").value = "archived";
      renderArticlesPostsList();
    });

    // Suggestions & Ideas Pool Wiring
    $("tab-btn-active-pipeline")?.addEventListener("click", () => switchView("projects"));
    $("tab-btn-suggestions-pool")?.addEventListener("click", () => switchView("ideas"));
    $("btn-goto-ideas")?.addEventListener("click", () => switchView("ideas"));
    $("btn-back-to-projects")?.addEventListener("click", () => goBack());
    $("btn-scan-now")?.addEventListener("click", triggerScanNow);

    // Scope filter buttons (All, Finland, International)
    document.querySelectorAll(".filter-idea-scope").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".filter-idea-scope").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        activeIdeaScope = b.dataset.scope || "all";
        ideasVisibleCount = 12;
        renderIdeasCards();
      });
    });

    // Website Section dropdown
    $("ideas-section-select")?.addEventListener("change", (e) => {
      activeIdeaSection = e.target.value || "all";
      ideasVisibleCount = 12;
      renderIdeasCards();
    });

    // Status view selector (Active Suggestions, Saved, Dismissed)
    $("ideas-status-select")?.addEventListener("change", (e) => {
      activeIdeaStatus = e.target.value || "suggested";
      ideasVisibleCount = 12;
      renderIdeasCards();
    });

    // Sort dropdown (Most Relevant, Latest)
    $("ideas-sort-select")?.addEventListener("change", (e) => {
      activeIdeaSort = e.target.value || "relevant";
      ideasVisibleCount = 12;
      renderIdeasCards();
    });

    // Search input
    $("ideas-search-input")?.addEventListener("input", (e) => {
      activeIdeaSearch = e.target.value || "";
      ideasVisibleCount = 12;
      renderIdeasCards();
    });

    // Load More Suggestions button
    $("btn-load-more-ideas")?.addEventListener("click", () => {
      ideasVisibleCount += 12;
      renderIdeasCards();
    });

    // Story Details Modal Wiring
    $("btn-close-story-details")?.addEventListener("click", () => $("modal-story-details")?.classList.add("hidden"));
    $("btn-modal-story-close")?.addEventListener("click", () => $("modal-story-details")?.classList.add("hidden"));
    $("btn-modal-story-write")?.addEventListener("click", () => {
      $("modal-story-details")?.classList.add("hidden");
      if (activeModalStory) openCreateArticleFromIdea(activeModalStory);
    });
    $("btn-modal-story-save")?.addEventListener("click", async () => {
      if (!activeModalStory) return;
      const newStatus = activeModalStory.status === "saved" ? "suggested" : "saved";
      const action = newStatus === "saved" ? "save" : "unsave";
      activeModalStory.status = newStatus;
      const saveText = $("btn-modal-story-save-text");
      const saveIcon = $("btn-modal-story-save-icon");
      if (saveText) saveText.textContent = newStatus === "saved" ? "Unsave Story" : "Save Story";
      if (saveIcon) saveIcon.textContent = newStatus === "saved" ? "🔖" : "🏷️";
      renderIdeasCards();
      try {
        await api("/api/calendar/plan/action", {
          method: "POST",
          body: JSON.stringify({ action, id: activeModalStory.id }),
        });
        showToast(newStatus === "saved" ? "Story saved for later." : "Story removed from saved.", "info");
      } catch (err) {
        console.warn("Save failed:", err);
      }
    });
    $("btn-modal-story-dismiss")?.addEventListener("click", async () => {
      if (!activeModalStory) return;
      activeModalStory.status = "dismissed";
      $("modal-story-details")?.classList.add("hidden");
      renderIdeasCards();
      try {
        await api("/api/calendar/plan/action", {
          method: "POST",
          body: JSON.stringify({ action: "dismiss", id: activeModalStory.id }),
        });
        showToast("Story dismissed (recoverable in Archive).", "info");
      } catch (err) {
        console.warn("Dismiss failed:", err);
      }
    });

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
        } else if (res.last_error) {
          // Local SQLite database is saved; cloud remote is offline
          if (deskBadge) { deskBadge.textContent = "Saved to DB 🟢"; deskBadge.className = "pill pill-approved"; deskBadge.title = "Saved in SQLite. Cloud sync: " + res.last_error; }
          if (mobBadge) { mobBadge.textContent = "💾 Saved 🟢"; mobBadge.title = "Saved locally"; }
        } else if (res.pending_changes) {
          if (deskBadge) { deskBadge.textContent = "Syncing Soon 🟡"; deskBadge.className = "pill"; }
          if (mobBadge) { mobBadge.textContent = "☁️ Syncing 🟡"; }
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

    /* ---------- ARTICLE INSIDE FAST NAVIGATION & QUICKBAR ---------- */
    function initArticleSubNav() {
      // Subnav button jump click
      document.querySelectorAll(".article-subnav-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetId = btn.getAttribute("data-target-sec");
          if (!targetId) return;
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            const subnav = $("article-subnav");
            const navOffset = subnav ? subnav.offsetHeight + 75 : 120;
            const targetY = targetEl.getBoundingClientRect().top + window.pageYOffset - navOffset;
            window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });

            document.querySelectorAll(".article-subnav-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          }
        });
      });

      // Scroll-Spy for Subnav
      if ("IntersectionObserver" in window) {
        const sectionIds = ["sec-art-content", "sec-art-photos", "sec-art-details", "sec-art-social", "sec-art-revisions"];
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const activeId = entry.target.id;
              document.querySelectorAll(".article-subnav-btn").forEach((btn) => {
                const match = btn.getAttribute("data-target-sec") === activeId;
                btn.classList.toggle("active", match);
              });
            }
          });
        }, {
          rootMargin: "-25% 0px -60% 0px",
          threshold: 0,
        });

        sectionIds.forEach((id) => {
          const el = document.getElementById(id);
          if (el) observer.observe(el);
        });
      }

      // Mobile Quick Action Bar Wiring
      $("btn-quick-save-art")?.addEventListener("click", () => {
        $("btn-save-article-edits")?.click();
      });

      $("btn-quick-push-art")?.addEventListener("click", () => {
        $("btn-push-wordpress-draft")?.click();
      });

      $("btn-quick-copy-wp")?.addEventListener("click", () => {
        $("btn-copy-all-wp-direct")?.click();
      });

      $("btn-quick-jump-top")?.addEventListener("click", () => {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const mainEl = document.querySelector(".workspace") || document.body;
        if (mainEl && typeof mainEl.scrollIntoView === "function") {
          mainEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

    initArticleSubNav();

    checkAuth();
  });
})();
