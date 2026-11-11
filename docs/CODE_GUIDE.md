# How Frigo works — study guide for the jury questions

The teacher's warning: *"make sure you can walk me through `aiMatch.ts`, `offlineQueue.ts` and your Supabase RLS
policies without notes."* This guide explains exactly those three parts, with the real code, a worked example
and practice questions. Read it with the files open. Then close it and explain each part out loud to each other.

---

## 1. `src/lib/aiMatch.ts` — the maths behind the receipt AI

### The idea in one sentence
The AI model turns any text into a list of **384 numbers** (a *vector*) that describes its meaning; two texts that
mean the same thing get vectors that point in almost the same direction, even in different languages.

### Step by step

1. **Clean the line** (`lineForAI`): `"LAPTE JLC 2.5% 1L"` → `"lapte jlc"`. Lowercase, and drop every word that
   contains a digit (sizes, %, prices). Dots and slashes become spaces (`"BR.DE VACI"` → `"br de vaci"`).
2. **Turn it into a vector** (done by the model in `receiptAI.worker.ts`, prefix `"query: "` because e5 models
   expect it). The vector is **normalised**: its length is 1.
3. **Compare with every product name** (`bestMatch`). Each of the 196 products has up to 4 names (Romanian, Romanian
   without diacritics, Russian, English), so there are about 660 vectors. For each one we compute the **dot product**:

   ```ts
   export function dot(a, b) {
     let s = 0;
     for (let i = 0; i < a.length; i++) s += a[i] * b[i];
     return s;
   }
   ```

   **Why the dot product is the cosine similarity:** in general `cos θ = (a · b) / (|a| · |b|)`. Our vectors have
   length 1, so `|a| · |b| = 1` and `cos θ = a · b`. 1 means the same direction (same meaning), 0 means unrelated.
4. **Keep the best name per product**, then sort products by score. The winner gives the suggestion.
   - `similarity` = the winner's score.
   - `margin` = winner minus the **second-best *different* product**. A product's second name doesn't count, or "Milk"
     would always be close to "Lapte".
5. **Confidence:**
   ```ts
   const confidence = similarity >= HIGH && margin >= MIN_MARGIN ? 'high' : similarity >= MEDIUM ? 'medium' : 'low';
   // HIGH = 0.90, MEDIUM = 0.86, MIN_MARGIN = 0.01
   ```
   *high* → label "AI · sure"; *medium* → shown but marked "check this"; *low* → the guess is hidden.
   The thresholds came from the threshold curve in `docs/benchmarks/RESULTS.md` (0.90 → 88 % precision).

### The int8 compression (`encodeVectors` / `decodeVectors`)
The product vectors are computed in advance (`npm run ai:catalog`) and shipped in `public/ai/catalog.json`. As normal
numbers (float32, 4 bytes each) that would be 660 × 384 × 4 ≈ 1 MB. We store each number in **1 byte** (int8, from
−127 to 127):

```ts
// encode: scale each vector so its largest number becomes 127, round, store as a byte
bytes.push(Math.round((v[j] / max) * 127) & 0xff);
// decode: byte → number between −1 and 1, then normalise the vector to length 1 again
v[j] = (byte > 127 ? byte - 256 : byte) / 127;
```

- `& 0xff` keeps the lowest 8 bits, so −5 is stored as 251. On decoding, `byte > 127 ? byte - 256 : byte` turns 251
  back into −5. This is **two's complement**.
- Scaling per vector (by its own `max`) uses all 255 levels. If we multiplied every number by 127 directly, the small
  numbers (around 0.05) would round to only ~6 levels and lose meaning.
- Re-normalising after decoding means the scale doesn't matter, and the dot product is a cosine again.
- Unit test: the similarity changes by less than 0.01 after compression (`tests/unit/aiMatch.test.ts`).
- Result: 4× smaller (334 KB, as base64 text).

### `combine()` — dictionary + AI

| Situation | What Frigo shows |
|---|---|
| A past correction of the user matches (similarity ≥ 0.95) | the user's own correction, "remembered" |
| Dictionary knows the line **and** the AI agrees | dictionary's name; sure |
| AI is *low* | the dictionary's answer, marked "check this" (the AI's guess is hidden) |
| Dictionary knows it, AI disagrees but is only *medium* | dictionary's answer, marked "check this" |
| Dictionary doesn't know it, or AI disagrees and is *high* | the AI's suggestion |
| Price not read | never "sure", even if the AI is |

Example: `SUC MERE 1L`. The dictionary finds `MERE` (apples) → fruit. The AI says *Juice*, sure (0.93), different
category → the AI wins → drinks. Right.

