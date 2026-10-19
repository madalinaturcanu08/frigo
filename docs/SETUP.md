# Supabase setup (free tier, ~10 minutes)

1. Go to <https://supabase.com>, sign in and create a **new project** (free plan). Pick the
   *Central EU (Frankfurt)* region — closest to Moldova.
2. **Create the tables:** open *SQL Editor → New query*, paste the whole of
   [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) and press **Run**.
3. **Fill the shelf-life table:** new query, paste [`supabase/seed.sql`](../supabase/seed.sql), **Run**.
4. **Keys:** *Project Settings → API Keys*. Copy the **Project URL** and the **Publishable key** into
   `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   (Older projects call it the *anon* key — that works too.) Never put the *secret / service_role* key in the app.
5. **Auth redirect:** *Authentication → URL Configuration*:
   - Site URL: `http://localhost:3000` (change to your Vercel URL when you deploy)
   - Redirect URLs: add `http://localhost:3000/auth/callback` (and later `https://<your-app>.vercel.app/auth/callback`)
6. Restart `npm run dev`.

**Email confirmation:** on by default — after sign-up Frigo shows "Check your email". For quick testing
during development you can turn it off in *Authentication → Sign In / Providers → Email → Confirm email*.
Turn it back on before the pilot.

**Check RLS works:** create two accounts, add an item with one — the other must not see it.

## Daily reminders (session 4)

Frigo sends one browser notification each morning (about 9:00 in Moldova) listing food that is expired or
expires within 2 days. Nothing is sent on days when nothing is about to expire.

1. `.env.local` already has `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and `CRON_SECRET`
   (generated for you). Add **`SUPABASE_SECRET_KEY`**: Supabase → *Project Settings → API Keys → Secret keys*.
   It is only used on the server by the daily job. Never paste it anywhere else.
2. **Vercel:** *Project → Settings → Environment Variables* — add the same five values
   (`SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`),
   then redeploy. The schedule lives in `vercel.json` (`0 6 * * *` = 06:00 UTC); Vercel's free plan runs it
   once a day, at some point during that hour.
3. In Frigo: **Settings → Notifications → Turn on reminders**, allow notifications, then **Send a test now**.

Works in Chrome, Edge and Firefox on computers and Android, and Safari on Mac. On iPhone, Safari only allows
notifications for sites added to the Home Screen, so iPhone users see the yellow "Use soon" banner on the
Fridge page instead.

**Variable names:** if you connected Supabase through Vercel's Supabase integration, it creates
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` instead of
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`. Frigo accepts either name
(`src/lib/supabase/env.ts`). Make sure `NEXT_PUBLIC_SUPABASE_URL` points to the same project you ran the SQL in.

## Barcode scanning (session 5)

Run [`supabase/migrations/0002_products_pack_size.sql`](../supabase/migrations/0002_products_pack_size.sql) in the
SQL Editor (adds pack size + source to the shared `products` list). Nothing else to set up: ZXing runs in the
browser and Open Food Facts is a free, open API with no key.

The camera only works on `https://` pages (Vercel) or `http://localhost`. On a phone, test on the Vercel link.
