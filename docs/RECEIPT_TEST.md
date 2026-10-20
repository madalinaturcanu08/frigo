# Receipt scanning test (session 7) — go / no-go

**Question (PLAN.md §4):** can Frigo read Moldovan receipts well enough, in the browser, to turn them into fridge
items? Thermal receipts are often faded and mix Romanian and Russian.

## Test set

No real receipts were available, so 6 **realistic fake receipts** were made (`content/test-receipts.json`,
pictures in `public/demo-receipts/`, made by `scripts/make-test-receipts.mjs`). Fictional shop, marked
"MOSTRĂ – NU ESTE BON FISCAL". They copy real Moldovan till layout: shortened product names in Romanian and
Russian, two-line items (`1.245 x 16.90 … 21.04 B`), card discount, VAT lines, non-food items. Each is
photographed in a headless browser with tilt, perspective, blur, fading, shadow and grain. Each has an answer key
(31 food items in the 5 readable receipts + 4 non-food lines).

| # | Picture | What makes it hard |
|---|---|---|
| r1 | clean flat scan | — |
| r2 | phone photo, tilted 3.5° | prices drift onto the next line |
| r3 | faded thermal paper | low contrast |
| r4 | Romanian + Russian, shadow | Cyrillic, discount line |
| r5 | long, with non-food | detergent, toilet paper, soap, bag |
| r6 | blurry, faded, in perspective | deliberately too bad to read |

## Step 1 — reading the text (Tesseract.js, in the browser, `ron+rus+eng`)

`node scripts/evaluate-receipts.mjs`

| Receipt | Product names read ≥ 80 % right | Prices read | OCR confidence |
|---|---|---|---|
| r1 clean | 6/6 (98 %) | 6/6 | 88 |
| r2 tilted | 7/7 (99 %) | 7/7 | 89 |
| r3 faded | 6/6 (100 %) | 6/6 | 91 |
| r4 RO/RU | 5/7 (89 %) | 7/7 | 90 |
| r5 long | 10/10 (99 %) | 9/10 | 90 |
| r6 blurry | 1/5 (47 %) | 4/5 | 68 |

Typical mistakes: Cyrillic size letters read as digits (`1Л` → `171`, `300Г` → `3007`), `400G` → `4006`,
decimal point read as `-` or `:` (`71-20`, `17:90`), a quantity misread (`2 x` → `25x`).

## Step 2 — turning text into fridge items (`src/lib/receipt.ts`, dictionary of RO/RU shop abbreviations)

Scored in `tests/unit/receipt.test.ts` on what the OCR really read (r1–r5):

| | Result |
|---|---|
| Food items found | **30 / 31** |
| Right category | **29 / 31** |
| Right quantity + unit | **28 / 31** |
| Non-food left unticked | **4 / 4** |
| Blurry photo (r6) detected and the user asked to retake | ✅ (confidence 68 < 75) |

Fixes that came from the test: accept `-`/`:` as a decimal point, recompute a misread quantity from the line total
(35.80 ÷ 17.90 = 2), treat "UNT 72.5% 2006" as a product name.

## Decision: **GO** — with guardrails

- Reading works well on reasonable photos; very bad photos are **detected** and the user is asked to retake.
- **The user checks every item** before saving (human in the loop), and every correction is remembered for that
  receipt line next time (`receipt_corrections`).
- The receipt photo never leaves the phone.

**Limits (honest):** tested on realistic fake receipts, not real ones. Real receipts may be harder (crumpled paper,
other till layouts). If possible, test one real receipt before the competition. Session 8 adds the on-device AI
for lines the dictionary doesn't know.


## Update — session 8

An on-device AI now checks every line too (lines the dictionary doesn't know, and disagreements). Results on 109
unknown lines: 87 % right vs 7 % for the dictionary alone. See [AI.md](AI.md). Two parser fixes came from testing
in the browser (which reads the downscaled photo slightly differently): a misread VAT letter (`20.15 E`) and a
garbled quantity line (`1 SETI 39.90 A`).
