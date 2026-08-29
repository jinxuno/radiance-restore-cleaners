# Working on this site in Antigravity

The big change: **you stop uploading files by hand.** Push to `main` and Netlify builds
the site itself. The zip-and-drag routine goes away entirely.

---

## One-time setup

1. **Get Git and Node.** Node 18.18 or newer.

2. **Clone the repo** — in Antigravity, *File → Clone Repository*:
   ```
   https://github.com/jinxuno/radiance-restore-cleaners
   ```
   Open the folder it creates. `.agents/` sits at the top level; the site itself is in
   `radiance-restore-website/`.

3. **Install the audit tooling** (once, inside the repo):
   ```bash
   npm init -y
   npm i -D playwright axe-core
   npx playwright install chromium
   ```

4. **Check the pipeline runs:**
   ```bash
   cd radiance-restore-website
   python3 tools/check.py
   ```
   It should say `checked 115 pages` and `all clear`. If it does not, stop — something
   did not clone correctly.

---

## What Antigravity picks up automatically

`.agents/` is a directory Antigravity reads natively.

| File | What it does |
|---|---|
| `.agents/agents.md` | Three personas: content writer, build engineer, QA reviewer |
| `.agents/skills/*.md` | The actual procedures, one per step |
| `.agents/workflows/add-page.md` | The order they run in, and where a human approves |

You do not paste these into a prompt. Ask for a new page and the agent finds them.

---

## Making a page

Ask for it in plain words:

> Add a page for "office cleaning Jupiter FL". Follow the add-page workflow.

The agent then writes content to `tools/content/`, shows you the title and headings for
approval, builds the page, wires up inbound links, rebuilds the sitemap, runs both gates,
and asks before pushing.

You approve twice: once on the words, once before it goes live.

---

## The tools it uses

| Command | What it does |
|---|---|
| `python3 tools/new_page.py tools/content/<slug>.json` | Builds a page. Clones the shell from a real page so nav, footer, CSS and accessibility markup cannot drift |
| `python3 tools/sitemap.py` | Rebuilds `sitemap.xml` from the files actually present |
| `python3 tools/check.py` | Headings, JSON-LD, canonicals, title length, duplicate titles, dead links. **Exits non-zero on failure** |
| `node tools/audit.js` | WCAG 2.1 A/AA, sideways scroll at 390px, broken images, mobile menu. Needs a local server on port 8888 |

Both gates return a non-zero exit code, so they work as real CI. If you ever want this
enforced automatically, they drop straight into a GitHub Action.

---

## The reference files

`tools/WRITEBRIEF.md` is the important one. Voice, banned phrases, the binding business
facts, and the JSON shape every page is built from. It is what stops a generated page
from inventing a price or putting Port St. Lucie in the wrong county.

`tools/content/pricing.json` is a copy of the live calculator. Every dollar figure on the
site traces back to it. If a number is not in that file, it does not belong on a page.

`tools/content/clusters.json` records which keyword each page owns. Check it before
writing anything new — two pages chasing one search term is the quiet failure that is
hardest to spot later.

---

## Three things that have actually gone wrong here

Worth reading before you let an agent loose on the repo.

**Non-greedy regex ate a live page.** A `<div class="x">.*?</div>` replacement stopped at
the first `</div>` instead of the matching one and deleted the city grid from
`service-areas.html`. It shipped. Match tag depth by counting instead, and always read the
file afterwards.

**Redirect order.** `_redirects` has a blanket `/*.html` rule at the bottom. Netlify takes
the first match, so anything added below it never fires. New rules go above that block.

**"Done" is not evidence.** A script printing a success message says nothing about whether
the HTML is correct. Open the file.

---

## Deploying

```bash
git add -A
git commit -m "what changed"
git push
```

Netlify picks up `main` and builds. Watch it finish, then load the real URL and confirm it
returns 200 with no redirect hop.

Then submit the new URL in Search Console and Bing Webmaster Tools. Bing's URL Submission
allows 100 a day; Google's Request Indexing is roughly 5 to 10 on a rolling day.
