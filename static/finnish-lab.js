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

  /* ---------- ILOVEFINLAND NORDIC BRAND SVG ICONS (SUBTLE, UNIFORM ACROSS ALL DEVICES) ---------- */
  const ICO = {
    listen: `<svg class="fl-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.8 5.5a9.2 9.2 0 0 1 0 13"></path></svg>`,
    wave: `<svg class="fl-svg fl-audio-pulse" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"><line x1="4" y1="10" x2="4" y2="14"></line><line x1="9" y1="6" x2="9" y2="18"></line><line x1="14" y1="4" x2="14" y2="20"></line><line x1="19" y1="8" x2="19" y2="16"></line></svg>`,
    slow: `<svg class="fl-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"></circle><polyline points="12 7 12 12 15.5 14"></polyline></svg>`,
    stop: `<svg class="fl-svg" width="13" height="13" viewBox="0 0 24 24" fill="#38bdf8"><rect x="5" y="5" width="14" height="14" rx="3"></rect></svg>`,
    explain: `<svg class="fl-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.91 5.81a2 2 0 0 1-1.28 1.28L3 12l5.81 1.91a2 2 0 0 1 1.28 1.28L12 21l1.91-5.81a2 2 0 0 1 1.28-1.28L21 12l-5.81-1.91a2 2 0 0 1-1.28-1.28L12 3Z"></path></svg>`,
    cards: `<svg class="fl-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    save: `<svg class="fl-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>`,
    trash: `<svg class="fl-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>`,
    flame: `<svg class="fl-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
    live: `<svg class="fl-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path><circle cx="12" cy="12" r="2"></circle><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"></path></svg>`,
    mic: `<svg class="fl-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>`,
    plus: `<svg class="fl-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    send: `<svg class="fl-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,
    headphones: `<svg class="fl-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`,
    book: `<svg class="fl-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
    file: `<svg class="fl-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    zap: `<svg class="fl-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  };

  const state = {
    activeTab: "chat", // "chat" | "walk" | "notebook"
    notebookTableId: "olla", // "olla" | "onko" | "days" | "everyday"
    mode: "chat", // legacy alias synced with activeTab
    studyTool: null,
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
    liveStream: null,
    liveChunkRecorder: null,
    liveChunkTimer: null,
    liveAudioCtx: null,
    liveVadInterval: null,
    liveForceCutFn: null,
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
    podcastEpisodeId: "pod_seasons",
    podcastCreating: false,
    podcastPlaying: false,
    podcastPaused: false,
    podcastItemIdx: 0,
    podcastPhase: "",
    podcastLoop: true,
    podcastSpeed: 0.75,
    podcastTimer: null,
    podcastShowScript: true,
    extractingCards: false,
    speakingMsgId: null,
    gameTab: "street", // street (School Finnish Practice) | speak
    streetIdx: 0,
    streetScore: 0,
    streetFeedback: null,
    speakPhraseIdx: 0,
    speakRecording: false,
    speakRecorder: null,
    speakResult: null,
    knownAppVersion: null,
    cardSearch: "",
  };

  const SCHOOL_FINNISH_QUESTIONS = [
    {
      topic: "Verb 'olla' (to be)",
      promptFi: "Minä ___ opiskelija Suomessa.",
      promptEn: "I am a student in Finland.",
      answer: "olen",
      fullFi: "Minä olen opiskelija Suomessa.",
      fullEn: "I am a student in Finland.",
      tip: "'Minä' (I) always takes the -n ending: olen.",
      opts: ["olen (am — I)", "olet (are — you)", "on (is — he/she)"],
    },
    {
      topic: "Verb 'olla' (plural)",
      promptFi: "Me ___ tänään kurssilla.",
      promptEn: "We are in class today.",
      answer: "olemme",
      fullFi: "Me olemme tänään kurssilla.",
      fullEn: "We are in class today.",
      tip: "Standard school Finnish for 'me' (we) takes -mme: olemme.",
      opts: ["olemme (are — we)", "olette (are — you pl.)", "ovat (are — they)"],
    },
    {
      topic: "Questions (-ko / -kö)",
      promptFi: "___ sinä suomea?",
      promptEn: "Do you speak Finnish?",
      answer: "Puhutko",
      fullFi: "Puhutko sinä suomea?",
      fullEn: "Do you speak Finnish?",
      tip: "Back vowel 'u' in 'puhut' takes '-ko' -> Puhutko.",
      opts: ["Puhutko (Do you speak?)", "Puhutkö (wrong harmony)", "Puhuu (speaks)"],
    },
    {
      topic: "Questions (-ko / -kö)",
      promptFi: "___ sinä kahvia?",
      promptEn: "Do you drink coffee?",
      answer: "Juotko",
      fullFi: "Juotko sinä kahvia?",
      fullEn: "Do you drink coffee?",
      tip: "'Juot' has back vowels (u, o), so attach '-ko': Juotko.",
      opts: ["Juotko (Do you drink?)", "Juotkö (wrong harmony)", "Juon (I drink)"],
    },
    {
      topic: "Local Cases (-ssa / -ssä)",
      promptFi: "Minä asun ___.",
      promptEn: "I live in Pori.",
      answer: "Porissa",
      fullFi: "Minä asun Porissa.",
      fullEn: "I live in Pori.",
      tip: "'In' a city uses the inessive ending -ssa/-ssä (Pori -> Porissa).",
      opts: ["Porissa (in Pori)", "Porista (from Pori)", "Poriin (to Pori)"],
    },
    {
      topic: "Local Cases (-sta / -stä)",
      promptFi: "Olen kotoisin ___.",
      promptEn: "I am originally from Finland.",
      answer: "Suomesta",
      fullFi: "Olen kotoisin Suomesta.",
      fullEn: "I am originally from Finland.",
      tip: "'From' uses the elative ending -sta/-stä (Suomi -> Suomesta).",
      opts: ["Suomesta (from Finland)", "Suomessa (in Finland)", "Suomeen (to Finland)"],
    },
    {
      topic: "Local Cases (Illative -Vn)",
      promptFi: "Menen nyt ___.",
      promptEn: "I am going to the store now.",
      answer: "kauppaan",
      fullFi: "Menen nyt kauppaan.",
      fullEn: "I am going to the store now.",
      tip: "Movement 'into' doubles the final vowel + n: kauppa -> kauppaan.",
      opts: ["kauppaan (to the store)", "kaupassa (in the store)", "kaupasta (from the store)"],
    },
    {
      topic: "Everyday Vocabulary",
      promptFi: "Anteeksi, voitko ___?",
      promptEn: "Excuse me, can you repeat?",
      answer: "toistaa",
      fullFi: "Anteeksi, voitko toistaa?",
      fullEn: "Excuse me, can you repeat?",
      tip: "'Toistaa' means 'to repeat' — super useful in Finnish class!",
      opts: ["toistaa (to repeat)", "nukkua (to sleep)", "syödä (to eat)"],
    },
    {
      topic: "Days & Time",
      promptFi: "Tänään on maanantai. Huomenna on ___.",
      promptEn: "Today is Monday. Tomorrow is Tuesday.",
      answer: "tiistai",
      fullFi: "Huomenna on tiistai.",
      fullEn: "Tomorrow is Tuesday.",
      tip: "Weekdays start lowercase in Finnish: maanantai, tiistai, keskiviikko.",
      opts: ["tiistai (Tuesday)", "perjantai (Friday)", "sunnuntai (Sunday)"],
    },
    {
      topic: "Seasons & Weather",
      promptFi: "Ulkona sataa ___.",
      promptEn: "It is snowing outside.",
      answer: "lunta",
      fullFi: "Ulkona sataa lunta.",
      fullEn: "It is snowing outside.",
      tip: "'Sataa lunta' = it is snowing (partitive of 'lumi' is 'lunta').",
      opts: ["lunta (snow)", "aurinko (sun)", "tuoli (chair)"],
    },
    {
      topic: "Everyday Objects",
      promptFi: "Kirjoitan ___ vihkoon.",
      promptEn: "I write with a pen into the notebook.",
      answer: "kynällä",
      fullFi: "Kirjoitan kynällä vihkoon.",
      fullEn: "I write with a pen into the notebook.",
      tip: "Using a tool ('with a pen') takes -lla/-llä: kynä -> kynällä.",
      opts: ["kynällä (with a pen)", "kynässä (in a pen)", "kynästä (from a pen)"],
    },
    {
      topic: "Polite Requests",
      promptFi: "___ yhden kahvin, kiitos.",
      promptEn: "Could I have one coffee, please.",
      answer: "Saisinko",
      fullFi: "Saisinko yhden kahvin, kiitos.",
      fullEn: "Could I have one coffee, please.",
      tip: "'Saisinko' is the polite school & everyday way to ask for something.",
      opts: ["Saisinko (Could I have)", "Olenko (Am I)", "Asunko (Do I live)"],
    },
  ];

  const SPEAK_PHRASES = [
    { fi: "Hyvää huomenta, opettaja!", en: "Good morning, teacher!", focus: "Long 'ää' in hyvää" },
    { fi: "Mitä sinulle kuuluu?", en: "How are you?", focus: "Double 'uu' in kuuluu" },
    { fi: "Saisinko yhden kahvin, kiitos?", en: "Could I have one coffee, please?", focus: "Clear 'y' in yhden" },
    { fi: "Anteeksi, voitko toistaa hitaasti?", en: "Excuse me, can you repeat slowly?", focus: "Double 'ee' in anteeksi" },
    { fi: "Tänään on kylmä talvipäivä.", en: "Today is a cold winter day.", focus: "Crisp 'ä' and 'y'" },
    { fi: "Minä asun Porissa ja opiskelen suomea.", en: "I live in Pori and study Finnish.", focus: "Steady 1st-syllable stress" },
  ];

  /* ---------- WARM ENCOURAGING COACH MODE (FUN LIGHT BANTER, ZERO HARSHNESS) ---------- */
  function isRoastEnabled() {
    return DB.getSettings().roastMode !== false;
  }

  function getRoastLine(isMistake) {
    if (!isMistake) {
      state.mistakeStreak = 0;
      return "";
    }
    state.mistakeStreak = (state.mistakeStreak || 0) + 1;
    if (state.mistakeStreak === 1) return "😊 Close one! Finnish endings are sneaky — check the tip below!";
    if (state.mistakeStreak === 2) return "💪 Almost got it! One quick look at the rule and you'll ace the next one.";
    return "🌟 Keep going! Every mistake locks the right Finnish pattern into memory.";
  }

  /* ---------- INDIVIDUAL PER-USER FRIEND MEMORY (ISOLATED BY EMAIL!) ---------- */
  function getUserMemoryKey() {
    const em = (state.userEmail || "guest").trim().toLowerCase();
    return `fl_friend_mem_${em}`;
  }

  function getUserMemoryList() {
    try {
      const raw = localStorage.getItem(getUserMemoryKey());
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function saveUserMemoryList(list) {
    try {
      localStorage.setItem(getUserMemoryKey(), JSON.stringify((list || []).slice(0, 15)));
    } catch (_) {}
  }

  function capturePersonalMemory(msg) {
    const t = (msg || "").trim();
    if (!t || t.length < 5 || t.length > 240) return;
    const patterns = [
      /\b(?:i am in|i'm in|i live in|living in|staying in|in pori|in helsinki|in tampere|in turku|in oulu|in espoo)\b/i,
      /\b(?:my name is|call me)\s+([a-zäöåA-ZÄÖÅ\s-]{2,24})/i,
      /\b(?:i work|my job|i am a|i'm a|i love|i like|my wife|my husband|my kids|my family|my class|class at|feel sleepy|tired|happy|stressed|today i)\b/i,
    ];
    for (const re of patterns) {
      if (re.test(t)) {
        const mem = getUserMemoryList();
        const clean = t.slice(0, 130);
        if (!mem.some((x) => x.toLowerCase() === clean.toLowerCase())) {
          mem.unshift(clean);
          saveUserMemoryList(mem);
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

  /* ---------- LONGER BEGINNER WALK & LISTEN AUDIO COURSES (20-24 ITEMS, ~10-15 MIN) ---------- */
  const PODCAST_EPISODES = [
    {
      id: "pod_seasons",
      title: "🍂 Seasons & Weather",
      duration: "~12–15 min",
      items: [
        { fi: "kevät", en: "spring" },
        { fi: "kesä", en: "summer" },
        { fi: "syksy", en: "autumn" },
        { fi: "talvi", en: "winter" },
        { fi: "sää", en: "weather" },
        { fi: "aurinko", en: "sun" },
        { fi: "aurinko paistaa", en: "the sun is shining" },
        { fi: "pilvi", en: "cloud" },
        { fi: "tänään on pilvistä", en: "today it is cloudy" },
        { fi: "sade", en: "rain" },
        { fi: "ulkona sataa vettä", en: "it is raining outside" },
        { fi: "lumi", en: "snow" },
        { fi: "ulkona sataa lunta", en: "it is snowing outside" },
        { fi: "tuuli", en: "wind" },
        { fi: "tänään tuulee paljon", en: "today it is very windy" },
        { fi: "kylmä", en: "cold" },
        { fi: "lämmin", en: "warm" },
        { fi: "kuuma", en: "hot" },
        { fi: "pakkanen", en: "freezing cold" },
        { fi: "on kymmenen astetta pakkasta", en: "it is minus ten degrees" },
        { fi: "talvella on pimeää", en: "in winter it is dark" },
        { fi: "kesällä on valoisaa", en: "in summer it is bright" },
        { fi: "millainen sää tänään on?", en: "what is the weather like today?" },
        { fi: "muista laittaa lämmin takki", en: "remember to put on a warm jacket" },
      ],
    },
    {
      id: "pod_days_months",
      title: "📅 Days & Months",
      duration: "~12–15 min",
      items: [
        { fi: "maanantai", en: "Monday" },
        { fi: "tiistai", en: "Tuesday" },
        { fi: "keskiviikko", en: "Wednesday" },
        { fi: "torstai", en: "Thursday" },
        { fi: "perjantai", en: "Friday" },
        { fi: "lauantai", en: "Saturday" },
        { fi: "sunnuntai", en: "Sunday" },
        { fi: "viikonloppu", en: "weekend" },
        { fi: "tänään", en: "today" },
        { fi: "huomenna", en: "tomorrow" },
        { fi: "eilen", en: "yesterday" },
        { fi: "tammikuu", en: "January" },
        { fi: "helmikuu", en: "February" },
        { fi: "maaliskuu", en: "March" },
        { fi: "huhtikuu", en: "April" },
        { fi: "toukokuu", en: "May" },
        { fi: "kesäkuu", en: "June" },
        { fi: "heinäkuu", en: "July" },
        { fi: "elokuu", en: "August" },
        { fi: "syyskuu", en: "September" },
        { fi: "lokakuu", en: "October" },
        { fi: "marraskuu", en: "November" },
        { fi: "joulukuu", en: "December" },
        { fi: "mikä päivä tänään on?", en: "what day is it today?" },
      ],
    },
    {
      id: "pod_objects",
      title: "🏠 Everyday Objects & Names",
      duration: "~12–15 min",
      items: [
        { fi: "pöytä", en: "table" },
        { fi: "tuoli", en: "chair" },
        { fi: "kirja", en: "book" },
        { fi: "vihko", en: "notebook" },
        { fi: "kynä", en: "pen" },
        { fi: "laukku", en: "bag" },
        { fi: "puhelin", en: "phone" },
        { fi: "tietokone", en: "computer" },
        { fi: "avain", en: "key" },
        { fi: "lompakko", en: "wallet" },
        { fi: "ovi", en: "door" },
        { fi: "ikkuna", en: "window" },
        { fi: "valo", en: "light" },
        { fi: "sänky", en: "bed" },
        { fi: "kuppi", en: "cup" },
        { fi: "lasi", en: "glass" },
        { fi: "lautanen", en: "plate" },
        { fi: "lusikka", en: "spoon" },
        { fi: "haarukka", en: "fork" },
        { fi: "veitsi", en: "knife" },
        { fi: "takki", en: "jacket" },
        { fi: "kengät", en: "shoes" },
        { fi: "vesi", en: "water" },
        { fi: "kahvi", en: "coffee" },
      ],
    },
    {
      id: "pod_olla_q",
      title: "🧩 Olla & Questions",
      duration: "~11–14 min",
      items: [
        { fi: "minä olen", en: "I am" },
        { fi: "sinä olet", en: "you are" },
        { fi: "hän on", en: "he or she is" },
        { fi: "me olemme", en: "we are" },
        { fi: "te olette", en: "you plural are" },
        { fi: "he ovat", en: "they are" },
        { fi: "minä en ole", en: "I am not" },
        { fi: "sinä et ole", en: "you are not" },
        { fi: "hän ei ole", en: "he or she is not" },
        { fi: "minä olen opiskelija", en: "I am a student" },
        { fi: "olen kotoisin ulkomailta", en: "I am from abroad" },
        { fi: "minä asun Porissa", en: "I live in Pori" },
        { fi: "oletko sinä valmis?", en: "are you ready?" },
        { fi: "asutko sinä Suomessa?", en: "do you live in Finland?" },
        { fi: "puhutko sinä suomea?", en: "do you speak Finnish?" },
        { fi: "onko sinulla kysymys?", en: "do you have a question?" },
        { fi: "mikä sinun nimesi on?", en: "what is your name?" },
        { fi: "mistä sinä olet kotoisin?", en: "where are you from?" },
        { fi: "missä sinä asut?", en: "where do you live?" },
        { fi: "mitä sinulle kuuluu?", en: "how are you?" },
        { fi: "kiitos, minulle kuuluu hyvää", en: "thank you, I am doing well" },
        { fi: "anteeksi, voitko toistaa?", en: "excuse me, can you repeat?" },
      ],
    },
    {
      id: "pod_today_a1",
      title: "🌅 Today's A1 Words",
      duration: "~10–14 min",
      dynamicToday: true,
      items: [],
    },
    {
      id: "pod_cards",
      title: "⭐ Saved Flashcards",
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
    h = h.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
    h = h.replace(/^##\s+(.+)$/gm, "<h3>$1</h3>");
    // Convert BOTH "* item" and "- item" markdown bullets FIRST so "*" bullets never collide with italics!
    h = h.replace(/^\s*[*-]\s+(.+)$/gm, "<div style='padding-left:12px;'>• $1</div>");
    h = h.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
    h = h.replace(/`([^`]+)`/g, "<code style='background:#061428;padding:1px 5px;border-radius:4px;color:#7dd3fc;'>$1</code>");
    // Strip any leftover unmatched stray asterisks so raw "*" never leaks into UI bubbles
    h = h.replace(/\*/g, "");
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

  /* ---------- SMART BROWSER VOICE SELECTOR (onvoiceschanged + Best fi-FI) ---------- */
  let _cachedSpeechVoices = [];
  function refreshSpeechVoices() {
    if (!("speechSynthesis" in window)) return [];
    try {
      const list = window.speechSynthesis.getVoices() || [];
      if (list.length) _cachedSpeechVoices = list;
    } catch (_) {}
    return _cachedSpeechVoices;
  }
  if ("speechSynthesis" in window) {
    refreshSpeechVoices();
    try {
      window.speechSynthesis.onvoiceschanged = () => { refreshSpeechVoices(); };
    } catch (_) {}
  }

  function pickBestFinnishVoice() {
    const voices = refreshSpeechVoices();
    const fiVoices = voices.filter((v) => {
      const lang = (v.lang || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      return lang.startsWith("fi") || name.includes("finnish") || name.includes("suomi") || /\b(satu|noora|selma|harri)\b/i.test(name);
    });
    if (!fiVoices.length) return null;
    const score = (v) => {
      const n = (v.name || "").toLowerCase();
      let s = 0;
      if (n.includes("enhanced") || n.includes("premium") || n.includes("neural") || n.includes("natural")) s += 50;
      if (n.includes("satu")) s += 40;
      if (n.includes("noora") || n.includes("selma")) s += 38;
      if (n.includes("harri")) s += 25;
      if (v.localService) s += 5;
      if ((v.lang || "").toLowerCase() === "fi-fi") s += 10;
      return s;
    };
    return fiVoices.slice().sort((a, b) => score(b) - score(a))[0];
  }

  function pickBestEnglishVoice() {
    const voices = refreshSpeechVoices();
    const enVoices = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
    if (!enVoices.length) return null;
    const score = (v) => {
      const n = (v.name || "").toLowerCase();
      let s = 0;
      if (n.includes("enhanced") || n.includes("premium") || n.includes("neural") || n.includes("natural")) s += 40;
      if (n.includes("samantha") || n.includes("aria") || n.includes("daniel") || n.includes("karen")) s += 25;
      return s;
    };
    return enVoices.slice().sort((a, b) => score(b) - score(a))[0];
  }

  function fallbackBrowserSpeak(text, slow, msgId, customRate) {
    // CRITICAL SILENT CLASSROOM GUARD: Never speak out loud while Live Classroom mode is ON!
    if (state.isLiveTranslating) { stopActiveAudio(true); return; }
    if (!("speechSynthesis" in window)) { stopActiveAudio(); return; }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "fi-FI";
      utter.rate = typeof customRate === "number" ? customRate : (slow ? 0.75 : 1.0);
      const bestFi = pickBestFinnishVoice();
      if (bestFi) utter.voice = bestFi;
      utter.onend = () => { if (state.speakingMsgId === msgId) stopActiveAudio(); };
      utter.onerror = () => { if (state.speakingMsgId === msgId) stopActiveAudio(); };
      window.speechSynthesis.speak(utter);
    } catch (_) {
      stopActiveAudio();
    }
  }

  async function playEdgeNeuralClip(cleanText, rateNum, msgId, onDone) {
    if (state.isLiveTranslating) return false;
    const key = `edge|fi|${Number(rateNum).toFixed(2)}|${cleanText}`;
    let audioUrl = _audioMemCache.get(key) || null;
    if (!audioUrl) {
      try {
        const res = await flApi("/api/finnish-lab/edge-tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText, lang: "fi", rate: rateNum }),
        });
        if (res && res.ok && res.audio_url) {
          audioUrl = res.audio_url;
          _audioMemCache.set(key, audioUrl);
        }
      } catch (_) {
        audioUrl = null;
      }
    }
    if (!audioUrl || state.isLiveTranslating) return false;
    if (msgId && state.speakingMsgId !== msgId) return true; // cancelled while fetching
    try {
      const el = new Audio(audioUrl);
      el.setAttribute("playsinline", "");
      el.playsInline = true;
      _activeAudioEl = el;
      el.onended = () => {
        if (!msgId || state.speakingMsgId === msgId) stopActiveAudio();
        if (typeof onDone === "function") onDone();
      };
      el.onerror = () => {
        if (!state.isLiveTranslating) fallbackBrowserSpeak(cleanText, rateNum < 0.9, msgId, rateNum);
      };
      await el.play();
      return true;
    } catch (_) {
      return false;
    }
  }

  window.flSpeakFi = async function (text, rate) {
    // CRITICAL SILENT CLASSROOM GUARD
    if (state.isLiveTranslating) return;
    const clean = cleanTtsText(text);
    if (!clean) return;
    const rateNum = typeof rate === "number" ? rate : 1.0;
    stopActiveAudio(true);
    const tid = "flsp_" + Date.now();
    state.speakingMsgId = tid;
    const ok = await playEdgeNeuralClip(clean, rateNum, tid);
    if (!ok && !state.isLiveTranslating && state.speakingMsgId === tid) {
      fallbackBrowserSpeak(clean, rateNum < 0.9, tid, rateNum);
    }
  };

  const _audioInflight = new Map();

  function cleanTtsText(text) {
    return (text || "")
      .replace(/[*_`#>]/g, "")
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);
  }

  function prewarmFinnishAudio(_text) {}

  async function speakFinnish(text, slow, msgId) {
    // CRITICAL SILENT CLASSROOM GUARD: Never speak out loud when Live mode is active!
    if (state.isLiveTranslating) {
      toast("🔇 Silent Classroom Live mode is ON — audio is muted.", "info");
      return;
    }
    const targetId = msgId || ("tts_" + Date.now());
    if (msgId && state.speakingMsgId === msgId) {
      stopActiveAudio();
      return;
    }
    const clean = cleanTtsText(text);
    if (!clean) return;

    stopActiveAudio(true);
    state.speakingMsgId = targetId;
    renderActiveView();
    renderSidePanel();

    const rateNum = slow ? 0.75 : 1.0;
    const playedNeural = await playEdgeNeuralClip(clean, rateNum, targetId);
    if (playedNeural) return;
    if (state.speakingMsgId !== targetId || state.isLiveTranslating) return;

    // Clean fallback to best available fi-FI browser voice ONLY if server edge-tts is unreachable
    if ("speechSynthesis" in window) {
      fallbackBrowserSpeak(clean, slow, targetId, rateNum);
      return;
    }
    if (state.speakingMsgId === targetId) {
      stopActiveAudio();
    }
  }

  function getAllPodcastEpisodes() {
    return [...(state.customPodcastEpisodes || []), ...PODCAST_EPISODES];
  }

  let _walkAudioEl = null;
  function getWalkAudioEl() {
    if (!_walkAudioEl) {
      _walkAudioEl = new Audio();
      _walkAudioEl.setAttribute("playsinline", "");
      _walkAudioEl.playsInline = true;
      _walkAudioEl.preload = "auto";
    }
    return _walkAudioEl;
  }

  function updateWalkActiveCardHighlight(newIdx) {
    if (state.podcastItemIdx === newIdx) return;
    state.podcastItemIdx = newIdx;
    const ep = getAllPodcastEpisodes().find((x) => x.id === state.podcastEpisodeId) || PODCAST_EPISODES[0];
    const items = getPodcastItems(ep);
    const cur = items[newIdx];
    const nowTitle = document.getElementById("fl-walk-now-fi");
    const nowEn = document.getElementById("fl-walk-now-en");
    const nowCounter = document.getElementById("fl-walk-now-counter");
    const miniFi = document.getElementById("fl-mini-now-fi");
    const miniEn = document.getElementById("fl-mini-now-en");
    if (cur) {
      if (nowTitle) nowTitle.textContent = `🇫🇮 ${cur.fi}`;
      if (nowEn) nowEn.textContent = `🇬🇧 ${cur.en}`;
      if (nowCounter) nowCounter.textContent = `Phrase ${newIdx + 1} of ${items.length}`;
      if (miniFi) miniFi.textContent = cur.fi;
      if (miniEn) miniEn.textContent = cur.en;
    }
    document.querySelectorAll("[data-fl-pod-row]").forEach((row) => {
      const rIdx = Number(row.getAttribute("data-fl-pod-row"));
      row.classList.toggle("is-active-walk", rIdx === newIdx);
    });
  }

  function setupWalkMediaSession(ep, items) {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: ep.title || "Walk & Listen Finnish",
        artist: "ILoveFinland Finnish Lab • Noora Neural (fi-FI)",
        album: "Beginner Walk & Listen Course",
        artwork: [{ src: "/assets/ilf-heart.png", sizes: "512x512", type: "image/png" }],
      });
      const aud = getWalkAudioEl();
      navigator.mediaSession.setActionHandler("play", () => {
        if (state.isLiveTranslating) return;
        aud.play().catch(() => {});
        state.podcastPlaying = true;
        state.podcastPaused = false;
        renderActiveView();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        aud.pause();
        state.podcastPaused = true;
        renderActiveView();
      });
      navigator.mediaSession.setActionHandler("seekbackward", (d) => {
        const step = (d && d.seekOffset) || 10;
        aud.currentTime = Math.max(0, (aud.currentTime || 0) - step);
      });
      navigator.mediaSession.setActionHandler("seekforward", (d) => {
        const step = (d && d.seekOffset) || 10;
        aud.currentTime = Math.min(aud.duration || 9999, (aud.currentTime || 0) + step);
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        const offs = state.podcastItemOffsets || [];
        if (offs.length) {
          const prevIdx = (state.podcastItemIdx - 1 + items.length) % items.length;
          aud.currentTime = offs[prevIdx] || 0;
          updateWalkActiveCardHighlight(prevIdx);
        }
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        const offs = state.podcastItemOffsets || [];
        if (offs.length) {
          const nextIdx = (state.podcastItemIdx + 1) % items.length;
          aud.currentTime = offs[nextIdx] || 0;
          updateWalkActiveCardHighlight(nextIdx);
        }
      });
    } catch (_) {}
  }

  function stopPodcastPlayback(skipRender) {
    state.podcastPlaying = false;
    state.podcastPaused = false;
    state.podcastLoading = false;
    state.podcastPhase = "";
    if (state.podcastTimer) {
      clearTimeout(state.podcastTimer);
      state.podcastTimer = null;
    }
    if (_walkAudioEl) {
      try { _walkAudioEl.pause(); } catch (_) {}
    }
    if ("speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    if (!skipRender) renderActiveView();
  }

  async function createCustomPodcastEpisode(topicStr, attachments) {
    const topic = (topicStr || "").trim();
    const atts = Array.isArray(attachments) ? attachments : [];
    if (!topic && !atts.length) {
      toast("Pick a preset, type a topic, or upload a homework photo!", "warning");
      return;
    }
    stopPodcastPlayback(true);
    state.podcastCreating = true;
    renderActiveView();
    try {
      const res = await flApi("/api/finnish-lab/podcast-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic || "Homework Photo Vocabulary & Grammar",
          level: DB.getSettings().level || "A1",
          count: 24,
          attachments: atts.map((a) => ({ mime_type: a.mime_type, data_base64: a.data_base64 })),
        }),
      });
      const ep = {
        id: "pod_custom_" + Date.now(),
        title: "✨ " + (res.title || topic || "Homework Course"),
        duration: res.duration || "~12–15 min",
        items: res.items || [],
      };
      state.customPodcastEpisodes.unshift(ep);
      state.podcastEpisodeId = ep.id;
      state.podcastItemIdx = 0;
      state.podcastShowScript = true;
      toast(`Created "${ep.title}" (${ep.items.length} items)! Tap Play to walk & listen 🎧`, "success");
    } catch (err) {
      toast(err.message || "Could not create Walk & Listen course.", "error");
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
      toast(`⭐ Saved ${added || cards.length} words to Flashcards & Walk & Listen!`, "success");
      renderActiveView();
    } catch (err) {
      toast(err.message || "Could not extract flashcards.", "error");
    } finally {
      state.extractingCards = false;
    }
  }

  function getPodcastItems(ep) {
    if (!ep) return [];
    if (ep.dynamicToday) {
      const saved = (state.flashcards || []).map((c) => ({ fi: c.fi, en: c.en }));
      const todayPack = (CURR && typeof CURR.getTodayVocabPack === "function")
        ? (CURR.getTodayVocabPack().words || []).map((w) => ({ fi: w.fi, en: w.en }))
        : [];
      const fallbackCore = (PODCAST_EPISODES.find((p) => p.id === "pod_objects")?.items || []);
      const seen = new Set();
      const merged = [];
      for (const it of [...saved, ...todayPack, ...fallbackCore]) {
        const k = String(it.fi || "").trim().toLowerCase();
        if (k && !seen.has(k)) {
          seen.add(k);
          merged.push({ fi: it.fi, en: it.en });
          if (merged.length >= 24) break;
        }
      }
      return merged;
    }
    if (ep.dynamic) {
      return (state.flashcards || []).slice(0, 30).map((c) => ({ fi: c.fi, en: c.en }));
    }
    return ep.items || [];
  }

  function speakUtteranceAsync(text, lang, rate) {
    return new Promise((resolve) => {
      if (!state.podcastPlaying || state.isLiveTranslating || !("speechSynthesis" in window)) {
        resolve(false);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(cleanTtsText(text));
        u.lang = lang;
        u.rate = rate;
        const matched = lang.toLowerCase().startsWith("fi") ? pickBestFinnishVoice() : pickBestEnglishVoice();
        if (matched) u.voice = matched;
        u.onend = () => resolve(true);
        u.onerror = () => resolve(true);
        window.speechSynthesis.speak(u);
      } catch (_) {
        resolve(true);
      }
    });
  }

  function waitPodcastMs(ms) {
    return new Promise((resolve) => {
      if (!state.podcastPlaying) { resolve(false); return; }
      state.podcastTimer = setTimeout(() => {
        state.podcastTimer = null;
        resolve(Boolean(state.podcastPlaying));
      }, ms);
    });
  }

  // Passive Memorization Course ($0 Free Neural edge-tts MP3 + HTML5 <audio playsinline> + MediaSession Lock-Screen Audio)
  // Clean fallback to Smart fi-FI Browser SpeechSynthesis ONLY if server TTS is unreachable!
  async function generateAndPlayPodcast(epId, startIndex) {
    if (state.isLiveTranslating) {
      toast("🔇 Stop Silent Classroom Live mode first before playing audio.", "warning");
      return;
    }
    const ep = getAllPodcastEpisodes().find((x) => x.id === epId) || PODCAST_EPISODES[0];
    const items = getPodcastItems(ep);
    if (!items.length) {
      toast("Save a few flashcards first to play your personal Walk & Listen course!", "warning");
      return;
    }

    const fiSpeed = Number(state.podcastSpeed) || 0.75;
    const targetIdx = typeof startIndex === "number" ? Math.max(0, Math.min(items.length - 1, startIndex)) : (state.podcastItemIdx || 0);

    // If same track + speed is already loaded in HTML5 <audio>, seek & resume instantaneously!
    const trackKey = `${ep.id}|${fiSpeed.toFixed(2)}|${items.length}`;
    if (state.podcastTrackKey === trackKey && state.podcastAudioUrl && _walkAudioEl && _walkAudioEl.src) {
      const aud = getWalkAudioEl();
      const offs = state.podcastItemOffsets || [];
      if (typeof startIndex === "number" && offs[targetIdx] != null) {
        aud.currentTime = offs[targetIdx];
      }
      aud.loop = Boolean(state.podcastLoop);
      state.podcastPlaying = true;
      state.podcastPaused = false;
      state.podcastItemIdx = targetIdx;
      setupWalkMediaSession(ep, items);
      aud.play().catch(() => {});
      renderActiveView();
      return;
    }

    stopActiveAudio(true);
    stopPodcastPlayback(true);
    state.podcastEpisodeId = ep.id;
    state.podcastItemIdx = targetIdx;
    state.podcastLoading = true;
    state.podcastPhase = "🎙️ Preparing Neural Finnish MP3 (NooraNeural)...";
    DB.touchStudyStreak("listening");
    renderActiveView();

    // Priority 1: Seamless server-side edge-tts MP3 track (works on iPhone/iPad Lock Screen!)
    try {
      const res = await flApi("/api/finnish-lab/walk-listen-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: ep.title, items, rate: fiSpeed }),
        timeoutMs: 90000,
      });
      if (res && res.ok && res.audio_url && !state.isLiveTranslating) {
        state.podcastLoading = false;
        state.podcastTrackKey = trackKey;
        state.podcastAudioUrl = res.audio_url;
        state.podcastItemOffsets = res.item_offsets || [];
        state.podcastVoiceLabel = res.voice || "fi-FI-NooraNeural";
        state.podcastPlaying = true;
        state.podcastPaused = false;
        state.podcastPhase = `🎧 Neural Lock-Screen Audio (${fiSpeed.toFixed(2)}×)`;

        const aud = getWalkAudioEl();
        aud.src = res.audio_url;
        aud.loop = Boolean(state.podcastLoop);
        aud.onloadedmetadata = () => {
          const offs = state.podcastItemOffsets || [];
          if (targetIdx > 0 && offs[targetIdx] != null) {
            aud.currentTime = offs[targetIdx];
          }
        };
        aud.ontimeupdate = () => {
          const offs = state.podcastItemOffsets || [];
          if (!offs.length) return;
          const t = aud.currentTime || 0;
          let found = 0;
          for (let i = 0; i < offs.length; i++) {
            if (t + 0.15 >= offs[i]) found = i;
            else break;
          }
          updateWalkActiveCardHighlight(found);
        };
        aud.onended = () => {
          if (!aud.loop) {
            state.podcastPlaying = false;
            state.podcastPaused = false;
            renderActiveView();
            toast("🎉 Completed Walk & Listen session!", "success");
          }
        };
        setupWalkMediaSession(ep, items);
        await aud.play();
        renderActiveView();
        return;
      }
    } catch (_) {
      // Fall back smoothly to smart fi-FI browser speechSynthesis below
    }

    // Priority 2: Fallback Passive Memorization Loop (Smart fi-FI Browser Voice)
    state.podcastLoading = false;
    state.podcastAudioUrl = null;
    state.podcastVoiceLabel = "Browser fi-FI Fallback";
    if (!("speechSynthesis" in window)) {
      toast("Audio playback unavailable on this device.", "error");
      renderActiveView();
      return;
    }

    state.podcastPlaying = true;
    state.podcastPaused = false;
    renderActiveView();
    const runId = Date.now();
    state._podcastRunId = runId;

    while (state.podcastPlaying && state._podcastRunId === runId && !state.isLiveTranslating) {
      const it = items[state.podcastItemIdx];
      if (!it) break;
      const spd = Number(state.podcastSpeed) || 0.75;

      state.podcastPhase = `🇫🇮 Slow Finnish (${spd.toFixed(2)}×)`;
      renderActiveView();
      await speakUtteranceAsync(it.fi, "fi-FI", spd);
      if (!state.podcastPlaying || state._podcastRunId !== runId) break;
      await waitPodcastMs(400);
      if (!state.podcastPlaying || state._podcastRunId !== runId) break;

      state.podcastPhase = "🇬🇧 English meaning";
      renderActiveView();
      await speakUtteranceAsync(`means ${it.en}`, "en-US", 0.95);
      if (!state.podcastPlaying || state._podcastRunId !== runId) break;

      state.podcastPhase = "🧠 Memorize pause...";
      renderActiveView();
      await waitPodcastMs(1250);
      if (!state.podcastPlaying || state._podcastRunId !== runId) break;

      state.podcastPhase = `🔁 Repeat Finnish (${spd.toFixed(2)}×)`;
      renderActiveView();
      await speakUtteranceAsync(it.fi, "fi-FI", spd);
      if (!state.podcastPlaying || state._podcastRunId !== runId) break;

      await waitPodcastMs(850);
      if (!state.podcastPlaying || state._podcastRunId !== runId) break;

      if (state.podcastItemIdx + 1 < items.length) {
        state.podcastItemIdx += 1;
      } else if (state.podcastLoop) {
        state.podcastItemIdx = 0;
      } else {
        stopPodcastPlayback();
        toast("🎉 Completed Walk & Listen session!", "success");
        break;
      }
    }
  }

  function exportWalkAndListenGoodnotes(epId, format) {
    const ep = getAllPodcastEpisodes().find((x) => x.id === epId) || PODCAST_EPISODES[0];
    const items = getPodcastItems(ep);
    if (!items.length) {
      toast("No items in this episode to export yet.", "warning");
      return;
    }
    const today = DB.todayStr();
    if (format === "md") {
      let md = `# 🎧 Walk & Listen Study Sheet — ${ep.title} (${today})\n\n| # | Finnish (Suomi) | English Meaning |\n|---|---|---|\n`;
      items.forEach((it, idx) => {
        md += `| ${idx + 1} | **${it.fi}** | ${it.en} |\n`;
      });
      downloadTextFile(`walk-listen-${ep.id}-${today}.md`, md);
      toast("⬇️ Exported Walk & Listen Markdown sheet for Goodnotes!", "success");
      return;
    }
    const win = window.open("", "_blank", "width=880,height=760");
    if (!win) {
      toast("Pop-up blocked — use Markdown export or allow pop-ups.", "warning");
      return;
    }
    const rows = items
      .map((it, i) => `<tr><td>${i + 1}</td><td><strong>${esc(it.fi)}</strong></td><td>${esc(it.en)}</td></tr>`)
      .join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(ep.title)} — Goodnotes Study Sheet</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif; color: #0A192F; padding: 26px; max-width: 860px; margin: 0 auto; }
        h1 { color: #003580; font-size: 20px; border-bottom: 3px solid #003580; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13.5px; }
        th { background: #0A192F; color: #fff; padding: 9px; text-align: left; }
        td { border: 1px solid #CBD5E1; padding: 8px 10px; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <div class="no-print" style="text-align:right;margin-bottom:12px;">
        <button onclick="window.print()" style="background:#003580;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;">🖨️ Print / Save PDF to Goodnotes</button>
      </div>
      <h1>🎧 ${esc(ep.title)} (${items.length} Items • ${today})</h1>
      <table><thead><tr><th>#</th><th>Finnish (Suomi)</th><th>English Meaning</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
    win.document.close();
  }

  /* ---------- SECURE API CLIENT ---------- */
  async function flApi(path, opts) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutMs = (opts && opts.timeoutMs) ? opts.timeoutMs : 35000;
    const fetchOpts = Object.assign({}, opts || {});
    delete fetchOpts.timeoutMs;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetch(
        path,
        Object.assign({ credentials: "same-origin", signal: controller ? controller.signal : undefined }, fetchOpts)
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
      if (state.userEmail && DB.setActiveUser) {
        DB.setActiveUser(state.userEmail);
      }
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
        if (Array.isArray(r.snapshot.userMemory) && r.snapshot.userMemory.length) {
          const merged = Array.from(new Set([...getUserMemoryList(), ...r.snapshot.userMemory])).slice(0, 15);
          saveUserMemoryList(merged);
        }
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
        snap.userMemory = getUserMemoryList();
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
    await loadAllData();
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

  /* ---------- SMART SCENARIO-AWARE LIVE LISTEN & CONVERSATION SUBTITLES (v73.0) ---------- */
  async function sendLiveAudioChunk(blob, cleanMime) {
    if (!blob || blob.size < 1600) return; // Skip truly empty blobs
    try {
      const b64 = await blobToBase64(blob);
      const conv = await ensureActiveConv("🌐 Live Class Subtitles");
      const settings = DB.getSettings();

      // Build 8-turn scenario memory + auto-link the latest uploaded worksheet photo ([Picture #1]) if present!
      const recentLiveHistory = [];
      let linkedWorksheet = null;
      for (const m of (conv.messages || []).slice(-8)) {
        const histAtts = [];
        if (!linkedWorksheet && (m.attachments || []).length) {
          for (const a of m.attachments) {
            const mt = a.mime_type || "";
            if (mt.startsWith("image/") || mt === "application/pdf") {
              const cached = a.id ? state.sessionMediaMap[a.id] : null;
              if (cached && cached.data_base64) {
                linkedWorksheet = { mime_type: cached.mime_type, data_base64: cached.data_base64, refLabel: cached.refLabel || "Picture #1" };
                histAtts.push({ mime_type: cached.mime_type, data_base64: cached.data_base64 });
                break;
              } else if (mt.startsWith("image/") && a.previewUrl && a.previewUrl.startsWith("data:image/")) {
                const tb64 = a.previewUrl.includes(",") ? a.previewUrl.split(",")[1] : "";
                if (tb64) {
                  linkedWorksheet = { mime_type: "image/jpeg", data_base64: tb64, refLabel: a.refLabel || "Picture #1" };
                  histAtts.push({ mime_type: "image/jpeg", data_base64: tb64 });
                  break;
                }
              }
            }
          }
        }
        recentLiveHistory.push({
          role: m.role,
          text: (m.text || "").slice(0, 320),
          attachments: histAtts,
        });
      }

      state.liveInterimText = linkedWorksheet ? "⚡ Translating live (with worksheet)..." : "⚡ Translating live...";
      renderLiveBannerOnly();
      const resp = await flApi("/api/finnish-lab/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Listen to this live classroom audio chunk using the ongoing scenario & any worksheet photo in history. " +
            "Transcribe into fast Finnish + English subtitles (or Speaker 1 / Speaker 2 dialogue). " +
            "If a question or exercise is asked, give the short A1 Finnish Answer. If only silence/noise, reply ONLY [SILENCE].",
          mode: "live_translate",
          level: settings.level || "A1",
          roast_mode: false,
          history: recentLiveHistory,
          attachments: [{ mime_type: cleanMime, data_base64: b64 }],
        }),
      });
      const reply = (resp && resp.reply ? resp.reply : "").trim();
      if (!reply || reply.toUpperCase().includes("[SILENCE]")) {
        if (state.isLiveTranslating) {
          state.liveInterimText = "🎙️ Listening live...";
          renderLiveBannerOnly();
        }
        return;
      }
      conv.messages.push({
        id: DB.uid("msg"),
        role: "assistant",
        text: reply,
        isLiveSubtitle: true,
        finnishTts: resp.finnish_tts || "",
        at: new Date().toISOString(),
      });
      await DB.saveConversation(conv);
      scheduleAutoSync();
      if (state.isLiveTranslating) state.liveInterimText = "🎙️ Listening live...";
      renderActiveView();
      renderSidePanel();
      scrollChatsToBottom(false);
    } catch (err) {
      if (state.isLiveTranslating) {
        state.liveInterimText = `⚠️ ${(err && err.message ? err.message : "Retrying...").slice(0, 60)}`;
        renderLiveBannerOnly();
      }
    }
  }

  async function startRollingLiveListen() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Microphone not supported in this browser.", "error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.liveStream = stream;
      state.isLiveTranslating = true;
      state.liveInterimText = "🎙️ Listening live...";
      renderActiveView();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";
      const cleanMime = mimeType.split(";")[0];

      // Smart VAD with iOS Safari AudioContext.resume() fix + 5s safety fallback
      let analyser = null;
      let freqBuf = null;
      let vadReady = false;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          if (ctx.state === "suspended") {
            await ctx.resume().catch(() => {});
          }
          if (ctx.state === "running") {
            const src = ctx.createMediaStreamSource(stream);
            analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            src.connect(analyser);
            freqBuf = new Uint8Array(analyser.frequencyBinCount);
            state.liveAudioCtx = ctx;
            vadReady = true;
          }
        }
      } catch (_) {}

      const getVolume = () => {
        if (!vadReady || !analyser || !freqBuf) return 15; // Fallback: always send chunk
        analyser.getByteTimeDomainData(freqBuf);
        let sum = 0;
        for (let i = 0; i < freqBuf.length; i++) {
          const d = freqBuf[i] - 128;
          sum += d * d;
        }
        return Math.sqrt(sum / freqBuf.length);
      };

      const recordOneUtterance = () => {
        if (!state.isLiveTranslating || !state.liveStream) return;
        const chunks = [];
        let rec;
        try {
          rec = new MediaRecorder(state.liveStream, { mimeType });
        } catch (_) {
          rec = new MediaRecorder(state.liveStream);
        }
        state.liveChunkRecorder = rec;
        let heardSpeech = !vadReady;
        let speechStartMs = heardSpeech ? Date.now() : 0;
        let lastLoudMs = Date.now();
        const chunkStartMs = Date.now();
        let peakVol = 0;

        rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
        rec.onstop = () => {
          if (heardSpeech || peakVol > 1.8 || !vadReady) {
            const blob = new Blob(chunks, { type: cleanMime });
            sendLiveAudioChunk(blob, cleanMime);
          }
        };
        rec.start();

        const cutAndRestart = (forceSend) => {
          if (state.liveVadInterval) {
            clearInterval(state.liveVadInterval);
            state.liveVadInterval = null;
          }
          if (forceSend) heardSpeech = true;
          if (rec.state === "recording") {
            try { rec.stop(); } catch (_) {}
          }
          if (state.isLiveTranslating) recordOneUtterance();
        };
        state.liveForceCutFn = () => cutAndRestart(true);

        if (state.liveVadInterval) clearInterval(state.liveVadInterval);
        state.liveVadInterval = setInterval(() => {
          if (!state.isLiveTranslating || rec.state !== "recording") {
            clearInterval(state.liveVadInterval);
            state.liveVadInterval = null;
            return;
          }
          const now = Date.now();
          const vol = getVolume();
          if (vol > peakVol) peakVol = vol;
          if (vol > 2.2) {
            if (!heardSpeech) {
              heardSpeech = true;
              speechStartMs = now;
              state.liveInterimText = "🗣️ Hearing Finnish...";
              renderLiveBannerOnly();
            }
            lastLoudMs = now;
          }
          const elapsed = now - chunkStartMs;
          const silenceAfterSpeech = heardSpeech ? now - lastLoudMs : 0;
          const speechDur = heardSpeech ? now - speechStartMs : 0;

          // Cut cleanly on 1.0s natural pause after speech, OR max 5.5s continuous speech, OR 5s fallback if AudioContext wasn't running
          const shouldCutForPause = vadReady && heardSpeech && speechDur >= 800 && silenceAfterSpeech >= 1000;
          const shouldCutMaxSpeech = heardSpeech && speechDur >= 5500;
          const shouldFallbackCut = !vadReady && elapsed >= 5000;
          const shouldResetSilent = vadReady && !heardSpeech && elapsed >= 7000;

          if (shouldCutForPause || shouldCutMaxSpeech || shouldFallbackCut || shouldResetSilent) {
            cutAndRestart(false);
          }
        }, 160);
      };

      recordOneUtterance();
    } catch (_) {
      toast("Microphone permission denied.", "error");
      stopLiveTranslation();
    }
  }

  function toggleLiveTranslation() {
    if (state.isLiveTranslating) {
      stopLiveTranslation();
      return;
    }
    if (state.isRecording) stopRecording();
    // CRITICAL: Mute & cancel all audio before entering Silent Classroom Live mode!
    stopActiveAudio(true);
    stopPodcastPlayback(true);

    // Prefer native browser SpeechRecognition / webkitSpeechRecognition (fi-FI, $0 cost, 100% silent)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      startRollingLiveListen();
      return;
    }

    try {
      const rec = new SR();
      rec.lang = "fi-FI";
      rec.continuous = true;
      rec.interimResults = true;
      state.liveRecognition = rec;
      state.isLiveTranslating = true;
      state.liveInterimText = "🔇 Silent Classroom Mode ON — Listening for teacher's Finnish (Speaker 100% Muted)...";

      rec.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const transcript = (ev.results[i][0].transcript || "").trim();
          if (ev.results[i].isFinal && transcript.length > 1) {
            state.liveInterimText = "🔇 Translating teacher silently...";
            renderLiveBannerOnly();
            sendMessage(transcript, { mode: "live_translate", silentLive: true });
          } else {
            interim += transcript + " ";
          }
        }
        if (interim.trim()) {
          state.liveInterimText = "🔇 Hearing: " + interim.trim();
          renderLiveBannerOnly();
        }
      };

      rec.onerror = (ev) => {
        if (ev.error === "not-allowed") {
          toast("Microphone permission denied.", "error");
          stopLiveTranslation();
        } else if (ev.error === "service-not-allowed" || ev.error === "network") {
          stopLiveTranslation();
          startRollingLiveListen();
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
      startRollingLiveListen();
    }
  }

  function stopLiveTranslation() {
    state.isLiveTranslating = false;
    state.liveInterimText = "";
    if (state.liveVadInterval) {
      clearInterval(state.liveVadInterval);
      state.liveVadInterval = null;
    }
    if (state.liveChunkTimer) {
      clearTimeout(state.liveChunkTimer);
      state.liveChunkTimer = null;
    }
    if (state.liveChunkRecorder) {
      try {
        if (state.liveChunkRecorder.state === "recording") state.liveChunkRecorder.stop();
      } catch (_) {}
      state.liveChunkRecorder = null;
    }
    if (state.liveAudioCtx) {
      try { state.liveAudioCtx.close(); } catch (_) {}
      state.liveAudioCtx = null;
    }
    if (state.liveStream) {
      try { state.liveStream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      state.liveStream = null;
    }
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
      const userMemory = getUserMemoryList();
      const resp = await flApi("/api/finnish-lab/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: aiPromptWithRefs,
          mode,
          level: settings.level || "A1",
          roast_mode: isRoastEnabled(),
          user_name: (state.userName || "").replace(/\s*\(Admin\)/i, "").trim(),
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
      // Silently pre-warm Finnish human voice in background so tapping Sound plays in 0ms!
      prewarmFinnishAudio(resp.finnish_tts || resp.reply);
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

  function scrollChatsToBottom(instant) {
    setTimeout(() => {
      const stage = document.getElementById("fl-chat-stage");
      if (stage) {
        stage.scrollTo({ top: stage.scrollHeight, behavior: instant ? "auto" : "smooth" });
      }
      document.querySelectorAll(".fl-side-messages").forEach((el) => { el.scrollTop = el.scrollHeight; });
      updateScrollDownButton();
    }, 45);
  }

  function updateScrollDownButton() {
    const btn = document.getElementById("fl-scroll-down-btn");
    const stage = document.getElementById("fl-chat-stage");
    if (!btn || !stage || state.mode !== "chat") {
      if (btn) btn.classList.add("hidden");
      return;
    }
    const distFromBottom = stage.scrollHeight - (stage.scrollTop + stage.clientHeight);
    btn.classList.toggle("hidden", distFromBottom < 120);
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
    const activeTab = state.activeTab || "chat";
    const showMiniPlayer = activeTab === "walk" || state.podcastPlaying || state.podcastPaused;

    const allEps = getAllPodcastEpisodes();
    const curEp = allEps.find((x) => x.id === state.podcastEpisodeId) || allEps[0];
    const curItems = getPodcastItems(curEp);
    const activeIdx = Math.min(Math.max(0, state.podcastItemIdx || 0), Math.max(0, curItems.length - 1));
    const curWalkItem = curItems[activeIdx] || { fi: "Hyvää huomenta", en: "Good morning" };

    root.innerHTML = `
      <div class="fl3-shell ${showMiniPlayer ? "has-mini-player" : ""}">
        <!-- Official Brand Top Bar + 3 Clean Pill Tabs Only -->
        <header class="fl3-topbar">
          <div class="fl3-brand-group">
            <button type="button" class="fl3-menu-btn" id="fl-open-drawer" title="Saved Chats, Flashcards, Notes &amp; Settings" aria-label="Open Finnish Lab menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div class="fl3-title-wrap">
              <div class="fl3-title">
                <span>🇫🇮</span>
                <span>Finnish Study Lab</span>
              </div>
              <div class="fl3-subtitle">CEFR ${esc(settings.level || "A1")} • Neural Voice (Noora) • $0 Free Tier</div>
            </div>
          </div>

          <nav class="fl3-tabs-nav" role="tablist" aria-label="Finnish Study Lab Tabs">
            <button type="button" role="tab" aria-selected="${activeTab === "chat"}" class="fl3-tab-pill ${activeTab === "chat" ? "active" : ""}" data-fl-tab="chat">
              <span>💬</span><span>Chat &amp; Class</span>
            </button>
            <button type="button" role="tab" aria-selected="${activeTab === "walk"}" class="fl3-tab-pill ${activeTab === "walk" ? "active" : ""}" data-fl-tab="walk">
              <span>🎧</span><span>Walk &amp; Listen</span>
            </button>
            <button type="button" role="tab" aria-selected="${activeTab === "notebook"}" class="fl3-tab-pill ${activeTab === "notebook" ? "active" : ""}" data-fl-tab="notebook">
              <span>📓</span><span>Notebook &amp; Drills</span>
            </button>
          </nav>

          <div class="fl3-actions-group">
            <button type="button" class="fl3-btn" id="fl-new-chat-top" title="Start a fresh tutor chat">+ New Chat</button>
          </div>
        </header>

        ${
          activeTab === "chat"
            ? renderTabChatAndClass()
            : activeTab === "walk"
            ? renderTabWalkAndListen()
            : renderTabNotebookAndDrills()
        }
      </div>

      ${
        showMiniPlayer
          ? `<div class="fl3-mobile-mini-player" role="region" aria-label="Walk &amp; Listen Mini Player">
              <div style="min-width:0;flex:1;">
                <div id="fl-mini-now-fi" style="font-size:0.88rem;font-weight:800;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(curWalkItem.fi)}</div>
                <div id="fl-mini-now-en" style="font-size:0.75rem;color:#38BDF8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(curWalkItem.en)}</div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                ${
                  state.podcastPlaying && !state.podcastPaused
                    ? `<button type="button" class="fl3-btn primary" id="fl-mini-pause-btn" style="padding:8px 12px;" aria-label="Pause Walk &amp; Listen">⏸</button>`
                    : `<button type="button" class="fl3-btn primary" id="fl-mini-play-btn" style="padding:8px 12px;" aria-label="Play Walk &amp; Listen">▶</button>`
                }
                <button type="button" class="fl3-btn" id="fl-mini-next-btn" style="padding:8px 11px;" aria-label="Next phrase">⏭</button>
              </div>
            </div>`
          : ""
      }

      ${state.drawerOpen ? renderSlideDrawer(settings, prog, dueCount) : ""}
    `;

    bindMainEvents();
  }

  /* ---------- PARSE SILENT CLASSROOM LIVE HELPER CARD ---------- */
  function parseLatestLiveCard(msgs) {
    const liveMsgs = (msgs || []).filter((m) => m.role === "assistant" && m.isLiveSubtitle && !m.isError);
    const latest = liveMsgs.length ? liveMsgs[liveMsgs.length - 1] : null;
    const defaultReplies = [
      { fi: "Anteeksi, voitko toistaa hitaasti?", en: "Excuse me, can you repeat slowly?" },
      { fi: "Kyllä, minä ymmärrän.", en: "Yes, I understand." },
      { fi: "Mikä sivu kirjassa on?", en: "What page in the book is it?" },
    ];
    if (!latest || !latest.text) {
      return {
        hasCapture: false,
        fiHeard: "",
        enMeaning: "",
        replies: defaultReplies,
      };
    }
    const raw = String(latest.text || "");
    let fiHeard = "";
    let enMeaning = "";
    const mFi = raw.match(/(?:What was said\s*\(Finnish\)|Finnish)[:*]*\s*([^\n]+)/i);
    const mEn = raw.match(/(?:What it means\s*\(English\)|English)[:*]*\s*([^\n]+)/i);
    if (mFi) fiHeard = mFi[1].replace(/\*+/g, "").trim();
    if (mEn) enMeaning = mEn[1].replace(/\*+/g, "").trim();

    const replies = [];
    const bulletRe = /^[*-]\s*\*\*([^*]+)\*\*\s*(?:—|-|–|:)\s*\*?([^*\n]+)\*?/gm;
    let bm;
    while ((bm = bulletRe.exec(raw)) !== null) {
      replies.push({ fi: bm[1].trim(), en: bm[2].trim() });
    }
    if (!fiHeard) {
      const firstLines = raw.split("\n").map((l) => l.replace(/[*#>]/g, "").trim()).filter(Boolean);
      fiHeard = firstLines[0] || raw.slice(0, 140);
      enMeaning = firstLines[1] || "";
    }
    return {
      hasCapture: true,
      fiHeard,
      enMeaning,
      replies: replies.length ? replies.slice(0, 3) : defaultReplies,
    };
  }

  /* ---------- MESSAGE BUBBLE RENDERER (SHARED BY TUTOR CARD & SIDE PANEL) ---------- */
  function renderMessageBubble(m, idx) {
    const hasImgAtt = (m.attachments || []).some((a) => (a.mime_type || "").startsWith("image/"));
    const attHtml = (m.attachments || []).length
      ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center;">
          ${m.attachments
            .map((a) =>
              a.previewUrl && (a.mime_type || "").startsWith("image/")
                ? `<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
                    <img src="${a.previewUrl}" style="max-width:160px;max-height:115px;border-radius:8px;border:1px solid #1E3A5F;" alt="" />
                    ${a.refLabel ? `<span style="font-size:0.68rem;color:#94A3B8;font-weight:700;">📷 ${esc(a.refLabel)}</span>` : ""}
                  </div>`
                : `<span class="fl-att-chip">${(a.mime_type || "").startsWith("audio/") ? "🎙️" : "📄"} ${esc(a.refLabel || a.name || "File")}</span>`
            )
            .join("")}
          ${
            m.role === "user" && hasImgAtt
              ? `<button type="button" class="fl3-btn" style="padding:6px 10px;font-size:0.75rem;min-height:34px;" data-fl-msg-to-walk="${idx}" title="Build a Walk &amp; Listen audio episode from this photo">🎧 Send to Walk &amp; Listen</button>`
              : ""
          }
        </div>`
      : "";
    const isSpeakingThis = Boolean(m.id && state.speakingMsgId === m.id);
    const fullSpeakText = (m.finnishTts || m.text || "").slice(0, 900);
    const actionsHtml =
      m.role === "assistant" && !m.isError
        ? `<div class="fl-msg-actions" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
            ${
              state.isLiveTranslating
                ? `<span class="fl3-badge silent">🔇 Muted (Silent Live ON)</span>`
                : isSpeakingThis
                ? `<button type="button" class="fl3-speaker-btn" data-fl-stop-speak="1" style="color:#FCA5A5;border-color:rgba(248,113,113,0.5);">⏹ Stop</button>`
                : `<button type="button" class="fl3-speaker-btn" data-fl-speak-slow="${esc(fullSpeakText)}" data-fl-speak-id="${esc(m.id || ("m" + idx))}" title="Listen slowly (0.75× Neural Finnish)">🔊 0.75×</button>
                   <button type="button" class="fl3-speaker-btn" data-fl-speak="${esc(fullSpeakText)}" data-fl-speak-id="${esc(m.id || ("m" + idx))}" title="Listen normal speed (1.0× Neural Finnish)">🔊 1.0×</button>`
            }
            <button type="button" class="fl3-speaker-btn" data-fl-extract-cards="${idx}" title="Save words to Vocabulary &amp; Drills">⭐ Save Words</button>
            <button type="button" class="fl3-speaker-btn" data-fl-save-note="${idx}" title="Save to Notes">💾 Note</button>
          </div>`
        : "";
    return `
      <div class="fl3-bubble ${m.role === "user" ? "user" : "assistant"}">
        ${attHtml}
        <div>${renderMarkdownLite(m.text)}</div>
        ${actionsHtml}
      </div>
    `;
  }

  /* ---------- TAB 1: CHAT & CLASS (BILINGUAL TUTOR + SILENT CLASSROOM LIVE) ---------- */
  function renderTabChatAndClass() {
    const conv = getActiveConv();
    const allMsgs = conv ? conv.messages || [] : [];
    const tutorMsgs = allMsgs
      .map((m, idx) => ({ m, idx }))
      .filter(({ m }) => !m.isLiveSubtitle && !(m.role === "user" && String(m.text || "").startsWith("🌐 ")));
    const liveData = parseLatestLiveCard(allMsgs);
    const hasPendingPhoto = state.pendingAttachments.some((a) => (a.mime_type || "").startsWith("image/"));

    return `
      <div class="fl3-grid-chat">
        <!-- LEFT PANEL: AI FINNISH TUTOR CARD -->
        <section class="fl3-card fl3-tutor-card" aria-label="AI Finnish Tutor">
          <div class="fl3-card-head">
            <h2 class="fl3-card-title">
              <span>💬</span><span>AI Finnish Tutor</span>
            </h2>
            <span class="fl3-badge">Bilingual A1–A2 • Concise</span>
          </div>

          <div class="fl3-chat-feed" id="fl-chat-stage">
            ${
              tutorMsgs.length
                ? tutorMsgs.map(({ m, idx }) => renderMessageBubble(m, idx)).join("")
                : `<div style="margin:auto 0;padding:24px 12px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;">
                    <div style="width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#003580,#0052B4);border:1px solid #38BDF8;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">🇫🇮</div>
                    <strong style="font-size:1.05rem;color:#FFFFFF;">Hei! Ready to practice school Finnish?</strong>
                    <p style="margin:0;font-size:0.85rem;color:#94A3B8;max-width:440px;line-height:1.5;">
                      Ask any question in English or Finnish, or tap <strong>+ Photo</strong> to snap your homework sheet for a concise bilingual breakdown or send it straight to <strong>Walk &amp; Listen</strong>.
                    </p>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px;">
                      <button type="button" class="fl3-btn" data-fl-starter="Mitä kuuluu? How do I reply politely in class?">Mitä kuuluu?</button>
                      <button type="button" class="fl3-btn" data-fl-starter="Teach me 5 polite phrases to say to my Finnish teacher.">5 class phrases</button>
                      <button type="button" class="fl3-btn" data-fl-starter="Show how verb olla works in A1 sentences.">Verb olla</button>
                    </div>
                  </div>`
            }
            ${state.isSending ? `<div class="fl3-bubble assistant">⏳ Thinking...</div>` : ""}
          </div>

          <div class="fl3-composer">
            ${
              state.pendingAttachments.length
                ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    ${state.pendingAttachments
                      .map(
                        (a, i) => `
                      <div class="fl-att-chip" style="background:#112240;border:1px solid #1E3A5F;border-radius:8px;padding:4px 8px;display:inline-flex;align-items:center;gap:6px;">
                        ${a.previewUrl && a.mime_type.startsWith("image/") ? `<img src="${a.previewUrl}" style="width:28px;height:28px;object-fit:cover;border-radius:6px;" alt="" />` : a.mime_type.startsWith("audio/") ? "🎙️" : "📄"}
                        <span style="font-size:0.76rem;color:#E2E8F0;">${esc(a.name.slice(0, 18))}</span>
                        <button type="button" class="fl-mini-btn" style="padding:2px 5px;" data-fl-rm-pending="${i}" aria-label="Remove attachment">✕</button>
                      </div>
                    `
                      )
                      .join("")}
                    ${
                      hasPendingPhoto
                        ? `<button type="button" class="fl3-btn primary" id="fl-pending-to-walk" style="padding:6px 12px;font-size:0.78rem;">🎧 Send Photo to Walk &amp; Listen</button>`
                        : ""
                    }
                  </div>`
                : ""
            }

            <textarea id="fl-chat-input" class="fl3-composer-input" rows="2" placeholder="Ask in Finnish or English, or attach a homework photo..."></textarea>

            <div class="fl3-composer-bar">
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <label class="fl3-btn" style="cursor:pointer;padding:8px 12px;" title="Upload homework, textbook photo, or PDF">
                  <span>+ Photo / Homework</span>
                  <input type="file" id="fl-input-files" accept="image/*,application/pdf,audio/*" multiple style="display:none;" />
                </label>
                <label class="fl3-btn" style="cursor:pointer;padding:8px 11px;" title="Take camera photo">
                  <span>📷</span>
                  <input type="file" id="fl-input-camera" accept="image/*" capture="environment" style="display:none;" />
                </label>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                ${
                  state.isRecording
                    ? `<button type="button" class="fl3-btn danger" id="fl-stop-rec" title="Stop Recording">⏹ <span class="fl-rec-timer">00:00</span></button>`
                    : `<button type="button" class="fl3-btn" id="fl-start-rec" title="Record voice question" aria-label="Record Audio">🎙️</button>`
                }
                <button type="button" class="fl3-btn primary" id="fl-chat-send" ${state.isSending ? "disabled" : ""}>Send ↑</button>
              </div>
            </div>
          </div>
        </section>

        <!-- RIGHT PANEL: STRICTLY SILENT CLASSROOM LIVE CARD -->
        <section class="fl3-card accent fl3-live-card" aria-label="Silent Classroom Live Helper">
          <div class="fl3-card-head">
            <h2 class="fl3-card-title">
              <span>🔇</span><span>Silent Classroom Live</span>
            </h2>
            <span class="fl3-badge silent">Never Speaks Out Loud</span>
          </div>

          <div class="fl3-waveform-box ${state.isLiveTranslating ? "active" : ""}">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
              <div class="fl3-wave-bars" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
              <div style="min-width:0;">
                <div id="fl-live-interim" style="font-size:0.82rem;font-weight:700;color:${state.isLiveTranslating ? "#6EE7B7" : "#CBD5E1"};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  ${esc(state.isLiveTranslating ? (state.liveInterimText || "Listening silently for Finnish...") : "Ready for silent classroom listening")}
                </div>
                <div style="font-size:0.71rem;color:#94A3B8;">Speaker output is 100% hard-muted while active</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              ${state.isLiveTranslating && state.liveForceCutFn ? `<button type="button" class="fl3-btn" id="fl-live-now" style="padding:7px 10px;" title="Translate captured audio right now">⚡</button>` : ""}
              <button type="button" class="fl3-btn ${state.isLiveTranslating ? "danger" : "primary"}" id="fl-live-btn">
                ${state.isLiveTranslating ? "⏹ Stop Live" : "🎙️ Start Live"}
              </button>
            </div>
          </div>

          <div class="fl3-live-field">
            <div class="fl3-live-label">🇫🇮 Finnish Heard</div>
            <div style="font-size:0.95rem;font-weight:700;color:#FFFFFF;line-height:1.45;">
              ${liveData.hasCapture ? esc(liveData.fiHeard) : `<span style="color:#64748B;font-weight:500;">Tap "Start Live" when your teacher speaks Finnish...</span>`}
            </div>
          </div>

          <div class="fl3-live-field">
            <div class="fl3-live-label">🇬🇧 English Meaning</div>
            <div style="font-size:0.92rem;color:#38BDF8;font-weight:600;line-height:1.45;">
              ${liveData.hasCapture ? esc(liveData.enMeaning || "See translation above") : `<span style="color:#64748B;font-weight:500;">Instant English translation appears silently here.</span>`}
            </div>
          </div>

          <div>
            <div class="fl3-live-label" style="margin-bottom:8px;">💬 Tap-to-Use School Finnish Replies</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${liveData.replies
                .map(
                  (r) => `
                <button type="button" class="fl3-reply-chip" data-fl-use-reply="${esc(r.fi)}" title="Tap to copy &amp; place in chat input (silent)">
                  <strong style="font-size:0.88rem;color:#FFFFFF;">🇫🇮 ${esc(r.fi)}</strong>
                  <span style="font-size:0.77rem;color:#94A3B8;">🇬🇧 ${esc(r.en)}</span>
                </button>
              `
                )
                .join("")}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  /* ---------- TAB 2: WALK & LISTEN (POCKET AUDIO COURSE + LOCK-SCREEN PLAYBACK) ---------- */
  function renderTabWalkAndListen() {
    const allEps = getAllPodcastEpisodes();
    const customHwEp = (state.customPodcastEpisodes || [])[0] || null;
    const ep = allEps.find((x) => x.id === state.podcastEpisodeId) || allEps[0];
    const items = getPodcastItems(ep);
    const activeIdx = Math.min(Math.max(0, state.podcastItemIdx || 0), Math.max(0, items.length - 1));
    const currentItem = items[activeIdx] || { fi: "kevät", en: "spring" };
    const isCustomActive = Boolean(customHwEp && ep.id === customHwEp.id);

    return `
      <div class="fl3-grid-walk">
        <!-- LEFT PANEL: POCKET PLAYER CARD -->
        <section class="fl3-card" aria-label="Walk and Listen Pocket Player">
          <div class="fl3-card-head">
            <h2 class="fl3-card-title">
              <span>🎧</span><span>Pocket Audio Player</span>
            </h2>
            <span class="fl3-badge">Noora Neural • Lock-Screen</span>
          </div>

          <div style="font-size:0.74rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#94A3B8;margin-bottom:8px;">Choose Episode Topic</div>
          <div class="fl3-topic-grid" style="margin-bottom:16px;">
            <button type="button" class="fl3-topic-pill ${isCustomActive ? "active" : ""}" id="fl-walk-topic-photo">
              <span>📷</span><span>${state.podcastCreating ? "Building Course..." : "From Homework Photo"}</span>
            </button>
            <button type="button" class="fl3-topic-pill ${ep.id === "pod_today_a1" ? "active" : ""}" data-fl-pod-ep="pod_today_a1">
              <span>🌅</span><span>Today's A1 Words</span>
            </button>
            <button type="button" class="fl3-topic-pill ${ep.id === "pod_olla_q" ? "active" : ""}" data-fl-pod-ep="pod_olla_q">
              <span>🧩</span><span>Olla &amp; Questions</span>
            </button>
            <button type="button" class="fl3-topic-pill ${ep.id === "pod_seasons" ? "active" : ""}" data-fl-pod-ep="pod_seasons">
              <span>🍂</span><span>Seasons &amp; Everyday</span>
            </button>
          </div>
          <input type="file" id="fl-pod-hw-photo" accept="image/*" style="display:none;" />

          ${
            customHwEp
              ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px;padding:8px 11px;background:#0A192F;border:1px solid #1E3A5F;border-radius:8px;font-size:0.78rem;">
                  <span style="color:#CBD5E1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(customHwEp.title)} (${(customHwEp.items || []).length} items)</span>
                  <button type="button" class="fl3-speaker-btn" id="fl-walk-upload-new-photo">📷 New Photo</button>
                </div>`
              : ""
          }

          <!-- Center Transport: Prev | Large Play/Pause Circle | Next -->
          <div style="display:flex;align-items:center;justify-content:center;gap:18px;padding:12px 0 16px;">
            <button type="button" class="fl3-btn" id="fl-pod-prev" style="width:46px;height:46px;border-radius:50%;padding:0;" title="Previous phrase" aria-label="Previous phrase">⏮</button>
            ${
              state.podcastLoading
                ? `<button type="button" class="fl3-play-circle" disabled title="Preparing Neural MP3">⏳</button>`
                : state.podcastPlaying && !state.podcastPaused
                ? `<button type="button" class="fl3-play-circle" id="fl-pod-pause-btn" title="Pause Walk &amp; Listen" aria-label="Pause">⏸</button>`
                : `<button type="button" class="fl3-play-circle" id="fl-pod-play-btn" title="Play Walk &amp; Listen" aria-label="Play">▶</button>`
            }
            <button type="button" class="fl3-btn" id="fl-pod-next" style="width:46px;height:46px;border-radius:50%;padding:0;" title="Next phrase" aria-label="Next phrase">⏭</button>
          </div>

          <div style="text-align:center;font-size:0.76rem;color:#94A3B8;margin-bottom:14px;">
            ${state.podcastLoading ? esc(state.podcastPhase || "Preparing neural audio...") : state.podcastPlaying ? `Playing • ${esc(state.podcastVoiceLabel || "fi-FI-NooraNeural")}` : `${items.length} phrases • Continues playing when iPhone screen locks`}
          </div>

          <!-- Loop Episode + Speed Selector (0.75x / 0.90x / 1.0x) -->
          <div style="display:flex;flex-direction:column;gap:10px;padding-top:12px;border-top:1px solid #1E3A5F;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
              <span style="font-size:0.8rem;color:#CBD5E1;font-weight:700;">Repeat &amp; Loop</span>
              <button type="button" class="fl3-btn ${state.podcastLoop ? "active" : ""}" id="fl-pod-loop" style="padding:7px 14px;">
                🔁 Loop Episode: ${state.podcastLoop ? "ON" : "OFF"}
              </button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
              <span style="font-size:0.8rem;color:#CBD5E1;font-weight:700;">Finnish Speed</span>
              <div style="display:flex;gap:6px;">
                ${[0.75, 0.90, 1.0].map((spd) => {
                  const isAct = Math.abs((Number(state.podcastSpeed) || 0.75) - spd) < 0.05;
                  const lbl = spd === 1.0 ? "1.0×" : `${spd.toFixed(2)}×`;
                  return `<button type="button" class="fl3-btn ${isAct ? "active" : ""}" data-fl-pod-speed="${spd}" style="padding:7px 12px;">${lbl}</button>`;
                }).join("")}
              </div>
            </div>
          </div>
        </section>

        <!-- RIGHT PANEL: LARGE HIGH-CONTRAST PLAYING NOW CARD -->
        <section class="fl3-card accent" aria-label="Playing Now">
          <div class="fl3-card-head">
            <h2 class="fl3-card-title">
              <span>🔊</span><span>Playing Now — ${esc(ep.title)}</span>
            </h2>
            <span id="fl-walk-now-counter" class="fl3-badge">Phrase ${activeIdx + 1} of ${items.length}</span>
          </div>

          <div class="fl3-playing-hero">
            <div style="font-size:0.72rem;font-weight:700;color:#94A3B8;background:rgba(17,34,64,0.85);border:1px solid #1E3A5F;padding:4px 10px;border-radius:999px;">
              Slow Finnish (${(Number(state.podcastSpeed) || 0.75).toFixed(2)}×) → English meaning → Pause → Repeat Finnish
            </div>
            <div id="fl-walk-now-fi" class="fl3-now-fi" style="margin-top:6px;">🇫🇮 ${esc(currentItem.fi)}</div>
            <div id="fl-walk-now-en" class="fl3-now-en">🇬🇧 ${esc(currentItem.en)}</div>
            <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
              <button type="button" class="fl3-speaker-btn" data-fl-speak-slow="${esc(currentItem.fi)}">🔊 Hear Phrase (0.75×)</button>
              <button type="button" class="fl3-speaker-btn" id="fl-pod-export-md">📄 Export List (.md)</button>
            </div>
          </div>

          <div class="fl3-tracklist" aria-label="Episode Phrases">
            ${items
              .map(
                (it, idx) => `
              <div class="fl3-track-row ${idx === activeIdx ? "is-active-walk" : ""}" data-fl-pod-row="${idx}" data-fl-pod-jump="${idx}">
                <div style="min-width:0;flex:1;">
                  <strong style="color:#FFFFFF;font-size:0.88rem;">${idx + 1}. ${esc(it.fi)}</strong>
                  <span style="color:#94A3B8;font-size:0.82rem;"> — ${esc(it.en)}</span>
                </div>
                <span style="color:#38BDF8;font-size:0.78rem;font-weight:700;flex-shrink:0;">▶</span>
              </div>
            `
              )
              .join("")}
          </div>
        </section>
      </div>
    `;
  }

  /* ---------- TAB 3: NOTEBOOK & DRILLS (GOODNOTES MASTER TABLES + QUICK A1 QUIZ) ---------- */
  const NOTEBOOK_MASTER_TABLES = {
    olla: {
      title: "Olla-verb & Pronouns",
      rows: [
        { fi: "Minä olen", note: "spoken: mä oon", en: "I am" },
        { fi: "Sinä olet", note: "spoken: sä oot", en: "You are" },
        { fi: "Hän on", note: "spoken: se on", en: "He / She is" },
        { fi: "Me olemme", note: "spoken: me ollaan", en: "We are" },
        { fi: "Te olette", note: "spoken: te ootte", en: "You (plural) are" },
        { fi: "He ovat", note: "spoken: ne on", en: "They are" },
        { fi: "Minä en ole", note: "negative stem: ole", en: "I am not" },
        { fi: "Minä olen opiskelija.", note: "school A1", en: "I am a student." },
      ],
    },
    onko: {
      title: "Onko & -ko/-kö Questions",
      rows: [
        { fi: "Onko sinulla kysymys?", note: "Minulla / sinulla on", en: "Do you have a question?" },
        { fi: "Oletko sinä valmis?", note: "olet + -ko", en: "Are you ready?" },
        { fi: "Puhutko sinä suomea?", note: "back vowel u → -ko", en: "Do you speak Finnish?" },
        { fi: "Asutko sinä Porissa?", note: "-ssa = in", en: "Do you live in Pori?" },
        { fi: "Ymmärrätkö sinä?", note: "front vowel ä → -kö", en: "Do you understand?" },
        { fi: "Voitko toistaa hitaasti?", note: "polite class question", en: "Can you repeat slowly?" },
        { fi: "Saisinko yhden kahvin?", note: "polite request", en: "Could I have one coffee?" },
      ],
    },
    days: {
      title: "Days & Time",
      rows: [
        { fi: "maanantai", note: "maanantaina = on Monday", en: "Monday" },
        { fi: "tiistai", note: "tiistaina = on Tuesday", en: "Tuesday" },
        { fi: "keskiviikko", note: "middle of week", en: "Wednesday" },
        { fi: "torstai", note: "torstaina = on Thursday", en: "Thursday" },
        { fi: "perjantai", note: "perjantaina = on Friday", en: "Friday" },
        { fi: "lauantai ja sunnuntai", note: "viikonloppu", en: "Saturday and Sunday (weekend)" },
        { fi: "tänään • huomenna • eilen", note: "core time words", en: "today • tomorrow • yesterday" },
        { fi: "Mihin aikaan kurssi alkaa?", note: "class schedule", en: "What time does the course start?" },
      ],
    },
    everyday: {
      title: "Everyday Vocabulary",
      rows: [
        { fi: "Hyvää huomenta!", note: "morning greeting", en: "Good morning!" },
        { fi: "Kiitos paljon!", note: "ole hyvä = you're welcome", en: "Thank you very much!" },
        { fi: "Anteeksi", note: "polite attention / sorry", en: "Excuse me / Sorry" },
        { fi: "kirja, vihko ja kynä", note: "classroom objects", en: "book, notebook, and pen" },
        { fi: "kauppa → kaupassa", note: "inessive -ssa", en: "store → in the store" },
        { fi: "koti → kotona", note: "special at-home form", en: "home → at home" },
        { fi: "Tänään on kaunis päivä.", note: "everyday weather", en: "Today is a beautiful day." },
      ],
    },
  };

  function getNotebookRows(tableId) {
    const tbl = NOTEBOOK_MASTER_TABLES[tableId] || NOTEBOOK_MASTER_TABLES.olla;
    if (tableId !== "everyday") return tbl.rows;
    const customRows = (state.flashcards || []).slice(0, 20).map((c) => ({
      fi: c.fi,
      note: c.baseForm ? `base: ${c.baseForm}` : "saved word",
      en: c.en,
    }));
    const seen = new Set(customRows.map((r) => String(r.fi || "").toLowerCase()));
    const merged = [...customRows];
    for (const r of tbl.rows) {
      if (!seen.has(r.fi.toLowerCase())) merged.push(r);
    }
    return merged;
  }

  function exportNotebookGoodnotes(format) {
    const today = DB.todayStr();
    const keys = ["olla", "onko", "days", "everyday"];
    if (format === "md") {
      let md = `# 🇫🇮 ILoveFinland — Finnish Master Study Sheet (${today})\n\n`;
      for (const k of keys) {
        const t = NOTEBOOK_MASTER_TABLES[k];
        const rows = getNotebookRows(k);
        md += `## ${t.title}\n\n| Finnish (Suomi) | English |\n|---|---|\n`;
        rows.forEach((r) => {
          md += `| **${r.fi}** ${r.note ? `*(${r.note})*` : ""} | ${r.en} |\n`;
        });
        md += "\n";
      }
      downloadTextFile(`finnish-goodnotes-study-sheet-${today}.md`, md);
      toast("⬇️ Exported Goodnotes Markdown (.md) sheet!", "success");
      return;
    }
    const win = window.open("", "_blank", "width=880,height=760");
    if (!win) {
      toast("Pop-up blocked — use Export .md or allow pop-ups.", "warning");
      return;
    }
    let sectionsHtml = "";
    for (const k of keys) {
      const t = NOTEBOOK_MASTER_TABLES[k];
      const rows = getNotebookRows(k);
      sectionsHtml += `<h2>${esc(t.title)}</h2><table><thead><tr><th>Finnish (Suomi)</th><th>English</th></tr></thead><tbody>` +
        rows.map((r) => `<tr><td><strong>${esc(r.fi)}</strong>${r.note ? ` <span style="color:#475569;font-size:12px;">(${esc(r.note)})</span>` : ""}</td><td>${esc(r.en)}</td></tr>`).join("") +
        `</tbody></table>`;
    }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Finnish Goodnotes Study Sheet (${today})</title>
      <style>
        body { font-family: 'Inter', -apple-system, sans-serif; color: #0A192F; padding: 28px; max-width: 860px; margin: 0 auto; }
        h1 { color: #003580; font-size: 21px; border-bottom: 3px solid #003580; padding-bottom: 8px; }
        h2 { color: #003580; font-size: 15px; margin-top: 20px; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        th { background: #0A192F; color: #fff; padding: 9px 12px; text-align: left; }
        td { border: 1px solid #CBD5E1; padding: 8px 12px; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <div class="no-print" style="text-align:right;margin-bottom:12px;">
        <button onclick="window.print()" style="background:#003580;color:#fff;border:none;padding:9px 16px;border-radius:8px;font-weight:700;cursor:pointer;">🖨️ Print / Save PDF to Goodnotes</button>
      </div>
      <h1>🇫🇮 ILoveFinland — Master A1 Finnish Study Sheet (${today})</h1>
      ${sectionsHtml}
    </body></html>`);
    win.document.close();
  }

  function getCombinedQuizPool() {
    const dynamicQs = (state.flashcards || []).slice(0, 10).map((c, i, arr) => {
      const distractors = [
        arr[(i + 1) % arr.length]?.en,
        arr[(i + 2) % arr.length]?.en,
        "good morning",
        "in the store",
        "thank you",
      ].filter((x) => x && x.toLowerCase() !== String(c.en || "").toLowerCase());
      const opts = [c.en, distractors[0] || "water", distractors[1] || "tomorrow"];
      return {
        topic: "Saved Vocabulary",
        promptFi: `Mitä tarkoittaa "${c.fi}"?`,
        promptEn: `Choose the English meaning of "${c.fi}":`,
        answer: c.en,
        fullFi: c.fi,
        fullEn: c.en,
        tip: c.example || `Saved in your personal Finnish vocabulary deck.`,
        opts,
      };
    });
    return [...SCHOOL_FINNISH_QUESTIONS, ...dynamicQs];
  }

  function renderTabNotebookAndDrills() {
    const tblId = state.notebookTableId || "olla";
    const rows = getNotebookRows(tblId);
    const quizPool = getCombinedQuizPool();
    const q = quizPool[state.streetIdx % quizPool.length];

    return `
      <div class="fl3-stack-notebook">
        <!-- TOP CARD: GOODNOTES MASTER TABLES -->
        <section class="fl3-card" aria-label="Goodnotes Master Tables">
          <div class="fl3-card-head">
            <h2 class="fl3-card-title">
              <span>📓</span><span>Goodnotes Master Tables</span>
            </h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="fl3-btn" id="fl-nb-export-md">📄 Export .md</button>
              <button type="button" class="fl3-btn primary" id="fl-nb-export-pdf">🖨️ Export to Goodnotes (PDF)</button>
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            ${Object.entries(NOTEBOOK_MASTER_TABLES).map(([id, meta]) => `
              <button type="button" class="fl3-btn ${tblId === id ? "active" : ""}" data-fl-nb-table="${id}">${esc(meta.title)}</button>
            `).join("")}
          </div>

          <div class="fl3-table-wrap">
            <table class="fl3-table">
              <thead>
                <tr>
                  <th style="width:56%;">Finnish (Suomi)</th>
                  <th>English</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map(
                    (r) => `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                        <div>
                          <strong style="color:#FFFFFF;font-size:0.94rem;">${esc(r.fi)}</strong>
                          ${r.note ? `<div style="font-size:0.74rem;color:#94A3B8;margin-top:2px;">${esc(r.note)}</div>` : ""}
                        </div>
                        <button type="button" class="fl3-speaker-btn" data-fl-speak-slow="${esc(r.fi)}" title="Listen slowly (0.75×)">🔊 0.75×</button>
                      </div>
                    </td>
                    <td style="color:#38BDF8;font-weight:600;">${esc(r.en)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>

        <!-- BOTTOM CARD: QUICK A1 PRACTICE QUIZ -->
        <section class="fl3-card accent" aria-label="Quick A1 Practice Quiz">
          <div class="fl3-card-head">
            <h2 class="fl3-card-title">
              <span>🎯</span><span>Quick A1 Practice Quiz</span>
            </h2>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="fl3-badge">${esc(q.topic)}</span>
              <span class="fl3-badge">Score: ${state.streetScore}</span>
            </div>
          </div>

          <div style="background:#0A192F;border:1px solid #1E3A5F;border-radius:10px;padding:16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div>
              <div style="font-size:1.22rem;font-weight:800;color:#FFFFFF;margin-bottom:4px;">🇫🇮 ${esc(q.promptFi)}</div>
              <div style="font-size:0.88rem;color:#94A3B8;">🇬🇧 ${esc(q.promptEn)}</div>
            </div>
            <button type="button" class="fl3-speaker-btn" data-fl-speak-slow="${esc(q.fullFi)}">🔊 0.75×</button>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;">
            ${q.opts
              .map(
                (opt) => `<button type="button" class="fl3-quiz-opt" data-fl-street-ans="${esc(opt)}">${esc(opt)}</button>`
              )
              .join("")}
          </div>

          ${
            state.streetFeedback
              ? `<div style="margin-top:14px;padding:14px;border-radius:10px;background:#0A192F;border:1px solid ${state.streetFeedback.ok ? "rgba(52,211,153,0.5)" : "rgba(56,189,248,0.45)"};">
                   ${state.streetFeedback.roast ? `<div style="color:#E0F2FE;font-size:0.82rem;margin-bottom:6px;">${esc(state.streetFeedback.roast)}</div>` : ""}
                   <div style="font-weight:800;color:${state.streetFeedback.ok ? "#6EE7B7" : "#FCA5A5"};font-size:0.94rem;">
                     ${state.streetFeedback.ok ? "✅ Oikein! Great job!" : `💡 Correct answer: ${esc(q.answer)}`}
                   </div>
                   <div style="color:#FFFFFF;font-weight:700;margin-top:6px;">🇫🇮 ${esc(q.fullFi)}</div>
                   <div style="color:#38BDF8;font-size:0.86rem;margin-top:2px;">🇬🇧 ${esc(q.fullEn)}</div>
                   <div style="color:#CBD5E1;font-size:0.8rem;margin-top:5px;">${esc(q.tip)}</div>
                   <button type="button" class="fl3-btn primary" id="fl-street-next" style="margin-top:12px;width:100%;">Next Question →</button>
                 </div>`
              : ""
          }
        </section>
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
                          <button type="button" class="fl-mini-btn" data-fl-del-conv="${c.id}" title="Delete">${ICO.trash}</button>
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
                        </div>
                        <button type="button" class="fl-btn sm" id="fl-cards-to-podcast" style="width:100%;margin-top:8px;">${ICO.headphones} Listen to Saved Words as Podcast</button>`
                      : `<div style="font-size:0.82rem;color:#94a3b8;margin-bottom:10px;">No flashcards yet. Tap the Star icon on any reply or add a word below!</div>`
                  }
                  <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
                    <input type="text" id="fl-new-card-fi" class="fl-input" placeholder="Finnish word" />
                    <input type="text" id="fl-new-card-en" class="fl-input" placeholder="English meaning" />
                    <button type="button" class="fl-btn primary sm" id="fl-add-custom-card">+ Save Flashcard</button>
                  </div>
                  ${
                    state.flashcards.length
                      ? `<div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
                           <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                             <strong style="font-size:0.8rem;color:#e2e8f0;">All Saved Words (${state.flashcards.length})</strong>
                           </div>
                           <input type="text" id="fl-card-search" class="fl-input" value="${esc(state.cardSearch || "")}" placeholder="Search Finnish or English..." style="margin-bottom:8px;font-size:0.78rem;padding:7px 10px;" />
                           <div style="display:flex;flex-direction:column;gap:6px;">
                             ${state.flashcards
                               .filter((c) => {
                                 const q = (state.cardSearch || "").trim().toLowerCase();
                                 return !q || (c.fi || "").toLowerCase().includes(q) || (c.en || "").toLowerCase().includes(q);
                               })
                               .map(
                                 (c) => `
                               <div class="fl-vocab-row" style="padding:8px 10px;margin:0;">
                                 <div style="min-width:0;flex:1;">
                                   <div style="font-size:0.82rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.fi)}</div>
                                   <div style="font-size:0.73rem;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.en)}</div>
                                 </div>
                                 <div style="display:flex;gap:2px;flex-shrink:0;">
                                   <button type="button" class="fl-mini-btn" data-fl-speak="${esc(c.fi)}" title="Hear pronunciation">${ICO.listen}</button>
                                   <button type="button" class="fl-mini-btn" data-fl-del-card="${c.id}" title="Delete card" style="color:#fca5a5;">✕</button>
                                 </div>
                               </div>
                             `
                               )
                               .join("")}
                           </div>
                         </div>`
                      : ""
                  }
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
                              <button type="button" class="fl-mini-btn" data-fl-del-note="${n.id}" title="Delete">${ICO.trash}</button>
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
                                        <button type="button" class="fl-mini-btn" data-fl-user-act="delete" data-fl-user-email="${esc(usr.email)}" title="Delete user">${ICO.trash}</button>
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
                    ${isRoastEnabled() ? "😊 Friendly Coach Banter: ON" : "📘 Classic Calm Tutor: ON"}
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
                  <div style="color:#94a3b8;display:inline-flex;align-items:center;gap:5px;">${ICO.flame} Streak: ${prog.streakDays || 0}d • AI left today: ${u.remaining}/${u.limit}</div>
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

  /* ---------- FLOATING STUDIO AI LAUNCHER (ADMIN-ONLY, OUTSIDE LAB & STUDIO AI) ---------- */
  function mountFloatingAndSidePanel() {
    if (state.isStudentRoute || state.role === "student") return;
    if (document.getElementById("fl-floating-launcher")) return;
    const launcher = document.createElement("button");
    launcher.id = "fl-floating-launcher";
    launcher.type = "button";
    launcher.className = "fl-floating-launcher";
    launcher.innerHTML = `${ICO.explain}<span>Studio AI</span> <span id="sai-float-open-tab" title="Open Studio AI in New Tab" style="margin-left:6px;padding:1px 6px;background:rgba(255,255,255,0.22);border-radius:6px;font-size:0.75rem;font-weight:800;display:inline-block;">↗</span>`;
    launcher.onclick = (e) => {
      if (e.target && e.target.id === "sai-float-open-tab") {
        e.preventDefault();
        e.stopPropagation();
        window.open("/#studio-ai", "_blank");
        return;
      }
      if (window.openStudioAIChatView) window.openStudioAIChatView();
      else toggleSidePanel(true);
    };
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

    // 3 Clean Pill Tabs switching
    root.querySelectorAll("[data-fl-tab]").forEach((b) => {
      b.onclick = () => {
        const nextTab = b.getAttribute("data-fl-tab") || "chat";
        state.activeTab = nextTab;
        state.mode = nextTab === "chat" ? "chat" : "study";
        state.plusMenuOpen = false;
        renderActiveView();
      };
    });

    root.querySelector("#fl-open-drawer")?.addEventListener("click", () => {
      state.drawerOpen = true;
      renderActiveView();
    });

    const startFreshChat = async () => {
      const c = await DB.saveConversation({ title: "New Chat", kind: "chat", messages: [] });
      state.conversations.unshift(c);
      state.activeConvId = c.id;
      state.activeTab = "chat";
      state.mode = "chat";
      state.drawerOpen = false;
      renderActiveView();
    };
    root.querySelector("#fl-new-chat-top")?.addEventListener("click", startFreshChat);
    root.querySelector("#fl-drawer-new-chat")?.addEventListener("click", startFreshChat);

    // Tab 1: AI Finnish Tutor attachments & Send Photo to Walk & Listen
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
    root.querySelectorAll("[data-fl-rm-pending]").forEach((b) => {
      b.onclick = () => {
        state.pendingAttachments.splice(Number(b.getAttribute("data-fl-rm-pending")), 1);
        renderActiveView();
      };
    });

    root.querySelector("#fl-pending-to-walk")?.addEventListener("click", async () => {
      const imgAtts = state.pendingAttachments.filter((a) => (a.mime_type || "").startsWith("image/"));
      if (!imgAtts.length) return;
      state.pendingAttachments = [];
      state.activeTab = "walk";
      state.mode = "study";
      renderActiveView();
      await createCustomPodcastEpisode("Homework Photo Course", imgAtts);
    });

    root.querySelectorAll("[data-fl-msg-to-walk]").forEach((b) => {
      b.onclick = async () => {
        const conv = getActiveConv();
        const m = conv && conv.messages[Number(b.getAttribute("data-fl-msg-to-walk"))];
        if (!m) return;
        const resolvedAtts = [];
        for (const a of m.attachments || []) {
          if (!(a.mime_type || "").startsWith("image/")) continue;
          const cached = a.id ? state.sessionMediaMap[a.id] : null;
          if (cached && cached.data_base64) {
            resolvedAtts.push({ mime_type: cached.mime_type, data_base64: cached.data_base64 });
          } else if (a.previewUrl && a.previewUrl.startsWith("data:image/")) {
            const b64 = a.previewUrl.split(",")[1] || "";
            if (b64) resolvedAtts.push({ mime_type: "image/jpeg", data_base64: b64 });
          }
        }
        if (!resolvedAtts.length) {
          toast("Upload a fresh homework photo to build a Walk & Listen episode.", "warning");
          return;
        }
        state.activeTab = "walk";
        state.mode = "study";
        renderActiveView();
        await createCustomPodcastEpisode("Homework Photo Course", resolvedAtts);
      };
    });

    root.querySelector("#fl-start-rec")?.addEventListener("click", startRecording);
    root.querySelector("#fl-stop-rec")?.addEventListener("click", stopRecording);

    // Tab 1 Right Panel: Silent Classroom Live Card controls (100% silent — never speaks!)
    root.querySelector("#fl-live-btn")?.addEventListener("click", toggleLiveTranslation);
    root.querySelector("#fl-live-now")?.addEventListener("click", () => { if (state.liveForceCutFn) state.liveForceCutFn(); });
    root.querySelector("#fl-stop-live")?.addEventListener("click", stopLiveTranslation);
    root.querySelectorAll("[data-fl-use-reply]").forEach((b) => {
      b.onclick = async () => {
        const phrase = b.getAttribute("data-fl-use-reply") || "";
        if (!phrase) return;
        const inp = document.getElementById("fl-chat-input");
        if (inp) inp.value = phrase;
        if (navigator.clipboard?.writeText) {
          try { await navigator.clipboard.writeText(phrase); } catch (_) {}
        }
        toast(`Copied silent reply: "${phrase}"`, "success");
      };
    });

    const autoResizeChatInput = (el) => {
      if (!el) return;
      el.style.height = "auto";
      const maxH = 120;
      const nextH = Math.min(el.scrollHeight, maxH);
      el.style.height = Math.max(40, nextH) + "px";
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
      sendMessage(v);
    };
    root.querySelector("#fl-chat-send")?.addEventListener("click", doSend);
    root.querySelectorAll("[data-fl-starter]").forEach((b) => {
      b.onclick = () => sendMessage(b.getAttribute("data-fl-starter"));
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

    // Tab 2: Walk & Listen Pocket Player + Mobile Mini-Player controls
    root.querySelector("#fl-walk-topic-photo")?.addEventListener("click", () => {
      const existingCustom = (state.customPodcastEpisodes || [])[0];
      if (existingCustom) {
        stopPodcastPlayback(true);
        state.podcastEpisodeId = existingCustom.id;
        state.podcastItemIdx = 0;
        renderActiveView();
      } else {
        document.getElementById("fl-pod-hw-photo")?.click();
      }
    });
    root.querySelector("#fl-walk-upload-new-photo")?.addEventListener("click", () => {
      document.getElementById("fl-pod-hw-photo")?.click();
    });
    root.querySelector("#fl-pod-hw-photo")?.addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const att = await fileToAttachment(f);
      e.target.value = "";
      if (att) {
        createCustomPodcastEpisode(f.name.replace(/\.[^.]+$/, "") || "Homework Photo", [att]);
      }
    });

    root.querySelectorAll("[data-fl-pod-ep]").forEach((b) => {
      b.onclick = () => {
        stopPodcastPlayback(true);
        state.podcastEpisodeId = b.getAttribute("data-fl-pod-ep");
        state.podcastItemIdx = 0;
        renderActiveView();
      };
    });

    const handlePauseWalk = () => {
      if (_walkAudioEl && !_walkAudioEl.paused) {
        try { _walkAudioEl.pause(); } catch (_) {}
        state.podcastPlaying = false;
        state.podcastPaused = true;
        if ("mediaSession" in navigator) {
          try { navigator.mediaSession.playbackState = "paused"; } catch (_) {}
        }
        renderActiveView();
      } else {
        stopPodcastPlayback();
      }
    };
    const handleNextWalk = () => {
      const ep = getAllPodcastEpisodes().find((x) => x.id === state.podcastEpisodeId) || PODCAST_EPISODES[0];
      const items = getPodcastItems(ep);
      if (!items.length) return;
      state.podcastItemIdx = (state.podcastItemIdx + 1) % items.length;
      if (state.podcastAudioUrl && _walkAudioEl && state.podcastItemOffsets && state.podcastItemOffsets[state.podcastItemIdx] != null) {
        _walkAudioEl.currentTime = state.podcastItemOffsets[state.podcastItemIdx];
        updateWalkActiveCardHighlight(state.podcastItemIdx);
        if (state.podcastPlaying) _walkAudioEl.play().catch(() => {});
        else renderActiveView();
      } else if (state.podcastPlaying) {
        generateAndPlayPodcast(state.podcastEpisodeId, state.podcastItemIdx);
      } else {
        renderActiveView();
      }
    };
    const handlePrevWalk = () => {
      const ep = getAllPodcastEpisodes().find((x) => x.id === state.podcastEpisodeId) || PODCAST_EPISODES[0];
      const items = getPodcastItems(ep);
      if (!items.length) return;
      state.podcastItemIdx = (state.podcastItemIdx - 1 + items.length) % items.length;
      if (state.podcastAudioUrl && _walkAudioEl && state.podcastItemOffsets && state.podcastItemOffsets[state.podcastItemIdx] != null) {
        _walkAudioEl.currentTime = state.podcastItemOffsets[state.podcastItemIdx];
        updateWalkActiveCardHighlight(state.podcastItemIdx);
        if (state.podcastPlaying) _walkAudioEl.play().catch(() => {});
        else renderActiveView();
      } else if (state.podcastPlaying) {
        generateAndPlayPodcast(state.podcastEpisodeId, state.podcastItemIdx);
      } else {
        renderActiveView();
      }
    };

    root.querySelector("#fl-pod-play-btn")?.addEventListener("click", () => generateAndPlayPodcast(state.podcastEpisodeId, state.podcastItemIdx));
    root.querySelector("#fl-pod-pause-btn")?.addEventListener("click", handlePauseWalk);
    root.querySelector("#fl-pod-prev")?.addEventListener("click", handlePrevWalk);
    root.querySelector("#fl-pod-next")?.addEventListener("click", handleNextWalk);
    root.querySelector("#fl-mini-play-btn")?.addEventListener("click", () => generateAndPlayPodcast(state.podcastEpisodeId, state.podcastItemIdx));
    root.querySelector("#fl-mini-pause-btn")?.addEventListener("click", handlePauseWalk);
    root.querySelector("#fl-mini-next-btn")?.addEventListener("click", handleNextWalk);

    root.querySelector("#fl-pod-loop")?.addEventListener("click", () => {
      state.podcastLoop = !state.podcastLoop;
      if (_walkAudioEl) _walkAudioEl.loop = Boolean(state.podcastLoop);
      renderActiveView();
    });
    root.querySelectorAll("[data-fl-pod-speed]").forEach((b) => {
      b.onclick = () => {
        const nextSpeed = parseFloat(b.getAttribute("data-fl-pod-speed")) || 0.75;
        const wasPlaying = Boolean(state.podcastPlaying);
        state.podcastSpeed = nextSpeed;
        state.podcastTrackKey = "";
        toast(`Speed set to ${state.podcastSpeed === 1 ? "1.0×" : state.podcastSpeed.toFixed(2) + "×"}`, "info");
        if (wasPlaying) {
          generateAndPlayPodcast(state.podcastEpisodeId, state.podcastItemIdx);
        } else {
          renderActiveView();
        }
      };
    });
    root.querySelectorAll("[data-fl-pod-jump]").forEach((b) => {
      b.onclick = () => {
        const idx = Number(b.getAttribute("data-fl-pod-jump") || 0);
        if (state.podcastAudioUrl && _walkAudioEl && state.podcastItemOffsets && state.podcastItemOffsets[idx] != null && state.podcastPlaying) {
          _walkAudioEl.currentTime = state.podcastItemOffsets[idx];
          updateWalkActiveCardHighlight(idx);
          _walkAudioEl.play().catch(() => {});
        } else {
          generateAndPlayPodcast(state.podcastEpisodeId, idx);
        }
      };
    });
    root.querySelector("#fl-pod-export-md")?.addEventListener("click", () => exportWalkAndListenGoodnotes(state.podcastEpisodeId, "md"));

    // Tab 3: Notebook & Drills (Goodnotes Master Tables + Quick A1 Practice Quiz)
    root.querySelectorAll("[data-fl-nb-table]").forEach((b) => {
      b.onclick = () => {
        state.notebookTableId = b.getAttribute("data-fl-nb-table") || "olla";
        renderActiveView();
      };
    });
    root.querySelector("#fl-nb-export-md")?.addEventListener("click", () => exportNotebookGoodnotes("md"));
    root.querySelector("#fl-nb-export-pdf")?.addEventListener("click", () => exportNotebookGoodnotes("pdf"));

    root.querySelectorAll("[data-fl-street-ans]").forEach((b) => {
      b.onclick = () => {
        const pool = getCombinedQuizPool();
        const q = pool[state.streetIdx % pool.length];
        const picked = (b.getAttribute("data-fl-street-ans") || "").trim();
        const ok = picked.toLowerCase().startsWith(String(q.answer || "").toLowerCase());
        if (ok) {
          state.streetScore++;
          getRoastLine(false);
          state.streetFeedback = { ok: true, roast: "" };
        } else {
          state.streetFeedback = { ok: false, roast: getRoastLine(true) };
        }
        renderActiveView();
      };
    });
    root.querySelector("#fl-street-next")?.addEventListener("click", () => {
      state.streetIdx++;
      state.streetFeedback = null;
      renderActiveView();
    });

    // Slide Drawer events
    root.querySelector("#fl-close-drawer")?.addEventListener("click", () => { state.drawerOpen = false; renderActiveView(); });
    root.querySelector("#fl-drawer-backdrop")?.addEventListener("click", (e) => { if (e.target.id === "fl-drawer-backdrop") { state.drawerOpen = false; renderActiveView(); } });
    root.querySelectorAll("[data-fl-dtab]").forEach((b) => { b.onclick = () => { state.drawerTab = b.getAttribute("data-fl-dtab"); renderActiveView(); }; });
    root.querySelectorAll("[data-fl-select-conv]").forEach((el) => {
      el.onclick = (e) => {
        if (e.target.closest("button")) return;
        state.activeConvId = el.getAttribute("data-fl-select-conv");
        state.drawerOpen = false;
        state.activeTab = "chat";
        state.mode = "chat";
        renderActiveView();
        scrollChatsToBottom();
      };
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
      scheduleAutoSync();
      toast("Card saved!", "success");
      renderActiveView();
    });
    root.querySelector("#fl-card-search")?.addEventListener("input", (e) => {
      state.cardSearch = e.target.value || "";
      renderActiveView();
      const inp = document.getElementById("fl-card-search");
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    });
    root.querySelectorAll("[data-fl-del-card]").forEach((b) => {
      b.onclick = async () => {
        const id = b.getAttribute("data-fl-del-card");
        await DB.deleteFlashcard(id);
        state.flashcards = await DB.listFlashcards();
        scheduleAutoSync();
        toast("Flashcard removed.", "info");
        renderActiveView();
      };
    });
    root.querySelector("#fl-cards-to-podcast")?.addEventListener("click", () => {
      state.drawerOpen = false;
      state.activeTab = "walk";
      state.mode = "study";
      state.podcastEpisodeId = "pod_today_a1";
      state.podcastAudioUrl = null;
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
      toast(next ? "😊 Friendly Coach Banter ON!" : "📘 Classic Calm Tutor ON", "info");
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
    if (state.activeTab !== "chat") {
      state.activeTab = "chat";
      state.mode = "chat";
      renderActiveView();
      return true;
    }
    if (state.isStudentRoute) {
      return true;
    }
    return false;
  }

  /* ---------- SMART AUTO-REFRESH (NEW VERSION & ADMIN PENDING USERS) ---------- */
  function startSmartAutoRefresh() {
    if (window.__flAutoRefreshStarted) return;
    window.__flAutoRefreshStarted = true;

    const checkVersion = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const d = await res.json().catch(() => ({}));
        if (!d.app_version) return;
        if (!state.knownAppVersion) {
          state.knownAppVersion = d.app_version;
          return;
        }
        if (d.app_version !== state.knownAppVersion) {
          const inp = document.getElementById("fl-chat-input");
          const isTyping = inp && inp.value && inp.value.trim().length > 0;
          if (!state.isRecording && !state.isLiveTranslating && !state.isSending && !state.speakRecording && !isTyping) {
            toast("✨ New update ready — refreshing...", "info");
            setTimeout(() => window.location.reload(), 900);
          }
        }
      } catch (_) {}
    };
    checkVersion();
    setInterval(checkVersion, 60000);

    setInterval(async () => {
      if (state.role === "admin" && state.drawerOpen && state.drawerTab === "settings") {
        const prevLen = (state.adminUsers || []).length;
        await refreshAdminUsers();
        if ((state.adminUsers || []).length !== prevLen) {
          renderActiveView();
        }
      }
    }, 15000);
  }

  async function openStoryInTutor(payload) {
    state.activeTab = "chat";
    state.mode = "chat";
    renderActiveView();
    const title = (payload && (payload.headline || payload.title)) || "Finnish Article";
    const summary = (payload && (payload.summary || payload.body || "")).slice(0, 600);
    await sendMessage(
      `Turn this ilovefinland.net story into a concise A1 Finnish study card (3 simple Finnish sentences + English meanings + 4 key vocabulary words):\nTitle: ${title}\n${summary}`,
      { mode: "quick_answer" }
    );
  }

  /* ---------- INIT ---------- */
  async function initFinnishLab() {
    await refreshRole();
    await loadAllData();
    mountFloatingAndSidePanel();
    renderActiveView();
    startSmartAutoRefresh();
    if (window.__pendingStoryLesson) {
      const p = window.__pendingStoryLesson;
      window.__pendingStoryLesson = null;
      openStoryInTutor(p);
    }
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
    openStoryInTutor,
    setTab(tabId) {
      state.activeTab = tabId || "chat";
      state.mode = state.activeTab === "chat" ? "chat" : "study";
      renderActiveView();
    },
    isRecording: () => state.isRecording || state.isLiveTranslating,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFinnishLab);
  } else {
    initFinnishLab();
  }
})();
