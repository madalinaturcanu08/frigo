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
