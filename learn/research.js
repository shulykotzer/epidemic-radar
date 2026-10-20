"use strict";
/* Research file: a structured group worksheet → autosaved → slides → PDF.
 * ?id=<disease>  preselects a disease
 * ?blank=1       renders the empty printable worksheet (used to build pdf/research-worksheet.pdf) */
const $ = (s, el = document) => el.querySelector(s);
const esc = OR.esc;
const KEY = "research-file-v1";
const params = new URLSearchParams(location.search);
const BLANK = params.has("blank");
const EXAMPLE_MODE = params.has("example");
const PRINT_MODE = params.has("print"); // used by scripts/build_pdfs.py: render the deck for printing

const HISTORY = ["המוות השחור (1347)", "אבעבועות שחורות והחיסון הראשון (1796)", "כולרה בלונדון (1854)", "השפעת הספרדית (1918)", "פוליו (1950 ואילך)", "אבולה במערב אפריקה (2014–2016)", "קורונה (2020–2023)"];

/* Each field: f = key, q = full guiding question, s = short label for the slide, t = type, opts = select options, lines = blank lines on paper */
const SECTIONS = [
  { id: "agent", n: 1, t: "הכירו את המחלה", hint: "מקורות: עמוד המחלה ב\"חקר מגפות\", MedlinePlus ופרק 1.",
    fields: [
      { f: "a1", s: "גורם המחלה", q: "מה גורם המחלה (נגיף, חיידק, טפיל או לא ידוע)? מה שמו?", lines: 2 },
      { f: "a2", s: "דרך ההדבקה", q: "איך המחלה עוברת: מאדם לאדם, מבעל חיים, דרך יתושים, מים או מזון?", lines: 3 },
      { f: "a3", s: "דגירה ותסמינים", q: "מה תקופת הדגירה? מה התסמינים העיקריים? מה שיעור התמותה?", lines: 3 },
    ] },
  { id: "where", n: 2, t: "איפה ומתי?", hint: "היעזרו בגרף \"דיווחים לפי שנה\" וברשימת המדינות.",
    fields: [
      { f: "b1", s: "גלי התפרצות", q: "לפי גרף הדיווחים: באילו שנים היו גלי הדיווחים הגדולים?", lines: 2 },
      { f: "b2", s: "אזורים שנפגעו", q: "באילו מדינות או אזורים דווח הכי הרבה? למה לדעתכם דווקא שם (אקלים, בעלי חיים, תשתיות, צפיפות)?", lines: 3 },
      { f: "b3", s: "סיווג", q: "איך הייתם מסווגים את המחלה היום?", t: "select", opts: ["ספורדית", "אנדמית", "התפרצות", "אפידמיה", "פנדמיה"] },
      { f: "b4", s: "נימוק הסיווג", q: "נמקו את הסיווג בעזרת ההגדרות מפרק 1.", lines: 2 },
    ] },
  { id: "defense", n: 3, t: "קווי ההגנה של הגוף", hint: "חזרו לפרק 2: שלושת קווי ההגנה.",
    fields: [
      { f: "c1", s: "איך הפתוגן עובר את קו ההגנה הראשון", q: "דרך איזה \"שער\" הפתוגן עובר את קו ההגנה הראשון: עור, ריריות, דרכי נשימה, מערכת העיכול או עקיצה?", lines: 2 },
      { f: "c2", s: "קווי הגנה שני ושלישי", q: "מה קורה בקו ההגנה השני ובקו ההגנה השלישי כשהגוף נלחם במחלה? ציינו לפחות שני מנגנונים.", lines: 4 },
      { f: "c3", s: "חיזוק קו ההגנה הראשון", q: "איזה אמצעי חיצוני (כפפות, מסכה, רשת נגד יתושים, מים נקיים, היגיינה) מחזק את קו ההגנה הראשון מול המחלה הזאת?", lines: 2 },
    ] },
  { id: "vaccine", n: 4, t: "חיסון וחסינות", hint: "פרק 4, ונתוני ארגון הבריאות העולמי במכ״ם.",
    fields: [
      { f: "d1", s: "האם יש חיסון?", q: "האם קיים חיסון למחלה?", t: "select", opts: ["כן, חיסון שגרה בישראל", "כן, למטיילים או לקבוצות סיכון", "אין חיסון מאושר"] },
      { f: "d2", s: "סוג החיסון / למה אין", q: "אם יש חיסון: מאיזה סוג הוא (חי מוחלש, מומת, תת-יחידה, טוקסואיד, וקטור נגיפי, mRNA)? האם החסינות פעילה או סבילה? אם אין חיסון: מה לדעתכם הסיבה?", lines: 4 },
      { f: "d3", s: "חסינות בישראל", q: "מה אחוז ההתחסנות בישראל, אם יש נתון? האם הוא מעל סף חסינות העדר? מה קורה בקהילות שבהן הכיסוי נמוך?", lines: 3 },
    ] },
  { id: "risk", n: 5, t: "הסיכון לישראל", hint: "חפשו את המחלה במכ״ם ופתחו את \"פרטים מלאים\".",
    fields: [
      { f: "e1", s: "הערכת המכ״ם", q: "מה רמת הסיכון שהמכ״ם נתן למחלה?", t: "select", opts: ["נמוך מאוד", "נמוך", "בינוני", "גבוה", "המחלה לא מופיעה כרגע במכ״ם"] },
      { f: "e2", s: "ההערכה שלנו", q: "האם אתם מסכימים עם ההערכה? נמקו בעזרת לפחות שני גורמים: קישוריות לישראל, דרך ההדבקה, וקטור בישראל, חסינות האוכלוסייה.", lines: 5 },
    ] },
  { id: "history", n: 6, t: "השוואה היסטורית", hint: "פרק 3: מגפות שעיצבו את ההיסטוריה.",
    fields: [
      { f: "f1", s: "המגפה שבחרנו להשוואה", q: "בחרו מגפה היסטורית להשוואה:", t: "select", opts: HISTORY },
      { f: "f2", s: "דומה ושונה", q: "מה דומה ומה שונה בין שתי המגפות (גורם, דרך הדבקה, מה ידעו, אמצעי הגנה)? מה מהעבר יכול לעזור גם היום?", lines: 5 },
    ] },
  { id: "recommend", n: 7, t: "הממצאים וההמלצות שלנו", hint: "זה השקף החשוב ביותר במצגת.",
    fields: [
      { f: "g0", s: "הממצא המפתיע", q: "מה הדבר הכי מפתיע שגיליתם במחקר?", lines: 2 },
      { f: "g1", s: "המלצה ברמת האדם", q: "המלצה ברמת האדם (מה כל אחד יכול לעשות):", lines: 2 },
      { f: "g2", s: "המלצה ברמת הקהילה", q: "המלצה ברמת הקהילה:", lines: 2 },
      { f: "g3", s: "המלצה ברמת המדינה והעולם", q: "המלצה ברמת המדינה או העולם:", lines: 2 },
    ] },
  { id: "sources", n: 8, t: "מקורות", hint: "רשמו כל אתר, מאמר או סרטון שהשתמשתם בו.",
    fields: [{ f: "h1", s: "מקורות", q: "רשימת המקורות שלנו:", lines: 4 }] },
];

