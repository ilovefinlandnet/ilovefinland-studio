/* ============================================================================
   FINNISH LEARNING LAB — COMPLETE APPLICATION CONTROLLER
   Integrated inside ILoveFinland Studio (/finnish-lab + Side Panel + Mini Tutor)
   100% Real Gemini AI via secure server endpoints + Isolated IndexedDB storage
   ============================================================================ */
(function () {
  "use strict";

  const DB = window.FinnishLabDB;
  const CURR = window.FinnishLabCurriculum;

  const state = {
    activeTab: "home", // home | class | tutor | learn | review
    classSubTab: "live", // live | homework
    learnSubTab: "daily", // daily | grammar | anatomy | reading | writing | listening | speaking
    reviewSubTab: "flashcards", // flashcards | notes | progress
    focusMode: false,
    sidePanelOpen: false,
    status: null,
    conversations: [],
    activeConvId: null,
    pendingAttachments: [], // { id, name, mime_type, data_base64, previewUrl }
    classPhotoAttachments: [], // for Record Teacher + Photo combined or Homework
    isRecording: false,
    recordingTarget: null, // 'class' | 'tutor' | 'side'
    mediaRecorder: null,
    mediaChunks: [],
    recordStartMs: 0,
    recordTimer: null,
    recordedAudio: null, // { blobUrl, mime_type, data_base64, durationSec }
    classResult: null,
    classTranscriptEditable: "",
    isSending: false,
    selectedGrammarId: "olla",
    currentReading: null,
    currentListening: null,
    listeningShowTranscript: false,
    listeningShowEn: false,
    flashcards: [],
    flashcardFlipped: false,
    notes: [],
    cropTarget: null, // { list, index, angle }
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

  /* ---------- FINNISH SPEECH SYNTHESIS (NORMAL & SLOW) ---------- */
  function speakFinnish(text, slow) {
    if (!text) return;
    if (!("speechSynthesis" in window)) {
      toast("Speech playback is not supported in this browser.", "warning");
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
      if (fiVoice) {
        utter.voice = fiVoice;
      } else {
        toast("Playing with device default voice (install a Finnish voice in OS settings for best pronunciation).", "info");
      }
      window.speechSynthesis.speak(utter);
    } catch (e) {
      toast("Could not play audio: " + e.message, "error");
    }
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  /* ---------- SECURE API CLIENT ---------- */
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
        err.payload = data;
        throw err;
      }
      if (data.usage && state.status) {
        state.status.usage = data.usage;
        updateQuotaBadges();
      }
      return data;
    } catch (e) {
      if (e && e.name === "AbortError") {
        const err = new Error("Request timed out after 35s. Please try again — your message and saved data are safe.");
        err.code = "API_TIMEOUT";
        throw err;
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function refreshStatus(force) {
    try {
      state.status = await flApi("/api/finnish-lab/status" + (force ? "?refresh=1" : ""));
      updateQuotaBadges();
    } catch (_) {
      state.status = { ok: false, usage: { used: 0, limit: 60, remaining: 60 } };
    }
  }

  function updateQuotaBadges() {
    const u = state.status && state.status.usage;
    document.querySelectorAll(".fl-quota-badge").forEach((el) => {
      if (!u) return;
      el.textContent = `AI: ${u.remaining}/${u.limit} left today`;
      el.className = "fl-pill fl-quota-badge " + (u.remaining <= 5 ? "danger" : u.remaining <= 15 ? "warn" : "ok");
    });
  }

  /* ---------- AUDIO RECORDING (EXPLICIT USER CONTROL) ---------- */
  async function startRecording(target) {
    if (state.isRecording) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Microphone recording is not supported in this browser. Please type your question or upload an audio file.", "warning");
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
    } catch (err) {
      toast("Microphone permission denied or unavailable. Please allow microphone access or type your question.", "error");
    }
  }

  function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
      try {
        state.mediaRecorder.stop();
      } catch (_) {}
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
      toast("File is larger than 18 MB limit. Please select a smaller image or PDF.", "error");
      return null;
    }
    const b64 = await blobToBase64(file);
    const mime = file.type || "image/jpeg";
    const previewUrl = mime.startsWith("image/") ? `data:${mime};base64,${b64}` : null;
    return {
      id: DB.uid("att"),
      name: file.name || "attachment",
      mime_type: mime,
      data_base64: b64,
      previewUrl,
    };
  }

  /* ---------- VOICE RECOGNITION (SPEECH-TO-TEXT WITH FALLBACK) ---------- */
  function startVoiceDictation(targetInputId, onFinal) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast("Live voice dictation is not supported in this browser — use the 🎙️ Record Audio button instead (Gemini listens directly to your audio!).", "info");
      return;
    }
    try {
      const rec = new SR();
      const settings = DB.getSettings();
      rec.lang = settings.voiceLang || "fi-FI";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
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
      rec.onerror = (ev) => {
        toast("Voice recognition error: " + (ev.error || "unavailable") + ". You can use 🎙️ Record Audio or type.", "warning");
      };
      rec.start();
    } catch (_) {
      toast("Could not start speech recognition. Use 🎙️ Record Audio instead.", "warning");
    }
  }

  /* ---------- CONVERSATIONS ---------- */
  async function loadAllData() {
    const [convs, cards, notes] = await Promise.all([
      DB.listConversations(),
      DB.listFlashcards(),
      DB.listNotes(),
    ]);
    state.conversations = convs;
    state.flashcards = cards;
    state.notes = notes;
    if (!state.activeConvId && convs.length > 0) {
      state.activeConvId = convs[0].id;
    }
    if (!state.currentReading) state.currentReading = CURR.SAMPLE_READINGS[0];
    if (!state.currentListening) state.currentListening = CURR.SAMPLE_LISTENING[0];
  }

  function getActiveConv() {
    return state.conversations.find((c) => c.id === state.activeConvId) || null;
  }

  async function ensureActiveConv(kind, title) {
    let conv = getActiveConv();
    if (!conv) {
      conv = await DB.saveConversation({
        title: title || "Finnish Tutor Chat",
        kind: kind || "tutor",
        messages: [],
      });
      state.conversations.unshift(conv);
      state.activeConvId = conv.id;
    }
    return conv;
  }

  async function sendTutorMessage(text, opts) {
    if (state.isSending) return;
    const options = opts || {};
    const msgText = (text || "").trim();
    const atts = options.attachments || state.pendingAttachments.slice();
    if (!msgText && atts.length === 0) {
      toast("Type a question, record audio, or attach an image/PDF first.", "warning");
      return;
    }

    const conv = await ensureActiveConv(options.kind || "tutor", msgText ? msgText.slice(0, 42) : "Classroom Question");
    const settings = DB.getSettings();
    const mode = options.mode || (settings.quickClassMode ? "quick_class" : settings.answerMode || "teach_me");

    // Build history from existing messages (maintaining context + recent media without re-uploading!)
    const history = (conv.messages || []).slice(-10).map((m) => ({
      role: m.role,
      text: m.text,
      attachments: (m.attachments || []).slice(0, 2).map((a) => ({
        mime_type: a.mime_type,
        data_base64: a.data_base64,
      })),
    }));

    const userMsg = {
      id: DB.uid("msg"),
      role: "user",
      text: msgText || "(Attached classroom audio / image)",
      attachments: atts,
      at: new Date().toISOString(),
    };
    conv.messages.push(userMsg);
    if (conv.messages.length === 1 && msgText) {
      conv.title = msgText.slice(0, 48);
    }
    if (!options.keepPending) {
      state.pendingAttachments = [];
    }
    await DB.saveConversation(conv);

    state.isSending = true;
    renderActiveView();
    renderSidePanel();

    try {
      const resp = await flApi("/api/finnish-lab/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgText,
          mode,
          level: settings.level || "A1",
          history,
          attachments: atts.map((a) => ({ mime_type: a.mime_type, data_base64: a.data_base64 })),
          worksheet_context: options.worksheetContext || "",
        }),
      });

      conv.messages.push({
        id: DB.uid("msg"),
        role: "assistant",
        text: resp.reply,
        finnishTts: resp.finnish_tts || "",
        mode: resp.mode,
        model: resp.model,
        cached: !!resp.cached,
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

  /* ---------- RECORD TEACHER & COMBINED AUDIO + PHOTO ---------- */
  async function analyzeTeacherRecording() {
    if (state.isSending) return;
    if (!state.recordedAudio && state.classPhotoAttachments.length === 0) {
      toast("Record your teacher or attach a classroom photo first.", "warning");
      return;
    }
    const settings = DB.getSettings();
    const qNote = (document.getElementById("fl-class-extra-q")?.value || "").trim();
    const atts = [];
    if (state.recordedAudio) {
      atts.push({
        name: `Teacher Recording (${state.recordedAudio.durationSec}s)`,
        mime_type: state.recordedAudio.mime_type,
        data_base64: state.recordedAudio.data_base64,
      });
    }
    for (const p of state.classPhotoAttachments) {
      atts.push({ name: p.name, mime_type: p.mime_type, data_base64: p.data_base64 });
    }

    const mode = settings.quickClassMode ? "quick_class" : "teacher_recording";
    const prompt =
      qNote ||
      (state.recordedAudio && state.classPhotoAttachments.length > 0
        ? "Listen to the teacher's recording AND look at the attached classroom picture/worksheet. Answer the teacher's spoken question grounded in what is visible in the picture, and give the full structured learning breakdown."
        : state.recordedAudio
        ? "Transcribe what my Finnish teacher said and give the full A–G learning explanation."
        : "Explain this classroom worksheet/picture in simple Finnish and English.");

    state.isSending = true;
    renderActiveView();

    try {
      const resp = await flApi("/api/finnish-lab/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          mode,
          level: settings.level || "A1",
          history: [],
          attachments: atts.map((a) => ({ mime_type: a.mime_type, data_base64: a.data_base64 })),
        }),
      });
      state.classResult = resp;
      state.classTranscriptEditable = resp.finnish_tts || "";

      // Also save as a continuable classroom conversation so follow-up voice/text questions keep full context!
      const conv = await DB.saveConversation({
        title: `Class: ${(resp.finnish_tts || "Teacher Recording").slice(0, 40)}`,
        kind: "class",
        messages: [
          { id: DB.uid("msg"), role: "user", text: prompt, attachments: atts, at: new Date().toISOString() },
          { id: DB.uid("msg"), role: "assistant", text: resp.reply, finnishTts: resp.finnish_tts, mode: resp.mode, model: resp.model, at: new Date().toISOString() },
        ],
      });
      state.conversations.unshift(conv);
      state.activeConvId = conv.id;
      DB.touchStudyStreak("listening");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      state.isSending = false;
      renderActiveView();
    }
  }

  /* ---------- HOMEWORK ASSISTANT ---------- */
  async function runHomeworkAction(hwMode) {
    if (state.isSending) return;
    const exerciseNum = (document.getElementById("fl-hw-exercise")?.value || "").trim();
    const studentAnswer = (document.getElementById("fl-hw-answer")?.value || "").trim();
    const customQ = (document.getElementById("fl-hw-question")?.value || "").trim();

    if (state.classPhotoAttachments.length === 0 && !customQ && !studentAnswer) {
      toast("Upload a homework photo/PDF or type your exercise first.", "warning");
      return;
    }

    const modeMap = {
      hint: "homework_hint",
      explain: "homework_explain",
      check: "homework_check",
      answer: "homework_answer",
    };
    const promptParts = [];
    if (exerciseNum) promptParts.push(`Focus specifically on exercise/question: ${exerciseNum}.`);
    if (customQ) promptParts.push(`Question: ${customQ}`);
    if (studentAnswer) promptParts.push(`My written answer: "${studentAnswer}"`);
    if (!promptParts.length) promptParts.push("Help me with the attached homework worksheet.");

    state.activeTab = "tutor";
    await sendTutorMessage(promptParts.join("\n"), {
      kind: "homework",
      mode: modeMap[hwMode] || "homework_hint",
      attachments: state.classPhotoAttachments.slice(),
      keepPending: true,
    });
  }

  /* ---------- CROP / ROTATE IMAGE MODAL ---------- */
  function openCropModal(listName, idx) {
    const list = listName === "class" ? state.classPhotoAttachments : state.pendingAttachments;
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
    const list = state.cropTarget.listName === "class" ? state.classPhotoAttachments : state.pendingAttachments;
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
          <strong style="color:#fff;">✂️ Rotate &amp; Crop Worksheet Photo</strong>
          <button type="button" class="fl-btn sm" id="fl-crop-close">✕</button>
        </div>
        <div style="text-align:center;background:#030d1d;padding:10px;border-radius:10px;margin-bottom:10px;">
          <canvas id="fl-crop-canvas" style="max-width:100%;max-height:340px;border-radius:6px;"></canvas>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
          <button type="button" class="fl-btn sm" id="fl-crop-rot-l">↺ Rotate -90°</button>
          <button type="button" class="fl-btn sm" id="fl-crop-rot-r">↻ Rotate +90°</button>
          <label style="font-size:0.78rem;color:#cbd5e1;display:flex;align-items:center;gap:6px;margin-left:auto;">
            Crop edges:
            <input type="range" id="fl-crop-range" min="0" max="25" value="${state.cropTarget.cropMargin}" />
          </label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button type="button" class="fl-btn" id="fl-crop-cancel">Cancel</button>
          <button type="button" class="fl-btn primary" id="fl-crop-apply">✓ Apply Changes</button>
        </div>
      </div>
    `;

    const canvas = document.getElementById("fl-crop-canvas");
    const img = new Image();
    img.onload = () => {
      drawCropped(canvas, img, state.cropTarget.angle, state.cropTarget.cropMargin);
    };
    img.src = att.previewUrl;

    document.getElementById("fl-crop-close").onclick = () => { state.cropTarget = null; renderCropModal(); };
    document.getElementById("fl-crop-cancel").onclick = () => { state.cropTarget = null; renderCropModal(); };
    document.getElementById("fl-crop-rot-l").onclick = () => { state.cropTarget.angle = (state.cropTarget.angle - 90 + 360) % 360; drawCropped(canvas, img, state.cropTarget.angle, state.cropTarget.cropMargin); };
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
      toast("Photo updated!", "success");
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

  /* ---------- SURVIVAL PHRASES & VOCAB EXTRACTOR ---------- */
  const SURVIVAL_PHRASES = [
    { fi: "Anteeksi, voitko toistaa?", en: "Can you repeat?" },
    { fi: "Voitko puhua hitaammin?", en: "Speak slower?" },
    { fi: "Mitä tämä tarkoittaa?", en: "What does this mean?" },
    { fi: "Minulla on kysymys.", en: "I have a question." },
    { fi: "En ymmärrä vielä.", en: "I don't understand yet." },
  ];

  async function saveAllVocabFromReply(replyText) {
    if (!replyText) return 0;
    const lines = replyText.split("\n");
    let inVocab = false;
    let added = 0;
    for (const raw of lines) {
      const ln = raw.trim();
      if (/^#{1,4}\s*E\.\s*IMPORTANT VOCABULARY/i.test(ln) || /IMPORTANT VOCABULARY/i.test(ln)) {
        inVocab = true;
        continue;
      }
      if (inVocab && /^#{1,4}\s*[F-H]\./i.test(ln)) break;
      if (!inVocab || !ln) continue;
      // Match: - **word** (base form: *perusmuoto*) — English meaning
      const m = ln.match(/\*\*(.+?)\*\*(?:[^—–:-]*\((?:base form:\s*)?\*?([^)*]+)\*?\))?\s*[—–:-]\s*(.+)/i);
      if (m) {
        const fi = m[1].trim();
        const base = (m[2] || fi).replace(/base form:/i, "").trim();
        const en = m[3].replace(/\*/g, "").trim();
        if (fi && en) {
          const r = await DB.addFlashcard({ fi, en, baseForm: base, collection: "Class Notes" });
          if (r.added) added += 1;
        }
      }
    }
    state.flashcards = await DB.listFlashcards();
    return added;
  }

  /* ---------- RENDER: MAIN SHELL ---------- */
  function renderActiveView() {
    const root = document.getElementById("finnish-lab-root");
    if (!root) return;
    const settings = DB.getSettings();
    const prog = DB.getProgress();
    const dueCount = state.flashcards.filter((c) => (c.dueAt || 0) <= Date.now()).length;

    root.innerHTML = `
      <div class="fl-shell">
        <div class="fl-topbar">
          <div class="fl-brand">
            <div class="fl-brand-flag">🇫🇮</div>
            <div>
              <h1 class="fl-brand-title">Finnish Lab</h1>
              <div class="fl-brand-sub">Tervetuloa! • 🔥 ${prog.streakDays || 0}d streak • 🃏 ${dueCount} due</div>
            </div>
          </div>
          <div class="fl-topbar-right">
            ${state.isRecording ? `<span class="fl-rec-indicator"><span class="fl-rec-dot"></span> Recording <span class="fl-rec-timer">00:00</span> <button type="button" class="fl-btn danger sm" id="fl-top-stop-rec">⏹ Stop</button></span>` : ""}
            <select id="fl-level-select" class="fl-select" style="width:auto;padding:4px 8px;font-size:0.76rem;font-weight:700;" title="Learning level">
              <option value="A1" ${settings.level === "A1" ? "selected" : ""}>A1</option>
              <option value="A2" ${settings.level === "A2" ? "selected" : ""}>A2</option>
            </select>
            <button type="button" id="fl-quick-class-toggle" class="fl-btn sm ${settings.quickClassMode ? "active" : ""}" title="Fast 4-line responses for live Finnish class">
              ⚡ Quick: ${settings.quickClassMode ? "ON" : "OFF"}
            </button>
            <button type="button" id="fl-focus-toggle" class="fl-btn sm ${state.focusMode ? "active" : ""}" title="Toggle full-screen focus mode (hide Studio sidebar)">
              ${state.focusMode ? "↙ Exit Focus" : "⛶ Focus"}
            </button>
            <span class="fl-pill fl-quota-badge ok">AI: ready</span>
          </div>
        </div>

        <!-- Exactly 5 Main Navigation Tabs -->
        <nav class="fl-tabs" role="tablist" aria-label="Finnish Learning Lab tabs">
          <button type="button" class="fl-tab-btn ${state.activeTab === "home" ? "active" : ""}" data-fl-tab="home">🏠 <span>HOME</span></button>
          <button type="button" class="fl-tab-btn ${state.activeTab === "class" ? "active" : ""}" data-fl-tab="class">🎙️ <span>CLASS</span></button>
          <button type="button" class="fl-tab-btn ${state.activeTab === "tutor" ? "active" : ""}" data-fl-tab="tutor">💬 <span>TUTOR</span></button>
          <button type="button" class="fl-tab-btn ${state.activeTab === "learn" ? "active" : ""}" data-fl-tab="learn">📚 <span>LEARN</span></button>
          <button type="button" class="fl-tab-btn ${state.activeTab === "review" ? "active" : ""}" data-fl-tab="review">⭐ <span>REVIEW${dueCount ? ` (${dueCount})` : ""}</span></button>
        </nav>

        <div id="fl-tab-content">
          ${renderTabBody(settings, prog, dueCount)}
        </div>
      </div>
    `;

    updateQuotaBadges();
    bindMainEvents();
  }

  function renderTabBody(settings, prog, dueCount) {
    if (state.activeTab === "home") return renderHomeTab(settings, prog, dueCount);
    if (state.activeTab === "class") return renderClassTab(settings);
    if (state.activeTab === "tutor") return renderTutorTab(settings);
    if (state.activeTab === "learn") return renderLearnTab(settings);
    return renderReviewTab(settings, prog, dueCount);
  }

  /* ---------- TAB 1: HOME (CLEAN, ABOVE-THE-FOLD FIRST) ---------- */
  function renderHomeTab(settings, prog, dueCount) {
    const vocabPack = CURR.getTodayVocabPack();
    const todayGrammar = CURR.getTodayGrammarTopic();
    const recentConv = state.conversations[0];

    return `
      <!-- Four Large Primary Buttons Right at the Top -->
      <div class="fl-grid-4" style="margin-bottom:14px;">
        <button type="button" class="fl-hero-btn primary" data-fl-action="goto-record">
          <span class="fl-hero-icon">🎙️</span>
          <span class="fl-hero-label">Record Teacher</span>
          <span class="fl-hero-sub">Record class audio → simple FI + EN</span>
        </button>
        <button type="button" class="fl-hero-btn" data-fl-action="goto-scan">
          <span class="fl-hero-icon">📸</span>
          <span class="fl-hero-label">Scan &amp; Ask</span>
          <span class="fl-hero-sub">Snap worksheet, board, or PDF</span>
        </button>
        <button type="button" class="fl-hero-btn" data-fl-action="goto-tutor">
          <span class="fl-hero-icon">💬</span>
          <span class="fl-hero-label">Talk to Tutor</span>
          <span class="fl-hero-sub">Ask anything by voice or text</span>
        </button>
        <button type="button" class="fl-hero-btn" data-fl-action="goto-learn">
          <span class="fl-hero-icon">📚</span>
          <span class="fl-hero-label">Learn &amp; Practise</span>
          <span class="fl-hero-sub">Daily lesson, grammar &amp; roleplay</span>
        </button>
      </div>

      <div class="fl-grid-2">
        <!-- Today's 5 Daily Vocabulary Words -->
        <div class="fl-card">
          <h2 class="fl-card-title">📖 5 Daily Words — ${esc(vocabPack.topic)}</h2>
          ${vocabPack.words
            .map(
              (w, idx) => `
            <div class="fl-vocab-row">
              <div>
                <strong style="color:#fff;font-size:0.95rem;">${esc(w.fi)}</strong>
                <span style="color:#7dd3fc;font-size:0.82rem;"> — ${esc(w.en)}</span>
                <div style="font-size:0.74rem;color:#94a3b8;">${esc(w.exFi)} <em>(${esc(w.exEn)})</em></div>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0;">
                <button type="button" class="fl-btn sm" data-fl-speak="${esc(w.fi + ". " + w.exFi)}">🔊</button>
                <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(w.fi)}">🐢</button>
                <button type="button" class="fl-btn sm" data-fl-save-vocab="${idx}" title="Save to Flashcards">⭐</button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <!-- Today's Lesson + Continue Session + Flashcards Due -->
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="fl-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">
              <h2 class="fl-card-title" style="margin:0;">✨ Today's Lesson (${settings.dailyTargetMinutes} min)</h2>
              <span class="fl-pill ok">🔥 ${prog.streakDays || 0} day streak</span>
            </div>
            <div style="font-size:0.9rem;font-weight:700;color:#7dd3fc;margin-bottom:4px;">${esc(todayGrammar.title)}</div>
            <p style="margin:0 0 10px;font-size:0.82rem;color:#cbd5e1;line-height:1.45;">${esc(todayGrammar.en)}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="fl-btn primary sm" data-fl-open-grammar="${todayGrammar.id}">Start Grammar Lesson →</button>
              <button type="button" class="fl-btn sm" data-fl-action="goto-daily">Open Full Daily Plan</button>
            </div>
          </div>

          <div class="fl-card">
            <h2 class="fl-card-title">🕒 Continue Studying</h2>
            ${
              recentConv
                ? `<div style="margin-bottom:10px;padding:10px;background:#061428;border-radius:9px;border:1px solid rgba(56,189,248,0.25);">
                    <div style="font-size:0.85rem;font-weight:700;color:#fff;">${esc(recentConv.title)}</div>
                    <div style="font-size:0.74rem;color:#94a3b8;">${(recentConv.messages || []).length} messages • ${esc((recentConv.updatedAt || "").slice(0, 10))}</div>
                    <button type="button" class="fl-btn primary sm" style="margin-top:8px;" data-fl-open-conv="${recentConv.id}">Continue Conversation →</button>
                  </div>`
                : `<p style="font-size:0.82rem;color:#94a3b8;margin:0 0 10px;">No saved classroom or tutor conversation yet. Start by recording your teacher or asking a question!</p>`
            }
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);">
              <span style="font-size:0.82rem;color:#cbd5e1;">Flashcards due for review: <strong>${dueCount}</strong></span>
              <button type="button" class="fl-btn sm" data-fl-action="goto-flashcards">Review Cards →</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ---------- TAB 2: CLASS (SIMPLE 2-MODE SWITCH: LIVE CLASS | HOMEWORK) ---------- */
  function renderClassTab(settings) {
    const isLive = state.classSubTab !== "homework";
    return `
      <div class="fl-privacy-slim" style="margin-bottom:10px;">
        <span>🔒 Manual recording only — please ask permission before recording teachers or classmates.</span>
      </div>

      <div class="fl-subtabs">
        <button type="button" class="fl-btn sm ${isLive ? "active" : ""}" data-fl-class-sub="live">🎙️ Live Class (Record + Photo)</button>
        <button type="button" class="fl-btn sm ${!isLive ? "active" : ""}" data-fl-class-sub="homework">📚 Homework Assistant (4 Modes)</button>
      </div>

      ${
        isLive
          ? `<div class="fl-card">
              <h2 class="fl-card-title">🎙️ Record Teacher &amp; Combine with Classroom Photo</h2>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
                ${
                  state.isRecording && state.recordingTarget === "class"
                    ? `<button type="button" class="fl-btn danger" id="fl-class-stop-rec" style="padding:12px 18px;font-size:0.95rem;">⏹ Stop Recording (<span class="fl-rec-timer">00:00</span>)</button>`
                    : `<button type="button" class="fl-btn danger" id="fl-class-start-rec" style="padding:12px 18px;font-size:0.95rem;">🎙️ Record Teacher</button>`
                }
                <label class="fl-btn primary" style="cursor:pointer;padding:11px 14px;">
                  📷 Snap Board / Photo
                  <input type="file" id="fl-class-camera" accept="image/*" capture="environment" style="display:none;" />
                </label>
                <label class="fl-btn" style="cursor:pointer;">
                  📎 Photo / PDF
                  <input type="file" id="fl-class-files" accept="image/*,application/pdf" multiple style="display:none;" />
                </label>
                <label class="fl-btn" style="cursor:pointer;">
                  📁 Audio File
                  <input type="file" id="fl-class-audio-file" accept="audio/*" style="display:none;" />
                </label>
              </div>

              ${
                state.recordedAudio
                  ? `<div style="background:#061428;border:1px solid rgba(56,189,248,0.35);border-radius:10px;padding:10px;margin-bottom:10px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:0.8rem;font-weight:700;color:#7dd3fc;">🎧 Preview Recording (${state.recordedAudio.durationSec}s)</span>
                        <button type="button" class="fl-btn sm" id="fl-class-clear-audio">🗑️ Remove</button>
                      </div>
                      <audio controls src="${state.recordedAudio.blobUrl}" style="width:100%;height:36px;"></audio>
                    </div>`
                  : ""
              }

              ${
                state.classPhotoAttachments.length
                  ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                      ${state.classPhotoAttachments
                        .map(
                          (p, i) => `
                        <div class="fl-att-chip">
                          ${p.previewUrl ? `<img src="${p.previewUrl}" class="fl-att-thumb" alt="" />` : "📄"}
                          <span>${esc(p.name.slice(0, 18))}</span>
                          ${p.previewUrl ? `<button type="button" class="fl-btn sm" style="padding:2px 6px;" data-fl-crop-class="${i}" title="Rotate / Crop">✂️</button>` : ""}
                          <button type="button" class="fl-btn sm" style="padding:2px 6px;" data-fl-rm-class-photo="${i}">✕</button>
                        </div>
                      `
                        )
                        .join("")}
                      <button type="button" class="fl-btn sm" id="fl-class-clear-photos">Clear Photos</button>
                    </div>`
                  : ""
              }

              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                <input type="text" id="fl-class-extra-q" class="fl-input" style="flex:1;min-width:200px;" placeholder="Optional note (e.g. 'Answer the teacher's question using the picture')" />
                <button type="button" class="fl-btn primary" id="fl-class-transcribe" ${state.isSending ? "disabled" : ""} style="padding:11px 18px;">
                  ${state.isSending ? "⏳ Listening & Explaining..." : "✨ Transcribe & Explain"}
                </button>
              </div>

              <!-- 1-Tap Classroom Survival Phrases -->
              <div style="padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
                <div style="font-size:0.75rem;font-weight:700;color:#7dd3fc;">💬 Quick Classroom Phrases (tap to hear Finnish):</div>
                <div class="fl-survival-strip">
                  ${SURVIVAL_PHRASES.map(
                    (p) => `<button type="button" class="fl-survival-btn" data-fl-speak="${esc(p.fi)}">🔊 <strong>${esc(p.fi)}</strong> <em>(${esc(p.en)})</em></button>`
                  ).join("")}
                </div>
              </div>
            </div>`
          : `<div class="fl-card">
              <h2 class="fl-card-title">📚 Homework &amp; Worksheet Assistant</h2>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                <label class="fl-btn primary" style="cursor:pointer;">
                  📷 Camera
                  <input type="file" id="fl-class-camera" accept="image/*" capture="environment" style="display:none;" />
                </label>
                <label class="fl-btn" style="cursor:pointer;">
                  📎 Upload Photos / PDF
                  <input type="file" id="fl-class-files" accept="image/*,application/pdf" multiple style="display:none;" />
                </label>
                ${state.classPhotoAttachments.length ? `<button type="button" class="fl-btn sm" id="fl-class-clear-photos">Clear (${state.classPhotoAttachments.length})</button>` : ""}
              </div>

              ${
                state.classPhotoAttachments.length
                  ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                      ${state.classPhotoAttachments
                        .map(
                          (p, i) => `
                        <div class="fl-att-chip">
                          ${p.previewUrl ? `<img src="${p.previewUrl}" class="fl-att-thumb" alt="" />` : "📄"}
                          <span>${esc(p.name.slice(0, 18))}</span>
                          ${p.previewUrl ? `<button type="button" class="fl-btn sm" style="padding:2px 6px;" data-fl-crop-class="${i}" title="Rotate / Crop">✂️</button>` : ""}
                          <button type="button" class="fl-btn sm" style="padding:2px 6px;" data-fl-rm-class-photo="${i}">✕</button>
                        </div>
                      `
                        )
                        .join("")}
                    </div>`
                  : ""
              }

              <div class="fl-grid-2" style="gap:8px;margin-bottom:8px;">
                <input type="text" id="fl-hw-exercise" class="fl-input" placeholder="Exercise # (e.g. Question 4)" />
                <input type="text" id="fl-hw-question" class="fl-input" placeholder="Ask (e.g. Explain exercise 3)" />
              </div>
              <textarea id="fl-hw-answer" class="fl-textarea" rows="3" style="margin-bottom:10px;" placeholder="Write your own Finnish answer here to check it..."></textarea>

              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                <button type="button" class="fl-btn" data-fl-hw="hint" ${state.isSending ? "disabled" : ""}>💡 Hint First</button>
                <button type="button" class="fl-btn" data-fl-hw="explain" ${state.isSending ? "disabled" : ""}>📖 Explain</button>
                <button type="button" class="fl-btn success" data-fl-hw="check" ${state.isSending ? "disabled" : ""}>✅ Check My Answer</button>
                <button type="button" class="fl-btn primary" data-fl-hw="answer" ${state.isSending ? "disabled" : ""}>👁️ Show Answer</button>
              </div>
            </div>`
      }

      ${
        state.classResult
          ? `<div class="fl-card" style="margin-top:14px;border-color:rgba(56,189,248,0.45);">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                <h2 class="fl-card-title" style="margin:0;">🎓 Teacher Explanation Result</h2>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button type="button" class="fl-btn sm" id="fl-res-speak">🔊 Listen</button>
                  <button type="button" class="fl-btn sm" id="fl-res-slow">🐢 Slow</button>
                  <button type="button" class="fl-btn sm" id="fl-res-stop">⏹ Stop</button>
                  <button type="button" class="fl-btn primary sm" id="fl-res-save-all-vocab">⭐ Save All Words</button>
                  <button type="button" class="fl-btn success sm" id="fl-res-save-note">💾 Save Note</button>
                  <button type="button" class="fl-btn sm" id="fl-res-export">⬇️ Export .txt</button>
                  <button type="button" class="fl-btn sm" id="fl-res-followup">💬 Follow-up →</button>
                </div>
              </div>
              <div class="fl-msg assistant" style="max-width:100%;">${renderMarkdownLite(state.classResult.reply)}</div>
              <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
                <label style="font-size:0.78rem;color:#94a3b8;display:block;margin-bottom:4px;">✏️ Manually correct transcript or select a sentence to re-explain:</label>
                <div style="display:flex;gap:8px;">
                  <input type="text" id="fl-res-edit-transcript" class="fl-input" value="${esc(state.classTranscriptEditable)}" placeholder="Type or correct a Finnish sentence..." />
                  <button type="button" class="fl-btn primary sm" id="fl-res-reexplain">Explain Sentence</button>
                </div>
              </div>
            </div>`
          : ""
      }
    `;
  }

  /* ---------- TAB 3: TUTOR (ONE UNIVERSAL MULTIMODAL ASK AI INTERFACE) ---------- */
  function renderTutorTab(settings) {
    const conv = getActiveConv();
    const msgs = conv ? conv.messages || [] : [];

    return `
      <div class="fl-chat-layout">
        <!-- Conversations Sidebar -->
        <aside class="fl-conv-sidebar">
          <div style="display:flex;gap:6px;margin-bottom:8px;">
            <button type="button" class="fl-btn primary sm" id="fl-new-conv" style="flex:1;">+ New Chat</button>
          </div>
          <input type="text" id="fl-conv-search" class="fl-input" style="padding:6px 9px;font-size:0.78rem;margin-bottom:8px;" placeholder="Search chats..." />
          <div id="fl-conv-list">
            ${
              state.conversations.length
                ? state.conversations
                    .map(
                      (c) => `
                <div class="fl-conv-item ${c.id === state.activeConvId ? "active" : ""}" data-fl-select-conv="${c.id}">
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.title)}</span>
                  <span style="display:flex;gap:3px;flex-shrink:0;">
                    <button type="button" class="fl-btn sm" style="padding:2px 5px;" data-fl-rename-conv="${c.id}" title="Rename">✏️</button>
                    <button type="button" class="fl-btn sm" style="padding:2px 5px;" data-fl-del-conv="${c.id}" title="Delete">🗑️</button>
                  </span>
                </div>
              `
                    )
                    .join("")
                : `<div style="font-size:0.76rem;color:#94a3b8;padding:8px;">Start your first Finnish conversation!</div>`
            }
          </div>
        </aside>

        <!-- Main Multimodal Chat Box -->
        <div class="fl-chat-box">
          <div class="fl-chat-header">
            <div>
              <strong style="color:#fff;font-size:0.92rem;">${esc(conv ? conv.title : "Personal AI Finnish Teacher")}</strong>
              <div style="font-size:0.72rem;color:#94a3b8;">Context preserved across messages, photos, PDFs &amp; audio</div>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;">
              <button type="button" class="fl-btn sm ${settings.answerMode === "quick_answer" ? "active" : ""}" data-fl-ans-mode="quick_answer">⚡ Quick Answer</button>
              <button type="button" class="fl-btn sm ${settings.answerMode === "teach_me" ? "active" : ""}" data-fl-ans-mode="teach_me">📖 Teach Me</button>
              <button type="button" class="fl-btn sm ${settings.answerMode === "practice" ? "active" : ""}" data-fl-ans-mode="practice">🗣️ Practice With Me</button>
            </div>
          </div>

          <div class="fl-chat-messages" id="fl-tutor-messages">
            ${
              msgs.length
                ? msgs.map((m, idx) => renderChatMessage(m, idx)).join("")
                : `<div class="fl-msg assistant">
                    <strong>Hei! Olen sinun suomen opettajasi. 🇫🇮</strong><br/>
                    Ask me anything about Finnish — type in English or beginner Finnish, tap 🎙️ to record audio, or tap 📷 to upload a worksheet photo or PDF!
                  </div>`
            }
            ${state.isSending ? `<div class="fl-msg assistant">⏳ Thinking like your Finnish teacher...</div>` : ""}
          </div>

          <!-- Quick Starter Prompts -->
          <div class="fl-quick-chips">
            <button type="button" class="fl-chip" data-fl-chip="Can you explain that in simple Finnish?">Selitys suomeksi</button>
            <button type="button" class="fl-chip" data-fl-chip="Why is that answer correct?">Why is it correct?</button>
            <button type="button" class="fl-chip" data-fl-chip="Give me another simple A1 example.">Another example</button>
            <button type="button" class="fl-chip" data-fl-chip="How would a Finnish person normally say this in spoken Finnish (puhekieli)?">Spoken Finnish</button>
            <button type="button" class="fl-chip" data-fl-chip="Break the key Finnish words into syllables and explain pronunciation.">Syllables</button>
          </div>

          ${
            state.pendingAttachments.length
              ? `<div class="fl-att-strip">
                  ${state.pendingAttachments
                    .map(
                      (a, i) => `
                    <div class="fl-att-chip">
                      ${a.previewUrl && a.mime_type.startsWith("image/") ? `<img src="${a.previewUrl}" class="fl-att-thumb" alt="" />` : a.mime_type.startsWith("audio/") ? "🎙️" : "📄"}
                      <span>${esc(a.name.slice(0, 20))}</span>
                      ${a.previewUrl && a.mime_type.startsWith("image/") ? `<button type="button" class="fl-btn sm" style="padding:2px 5px;" data-fl-crop-pending="${i}">✂️</button>` : ""}
                      <button type="button" class="fl-btn sm" style="padding:2px 5px;" data-fl-rm-pending="${i}">✕</button>
                    </div>
                  `
                    )
                    .join("")}
                </div>`
              : ""
          }

          <!-- Unified Multimodal Composer -->
          <div class="fl-composer">
            <div class="fl-composer-tools">
              <label class="fl-btn sm" style="cursor:pointer;" title="Take a photo">
                📷 Camera
                <input type="file" id="fl-tutor-camera" accept="image/*" capture="environment" style="display:none;" />
              </label>
              <label class="fl-btn sm" style="cursor:pointer;" title="Upload image or PDF">
                📎 Image/PDF
                <input type="file" id="fl-tutor-file" accept="image/*,application/pdf,audio/*" multiple style="display:none;" />
              </label>
              ${
                state.isRecording && state.recordingTarget === "tutor"
                  ? `<button type="button" class="fl-btn danger sm" id="fl-tutor-stop-rec">⏹ Stop (<span class="fl-rec-timer">00:00</span>)</button>`
                  : `<button type="button" class="fl-btn sm" id="fl-tutor-start-rec">🎙️ Record Audio</button>`
              }
              <button type="button" class="fl-btn sm" id="fl-tutor-dictate" title="Voice-to-text question">🗣️ Speak</button>
              <select id="fl-voice-lang" class="fl-select" style="width:auto;padding:4px 8px;font-size:0.74rem;" title="Voice recognition language">
                <option value="fi-FI" ${settings.voiceLang === "fi-FI" ? "selected" : ""}>Voice: FI</option>
                <option value="en-US" ${settings.voiceLang === "en-US" ? "selected" : ""}>Voice: EN</option>
              </select>
            </div>
            <div class="fl-composer-row">
              <textarea id="fl-tutor-input" class="fl-textarea" rows="2" placeholder="Ask anything about Finnish, or explain what you attached..."></textarea>
              <button type="button" class="fl-btn primary" id="fl-tutor-send" ${state.isSending ? "disabled" : ""} style="padding:12px 18px;">Send ➤</button>
            </div>
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
                ? `<img src="${a.previewUrl}" style="max-width:140px;max-height:110px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);" alt="" />`
                : `<span class="fl-att-chip">${(a.mime_type || "").startsWith("audio/") ? "🎙️" : "📄"} ${esc(a.name || "Attachment")}</span>`
            )
            .join("")}
        </div>`
      : "";
    const actionsHtml =
      m.role === "assistant" && !m.isError
        ? `<div class="fl-msg-actions">
            <button type="button" class="fl-btn sm" data-fl-speak="${esc(m.finnishTts || m.text.slice(0, 220))}">🔊 Listen</button>
            <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(m.finnishTts || m.text.slice(0, 220))}">🐢 Slow</button>
            <button type="button" class="fl-btn sm" data-fl-stop-speak="1">⏹ Stop</button>
            <button type="button" class="fl-btn sm" data-fl-save-msg-note="${idx}">📝 Save Note</button>
            <button type="button" class="fl-btn sm" data-fl-save-msg-card="${idx}">⭐ Save Card</button>
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

  /* ---------- TAB 4: LEARN (DAILY, GRAMMAR, ANATOMY, READING, WRITING, LISTENING, SPEAKING) ---------- */
  function renderLearnTab(settings) {
    const sub = state.learnSubTab;
    return `
      <div class="fl-subtabs">
        <button type="button" class="fl-btn sm ${sub === "daily" ? "active" : ""}" data-fl-learn="daily">📅 Daily Plan</button>
        <button type="button" class="fl-btn sm ${sub === "grammar" ? "active" : ""}" data-fl-learn="grammar">📐 Grammar (17)</button>
        <button type="button" class="fl-btn sm ${sub === "anatomy" ? "active" : ""}" data-fl-learn="anatomy">🔎 Word Anatomy</button>
        <button type="button" class="fl-btn sm ${sub === "reading" ? "active" : ""}" data-fl-learn="reading">📰 Reading</button>
        <button type="button" class="fl-btn sm ${sub === "writing" ? "active" : ""}" data-fl-learn="writing">✍️ Writing</button>
        <button type="button" class="fl-btn sm ${sub === "listening" ? "active" : ""}" data-fl-learn="listening">🎧 Listening</button>
        <button type="button" class="fl-btn sm ${sub === "speaking" ? "active" : ""}" data-fl-learn="speaking">🗣️ Speaking &amp; Roleplay</button>
      </div>
      ${
        sub === "daily"
          ? renderLearnDaily(settings)
          : sub === "grammar"
          ? renderLearnGrammar()
          : sub === "anatomy"
          ? renderLearnAnatomy()
          : sub === "reading"
          ? renderLearnReading()
          : sub === "writing"
          ? renderLearnWriting()
          : sub === "listening"
          ? renderLearnListening()
          : renderLearnSpeaking()
      }
    `;
  }

  function renderLearnDaily(settings) {
    const pack = CURR.getTodayVocabPack();
    const gram = CURR.getTodayGrammarTopic();
    return `
      <div class="fl-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <h2 class="fl-card-title" style="margin:0;">📅 Today's ${settings.dailyTargetMinutes}-Minute Study Plan (${esc(settings.level)})</h2>
          <select id="fl-daily-target" class="fl-select" style="width:auto;padding:4px 8px;font-size:0.78rem;">
            <option value="5" ${settings.dailyTargetMinutes == 5 ? "selected" : ""}>Target: 5 min</option>
            <option value="10" ${settings.dailyTargetMinutes == 10 ? "selected" : ""}>Target: 10 min</option>
            <option value="20" ${settings.dailyTargetMinutes == 20 ? "selected" : ""}>Target: 20 min</option>
          </select>
        </div>
        <div class="fl-grid-2">
          <div>
            <h3 style="margin:0 0 8px;font-size:0.9rem;color:#7dd3fc;">1. Five Words — ${esc(pack.topic)}</h3>
            ${pack.words
              .map(
                (w, i) => `
              <div class="fl-vocab-row">
                <div><strong>${esc(w.fi)}</strong> — ${esc(w.en)}<div style="font-size:0.74rem;color:#94a3b8;">Base: ${esc(w.base)} • Spoken: ${esc(w.spoken)}</div></div>
                <div style="display:flex;gap:4px;">
                  <button type="button" class="fl-btn sm" data-fl-speak="${esc(w.fi)}">🔊</button>
                  <button type="button" class="fl-btn sm" data-fl-save-vocab="${i}">⭐</button>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
          <div>
            <h3 style="margin:0 0 8px;font-size:0.9rem;color:#7dd3fc;">2. Today's Grammar + Quick Check</h3>
            <p style="font-size:0.84rem;color:#e2e8f0;margin:0 0 8px;"><strong>${esc(gram.title)}</strong><br/>${esc(gram.en)}</p>
            <div style="background:#061428;padding:10px;border-radius:10px;border:1px solid rgba(56,189,248,0.25);margin-bottom:10px;">
              <div style="font-size:0.82rem;font-weight:700;margin-bottom:6px;">Quick Question: ${esc(gram.quiz.q)}</div>
              ${gram.quiz.options
                .map(
                  (opt, idx) =>
                    `<button type="button" class="fl-btn sm" style="margin:3px;" data-fl-quiz-ans="${idx === gram.quiz.ans ? "1" : "0"}" data-fl-quiz-exp="${esc(gram.quiz.exp)}">${esc(opt)}</button>`
                )
                .join("")}
              <div id="fl-daily-quiz-out" style="margin-top:6px;font-size:0.78rem;color:#6ee7b7;"></div>
            </div>
            <button type="button" class="fl-btn success" id="fl-complete-daily">✓ Mark Today's Lesson Complete</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderLearnGrammar() {
    const topic = CURR.GRAMMAR_TOPICS.find((t) => t.id === state.selectedGrammarId) || CURR.GRAMMAR_TOPICS[0];
    return `
      <div class="fl-chat-layout">
        <aside class="fl-conv-sidebar">
          ${CURR.GRAMMAR_TOPICS.map(
            (t) =>
              `<div class="fl-conv-item ${t.id === topic.id ? "active" : ""}" data-fl-gram-id="${t.id}">${esc(t.title)}</div>`
          ).join("")}
        </aside>
        <div class="fl-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
            <h2 class="fl-card-title" style="margin:0;">${esc(topic.title)}</h2>
            <div style="display:flex;gap:6px;">
              <button type="button" class="fl-btn sm" data-fl-speak="${esc((topic.pos || []).join(". "))}">🔊 Listen Examples</button>
              <button type="button" class="fl-btn sm" id="fl-gram-save-note">📝 Save to Review</button>
            </div>
          </div>
          <div class="fl-grid-2" style="margin-bottom:12px;">
            <div style="background:#061428;padding:12px;border-radius:10px;">
              <strong style="color:#7dd3fc;font-size:0.78rem;">🇬🇧 SIMPLE ENGLISH</strong>
              <p style="margin:6px 0 0;font-size:0.86rem;line-height:1.5;">${esc(topic.en)}</p>
            </div>
            <div style="background:#061428;padding:12px;border-radius:10px;">
              <strong style="color:#6ee7b7;font-size:0.78rem;">🇫🇮 SELITYS SUOMEKSI</strong>
              <p style="margin:6px 0 0;font-size:0.86rem;line-height:1.5;">${esc(topic.fi)}</p>
            </div>
          </div>
          <div style="margin-bottom:10px;">
            <strong style="color:#fff;font-size:0.84rem;">Examples:</strong>
            <ul style="margin:6px 0;padding-left:18px;font-size:0.84rem;color:#e2e8f0;">
              ${(topic.pos || []).map((x) => `<li>${esc(x)}</li>`).join("")}
              ${(topic.neg || []).map((x) => `<li style="color:#fca5a5;">${esc(x)}</li>`).join("")}
              ${(topic.q || []).map((x) => `<li style="color:#7dd3fc;">${esc(x)}</li>`).join("")}
            </ul>
          </div>
          ${
            (topic.mistakes || []).length
              ? `<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:9px;padding:10px;margin-bottom:12px;font-size:0.8rem;color:#fde68a;">
                  <strong>⚠️ Common Mistakes:</strong> ${topic.mistakes.map(esc).join(" • ")}
                </div>`
              : ""
          }
          <div style="background:#061428;padding:12px;border-radius:10px;border:1px solid rgba(56,189,248,0.28);">
            <strong style="font-size:0.84rem;">Mini Exercise: ${esc(topic.quiz.q)}</strong>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
              ${topic.quiz.options
                .map(
                  (o, i) =>
                    `<button type="button" class="fl-btn sm" data-fl-quiz-ans="${i === topic.quiz.ans ? "1" : "0"}" data-fl-quiz-exp="${esc(topic.quiz.exp)}">${esc(o)}</button>`
                )
                .join("")}
            </div>
            <div id="fl-daily-quiz-out" style="margin-top:8px;font-size:0.8rem;"></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderLearnAnatomy() {
    return `
      <div class="fl-card">
        <h2 class="fl-card-title">🔎 Word Anatomy &amp; Vocabulary Search</h2>
        <p style="margin:0 0 10px;font-size:0.82rem;color:#cbd5e1;">Enter any Finnish word or inflected form (e.g. <em>kaupassa, ymmärrän, Helsingistä, kahvia</em>) to inspect its base form, syllables, cases, verb conjugation, and spoken usage.</p>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <input type="text" id="fl-anatomy-input" class="fl-input" placeholder="Type a Finnish word (e.g. talossa, puhun, ystävä)..." />
          <button type="button" class="fl-btn primary" id="fl-anatomy-search">Analyze Word</button>
        </div>
        <div id="fl-anatomy-out"></div>
      </div>
    `;
  }

  function renderLearnReading() {
    const r = state.currentReading || CURR.SAMPLE_READINGS[0];
    return `
      <div class="fl-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <h2 class="fl-card-title" style="margin:0;">📰 Reading Practice — ${esc(r.title)}</h2>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${CURR.SAMPLE_READINGS.map((s) => `<button type="button" class="fl-btn sm ${s.id === r.id ? "active" : ""}" data-fl-load-read="${s.id}">${esc(s.text_type)}</button>`).join("")}
            <button type="button" class="fl-btn sm" data-fl-speak="${esc((r.sentences || []).map((s) => s.fi).join(" "))}">🔊 Read Aloud</button>
            <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc((r.sentences || []).map((s) => s.fi).join(" "))}">🐢 Slow</button>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <input type="text" id="fl-read-topic" class="fl-input" style="flex:1;min-width:200px;" placeholder="Generate AI reading (e.g. Kela letter, supermarket sign, weather news) or paste Finnish text..." />
          <button type="button" class="fl-btn primary sm" id="fl-read-generate">✨ Generate / Analyze</button>
        </div>

        <div style="font-size:0.74rem;color:#94a3b8;margin-bottom:8px;">💡 Tip: Tap any Finnish word to look up its anatomy!</div>
        ${(r.sentences || [])
          .map(
            (s) => `
          <div style="padding:10px 12px;background:#061428;border-radius:10px;margin-bottom:8px;border:1px solid rgba(75,137,188,0.22);">
            <div style="font-size:0.95rem;font-weight:700;color:#fff;margin-bottom:4px;">
              ${s.fi
                .split(/\s+/)
                .map((w) => `<span class="fl-tap-word" data-fl-tap-word="${esc(w.replace(/[.,!?;:"]/g, ""))}">${esc(w)}</span>`)
                .join(" ")}
            </div>
            <div style="font-size:0.82rem;color:#7dd3fc;">🇬🇧 ${esc(s.en)}</div>
            ${s.spoken_fi ? `<div style="font-size:0.78rem;color:#6ee7b7;margin-top:2px;">🗣️ Puhekieli: ${esc(s.spoken_fi)}</div>` : ""}
          </div>
        `
          )
          .join("")}
        ${r.grammar_note ? `<div style="font-size:0.8rem;color:#fde68a;margin:8px 0;">📐 <strong>Grammar in context:</strong> ${esc(r.grammar_note)}</div>` : ""}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
          ${(r.vocabulary || [])
            .map(
              (v) =>
                `<button type="button" class="fl-chip" data-fl-add-card-fi="${esc(v.word)}" data-fl-add-card-en="${esc(v.en)}" data-fl-add-card-base="${esc(v.base_form)}">⭐ ${esc(v.word)} (${esc(v.base_form)}) = ${esc(v.en)}</button>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderLearnWriting() {
    return `
      <div class="fl-card">
        <h2 class="fl-card-title">✍️ Writing Practice &amp; Side-by-Side Correction</h2>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
          ${["Introduce myself", "Describe my family", "Describe the weather", "My weekend", "Message to my teacher", "Simple work message"]
            .map((t) => `<button type="button" class="fl-chip" data-fl-write-topic="${esc(t)}">${esc(t)}</button>`)
            .join("")}
        </div>
        <input type="text" id="fl-write-topic-input" class="fl-input" style="margin-bottom:8px;" value="Introduce myself" placeholder="Writing topic..." />
        <textarea id="fl-write-text" class="fl-textarea" rows="4" placeholder="Write 1–5 Finnish sentences here (e.g. Hei! Minä olen Binod. Asun Suomessa ja opiskelen suomea.)..."></textarea>
        <div style="margin-top:10px;display:flex;gap:8px;">
          <button type="button" class="fl-btn primary" id="fl-write-submit">✅ Check My Finnish</button>
        </div>
        <div id="fl-write-out" style="margin-top:14px;"></div>
      </div>
    `;
  }

  function renderLearnListening() {
    const l = state.currentListening || CURR.SAMPLE_LISTENING[0];
    const fullFi = (l.lines || []).map((x) => x.fi).join(". ");
    return `
      <div class="fl-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h2 class="fl-card-title" style="margin:0;">🎧 Listening Practice — ${esc(l.title)}</h2>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${CURR.SAMPLE_LISTENING.map((s) => `<button type="button" class="fl-btn sm ${s.id === l.id ? "active" : ""}" data-fl-load-listen="${s.id}">${esc(s.title.split("(")[0])}</button>`).join("")}
          </div>
        </div>
        <div style="font-size:0.78rem;color:#94a3b8;margin-bottom:10px;">Note: Uses your browser's Finnish speech synthesis voice (not a human teacher recording). Listen first before revealing the transcript!</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <button type="button" class="fl-btn primary" data-fl-speak="${esc(fullFi)}">🔊 Play Normal Speed</button>
          <button type="button" class="fl-btn" data-fl-speak-slow="${esc(fullFi)}">🐢 Play Slowly</button>
          <button type="button" class="fl-btn" data-fl-stop-speak="1">⏹ Stop</button>
          <button type="button" class="fl-btn sm" id="fl-listen-toggle-tr">${state.listeningShowTranscript ? "🙈 Hide Transcript" : "👁️ Show Transcript"}</button>
          <button type="button" class="fl-btn sm" id="fl-listen-toggle-en">${state.listeningShowEn ? "🙈 Hide English" : "🇬🇧 Show English"}</button>
        </div>
        ${
          state.listeningShowTranscript
            ? `<div style="background:#061428;padding:12px;border-radius:10px;margin-bottom:12px;">
                ${(l.lines || [])
                  .map(
                    (ln) =>
                      `<div style="margin-bottom:8px;"><strong>${esc(ln.speaker)}:</strong> ${esc(ln.fi)}${state.listeningShowEn ? `<div style="font-size:0.8rem;color:#7dd3fc;">${esc(ln.en)}</div>` : ""}</div>`
                  )
                  .join("")}
              </div>`
            : ""
        }
        ${(l.questions || [])
          .map(
            (q) => `
          <div style="background:#061428;padding:12px;border-radius:10px;border:1px solid rgba(56,189,248,0.25);">
            <strong style="font-size:0.84rem;">Comprehension: ${esc(q.q_en)} (${esc(q.q_fi)})</strong>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
              ${q.options.map((o, i) => `<button type="button" class="fl-btn sm" data-fl-quiz-ans="${i === q.answer_index ? "1" : "0"}" data-fl-quiz-exp="Good listening!">${esc(o)}</button>`).join("")}
            </div>
            <div id="fl-daily-quiz-out" style="margin-top:6px;font-size:0.8rem;"></div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  function renderLearnSpeaking() {
    return `
      <div class="fl-grid-2">
        <div class="fl-card">
          <h2 class="fl-card-title">🗣️ Guided Pronunciation Drills</h2>
          <p style="font-size:0.78rem;color:#94a3b8;margin:0 0 10px;">Listen, repeat aloud, and check what speech recognition hears. (Speech recognition gives text/wording feedback — not a certified audio pronunciation score.)</p>
          ${CURR.SPEAKING_DRILLS.map(
            (g) => `
            <div style="margin-bottom:12px;">
              <strong style="color:#7dd3fc;font-size:0.82rem;">${esc(g.group)}</strong>
              ${g.items
                .map(
                  (it) => `
                <div class="fl-vocab-row" style="margin-top:6px;">
                  <div>
                    <strong style="color:#fff;">${esc(it.fi)}</strong> <span style="color:#94a3b8;font-size:0.8rem;">(${esc(it.en)})</span>
                    <div style="font-size:0.74rem;color:#cbd5e1;">💡 ${esc(it.tip)}</div>
                  </div>
                  <div style="display:flex;gap:4px;">
                    <button type="button" class="fl-btn sm" data-fl-speak="${esc(it.fi)}">🔊</button>
                    <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(it.fi)}">🐢</button>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          `
          ).join("")}
          <div style="margin-top:10px;display:flex;gap:8px;">
            <input type="text" id="fl-speak-heard" class="fl-input" placeholder="Tap Speak and say a Finnish sentence..." />
            <button type="button" class="fl-btn primary sm" id="fl-speak-test-btn">🎙️ Speak (FI)</button>
          </div>
        </div>

        <div class="fl-card">
          <h2 class="fl-card-title">🎭 Beginner Roleplay Conversations</h2>
          <p style="font-size:0.82rem;color:#cbd5e1;margin:0 0 12px;">Start a real interactive roleplay in Tutor mode (starting from 3 easy turns):</p>
          ${CURR.ROLEPLAY_SCENARIOS.map(
            (rp) => `
            <div class="fl-vocab-row">
              <div>
                <strong style="color:#fff;">${esc(rp.title)}</strong>
              </div>
              <button type="button" class="fl-btn primary sm" data-fl-start-roleplay="${rp.id}">Start →</button>
            </div>
          `
          ).join("")}
        </div>
      </div>
    `;
  }

  /* ---------- TAB 5: REVIEW (FLASHCARDS, NOTES, PROGRESS & BACKUP) ---------- */
  function renderReviewTab(settings, prog, dueCount) {
    const sub = state.reviewSubTab;
    return `
      <div class="fl-subtabs">
        <button type="button" class="fl-btn sm ${sub === "flashcards" ? "active" : ""}" data-fl-rev="flashcards">🃏 Flashcards (${state.flashcards.length} / ${dueCount} due)</button>
        <button type="button" class="fl-btn sm ${sub === "notes" ? "active" : ""}" data-fl-rev="notes">📝 Class Notes &amp; History (${state.notes.length})</button>
        <button type="button" class="fl-btn sm ${sub === "progress" ? "active" : ""}" data-fl-rev="progress">📊 Progress, Privacy &amp; Backup</button>
      </div>
      ${sub === "flashcards" ? renderReviewFlashcards() : sub === "notes" ? renderReviewNotes() : renderReviewProgress(settings, prog)}
    `;
  }

  function renderReviewFlashcards() {
    const dueCards = state.flashcards.filter((c) => (c.dueAt || 0) <= Date.now());
    const activeCard = dueCards[0] || state.flashcards[0];
    return `
      <div class="fl-grid-2">
        <div class="fl-card">
          <h2 class="fl-card-title">🃏 Spaced-Repetition Study (${dueCards.length} due)</h2>
          ${
            activeCard
              ? `<div class="fl-flashcard-stage" id="fl-card-flip">
                  <div style="font-size:0.74rem;color:#94a3b8;">${state.flashcardFlipped ? "ENGLISH MEANING" : "FINNISH (tap to flip)"}</div>
                  <div style="font-size:1.45rem;font-weight:800;color:#fff;">${esc(state.flashcardFlipped ? activeCard.en : activeCard.fi)}</div>
                  ${state.flashcardFlipped ? `<div style="font-size:0.82rem;color:#7dd3fc;">Base form: ${esc(activeCard.baseForm || activeCard.fi)}</div>` : ""}
                  ${state.flashcardFlipped && activeCard.example ? `<div style="font-size:0.8rem;color:#cbd5e1;">${esc(activeCard.example)}</div>` : ""}
                </div>
                <div style="display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap;">
                  <button type="button" class="fl-btn sm" data-fl-speak="${esc(activeCard.fi)}">🔊 Listen</button>
                  <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(activeCard.fi)}">🐢 Slow</button>
                </div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px;">
                  <button type="button" class="fl-btn danger sm" data-fl-rate-card="${activeCard.id}" data-fl-rating="again">Again</button>
                  <button type="button" class="fl-btn sm" data-fl-rate-card="${activeCard.id}" data-fl-rating="hard">Hard</button>
                  <button type="button" class="fl-btn primary sm" data-fl-rate-card="${activeCard.id}" data-fl-rating="good">Good</button>
                  <button type="button" class="fl-btn success sm" data-fl-rate-card="${activeCard.id}" data-fl-rating="easy">Easy</button>
                </div>`
              : `<p style="font-size:0.84rem;color:#94a3b8;">No flashcards saved yet! Tap ⭐ on any daily word, reading passage, or tutor reply to add cards.</p>`
          }
        </div>

        <div class="fl-card">
          <h2 class="fl-card-title">➕ Add Custom Flashcard &amp; Manage</h2>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
            <input type="text" id="fl-new-card-fi" class="fl-input" placeholder="Finnish word or phrase" />
            <input type="text" id="fl-new-card-en" class="fl-input" placeholder="English meaning" />
            <input type="text" id="fl-new-card-ex" class="fl-input" placeholder="Optional example sentence" />
            <button type="button" class="fl-btn primary sm" id="fl-add-custom-card">+ Save Flashcard</button>
          </div>
          <div style="max-height:240px;overflow-y:auto;">
            ${state.flashcards
              .map(
                (c) => `
              <div class="fl-vocab-row">
                <div><strong>${esc(c.fi)}</strong> — ${esc(c.en)}</div>
                <button type="button" class="fl-btn sm" data-fl-del-card="${c.id}">🗑️</button>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderReviewNotes() {
    return `
      <div class="fl-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h2 class="fl-card-title" style="margin:0;">📝 Saved Class Notes &amp; History</h2>
          <input type="text" id="fl-notes-search" class="fl-input" style="max-width:260px;padding:6px 10px;" placeholder="Search notes by date or topic..." />
        </div>
        <div id="fl-notes-list">
          ${
            state.notes.length
              ? state.notes
                  .map(
                    (n) => `
                <div class="fl-vocab-row" style="flex-direction:column;align-items:stretch;">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                    <div><strong>${esc(n.title)}</strong> <span class="fl-pill">${esc(n.date)}</span></div>
                    <div style="display:flex;gap:6px;">
                      <button type="button" class="fl-btn sm" data-fl-export-note="${n.id}">⬇️ Export .txt</button>
                      <button type="button" class="fl-btn sm" data-fl-del-note="${n.id}">🗑️</button>
                    </div>
                  </div>
                  <div style="font-size:0.82rem;color:#cbd5e1;margin-top:6px;">${renderMarkdownLite((n.content || "").slice(0, 600))}</div>
                </div>
              `
                  )
                  .join("")
              : `<p style="font-size:0.84rem;color:#94a3b8;">No class notes saved yet. Record your teacher in CLASS or save any explanation from TUTOR.</p>`
          }
        </div>
      </div>
    `;
  }

  function renderReviewProgress(settings, prog) {
    const u = (state.status && state.status.usage) || { used: 0, limit: 60, remaining: 60, cache_hits: 0 };
    return `
      <div class="fl-grid-2">
        <div class="fl-card">
          <h2 class="fl-card-title">📊 Learning Progress (Informal CEFR ${esc(settings.level)})</h2>
          <p style="font-size:0.76rem;color:#94a3b8;margin:0 0 10px;">Informal self-study tracking (not an official certified CEFR exam assessment).</p>
          <div class="fl-grid-3" style="margin-bottom:12px;">
            <div style="background:#061428;padding:10px;border-radius:10px;text-align:center;"><div style="font-size:1.3rem;font-weight:800;color:#6ee7b7;">${prog.streakDays || 0}</div><div style="font-size:0.72rem;color:#94a3b8;">Day Streak</div></div>
            <div style="background:#061428;padding:10px;border-radius:10px;text-align:center;"><div style="font-size:1.3rem;font-weight:800;color:#7dd3fc;">${state.flashcards.length}</div><div style="font-size:0.72rem;color:#94a3b8;">Saved Words</div></div>
            <div style="background:#061428;padding:10px;border-radius:10px;text-align:center;"><div style="font-size:1.3rem;font-weight:800;color:#fcd34d;">${(prog.completedLessons || []).length}</div><div style="font-size:0.72rem;color:#94a3b8;">Lessons Done</div></div>
          </div>
          ${
            (prog.commonMistakes || []).length
              ? `<div style="margin-top:8px;"><strong style="font-size:0.82rem;color:#fca5a5;">Frequently Corrected Mistakes:</strong>
                  ${prog.commonMistakes.slice(0, 5).map((m) => `<div style="font-size:0.78rem;margin-top:4px;color:#cbd5e1;">❌ ${esc(m.wrong)} → ✅ <strong>${esc(m.right)}</strong> (${m.count}x)</div>`).join("")}
                </div>`
              : ""
          }
        </div>

        <div class="fl-card">
          <h2 class="fl-card-title">🔒 Storage, Backup &amp; AI Cost Controls</h2>
          <div style="font-size:0.8rem;color:#cbd5e1;margin-bottom:10px;line-height:1.45;">
            <strong>Storage Mode:</strong> Private Device Storage (IndexedDB <code>finnish_lab_db</code>). Completely isolated from ILoveFinland editorial content. Does not automatically sync between iPhone and MacBook — use Backup/Restore or optional Cloud Sync below.
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
            <button type="button" class="fl-btn primary sm" id="fl-export-backup">⬇️ Export JSON Backup</button>
            <label class="fl-btn sm" style="cursor:pointer;">
              ⬆️ Import Backup
              <input type="file" id="fl-import-backup" accept="application/json" style="display:none;" />
            </label>
            <button type="button" class="fl-btn sm" id="fl-cloud-push">☁️ Save Sync Snapshot</button>
            <button type="button" class="fl-btn sm" id="fl-cloud-pull">☁️ Load Sync Snapshot</button>
          </div>
          <div style="padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.8rem;">
            <div style="margin-bottom:6px;"><strong>Free-Tier Gemini Quota Today:</strong> ${u.used}/${u.limit} used (${u.cache_hits || 0} cache hits saved)</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <label style="color:#94a3b8;">Daily safety limit:</label>
              <input type="number" id="fl-daily-limit-inp" class="fl-input" style="width:90px;padding:4px 8px;" min="5" max="500" value="${u.limit}" />
              <button type="button" class="fl-btn sm" id="fl-save-limit">Save Limit</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ---------- MINI FLOATING TUTOR & COLLAPSIBLE SIDE PANEL ---------- */
  function mountFloatingAndSidePanel() {
    if (document.getElementById("fl-floating-launcher")) return;
    const launcher = document.createElement("button");
    launcher.id = "fl-floating-launcher";
    launcher.type = "button";
    launcher.className = "fl-floating-launcher";
    launcher.title = "Open Finnish Learning Lab Tutor (without leaving your article)";
    launcher.innerHTML = `<span>🇫🇮</span><span>Finnish Tutor</span>`;
    launcher.addEventListener("click", () => toggleSidePanel(true));
    document.body.appendChild(launcher);

    const panel = document.createElement("aside");
    panel.id = "fl-side-panel";
    panel.className = "fl-side-panel";
    panel.setAttribute("aria-label", "Finnish Tutor Side Panel");
    document.body.appendChild(panel);
    renderSidePanel();
  }

  function toggleSidePanel(open) {
    state.sidePanelOpen = typeof open === "boolean" ? open : !state.sidePanelOpen;
    const panel = document.getElementById("fl-side-panel");
    const launcher = document.getElementById("fl-floating-launcher");
    if (panel) panel.classList.toggle("open", state.sidePanelOpen);
    if (launcher) launcher.style.display = state.sidePanelOpen ? "none" : "inline-flex";
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
            <div style="font-size:0.7rem;color:#94a3b8;">Your article edits stay untouched</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button type="button" class="fl-btn primary sm" id="fl-side-expand">⛶ Full Lab</button>
          <button type="button" class="fl-btn sm" id="fl-side-close">✕</button>
        </div>
      </div>
      <div class="fl-side-body">
        <div class="fl-side-messages">
          ${
            msgs.length
              ? msgs.slice(-12).map((m, idx) => renderChatMessage(m, idx)).join("")
              : `<div class="fl-msg assistant">Hei! Ask a quick Finnish question while you work on your article or Reel.</div>`
          }
          ${state.isSending ? `<div class="fl-msg assistant">⏳ Thinking...</div>` : ""}
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${
            state.isRecording && state.recordingTarget === "side"
              ? `<button type="button" class="fl-btn danger sm" id="fl-side-stop-rec">⏹ <span class="fl-rec-timer">00:00</span></button>`
              : `<button type="button" class="fl-btn sm" id="fl-side-start-rec" title="Record voice">🎙️</button>`
          }
          <input type="text" id="fl-side-input" class="fl-input" style="padding:8px 10px;font-size:0.84rem;" placeholder="Ask Finnish Tutor..." />
          <button type="button" class="fl-btn primary sm" id="fl-side-send" ${state.isSending ? "disabled" : ""}>➤</button>
        </div>
      </div>
    `;

    panel.querySelector("#fl-side-close")?.addEventListener("click", () => toggleSidePanel(false));
    panel.querySelector("#fl-side-expand")?.addEventListener("click", () => {
      toggleSidePanel(false);
      if (typeof window.openFinnishLabView === "function") window.openFinnishLabView();
    });
    panel.querySelector("#fl-side-start-rec")?.addEventListener("click", () => startRecording("side"));
    panel.querySelector("#fl-side-stop-rec")?.addEventListener("click", () => stopRecording());
    const sendSide = () => {
      const inp = panel.querySelector("#fl-side-input");
      if (!inp) return;
      const val = inp.value.trim();
      if (!val && !state.pendingAttachments.length) return;
      inp.value = "";
      sendTutorMessage(val, { kind: "tutor" });
    };
    panel.querySelector("#fl-side-send")?.addEventListener("click", sendSide);
    panel.querySelector("#fl-side-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); sendSide(); }
    });
    bindCommonMessageButtons(panel);
  }

  /* ---------- EVENT BINDING ---------- */
  function bindCommonMessageButtons(container) {
    container.querySelectorAll("[data-fl-speak]").forEach((b) => {
      b.onclick = () => speakFinnish(b.getAttribute("data-fl-speak"), false);
    });
    container.querySelectorAll("[data-fl-speak-slow]").forEach((b) => {
      b.onclick = () => speakFinnish(b.getAttribute("data-fl-speak-slow"), true);
    });
    container.querySelectorAll("[data-fl-stop-speak]").forEach((b) => {
      b.onclick = stopSpeech;
    });
  }

  function bindMainEvents() {
    const root = document.getElementById("finnish-lab-root");
    if (!root) return;

    // 5 main tabs
    root.querySelectorAll("[data-fl-tab]").forEach((btn) => {
      btn.onclick = () => {
        if (state.isRecording) {
          toast("Stop your active recording before switching tabs so nothing is lost.", "warning");
          return;
        }
        state.activeTab = btn.getAttribute("data-fl-tab");
        renderActiveView();
      };
    });

    root.querySelector("#fl-top-stop-rec")?.addEventListener("click", stopRecording);

    root.querySelector("#fl-level-select")?.addEventListener("change", (e) => {
      DB.saveSettings({ level: e.target.value });
      renderActiveView();
    });

    root.querySelector("#fl-quick-class-toggle")?.addEventListener("click", () => {
      const s = DB.getSettings();
      DB.saveSettings({ quickClassMode: !s.quickClassMode });
      renderActiveView();
    });

    root.querySelector("#fl-focus-toggle")?.addEventListener("click", () => {
      state.focusMode = !state.focusMode;
      document.body.classList.toggle("fl-focus-mode", state.focusMode);
      renderActiveView();
    });

    // Home hero actions
    root.querySelectorAll("[data-fl-action]").forEach((btn) => {
      btn.onclick = () => {
        const act = btn.getAttribute("data-fl-action");
        if (act === "goto-record") { state.activeTab = "class"; state.classSubTab = "live"; }
        if (act === "goto-scan") { state.activeTab = "class"; state.classSubTab = "homework"; }
        if (act === "goto-tutor") state.activeTab = "tutor";
        if (act === "goto-learn" || act === "goto-daily") { state.activeTab = "learn"; state.learnSubTab = "daily"; }
        if (act === "goto-flashcards") { state.activeTab = "review"; state.reviewSubTab = "flashcards"; }
        renderActiveView();
      };
    });

    // CLASS sub-tab toggle (Live Class vs Homework)
    root.querySelectorAll("[data-fl-class-sub]").forEach((b) => {
      b.onclick = () => {
        state.classSubTab = b.getAttribute("data-fl-class-sub");
        renderActiveView();
      };
    });

    root.querySelectorAll("[data-fl-open-grammar]").forEach((b) => {
      b.onclick = () => {
        state.selectedGrammarId = b.getAttribute("data-fl-open-grammar");
        state.activeTab = "learn";
        state.learnSubTab = "grammar";
        DB.recordTopicStudied(state.selectedGrammarId, state.selectedGrammarId);
        renderActiveView();
      };
    });

    root.querySelectorAll("[data-fl-open-conv]").forEach((b) => {
      b.onclick = () => {
        state.activeConvId = b.getAttribute("data-fl-open-conv");
        state.activeTab = "tutor";
        renderActiveView();
        scrollChatsToBottom();
      };
    });

    // Save daily vocab to flashcard
    root.querySelectorAll("[data-fl-save-vocab]").forEach((b) => {
      b.onclick = async () => {
        const pack = CURR.getTodayVocabPack();
        const w = pack.words[Number(b.getAttribute("data-fl-save-vocab"))];
        if (!w) return;
        const r = await DB.addFlashcard({ fi: w.fi, en: w.en, baseForm: w.base, example: `${w.exFi} (${w.exEn})`, spoken: w.spoken, collection: pack.topic });
        state.flashcards = await DB.listFlashcards();
        toast(r.duplicate ? `"${w.fi}" is already in your flashcards.` : `Saved "${w.fi}" to flashcards!`, "success");
        renderActiveView();
      };
    });

    // CLASS tab events
    root.querySelector("#fl-class-start-rec")?.addEventListener("click", () => startRecording("class"));
    root.querySelector("#fl-class-stop-rec")?.addEventListener("click", stopRecording);
    root.querySelector("#fl-class-clear-audio")?.addEventListener("click", () => { state.recordedAudio = null; renderActiveView(); });
    root.querySelector("#fl-class-audio-file")?.addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const att = await fileToAttachment(f);
      if (att) {
        state.recordedAudio = { blobUrl: URL.createObjectURL(f), mime_type: att.mime_type, data_base64: att.data_base64, durationSec: 0 };
        renderActiveView();
      }
    });
    root.querySelector("#fl-class-transcribe")?.addEventListener("click", analyzeTeacherRecording);

    const handleClassPhotoInput = async (e) => {
      for (const f of Array.from(e.target.files || [])) {
        const att = await fileToAttachment(f);
        if (att) state.classPhotoAttachments.push(att);
      }
      e.target.value = "";
      renderActiveView();
    };
    root.querySelector("#fl-class-camera")?.addEventListener("change", handleClassPhotoInput);
    root.querySelector("#fl-class-files")?.addEventListener("change", handleClassPhotoInput);
    root.querySelector("#fl-class-clear-photos")?.addEventListener("click", () => { state.classPhotoAttachments = []; renderActiveView(); });
    root.querySelectorAll("[data-fl-rm-class-photo]").forEach((b) => {
      b.onclick = () => { state.classPhotoAttachments.splice(Number(b.getAttribute("data-fl-rm-class-photo")), 1); renderActiveView(); };
    });
    root.querySelectorAll("[data-fl-crop-class]").forEach((b) => {
      b.onclick = () => openCropModal("class", Number(b.getAttribute("data-fl-crop-class")));
    });
    root.querySelectorAll("[data-fl-hw]").forEach((b) => {
      b.onclick = () => runHomeworkAction(b.getAttribute("data-fl-hw"));
    });

    // Class Result actions
    root.querySelector("#fl-res-speak")?.addEventListener("click", () => speakFinnish(state.classTranscriptEditable || state.classResult?.finnish_tts, false));
    root.querySelector("#fl-res-slow")?.addEventListener("click", () => speakFinnish(state.classTranscriptEditable || state.classResult?.finnish_tts, true));
    root.querySelector("#fl-res-stop")?.addEventListener("click", stopSpeech);
    root.querySelector("#fl-res-followup")?.addEventListener("click", () => { state.activeTab = "tutor"; renderActiveView(); scrollChatsToBottom(); });
    root.querySelector("#fl-res-save-all-vocab")?.addEventListener("click", async () => {
      if (!state.classResult) return;
      const count = await saveAllVocabFromReply(state.classResult.reply);
      toast(count > 0 ? `Saved ${count} new vocabulary word(s) to Flashcards! ⭐` : "All vocabulary words from this lesson are already saved (or none found).", "success");
      renderActiveView();
    });
    root.querySelector("#fl-res-save-note")?.addEventListener("click", async () => {
      if (!state.classResult) return;
      const keepAudio = DB.getSettings().retainAudioInNotes;
      await DB.saveNote({
        title: `Class: ${(state.classTranscriptEditable || "Teacher Explanation").slice(0, 48)}`,
        type: "teacher_recording",
        transcript: state.classTranscriptEditable,
        content: state.classResult.reply,
        audioDataUrl: keepAudio && state.recordedAudio ? `data:${state.recordedAudio.mime_type};base64,${state.recordedAudio.data_base64}` : null,
      });
      state.notes = await DB.listNotes();
      toast("Saved to Class Notes in REVIEW!", "success");
    });
    root.querySelector("#fl-res-export")?.addEventListener("click", () => {
      if (!state.classResult) return;
      downloadTextFile(`finnish-class-note-${DB.todayStr()}.txt`, state.classResult.reply);
    });
    root.querySelector("#fl-res-reexplain")?.addEventListener("click", () => {
      const txt = (document.getElementById("fl-res-edit-transcript")?.value || "").trim();
      if (!txt) return;
      state.classTranscriptEditable = txt;
      state.activeTab = "tutor";
      sendTutorMessage(`Please translate and explain this exact Finnish sentence simply: "${txt}"`);
    });

    // TUTOR tab events
    root.querySelector("#fl-new-conv")?.addEventListener("click", async () => {
      const c = await DB.saveConversation({ title: "New Finnish Chat", kind: "tutor", messages: [] });
      state.conversations.unshift(c);
      state.activeConvId = c.id;
      renderActiveView();
    });
    root.querySelector("#fl-conv-search")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      root.querySelectorAll("[data-fl-select-conv]").forEach((el) => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? "flex" : "none";
      });
    });
    root.querySelectorAll("[data-fl-select-conv]").forEach((el) => {
      el.onclick = (e) => {
        if (e.target.closest("button")) return;
        state.activeConvId = el.getAttribute("data-fl-select-conv");
        renderActiveView();
        scrollChatsToBottom();
      };
    });
    root.querySelectorAll("[data-fl-rename-conv]").forEach((b) => {
      b.onclick = async () => {
        const id = b.getAttribute("data-fl-rename-conv");
        const c = state.conversations.find((x) => x.id === id);
        if (!c) return;
        const name = prompt("Rename conversation:", c.title);
        if (name && name.trim()) {
          c.title = name.trim();
          await DB.saveConversation(c);
          renderActiveView();
        }
      };
    });
    root.querySelectorAll("[data-fl-del-conv]").forEach((b) => {
      b.onclick = async () => {
        const id = b.getAttribute("data-fl-del-conv");
        if (!confirm("Delete this saved Finnish conversation?")) return;
        await DB.deleteConversation(id);
        state.conversations = state.conversations.filter((x) => x.id !== id);
        if (state.activeConvId === id) state.activeConvId = state.conversations[0]?.id || null;
        renderActiveView();
      };
    });
    root.querySelectorAll("[data-fl-ans-mode]").forEach((b) => {
      b.onclick = () => {
        DB.saveSettings({ answerMode: b.getAttribute("data-fl-ans-mode") });
        renderActiveView();
      };
    });
    root.querySelectorAll("[data-fl-chip]").forEach((b) => {
      b.onclick = () => sendTutorMessage(b.getAttribute("data-fl-chip"));
    });
    const handleTutorFiles = async (e) => {
      for (const f of Array.from(e.target.files || [])) {
        const att = await fileToAttachment(f);
        if (att) state.pendingAttachments.push(att);
      }
      e.target.value = "";
      renderActiveView();
    };
    root.querySelector("#fl-tutor-camera")?.addEventListener("change", handleTutorFiles);
    root.querySelector("#fl-tutor-file")?.addEventListener("change", handleTutorFiles);
    root.querySelectorAll("[data-fl-rm-pending]").forEach((b) => {
      b.onclick = () => { state.pendingAttachments.splice(Number(b.getAttribute("data-fl-rm-pending")), 1); renderActiveView(); };
    });
    root.querySelectorAll("[data-fl-crop-pending]").forEach((b) => {
      b.onclick = () => openCropModal("pending", Number(b.getAttribute("data-fl-crop-pending")));
    });
    root.querySelector("#fl-tutor-start-rec")?.addEventListener("click", () => startRecording("tutor"));
    root.querySelector("#fl-tutor-stop-rec")?.addEventListener("click", stopRecording);
    root.querySelector("#fl-tutor-dictate")?.addEventListener("click", () => startVoiceDictation("fl-tutor-input"));
    root.querySelector("#fl-voice-lang")?.addEventListener("change", (e) => DB.saveSettings({ voiceLang: e.target.value }));
    const sendMainTutor = () => {
      const inp = document.getElementById("fl-tutor-input");
      if (!inp) return;
      const val = inp.value.trim();
      inp.value = "";
      sendTutorMessage(val);
    };
    root.querySelector("#fl-tutor-send")?.addEventListener("click", sendMainTutor);
    root.querySelector("#fl-tutor-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMainTutor(); }
    });

    // Save message as note or flashcard
    root.querySelectorAll("[data-fl-save-msg-note]").forEach((b) => {
      b.onclick = async () => {
        const conv = getActiveConv();
        const m = conv && conv.messages[Number(b.getAttribute("data-fl-save-msg-note"))];
        if (!m) return;
        await DB.saveNote({ title: conv.title, type: "tutor", content: m.text });
        state.notes = await DB.listNotes();
        toast("Saved to Class Notes!", "success");
      };
    });
    root.querySelectorAll("[data-fl-save-msg-card]").forEach((b) => {
      b.onclick = async () => {
        const conv = getActiveConv();
        const m = conv && conv.messages[Number(b.getAttribute("data-fl-save-msg-card"))];
        if (!m) return;
        const fi = prompt("Finnish phrase for flashcard:", m.finnishTts || "");
        if (!fi) return;
        const en = prompt("English meaning:", "") || "";
        await DB.addFlashcard({ fi, en, collection: "Tutor" });
        state.flashcards = await DB.listFlashcards();
        toast("Added to Flashcards!", "success");
      };
    });

    // LEARN subtabs & actions
    root.querySelectorAll("[data-fl-learn]").forEach((b) => {
      b.onclick = () => { state.learnSubTab = b.getAttribute("data-fl-learn"); renderActiveView(); };
    });
    root.querySelector("#fl-daily-target")?.addEventListener("change", (e) => { DB.saveSettings({ dailyTargetMinutes: Number(e.target.value) }); renderActiveView(); });
    root.querySelector("#fl-complete-daily")?.addEventListener("click", () => {
      DB.recordLessonCompleted("daily_" + DB.todayStr());
      toast("Mahtavaa! Today's lesson completed! 🔥", "success");
      renderActiveView();
    });
    root.querySelectorAll("[data-fl-quiz-ans]").forEach((b) => {
      b.onclick = () => {
        const ok = b.getAttribute("data-fl-quiz-ans") === "1";
        const exp = b.getAttribute("data-fl-quiz-exp") || "";
        const out = root.querySelector("#fl-daily-quiz-out");
        if (out) {
          out.style.color = ok ? "#6ee7b7" : "#fca5a5";
          out.textContent = (ok ? "✅ Oikein! (Correct!) " : "❌ Not quite — ") + exp;
        }
        if (ok) DB.touchStudyStreak();
      };
    });
    root.querySelectorAll("[data-fl-gram-id]").forEach((el) => {
      el.onclick = () => {
        state.selectedGrammarId = el.getAttribute("data-fl-gram-id");
        DB.recordTopicStudied(state.selectedGrammarId, el.textContent.trim());
        renderActiveView();
      };
    });
    root.querySelector("#fl-gram-save-note")?.addEventListener("click", async () => {
      const t = CURR.GRAMMAR_TOPICS.find((x) => x.id === state.selectedGrammarId);
      if (!t) return;
      await DB.saveNote({ title: t.title, type: "grammar", content: `${t.en}\n\nSelitys suomeksi: ${t.fi}\n\nExamples:\n- ${(t.pos || []).join("\n- ")}` });
      state.notes = await DB.listNotes();
      toast("Grammar topic saved to Review!", "success");
    });

    // Word Anatomy
    root.querySelector("#fl-anatomy-search")?.addEventListener("click", async () => {
      const w = (document.getElementById("fl-anatomy-input")?.value || "").trim();
      const out = document.getElementById("fl-anatomy-out");
      if (!w || !out) return;
      out.innerHTML = "<div style='color:#7dd3fc;'>⏳ Analyzing Finnish morphology...</div>";
      try {
        const res = await flApi("/api/finnish-lab/word-anatomy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: w, level: DB.getSettings().level }),
        });
        const a = res.anatomy || {};
        const f = a.forms || {};
        out.innerHTML = `
          <div style="background:#061428;border:1px solid rgba(56,189,248,0.35);border-radius:12px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
              <div>
                <strong style="font-size:1.2rem;color:#fff;">${esc(a.original_word || w)}</strong>
                <span class="fl-pill">${esc(a.word_class || "")}</span>
                <span style="color:#7dd3fc;margin-left:6px;">${esc(a.english_meaning || "")}</span>
              </div>
              <div style="display:flex;gap:6px;">
                <button type="button" class="fl-btn sm" data-fl-speak="${esc(a.original_word || w)}">🔊</button>
                <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(a.original_word || w)}">🐢</button>
                <button type="button" class="fl-btn primary sm" id="fl-anat-save">⭐ Save Card</button>
              </div>
            </div>
            <div style="font-size:0.84rem;color:#cbd5e1;line-height:1.6;">
              <div><strong>Base form (perusmuoto):</strong> ${esc(a.base_form || "—")} • <strong>Syllables:</strong> ${esc(a.syllables || "—")}</div>
              <div><strong>Pronunciation:</strong> ${esc(a.pronunciation_guide || "—")}</div>
              ${a.stem_and_kpt_note ? `<div><strong>Stem / KPT:</strong> ${esc(a.stem_and_kpt_note)}</div>` : ""}
              <div style="margin-top:6px;"><strong>Forms:</strong> Partitive: ${esc(f.partitive || "—")} | Genitive: ${esc(f.genitive || "—")} | Inessive: ${esc(f.inessive || "—")} | Elative: ${esc(f.elative || "—")} | Illative: ${esc(f.illative || "—")}</div>
              ${a.spoken_finnish ? `<div><strong>Spoken (puhekieli):</strong> ${esc(a.spoken_finnish)}</div>` : ""}
              ${(a.examples || []).map((ex) => `<div style="margin-top:4px;color:#e0f2fe;">• ${esc(ex.fi)} <em>(${esc(ex.en)})</em></div>`).join("")}
              ${a.uncertainty_note ? `<div style="margin-top:6px;color:#fde68a;">ℹ️ ${esc(a.uncertainty_note)}</div>` : ""}
            </div>
          </div>
        `;
        bindCommonMessageButtons(out);
        out.querySelector("#fl-anat-save")?.addEventListener("click", async () => {
          await DB.addFlashcard({ fi: a.base_form || w, en: a.english_meaning || "", baseForm: a.base_form || w, example: a.examples?.[0]?.fi || "" });
          state.flashcards = await DB.listFlashcards();
          toast("Saved word to Flashcards!", "success");
        });
      } catch (err) {
        out.innerHTML = `<div style="color:#fca5a5;">⚠️ ${esc(err.message)}</div>`;
      }
    });

    // Reading
    root.querySelectorAll("[data-fl-load-read]").forEach((b) => {
      b.onclick = () => {
        state.currentReading = CURR.SAMPLE_READINGS.find((x) => x.id === b.getAttribute("data-fl-load-read"));
        renderActiveView();
      };
    });
    root.querySelectorAll("[data-fl-tap-word]").forEach((el) => {
      el.onclick = () => {
        const w = el.getAttribute("data-fl-tap-word");
        state.learnSubTab = "anatomy";
        renderActiveView();
        const inp = document.getElementById("fl-anatomy-input");
        if (inp) { inp.value = w; document.getElementById("fl-anatomy-search")?.click(); }
      };
    });
    root.querySelectorAll("[data-fl-add-card-fi]").forEach((b) => {
      b.onclick = async () => {
        const r = await DB.addFlashcard({ fi: b.getAttribute("data-fl-add-card-fi"), en: b.getAttribute("data-fl-add-card-en"), baseForm: b.getAttribute("data-fl-add-card-base"), collection: "Reading" });
        state.flashcards = await DB.listFlashcards();
        toast(r.duplicate ? "Already in flashcards!" : "Added to flashcards!", "success");
      };
    });
    root.querySelector("#fl-read-generate")?.addEventListener("click", async () => {
      const val = (document.getElementById("fl-read-topic")?.value || "").trim();
      if (!val) return;
      const isPasted = val.length > 60 || val.includes(".");
      toast("Generating reading exercise...", "info");
      try {
        const res = await flApi("/api/finnish-lab/generate-exercise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "reading", topic: isPasted ? "Custom Text" : val, custom_text: isPasted ? val : "", level: DB.getSettings().level }),
        });
        state.currentReading = res.exercise;
        renderActiveView();
      } catch (err) {
        toast(err.message, "error");
      }
    });

    // Writing
    root.querySelectorAll("[data-fl-write-topic]").forEach((b) => {
      b.onclick = () => { const inp = document.getElementById("fl-write-topic-input"); if (inp) inp.value = b.getAttribute("data-fl-write-topic"); };
    });
    root.querySelector("#fl-write-submit")?.addEventListener("click", async () => {
      const txt = (document.getElementById("fl-write-text")?.value || "").trim();
      const topic = (document.getElementById("fl-write-topic-input")?.value || "").trim();
      const out = document.getElementById("fl-write-out");
      if (!txt || !out) return;
      out.innerHTML = "<div style='color:#7dd3fc;'>⏳ Checking your Finnish writing...</div>";
      try {
        const res = await flApi("/api/finnish-lab/writing-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: txt, topic, level: DB.getSettings().level }),
        });
        const fb = res.feedback || {};
        (fb.mistakes || []).forEach((m) => DB.recordMistake(m.wrong, m.right, m.why_en));
        DB.touchStudyStreak("writing");
        out.innerHTML = `
          <div class="fl-diff-grid" style="margin-bottom:10px;">
            <div style="background:#061428;padding:12px;border-radius:10px;border:1px solid rgba(248,113,113,0.35);">
              <strong style="color:#fca5a5;font-size:0.78rem;">YOUR ORIGINAL</strong>
              <p style="margin:6px 0 0;font-size:0.9rem;">${esc(fb.original || txt)}</p>
            </div>
            <div style="background:#061428;padding:12px;border-radius:10px;border:1px solid rgba(52,211,153,0.4);">
              <strong style="color:#6ee7b7;font-size:0.78rem;">CORRECTED FINNISH</strong>
              <p style="margin:6px 0 0;font-size:0.9rem;color:#fff;">${esc(fb.corrected || "")}</p>
            </div>
          </div>
          <div style="background:#061428;padding:12px;border-radius:10px;font-size:0.84rem;line-height:1.5;">
            <div style="color:#6ee7b7;">👍 ${esc(fb.praise || "")}</div>
            <div>🇬🇧 <strong>Meaning:</strong> ${esc(fb.english_meaning || "")}</div>
            ${fb.natural_version ? `<div>✨ <strong>More natural:</strong> ${esc(fb.natural_version)}</div>` : ""}
            ${(fb.mistakes || []).map((m) => `<div style="margin-top:6px;">• <span style="color:#fca5a5;">${esc(m.wrong)}</span> → <strong style="color:#6ee7b7;">${esc(m.right)}</strong>: ${esc(m.why_en)} <em>(${esc(m.why_fi || "")})</em></div>`).join("")}
          </div>
        `;
      } catch (err) {
        out.innerHTML = `<div style="color:#fca5a5;">⚠️ ${esc(err.message)}</div>`;
      }
    });

    // Listening
    root.querySelectorAll("[data-fl-load-listen]").forEach((b) => {
      b.onclick = () => {
        state.currentListening = CURR.SAMPLE_LISTENING.find((x) => x.id === b.getAttribute("data-fl-load-listen"));
        state.listeningShowTranscript = false;
        state.listeningShowEn = false;
        renderActiveView();
      };
    });
    root.querySelector("#fl-listen-toggle-tr")?.addEventListener("click", () => { state.listeningShowTranscript = !state.listeningShowTranscript; renderActiveView(); });
    root.querySelector("#fl-listen-toggle-en")?.addEventListener("click", () => { state.listeningShowEn = !state.listeningShowEn; renderActiveView(); });

    // Speaking & Roleplay
    root.querySelector("#fl-speak-test-btn")?.addEventListener("click", () => {
      DB.saveSettings({ voiceLang: "fi-FI" });
      startVoiceDictation("fl-speak-heard", () => DB.touchStudyStreak("speaking"));
    });
    root.querySelectorAll("[data-fl-start-roleplay]").forEach((b) => {
      b.onclick = async () => {
        const rp = CURR.ROLEPLAY_SCENARIOS.find((x) => x.id === b.getAttribute("data-fl-start-roleplay"));
        if (!rp) return;
        const c = await DB.saveConversation({ title: `Roleplay: ${rp.title}`, kind: "tutor", messages: [] });
        state.conversations.unshift(c);
        state.activeConvId = c.id;
        DB.saveSettings({ answerMode: "practice" });
        state.activeTab = "tutor";
        await sendTutorMessage(rp.prompt, { mode: "practice" });
      };
    });

    // REVIEW subtabs & actions
    root.querySelectorAll("[data-fl-rev]").forEach((b) => {
      b.onclick = () => { state.reviewSubTab = b.getAttribute("data-fl-rev"); renderActiveView(); };
    });
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
      const ex = (document.getElementById("fl-new-card-ex")?.value || "").trim();
      if (!fi || !en) { toast("Enter both Finnish and English.", "warning"); return; }
      await DB.addFlashcard({ fi, en, example: ex });
      state.flashcards = await DB.listFlashcards();
      toast("Flashcard saved!", "success");
      renderActiveView();
    });
    root.querySelectorAll("[data-fl-del-card]").forEach((b) => {
      b.onclick = async () => {
        await DB.deleteFlashcard(b.getAttribute("data-fl-del-card"));
        state.flashcards = await DB.listFlashcards();
        renderActiveView();
      };
    });
    root.querySelector("#fl-notes-search")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      root.querySelectorAll("#fl-notes-list > div").forEach((el) => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? "flex" : "none";
      });
    });
    root.querySelectorAll("[data-fl-export-note]").forEach((b) => {
      b.onclick = () => {
        const n = state.notes.find((x) => x.id === b.getAttribute("data-fl-export-note"));
        if (n) downloadTextFile(`${n.date}-${n.id}.txt`, `${n.title}\nDate: ${n.date}\n\n${n.content}`);
      };
    });
    root.querySelectorAll("[data-fl-del-note]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Delete this class note?")) return;
        await DB.deleteNote(b.getAttribute("data-fl-del-note"));
        state.notes = await DB.listNotes();
        renderActiveView();
      };
    });

    // Backup, Restore, Cloud Sync & Quota Limit
    root.querySelector("#fl-export-backup")?.addEventListener("click", async () => {
      const data = await DB.exportAllData();
      downloadTextFile(`finnish-lab-backup-${DB.todayStr()}.json`, JSON.stringify(data, null, 2));
      toast("Backup exported!", "success");
    });
    root.querySelector("#fl-import-backup")?.addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const parsed = JSON.parse(await f.text());
        const counts = await DB.importAllData(parsed);
        await loadAllData();
        toast(`Restored ${counts.conversations} chats, ${counts.flashcards} flashcards, ${counts.notes} notes!`, "success");
        renderActiveView();
      } catch (err) {
        toast("Import failed: " + err.message, "error");
      }
    });
    root.querySelector("#fl-cloud-push")?.addEventListener("click", async () => {
      try {
        const snap = await DB.exportAllData();
        await flApi("/api/finnish-lab/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot: snap }) });
        toast("Sync snapshot saved to Studio server!", "success");
      } catch (err) {
        toast(err.message, "error");
      }
    });
    root.querySelector("#fl-cloud-pull")?.addEventListener("click", async () => {
      try {
        const res = await flApi("/api/finnish-lab/sync");
        if (!res.has_snapshot || !res.snapshot) { toast("No server sync snapshot found yet.", "info"); return; }
        await DB.importAllData(res.snapshot);
        await loadAllData();
        toast("Loaded sync snapshot!", "success");
        renderActiveView();
      } catch (err) {
        toast(err.message, "error");
      }
    });
    root.querySelector("#fl-save-limit")?.addEventListener("click", async () => {
      const lim = Number(document.getElementById("fl-daily-limit-inp")?.value || 60);
      try {
        await flApi("/api/finnish-lab/settings/limit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ daily_limit: lim }) });
        await refreshStatus(false);
        toast(`Daily AI limit updated to ${lim} requests/day.`, "success");
        renderActiveView();
      } catch (err) {
        toast(err.message, "error");
      }
    });

    bindCommonMessageButtons(root);
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

  /* ---------- INIT ---------- */
  async function initFinnishLab() {
    await loadAllData();
    mountFloatingAndSidePanel();
    renderActiveView();
    refreshStatus(false);
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
