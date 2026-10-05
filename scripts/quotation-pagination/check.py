#!/usr/bin/env python3
"""Render the real QA/QM components in Chromium and check page boundaries.

Requires pnpm, Chrome (CHROME_BIN or google-chrome), and Poppler pdftotext.
Run from the repository root: python3 scripts/quotation-pagination/check.py
"""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
NS = {"x": "http://www.w3.org/1999/xhtml"}
FOOTER_WORDS = set("Quandatics Academy (M) Sdn Bhd | w: www.quandatics.com e: training@quandatics.com contact@quandatics.com p: +60 3 8681 9808 CONFIDENTIAL".split())


def check_pdf(pdf):
    root = ET.fromstring(subprocess.check_output(["pdftotext", "-bbox", str(pdf), "-"]))
    pages = root.findall(".//x:page", NS)
    failures = []
    reminders, notices = [], []
    for index, page in enumerate(pages, 1):
        words = page.findall(".//x:word", NS)
        labels = [w for w in words if w.text == "CONFIDENTIAL"]
        if len(labels) != 1 or float(labels[0].attrib["yMin"]) < 750:
            failures.append(f"{pdf.name} page {index}: missing/misplaced footer")
        for word in words:
            if word.text == "Reference":
                reminders.append(index)
            if word.text == "generated":
                notices.append(index)
            if word.text in FOOTER_WORDS:
                continue
            x0, x1 = float(word.attrib["xMin"]), float(word.attrib["xMax"])
            y0, y1 = float(word.attrib["yMin"]), float(word.attrib["yMax"])
            if x0 < 40 or x1 > 572 or y0 < 40 or y1 > 739:
                failures.append(f"{pdf.name} page {index}: {word.text!r} outside content area at ({x0:.1f}, {y0:.1f})..({x1:.1f}, {y1:.1f})")
        if not any(w.text not in FOOTER_WORDS for w in words):
            failures.append(f"{pdf.name} page {index}: footer-only blank page")
    if len(notices) != 1 or notices != reminders:
        failures.append(f"{pdf.name}: sign-off rows split or duplicated")
    if "-short" in pdf.name and len(pages) != 1:
        failures.append(f"{pdf.name}: short quotation has {len(pages)} pages")
    if "-long-description" in pdf.name:
        first_page = pages[0].findall(".//x:word", NS)
        if not any(w.text == "Paragraph1" for w in first_page):
            failures.append(f"{pdf.name}: long description skips usable space on page one")
    all_words = [w.text for p in pages for w in p.findall(".//x:word", NS)]
    for case, prefix, count in [("long-description", "Paragraph", 100), ("long-notes", "Note", 80), ("long-terms", "Term", 100)]:
        if case in pdf.name:
            for number in range(1, count + 1):
                token = f"{prefix}{number}"
                if all_words.count(token) != 1:
                    failures.append(f"{pdf.name}: {token} missing or duplicated")
    # Headings and their first line must travel together.
    for heading, first in [("Terms", "Payment"), ("details", "Sample")]:
        heading_pages = [i for i, p in enumerate(pages) if any(w.text == heading for w in p.findall(".//x:word", NS))]
        first_pages = [i for i, p in enumerate(pages) if any(w.text == first for w in p.findall(".//x:word", NS))]
        if heading_pages and not any(i in first_pages for i in heading_pages):
            failures.append(f"{pdf.name}: orphaned {heading} heading")
    return failures, len(pages)


def main():
    chrome = os.environ.get("CHROME_BIN") or shutil.which("google-chrome") or shutil.which("chromium")
    if not chrome or not shutil.which("pdftotext"):
        raise SystemExit("Install Chrome and Poppler, or set CHROME_BIN.")
    output = os.environ.get("PAGINATION_OUTPUT_DIR")
    temp = None if output else tempfile.TemporaryDirectory(prefix="qa-qm-pagination-")
    directory = Path(output or temp.name).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    subprocess.run(["pnpm", "--filter", "web", "exec", "tsx", "tests/fixtures/qa-qm-pagination.tsx", str(directory)], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    failures = []
    for html in sorted(directory.glob("*.html")):
        pdf = html.with_suffix(".pdf")
        subprocess.run([chrome, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={pdf}", html.as_uri()], check=True, capture_output=True)
        issues, pages = check_pdf(pdf)
        failures.extend(issues)
        print(f"{'FAIL' if issues else 'PASS'} {pdf.name}: {pages} pages")
    if failures:
        print("\n".join(failures[:20]))
        raise SystemExit(1)
    print("PASS: all text stays inside page margins; footers and sign-off are intact.")


if __name__ == "__main__":
    main()
