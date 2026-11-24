/* ============================================================================
   FINNISH STUDY LAB PRO BRIDGE (v105.0 — Clean 3-Tab Brand Architecture)
   Zero extra DOM headers or duplicate tab bars. Bridges Studio Story-to-Lesson
   and neural fi-FI speech cleanly into window.FinnishLab's 3-Tab workspace.
   ============================================================================ */
(function () {
  "use strict";

  function speakFi(text, rate = 0.75) {
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

  function removeLegacyProDom() {
    document.getElementById("flp-pro-header")?.remove();
    document.getElementById("flp-pro-workspace")?.remove();
    const classicRoot = document.getElementById("finnish-lab-root");
    if (classicRoot) classicRoot.style.display = "";
  }

  function openStoryLesson(payload) {
    removeLegacyProDom();
    if (window.FinnishLab && typeof window.FinnishLab.openStoryInTutor === "function") {
      window.FinnishLab.openStoryInTutor(payload);
    } else {
      window.__pendingStoryLesson = payload;
    }
  }

  window.FinnishLabPro = {
    render: removeLegacyProDom,
    speak: speakFi,
    openStoryLesson,
    closeTool: removeLegacyProDom,
    openTab(tabId) {
      removeLegacyProDom();
      if (!window.FinnishLab || typeof window.FinnishLab.setTab !== "function") return;
      if (tabId === "walk" || tabId === "podcast") window.FinnishLab.setTab("walk");
      else if (tabId === "grammar" || tabId === "srs" || tabId === "vocab" || tabId === "notebook") window.FinnishLab.setTab("notebook");
      else window.FinnishLab.setTab("chat");
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeLegacyProDom);
  } else {
    removeLegacyProDom();
  }
})();
