# -*- coding: utf-8 -*-
"""Refresh the data files the static site reads.

Runs daily in GitHub Actions (.github/workflows/update-data.yml) and can be run
locally:  python scripts/update_data.py

Only sources that browsers can't call directly (no CORS) are snapshotted here:
  * WHO GHO OData  -> data/immunity.json   (Israel vaccination coverage)
  * MedlinePlus    -> data/medline.json    (plain-language summaries)
plus a fallback copy of the latest WHO Disease Outbreak News -> data/outbreaks.json
(the site calls that API live and only uses the copy if the live call fails).

A source that fails keeps its previous values, so a flaky upstream never
wipes data that is already published.
"""
import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
UA = {"User-Agent": "OutbreakRadar/1.0 (educational; github pages)"}
KB = json.load(open(os.path.join(DATA, "kb.json"), encoding="utf-8"))


def fetch(url, timeout=90, retries=4):
    last = None
    for i in range(retries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(3 * (i + 1))
    raise last


def load(name, default):
    p = os.path.join(DATA, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default


def save(name, obj):
    with open(os.path.join(DATA, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def update_immunity():
    old = {i["code"]: i for i in load("immunity.json", {"items": []})["items"]}
    items = []
    for ind in KB["gho"]:
        code = ind["code"]
        try:
            rows = json.loads(fetch(f"https://ghoapi.azureedge.net/api/{code}"))["value"]
            isr = sorted((r for r in rows if r.get("SpatialDim") == "ISR" and r.get("NumericValue") is not None),
                         key=lambda r: r["TimeDim"])
            glob = sorted((r for r in rows if r.get("SpatialDimType") == "GLOBAL" and r.get("NumericValue") is not None),
                          key=lambda r: r["TimeDim"])
            items.append({"code": code, "label": ind["label"],
                          "series": [{"year": r["TimeDim"], "value": round(r["NumericValue"], 1)} for r in isr][-20:],
                          "world": round(glob[-1]["NumericValue"], 1) if glob else None,
                          "fetched": time.strftime("%Y-%m-%d")})
            print("GHO ok", code)
        except Exception as e:  # noqa: BLE001
            print("GHO failed", code, e)
            items.append(old.get(code, {"code": code, "label": ind["label"], "series": [], "world": None}))
    save("immunity.json", {"updated": time.strftime("%Y-%m-%d"), "items": items})


ALLOWED = {"h3", "p", "ul", "li", "a", "strong", "em", "b", "i"}


def sanitize(fragment):
    def repl(m):
        closing, tag, attrs = m.group(1), m.group(2).lower(), m.group(3) or ""
        if tag not in ALLOWED:
            return ""
        if tag == "a" and not closing:
            h = re.search(r'href="(https?://[^"]+)"', attrs)
            return f'<a href="{html.escape(h.group(1))}" target="_blank" rel="noopener">' if h else "<a>"
        return f"<{closing}{tag}>"
    return re.sub(r"<(/?)([a-zA-Z0-9]+)([^>]*)>", repl, fragment)


def update_medline():
    out = load("medline.json", {})
    for term in sorted({d["medline"] for d in KB["diseases"]}):
        try:
            url = ("https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&retmax=1&rettype=topic&term="
                   + urllib.parse.quote(term))
            ht = ET.fromstring(fetch(url)).find(".//health-topic")
            if ht is not None:
                out[term] = {"title": ht.get("title"), "url": ht.get("url"), "desc": ht.get("meta-desc"),
                             "also": [a.text for a in ht.findall("also-called")][:5],
                             "summary": sanitize(ht.findtext("full-summary") or "")}
            print("MedlinePlus ok", term)
        except Exception as e:  # noqa: BLE001
            print("MedlinePlus failed", term, e)
        time.sleep(0.5)  # NLM asks for <= 85 requests/minute
    save("medline.json", out)


def update_outbreaks():
    try:
        url = ("https://www.who.int/api/news/diseaseoutbreaknews?sf_culture=en"
               "&$orderby=PublicationDateAndTime%20desc&$top=100"
               "&$select=Title,PublicationDateAndTime,UrlName,Summary")
        save("outbreaks.json", {"updated": time.strftime("%Y-%m-%d"), "value": json.loads(fetch(url))["value"]})
        print("DON ok")
    except Exception as e:  # noqa: BLE001
        print("DON failed", e)


if __name__ == "__main__":
    update_outbreaks()
    update_medline()
    update_immunity()
