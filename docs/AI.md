# On-device AI for receipts (session 8)

**Problem (PLAN.md §4):** receipt lines look like `ЙОГ.КЛУБН 2.5%` or `FRISCA LICHIDA 33%`. The session 7
dictionary knows ~40 common products; every other line came out as category "Other" with a messy name.

**What the AI does:** for every line read from the receipt, it suggests **which product it is** (clean name +
category + food / not food) and **how sure it is**. You still check and confirm every item before anything is saved.

## Model card

| | |
|---|---|
| Model | **multilingual-e5-small** (Microsoft; Wang et al., 2024, [arXiv:2402.05672](https://arxiv.org/abs/2402.05672)) |
| Browser version | [`Xenova/multilingual-e5-small`](https://huggingface.co/Xenova/multilingual-e5-small), 8-bit (q8) ONNX |
| Pinned version | revision `761b726dd34fb83930e26aab4e9ac3899aa1fa78` (set in `src/lib/aiMatch.ts`) |
| License | **MIT** (model) · Transformers.js 4.3.1 **Apache-2.0** · Tesseract.js **Apache-2.0** |
| Size | ~118 MB, downloaded **once**, only after the user taps "Use the AI"; kept in the browser cache |
| Runs | in the browser, in a background worker (`src/lib/receiptAI.worker.ts`), on the phone's CPU |
| Speed | ~1 ms per line on a laptop; a whole receipt incl. reading the photo ≈ 2 s once downloaded |
| Data sent anywhere | **none**: the photo and the text stay on the phone; only the model file is downloaded |

### How it works

1. The model turns text into 384 numbers (a *vector*) describing its meaning. Similar meanings → similar
   vectors, **in any language**: `ЧЕСНОК`, `USTUROI` and `garlic` land close together.
2. Frigo has a list of 159 products (`src/lib/foodCatalog.ts`), each named in Romanian, Russian and English.
   Their vectors are computed in advance (`npm run ai:catalog` → `public/ai/catalog.json`, 272 KB).
3. Each receipt line is cleaned (sizes, %, codes removed: `LAPTE JLC 2.5% 1L` → `lapte jlc`), turned into a
   vector and compared with every product. The closest one wins.
4. **Confidence** = how close the match is (cosine similarity) and how far ahead of the runner-up:
   - **sure** (≥ 0.90 and clearly ahead): suggestion used, marked "🤖 AI · sure";
   - **not sure** (0.86–0.90): suggestion used but the line is marked **"check this"**;
   - **guessing** (< 0.86): the guess is **not shown**; the line keeps its raw name, marked "check this".
5. **Dictionary + AI together** (`combine()` in `src/lib/aiMatch.ts`): if they agree, the dictionary's name stays;
   if they disagree, the AI wins only when it is *sure*, otherwise the line is marked for checking.
6. **Learning from you:** a correction you made is used again for any later line that *means the same*
   (similarity ≥ 0.95), e.g. a fix for `LAPTE JLC 2.5%` also applies to `LAPTE JLC 1.5%`.

## Test results

`npm run test:ai` runs the same model in Node on `content/receipt-lines-eval.json`: **109 receipt lines the
dictionary does not know** (made up by Claude for testing, in the style of Moldovan receipts), with an answer key.
89 are everyday products; 20 are deliberately hard: very short abbreviations, and 8 products that are **not in the
product list at all** (halva, hummus, tofu, quinoa…).

| | Dictionary alone | AI |
|---|---|---|
| Everyday lines: right category + food/not food | 5 / 89 (6 %) | **84 / 89 (94 %)** |
| Hard lines: right category | 3 / 20 (15 %) | 11 / 20 (55 %) |
| Confidently wrong (e.g. `CHIPSURI SMANTANA` → dairy, `КВАС ХЛЕБНЫЙ` → bread) | 4 / 109 | |
| All lines | 8 / 109 (7 %) | **95 / 109 (87 %)** |
| When the AI says **sure** → right | | **80 / 83 (96 %)** |
| When the AI says **not sure** → right | | 14 / 20 (70 %), all marked "check this" |
| When the AI is **guessing** (guess hidden) | | 6 lines: 5 of the guesses would have been wrong |

Model comparison (same test): `paraphrase-multilingual-MiniLM-L12-v2` (same size) got 71 % right overall vs
87 % for e5-small, so e5-small was chosen.

**On the 5 readable test receipts from session 7** (35 lines), the AI agreed with the dictionary on 34 and fixed
the one the dictionary got wrong: `SUC MERE 1L` is apple **juice** (drinks), not apples (fruit).

### Mistakes it still makes (honest list)

- Words that look alike in another language: `ШАМПИНЬОНЫ` (mushrooms) → *shampoo* (marked sure; not food, so
  it would be left unticked; the user must tick it).
- An ingredient instead of the product: `GEM DE CAISE` (apricot jam) → *apricots*; `NECTAR PIERSICI` → *peaches*.
- Very short abbreviations: `SMINT.15%` (sour cream) → *sunflower seeds*; `MAZ.VERDE` (peas) → *watermelon*.
- Products not in the list get the closest thing it knows (`MANGO` → tangerines), usually marked not sure.

That is why **the user always reviews every line**, and why every correction is remembered.

## Responsible AI

- **Privacy:** the receipt never leaves the phone. Only the model file is downloaded (from Hugging Face).
- **Human in the loop:** the AI only suggests. Nothing is saved until the user taps *Add*.
- **Transparency:** each AI suggestion is labelled (🤖 sure / not sure / didn't recognise); the match score is in
  the label's tooltip; uncertain lines are highlighted.
- **Choice:** the AI is off until the user agrees to the download; Settings → *Receipt AI* turns it off and
  deletes the model. Without it, the dictionary alone still works.
- **No silent changes:** model version and product list are pinned; if they don't match, the AI refuses to run
  instead of giving wrong answers.

## Reproduce

```bash
npm run test:ai            # the table above
npm run test:ai -- --show  # every line with the AI's answer and score
npm run ai:catalog         # after editing src/lib/foodCatalog.ts
```
