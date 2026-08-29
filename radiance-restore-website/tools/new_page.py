#!/usr/bin/env python3
"""
Build one new page from a content JSON file.

    python3 tools/new_page.py tools/content/my-page.json

The JSON shape is the one described in tools/WRITEBRIEF.md. The page's shell —
<head>, nav, footer, CSS, mobile menu, accessibility invariants — is cloned from an
existing page so a new page can never drift from the rest of the site.

Writes <slug>.html into the site root, then tells you to run tools/sitemap.py.
"""
import json, re, html, os, sys

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D    = 'https://www.radiancerestore.org'
# Any real page works as the shell. This one has the full structure (answer box, TOC).
TEMPLATE = 'house-cleaning-boca-raton.html'

esc  = lambda s: html.escape(s, quote=False)
attr = lambda s: html.escape(s, quote=True)


def table_html(t):
    head = ''.join(f'<th scope="col">{c}</th>' for c in t['head'])
    rows = ''
    for r in t['rows']:
        rows += '<tr>' + f'<th scope="row">{r[0]}</th>' + ''.join(f'<td>{c}</td>' for c in r[1:]) + '</tr>'
    # tabindex+role: a scrollable box must be reachable by keyboard or axe fails it
    return (f'<div class="table-scroll reveal" tabindex="0" role="region" aria-label="{attr(t["caption"])}">'
            f'<table class="price-table"><caption>{esc(t["caption"])}</caption>'
            f'<thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>')


def linkify(text, links, used):
    """Turn the first occurrence of each anchor into a link. Once per page, never twice."""
    for l in links:
        a = l['anchor']
        if a in used:
            continue
        href = l.get('url') or ('/' + l['slug'])
        ext  = ' target="_blank" rel="noopener"' if l.get('url') else ''
        new, n = re.subn(re.escape(a), f'<a href="{attr(href)}"{ext}>{esc(a)}</a>', text, count=1)
        if n:
            text = new
            used.add(a)
    return text