/* A complete model answer, shown with ?example=1 (never saved over the group's own file). */
const EXAMPLE = {
  names: "דוגמה למורה", cls: "י'", disease: "ebola", date: "2026-10-20",
  a1: "נגיף אבולה, ממשפחת הפילו-וירוסים (Filoviridae). יש כמה זנים: זאיר, סודן ובונדיבוגיו. ההתפרצות הנוכחית בקונגו היא של זן בונדיבוגיו.",
  a2: "במקור הנגיף עובר מעטלפי פירות לאדם. מאדם לאדם הוא עובר במגע ישיר בדם ובנוזלי גוף של חולה עם תסמינים, או של נפטר. הוא לא עובר באוויר.",
  a3: "תקופת דגירה של 2–21 ימים. התסמינים הם חום, חולשה, כאבי שרירים, הקאות ושלשולים, ולפעמים דימומים. שיעור התמותה הוא 25%–90%, לפי הזן ולפי הטיפול.",
  b1: "לפי הגרף יש שני גלים גדולים: 2014–2016 (מערב אפריקה) ו-2018–2020 (צפון-מזרח קונגו). ב-2026 יש גל חדש בקונגו ובאוגנדה.",
  b2: "רוב הדיווחים הם מהרפובליקה הדמוקרטית של קונגו ומאוגנדה. באזורים האלה יש יערות גשם שבהם חיים עטלפי הפירות, צפיפות במחנות פליטים, ומערכת בריאות חלשה שמקשה על בידוד חולים.",
  b3: "התפרצות",
  b4: "יש עלייה חדה במספר המקרים באזור מוגבל (מחוזות בקונגו ובאוגנדה). זו לא אפידמיה רחבה כמו ב-2014, ובוודאי לא פנדמיה.",
  c1: "הנגיף חודר דרך ריריות (עיניים, אף, פה) ודרך פצעים או חתכים בעור, כלומר דרך נקודות התורפה של קו ההגנה הראשון.",
  c2: "בקו השני תאים בולעים מנסים לבלוע את הנגיף, אבל אבולה דווקא מדביקה אותם ומשתמשת בהם להתפשט. בנוסף היא מעכבת את פעולת האינטרפרון. בקו השלישי לימפוציטים מסוג B מייצרים נוגדנים, ומי ששורד מפתח חסינות. הבעיה היא שהתגובה הראשונית לוקחת זמן, והנגיף מתרבה מהר יותר.",
  c3: "ציוד מגן מלא לצוותים (כפפות, חלוק, מסכה ומשקפי מגן), שטיפת ידיים, וקבורה בטוחה שבה לא נוגעים בגופה.",
  d1: "אין חיסון מאושר",
  d2: "לזן זאיר יש חיסון מסוג וקטור נגיפי (Ervebo), שמעורר חסינות פעילה מלאכותית. לזן בונדיבוגיו אין חיסון מאושר, כנראה כי ההתפרצויות שלו נדירות וקטנות, וקשה לבצע ניסויים קליניים כשיש מעט חולים.",
  d3: "אין חיסון שגרה לאבולה בישראל, ואין חסינות באוכלוסייה. אין כאן מושג של סף חסינות עדר, כי אף אחד לא מחוסן.",
  e1: "נמוך",
  e2: "אנחנו מסכימים. אין טיסות ישירות מקונגו לישראל, הנגיף עובר רק במגע עם חולה שיש לו תסמינים (וחולה כזה בדרך כלל לא טס), ובתי החולים בישראל ערוכים לבידוד. מצד שני, אין חסינות ואין חיסון, ולכן אם יגיע חולה, קו ההגנה היחיד הוא בידוד.",
  f1: "אבולה במערב אפריקה (2014–2016)",
  f2: "דומה: אותה משפחת נגיפים, אותה דרך הדבקה, ואותם אמצעים של בידוד, איתור מגעים וקבורה בטוחה. שונה: ב-2014 לא היה חיסון בכלל, והנגיף הגיע לערים גדולות. היום יש ניסיון מהעבר וחיסון לזן זאיר, אבל לא לזן הנוכחי.",
  g0: "למרות שאבולה היא אחת המחלות הקטלניות בעולם, הסיכון שתגיע לישראל נמוך. קטלניות ויכולת התפשטות הן שני דברים שונים.",
  g1: "מטיילים לאזורי ההתפרצות יימנעו ממגע עם חולים ועם בעלי חיים, ויפנו לרופא אם הם מפתחים חום עד 21 יום אחרי שחזרו.",
  g2: "צוותים רפואיים יתורגלו בלבישת ציוד מגן ובקבלת חולה חשוד.",
  g3: "השקעה בפיתוח חיסון לזן בונדיבוגיו, ותמיכה בבדיקות בגבולות באפריקה.",
  h1: "מכ״ם מגפות ישראל ועמוד \"חקר מגפות: אבולה\" (נתוני WHO)\nMedlinePlus: Ebola\nWHO Disease Outbreak News, 8 באוקטובר 2026",
};

