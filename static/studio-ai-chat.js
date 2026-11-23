/* ============================================================================
   ILOVEFINLAND STUDIO — ADMIN-ONLY STUDIO AI CHAT ROOM (v82.0)
   Pure OLED ChatGPT Experience:
   • General Chat & Photo/PDF Analysis
   • News Fact-Check (Live Web Search)
   • Real Photo Search + 1-Tap "+ Article" Attach
   • AI Image Generation + 1-Tap "+ Article" Attach
   • Create Full Studio Article & Social Post Directly From Chat
   100% Private to Admin (binodoli721@gmail.com) — Never visible to Finnish Lab students.
   ============================================================================ */
(function () {
  "use strict";

  const LS_KEY = "ilf_studio_ai_chats_v1";
  const ICO = {
    sidebar: `<svg class="fl-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`,
    plus: `<svg class="fl-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    send: `<svg class="fl-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,
    sparkle: `<svg class="fl-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.91 5.81a2 2 0 0 1-1.28 1.28L3 12l5.81 1.91a2 2 0 0 1 1.28 1.28L12 21l1.91-5.81a2 2 0 0 1 1.28-1.28L21 12l-5.81-1.91a2 2 0 0 1-1.28-1.28L12 3Z"></path></svg>`,
  };

  const state = {
    chats: [],
    activeId: null,
    drawerOpen: false,
    isSending: false,
    pendingAtts: [],
    pickerOpen: false,
    pickerPhoto: null,
    pickerMode: "featured",
    pickerSearch: "",
    pickerArticles: [],
    pickerLoading: false,
    attachingId: null,
  };

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMd(md) {
    let h = esc(md || "");
    h = h.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
    h = h.replace(/^##\s+(.+)$/gm, "<h3>$1</h3>");
    h = h.replace(/^\s*[*-]\s+(.+)$/gm, "<div style='padding-left:12px;'>• $1</div>");
    h = h.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
    h = h.replace(/`([^`]+)`/g, "<code style='background:#061428;padding:1px 5px;border-radius:4px;color:#7dd3fc;'>$1</code>");
    h = h.replace(/\*/g, "");
    h = h.replace(/\n/g, "<br/>");
    return h;
  }

  function loadChats() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      state.chats = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.chats)) state.chats = [];
    } catch (_) {
      state.chats = [];
    }
    if (!state.activeId && state.chats.length) state.activeId = state.chats[0].id;
  }

  function saveChats() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state.chats.slice(0, 25)));
    } catch (_) {
      try {
        const slim = state.chats.slice(0, 12).map((c) => ({
          ...c,
          messages: (c.messages || []).map((m) => ({
            ...m,
            generated_image: m.generated_image && String(m.generated_image.url || "").startsWith("data:") ? null : m.generated_image,
          })),
        }));
        localStorage.setItem(LS_KEY, JSON.stringify(slim));
      } catch (__) {}
    }
  }

  function getActiveChat() {
    return state.chats.find((c) => c.id === state.activeId) || null;
  }

  function ensureActiveChat(firstMsg) {
    let c = getActiveChat();
    if (!c) {
      c = {
        id: "sai_" + Date.now(),
        title: (firstMsg || "New Studio Chat").slice(0, 42),
        messages: [],
      };
      state.chats.unshift(c);
      state.activeId = c.id;
    } else if (c.messages.length === 0 && firstMsg) {
      c.title = firstMsg.slice(0, 42);
    }
    return c;
  }

  function getLatestRecentMedia(chat) {
    const msgs = (chat && chat.messages) || [];
    let photos = [];
    let generated_image = null;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (!photos.length && msgs[i].photos && msgs[i].photos.length) {
        photos = msgs[i].photos;
      }
      if (!generated_image && msgs[i].generated_image) {
        generated_image = msgs[i].generated_image;
      }
      if (photos.length && generated_image) break;
    }
    return { photos, generated_image };
  }

  function readFileAsCompressedAttachment(file) {
    return new Promise((resolve) => {
      if (!file) return resolve(null);
      if (file.type === "application/pdf") {
        const r = new FileReader();
        r.onload = () => resolve({ name: file.name, mime_type: file.type, data_base64: String(r.result || "").split(",")[1] || "" });
        r.readAsDataURL(file);
        return;
      }
      if (!file.type.startsWith("image/")) return resolve(null);
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxSide = 1280;
          let w = img.width, h = img.height;
          if (w > maxSide || h > maxSide) {
            if (w >= h) { h = Math.round((h * maxSide) / w); w = maxSide; }
            else { w = Math.round((w * maxSide) / h); h = maxSide; }
          }
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          const dataUrl = c.toDataURL("image/jpeg", 0.82);
          resolve({ name: file.name, mime_type: "image/jpeg", data_base64: dataUrl.split(",")[1] || "" });
        };
        img.onerror = () => resolve(null);
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  function scrollBottom() {
    setTimeout(() => {
      const el = document.getElementById("sai-chat-stage");
      if (el) el.scrollTop = el.scrollHeight;
    }, 40);
  }

  async function openArticlePicker(photoObj) {
    state.pickerPhoto = photoObj;
    state.pickerMode = "featured";
    state.pickerSearch = "";
    state.pickerOpen = true;
    state.pickerLoading = true;
    render();
    try {
      const res = await fetch("/api/projects", { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      const list = data.projects || data.packages || [];
      state.pickerArticles = list
        .filter((p) => !p.is_archived)
        .slice(0, 40)
        .map((p) => ({ id: p.id, title: p.title || `Article #${p.id}`, status: p.status || "" }));
    } catch (_) {
      state.pickerArticles = [];
    } finally {
      state.pickerLoading = false;
      render();
    }
  }

  async function attachPhotoToArticleId(packageId, photoObj, mode) {
    if (!packageId || !photoObj) return;
    state.attachingId = packageId;
    render();
    try {
      const res = await fetch("/api/studio-ai/attach-photo", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: Number(packageId), photo: photoObj, mode: mode || "featured" }),
      });
      const data = await res.json().catch(() => ({}));
      state.pickerOpen = false;
      state.pickerPhoto = null;
      const chat = ensureActiveChat("Attach photo to article");
      if (!res.ok || !data.ok) {
        chat.messages.push({ role: "assistant", text: `⚠️ ${data.message || "Could not attach photo to article."}` });
      } else {
        const roleWord = mode === "additional" ? "Extra Photo" : "Featured Photo";
        chat.messages.push({
          role: "assistant",
          text: `Done! Added photo as **${roleWord}** for **${data.package_title}** (#${data.package_id}).`,
          article_action: { package_id: data.package_id, title: data.package_title, label: "Open Article →" },
        });
      }
      saveChats();
      render();
      scrollBottom();
    } catch (err) {
      alert("Attach error: " + (err.message || err));
    } finally {
      state.attachingId = null;
      render();
    }
  }

  async function sendStudioMessage(text) {
    const clean = (text || "").trim();
    if (!clean && state.pendingAtts.length === 0) return;
    if (state.isSending) return;

    const chat = ensureActiveChat(clean || "Attached file");
    const atts = state.pendingAtts.slice();
    state.pendingAtts = [];

    const recent_media = getLatestRecentMedia(chat);
    const active_package_id = window.getActiveStudioPackageId ? window.getActiveStudioPackageId() : null;

    chat.messages.push({
      role: "user",
      text: clean || "(Attached file)",
      attNames: atts.map((a) => a.name),
    });
    state.isSending = true;
    saveChats();
    render();
    scrollBottom();

    try {
      const history = chat.messages.slice(-12, -1).map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch("/api/studio-ai/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history,
          attachments: atts,
          recent_media,
          active_package_id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        chat.messages.push({
          role: "assistant",
          text: `⚠️ ${data.message || data.error || "Could not reach Studio AI right now."}`,
        });
      } else {
        chat.messages.push({
          role: "assistant",
          text: data.reply || "",
          photos: data.photos || [],
          generated_image: data.generated_image || null,
          sources: data.sources || [],
          article_action: data.article_action || null,
          pick_article_for_photo: data.pick_article_for_photo || null,
        });
      }
    } catch (err) {
      chat.messages.push({
        role: "assistant",
        text: `⚠️ Network error: ${err.message || "Could not connect."}`,
      });
    } finally {
      state.isSending = false;
      saveChats();
      render();
      scrollBottom();
    }
  }

  function renderMessage(m, msgIdx) {
    const photosHtml = (m.photos || []).length
      ? `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px;">
           ${m.photos
             .map(
               (p, pIdx) => `
             <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;position:relative;">
               <span style="position:absolute;top:6px;left:6px;z-index:2;background:rgba(5,8,15,0.78);color:#e2e8f0;font-size:0.66rem;font-weight:800;padding:2px 6px;border-radius:999px;border:1px solid rgba(255,255,255,0.16);">#${pIdx + 1}</span>
               <a href="${esc(p.url)}" target="_blank" rel="noopener" style="display:block;aspect-ratio:4/3;overflow:hidden;background:#020617;">
                 <img src="${esc(p.thumb || p.url)}" alt="${esc(p.title)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" />
               </a>
               <div style="padding:6px 7px;display:flex;justify-content:space-between;align-items:center;gap:4px;">
                 <button type="button" data-sai-attach-photo="${msgIdx}:${pIdx}" style="background:rgba(56,189,248,0.14);border:1px solid rgba(56,189,248,0.35);color:#7dd3fc;font-size:0.68rem;font-weight:700;padding:3px 7px;border-radius:7px;cursor:pointer;white-space:nowrap;">+ Article</button>
                 <a href="${esc(p.url)}" download target="_blank" rel="noopener" style="font-size:0.68rem;color:#94a3b8;font-weight:600;text-decoration:none;white-space:nowrap;">Open ↗</a>
               </div>
             </div>`
             )
             .join("")}
         </div>`
      : "";

    const genHtml = m.generated_image
      ? `<div style="margin-top:10px;max-width:340px;background:#0f172a;border:1px solid rgba(56,189,248,0.3);border-radius:14px;overflow:hidden;">
           <img src="${esc(m.generated_image.url)}" alt="${esc(m.generated_image.prompt)}" style="width:100%;display:block;" />
           <div style="padding:8px 10px;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
             <span style="font-size:0.7rem;color:#94a3b8;">${esc(m.generated_image.provider || "AI Image")}</span>
             <div style="display:flex;gap:6px;align-items:center;">
               <button type="button" data-sai-attach-gen="${msgIdx}" class="fl-btn primary sm" style="padding:4px 9px;font-size:0.72rem;">+ Article</button>
               <a href="${esc(m.generated_image.url)}" download="ilovefinland-ai-image.png" target="_blank" rel="noopener" class="fl-btn sm" style="text-decoration:none;padding:4px 9px;font-size:0.72rem;">Download ↓</a>
             </div>
           </div>
         </div>`
      : "";

    const actionHtml = m.article_action && m.article_action.package_id
      ? `<div style="margin-top:10px;">
           <button type="button" data-sai-open-article="${m.article_action.package_id}" class="fl-btn primary sm" style="padding:7px 14px;font-size:0.78rem;border-radius:999px;">
             ${esc(m.article_action.label || "Open Article →")}
           </button>
         </div>`
      : "";

    const pickChoicesHtml = m.pick_article_for_photo && (m.pick_article_for_photo.articles || []).length
      ? `<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">
           ${m.pick_article_for_photo.articles
             .map(
               (a) => `
             <button type="button" data-sai-quick-attach="${msgIdx}:${a.id}" style="text-align:left;padding:8px 11px;border-radius:10px;background:#111827;border:1px solid rgba(56,189,248,0.28);color:#e2e8f0;font-size:0.78rem;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;">
               <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">#${a.id} ${esc(a.title)}</span>
               <span style="color:#38bdf8;font-size:0.7rem;flex-shrink:0;">Set Photo →</span>
             </button>`
             )
             .join("")}
         </div>`
      : "";

    const srcHtml = (m.sources || []).length
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">
           ${m.sources
             .map(
               (s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener" style="font-size:0.72rem;color:#7dd3fc;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);padding:3px 9px;border-radius:999px;text-decoration:none;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🔗 ${esc(s.title)}</a>`
             )
             .join("")}
         </div>`
      : "";

    return `
      <div class="fl-msg ${m.role === "user" ? "user" : "assistant"}">
        ${m.attNames && m.attNames.length ? `<div style="font-size:0.72rem;opacity:0.85;margin-bottom:4px;">📎 ${esc(m.attNames.join(", "))}</div>` : ""}
        <div>${renderMd(m.text)}</div>
        ${photosHtml}
        ${genHtml}
        ${actionHtml}
        ${pickChoicesHtml}
        ${srcHtml}
      </div>
    `;
  }

  function render() {
    const root = document.getElementById("studio-ai-root");
    if (!root) return;
    const chat = getActiveChat();
    const msgs = chat ? chat.messages || [] : [];

    const filteredArticles = state.pickerArticles.filter((a) => {
      const q = (state.pickerSearch || "").trim().toLowerCase();
      if (!q) return true;
      return String(a.id).includes(q) || (a.title || "").toLowerCase().includes(q);
    });

    root.innerHTML = `
      <div class="fl-app">
        <header class="fl-header">
          <button type="button" class="fl-icon-circle" id="sai-open-drawer" title="Saved Studio Chats">${ICO.sidebar}</button>
          <div style="display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:0.96rem;color:#fff;">
            ${ICO.sparkle}<span>Studio AI</span>
          </div>
          <button type="button" class="fl-new-chat-pill" id="sai-new-chat">+ New</button>
        </header>

        <div class="fl-chat-stage" id="sai-chat-stage" style="padding-bottom:68px;">
          ${
            msgs.length
              ? msgs.map((m, i) => renderMessage(m, i)).join("")
              : `<div class="fl-empty-hero">
                   <div style="width:54px;height:54px;border-radius:16px;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(14,165,233,0.28);margin-bottom:4px;">
                     <img src="/assets/ilf-heart.png" alt="ILoveFinland" width="36" height="36" style="width:36px;height:36px;object-fit:contain;" />
                   </div>
                   <h1 class="fl-empty-title">ILoveFinland Studio AI</h1>
                   <p class="fl-empty-sub">Fact-check news, find real photos, create AI images, attach photos to any article, or create a full article right from chat.</p>
                   <div class="fl-starter-row">
                     <button type="button" class="fl-starter-pill" data-sai-starter="Check latest Finland news today — what is trending right now?">Fact-check news</button>
                     <button type="button" class="fl-starter-pill" data-sai-starter="Find me pictures related to Helsinki winter snow sunset">Find real photos</button>
                     <button type="button" class="fl-starter-pill" data-sai-starter="Create an AI picture for snowy Helsinki tram at golden hour">Create AI image</button>
                     <button type="button" class="fl-starter-pill" data-sai-starter="Make an article for this title: Why Helsinki Winters Feel Magical">Make an article</button>
                   </div>
                 </div>`
          }
          ${state.isSending ? `<div class="fl-msg assistant" style="color:#94a3b8;">⏳ Working on it...</div>` : ""}
        </div>

        <div class="fl-dock">
          <div class="fl-capsule">
            ${
              state.pendingAtts.length
                ? `<div class="fl-att-row" style="margin-bottom:6px;">
                     ${state.pendingAtts.map((a, i) => `<span class="fl-att-chip">📎 ${esc(a.name.slice(0, 18))} <button type="button" class="fl-mini-btn" style="padding:0 4px;" data-sai-rm-att="${i}">✕</button></span>`).join("")}
                   </div>`
                : ""
            }
            <textarea id="sai-input" class="fl-capsule-input" rows="1" placeholder="Ask anything, find photos, or make an article..."></textarea>
            <div class="fl-capsule-bar">
              <div class="fl-capsule-left">
                <label class="fl-cap-btn" title="Attach Photo or PDF" style="padding:0;width:36px;cursor:pointer;">
                  ${ICO.plus}
                  <input type="file" id="sai-file-input" accept="image/*,application/pdf" style="display:none;" />
                </label>
              </div>
              <div class="fl-capsule-right">
                <button type="button" class="fl-send-circle" id="sai-send-btn" ${state.isSending ? "disabled" : ""} title="Send">${ICO.send}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${
        state.drawerOpen
          ? `<div class="fl-drawer-backdrop" id="sai-drawer-backdrop">
               <div class="fl-drawer-sheet">
                 <div style="display:flex;justify-content:space-between;align-items:center;">
                   <strong style="color:#fff;font-size:0.96rem;">Studio AI Chats</strong>
                   <button type="button" class="fl-btn sm" id="sai-close-drawer">✕</button>
                 </div>
                 <button type="button" class="fl-btn primary sm" id="sai-drawer-new" style="width:100%;">+ New Chat</button>
                 <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
                   ${
                     state.chats.length
                       ? state.chats
                           .map(
                             (c) => `
                           <div class="fl-vocab-row" style="cursor:pointer;${c.id === state.activeId ? "border-color:#38bdf8;" : ""}" data-sai-sel="${c.id}">
                             <span style="font-size:0.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.title)}</span>
                             <button type="button" class="fl-mini-btn" data-sai-del="${c.id}" style="color:#fca5a5;">✕</button>
                           </div>`
                           )
                           .join("")
                       : `<div style="font-size:0.8rem;color:#94a3b8;">No saved Studio AI chats yet.</div>`
                   }
                 </div>
               </div>
             </div>`
          : ""
      }

      ${
        state.pickerOpen
          ? `<div class="fl-drawer-backdrop" id="sai-picker-backdrop" style="justify-content:center;align-items:flex-end;">
               <div style="width:100%;max-width:460px;max-height:78dvh;background:#0b1120;border:1px solid rgba(255,255,255,0.12);border-radius:18px 18px 0 0;padding:16px;display:flex;flex-direction:column;gap:10px;overflow:hidden;">
                 <div style="display:flex;justify-content:space-between;align-items:center;">
                   <strong style="color:#fff;font-size:0.95rem;">Add Photo to Article</strong>
                   <button type="button" class="fl-btn sm" id="sai-close-picker">✕</button>
                 </div>
                 <div style="display:flex;gap:6px;">
                   <button type="button" class="fl-btn sm ${state.pickerMode === "featured" ? "primary" : ""}" id="sai-mode-featured" style="flex:1;">Featured Photo</button>
                   <button type="button" class="fl-btn sm ${state.pickerMode === "additional" ? "primary" : ""}" id="sai-mode-additional" style="flex:1;">Extra Photo</button>
                 </div>
                 <input type="text" id="sai-picker-search" value="${esc(state.pickerSearch)}" placeholder="Search article title or #ID..." style="width:100%;padding:9px 12px;border-radius:10px;background:#141923;border:1px solid rgba(255,255,255,0.12);color:#fff;font-size:0.84rem;box-sizing:border-box;" />
                 <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
                   ${
                     state.pickerLoading
                       ? `<div style="color:#94a3b8;font-size:0.82rem;padding:12px 0;text-align:center;">Loading your articles...</div>`
                       : filteredArticles.length
                         ? filteredArticles
                             .map(
                               (a) => `
                             <button type="button" data-sai-pick-pkg="${a.id}" ${state.attachingId ? "disabled" : ""} style="text-align:left;padding:10px 12px;border-radius:10px;background:#141923;border:1px solid rgba(255,255,255,0.08);color:#f1f5f9;font-size:0.82rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;">
                               <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong>#${a.id}</strong> ${esc(a.title)}</span>
                               <span style="color:#38bdf8;font-size:0.72rem;font-weight:700;flex-shrink:0;">${state.attachingId === a.id ? "Saving..." : "Use →"}</span>
                             </button>`
                             )
                             .join("")
                         : `<div style="color:#94a3b8;font-size:0.82rem;padding:12px 0;text-align:center;">No matching articles found.</div>`
                   }
                 </div>
               </div>
             </div>`
          : ""
      }
    `;

    bindEvents(root);
  }

  function bindEvents(root) {
    const startNew = () => {
      const c = { id: "sai_" + Date.now(), title: "New Studio Chat", messages: [] };
      state.chats.unshift(c);
      state.activeId = c.id;
      state.drawerOpen = false;
      saveChats();
      render();
    };
    root.querySelector("#sai-new-chat")?.addEventListener("click", startNew);
    root.querySelector("#sai-drawer-new")?.addEventListener("click", startNew);
    root.querySelector("#sai-open-drawer")?.addEventListener("click", () => { state.drawerOpen = true; render(); });
    root.querySelector("#sai-close-drawer")?.addEventListener("click", () => { state.drawerOpen = false; render(); });
    root.querySelector("#sai-drawer-backdrop")?.addEventListener("click", (e) => { if (e.target.id === "sai-drawer-backdrop") { state.drawerOpen = false; render(); } });

    // Article picker modal events
    root.querySelector("#sai-close-picker")?.addEventListener("click", () => { state.pickerOpen = false; render(); });
    root.querySelector("#sai-picker-backdrop")?.addEventListener("click", (e) => { if (e.target.id === "sai-picker-backdrop") { state.pickerOpen = false; render(); } });
    root.querySelector("#sai-mode-featured")?.addEventListener("click", () => { state.pickerMode = "featured"; render(); });
    root.querySelector("#sai-mode-additional")?.addEventListener("click", () => { state.pickerMode = "additional"; render(); });
    root.querySelector("#sai-picker-search")?.addEventListener("input", (e) => { state.pickerSearch = e.target.value; render(); root.querySelector("#sai-picker-search")?.focus(); });
    root.querySelectorAll("[data-sai-pick-pkg]").forEach((b) => {
      b.onclick = () => attachPhotoToArticleId(Number(b.getAttribute("data-sai-pick-pkg")), state.pickerPhoto, state.pickerMode);
    });

    // 1-tap "+ Article" buttons on real photos & AI images
    const chat = getActiveChat();
    root.querySelectorAll("[data-sai-attach-photo]").forEach((b) => {
      b.onclick = () => {
        const [mi, pi] = String(b.getAttribute("data-sai-attach-photo") || "").split(":").map(Number);
        const photo = chat?.messages?.[mi]?.photos?.[pi];
        if (photo) openArticlePicker(photo);
      };
    });
    root.querySelectorAll("[data-sai-attach-gen]").forEach((b) => {
      b.onclick = () => {
        const mi = Number(b.getAttribute("data-sai-attach-gen"));
        const gen = chat?.messages?.[mi]?.generated_image;
        if (gen) openArticlePicker(gen);
      };
    });

    // Inline quick-attach choices from natural-language chat
    root.querySelectorAll("[data-sai-quick-attach]").forEach((b) => {
      b.onclick = () => {
        const [mi, pkgId] = String(b.getAttribute("data-sai-quick-attach") || "").split(":").map(Number);
        const info = chat?.messages?.[mi]?.pick_article_for_photo;
        if (info && info.photo && pkgId) {
          attachPhotoToArticleId(pkgId, info.photo, info.mode || "featured");
        }
      };
    });

    // 1-tap "Open Article →" button
    root.querySelectorAll("[data-sai-open-article]").forEach((b) => {
      b.onclick = () => {
        const pkgId = Number(b.getAttribute("data-sai-open-article"));
        if (pkgId && window.openStudioArticleById) {
          window.openStudioArticleById(pkgId);
        }
      };
    });

    root.querySelectorAll("[data-sai-sel]").forEach((el) => {
      el.onclick = (e) => { if (e.target.closest("button")) return; state.activeId = el.getAttribute("data-sai-sel"); state.drawerOpen = false; render(); scrollBottom(); };
    });
    root.querySelectorAll("[data-sai-del]").forEach((b) => {
      b.onclick = () => {
        const id = b.getAttribute("data-sai-del");
        state.chats = state.chats.filter((x) => x.id !== id);
        if (state.activeId === id) state.activeId = state.chats[0]?.id || null;
        saveChats();
        render();
      };
    });

    root.querySelector("#sai-file-input")?.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (f) {
        const att = await readFileAsCompressedAttachment(f);
        if (att) state.pendingAtts.push(att);
      }
      e.target.value = "";
      render();
    });
    root.querySelectorAll("[data-sai-rm-att]").forEach((b) => {
      b.onclick = () => { state.pendingAtts.splice(Number(b.getAttribute("data-sai-rm-att")), 1); render(); };
    });

    const inp = root.querySelector("#sai-input");
    const autoResize = () => {
      if (!inp) return;
      inp.style.height = "auto";
      const mh = 160;
      inp.style.height = Math.min(inp.scrollHeight, mh) + "px";
      inp.style.overflowY = inp.scrollHeight > mh ? "auto" : "hidden";
    };
    const doSend = () => {
      if (!inp) return;
      const v = inp.value.trim();
      inp.value = "";
      autoResize();
      sendStudioMessage(v);
    };
    if (inp) {
      autoResize();
      inp.addEventListener("input", autoResize);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } });
    }
    root.querySelector("#sai-send-btn")?.addEventListener("click", doSend);
    root.querySelectorAll("[data-sai-starter]").forEach((b) => {
      b.onclick = () => sendStudioMessage(b.getAttribute("data-sai-starter"));
    });
  }

  function init() {
    loadChats();
    render();
  }

  window.StudioAIChat = { init, render };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
