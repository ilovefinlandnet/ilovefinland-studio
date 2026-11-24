"""Gemini Free-Tier Finnish Study Lab Pro Engine (Unified SQLite /data/studio.db).

Provides:
  1. Active-Recall Sentence & Ending Drills (SM-2 Spaced Repetition in /data/studio.db)
  2. Persistent SQLite Vocabulary Deck (/data/studio.db)
  3. Snap & Ask (Multimodal Gemini Vision via gemini-3.8-flash Free Tier)
  4. Pori & Everyday Finland Interactive Roleplay (click-to-save words)
  5. ilovefinland.net Story-to-Lesson Bridge (A1/A2 selkosuomi reading + vocab + quiz)
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import gemini_service


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_iso(dt: Optional[datetime] = None) -> str:
    return (dt or _utc_now()).strftime("%Y-%m-%dT%H:%M:%SZ")


SEED_SRS_DRILLS: List[Dict[str, Any]] = [
    {
        "drill_type": "ending",
        "topic": "olla",
        "prompt_en": "I am from Pori. (Choose the right form of 'olla')",
        "written_fi": "Minä olen Porista.",
        "spoken_fi": "Mä oon Porista.",
        "masked_fi": "Minä ___ Porista.",
        "answer": "olen",
        "choices": ["olen", "olet", "on", "olemme"],
        "explanation": "1st person singular (minä) of 'olla' is 'olen' (spoken: 'oon').",
    },
    {
        "drill_type": "ending",
        "topic": "olla",
        "prompt_en": "We are at home today. (Choose the right form of 'olla')",
        "written_fi": "Me olemme kotona tänään.",
        "spoken_fi": "Me ollaan kotona tänään.",
        "masked_fi": "Me ___ kotona tänään.",
        "answer": "olemme",
        "choices": ["olemme", "olette", "ovat", "olen"],
        "explanation": "1st person plural (me) written form is 'olemme' (spoken passive: 'ollaan').",
    },
    {
        "drill_type": "ending",
        "topic": "olla",
        "prompt_en": "They are students in Finland.",
        "written_fi": "He ovat opiskelijoita Suomessa.",
        "spoken_fi": "Ne on opiskelijoita Suomessa.",
        "masked_fi": "He ___ opiskelijoita Suomessa.",
        "answer": "ovat",
        "choices": ["ovat", "on", "olette", "olemme"],
        "explanation": "3rd person plural (he) takes 'ovat' in written Finnish (spoken: 'ne on').",
    },
    {
        "drill_type": "ending",
        "topic": "-ko/-kö",
        "prompt_en": "Do you live in Pori? (Attach question suffix -ko/-kö)",
        "written_fi": "Asutko sinä Porissa?",
        "spoken_fi": "Asut sä Porissa?",
        "masked_fi": "___ sinä Porissa?",
        "answer": "Asutko",
        "choices": ["Asutko", "Asutkö", "Asut", "Onko asut"],
        "explanation": "Back vowels (a, o, u) require '-ko' -> 'Asutko'.",
    },
    {
        "drill_type": "ending",
        "topic": "-ko/-kö",
        "prompt_en": "Do you speak Finnish? (Choose correct vowel harmony)",
        "written_fi": "Puhutko suomea?",
        "spoken_fi": "Puhut sä suomee?",
        "masked_fi": "___ suomea?",
        "answer": "Puhutko",
        "choices": ["Puhutko", "Puhutkö", "Puhuko", "Puhut"],
        "explanation": "'Puhut' contains back vowel 'u', so the question ending is '-ko'.",
    },
    {
        "drill_type": "ending",
        "topic": "-ko/-kö",
        "prompt_en": "Are you going to the sauna tonight? (Front vowel harmony)",
        "written_fi": "Menetkö tänään saunaan?",
        "spoken_fi": "Meet sä tänään saunaan?",
        "masked_fi": "___ tänään saunaan?",
        "answer": "Menetkö",
        "choices": ["Menetkö", "Menetko", "Meneekö", "Menet"],
        "explanation": "'Menet' has only neutral/front vowels (e), so it takes '-kö' -> 'Menetkö'.",
    },
    {
        "drill_type": "ending",
        "topic": "local_cases",
        "prompt_en": "I live IN Finland. (Inessive -ssa/-ssä = inside/in)",
        "written_fi": "Minä asun Suomessa.",
        "spoken_fi": "Mä asun Suomessa.",
        "masked_fi": "Minä asun ___.",
        "answer": "Suomessa",
        "choices": ["Suomessa", "Suomesta", "Suomeen", "Suomella"],
        "explanation": "Static location 'in' uses inessive '-ssa/-ssä' (Suomi -> Suomessa).",
    },
    {
        "drill_type": "ending",
        "topic": "local_cases",
        "prompt_en": "The train leaves FROM Helsinki. (Elative -sta/-stä = out of/from)",
        "written_fi": "Juna lähtee Helsingistä.",
        "spoken_fi": "Juna lähtee Helsingistä.",
        "masked_fi": "Juna lähtee ___.",
        "answer": "Helsingistä",
        "choices": ["Helsingistä", "Helsingissä", "Helsinkiin", "Helsingiltä"],
        "explanation": "Movement 'from inside' uses elative '-sta/-stä' (Helsinki -> Helsingistä).",
    },
    {
        "drill_type": "ending",
        "topic": "local_cases",
        "prompt_en": "We are going TO the store. (Illative -Vn = into/to)",
        "written_fi": "Me menemme kauppaan.",
        "spoken_fi": "Me mennään kauppaan.",
        "masked_fi": "Me menemme ___.",
        "answer": "kauppaan",
        "choices": ["kauppaan", "kaupassa", "kaupasta", "kaupalle"],
        "explanation": "Movement 'into' a place doubles the final vowel + 'n' (kauppa -> kauppaan).",
    },
    {
        "drill_type": "ending",
        "topic": "local_cases",
        "prompt_en": "The bus stops AT the station. (Adessive -lla/-llä = at/on)",
        "written_fi": "Bussi pysähtyy asemalla.",
        "spoken_fi": "Bussi pysähtyy asemalla.",
        "masked_fi": "Bussi pysähtyy ___.",
        "answer": "asemalla",
        "choices": ["asemalla", "asemalta", "asemalle", "asemassa"],
        "explanation": "Open/outer locations like 'asema' (station) or 'tori' (market) use adessive '-lla'.",
    },
    {
        "drill_type": "ending",
        "topic": "local_cases",
        "prompt_en": "I am walking TO the market square. (Allative -lle = onto/to)",
        "written_fi": "Minä kävelen torille.",
        "spoken_fi": "Mä kävelen torille.",
        "masked_fi": "Minä kävelen ___.",
        "answer": "torille",
        "choices": ["torille", "torilla", "torilta", "toriin"],
        "explanation": "Movement toward an open area ('tori') uses allative '-lle'.",
    },
    {
        "drill_type": "rebuild",
        "topic": "daily_pori",
        "prompt_en": "Rebuild: 'Could I have one coffee, please?'",
        "written_fi": "Saisinko yhden kahvin, kiitos?",
        "spoken_fi": "Saisinks mä yhen kahvin, kiitos?",
        "masked_fi": "Rebuild the Finnish sentence from word tiles",
        "answer": "Saisinko yhden kahvin, kiitos?",
        "choices": ["Saisinko", "yhden", "kahvin,", "kiitos?"],
        "explanation": "'Saisinko' (Could I have) + genitive 'yhden kahvin' is the polite Finnish café standard.",
    },
    {
        "drill_type": "rebuild",
        "topic": "daily_pori",
        "prompt_en": "Rebuild: 'I will pay by card.'",
        "written_fi": "Minä maksan kortilla.",
        "spoken_fi": "Mä maksan kortilla.",
        "masked_fi": "Rebuild the Finnish sentence from word tiles",
        "answer": "Minä maksan kortilla.",
        "choices": ["Minä", "maksan", "kortilla."],
        "explanation": "Tool/method 'by card' uses adessive '-lla' (kortti -> kortilla).",
    },
    {
        "drill_type": "rebuild",
        "topic": "daily_pori",
        "prompt_en": "Rebuild: 'Excuse me, where is the pharmacy?'",
        "written_fi": "Anteeksi, missä apteekki on?",
        "spoken_fi": "Anteeks, mis apteekki on?",
        "masked_fi": "Rebuild the Finnish sentence from word tiles",
        "answer": "Anteeksi, missä apteekki on?",
        "choices": ["Anteeksi,", "missä", "apteekki", "on?"],
        "explanation": "'Missä + [subject] + on?' asks where something is located.",
    },
]


def init_finnish_study_tables(db_path: str) -> None:
    """Create unified SRS drills & vocabulary deck tables inside /data/studio.db."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS fl_srs_drills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT NOT NULL DEFAULT 'default',
                drill_type TEXT NOT NULL DEFAULT 'ending',
                topic TEXT NOT NULL DEFAULT 'general',
                prompt_en TEXT NOT NULL,
                written_fi TEXT NOT NULL,
                spoken_fi TEXT NOT NULL DEFAULT '',
                masked_fi TEXT NOT NULL DEFAULT '',
                answer TEXT NOT NULL,
                choices_json TEXT NOT NULL DEFAULT '[]',
                explanation TEXT NOT NULL DEFAULT '',
                ease_factor REAL NOT NULL DEFAULT 2.5,
                interval_days REAL NOT NULL DEFAULT 0.0,
                repetitions INTEGER NOT NULL DEFAULT 0,
                due_at TEXT NOT NULL,
                last_result TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS fl_vocab_deck (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT NOT NULL DEFAULT 'default',
                word_fi TEXT NOT NULL,
                base_form TEXT NOT NULL DEFAULT '',
                spoken_fi TEXT NOT NULL DEFAULT '',
                english TEXT NOT NULL DEFAULT '',
                grammar_note TEXT NOT NULL DEFAULT '',
                example_fi TEXT NOT NULL DEFAULT '',
                source_tag TEXT NOT NULL DEFAULT 'manual',
                created_at TEXT NOT NULL,
                UNIQUE(user_email, word_fi)
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def _ensure_user_seed_drills(conn: sqlite3.Connection, user_email: str) -> None:
    row = conn.execute(
        "SELECT COUNT(*) AS cnt FROM fl_srs_drills WHERE user_email = ?",
        (user_email,),
    ).fetchone()
    if row and int(row["cnt"]) > 0:
        return
    now_iso = _utc_iso()
    for d in SEED_SRS_DRILLS:
        conn.execute(
            """
            INSERT INTO fl_srs_drills (
                user_email, drill_type, topic, prompt_en, written_fi, spoken_fi,
                masked_fi, answer, choices_json, explanation, ease_factor,
                interval_days, repetitions, due_at, last_result, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2.5, 0.0, 0, ?, '', ?)
            """,
            (
                user_email,
                d["drill_type"],
                d["topic"],
                d["prompt_en"],
                d["written_fi"],
                d["spoken_fi"],
                d["masked_fi"],
                d["answer"],
                json.dumps(d["choices"], ensure_ascii=False),
                d["explanation"],
                now_iso,
                now_iso,
            ),
        )
    conn.commit()


def get_srs_queue(user_email: str, db_path: str, topic: str = "all", limit: int = 12) -> Dict[str, Any]:
    init_finnish_study_tables(db_path)
    email = (user_email or "default").strip().lower()
    now_iso = _utc_iso()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_user_seed_drills(conn, email)
        if topic and topic != "all":
            rows = conn.execute(
                """
                SELECT * FROM fl_srs_drills
                WHERE user_email = ? AND topic = ? AND due_at <= ?
                ORDER BY due_at ASC, id ASC LIMIT ?
                """,
                (email, topic, now_iso, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT * FROM fl_srs_drills
                WHERE user_email = ? AND due_at <= ?
                ORDER BY due_at ASC, id ASC LIMIT ?
                """,
                (email, now_iso, limit),
            ).fetchall()

        # If all due items done, pull earliest upcoming items for practice
        if not rows:
            if topic and topic != "all":
                rows = conn.execute(
                    "SELECT * FROM fl_srs_drills WHERE user_email = ? AND topic = ? ORDER BY due_at ASC LIMIT ?",
                    (email, topic, min(limit, 6)),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM fl_srs_drills WHERE user_email = ? ORDER BY due_at ASC LIMIT ?",
                    (email, min(limit, 6)),
                ).fetchall()

        total = conn.execute("SELECT COUNT(*) FROM fl_srs_drills WHERE user_email = ?", (email,)).fetchone()[0]
        due_now = conn.execute(
            "SELECT COUNT(*) FROM fl_srs_drills WHERE user_email = ? AND due_at <= ?",
            (email, now_iso),
        ).fetchone()[0]
        mastered = conn.execute(
            "SELECT COUNT(*) FROM fl_srs_drills WHERE user_email = ? AND interval_days >= 7",
            (email,),
        ).fetchone()[0]

        items = []
        for r in rows:
            try:
                choices = json.loads(r["choices_json"] or "[]")
            except Exception:
                choices = []
            items.append({
                "id": r["id"],
                "drill_type": r["drill_type"],
                "topic": r["topic"],
                "prompt_en": r["prompt_en"],
                "written_fi": r["written_fi"],
                "spoken_fi": r["spoken_fi"],
                "masked_fi": r["masked_fi"],
                "answer": r["answer"],
                "choices": choices,
                "explanation": r["explanation"],
                "interval_days": r["interval_days"],
                "repetitions": r["repetitions"],
                "due_at": r["due_at"],
                "last_result": r["last_result"],
            })

        return {
            "ok": True,
            "items": items,
            "stats": {
                "due_now": due_now,
                "mastered": mastered,
                "total": total,
            },
        }
    finally:
        conn.close()


def review_srs_drill(user_email: str, drill_id: int, correct: bool, db_path: str) -> Dict[str, Any]:
    init_finnish_study_tables(db_path)
    email = (user_email or "default").strip().lower()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT * FROM fl_srs_drills WHERE id = ? AND user_email = ?",
            (drill_id, email),
        ).fetchone()
        if not row:
            return {"ok": False, "error": "Drill item not found."}

        reps = int(row["repetitions"] or 0)
        interval = float(row["interval_days"] or 0.0)
        ease = float(row["ease_factor"] or 2.5)
        now = _utc_now()

        if correct:
            reps += 1
            if reps == 1:
                interval = 1.0
            elif reps == 2:
                interval = 3.0
            else:
                interval = round(interval * ease, 1)
            ease = min(2.8, ease + 0.08)
            next_due = now + timedelta(days=interval)
            last_result = "correct"
            schedule_msg = f"Mastered! Next review in {int(round(interval))} day(s)."
        else:
            reps = 0
            interval = 0.0
            ease = max(1.5, ease - 0.2)
            # Re-queue missed item quickly (in 2 minutes) so user re-drills in the same 10-min session!
            next_due = now + timedelta(minutes=2)
            last_result = "missed"
            schedule_msg = "Missed — automatically rescheduled for immediate re-drill in 2 minutes!"

        conn.execute(
            """
            UPDATE fl_srs_drills
            SET repetitions = ?, interval_days = ?, ease_factor = ?, due_at = ?, last_result = ?
            WHERE id = ? AND user_email = ?
            """,
            (reps, interval, ease, _utc_iso(next_due), last_result, drill_id, email),
        )
        conn.commit()
        return {
            "ok": True,
            "drill_id": drill_id,
            "correct": correct,
            "next_due_at": _utc_iso(next_due),
            "interval_days": interval,
            "schedule_message": schedule_msg,
        }
    finally:
        conn.close()


def generate_ai_srs_drills(user_email: str, topic: str, level: str, db_path: str) -> Dict[str, Any]:
    """Use $0 Free-Tier Gemini to generate 5 new active-recall drills and save to /data/studio.db."""
    init_finnish_study_tables(db_path)
    email = (user_email or "default").strip().lower()
    clean_topic = (topic or "local_cases").strip()
    clean_level = (level or "A1").strip().upper()
    prompt = f"""Create 5 practical Finnish active-recall drills for level {clean_level} focusing on topic: {clean_topic}.
Mix 'ending' drills (fill missing verb/case ending) and 'rebuild' drills (reorder 3-5 Finnish words).
Always include BOTH Written Finnish (Kirjakieli) and natural Spoken Finnish (Puhekieli).
Return STRICT JSON:
{{
  "drills": [
    {{
      "drill_type": "ending",
      "topic": "{clean_topic}",
      "prompt_en": "Clear English prompt",
      "written_fi": "Full written Finnish sentence",
      "spoken_fi": "Natural spoken Finnish equivalent",
      "masked_fi": "Sentence with ___ for ending drills, or 'Rebuild from tiles'",
      "answer": "Exact missing word (for ending) OR exact written_fi (for rebuild)",
      "choices": ["opt1", "opt2", "opt3", "opt4"],
      "explanation": "Concise 1-sentence grammar explanation in English"
    }}
  ]
}}"""
    res = gemini_service.generate_content(
        system_prompt="You are a warm, crystal-clear Finnish language teacher creating A1/A2 active-recall drills.",
        user_prompt=prompt,
        json_mode=True,
        temperature=0.55,
        max_output_tokens=1600,
    )
    if not res["ok"]:
        return res
    drills = (res["json"] or {}).get("drills") or []
    if not drills:
        return {"ok": False, "error": "Gemini did not return drills JSON. Please retry.", "status_code": 502}

    conn = sqlite3.connect(db_path)
    now_iso = _utc_iso()
    inserted = 0
    try:
        for d in drills[:5]:
            if not d.get("written_fi") or not d.get("answer"):
                continue
            conn.execute(
                """
                INSERT INTO fl_srs_drills (
                    user_email, drill_type, topic, prompt_en, written_fi, spoken_fi,
                    masked_fi, answer, choices_json, explanation, ease_factor,
                    interval_days, repetitions, due_at, last_result, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2.5, 0.0, 0, ?, '', ?)
                """,
                (
                    email,
                    d.get("drill_type") if d.get("drill_type") in ("ending", "rebuild") else "ending",
                    clean_topic,
                    d.get("prompt_en", "Complete the Finnish sentence"),
                    d["written_fi"],
                    d.get("spoken_fi") or d["written_fi"],
                    d.get("masked_fi") or d["written_fi"],
                    d["answer"],
                    json.dumps(d.get("choices") or [], ensure_ascii=False),
                    d.get("explanation", ""),
                    now_iso,
                    now_iso,
                ),
            )
            inserted += 1
        conn.commit()
    finally:
        conn.close()
    return {"ok": True, "inserted": inserted, "model": res["model"]}


def list_vocab_deck(user_email: str, db_path: str) -> Dict[str, Any]:
    init_finnish_study_tables(db_path)
    email = (user_email or "default").strip().lower()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT * FROM fl_vocab_deck WHERE user_email = ? ORDER BY id DESC LIMIT 300",
            (email,),
        ).fetchall()
        return {"ok": True, "words": [dict(r) for r in rows]}
    finally:
        conn.close()


def save_vocab_word(user_email: str, payload: Dict[str, Any], db_path: str) -> Dict[str, Any]:
    init_finnish_study_tables(db_path)
    email = (user_email or "default").strip().lower()
    word_fi = (payload.get("word_fi") or "").strip()
    if not word_fi:
        return {"ok": False, "error": "word_fi is required."}
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO fl_vocab_deck (
                user_email, word_fi, base_form, spoken_fi, english, grammar_note, example_fi, source_tag, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_email, word_fi) DO UPDATE SET
                base_form = COALESCE(NULLIF(excluded.base_form, ''), fl_vocab_deck.base_form),
                spoken_fi = COALESCE(NULLIF(excluded.spoken_fi, ''), fl_vocab_deck.spoken_fi),
                english = COALESCE(NULLIF(excluded.english, ''), fl_vocab_deck.english),
                grammar_note = COALESCE(NULLIF(excluded.grammar_note, ''), fl_vocab_deck.grammar_note),
                example_fi = COALESCE(NULLIF(excluded.example_fi, ''), fl_vocab_deck.example_fi)
            """,
            (
                email,
                word_fi,
                (payload.get("base_form") or word_fi).strip(),
                (payload.get("spoken_fi") or "").strip(),
                (payload.get("english") or "").strip(),
                (payload.get("grammar_note") or "").strip(),
                (payload.get("example_fi") or "").strip(),
                (payload.get("source_tag") or "study_lab").strip(),
                _utc_iso(),
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return {"ok": True, "word_fi": word_fi}


def delete_vocab_word(user_email: str, word_id: int, db_path: str) -> Dict[str, Any]:
    init_finnish_study_tables(db_path)
    email = (user_email or "default").strip().lower()
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("DELETE FROM fl_vocab_deck WHERE id = ? AND user_email = ?", (word_id, email))
        conn.commit()
    finally:
        conn.close()
    return {"ok": True}


def handle_snap_and_ask(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Multimodal Gemini Vision (gemini-3.8-flash Free Tier) for Finnish signs, worksheets, labels."""
    image_b64 = (payload.get("image_b64") or "").strip()
    image_mime = (payload.get("image_mime") or "image/jpeg").strip()
    question = (payload.get("question") or "").strip()
    if not image_b64:
        return {"ok": False, "status_code": 400, "error": "Please upload or snap a photo first."}

    prompt = f"""Analyze this photo of Finnish text (worksheet, street sign, notice, or product label).
Extra learner question: {question or 'Extract all Finnish text, translate cleanly to English, show spoken Finnish if helpful, and break down every important Finnish word into its base dictionary form (perusmuoto) and case/verb ending.'}

Return STRICT JSON:
{{
  "extracted_finnish": "Exact Finnish text visible in the image",
  "spoken_finnish": "Natural everyday spoken Finnish (puhekieli) equivalent if applicable",
  "english_translation": "Clear natural English translation",
  "summary_tip": "Helpful 1-2 sentence real-life Finland context tip",
  "words": [
    {{
      "word": "surface Finnish word from image",
      "base_form": "dictionary base form (perusmuoto)",
      "ending": "case or verb ending explanation (e.g. -ssa inessive 'in', or 1st person -n)",
      "english": "meaning in English"
    }}
  ]
}}"""
    res = gemini_service.generate_content(
        system_prompt="You are a friendly Finnish linguistics tutor analyzing real-world Finnish photos for A1/A2 learners.",
        user_prompt=prompt,
        image_b64=image_b64,
        image_mime=image_mime,
        json_mode=True,
        temperature=0.3,
        max_output_tokens=2000,
    )
    if not res["ok"]:
        return res
    data = res["json"] or {}
    return {
        "ok": True,
        "model": res["model"],
        "extracted_finnish": data.get("extracted_finnish") or res["text"],
        "spoken_finnish": data.get("spoken_finnish") or "",
        "english_translation": data.get("english_translation") or "",
        "summary_tip": data.get("summary_tip") or "",
        "words": data.get("words") or [],
    }


ROLEPLAY_SCENARIOS: Dict[str, str] = {
    "pori_grocery": "Cashier or clerk at a K-Citymarket / Prisma supermarket in Pori (asking about bonus card, bags, produce, paying by card).",
    "cafe": "Friendly barista at a cozy Finnish café in Pori (ordering kahvi, korvapuusti, oat milk, eating here or takeaway).",
    "pharmacy": "Helpful pharmacist at an Apteekki in Finland (buying cold medicine, pain relief, Kela card, dosage instructions).",
    "kela_vero": "Polite Finnish advisor at a Kela / Vero service desk (discussing residence registration, tax card verokortti, basic forms).",
    "small_talk": "Friendly Finnish neighbor in Pori chatting about today's weather, winter/summer plans, and weekend sauna.",
}


def handle_pori_roleplay(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Interactive Pori & Everyday Finland roleplay with Kirjakieli + Puhekieli + clickable words."""
    scenario_key = (payload.get("scenario") or "pori_grocery").strip()
    scenario_desc = ROLEPLAY_SCENARIOS.get(scenario_key, ROLEPLAY_SCENARIOS["pori_grocery"])
    user_msg = (payload.get("user_message") or "").strip()
    level = (payload.get("level") or "A1").strip().upper()
    history = payload.get("history") or []

    hist_text = ""
    for turn in history[-8:]:
        role = turn.get("role", "user")
        txt = (turn.get("text") or "").strip()
        if txt:
            hist_text += f"{role.upper()}: {txt}\n"

    prompt = f"""Roleplay Scenario: {scenario_desc}
Learner Level: {level}
Conversation so far:
{hist_text or '(Start of conversation — greet the learner naturally in character!)'}

Learner's latest message: {user_msg or '(Start the roleplay now with a warm 1-2 sentence opening in Finnish.)'}

Reply in character in simple, authentic {level} Finnish. Keep it short (1–2 sentences) and natural.
If the learner wrote Finnish with any grammar/spelling error, add a brief, encouraging correction in English.
List 4–8 key words from your Finnish reply so the learner can click any word to save it to their vocabulary deck.

Return STRICT JSON:
{{
  "reply_written": "Your natural response in Written Finnish (Kirjakieli)",
  "reply_spoken": "The same response in natural everyday Spoken Finnish (Puhekieli)",
  "english_translation": "Natural English translation of your reply",
  "gentle_correction": "Short encouraging correction/tip in English (or 'Great Finnish!' if accurate, or '' if starting)",
  "suggested_reply_fi": "One helpful example A1/A2 reply the learner could say next",
  "clickable_words": [
    {{
      "word_fi": "word as used",
      "base_form": "dictionary form",
      "spoken_fi": "spoken form if different",
      "english": "English meaning",
      "grammar_note": "brief ending/case note"
    }}
  ]
}}"""
    res = gemini_service.generate_content(
        system_prompt="You are a warm, patient native Finnish conversation partner living in Pori, Finland.",
        user_prompt=prompt,
        json_mode=True,
        temperature=0.6,
        max_output_tokens=1400,
    )
    if not res["ok"]:
        return res
    data = res["json"] or {}
    return {
        "ok": True,
        "model": res["model"],
        "scenario": scenario_key,
        "reply_written": data.get("reply_written") or res["text"],
        "reply_spoken": data.get("reply_spoken") or data.get("reply_written") or "",
        "english_translation": data.get("english_translation") or "",
        "gentle_correction": data.get("gentle_correction") or "",
        "suggested_reply_fi": data.get("suggested_reply_fi") or "",
        "clickable_words": data.get("clickable_words") or [],
    }


def handle_story_to_lesson(payload: Dict[str, Any]) -> Dict[str, Any]:
    """ilovefinland.net Story-to-Lesson Bridge: turns any article draft into A1/A2 selkosuomi."""
    headline = (payload.get("headline") or "").strip()
    summary = (payload.get("summary") or "").strip()
    body = (payload.get("body") or "").strip()[:3000]
    level = (payload.get("level") or "A1").strip().upper()
    if not headline and not body:
        return {"ok": False, "status_code": 400, "error": "Article headline or body text is required."}

    prompt = f"""Transform this ilovefinland.net news/guide article into a clear, engaging {level} Finnish reading lesson in Selkosuomi (Easy Finnish).

ARTICLE:
Headline: {headline}
Summary: {summary}
Body: {body}

Return STRICT JSON:
{{
  "lesson_title_fi": "Short Easy Finnish title",
  "lesson_title_en": "English title",
  "sentences": [
    {{
      "written_fi": "Short clear Easy Finnish sentence (Kirjakieli)",
      "spoken_fi": "How a Finn might casually tell a friend this sentence (Puhekieli)",
      "english": "Clear English translation"
    }}
  ],
  "vocabulary": [
    {{
      "word_fi": "key Finnish word from the passage",
      "base_form": "dictionary base form",
      "spoken_fi": "spoken variant if different",
      "english": "English meaning",
      "grammar_note": "brief case/verb tip"
    }}
  ],
  "comprehension": [
    {{
      "question_fi": "Simple Finnish question about the passage",
      "question_en": "English translation of question",
      "options": ["Option A", "Option B", "Option C"],
      "answer_index": 0,
      "explanation": "Why this answer is right"
    }}
  ]
}}
Provide 5–6 short sentences, 8–10 useful vocabulary words, and 3 comprehension checks."""
    res = gemini_service.generate_content(
        system_prompt="You are an expert Finnish Selkosuomi (Easy Finnish) educator adapting Finland news for A1/A2 learners.",
        user_prompt=prompt,
        json_mode=True,
        temperature=0.45,
        max_output_tokens=2200,
    )
    if not res["ok"]:
        return res
    data = res["json"] or {}
    return {
        "ok": True,
        "model": res["model"],
        "lesson_title_fi": data.get("lesson_title_fi") or headline,
        "lesson_title_en": data.get("lesson_title_en") or headline,
        "sentences": data.get("sentences") or [],
        "vocabulary": data.get("vocabulary") or [],
        "comprehension": data.get("comprehension") or [],
    }
