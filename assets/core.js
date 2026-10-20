"use strict";
/* Shared data layer for every page (radar, epidemic explorer, learning unit).
 * Live, keyless, CORS-enabled sources are called straight from the browser:
 *   - WHO Disease Outbreak News API   (outbreak events + full archive since 1996)
 *   - disease.sh                      (COVID-19 numbers)
 * Sources without CORS (WHO GHO, MedlinePlus search) are read from /data/*.json,
 * which a daily GitHub Action refreshes (scripts/update_data.py). */
const OR = (() => {
  const ROOT = new URL("..", document.currentScript.src).href;
  const DON_API = "https://www.who.int/api/news/diseaseoutbreaknews?sf_culture=en";
  const DON_ITEM = "https://www.who.int/emergencies/disease-outbreak-news/item/";

  const RISK = ["נמוך מאוד", "נמוך", "בינוני", "גבוה"];
  const CONN_HE = { local: "אירוע בתוך ישראל", high: "גבוהה", medium: "בינונית", low: "נמוכה" };
  const MODE_HE = {
    respiratory: "נשימתית / אוויר", contact: "מגע בנוזלי גוף", vector: "יתושים / קרציות",
    zoonotic: "מבעלי חיים", foodwater: "מים ומזון", unknown: "לא ידוע", toxin: "לא מדבק (רעלן)",
  };
  const VAC_HE = {
    none: ["אין חיסון", "vac-none"], routine: ["חיסון שגרה בישראל", "vac-yes"],
    travel: ["חיסון למטיילים", ""], "risk-groups": ["חיסון לקבוצות סיכון", ""], seasonal: ["חיסון עונתי", "vac-yes"],
  };

  const memo = {};
  const getJSON = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  };
  const data = (name) => (memo[name] ||= getJSON(ROOT + "data/" + name).catch(() => null));

  /* ---------------- helpers */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const unesc = (s) => { const t = document.createElement("textarea"); t.innerHTML = s || ""; return t.value; };
  const stripTags = (s) => unesc(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const fmtDate = (iso) => new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
  const fmtNum = (n) => (n == null ? "—" : Number(n).toLocaleString("he-IL"));
  const ago = (d) => (d <= 0 ? "היום" : d === 1 ? "אתמול" : d < 60 ? `לפני ${d} ימים` : d < 730 ? `לפני ${Math.round(d / 30)} חודשים` : `לפני ${Math.round(d / 365)} שנים`);
  const badge = (lvl, lg) => `<span class="risk r${lvl}${lg ? " lg" : ""}"><i aria-hidden="true"></i>${RISK[lvl]}</span>`;
  const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);

  /* ---------------- knowledge base + matching */
  const kb = () => data("kb.json");

  function matchDisease(KB, title) {
    const t = title.toLowerCase();
    return KB.diseases.find((d) => d.match.some((p) => new RegExp(p).test(t))) || null;
  }
  function splitTitle(title) {
    // Archive titles look like "2000 - Ebola haemorrhagic fever in Uganda- Update 32".
    let t = unesc(title).replace(/[–—�]/g, " - ").replace(/^\s*\d{4}\s*-\s*/, "");
    for (let i = 0; i < 2; i++) t = t.replace(/[\s,–-]*\(?\s*(update|situation update|follow-up report)\s*\d*\)?\s*$/i, "").trim();
    const inM = !/ - |- /.test(t) && t.match(/^(.*?)\s+in\s+(?:the\s+)?([A-Z][^]*)$/);
    if (inM) return [inM[1], inM[2]];
    for (const sep of [" - ", "- "]) {
      const i = t.lastIndexOf(sep);
      if (i > 0) return [t.slice(0, i).replace(/^[\s,-]+|[\s,-]+$/g, ""), t.slice(i + sep.length).replace(/^[\s,-]+|[\s,-]+$/g, "")];
    }
    const j = t.indexOf(", ");
    if (j > 0) return [t.slice(0, j), t.slice(j + 2)];
    return [t, ""];
  }
  function connectivity(KB, loc) {
    const l = loc.toLowerCase();
    if (l.includes("israel")) return "local";
    for (const tier of ["high", "medium"]) if (KB.connectivity[tier].some((k) => l.includes(k))) return tier;
    return "low";
  }
  function locationHe(KB, location) {
    const loc = location.toLowerCase().trim().replace(/^the\s+/, "").replace(/\s*\((?!afro|emro)[^)]*\)\s*$/, "");
    if (KB.country_he[loc]) return KB.country_he[loc];
    return loc.split(/\s*[&,]\s*|\s+and\s+/).map((p) => p.replace(/^the\s+/, "").trim()).filter(Boolean)
      .map((p) => KB.country_he[p] || p.replace(/\b\w/g, (c) => c.toUpperCase())).join(" ו");
  }

  /* ---------------- risk model (explained on the radar page) */
  const TRAVEL = { respiratory: 1, contact: 0.6, vector: 0.7, zoonotic: 0.3, foodwater: 0.5, unknown: 0.4, toxin: 0.2 };
  const CONN = { local: 1.5, high: 1, medium: 0.6, low: 0.3 };
  const LOCAL = { respiratory: 1, contact: 0.4, zoonotic: 0.15, foodwater: 0.2, unknown: 0.5, toxin: 0.05 };
  const GAP = { routine: 0.4, seasonal: 0.7, "risk-groups": 0.85, travel: 0.9, none: 1 };
  const lvl = (x, c = [0.08, 0.2, 0.4]) => (x < c[0] ? 0 : x < c[1] ? 1 : x < c[2] ? 2 : 3);

  function assess(KB, d, location, days, coverage) {
    const mode = d ? d.mode : "unknown";
    const activity = days <= 30 ? 1 : days <= 90 ? 0.7 : days <= 180 ? 0.4 : 0.2;
    const conn = connectivity(KB, location);
    const importation = Math.min(1, activity * CONN[conn] * TRAVEL[mode]);
    const local = mode === "vector" ? (d && d.vector_il ? 0.6 : 0.1) : LOCAL[mode];
    const vac = d ? d.vaccine : "none";
    const gap = vac === "routine" && coverage != null ? Math.max(0.25, Math.min(1, (100 - coverage) / 10)) : GAP[vac];
    const spread = local * gap;
    let score = importation * (0.4 + 0.6 * spread);
    if (d && d.endemic_il) score = Math.max(score, 0.3);
    return {
      score: Math.round(score * 100), level: lvl(score), import_level: lvl(importation, [0.1, 0.25, 0.5]),
      spread_level: lvl(spread, [0.1, 0.25, 0.5]), connectivity: conn, activity, coverage,
      factors: { importation, spread, immunity_gap: gap, mode },
    };
  }

  async function coverageFor(codes) {
    const imm = await data("immunity.json");
    if (!imm || !codes) return null;
    const vals = codes.map((c) => imm.items.find((i) => i.code === c)).filter((i) => i && i.series.length).map((i) => i.series.at(-1).value);
    return vals.length ? Math.min(...vals) : null;
  }

  /* ---------------- WHO Disease Outbreak News */
  const SELECT = "&$select=Title,PublicationDateAndTime,UrlName,Summary";
  async function donLatest() {
    try {
      const j = await getJSON(DON_API + "&$orderby=PublicationDateAndTime%20desc&$top=100" + SELECT);
      return { items: j.value, live: true };
    } catch (e) {
      const snap = await data("outbreaks.json");
      if (!snap) throw e;
      return { items: snap.value, live: false, updated: snap.updated };
    }
  }
  /** Search the whole archive (1996→today) for titles containing any of the terms. */
  async function donSearch(terms, max = 400) {
    const filter = terms.map((t) => `contains(tolower(Title),'${t.toLowerCase().replace(/'/g, "''")}')`).join(" or ");
    const out = [];
    for (let skip = 0; skip < max; skip += 100) {
      const j = await getJSON(`${DON_API}&$filter=${encodeURIComponent(filter)}&$orderby=PublicationDateAndTime%20desc&$top=100&$skip=${skip}${SELECT}`);
      out.push(...j.value);
      if (j.value.length < 100) break;
    }
    return out;
  }

  async function enrich(KB, item) {
    const [name, loc] = splitTitle(item.Title);
    const d = matchDisease(KB, item.Title);
    const days = daysSince(item.PublicationDateAndTime);
    return {
      key: (d ? d.id : name.toLowerCase()) + "|" + loc.toLowerCase(), title: unesc(item.Title), name, location: loc,
      location_he: loc ? locationHe(KB, loc) : "", date: item.PublicationDateAndTime, first: item.PublicationDateAndTime,
      days_ago: days, reports: 1, summary: stripTags(item.Summary), url: DON_ITEM + item.UrlName, disease: d,
      risk: assess(KB, d, loc, days, d ? await coverageFor(d.gho) : null),
    };
  }

  /** Latest outbreaks, grouped so repeated updates on one event become one item. */
  async function outbreaks() {
    const [KB, don] = await Promise.all([kb(), donLatest()]);
    const groups = new Map();
    for (const it of don.items) {
      const e = await enrich(KB, it);
      const g = groups.get(e.key);
      if (g) { g.reports++; g.first = e.date; } else groups.set(e.key, e);
    }
    return { items: [...groups.values()], live: don.live, updated: don.updated };
  }

  async function medline(term) {
    const m = await data("medline.json");
    return (m && m[term]) || null;
  }

  /* ---------------- shared bits of UI */
  const RISK_HELP = "הערכה אוטומטית שמשלבת עדכניות, קישוריות לישראל, דרך הדבקה וחסינות. זו לא הערכה רשמית.";
  function importText(it) {
    const r = it.risk, d = it.disease, m = r.factors.mode;
    if (r.connectivity === "local") return "האירוע דווח בתוך ישראל עצמה.";
    const p = [`קישוריות ${it.location_he || it.location} לישראל: ${CONN_HE[r.connectivity]}.`];
    if (m === "contact") p.push("המחלה עוברת רק במגע קרוב עם חולה שיש לו תסמינים, ולכן קשה לה לעבור בטיסה בלי שיזהו אותה.");
    if (m === "respiratory") p.push("מחלה נשימתית עוברת בקלות עם נוסעים.");
    if (m === "vector") p.push(d && d.vector_il ? "הווקטור קיים בישראל, ולכן מטייל חולה עלול לגרום להדבקה מקומית." : "הווקטור אינו מבוסס בישראל, ולכן הסיכון הוא בעיקר למטיילים עצמם.");
    if (m === "zoonotic") p.push("ההדבקה בעיקר מבעלי חיים, וההעברה בין בני אדם מוגבלת.");
    return p.join(" ");
  }

  const tip = () => document.getElementById("tip");
  function bindTips(root) {
    root.querySelectorAll("[data-tip]").forEach((el) => {
      el.addEventListener("pointerenter", () => { tip().textContent = el.dataset.tip; tip().hidden = false; });
      el.addEventListener("pointermove", (e) => { const t = tip(); t.style.left = Math.max(8, Math.min(e.clientX + 12, innerWidth - t.offsetWidth - 8)) + "px"; t.style.top = e.clientY - 36 + "px"; });
      el.addEventListener("pointerleave", () => { tip().hidden = true; });
    });
  }

  return {
    ROOT, RISK, CONN_HE, MODE_HE, VAC_HE, RISK_HELP, esc, fmtDate, fmtNum, ago, badge, data, kb, getJSON,
    outbreaks, donSearch, enrich, medline, importText, bindTips, matchDisease,
  };
})();
