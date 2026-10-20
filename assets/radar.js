"use strict";
/* Radar page: latest outbreaks, Israel immunity, live COVID numbers. */
const { esc, fmtDate, fmtNum, ago, badge, RISK, MODE_HE, VAC_HE } = OR;
const $ = (s, el = document) => el.querySelector(s);
const state = { items: [], days: 90, sort: "risk", q: "" };
const dname = (it) => (it.disease ? it.disease.he : it.name);
const meter = (l) => `<span class="meter" aria-label="${RISK[l]}">${[0, 1, 2, 3].map((i) => `<span class="${i <= l ? "f" : ""}"></span>`).join("")}</span>`;

function immunityText(it) {
  const d = it.disease;
  if (!d) return "אין מידע מובנה על המחלה.";
  return d.vaccine_he + (it.risk.coverage != null ? ` כיסוי בישראל לפי ארגון הבריאות העולמי: ${it.risk.coverage}%.` : "");
}

/* ------------------------------------------------ hero */
function renderHero() {
  const recent = state.items.filter((i) => i.days_ago <= 45 && i.disease && i.disease.mode !== "toxin");
  if (!recent.length) { $("#hero").innerHTML = `<p class="muted">אין התפרצויות חדשות ב-45 הימים האחרונים.</p>`; return; }
  const it = recent.slice().sort((a, b) => b.reports - a.reports || b.risk.score - a.risk.score)[0];
  const d = it.disease;
  $("#hero").innerHTML = `
    <div class="hero-tag">ההתפרצות הפעילה הבולטת · ${it.reports} דיווחים של ארגון הבריאות העולמי מאז ${fmtDate(it.first)}</div>
    <h2>${esc(dname(it))}</h2>
    <div class="where">${esc(it.location_he || it.location)} · עדכון אחרון ${fmtDate(it.date)} (${ago(it.days_ago)})</div>
    <div class="qa">
      <div><h3>מאיפה ואיך זה עובר?</h3><div class="big">${esc(it.location_he || it.location)}</div><p>${esc(d.spread_he)}</p></div>
      <div><h3>מה הסיכון שיגיע לישראל?</h3><div class="big">${badge(it.risk.level, true)}</div><p>${esc(OR.importText(it))}</p></div>
      <div><h3>חיסון וחסינות בישראל</h3><div class="big">${VAC_HE[d.vaccine][0]}</div><p>${esc(immunityText(it))}</p></div>
    </div>
    <div class="hero-foot"><span>${esc(d.israel_he)}</span></div>
    <div class="hero-foot">
      <button class="btn" type="button" data-open="${esc(it.key)}">פרטים מלאים</button>
      <a class="btn" href="disease.html?id=${d.id}">כל ההיסטוריה של ${esc(d.he)} ←</a>
      <a href="${esc(it.url)}" target="_blank" rel="noopener">לדיווח המקורי של ארגון הבריאות העולמי ↗</a></div>`;
}

/* ------------------------------------------------ list */
function renderList() {
  const q = state.q.trim().toLowerCase();
  let rows = state.items.filter((i) => i.days_ago <= state.days);
  if (q) rows = rows.filter((i) => [i.title, dname(i), i.location_he].join(" ").toLowerCase().includes(q));
  rows.sort(state.sort === "risk" ? (a, b) => b.risk.score - a.risk.score || a.days_ago - b.days_ago : (a, b) => a.days_ago - b.days_ago);
  if (!rows.length) { $("#list").innerHTML = `<div class="empty">אין התפרצויות בטווח הזמן שנבחר.</div>`; return; }
  $("#list").innerHTML = rows.map((it) => {
    const d = it.disease, v = d ? VAC_HE[d.vaccine] : null;
    return `<button class="card" type="button" data-open="${esc(it.key)}">
      <div class="card-top"><div><h3>${esc(dname(it))}</h3><div class="loc">${esc(it.location_he || it.location)}</div></div>${badge(it.risk.level)}</div>
      <div class="meters"><span>סיכון ייבוא</span>${meter(it.risk.import_level)}<span>התפשטות בארץ</span>${meter(it.risk.spread_level)}</div>
      <div class="tags">
        ${d ? `<span class="tag">${MODE_HE[d.mode]}</span>` : ""}
        ${v ? `<span class="tag ${v[1]}">${v[0]}</span>` : ""}
        ${d && d.cfr ? `<span class="tag">תמותה: ${esc(d.cfr)}</span>` : ""}
      </div>
      <div class="card-foot"><span>${fmtDate(it.date)} · ${ago(it.days_ago)}</span><span>${it.reports > 1 ? it.reports + " דיווחים" : ""}</span></div>
    </button>`;
  }).join("");
}