**Practice questions**
1. Why can we use the dot product instead of the full cosine formula?
2. What is the margin, and why is it measured against a *different* product?
3. What does `& 0xff` do to −5? How do you get −5 back?
4. Why do we re-normalise after decoding?
5. In which case does the AI's answer *not* replace the dictionary's, even though they disagree?
6. Why does Frigo never send the receipt to a server? Where does the model run? (`receiptAI.worker.ts`, a Web Worker,
   so the page doesn't freeze.)

---

## 2. `src/lib/offlineQueue.ts` — working without internet

### The idea
When there is no internet, *Used it*, *Tossed* and *Add* are saved on the phone as **operations** ("ops") in a list in
`localStorage`. When the internet comes back, the list is sent to the server, which applies each op.

```ts
type OfflineOp =
  | { kind: 'close'; opId; itemId; outcome: 'eaten' | 'wasted'; at }   // Used it / Tossed
  | { kind: 'add'; opId; at; item: { name, category, quantity, … } };   // Add
```

- `opId` is a random unique id (`crypto.randomUUID()`), so the server can say exactly which ops it applied (`done`).
  The phone removes only those, and nothing is applied twice or lost.
- `at` is when the user tapped. The server saves that time, not the sync time, so the statistics stay correct.

### The functions
- `enqueue(queue, op)`: adds an op; if the same item is closed twice offline, **only the last one is kept** (a user who
  taps Tossed, then changes their mind to Used it, gets Used it).
- `closedIds(queue)`: items already closed offline are hidden from the fridge list until they sync.
- `validOps(queue, now)` keeps only safe ops. It runs **on the phone and again on the server** (never trust the
  client):
  - well-formed (right fields and types);
  - not in the future (more than 5 minutes ahead means a wrong clock or tampering);
  - not older than **14 days** (`MAX_AGE_DAYS`); an old "Used it" is more likely a mistake.
- `readQueue` / `writeQueue` wrap `localStorage` in `try/catch`: private mode or a full storage must not crash the
  app.

### On the server (`syncOffline` in `src/app/actions/items.ts`)
```ts
const ops = validOps(raw).slice(0, 100);           // check again, at most 100 at once
… .update({ status: op.outcome, closed_at: op.at })
   .eq('id', op.itemId).eq('status', 'active');     // only if the item is still active
```
`.eq('status', 'active')` makes it **idempotent**: sending the same op twice changes nothing the second time.

**Practice questions**
1. Why does each op have an `opId`?
2. What happens if the user taps *Tossed* and then *Used it* on the same item while offline?
3. Why is `validOps` run on the server too, not only on the phone?
4. What does "idempotent" mean, and which line makes the sync idempotent?
5. Why is the tap time (`at`) saved instead of the sync time?

---

## 3. Supabase Row Level Security (RLS) — `supabase/migrations/0001_init.sql`

### The idea
The database is on the internet, and the website's key to it is public (it's inside the page). So security can't
depend on the website behaving; **the database itself checks every row**. With RLS on, a table returns nothing
unless a *policy* allows it.

```sql
alter table public.fridge_items enable row level security;

create policy "fridge_items: read own" on public.fridge_items
  for select using (auth.uid() = user_id);
create policy "fridge_items: insert own" on public.fridge_items
  for insert with check (auth.uid() = user_id);
create policy "fridge_items: update own" on public.fridge_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fridge_items: delete own" on public.fridge_items
  for delete using (auth.uid() = user_id);
```

- `auth.uid()` = the id of the logged-in user, taken from their **signed login token** (JWT), so it can't be faked.
- `using (…)` filters which **existing** rows you may see, change or delete.
- `with check (…)` checks the **new** row you write: you can't insert or move a row onto someone else's account.
- `user_id … default auth.uid()`: a new item automatically belongs to whoever adds it.

| Table | Who can do what |
|---|---|
| `fridge_items`, `receipt_corrections`, `push_subscriptions`, `profiles` | only your own rows |
| `shelf_life`, `recipes`, `recipe_ingredients` | any signed-in user can **read**; nobody can change them from the app |
| `products` (barcodes) | signed-in users can read and **add** (shared product list), not edit or delete |

The **secret key** (bypasses RLS) is only used on the server, for the daily reminder job and for creating test
accounts. It never reaches the browser.

**Practice questions**
1. If someone copies the public key from the page, can they read another family's fridge? Why not?
2. What is the difference between `using` and `with check`?
3. Where does `auth.uid()` come from, and why can't it be faked?
4. Why can users add products to `products` but not change them?
5. Where is the secret key used, and why must it never be in the browser?

---

## Who explains what

Each team member is judged on their own contribution (MoldSEF rules, Art. 5), so both must know every part,
but each leads on some:

| Part | Leads | Backs up |
|---|---|---|
| AI maths (`aiMatch.ts`) | Mădălina | Luciana |
| Offline sync (`offlineQueue.ts`) | Mădălina | Luciana |
| Database security (RLS) | Mădălina | Luciana |
| Research: hypothesis, benchmarks, economics | Luciana | Mădălina |
| Live demo | Luciana | Mădălina |
