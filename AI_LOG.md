# AI log

InfoMatrix requires documenting how AI was used. Every important prompt, the model, and what was changed or
verified by hand.

---

## 2026-10-13 — Sessions 1–3 (setup, fridge, stats)

**Tool / model:** Claude Code (desktop app), model Claude Opus 5.5 (`claude-opus-5-5`).

**Prompt:**
> this project is also for informatix competition and its called frigo, here is the design, [Claude Design link
> to "Frigo Web"], execute the plan above *(with PLAN.md attached)*

Answers to the AI's questions: project lives in `~/Desktop/frigo`; build sessions 1–3 only (as the plan advises).

**What the AI did**
- Scaffolded Next.js 16 + TypeScript + Tailwind 4; added Supabase, next-intl, Recharts, Vitest.
- Wrote the database schema with Row Level Security for all 8 tables from PLAN §5
  (`supabase/migrations/0001_init.sql`). Added one column not in the plan: `fridge_items.storage`
  (fridge / freezer / pantry), because the design has a "Stored in" choice and shelf life depends on it.
- Wrote a starter `shelf_life` table (`supabase/seed.sql`) — values rounded from USDA FoodKeeper,
  marked **"starter value, verify"**.
- Built the screens from the Claude Design file (colours, fonts, sky hero, cards, pills): welcome, login, sign-up,
  fridge, add item, edit item, stats, settings — in Romanian, Russian and English.
- Wrote unit tests for expiry states, date estimates and weekly/monthly statistics (12 tests).

**Decisions to know about**
- "Use soon" = today + next 2 days (PLAN §2). The design said 3 days; the plan won.
- Receipt review and recipes from the design are not built yet (sessions 6–8). The hero buttons point to
  *Add item* and *Stats* for now.
- Streak and AI insights cards from the design's stats page are left for session 9.

**What I (the student) must check / do by hand**
- [ ] Verify every row in `supabase/seed.sql` against FoodKeeper / ANSA and write the exact source.
- [ ] Read the Romanian and Russian texts in `messages/` and fix anything that sounds unnatural.
- [ ] Create the Supabase project (docs/SETUP.md) and test sign-up, add, used/tossed and stats end to end.
- [ ] Test RLS with two accounts.
- [ ] Take screenshots of this version for the documentation.

---

## 2026-10-13 — Fixes after first real use

**Tool / model:** Claude Code, Claude Opus 5.5.

- Sign-up showed "Maybe this email is already registered?" for every error. Cause: the Supabase tables had not
  been created yet and "Confirm email" hit Supabase's free email limit. The AI made the app show the real reason
  (email taken, too many tries, invalid email, database not set up) and log the Supabase error.
- Asked: "if I put a password too short, the name and email get deleted". Now only the field the error is about
  is cleared (and focused); everything else stays.
- Asked: "make it so I can write a number here instead of adding to 1" (quantity). The field can now be cleared
  and typed into; `2,5` and `2.5` both work.
- `seed.sql` also creates profiles for accounts made before the tables existed.

**Checked by hand:** tables exist in Supabase, Row Level Security hides data from logged-out requests, sign-up
works with Confirm email off, quantity typing tested in the browser.

---

## 2026-10-14 — Session 4: daily expiry reminders

**Tool / model:** Claude Code, Claude Opus 5.5.

**Prompts:** "we don't have to make an installable app, only the web version is good if we do it respecting all
the criteria" → the AI explained the trade-off (iPhone only allows web notifications for Home Screen apps) and
offered three options; I chose **option A: browser notifications + an in-app banner**.

**What the AI did**
- Service worker (`public/sw.js`) that only shows the reminder — no install prompt, no caching.
- Settings → Notifications: turn on/off per browser, "Send a test now" (useful for the stand demo).
- Daily job `/api/cron/expiry`, run by Vercel Cron at 06:00 UTC (~9:00 in Moldova). It reads every subscribed
  user's food with the Supabase **secret key** (server only) and sends one notification per user, in their
  language, only if something expires within 2 days. Dead subscriptions are removed automatically.
- Yellow "Use soon" banner on the Fridge page — works on every device, including iPhone.
- Keys: VAPID key pair and cron secret generated into `.env.local` (not committed).
- 3 new unit tests (which items to remind about, name list, Moldovan date on a UTC server).
- Asked: "change it so I can input digits normally" (best-before date). Half-typed dates were being wiped,
  same cause as the quantity field; now typing day, month, year works.

**What I (the student) must check / do by hand**
- [ ] Add `SUPABASE_SECRET_KEY` to `.env.local`, and all 5 new variables to Vercel (docs/SETUP.md).
- [x] Turn on reminders in Chrome or Safari, press "Send a test now", confirm the notification arrives.
  (First test showed nothing: the push service accepted the message, but macOS was hiding Chrome's notifications.
  Fixed in macOS System Settings → Notifications.)
- [ ] Next morning: confirm the automatic reminder arrived.

---

## 2026-10-14 — Faster tab switching

**Prompt:** "make the app be more smooth since it's really slow when changing from one tab to another".

The AI found three causes: three login checks to Supabase per click, the Vercel server in the US while the
database is in Frankfurt, and no loading screen. Fixes: verify the login token locally (`getClaims`, the project
uses an asymmetric signing key), share lookups within one request, a loading skeleton, and `regions: ["fra1"]`
in `vercel.json`. **Measured locally:** page loads went from ~500–800 ms to ~150–250 ms.

---

## 2026-10-14 — Session 5: barcode scanning

**Tool / model:** Claude Code, Claude Opus 5.5. **Prompt:** "now we can move to the next step".

