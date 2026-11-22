/* ============================================================================
   FINNISH LEARNING LAB — CALM CHATGPT-STYLE EDITION (v57.0)
   Top: [☰]  [ Chat | Study ]  [+]
   Bottom Capsule: [+] (Camera / Photo / PDF) | [🌐 Live] | [🎙️] | [⬆️]
   100% Silent Written Replies by Default • Mobile, iPad & PC Friendly
   ============================================================================ */
(function () {
  "use strict";

  const DB = window.FinnishLabDB;
  const CURR = window.FinnishLabCurriculum;

  const state = {
    mode: "chat", // chat | study
    studyTool: null, // null | podcast | lesson | helper
    podcastEpisodeId: "pod_cafe",
    podcastAudioUrl: null,
    podcastLoading: false,
    podcastShowScript: false,
    podcastSlow: false,
    lessonStep: 1,
    helperTab: "homework", // homework | lookup | practice
    practiceSkill: "writing",
    drawerOpen: false,
    drawerTab: "chats", // chats | flashcards | notes | settings
    plusMenuOpen: false,
    focusMode: false,
    sidePanelOpen: false,
    status: null,
    conversations: [],
    activeConvId: null,
    pendingAttachments: [], // { id, name, mime_type, data_base64, previewUrl }
    hwAttachments: [],
    isRecording: false,
    mediaRecorder: null,
    mediaChunks: [],
    recordStartMs: 0,
    recordTimer: null,
    isLiveTranslating: false,
    liveRecognition: null,
    liveInterimText: "",
    isSending: false,
    selectedGrammarId: "olla",
    currentReading: null,
    currentListening: null,
    listeningShowTranscript: false,
    flashcards: [],
    flashcardFlipped: false,
    notes: [],
    cropTarget: null,
    isStudentRoute: window.location.pathname === "/finnish-student" || window.location.pathname.startsWith("/finnish-student/"),
    role: "admin", // admin | student | guest
    roleLoaded: false,
    studentEnabled: true,
    inviteCode: "suomi2026",
    mistakeStreak: 0,
    sessionMediaMap: {}, // In-memory RAM cache: att.id -> { mime_type, data_base64, refLabel }
    userEmail: "",
    userName: "",
    adminUsers: [],
    emailDeliveryConfigured: false,
    autoSyncTimer: null,
    customPodcastEpisodes: [],
    podcastCreating: false,
    extractingCards: false,
    speakingMsgId: null,
  };

  /* ---------- FUN ROAST MODE (ESCALATING MISTAKE SIGNATURE) ---------- */
  function isRoastEnabled() {
    return DB.getSettings().roastMode !== false; // ON by default for everyone
  }

  function getRoastLine(isMistake) {
    if (!isMistake) {
      state.mistakeStreak = 0;
      return "";
    }
    if (!isRoastEnabled()) return "";
    state.mistakeStreak = (state.mistakeStreak || 0) + 1;
    if (state.mistakeStreak === 1) return "😈 Muji Chutiya, you are wrong! 😂";
    if (state.mistakeStreak === 2) return "😈 Idiot! Voi vittu, Muji Chutiya — wrong again! 🤦‍♂️";
    if (state.mistakeStreak === 3) return "🔥 Mitä vittua?! Muji Chutiya, concentrate idiot! 😂";
    return "🔥 Vittu! Vituttaa — Muji Chutiya idiot, focus on Finnish! 💀😂";
  }

  /* ---------- PERSONAL FRIEND MEMORY (REMEMBERS LIFE FACTS ACROSS CHATS) ---------- */
  function capturePersonalMemory(msg) {
    const t = (msg || "").trim();
    if (!t || t.length < 6 || t.length > 220) return;
    const patterns = [
      /\b(?:i am in|i'm in|i live in|living in|staying in)\s+([a-zäöåA-ZÄÖÅ\s-]{2,28})/i,
      /\b(?:my name is|call me)\s+([a-zäöåA-ZÄÖÅ\s-]{2,24})/i,
      /\b(?:i work as|my job is|i am a|i'm a|i love|my wife|my husband|my hobby)\s+([^.?!\n]{3,60})/i,
    ];
    for (const re of patterns) {
      if (re.test(t)) {
        const s = DB.getSettings();
        const mem = Array.isArray(s.friendMemory) ? s.friendMemory.slice() : [];
        const clean = t.slice(0, 120);
        if (!mem.some((x) => x.toLowerCase() === clean.toLowerCase())) {
          mem.unshift(clean);
          DB.saveSettings({ friendMemory: mem.slice(0, 12) });
        }
        break;
      }
    }
  }

  function detectMistakeInReply(replyText, mode, userPrompt) {
    const low = String(replyText || "").toLowerCase();
    const uLow = String(userPrompt || "").toLowerCase();
    const isPracticeOrCheck =
      mode === "homework_check" ||
      mode === "practice" ||
      /\b(correct|right|wrong|check my|my answer|did i say|is it|true or false)\b/i.test(uLow);
    if (!isPracticeOrCheck) return false;
    const mistakeRe = /\b(not quite|incorrect|wrong|mistake|mistakes|should be|instead of|correction:|almost right|small error|grammar error|väärin)\b/i;
    const praiseOnlyRe = /\b(perfect!|100% correct|spot on|exact match|no mistakes|oikein!)\b/i;
    if (praiseOnlyRe.test(low) && !mistakeRe.test(low)) {
      state.mistakeStreak = 0;
      return false;
    }
    return mistakeRe.test(low);
  }

  /* ---------- WALK & LISTEN PODCAST EPISODES ---------- */
  const PODCAST_EPISODES = [
    {
      id: "pod_cafe",
      title: "At a Finnish Café",
      duration: "~2 min",
      items: [
        { fi: "Hei! Saisinko yhden kahvin?", en: "Hi! Could I have one coffee?" },
        { fi: "Otatko maitoa?", en: "Would you like milk?" },
        { fi: "Kyllä kiitos, kauramaitoa.", en: "Yes please, oat milk." },
        { fi: "Maksan kortilla.", en: "I will pay by card." },
        { fi: "Kiitos paljon, mukavaa päivää!", en: "Thank you very much, have a nice day!" },
      ],
    },
    {
      id: "pod_market",
      title: "In the Supermarket",
      duration: "~2 min",
      items: [
        { fi: "Anteeksi, missä maito on?", en: "Excuse me, where is the milk?" },
        { fi: "Onko sinulla bonuskorttia?", en: "Do you have a bonus card?" },
        { fi: "Ei ole, kiitos.", en: "No I don't, thanks." },
        { fi: "En tarvitse muovipussia.", en: "I don't need a plastic bag." },
        { fi: "Kuitti riittää, kiitos!", en: "The receipt is enough, thank you!" },
      ],
    },
    {
      id: "pod_class",
      title: "In Finnish Class",
      duration: "~2 min",
      items: [
        { fi: "Huomenta, opettaja!", en: "Good morning, teacher!" },
        { fi: "Anteeksi, voitko toistaa?", en: "Excuse me, can you repeat?" },
        { fi: "Voitko puhua vähän hitaammin?", en: "Can you speak a bit slower?" },
        { fi: "Minulla on kysymys.", en: "I have a question." },
        { fi: "Nyt ymmärrän, kiitos!", en: "Now I understand, thank you!" },
      ],
    },
    {
      id: "pod_bus",
      title: "Bus & Directions",
      duration: "~2 min",
      items: [
        { fi: "Anteeksi, meneekö tämä bussi keskustaan?", en: "Excuse me, does this bus go to the city center?" },
        { fi: "Kyllä menee, rautatieasemalle.", en: "Yes it does, to the railway station." },
        { fi: "Kuinka kauan matka kestää?", en: "How long does the trip take?" },
        { fi: "Noin viisitoista minuuttia.", en: "About fifteen minutes." },
        { fi: "Kiitos paljon avusta!", en: "Thank you very much for your help!" },
      ],
    },
    {
      id: "pod_weather",
      title: "Talking About Weather",
      duration: "~2 min",
      items: [
        { fi: "Millainen sää tänään on?", en: "What is the weather like today?" },
        { fi: "Tänään on kylmä ja sataa lunta.", en: "Today it is cold and it is snowing." },
        { fi: "Ulkona on kymmenen astetta pakkasta.", en: "Outside it is minus ten degrees." },
        { fi: "Muista laittaa lämmin takki!", en: "Remember to put on a warm jacket!" },
        { fi: "Kesällä Suomessa on valoisaa.", en: "In summer it is bright in Finland." },
      ],
    },
    {
      id: "pod_street",
      title: "🗣️ Real Street Finnish & Slang",
      duration: "~2 min",
      items: [
        { fi: "Vittu!", en: "Fuck! / Damn!" },
        { fi: "Mitä vittua?", en: "What the fuck?" },
        { fi: "Voi vittu!", en: "Oh, fuck!" },
        { fi: "Vituttaa.", en: "I'm pissed off / It really annoys me." },
        { fi: "Ei jaksa.", en: "I can't be bothered / Too tired for this." },
        { fi: "Ihan sama.", en: "Whatever / I don't care." },
      ],
    },
    {
      id: "pod_cards",
      title: "My Saved Flashcards",
      duration: "Personal",
      dynamic: true,
      items: [],
    },
  ];

  const _audioMemCache = new Map();
  let _activeAudioEl = null;

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
      "position:fixed;top:64px;right:16px;z-index:2000;background:#0f1b2e;color:#fff;border:1px solid #38bdf8;padding:10px 14px;border-radius:12px;font-size:0.84rem;box-shadow:0 8px 24px rgba(0,0,0,0.5);";
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

  /* ---------- WARM HUMAN NEURAL VOICE (GEMINI TTS + CACHED WAV + LIVE STOP) ---------- */
  function stopActiveAudio(skipRender) {
    if (_activeAudioEl) {
      try { _activeAudioEl.onended = null; _activeAudioEl.pause(); _activeAudioEl.currentTime = 0; } catch (_) {}
      _activeAudioEl = null;
    }
    if ("speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    const wasSpeaking = Boolean(state.speakingMsgId);
    state.speakingMsgId = null;
    if (wasSpeaking && !skipRender) {
      renderActiveView();
      renderSidePanel();
    }
  }

  function fallbackBrowserSpeak(text, slow, msgId) {
    if (!("speechSynthesis" in window)) { stopActiveAudio(); return; }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "fi-FI";
      utter.rate = slow ? 0.68 : 0.95;
      const voices = window.speechSynthesis.getVoices() || [];
      const fiVoice = voices.find((v) => (v.lang || "").toLowerCase().startsWith("fi"));
      if (fiVoice) utter.voice = fiVoice;
      utter.onend = () => { if (state.speakingMsgId === msgId) stopActiveAudio(); };
      utter.onerror = () => { if (state.speakingMsgId === msgId) stopActiveAudio(); };
      window.speechSynthesis.speak(utter);
    } catch (_) {
      stopActiveAudio();
    }
  }

  async function speakFinnish(text, slow, msgId) {
    const targetId = msgId || ("tts_" + Date.now());
    if (msgId && state.speakingMsgId === msgId) {
      stopActiveAudio();
      return;
    }
    const clean = (text || "")
      .replace(/[*_`#>]/g, "")
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);
    if (!clean) return;

    stopActiveAudio(true);
    state.speakingMsgId = targetId;
    renderActiveView();
    renderSidePanel();

    const mode = slow ? "slow" : "phrase";
    const key = `${mode}|${clean}`;
    if (_audioMemCache.has(key)) {
      const audio = new Audio(_audioMemCache.get(key));
      _activeAudioEl = audio;
      audio.onended = () => { if (state.speakingMsgId === targetId) stopActiveAudio(); };
      audio.play().catch(() => fallbackBrowserSpeak(clean, slow, targetId));
      return;
    }

    toast(slow ? "🐢 Preparing clear slow voice..." : "🔊 Preparing full human voice...", "info");
    try {
      const res = await flApi("/api/finnish-lab/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, mode }),
      });
      if (state.speakingMsgId !== targetId) return; // User tapped Stop while loading!
      if (res && res.audio_base64) {
        const dataUrl = `data:${res.mime_type || "audio/wav"};base64,${res.audio_base64}`;
        _audioMemCache.set(key, dataUrl);
        const audio = new Audio(dataUrl);
        _activeAudioEl = audio;
        audio.onended = () => { if (state.speakingMsgId === targetId) stopActiveAudio(); };
        audio.play().catch(() => fallbackBrowserSpeak(clean, slow, targetId));
        return;
      }
    } catch (_) {
      // Quietly fall back to device voice if offline or quota full
    }
    if (state.speakingMsgId === targetId) {
      fallbackBrowserSpeak(clean, slow, targetId);
    }
  }

  function getAllPodcastEpisodes() {
    return [...(state.customPodcastEpisodes || []), ...PODCAST_EPISODES];
  }

  async function createCustomPodcastEpisode(topicStr) {
    const topic = (topicStr || "").trim();
    if (!topic) { toast("Type a topic first (e.g. At the doctor)!", "warning"); return; }
    state.podcastCreating = true;
    renderActiveView();
    try {
      const res = await flApi("/api/finnish-lab/podcast-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level: DB.getSettings().level || "A1" }),
      });
      const ep = {
        id: "pod_custom_" + Date.now(),
        title: "✨ " + (res.title || topic),
        duration: "~2 min",
        items: res.items || [],
      };
      state.customPodcastEpisodes.unshift(ep);
      state.podcastEpisodeId = ep.id;
      state.podcastAudioUrl = null;
      state.podcastShowScript = true;
      toast(`Created "${ep.title}"! Tap Play to listen 🎧`, "success");
    } catch (err) {
      toast(err.message || "Could not create episode.", "error");
    } finally {
      state.podcastCreating = false;
      renderActiveView();
    }
  }

  async function extractAndSaveFlashcards(payload) {
    if (state.extractingCards) return;
    state.extractingCards = true;
    toast("⏳ Extracting Finnish vocabulary into Flashcards...", "info");
    try {
      const res = await flApi("/api/finnish-lab/extract-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const cards = res.cards || [];
      if (!cards.length) {
        toast("No new Finnish vocabulary found to save.", "warning");
        return;
      }
      const existingSet = new Set((state.flashcards || []).map((c) => (c.fi || "").toLowerCase()));
      let added = 0;
      for (const c of cards) {
        if (!existingSet.has((c.fi || "").toLowerCase())) {
          await DB.addFlashcard({ fi: c.fi, en: c.en, example: c.example || "" });
          existingSet.add((c.fi || "").toLowerCase());
          added++;
        }
      }
      state.flashcards = await DB.listFlashcards();
      scheduleAutoSync();
      toast(`⭐ Saved ${added || cards.length} words to Flashcards & Podcast!`, "success");
      renderActiveView();
    } catch (err) {
      toast(err.message || "Could not extract flashcards.", "error");
    } finally {
      state.extractingCards = false;
    }
  }

  function getPodcastItems(ep) {
    if (!ep) return [];
    if (ep.dynamic) {
      return state.flashcards.slice(0, 8).map((c) => ({ fi: c.fi, en: c.en }));
    }
    return ep.items || [];
  }

  async function generateAndPlayPodcast(epId) {
    const ep = getAllPodcastEpisodes().find((x) => x.id === epId) || PODCAST_EPISODES[0];
    const items = getPodcastItems(ep);
    if (!items.length) {
      toast("Save a few flashcards first to turn your own words into a walking podcast!", "warning");
      return;
    }
    const scriptLines = [
      `Tervetuloa! Welcome to your Finnish walking podcast: ${ep.title}. Listen and repeat aloud as you walk.`,
    ];
    items.forEach((it, idx) => {
      scriptLines.push(`Number ${idx + 1}. ${it.fi}. ... In English, that means: ${it.en}. ... Again, clearly: ${it.fi}.`);
    });
    scriptLines.push("Hyvä! Great job practising Finnish today!");
    const fullScript = scriptLines.join("\n");

    const cacheKey = `podcast|${ep.id}|${fullScript}`;
    if (_audioMemCache.has(cacheKey)) {
      state.podcastAudioUrl = _audioMemCache.get(cacheKey);
      state.podcastLoading = false;
      renderActiveView();
      setTimeout(() => {
        const el = document.getElementById("fl-podcast-audio");
        if (el) { el.playbackRate = state.podcastSlow ? 0.8 : 1.0; el.play().catch(() => {}); }
      }, 40);
      return;
    }

    state.podcastLoading = true;
    state.podcastAudioUrl = null;
    renderActiveView();

    try {
      const res = await flApi("/api/finnish-lab/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullScript, mode: "podcast" }),
      });
      if (res && res.audio_base64) {
        const url = `data:${res.mime_type || "audio/wav"};base64,${res.audio_base64}`;
        _audioMemCache.set(cacheKey, url);
        state.podcastAudioUrl = url;
        DB.touchStudyStreak("listening");
      }
    } catch (err) {
      toast("Could not generate podcast audio: " + err.message, "error");
    } finally {
      state.podcastLoading = false;
      renderActiveView();
      setTimeout(() => {
        const el = document.getElementById("fl-podcast-audio");
        if (el) { el.playbackRate = state.podcastSlow ? 0.8 : 1.0; el.play().catch(() => {}); }
      }, 60);
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
        if (res.status === 401) {
          document.getElementById("studio-shell")?.classList.add("hidden");
          document.getElementById("signin-gate")?.classList.remove("hidden");
        }
        const err = new Error(data.message || data.error || `HTTP ${res.status}`);
        err.code = data.error || `HTTP_${res.status}`;
        throw err;
      }
      if (data.usage && state.status) state.status.usage = data.usage;
      return data;
    } catch (e) {
      if (e && e.name === "AbortError") {
        const err = new Error("Request timed out. Please try again — your data is safe.");
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

  async function refreshRole() {
    try {
      const r = await flApi("/api/finnish-lab/role");
      state.role = r.role || "guest";
      state.userEmail = r.email || "";
      state.userName = r.name || "";
      state.studentEnabled = r.student_enabled !== false;
      state.emailDeliveryConfigured = Boolean(r.email_delivery_configured);
      if (r.invite_code) state.inviteCode = r.invite_code;
      if (state.role === "admin") {
        await refreshAdminUsers();
      }
    } catch (_) {
      state.role = "guest";
    } finally {
      state.roleLoaded = true;
    }
  }

  async function refreshAdminUsers() {
    if (state.role !== "admin") return;
    try {
      const res = await flApi("/api/finnish-lab/admin/users");
      state.adminUsers = res.users || [];
      state.emailDeliveryConfigured = Boolean(res.email_delivery_configured);
    } catch (_) {}
  }

  async function autoPullSync() {
    if (state.role === "guest" || !state.userEmail) return;
    try {
      const r = await flApi("/api/finnish-lab/sync");
      if (r && r.has_snapshot && r.snapshot) {
        const cloudConvs = (r.snapshot.conversations || []).length;
        const localConvs = (state.conversations || []).length;
        // Import if cloud has conversations or local is empty
        if (cloudConvs > 0 && cloudConvs >= localConvs) {
          await DB.importAllData(r.snapshot);
          await loadAllData();
          renderActiveView();
        } else if (localConvs > cloudConvs) {
          scheduleAutoSync();
        }
      }
    } catch (_) {}
  }

  function scheduleAutoSync() {
    if (state.role === "guest" || !state.userEmail) return;
    if (state.autoSyncTimer) clearTimeout(state.autoSyncTimer);
    state.autoSyncTimer = setTimeout(async () => {
      try {
        const snap = await DB.exportAllData();
        await flApi("/api/finnish-lab/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot: snap }),
        });
      } catch (_) {}
    }, 1800);
  }

  async function refreshAuthAndSync() {
    await refreshRole();
    if (state.role !== "guest") {
      await Promise.all([refreshStatus(), autoPullSync()]);
    }
    renderActiveView();
  }

  /* ---------- AUDIO RECORDING (ATTACHES CLEANLY INTO INPUT BAR) ---------- */
  async function startRecording() {
    if (state.isRecording) return;
    if (state.isLiveTranslating) stopLiveTranslation();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Microphone not supported here. You can type or attach an audio file.", "warning");
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
      state.recordStartMs = Date.now();

      rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) state.mediaChunks.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(state.recordTimer);
        state.isRecording = false;
        const durationSec = Math.max(1, Math.round((Date.now() - state.recordStartMs) / 1000));
        const cleanMime = (rec.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(state.mediaChunks, { type: cleanMime });
        const b64 = await blobToBase64(blob);
        state.pendingAttachments.push({
          id: DB.uid("aud"),
          name: `Audio (${durationSec}s)`,
          mime_type: cleanMime,
          data_base64: b64,
          previewUrl: URL.createObjectURL(blob),
        });
        renderActiveView();
      };

      rec.start();
      state.recordTimer = setInterval(() => {
        const sec = Math.floor((Date.now() - state.recordStartMs) / 1000);
        const mm = String(Math.floor(sec / 60)).padStart(2, "0");
        const ss = String(sec % 60).padStart(2, "0");
        document.querySelectorAll(".fl-rec-timer").forEach((el) => { el.textContent = `${mm}:${ss}`; });
      }, 400);
      renderActiveView();
    } catch (_) {
      toast("Microphone permission denied.", "error");
    }
  }

  function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
      try { state.mediaRecorder.stop(); } catch (_) {}
    }
  }

  /* ---------- SILENT LIVE TRANSLATION (WRITTEN IN SAME CHAT, NEVER TALKS BACK!) ---------- */
  function toggleLiveTranslation() {
    if (state.isLiveTranslating) {
      stopLiveTranslation();
      return;
    }
    if (state.isRecording) stopRecording();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast("Your browser doesn't support live speech streaming — starting silent audio recording instead. Tap Stop when ready, then Send ⬆️!", "info");
      startRecording();
      return;
    }

    try {
      const rec = new SR();
      rec.lang = "fi-FI";
      rec.continuous = true;
      rec.interimResults = true;
      state.liveRecognition = rec;
      state.isLiveTranslating = true;
      state.liveInterimText = "Listening silently for Finnish...";

      rec.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const transcript = (ev.results[i][0].transcript || "").trim();
          if (ev.results[i].isFinal && transcript.length > 1) {
            state.liveInterimText = "Translating...";
            renderLiveBannerOnly();
            sendMessage(transcript, { mode: "live_translate", silentLive: true });
          } else {
            interim += transcript + " ";
          }
        }
        if (interim.trim()) {
          state.liveInterimText = interim.trim();
          renderLiveBannerOnly();
        }
      };

      rec.onerror = (ev) => {
        if (ev.error === "not-allowed") {
          toast("Microphone permission denied.", "error");
          stopLiveTranslation();
        }
      };

      rec.onend = () => {
        if (state.isLiveTranslating) {
          try { rec.start(); } catch (_) { stopLiveTranslation(); }
        }
      };

      rec.start();
      renderActiveView();
    } catch (_) {
      toast("Could not start live translation — use 🎙️ Record instead.", "warning");
    }
  }

  function stopLiveTranslation() {
    state.isLiveTranslating = false;
    state.liveInterimText = "";
    if (state.liveRecognition) {
      try { state.liveRecognition.onend = null; state.liveRecognition.stop(); } catch (_) {}
      state.liveRecognition = null;
    }
    renderActiveView();
  }

  function renderLiveBannerOnly() {
    const el = document.getElementById("fl-live-interim");
    if (el) el.textContent = state.liveInterimText || "Listening silently for Finnish...";
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

  function compressImageDataUrl(dataUrl, maxDim, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.width || 1;
          let h = img.height || 1;
          if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL("image/jpeg", quality);
          resolve(out);
        } catch (_) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function fileToAttachment(file) {
    if (!file) return null;
    if (file.size > 18 * 1024 * 1024) {
      toast("File exceeds 18 MB limit.", "error");
      return null;
    }
    const rawB64 = await blobToBase64(file);
    let mime = file.type || "image/jpeg";
    if (mime.startsWith("image/")) {
      // Auto-compress camera photos to ~100-150 KB JPEG for fast 4G upload & tiny phone storage
      const rawUrl = `data:${mime};base64,${rawB64}`;
      const compressedUrl = await compressImageDataUrl(rawUrl, 1280, 0.78);
      const thumbUrl = await compressImageDataUrl(compressedUrl, 320, 0.65);
      const compB64 = compressedUrl.includes(",") ? compressedUrl.split(",")[1] : rawB64;
      return {
        id: DB.uid("att"),
        name: file.name || "photo.jpg",
        mime_type: "image/jpeg",
        data_base64: compB64,
        previewUrl: compressedUrl,
        thumbUrl,
      };
    }
    return { id: DB.uid("att"), name: file.name || "file", mime_type: mime, data_base64: rawB64, previewUrl: null };
  }

  function compactAttachmentsForStorage(atts) {
    return (atts || []).map((a) => {
      const m = a.mime_type || "";
      if (m.startsWith("audio/")) {
        // Never bloat phone storage with raw audio clips after Gemini replies
        return { id: a.id, name: a.name || "Audio clip", mime_type: m, refLabel: a.refLabel || "" };
      }
      if (m.startsWith("image/")) {
        // Keep only a lightweight ~25 KB thumbnail in IndexedDB history
        const thumb = a.thumbUrl || a.previewUrl || null;
        return { id: a.id, name: a.name || "Photo", mime_type: "image/jpeg", previewUrl: thumb, refLabel: a.refLabel || "" };
      }
      // PDFs / other docs: keep metadata badge only in local history
      return { id: a.id, name: a.name || "Document", mime_type: m, refLabel: a.refLabel || "" };
    });
  }

  /* ---------- DATA & CONVERSATION ---------- */
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
      conv = await DB.saveConversation({ title: title || "Finnish Chat", kind: "chat", messages: [] });
      state.conversations.unshift(conv);
      state.activeConvId = conv.id;
    }
    return conv;
  }

  async function sendMessage(text, opts) {
    if (state.isSending && !(opts && opts.silentLive)) return;
    const options = opts || {};
    const msgText = (text || "").trim();
    const atts = options.attachments ? options.attachments.slice() : state.pendingAttachments.slice();
    if (!msgText && atts.length === 0) return;

    const hasAudio = atts.some((a) => (a.mime_type || "").startsWith("audio/"));
    const hasImageOrPdf = atts.some((a) => (a.mime_type || "").startsWith("image/") || a.mime_type === "application/pdf");

    let mode = options.mode;
    if (!mode) {
      if (hasAudio && hasImageOrPdf) mode = "teacher_recording";
      else if (hasAudio) mode = "teacher_recording";
      else mode = "quick_answer";
    }

    const aiPrompt =
      msgText ||
      (hasAudio && hasImageOrPdf
        ? "Listen carefully to the attached audio AND read the attached question paper/photo. Answer the questions based on what is heard and shown, with simple Finnish answers and English meanings."
        : hasAudio
        ? "Transcribe the Finnish audio, translate into clear English, explain simply, and suggest a short A1 Finnish answer."
        : "Read this photo/PDF, translate it to English, and help me understand and answer it.");

    const conv = await ensureActiveConv(msgText ? msgText.slice(0, 42) : hasAudio ? "Audio & Questions" : "Photo Question");
    const settings = DB.getSettings();

    // Assign sequential labels (Picture #1, Picture #2, PDF #1, Audio #1) & cache in RAM for follow-ups
    let picCount = 0, pdfCount = 0, audCount = 0;
    for (const m of conv.messages || []) {
      for (const a of m.attachments || []) {
        const mt = a.mime_type || "";
        if (mt.startsWith("image/")) picCount++;
        else if (mt === "application/pdf") pdfCount++;
        else if (mt.startsWith("audio/")) audCount++;
      }
    }
    const newRefLabels = [];
    for (const a of atts) {
      const mt = a.mime_type || "";
      if (mt.startsWith("image/")) {
        picCount++;
        a.refLabel = `Picture #${picCount}`;
      } else if (mt === "application/pdf") {
        pdfCount++;
        a.refLabel = `PDF #${pdfCount}`;
      } else if (mt.startsWith("audio/")) {
        audCount++;
        a.refLabel = `Audio #${audCount}`;
      } else {
        a.refLabel = a.name || "File";
      }
      newRefLabels.push(a.refLabel);
      if ((mt.startsWith("image/") || mt === "application/pdf") && a.data_base64) {
        state.sessionMediaMap[a.id] = { mime_type: mt, data_base64: a.data_base64, refLabel: a.refLabel };
      }
    }

    const aiPromptWithRefs = newRefLabels.length
      ? `[Attached: ${newRefLabels.join(", ")}]\n${aiPrompt}`
      : aiPrompt;

    // Build history and re-attach earlier photos/PDFs from RAM cache (or saved thumbnail fallback) so Gemini sees "1st picture" etc.!
    let historyMediaAttached = 0;
    const history = options.silentLive
      ? []
      : (conv.messages || []).slice(-10).map((m) => {
          const histAtts = [];
          const labels = [];
          for (const a of (m.attachments || []).slice(0, 2)) {
            if (a.refLabel) labels.push(a.refLabel);
            const mt = a.mime_type || "";
            if (historyMediaAttached >= 4) continue;
            const cached = a.id ? state.sessionMediaMap[a.id] : null;
            if (cached && cached.data_base64) {
              histAtts.push({ mime_type: cached.mime_type, data_base64: cached.data_base64 });
              historyMediaAttached++;
            } else if (mt.startsWith("image/") && a.previewUrl && a.previewUrl.startsWith("data:image/")) {
              const b64 = a.previewUrl.includes(",") ? a.previewUrl.split(",")[1] : "";
              if (b64) {
                histAtts.push({ mime_type: "image/jpeg", data_base64: b64 });
                historyMediaAttached++;
              }
            }
          }
          const prefix = labels.length ? `[Attached: ${labels.join(", ")}]\n` : "";
          return {
            role: m.role,
            text: prefix + (m.text || ""),
            attachments: histAtts,
          };
        });

    const userMsg = {
      id: DB.uid("msg"),
      role: "user",
      text: options.silentLive ? `🌐 ${msgText}` : (msgText || (hasAudio && hasImageOrPdf ? "🎙️ Audio + 📄 Question Paper" : hasAudio ? "🎙️ Audio Clip" : "📷 Photo / PDF")),
      attachments: compactAttachmentsForStorage(atts),
      at: new Date().toISOString(),
    };
    conv.messages.push(userMsg);
    if (conv.messages.length === 1 && msgText) conv.title = msgText.slice(0, 44);
    if (!options.keepAttachments) state.pendingAttachments = [];
    await DB.saveConversation(conv);

    state.isSending = true;
    renderActiveView();
    renderSidePanel();
    scrollChatsToBottom();

    try {
      capturePersonalMemory(msgText);
      const userMemory = Array.isArray(DB.getSettings().friendMemory) ? DB.getSettings().friendMemory : [];
      const resp = await flApi("/api/finnish-lab/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: aiPromptWithRefs,
          mode,
          level: settings.level || "A1",
          roast_mode: isRoastEnabled(),
          user_memory: userMemory,
          history,
          attachments: atts.map((a) => ({ mime_type: a.mime_type, data_base64: a.data_base64 })),
        }),
      });

      const roastBanner = detectMistakeInReply(resp.reply, mode, msgText) ? getRoastLine(true) : "";
      conv.messages.push({
        id: DB.uid("msg"),
        role: "assistant",
        text: resp.reply,
        roastBanner,
        finnishTts: resp.finnish_tts || "",
        at: new Date().toISOString(),
      });
      await DB.saveConversation(conv);
      DB.touchStudyStreak();
      scheduleAutoSync();
    } catch (err) {
      conv.messages.push({
        id: DB.uid("msg"),
        role: "assistant",
        text: `⚠️ **${err.code || "Error"}:** ${err.message}`,
        isError: true,
        at: new Date().toISOString(),
      });
      await DB.saveConversation(conv);
    } finally {
      state.isSending = false;
      renderActiveView();
      renderSidePanel();
      scrollChatsToBottom();
    }
  }

  function scrollChatsToBottom() {
    setTimeout(() => {
      const stage = document.getElementById("fl-chat-stage");
      if (stage) stage.scrollTop = stage.scrollHeight;
      document.querySelectorAll(".fl-side-messages").forEach((el) => { el.scrollTop = el.scrollHeight; });
    }, 40);
  }

  /* ---------- CROP / ROTATE MODAL ---------- */
  function openCropModal(listName, idx) {
    const list = listName === "hw" ? state.hwAttachments : state.pendingAttachments;
    const att = list[idx];
    if (!att || !att.previewUrl) return;
    state.cropTarget = { listName, idx, angle: 0, cropMargin: 0 };
    renderCropModal();
  }

  function renderCropModal() {
    let modal = document.getElementById("fl-crop-modal");
    if (!state.cropTarget) { if (modal) modal.remove(); return; }
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
          <strong style="color:#fff;">✂️ Rotate &amp; Crop</strong>
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

  /* ---------- MAIN RENDER (EXACT SCREENSHOT-1 CALM STYLE) ---------- */
  function renderStudentGate() {
    return `
      <div class="fl-student-gate">
        <div style="font-size:2.4rem;">🇫🇮</div>
        <h1 style="margin:0;font-size:1.35rem;color:#fff;">Finnish Learning Lab</h1>
        <p style="margin:0;font-size:0.86rem;color:#94a3b8;line-height:1.5;">
          Enter your family &amp; friends invite code once to start learning Finnish. Your phone will remember you automatically.
        </p>
        <input type="text" id="fl-student-code-input" class="fl-input" placeholder="Invite code (e.g. suomi2026)" autocomplete="off" style="text-align:center;font-size:1rem;letter-spacing:0.04em;" />
        <button type="button" id="fl-student-login-btn" class="fl-btn primary" style="width:100%;padding:11px;">Unlock Finnish Lab →</button>
        <div id="fl-student-gate-err" style="font-size:0.8rem;color:#fca5a5;min-height:18px;"></div>
      </div>
    `;
  }

  function renderActiveView() {
    const root = document.getElementById("finnish-lab-root");
    if (!root) return;

    if (state.isStudentRoute) {
      if (!state.roleLoaded) {
        root.innerHTML = `<div class="fl-student-gate"><div style="font-size:2rem;">🇫🇮</div><div style="color:#94a3b8;">Loading Finnish Learning Lab...</div></div>`;
        return;
      }
      if (state.role === "guest") {
        root.innerHTML = renderStudentGate();
        const doUnlock = async () => {
          const inp = document.getElementById("fl-student-code-input");
          const errEl = document.getElementById("fl-student-gate-err");
          const btn = document.getElementById("fl-student-login-btn");
          const code = (inp?.value || "").trim();
          if (!code) { if (errEl) errEl.textContent = "Please enter the invite code."; return; }
          if (btn) { btn.disabled = true; btn.textContent = "Checking..."; }
          if (errEl) errEl.textContent = "";
          try {
            await flApi("/api/finnish-lab/student/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code }),
            });
            await refreshRole();
            await refreshStatus();
            renderActiveView();
          } catch (err) {
            if (errEl) errEl.textContent = err.message || "Invalid invite code.";
            if (btn) { btn.disabled = false; btn.textContent = "Unlock Finnish Lab →"; }
          }
        };
        root.querySelector("#fl-student-login-btn")?.addEventListener("click", doUnlock);
        root.querySelector("#fl-student-code-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doUnlock(); } });
        return;
      }
    }

    const settings = DB.getSettings();
    const prog = DB.getProgress();
    const dueCount = state.flashcards.filter((c) => (c.dueAt || 0) <= Date.now()).length;

    root.innerHTML = `
      <div class="fl-app">
        <!-- Top Bar: [☰]    [ Chat | Study ]    [+] -->
        <header class="fl-header">
          <button type="button" class="fl-icon-circle" id="fl-open-drawer" title="Chats, Flashcards, Notes & Settings">☰</button>

          <div class="fl-segment" role="tablist">
            <button type="button" class="fl-seg-btn ${state.mode === "chat" ? "active" : ""}" data-fl-mode="chat">Chat</button>
            <button type="button" class="fl-seg-btn ${state.mode === "study" ? "active" : ""}" data-fl-mode="study">Study</button>
          </div>

          <button type="button" class="fl-new-chat-pill" id="fl-new-chat-top" title="Start a new chat">+ New Chat</button>
        </header>

        ${state.mode === "chat" ? renderChatMode() : renderStudyMode(prog)}
      </div>

      ${state.drawerOpen ? renderSlideDrawer(settings, prog, dueCount) : ""}
    `;

    bindMainEvents();
  }

  /* ---------- MODE 1: UNIVERSAL CHAT + SILENT LIVE TRANSLATION ---------- */
  function renderChatMode() {
    const conv = getActiveConv();
    const msgs = conv ? conv.messages || [] : [];

    return `
      <div class="fl-chat-stage" id="fl-chat-stage">
        ${
          msgs.length
            ? msgs.map((m, idx) => renderMessageBubble(m, idx)).join("")
            : `<div class="fl-empty-hero">
                <div class="fl-empty-flag">🇫🇮</div>
                <h1 class="fl-empty-title">Your Finnish AI Teacher</h1>
                <p class="fl-empty-sub">
                  Ask anything, attach a photo or PDF, record class audio + question paper together, or tap <strong>🌐 Live</strong> for silent real-time written translation.
                </p>
                <div class="fl-starter-row">
                  <button type="button" class="fl-starter-pill" data-fl-starter="Mitä kuuluu? How do I reply simply?">Mitä kuuluu?</button>
                  <button type="button" class="fl-starter-pill" data-fl-starter="Teach me 5 useful phrases for Finnish class.">5 class phrases</button>
                  <button type="button" class="fl-starter-pill" data-fl-starter="Explain the difference between kirjakieli and puhekieli simply.">Spoken Finnish</button>
                </div>
              </div>`
        }
        ${state.isSending ? `<div class="fl-msg assistant">⏳ Thinking...</div>` : ""}
      </div>

      <!-- Sleek Bottom Input Capsule (Exact Screenshot 1 Feel) -->
      <div class="fl-dock">
        ${
          state.isLiveTranslating
            ? `<div class="fl-live-bar">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                  <span class="fl-live-dot"></span>
                  <span id="fl-live-interim" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(state.liveInterimText)}</span>
                </div>
                <button type="button" class="fl-btn danger sm" id="fl-stop-live">Stop</button>
              </div>`
            : ""
        }

        <div class="fl-capsule">
          ${
            state.plusMenuOpen
              ? `<div class="fl-plus-menu" id="fl-plus-menu">
                  <label class="fl-plus-item">
                    <span>📷</span><span>Take Photo</span>
                    <input type="file" id="fl-input-camera" accept="image/*" capture="environment" style="display:none;" />
                  </label>
                  <label class="fl-plus-item">
                    <span>📎</span><span>Photo, PDF or Audio</span>
                    <input type="file" id="fl-input-files" accept="image/*,application/pdf,audio/*" multiple style="display:none;" />
                  </label>
                </div>`
              : ""
          }

          ${
            state.pendingAttachments.length
              ? `<div class="fl-att-row">
                  ${state.pendingAttachments
                    .map(
                      (a, i) => `
                    <div class="fl-att-chip">
                      ${a.previewUrl && a.mime_type.startsWith("image/") ? `<img src="${a.previewUrl}" class="fl-att-thumb" alt="" />` : a.mime_type.startsWith("audio/") ? "🎙️" : "📄"}
                      <span>${esc(a.name.slice(0, 16))}</span>
                      ${a.previewUrl && a.mime_type.startsWith("image/") ? `<button type="button" class="fl-mini-btn" style="padding:1px 5px;" data-fl-crop-pending="${i}">✂️</button>` : ""}
                      <button type="button" class="fl-mini-btn" style="padding:1px 5px;" data-fl-rm-pending="${i}">✕</button>
                    </div>
                  `
                    )
                    .join("")}
                </div>`
              : ""
          }

          <textarea id="fl-chat-input" class="fl-capsule-input" rows="1" placeholder="Ask anything in Finnish or English..."></textarea>

          <div class="fl-capsule-bar">
            <div class="fl-capsule-left">
              <button type="button" class="fl-cap-btn" id="fl-plus-btn" title="Attach Photo, Camera, PDF or Audio" style="font-size:1.25rem;padding:0;width:36px;">+</button>
            </div>
            <div class="fl-capsule-right">
              <button type="button" class="fl-cap-btn ${state.isLiveTranslating ? "active-live" : ""}" id="fl-live-btn" title="Silent Live Finnish → English Translation (written only)">
                <span>🌐</span><span>${state.isLiveTranslating ? "Live ON" : "Live"}</span>
              </button>
              ${
                state.isRecording
                  ? `<button type="button" class="fl-cap-btn active-rec" id="fl-stop-rec" title="Stop Recording"><span class="fl-rec-dot"></span><span class="fl-rec-timer">00:00</span></button>`
                  : `<button type="button" class="fl-cap-btn" id="fl-start-rec" title="Record Audio (teacher, listening track, or voice)" style="padding:0;width:36px;">🎙️</button>`
              }
              <button type="button" class="fl-send-circle" id="fl-chat-send" ${state.isSending ? "disabled" : ""} title="Send">↑</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderMessageBubble(m, idx) {
    const attHtml = (m.attachments || []).length
      ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
          ${m.attachments
            .map((a) =>
              a.previewUrl && (a.mime_type || "").startsWith("image/")
                ? `<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start;">
                    <img src="${a.previewUrl}" style="max-width:150px;max-height:115px;border-radius:10px;" alt="" />
                    ${a.refLabel ? `<span style="font-size:0.68rem;color:#cbd5e1;font-weight:700;">📷 ${esc(a.refLabel)}</span>` : ""}
                  </div>`
                : `<span class="fl-att-chip">${(a.mime_type || "").startsWith("audio/") ? "🎙️" : "📄"} ${esc(a.refLabel || a.name || "File")}</span>`
            )
            .join("")}
        </div>`
      : "";
    const isSpeakingThis = Boolean(m.id && state.speakingMsgId === m.id);
    const fullSpeakText = (m.text || "").slice(0, 1200);
    const actionsHtml =
      m.role === "assistant" && !m.isError
        ? `<div class="fl-msg-actions">
            ${
              isSpeakingThis
                ? `<button type="button" class="fl-mini-btn" data-fl-stop-speak="1" style="background:rgba(239,68,68,0.25);border-color:rgba(248,113,113,0.6);color:#fecaca;font-weight:700;">⏹️ Stop</button>`
                : `<button type="button" class="fl-mini-btn" data-fl-speak="${esc(fullSpeakText)}" data-fl-speak-id="${esc(m.id || ("m" + idx))}">🔊 Listen</button>`
            }
            <button type="button" class="fl-mini-btn" data-fl-speak-slow="${esc(fullSpeakText)}" data-fl-speak-id="${esc(m.id || ("m" + idx))}">🐢 Slow</button>
            <button type="button" class="fl-mini-btn" data-fl-explain-more="${idx}">Explain more</button>
            <button type="button" class="fl-mini-btn" data-fl-extract-cards="${idx}" title="Extract Finnish words to Flashcards & Podcast">⭐ Save Words</button>
            <button type="button" class="fl-mini-btn" data-fl-save-note="${idx}">💾 Save</button>
          </div>`
        : "";
    const roastHtml = m.roastBanner ? `<div class="fl-roast-banner">${esc(m.roastBanner)}</div>` : "";
    return `
      <div class="fl-msg ${m.role === "user" ? "user" : "assistant"}">
        ${roastHtml}
        ${attHtml}
        <div>${renderMarkdownLite(m.text)}</div>
        ${actionsHtml}
      </div>
    `;
  }

  /* ---------- MODE 2: HIGH-END STUDY HUB (3 CLEAN LUXURY CARDS) ---------- */
  function renderStudyMode(prog) {
    if (!state.studyTool) {
      const cardCount = (state.flashcards || []).length;
      return `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <!-- Sleek Top Progress Strip -->
          <div class="fl-study-stats-pill">
            <span>🔥 <strong>${prog.streakDays || 0} day</strong> streak</span>
            <span>⭐ <strong>${cardCount}</strong> saved cards</span>
            <span style="color:#38bdf8;font-weight:700;">CEFR ${esc(DB.getSettings().level || "A1")}</span>
          </div>

          <!-- Featured Hero Card 1: Walk & Listen Podcast Studio -->
          <button type="button" class="fl-study-hero-card" data-fl-study="podcast">
            <div class="fl-study-icon-badge">🎧</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                <strong style="font-size:1.06rem;letter-spacing:-0.01em;">Walk &amp; Listen Podcast</strong>
                <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(56,189,248,0.2);color:#7dd3fc;font-weight:800;">AI VOICE</span>
              </div>
              <span style="font-size:0.81rem;color:#cbd5e1;line-height:1.4;display:block;">
                Natural human voice episodes + create custom episodes on any topic. Put your phone in your pocket!
              </span>
            </div>
          </button>

          <div class="fl-study-grid">
            <button type="button" class="fl-study-tile" data-fl-study="lesson">
              <div class="fl-study-icon-badge" style="width:44px;height:44px;font-size:1.3rem;">📖</div>
              <strong style="font-size:0.98rem;">Today's 5-Min Lesson</strong>
              <span style="font-size:0.79rem;color:#94a3b8;line-height:1.4;">5 words (human voice) → 1 grammar rule → 1 quick check</span>
            </button>
            <button type="button" class="fl-study-tile" data-fl-study="helper">
              <div class="fl-study-icon-badge" style="width:44px;height:44px;font-size:1.3rem;">📝</div>
              <strong style="font-size:0.98rem;">Homework &amp; Vocab Snap</strong>
              <span style="font-size:0.79rem;color:#94a3b8;line-height:1.4;">Worksheet check, photo-to-flashcards, 17 A1 guides &amp; roleplay</span>
            </button>
          </div>
        </div>
      `;
    }
    const back = `<button type="button" class="fl-btn sm" id="fl-study-back" style="margin-bottom:10px;">← Back to Study</button>`;
    if (state.studyTool === "podcast") return back + renderPodcastTool();
    if (state.studyTool === "lesson") return back + renderLessonTool();
    return back + renderHelperHubTool();
  }

  function renderPodcastTool() {
    const allEps = getAllPodcastEpisodes();
    const ep = allEps.find((x) => x.id === state.podcastEpisodeId) || allEps[0];
    const items = getPodcastItems(ep);
    return `
      <div class="fl-card" style="padding:18px;border-radius:20px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div class="fl-study-icon-badge" style="width:46px;height:46px;font-size:1.35rem;">🎧</div>
          <div>
            <strong style="font-size:1.05rem;display:block;color:#fff;">Walk &amp; Listen — Podcast Studio</strong>
            <span style="font-size:0.78rem;color:#94a3b8;">Warm human voice • Finnish → English → slow repeat</span>
          </div>
        </div>

        <!-- Custom "Make My Own Episode" Creator -->
        <div class="fl-pod-creator">
          <div style="font-size:0.76rem;font-weight:700;color:#7dd3fc;">✨ Make My Own Episode (Any Topic)</div>
          <div style="display:flex;gap:6px;">
            <input type="text" id="fl-pod-custom-topic" class="fl-input" placeholder="e.g. At the doctor, Job interview, At Kela..." style="flex:1;font-size:0.84rem;" />
            <button type="button" class="fl-btn primary sm" id="fl-pod-create-btn" ${state.podcastCreating ? "disabled" : ""} style="white-space:nowrap;">${state.podcastCreating ? "⏳..." : "✨ Create"}</button>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <button type="button" class="fl-mini-btn" data-fl-pod-quick="At the doctor">🏥 Doctor</button>
            <button type="button" class="fl-mini-btn" data-fl-pod-quick="Job interview in Finland">💼 Job Interview</button>
            <button type="button" class="fl-mini-btn" data-fl-pod-quick="At Kela or Migri">🏛️ Kela</button>
            <button type="button" class="fl-mini-btn" data-fl-pod-quick="Small talk with Finnish neighbor">☕ Neighbor</button>
          </div>
        </div>

        <!-- Episode Picker -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
          ${allEps.map(
            (p) => `<button type="button" class="fl-btn sm ${p.id === ep.id ? "active" : ""}" data-fl-pod-ep="${p.id}">${esc(p.title)}</button>`
          ).join("")}
        </div>

        <!-- Spotify-Style Luxury Player -->
        <div class="fl-pod-player-card">
          <div style="font-size:1.08rem;font-weight:800;color:#fff;margin-bottom:4px;">${esc(ep.title)}</div>
          <div style="font-size:0.78rem;color:#7dd3fc;margin-bottom:14px;">${items.length} sentences • ${esc(ep.duration)} • Human Neural Voice</div>

          ${
            state.podcastLoading
              ? `<div style="padding:14px;color:#7dd3fc;font-weight:700;">⏳ Preparing warm human voice episode... (cached after first play)</div>`
              : state.podcastAudioUrl
              ? `<audio id="fl-podcast-audio" controls src="${state.podcastAudioUrl}" style="width:100%;margin-bottom:12px;"></audio>
                 <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
                   <button type="button" class="fl-btn sm ${state.podcastSlow ? "active" : ""}" id="fl-pod-slow">🐢 Slow (0.8×): ${state.podcastSlow ? "ON" : "OFF"}</button>
                   <button type="button" class="fl-btn sm" id="fl-pod-replay">↺ Replay</button>
                   <button type="button" class="fl-btn sm" id="fl-pod-script-toggle">${state.podcastShowScript ? "🙈 Hide Text" : "👁️ Show Text"}</button>
                 </div>`
              : `<button type="button" class="fl-pod-play-cta" id="fl-pod-play-btn">▶ Play Walking Podcast</button>
                 <div style="margin-top:12px;">
                   <button type="button" class="fl-mini-btn" id="fl-pod-script-toggle">${state.podcastShowScript ? "🙈 Hide Text" : "👁️ Preview Sentences"}</button>
                 </div>`
          }
        </div>

        ${
          state.podcastShowScript
            ? `<div style="margin-top:12px;">
                ${items
                  .map(
                    (it, idx) => `
                  <div class="fl-vocab-row">
                    <div>
                      <strong style="color:#fff;">${idx + 1}. ${esc(it.fi)}</strong>
                      <div style="font-size:0.78rem;color:#7dd3fc;">🇬🇧 ${esc(it.en)}</div>
                    </div>
                    <button type="button" class="fl-mini-btn" data-fl-speak="${esc(it.fi)}">🔊</button>
                  </div>
                `
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>
    `;
  }

  function renderHelperHubTool() {
    const ht = state.helperTab || "homework";
    return `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
        <button type="button" class="fl-btn sm ${ht === "homework" ? "active" : ""}" data-fl-htab="homework">📝 Homework</button>
        <button type="button" class="fl-btn sm ${ht === "lookup" ? "active" : ""}" data-fl-htab="lookup">🔎 Word &amp; Grammar</button>
        <button type="button" class="fl-btn sm ${ht === "practice" ? "active" : ""}" data-fl-htab="practice">🗣️ Writing &amp; Roleplay</button>
      </div>
      ${ht === "homework" ? renderHomeworkTool() : ht === "lookup" ? renderLookupTool() : renderPracticeTool()}
    `;
  }

  function renderHomeworkTool() {
    return `
      <div class="fl-card">
        <strong style="font-size:1rem;display:block;margin-bottom:10px;">📝 Homework Helper</strong>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <label class="fl-btn primary" style="cursor:pointer;">
            📷 Upload Worksheet / PDF
            <input type="file" id="fl-hw-files" accept="image/*,application/pdf" multiple style="display:none;" />
          </label>
          ${state.hwAttachments.length ? `<button type="button" class="fl-btn sm" id="fl-hw-clear">Clear</button>` : ""}
        </div>
        ${
          state.hwAttachments.length
            ? `<div class="fl-att-row">
                ${state.hwAttachments
                  .map(
                    (p, i) => `
                  <div class="fl-att-chip">
                    ${p.previewUrl ? `<img src="${p.previewUrl}" class="fl-att-thumb" alt="" />` : "📄"}
                    <span>${esc(p.name.slice(0, 16))}</span>
                    ${p.previewUrl ? `<button type="button" class="fl-mini-btn" style="padding:1px 5px;" data-fl-crop-hw="${i}">✂️</button>` : ""}
                    <button type="button" class="fl-mini-btn" style="padding:1px 5px;" data-fl-rm-hw="${i}">✕</button>
                  </div>
                `
                  )
                  .join("")}
              </div>`
            : ""
        }
        <input type="text" id="fl-hw-exercise" class="fl-input" style="margin-bottom:8px;" placeholder="Which exercise? (e.g. Exercise 3)" />
        <textarea id="fl-hw-answer" class="fl-textarea" rows="2" style="margin-bottom:10px;" placeholder="Optional: write your Finnish answer to check..."></textarea>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <button type="button" class="fl-btn" data-fl-hw="hint">💡 Hint</button>
          <button type="button" class="fl-btn success" data-fl-hw="check">✅ Check</button>
          <button type="button" class="fl-btn primary" data-fl-hw="answer">👁️ Answer</button>
        </div>
        <button type="button" class="fl-btn sm" id="fl-hw-to-cards" style="width:100%;margin-top:8px;border-color:rgba(250,204,21,0.35);color:#fef08a;">
          ⭐ Snap Vocab Photo → Save All Words to Flashcards
        </button>
      </div>
    `;
  }

  function renderLessonTool() {
    const pack = CURR.getTodayVocabPack();
    const gram = CURR.getTodayGrammarTopic();
    const step = state.lessonStep;
    return `
      <div class="fl-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <strong style="font-size:1rem;">📖 Today's Lesson — Step ${step}/3</strong>
          <span style="font-size:0.76rem;color:#7dd3fc;">${step === 1 ? pack.topic : step === 2 ? "1 Simple Rule" : "Quick Check"}</span>
        </div>
        ${
          step === 1
            ? `${pack.words
                .map(
                  (w, i) => `
                <div class="fl-vocab-row">
                  <div>
                    <strong>${esc(w.fi)}</strong> — <span style="color:#7dd3fc;">${esc(w.en)}</span>
                    <div style="font-size:0.74rem;color:#94a3b8;">${esc(w.exFi)} <em>(${esc(w.exEn)})</em></div>
                  </div>
                  <div style="display:flex;gap:4px;">
                    <button type="button" class="fl-mini-btn" data-fl-speak="${esc(w.fi + ". " + w.exFi)}">🔊</button>
                    <button type="button" class="fl-mini-btn" data-fl-save-vocab="${i}">⭐</button>
                  </div>
                </div>
              `
                )
                .join("")}
              <button type="button" class="fl-btn primary" id="fl-lesson-next" style="width:100%;margin-top:8px;">Next: 1 Simple Rule →</button>`
            : step === 2
            ? `<strong style="color:#7dd3fc;">${esc(gram.title)}</strong>
              <p style="font-size:0.88rem;line-height:1.55;">${esc(gram.en)}</p>
              <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:10px;margin-bottom:10px;font-size:0.84rem;color:#6ee7b7;"><strong>🇫🇮 Suomeksi:</strong> ${esc(gram.fi)}</div>
              <ul style="padding-left:18px;font-size:0.84rem;margin-bottom:12px;">${(gram.pos || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
              <div style="display:flex;gap:8px;">
                <button type="button" class="fl-btn" id="fl-lesson-prev">← Back</button>
                <button type="button" class="fl-btn primary" id="fl-lesson-next" style="flex:1;">Next: Quick Check →</button>
              </div>`
            : `<div style="font-weight:700;margin-bottom:10px;">${esc(gram.quiz.q)}</div>
              <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;">
                ${gram.quiz.options.map((o, i) => `<button type="button" class="fl-btn" style="justify-content:flex-start;" data-fl-quiz-ans="${i === gram.quiz.ans ? "1" : "0"}" data-fl-quiz-exp="${esc(gram.quiz.exp)}">${esc(o)}</button>`).join("")}
              </div>
              <div id="fl-quiz-out" style="font-size:0.84rem;margin-bottom:10px;"></div>
              <div style="display:flex;gap:8px;">
                <button type="button" class="fl-btn" id="fl-lesson-prev">← Back</button>
                <button type="button" class="fl-btn success" id="fl-lesson-done" style="flex:1;">✓ Finish Lesson</button>
              </div>`
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
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
        <button type="button" class="fl-btn sm ${sk === "reading" ? "active" : ""}" data-fl-skill="reading">📰 Reading</button>
        <button type="button" class="fl-btn sm ${sk === "writing" ? "active" : ""}" data-fl-skill="writing">✍️ Writing</button>
        <button type="button" class="fl-btn sm ${sk === "listening" ? "active" : ""}" data-fl-skill="listening">🎧 Listening</button>
        <button type="button" class="fl-btn sm ${sk === "speaking" ? "active" : ""}" data-fl-skill="speaking">🗣️ Roleplay</button>
      </div>
      ${
        sk === "reading"
          ? `<div class="fl-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <strong>${esc(r.title)}</strong>
                <div style="display:flex;gap:4px;">
                  <button type="button" class="fl-mini-btn" data-fl-speak="${esc((r.sentences || []).map((s) => s.fi).join(" "))}">🔊</button>
                  <button type="button" class="fl-mini-btn" data-fl-speak-slow="${esc((r.sentences || []).map((s) => s.fi).join(" "))}">🐢</button>
                </div>
              </div>
              ${(r.sentences || []).map((s) => `<div style="padding:9px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:8px;"><strong>${esc(s.fi)}</strong><div style="font-size:0.8rem;color:#7dd3fc;">${esc(s.en)}</div>${s.spoken_fi ? `<div style="font-size:0.76rem;color:#6ee7b7;">Spoken: ${esc(s.spoken_fi)}</div>` : ""}</div>`).join("")}
            </div>`
          : sk === "writing"
          ? `<div class="fl-card">
              <strong style="display:block;margin-bottom:8px;">✍️ Check Your Finnish Writing</strong>
              <textarea id="fl-write-text" class="fl-textarea" rows="3" placeholder="Write 1–3 Finnish sentences..."></textarea>
              <button type="button" class="fl-btn primary" id="fl-write-submit" style="margin-top:8px;">✅ Check</button>
              <div id="fl-write-out" style="margin-top:10px;"></div>
            </div>`
          : sk === "listening"
          ? `<div class="fl-card">
              <strong style="display:block;margin-bottom:10px;">🎧 ${esc(l.title)}</strong>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                <button type="button" class="fl-btn primary sm" data-fl-speak="${esc(fullFi)}">🔊 Play</button>
                <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(fullFi)}">🐢 Slow</button>
                <button type="button" class="fl-btn sm" id="fl-listen-toggle-tr">${state.listeningShowTranscript ? "Hide Text" : "Show Text"}</button>
              </div>
              ${state.listeningShowTranscript ? (l.lines || []).map((ln) => `<div style="margin-bottom:6px;"><strong>${esc(ln.speaker)}:</strong> ${esc(ln.fi)}<div style="font-size:0.78rem;color:#7dd3fc;">${esc(ln.en)}</div></div>`).join("") : `<div style="font-size:0.8rem;color:#94a3b8;">Listen first, then tap Show Text!</div>`}
            </div>`
          : `<div class="fl-card">
              <strong style="display:block;margin-bottom:10px;">🗣️ Everyday Roleplay</strong>
              ${CURR.ROLEPLAY_SCENARIOS.map((rp) => `<div class="fl-vocab-row"><span>${esc(rp.title)}</span><button type="button" class="fl-btn primary sm" data-fl-start-roleplay="${rp.id}">Start →</button></div>`).join("")}
            </div>`
      }
    `;
  }

  function renderLookupTool() {
    const topic = CURR.GRAMMAR_TOPICS.find((t) => t.id === state.selectedGrammarId) || CURR.GRAMMAR_TOPICS[0];
    return `
      <div class="fl-card" style="margin-bottom:12px;">
        <strong style="display:block;margin-bottom:8px;">🔎 Look Up Any Finnish Word</strong>
        <div style="display:flex;gap:8px;">
          <input type="text" id="fl-anatomy-input" class="fl-input" placeholder="e.g. kaupassa, ymmärrän, kahvia..." />
          <button type="button" class="fl-btn primary" id="fl-anatomy-search">Look Up</button>
        </div>
        <div id="fl-anatomy-out" style="margin-top:10px;"></div>
      </div>
      <div class="fl-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <strong>📐 Simple A1 Grammar</strong>
          <select id="fl-grammar-select" class="fl-select" style="width:auto;max-width:100%;">
            ${CURR.GRAMMAR_TOPICS.map((t) => `<option value="${t.id}" ${t.id === topic.id ? "selected" : ""}>${esc(t.title)}</option>`).join("")}
          </select>
        </div>
        <p style="font-size:0.85rem;line-height:1.5;">${esc(topic.en)}</p>
        <div style="background:rgba(255,255,255,0.05);padding:9px;border-radius:9px;font-size:0.82rem;color:#6ee7b7;margin-bottom:8px;"><strong>🇫🇮 Suomeksi:</strong> ${esc(topic.fi)}</div>
        <ul style="padding-left:18px;font-size:0.84rem;">${(topic.pos || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      </div>
    `;
  }

  /* ---------- SLIDE-OVER DRAWER (☰: CHATS, FLASHCARDS, NOTES, SETTINGS) ---------- */
  function renderSlideDrawer(settings, prog, dueCount) {
    const t = state.drawerTab;
    const dueCards = state.flashcards.filter((c) => (c.dueAt || 0) <= Date.now());
    const activeCard = dueCards[0] || state.flashcards[0];
    const u = (state.status && state.status.usage) || { used: 0, limit: 60, remaining: 60 };

    return `
      <div class="fl-drawer-backdrop" id="fl-drawer-backdrop">
        <div class="fl-drawer-sheet">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:1rem;color:#fff;">🇫🇮 Finnish Lab</strong>
            <button type="button" class="fl-btn sm" id="fl-close-drawer">✕</button>
          </div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">
            <button type="button" class="fl-btn sm ${t === "chats" ? "active" : ""}" data-fl-dtab="chats">Chats</button>
            <button type="button" class="fl-btn sm ${t === "flashcards" ? "active" : ""}" data-fl-dtab="flashcards">Cards${dueCount ? ` (${dueCount})` : ""}</button>
            <button type="button" class="fl-btn sm ${t === "notes" ? "active" : ""}" data-fl-dtab="notes">Notes</button>
            <button type="button" class="fl-btn sm ${t === "settings" ? "active" : ""}" data-fl-dtab="settings">⚙️</button>
          </div>

          ${
            t === "chats"
              ? `<div>
                  <button type="button" class="fl-btn primary sm" id="fl-drawer-new-chat" style="width:100%;margin-bottom:10px;">+ New Chat</button>
                  ${
                    state.conversations.length
                      ? state.conversations
                          .map(
                            (c) => `
                        <div class="fl-vocab-row" style="cursor:pointer;${c.id === state.activeConvId ? "border-color:#38bdf8;" : ""}" data-fl-select-conv="${c.id}">
                          <span style="font-size:0.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.title)}</span>
                          <button type="button" class="fl-mini-btn" data-fl-del-conv="${c.id}">🗑️</button>
                        </div>
                      `
                          )
                          .join("")
                      : `<div style="font-size:0.8rem;color:#94a3b8;">No saved chats yet.</div>`
                  }
                </div>`
              : t === "flashcards"
              ? `<div>
                  ${
                    activeCard
                      ? `<div class="fl-flashcard-stage" id="fl-card-flip">
                          <div style="font-size:0.72rem;color:#94a3b8;">${state.flashcardFlipped ? "ENGLISH" : "FINNISH (tap to flip)"}</div>
                          <div style="font-size:1.3rem;font-weight:800;color:#fff;">${esc(state.flashcardFlipped ? activeCard.en : activeCard.fi)}</div>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px;">
                          <button type="button" class="fl-btn danger sm" data-fl-rate-card="${activeCard.id}" data-fl-rating="again">Again</button>
                          <button type="button" class="fl-btn primary sm" data-fl-rate-card="${activeCard.id}" data-fl-rating="good">Good</button>
                          <button type="button" class="fl-btn success sm" data-fl-rate-card="${activeCard.id}" data-fl-rating="easy">Easy</button>
                        </div>`
                      : `<div style="font-size:0.82rem;color:#94a3b8;margin-bottom:10px;">No flashcards yet. Add one below!</div>`
                  }
                  <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">
                    <input type="text" id="fl-new-card-fi" class="fl-input" placeholder="Finnish word" />
                    <input type="text" id="fl-new-card-en" class="fl-input" placeholder="English meaning" />
                    <button type="button" class="fl-btn primary sm" id="fl-add-custom-card">+ Save Flashcard</button>
                  </div>
                </div>`
              : t === "notes"
              ? `<div>
                  ${
                    state.notes.length
                      ? state.notes
                          .map(
                            (n) => `
                        <div class="fl-vocab-row" style="flex-direction:column;align-items:stretch;">
                          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                            <strong style="font-size:0.82rem;">${esc(n.title)}</strong>
                            <div style="display:flex;gap:4px;">
                              <button type="button" class="fl-mini-btn" data-fl-export-note="${n.id}">⬇️</button>
                              <button type="button" class="fl-mini-btn" data-fl-del-note="${n.id}">🗑️</button>
                            </div>
                          </div>
                          <div style="font-size:0.76rem;color:#cbd5e1;margin-top:4px;">${renderMarkdownLite((n.content || "").slice(0, 220))}</div>
                        </div>
                      `
                          )
                          .join("")
                      : `<div style="font-size:0.82rem;color:#94a3b8;">No saved notes yet. Tap 💾 Save on any reply!</div>`
                  }
                </div>`
              : `<div style="display:flex;flex-direction:column;gap:10px;font-size:0.82rem;">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;background:rgba(255,255,255,0.05);padding:8px 10px;border-radius:10px;">
                    <div style="min-width:0;">
                      <div style="font-size:0.76rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">👤 ${esc(state.userEmail || "Signed In")}</div>
                      <div style="font-size:0.68rem;color:#6ee7b7;">${state.role === "admin" ? "👑 Admin • Auto-Sync ON" : "🎓 Student • Auto-Sync ON"}</div>
                    </div>
                    <button type="button" class="fl-btn danger sm" id="fl-signout-btn" style="padding:5px 9px;font-size:0.72rem;">Sign Out</button>
                  </div>

                  <div>
                    <label style="color:#94a3b8;font-size:0.74rem;">Level</label>
                    <select id="fl-level-select" class="fl-select">
                      <option value="A1" ${settings.level === "A1" ? "selected" : ""}>A1 (Beginner)</option>
                      <option value="A2" ${settings.level === "A2" ? "selected" : ""}>A2 (Elementary)</option>
                    </select>
                  </div>
                  ${
                    state.role === "admin"
                      ? `<div class="fl-admin-share-card">
                          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                            <strong style="color:#fff;font-size:0.84rem;">👥 Access Requests &amp; Users</strong>
                            <button type="button" class="fl-mini-btn" id="fl-refresh-users-btn" title="Refresh list">↻</button>
                          </div>
                          <div style="font-size:0.73rem;color:#cbd5e1;line-height:1.4;">
                            Share this single link — friends Sign Up, then you approve them here. They see <strong>only</strong> Finnish Lab.
                          </div>
                          <div style="display:flex;gap:6px;">
                            <input type="text" readonly id="fl-student-share-url" class="fl-input" value="${esc(window.location.origin + "/")}" style="font-size:0.74rem;padding:7px 9px;" />
                            <button type="button" class="fl-btn primary sm" id="fl-copy-student-url">📋 Copy</button>
                          </div>
                          ${
                            state.adminUsers.length
                              ? `<div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
                                  ${state.adminUsers
                                    .map(
                                      (usr) => `
                                    <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:5px;">
                                      <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">
                                        <strong style="font-size:0.78rem;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(usr.name)}</strong>
                                        <span style="font-size:0.68rem;font-weight:700;color:${usr.status === "approved" ? "#6ee7b7" : usr.status === "pending" ? "#fde047" : "#fca5a5"};">
                                          ${usr.status === "approved" ? "✅ Approved" : usr.status === "pending" ? "⏳ Pending" : "🚫 Revoked"}
                                        </span>
                                      </div>
                                      <div style="font-size:0.71rem;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;">${esc(usr.email)} ${usr.email_verified ? "• ✉️ Verified" : "• Unverified"}</div>
                                      ${usr.verify_code ? `<div style="font-size:0.71rem;color:#7dd3fc;">Verify code: <strong>${esc(usr.verify_code)}</strong></div>` : ""}
                                      ${usr.reset_code ? `<div style="font-size:0.71rem;color:#fde047;">Reset code: <strong>${esc(usr.reset_code)}</strong></div>` : ""}
                                      <div style="display:flex;gap:5px;flex-wrap:wrap;">
                                        ${usr.status !== "approved" ? `<button type="button" class="fl-btn success sm" data-fl-user-act="approve" data-fl-user-email="${esc(usr.email)}" style="padding:4px 8px;font-size:0.72rem;">✅ Approve</button>` : ""}
                                        ${usr.status === "approved" ? `<button type="button" class="fl-btn danger sm" data-fl-user-act="revoke" data-fl-user-email="${esc(usr.email)}" style="padding:4px 8px;font-size:0.72rem;">🚫 Revoke</button>` : ""}
                                        <button type="button" class="fl-mini-btn" data-fl-user-act="delete" data-fl-user-email="${esc(usr.email)}" title="Delete user">🗑️</button>
                                      </div>
                                    </div>
                                  `
                                    )
                                    .join("")}
                                </div>`
                              : `<div style="font-size:0.74rem;color:#94a3b8;padding:4px 0;">No friends signed up yet. Share your link above!</div>`
                          }
                        </div>`
                      : ""
                  }
                  <button type="button" id="fl-roast-toggle" class="fl-btn sm ${isRoastEnabled() ? "active" : ""}">
                    ${isRoastEnabled() ? "😈 Fun Roast Mode: ON" : "😇 Fun Roast Mode: OFF"}
                  </button>
                  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:12px;padding:9px;display:flex;flex-direction:column;gap:6px;">
                    <strong style="font-size:0.76rem;color:#e2e8f0;">🔑 Change Password</strong>
                    <input type="password" id="fl-cur-pass" class="fl-input" placeholder="Current password" style="font-size:0.76rem;padding:6px 8px;" />
                    <input type="password" id="fl-new-pass" class="fl-input" placeholder="New password (min 6 chars)" style="font-size:0.76rem;padding:6px 8px;" />
                    <button type="button" class="fl-btn sm" id="fl-change-pass-btn">Update Password</button>
                  </div>
                  <div style="font-size:0.72rem;color:#94a3b8;line-height:1.45;">
                    💾 <strong>Smart Storage &amp; Sync:</strong> Photos auto-compress (~120 KB), audio auto-clears, and your chats auto-sync across phone, iPad &amp; laptop.
                  </div>
                  ${state.role === "admin" ? `<button type="button" id="fl-focus-toggle" class="fl-btn sm ${state.focusMode ? "active" : ""}">${state.focusMode ? "↙ Show Studio Sidebar" : "⛶ Full-Screen Focus Mode"}</button>` : ""}
                  <div style="color:#94a3b8;">🔥 Streak: ${prog.streakDays || 0}d • AI left today: ${u.remaining}/${u.limit}</div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);">
                    <button type="button" class="fl-btn primary sm" id="fl-export-backup">⬇️ Export</button>
                    <label class="fl-btn sm" style="cursor:pointer;">⬆️ Import<input type="file" id="fl-import-backup" accept="application/json" style="display:none;" /></label>
                    <button type="button" class="fl-btn sm" id="fl-cloud-push">☁️ Save Sync</button>
                    <button type="button" class="fl-btn sm" id="fl-cloud-pull">☁️ Load Sync</button>
                  </div>
                </div>`
          }
        </div>
      </div>
    `;
  }

  /* ---------- FLOATING TUTOR & SIDE PANEL (OUTSIDE FINNISH LAB) ---------- */
  function mountFloatingAndSidePanel() {
    if (state.isStudentRoute) return;
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
    if (state.sidePanelOpen) { renderSidePanel(); scrollChatsToBottom(); }
  }

  function renderSidePanel() {
    const panel = document.getElementById("fl-side-panel");
    if (!panel) return;
    const conv = getActiveConv();
    const msgs = conv ? conv.messages || [] : [];
    panel.innerHTML = `
      <div class="fl-side-header">
        <strong style="color:#fff;font-size:0.9rem;">🇫🇮 Finnish Tutor</strong>
        <div style="display:flex;gap:6px;">
          <button type="button" class="fl-btn primary sm" id="fl-side-expand">⛶ Full Lab</button>
          <button type="button" class="fl-btn sm" id="fl-side-close">✕</button>
        </div>
      </div>
      <div class="fl-side-body">
        <div class="fl-side-messages">
          ${msgs.length ? msgs.slice(-10).map((m, i) => renderMessageBubble(m, i)).join("") : `<div class="fl-msg assistant">Hei! Ask any Finnish question while you work.</div>`}
          ${state.isSending ? `<div class="fl-msg assistant">⏳ Thinking...</div>` : ""}
        </div>
        <div style="display:flex;gap:6px;">
          <input type="text" id="fl-side-input" class="fl-input" style="padding:8px 10px;" placeholder="Ask Finnish Tutor..." />
          <button type="button" class="fl-send-circle" id="fl-side-send" ${state.isSending ? "disabled" : ""}>↑</button>
        </div>
      </div>
    `;
    panel.querySelector("#fl-side-close")?.addEventListener("click", () => toggleSidePanel(false));
    panel.querySelector("#fl-side-expand")?.addEventListener("click", () => { toggleSidePanel(false); window.openFinnishLabView?.(); });
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

  /* ---------- EVENT WIRING ---------- */
  function bindCommonMessageButtons(container) {
    container.querySelectorAll("[data-fl-speak]").forEach((b) => { b.onclick = () => speakFinnish(b.getAttribute("data-fl-speak"), false, b.getAttribute("data-fl-speak-id")); });
    container.querySelectorAll("[data-fl-speak-slow]").forEach((b) => { b.onclick = () => speakFinnish(b.getAttribute("data-fl-speak-slow"), true, b.getAttribute("data-fl-speak-id")); });
    container.querySelectorAll("[data-fl-stop-speak]").forEach((b) => { b.onclick = () => stopActiveAudio(); });
  }

  function bindMainEvents() {
    const root = document.getElementById("finnish-lab-root");
    if (!root) return;

    // Top bar
    root.querySelector("#fl-open-drawer")?.addEventListener("click", () => { state.drawerOpen = true; renderActiveView(); });
    root.querySelectorAll("[data-fl-mode]").forEach((b) => {
      b.onclick = () => { state.mode = b.getAttribute("data-fl-mode"); state.plusMenuOpen = false; renderActiveView(); };
    });
    const startFreshChat = async () => {
      const c = await DB.saveConversation({ title: "New Chat", kind: "chat", messages: [] });
      state.conversations.unshift(c);
      state.activeConvId = c.id;
      state.mode = "chat";
      state.drawerOpen = false;
      renderActiveView();
    };
    root.querySelector("#fl-new-chat-top")?.addEventListener("click", startFreshChat);
    root.querySelector("#fl-drawer-new-chat")?.addEventListener("click", startFreshChat);

    // Chat capsule
    root.querySelector("#fl-plus-btn")?.addEventListener("click", () => { state.plusMenuOpen = !state.plusMenuOpen; renderActiveView(); });
    const handleFileUpload = async (e) => {
      state.plusMenuOpen = false;
      for (const f of Array.from(e.target.files || [])) {
        const att = await fileToAttachment(f);
        if (att) state.pendingAttachments.push(att);
      }
      e.target.value = "";
      renderActiveView();
    };
    root.querySelector("#fl-input-camera")?.addEventListener("change", handleFileUpload);
    root.querySelector("#fl-input-files")?.addEventListener("change", handleFileUpload);
    root.querySelectorAll("[data-fl-rm-pending]").forEach((b) => { b.onclick = () => { state.pendingAttachments.splice(Number(b.getAttribute("data-fl-rm-pending")), 1); renderActiveView(); }; });
    root.querySelectorAll("[data-fl-crop-pending]").forEach((b) => { b.onclick = () => openCropModal("pending", Number(b.getAttribute("data-fl-crop-pending"))); });

    root.querySelector("#fl-start-rec")?.addEventListener("click", startRecording);
    root.querySelector("#fl-stop-rec")?.addEventListener("click", stopRecording);
    root.querySelector("#fl-live-btn")?.addEventListener("click", toggleLiveTranslation);
    root.querySelector("#fl-stop-live")?.addEventListener("click", stopLiveTranslation);

    const autoResizeChatInput = (el) => {
      if (!el) return;
      el.style.height = "auto";
      const maxH = 168;
      const nextH = Math.min(el.scrollHeight, maxH);
      el.style.height = nextH + "px";
      el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden";
    };
    const chatInputEl = root.querySelector("#fl-chat-input");
    if (chatInputEl) {
      autoResizeChatInput(chatInputEl);
      chatInputEl.addEventListener("input", () => autoResizeChatInput(chatInputEl));
      chatInputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); }
      });
    }
    const doSend = () => {
      const inp = document.getElementById("fl-chat-input");
      if (!inp) return;
      const v = inp.value.trim();
      inp.value = "";
      autoResizeChatInput(inp);
      state.plusMenuOpen = false;
      sendMessage(v);
    };
    root.querySelector("#fl-chat-send")?.addEventListener("click", doSend);
    root.querySelectorAll("[data-fl-starter]").forEach((b) => {
      b.onclick = () => sendMessage(b.getAttribute("data-fl-starter"));
    });
    root.querySelectorAll("[data-fl-explain-more]").forEach((b) => {
      b.onclick = () => sendMessage("Explain this in more detail: simple Finnish (selkosuomi), English grammar tip, and 2 examples.", { mode: "teach_me" });
    });
    root.querySelectorAll("[data-fl-extract-cards]").forEach((b) => {
      b.onclick = () => {
        const conv = getActiveConv();
        const m = conv && conv.messages[Number(b.getAttribute("data-fl-extract-cards"))];
        if (!m) return;
        extractAndSaveFlashcards({ text: m.text });
      };
    });
    root.querySelectorAll("[data-fl-save-note]").forEach((b) => {
      b.onclick = async () => {
        const conv = getActiveConv();
        const m = conv && conv.messages[Number(b.getAttribute("data-fl-save-note"))];
        if (!m) return;
        await DB.saveNote({ title: conv.title, type: "class", content: m.text });
        state.notes = await DB.listNotes();
        scheduleAutoSync();
        toast("Saved to Notes in ☰ menu!", "success");
      };
    });

    // Study mode
    root.querySelectorAll("[data-fl-study]").forEach((b) => { b.onclick = () => { state.studyTool = b.getAttribute("data-fl-study"); state.lessonStep = 1; renderActiveView(); }; });
    root.querySelector("#fl-study-back")?.addEventListener("click", () => { state.studyTool = null; renderActiveView(); });

    // Walk & Listen Podcast controls
    root.querySelector("#fl-pod-create-btn")?.addEventListener("click", () => {
      createCustomPodcastEpisode(document.getElementById("fl-pod-custom-topic")?.value || "");
    });
    root.querySelector("#fl-pod-custom-topic")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); createCustomPodcastEpisode(e.target.value || ""); }
    });
    root.querySelectorAll("[data-fl-pod-quick]").forEach((b) => {
      b.onclick = () => createCustomPodcastEpisode(b.getAttribute("data-fl-pod-quick") || "");
    });
    root.querySelector("#fl-hw-to-cards")?.addEventListener("click", () => {
      if (!state.hwAttachments.length) {
        toast("Upload a textbook or whiteboard photo above first!", "warning");
        return;
      }
      extractAndSaveFlashcards({
        attachments: state.hwAttachments.map((a) => ({ mime_type: a.mime_type, data_base64: a.data_base64 })),
      });
    });
    root.querySelectorAll("[data-fl-pod-ep]").forEach((b) => {
      b.onclick = () => {
        state.podcastEpisodeId = b.getAttribute("data-fl-pod-ep");
        state.podcastAudioUrl = null;
        renderActiveView();
      };
    });
    root.querySelector("#fl-pod-play-btn")?.addEventListener("click", () => generateAndPlayPodcast(state.podcastEpisodeId));
    root.querySelector("#fl-pod-script-toggle")?.addEventListener("click", () => { state.podcastShowScript = !state.podcastShowScript; renderActiveView(); });
    root.querySelector("#fl-pod-slow")?.addEventListener("click", () => {
      state.podcastSlow = !state.podcastSlow;
      const el = document.getElementById("fl-podcast-audio");
      if (el) el.playbackRate = state.podcastSlow ? 0.8 : 1.0;
      renderActiveView();
    });
    root.querySelector("#fl-pod-replay")?.addEventListener("click", () => {
      const el = document.getElementById("fl-podcast-audio");
      if (el) { el.currentTime = 0; el.playbackRate = state.podcastSlow ? 0.8 : 1.0; el.play().catch(() => {}); }
    });
    root.querySelectorAll("[data-fl-htab]").forEach((b) => { b.onclick = () => { state.helperTab = b.getAttribute("data-fl-htab"); renderActiveView(); }; });
    root.querySelector("#fl-hw-files")?.addEventListener("change", async (e) => {
      for (const f of Array.from(e.target.files || [])) { const att = await fileToAttachment(f); if (att) state.hwAttachments.push(att); }
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
        if (!state.hwAttachments.length && !ex && !ans) { toast("Upload a worksheet or write your answer first.", "warning"); return; }
        const parts = [];
        if (ex) parts.push(`Exercise: ${ex}`);
        if (ans) parts.push(`My answer: "${ans}"`);
        if (!parts.length) parts.push("Help me with this homework.");
        const map = { hint: "homework_hint", check: "homework_check", answer: "homework_answer" };
        state.mode = "chat";
        sendMessage(parts.join("\n"), { mode: map[modeKey] || "homework_hint", attachments: state.hwAttachments.slice(), keepAttachments: true });
      };
    });

    root.querySelector("#fl-lesson-next")?.addEventListener("click", () => { state.lessonStep = Math.min(3, state.lessonStep + 1); renderActiveView(); });
    root.querySelector("#fl-lesson-prev")?.addEventListener("click", () => { state.lessonStep = Math.max(1, state.lessonStep - 1); renderActiveView(); });
    root.querySelector("#fl-lesson-done")?.addEventListener("click", () => { DB.recordLessonCompleted("daily_" + DB.todayStr()); toast("Mahtavaa! Lesson done! 🔥", "success"); state.studyTool = null; renderActiveView(); });
    root.querySelectorAll("[data-fl-save-vocab]").forEach((b) => {
      b.onclick = async () => {
        const w = CURR.getTodayVocabPack().words[Number(b.getAttribute("data-fl-save-vocab"))];
        if (!w) return;
        await DB.addFlashcard({ fi: w.fi, en: w.en, baseForm: w.base, example: `${w.exFi} (${w.exEn})` });
        state.flashcards = await DB.listFlashcards();
        toast(`Saved "${w.fi}" to Flashcards! ⭐`, "success");
      };
    });
    root.querySelectorAll("[data-fl-quiz-ans]").forEach((b) => {
      b.onclick = () => {
        const ok = b.getAttribute("data-fl-quiz-ans") === "1";
        const out = document.getElementById("fl-quiz-out");
        if (out) {
          if (ok) {
            getRoastLine(false);
            out.style.color = "#6ee7b7";
            out.innerHTML = `✅ Oikein! ${esc(b.getAttribute("data-fl-quiz-exp") || "")}`;
          } else {
            const roast = getRoastLine(true);
            out.style.color = "#fca5a5";
            out.innerHTML = `${roast ? `<div class="fl-roast-banner">${esc(roast)}</div>` : ""}❌ Try again — ${esc(b.getAttribute("data-fl-quiz-exp") || "")}`;
          }
        }
      };
    });

    root.querySelectorAll("[data-fl-skill]").forEach((b) => { b.onclick = () => { state.practiceSkill = b.getAttribute("data-fl-skill"); renderActiveView(); }; });
    root.querySelector("#fl-listen-toggle-tr")?.addEventListener("click", () => { state.listeningShowTranscript = !state.listeningShowTranscript; renderActiveView(); });
    root.querySelector("#fl-write-submit")?.addEventListener("click", async () => {
      const txt = (document.getElementById("fl-write-text")?.value || "").trim();
      const out = document.getElementById("fl-write-out");
      if (!txt || !out) return;
      out.innerHTML = "<div style='color:#7dd3fc;'>⏳ Checking...</div>";
      try {
        const res = await flApi("/api/finnish-lab/writing-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: txt, level: DB.getSettings().level }) });
        const fb = res.feedback || {};
        const hasMistakes = (fb.mistakes || []).length > 0;
        const roast = getRoastLine(hasMistakes);
        out.innerHTML = `<div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:10px;font-size:0.86rem;">${roast ? `<div class="fl-roast-banner">${esc(roast)}</div>` : ""}<div style="color:#6ee7b7;font-weight:700;">✅ ${esc(fb.corrected || "")}</div><div style="color:#7dd3fc;margin-top:4px;">🇬🇧 ${esc(fb.english_meaning || "")}</div>${(fb.mistakes || []).map((m) => `<div style="margin-top:5px;">• <span style="color:#fca5a5;">${esc(m.wrong)}</span> → <strong>${esc(m.right)}</strong>: ${esc(m.why_en)}</div>`).join("")}</div>`;
      } catch (err) { out.innerHTML = `<div style="color:#fca5a5;">⚠️ ${esc(err.message)}</div>`; }
    });
    root.querySelectorAll("[data-fl-start-roleplay]").forEach((b) => {
      b.onclick = async () => {
        const rp = CURR.ROLEPLAY_SCENARIOS.find((x) => x.id === b.getAttribute("data-fl-start-roleplay"));
        if (!rp) return;
        const c = await DB.saveConversation({ title: rp.title, kind: "chat", messages: [] });
        state.conversations.unshift(c);
        state.activeConvId = c.id;
        state.mode = "chat";
        sendMessage(rp.prompt, { mode: "practice" });
      };
    });

    root.querySelector("#fl-grammar-select")?.addEventListener("change", (e) => { state.selectedGrammarId = e.target.value; renderActiveView(); });
    root.querySelector("#fl-anatomy-search")?.addEventListener("click", async () => {
      const w = (document.getElementById("fl-anatomy-input")?.value || "").trim();
      const out = document.getElementById("fl-anatomy-out");
      if (!w || !out) return;
      out.innerHTML = "<div style='color:#7dd3fc;'>⏳ Looking up...</div>";
      try {
        const res = await flApi("/api/finnish-lab/word-anatomy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: w, level: DB.getSettings().level }) });
        const a = res.anatomy || {};
        const f = a.forms || {};
        out.innerHTML = `<div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:10px;font-size:0.84rem;line-height:1.55;"><div><strong style="font-size:1.05rem;">${esc(a.original_word || w)}</strong> — <span style="color:#7dd3fc;">${esc(a.english_meaning || "")}</span></div><div><strong>Base:</strong> ${esc(a.base_form || "—")} • <strong>Syllables:</strong> ${esc(a.syllables || "—")}</div><div>Partitive: ${esc(f.partitive || "—")} | Genitive: ${esc(f.genitive || "—")} | In: ${esc(f.inessive || "—")}</div>${a.spoken_finnish ? `<div><strong>Spoken:</strong> ${esc(a.spoken_finnish)}</div>` : ""}</div>`;
      } catch (err) { out.innerHTML = `<div style="color:#fca5a5;">⚠️ ${esc(err.message)}</div>`; }
    });

    // Slide Drawer events
    root.querySelector("#fl-close-drawer")?.addEventListener("click", () => { state.drawerOpen = false; renderActiveView(); });
    root.querySelector("#fl-drawer-backdrop")?.addEventListener("click", (e) => { if (e.target.id === "fl-drawer-backdrop") { state.drawerOpen = false; renderActiveView(); } });
    root.querySelectorAll("[data-fl-dtab]").forEach((b) => { b.onclick = () => { state.drawerTab = b.getAttribute("data-fl-dtab"); renderActiveView(); }; });
    root.querySelectorAll("[data-fl-select-conv]").forEach((el) => {
      el.onclick = (e) => { if (e.target.closest("button")) return; state.activeConvId = el.getAttribute("data-fl-select-conv"); state.drawerOpen = false; state.mode = "chat"; renderActiveView(); scrollChatsToBottom(); };
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
    root.querySelector("#fl-card-flip")?.addEventListener("click", () => { state.flashcardFlipped = !state.flashcardFlipped; renderActiveView(); });
    root.querySelectorAll("[data-fl-rate-card]").forEach((b) => {
      b.onclick = async () => { await DB.reviewFlashcard(b.getAttribute("data-fl-rate-card"), b.getAttribute("data-fl-rating")); state.flashcards = await DB.listFlashcards(); state.flashcardFlipped = false; renderActiveView(); };
    });
    root.querySelector("#fl-add-custom-card")?.addEventListener("click", async () => {
      const fi = (document.getElementById("fl-new-card-fi")?.value || "").trim();
      const en = (document.getElementById("fl-new-card-en")?.value || "").trim();
      if (!fi || !en) return;
      await DB.addFlashcard({ fi, en });
      state.flashcards = await DB.listFlashcards();
      toast("Card saved!", "success");
      renderActiveView();
    });
    root.querySelectorAll("[data-fl-export-note]").forEach((b) => {
      b.onclick = () => { const n = state.notes.find((x) => x.id === b.getAttribute("data-fl-export-note")); if (n) downloadTextFile(`${n.date}-${n.id}.txt`, `${n.title}\n\n${n.content}`); };
    });
    root.querySelectorAll("[data-fl-del-note]").forEach((b) => {
      b.onclick = async () => { await DB.deleteNote(b.getAttribute("data-fl-del-note")); state.notes = await DB.listNotes(); renderActiveView(); };
    });
    root.querySelector("#fl-level-select")?.addEventListener("change", (e) => { DB.saveSettings({ level: e.target.value }); renderActiveView(); });
    root.querySelector("#fl-roast-toggle")?.addEventListener("click", () => {
      const next = !isRoastEnabled();
      DB.saveSettings({ roastMode: next });
      toast(next ? "😈 Fun Roast Mode ON!" : "😇 Fun Roast Mode OFF", "info");
      renderActiveView();
    });
    root.querySelector("#fl-focus-toggle")?.addEventListener("click", () => { state.focusMode = !state.focusMode; document.body.classList.toggle("fl-focus-mode", state.focusMode); renderActiveView(); });
    root.querySelector("#fl-copy-student-url")?.addEventListener("click", async () => {
      const url = window.location.origin + "/";
      try { await navigator.clipboard.writeText(url); toast("Link copied! Send to your wife or friends to Sign Up.", "success"); }
      catch (_) { const inp = document.getElementById("fl-student-share-url"); inp?.select(); document.execCommand("copy"); toast("Link copied!", "success"); }
    });
    root.querySelector("#fl-refresh-users-btn")?.addEventListener("click", async () => {
      await refreshAdminUsers();
      renderActiveView();
      toast("Users list refreshed!", "info");
    });
    root.querySelectorAll("[data-fl-user-act]").forEach((b) => {
      b.onclick = async () => {
        const email = b.getAttribute("data-fl-user-email");
        const action = b.getAttribute("data-fl-user-act");
        if (!email || !action) return;
        try {
          const res = await flApi("/api/finnish-lab/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, action }),
          });
          state.adminUsers = res.users || [];
          toast(action === "approve" ? `Approved ${email}! ✅` : action === "revoke" ? `Revoked ${email}.` : `Deleted ${email}.`, "success");
          renderActiveView();
        } catch (err) { toast(err.message, "error"); }
      };
    });
    root.querySelector("#fl-change-pass-btn")?.addEventListener("click", async () => {
      const current_password = document.getElementById("fl-cur-pass")?.value || "";
      const new_password = document.getElementById("fl-new-pass")?.value || "";
      if (!current_password || new_password.length < 6) {
        toast("Enter current password and a new password (min 6 chars).", "warning");
        return;
      }
      try {
        const res = await flApi("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_password, new_password }),
        });
        toast(res.message || "Password updated!", "success");
        const cEl = document.getElementById("fl-cur-pass");
        const nEl = document.getElementById("fl-new-pass");
        if (cEl) cEl.value = "";
        if (nEl) nEl.value = "";
      } catch (err) { toast(err.message, "error"); }
    });
    root.querySelector("#fl-signout-btn")?.addEventListener("click", async () => {
      try { await fetch("/api/auth/logout", { method: "POST" }); } catch (_) {}
      window.location.href = "/";
    });
    root.querySelector("#fl-export-backup")?.addEventListener("click", async () => { downloadTextFile(`finnish-lab-backup-${DB.todayStr()}.json`, JSON.stringify(await DB.exportAllData(), null, 2)); toast("Backup exported!", "success"); });
    root.querySelector("#fl-import-backup")?.addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { await DB.importAllData(JSON.parse(await f.text())); await loadAllData(); toast("Backup restored!", "success"); renderActiveView(); } catch (err) { toast(err.message, "error"); }
    });
    root.querySelector("#fl-cloud-push")?.addEventListener("click", async () => {
      try { await flApi("/api/finnish-lab/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot: await DB.exportAllData() }) }); toast("Sync saved!", "success"); } catch (err) { toast(err.message, "error"); }
    });
    root.querySelector("#fl-cloud-pull")?.addEventListener("click", async () => {
      try { const r = await flApi("/api/finnish-lab/sync"); if (r.has_snapshot && r.snapshot) { await DB.importAllData(r.snapshot); await loadAllData(); toast("Sync loaded!", "success"); renderActiveView(); } else toast("No sync found.", "info"); } catch (err) { toast(err.message, "error"); }
    });

    bindCommonMessageButtons(root);
  }

  /* ---------- SMART BACK BUTTON HANDLER ---------- */
  function handleBack() {
    const cropModal = document.getElementById("fl-crop-modal");
    if (cropModal) {
      cropModal.remove();
      return true;
    }
    if (state.drawerOpen) {
      state.drawerOpen = false;
      renderActiveView();
      return true;
    }
    if (state.plusMenuOpen) {
      state.plusMenuOpen = false;
      renderActiveView();
      return true;
    }
    if (state.mode === "study" && state.studyTool) {
      state.studyTool = null;
      renderActiveView();
      return true;
    }
    if (state.mode === "study") {
      state.mode = "chat";
      renderActiveView();
      return true;
    }
    if (state.isStudentRoute) {
      return true; // Never leave Finnish Lab in student-only view
    }
    return false; // Let Studio goBack() return to previous Studio tab
  }

  /* ---------- INIT ---------- */
  async function initFinnishLab() {
    await Promise.all([loadAllData(), refreshRole()]);
    mountFloatingAndSidePanel();
    renderActiveView();
    if (state.role !== "guest") {
      refreshStatus();
      autoPullSync();
    }
  }

  window.FinnishLab = {
    init: initFinnishLab,
    render: renderActiveView,
    refreshAuth: refreshAuthAndSync,
    toggleSidePanel,
    handleBack,
    isRecording: () => state.isRecording || state.isLiveTranslating,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFinnishLab);
  } else {
    initFinnishLab();
  }
})();
