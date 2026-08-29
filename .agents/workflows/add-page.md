# Workflow — add a page to the site

Run the three skills in order. Each one gates the next.

1. **SEO Content Writer** → `skills/write-page-content.md`
   Produces `tools/content/<slug>.json`.
   **Approval gate:** show the human the title, H1, answer paragraph and the section
   headings before building. Words are cheap to change now and expensive later.

2. **Build Engineer** → `skills/build-page.md`
   Produces `<slug>.html`, updated sitemap, inbound links.

3. **QA Reviewer** → `skills/verify-and-ship.md`
   Runs both gates. On failure, hand back to whichever agent owns the problem —
   content problems to the writer, structural problems to the engineer. Do not
   patch someone else's layer.

**Approval gate before step 3's push.** Nothing reaches the live site without a human
saying so.

## Doing several pages at once
Run step 1 for every page first, so the whole set can be checked for keyword overlap
before any of it is built. Two pages quietly competing for one search term is the
failure mode that is hardest to see later.