**What the AI did**
- "Scan barcode" button on Add item → camera window using **ZXing** (free, runs in the browser, loaded only when
  the scanner opens). Only codes with a correct check digit are accepted, so a blurry frame can't misread a digit.
  You can also type the number.
- Lookup order: Frigo's shared `products` list → **Open Food Facts** (free, open data; Frigo identifies itself
  with a User-Agent as they ask). Found products fill in name (Romanian/Russian/English when available),
  category and pack size, and are saved to the shared list.
- Unknown product: the user types it once; when they add it, it is saved to the shared list for everyone.
  Existing products can't be overwritten by another user.
- New migration `0002_products_pack_size.sql`.
- 6 new unit tests: barcode check digits, pack sizes ("1,5 kg", "33 cl", "6 x 125 g"), category mapping.
- Bug the AI caught while testing: after a known product, scanning an unknown one kept the old name → now cleared.

**Checked:** typed-in barcodes (Nutella found with name, category and 400 g; an unknown 484… code shows the
"new product" message). The camera itself could not be tested in the AI's browser (camera blocked there).

**What I (the student) must check / do by hand**
- [ ] Run `0002_products_pack_size.sql` in Supabase.
- [ ] Scan a real product with the laptop camera (Chrome, localhost) and with a phone (Vercel link).
- [ ] Scan a Moldovan product that Open Food Facts doesn't know, add it, then scan it again → "Found in Frigo's product list".

---

## 2026-10-19 — Session 6: recipes

**Tool / model:** Claude Code, Claude Opus 5.5. **Prompt:** "lets continue the project".

**What the AI did**
- Wrote **14 starter recipes** in its own words (common home versions, not copied from any site), in Romanian,
  Russian and English: mămăligă cu brânză, plăcinte, clătite, zeamă, colțunași, sarmale, ciorbă de legume, omletă,
  salată, frigănele, ardei umpluți, mere coapte, compot, cartofi prăjiți. They are marked as AI drafts.
- `content/recipes.json` is the one place to edit recipes; `npm run recipes` builds `supabase/recipes.sql`.
- Matching (`src/lib/recipes.ts`): an ingredient matches a fridge item by name stem in any language
  ("lapte", "молок", "milk") or by category. Expired food is never suggested (food safety). Ranking: most
  soon-expiring food rescued first, then most ingredients you already have, then quickest.
- Recipes screen from the design (filter switch, cards, coloured ingredient chips, "I cooked this" with Undo)
  and a page per recipe with steps. The Fridge hero button now says "Cook with them →" when food is expiring.
- Migration `0003_recipe_details.sql`. 7 new unit tests (27 in total).

**What I (the student) must check / do by hand**
- [ ] Run `0003` + `recipes.sql` in Supabase.
- [ ] **Cook and taste** the recipes, then rewrite them in my own words — the plan asks for 20–30 Moldovan
      recipes I wrote myself. Add the rest in `content/recipes.json`.
- [ ] Check the Russian and Romanian recipe texts with a native speaker / family member.

---

## 2026-10-20 — Photos for recipes and decoration

**Prompts:** "add generated photos or photos you can find on the web that would best suit the recipes tab and also
other photos to decorate the site" → after a first set from Wikimedia Commons: "the pictures look too low quality and
look like they are in a dirty environment, could you choose something more clean".

**What the AI did**
- Said honestly that it cannot generate photos, and that web photos must be free to use.
- First searched Wikimedia Commons (free licences) — I rejected those as amateur-looking. Then searched **Unsplash**,
  looked at every candidate, kept only "Free Photo" ones (no paid Unsplash+), and asked before downloading.
- 17 photos in `public/photos/` (1200×900, ~100–300 KB): one per recipe + 3 decorative (welcome page, Add item tip,
  Recipes banner). Credits in `content/photos.json`, a **Photo credits** page (`/credits`, linked from Settings and
  the welcome page) and a "Photo: … / Unsplash" caption on each recipe page.
- Noted that several photos are similar dishes, not the exact Moldovan recipe (caption says so).
- Also: the AI's clipboard copy garbled Romanian/Russian letters in Supabase (wrong text encoding); it found and
  fixed this (re-pasted with UTF-8) and checked the database for garbled text.

**To do by hand**
- [ ] Better for the competition: take my own photos of the dishes I cook, and swap them in (same file names in
      `public/photos/`, update the author in `content/photos.json`).

---

## 2026-10-20 — Session 9: insights & streaks

**Tool / model:** Claude Code, Claude Opus 5.5. **Prompt:** "lets do 9" (I don't have receipts yet for session 7).

**What the AI did**
- **No-waste streak** (`src/lib/streak.ts`): days since the last thrown-away item, and the best streak ever. Shown in
  the sky card on Stats (as in the design) and next to my name in the menu.
- **Personal insights** (`src/lib/insights.ts`) — plain rules over my own Used/Tossed history, no AI:
  the same product thrown away 2+ times; one category ≥ 40 % of the waste (with a practical tip per category,
  e.g. bread → half a loaf or freeze slices); a category I always finish; this month vs last month; a month with
  nothing thrown away. Needs at least 5 closed items; says "no clear pattern yet" when nothing stands out.
- Stats cards rearranged to match the design (streak, money saved, food saved, used in time).
- 8 new unit tests (35 in total). All 800+ translation strings checked for valid syntax; Romanian/Russian plurals fixed.

**Checked:** Stats page with my real data (streak 0 today, best 6 days; "no clear pattern yet" card).

**To check by hand**
- [ ] Read the tips in `messages/*.json` → `insights.tips` and change any that don't fit Moldovan families.
- [ ] After a few weeks of real use, check that the insights make sense.
