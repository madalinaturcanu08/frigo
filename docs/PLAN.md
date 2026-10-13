# Frigo — Project Plan

A free personal food-waste coach for teens in Moldova.
InfoMatrix 2027 — Software Development category. Registration deadline: 15 March 2027.

---

## 1. Problem & goal

Families throw away food they forgot about, often without realizing how much it costs.
Frigo helps a teen manage their family's fridge:

- know what is in the fridge and when it expires
- get warned before food goes bad
- find Moldovan recipes that use what is about to expire
- see how much food and money they saved, and learn from their own waste patterns

**UN SDG:** Goal 12 — Responsible Consumption and Production (target 12.3: halve food waste).

**Main user:** a teen (14–18) managing their family's fridge from their own account.
Shared household accounts are a possible later extra, not part of the core.

**Hard rule:** the project must cost nothing to build and run. No paid APIs.

---

## 2. Features

### Core (build first)
- **Account** — email sign-up / login (Supabase Auth).
- **Add item manually** — name, category, quantity, unit, optional price (lei), expiry date.
  If there is no expiry date, estimate it from the `shelf_life` table and mark it "estimated".
- **Fridge screen (home)** — all active items sorted by expiry, with three states:
  🟢 fresh · 🟡 use soon (≤ 2 days) · 🔴 expired.
- **Close an item** — mark as **Eaten** or **Thrown away**. All statistics come from this.
- **Stats page** — food saved vs wasted per week/month, money saved in lei.

### Phase 2 — standout features
- **Barcode scanning** with the camera (free browser library) + Open Food Facts lookup.
  Unknown products are saved to the local `products` cache after the user types them once.
- **Recipe suggestions** from our own Moldovan recipe database, ranked by which
  ingredients expire first.
- **Streaks** — weeks without throwing anything away.
- **Daily expiry notifications** (web push) + installable PWA.
- **Three languages** — Romanian, Russian, English (next-intl).

### Phase 3 — upgrades for top scores
- **On-device AI receipt cleanup** (see section 4).
- **Personal waste insights** — patterns from the user's own eaten/wasted history, e.g.
  "Bread is what you throw away most — try buying half a loaf",
  "Your yogurt usually expires before you finish it".
  Plain SQL queries, no AI needed.
- **Offline mode** — the app keeps working without internet and syncs later.
- **Automated tests** — Vitest (logic) + Playwright (main user flows).
- **Pilot export** — anonymous CSV of saved/wasted data for the presentation.

---

## 3. Tech stack (all free)

| Part | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database & auth | Supabase free tier (Postgres + Auth + Row Level Security) |
| Hosting | Vercel free tier |
| Charts | Recharts |
| Translations | next-intl (ro / ru / en) |
| Barcode | free browser barcode library (e.g. ZXing-based) |
| Product data | Open Food Facts API (free, open data) |
| Receipt text | Tesseract.js (runs in the browser) |
| On-device AI | Transformers.js (runs in the browser, no API key) |
| Notifications | Web Push + one daily scheduled job |
| Tests | Vitest + Playwright |

Notes:
- Row Level Security on every table: a user only ever sees their own items.
- On iPhone, push notifications only work after "Add to Home Screen" — remember this for demos.

---

## 4. On-device AI receipt cleanup (the main innovation)

**Problem:** receipt lines look like `LAPTE JLC 2.5% 1L` — unusable as fridge items.

**Flow:**
1. User photographs a receipt.
2. Tesseract.js reads the text in the browser.
3. A small AI model running in the browser (Transformers.js) turns each line into:
   clean name · category · estimated expiry (via `shelf_life`).
   Example: `LAPTE JLC 2.5% 1L` → *Milk · dairy · ~7 days*.
4. **The user reviews every item and confirms or corrects it before anything is saved.**
5. Corrections are saved to `receipt_corrections`, so the same product is recognized
   correctly next time (Frigo gets better at Moldovan products over time).

**Responsible AI points to present:**
- The receipt never leaves the phone (privacy).
- AI only suggests; a human always decides.
- Show a confidence level; low confidence → item highlighted for review.
- Model name, version, and license documented.

**Risk & fallback:** thermal receipts are often faded and mix Romanian/Russian.
Test this early on real Linella / Nr. 1 receipts. If AI cleanup is unreliable,
fall back to a keyword dictionary built from user corrections. If OCR itself fails,
barcode scanning remains the fast way to add items.

