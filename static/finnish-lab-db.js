/* ============================================================================
   FINNISH LEARNING LAB — ISOLATED STORAGE LAYER (IndexedDB + finnish_lab_*)
   Completely separate from ILoveFinland Studio publishing data.
   ============================================================================ */
(function () {
  "use strict";

  const DEFAULT_DB_NAME = "finnish_lab_db";
  const DB_VERSION = 1;
  let _dbName = DEFAULT_DB_NAME;
  let _lsPrefix = "finnish_lab_";
  let _dbPromise = null;

  function setActiveUser(email) {
    const clean = String(email || "").trim().toLowerCase();
    // Preserve Binod's existing local DB name; give every other user a 100% isolated per-email IndexedDB & localStorage namespace!
    const nextDb = !clean || clean === "binodoli721@gmail.com" ? DEFAULT_DB_NAME : `finnish_lab_db_${clean.replace(/[^a-z0-9]/g, "_")}`;
    const nextLs = !clean || clean === "binodoli721@gmail.com" ? "finnish_lab_" : `finnish_lab_${clean.replace(/[^a-z0-9]/g, "_")}_`;
    if (nextDb !== _dbName || nextLs !== _lsPrefix) {
      _dbName = nextDb;
      _lsPrefix = nextLs;
      _dbPromise = null;
    }
  }

  function openDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        resolve(null);
        return;
      }
      const req = indexedDB.open(_dbName, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains("conversations")) {
          const s = db.createObjectStore("conversations", { keyPath: "id" });
          s.createIndex("updatedAt", "updatedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("flashcards")) {
          const s = db.createObjectStore("flashcards", { keyPath: "id" });
          s.createIndex("dueAt", "dueAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("notes")) {
          const s = db.createObjectStore("notes", { keyPath: "id" });
          s.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    return _dbPromise;
  }

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(_lsPrefix + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function lsSet(key, val) {
    try {
      localStorage.setItem(_lsPrefix + key, JSON.stringify(val));
    } catch (_) {
      // ignore storage quota error
    }
  }

  async function idbGetAll(storeName) {
    const db = await openDB();
    if (!db) return lsGet("fallback_" + storeName, []);
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (_) {
        resolve([]);
      }
    });
  }

  async function idbPut(storeName, item) {
    const db = await openDB();
    if (!db) {
      const arr = lsGet("fallback_" + storeName, []);
      const idx = arr.findIndex((x) => x.id === item.id || x.key === item.key);
      if (idx >= 0) arr[idx] = item;
      else arr.push(item);
      lsSet("fallback_" + storeName, arr);
      return item;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(item);
      tx.oncomplete = () => resolve(item);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbDelete(storeName, key) {
    const db = await openDB();
    if (!db) {
      const arr = lsGet("fallback_" + storeName, []).filter((x) => x.id !== key && x.key !== key);
      lsSet("fallback_" + storeName, arr);
      return;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ---------- SETTINGS & PROGRESS ---------- */
  function getSettings() {
    return Object.assign(
      {
        level: "A1",
        dailyTargetMinutes: 10,
        retainAudioInNotes: false,
        quickClassMode: false,
        answerMode: "teach_me",
        homeworkMode: "hint",
        voiceLang: "fi-FI",
        speechRateNormal: 0.95,
        speechRateSlow: 0.65,
      },
      lsGet("settings", {})
    );
  }

  function saveSettings(patch) {
    const next = Object.assign(getSettings(), patch || {});
    lsSet("settings", next);
    return next;
  }

  function getProgress() {
    return Object.assign(
      {
        streakDays: 0,
        lastStudyDate: null,
        studyDaysHistory: [],
        completedLessons: [],
        topicsStudied: [],
        speakingCompleted: 0,
        listeningCompleted: 0,
        writingCompleted: 0,
        commonMistakes: [],
      },
      lsGet("progress", {})
    );
  }

  function touchStudyStreak(activity) {
    const p = getProgress();
    const today = todayStr();
    if (p.lastStudyDate !== today) {
      if (p.lastStudyDate) {
        const prev = new Date(p.lastStudyDate + "T00:00:00Z");
        const cur = new Date(today + "T00:00:00Z");
        const diffDays = Math.round((cur - prev) / 86400000);
        p.streakDays = diffDays === 1 ? (p.streakDays || 0) + 1 : 1;
      } else {
        p.streakDays = 1;
      }
      p.lastStudyDate = today;
      if (!p.studyDaysHistory.includes(today)) {
        p.studyDaysHistory.push(today);
        if (p.studyDaysHistory.length > 60) p.studyDaysHistory.shift();
      }
    }
    if (activity === "speaking") p.speakingCompleted = (p.speakingCompleted || 0) + 1;
    if (activity === "listening") p.listeningCompleted = (p.listeningCompleted || 0) + 1;
    if (activity === "writing") p.writingCompleted = (p.writingCompleted || 0) + 1;
    lsSet("progress", p);
    return p;
  }

  function recordTopicStudied(topicId, label) {
    const p = touchStudyStreak();
    if (!p.topicsStudied.some((t) => t.id === topicId)) {
      p.topicsStudied.push({ id: topicId, label, at: new Date().toISOString() });
    }
    lsSet("progress", p);
    return p;
  }

  function recordLessonCompleted(lessonKey) {
    const p = touchStudyStreak();
    if (!p.completedLessons.includes(lessonKey)) {
      p.completedLessons.push(lessonKey);
    }
    lsSet("progress", p);
    return p;
  }

  function recordMistake(wrong, right, why) {
    if (!wrong || !right) return;
    const p = touchStudyStreak();
    p.commonMistakes = p.commonMistakes || [];
    const existing = p.commonMistakes.find((m) => m.wrong.toLowerCase() === wrong.toLowerCase());
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.lastAt = new Date().toISOString();
    } else {
      p.commonMistakes.unshift({
        wrong,
        right,
        why: why || "",
        count: 1,
        lastAt: new Date().toISOString(),
      });
      if (p.commonMistakes.length > 40) p.commonMistakes.pop();
    }
    lsSet("progress", p);
  }

  /* ---------- CONVERSATIONS ---------- */
  async function listConversations() {
    const all = await idbGetAll("conversations");
    return all.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }

  async function saveConversation(conv) {
    const now = new Date().toISOString();
    const item = Object.assign(
      {
        id: conv.id || uid("conv"),
        title: conv.title || "Finnish Study Session",
        kind: conv.kind || "tutor", // tutor | class | homework
        createdAt: conv.createdAt || now,
        updatedAt: now,
        messages: [],
        pinnedAttachments: [],
      },
      conv,
      { updatedAt: now }
    );
    await idbPut("conversations", item);
    return item;
  }

  async function deleteConversation(id) {
    await idbDelete("conversations", id);
  }

  /* ---------- FLASHCARDS (SM-2 SPACED REPETITION) ---------- */
  async function listFlashcards() {
    const all = await idbGetAll("flashcards");
    return all.sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
  }

  async function addFlashcard(card) {
    const fi = (card.fi || "").trim();
    const en = (card.en || "").trim();
    if (!fi) return { added: false, reason: "empty" };
    const existing = await listFlashcards();
    const norm = fi.toLowerCase();
    const dup = existing.find((c) => (c.fi || "").trim().toLowerCase() === norm);
    if (dup) {
      return { added: false, duplicate: true, card: dup };
    }
    const item = {
      id: uid("card"),
      fi,
      en,
      baseForm: (card.baseForm || fi).trim(),
      example: (card.example || "").trim(),
      spoken: (card.spoken || "").trim(),
      collection: (card.collection || "General").trim(),
      imageDataUrl: card.imageDataUrl || null,
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      dueAt: Date.now(),
      createdAt: new Date().toISOString(),
    };
    await idbPut("flashcards", item);
    touchStudyStreak();
    return { added: true, card: item };
  }

  async function updateFlashcard(card) {
    await idbPut("flashcards", card);
    return card;
  }

  async function reviewFlashcard(cardId, rating) {
    // rating: 'again' | 'hard' | 'good' | 'easy'
    const all = await listFlashcards();
    const card = all.find((c) => c.id === cardId);
    if (!card) return null;
    let ef = card.easeFactor || 2.5;
    let reps = card.repetitions || 0;
    let interval = card.intervalDays || 0;

    if (rating === "again") {
      reps = 0;
      interval = 0.01; // ~15 minutes
      ef = Math.max(1.3, ef - 0.2);
    } else if (rating === "hard") {
      reps = Math.max(1, reps);
      interval = interval < 1 ? 0.5 : Math.max(1, Math.round(interval * 1.2));
      ef = Math.max(1.3, ef - 0.15);
    } else if (rating === "good") {
      reps += 1;
      if (reps === 1) interval = 1;
      else if (reps === 2) interval = 3;
      else interval = Math.round(interval * ef);
    } else if (rating === "easy") {
      reps += 1;
      interval = reps <= 1 ? 4 : Math.round(Math.max(2, interval) * ef * 1.3);
      ef = Math.min(3.0, ef + 0.15);
    }

    card.easeFactor = Number(ef.toFixed(2));
    card.repetitions = reps;
    card.intervalDays = interval;
    card.dueAt = Date.now() + Math.round(interval * 86400000);
    card.lastReviewedAt = new Date().toISOString();
    await idbPut("flashcards", card);
    touchStudyStreak();
    return card;
  }

  async function deleteFlashcard(id) {
    await idbDelete("flashcards", id);
  }

  /* ---------- CLASS NOTES & HISTORY ---------- */
  async function listNotes() {
    const all = await idbGetAll("notes");
    return all.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  async function saveNote(note) {
    const now = new Date().toISOString();
    const item = Object.assign(
      {
        id: note.id || uid("note"),
        title: note.title || "Class Note",
        topic: note.topic || "Classroom",
        type: note.type || "teacher_recording", // teacher_recording | homework | grammar | reading
        date: note.date || todayStr(),
        createdAt: note.createdAt || now,
        transcript: note.transcript || "",
        content: note.content || "",
        audioDataUrl: note.audioDataUrl || null,
        imageDataUrl: note.imageDataUrl || null,
      },
      note
    );
    await idbPut("notes", item);
    touchStudyStreak();
    return item;
  }

  async function deleteNote(id) {
    await idbDelete("notes", id);
  }

  /* ---------- EXPORT / IMPORT BACKUP ---------- */
  async function exportAllData() {
    const [conversations, flashcards, notes] = await Promise.all([
      listConversations(),
      listFlashcards(),
      listNotes(),
    ]);
    return {
      schema: "finnish_lab_backup_v1",
      exportedAt: new Date().toISOString(),
      settings: getSettings(),
      progress: getProgress(),
      conversations,
      flashcards,
      notes,
    };
  }

  async function importAllData(backup) {
    if (!backup || backup.schema !== "finnish_lab_backup_v1") {
      throw new Error("Invalid Finnish Lab backup file.");
    }
    if (backup.settings) saveSettings(backup.settings);
    if (backup.progress) lsSet("progress", backup.progress);
    for (const c of backup.conversations || []) await idbPut("conversations", c);
    for (const f of backup.flashcards || []) await idbPut("flashcards", f);
    for (const n of backup.notes || []) await idbPut("notes", n);
    return {
      conversations: (backup.conversations || []).length,
      flashcards: (backup.flashcards || []).length,
      notes: (backup.notes || []).length,
    };
  }

  window.FinnishLabDB = {
    setActiveUser,
    getSettings,
    saveSettings,
    getProgress,
    touchStudyStreak,
    recordTopicStudied,
    recordLessonCompleted,
    recordMistake,
    listConversations,
    saveConversation,
    deleteConversation,
    listFlashcards,
    addFlashcard,
    updateFlashcard,
    reviewFlashcard,
    deleteFlashcard,
    listNotes,
    saveNote,
    deleteNote,
    exportAllData,
    importAllData,
    todayStr,
    uid,
  };
})();
