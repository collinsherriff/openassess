# OpenAssess

**A free, education-only toolkit for the whole assessment lifecycle — running entirely in your browser.**

A “TinyWow / iLovePDF for teachers,” but every tool serves assessment & content workflows, there are no paywalls, and nothing you upload ever leaves your machine. Import an existing test, organize your questions once, then reuse them everywhere — as a quiz, a printable worksheet, flashcards, or a QTI export for your LMS.

> Live site: enable **GitHub Pages** (see below) and it deploys to `https://collinsherriff.github.io/openassess/`

---

## Why it exists

Teachers currently stitch together paid converters, clunky LMS exports and a lot of manual copy-paste just to reuse a test they already wrote. OpenAssess puts the whole assessment lifecycle in one free place, built around **items** — reusable questions — as the backbone.

- 🔓 **Genuinely free** — static site, open-source, no accounts, no locked exports.
- 🔒 **Privacy-first** — all parsing, grading and reporting run client-side. Student data and exam papers are never uploaded. Makes FERPA/GDPR conversations short.
- 🧩 **Interoperable** — speaks QTI 2.1, QTI 1.2, Moodle XML, GIFT, Aiken and CSV.
- ⚡ **Low-friction** — no install, works offline once loaded, your item bank follows you between tools.

---

## The tools (all fully working)

| Tool | What it does |
|------|--------------|
| **PDF → QTI** | Extracts questions from a PDF/text test and exports a QTI 2.1 content package (a `.zip`) that imports into Canvas, Moodle, Blackboard, Brightspace. Detects MC, multi-answer, true/false, short-answer and answer keys. |
| **Format Converter** | Round-trips question banks between QTI ⇄ Moodle XML ⇄ GIFT ⇄ Aiken ⇄ CSV. |
| **Item Bank** | Store, tag, filter and reuse every question. The home base other tools read from. Backs up to CSV / JSON / QTI. |
| **Smart Search** | TF-IDF + cosine-similarity search over your bank — matches on meaning, plus “more like this.” Runs offline, no model download. |
| **Quiz & Worksheet Maker** | Assemble a filtered, shuffled quiz; print a worksheet + answer key, export to QTI/Moodle, or deliver it live. |
| **Test Player** | Deliver an assessment in-browser with a timer, shuffling and instant auto-grading. Saves results for reporting. |
| **Report Maker** | Class, attempt and item-level reports with item analysis (p-value + too-easy/too-hard flags). |
| **Rubric Builder** | Weighted criteria × performance levels, printable to PDF, autosaved. |
| **Flashcard Maker** | Turn items (or a term=definition list) into a flip-card deck; export to Anki/Quizlet. |
| **Reading-Level Analyzer** | Flesch–Kincaid, Reading Ease, SMOG, Gunning Fog and ARI for any passage or your item stems. |

---

## Architecture

Zero build step. Plain ES modules, no framework.

```
index.html            SPA shell + hash router entry
css/styles.css        design system (light/dark)
js/app.js             router, theme, home & static pages, tool registry
js/lib/
  model.js            canonical Question model + grading
  store.js            item bank + results persistence (localStorage)
  formats.js          GIFT / Aiken / Moodle XML / CSV import & export
  qti.js              QTI 2.1 builder + content-package zip + QTI 1.2/2.x parser
  textparse.js        heuristic text → questions (numbered stems, options, answer keys)
  editor.js           reusable inline question editor
  ui.js               tiny DOM helpers (no framework)
js/tools/*.js         one module per tool, lazy-loaded by the router
```

The only third-party runtime dependencies are **pdf.js** (PDF text extraction) and **JSZip** (QTI packaging), both loaded from a CDN. They never receive document content — extraction happens in your browser.

---

## Run locally

Any static file server works (ES modules need `http://`, not `file://`):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploy to GitHub Pages

The included workflow (`.github/workflows/pages.yml`) deploys `main` automatically. Enable it once:

1. Push to GitHub (already done if you're reading this on GitHub).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. The site publishes to `https://<user>.github.io/openassess/`.

---

## Roadmap ideas

- Standards-alignment mapper (Common Core / state standards)
- OCR bulk-grading of scanned student work
- On-device AI distractor generation & auto-tagging (Bloom's + difficulty)
- Accessibility checker for materials
- QTI 3.0 export
- Optional school tier for shared, synced item banks

## License

MIT — see [LICENSE](LICENSE). Free for schools, teachers and everyone. Contributions welcome.
