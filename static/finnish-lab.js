/* ============================================================================
   FINNISH LEARNING LAB — SIMPLE STUDENT-FIRST EDITION (v56.0)
   3 Simple Tabs: 🎙️ In Class  •  🏠 Study at Home  •  📓 My Notebook
   100% Real Gemini AI + Isolated IndexedDB (finnish_lab_db) + Side Panel
   ============================================================================ */
(function () {
  "use strict";

  const DB = window.FinnishLabDB;
  const CURR = window.FinnishLabCurriculum;

  const state = {
    activeTab: "class", // class | home | notebook
    studyTool: null, // null (4-card menu) | homework | lesson | practice | lookup
    lessonStep: 1, // 1: 5 Words | 2: 1 Simple Rule | 3: Quick Quiz
    practiceSkill: "reading", // reading | writing | listening | speaking
    notebookSection: "flashcards", // flashcards | notes
    settingsOpen: false,
    chatsOpen: false,
    focusMode: false,
    sidePanelOpen: false,
    status: null,
    conversations: [],
    activeConvId: null,
    pendingAttachments: [], // { id, name, mime_type, data_base64, previewUrl }
    hwAttachments: [],
    isRecording: false,
    recordingTarget: null, // 'class' | 'side'
    mediaRecorder: null,
    mediaChunks: [],
    recordStartMs: 0,
    recordTimer: null,
    recordedAudio: null, // { blobUrl, mime_type, data_base64, durationSec }
    isSending: false,
    selectedGrammarId: "olla",
    currentReading: null,
    currentListening: null,
    listeningShowTranscript: false,
    listeningShowEn: false,
    flashcards: [],
    flashcardFlipped: false,
    notes: [],
    cropTarget: null,
  };

  /* ---------- HELPERS ---------- */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMarkdownLite(md) {
    let h = esc(md || "");
    h = h.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    h = h.replace(/^## (.+)$/gm, "<h3>$1</h3>");
    h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/\*(.+?)\*/g, "<em>$1</em>");
    h = h.replace(/`([^`]+)`/g, "<code style='background:#061428;padding:1px 5px;border-radius:4px;color:#7dd3fc;'>$1</code>");
    h = h.replace(/^- (.+)$/gm, "<div style='padding-left:12px;'>• $1</div>");
    h = h.replace(/\n/g, "<br/>");
    return h;
  }

  function toast(msg, type) {
    if (typeof window.showToast === "function") {
      window.showToast(msg, type || "info");
      return;
    }
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText =
      "position:fixed;top:64px;right:16px;z-index:2000;background:#082347;color:#fff;border:1px solid #38bdf8;padding:10px 14px;border-radius:10px;font-size:0.84rem;box-shadow:0 8px 24px rgba(0,0,0,0.5);";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- FINNISH SPEECH (NORMAL & SLOW) ---------- */
  function speakFinnish(text, slow) {
    if (!text) return;
    if (!("speechSynthesis" in window)) {
      toast("Audio playback is not supported in this browser.", "warning");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const settings = DB.getSettings();
      utter.lang = "fi-FI";
      utter.rate = slow ? (settings.speechRateSlow || 0.65) : (settings.speechRateNormal || 0.95);
      const voices = window.speechSynthesis.getVoices() || [];
      const fiVoice = voices.find((v) => (v.lang || "").toLowerCase().startsWith("fi"));
      if (fiVoice) utter.voice = fiVoice;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      toast("Could not play audio: " + e.message, "error");
    }
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  /* ---------- SECURE API CLIENT (35s TIMEOUT GUARD) ---------- */
  async function flApi(path, opts) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 35000) : null;
    try {
      const res = await fetch(
        path,
        Object.assign({ credentials: "same-origin", signal: controller ? controller.signal : undefined }, opts || {})
      );
      const data = await res.json().catch(() => ({ error: "BAD_RESPONSE", message: "Unexpected server response." }));
      if (!res.ok) {
        const err = new Error(data.message || data.error || `HTTP ${res.status}`);
        err.code = data.error || `HTTP_${res.status}`;
        throw err;
      }
      if (data.usage && state.status) state.status.usage = data.usage;
      return data;
    } catch (e) {
      if (e && e.name === "AbortError") {
        const err = new Error("Request timed out after 35s. Please try again — your data is safe.");
        err.code = "API_TIMEOUT";
        throw err;
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function refreshStatus() {
    try {
      state.status = await flApi("/api/finnish-lab/status");
    } catch (_) {
      state.status = { ok: false, usage: { used: 0, limit: 60, remaining: 60 } };
    }
  }

  /* ---------- RECORDING (EXPLICIT USER CONTROL) ---------- */
  async function startRecording(target) {
    if (state.isRecording) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Microphone not supported in this browser. You can type or attach an audio file instead.", "warning");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType });
      state.mediaRecorder = rec;
      state.mediaChunks = [];
      state.isRecording = true;
      state.recordingTarget = target;
      state.recordStartMs = Date.now();

      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) state.mediaChunks.push(ev.data);
      };

      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(state.recordTimer);
        state.isRecording = false;
        const durationSec = Math.max(1, Math.round((Date.now() - state.recordStartMs) / 1000));
        const cleanMime = (rec.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(state.mediaChunks, { type: cleanMime });
        const b64 = await blobToBase64(blob);
        const blobUrl = URL.createObjectURL(blob);

        if (state.recordingTarget === "class") {
          state.recordedAudio = { blobUrl, mime_type: cleanMime, data_base64: b64, durationSec };
        } else {
          state.pendingAttachments.push({
            id: DB.uid("aud"),
            name: `Voice (${durationSec}s)`,
            mime_type: cleanMime,
            data_base64: b64,
            previewUrl: blobUrl,
          });
        }
        state.recordingTarget = null;
        renderActiveView();
        renderSidePanel();
      };

      rec.start();
      state.recordTimer = setInterval(() => {
        const sec = Math.floor((Date.now() - state.recordStartMs) / 1000);
        const mm = String(Math.floor(sec / 60)).padStart(2, "0");
        const ss = String(sec % 60).padStart(2, "0");
        document.querySelectorAll(".fl-rec-timer").forEach((el) => {
          el.textContent = `${mm}:${ss}`;
        });
      }, 400);

      renderActiveView();
      renderSidePanel();
    } catch (_) {
      toast("Microphone permission denied. Please allow microphone access or type your question.", "error");
    }
  }

  function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
      try { state.mediaRecorder.stop(); } catch (_) {}
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || "");
        resolve(res.includes(",") ? res.split(",")[1] : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function fileToAttachment(file) {
    if (!file) return null;
    if (file.size > 18 * 1024 * 1024) {
      toast("File is over 18 MB limit. Please pick a smaller image or PDF.", "error");
      return null;
    }
    const b64 = await blobToBase64(file);
    const mime = file.type || "image/jpeg";
    const previewUrl = mime.startsWith("image/") ? `data:${mime};base64,${b64}` : null;
    return { id: DB.uid("att"), name: file.name || "photo", mime_type: mime, data_base64: b64, previewUrl };
  }

  function startVoiceDictation(targetInputId, onFinal) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast("Voice typing is not supported in this browser — tap 🎙️ Record Teacher instead!", "info");
      return;
    }
    try {
      const rec = new SR();
      rec.lang = DB.getSettings().voiceLang || "fi-FI";
      rec.interimResults = false;
      toast(`Listening (${rec.lang})... Speak now`, "info");
      rec.onresult = (ev) => {
        const transcript = ev.results[0][0].transcript;
        const inp = document.getElementById(targetInputId);
        if (inp) {
          inp.value = (inp.value ? inp.value + " " : "") + transcript;
          inp.focus();
        }
        if (typeof onFinal === "function") onFinal(transcript);
      };
      rec.onerror = () => toast("Could not hear voice clearly — try again or type.", "warning");
      rec.start();
    } catch (_) {
      toast("Could not start voice input.", "warning");
    }
  }

  /* ---------- DATA & CONVERSATION ENGINE ---------- */
  async function loadAllData() {
    const [convs, cards, notes] = await Promise.all([
      DB.listConversations(),
      DB.listFlashcards(),
      DB.listNotes(),
    ]);
    state.conversations = convs;
    state.flashcards = cards;
    state.notes = notes;
    if (!state.activeConvId && convs.length > 0) state.activeConvId = convs[0].id;
    if (!state.currentReading) state.currentReading = CURR.SAMPLE_READINGS[0];
    if (!state.currentListening) state.currentListening = CURR.SAMPLE_LISTENING[0];
  }

  function getActiveConv() {
    return state.conversations.find((c) => c.id === state.activeConvId) || null;
  }

  async function ensureActiveConv(title) {
    let conv = getActiveConv();
    if (!conv) {
      conv = await DB.saveConversation({ title: title || "Finnish Class", kind: "class", messages: [] });
      state.conversations.unshift(conv);
      state.activeConvId = conv.id;
    }
    return conv;
  }

  async function sendMessage(text, opts) {
    if (state.isSending) return;
    const options = opts || {};
    const msgText = (text || "").trim();

    // Gather attachments: recorded teacher audio + any attached photos/PDFs
    const atts = options.attachments ? options.attachments.slice() : state.pendingAttachments.slice();
    if (!options.attachments && state.recordedAudio) {
      atts.unshift({
        id: DB.uid("aud"),
        name: `Teacher Recording (${state.recordedAudio.durationSec}s)`,
        mime_type: state.recordedAudio.mime_type,
        data_base64: state.recordedAudio.data_base64,
      });
    }

    if (!msgText && atts.length === 0) {
      toast("Tap 🎙️ Record Teacher, 📷 Photo, or type a question first.", "warning");
      return;
    }

    const hasAudio = atts.some((a) => (a.mime_type || "").startsWith("audio/"));
    const hasImage = atts.some((a) => (a.mime_type || "").startsWith("image/") || a.mime_type === "application/pdf");

    // Smart default mode: no confusing switches required!
    let mode = options.mode;
    if (!mode) {
      if (hasAudio && hasImage) mode = "teacher_recording";
      else if (hasAudio) mode = "teacher_recording";
      else mode = "quick_answer";
    }

    const autoPrompt =
      msgText ||
      (hasAudio && hasImage
        ? "Listen to the teacher's recording AND look at the attached classroom photo. Answer the teacher's question using the picture, with simple Finnish and English."
        : hasAudio
        ? "Transcribe what my teacher said in Finnish, translate to English, explain simply, and suggest a short A1 Finnish answer."
        : "Translate and explain this photo/worksheet in simple Finnish and English.");

    const conv = await ensureActiveConv(msgText ? msgText.slice(0, 40) : hasAudio ? "Teacher Recording" : "Classroom Photo");
    const settings = DB.getSettings();

    const history = (conv.messages || []).slice(-10).map((m) => ({
      role: m.role,
      text: m.text,
      attachments: (m.attachments || []).slice(0, 2).map((a) => ({ mime_type: a.mime_type, data_base64: a.data_base64 })),
    }));

    conv.messages.push({
      id: DB.uid("msg"),
      role: "user",
      text: msgText || (hasAudio && hasImage ? "🎙️ Teacher audio + 📷 Classroom photo" : hasAudio ? "🎙️ Teacher recording" : "📷 Classroom photo"),
      attachments: atts,
      at: new Date().toISOString(),
    });
    if (conv.messages.length === 1 && msgText) conv.title = msgText.slice(0, 44);

    if (!options.keepAttachments) {
      state.pendingAttachments = [];
      state.recordedAudio = null;
    }
    await DB.saveConversation(conv);

    state.isSending = true;
    renderActiveView();
    renderSidePanel();
    scrollChatsToBottom();

    try {
      const resp = await flApi("/api/finnish-lab/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: autoPrompt,
          mode,
          level: settings.level || "A1",
          history,
          attachments: atts.map((a) => ({ mime_type: a.mime_type, data_base64: a.data_base64 })),
        }),
      });

      conv.messages.push({
        id: DB.uid("msg"),
        role: "assistant",
        text: resp.reply,
        finnishTts: resp.finnish_tts || "",
        mode: resp.mode,
        at: new Date().toISOString(),
      });
      await DB.saveConversation(conv);
      DB.touchStudyStreak();
    } catch (err) {
      conv.messages.push({
        id: DB.uid("msg"),
        role: "assistant",
        text: `⚠️ **${err.code || "Error"}:** ${err.message}`,
        isError: true,
        at: new Date().toISOString(),
      });
      await DB.saveConversation(conv);
      toast(err.message, "error");
    } finally {
      state.isSending = false;
      renderActiveView();
      renderSidePanel();
      scrollChatsToBottom();
    }
  }

  function scrollChatsToBottom() {
    setTimeout(() => {
      document.querySelectorAll(".fl-chat-messages, .fl-side-messages").forEach((el) => {
        el.scrollTop = el.scrollHeight;
      });
    }, 40);
  }

  /* ---------- CROP / ROTATE PHOTO MODAL ---------- */
  function openCropModal(listName, idx) {
    const list = listName === "hw" ? state.hwAttachments : state.pendingAttachments;
    const att = list[idx];
    if (!att || !att.previewUrl) return;
    state.cropTarget = { listName, idx, angle: 0, cropMargin: 0 };
    renderCropModal();
  }

  function renderCropModal() {
    let modal = document.getElementById("fl-crop-modal");
    if (!state.cropTarget) {
      if (modal) modal.remove();
      return;
    }
    const list = state.cropTarget.listName === "hw" ? state.hwAttachments : state.pendingAttachments;
    const att = list[state.cropTarget.idx];
    if (!att) return;
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fl-crop-modal";
      modal.className = "fl-modal-backdrop";
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="fl-modal-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong style="color:#fff;">✂️ Rotate &amp; Crop Photo</strong>
          <button type="button" class="fl-btn sm" id="fl-crop-close">✕</button>
        </div>
        <div style="text-align:center;background:#030d1d;padding:10px;border-radius:10px;margin-bottom:10px;">
          <canvas id="fl-crop-canvas" style="max-width:100%;max-height:320px;border-radius:6px;"></canvas>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
          <button type="button" class="fl-btn sm" id="fl-crop-rot-l">↺ -90°</button>
          <button type="button" class="fl-btn sm" id="fl-crop-rot-r">↻ +90°</button>
          <label style="font-size:0.78rem;color:#cbd5e1;margin-left:auto;">Crop: <input type="range" id="fl-crop-range" min="0" max="25" value="${state.cropTarget.cropMargin}" /></label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button type="button" class="fl-btn" id="fl-crop-cancel">Cancel</button>
          <button type="button" class="fl-btn primary" id="fl-crop-apply">✓ Apply</button>
        </div>
      </div>
    `;
    const canvas = document.getElementById("fl-crop-canvas");
    const img = new Image();
    img.onload = () => drawCropped(canvas, img, state.cropTarget.angle, state.cropTarget.cropMargin);
    img.src = att.previewUrl;

    document.getElementById("fl-crop-close").onclick = () => { state.cropTarget = null; renderCropModal(); };
    document.getElementById("fl-crop-cancel").onclick = () => { state.cropTarget = null; renderCropModal(); };
    document.getElementById("fl-crop-rot-l").onclick = () => { state.cropTarget.angle = (state.cropTarget.angle + 270) % 360; drawCropped(canvas, img, state.cropTarget.angle, state.cropTarget.cropMargin); };
    document.getElementById("fl-crop-rot-r").onclick = () => { state.cropTarget.angle = (state.cropTarget.angle + 90) % 360; drawCropped(canvas, img, state.cropTarget.angle, state.cropTarget.cropMargin); };
    document.getElementById("fl-crop-range").oninput = (e) => { state.cropTarget.cropMargin = Number(e.target.value); drawCropped(canvas, img, state.cropTarget.angle, state.cropTarget.cropMargin); };
    document.getElementById("fl-crop-apply").onclick = () => {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      att.previewUrl = dataUrl;
      att.mime_type = "image/jpeg";
      att.data_base64 = dataUrl.split(",")[1];
      state.cropTarget = null;
      renderCropModal();
      renderActiveView();
    };
  }

  function drawCropped(canvas, img, angle, marginPct) {
    const ctx = canvas.getContext("2d");
    const sx = (img.width * marginPct) / 100;
    const sy = (img.height * marginPct) / 100;
    const sw = Math.max(20, img.width - sx * 2);
    const sh = Math.max(20, img.height - sy * 2);
    const rad = (angle * Math.PI) / 180;
    const swap = angle === 90 || angle === 270;
    canvas.width = swap ? sh : sw;
    canvas.height = swap ? sw : sh;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }

  /* ---------- MAIN RENDER (3 SIMPLE TABS) ---------- */
  function renderActiveView() {
    const root = document.getElementById("finnish-lab-root");
    if (!root) return;
    const settings = DB.getSettings();
    const prog = DB.getProgress();
    const dueCount = state.flashcards.filter((c) => (c.dueAt || 0) <= Date.now()).length;

    root.innerHTML = `
      <div class="fl-shell">
        <!-- Ultra-Clean Top Bar -->
        <div class="fl-topbar">
          <div class="fl-brand">
            <div class="fl-brand-flag">🇫🇮</div>
            <div>
              <h1 class="fl-brand-title">Finnish Lab <span class="fl-pill" style="margin-left:4px;padding:2px 8px;">${esc(settings.level)}</span></h1>
            </div>
          </div>
          <div class="fl-topbar-right">
            ${state.isRecording ? `<span class="fl-rec-indicator"><span class="fl-rec-dot"></span> <span class="fl-rec-timer">00:00</span></span>` : ""}
            <button type="button" id="fl-settings-open" class="fl-btn sm" title="Settings, Level, Focus Mode & Backup">⚙️</button>
          </div>
        </div>

        <!-- ONLY 3 CLEAR STUDENT TABS -->
        <nav class="fl-tabs" role="tablist" aria-label="Finnish Learning Lab">
          <button type="button" class="fl-tab-btn ${state.activeTab === "class" ? "active" : ""}" data-fl-tab="class">🎙️ <span>In Class</span></button>
          <button type="button" class="fl-tab-btn ${state.activeTab === "home" ? "active" : ""}" data-fl-tab="home">🏠 <span>Study at Home</span></button>
          <button type="button" class="fl-tab-btn ${state.activeTab === "notebook" ? "active" : ""}" data-fl-tab="notebook">📓 <span>Notebook${dueCount ? ` (${dueCount})` : ""}</span></button>
        </nav>

        <div id="fl-tab-content">
          ${
            state.activeTab === "class"
              ? renderInClassTab()
              : state.activeTab === "home"
              ? renderStudyAtHomeTab(settings, prog)
              : renderNotebookTab(dueCount)
          }
        </div>
      </div>
      ${state.settingsOpen ? renderSettingsModal(settings, prog) : ""}
    `;

    bindMainEvents();
  }

  /* ==========================================================================
     TAB 1: 🎙️ IN CLASS (UNIFIED RECORD + PHOTO + CHAT — ZERO CONFUSION!)
     ========================================================================== */
  function renderInClassTab() {
    const conv = getActiveConv();
    const msgs = conv ? conv.messages || [] : [];
    const hasReadyMedia = Boolean(state.recordedAudio || state.pendingAttachments.length > 0);

    return `
      <!-- 2 Big Live-Class Action Buttons -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        ${
          state.isRecording && state.recordingTarget === "class"
            ? `<button type="button" class="fl-btn danger" id="fl-class-stop-rec" style="padding:14px 12px;font-size:0.95rem;">⏹ Stop Recording (<span class="fl-rec-timer">00:00</span>)</button>`
            : `<button type="button" class="fl-btn danger" id="fl-class-start-rec" style="padding:14px 12px;font-size:0.95rem;">🎙️ Record Teacher</button>`
        }
        <label class="fl-btn primary" style="padding:14px 12px;font-size:0.95rem;cursor:pointer;">
          📷 Photo / Page
          <input type="file" id="fl-class-files" accept="image/*,application/pdf,audio/*" multiple style="display:none;" />
        </label>
      </div>

      ${
        state.recordedAudio
          ? `<div class="fl-card" style="padding:10px 12px;margin-bottom:10px;border-color:rgba(56,189,248,0.45);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:0.82rem;font-weight:700;color:#7dd3fc;">🎧 Teacher Recording (${state.recordedAudio.durationSec}s)</span>
                <button type="button" class="fl-btn sm" id="fl-clear-audio">✕</button>
              </div>
              <audio controls src="${state.recordedAudio.blobUrl}" style="width:100%;height:34px;margin-bottom:8px;"></audio>
              <button type="button" class="fl-btn primary" id="fl-understand-now" ${state.isSending ? "disabled" : ""} style="width:100%;padding:11px;">
                ${state.isSending ? "⏳ Listening & Translating..." : "✨ Understand What Teacher Said"}
              </button>
            </div>`
          : ""
      }

      ${
        state.pendingAttachments.length
          ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
              ${state.pendingAttachments
                .map(
                  (a, i) => `
                <div class="fl-att-chip">
                  ${a.previewUrl ? `<img src="${a.previewUrl}" class="fl-att-thumb" alt="" />` : "📄"}
                  <span>${esc(a.name.slice(0, 16))}</span>
                  ${a.previewUrl ? `<button type="button" class="fl-btn sm" style="padding:2px 5px;" data-fl-crop-pending="${i}">✂️</button>` : ""}
                  <button type="button" class="fl-btn sm" style="padding:2px 5px;" data-fl-rm-pending="${i}">✕</button>
                </div>
              `
                )
                .join("")}
              ${!state.recordedAudio ? `<button type="button" class="fl-btn primary sm" id="fl-understand-now" ${state.isSending ? "disabled" : ""}>✨ Explain Photo</button>` : ""}
            </div>`
          : ""
      }

      <!-- Unified Teacher Chat (Like WhatsApp) -->
      <div class="fl-chat-full" style="min-height:420px;">
        <div class="fl-chat-header">
          <div style="display:flex;align-items:center;gap:8px;min-width:0;">
            <button type="button" class="fl-btn sm ${state.chatsOpen ? "active" : ""}" id="fl-toggle-chats">🕒 Chats</button>
            <strong style="color:#fff;font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(conv ? conv.title : "Your Finnish Teacher")}</strong>
          </div>
          <button type="button" class="fl-btn sm" id="fl-new-conv">+ New</button>
        </div>

        ${
          state.chatsOpen
            ? `<div class="fl-chats-popover">
                ${
                  state.conversations.length
                    ? state.conversations
                        .map(
                          (c) => `
                    <div class="fl-conv-item ${c.id === state.activeConvId ? "active" : ""}" data-fl-select-conv="${c.id}">
                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.title)}</span>
                      <button type="button" class="fl-btn sm" style="padding:2px 6px;" data-fl-del-conv="${c.id}">🗑️</button>
                    </div>
                  `
                        )
                        .join("")
                    : `<div style="font-size:0.78rem;color:#94a3b8;">No previous chats yet.</div>`
                }
              </div>`
            : ""
        }

        <div class="fl-chat-messages" id="fl-class-messages">
          ${
            msgs.length
              ? msgs.map((m, idx) => renderChatMessage(m, idx)).join("")
              : `<div class="fl-msg assistant">
                  <strong>Hei! I'm your Finnish teacher. 🇫🇮</strong><br/>
                  In class? Tap <strong>🎙️ Record Teacher</strong> or <strong>📷 Photo</strong> above — or ask me anything below.<br/>
                  <span style="font-size:0.74rem;color:#94a3b8;">🔒 Please ask permission before recording teachers or classmates.</span>
                </div>`
          }
          ${state.isSending ? `<div class="fl-msg assistant">⏳ Thinking...</div>` : ""}
        </div>

        <div class="fl-composer">
          <div class="fl-composer-row" style="align-items:center;">
            <button type="button" class="fl-btn sm" id="fl-voice-ask" style="padding:10px;" title="Speak your question">🗣️</button>
            <input type="text" id="fl-chat-input" class="fl-input" style="flex:1;padding:10px 12px;" placeholder="${hasReadyMedia ? "Optional question about your recording/photo..." : "Ask anything about Finnish..."}" />
            <button type="button" class="fl-btn primary" id="fl-chat-send" ${state.isSending ? "disabled" : ""} style="padding:10px 16px;">Send ➤</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderChatMessage(m, idx) {
    const attHtml = (m.attachments || []).length
      ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
          ${m.attachments
            .map((a) =>
              a.previewUrl && (a.mime_type || "").startsWith("image/")
                ? `<img src="${a.previewUrl}" style="max-width:140px;max-height:110px;border-radius:8px;" alt="" />`
                : `<span class="fl-att-chip">${(a.mime_type || "").startsWith("audio/") ? "🎙️" : "📄"} ${esc(a.name || "Media")}</span>`
            )
            .join("")}
        </div>`
      : "";
    const actionsHtml =
      m.role === "assistant" && !m.isError
        ? `<div class="fl-msg-actions">
            <button type="button" class="fl-btn sm" data-fl-speak="${esc(m.finnishTts || m.text.slice(0, 220))}">🔊 Listen</button>
            <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(m.finnishTts || m.text.slice(0, 220))}">🐢 Slow</button>
            <button type="button" class="fl-btn sm" data-fl-explain-more="${idx}">📖 Explain More</button>
            <button type="button" class="fl-btn sm" data-fl-save-note="${idx}">💾 Save</button>
          </div>`
        : "";
    return `
      <div class="fl-msg ${m.role === "user" ? "user" : "assistant"}">
        ${attHtml}
        <div>${renderMarkdownLite(m.text)}</div>
        ${actionsHtml}
      </div>
    `;
  }

  /* ==========================================================================
     TAB 2: 🏠 STUDY AT HOME (4 SIMPLE CARDS — PICK 1 THING AT A TIME!)
     ========================================================================== */
  function renderStudyAtHomeTab(settings, prog) {
    if (!state.studyTool) {
      return `
        <div class="fl-study-grid">
          <button type="button" class="fl-hero-btn primary" data-fl-study="homework">
            <span class="fl-hero-icon">📝</span>
            <span class="fl-hero-label">Help With Homework</span>
            <span class="fl-hero-sub">Snap your worksheet → get a hint, check your answer, or see the answer</span>
          </button>
          <button type="button" class="fl-hero-btn" data-fl-study="lesson">
            <span class="fl-hero-icon">📖</span>
            <span class="fl-hero-label">Today's 5-Min Lesson</span>
            <span class="fl-hero-sub">5 words → 1 simple rule → 1 quick check (🔥 ${prog.streakDays || 0} day streak)</span>
          </button>
          <button type="button" class="fl-hero-btn" data-fl-study="practice">
            <span class="fl-hero-icon">🗣️</span>
            <span class="fl-hero-label">Practise (2 Minutes)</span>
            <span class="fl-hero-sub">Reading, Writing Check, Listening, or Everyday Roleplay</span>
          </button>
          <button type="button" class="fl-hero-btn" data-fl-study="lookup">
            <span class="fl-hero-icon">🔎</span>
            <span class="fl-hero-label">Look Up Word or Grammar</span>
            <span class="fl-hero-sub">Search any Finnish word or browse 17 simple A1 grammar guides</span>
          </button>
        </div>
      `;
    }

    const backBar = `<button type="button" class="fl-btn sm" id="fl-study-back" style="margin-bottom:10px;">← Back to Study at Home</button>`;
    if (state.studyTool === "homework") return backBar + renderHomeworkTool();
    if (state.studyTool === "lesson") return backBar + renderGuidedLessonTool();
    if (state.studyTool === "practice") return backBar + renderPracticeTool();
    return backBar + renderLookupTool();
  }

  function renderHomeworkTool() {
    return `
      <div class="fl-card">
        <h2 class="fl-card-title">📝 Homework Helper</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <label class="fl-btn primary" style="cursor:pointer;">
            📷 Snap / Upload Worksheet
            <input type="file" id="fl-hw-files" accept="image/*,application/pdf" multiple style="display:none;" />
          </label>
          ${state.hwAttachments.length ? `<button type="button" class="fl-btn sm" id="fl-hw-clear">Clear</button>` : ""}
        </div>
        ${
          state.hwAttachments.length
            ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                ${state.hwAttachments
                  .map(
                    (p, i) => `
                  <div class="fl-att-chip">
                    ${p.previewUrl ? `<img src="${p.previewUrl}" class="fl-att-thumb" alt="" />` : "📄"}
                    <span>${esc(p.name.slice(0, 18))}</span>
                    ${p.previewUrl ? `<button type="button" class="fl-btn sm" style="padding:2px 5px;" data-fl-crop-hw="${i}">✂️</button>` : ""}
                    <button type="button" class="fl-btn sm" style="padding:2px 5px;" data-fl-rm-hw="${i}">✕</button>
                  </div>
                `
                  )
                  .join("")}
              </div>`
            : ""
        }
        <input type="text" id="fl-hw-exercise" class="fl-input" style="margin-bottom:8px;" placeholder="Which exercise? (e.g. Exercise 3, or leave blank for whole page)" />
        <textarea id="fl-hw-answer" class="fl-textarea" rows="2" style="margin-bottom:10px;" placeholder="Optional: type your own Finnish answer to check it..."></textarea>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <button type="button" class="fl-btn" data-fl-hw="hint">💡 Hint</button>
          <button type="button" class="fl-btn success" data-fl-hw="check">✅ Check Mine</button>
          <button type="button" class="fl-btn primary" data-fl-hw="answer">👁️ Answer</button>
        </div>
      </div>
    `;
  }

  function renderGuidedLessonTool() {
    const pack = CURR.getTodayVocabPack();
    const gram = CURR.getTodayGrammarTopic();
    const step = state.lessonStep;

    return `
      <div class="fl-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h2 class="fl-card-title" style="margin:0;">📖 Today's 5-Min Lesson — Step ${step} of 3</h2>
          <span class="fl-pill">${step === 1 ? "5 Words" : step === 2 ? "1 Simple Rule" : "Quick Check"}</span>
        </div>

        ${
          step === 1
            ? `
              <div style="font-size:0.84rem;color:#7dd3fc;margin-bottom:8px;">Topic: ${esc(pack.topic)}</div>
              ${pack.words
                .map(
                  (w, idx) => `
                <div class="fl-vocab-row">
                  <div>
                    <strong style="color:#fff;">${esc(w.fi)}</strong> — <span style="color:#7dd3fc;">${esc(w.en)}</span>
                    <div style="font-size:0.74rem;color:#94a3b8;">${esc(w.exFi)} <em>(${esc(w.exEn)})</em></div>
                  </div>
                  <div style="display:flex;gap:4px;">
                    <button type="button" class="fl-btn sm" data-fl-speak="${esc(w.fi + ". " + w.exFi)}">🔊</button>
                    <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(w.fi)}">🐢</button>
                    <button type="button" class="fl-btn sm" data-fl-save-vocab="${idx}">⭐</button>
                  </div>
                </div>
              `
                )
                .join("")}
              <button type="button" class="fl-btn primary" id="fl-lesson-next" style="width:100%;margin-top:10px;padding:11px;">Next: 1 Simple Rule →</button>
            `
            : step === 2
            ? `
              <strong style="color:#fff;font-size:1rem;">${esc(gram.title)}</strong>
              <p style="font-size:0.88rem;color:#e2e8f0;line-height:1.55;">${esc(gram.en)}</p>
              <div style="background:#061428;padding:10px 12px;border-radius:10px;margin-bottom:10px;font-size:0.84rem;color:#6ee7b7;">
                <strong>🇫🇮 Suomeksi:</strong> ${esc(gram.fi)}
              </div>
              <ul style="padding-left:18px;font-size:0.86rem;color:#e0f2fe;margin-bottom:12px;">
                ${(gram.pos || []).map((x) => `<li>${esc(x)}</li>`).join("")}
              </ul>
              <div style="display:flex;gap:8px;">
                <button type="button" class="fl-btn" id="fl-lesson-prev">← Back</button>
                <button type="button" class="fl-btn primary" id="fl-lesson-next" style="flex:1;padding:11px;">Next: Quick Check →</button>
              </div>
            `
            : `
              <div style="font-size:0.95rem;font-weight:700;color:#fff;margin-bottom:10px;">${esc(gram.quiz.q)}</div>
              <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;">
                ${gram.quiz.options
                  .map(
                    (o, i) =>
                      `<button type="button" class="fl-btn" style="justify-content:flex-start;padding:11px 14px;" data-fl-quiz-ans="${i === gram.quiz.ans ? "1" : "0"}" data-fl-quiz-exp="${esc(gram.quiz.exp)}">${esc(o)}</button>`
                  )
                  .join("")}
              </div>
              <div id="fl-quiz-out" style="font-size:0.84rem;margin-bottom:12px;"></div>
              <div style="display:flex;gap:8px;">
                <button type="button" class="fl-btn" id="fl-lesson-prev">← Back</button>
                <button type="button" class="fl-btn success" id="fl-lesson-done" style="flex:1;padding:11px;">✓ Finish Today's Lesson</button>
              </div>
            `
        }
      </div>
    `;
  }

  function renderPracticeTool() {
    const sk = state.practiceSkill;
    const r = state.currentReading || CURR.SAMPLE_READINGS[0];
    const l = state.currentListening || CURR.SAMPLE_LISTENING[0];
    const fullFi = (l.lines || []).map((x) => x.fi).join(". ");

    return `
      <div class="fl-subtabs">
        <button type="button" class="fl-btn sm ${sk === "reading" ? "active" : ""}" data-fl-skill="reading">📰 Reading</button>
        <button type="button" class="fl-btn sm ${sk === "writing" ? "active" : ""}" data-fl-skill="writing">✍️ Writing</button>
        <button type="button" class="fl-btn sm ${sk === "listening" ? "active" : ""}" data-fl-skill="listening">🎧 Listening</button>
        <button type="button" class="fl-btn sm ${sk === "speaking" ? "active" : ""}" data-fl-skill="speaking">🗣️ Roleplay</button>
      </div>

      ${
        sk === "reading"
          ? `<div class="fl-card">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
                <h2 class="fl-card-title" style="margin:0;">📰 ${esc(r.title)}</h2>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="fl-btn sm" data-fl-speak="${esc((r.sentences || []).map((s) => s.fi).join(" "))}">🔊 Listen</button>
                  <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc((r.sentences || []).map((s) => s.fi).join(" "))}">🐢 Slow</button>
                </div>
              </div>
              ${(r.sentences || [])
                .map(
                  (s) => `
                <div style="padding:10px;background:#061428;border-radius:9px;margin-bottom:8px;">
                  <div style="font-weight:700;color:#fff;">${esc(s.fi)}</div>
                  <div style="font-size:0.8rem;color:#7dd3fc;">${esc(s.en)}</div>
                  ${s.spoken_fi ? `<div style="font-size:0.76rem;color:#6ee7b7;">Spoken: ${esc(s.spoken_fi)}</div>` : ""}
                </div>
              `
                )
                .join("")}
            </div>`
          : sk === "writing"
          ? `<div class="fl-card">
              <h2 class="fl-card-title">✍️ Write 1–3 Finnish Sentences</h2>
              <textarea id="fl-write-text" class="fl-textarea" rows="3" placeholder="Example: Hei! Minä asun Suomessa ja opiskelen suomea."></textarea>
              <button type="button" class="fl-btn primary" id="fl-write-submit" style="margin-top:10px;">✅ Check My Finnish</button>
              <div id="fl-write-out" style="margin-top:12px;"></div>
            </div>`
          : sk === "listening"
          ? `<div class="fl-card">
              <h2 class="fl-card-title">🎧 ${esc(l.title)}</h2>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                <button type="button" class="fl-btn primary" data-fl-speak="${esc(fullFi)}">🔊 Play</button>
                <button type="button" class="fl-btn" data-fl-speak-slow="${esc(fullFi)}">🐢 Slow</button>
                <button type="button" class="fl-btn sm" id="fl-listen-toggle-tr">${state.listeningShowTranscript ? "🙈 Hide Text" : "👁️ Show Text"}</button>
              </div>
              ${
                state.listeningShowTranscript
                  ? `<div style="background:#061428;padding:12px;border-radius:10px;">
                      ${(l.lines || []).map((ln) => `<div style="margin-bottom:8px;"><strong>${esc(ln.speaker)}:</strong> ${esc(ln.fi)}<div style="font-size:0.8rem;color:#7dd3fc;">${esc(ln.en)}</div></div>`).join("")}
                    </div>`
                  : `<p style="font-size:0.82rem;color:#94a3b8;">Listen first, then tap <strong>Show Text</strong> to check what you understood!</p>`
              }
            </div>`
          : `<div class="fl-card">
              <h2 class="fl-card-title">🗣️ Real-Life Roleplay</h2>
              <p style="font-size:0.82rem;color:#cbd5e1;margin:0 0 10px;">Pick a situation — your Finnish teacher will start a friendly beginner conversation with you:</p>
              ${CURR.ROLEPLAY_SCENARIOS.map(
                (rp) => `
                <div class="fl-vocab-row">
                  <strong style="color:#fff;">${esc(rp.title)}</strong>
                  <button type="button" class="fl-btn primary sm" data-fl-start-roleplay="${rp.id}">Start →</button>
                </div>
              `
              ).join("")}
            </div>`
      }
    `;
  }

  function renderLookupTool() {
    const topic = CURR.GRAMMAR_TOPICS.find((t) => t.id === state.selectedGrammarId) || CURR.GRAMMAR_TOPICS[0];
    return `
      <div class="fl-card" style="margin-bottom:14px;">
        <h2 class="fl-card-title">🔎 Look Up Any Finnish Word</h2>
        <div style="display:flex;gap:8px;">
          <input type="text" id="fl-anatomy-input" class="fl-input" placeholder="Type any Finnish word (e.g. kaupassa, ymmärrän, kahvia)..." />
          <button type="button" class="fl-btn primary" id="fl-anatomy-search">Look Up</button>
        </div>
        <div id="fl-anatomy-out" style="margin-top:10px;"></div>
      </div>

      <div class="fl-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h2 class="fl-card-title" style="margin:0;">📐 Simple A1 Grammar Guide</h2>
          <select id="fl-grammar-select" class="fl-select" style="width:auto;max-width:100%;">
            ${CURR.GRAMMAR_TOPICS.map((t) => `<option value="${t.id}" ${t.id === topic.id ? "selected" : ""}>${esc(t.title)}</option>`).join("")}
          </select>
        </div>
        <p style="font-size:0.86rem;color:#e2e8f0;line-height:1.55;">${esc(topic.en)}</p>
        <div style="background:#061428;padding:10px;border-radius:9px;margin-bottom:10px;font-size:0.82rem;color:#6ee7b7;"><strong>🇫🇮 Suomeksi:</strong> ${esc(topic.fi)}</div>
        <ul style="padding-left:18px;font-size:0.84rem;color:#e0f2fe;">
          ${(topic.pos || []).map((x) => `<li>${esc(x)}</li>`).join("")}
          ${(topic.neg || []).map((x) => `<li style="color:#fca5a5;">${esc(x)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  /* ==========================================================================
     TAB 3: 📓 MY NOTEBOOK (JUST FLASHCARDS + SAVED NOTES)
     ========================================================================== */
  function renderNotebookTab(dueCount) {
    const sec = state.notebookSection;
    const dueCards = state.flashcards.filter((c) => (c.dueAt || 0) <= Date.now());
    const activeCard = dueCards[0] || state.flashcards[0];

    return `
      <div class="fl-subtabs">
        <button type="button" class="fl-btn sm ${sec === "flashcards" ? "active" : ""}" data-fl-nb="flashcards">🃏 My Flashcards (${dueCount} due)</button>
        <button type="button" class="fl-btn sm ${sec === "notes" ? "active" : ""}" data-fl-nb="notes">📝 My Class Notes (${state.notes.length})</button>
      </div>

      ${
        sec === "flashcards"
          ? `<div class="fl-card">
              ${
                activeCard
                  ? `<div class="fl-flashcard-stage" id="fl-card-flip">
                      <div style="font-size:0.74rem;color:#94a3b8;">${state.flashcardFlipped ? "ENGLISH" : "FINNISH (tap to flip)"}</div>
                      <div style="font-size:1.5rem;font-weight:800;color:#fff;">${esc(state.flashcardFlipped ? activeCard.en : activeCard.fi)}</div>
                      ${state.flashcardFlipped && activeCard.example ? `<div style="font-size:0.82rem;color:#7dd3fc;">${esc(activeCard.example)}</div>` : ""}
                    </div>
                    <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;">
                      <button type="button" class="fl-btn sm" data-fl-speak="${esc(activeCard.fi)}">🔊 Listen</button>
                      <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(activeCard.fi)}">🐢 Slow</button>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;">
                      <button type="button" class="fl-btn danger sm" data-fl-rate-card="${activeCard.id}" data-fl-rating="again">Again</button>
                      <button type="button" class="fl-btn primary sm" data-fl-rate-card="${activeCard.id}" data-fl-rating="good">Good</button>
                      <button type="button" class="fl-btn success sm" data-fl-rate-card="${activeCard.id}" data-fl-rating="easy">Easy</button>
                    </div>`
                  : `<p style="font-size:0.86rem;color:#94a3b8;margin:0 0 10px;">No flashcards saved yet. Tap ⭐ on any word in Today's Lesson or add one below!</p>`
              }
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);">
                <input type="text" id="fl-new-card-fi" class="fl-input" style="flex:1;min-width:130px;" placeholder="Finnish word" />
                <input type="text" id="fl-new-card-en" class="fl-input" style="flex:1;min-width:130px;" placeholder="English meaning" />
                <button type="button" class="fl-btn primary sm" id="fl-add-custom-card">+ Add</button>
              </div>
            </div>`
          : `<div class="fl-card">
              ${
                state.notes.length
                  ? state.notes
                      .map(
                        (n) => `
                    <div class="fl-vocab-row" style="flex-direction:column;align-items:stretch;">
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                        <strong>${esc(n.title)} <span style="font-size:0.72rem;color:#94a3b8;">(${esc(n.date)})</span></strong>
                        <div style="display:flex;gap:5px;">
                          <button type="button" class="fl-btn sm" data-fl-export-note="${n.id}">⬇️</button>
                          <button type="button" class="fl-btn sm" data-fl-del-note="${n.id}">🗑️</button>
                        </div>
                      </div>
                      <div style="font-size:0.82rem;color:#cbd5e1;margin-top:6px;">${renderMarkdownLite((n.content || "").slice(0, 500))}</div>
                    </div>
                  `
                      )
                      .join("")
                  : `<p style="font-size:0.86rem;color:#94a3b8;margin:0;">No saved notes yet. Tap 💾 Save on any answer in In Class to keep it here.</p>`
              }
            </div>`
      }
    `;
  }

  /* ---------- SETTINGS MODAL (ALL RARE OPTIONS TUCKED AWAY CLEANLY) ---------- */
  function renderSettingsModal(settings, prog) {
    const u = (state.status && state.status.usage) || { used: 0, limit: 60, remaining: 60 };
    return `
      <div class="fl-modal-backdrop" id="fl-settings-modal">
        <div class="fl-modal-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <strong style="color:#fff;">⚙️ Settings &amp; Backup</strong>
            <button type="button" class="fl-btn sm" id="fl-settings-close">✕</button>
          </div>
          <div class="fl-grid-2" style="gap:10px;margin-bottom:12px;">
            <div>
              <label style="font-size:0.74rem;color:#94a3b8;">Level</label>
              <select id="fl-level-select" class="fl-select">
                <option value="A1" ${settings.level === "A1" ? "selected" : ""}>A1 (Beginner)</option>
                <option value="A2" ${settings.level === "A2" ? "selected" : ""}>A2 (Elementary)</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.74rem;color:#94a3b8;">Voice Input Language</label>
              <select id="fl-voice-lang" class="fl-select">
                <option value="fi-FI" ${settings.voiceLang === "fi-FI" ? "selected" : ""}>Finnish (FI)</option>
                <option value="en-US" ${settings.voiceLang === "en-US" ? "selected" : ""}>English (EN)</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
            <button type="button" id="fl-focus-toggle" class="fl-btn sm ${state.focusMode ? "active" : ""}">${state.focusMode ? "↙ Show Studio Sidebar" : "⛶ Full-Screen Study Mode"}</button>
            <span class="fl-pill ok">🔥 ${prog.streakDays || 0}d streak</span>
            <span class="fl-pill">AI: ${u.remaining}/${u.limit} left today</span>
          </div>
          <div style="padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.76rem;color:#94a3b8;">
            <div style="margin-bottom:8px;">Saved privately on this device (isolated from ILoveFinland articles).</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" class="fl-btn primary sm" id="fl-export-backup">⬇️ Export Backup</button>
              <label class="fl-btn sm" style="cursor:pointer;">⬆️ Import Backup<input type="file" id="fl-import-backup" accept="application/json" style="display:none;" /></label>
              <button type="button" class="fl-btn sm" id="fl-cloud-push">☁️ Save Sync</button>
              <button type="button" class="fl-btn sm" id="fl-cloud-pull">☁️ Load Sync</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ---------- MINI FLOATING TUTOR & COLLAPSIBLE SIDE PANEL (OUTSIDE LAB) ---------- */
  function mountFloatingAndSidePanel() {
    if (document.getElementById("fl-floating-launcher")) return;
    const launcher = document.createElement("button");
    launcher.id = "fl-floating-launcher";
    launcher.type = "button";
    launcher.className = "fl-floating-launcher";
    launcher.innerHTML = `<span>🇫🇮</span><span>Finnish Tutor</span>`;
    launcher.onclick = () => toggleSidePanel(true);
    document.body.appendChild(launcher);

    const panel = document.createElement("aside");
    panel.id = "fl-side-panel";
    panel.className = "fl-side-panel";
    document.body.appendChild(panel);
    renderSidePanel();
  }

  function toggleSidePanel(open) {
    state.sidePanelOpen = typeof open === "boolean" ? open : !state.sidePanelOpen;
    const panel = document.getElementById("fl-side-panel");
    if (panel) panel.classList.toggle("open", state.sidePanelOpen);
    if (state.sidePanelOpen) {
      renderSidePanel();
      scrollChatsToBottom();
    }
  }

  function renderSidePanel() {
    const panel = document.getElementById("fl-side-panel");
    if (!panel) return;
    const conv = getActiveConv();
    const msgs = conv ? conv.messages || [] : [];

    panel.innerHTML = `
      <div class="fl-side-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span>🇫🇮</span>
          <div>
            <strong style="color:#fff;font-size:0.9rem;">Finnish Tutor</strong>
            <div style="font-size:0.7rem;color:#94a3b8;">Your article edits stay safe</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button type="button" class="fl-btn primary sm" id="fl-side-expand">⛶ Open Lab</button>
          <button type="button" class="fl-btn sm" id="fl-side-close">✕</button>
        </div>
      </div>
      <div class="fl-side-body">
        <div class="fl-side-messages">
          ${msgs.length ? msgs.slice(-10).map((m, i) => renderChatMessage(m, i)).join("") : `<div class="fl-msg assistant">Hei! Ask a quick Finnish question while you work.</div>`}
          ${state.isSending ? `<div class="fl-msg assistant">⏳ Thinking...</div>` : ""}
        </div>
        <div style="display:flex;gap:6px;">
          <input type="text" id="fl-side-input" class="fl-input" style="padding:8px 10px;" placeholder="Ask Finnish Tutor..." />
          <button type="button" class="fl-btn primary sm" id="fl-side-send" ${state.isSending ? "disabled" : ""}>➤</button>
        </div>
      </div>
    `;

    panel.querySelector("#fl-side-close")?.addEventListener("click", () => toggleSidePanel(false));
    panel.querySelector("#fl-side-expand")?.addEventListener("click", () => {
      toggleSidePanel(false);
      if (typeof window.openFinnishLabView === "function") window.openFinnishLabView();
    });
    const sendSide = () => {
      const inp = panel.querySelector("#fl-side-input");
      if (!inp || !inp.value.trim()) return;
      const v = inp.value.trim();
      inp.value = "";
      sendMessage(v);
    };
    panel.querySelector("#fl-side-send")?.addEventListener("click", sendSide);
    panel.querySelector("#fl-side-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); sendSide(); } });
    bindCommonMessageButtons(panel);
  }

  /* ---------- EVENTS ---------- */
  function bindCommonMessageButtons(container) {
    container.querySelectorAll("[data-fl-speak]").forEach((b) => { b.onclick = () => speakFinnish(b.getAttribute("data-fl-speak"), false); });
    container.querySelectorAll("[data-fl-speak-slow]").forEach((b) => { b.onclick = () => speakFinnish(b.getAttribute("data-fl-speak-slow"), true); });
  }

  function bindMainEvents() {
    const root = document.getElementById("finnish-lab-root");
    if (!root) return;

    // 3 main tabs
    root.querySelectorAll("[data-fl-tab]").forEach((b) => {
      b.onclick = () => {
        if (state.isRecording) { toast("Stop your recording first so nothing is lost.", "warning"); return; }
        state.activeTab = b.getAttribute("data-fl-tab");
        renderActiveView();
      };
    });

    // Settings modal
    root.querySelector("#fl-settings-open")?.addEventListener("click", () => { state.settingsOpen = true; renderActiveView(); });
    root.querySelector("#fl-settings-close")?.addEventListener("click", () => { state.settingsOpen = false; renderActiveView(); });
    root.querySelector("#fl-settings-modal")?.addEventListener("click", (e) => { if (e.target.id === "fl-settings-modal") { state.settingsOpen = false; renderActiveView(); } });
    root.querySelector("#fl-level-select")?.addEventListener("change", (e) => { DB.saveSettings({ level: e.target.value }); renderActiveView(); });
    root.querySelector("#fl-voice-lang")?.addEventListener("change", (e) => DB.saveSettings({ voiceLang: e.target.value }));
    root.querySelector("#fl-focus-toggle")?.addEventListener("click", () => { state.focusMode = !state.focusMode; document.body.classList.toggle("fl-focus-mode", state.focusMode); renderActiveView(); });

    // IN CLASS actions
    root.querySelector("#fl-class-start-rec")?.addEventListener("click", () => startRecording("class"));
    root.querySelector("#fl-class-stop-rec")?.addEventListener("click", stopRecording);
    root.querySelector("#fl-clear-audio")?.addEventListener("click", () => { state.recordedAudio = null; renderActiveView(); });
    root.querySelector("#fl-class-files")?.addEventListener("change", async (e) => {
      for (const f of Array.from(e.target.files || [])) {
        const att = await fileToAttachment(f);
        if (!att) continue;
        if ((att.mime_type || "").startsWith("audio/")) {
          state.recordedAudio = { blobUrl: URL.createObjectURL(f), mime_type: att.mime_type, data_base64: att.data_base64, durationSec: 0 };
        } else {
          state.pendingAttachments.push(att);
        }
      }
      e.target.value = "";
      renderActiveView();
    });
    root.querySelectorAll("[data-fl-rm-pending]").forEach((b) => { b.onclick = () => { state.pendingAttachments.splice(Number(b.getAttribute("data-fl-rm-pending")), 1); renderActiveView(); }; });
    root.querySelectorAll("[data-fl-crop-pending]").forEach((b) => { b.onclick = () => openCropModal("pending", Number(b.getAttribute("data-fl-crop-pending"))); });
    root.querySelector("#fl-understand-now")?.addEventListener("click", () => {
      const extra = (document.getElementById("fl-chat-input")?.value || "").trim();
      if (document.getElementById("fl-chat-input")) document.getElementById("fl-chat-input").value = "";
      sendMessage(extra);
    });
    root.querySelector("#fl-toggle-chats")?.addEventListener("click", () => { state.chatsOpen = !state.chatsOpen; renderActiveView(); });
    root.querySelector("#fl-new-conv")?.addEventListener("click", async () => {
      const c = await DB.saveConversation({ title: "New Finnish Chat", kind: "class", messages: [] });
      state.conversations.unshift(c);
      state.activeConvId = c.id;
      state.chatsOpen = false;
      renderActiveView();
    });
    root.querySelectorAll("[data-fl-select-conv]").forEach((el) => {
      el.onclick = (e) => { if (e.target.closest("button")) return; state.activeConvId = el.getAttribute("data-fl-select-conv"); state.chatsOpen = false; renderActiveView(); scrollChatsToBottom(); };
    });
    root.querySelectorAll("[data-fl-del-conv]").forEach((b) => {
      b.onclick = async () => {
        const id = b.getAttribute("data-fl-del-conv");
        await DB.deleteConversation(id);
        state.conversations = state.conversations.filter((x) => x.id !== id);
        if (state.activeConvId === id) state.activeConvId = state.conversations[0]?.id || null;
        renderActiveView();
      };
    });
    root.querySelector("#fl-voice-ask")?.addEventListener("click", () => startVoiceDictation("fl-chat-input"));
    const sendChat = () => {
      const inp = document.getElementById("fl-chat-input");
      if (!inp) return;
      const v = inp.value.trim();
      inp.value = "";
      sendMessage(v);
    };
    root.querySelector("#fl-chat-send")?.addEventListener("click", sendChat);
    root.querySelector("#fl-chat-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } });

    root.querySelectorAll("[data-fl-explain-more]").forEach((b) => {
      b.onclick = () => sendMessage("Explain this in more detail: simple Finnish (selkosuomi), English grammar tip, and 2 examples.", { mode: "teach_me" });
    });
    root.querySelectorAll("[data-fl-save-note]").forEach((b) => {
      b.onclick = async () => {
        const conv = getActiveConv();
        const m = conv && conv.messages[Number(b.getAttribute("data-fl-save-note"))];
        if (!m) return;
        await DB.saveNote({ title: conv.title, type: "class", content: m.text });
        state.notes = await DB.listNotes();
        toast("Saved to Notebook! 📓", "success");
      };
    });

    // STUDY AT HOME actions
    root.querySelectorAll("[data-fl-study]").forEach((b) => {
      b.onclick = () => { state.studyTool = b.getAttribute("data-fl-study"); state.lessonStep = 1; renderActiveView(); };
    });
    root.querySelector("#fl-study-back")?.addEventListener("click", () => { state.studyTool = null; renderActiveView(); });

    // Homework tool
    root.querySelector("#fl-hw-files")?.addEventListener("change", async (e) => {
      for (const f of Array.from(e.target.files || [])) {
        const att = await fileToAttachment(f);
        if (att) state.hwAttachments.push(att);
      }
      e.target.value = "";
      renderActiveView();
    });
    root.querySelector("#fl-hw-clear")?.addEventListener("click", () => { state.hwAttachments = []; renderActiveView(); });
    root.querySelectorAll("[data-fl-rm-hw]").forEach((b) => { b.onclick = () => { state.hwAttachments.splice(Number(b.getAttribute("data-fl-rm-hw")), 1); renderActiveView(); }; });
    root.querySelectorAll("[data-fl-crop-hw]").forEach((b) => { b.onclick = () => openCropModal("hw", Number(b.getAttribute("data-fl-crop-hw"))); });
    root.querySelectorAll("[data-fl-hw]").forEach((b) => {
      b.onclick = () => {
        const modeKey = b.getAttribute("data-fl-hw");
        const ex = (document.getElementById("fl-hw-exercise")?.value || "").trim();
        const ans = (document.getElementById("fl-hw-answer")?.value || "").trim();
        if (!state.hwAttachments.length && !ex && !ans) { toast("Upload your worksheet or type your answer first.", "warning"); return; }
        const parts = [];
        if (ex) parts.push(`Exercise: ${ex}`);
        if (ans) parts.push(`My answer: "${ans}"`);
        if (!parts.length) parts.push("Help me with this homework.");
        const map = { hint: "homework_hint", check: "homework_check", answer: "homework_answer" };
        state.activeTab = "class";
        sendMessage(parts.join("\n"), { mode: map[modeKey] || "homework_hint", attachments: state.hwAttachments.slice(), keepAttachments: true });
      };
    });

    // Guided 5-Min Lesson
    root.querySelector("#fl-lesson-next")?.addEventListener("click", () => { state.lessonStep = Math.min(3, state.lessonStep + 1); renderActiveView(); });
    root.querySelector("#fl-lesson-prev")?.addEventListener("click", () => { state.lessonStep = Math.max(1, state.lessonStep - 1); renderActiveView(); });
    root.querySelector("#fl-lesson-done")?.addEventListener("click", () => {
      DB.recordLessonCompleted("daily_" + DB.todayStr());
      toast("Mahtavaa! Today's lesson complete! 🔥", "success");
      state.studyTool = null;
      renderActiveView();
    });
    root.querySelectorAll("[data-fl-save-vocab]").forEach((b) => {
      b.onclick = async () => {
        const pack = CURR.getTodayVocabPack();
        const w = pack.words[Number(b.getAttribute("data-fl-save-vocab"))];
        if (!w) return;
        const r = await DB.addFlashcard({ fi: w.fi, en: w.en, baseForm: w.base, example: `${w.exFi} (${w.exEn})` });
        state.flashcards = await DB.listFlashcards();
        toast(r.duplicate ? "Already in Flashcards." : `Saved "${w.fi}" to Notebook! ⭐`, "success");
        renderActiveView();
      };
    });
    root.querySelectorAll("[data-fl-quiz-ans]").forEach((b) => {
      b.onclick = () => {
        const ok = b.getAttribute("data-fl-quiz-ans") === "1";
        const out = document.getElementById("fl-quiz-out");
        if (out) {
          out.style.color = ok ? "#6ee7b7" : "#fca5a5";
          out.textContent = (ok ? "✅ Oikein! " : "❌ Try again — ") + (b.getAttribute("data-fl-quiz-exp") || "");
        }
      };
    });

    // Practise tool
    root.querySelectorAll("[data-fl-skill]").forEach((b) => { b.onclick = () => { state.practiceSkill = b.getAttribute("data-fl-skill"); renderActiveView(); }; });
    root.querySelector("#fl-listen-toggle-tr")?.addEventListener("click", () => { state.listeningShowTranscript = !state.listeningShowTranscript; renderActiveView(); });
    root.querySelector("#fl-write-submit")?.addEventListener("click", async () => {
      const txt = (document.getElementById("fl-write-text")?.value || "").trim();
      const out = document.getElementById("fl-write-out");
      if (!txt || !out) return;
      out.innerHTML = "<div style='color:#7dd3fc;'>⏳ Checking your Finnish...</div>";
      try {
        const res = await flApi("/api/finnish-lab/writing-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: txt, level: DB.getSettings().level }) });
        const fb = res.feedback || {};
        out.innerHTML = `
          <div style="background:#061428;padding:12px;border-radius:10px;font-size:0.86rem;line-height:1.55;">
            <div style="color:#6ee7b7;font-weight:700;">✅ ${esc(fb.corrected || "")}</div>
            <div style="color:#7dd3fc;margin-top:4px;">🇬🇧 ${esc(fb.english_meaning || "")}</div>
            ${(fb.mistakes || []).map((m) => `<div style="margin-top:6px;">• <span style="color:#fca5a5;">${esc(m.wrong)}</span> → <strong>${esc(m.right)}</strong>: ${esc(m.why_en)}</div>`).join("")}
          </div>
        `;
      } catch (err) {
        out.innerHTML = `<div style="color:#fca5a5;">⚠️ ${esc(err.message)}</div>`;
      }
    });
    root.querySelectorAll("[data-fl-start-roleplay]").forEach((b) => {
      b.onclick = async () => {
        const rp = CURR.ROLEPLAY_SCENARIOS.find((x) => x.id === b.getAttribute("data-fl-start-roleplay"));
        if (!rp) return;
        const c = await DB.saveConversation({ title: rp.title, kind: "class", messages: [] });
        state.conversations.unshift(c);
        state.activeConvId = c.id;
        state.activeTab = "class";
        sendMessage(rp.prompt, { mode: "practice" });
      };
    });

    // Lookup tool (Word Anatomy + 17 Grammar Guides)
    root.querySelector("#fl-grammar-select")?.addEventListener("change", (e) => { state.selectedGrammarId = e.target.value; renderActiveView(); });
    root.querySelector("#fl-anatomy-search")?.addEventListener("click", async () => {
      const w = (document.getElementById("fl-anatomy-input")?.value || "").trim();
      const out = document.getElementById("fl-anatomy-out");
      if (!w || !out) return;
      out.innerHTML = "<div style='color:#7dd3fc;'>⏳ Looking up word...</div>";
      try {
        const res = await flApi("/api/finnish-lab/word-anatomy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: w, level: DB.getSettings().level }) });
        const a = res.anatomy || {};
        const f = a.forms || {};
        out.innerHTML = `
          <div style="background:#061428;padding:12px;border-radius:10px;font-size:0.84rem;line-height:1.6;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
              <div><strong style="font-size:1.1rem;color:#fff;">${esc(a.original_word || w)}</strong> — <span style="color:#7dd3fc;">${esc(a.english_meaning || "")}</span></div>
              <button type="button" class="fl-btn sm" data-fl-speak="${esc(a.original_word || w)}">🔊</button>
            </div>
            <div><strong>Base form:</strong> ${esc(a.base_form || "—")} • <strong>Syllables:</strong> ${esc(a.syllables || "—")}</div>
            <div><strong>Forms:</strong> Partitive: ${esc(f.partitive || "—")} | Genitive: ${esc(f.genitive || "—")} | In: ${esc(f.inessive || "—")}</div>
            ${a.spoken_finnish ? `<div><strong>Spoken:</strong> ${esc(a.spoken_finnish)}</div>` : ""}
            ${(a.examples || []).map((ex) => `<div style="color:#e0f2fe;">• ${esc(ex.fi)} <em>(${esc(ex.en)})</em></div>`).join("")}
          </div>
        `;
        bindCommonMessageButtons(out);
      } catch (err) {
        out.innerHTML = `<div style="color:#fca5a5;">⚠️ ${esc(err.message)}</div>`;
      }
    });

    // Notebook actions
    root.querySelectorAll("[data-fl-nb]").forEach((b) => { b.onclick = () => { state.notebookSection = b.getAttribute("data-fl-nb"); renderActiveView(); }; });
    root.querySelector("#fl-card-flip")?.addEventListener("click", () => { state.flashcardFlipped = !state.flashcardFlipped; renderActiveView(); });
    root.querySelectorAll("[data-fl-rate-card]").forEach((b) => {
      b.onclick = async () => {
        await DB.reviewFlashcard(b.getAttribute("data-fl-rate-card"), b.getAttribute("data-fl-rating"));
        state.flashcards = await DB.listFlashcards();
        state.flashcardFlipped = false;
        renderActiveView();
      };
    });
    root.querySelector("#fl-add-custom-card")?.addEventListener("click", async () => {
      const fi = (document.getElementById("fl-new-card-fi")?.value || "").trim();
      const en = (document.getElementById("fl-new-card-en")?.value || "").trim();
      if (!fi || !en) { toast("Enter Finnish and English.", "warning"); return; }
      await DB.addFlashcard({ fi, en });
      state.flashcards = await DB.listFlashcards();
      toast("Card added! ⭐", "success");
      renderActiveView();
    });
    root.querySelectorAll("[data-fl-export-note]").forEach((b) => {
      b.onclick = () => {
        const n = state.notes.find((x) => x.id === b.getAttribute("data-fl-export-note"));
        if (n) downloadTextFile(`${n.date}-${n.id}.txt`, `${n.title}\n\n${n.content}`);
      };
    });
    root.querySelectorAll("[data-fl-del-note]").forEach((b) => {
      b.onclick = async () => {
        await DB.deleteNote(b.getAttribute("data-fl-del-note"));
        state.notes = await DB.listNotes();
        renderActiveView();
      };
    });

    // Backup & Sync inside Settings
    root.querySelector("#fl-export-backup")?.addEventListener("click", async () => {
      downloadTextFile(`finnish-lab-backup-${DB.todayStr()}.json`, JSON.stringify(await DB.exportAllData(), null, 2));
      toast("Backup downloaded!", "success");
    });
    root.querySelector("#fl-import-backup")?.addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        await DB.importAllData(JSON.parse(await f.text()));
        await loadAllData();
        toast("Backup restored!", "success");
        renderActiveView();
      } catch (err) {
        toast("Import failed: " + err.message, "error");
      }
    });
    root.querySelector("#fl-cloud-push")?.addEventListener("click", async () => {
      try {
        await flApi("/api/finnish-lab/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot: await DB.exportAllData() }) });
        toast("Sync snapshot saved!", "success");
      } catch (err) { toast(err.message, "error"); }
    });
    root.querySelector("#fl-cloud-pull")?.addEventListener("click", async () => {
      try {
        const res = await flApi("/api/finnish-lab/sync");
        if (!res.has_snapshot || !res.snapshot) { toast("No saved sync snapshot found.", "info"); return; }
        await DB.importAllData(res.snapshot);
        await loadAllData();
        toast("Sync snapshot loaded!", "success");
        renderActiveView();
      } catch (err) { toast(err.message, "error"); }
    });

    bindCommonMessageButtons(root);
  }

  /* ---------- INIT ---------- */
  async function initFinnishLab() {
    await loadAllData();
    mountFloatingAndSidePanel();
    renderActiveView();
    refreshStatus();
  }

  window.FinnishLab = {
    init: initFinnishLab,
    render: renderActiveView,
    toggleSidePanel,
    isRecording: () => state.isRecording,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFinnishLab);
  } else {
    initFinnishLab();
  }
})();
