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

**What I (the student) must check / do by hand**
- [ ] Add `SUPABASE_SECRET_KEY` to `.env.local`, and all 5 new variables to Vercel (docs/SETUP.md).
- [ ] Turn on reminders in Chrome or Safari, press "Send a test now", confirm the notification arrives.
- [ ] Next morning: confirm the automatic reminder arrived.
