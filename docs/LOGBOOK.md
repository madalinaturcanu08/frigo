# Jurnal de evidență (Lab Logbook) — Frigo

Datele sunt cele reale din istoricul Git al proiectului (`git log`) și din `AI_LOG.md`. Coloana „Cine” se completează de
echipă: **[Elev A]** = tehnic, arhitectură și AI; **[Elev B]** = cercetare, UI/UX și economie. Unde codul a fost scris cu
asistentul AI Claude Code, scrie „+ Claude Code” (toate cererile sunt în `AI_LOG.md`).

| Data | Activitate / ipoteză verificată | Metodă | Rezultat cantitativ | Cine | Dovadă |
|---|---|---|---|---|---|
| 13.10.2026 | Plan, alegerea tehnologiilor, design în Claude Design | Analiza criteriilor InfoMatrix; plan pe 11 sesiuni | 11 sesiuni planificate | [Elev A], [Elev B] | `docs/PLAN.md` |
| 13.10.2026 | S1–3: conturi, frigider, statistici; securitate pe rânduri (RLS) pe toate tabelele | Next.js + Supabase; politici RLS | 8 tabele, toate cu RLS | [Elev A] + Claude Code | commit „Build sessions 1–3” |
| 14.10.2026 | S4: memento zilnic despre produsele care expiră | Web Push + cron zilnic 06:00 UTC | notificare de test primită pe iPhone | [Elev A] + Claude Code | commit „Session 4” |
| 14.10.2026 | Viteza la schimbarea paginilor | măsurare în browser, încărcare paralelă | navigare vizibil mai rapidă (nemăsurat numeric) | [Elev B] | commit „Make switching between tabs faster” |
| 19.10.2026 | S5: scanare cod de bare | ZXing + Open Food Facts + listă comună de produse | funcționează pe iPhone (testat manual) | [Elev A] + Claude Code | commit „Session 5” |
| 20.10.2026 | S6: rețete moldovenești ordonate după ce expiră primul | algoritm de potrivire ingrediente | 14 rețete (ciorne AI, de verificat) | [Elev B] + Claude Code | `content/recipes.json` |
| 20.10.2026 | S9: serie fără risipă și sfaturi personale | reguli simple pe istoricul utilizatorului | sfaturi calculate din istoric; teste unitare | [Elev A] + Claude Code | `src/lib/insights.ts` |
| 20.10.2026 | S11: mod offline + teste automate | coadă de operații pe telefon; Vitest + Playwright | 49 teste unitare, 20 teste în browser (Chrome + Safari) | [Elev A] + Claude Code | `tests/` |
| 20.10.2026 | Problemă reală: offline nu mergea pe iPhone | depanare pe dispozitiv real (Safari) | rezolvat după 2 încercări | [Elev B] testare, [Elev A] + Claude Code | commits din 20.10 |
| 20.10.2026 | S7: **Ipoteza 0** — „OCR în browser poate citi bonuri moldovenești” | Tesseract.js pe 6 bonuri false realiste, cu răspunsuri | nume citite 89–100 % (5 bonuri), 47 % (bonul neclar); parser: 30/31 alimente găsite → **GO** | [Elev A] + Claude Code | `docs/RECEIPT_TEST.md` |
| 20.10.2026 | S8: AI pe telefon pentru rândurile necunoscute | e5-small vs MiniLM pe 109 rânduri sintetice | e5: 87 % vs dicționar 7 %; MiniLM 71 % | [Elev A] + Claude Code | `docs/AI.md` |
| 20.10.2026 | S10: test de utilizare cu colegi | observare + feedback | feedback: „designul e prea simplu” → mascotă, culori | [Elev B] | `AI_LOG.md` |
| 11.11.2026 | Evaluarea profesorului: 7,5/10 | — | lipsesc: date reale, ipoteză, economie, documente | [Elev A], [Elev B] | e-mail profesor |
| 11.11.2026 | **Ipoteza H1–H3 scrisă înainte de test** | vezi `docs/HYPOTHESIS.md` | X = 20 p.p. F1, Y = 50 ms/rând | [Elev A], [Elev B] | `docs/HYPOTHESIS.md` |
| 11.11.2026 | Colectare date reale: 84 produse Kaufland Moldova (categoria magazinului) + 130 produse Open Food Facts (set ținut deoparte) | scripturi automate, respectând robots.txt (Linella interzice → nu am folosit) | 214 produse reale | [Elev A] + Claude Code | `content/real-products-*.json` |
| 11.11.2026 | Test v1 pe date reale | 5 metode, macro-F1 | hibrid 58,6 vs dicționar 54,2 → **H1 respinsă** | [Elev A] + Claude Code | `docs/benchmarks/v1-before-error-analysis/` |
| 11.11.2026 | Analiza erorilor + v2 (196 tipuri de produse) | tipuri lipsă: alcool, conserve, curățenie… | Kaufland: hibrid 74,6, fuzzy 75,2; set ținut deoparte: 48,3 vs 47,7 → H1 tot respinsă; H2 respinsă; H3 confirmată | [Elev A] + Claude Code | `docs/benchmarks/RESULTS.md` |
| 11.11.2026 | Viteză în browser (laptop) | test automat Chrome + Safari | 12–14 ms/rând | [Elev A] + Claude Code | `docs/benchmarks/browser-*.json` |
| 11.11.2026 | Verificarea tabelului de valabilitate | USDA FoodKeeper v128, produs cu produs | 18 din 28 valori corectate (mai prudente) | [Elev B] + Claude Code | `docs/SHELF_LIFE.md` |
| 11.11.2026 | Calcul economic | date oficiale BNS + UNEP + BNM | 4 651 lei/gospodărie/an risipă; economie 1 163–1 628 lei (scenarii 25–35 %) | [Elev B] + Claude Code | `docs/ECONOMICS.md` |
| 11.11.2026 | Securitate: versiune Next.js cu vulnerabilitate critică | `npm audit` | actualizat 16.4.0 → 16.4.6, 0 vulnerabilități | [Elev A] + Claude Code | `package.json` |
| *de completat* | Viteza AI pe telefoane reale | Setări → AI pentru bonuri → test de viteză | | [Elev A/B] | `docs/benchmarks/RESULTS.md` |
