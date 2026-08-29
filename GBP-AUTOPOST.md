# GBP auto-post instructions

Read by the scheduled cloud routine "Radiance Restore GBP auto-post", which runs Tuesday and
Friday mornings. Edit this file to change what the routine does. It is read fresh on every run.

**Nobody reviews the output before it publishes to a live business profile. Get it right first time.**

---

## The business

Radiance Restore Cleaners. Residential house cleaning, based in Delray Beach, Florida.

- Phone `(561) 556-5899`, website `https://www.radiancerestore.org/`
- Open 24 hours, 7 days a week, and the phone is actually answered
- Cleaners are vetted, background checked, insured and bonded
- Woman owned
- Free re-clean within 24 hours if anything is missed
- No hidden fees, no upsells. Prices are published online, which most competitors do not do

Serves: Delray Beach, Boca Raton, Boynton Beach, Lantana, Lake Worth Beach, Gulf Stream,
Ocean Ridge, Highland Beach, West Palm Beach, Palm Beach, Wellington, Royal Palm Beach,
The Acreage, Palm Beach Gardens, Jupiter, Hobe Sound, Stuart, Port St. Lucie, Fort Pierce.

### Prices. Use only these. Never invent a number.

| Service | From | At 2,000 sq ft |
|---|---|---|
| Standard clean | $168 | $254 |
| Deep clean | $188 | $478 |
| Move in / move out | $204 | $544 |
| Post-construction | $356 | $868 |

Recurring discounts: 20% off weekly, 15% bi-weekly, 10% monthly.

A deep clean adds exactly three things over a standard clean: inside all appliances except the
refrigerator, blinds and shutters hand washed slat by slat rather than dusted, and baseboards
hand washed and scrubbed rather than dusted. 4 to 6 hours on an average home.

---

## Steps

### 1. Get the date

Run `date -u`. Everything below depends on it.

### 2. Pick the angle, and make it timely

Use WebSearch to check whether anything is genuinely live in South Florida right now that a
cleaning company can speak to honestly: a named storm or tropical system, a heat or air quality
event, red tide or an algae bloom, a large local event in Delray Beach or Boca Raton, or a
holiday inside the next 10 days.

If nothing is running, use the season:

| Months | What is actually happening |
|---|---|
| Jan to Mar | Peak snowbird season. Rentals turning over constantly. Spring cleaning starts in March |
| Apr | Snowbirds leaving. Close-down cleans, dust covers, fridge emptied |
| May to Jun | Quiet season. Deep cleans and renovation work. Hurricane season opens 1 June |
| Jul to Aug | Heat and humidity. Mildew, AC vents, salt film. Back to school mid August |
| Sep to Oct | Peak hurricane season. Post-storm cleanup. Prep before November arrivals |
| Nov | Snowbirds arriving. Home opening cleans. Thanksgiving hosting |
| Dec | Holiday hosting, guest rooms, after-party cleanup, New Year |

**Never claim a storm hit, or that damage occurred, unless a search confirms it.** Never imply
the company did work it did not do.

### 3. Choose ONE page to link

Rotate so the same service does not appear twice running. Compute the ISO week number. On
Tuesday start from index `(week * 2) % 24`, on Friday `(week * 2 + 1) % 24`, of this list:

```
 0 deep-cleaning                      12 bathroom-cleaning
 1 house-cleaning-delray-beach        13 house-cleaning-wellington
 2 standard-cleaning                  14 kitchen-cleaning
 3 house-cleaning-boca-raton          15 fort-pierce-house-cleaning
 4 move-in-out-cleaning               16 estate-cleaning
 5 palm-beach-house-cleaning          17 house-cleaning-jupiter
 6 airbnb-cleaning                    18 allergy-cleaning
 7 house-cleaning-boynton-beach       19 house-cleaning-palm-beach-gardens
 8 post-construction-cleaning         20 eco-friendly-cleaning
 9 house-cleaning-west-palm-beach     21 house-cleaning-coral-springs
10 recurring-cleaning                 22 interior-window-cleaning
11 port-st-lucie-house-cleaning       23 baseboard-cleaning
```

Depart from the rotation when the timely angle clearly points elsewhere. Seasonal pages worth
reaching for: `spring-cleaning`, `holiday-cleaning`, `emergency-cleaning`, `move-out-cleaning`,
`post-construction-cleaning`.

**Read the page before you write about it.** Open `radiance-restore-website/<slug>.html` and
read its `<title>` and meta description so the post matches what the page actually says. Never
promise something the page does not offer.

### 4. Verify the URL before using it

```bash
curl -sS -o /dev/null -w "%{http_code}" https://www.radiancerestore.org/<slug>
```

Must be `200`. A `301` or `404` means pick a different page. **Never send a URL you have not
checked.** A broken link in a live post is worse than no post.

### 5. Write the post

- 400 to 900 characters. The first 80 carry the hook, because mobile truncates there.
- Open with something the reader already feels, then say what we do about it, then the concrete detail.
- One specific number beats three adjectives.
- Close with the city list or a short CTA.

**Voice rules, all of them hard:**

