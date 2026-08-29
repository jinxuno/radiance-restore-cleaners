#!/usr/bin/env python3
"""
Structural gate. Run before every commit. Exits non-zero if anything is wrong.

Catches the things that have actually broken this site before: a heading level
skipped, a canonical pointing at the wrong URL, a link to a page that does not
exist, a title too long to survive the search results page, a duplicate title.
"""
import glob, os, re, json, html, sys

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = 'https://www.radiancerestore.org'
pages = sorted(glob.glob(os.path.join(SITE, '*.html')))
stems = {os.path.basename(p)[:-5] for p in pages}
bad = []

titles, descs, h1s = {}, {}, {}
for p in pages:
    stem = os.path.basename(p)[:-5]
    s = open(p, encoding='utf-8').read()
    say = lambda m: bad.append(f'{stem}: {m}')

    hs = [int(m.group(1)) for m in re.finditer(r'<h([1-6])\b', s)]
    if hs.count(1) != 1:
        say(f'{hs.count(1)} h1 tags, expected exactly 1')
    prev = 0
    for h in hs:
        if prev and h > prev + 1:
            say(f'heading level skipped, h{prev} -> h{h}')
            break
        prev = h

    for m in re.finditer(r'<script type="application/ld\+json">([\s\S]*?)</script>', s):
        try:
            json.loads(m.group(1))
        except Exception as e:
            say(f'invalid JSON-LD: {str(e)[:70]}')

    for t in ('div', 'section', 'main', 'article', 'ul', 'table'):
        if len(re.findall(rf'<{t}\b', s)) != len(re.findall(rf'</{t}>', s)):
            say(f'unbalanced <{t}> tags')

    want = D + ('/' if stem == 'index' else '/' + stem)
    c = re.search(r'<link rel="canonical" href="([^"]+)"', s)
    if not c:            say('no canonical')
    elif c.group(1) != want: say(f'canonical is {c.group(1)}, expected {want}')
    og = re.search(r'<meta property="og:url" content="([^"]+)"', s)
    if og and og.group(1) != want: say(f'og:url is {og.group(1)}, expected {want}')

    t = re.search(r'<title>([\s\S]*?)</title>', s)
    if not t: say('no title')
    else:
        tt = html.unescape(t.group(1))
        if len(tt) > 60: say(f'title is {len(tt)} chars, keep it to 60')
        titles.setdefault(tt, []).append(stem)
    d = re.search(r'<meta name="description" content="([^"]*)"', s)
    if not d: say('no meta description')
    else:
        if not 70 <= len(d.group(1)) <= 170:
            say(f'meta description is {len(d.group(1))} chars, aim for 150-160')
        descs.setdefault(d.group(1), []).append(stem)
    h1 = re.search(r'<h1[^>]*>([\s\S]*?)</h1>', s)
    if h1: h1s.setdefault(re.sub(r'<[^>]+>', '', h1.group(1)).strip().lower(), []).append(stem)

    for href in set(re.findall(r'href="(/[^"#?]*)"', s)):
        k = href.lstrip('/')
        if k.endswith('.html'):
            say(f'internal link still has .html: {href}')
            k = k[:-5]
        if k in ('', 'index') or '.' in k.split('/')[-1]:
            continue
        if k not in stems:
            say(f'link to a page that does not exist: {href}')

for label, d in (('title', titles), ('meta description', descs), ('h1', h1s)):
    for v, who in d.items():
        if len(who) > 1:
            bad.append(f'duplicate {label} on {", ".join(who)}: "{v[:60]}"')

print(f'checked {len(pages)} pages')
if bad:
    print(f'\n{len(bad)} problem(s):')
    for b in bad: print('  -', b)
    sys.exit(1)
print('all clear')
