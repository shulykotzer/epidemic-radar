"use strict";
/* Epidemic explorer: one disease → profile, Israel immunity, and its full WHO DON history. */
const { esc, fmtDate, ago, VAC_HE, MODE_HE } = OR;
const $ = (s, el = document) => el.querySelector(s);
let KB;

const GROUPS = [
  ["דימומיות", ["ebola-bdbv", "ebola-sudv", "ebola", "marburg", "lassa", "cchf", "rvf"]],
  ["נשימתיות", ["covid", "influenza", "avian-flu", "mers", "measles", "diphtheria", "meningitis", "unknown-pneumonia"]],
  ["מועברות ביתושים", ["dengue", "chikungunya", "zika", "yellow-fever", "west-nile", "oropouche"]],
  ["מבעלי חיים, מים ומגע", ["nipah", "hantavirus", "mpox", "rabies", "anthrax", "plague", "cholera", "polio", "hepatitis-e"]],
];

function renderChips(active) {
  $("#chips").innerHTML = GROUPS.map(([g, ids]) => `<div class="chip-group"><span class="muted">${g}</span>${ids
    .map((id) => KB.diseases.find((d) => d.id === id)).filter(Boolean)
    .map((d) => `<a class="chip${d.id === active ? " on" : ""}" href="?id=${d.id}">${esc(d.he)}</a>`).join("")}</div>`).join("");
}

function yearChart(items) {
  const counts = {};
  items.forEach((i) => { const y = +i.PublicationDateAndTime.slice(0, 4); counts[y] = (counts[y] || 0) + 1; });
  const y0 = 1996, y1 = new Date().getFullYear(), years = [];
  for (let y = y0; y <= y1; y++) years.push({ y, n: counts[y] || 0 });
  const W = 900, H = 150, max = Math.max(1, ...years.map((v) => v.n)), bw = W / years.length;
  return `<svg viewBox="0 0 ${W} ${H + 18}" preserveAspectRatio="none" class="years" role="img" aria-label="מספר דיווחים בכל שנה">
    <line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="var(--axis)" vector-effect="non-scaling-stroke"/>
    ${years.map((v, i) => { const h = (v.n / max) * (H - 6); return `${v.n ? `<rect x="${i * bw + 1}" y="${H - h}" width="${bw - 2}" height="${h}" rx="2" fill="var(--accent)"/>` : ""}
      <rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent" data-tip="${v.y}: ${v.n} דיווחים"/>
      ${v.y % 5 === 0 ? `<text x="${i * bw + bw / 2}" y="${H + 14}" text-anchor="middle" font-size="11" fill="var(--muted)">${v.y}</text>` : ""}`; }).join("")}
  </svg>`;
}

function topCountries(enriched) {
  const c = {};
  enriched.forEach((e) => { if (e.location_he) c[e.location_he] = (c[e.location_he] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8);
}

async function show({ id, q }) {
  const d = id ? KB.diseases.find((x) => x.id === id) : null;
  const terms = d ? d.don : [q];
  renderChips(d && d.id);
  const res = $("#result");
  res.hidden = false;
  res.innerHTML = `<div class="skeleton tall"></div>`;
  document.title = (d ? d.he : q) + " · חקר מגפות";

  let items = [];
  let err = "";
  try { items = await OR.donSearch(terms); } catch (e) { err = e.message; }
  const enriched = await Promise.all(items.map((i) => OR.enrich(KB, i)));
  const imm = await OR.data("immunity.json");
  const cov = d && d.gho && imm ? d.gho.map((c) => imm.items.find((i) => i.code === c)).filter((i) => i && i.series.length) : [];
  const m = d ? await OR.medline(d.medline) : null;
  const last = enriched[0];
  const countries = topCountries(enriched);

  res.innerHTML = `
    <div class="hero">
      <div class="hero-tag">${d ? esc(d.en) : "חיפוש חופשי בארכיון"}</div>
      <h2>${esc(d ? d.he : q)}</h2>
      <div class="where">${items.length ? `${items.length} דיווחים של ארגון הבריאות העולמי · אחרון: ${fmtDate(last.date)} (${ago(last.days_ago)}) · ${esc(last.location_he || last.location)}` : err ? "שגיאה בטעינת הארכיון: " + esc(err) : "לא נמצאו דיווחים בארכיון"}</div>
      ${d ? `<div class="qa">
        <div><h3>איך זה עובר?</h3><div class="big">${MODE_HE[d.mode]}</div><p>${esc(d.spread_he)}</p></div>
        <div><h3>כמה מסוכן?</h3><div class="big">${esc(d.cfr)}</div><p>תקופת דגירה: ${esc(d.incubation)}</p></div>
        <div><h3>חיסון</h3><div class="big">${VAC_HE[d.vaccine][0]}</div><p>${esc(d.vaccine_he)}</p></div>
      </div>
      <div class="hero-foot"><span><b>בישראל:</b> ${esc(d.israel_he)}</span></div>
      ${cov.length ? `<div class="hero-foot">${cov.map((c) => `<span class="tag vac-yes">${esc(c.label)}: ${c.series.at(-1).value}% (${c.series.at(-1).year})</span>`).join(" ")}</div>` : ""}
      <div class="hero-foot"><a class="btn" href="learn/research.html?id=${d.id}">פתיחת תיק חקירה על ${esc(d.he)} ←</a></div>` : ""}
    </div>

    ${items.length ? `<div class="block">
      <h2 style="margin-bottom:8px">דיווחים לפי שנה</h2>
      <p class="muted" style="margin:0 0 8px;font-size:13.5px">כל עמודה היא מספר הדיווחים שארגון הבריאות העולמי פרסם באותה שנה. גל דיווחים מסמן התפרצות גדולה.</p>
      <div class="panel">${yearChart(items)}</div>
    </div>
    <div class="two-col">
      <div class="panel"><h3 class="panel-h">המדינות שדווחו הכי הרבה</h3>
        <ol class="rank">${countries.map(([c, n]) => `<li><span>${esc(c)}</span><b>${n}</b></li>`).join("")}</ol></div>
      <div class="panel"><h3 class="panel-h">כל הדיווחים</h3>
        <ul class="reports">${enriched.map((e) => `<li><a href="${esc(e.url)}" target="_blank" rel="noopener" class="ltr" lang="en">${esc(e.title)}</a><span class="muted">${fmtDate(e.date)}</span></li>`).join("")}</ul></div>
    </div>` : ""}

    ${m ? `<div class="block"><h2 style="margin-bottom:8px">מידע רפואי מ-MedlinePlus</h2>
      <div class="en-box ltr" lang="en"><b>${esc(m.title)}</b>${m.summary}<p><a href="${esc(m.url)}" target="_blank" rel="noopener">MedlinePlus ↗</a></p></div></div>` : ""}`;
  OR.bindTips(res);
}

(async () => {
  KB = await OR.kb();
  const p = new URLSearchParams(location.search);
  renderChips(p.get("id"));
  if (p.get("id") || p.get("q")) show({ id: p.get("id"), q: p.get("q") });
  const go = () => { const q = $("#q").value.trim(); if (q.length > 1) location.search = "?q=" + encodeURIComponent(q); };
  $("#go").addEventListener("click", go);
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  if (p.get("q")) $("#q").value = p.get("q");
})();
