/* ============================================================================
   FINNISH STUDY LAB PRO — $0 GOOGLE GEMINI FREE TIER SUITE
   1. Active-Recall Sentence & Ending SRS Drills (/data/studio.db)
   2. Kirjakieli <-> Puhekieli Side-by-Side Grammar Tables
   3. Goodnotes Clean Study Sheet Export (Print/PDF & Markdown)
   4. Snap & Ask Multimodal Gemini Vision (gemini-3.8-flash)
   5. Pori & Everyday Finland Interactive Roleplay (Click-to-Save Vocab)
   6. ilovefinland.net Story-to-Lesson Bridge (A1/A2 Selkosuomi)
   7. Free Browser Web Speech API Audio (fi-FI, 0.75x Slow & 1.0x Normal)
   ============================================================================ */
(function () {
  "use strict";

  const GRAMMAR_MASTER_TABLES = [
    {
      id: "olla",
      title: "1. Verb 'olla' (to be) — Kirjakieli ↔ Puhekieli",
      rows: [
        { en: "I am", written: "Minä olen", spoken: "Mä oon", note: "1st sg. (-n)" },
        { en: "You are", written: "Sinä olet", spoken: "Sä oot", note: "2nd sg. (-t)" },
        { en: "He / She is", written: "Hän on", spoken: "Se on", note: "3rd sg." },
        { en: "We are", written: "Me olemme", spoken: "Me ollaan", note: "Spoken uses passive" },
        { en: "You (pl.) are", written: "Te olette", spoken: "Te ootte", note: "2nd pl. (-tte)" },
        { en: "They are", written: "He ovat", spoken: "Ne on", note: "Spoken uses 'ne on'" },
        { en: "I am not", written: "Minä en ole", spoken: "Mä en oo", note: "Negative stem 'ole'" },
      ],
    },
    {
      id: "ko_ko",
      title: "2. Questions with -ko / -kö (Vowel Harmony)",
      rows: [
        { en: "Do you live in Pori?", written: "Asutko sinä Porissa?", spoken: "Asut sä Porissa?", note: "a, o, u -> -ko" },
        { en: "Do you speak Finnish?", written: "Puhutko suomea?", spoken: "Puhut sä suomee?", note: "u -> -ko" },
        { en: "Are you going to sauna?", written: "Menetkö saunaan?", spoken: "Meet sä saunaan?", note: "front/neutral e -> -kö" },
        { en: "Do you have a card?", written: "Onko sinulla kortti?", spoken: "Onks sulla kortti?", note: "Spoken 'onks'" },
        { en: "Do you want coffee?", written: "Haluatko kahvia?", spoken: "Haluut sä kahvii?", note: "a, u -> -ko" },
      ],
    },
    {
      id: "local_cases",
      title: "3. Finnish Local Cases (In / From / To)",
      rows: [
        { en: "In Pori (inside)", written: "Porissa (-ssa/-ssä)", spoken: "Porissa", note: "Inessive: static inside" },
        { en: "From Pori (out of)", written: "Porista (-sta/-stä)", spoken: "Porista", note: "Elative: out of / from" },
        { en: "To Pori (into)", written: "Poriin (-Vn)", spoken: "Poriin", note: "Illative: into / to" },
        { en: "At the station (on/at)", written: "Asemalla (-lla/-llä)", spoken: "Asemalla", note: "Adessive: at / on / by" },
        { en: "From the station", written: "Asemalta (-lta/-ltä)", spoken: "Asemalta", note: "Ablative: off / from at" },
        { en: "To the market square", written: "Torille (-lle)", spoken: "Torille", note: "Allative: onto / to" },
      ],
    },
    {
      id: "pori_daily",
      title: "4. Everyday Pori & Finland Essentials",
      rows: [
        { en: "Could I have a coffee?", written: "Saisinko yhden kahvin?", spoken: "Saisinks mä yhen kahvin?", note: "Polite conditional" },
        { en: "I will pay by card.", written: "Minä maksan kortilla.", spoken: "Mä maksan kortilla.", note: "-lla = by means of" },
        { en: "Do you need a receipt?", written: "Tarvitsetko kuittia?", spoken: "Tarviit sä kuittii?", note: "Partitive object" },
        { en: "No thanks, I have a bag.", written: "Ei kiitos, minulla on kassi.", spoken: "Ei kiitti, mulla on kassi.", note: "Minulla on -> mulla on" },
        { en: "Excuse me, where is...?", written: "Anteeksi, missä on...?", spoken: "Anteeks, mis on...?", note: "Polite starter" },
      ],
    },
  ];

  const state = {
    activeProTab: "tutor", // "tutor" (original chat), "srs", "grammar", "snap", "roleplay", "story", "vocab"
    showSideBySide: true,
    srsTopic: "all",
    srsQueue: [],
    srsStats: { due_now: 0, mastered: 0, total: 0 },
    srsIndex: 0,
    srsBuiltTiles: [],
    srsFeedback: null,
    vocabWords: [],
    snapPreviewUrl: "",
    snapB64: "",
    snapMime: "image/jpeg",
    snapResult: null,
    snapLoading: false,
    roleplayScenario: "pori_grocery",
    roleplayLevel: "A1",
    roleplayMessages: [],
    roleplayLoading: false,
    storyLesson: null,
    storyLoading: false,
    storyQuizAnswers: {},
    studioArticles: [],
  };

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function speakFi(text, rate = 1.0) {
    if (typeof window.flSpeakFi === "function") {
      window.flSpeakFi(text, rate);
      return;
    }
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text || ""));
      u.lang = "fi-FI";
      u.rate = rate;
      const voices = window.speechSynthesis.getVoices() || [];
      const fi = voices.find((v) => (v.lang || "").toLowerCase().startsWith("fi"));
      if (fi) u.voice = fi;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  function audioBtns(text) {
    const safe = esc(text).replace(/'/g, "\\'");
    return `<span class="flp-audio-btns">
      <button type="button" class="flp-btn-audio" onclick="window.FinnishLabPro.speak('${safe}', 0.75)" title="Slow Finnish (0.75x — Free Browser fi-FI)">🐢 0.75x</button>
      <button type="button" class="flp-btn-audio" onclick="window.FinnishLabPro.speak('${safe}', 1.0)" title="Normal Finnish (1.0x — Free Browser fi-FI)">🔊 1.0x</button>
    </span>`;
  }

  async function apiJson(url, opts = {}) {
    const resp = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || data.message || `HTTP ${resp.status}`);
    return data;
  }

  function toast(msg) {
    const el = document.getElementById("flp-toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  // Goodnotes Master Study Sheet Export (Clean Print-Ready PDF + Markdown Download)
  function exportGoodnotesStudySheet(kind = "grammar", format = "print") {
    let md = "";
    let htmlRows = "";
    const today = new Date().toISOString().slice(0, 10);

    if (kind === "vocab") {
      md = `# ILoveFinland Finnish Vocabulary Master Sheet (${today})\n\n| Written Finnish (Kirjakieli) | Spoken (Puhekieli) | Base Form | English | Grammar Note |\n|---|---|---|---|---|\n`;
      const words = state.vocabWords || [];
      if (!words.length) {
        toast("Save some words first from Roleplay, Snap & Ask, or Story Lessons!");
        return;
      }
      words.forEach((w) => {
        md += `| **${w.word_fi}** | ${w.spoken_fi || "—"} | ${w.base_form || w.word_fi} | ${w.english || ""} | ${w.grammar_note || ""} |\n`;
        htmlRows += `<tr><td><strong>${esc(w.word_fi)}</strong></td><td>${esc(w.spoken_fi || "—")}</td><td>${esc(w.base_form || w.word_fi)}</td><td>${esc(w.english)}</td><td>${esc(w.grammar_note)}</td></tr>`;
      });
    } else {
      md = `# ILoveFinland Finnish Master Grammar & Kirjakieli ↔ Puhekieli Sheet (${today})\n\n`;
      GRAMMAR_MASTER_TABLES.forEach((tbl) => {
        md += `## ${tbl.title}\n\n| English | Written Finnish (Kirjakieli) | Spoken Finnish (Puhekieli) | Rule / Note |\n|---|---|---|---|\n`;
        htmlRows += `<tr class="sec-row"><td colspan="4"><strong>${esc(tbl.title)}</strong></td></tr>`;
        tbl.rows.forEach((r) => {
          md += `| ${r.en} | **${r.written}** | ${r.spoken} | ${r.note} |\n`;
          htmlRows += `<tr><td>${esc(r.en)}</td><td><strong>${esc(r.written)}</strong></td><td>${esc(r.spoken)}</td><td>${esc(r.note)}</td></tr>`;
        });
        md += "\n";
      });
    }

    if (format === "markdown") {
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ilovefinland-finnish-${kind}-sheet-${today}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast("⬇️ Exported clean Markdown study sheet!");
      return;
    }

    // Print / Save as PDF optimized cleanly for Goodnotes (iPad / MacBook)
    const win = window.open("", "_blank", "width=920,height=760");
    if (!win) {
      toast("Pop-up blocked — allow pop-ups or export as Markdown.");
      return;
    }
    const headers = kind === "vocab"
      ? "<th>Written Finnish</th><th>Spoken (Puhekieli)</th><th>Base Form</th><th>English</th><th>Grammar Note</th>"
      : "<th>English</th><th>Written Finnish (Kirjakieli)</th><th>Spoken Finnish (Puhekieli)</th><th>Grammar Note</th>";

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>ILoveFinland Finnish Study Sheet (${today})</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif; color: #0A192F; padding: 28px; max-width: 900px; margin: 0 auto; }
        h1 { color: #003580; font-size: 20px; border-bottom: 3px solid #003580; padding-bottom: 8px; margin-bottom: 6px; }
        .sub { color: #475569; font-size: 12px; margin-bottom: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #0A192F; color: #fff; text-align: left; padding: 9px 10px; }
        td { border: 1px solid #CBD5E1; padding: 8px 10px; vertical-align: top; }
        tr.sec-row td { background: #EFF6FF; color: #003580; font-size: 14px; padding-top: 12px; }
        @media print { .no-print { display: none; } body { padding: 8px; } }
      </style></head><body>
      <div class="no-print" style="margin-bottom:16px;text-align:right;">
        <button onclick="window.print()" style="background:#003580;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;">🖨️ Print / Save as PDF for Goodnotes</button>
      </div>
      <h1>🇫🇮 ILoveFinland — ${kind === "vocab" ? "Vocabulary Master Deck" : "Master Finnish Grammar & Kirjakieli ↔ Puhekieli Study Sheet"}</h1>
      <div class="sub">Generated ${today} • Optimized for Goodnotes (iPad / MacBook)</div>
      <table><thead><tr>${headers}</tr></thead><tbody>${htmlRows}</tbody></table>
    </body></html>`);
    win.document.close();
  }

  async function loadSrsQueue() {
    try {
      const res = await apiJson(`/api/finnish-lab/srs/queue?topic=${encodeURIComponent(state.srsTopic)}`);
      state.srsQueue = res.items || [];
      state.srsStats = res.stats || { due_now: 0, mastered: 0, total: 0 };
      state.srsIndex = 0;
      state.srsBuiltTiles = [];
      state.srsFeedback = null;
      renderProShell();
    } catch (e) {
      toast("SRS load error: " + e.message);
    }
  }

  async function loadVocabDeck() {
    try {
      const res = await apiJson("/api/finnish-lab/vocab");
      state.vocabWords = res.words || [];
      renderProShell();
    } catch (e) {
      toast("Vocab load error: " + e.message);
    }
  }

  async function saveWordToSql(wordObj, sourceTag = "study_lab") {
    try {
      await apiJson("/api/finnish-lab/vocab", {
        method: "POST",
        body: JSON.stringify({
          word_fi: wordObj.word_fi || wordObj.word || wordObj.fi || "",
          base_form: wordObj.base_form || wordObj.base || "",
          spoken_fi: wordObj.spoken_fi || wordObj.spoken || "",
          english: wordObj.english || wordObj.en || "",
          grammar_note: wordObj.grammar_note || wordObj.ending || wordObj.note || "",
          example_fi: wordObj.example_fi || "",
          source_tag: sourceTag,
        }),
      });
      toast(`💾 Saved "${wordObj.word_fi || wordObj.word || wordObj.fi}" to SQLite Vocab Deck!`);
      loadVocabDeck();
    } catch (e) {
      toast("Save error: " + e.message);
    }
  }

  async function submitSrsAnswer(userAns) {
    const item = state.srsQueue[state.srsIndex];
    if (!item) return;
    const norm = (s) => String(s || "").trim().toLowerCase().replace(/[?.!,]/g, "").replace(/\s+/g, " ");
    const correct = norm(userAns) === norm(item.answer);
    try {
      const res = await apiJson("/api/finnish-lab/srs/review", {
        method: "POST",
        body: JSON.stringify({ drill_id: item.id, correct }),
      });
      state.srsFeedback = {
        correct,
        userAns,
        answer: item.answer,
        written: item.written_fi,
        spoken: item.spoken_fi,
        explanation: item.explanation,
        scheduleMsg: res.schedule_message || "",
      };
      speakFi(item.written_fi, 1.0);
      renderProShell();
    } catch (e) {
      toast("Review save error: " + e.message);
    }
  }

  async function generateFreshDrills() {
    const btn = document.getElementById("flp-btn-gen-srs");
    if (btn) btn.textContent = "⏳ Asking Gemini...";
    try {
      const topic = state.srsTopic === "all" ? "local_cases" : state.srsTopic;
      const res = await apiJson("/api/finnish-lab/srs/generate", {
        method: "POST",
        body: JSON.stringify({ topic, level: "A1" }),
      });
      toast(`✨ Gemini (${res.model}) added ${res.inserted} active-recall drills!`);
      await loadSrsQueue();
    } catch (e) {
      toast("⚠️ " + e.message);
      if (btn) btn.textContent = "✨ +5 Gemini Drills";
    }
  }

  async function runSnapAndAsk() {
    if (!state.snapB64) {
      toast("Upload or snap a Finnish photo first!");
      return;
    }
    state.snapLoading = true;
    renderProShell();
    try {
      const q = document.getElementById("flp-snap-question")?.value || "";
      const res = await apiJson("/api/finnish-lab/snap-ask", {
        method: "POST",
        body: JSON.stringify({ image_b64: state.snapB64, image_mime: state.snapMime, question: q }),
      });
      state.snapResult = res;
    } catch (e) {
      toast("⚠️ Snap & Ask error: " + e.message);
    } finally {
      state.snapLoading = false;
      renderProShell();
    }
  }

  async function sendRoleplayTurn(userMsg = "") {
    state.roleplayLoading = true;
    if (userMsg) {
      state.roleplayMessages.push({ role: "user", text: userMsg });
    }
    renderProShell();
    try {
      const hist = state.roleplayMessages.map((m) => ({ role: m.role, text: m.text || m.reply_written || "" }));
      const res = await apiJson("/api/finnish-lab/roleplay", {
        method: "POST",
        body: JSON.stringify({
          scenario: state.roleplayScenario,
          level: state.roleplayLevel,
          history: hist,
          user_message: userMsg,
        }),
      });
      state.roleplayMessages.push({
        role: "assistant",
        reply_written: res.reply_written,
        reply_spoken: res.reply_spoken,
        english_translation: res.english_translation,
        gentle_correction: res.gentle_correction,
        suggested_reply_fi: res.suggested_reply_fi,
        clickable_words: res.clickable_words || [],
        model: res.model,
      });
      speakFi(res.reply_written, 1.0);
    } catch (e) {
      toast("⚠️ Roleplay error: " + e.message);
    } finally {
      state.roleplayLoading = false;
      renderProShell();
    }
  }

  async function runStoryToLesson(storyPayload) {
    state.activeProTab = "story";
    state.storyLoading = true;
    state.storyQuizAnswers = {};
    renderProShell();
    try {
      const res = await apiJson("/api/finnish-lab/story-lesson", {
        method: "POST",
        body: JSON.stringify({
          headline: storyPayload.headline || "",
          summary: storyPayload.summary || "",
          body: storyPayload.body || "",
          level: "A1",
        }),
      });
      state.storyLesson = res;
    } catch (e) {
      toast("⚠️ Story-to-Lesson error: " + e.message);
    } finally {
      state.storyLoading = false;
      renderProShell();
    }
  }

  async function loadStudioArticlesForPicker() {
    try {
      const res = await apiJson("/api/packages");
      state.studioArticles = Array.isArray(res) ? res : (res.packages || []);
      renderProShell();
    } catch (_) {}
  }

  function renderSrsView() {
    const item = state.srsQueue[state.srsIndex];
    const fb = state.srsFeedback;
    const pct = state.srsQueue.length ? Math.round(((state.srsIndex + 1) / state.srsQueue.length) * 100) : 0;

    let bodyHtml = "";
    if (!item) {
      bodyHtml = `<div class="flp-card" style="text-align:center;padding:30px;">
        <div style="font-size:2rem;margin-bottom:8px;">🎉</div>
        <h3 style="margin:0 0 6px;color:#fff;">10-Minute Daily Queue Complete!</h3>
        <p style="color:#94A3B8;font-size:0.86rem;">Generate 5 fresh active-recall drills with Gemini Free Tier or switch topics above.</p>
      </div>`;
    } else {
      const isRebuild = item.drill_type === "rebuild";
      const shuffledChoices = [...(item.choices || [])];
      if (isRebuild) shuffledChoices.sort((a, b) => a.length - b.length || a.localeCompare(b));

      bodyHtml = `<div class="flp-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap;">
          <span class="flp-pill">${esc(item.topic.toUpperCase())} • ${isRebuild ? "Sentence Rebuild" : "Ending Selection"}</span>
          <span style="font-size:0.78rem;color:#94A3B8;">Card ${state.srsIndex + 1} / ${state.srsQueue.length} (${pct}%)</span>
        </div>
        <div style="font-size:0.95rem;color:#E2E8F0;font-weight:700;margin-bottom:10px;">${esc(item.prompt_en)}</div>
        <div class="flp-prompt-box">${esc(item.masked_fi)}</div>
        ${isRebuild ? `
          <div style="margin:12px 0;">
            <div style="font-size:0.74rem;color:#94A3B8;margin-bottom:6px;">Your rebuilt sentence (tap tiles in order):</div>
            <div class="flp-rebuild-slot">${state.srsBuiltTiles.length ? esc(state.srsBuiltTiles.join(" ")) : '<span style="color:#64748B;">Tap word tiles below...</span>'}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
              ${shuffledChoices.map((w, i) => `<button type="button" class="flp-tile-btn" data-tile-word="${esc(w)}" data-tile-idx="${i}">${esc(w)}</button>`).join("")}
            </div>
            <div style="display:flex;gap:8px;margin-top:12px;">
              <button type="button" id="flp-srs-clear-tiles" class="flp-btn-ghost">↺ Clear</button>
              <button type="button" id="flp-srs-check-rebuild" class="flp-btn-primary" ${fb ? "disabled" : ""}>✓ Check Sentence</button>
            </div>
          </div>
        ` : `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
            ${shuffledChoices.map((opt) => `<button type="button" class="flp-choice-btn" data-srs-choice="${esc(opt)}" ${fb ? "disabled" : ""}>${esc(opt)}</button>`).join("")}
          </div>
        `}
        ${fb ? `
          <div class="flp-feedback ${fb.correct ? "is-ok" : "is-miss"}">
            <div style="font-weight:800;font-size:0.94rem;margin-bottom:6px;">
              ${fb.correct ? "✅ Correct!" : `❌ Not quite — answer: ${esc(fb.answer)}`}
            </div>
            <div class="flp-dual-grid">
              <div><small>Kirjakieli (Written)</small><div class="flp-fi-line">${esc(fb.written)}</div>${audioBtns(fb.written)}</div>
              ${state.showSideBySide ? `<div><small>Puhekieli (Spoken)</small><div class="flp-fi-line">${esc(fb.spoken)}</div>${audioBtns(fb.spoken)}</div>` : ""}
            </div>
            <p style="margin:8px 0 4px;font-size:0.82rem;color:#E2E8F0;">💡 ${esc(fb.explanation)}</p>
            <div style="font-size:0.75rem;color:#38BDF8;font-weight:700;">⏱️ ${esc(fb.scheduleMsg)}</div>
            <button type="button" id="flp-srs-next" class="flp-btn-primary" style="margin-top:12px;">Next Drill →</button>
          </div>
        ` : ""}
      </div>`;
    }

    return `
      <div class="flp-toolbar">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <strong style="color:#fff;">🎯 10-Min Active-Recall SRS Queue</strong>
          <span class="flp-stat-pill">Due: ${state.srsStats.due_now}</span>
          <span class="flp-stat-pill is-green">Mastered: ${state.srsStats.mastered}/${state.srsStats.total}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <select id="flp-srs-topic" class="flp-select">
            <option value="all" ${state.srsTopic === "all" ? "selected" : ""}>All Topics</option>
            <option value="olla" ${state.srsTopic === "olla" ? "selected" : ""}>Verb 'olla'</option>
            <option value="-ko/-kö" ${state.srsTopic === "-ko/-kö" ? "selected" : ""}>Questions (-ko/-kö)</option>
            <option value="local_cases" ${state.srsTopic === "local_cases" ? "selected" : ""}>Local Cases (-ssa/-sta/-lla)</option>
            <option value="daily_pori" ${state.srsTopic === "daily_pori" ? "selected" : ""}>Everyday Pori Rebuild</option>
          </select>
          <button type="button" id="flp-btn-gen-srs" class="flp-btn-primary">✨ +5 Gemini Drills</button>
        </div>
      </div>
      ${bodyHtml}
    `;
  }

  function renderGrammarView() {
    return `
      <div class="flp-toolbar">
        <div>
          <strong style="color:#fff;">⚖️ Kirjakieli ↔ Puhekieli Master Grammar Tables</strong>
          <span style="font-size:0.76rem;color:#94A3B8;display:block;">Written vs. Spoken Finnish side-by-side with 0.75x / 1.0x free fi-FI audio</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="flp-btn-goodnotes-pdf" class="flp-btn-primary">📄 Export Goodnotes PDF / Print</button>
          <button type="button" id="flp-btn-goodnotes-md" class="flp-btn-ghost">⬇️ Export Markdown (.md)</button>
        </div>
      </div>
      ${GRAMMAR_MASTER_TABLES.map((tbl) => `
        <div class="flp-card" style="margin-bottom:14px;">
          <h4 style="margin:0 0 10px;color:#38BDF8;font-size:0.95rem;">${esc(tbl.title)}</h4>
          <div style="overflow-x:auto;">
            <table class="flp-table">
              <thead><tr>
                <th>English</th>
                <th>Kirjakieli (Written)</th>
                ${state.showSideBySide ? "<th>Puhekieli (Spoken)</th>" : ""}
                <th>Audio (0.75x / 1.0x)</th>
                <th>Grammar Tip</th>
              </tr></thead>
              <tbody>
                ${tbl.rows.map((r) => `<tr>
                  <td>${esc(r.en)}</td>
                  <td><strong style="color:#fff;">${esc(r.written)}</strong></td>
                  ${state.showSideBySide ? `<td style="color:#7DD3FC;">${esc(r.spoken)}</td>` : ""}
                  <td>${audioBtns(r.written)}</td>
                  <td style="color:#94A3B8;font-size:0.78rem;">${esc(r.note)}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `).join("")}
    `;
  }

  function renderSnapView() {
    const r = state.snapResult;
    return `
      <div class="flp-toolbar">
        <div>
          <strong style="color:#fff;">📷 Snap &amp; Ask — Multimodal Gemini Vision ($0 Free Tier)</strong>
          <span style="font-size:0.76rem;color:#94A3B8;display:block;">Snap or upload any Finnish worksheet, street sign, Kela letter, or grocery label.</span>
        </div>
      </div>
      <div class="flp-card">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <label class="flp-btn-primary" style="cursor:pointer;">
            📷 Upload / Snap Finnish Photo
            <input type="file" id="flp-snap-file" accept="image/*" capture="environment" style="display:none;" />
          </label>
          <input type="text" id="flp-snap-question" class="flp-input" style="flex:1;min-width:220px;" placeholder="Optional question (e.g. 'Explain every case ending here')" />
          <button type="button" id="flp-btn-run-snap" class="flp-btn-primary" ${state.snapLoading ? "disabled" : ""}>
            ${state.snapLoading ? "⏳ Analyzing with Gemini..." : "✨ Analyze Photo"}
          </button>
        </div>
        ${state.snapPreviewUrl ? `<div style="margin-top:12px;"><img src="${state.snapPreviewUrl}" alt="Uploaded Finnish text" style="max-height:220px;border-radius:10px;border:1px solid rgba(56,189,248,0.35);" /></div>` : ""}
        ${r ? `
          <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(75,137,188,0.25);">
            <div class="flp-dual-grid">
              <div><small>Extracted Finnish (Kirjakieli)</small><div class="flp-fi-line">${esc(r.extracted_finnish)}</div>${audioBtns(r.extracted_finnish)}</div>
              <div><small>English Translation</small><div style="color:#E2E8F0;font-size:0.9rem;margin-top:4px;">${esc(r.english_translation)}</div></div>
            </div>
            ${r.spoken_finnish && state.showSideBySide ? `<div style="margin-top:8px;font-size:0.84rem;color:#7DD3FC;"><strong>Spoken (Puhekieli):</strong> ${esc(r.spoken_finnish)} ${audioBtns(r.spoken_finnish)}</div>` : ""}
            ${r.summary_tip ? `<div style="margin-top:8px;font-size:0.82rem;color:#34D399;">💡 ${esc(r.summary_tip)}</div>` : ""}
            ${(r.words || []).length ? `
              <h4 style="margin:14px 0 8px;color:#38BDF8;font-size:0.86rem;">Word-by-Word Base Form &amp; Ending Breakdown (Click + Save to Deck)</h4>
              <table class="flp-table">
                <thead><tr><th>Word</th><th>Base Form</th><th>Ending / Grammar</th><th>Meaning</th><th>Action</th></tr></thead>
                <tbody>
                  ${r.words.map((w, idx) => `<tr>
                    <td><strong>${esc(w.word)}</strong> ${audioBtns(w.word)}</td>
                    <td>${esc(w.base_form)}</td>
                    <td style="color:#7DD3FC;font-size:0.78rem;">${esc(w.ending)}</td>
                    <td>${esc(w.english)}</td>
                    <td><button type="button" class="flp-btn-ghost flp-save-snap-word" data-idx="${idx}">+ Save</button></td>
                  </tr>`).join("")}
                </tbody>
              </table>
            ` : ""}
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderRoleplayView() {
    const scenarios = [
      { id: "pori_grocery", label: "🛒 Grocery in Pori (Prisma / K-Market)" },
      { id: "cafe", label: "☕ Finnish Café" },
      { id: "pharmacy", label: "💊 Apteekki (Pharmacy)" },
      { id: "kela_vero", label: "🏛️ Kela / Vero Office" },
      { id: "small_talk", label: "❄️ Pori Neighbor Small Talk" },
    ];
    return `
      <div class="flp-toolbar">
        <div>
          <strong style="color:#fff;">🏙️ Pori &amp; Everyday Finland Roleplay</strong>
          <span style="font-size:0.76rem;color:#94A3B8;display:block;">Reply in A1/A2 Finnish — click any Finnish word chip to save it directly to your SQLite Vocab Deck!</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <select id="flp-rp-scenario" class="flp-select">
            ${scenarios.map((s) => `<option value="${s.id}" ${state.roleplayScenario === s.id ? "selected" : ""}>${s.label}</option>`).join("")}
          </select>
          <select id="flp-rp-level" class="flp-select">
            <option value="A1" ${state.roleplayLevel === "A1" ? "selected" : ""}>Level A1</option>
            <option value="A2" ${state.roleplayLevel === "A2" ? "selected" : ""}>Level A2</option>
          </select>
          <button type="button" id="flp-rp-start" class="flp-btn-primary">▶ Start / Reset Scene</button>
        </div>
      </div>
      <div class="flp-card">
        <div class="flp-chat-log" id="flp-rp-log">
          ${state.roleplayMessages.length === 0 ? `<div style="text-align:center;color:#94A3B8;padding:24px;">Click <strong>▶ Start / Reset Scene</strong> to begin practicing in Pori!</div>` : ""}
          ${state.roleplayMessages.map((m, mIdx) => m.role === "user" ? `
            <div class="flp-msg-user"><strong>You:</strong> ${esc(m.text)}</div>
          ` : `
            <div class="flp-msg-ai">
              <div class="flp-dual-grid">
                <div><small>Kirjakieli (Written)</small><div class="flp-fi-line">${esc(m.reply_written)}</div>${audioBtns(m.reply_written)}</div>
                ${state.showSideBySide ? `<div><small>Puhekieli (Spoken)</small><div class="flp-fi-line">${esc(m.reply_spoken)}</div>${audioBtns(m.reply_spoken)}</div>` : ""}
              </div>
              <div style="font-size:0.8rem;color:#94A3B8;margin-top:6px;">🇬🇧 ${esc(m.english_translation)}</div>
              ${m.gentle_correction ? `<div style="font-size:0.8rem;color:#34D399;margin-top:4px;">💬 Coach tip: ${esc(m.gentle_correction)}</div>` : ""}
              ${m.suggested_reply_fi ? `<div style="font-size:0.78rem;color:#FBBF24;margin-top:4px;">💡 Try saying: <em>${esc(m.suggested_reply_fi)}</em></div>` : ""}
              ${(m.clickable_words || []).length ? `
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                  <span style="font-size:0.72rem;color:#94A3B8;">Click word to save:</span>
                  ${m.clickable_words.map((w, wIdx) => `<button type="button" class="flp-word-chip" data-midx="${mIdx}" data-widx="${wIdx}" title="${esc(w.english)} (${esc(w.base_form)})">+ ${esc(w.word_fi)} <small style="opacity:0.75;">(${esc(w.english)})</small></button>`).join("")}
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <input type="text" id="flp-rp-input" class="flp-input" style="flex:1;" placeholder="Type your Finnish reply (e.g. Hei! Saisinko yhden kahvin?)..." />
          <button type="button" id="flp-rp-send" class="flp-btn-primary" ${state.roleplayLoading ? "disabled" : ""}>${state.roleplayLoading ? "⏳" : "Send →"}</button>
        </div>
      </div>
    `;
  }

  function renderStoryView() {
    const l = state.storyLesson;
    return `
      <div class="flp-toolbar">
        <div>
          <strong style="color:#fff;">📰 ilovefinland.net Story-to-Lesson Bridge (A1/A2 Selkosuomi)</strong>
          <span style="font-size:0.76rem;color:#94A3B8;display:block;">Turn any Studio article into simplified Finnish reading + tap-to-save vocab + quiz.</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <select id="flp-story-picker" class="flp-select" style="max-width:280px;">
            <option value="">-- Pick a Studio Article Draft --</option>
            ${state.studioArticles.slice(0, 30).map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join("")}
          </select>
          <button type="button" id="flp-btn-gen-story" class="flp-btn-primary" ${state.storyLoading ? "disabled" : ""}>
            ${state.storyLoading ? "⏳ Generating Selkosuomi..." : "✨ Generate Lesson"}
          </button>
        </div>
      </div>
      ${state.storyLoading ? `<div class="flp-card" style="text-align:center;padding:30px;color:#38BDF8;">⏳ Gemini Free Tier is adapting this ilovefinland.net story into A1/A2 Easy Finnish (Selkosuomi)...</div>` : ""}
      ${!state.storyLoading && !l ? `<div class="flp-card" style="text-align:center;padding:28px;color:#94A3B8;">Pick any Studio article above — or click <strong>🇫🇮 Study Story in Finnish</strong> on any article draft in Article &amp; Web Publisher!</div>` : ""}
      ${!state.storyLoading && l ? `
        <div class="flp-card">
          <h3 style="margin:0 0 4px;color:#fff;">${esc(l.lesson_title_fi)}</h3>
          <div style="font-size:0.82rem;color:#94A3B8;margin-bottom:14px;">${esc(l.lesson_title_en)} • Generated by ${esc(l.model || "Gemini Free Tier")}</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${(l.sentences || []).map((s) => `
              <div style="background:#061224;border:1px solid rgba(75,137,188,0.25);border-radius:10px;padding:12px;">
                <div class="flp-dual-grid">
                  <div><small>Kirjakieli (Selkosuomi)</small><div class="flp-fi-line">${esc(s.written_fi)}</div>${audioBtns(s.written_fi)}</div>
                  ${state.showSideBySide ? `<div><small>Puhekieli (Spoken)</small><div class="flp-fi-line">${esc(s.spoken_fi)}</div>${audioBtns(s.spoken_fi)}</div>` : ""}
                </div>
                <div style="font-size:0.8rem;color:#94A3B8;margin-top:6px;">🇬🇧 ${esc(s.english)}</div>
              </div>
            `).join("")}
          </div>

          <h4 style="margin:16px 0 8px;color:#38BDF8;">Tap-to-Save Key Vocabulary</h4>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${(l.vocabulary || []).map((v, i) => `<button type="button" class="flp-word-chip flp-save-story-vocab" data-vidx="${i}">+ <strong>${esc(v.word_fi)}</strong> (${esc(v.english)})</button>`).join("")}
          </div>

          ${(l.comprehension || []).length ? `
            <h4 style="margin:18px 0 8px;color:#38BDF8;">Comprehension Check</h4>
            ${l.comprehension.map((q, qi) => {
              const picked = state.storyQuizAnswers[qi];
              return `<div style="background:#061224;border:1px solid rgba(75,137,188,0.22);border-radius:10px;padding:12px;margin-bottom:10px;">
                <div style="font-weight:700;color:#fff;font-size:0.88rem;">${qi + 1}. ${esc(q.question_fi)} ${audioBtns(q.question_fi)}</div>
                <div style="font-size:0.78rem;color:#94A3B8;margin-bottom:8px;">${esc(q.question_en)}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  ${(q.options || []).map((opt, oi) => `<button type="button" class="flp-choice-btn flp-story-quiz-opt ${picked === oi ? (oi === q.answer_index ? "is-correct" : "is-wrong") : ""}" data-qi="${qi}" data-oi="${oi}">${esc(opt)}</button>`).join("")}
                </div>
                ${picked !== undefined ? `<div style="margin-top:6px;font-size:0.78rem;color:${picked === q.answer_index ? "#34D399" : "#F87171"};">${picked === q.answer_index ? "✅ Correct!" : "❌ Try again."} ${esc(q.explanation || "")}</div>` : ""}
              </div>`;
            }).join("")}
          ` : ""}
        </div>
      ` : ""}
    `;
  }

  function renderVocabView() {
    return `
      <div class="flp-toolbar">
        <div>
          <strong style="color:#fff;">📚 My Saved SQLite Vocabulary Deck (${state.vocabWords.length} words)</strong>
          <span style="font-size:0.76rem;color:#94A3B8;display:block;">Stored persistently in /data/studio.db — click Export to save directly to Goodnotes!</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="flp-btn-vocab-pdf" class="flp-btn-primary">📄 Export Goodnotes PDF / Print</button>
          <button type="button" id="flp-btn-vocab-md" class="flp-btn-ghost">⬇️ Export Markdown (.md)</button>
        </div>
      </div>
      <div class="flp-card">
        ${state.vocabWords.length === 0 ? `<div style="text-align:center;color:#94A3B8;padding:24px;">No words saved yet. Click any word in <strong>Pori Roleplay</strong>, <strong>Snap &amp; Ask</strong>, or <strong>Story-to-Lesson</strong> to save it here!</div>` : `
          <div style="overflow-x:auto;">
            <table class="flp-table">
              <thead><tr><th>Finnish</th><th>Spoken</th><th>Base Form</th><th>English</th><th>Audio</th><th></th></tr></thead>
              <tbody>
                ${state.vocabWords.map((w) => `<tr>
                  <td><strong>${esc(w.word_fi)}</strong></td>
                  <td style="color:#7DD3FC;">${esc(w.spoken_fi || "—")}</td>
                  <td style="color:#94A3B8;">${esc(w.base_form)}</td>
                  <td>${esc(w.english)}</td>
                  <td>${audioBtns(w.word_fi)}</td>
                  <td><button type="button" class="flp-btn-ghost flp-del-vocab" data-vid="${w.id}" style="color:#F87171;">✕</button></td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  function renderProShell() {
    const view = document.getElementById("view-finnish-lab");
    if (!view) return;

    // Remove legacy duplicate top mode-chip bar above Chat / Study if present
    const legacyBar = document.getElementById("flp-pro-header");
    if (legacyBar) legacyBar.remove();

    let panel = document.getElementById("flp-pro-workspace");
    const classicRoot = document.getElementById("finnish-lab-root");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "flp-pro-workspace";
      panel.className = "flp-pro-workspace";
      view.appendChild(panel);
    }
    if (!document.getElementById("flp-toast")) {
      const t = document.createElement("div");
      t.id = "flp-toast";
      t.className = "flp-toast";
      document.body.appendChild(t);
    }

    const isClassic = state.activeProTab === "tutor";
    if (classicRoot) classicRoot.style.display = isClassic ? "" : "none";
    panel.style.display = isClassic ? "none" : "block";

    if (!isClassic) {
      const topNav = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(56,189,248,0.2);">
          <button type="button" class="fl-btn sm" id="flp-btn-back-study">← Back to Study</button>
          <label class="flp-sbs-toggle" title="Show Written Finnish (Kirjakieli) next to Spoken Finnish (Puhekieli)">
            <input type="checkbox" id="flp-toggle-sbs" ${state.showSideBySide ? "checked" : ""} />
            <span>Kirjakieli ↔ Puhekieli</span>
          </label>
        </div>
      `;
      let bodyHtml = "";
      if (state.activeProTab === "srs") bodyHtml = renderSrsView();
      else if (state.activeProTab === "grammar") bodyHtml = renderGrammarView();
      else if (state.activeProTab === "snap") bodyHtml = renderSnapView();
      else if (state.activeProTab === "roleplay") bodyHtml = renderRoleplayView();
      else if (state.activeProTab === "story") bodyHtml = renderStoryView();
      else if (state.activeProTab === "vocab") bodyHtml = renderVocabView();
      panel.innerHTML = topNav + bodyHtml;
    }

    bindProEvents(panel);
  }

  function bindProEvents(panel) {
    panel.querySelector("#flp-btn-back-study")?.addEventListener("click", () => {
      state.activeProTab = "tutor";
      renderProShell();
    });

    panel.querySelector("#flp-toggle-sbs")?.addEventListener("change", (e) => {
      state.showSideBySide = e.target.checked;
      renderProShell();
    });

    // SRS events
    panel.querySelector("#flp-srs-topic")?.addEventListener("change", (e) => {
      state.srsTopic = e.target.value;
      loadSrsQueue();
    });
    panel.querySelector("#flp-btn-gen-srs")?.addEventListener("click", generateFreshDrills);
    panel.querySelectorAll("[data-srs-choice]").forEach((b) => {
      b.addEventListener("click", () => submitSrsAnswer(b.dataset.srsChoice));
    });
    panel.querySelectorAll("[data-tile-word]").forEach((b) => {
      b.addEventListener("click", () => {
        state.srsBuiltTiles.push(b.dataset.tileWord);
        renderProShell();
      });
    });
    panel.querySelector("#flp-srs-clear-tiles")?.addEventListener("click", () => {
      state.srsBuiltTiles = [];
      renderProShell();
    });
    panel.querySelector("#flp-srs-check-rebuild")?.addEventListener("click", () => {
      submitSrsAnswer(state.srsBuiltTiles.join(" "));
    });
    panel.querySelector("#flp-srs-next")?.addEventListener("click", () => {
      state.srsIndex = (state.srsIndex + 1) % Math.max(1, state.srsQueue.length);
      state.srsBuiltTiles = [];
      state.srsFeedback = null;
      if (state.srsIndex === 0) loadSrsQueue();
      else renderProShell();
    });

    // Grammar Goodnotes export
    panel.querySelector("#flp-btn-goodnotes-pdf")?.addEventListener("click", () => exportGoodnotesStudySheet("grammar", "print"));
    panel.querySelector("#flp-btn-goodnotes-md")?.addEventListener("click", () => exportGoodnotesStudySheet("grammar", "markdown"));
    panel.querySelector("#flp-btn-vocab-pdf")?.addEventListener("click", () => exportGoodnotesStudySheet("vocab", "print"));
    panel.querySelector("#flp-btn-vocab-md")?.addEventListener("click", () => exportGoodnotesStudySheet("vocab", "markdown"));

    // Snap & Ask
    panel.querySelector("#flp-snap-file")?.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      state.snapMime = f.type || "image/jpeg";
      const reader = new FileReader();
      reader.onload = () => {
        state.snapPreviewUrl = reader.result;
        state.snapB64 = reader.result;
        state.snapResult = null;
        renderProShell();
      };
      reader.readAsDataURL(f);
    });
    panel.querySelector("#flp-btn-run-snap")?.addEventListener("click", runSnapAndAsk);
    panel.querySelectorAll(".flp-save-snap-word").forEach((b) => {
      b.addEventListener("click", () => {
        const w = (state.snapResult?.words || [])[parseInt(b.dataset.idx, 10)];
        if (w) saveWordToSql(w, "snap_ask");
      });
    });

    // Pori Roleplay
    panel.querySelector("#flp-rp-scenario")?.addEventListener("change", (e) => {
      state.roleplayScenario = e.target.value;
    });
    panel.querySelector("#flp-rp-level")?.addEventListener("change", (e) => {
      state.roleplayLevel = e.target.value;
    });
    panel.querySelector("#flp-rp-start")?.addEventListener("click", () => {
      state.roleplayMessages = [];
      sendRoleplayTurn("");
    });
    const doSendRp = () => {
      const inp = panel.querySelector("#flp-rp-input");
      const val = (inp?.value || "").trim();
      if (!val) return;
      inp.value = "";
      sendRoleplayTurn(val);
    };
    panel.querySelector("#flp-rp-send")?.addEventListener("click", doSendRp);
    panel.querySelector("#flp-rp-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); doSendRp(); }
    });
    panel.querySelectorAll(".flp-word-chip[data-midx]").forEach((b) => {
      b.addEventListener("click", () => {
        const msg = state.roleplayMessages[parseInt(b.dataset.midx, 10)];
        const w = msg?.clickable_words?.[parseInt(b.dataset.widx, 10)];
        if (w) saveWordToSql(w, `roleplay:${state.roleplayScenario}`);
      });
    });

    // Story-to-Lesson
    panel.querySelector("#flp-btn-gen-story")?.addEventListener("click", async () => {
      const pid = panel.querySelector("#flp-story-picker")?.value;
      if (!pid) { toast("Select an article draft from the dropdown first!"); return; }
      try {
        const pkg = await apiJson(`/api/package?id=${encodeURIComponent(pid)}`);
        const curVer = pkg.package?.current_version;
        const ver = (pkg.versions || []).find((v) => v.version === curVer) || (pkg.versions || []).slice(-1)[0];
        const art = ver?.article || {};
        runStoryToLesson({
          headline: art.headline || pkg.package?.title || "",
          summary: art.short_description || "",
          body: String(art.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        });
      } catch (e) {
        toast("Could not load article: " + e.message);
      }
    });
    panel.querySelectorAll(".flp-save-story-vocab").forEach((b) => {
      b.addEventListener("click", () => {
        const v = (state.storyLesson?.vocabulary || [])[parseInt(b.dataset.vidx, 10)];
        if (v) saveWordToSql(v, "story_lesson");
      });
    });
    panel.querySelectorAll(".flp-story-quiz-opt").forEach((b) => {
      b.addEventListener("click", () => {
        state.storyQuizAnswers[parseInt(b.dataset.qi, 10)] = parseInt(b.dataset.oi, 10);
        renderProShell();
      });
    });

    // Vocab delete
    panel.querySelectorAll(".flp-del-vocab").forEach((b) => {
      b.addEventListener("click", async () => {
        await apiJson("/api/finnish-lab/vocab", {
          method: "POST",
          body: JSON.stringify({ action: "delete", id: parseInt(b.dataset.vid, 10) }),
        });
        loadVocabDeck();
      });
    });
  }

  // Expose public bridge API
  window.FinnishLabPro = {
    render: renderProShell,
    speak: speakFi,
    openStoryLesson: runStoryToLesson,
    closeTool() {
      if (state.activeProTab !== "tutor") {
        state.activeProTab = "tutor";
        renderProShell();
      }
    },
    openTab(tabId) {
      state.activeProTab = tabId;
      renderProShell();
      if (tabId === "srs") loadSrsQueue();
      if (tabId === "vocab") loadVocabDeck();
      if (tabId === "story") loadStudioArticlesForPicker();
    },
  };

  // Hook into existing window.FinnishLab.render so Pro bar always mounts when Finnish Lab opens
  function attachHook() {
    if (window.FinnishLab && !window.FinnishLab.__proHooked) {
      const origRender = window.FinnishLab.render;
      window.FinnishLab.render = function (...args) {
        const r = origRender ? origRender.apply(this, args) : undefined;
        renderProShell();
        if (window.__pendingStoryLesson) {
          const payload = window.__pendingStoryLesson;
          window.__pendingStoryLesson = null;
          runStoryToLesson(payload);
        }
        return r;
      };
      window.FinnishLab.openStoryLesson = runStoryToLesson;
      window.FinnishLab.__proHooked = true;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    attachHook();
    setTimeout(attachHook, 400);
  });
})();
