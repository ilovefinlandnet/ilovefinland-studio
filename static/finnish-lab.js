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
    if (cur) {
      if (nowTitle) nowTitle.textContent = `🇫🇮 ${cur.fi}`;
      if (nowEn) nowEn.textContent = `🇬🇧 means: ${cur.en}`;
      if (nowCounter) nowCounter.textContent = `Item ${newIdx + 1} / ${items.length}`;
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

    root.innerHTML = `
      <div class="fl-app">
        <!-- Top Bar: [☰]    [ Chat | Study ]    [+] -->
        <header class="fl-header">
          <button type="button" class="fl-icon-circle" id="fl-open-drawer" title="Saved Chats, Flashcards, Notes & Settings" aria-label="Open Finnish Lab menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          </button>

          <div class="fl-segment" role="tablist">
            <button type="button" class="fl-seg-btn ${state.mode === "chat" ? "active" : ""}" data-fl-mode="chat">Chat</button>
            <button type="button" class="fl-seg-btn ${state.mode === "study" ? "active" : ""}" data-fl-mode="study">Study</button>
          </div>

          <button type="button" class="fl-new-chat-pill" id="fl-new-chat-top" title="Start a new chat">+ New</button>
        </header>

        ${state.mode === "chat" ? renderChatMode() : `<div class="fl-study-scroll">${renderStudyMode(prog)}</div>`}
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
                <div style="width:54px;height:54px;border-radius:16px;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(14,165,233,0.28);margin-bottom:4px;">
                  <img src="/assets/ilf-heart.png" alt="ILoveFinland" width="36" height="36" style="width:36px;height:36px;object-fit:contain;" />
                </div>
                <h1 class="fl-empty-title">ILoveFinland Finnish Lab</h1>
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

      <!-- ChatGPT-Style Floating Jump-to-Bottom Button -->
      <button type="button" id="fl-scroll-down-btn" class="fl-scroll-down-btn hidden" title="Jump to latest message" aria-label="Scroll to bottom">↓</button>

      <!-- Sleek Bottom Input Capsule (Exact Screenshot 1 Feel) -->
      <div class="fl-dock">
        ${
          state.isLiveTranslating
            ? `<div class="fl-live-bar">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                  <span class="fl-live-dot"></span>
                  <span id="fl-live-interim" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(state.liveInterimText)}</span>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button type="button" class="fl-btn primary sm" id="fl-live-now" title="Translate what was just said right now">⚡ Now</button>
                  <button type="button" class="fl-btn danger sm" id="fl-stop-live">Stop</button>
                </div>
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
              <button type="button" class="fl-cap-btn" id="fl-plus-btn" title="Attach Photo, Camera, PDF or Audio" style="padding:0;width:36px;">${ICO.plus}</button>
            </div>
            <div class="fl-capsule-right">
              <button type="button" class="fl-cap-btn ${state.isLiveTranslating ? "active-live" : ""}" id="fl-live-btn" title="Silent Live Finnish → English Subtitles">
                ${ICO.live}<span>${state.isLiveTranslating ? "Live ON" : "Live"}</span>
              </button>
              ${
                state.isRecording
                  ? `<button type="button" class="fl-cap-btn active-rec" id="fl-stop-rec" title="Stop Recording"><span class="fl-rec-dot"></span><span class="fl-rec-timer">00:00</span></button>`
                  : `<button type="button" class="fl-cap-btn" id="fl-start-rec" title="Record Audio" style="padding:0;width:36px;">${ICO.mic}</button>`
              }
              <button type="button" class="fl-send-circle" id="fl-chat-send" ${state.isSending ? "disabled" : ""} title="Send">${ICO.send}</button>
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
        ? m.isLiveSubtitle
          ? `<div class="fl-msg-actions" style="margin-top:8px;">
               <span style="font-size:0.68rem;color:#34D399;font-weight:700;padding:2px 8px;border-radius:999px;background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.3);">🔇 Silent Classroom Helper</span>
               <button type="button" class="fl-mini-btn" data-fl-extract-cards="${idx}" title="Save vocabulary to Flashcards" aria-label="Save Words">${ICO.cards} Save Words</button>
             </div>`
          : `<div class="fl-msg-actions">
               ${
                 state.isLiveTranslating
                   ? `<span style="font-size:0.68rem;color:#94a3b8;">🔇 Muted (Live ON)</span>`
                   : isSpeakingThis
                   ? `<button type="button" class="fl-mini-btn" data-fl-stop-speak="1" title="Stop audio" aria-label="Stop" style="background:rgba(239,68,68,0.18);color:#fca5a5;">${ICO.stop}<span>Stop</span></button>`
                   : `<button type="button" class="fl-mini-btn" data-fl-speak="${esc(fullSpeakText)}" data-fl-speak-id="${esc(m.id || ("m" + idx))}" title="Listen in Finnish voice (1.0x)" aria-label="Listen">${ICO.listen}</button>
                      <button type="button" class="fl-mini-btn" data-fl-speak-slow="${esc(fullSpeakText)}" data-fl-speak-id="${esc(m.id || ("m" + idx))}" title="Listen slowly (0.75×)" aria-label="Slow">${ICO.slow}<span style="font-size:0.68rem;">0.75×</span></button>`
               }
               <button type="button" class="fl-mini-btn" data-fl-explain-more="${idx}" title="Explain in more detail" aria-label="Explain">${ICO.explain}</button>
               <button type="button" class="fl-mini-btn" data-fl-extract-cards="${idx}" title="Save words to Flashcards" aria-label="Save Words">${ICO.cards}</button>
               <button type="button" class="fl-mini-btn" data-fl-save-note="${idx}" title="Save to Notes" aria-label="Save">${ICO.save}</button>
             </div>`
        : "";
    const roastHtml = m.roastBanner ? `<div class="fl-roast-banner">${esc(m.roastBanner)}</div>` : "";
    return `
      <div class="fl-msg ${m.role === "user" ? "user" : "assistant"}${m.isLiveSubtitle ? " live-sub" : ""}">
        ${roastHtml}
        ${attHtml}
        <div>${renderMarkdownLite(m.text)}</div>
        ${actionsHtml}
      </div>
    `;
  }

  /* ---------- MODE 2: HIGH-END STUDY HUB (UNIFIED 2x2 LUXURY GRID) ---------- */
  function renderStudyMode(prog) {
    if (!state.studyTool) {
      const cardCount = (state.flashcards || []).length;
      return `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <!-- Sleek Top Progress Strip -->
          <div class="fl-study-stats-pill">
            <span style="display:inline-flex;align-items:center;gap:5px;">${ICO.flame} <strong>${prog.streakDays || 0} day</strong> streak</span>
            <span style="display:inline-flex;align-items:center;gap:5px;">${ICO.cards} <strong>${cardCount}</strong> saved cards</span>
            <span style="color:#38bdf8;font-weight:700;">CEFR ${esc(DB.getSettings().level || "A1")}</span>
          </div>

          <!-- Unified 2x2 Luxury Card Grid (Equal Heights & Consistent Spacing on iPhone, iPad & PC!) -->
          <div class="fl-study-grid" style="gap:14px;">
            <button type="button" class="fl-study-tile" data-fl-study="podcast" style="border-color:rgba(56,189,248,0.42);background:radial-gradient(circle at 85% 15%, rgba(56,189,248,0.2), transparent 60%), rgba(13,24,46,0.92);">
              <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
                <div class="fl-study-icon-badge" style="width:46px;height:46px;">${ICO.headphones}</div>
                <span style="font-size:0.65rem;padding:2px 8px;border-radius:999px;background:rgba(56,189,248,0.2);color:#7dd3fc;font-weight:800;">AI VOICE</span>
              </div>
              <strong style="font-size:1rem;">Walk &amp; Listen Podcast</strong>
              <span style="font-size:0.8rem;color:#cbd5e1;line-height:1.45;">Human-voice episodes + make custom episodes on any topic while walking.</span>
            </button>

            <button type="button" class="fl-study-tile" data-fl-study="lesson">
              <div class="fl-study-icon-badge" style="width:46px;height:46px;">${ICO.book}</div>
              <strong style="font-size:1rem;">Today's 5-Min Lesson</strong>
              <span style="font-size:0.8rem;color:#94a3b8;line-height:1.45;">5 daily words (human voice) → 1 simple grammar rule → 1 quick check.</span>
            </button>

            <button type="button" class="fl-study-tile" data-fl-study="helper">
              <div class="fl-study-icon-badge" style="width:46px;height:46px;">${ICO.file}</div>
              <strong style="font-size:1rem;">Homework &amp; Vocab Snap</strong>
              <span style="font-size:0.8rem;color:#94a3b8;line-height:1.45;">Worksheet helper, photo-to-flashcards, 17 A1 grammar guides &amp; roleplay.</span>
            </button>

            <button type="button" class="fl-study-tile" data-fl-study="game" style="border-color:rgba(168,85,247,0.38);background:radial-gradient(circle at 85% 15%, rgba(168,85,247,0.18), transparent 60%), rgba(13,22,40,0.92);">
              <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
                <div class="fl-study-icon-badge" style="width:46px;height:46px;background:rgba(168,85,247,0.2);border-color:rgba(192,132,252,0.4);">${ICO.zap}</div>
                <span style="font-size:0.65rem;padding:2px 8px;border-radius:999px;background:rgba(16,185,129,0.22);color:#6ee7b7;font-weight:800;">SCHOOL A1</span>
              </div>
              <strong style="font-size:1rem;">🏫 School Finnish &amp; Speak</strong>
              <span style="font-size:0.8rem;color:#cbd5e1;line-height:1.45;">Standard beginner school grammar &amp; vocab drill (Finnish + English) + pronunciation practice.</span>
            </button>
          </div>

          <!-- Extra Study Modules (All neatly inside Study — zero top clutter above Chat / Study!) -->
          <div style="margin-top:16px;">
            <div style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#7dd3fc;margin:0 0 8px 4px;">Interactive Study Tools ($0 Gemini Free Tier)</div>
            <div class="fl-study-grid" style="gap:10px;">
              <button type="button" class="fl-study-tile" data-fl-pro-tool="srs" style="padding:13px 14px;">
                <strong style="font-size:0.9rem;">🎯 10-Min SRS Drills</strong>
                <span style="font-size:0.76rem;color:#94a3b8;line-height:1.4;">Active-recall sentence building &amp; ending drills saved to your study DB.</span>
              </button>
              <button type="button" class="fl-study-tile" data-fl-pro-tool="grammar" style="padding:13px 14px;">
                <strong style="font-size:0.9rem;">⚖️ Kirjakieli ↔ Puhekieli</strong>
                <span style="font-size:0.76rem;color:#94a3b8;line-height:1.4;">Side-by-side written vs. spoken grammar tables + Goodnotes PDF export.</span>
              </button>
              <button type="button" class="fl-study-tile" data-fl-pro-tool="snap" style="padding:13px 14px;">
                <strong style="font-size:0.9rem;">📷 Snap &amp; Ask Vision</strong>
                <span style="font-size:0.76rem;color:#94a3b8;line-height:1.4;">Upload a textbook, sign, or worksheet photo for instant Finnish breakdown.</span>
              </button>
              <button type="button" class="fl-study-tile" data-fl-pro-tool="roleplay" style="padding:13px 14px;">
                <strong style="font-size:0.9rem;">🏙️ Pori &amp; Finland Roleplay</strong>
                <span style="font-size:0.76rem;color:#94a3b8;line-height:1.4;">Everyday café, grocery &amp; Kela scenarios with click-to-save vocabulary.</span>
              </button>
              <button type="button" class="fl-study-tile" data-fl-pro-tool="story" style="padding:13px 14px;">
                <strong style="font-size:0.9rem;">📰 Story-to-Lesson Bridge</strong>
                <span style="font-size:0.76rem;color:#94a3b8;line-height:1.4;">Turn any ilovefinland.net article into an A1/A2 Selkosuomi reading quiz.</span>
              </button>
              <button type="button" class="fl-study-tile" data-fl-pro-tool="vocab" style="padding:13px 14px;">
                <strong style="font-size:0.9rem;">📚 Saved Vocab Deck</strong>
                <span style="font-size:0.76rem;color:#94a3b8;line-height:1.4;">Review your saved words with neural Finnish audio &amp; Goodnotes export.</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }
    const back = `<button type="button" class="fl-btn sm" id="fl-study-back" style="margin-bottom:10px;">← Back to Study</button>`;
    if (state.studyTool === "podcast") return back + renderPodcastTool();
    if (state.studyTool === "lesson") return back + renderLessonTool();
    if (state.studyTool === "game") return back + renderGameAndSpeakTool();
    return back + renderHelperHubTool();
  }

  function renderGameAndSpeakTool() {
    const q = SCHOOL_FINNISH_QUESTIONS[state.streetIdx % SCHOOL_FINNISH_QUESTIONS.length];
    const sp = SPEAK_PHRASES[state.speakPhraseIdx % SPEAK_PHRASES.length];
    return `
      <div class="fl-card" style="padding:18px;border-radius:20px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px;">
          <button type="button" class="fl-btn sm ${state.gameTab === "street" ? "active" : ""}" data-fl-gtab="street">🏫 School Finnish Practice</button>
          <button type="button" class="fl-btn sm ${state.gameTab === "speak" ? "active" : ""}" data-fl-gtab="speak">${ICO.mic} Say It Out Loud</button>
        </div>

        ${
          state.gameTab === "street"
            ? `<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.76rem;color:#94a3b8;margin-bottom:10px;">
                 <span>Question ${(state.streetIdx % SCHOOL_FINNISH_QUESTIONS.length) + 1} / ${SCHOOL_FINNISH_QUESTIONS.length} • <strong style="color:#7dd3fc;">${esc(q.topic)}</strong></span>
                 <span style="color:#6ee7b7;font-weight:700;">Score: ${state.streetScore}</span>
               </div>
               <div style="background:rgba(6,14,30,0.9);border:1px solid rgba(56,189,248,0.28);border-radius:16px;padding:18px;text-align:center;margin-bottom:12px;">
                 <div style="font-size:0.72rem;color:#7dd3fc;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Complete the School Finnish Sentence:</div>
                 <div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:6px;">🇫🇮 ${esc(q.promptFi)}</div>
                 <div style="font-size:0.88rem;color:#cbd5e1;margin-bottom:10px;">🇬🇧 ${esc(q.promptEn)}</div>
                 <div style="display:flex;justify-content:center;gap:6px;">
                   <button type="button" class="fl-mini-btn" data-fl-speak-slow="${esc(q.fullFi)}">🐢 0.75×</button>
                   <button type="button" class="fl-mini-btn" data-fl-speak="${esc(q.fullFi)}">🔊 1.0×</button>
                 </div>
               </div>
               <div style="display:flex;flex-direction:column;gap:8px;">
                 ${q.opts
                   .map(
                     (opt) => `<button type="button" class="fl-btn" style="text-align:left;padding:12px 14px;" data-fl-street-ans="${esc(opt)}">${esc(opt)}</button>`
                   )
                   .join("")}
               </div>
               ${
                 state.streetFeedback
                   ? `<div style="margin-top:12px;padding:12px;border-radius:12px;background:rgba(255,255,255,0.05);font-size:0.84rem;">
                        ${state.streetFeedback.roast ? `<div class="fl-roast-banner" style="background:rgba(56,189,248,0.14);border-color:rgba(56,189,248,0.35);color:#e0f2fe;">${esc(state.streetFeedback.roast)}</div>` : ""}
                        <div style="font-weight:700;color:${state.streetFeedback.ok ? "#6ee7b7" : "#fca5a5"};">${state.streetFeedback.ok ? "✅ Oikein! (Correct!)" : `❌ Answer: ${esc(q.answer)}`}</div>
                        <div style="color:#ffffff;margin-top:5px;font-weight:700;">🇫🇮 ${esc(q.fullFi)}</div>
                        <div style="color:#7dd3fc;margin-top:2px;">🇬🇧 ${esc(q.fullEn)}</div>
                        <div style="color:#cbd5e1;margin-top:4px;font-size:0.78rem;">💡 ${esc(q.tip)}</div>
                        <button type="button" class="fl-btn primary sm" id="fl-street-next" style="margin-top:10px;width:100%;">Next Question →</button>
                      </div>`
                   : ""
               }`
            : `<div style="background:rgba(6,14,30,0.9);border:1px solid rgba(56,189,248,0.28);border-radius:16px;padding:18px;text-align:center;margin-bottom:12px;">
                 <div style="font-size:0.72rem;color:#7dd3fc;margin-bottom:4px;">SAY THIS OUT LOUD (${(state.speakPhraseIdx % SPEAK_PHRASES.length) + 1}/${SPEAK_PHRASES.length})</div>
                 <div style="font-size:1.35rem;font-weight:800;color:#fff;">🇫🇮 ${esc(sp.fi)}</div>
                 <div style="font-size:0.84rem;color:#94a3b8;margin-top:4px;">🇬🇧 ${esc(sp.en)}</div>
                 <div style="font-size:0.74rem;color:#fde047;margin-top:4px;">Focus: ${esc(sp.focus)}</div>
                 <div style="display:flex;justify-content:center;gap:8px;margin-top:12px;flex-wrap:wrap;">
                   <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(sp.fi)}">🐢 0.75×</button>
                   <button type="button" class="fl-btn sm" data-fl-speak="${esc(sp.fi)}">🔊 1.0×</button>
                   <button type="button" class="fl-btn sm" id="fl-speak-next-phrase">Next Phrase →</button>
                 </div>
               </div>
               <div style="text-align:center;">
                 ${
                   state.speakRecording
                     ? `<button type="button" class="fl-btn danger" id="fl-speak-stop-btn" style="padding:13px 26px;border-radius:999px;font-weight:800;">⏹️ Stop &amp; Check My Voice</button>`
                     : `<button type="button" class="fl-pod-play-cta" id="fl-speak-start-btn">🎙️ Tap &amp; Say It Out Loud</button>`
                 }
               </div>
               ${
                 state.speakResult
                   ? `<div style="margin-top:14px;padding:14px;border-radius:14px;background:rgba(255,255,255,0.06);font-size:0.86rem;line-height:1.5;">
                        ${state.speakResult.roast ? `<div class="fl-roast-banner" style="background:rgba(56,189,248,0.14);border-color:rgba(56,189,248,0.35);color:#e0f2fe;">${esc(state.speakResult.roast)}</div>` : ""}
                        <div style="font-size:1.05rem;font-weight:800;color:${state.speakResult.score >= 7 ? "#6ee7b7" : "#fde047"};">Score: ${state.speakResult.score}/10</div>
                        <div style="color:#fff;margin-top:4px;"><strong>${esc(state.speakResult.verdict)}</strong></div>
                        ${state.speakResult.heard ? `<div style="color:#94a3b8;margin-top:4px;">Heard: <em>"${esc(state.speakResult.heard)}"</em></div>` : ""}
                        ${state.speakResult.tip ? `<div style="color:#7dd3fc;margin-top:4px;">💡 ${esc(state.speakResult.tip)}</div>` : ""}
                      </div>`
                   : ""
               }`
        }
      </div>
    `;
  }

  function renderPodcastTool() {
    const allEps = getAllPodcastEpisodes();
    const ep = allEps.find((x) => x.id === state.podcastEpisodeId) || allEps[0];
    const items = getPodcastItems(ep);
    const activeIdx = Math.min(Math.max(0, state.podcastItemIdx || 0), Math.max(0, items.length - 1));
    const currentItem = items[activeIdx];

    return `
      <div class="fl-card" style="padding:18px;border-radius:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="fl-study-icon-badge" style="width:46px;height:46px;">${ICO.headphones}</div>
            <div>
              <strong style="font-size:1.05rem;display:block;color:#fff;">🎧 Walk &amp; Listen — Beginner Audio Course (10–20 Min)</strong>
              <span style="font-size:0.78rem;color:#94a3b8;">100% Free Passive Memorization • Slow Finnish → "means English" → Pause → Repeat</span>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="fl-btn sm" id="fl-pod-export-pdf" title="Print / Save PDF to Goodnotes">📄 Goodnotes PDF</button>
            <button type="button" class="fl-btn sm" id="fl-pod-export-md" title="Download Markdown Study Sheet">⬇️ Export .md</button>
          </div>
        </div>

        <!-- Custom Course Creator (Topic OR Upload Homework Photo -> 20-30 items via $0 Gemini) -->
        <div class="fl-pod-creator" style="margin-bottom:14px;">
          <div style="font-size:0.76rem;font-weight:700;color:#7dd3fc;display:inline-flex;align-items:center;gap:5px;">${ICO.explain} Generate 24-Item Beginner Audio Course (Topic or Homework Photo)</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <input type="text" id="fl-pod-custom-topic" class="fl-input" placeholder="e.g. Colors & Numbers, Food & Drinks, Family..." style="flex:1;min-width:190px;font-size:0.84rem;" />
            <button type="button" class="fl-btn primary sm" id="fl-pod-create-btn" ${state.podcastCreating ? "disabled" : ""} style="white-space:nowrap;">${state.podcastCreating ? "⏳ Building 24 items..." : "✨ Generate Course"}</button>
            <label class="fl-btn sm" style="cursor:pointer;white-space:nowrap;border-color:rgba(56,189,248,0.45);color:#7dd3fc;" title="Upload a Finnish homework photo to turn it into a Walk & Listen audio course">
              📷 Upload Homework Photo
              <input type="file" id="fl-pod-hw-photo" accept="image/*" style="display:none;" />
            </label>
          </div>
        </div>

        <!-- One-Tap Beginner Presets (22-24 items each + Saved Flashcards) -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
          ${allEps.map(
            (p) => `<button type="button" class="fl-btn sm ${p.id === ep.id ? "active" : ""}" data-fl-pod-ep="${p.id}">${esc(p.title)}</button>`
          ).join("")}
        </div>

        <!-- Cards List (Scrolls Smoothly Above Sticky Bottom Audio Bar on Mobile!) -->
        ${
          state.podcastShowScript
            ? `<div class="fl-walk-cards-list" style="margin-top:8px;margin-bottom:14px;display:flex;flex-direction:column;gap:8px;">
                ${items
                  .map(
                    (it, idx) => `
                  <div class="fl-vocab-row ${state.podcastPlaying && idx === activeIdx ? "is-active-walk" : ""}" data-fl-pod-row="${idx}">
                    <div>
                      <strong style="color:#fff;">${idx + 1}. 🇫🇮 ${esc(it.fi)}</strong>
                      <div style="font-size:0.78rem;color:#7dd3fc;">🇬🇧 ${esc(it.en)}</div>
                    </div>
                    <button type="button" class="fl-mini-btn" data-fl-pod-jump="${idx}" title="Play from item ${idx + 1}">▶</button>
                  </div>
                `
                  )
                  .join("")}
              </div>`
            : ""
        }

        <!-- Sticky Bottom Walk & Listen Player Bar (Lock-Screen iPhone / iPad Ready) -->
        <div class="fl-pod-player-card fl-walk-sticky-player">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
            <div style="text-align:left;min-width:0;flex:1;">
              <div style="font-size:0.88rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(ep.title)}</div>
              <div id="fl-walk-now-counter" style="font-size:0.72rem;color:#34D399;font-weight:700;">
                ${state.podcastLoading ? esc(state.podcastPhase) : state.podcastPlaying ? `Item ${activeIdx + 1} / ${items.length} • ${esc(state.podcastVoiceLabel || "NooraNeural")}` : `${items.length} items • ${esc(ep.duration || "~12–15 min")} • Lock-Screen MP3 Ready`}
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              ${
                state.podcastLoading
                  ? `<span style="font-size:0.78rem;color:#7dd3fc;font-weight:700;">⏳ Building MP3...</span>`
                  : state.podcastPlaying && !state.podcastPaused
                  ? `<button type="button" class="fl-btn sm" id="fl-pod-pause-btn" style="background:rgba(2,156,216,0.25);border-color:#38BDF8;color:#fff;font-weight:800;">⏸ Pause</button>
                     <button type="button" class="fl-btn danger sm" id="fl-pod-stop-btn" style="font-weight:800;">⏹ Stop</button>`
                  : `<button type="button" class="fl-pod-play-cta" id="fl-pod-play-btn" style="padding:8px 16px;font-size:0.82rem;">▶ ${state.podcastPaused ? "Resume" : "Start Walk & Listen"}</button>`
              }
            </div>
          </div>

          ${
            currentItem && (state.podcastPlaying || state.podcastPaused)
              ? `<div style="background:rgba(6,18,36,0.88);border:1px solid rgba(56,189,248,0.35);border-radius:10px;padding:8px 10px;margin-bottom:8px;text-align:left;">
                   <div id="fl-walk-now-fi" style="font-size:0.96rem;font-weight:800;color:#fff;">🇫🇮 ${esc(currentItem.fi)}</div>
                   <div id="fl-walk-now-en" style="font-size:0.78rem;color:#7dd3fc;">🇬🇧 means: ${esc(currentItem.en)}</div>
                 </div>`
              : ""
          }

          <!-- Controls Row: Prev/Next, Loop Episode, Speed (0.70x / 0.80x / 1.0x) -->
          <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;align-items:center;">
            <button type="button" class="fl-btn sm" id="fl-pod-prev" title="Previous item">⏮</button>
            <button type="button" class="fl-btn sm" id="fl-pod-next" title="Next item">⏭</button>
            <button type="button" class="fl-btn sm ${state.podcastLoop ? "active" : ""}" id="fl-pod-loop">🔁 Loop: ${state.podcastLoop ? "ON" : "OFF"}</button>
            ${[0.70, 0.80, 1.0].map((spd) => `<button type="button" class="fl-btn sm ${Math.abs((state.podcastSpeed || 0.75) - spd) < 0.06 ? "active" : ""}" data-fl-pod-speed="${spd}">${spd.toFixed(2)}×</button>`).join("")}
            <button type="button" class="fl-btn sm" id="fl-pod-script-toggle">${state.podcastShowScript ? "🙈 Hide" : "👁️ List"}</button>
          </div>
        </div>
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
          <strong style="font-size:1rem;display:inline-flex;align-items:center;gap:6px;">${ICO.book} Today's Lesson — Step ${step}/3</strong>
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
                    <button type="button" class="fl-mini-btn" data-fl-speak="${esc(w.fi + ". " + w.exFi)}" title="Listen">${ICO.listen}</button>
                    <button type="button" class="fl-mini-btn" data-fl-save-vocab="${i}" title="Save card">${ICO.cards}</button>
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
        <button type="button" class="fl-btn sm ${sk === "listening" ? "active" : ""}" data-fl-skill="listening">${ICO.headphones} Listening</button>
        <button type="button" class="fl-btn sm ${sk === "speaking" ? "active" : ""}" data-fl-skill="speaking">🗣️ Roleplay</button>
      </div>
      ${
        sk === "reading"
          ? `<div class="fl-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <strong>${esc(r.title)}</strong>
                <div style="display:flex;gap:4px;">
                  <button type="button" class="fl-mini-btn" data-fl-speak="${esc((r.sentences || []).map((s) => s.fi).join(" "))}" title="Listen">${ICO.listen}</button>
                  <button type="button" class="fl-mini-btn" data-fl-speak-slow="${esc((r.sentences || []).map((s) => s.fi).join(" "))}" title="Slow">${ICO.slow}</button>
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
              <strong style="display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;">${ICO.headphones} ${esc(l.title)}</strong>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                <button type="button" class="fl-btn primary sm" data-fl-speak="${esc(fullFi)}">${ICO.listen} Play</button>
                <button type="button" class="fl-btn sm" data-fl-speak-slow="${esc(fullFi)}">${ICO.slow} Slow</button>
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

    // iOS Safari Keyboard Fix: keep the entire chat capsule cleanly ABOVE the keyboard (zero clipping!)
    if (window.visualViewport && !window.__flViewportBound) {
      window.__flViewportBound = true;
      const syncKeyboardDock = () => {
        const dock = document.querySelector("#view-finnish-lab .fl-dock");
        if (!dock || window.innerWidth > 768) return;
        const vv = window.visualViewport;
        const kbInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
        dock.style.bottom = kbInset > 40 ? `${kbInset + 10}px` : "";
      };
      window.visualViewport.addEventListener("resize", syncKeyboardDock);
      window.visualViewport.addEventListener("scroll", syncKeyboardDock);
    }

    // Floating ChatGPT-style ↓ jump-to-bottom button (tracks inner #fl-chat-stage scroll!)
    root.querySelector("#fl-scroll-down-btn")?.addEventListener("click", () => scrollChatsToBottom(false));
    root.querySelector("#fl-chat-stage")?.addEventListener("scroll", updateScrollDownButton, { passive: true });
    updateScrollDownButton();

    // iOS & iPadOS Safari Keyboard Lock: shrink app shell cleanly to visualViewport.height when keyboard opens
    if (window.visualViewport && !window.__flViewportBound) {
      window.__flViewportBound = true;
      const syncAppViewport = () => {
        const ws = document.querySelector(".workspace");
        const lab = document.getElementById("view-finnish-lab");
        if (!ws || !lab || lab.classList.contains("hidden")) return;
        const vv = window.visualViewport;
        if (vv && vv.height > 260) {
          ws.style.height = `${Math.round(vv.height)}px`;
          window.scrollTo(0, 0);
        }
      };
      window.visualViewport.addEventListener("resize", syncAppViewport);
      window.visualViewport.addEventListener("scroll", syncAppViewport);
    }
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
    root.querySelector("#fl-live-now")?.addEventListener("click", () => { if (state.liveForceCutFn) state.liveForceCutFn(); });
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
      chatInputEl.addEventListener("focus", () => document.body.classList.add("fl-kb-open"));
      chatInputEl.addEventListener("blur", () => document.body.classList.remove("fl-kb-open"));
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
    root.querySelectorAll("[data-fl-pro-tool]").forEach((b) => {
      b.onclick = () => {
        const toolId = b.getAttribute("data-fl-pro-tool");
        if (window.FinnishLabPro && typeof window.FinnishLabPro.openTab === "function") {
          window.FinnishLabPro.openTab(toolId);
        }
      };
    });
    root.querySelector("#fl-study-back")?.addEventListener("click", () => { state.studyTool = null; renderActiveView(); });

    // School Finnish Practice & Pronunciation Check events
    root.querySelectorAll("[data-fl-gtab]").forEach((b) => { b.onclick = () => { state.gameTab = b.getAttribute("data-fl-gtab"); renderActiveView(); }; });
    root.querySelectorAll("[data-fl-street-ans]").forEach((b) => {
      b.onclick = () => {
        const q = SCHOOL_FINNISH_QUESTIONS[state.streetIdx % SCHOOL_FINNISH_QUESTIONS.length];
        const picked = (b.getAttribute("data-fl-street-ans") || "").trim();
        const ok = picked.toLowerCase().startsWith(q.answer.toLowerCase());
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
    root.querySelector("#fl-speak-next-phrase")?.addEventListener("click", () => {
      state.speakPhraseIdx++;
      state.speakResult = null;
      renderActiveView();
    });
    root.querySelector("#fl-speak-start-btn")?.addEventListener("click", async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast("Microphone not supported here.", "error");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
        const cleanMime = mimeType.split(";")[0];
        const rec = new MediaRecorder(stream, { mimeType });
        const chunks = [];
        state.speakRecorder = rec;
        state.speakRecording = true;
        state.speakResult = null;
        rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
        rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          state.speakRecording = false;
          renderActiveView();
          const blob = new Blob(chunks, { type: cleanMime });
          const b64 = await blobToBase64(blob);
          const sp = SPEAK_PHRASES[state.speakPhraseIdx % SPEAK_PHRASES.length];
          toast("⏳ Checking your Finnish pronunciation...", "info");
          try {
            const res = await flApi("/api/finnish-lab/pronunciation-check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ target_phrase: sp.fi, audio_base64: b64, mime_type: cleanMime, roast_mode: isRoastEnabled() }),
            });
            const fb = res.feedback || {};
            const roast = (fb.score || 7) < 6 ? getRoastLine(true) : (getRoastLine(false), "");
            state.speakResult = { ...fb, roast };
          } catch (err) {
            toast(err.message || "Could not check pronunciation.", "error");
          }
          renderActiveView();
        };
        rec.start();
        renderActiveView();
      } catch (_) {
        toast("Microphone permission denied.", "error");
      }
    });
    root.querySelector("#fl-speak-stop-btn")?.addEventListener("click", () => {
      if (state.speakRecorder && state.speakRecording) {
        try { state.speakRecorder.stop(); } catch (_) {}
      }
    });

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
        stopPodcastPlayback(true);
        state.podcastEpisodeId = b.getAttribute("data-fl-pod-ep");
        state.podcastItemIdx = 0;
        renderActiveView();
      };
    });
    root.querySelector("#fl-pod-hw-photo")?.addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const att = await fileToAttachment(f);
      e.target.value = "";
      if (att) {
        const customTopic = document.getElementById("fl-pod-custom-topic")?.value || f.name.replace(/\.[^.]+$/, "");
        createCustomPodcastEpisode(customTopic, [att]);
      }
    });
    root.querySelector("#fl-pod-play-btn")?.addEventListener("click", () => generateAndPlayPodcast(state.podcastEpisodeId, state.podcastItemIdx));
    root.querySelector("#fl-pod-pause-btn")?.addEventListener("click", () => {
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
    });
    root.querySelector("#fl-pod-stop-btn")?.addEventListener("click", () => stopPodcastPlayback());
    root.querySelector("#fl-pod-loop")?.addEventListener("click", () => {
      state.podcastLoop = !state.podcastLoop;
      if (_walkAudioEl) _walkAudioEl.loop = Boolean(state.podcastLoop);
      renderActiveView();
    });
    root.querySelector("#fl-pod-prev")?.addEventListener("click", () => {
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
    });
    root.querySelector("#fl-pod-next")?.addEventListener("click", () => {
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
    });
    root.querySelectorAll("[data-fl-pod-speed]").forEach((b) => {
      b.onclick = () => {
        const nextSpeed = parseFloat(b.getAttribute("data-fl-pod-speed")) || 0.75;
        const wasPlaying = Boolean(state.podcastPlaying);
        state.podcastSpeed = nextSpeed;
        state.podcastTrackKey = "";
        toast(`Walk & Listen speed set to ${state.podcastSpeed.toFixed(2)}×`, "info");
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
    root.querySelector("#fl-pod-export-pdf")?.addEventListener("click", () => exportWalkAndListenGoodnotes(state.podcastEpisodeId, "print"));
    root.querySelector("#fl-pod-export-md")?.addEventListener("click", () => exportWalkAndListenGoodnotes(state.podcastEpisodeId, "md"));
    root.querySelector("#fl-pod-script-toggle")?.addEventListener("click", () => { state.podcastShowScript = !state.podcastShowScript; renderActiveView(); });
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
        const existing = (state.flashcards || []).find((c) => (c.fi || "").toLowerCase() === (w.fi || "").toLowerCase());
        if (existing) {
          await DB.deleteFlashcard(existing.id);
          state.flashcards = await DB.listFlashcards();
          scheduleAutoSync();
          toast(`Removed "${w.fi}" from Flashcards.`, "info");
        } else {
          await DB.addFlashcard({ fi: w.fi, en: w.en, baseForm: w.base, example: `${w.exFi} (${w.exEn})` });
          state.flashcards = await DB.listFlashcards();
          scheduleAutoSync();
          toast(`Saved "${w.fi}" to Flashcards!`, "success");
        }
        renderActiveView();
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
      state.mode = "study";
      state.studyTool = "podcast";
      state.podcastEpisodeId = "pod_cards";
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

  /* ---------- SMART AUTO-REFRESH (NEW VERSION & ADMIN PENDING USERS) ---------- */
  function startSmartAutoRefresh() {
    if (window.__flAutoRefreshStarted) return;
    window.__flAutoRefreshStarted = true;

    // 1. Check for new app version every 60s (auto-reloads safely only when completely idle!)
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

    // 2. Auto-refresh Admin pending users list every 15s while Settings drawer is open
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

  /* ---------- INIT ---------- */
  async function initFinnishLab() {
    await refreshRole();
    await loadAllData();
    mountFloatingAndSidePanel();
    renderActiveView();
    startSmartAutoRefresh();
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
