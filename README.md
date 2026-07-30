# Gill Auto Glass, Website

Single-page static site for **Gill Auto Glass Ltd.** (Saskatoon, SK): SGI-accredited
auto glass, mobile windshield replacement, in-house ADAS calibration.

Plain HTML/CSS/JS, **no build tools, no frameworks, no backend**. Three.js (3D glass
hero) and GSAP ScrollTrigger (scroll reveals) load from CDN.

## Files

```
index.html      , the whole site (all sections, wizard, FAQ, schema)
privacy.html    , privacy policy page (TEMPLATE, owner should review)
css/styles.css  , all styles; design tokens at the top
js/main.js      , CONFIG + all behavior (wizard, chatbot, reveals, 3D loader)
js/hero-glass.js, the Three.js shattered-glass hero (loaded on demand)
```

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Editing business info

Open `js/main.js`, the `CONFIG` object at the very top is marked
**“EDIT BUSINESS INFO HERE.”** Phone, email, address, hours, service area, and the
response promise live there. The scripts (quote emails, chatbot answers, every
`tel:` / `sms:` / `mailto:` link) read from CONFIG automatically.

The same facts also appear as **visible text** in `index.html` (and in the JSON-LD
blocks in `<head>`). If a fact changes, update CONFIG **and** find-and-replace the
old value in `index.html`.

**Hours are the exception, and the model to follow:** they live *only* in
`CONFIG.hours`. On page load the script renders them into the footer and contact
section (`[data-hours]` elements), builds the chatbot answer, and rewrites the
LocalBusiness `openingHoursSpecification`. Edit hours in one place, `CONFIG.hours`
in `js/main.js`, and every mention updates. (The static JSON-LD keeps a matching
copy as a no-JavaScript fallback for crawlers; update it too if you change hours.)

## Before launch, owner checklist

Search `index.html` for `TODO` to find every item below in place:

- [ ] **OWNER VERIFY: SGI claim wording**, the claims section, claims FAQ, and the
      claims resource article. Confirm the process description is accurate.
- [ ] **SGI Preferred Partner logo**, upload the official PNG to
      `assets/photos/sgi-preferred-partner.png`. The trust-badge slot is already
      wired; until the file exists the badge auto-hides. Do not recolour or alter
      the logo.
- [ ] **Logo**, the nav uses a text wordmark. Replace it with the owner's vector
      logo when available (marked with a TODO in `index.html`).
- [ ] **Reviews section**, the whole Reviews section is **commented out** in
      `index.html` (no fabricated testimonials are shown). The "Review Us on
      Google" button lives in the Contact section. To turn Reviews back on,
      follow the "TO RE-ENABLE" steps in the commented block and add **only
      real** Google reviews, never invented ones.
- [ ] **Socials**, Facebook is wired; replace the Instagram / X `href="#"`
      placeholders in the footer when those profiles exist.
- [ ] **Privacy policy**, `privacy.html` is a template; review before relying on it.
- [ ] **Quote form backend**, submissions currently open a pre-filled email in the
      visitor's own mail app (`mailto:`). For silent background submission, swap in
      [Formspree](https://formspree.io) or Netlify Forms (TODO marked in the wizard
      section of `index.html` and in `js/main.js`).

## Photos (`assets/photos/`)

Owner-supplied photos, renamed to web-safe names. Currently wired into the site:

| File | Used where |
|---|---|
| `workshop-entrance.jpg` | Contact section (customer entrance, 418-C door) |

Available but not yet placed (say the word and they can be wired in):

| File | Contents |
|---|---|
| `tech-semi-windshield.jpg` | Tech replacing a semi-truck windshield, great for hero/mobile-service |
| `shop-bay-pathfinder.jpg` / `shop-bay-rav4.jpg` / `shop-bay-malibu.jpg` | Vehicles in the shop bay |
| `fleet-step-van.jpg` | Step van in the bay (EXIF-rotated; browsers display it upright) |
| `brand-business-card.jpg` | Scan of the business card, brand reference, not for the page |

New photos: use lowercase-hyphen names (`.jpg`/`.webp`), no spaces or parentheses.

## Adding a Resources article

In `index.html`, find the Resources section (`id="resources"`). Copy an existing
`<article class="resource-card reveal">…</article>` block, then edit its tag,
title, summary, and the paragraphs inside `<div class="resource-body">`. That's it , 
styling and the read-more toggle come free.

## Design tokens

Colours, fonts, spacing, and z-index live as CSS variables at the top of
`css/styles.css`. Palette: deep navy `#0E2A47` (base) · prairie green `#1B4332`
(secondary) · gold `#E8B426` (sparing accent, CTAs and thin rules only).
Fonts: Fraunces (display) · Instrument Sans (body) · Hanken Grotesk (accents).
All shipped colour pairs pass WCAG AA (4.5:1+). Section rhythm alternates
navy → off-white → green so all three brand colours stay visible.

## Privacy & compliance notes

- **No cookies, no analytics, no third-party tracking**, so no cookie consent
  banner is required. If you ever add analytics or embeds, revisit this and
  `privacy.html`.
- **No payments on this site.** Never add card collection; if online payment is
  ever needed, link out to a hosted processor (Square or Stripe payment link).
- The chatbot is rule-based and runs entirely in the browser; it stores nothing.

## Deploying (free, HTTPS)

The site **must be served over HTTPS**, both Netlify and Vercel do this
automatically with free certificates:

1. **Netlify (recommended):** [app.netlify.com](https://app.netlify.com) → “Add new
   site” → “Import an existing project” → connect this GitHub repo. No build
   command; publish directory is the repo root. Done, you get an
   `https://….netlify.app` URL immediately.
2. **Vercel:** same flow at [vercel.com/new](https://vercel.com/new), framework
   preset “Other,” no build step.
3. **GitHub Pages** also works (Settings → Pages → deploy from `main`), and is
   HTTPS by default.

### When the domain is purchased

The site is already written against `gillautoglassyxe.ca` (canonical link, JSON-LD,
Open Graph). After buying the domain:

1. Add it as a custom domain in Netlify/Vercel (they provision HTTPS automatically).
2. Point the registrar's DNS at the host (they show the exact records).
3. No code changes needed, the URLs in `index.html` already match.

## Testing

The site was verified end-to-end with headless Chromium (Playwright): wizard both
paths + mailto payload, chatbot, 360 px layout (no horizontal scroll), reduced-motion
fallback (static SVG hero, no canvas), WCAG AA contrast on all colour pairs, and 3D
performance on a 4× CPU-throttled mobile profile (DPR capped at 1.5, rendering
pauses off-screen).