let state = {};
let KB = null;
const load = () => { try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { state = {}; } };
const save = () => {
  if (EXAMPLE_MODE) { $("#saved").textContent = "קובץ דוגמה: השינויים לא נשמרים"; return; }
  try { localStorage.setItem(KEY, JSON.stringify(state)); $("#saved").textContent = "נשמר ✓ " + new Date().toLocaleTimeString("he-IL", { timeStyle: "short" }); } catch { $("#saved").textContent = "שמירה אוטומטית לא זמינה בדפדפן הזה. הורידו גיבוי."; }
};

/* ------------------------------------------------------------ form */
function fieldHTML(fd) {
  const v = state[fd.f] || "";
  if (fd.t === "select") return `<label class="fld"><span>${esc(fd.q)}</span><select data-f="${fd.f}"><option value="">— בחרו —</option>${fd.opts.map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`;
  return `<label class="fld"><span>${esc(fd.q)}</span><textarea data-f="${fd.f}" rows="${Math.max(2, fd.lines || 3)}">${esc(v)}</textarea></label>`;
}
function renderForm() {
  $("#sections").innerHTML = SECTIONS.map((s) => `<section class="r-card" id="sec-${s.id}">
    <div class="r-head"><span class="r-n">${s.n}</span><h2>${esc(s.t)}</h2></div>
    <p class="hint">💡 ${esc(s.hint)}</p>
    ${s.fields.map(fieldHTML).join("")}</section>`).join("");
  document.querySelectorAll("[data-f]").forEach((el) => {
    if (state[el.dataset.f] != null && el.tagName !== "SELECT" && el.type !== "file") el.value = state[el.dataset.f];
    if (el.tagName === "SELECT" && state[el.dataset.f]) el.value = state[el.dataset.f];
    el.addEventListener("input", () => { state[el.dataset.f] = el.value; save(); if (el.dataset.f === "disease") dataPanel(); });
  });
}

