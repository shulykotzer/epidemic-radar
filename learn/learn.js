"use strict";
/* Learning unit: auto-checked quizzes, R0 simulator, immune-response chart, history timeline. */
const $ = (s, el = document) => el.querySelector(s);
const esc = OR.esc;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

function renderQuiz(el) {
  const id = el.dataset.quiz, qs = QUIZ[id];
  const saved = store.get("quiz-" + id) || {};
  el.innerHTML = `<div class="quiz-h"><h3>בדקו את עצמכם</h3><span class="score" id="score-${id}"></span></div>` +
    qs.map((q, i) => `<fieldset class="qq" data-i="${i}">
      <legend><span class="qn">${i + 1}</span>${esc(q.q)}</legend>
      <div class="opts">${q.o.map((o, j) => `<button type="button" class="opt" data-j="${j}">${esc(o)}</button>`).join("")}</div>
      <div class="why" hidden></div></fieldset>`).join("") +
    `<button type="button" class="btn reset">איפוס התשובות</button>`;
  const mark = (fs, j) => {
    const i = +fs.dataset.i, q = qs[i];
    fs.querySelectorAll(".opt").forEach((b, k) => {
      b.disabled = true;
      if (k === q.a) b.classList.add("right");
      else if (k === j) b.classList.add("wrong");
    });
    const ok = j === q.a, why = fs.querySelector(".why");
    why.hidden = false;
    why.className = "why " + (ok ? "ok" : "no");
    why.innerHTML = `<b>${ok ? "✓ נכון!" : "✗ לא בדיוק."}</b> ${esc(q.why)}`;
  };
  el.querySelectorAll(".qq").forEach((fs) => {
    const i = fs.dataset.i;
    if (saved[i] != null) mark(fs, saved[i]);
    fs.addEventListener("click", (e) => {
      const b = e.target.closest(".opt");
      if (!b || b.disabled) return;
      saved[i] = +b.dataset.j; store.set("quiz-" + id, saved);
      mark(fs, +b.dataset.j); updateScore(id);
    });
  });
  el.querySelector(".reset").addEventListener("click", () => { store.set("quiz-" + id, {}); renderQuiz(el); updateScore(id); });
  updateScore(id);
}

function updateScore(id) {
  const saved = store.get("quiz-" + id) || {}, qs = QUIZ[id];
  const answered = Object.keys(saved).length, right = Object.entries(saved).filter(([i, j]) => qs[i].a === j).length;
  const txt = answered ? `${right}/${qs.length} נכונות` : "";
  const s = document.getElementById("score-" + id); if (s) s.textContent = txt;
  const p = document.querySelector(`.prog[data-quiz="${id}"]`);
  if (p) { p.textContent = answered === qs.length ? `${right}/${qs.length}` : answered ? "…" : ""; p.className = "prog" + (answered === qs.length ? " done" : ""); }
}

/* ------------------------------------------------------------ R0 simulator */
function r0sim() {
  const sel = $("#simDisease"), cov = $("#simCov");
  const run = () => {
    const R0 = +sel.value, c = +cov.value / 100, Re = R0 * (1 - c), hit = Math.max(0, 1 - 1 / R0);
    $("#simCovOut").textContent = cov.value + "%";
    $("#simRe").textContent = Re.toFixed(2);
    $("#simRe").className = Re < 1 ? "good" : "bad";
    $("#simHit").textContent = Math.ceil(hit * 100) + "%";
    const gens = [1]; for (let g = 1; g <= 5; g++) gens.push(gens[g - 1] * Re);
    const total = gens.reduce((a, b) => a + b, 0);
    $("#simTotal").textContent = Math.round(total).toLocaleString("he-IL");
    const max = Math.max(...gens.map((v) => Math.max(v, 1)));
    $("#simBars").innerHTML = gens.map((v, g) => `<div class="sb"><span class="sb-l">דור ${g}</span>
      <span class="sb-bar"><i style="width:${Math.max(0.5, (Math.log10(Math.max(v, 1)) / Math.log10(Math.max(max, 10))) * 100)}%"></i></span>
      <span class="sb-v">${v < 1 && g ? v.toFixed(2) : Math.round(v).toLocaleString("he-IL")}</span></div>`).join("") +
      `<p class="sim-msg ${Re < 1 ? "good" : "bad"}">${Re < 1 ? "R האפקטיבי קטן מ-1: שרשרת ההדבקה דועכת. זו חסינות עדר." : c >= hit ? "" : `כדי לעצור את המחלה צריך לפחות ${Math.ceil(hit * 100)}% מחוסנים.`}</p>
      <p class="muted" style="font-size:12px;margin:4px 0 0">אורך העמודות בסולם לוגריתמי. המודל מפושט: הוא מניח חיסון יעיל ב-100% ואוכלוסייה מעורבבת באופן אחיד.</p>`;
  };
  sel.addEventListener("change", run); cov.addEventListener("input", run); run();
}

