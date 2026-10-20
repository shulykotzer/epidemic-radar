# -*- coding: utf-8 -*-
"""Build the printable PDFs in /pdf from the site's own pages, using headless
Chrome or Edge (the browser renders Hebrew/RTL correctly, so the PDFs match the site).

    python scripts/build_pdfs.py

Re-run after editing the worksheet questions, the example file or the teacher guide.
"""
import functools
import http.server
import os
import shutil
import subprocess
import sys
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "pdf")
PAGES = {
    "research-worksheet.pdf": "learn/research.html?blank=1",
    "example-research.pdf": "learn/research.html?example=1&print=1",
    "teacher-guide.pdf": "learn/teacher.html",
}
CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome", "chromium", "chromium-browser", "msedge",
]


def find_browser():
    for c in CANDIDATES:
        if os.path.isfile(c) or shutil.which(c):
            return c
    sys.exit("Chrome/Edge not found - install one or add its path to CANDIDATES")


def main():
    os.makedirs(OUT, exist_ok=True)
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}/"
    browser = find_browser()
    for name, path in PAGES.items():
        target = os.path.join(OUT, name)
        subprocess.run([browser, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        "--virtual-time-budget=8000", "--run-all-compositor-stages-before-draw",
                        f"--print-to-pdf={target}", base + path],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
        print(f"{name}: {os.path.getsize(target) // 1024} KB")
    srv.shutdown()


if __name__ == "__main__":
    main()