/* ------------------------------------------------ detail dialog */
async function openDetail(key) {
  const it = state.items.find((i) => i.key === key);
  if (!it) return;
  const d = it.disease, r = it.risk;
  const f = (label, val) => `<div class="factor-row"><span>${label}</span><div class="bar"><span style="width:${Math.round(val * 100)}%"></span></div><span>${Math.round(val * 100)}</span></div>`;
  $("#d-body").innerHTML = `
    <h2 id="d-title">${esc(dname(it))}</h2>
    <p class="muted" style="margin:4px 0 0">${esc(it.location_he || it.location)} · ${fmtDate(it.date)} · ${badge(r.level)}</p>
    ${d ? `<div class="facts">
      <div><b>דרך הדבקה</b>${esc(d.spread_he)}</div><div><b>דגירה</b>${esc(d.incubation)}</div>
      <div><b>שיעור תמותה</b>${esc(d.cfr)}</div><div><b>חיסון</b>${esc(d.vaccine_he)}</div>
    </div>
    <h4>המצב בישראל</h4><p style="margin:0">${esc(d.israel_he)}</p>
    <p><a class="btn" href="disease.html?id=${d.id}">לחקור את ${esc(d.he)}: כל הדיווחים מ-1996 ←</a></p>` : ""}
    <h4>פירוק הערכת הסיכון (0–100)</h4>
    ${f("סיכון ייבוא", r.factors.importation)}${f("פוטנציאל התפשטות", r.factors.spread)}
    ${f("פער חסינות", r.factors.immunity_gap)}${f("עדכניות הדיווח", r.activity)}
    <p class="muted" style="font-size:13px">${esc(OR.importText(it))}</p>
    <h4>תקציר ארגון הבריאות העולמי</h4>
    <div class="en-box ltr" lang="en">${esc(it.summary) || "—"}<p><a href="${esc(it.url)}" target="_blank" rel="noopener">Read the full WHO report ↗</a></p></div>
    <h4>מידע על המחלה מ-MedlinePlus (ספריית הרפואה הלאומית של ארה״ב)</h4>
    <div id="medline" class="en-box ltr" lang="en"><span class="muted">Loading…</span></div>`;
  $("#detail").showModal();
  const m = await OR.medline(d ? d.medline : "");
  $("#medline").innerHTML = m
    ? `<b>${esc(m.title)}</b>${m.also.length ? ` <span class="muted">(${esc(m.also.join(", "))})</span>` : ""}${m.summary}<p><a href="${esc(m.url)}" target="_blank" rel="noopener">MedlinePlus ↗</a></p>`
    : `<span class="muted">No MedlinePlus topic available.</span>`;
}

