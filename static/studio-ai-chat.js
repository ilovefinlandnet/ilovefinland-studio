/* ============================================================================
   ILOVEFINLAND STUDIO — ADMIN-ONLY STUDIO AI CHAT ROOM (v81.0)
   Pure OLED ChatGPT Experience: General Chat • News Fact-Check • Real Photo Search • AI Image Gen
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
      // Keep last 25 chats, compact inline images safely
      localStorage.setItem(LS_KEY, JSON.stringify(state.chats.slice(0, 25)));
    } catch (_) {}
  }

  function getActiveChat() {
    return state.chats.find((c) => c.id === state.activeId) || null;
  }

  function ensureChat(title) {
    let c = getActiveChat();
    if (!c) {
      c = { id: "sai_" + Date.now(), title: title || "Studio AI Chat", messages: [] };
      state.chats.unshift(c);
      state.activeId = c.id;
      saveChats();
    }
    return c;
  }

  function scrollBottom() {
    setTimeout(() => {
      const st = document.getElementById("sai-chat-stage");
      if (st) st.scrollTo({ top: st.scrollHeight, behavior: "smooth" });
    }, 45);
  }

  function readFileAsCompressedAttachment(file) {
    return new Promise((resolve) => {
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || "");
        const mime = file.type || "image/jpeg";
        if (!mime.startsWith("image/")) {
          resolve({ name: file.name || "file", mime_type: mime, data_base64: res.includes(",") ? res.split(",")[1] : res, previewUrl: null });
          return;
        }
        const img = new Image();
        img.onload = () => {
          let w = img.width || 1, h = img.height || 1;
          if (w > 1280 || h > 1280) {
            const sc = 1280 / Math.max(w, h);
            w = Math.round(w * sc);
            h = Math.round(h * sc);
          }
          const cv = document.createElement("canvas");
          cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          const comp = cv.toDataURL("image/jpeg", 0.78);
          resolve({ name: file.name || "photo.jpg", mime_type: "image/jpeg", data_base64: comp.split(",")[1], previewUrl: comp });
        };
        img.onerror = () => resolve({ name: file.name || "photo", mime_type: mime, data_base64: res.split(",")[1] || "", previewUrl: res });
        img.src = res;
      };
      reader.readAsDataURL(file);
    });
  }

  async function sendStudioMessage(text, forcedAction) {
    if (state.isSending) return;
    const msg = (text || "").trim();
    const atts = state.pendingAtts.slice();
    if (!msg && !atts.length) return;

    const chat = ensureChat(msg ? msg.slice(0, 42) : "Media Query");
    const history = (chat.messages || []).slice(-10).map((m) => ({ role: m.role, text: m.text || "" }));

    chat.messages.push({
      id: "m_" + Date.now(),
      role: "user",
      text: msg || "📷 Attached file",
      attNames: atts.map((a) => a.name),
    });
    if (chat.messages.length === 1 && msg) chat.title = msg.slice(0, 42);
    state.pendingAtts = [];
    state.isSending = true;
    saveChats();
    render();
    scrollBottom();

    try {
      const res = await fetch("/api/studio-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          action: forcedAction || "",
          history,
          attachments: atts.map((a) => ({ mime_type: a.mime_type, data_base64: a.data_base64 })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);

      chat.messages.push({
        id: "m_" + Date.now(),
        role: "assistant",
        text: data.reply || "",
        photos: data.photos || [],
        generated_image: data.generated_image || null,
        sources: data.sources || [],
      });
      saveChats();
    } catch (err) {
      chat.messages.push({
        id: "m_" + Date.now(),
        role: "assistant",
        text: `⚠️ ${err.message || "Request failed."}`,
      });
      saveChats();
    } finally {
      state.isSending = false;
      render();
      scrollBottom();
    }
  }

  function renderMessage(m) {
    const photosHtml = (m.photos || []).length
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:8px;margin-top:10px;">
           ${m.photos
             .map(
               (p) => `
             <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;">
               <a href="${esc(p.url)}" target="_blank" rel="noopener" style="display:block;aspect-ratio:4/3;overflow:hidden;background:#020617;">
                 <img src="${esc(p.thumb || p.url)}" alt="${esc(p.title)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" />
               </a>
               <div style="padding:6px 8px;display:flex;justify-content:space-between;align-items:center;gap:4px;">
                 <span style="font-size:0.68rem;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.source)}</span>
                 <a href="${esc(p.url)}" download target="_blank" rel="noopener" style="font-size:0.7rem;color:#38bdf8;font-weight:700;text-decoration:none;">Open ↗</a>
               </div>
             </div>`
             )
             .join("")}
         </div>`
      : "";

    const genHtml = m.generated_image
      ? `<div style="margin-top:10px;max-width:340px;background:#0f172a;border:1px solid rgba(56,189,248,0.3);border-radius:14px;overflow:hidden;">
           <img src="${esc(m.generated_image.url)}" alt="${esc(m.generated_image.prompt)}" style="width:100%;display:block;" />
           <div style="padding:8px 10px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
             <span style="font-size:0.72rem;color:#94a3b8;">${esc(m.generated_image.provider || "AI Image")}</span>
             <a href="${esc(m.generated_image.url)}" download="ilovefinland-ai-image.png" target="_blank" rel="noopener" class="fl-btn primary sm" style="text-decoration:none;">Download ↓</a>
           </div>
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
        ${srcHtml}
      </div>
    `;
  }

  function render() {
    const root = document.getElementById("studio-ai-root");
    if (!root) return;
    const chat = getActiveChat();
    const msgs = chat ? chat.messages || [] : [];

    root.innerHTML = `
      <div class="fl-app">
        <header class="fl-header">
          <button type="button" class="fl-icon-circle" id="sai-open-drawer" title="Saved Studio Chats">${ICO.sidebar}</button>
          <div style="display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:0.96rem;color:#fff;">
            ${ICO.sparkle}<span>Studio AI</span>
          </div>
          <button type="button" class="fl-new-chat-pill" id="sai-new-chat">+ New</button>
        </header>

        <div class="fl-chat-stage" id="sai-chat-stage">
          ${
            msgs.length
              ? msgs.map(renderMessage).join("")
              : `<div class="fl-empty-hero">
                   <div style="width:54px;height:54px;border-radius:16px;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(14,165,233,0.28);margin-bottom:4px;">
                     <img src="/assets/ilf-heart.png" alt="ILoveFinland" width="36" height="36" style="width:36px;height:36px;object-fit:contain;" />
                   </div>
                   <h1 class="fl-empty-title">ILoveFinland Studio AI</h1>
                   <p class="fl-empty-sub">Your private Admin AI room — fact-check Finland news, find real stock photos, create AI images, or chat about anything.</p>
                   <div class="fl-starter-row">
                     <button type="button" class="fl-starter-pill" data-sai-starter="Check latest Finland news today — what is trending right now?">Fact-check news</button>
                     <button type="button" class="fl-starter-pill" data-sai-starter="Find me pictures related to Helsinki winter snow sunset">Find real photos</button>
                     <button type="button" class="fl-starter-pill" data-sai-starter="Create an AI picture for snowy Helsinki tram at golden hour">Create AI image</button>
                     <button type="button" class="fl-starter-pill" data-sai-starter="Write 3 viral Instagram Reel hooks about living in Finland">IG Reel hooks</button>
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
            <textarea id="sai-input" class="fl-capsule-input" rows="1" placeholder="Ask anything, check news, find photos, or create AI image..."></textarea>
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
