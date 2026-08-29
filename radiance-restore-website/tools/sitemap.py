#!/usr/bin/env python3
"""Rebuild sitemap.xml from whatever .html files are actually in the site root."""
import glob, os, re, datetime, json

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = 'https://www.radiancerestore.org'
EXCLUDE = set()   # add a stem here to keep a page out of the sitemap

guides = set()
inv = os.path.join(SITE, 'tools', 'content', 'slugmap.json')
if os.path.exists(inv):
    guides = set(json.load(open(inv)).values())

TOP = {'service-areas', 'cleaning-guides', 'contact', 'book-with-us-today',
       'house-cleaning-prices-palm-beach'}

def priority(s):
    if s == 'index': return '1.0'
    if s in TOP:     return '0.9'
    if s in guides:  return '0.7'
    return '0.8'

today = datetime.date.today().isoformat()
stems = sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(SITE, '*.html')))
stems = [s for s in stems if s not in EXCLUDE]

lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for s in stems:
    loc = D + '/' if s == 'index' else f'{D}/{s}'
    lines.append(f'  <url><loc>{loc}</loc><lastmod>{today}</lastmod>'
                 f'<changefreq>weekly</changefreq><priority>{priority(s)}</priority></url>')
lines.append('</urlset>')
open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(f'sitemap.xml rebuilt: {len(stems)} URLs')