/* ------------------------------------------------ immunity */
function spark(series) {
  const W = 240, H = 56, min = Math.min(80, ...series.map((s) => s.value)), max = 100;
  const x = (i) => (series.length === 1 ? W / 2 : (i / (series.length - 1)) * W);
  const y = (v) => H - ((v - min) / (max - min)) * H;
  const step = series.length > 1 ? W / (series.length - 1) : W;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="מגמה ${series[0].year}–${series.at(-1).year}">
    <line x1="0" x2="${W}" y1="${y(95)}" y2="${y(95)}" stroke="var(--axis)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>
    <polyline points="${series.map((s, i) => `${x(i).toFixed(1)},${y(s.value).toFixed(1)}`).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
    ${series.map((s, i) => `<rect x="${x(i) - step / 2}" y="0" width="${step}" height="${H}" fill="transparent" data-tip="${s.year}: ${s.value}%"/>`).join("")}
  </svg>`;
}
async function renderImmunity() {
  const imm = await OR.data("immunity.json");
  if (!imm) { $("#immunity").innerHTML = `<div class="empty">נתוני החסינות לא זמינים.</div>`; return; }
  $("#immunity").innerHTML = imm.items.map((m) => {
    const last = m.series.at(-1);
    if (!last) return `<div class="imm"><h3>${esc(m.label)}</h3><div class="na">שרת WHO GHO לא החזיר נתון. העדכון היומי ינסה שוב.</div></div>`;
    return `<div class="imm"><h3>${esc(m.label)}</h3>
      <div class="val">${last.value}%<small> · ${last.year}</small></div>
      <div class="cmp">${m.world != null ? `ממוצע עולמי: ${m.world}% · ` : ""}${last.value >= 95 ? "מעל סף חסינות העדר" : "מתחת לסף 95%"}</div>
      ${m.series.length > 1 ? spark(m.series) : ""}</div>`;
  }).join("") + `<p class="muted" style="grid-column:1/-1;font-size:12.5px;margin:0">עודכן ${esc(imm.updated)} מ-WHO GHO</p>`;
  OR.bindTips($("#immunity"));
}

/* ------------------------------------------------ covid (disease.sh, live) */
async function renderCovid() {
  const D = "https://disease.sh/v3/covid-19";
  try {
    const [il, w, hist, vac] = await Promise.all([
      OR.getJSON(`${D}/countries/Israel?strict=true`), OR.getJSON(`${D}/all`),
      OR.getJSON(`${D}/historical/Israel?lastdays=120`).catch(() => null),
      OR.getJSON(`${D}/vaccine/coverage/countries/Israel?lastdays=1`).catch(() => null),
    ]);
    const doses = vac ? Object.values(vac.timeline).at(-1) : null;
    const h = Object.entries(hist?.timeline?.cases || {});
    const daily = h.slice(1).map(([k, v], i) => ({ d: k, v: Math.max(0, v - h[i][1]) }));
    let chart;
    if (daily.some((p) => p.v > 0)) {
      const W = 800, H = 160, max = Math.max(...daily.map((p) => p.v)), bw = W / daily.length;
      chart = `<div class="chart"><h3 style="font-size:14px;font-weight:500;color:var(--ink-2)">מקרים חדשים ביום · ${daily.length} הימים האחרונים</h3>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="מקרים יומיים">
        <line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="var(--axis)" vector-effect="non-scaling-stroke"/>
        ${daily.map((p, i) => { const hh = (p.v / max) * (H - 4); return `<rect x="${i * bw + 1}" y="${H - hh}" width="${Math.max(1, bw - 2)}" height="${hh}" rx="2" fill="var(--accent)"/><rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent" data-tip="${p.d}: ${fmtNum(p.v)}"/>`; }).join("")}
        </svg></div>`;
    } else chart = `<div class="chart muted" style="font-size:13.5px">ישראל הפסיקה לדווח נתונים יומיים ל-disease.sh, ולכן מוצגים כאן רק הסיכומים המצטברים.</div>`;
    $("#covid").innerHTML = `
      <div class="stat"><h3>סה״כ מקרים בישראל</h3><div class="val">${fmtNum(il.cases)}</div><div class="cmp">${fmtNum(il.casesPerOneMillion)} למיליון</div></div>
      <div class="stat"><h3>תמותה בישראל</h3><div class="val">${fmtNum(il.deaths)}</div><div class="cmp">${fmtNum(il.deathsPerOneMillion)} למיליון (בעולם: ${fmtNum(w.deathsPerOneMillion)})</div></div>
      <div class="stat"><h3>מנות חיסון שניתנו</h3><div class="val">${fmtNum(doses)}</div><div class="cmp">${il.population && doses ? (doses / il.population).toFixed(1) + " מנות לנפש" : ""}</div></div>
      <div class="stat"><h3>בדיקות שבוצעו</h3><div class="val">${fmtNum(il.tests)}</div><div class="cmp">עודכן ${il.updated ? fmtDate(il.updated) : "—"}</div></div>
      ${chart}`;
    OR.bindTips($("#covid"));
  } catch { $("#covid").innerHTML = `<div class="empty">disease.sh לא זמין כרגע.</div>`; }
}

/* ------------------------------------------------ boot */
async function load() {
  $("#updated").textContent = "מעדכן…";
  await Promise.allSettled([
    OR.outbreaks().then((o) => {
      state.items = o.items; renderHero(); renderList();
      $("#updated").textContent = o.live ? "עודכן " + new Date().toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : `נתון שמור מ-${o.updated}`;
    }).catch((e) => { $("#list").innerHTML = `<div class="empty">לא הצלחנו לטעון את דיווחי ארגון הבריאות העולמי (${esc(e.message)}).</div>`; $("#hero").innerHTML = ""; }),
    renderImmunity(), renderCovid(),
  ]);
}

document.addEventListener("click", (e) => {
  const o = e.target.closest("[data-open]");
  if (o) return openDetail(o.dataset.open);
  const r = e.target.closest("#range button");
  if (r) { state.days = +r.dataset.days; $("#range .on").classList.remove("on"); r.classList.add("on"); return renderList(); }
  const s = e.target.closest("#sort button");
  if (s) { state.sort = s.dataset.sort; $("#sort .on").classList.remove("on"); s.classList.add("on"); return renderList(); }
});
$("#detail").addEventListener("click", (e) => { if (e.target.id === "detail") e.target.close(); });
$("#q").addEventListener("input", (e) => { state.q = e.target.value; renderList(); });
$("#refresh").addEventListener("click", load);
load();
setInterval(load, 30 * 60 * 1000);