async function dataPanel() {
  const d = KB && KB.diseases.find((x) => x.id === state.disease);
  const p = $("#dataPanel");
  if (!d) { p.hidden = true; return; }
  p.hidden = false;
  p.innerHTML = `<b>נקודות פתיחה למחקר על ${esc(d.he)}</b>
    <div class="dp-links">
      <a class="btn" href="../disease.html?id=${d.id}" target="_blank">היסטוריית הדיווחים והגרף ←</a>
      <a class="btn" href="../index.html" target="_blank">המכ״ם: הערכת סיכון עדכנית ←</a>
    </div>
    <p class="muted">שימו לב: עליכם לנסח את התשובות במילים שלכם ולהסביר אותן, ולא רק להעתיק נתונים.</p>`;
}

/* ------------------------------------------------------------ slides */
const answer = (fd) => {
  const v = (state[fd.f] || "").trim();
  return v ? `<div class="sl-f"><b>${esc(fd.s)}</b><p>${esc(v).replace(/\n/g, "<br>")}</p></div>` : "";
};
function buildSlides() {
  const d = KB && KB.diseases.find((x) => x.id === state.disease);
  const title = d ? d.he : "המגפה שלנו";
  const slides = [`<section class="slide title-slide"><div class="sl-kicker">תיק חקירה של מגפה</div><h1>${esc(title)}</h1>
    ${d ? `<div class="sl-en">${esc(d.en)}</div>` : ""}
    <div class="sl-names">${esc(state.names || "")}</div><div class="sl-meta">${esc(state.cls || "")}${state.date ? " · " + esc(new Date(state.date).toLocaleDateString("he-IL")) : ""}</div></section>`];
  for (const s of SECTIONS) {
    const body = s.fields.map(answer).join("");
    slides.push(`<section class="slide"><div class="sl-h"><span class="r-n">${s.n}</span><h2>${esc(s.t)}</h2><span class="sl-t">${esc(title)}</span></div>
      <div class="sl-body${s.fields.length > 2 ? " cols" : ""}">${body || `<p class="muted">(עוד לא מולא)</p>`}</div></section>`);
  }
  $("#slides").innerHTML = slides.join("");
  return slides.length;
}

let cur = 0, total = 0;
function show(i) {
  cur = Math.max(0, Math.min(total - 1, i));
  document.querySelectorAll(".slide").forEach((s, k) => s.classList.toggle("on", k === cur));
  $("#counter").textContent = `${cur + 1} / ${total}`;
}
function present() {
  total = buildSlides();
  $("#deck").hidden = false; document.body.classList.add("presenting");
  show(0);
  document.documentElement.requestFullscreen?.().catch(() => {});
}
function exitDeck() {
  $("#deck").hidden = true; document.body.classList.remove("presenting");
  if (document.fullscreenElement) document.exitFullscreen();
}
function printPDF() {
  // First time only: remind students that the print dialog is how a PDF is saved.
  let seen = false;
  try { seen = !!localStorage.getItem("pdf-help-seen"); localStorage.setItem("pdf-help-seen", "1"); } catch { /* private mode */ }
  if (!seen && !confirm("בחלון שייפתח בחרו \"שמירה כ-PDF\" במקום מדפסת.\nבאייפון: לחצו על כפתור השיתוף ובחרו \"שמירה בקבצים\".\n\nלהמשיך?")) {
    $("#help").open = true; $("#help").scrollIntoView({ behavior: "smooth" }); return;
  }
  buildSlides();
  document.body.classList.add("print-deck");
  $("#deck").hidden = false;
  const d = KB && KB.diseases.find((x) => x.id === state.disease);
  const old = document.title;
  document.title = "תיק חקירה - " + (d ? d.he : "מגפה") + (state.names ? " - " + state.names : "");
  setTimeout(() => {
    window.print();
    document.title = old;
    document.body.classList.remove("print-deck");
    $("#deck").hidden = true;
  }, 50);
}

