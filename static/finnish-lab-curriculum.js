/* ============================================================================
   FINNISH LEARNING LAB — A1/A2 CURRICULUM & OFFLINE-CAPABLE STUDY PACKS
   17 Grammar topics, daily vocabulary, reading, listening, speaking & roleplays
   ============================================================================ */
(function () {
  "use strict";

  const DAILY_VOCAB_PACKS = [
    {
      topic: "Greetings & Classroom Basics",
      words: [
        { fi: "Huomenta", en: "Good morning", base: "huomen", pron: "HUO-men-ta", spoken: "Huomenta!", exFi: "Huomenta, opettaja!", exEn: "Good morning, teacher!" },
        { fi: "Anteeksi", en: "Excuse me / Sorry", base: "anteeksi", pron: "AN-teek-si", spoken: "Sori / Anteeks", exFi: "Anteeksi, voitko toistaa?", exEn: "Excuse me, can you repeat?" },
        { fi: "Ymmärrän", en: "I understand", base: "ymmärtää", pron: "YM-mär-rän", spoken: "Mä ymmärrän", exFi: "Nyt ymmärrän, kiitos!", exEn: "Now I understand, thank you!" },
        { fi: "Hitaasti", en: "Slowly", base: "hitaasti", pron: "HI-taas-ti", spoken: "Hitaammin", exFi: "Puhu hitaasti, kiitos.", exEn: "Speak slowly, please." },
        { fi: "Kysymys", en: "Question", base: "kysymys", pron: "KY-sy-mys", spoken: "Kysymys", exFi: "Minulla on kysymys.", exEn: "I have a question." },
      ],
    },
    {
      topic: "At the Café & Supermarket",
      words: [
        { fi: "Kahvi", en: "Coffee", base: "kahvi", pron: "KAH-vi", spoken: "Kahvi / Kaffe", exFi: "Saisinko yhden kahvin?", exEn: "Could I have one coffee?" },
        { fi: "Kuitti", en: "Receipt", base: "kuitti", pron: "KUIT-ti", spoken: "Kuitti", exFi: "Tarvitsetko kuittia?", exEn: "Do you need a receipt?" },
        { fi: "Kortilla", en: "By card", base: "kortti", pron: "KOR-til-la", spoken: "Kortilla", exFi: "Maksan kortilla.", exEn: "I will pay by card." },
        { fi: "Muovipussi", en: "Plastic bag", base: "muovipussi", pron: "MUO-vi-pus-si", spoken: "Pussi", exFi: "En tarvitse muovipussia.", exEn: "I don't need a plastic bag." },
        { fi: "Paljonko", en: "How much", base: "paljonko", pron: "PAL-jon-ko", spoken: "Paljon tää maksaa?", exFi: "Paljonko tämä maksaa?", exEn: "How much does this cost?" },
      ],
    },
    {
      topic: "Weather & Everyday Finland",
      words: [
        { fi: "Sää", en: "Weather", base: "sää", pron: "SÄÄ (long ä)", spoken: "Sää / Keli", exFi: "Millainen sää tänään on?", exEn: "What is the weather like today?" },
        { fi: "Lumi", en: "Snow", base: "lumi", pron: "LU-mi", spoken: "Lumi", exFi: "Ulkona sataa lunta.", exEn: "It is snowing outside." },
        { fi: "Pakkanen", en: "Frost / Below-zero cold", base: "pakkanen", pron: "PAK-ka-nen", spoken: "Pakkanen", exFi: "Tänään on kymmenen astetta pakkasta.", exEn: "Today it is -10 degrees." },
        { fi: "Bussi", en: "Bus", base: "bussi", pron: "BUS-si", spoken: "Bussi / Dösä", exFi: "Bussi tulee viiden minuutin päästä.", exEn: "The bus arrives in five minutes." },
        { fi: "Asemalla", en: "At the station", base: "asema", pron: "A-se-mal-la", spoken: "Asemalla", exFi: "Tavataan asemalla kello kolme.", exEn: "Let's meet at the station at 3 o'clock." },
      ],
    },
  ];

  const GRAMMAR_TOPICS = [
    {
      id: "alphabet",
      title: "1. Finnish Alphabet & Sounds",
      level: "A1",
      en: "Finnish is phonetic: every letter is pronounced almost the same way every time. Stress is ALWAYS on the first syllable. Double letters (aa, kk, tt) are held twice as long — length changes the meaning!",
      fi: "Suomessa sanat lausutaan niin kuin ne kirjoitetaan. Paino on aina ensimmäisellä tavulla. Pitkä vokaali (aa) ja kaksoiskonsonantti (kk) muuttavat sanan merkityksen.",
      pos: ["tuli (fire) vs. tuuli (wind)", "kuka (who) vs. kukka (flower)", "ä = like 'a' in 'cat' (päivä)", "y = round lips and say 'ee' (hyvä)"],
      neg: [],
      q: ["Miten tämä lausutaan? — How is this pronounced?"],
      mistakes: ["Saying 'tuli' and 'tuuli' with the same length.", "Putting stress on the second syllable instead of the first."],
      quiz: { q: "Which word means 'flower'?", options: ["kuka", "kukka", "kukaan"], ans: 1, exp: "Double 'kk' in kukka = flower; single 'k' in kuka = who." },
    },
    {
      id: "olla",
      title: "2. Verb 'Olla' (To Be): Positive, Negative & Questions",
      level: "A1",
      en: "'Olla' is the most important Finnish verb. Each person has its own ending (-n, -t, on, -mme, -tte, ovat). For negatives, use the negative verb (en, et, ei, emme, ette, eivät) + 'ole'.",
      fi: "Olla-verbi on suomen yleisin verbi. Kieltomuodossa käytetään ei-verbiä ja sanaa 'ole' (en ole, et ole, ei ole).",
      pos: ["Minä olen opiskelija. (I am a student.)", "Hän on suomalainen. (He/She is Finnish.)", "Me olemme Suomessa. (We are in Finland.)"],
      neg: ["Minä en ole väsynyt. (I am not tired.)", "Hän ei ole kotona. (He/She is not at home.)"],
      q: ["Oletko sinä valmis? (Are you ready?)", "Onko tämä vapaana? (Is this seat free?)"],
      mistakes: ["Saying 'Minä ei ole' instead of 'Minä en ole'.", "Using 'on' after 'ei' ('ei on' is wrong — always 'ei ole')."],
      quiz: { q: "Choose the correct negative: 'She is not here.'", options: ["Hän ei on täällä.", "Hän ei ole täällä.", "Hän en ole täällä."], ans: 1, exp: "Always use 'ei ole' for he/she/it." },
    },
    {
      id: "pronouns",
      title: "3. Personal Pronouns (Written & Spoken)",
      level: "A1",
      en: "Finnish has no grammatical gender: 'hän' means both 'he' and 'she'. In everyday spoken Finnish (puhekieli), 'minä' becomes 'mä', 'sinä' becomes 'sä', and 'hän' often becomes 'se'.",
      fi: "Persoonapronominit ovat minä, sinä, hän, me, te, he. Puhekielessä sanotaan usein mä, sä, se, me, te, ne.",
      pos: ["Minä (mä) = I", "Sinä (sä) = you (singular)", "Hän (se) = he / she", "Me = we | Te = you (pl./formal) | He (ne) = they"],
      neg: [],
      q: ["Kuka hän on? (Who is he/she?)"],
      mistakes: ["Looking for separate words for 'he' and 'she' — 'hän' is both!"],
      quiz: { q: "What is the common spoken Finnish form of 'minä'?", options: ["sä", "mä", "me"], ans: 1, exp: "Minä → mä, sinä → sä." },
    },
    {
      id: "demonstratives",
      title: "4. Demonstrative Pronouns (Tämä, Tuo, Se)",
      level: "A1",
      en: "Use 'tämä' (this) for things right next to you, 'tuo' (that) for things you can point to further away, and 'se' (it / that) for things already mentioned or known.",
      fi: "'Tämä' on lähellä, 'tuo' on kauempana ja 'se' on tuttu asia. Monikossa: nämä, nuo, ne.",
      pos: ["Tämä on kirja. (This is a book.)", "Tuo on bussi. (That over there is a bus.)", "Se on hyvä! (It is good!)"],
      neg: ["Tämä ei ole minun. (This is not mine.)"],
      q: ["Mikä tämä on? (What is this?)", "Paljonko tuo maksaa? (How much does that cost?)"],
      mistakes: ["Confusing plural 'nämä' (these) with 'ne' (those/they)."],
      quiz: { q: "How do you ask 'What is this?'", options: ["Kuka tämä on?", "Mikä tämä on?", "Missä tämä on?"], ans: 1, exp: "Mikä = what, tämä = this." },
    },
    {
      id: "possession",
      title: "5. Possession Sentences (Minulla on...)",
      level: "A1",
      en: "Finnish has no verb 'to have'. Instead, you say 'On me is...' using the -lla/-llä ending + 'on'. For negative possession, use 'ei ole' + partitive.",
      fi: "Suomessa omistamista sanotaan: Minulla on... Kieltomuoto on: Minulla ei ole...",
      pos: ["Minulla on koira. (I have a dog.)", "Sinulla on uusi puhelin. (You have a new phone.)", "Hänellä on kaksi lasta. (He/She has two children.)"],
      neg: ["Minulla ei ole autoa. (I don't have a car.)", "Meillä ei ole aikaa. (We don't have time.)"],
      q: ["Onko sinulla kysymys? (Do you have a question?)"],
      mistakes: ["Forgetting partitive after 'ei ole' ('ei ole auto' → should be 'ei ole autoa')."],
      quiz: { q: "How do you say 'I have a question'?", options: ["Minä olen kysymys.", "Minulla on kysymys.", "Minun on kysymys."], ans: 1, exp: "Possession always uses -lla/-llä + on." },
    },
    {
      id: "numbers-time",
      title: "6. Numbers & Telling Time",
      level: "A1",
      en: "1–10: yksi, kaksi, kolme, neljä, viisi, kuusi, seitsemän, kahdeksan, yhdeksän, kymmenen. For half past in Finnish, count toward the NEXT hour: 'puoli kolme' = 2:30 (half to three)!",
      fi: "Kello on kaksi (2:00). Huomio: 'puoli kolme' on 2:30 (puoli tuntia kolmeen)!",
      pos: ["Kello on yhdeksän. (It is 9:00.)", "Kurssi alkaa kello puoli kymmenen. (Class starts at 9:30.)", "Varttia yli neljä (4:15) / Varttia vaille viisi (4:45)."],
      neg: [],
      q: ["Paljonko kello on? (What time is it?)", "Mihin aikaan? (At what time?)"],
      mistakes: ["Thinking 'puoli kolme' means 3:30 — it means 2:30!"],
      quiz: { q: "What time is 'puoli viisi'?", options: ["5:30", "4:30", "4:15"], ans: 1, exp: "Puoli viisi = half toward five = 4:30." },
    },
    {
      id: "verb-types",
      title: "7. Verb Types & Present Conjugation",
      level: "A1",
      en: "Finnish verbs fall into 6 types by their dictionary ending (infinitive). Type 1 ends in two vowels (puhua → puhun), Type 2 in -da/-dä (syödä → syön), Type 3 in -la/-na/-ra/-sta (tulla → tulen), Type 4 in -Vta/-Vtä (haluta → haluan).",
      fi: "Suomessa on 6 verbityyppiä. Persoonapäätteet ovat aina samat: -n, -t, (pitkä vokaali), -mme, -tte, -vat/-vät.",
      pos: ["puhua (1): minä puhun, hän puhuu", "juoda (2): minä juon, hän juo", "opiskella (3): minä opiskelen", "haluta (4): minä haluan"],
      neg: ["en puhu, et juo, ei opiskele, emme halua"],
      q: ["Puhutko sinä suomea? (Do you speak Finnish?)"],
      mistakes: ["Adding an extra vowel to Type 2 in 3rd person ('hän syöö' is wrong — it stays 'hän syö')."],
      quiz: { q: "What is 'I want' from 'haluta' (Type 4)?", options: ["halun", "haluan", "halutan"], ans: 1, exp: "Type 4 drops -t- and adds -a- before endings: haluta → halua- → haluan." },
    },
    {
      id: "vowel-harmony",
      title: "8. Vowel Harmony (Vokaaliharmonia)",
      level: "A1",
      en: "Back vowels (a, o, u) and front vowels (ä, ö, y) do not mix in simple Finnish words. Neutral vowels (e, i) work with either! If a word has a, o, or u, endings use a/o/u (-ssa, -lla). Otherwise they use ä/ö/y (-ssä, -llä).",
      fi: "Takavokaalit (a, o, u) ja etuvokaalit (ä, ö, y) eivät ole samassa perussanassa. E ja i sopivat molempien kanssa.",
      pos: ["talo → talossa (in the house)", "kylä → kylässä (in the village)", "Helsinki (only e, i) → Helsingissä"],
      neg: [],
      q: ["Kumpi pääte: -ssa vai -ssä?"],
      mistakes: ["Saying 'Helsingissa' instead of 'Helsingissä' (words with only e/i take front endings ä/ö/y)."],
      quiz: { q: "Which ending goes with 'kesä' (summer)?", options: ["kesälla", "kesällä", "kesässa"], ans: 1, exp: "'kesä' has front vowel ä → uses -llä (kesällä)." },
    },
    {
      id: "kpt",
      title: "9. KPT Consonant Gradation (Astevaihtelu)",
      level: "A1",
      en: "When an ending closes a syllable (like -n, -ssa, -lla), strong k, p, t often soften: kk→k, pp→p, tt→t, k→(disappears), p→v, t→d, nt→nn, nk→ng.",
      fi: "K, p ja t muuttuvat usein heikoksi, kun sanaan tulee pääte: kukka → kukan, pankki → pankissa, katu → kadulla.",
      pos: ["pankki → pankissa (in the bank)", "kauppa → kaupassa (in the shop)", "katu → kadulla (on the street)", "Helsinki → Helsingissä"],
      neg: [],
      q: ["Missä pankissa? (In which bank?)"],
      mistakes: ["Keeping double consonants in closed syllables ('kauppassa' → should be 'kaupassa')."],
      quiz: { q: "What is 'in the shop' from 'kauppa'?", options: ["kauppassa", "kaupassa", "kauppaan"], ans: 1, exp: "pp softens to p → kaupassa." },
    },
    {
      id: "genitive",
      title: "10. Genitive Case (-n)",
      level: "A1",
      en: "The genitive ending is -n. It shows possession ('Anna's book' = Annan kirja), is used with many postpositions ('talon edessä' = in front of the house), and marks a completed whole object ('Ostan auton').",
      fi: "Genetiivin pääte on -n. Se kertoo omistajan (minun kirja, Suomen lippu) ja toimii postpositioiden kanssa.",
      pos: ["Annan kahvi (Anna's coffee)", "Suomen kieli (Finnish language)", "Opettajan nimi (The teacher's name)"],
      neg: [],
      q: ["Kenen kirja tämä on? (Whose book is this?)"],
      mistakes: ["Forgetting KPT gradation before -n (kauppa → kaupan, Helsinki → Helsingin)."],
      quiz: { q: "How do you say 'Finland's winter' (Suomi + talvi)?", options: ["Suomin talvi", "Suomen talvi", "Suomea talvi"], ans: 1, exp: "Suomi has stem Suome- → Suomen talvi." },
    },
    {
      id: "partitive",
      title: "11. Partitive Case (-a/-ä, -ta/-tä)",
      level: "A1",
      en: "The partitive is everywhere in Finnish! Use it: 1) After numbers 2+ (kaksi kahvia), 2) In negative sentences (En juo kahvia), 3) For uncountable substances (Juon vettä), 4) With feeling/ongoing verbs (Rakastan sinua, Puhun suomea).",
      fi: "Partitiivia käytetään numeroiden jälkeen (kaksi autoa), kieltolauseessa (en osta leipää) ja ainesanojen kanssa (juon kahvia).",
      pos: ["Kaksi kahvia, kiitos. (Two coffees, please.)", "Puhun vähän suomea. (I speak a little Finnish.)", "Syön keittoa. (I am eating soup.)"],
      neg: ["Minulla ei ole aikaa. (I don't have time.)", "En ymmärrä tätä sanaa. (I don't understand this word.)"],
      q: ["Puhutko suomea? (Do you speak Finnish?)"],
      mistakes: ["Using nominative after numbers ('kaksi kahvi' → must be 'kaksi kahvia')."],
      quiz: { q: "Choose the correct phrase for 'two coffees':", options: ["kaksi kahvi", "kaksi kahvia", "kaksi kahvit"], ans: 1, exp: "Numbers 2 and higher always take singular partitive." },
    },
    {
      id: "inessive",
      title: "12. Inessive Case (-ssa / -ssä = 'In')",
      level: "A1",
      en: "Answers 'Missä?' (Where?). Means 'inside' or 'in' (a building, city, country). Uses weak KPT stem + -ssa/-ssä.",
      fi: "Inessiivi (-ssa/-ssä) vastaa kysymykseen 'Missä?'. Esimerkiksi: Suomessa, kaupassa, koulussa.",
      pos: ["Asun Suomessa. (I live in Finland.)", "Olen töissä / koulussa. (I am at work / at school.)", "Kahvi on kupissa. (The coffee is in the cup.)"],
      neg: ["En ole vielä kotona / toimistossa."],
      q: ["Missä sinä asut? (Where do you live?)"],
      mistakes: ["Remember Tampere and a few cities use -lla (Tampereella), while Helsinki/Turku/Oulu use -ssa (Helsingissä, Turussa, Oulussa)."],
      quiz: { q: "How do you say 'in Turku'?", options: ["Turkussa", "Turussa", "Turkuun"], ans: 1, exp: "KPT: k disappears in Turku → Turussa." },
    },
    {
      id: "elative",
      title: "13. Elative Case (-sta / -stä = 'From / About')",
      level: "A1",
      en: "Answers 'Mistä?' (Where from? / About what?). Used for coming out of a place, origin, and talking 'about' a topic.",
      fi: "Elatiivi (-sta/-stä) vastaa kysymykseen 'Mistä?'. Esimerkiksi: Tulen kaupasta. Pidän kahvista.",
      pos: ["Tulen kotoa / koulusta. (I am coming from home / school.)", "Olen kotoisin Nepalista. (I am from Nepal.)", "Pidän tästä kirjasta. (I like this book.)"],
      neg: ["En pidä kylmästä säästä. (I don't like cold weather.)"],
      q: ["Mistä sinä olet kotoisin? (Where are you from?)"],
      mistakes: ["Forgetting that 'pitää' (to like) requires -sta/-stä ('Pidän kahvista')."],
      quiz: { q: "How do you say 'I like Finnish coffee'?", options: ["Pidän kahvi.", "Pidän kahvista.", "Pidän kahvissa."], ans: 1, exp: "'pitää' always takes elative -sta/-stä." },
    },
    {
      id: "illative",
      title: "14. Illative Case (-Vn / -hVn / -seen = 'Into / To')",
      level: "A1",
      en: "Answers 'Mihin?' (Where to?). Usually doubles the last vowel + n (talo → taloon, kauppa → kauppaan). Keeps the STRONG KPT stem!",
      fi: "Illatiivi vastaa kysymykseen 'Mihin?'. Usein viimeinen vokaali pitenee + n: koulu → kouluun, kauppa → kauppaan.",
      pos: ["Menen kauppaan. (I am going to the shop.)", "Matkustan Suomeen. (I am traveling to Finland.)", "Menen kotiin. (I am going home.)"],
      neg: ["En mene tänään kouluun."],
      q: ["Mihin sinä menet? (Where are you going?)"],
      mistakes: ["Softening KPT in illative — illative stays STRONG (kauppa → kauppaan, not kaubaan!)."],
      quiz: { q: "How do you say 'I am going to Helsinki'?", options: ["Menen Helsingissä.", "Menen Helsinkiin.", "Menen Helsingin."], ans: 1, exp: "Illative doubles the final 'i' + n → Helsinkiin." },
    },
    {
      id: "sentence-structure",
      title: "15. Basic Sentence Structure",
      level: "A1",
      en: "Standard neutral order is Subject + Verb + Object/Place/Time (Minä asun Helsingissä). When a time or place word starts the sentence ('Tänään...'), the subject often stays before the verb, or flips in existential sentences ('Pöydällä on kirja' = There is a book on the table).",
      fi: "Tavallinen sanajärjestys on: Tekijä + Verbi + Muut sanat (Minä luen kirjaa). Eksistentiaalilauseessa paikka tulee ensin: Huoneessa on pöytä.",
      pos: ["Minä opiskelen suomea tänään. (I study Finnish today.)", "Pöydällä on kuppi kahvia. (There is a cup of coffee on the table.)"],
      neg: ["Pöydällä ei ole kuppia."],
      q: ["Mitä pöydällä on? (What is on the table?)"],
      mistakes: ["Putting 'on' before the place in 'There is...' sentences."],
      quiz: { q: "Which means 'There is a cat in the garden'?", options: ["Kissa on puutarhassa.", "Puutarhassa on kissa.", "On kissa puutarhassa."], ans: 1, exp: "Place first (Puutarhassa on kissa) = 'There is a cat in the garden'." },
    },
    {
      id: "questions-negatives",
      title: "16. Questions (-ko/-kö) & Negatives (en/et/ei)",
      level: "A1",
      en: "For yes/no questions, move the verb to the front and attach -ko/-kö! Question words (mikä, kuka, missä, milloin, miksi) go at the front without -ko/-kö. For negatives, conjugate 'ei' (en, et, ei, emme, ette, eivät) + verb stem.",
      fi: "Kyllä/ei-kysymyksessä verbiin tulee pääte -ko/-kö: Asutko täällä? Kieltolauseessa käytetään en/et/ei + verbin vartalo.",
      pos: ["Asutko Helsingissä? — Kyllä asun. / En asu.", "Missä bussi on? (Where is the bus?)"],
      neg: ["En tiedä. (I don't know.)", "Et ymmärrä. / Hän ei tule."],
      q: ["Puhutko englantia? (Do you speak English?)", "Voitko auttaa? (Can you help?)"],
      mistakes: ["Adding -ko to question words ('Missäkö asut?' changes tone — use 'Missä asut?')."],
      quiz: { q: "How do you ask 'Do you live in Finland?'", options: ["Sinä asut Suomessa?", "Asutko sinä Suomessa?", "Missä asutko Suomessa?"], ans: 1, exp: "Verb first + -ko: Asutko sinä Suomessa?" },
    },
    {
      id: "spoken-finnish",
      title: "17. Common Spoken Finnish (Puhekieli vs Kirjakieli)",
      level: "A1",
      en: "Written Finnish (kirjakieli) is used in books, news, and official letters. Everyday speech (puhekieli) shortens pronouns and verb endings: 'Minä olen' → 'Mä oon', 'Minulla on' → 'Mulla on', 'Me menemme' → 'Me mennään'.",
      fi: "Kirjakieli on virallinen muoto, puhekieli on arkipuhetta. Molemmat on hyvä tunnistaa!",
      pos: ["Minä olen → Mä oon", "Minulla on → Mulla on", "Me puhumme → Me puhutaan", "Tämä on → Tää on", "Seitsemän → Seittemän"],
      neg: ["Minä en tiedä → Mä en tiiä"],
      q: ["Mitä sinulle kuuluu? → Mitä sulle kuuluu?"],
      mistakes: ["Thinking spoken Finnish has only one single rule — it varies slightly by region (Helsinki, Tampere, Turku, Oulu)!"],
      quiz: { q: "What is 'Mulla on nälkä' in standard written Finnish?", options: ["Minä olen nälkä.", "Minulla on nälkä.", "Meillä on nälkä."], ans: 1, exp: "Mulla on = Minulla on (I am hungry)." },
    },
  ];

  const SAMPLE_READINGS = [
    {
      id: "r_cafe",
      title: "Kahvilassa (At a Café)",
      text_type: "Everyday Dialogue",
      sentences: [
        { fi: "Hei! Saisinko yhden ison kahvin ja korvapuustin?", en: "Hi! Could I have one large coffee and a cinnamon bun?", spoken_fi: "Moi! Saisinko yhen ison kahvin ja korvapuustin?" },
        { fi: "Totta kai. Otatko maitoa?", en: "Of course. Would you like milk?", spoken_fi: "Joo totta kai. Otatko maitoo?" },
        { fi: "Kyllä kiitos, kauramaitoa.", en: "Yes please, oat milk.", spoken_fi: "Joo kiitos, kauramaitoo." },
        { fi: "Se tekee kuusi euroa viisikymmentä senttiä.", en: "That comes to six euros fifty cents.", spoken_fi: "Se tekee kuus viiskyt." },
        { fi: "Maksan kortilla. Kiitos paljon!", en: "I'll pay by card. Thank you very much!", spoken_fi: "Mä maksan kortilla. Kiitti paljon!" },
      ],
      vocabulary: [
        { word: "saisinko", base_form: "saada", en: "could I have (polite)" },
        { word: "korvapuustin", base_form: "korvapuusti", en: "cinnamon bun (genitive)" },
        { word: "kauramaitoa", base_form: "kauramaito", en: "oat milk (partitive)" },
        { word: "kortilla", base_form: "kortti", en: "by card (adessive)" },
      ],
      grammar_note: "Notice 'kauramaitoa' (partitive for uncountable liquids) and 'kortilla' (-lla = by/with an instrument).",
      questions: [
        { q_fi: "Mitä asiakas tilaa?", q_en: "What does the customer order?", options: ["Teetä ja leipää", "Kahvin ja korvapuustin", "Vettä ja keittoa"], answer_index: 1, explanation: "The customer asks for 'yhden ison kahvin ja korvapuustin'." },
      ],
    },
    {
      id: "r_kela",
      title: "Viesti koulusta (Message from Finnish Class)",
      text_type: "School Message",
      sentences: [
        { fi: "Hei opiskelijat!", en: "Hello students!", spoken_fi: null },
        { fi: "Huomenna kurssi alkaa kello yhdeksän luokassa 204.", en: "Tomorrow the course starts at 9 o'clock in room 204.", spoken_fi: "Huomenna kurssi alkaa yheksältä luokassa 204." },
        { fi: "Muistakaa tehdä kotitehtävä sivulta 34.", en: "Remember to do the homework from page 34.", spoken_fi: null },
        { fi: "Jos olet sairas, lähetä viesti opettajalle ennen tuntia.", en: "If you are sick, send a message to the teacher before class.", spoken_fi: "Jos oot kipee, laita viestiä opettajalle ennen tuntia." },
      ],
      vocabulary: [
        { word: "huomenna", base_form: "huomenna", en: "tomorrow" },
        { word: "kotitehtävä", base_form: "kotitehtävä", en: "homework" },
        { word: "sivulta", base_form: "sivu", en: "from page" },
        { word: "ennen tuntia", base_form: "tunti", en: "before the lesson" },
      ],
      grammar_note: "'luokassa' uses inessive (-ssa = in the classroom), and 'sivulta' uses ablative (-lta = from the page).",
      questions: [
        { q_fi: "Mihin aikaan kurssi alkaa huomenna?", q_en: "What time does class start tomorrow?", options: ["Kello kahdeksan", "Kello yhdeksän", "Kello kymmenen"], answer_index: 1, explanation: "The message states: 'kurssi alkaa kello yhdeksän'." },
      ],
    },
  ];

  const SAMPLE_LISTENING = [
    {
      id: "l_bus",
      title: "Bussipysäkillä (At the Bus Stop)",
      situation: "Asking for directions at a bus stop",
      lines: [
        { speaker: "Sinä", fi: "Anteeksi, meneekö tämä bussi keskustaan?", en: "Excuse me, does this bus go to the city center?" },
        { speaker: "Paikallinen", fi: "Kyllä menee! Bussi numero kuusi menee rautatieasemalle.", en: "Yes it does! Bus number six goes to the railway station." },
        { speaker: "Sinä", fi: "Kuinka kauan matka kestää?", en: "How long does the trip take?" },
        { speaker: "Paikallinen", fi: "Noin viisitoista minuuttia.", en: "About fifteen minutes." },
        { speaker: "Sinä", fi: "Kiitos paljon avusta!", en: "Thank you very much for your help!" },
      ],
      vocabulary: [
        { word: "keskustaan", base_form: "keskusta", en: "to the city center" },
        { word: "rautatieasemalle", base_form: "rautatieasema", en: "to the railway station" },
        { word: "kestää", base_form: "kestää", en: "to last / take (time)" },
      ],
      questions: [
        { q_en: "How long does the bus trip take?", q_fi: "Kuinka kauan matka kestää?", options: ["5 minutes", "15 minutes", "50 minutes"], answer_index: 1 },
      ],
    },
    {
      id: "l_market",
      title: "Kaupassa (In the Supermarket)",
      situation: "Paying at the grocery checkout",
      lines: [
        { speaker: "Kassa", fi: "Hei! Onko sinulla bonuskorttia?", en: "Hi! Do you have a bonus card?" },
        { speaker: "Asiakas", fi: "Ei ole, kiitos.", en: "No I don't, thanks." },
        { speaker: "Kassa", fi: "Tarvitsetko pussia tai kuittia?", en: "Do you need a bag or a receipt?" },
        { speaker: "Asiakas", fi: "Kuitti riittää, minulla on oma kassi.", en: "The receipt is enough, I have my own bag." },
        { speaker: "Kassa", fi: "Hyvä juttu, kiitos ja mukavaa päivää!", en: "Great, thank you and have a nice day!" },
      ],
      vocabulary: [
        { word: "bonuskorttia", base_form: "bonuskortti", en: "bonus card (partitive)" },
        { word: "riittää", base_form: "riittää", en: "is enough" },
        { word: "oma kassi", base_form: "kassi", en: "own bag" },
      ],
      questions: [
        { q_en: "Does the customer need a bag?", q_fi: "Tarvitseeko asiakas pussia?", options: ["Yes, two bags", "No, they have their own bag", "Only a paper bag"], answer_index: 1 },
      ],
    },
  ];

  const SPEAKING_DRILLS = [
    { group: "Long vs. Short Vowels", items: [
      { fi: "tuli — tuuli", en: "fire — wind", tip: "Hold 'uu' twice as long in tuuli." },
      { fi: "tapa — tapaa", en: "habit — meets", tip: "Stretch the final 'aa' clearly." },
      { fi: "sata — sataa", en: "hundred — it rains", tip: "First syllable stressed in both; stretch final 'aa'." },
    ]},
    { group: "Double Consonants", items: [
      { fi: "kuka — kukka", en: "who — flower", tip: "Pause briefly on 'kk' before releasing." },
      { fi: "mato — matto", en: "worm — rug/carpet", tip: "Hold the 'tt' stop slightly longer." },
      { fi: "tili — tilli", en: "account — dill", tip: "Hold the 'll' sound clearly." },
    ]},
    { group: "Everyday A1 Sentences", items: [
      { fi: "Hei! Minun nimeni on Binod. Opiskelen suomea.", en: "Hi! My name is Binod. I am studying Finnish.", tip: "Stress the FIRST syllable of every word." },
      { fi: "Anteeksi, voitko puhua vähän hitaammin?", en: "Excuse me, can you speak a bit slower?", tip: "Useful phrase in every Finnish class!" },
      { fi: "Saisinko yhden kahvin, kiitos?", en: "Could I have one coffee, please?", tip: "Polite everyday café request." },
    ]},
  ];

  const ROLEPLAY_SCENARIOS = [
    { id: "rp_cafe", title: "At a Café (3 turns • Easy)", turns: 3, prompt: "Let's do a beginner A1 Finnish roleplay at a café in Helsinki. Start as the barista greeting me in simple Finnish (with a tiny English hint in parentheses). Keep it to 3 friendly turns and gently help if I make a mistake." },
    { id: "rp_teacher", title: "Talking to Your Teacher (4 turns • Easy)", turns: 4, prompt: "Let's do a beginner A1 Finnish roleplay where you are my Finnish teacher in class. Ask me a simple question about my weekend or homework in Finnish (with an English hint). Gently correct my Finnish replies." },
    { id: "rp_doctor", title: "Doctor's Reception (5 turns • A1–A2)", turns: 5, prompt: "Let's practice a simple A1/A2 Finnish roleplay at a health center reception (terveysasema). You are the receptionist; greet me and ask how you can help." },
    { id: "rp_work", title: "Small Talk at Work (5 turns • A1–A2)", turns: 5, prompt: "Let's practice friendly workplace small talk in simple Finnish (coffee break / kahvitauko). Start with a warm Finnish greeting and a simple question." },
  ];

  function getTodayVocabPack() {
    const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_VOCAB_PACKS.length;
    return DAILY_VOCAB_PACKS[dayIndex];
  }

  function getTodayGrammarTopic() {
    const dayIndex = Math.floor(Date.now() / 86400000) % GRAMMAR_TOPICS.length;
    return GRAMMAR_TOPICS[dayIndex];
  }

  window.FinnishLabCurriculum = {
    DAILY_VOCAB_PACKS,
    GRAMMAR_TOPICS,
    SAMPLE_READINGS,
    SAMPLE_LISTENING,
    SPEAKING_DRILLS,
    ROLEPLAY_SCENARIOS,
    getTodayVocabPack,
    getTodayGrammarTopic,
  };
})();