/* ------------------------------------------------------------ primary vs secondary response */
function respChart() {
  // Illustrative curves (relative antibody level, log-like scale) over 60 days; 2nd exposure at day 30.
  const prim = (t) => (t < 7 ? 0.02 : t < 30 ? 1 * Math.exp(-((t - 14) ** 2) / 40) + (t > 14 ? 0.2 : 0) : 0.2);
  const sec = (t) => (t < 30 ? null : t < 32 ? 0.2 : 0.2 + 9 * (1 - Math.exp(-(t - 32) / 2.5)) * Math.exp(-Math.max(0, t - 40) / 30));
  const W = 640, H = 220, P = { l: 40, r: 10, t: 10, b: 30 }, max = 10;
  const x = (t) => P.l + (t / 60) * (W - P.l - P.r), y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
  const days = [...Array(61).keys()];
  const path = (f) => days.filter((t) => f(t) != null).map((t, i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(f(t)).toFixed(1)}`).join("");
  $("#respChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="resp" role="img" aria-label="גרף רמת נוגדנים לאורך 60 יום">
    ${[0, 2.5, 5, 7.5, 10].map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/>`).join("")}
    <line x1="${P.l}" x2="${W - P.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--axis)"/>
    ${[0, 10, 20, 30, 40, 50, 60].map((t) => `<text x="${x(t)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="var(--muted)">${t}</text>`).join("")}
    <line x1="${x(0)}" x2="${x(0)}" y1="${P.t}" y2="${y(0)}" stroke="var(--s1)" stroke-dasharray="3 3"/>
    <line x1="${x(30)}" x2="${x(30)}" y1="${P.t}" y2="${y(0)}" stroke="var(--s2)" stroke-dasharray="3 3"/>
    <text x="${x(0) + 4}" y="${P.t + 12}" font-size="11" fill="var(--ink-2)">חשיפה 1</text>
    <text x="${x(30) + 4}" y="${P.t + 12}" font-size="11" fill="var(--ink-2)">חשיפה 2</text>
    <path d="${path(prim)}" fill="none" stroke="var(--s1)" stroke-width="2.5"/>
    <path d="${path(sec)}" fill="none" stroke="var(--s2)" stroke-width="2.5"/>
    ${days.map((t) => `<rect x="${x(t) - 4}" y="${P.t}" width="8" height="${H - P.t - P.b}" fill="transparent" data-tip="יום ${t}: ${t < 30 ? "ראשונית " + prim(t).toFixed(1) : "שניונית " + sec(t).toFixed(1)}"/>`).join("")}
  </svg>`;
  OR.bindTips($("#respChart"));
}

/* ------------------------------------------------------------ history timeline */
const HISTORY = [
  { y: "1347–1351", t: "המוות השחור", d: "plague", agent: "חיידק Yersinia pestis, דרך פרעושים של חולדות",
    toll: "בין שליש למחצית מאוכלוסיית אירופה", know: "לא ידעו מה גורם למחלה. האשימו \"אוויר רע\", ואף רדפו מיעוטים.",
    stop: "<b>הסגר:</b> ונציה ורגוסה בודדו ספינות 30 ואחר כך 40 יום. החיידק זוהה רק ב-1894.", line: "העולם: בידוד" },
  { y: "1796", t: "אבעבועות שחורות והחיסון הראשון", d: null, agent: "נגיף Variola, בטיפות ובמגע",
    toll: "כ-300 מיליון מתים במאה ה-20 לבדה", know: "אדוארד ג'נר הבחין שחולבות שחלו באבעבועות פרות היו מוגנות.",
    stop: "<b>חיסון:</b> ג'נר חיסן ילד באבעבועות פרות. מבצע חיסונים עולמי הביא להכרזה על הכחדת המחלה ב-1980.", line: "האדם: חיסון" },
  { y: "1854", t: "כולרה בלונדון", d: "cholera", agent: "חיידק Vibrio cholerae, דרך מים מזוהמים",
    toll: "616 מתים בשכונת סוהו", know: "הרופא ג'ון סנואו מיפה את המקרים ומצא שהם מתרכזים סביב משאבת מים אחת.",
    stop: "<b>תשתיות:</b> פירוק ידית המשאבה, ובהמשך מערכות ביוב ומים נקיים. זו לידת האפידמיולוגיה.", line: "העולם: תשתיות" },
  { y: "1918–1920", t: "השפעת הספרדית", d: "influenza", agent: "נגיף שפעת H1N1, בטיפות",
    toll: "כשליש מאוכלוסיית העולם נדבק, ובין 20 ל-50 מיליון מתו", know: "לא ידעו שהגורם הוא נגיף, ולא היו חיסון או אנטיביוטיקה.",
    stop: "<b>ריחוק חברתי:</b> סגירת בתי ספר, איסור התקהלויות ומסכות. ערים שפעלו מוקדם סבלו פחות.", line: "הקהילה: ריחוק" },
  { y: "1950–היום", t: "פוליו", d: "polio", agent: "נגיף Poliovirus, דרך מזון ומים מזוהמים",
    toll: "אלפי ילדים משותקים מדי שנה בשנות ה-50", know: "יונס סאלק (1955, חיסון מומת) ואלברט סייבין (1961, חיסון חי מוחלש פומי).",
    stop: "<b>חיסון המוני:</b> מאז 1988 ירדו המקרים ביותר מ-99%. בישראל נמצא נגיף בשפכים ב-2013, והיה מקרה משתק ב-2022.", line: "האדם והקהילה" },
  { y: "2014–2016", t: "אבולה במערב אפריקה", d: "ebola", agent: "נגיף Ebola (זן זאיר), במגע בנוזלי גוף",
    toll: "כ-28,600 חולים וכ-11,300 מתים", know: "הנגיף היה מוכר מ-1976, אבל זו הפעם הראשונה שהגיע לערים צפופות.",
    stop: "<b>בידוד, איתור מגעים וקבורה בטוחה</b>, וחיסון ניסיוני (Ervebo) שהוכח כיעיל ב-2015.", line: "כל הרמות" },
  { y: "2020–2023", t: "קורונה (COVID-19)", d: "covid", agent: "נגיף SARS-CoV-2, באוויר ובטיפות",
    toll: "יותר מ-7 מיליון מתים מדווחים", know: "רצף הגנום פורסם תוך שבועות, והחיסונים אושרו בדצמבר 2020.",
    stop: "<b>סגרים ומסכות, ובהמשך חיסוני mRNA.</b> ישראל הייתה מהמדינות הראשונות שחיסנו את רוב האוכלוסייה.", line: "כל הרמות" },
];
function timeline() {
  $("#timeline").innerHTML = HISTORY.map((h) => `<article class="tl">
    <div class="tl-y">${h.y}</div>
    <div class="tl-b"><h3>${h.t}</h3>
      <dl><dt>גורם ודרך הדבקה</dt><dd>${h.agent}</dd><dt>מחיר</dt><dd>${h.toll}</dd><dt>מה ידעו</dt><dd>${h.know}</dd><dt>מה עצר את המגפה</dt><dd>${h.stop}</dd></dl>
      <div class="tl-f"><span class="tag">קו הגנה: ${h.line}</span>${h.d ? `<a href="../disease.html?id=${h.d}">לנתונים העדכניים ←</a>` : ""}</div>
    </div></article>`).join("");
}

/* ------------------------------------------------------------ live immunity box */
async function liveImm() {
  const imm = await OR.data("immunity.json");
  const items = imm ? imm.items.filter((i) => i.series.length) : [];
  if (!items.length) { $("#liveImm").innerHTML = `<span class="muted">נתוני החיסון לא זמינים כרגע. אפשר לראות אותם ב<a href="../index.html">מכ״ם</a>.</span>`; return; }
  $("#liveImm").innerHTML = `<b>נתונים חיים מארגון הבריאות העולמי: כיסוי חיסוני בישראל</b>
    <div class="live-row">${items.map((i) => { const l = i.series.at(-1); return `<div><span>${esc(i.label)}</span><b class="${l.value >= 95 ? "good" : "bad"}">${l.value}%</b><small>${l.year}${i.world != null ? ` · עולם ${i.world}%` : ""}</small></div>`; }).join("")}</div>
    <p class="muted" style="margin:6px 0 0;font-size:13px">שאלה למחשבה: האם הכיסוי הארצי מעל סף חסינות העדר? ומה זה אומר על קהילה שבה הכיסוי נמוך יותר?</p>`;
}

document.querySelectorAll(".quiz").forEach(renderQuiz);
r0sim(); respChart(); timeline(); liveImm();