- **No em dashes, no en dashes, no double hyphens.** Use a comma, a colon or a full stop.
  Hyphenated compounds like `post-construction` and `move-out` are fine.
- No hype: amazing, incredible, premier, top-notch, world-class, sparkling, pristine,
  immaculate, unbeatable, expert, trusted.
- No filler: "we pride ourselves on", "at the end of the day", "look no further".
- No fake urgency unless there is a real dated offer.
- No exclamation marks.
- Contractions are fine. Plain, short words. Understated.
- Never put the phone number in the post body. Google treats that as phone stuffing.

### 5b. Attach a real photo

**Use a real photo of real work. Never generate one.** These are already live on the domain at
permanent URLs, already the right format and size, and they show work this company actually did.
A generated image of a home we never entered would be a misrepresentation under Google's Fake
Engagement policy and an unsubstantiated performance claim under FTC guidance. It is also less
persuasive. Do not do it.

Pick the photo that matches the post subject. Prefix every filename with
`https://www.radiancerestore.org/`

| Post is about | Use one of |
|---|---|
| Deep clean, oven, appliances, move-out | `work-oven-card.jpg`, `oven-before.jpg`, `oven-after.jpg`, `work-oven-floor-before.jpg` |
| Bathroom, shower, tub, tile, grout, hard water | `work-tub-restoration.jpg`, `work-white-shower-tile.jpg`, `work-glass-shower-door.jpg`, `work-tub-tile-pink.jpg`, `work-tub-surround-after.jpg` |
| Kitchen, sink, range hood, degreasing | `photo-kitchen-sink.jpg`, `work-bar-sink.jpg`, `work-range-hood-interior.jpg`, `work-stove-exhaust-cover.jpg` |
| Floors, mopping, tile floors | `work-floor-after.jpg`, `photo-floor-mopping.jpg` |
| Windows, glass, sliders, salt film | `photo-window-squeegee.jpg`, `work-glass-shower-door-after.jpg` |
| Laundry, linens, Airbnb turnover | `photo-folding-towels.jpg` |
| Standard clean, recurring, general | `photo-kitchen-sink.jpg`, `photo-floor-mopping.jpg`, `photo-folding-towels.jpg` |
| Fixtures, faucets, hardware detail | `work-faucet-aerator.jpg`, `work-shower-valve.jpg`, `work-tub-faucet-handles.jpg`, `work-shower-head-handheld.jpg` |

Rotate within a row rather than always taking the first. Do not reuse the same photo two runs
running.

**Never use `work-stove-exhaust-fan-after.jpg`.** It is 231px on the short edge and Google
rejects anything under 250px.

**Verify the image before you send it:**

```bash
curl -sS -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" <image-url>
```

Require `200`, a content type of `image/jpeg` or `image/png`, and a size above 10240 bytes.
If any of those fail, pick another photo. If none verify, **omit `media_items` entirely** and
send the post without a picture. A post with no photo is fine. A post with a broken media URL
errors out.

### 6. Send it

```bash
curl -sS -X POST "https://hook.us2.make.com/713tjg70za1ad70hg4l7um8du6t8f9c6" \
  -H "Content-Type: application/json" --data-binary @payload.json \
  -w "\nHTTP %{http_code}\n"
```

Payload. **These field names are a fixed contract. Do not rename, reorder or drop any of them.**

```json
{
  "business_name": "Radiance Restore Cleaners",
  "post_type": "WHATS_NEW",
  "topic": "<short headline, becomes the post title>",
  "summary": "<the post body>",
  "cta_type": "LEARN_MORE",
  "cta_url": "<the verified page URL>",
  "phone": "(561) 556-5899",
  "website": "https://www.radiancerestore.org/",
  "target_cities": ["<3 to 5 cities relevant to this post>"],
  "primary_keyword": "<service plus city>",
  "image_brief": "<one sentence describing the photo this post should have>",
  "services_referenced": ["<services named in the post>"],
  "media_items": ["<the verified image URL>"],
  "voice_refs": ["GBP-AUTOPOST.md"],
  "created_at": "<today, YYYY-MM-DD>",
  "source": "gbp-autopost"
}
```

`cta_type` must be one of `BOOK`, `ORDER`, `SHOP`, `LEARN_MORE`, `SIGN_UP`, `CALL`. Use
`LEARN_MORE` for guide and service pages, `BOOK` when the post is a direct call to book.

`media_items` is an array of strings and Make reads the first element. If no photo verified,
**omit the key entirely.** Never send an empty array, a null, or an unverified URL.

### 7. Report

Print the full JSON you sent, the HTTP status, the page you linked, and why you chose that
angle. If the webhook returns anything other than 200, print the error and stop. Do not retry
more than twice.

---

## Rules that override everything

1. **Never invent a price, a statistic, a review, or an award.**
2. **Never claim work the company did not do.** Only the real job photos listed above may be
   attached. Never generate, source or link an image of a home this company did not clean.
3. **Never send an unverified URL.**
4. **Never post about a disaster as a sales opportunity.** If a storm has hit, the tone is
   availability and help, not promotion. If it would read badly to someone who just lost a
   roof, do not send it.
5. **If anything fails, send nothing.** A skipped post costs nothing. A wrong one is public.