/* ------------------------------------------------------------ blank printable worksheet */
function renderBlank() {
  document.body.classList.add("blank");
  document.body.innerHTML = `<main class="ws">
    <header class="ws-h"><div><div class="sl-kicker">מגפות וחיסונים · יחידת לימוד</div><h1>תיק חקירה של מגפה</h1></div>
      <div class="ws-meta"><div>שמות: <span class="ws-line"></span></div><div>כיתה: <span class="ws-line short"></span> תאריך: <span class="ws-line short"></span></div><div>המחלה שבחרנו: <span class="ws-line"></span></div></div></header>
    <p class="ws-intro">חקרו את המחלה בעזרת האתר: <b>מכ״ם המגפות</b> (הערכת סיכון עדכנית) ו<b>חקר מגפות</b> (היסטוריית הדיווחים מ-1996). ענו במילים שלכם. בסוף תציגו את הממצאים לכיתה במצגת.</p>
    ${SECTIONS.map((s) => `<section class="ws-s"><h2><span class="r-n">${s.n}</span>${esc(s.t)}</h2><p class="hint">${esc(s.hint)}</p>
      ${s.fields.map((fd) => `<div class="ws-q"><p>${esc(fd.q)}</p>${fd.t === "select" ? `<div class="ws-opts">${fd.opts.map((o) => `<span>☐ ${esc(o)}</span>`).join("")}</div>` : `<div class="ws-lines">${"<span></span>".repeat(fd.lines || 3)}</div>`}</div>`).join("")}</section>`).join("")}
    <footer class="ws-f">מכ״ם מגפות ישראל · מקורות: WHO, MedlinePlus, disease.sh</footer></main>`;
}

/* ------------------------------------------------------------ boot */
(async () => {
  if (BLANK) { renderBlank(); document.body.dataset.ready = "1"; return; }
  if (EXAMPLE_MODE) state = { ...EXAMPLE }; else load();
  KB = await OR.kb();
  const sel = $("#disease");
  sel.insertAdjacentHTML("beforeend", KB.diseases.filter((d) => d.mode !== "toxin").map((d) => `<option value="${d.id}">${esc(d.he)}</option>`).join(""));
  if (params.get("id") && !state.disease) state.disease = params.get("id");
  if (!state.date) state.date = new Date().toISOString().slice(0, 10);
  renderForm(); // also binds the group-details fields, which carry data-f too
  dataPanel();
  if (EXAMPLE_MODE) document.querySelector(".toolbar").insertAdjacentHTML("afterend", `<p class="note">זהו תיק חקירה לדוגמה (אבולה), שמראה לתלמידים איך נראית עבודה מלאה. השינויים כאן לא נשמרים. <a href="research.html">לתיק החקירה של הקבוצה ←</a></p>`);
  if (PRINT_MODE) { buildSlides(); document.body.classList.add("print-deck"); $("#deck").hidden = false; document.body.dataset.ready = "1"; }

  $("#present").addEventListener("click", present);
  $("#pdf").addEventListener("click", printPDF);
  $("#exit").addEventListener("click", exitDeck);
  $("#prev").addEventListener("click", () => show(cur - 1));
  $("#next").addEventListener("click", () => show(cur + 1));
  document.addEventListener("keydown", (e) => {
    if ($("#deck").hidden) return;
    if (e.key === "ArrowLeft" || e.key === " " || e.key === "PageDown") show(cur + 1);
    if (e.key === "ArrowRight" || e.key === "PageUp") show(cur - 1);
    if (e.key === "Escape") exitDeck();
  });
  $("#slides").addEventListener("click", (e) => { if (!$("#deck").hidden) show(e.clientX < innerWidth / 2 ? cur + 1 : cur - 1); });
  $("#clear").addEventListener("click", () => { if (confirm("למחוק את כל התשובות בתיק?")) { state = {}; save(); location.search = ""; } });
  $("#backup").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 1)], { type: "application/json" }));
    a.download = "research-" + (state.disease || "file") + ".json"; a.click();
  });
  $("#restore").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { state = JSON.parse(await f.text()); save(); location.reload(); } catch { alert("הקובץ לא תקין"); }
  });
})();