def build(p, parent=('/cleaning-guides', 'Cleaning Guides'), extra_ld=None):
    slug = p['slug']
    url  = f'{D}/{slug}'
    shell = open(os.path.join(SITE, TEMPLATE), encoding='utf-8').read()
    head  = shell[:shell.index('<main id="main">')]
    tail  = shell[shell.index('</main>') + len('</main>'):]

    used = set()
    links = p.get('internal_links', []) + p.get('external_links', [])
    o = ['<main id="main">', '<section class="seo-hero">\n  <div class="wrap">']
    if p.get('eyebrow'):
        o.append(f'    <div class="eyebrow" style="text-align:center;">{esc(p["eyebrow"])}</div>')
    o.append(f'    <h1 class="reveal">{esc(p["h1"])}</h1>')
    o.append(f'    <p class="reveal">{p.get("hero_sub","Palm Beach County and the Treasure Coast &middot; open 24 hours")}</p>')
    o.append('    <p class="reveal" style="margin-top:16px;"><a class="btn btn-primary" href="/book-with-us-today">Get Your Instant Price</a> '
             '<a class="btn" href="tel:+15615565899" style="margin-left:8px;">Call (561) 556-5899</a></p>')
    o.append('  </div>\n</section>\n<section class="seo-body">\n  <div class="wrap">')
    o.append(f'    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>&rsaquo;</span>'
             f'<a href="{parent[0]}">{esc(parent[1])}</a><span>&rsaquo;</span>{esc(p["h1"].split(":")[0])}</nav>')
    o.append(f'    <p class="answer-box reveal">{linkify(esc(p["answer"]), links, used)}</p>')
    o.append(f'    <p class="reveal">{linkify(esc(p["intro"]), links, used)}</p>')

    o.append('    <nav class="toc reveal" aria-label="On this page">\n      <h2>On this page</h2>\n      <ol>')
    for i, s in enumerate(p['sections'], 1):
        o.append(f'      <li><a href="#s{i}">{esc(s["h2"])}</a></li>')
    o.append('      <li><a href="#faq">Frequently asked questions</a></li>\n      </ol>\n    </nav>')

    for i, s in enumerate(p['sections'], 1):
        o.append(f'    <h2 id="s{i}" class="reveal">{esc(s["h2"])}</h2>')
        for para in s['paras']:
            o.append(f'    <p class="reveal">{linkify(esc(para), links, used)}</p>')
        if s.get('table'):
            o.append('    ' + table_html(s['table']))
        if s.get('bullets'):
            o.append('    <ul class="checklist reveal">')
            for b in s['bullets']:
                o.append(f'      <li>{linkify(esc(b), links, used)}</li>')
            o.append('    </ul>')
        o.append('    <a class="to-top" href="#main">Back to top</a>')

    o.append('    <h2 id="faq" class="reveal">Frequently asked questions</h2>')
    for f in p['faqs']:
        o.append(f'    <div class="faq-item reveal">\n      <strong>{esc(f["q"])}</strong>\n'
                 f'      <p>{linkify(esc(f["a"]), links, used)}</p>\n    </div>')
    o.append('    <a class="to-top" href="#main">Back to top</a>')
    o.append(f'    <p class="reveal">{linkify(esc(p["closing"]), links, used)}</p>')

    leftover = [l for l in p.get('internal_links', []) if l['anchor'] not in used]
    if leftover:
        o.append('    <p class="next-step reveal">Related: ' +
                 ' &middot; '.join(f'<a href="/{l["slug"]}">{esc(l["anchor"])}</a>' for l in leftover) + '</p>')
    o.append('  </div>\n</section>\n<section class="seo-cta">\n  <div class="wrap">\n'
             '    <a class="btn btn-primary" href="/book-with-us-today">Get a Free Quote &rarr;</a>\n'
             '    <a class="btn btn-ghost" href="tel:+15615565899" style="margin-left:10px;">Call (561) 556-5899</a>\n'
             '  </div>\n</section>\n</main>')

    h = head
    h = re.sub(r'<title>[\s\S]*?</title>', f'<title>{esc(p["title"])}</title>', h, count=1)
    h = re.sub(r'<meta name="description" content="[^"]*"',
               f'<meta name="description" content="{attr(p["meta_description"])}"', h, count=1)
    h = re.sub(r'<link rel="canonical" href="[^"]*"', f'<link rel="canonical" href="{url}"', h, count=1)
    for tag, val in (('og:title', p['title']), ('twitter:title', p['title']),
                     ('og:description', p['meta_description']), ('twitter:description', p['meta_description'])):
        h = re.sub(rf'<meta (property|name)="{tag}" content="[^"]*"',
                   lambda m: f'<meta {m.group(1)}="{tag}" content="{attr(val)}"', h, count=1)
    h = re.sub(r'<meta property="og:url" content="[^"]*"', f'<meta property="og:url" content="{url}"', h, count=1)
    h = re.sub(r'alt="Radiance Restore Cleaners logo[^"]*"', 'alt="Radiance Restore Cleaners logo"', h)

    blocks = re.findall(r'<script type="application/ld\+json">[\s\S]*?</script>', h)
    provider = json.loads(re.search(r'<script type="application/ld\+json">([\s\S]*?)</script>', h).group(1))['provider']
    svc = {"@context": "https://schema.org", "@type": "Service", "name": p['h1'],
           "serviceType": p.get('service_type', 'House Cleaning'),
           "description": p['meta_description'], "url": url,
           "areaServed": {"@type": "City", "name": p.get('city', 'Palm Beach'),
                          "addressRegion": "FL", "addressCountry": "US"},
           "provider": provider}
    if extra_ld:
        svc.update(extra_ld)
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": f['q'],
         "acceptedAnswer": {"@type": "Answer", "text": f['a']}} for f in p['faqs']]}
    crumb = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": D + "/"},
        {"@type": "ListItem", "position": 2, "name": parent[1], "item": D + parent[0]},
        {"@type": "ListItem", "position": 3, "name": p['h1'], "item": url}]}
    for old, new in zip(blocks, [svc, faq, crumb]):
        h = h.replace(old, '<script type="application/ld+json">\n' + json.dumps(new, indent=1) + '\n</script>', 1)

    out = os.path.join(SITE, f'{slug}.html')
    open(out, 'w', encoding='utf-8').write(h + '\n'.join(o) + tail)
    return out


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    for page in (data if isinstance(data, list) else [data]):
        path = build(page, tuple(page.get('breadcrumb_parent', ['/cleaning-guides', 'Cleaning Guides'])))
        print('wrote', os.path.basename(path))
    print('\nNow run:  python3 tools/sitemap.py  &&  python3 tools/check.py')
