# Brief — local service pages for Radiance Restore Cleaners

Real, family-run cleaning company. This copy goes live on their site. Accuracy first.

## Binding facts — never contradict, never embellish
- Radiance Restore Cleaners (Radiance Restore LLC), based in Palm Beach, FL
- Phone (561) 556-5899 · admin@radiancerestore.org · open 24 hours, 7 days a week
- Service area: Palm Beach, West Palm Beach, North Palm Beach, Palm Beach Gardens, Royal Palm Beach,
  Wellington, Boynton Beach, Lake Worth, Lantana, Loxahatchee, Jupiter, Juno Beach, Delray Beach,
  Boca Raton, Deerfield Beach, Coconut Creek, Coral Springs, Port St. Lucie, Fort Pierce, Stuart
- Port St. Lucie and Fort Pierce are in ST. LUCIE COUNTY. Coral Springs, Deerfield Beach and
  Coconut Creek are in BROWARD COUNTY. Never place a city in the wrong county.
- Bookable services: Standard, Deep, Move-In/Move-Out, Airbnb/VRBO, Post-Construction cleaning.
  Also now taking carpet, tile, window, upholstery and commercial/janitorial work — for those,
  do NOT invent checklists, equipment, chemicals or certifications. Describe plainly, route to a quote.
- Cleaners are background-checked, reference-checked, interviewed in person, insured and trained
- 100% satisfaction guarantee: tell them within 24 hours and they re-clean free
- Flat pricing quoted upfront from real square footage. There is an instant price calculator on
  the homepage — link to it, it is a genuine advantage (most competitors publish no pricing at all)
- Recurring discounts: Weekly 20% off, Bi-Weekly 15% off, Monthly 10% off
- Real Google rating: 5.0 from 6 reviews. Real reviewer names you may quote:
  Faudeline Elveus, Baniel Ovilus, madara kedar. Do not invent reviews or inflate the count.

## Voice — this is the part people get wrong
Warm, dry, and human. A little wit. Think a good neighbour who happens to clean houses for a
living, not a brand. Land the occasional joke, then get back to being useful.
- Bone-dry beats zany. One good line per few paragraphs, not a comedy set.
- Never joke about a customer's mess in a way that could sting. Joke about grout, lovebugs,
  humidity, the sock behind the dryer, Florida in August. Never about the reader's housekeeping.
- Banned: "unlock", "elevate", "nestled", "in today's fast-paced world", "look no further",
  "we've got you covered", "sparkling clean" as filler, exclamation-mark stacking.
- Short sentences. Active voice. 8th–10th grade reading level.
- Never invent awards, star counts, years in business, employee numbers, prices, or past jobs.
- Never promise outcomes outside their control (no "guaranteed full deposit back").

## What the competition is missing — beat them here
Research on the current top-ranking pages for these keywords found:
- 16 of 18 publish NO pricing. We link to a working instant quote.
- Florida reality is nearly absent from their copy: humidity, mould, salt air, hurricane season,
  lovebugs, snowbirds, gated-community access, HOA rules. Use it. It is the whole differentiator.
- Only 7 of 18 have an FAQ, and none answer the money questions.
- Franchise pages are city-swapped duplicates. Every page you write must be genuinely different.

## Length and structure
Target 1,200–1,600 words of body copy. Match the SERP, do not pad.
Primary keyword must appear in the H1, the title, the meta description, and within the first
100 words. H2s should carry supporting keywords and real questions. Never stuff.

## Output — strict JSON array, no markdown fence, no commentary
[{
 "slug": "<given, unchanged>",
 "title": "<50-60 chars, primary keyword near the start, ends with | Radiance Restore Cleaners only if it fits>",
 "meta_description": "<150-160 chars, primary keyword + benefit + soft CTA>",
 "h1": "<contains primary keyword naturally>",
 "answer": "<the direct answer to the query, 35-55 words, first paragraph on the page>",
 "intro": "<70-110 words, includes primary keyword, sets up the page>",
 "sections": [
   {"h2":"<specific, keyword-bearing or a real question>",
    "paras":["<60-110 words>","<60-110 words>"],
    "bullets":["<optional, 4-8 short concrete items>"]}
   x 4-6 sections
 ],
 "faqs": [{"q":"<a real People-Also-Ask style question>","a":"<45-80 words, direct>"} x 5-7],
 "closing": "<50-80 words, warm, light, no hard sell>",
 "external_links": [{"url":"<real, verified, authoritative .gov/.edu/major-industry URL>","anchor":"<descriptive>","context":"<which section it belongs in>"} x 2-3],
 "internal_links": [{"slug":"<one of the site's real pages>","anchor":"<descriptive anchor text>"} x 3-5]
}]

## Verifying external links
You MUST fetch every external URL before citing it and confirm it loads and is on-topic.
Drop any that 404 or redirect somewhere unrelated. Good candidates: epa.gov (mould, Safer Choice),
cdc.gov (cleaning and disinfection), nhc.noaa.gov (hurricane season), floridahealth.gov,
ask.ifas.ufl.edu (Florida home care). Never cite a competitor.

## Internal link targets that exist on the site
/standard-cleaning, /deep-cleaning, /move-in-out-cleaning, /airbnb-cleaning,
/post-construction-cleaning, /book-with-us-today, /contact, /about-us,
/our-work, /cleaning-guides, /service-areas, /house-cleaning-prices-palm-beach,
/palm-beach-house-cleaning, /port-st-lucie-house-cleaning, /fort-pierce-house-cleaning
Plus any of the 60 guide pages or 31 local landing pages (use its slug).

## Anti-cannibalisation — important
Each page owns ONE primary keyword. Do not write a page that competes with its siblings.
A "maid service in X" page must be about recurring domestic help and the people who do it.
A "house cleaning in X" page must be the general service overview for that city.
A "deep cleaning in X" page must be about the once-or-twice-a-year reset.
A "move-in / move-out cleaning in X" page must be about handover, deposits and empty houses.
If two of your pages share a city, they must not share their angle, their examples or their FAQs.
Check tools/content/clusters.json before you start. If the primary keyword is already owned,
improve that page instead of adding a second one that competes with it.
