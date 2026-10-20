# Frigo

A free personal food-waste coach for teens in Moldova — know what's in the family fridge, use it before it
goes bad, and see how much food and money you saved.

InfoMatrix 2027 · Software Development · UN SDG 12.3 (halve food waste).
Full project plan: [docs/PLAN.md](docs/PLAN.md). Supabase setup: [docs/SETUP.md](docs/SETUP.md).

## Status

| # | Session | State |
|---|---|---|
| 1 | Setup — Next.js, Supabase auth, all tables + RLS | ✅ done |
| 2 | Fridge — add / edit items, expiry states | ✅ done |
| 3 | Stats — Used it / Tossed, stats page | ✅ done |
| 4 | Daily expiry reminders — browser notifications + in-app banner (no installable app, by choice) | ✅ done |
| 5 | Barcode scanning — camera (ZXing) + Open Food Facts + shared product list | ✅ done |
| 6 | Recipes — 14 Moldovan starter recipes (ro/ru/en), ranked by what expires first | ✅ done |
| 9 | Insights & streaks — no-waste streak + personal patterns from your own history (plain rules, no AI) | ✅ done |
| 11 | Offline mode (changes kept on the device, synced later) + automated tests (Vitest + Playwright) | ✅ done |
| 7 | Receipt scanning — photo → text in the browser → review screen → fridge; tested, decision GO ([docs/RECEIPT_TEST.md](docs/RECEIPT_TEST.md)) | ✅ done |
| 8, 10 | On-device AI clean-up for unknown receipt lines, final polish | ⏳ next |

## What works now

- **Welcome / onboarding** — language picker (Română · Русский · English) and a 3-step intro.
- **Sign up / log in** with email + password (Supabase Auth). A profile row is created automatically.
- **Fridge** — every active item sorted by expiry, grouped into 🔴 expired · 🟡 use soon (today + 2 days) · 🟢 fresh,
  with filters, a "items need you" counter and one-tap **Used it** / **Tossed** (with Undo).
- **Add item** in 3 taps: name → category → *Add*. No date on the package? Frigo estimates it from the
  `shelf_life` table (category × fridge/freezer/pantry) and marks it "estimated" (shown as `~`).
  Optional quantity, unit, storage place, exact date and price in lei. Live preview card.
- **Scan a barcode** on Add item: the camera reads it (or type the number), Frigo fills in name, category and
  pack size — first from its own product list, then from Open Food Facts. A product nobody has scanned before is
  typed in once and remembered for everyone (great for Moldovan products, which Open Food Facts often lacks).
- **Scan a receipt** — take a photo (or try one of 6 sample receipts); Frigo reads it on the phone (Tesseract.js,
  Romanian + Russian + English), suggests fridge items with a guessed date, leaves non-food unticked, and you
  confirm or fix each one. Blurry photos are detected. Your corrections are remembered for next time.
- **Recipes** — Moldovan recipes ranked by which of your food expires first (expired food is never suggested).
  "I cooked this" marks the ingredients it used as eaten, with Undo. Each recipe has its own page with steps.
  Recipes live in `content/recipes.json`; `npm run recipes` turns them into `supabase/recipes.sql`.
- **Edit item** — change anything, mark used/tossed, or delete a mistake.
- **Stats** — money saved (lei), items saved, % used in time, money tossed this month; a used-vs-tossed
  chart by week or month (with a table view); which categories get tossed most.
- **Daily reminder** — one browser notification each morning listing what to use first (only when something is
  about to expire), plus a yellow "Use soon" banner on the Fridge page for every device, including iPhone.
- **Insights & streak** — the Stats page shows days since you last threw food away (and your record), plus up to
  3 personal tips from your own history: the product that keeps going in the bin, the category you waste most
  (with a tip for it), the category you always finish, and this month vs last month.
- **Offline** — without internet Frigo still opens (last saved copy of each page), and "Used it", "Tossed"
  and Add item keep working: changes wait on the device (banner shows how many) and sync with their real time when
  the connection is back. Saved pages are wiped on logout.
- **Settings** — language, notifications (on/off + send a test), account, log out. Light / dark theme toggle on every page.

## Tech

Next.js 16 (App Router, Server Actions) · TypeScript · ZXing (barcodes) · Open Food Facts API · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) ·
next-intl (ro/ru/en, cookie-based, no locale in the URL) · Recharts · Vitest.
Fonts: Archivo Black, Outfit, Doto (+ Rubik / Onest for Cyrillic).

```
src/
  app/
    (auth)/          welcome, login, signup — public pages
    (app)/           fridge (/), add, items/[id], stats, settings — signed-in pages
    actions/         server actions: auth, items, settings
    auth/callback/   email-confirmation link target
    api/cron/expiry/ daily reminder job (Vercel Cron, see vercel.json)
  components/        UI (FridgeView, ItemCard, ItemForm, StatsChart, …)
  lib/               expiry + stats logic (pure, unit-tested), Supabase clients
  i18n/              next-intl config
  proxy.ts           refreshes the session, redirects signed-out users to /welcome
messages/            en.json · ro.json · ru.json
public/sw.js         service worker — shows the daily reminder notification
supabase/            migrations/ (schema + RLS) · seed.sql (shelf-life table) · recipes.sql (generated)
content/recipes.json recipes in 3 languages — edit here, then npm run recipes
content/photos.json  photo credits (photos in public/photos/, from Unsplash)
tests/unit/          Vitest
```

## Run it

1. Create the Supabase project and tables — see [docs/SETUP.md](docs/SETUP.md).
2. Put your keys in `.env.local` (copy from `.env.example`).
3. ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000.

```bash
npm test           # 39 unit tests: expiry, estimates, stats, reminders, barcodes, recipes, insights, offline queue
npm run test:e2e   # 9 end-to-end flows × 2 engines (Chrome/Android + WebKit/iPhone) against a production build
npm run lint
npm run build
```

The end-to-end tests need `SUPABASE_SECRET_KEY` in `.env.local`: they create a throwaway, already-confirmed
account, run the main flows (add food, used it → stats, offline toss + sync, offline add + sync, opening offline,
language switch) and delete the account afterwards. First time: `npx playwright install chromium webkit`.

## Security

Row Level Security is on for every table. Each user can only read and change their own `fridge_items`,
`profiles`, `receipt_corrections` and `push_subscriptions`. `shelf_life`, `recipes` and `products` are shared
read-only reference data for signed-in users.
