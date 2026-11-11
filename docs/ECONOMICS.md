# Economic benefit (ROI) of Frigo for Moldovan families

Every input below comes from an official source (links at the bottom). Where we had to assume something, it is
marked **assumption** and its effect is shown. The waste-reduction rates (25 % and 35 %) are **scenarios, not
measurements**: Frigo has not yet been tested in a family pilot (see "What would make this stronger").

## 1. How much food a Moldovan household throws away

| Input | Value | Source |
|---|---|---|
| Household food waste, Moldova | **70.6 kg per person per year** (2022) | UNEP Food Waste Index 2024 [1] |
| World average, for comparison | 79.1 kg per person per year (2022) | UNEP Food Waste Index 2024 [1] |
| Average household size | **2.3 persons** (2025) | NBS, Household Budget Survey [3] |
| Food consumed at home (sum of the 10 main food groups) | **736.6 kg per person per year** (2025) | NBS, Household Budget Survey [4] |

→ Food thrown away = 70.6 / 736.6 = **9.6 % of the food a household buys** (by weight).
→ Per household: 70.6 × 2.3 = **162 kg of food a year**.

*Assumptions:* one egg = 60 g; NBS reports bread in flour equivalent and dairy in milk equivalent, so the 736.6 kg is an
approximation; the waste figure is for 2022 and the consumption figure for 2025.

## 2. What that food costs

| Input | Value | Source |
|---|---|---|
| Consumption spending | **4,407.0 lei per person per month** (2024) | NBS [2] |
| Share spent on food and non-alcoholic drinks | **39.9 %** (2024) | NBS [2] |

→ Food spending = 4,407.0 × 39.9 % × 12 = **21,101 lei per person per year**.
→ Value of food thrown away = 21,101 × 9.6 % = **2,022 lei per person**, or **4,651 lei per household per year
(≈ 231 €)**.

*Assumption:* a kilogram of wasted food costs the same as an average kilogram bought. Fresh food (fruit, dairy,
meat) is wasted more often and costs more per kg, so this is probably an **under-estimate**.

## 3. Savings if Frigo helps a family waste less

| Scenario | Saving per household per year | For 1,000 families per year | Food not thrown away (1,000 families) |
|---|---|---|---|
| Waste cut by **25 %** | **1,163 lei** (≈ 58 €) | **1.16 million lei** (≈ 57,800 €) | 40.6 tonnes |
| Waste cut by **35 %** | **1,628 lei** (≈ 81 €) | **1.63 million lei** (≈ 80,900 €) | 56.8 tonnes |

Euro values use the National Bank of Moldova official rate of 11.11.2026: 1 € = 20.1298 lei [5].

## 4. What Frigo costs

| | Cost | Why |
|---|---|---|
| For a family | **0 lei** | Free website, no ads, no subscription |
| AI per receipt | **0 lei** | The AI runs on the phone, so there is no paid AI service (no "per request" bill) |
| Hosting | 0 lei at school-project scale | Free plans of Vercel (website) and Supabase (database) |
| Phone data, once | ~120 MB | Only if the family turns the receipt AI on |

**Return on investment for a family:** cost 0, saving 1,163–1,628 lei a year in the scenarios above.

## 5. Comparison with existing apps (checked on 11.11.2026)

| App | Price | Source |
|---|---|---|
| NoWaste | Free version (limited); **Pro $9.99/year or $44.99 one-time** (≈ 179 / 807 lei) on its website; the App Store lists several other Pro prices | nowasteapp.com [6] |
| Kitche (UK) | Free, according to its website | kitche.co [7] |
| Fridgely | Price not published on its website | fridgelyapp.com [8] |
| **Frigo** | **Free**, and the only one with Romanian + Russian receipt reading and Moldovan recipes | — |

*Note:* we could not confirm the "25–60 € per year" price range sometimes quoted for these apps. The prices above are
what the official pages showed.

## What would make this stronger

The savings are **modelled**, not measured. A pilot (5–10 families using Frigo for 2–3 weeks, comparing what they
throw away with and without it) would replace the 25 % / 35 % scenarios with a measured number. The plan for that
study is in `docs/PILOT_PLAN.md`.

## Sources

1. UNEP Food Waste Index Report 2024, household food waste per capita by country, as published in the dataset
   "Food waste per capita" by Our World in Data (FAO & UNEP, processed by OWID):
   https://ourworldindata.org/grapher/food-waste-per-capita (data downloaded 11.11.2026)
2. National Bureau of Statistics of Moldova (NBS), *Veniturile și cheltuielile populației în anul 2024*, 31.03.2025:
   https://statistica.gov.md/ro/veniturile-si-cheltuielile-populatiei-in-anul-2024-9442_61726.html
3. NBS StatBank, table NIV030 *Average size of households by area and years* (2025):
   https://statbank.statistica.md (30 Statistica sociala → 04 NIV → NIV030)
4. NBS StatBank, table NIV060 *Food consumption by foods, years and areas* (2025, whole country):
   https://statbank.statistica.md (30 Statistica sociala → 04 NIV → NIV060)
5. National Bank of Moldova, official exchange rates, 11.11.2026: https://www.bnm.md/en/official_exchange_rates
6. https://www.nowasteapp.com (read 11.11.2026)
7. https://www.kitche.co (read 11.11.2026)
8. https://fridgelyapp.com (read 11.11.2026)
