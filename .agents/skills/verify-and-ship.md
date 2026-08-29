# Skill — verify, then ship

**Objective.** Prove the site is not broken, then deploy it.

## Rules of engagement
- Both gates must exit zero. A failing check is never "close enough".
- Read the built HTML, not the console output of whatever produced it.

## Steps
1. `cd radiance-restore-website && python3 tools/check.py`
   Headings, JSON-LD, tag balance, canonicals, title length, duplicate titles and
   descriptions, dead internal links, leftover `.html` links.
2. Start a local server and run the accessibility gate:
   ```
   python3 -m http.server 8888 &
   node tools/audit.js
   ```
   WCAG 2.1 A/AA, horizontal overflow at 390px, broken images, mobile menu.
3. Check every price on any page you touched against `tools/content/pricing.json`.
   No figure may appear that is not in that file or derived from it by the
   20/15/10 percent recurring discounts.
4. Confirm the new page has three or more inbound internal links.
5. Commit with a message that says what changed, and push.
6. Netlify builds from `main` automatically. Watch the deploy finish, then load the
   real URL and confirm it returns 200 with no redirect hop.
7. Submit the new URL in Google Search Console and Bing Webmaster Tools.

## Output
A green deploy and a live URL.

## Stop and ask if
- `check.py` or `audit.js` fails and the fix would mean changing shared CSS or the
  page shell. That affects all 115 pages and is not a solo decision.
