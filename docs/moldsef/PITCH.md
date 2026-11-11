# 3-minute pitch (EN + RO)

About 380 words each, which is about 2 min 45 s at a calm pace. **[A]** = Student A (tech & AI), **[B]** = Student B
(research, UI & economics). Practise with a timer; the live demo replaces the part in *italics* if there is time.

---

## English

**[B]** Every person in Moldova throws away about 70 kilograms of food a year. That's UNEP's figure, and with our
National Bureau of Statistics data it comes to about 4,650 lei a year for an average household. Most of it isn't
thrown away on purpose: it's forgotten at the back of the fridge until it expires.

**[B]** Frigo is a free web app that shows a family what's in their fridge, sorted by what expires first. It
sends one reminder in the morning, suggests Moldovan recipes for the food that's about to go off, and shows how much
money you saved. It works in Romanian, Russian and English, and even offline.

**[A]** Adding food has to be fast, or nobody does it. You can scan a barcode, or photograph your receipt. The
receipt is read **on the phone**, and a small AI model, also on the phone, turns lines like "LAPTE JLC 2.5%" into
"Milk, dairy, about a week". The receipt never leaves the phone, and the user confirms every line.

**[A]** Our hypothesis was that adding this AI to a dictionary of shop abbreviations would raise accuracy by at least
20 points over simple text matching. We wrote that down **before** testing on real data. Then we tested 5 methods on
214 real products from Kaufland Moldova and Open Food Facts.

**[A]** The result: **the hypothesis was rejected.** On our own test lines the AI looked excellent, 86 out of 100. On real
products it was no better than a fuzzy dictionary, about 75 on one set and 48 on the other. We learned three things:
synthetic tests flatter AI; the product list matters more than the model; and the AI's confidence must not be trusted
blindly, which is why a human checks every line.

**[B]** What it's worth: if Frigo helps a family waste 25 to 35% less, that's 1,100 to 1,600 lei a year per family,
and for a thousand families over a million lei and about 50 tonnes of food. It costs the family nothing, because the AI
runs on their own phone.

**[B]** Next, we want to test on real thermal receipts and run a pilot with families. *[Demo: add an item, scan a
sample receipt, tap "Used it".]* Thank you.

---

## Română

**[B]** Fiecare om din Moldova aruncă aproximativ 70 de kilograme de mâncare pe an. Cifra e de la UNEP, iar cu datele
Biroului Național de Statistică asta înseamnă cam 4 650 de lei pe an pentru o gospodărie medie. Cea mai mare parte nu
se aruncă intenționat: mâncarea e uitată în fundul frigiderului până expiră.

**[B]** Frigo este o aplicație web gratuită care arată familiei ce are în frigider, în ordinea în care expiră. Trimite
un memento dimineața, propune rețete moldovenești pentru ce urmează să se strice și arată câți bani ai economisit.
Funcționează în română, rusă și engleză, chiar și fără internet.

**[A]** Adăugarea trebuie să fie rapidă, altfel nimeni n-o face. Poți scana codul de bare sau fotografia bonul. Bonul
este citit **pe telefon**, iar un model AI mic, tot pe telefon, transformă rânduri ca „LAPTE JLC 2.5%” în „Lapte,
lactate, cam o săptămână”. Bonul nu părăsește telefonul, iar utilizatorul confirmă fiecare rând.

**[A]** Ipoteza noastră a fost că AI-ul adăugat la un dicționar de abrevieri crește precizia cu cel puțin 20 de puncte
față de o simplă potrivire de text. Am scris-o **înainte** de testul pe date reale. Apoi am testat 5 metode pe 214
produse reale de la Kaufland Moldova și Open Food Facts.

**[A]** Rezultatul: **ipoteza a fost respinsă.** Pe rândurile scrise de noi, AI-ul părea excelent: 86 din 100. Pe produse
reale nu a fost mai bun decât un dicționar fuzzy: cam 75 pe un set și 48 pe celălalt. Am învățat trei lucruri: testele
sintetice favorizează AI-ul; lista de produse contează mai mult decât modelul; iar încrederea AI-ului nu trebuie
crezută orbește, de aceea omul verifică fiecare rând.

**[B]** Cât valorează: dacă Frigo ajută o familie să risipească cu 25–35 % mai puțin, înseamnă 1 100–1 600 de lei pe an
pentru o familie, iar pentru o mie de familii peste un milion de lei și cam 50 de tone de mâncare. Pentru familie costul
e zero, pentru că AI-ul rulează pe propriul telefon.

**[B]** Următorul pas: teste pe bonuri termice reale și un pilot cu familii. *[Demo: adăugăm un produs, scanăm un bon
de probă, apăsăm „L-am folosit”.]* Vă mulțumim.

---

## Likely jury questions — who answers

| Question | Who | Where to prepare |
|---|---|---|
| How does the AI decide? What is cosine similarity? | A | `docs/CODE_GUIDE.md` §1 |
| How does offline sync avoid duplicates? | A | `docs/CODE_GUIDE.md` §2 |
| How do you stop one family seeing another's data? | A | `docs/CODE_GUIDE.md` §3 |
| Why was the hypothesis rejected, and is the project a failure? | A + B | `docs/benchmarks/RESULTS.md` ("What we learned") |
| Where do the 4,650 lei come from? | B | `docs/ECONOMICS.md` |
| Why not use ChatGPT for the receipts? | B | privacy (receipts stay on the phone), cost (0 per request), works offline |
| Where do the expiry estimates come from? | B | `docs/SHELF_LIFE.md` (USDA FoodKeeper) |
| Did AI write your code? | A + B | yes, with Claude Code; every request is in `AI_LOG.md`, and we can explain each part |
