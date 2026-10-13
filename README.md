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
| 4–11 | Notifications, barcode, recipes, receipt AI, insights, offline, tests | ⏳ next |

## What works now

- **Welcome / onboarding** — language picker (Română · Русский · English) and a 3-step intro.
- **Sign up / log in** with email + password (Supabase Auth). A profile row is created automatically.
- **Fridge** — every active item sorted by expiry, grouped into 🔴 expired · 🟡 use soon (today + 2 days) · 🟢 fresh,
  with filters, a "items need you" counter and one-tap **Used it** / **Tossed** (with Undo).
- **Add item** in 3 taps: name → category → *Add*. No date on the package? Frigo estimates it from the
  `shelf_life` table (category × fridge/freezer/pantry) and marks it "estimated" (shown as `~`).
  Optional quantity, unit, storage place, exact date and price in lei. Live preview card.
- **Edit item** — change anything, mark used/tossed, or delete a mistake.
- **Stats** — money saved (lei), items saved, % used in time, money tossed this month; a used-vs-tossed
  chart by week or month (with a table view); which categories get tossed most.
- **Settings** — language, account, log out. Light / dark theme toggle on every page.

## Tech

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) ·
next-intl (ro/ru/en, cookie-based, no locale in the URL) · Recharts · Vitest.
Fonts: Archivo Black, Outfit, Doto (+ Rubik / Onest for Cyrillic).

```
src/
  app/
    (auth)/          welcome, login, signup — public pages
    (app)/           fridge (/), add, items/[id], stats, settings — signed-in pages
    actions/         server actions: auth, items, settings
    auth/callback/   email-confirmation link target
  components/        UI (FridgeView, ItemCard, ItemForm, StatsChart, …)
  lib/               expiry + stats logic (pure, unit-tested), Supabase clients
  i18n/              next-intl config
  proxy.ts           refreshes the session, redirects signed-out users to /welcome
messages/            en.json · ro.json · ru.json
supabase/            migrations/0001_init.sql (schema + RLS) · seed.sql (shelf-life table)
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
npm test        # unit tests (expiry states, estimates, weekly/monthly stats)
npm run lint
npm run build
```

## Security

Row Level Security is on for every table. Each user can only read and change their own `fridge_items`,
`profiles`, `receipt_corrections` and `push_subscriptions`. `shelf_life`, `recipes` and `products` are shared
read-only reference data for signed-in users.