---

## 5. Database tables

- **profiles** — id, display_name, language, created_at
- **fridge_items** — id, user_id, name, category, quantity, unit, price_lei,
  added_at, expires_at, expiry_estimated (bool), status (`active` / `eaten` / `wasted`),
  closed_at, source (`manual` / `barcode` / `receipt`)
- **products** — barcode, name, category, default_shelf_days (shared cache)
- **shelf_life** — category, storage (`fridge` / `freezer` / `pantry`), days, source
- **recipes** — id, title_ro, title_ru, title_en, steps_ro, steps_ru, steps_en, source_note
- **recipe_ingredients** — recipe_id, category or keyword, optional (bool)
- **receipt_corrections** — raw_text, corrected_name, corrected_category, user_id, created_at
- **push_subscriptions** — user_id, endpoint, keys

---

## 6. Screens

1. Onboarding (language, short intro)
2. Login / sign-up
3. **Fridge** (home) — list with colour states, quick Eaten / Thrown away buttons
4. Add item — Manual · Scan barcode · Scan receipt
5. Receipt review — confirm/correct each detected item
6. Item detail / edit
7. Recipes — ranked by expiring ingredients
8. Stats & insights — charts, money saved, streaks, waste patterns
9. Settings — language, notifications, account

Design: mobile-first, friendly, max 3 taps to add an item.

---

## 7. Build order for Claude Code (one feature per session)

| # | Session | Goal |
|---|---|---|
| 1 | Setup | Next.js project, Supabase connection, auth, all tables + RLS |
| 2 | Fridge | Add/edit items, fridge screen with expiry states |
| 3 | Stats | Eaten / Thrown away, stats page |
| 4 | Notifications | Daily expiry check, web push, PWA install |
| 5 | Barcode | Camera scanning + Open Food Facts + products cache |
| 6 | Recipes | Recipe database + ranking by expiring ingredients |
| 7 | Receipt spike | Tesseract.js test on real receipts — decide go / fallback |
| 8 | AI cleanup | Transformers.js parsing + review screen + corrections |
| 9 | Insights & streaks | Waste-pattern queries, streak logic |
| 10 | Languages & polish | ro / ru / en, UI polish |
| 11 | Offline & tests | Offline sync, Vitest + Playwright |

Realistic first goal: sessions 1–3.

**Tips to save usage:** give Claude Code this file at the start, build one session at a time,
use `/compact` when sessions get long, check `/usage`.

---

## 8. Content to prepare yourself (in parallel)

- **Shelf-life table** — ~40 common foods. Use official sources (ANSA Moldova, USDA FoodKeeper)
  and record the source for each row.
- **Recipes** — 20–30 Moldovan recipes written in your own words, tagged by ingredient category.
- **Problem statistics** — real, cited food-waste numbers for the presentation
  (e.g. UNEP Food Waste Index). Do not guess numbers.

---

## 9. Pilot & usability testing

- Usability test with 5–10 classmates → list problems → fix → document before/after.
- Pilot: 5–10 families use Frigo for 2–3 weeks (winter holidays are ideal).
- Collect: items tracked, % eaten vs wasted, lei saved, user feedback quotes.

---

## 10. InfoMatrix rubric checklist (target: 5 in every criterion)

| Criterion | How Frigo earns a 5 |
|---|---|
| Originality | On-device AI receipt cleanup, Moldovan recipes, personal waste insights |
| Practicality | Real family pilot with real results |
| UI/UX | Mobile-first, 3-tap adding, usability test with documented fixes |
| Functionality | Automated tests, offline mode, seeded demo data |
| Technical skills | RLS, PWA + push, OCR + in-browser AI, offline sync — and you can explain all of it |
| Oral presentation | Story → real stats → live demo → pilot results |
| Documentation | README, architecture + database diagrams, user guide, test report, pilot report |
| Stand | Real fridge shelf with groceries visitors scan, pilot results poster, tablet demo |
| Responsible AI | AI_LOG.md, human-in-the-loop, privacy on device, model + sources cited |

---

## 11. Habits from day one

- **`AI_LOG.md`** — paste every important Claude Code prompt, the model used, and what you
  changed or verified afterwards. Required by InfoMatrix rules.
- **README** — update after every session.
- **Screenshots** of each version (for documentation and the stand).
