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
