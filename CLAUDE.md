# Radiance Restore Cleaners — website

Static site. 115 hand-built HTML pages in `radiance-restore-website/`, no framework, no
build step. Netlify deploys `main` automatically, so a push is a deploy.

Read `radiance-restore-website/README.md` before changing anything structural. It holds the
URL conventions, the `_redirects` groups and the accessibility invariants.

## Before you commit, both of these must pass

```bash
cd radiance-restore-website
python3 tools/check.py                       # exits non-zero on failure
python3 -m http.server 8888 & node tools/audit.js
```

`check.py` covers headings, JSON-LD, canonicals, title length, duplicate titles and
descriptions, and dead internal links. `audit.js` covers WCAG 2.1 A/AA, sideways scroll at
390px, broken images and the mobile menu. Neither is advisory.

## Adding a page

Never hand-write one. Write content JSON to `tools/content/<slug>.json` following
`tools/WRITEBRIEF.md`, then:

```bash
python3 tools/new_page.py tools/content/<slug>.json
python3 tools/sitemap.py
```

`new_page.py` clones the page shell — head, nav, footer, CSS, mobile menu, accessibility
markup — from an existing page, so a new page cannot drift from the other 115.

Then give it at least three inbound links from relevant existing pages, in body prose. A
page nothing links to does not get crawled properly.

## Hard rules

**Facts.** Never invent a price, review count, star rating, year founded, employee number,
award, or past job. The real Google rating is 5.0 from 6 reviews and it is the only rating
figure allowed on the site. Every dollar figure must trace to `tools/content/pricing.json`,
which mirrors the live calculator in `index.html`, or to it times the recurring discounts
(weekly 20%, bi-weekly 15%, monthly 10%).

**Geography.** Port St. Lucie and Fort Pierce are in **St. Lucie County**. Coral Springs,
Deerfield Beach and Coconut Creek are in **Broward County**. Everything else served is Palm
Beach County. Getting this wrong in copy is worse than a typo — it reads as an out-of-town
franchise.

**Scope.** The business cleans. It is not a home-watch service, property manager, HVAC
contractor, or mould remediation firm. Homeowner advice on a page must be attributed as
advice, never implied as a service.

**One page, one keyword cluster.** Check `tools/content/clusters.json` before writing. If a
primary keyword is already owned, improve that page instead of adding a competitor to it.

**URLs.** Internal links are extensionless: `/deep-cleaning`, never `/deep-cleaning.html`.
Rename a page and it owes a `301!` in `_redirects`, placed **above** the blanket `.html`
block at the bottom — Netlify takes the first match. Never delete an old rule.

## Three failures this repo has actually had

**A non-greedy regex ate a live page.** `<div class="x">[\s\S]*?</div>` stopped at the first
`</div>` rather than the matching one and deleted the city grid from `service-areas.html`.
It shipped and was caught in production. Count tag depth instead, and read the file after.

**Redirect ordering.** Rules added below the blanket `/*.html` line never fire.

**"Done" is not evidence.** A script printing a success message says nothing about whether
the HTML is right. Open the file and look.

## Deploying

Push to `main`. Netlify builds. Then confirm the live URL returns 200 with no redirect hop,
and submit it in Search Console and Bing Webmaster Tools.
