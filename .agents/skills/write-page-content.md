# Skill — write the content for a new page

**Objective.** Produce one content JSON file that `tools/new_page.py` can build into a page.

## Rules of engagement
- Read `radiance-restore-website/tools/WRITEBRIEF.md` first, in full. It is binding.
- Research before writing. Look at what currently ranks for the target keyword and match
  the depth. Do not pad to hit a word count.
- Check `tools/content/clusters.json` for the primary keyword. If another page already
  owns it, stop and say so — two pages competing for one term is worse than one page.

## Steps
1. Fix the target: one primary keyword, four to five secondaries, one city.
2. Confirm the cluster is unclaimed.
3. Research the top three ranking pages. Note their length and what they leave out.
4. Draft to the JSON shape at the end of `WRITEBRIEF.md`:
   `slug, title, meta_description, h1, answer, intro, sections[], faqs[], closing,
   external_links[], internal_links[]`
5. Constrain the fields:
   - `title` — 60 characters or fewer, measured after unescaping entities
   - `meta_description` — 150 to 160 characters
   - `answer` — 35 to 55 words, the direct answer, first paragraph on the page
   - four to six sections, five to seven FAQs, 1,200 to 1,600 words of body copy
   - three to five internal links, two to three external, all `.gov` or `.edu`
6. Fetch every external URL. Drop any that do not load or are off topic.
7. Re-read against the banned list in `WRITEBRIEF.md`: unlock, elevate, nestled,
   in today's fast-paced world, look no further, we've got you covered.
8. Save to `radiance-restore-website/tools/content/<slug>.json` as a one-element array.

## Output
`tools/content/<slug>.json`

## Stop and ask if
- The page needs a price that is not in `tools/content/pricing.json`.
- The topic implies a service the business does not offer.
- The keyword is already owned by an existing page.
