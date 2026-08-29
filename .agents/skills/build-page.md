# Skill — build the page

**Objective.** Turn a content JSON into a live-ready HTML page wired into the site.

## Rules of engagement
- Do not hand-write HTML. The generator exists so a new page cannot drift from the others.
- Do not edit the shared shell to accommodate one page.

## Steps
1. `cd radiance-restore-website`
2. `python3 tools/new_page.py tools/content/<slug>.json`
3. Open the generated `<slug>.html` and confirm the H1, title and canonical are right.
   Do not skip this because the script printed a filename.
4. Wire up inbound links — a page with no links pointing at it will not be crawled well.
   Add a link from at least three relevant existing pages, in the body prose where it
   makes sense, not in a bolted-on list.
5. If the page belongs in the guides index, add a card to `cleaning-guides.html` in the
   matching group, with a `data-search` attribute so the on-page search finds it.
6. `python3 tools/sitemap.py`
7. If you renamed or moved anything, add `301!` rules to `_redirects` **above** the
   blanket `.html` block at the bottom of the file.

## Output
`<slug>.html`, an updated `sitemap.xml`, and edits to the pages that now link to it.

## Never
- Replace a block of HTML with a non-greedy regex. Match tag depth by counting instead.
  A `<div class="x">.*?</div>` pattern has silently deleted live page sections here before.
- Leave an internal link ending in `.html`.
- Delete an existing redirect rule.
