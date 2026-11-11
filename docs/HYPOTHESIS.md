# Research question and hypothesis

*Written on 2026-11-11, **before** the receipt AI was tested on real Moldovan product data
(`content/real-products-kaufland.json`). Thresholds X and Y were fixed here and are not changed after seeing results.*

## Research question

Can a phone, without sending anything to a server, turn messy Moldovan receipt lines (shortened, Romanian and
Russian, with sizes and brand codes) into correctly categorised fridge items, well enough to be useful?

## Hypothesis (H1)

> If we combine a rule-based RO/RU retail-abbreviation dictionary with quantized (INT8) multilingual semantic
> embeddings (`multilingual-e5-small`) and cosine-margin confidence gating, the **macro F1-score** for product
> categorisation on Moldovan product lines will improve by **at least X = 20 percentage points** over the best
> string-matching baseline (exact dictionary, or fuzzy Levenshtein dictionary), while keeping the AI's processing time
> **below Y = 50 ms per line** in a smartphone browser.

**Null hypothesis (H0):** the hybrid method improves macro F1 by less than 20 points, or needs 50 ms or more per line.

## Secondary hypotheses

- **H2 (confidence gating is meaningful):** lines the AI marks *sure* (similarity ≥ 0.90) are categorised correctly
  at least 90 % of the time, clearly more often than lines it marks *not sure*.
- **H3 (privacy is affordable):** the on-device model fits in a phone browser: one-time download ≤ 150 MB.

## Variables

| | |
|---|---|
| Independent variable | categorisation method: (1) exact dictionary, (2) fuzzy Levenshtein dictionary, (3) MiniLM embeddings, (4) e5 embeddings, (5) hybrid dictionary + e5 + gating (Frigo) |
| Dependent variables | accuracy, macro F1, coverage at each confidence threshold, latency (ms/line), memory |
| Controlled | same product list (159 products), same test lines, same text cleaning, same hardware per run |

## Test sets

1. **Real:** product names and the shop's own categories from Kaufland Moldova's public offers
   (`npm run collect:kaufland`), as printed and in receipt style (UPPERCASE, no diacritics, cut to 32 characters
   like a till printer). The shop chose the categories, not us.
2. **Synthetic:** 109 receipt-style lines written by Claude with an answer key (`content/receipt-lines-eval.json`).
   Used for development and to set thresholds; reported separately because it was not independent of the developers.

## Method

`npm run benchmark` runs all methods on all sets and writes `docs/benchmarks/` (tables, confusion matrix,
threshold curve, speed). The phone speed is measured in the app itself at `/benchmark` on real phones.
