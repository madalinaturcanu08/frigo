import type { Category, Unit } from './categories';

/**
 * Receipt text (from OCR) → fridge item suggestions. Plain rules + a dictionary of Moldovan shop abbreviations
 * in Romanian and Russian. Every suggestion is shown to the user to confirm or fix before anything is saved.
 */

export interface ReceiptItem {
  /** the product line as printed (and as read by OCR) */
  raw: string;
  name: string;
  category: Category;
  quantity: number;
  unit: Unit;
  /** what this line cost, in lei */
  price: number | null;
  /** false for things like detergent or a shopping bag — unticked in the review */
  food: boolean;
  /** high = known product and price read; medium = price read but unknown product; low = something is missing */
  confidence: 'high' | 'medium' | 'low';
}

interface Entry {
  stems: string[];
  ro: string;
  ru: string;
  category: Category;
  food?: false;
}

// More specific entries first. Stems match the start of a word, without diacritics (ă → A, ș → S…).
const DICTIONARY: Entry[] = [
  { stems: ['TELEMEA'], ro: 'Telemea', ru: 'Брынза', category: 'cheese' },
  { stems: ['BRINZA', 'BRANZA', 'БРЫНЗ'], ro: 'Brânză', ru: 'Брынза', category: 'cheese' },
  { stems: ['CASCAVAL', 'КАШКАВАЛ'], ro: 'Cașcaval', ru: 'Кашкавал', category: 'cheese' },
  { stems: ['URDA'], ro: 'Urdă', ru: 'Урда', category: 'cheese' },
  { stems: ['CHEDDAR', 'MOZZARELLA', 'СЫР'], ro: 'Cașcaval', ru: 'Сыр', category: 'cheese' },
  { stems: ['CHEFIR', 'KEFIR', 'КЕФИР'], ro: 'Chefir', ru: 'Кефир', category: 'dairy' },
  { stems: ['IAURT', 'YOGURT', 'ЙОГУРТ'], ro: 'Iaurt', ru: 'Йогурт', category: 'dairy' },
  { stems: ['SMANTANA', 'СМЕТАН'], ro: 'Smântână', ru: 'Сметана', category: 'dairy' },
  { stems: ['UNT', 'СЛИВОЧН'], ro: 'Unt', ru: 'Сливочное масло', category: 'dairy' },
  { stems: ['LAPTE', 'МОЛОКО'], ro: 'Lapte', ru: 'Молоко', category: 'dairy' },
  { stems: ['OUA', 'OUE', 'ЯЙЦ'], ro: 'Ouă', ru: 'Яйца', category: 'eggs' },
  { stems: ['PAINE', 'PIINE', 'FRANZELA', 'BAGHETA', 'ХЛЕБ', 'БАТОН'], ro: 'Pâine', ru: 'Хлеб', category: 'bread' },
  { stems: ['SCUMBRIE', 'СКУМБР'], ro: 'Scrumbie', ru: 'Скумбрия', category: 'fish' },
  { stems: ['PESTE', 'SOMON', 'HERING', 'РЫБ', 'СЕЛЬД'], ro: 'Pește', ru: 'Рыба', category: 'fish' },
  { stems: ['TOCATA', 'ФАРШ'], ro: 'Carne tocată', ru: 'Фарш', category: 'meat' },
  { stems: ['PUI', 'GAINA', 'КУР'], ro: 'Pui', ru: 'Курица', category: 'meat' },
  { stems: ['CIRNATI', 'CARNATI', 'CRENVURSTI', 'СОСИС'], ro: 'Cârnați', ru: 'Сосиски', category: 'meat' },
  { stems: ['COLBASA', 'SALAM', 'КОЛБАС'], ro: 'Colbasă', ru: 'Колбаса', category: 'meat' },
  { stems: ['CARNE', 'PORC', 'VITA', 'МЯСО', 'СВИН', 'ГОВЯД'], ro: 'Carne', ru: 'Мясо', category: 'meat' },
  { stems: ['ROSII', 'ПОМИДОР', 'ТОМАТ'], ro: 'Roșii', ru: 'Помидоры', category: 'vegetables' },
  { stems: ['CASTRAVETI', 'ОГУР'], ro: 'Castraveți', ru: 'Огурцы', category: 'vegetables' },
  { stems: ['CARTOFI', 'КАРТОФ'], ro: 'Cartofi', ru: 'Картофель', category: 'vegetables' },
  { stems: ['CEAPA', 'ЛУК'], ro: 'Ceapă', ru: 'Лук', category: 'vegetables' },
  { stems: ['MORCOV', 'МОРКОВ'], ro: 'Morcovi', ru: 'Морковь', category: 'vegetables' },
  { stems: ['VARZA', 'КАПУСТ'], ro: 'Varză', ru: 'Капуста', category: 'vegetables' },
  { stems: ['ARDEI', 'ПЕРЕЦ'], ro: 'Ardei', ru: 'Перец', category: 'vegetables' },
  { stems: ['PATRUNJEL', 'ПЕТРУШ'], ro: 'Pătrunjel', ru: 'Петрушка', category: 'vegetables' },
  { stems: ['MARAR', 'УКРОП'], ro: 'Mărar', ru: 'Укроп', category: 'vegetables' },
  { stems: ['MERE', 'ЯБЛОК'], ro: 'Mere', ru: 'Яблоки', category: 'fruit' },
  { stems: ['BANANE', 'БАНАН'], ro: 'Banane', ru: 'Бананы', category: 'fruit' },
  { stems: ['PERE', 'ГРУШ'], ro: 'Pere', ru: 'Груши', category: 'fruit' },
  { stems: ['PORTOCALE', 'АПЕЛЬСИН'], ro: 'Portocale', ru: 'Апельсины', category: 'fruit' },
  { stems: ['SUC', 'СОК'], ro: 'Suc', ru: 'Сок', category: 'drinks' },
  { stems: ['COMPOT', 'КОМПОТ'], ro: 'Compot', ru: 'Компот', category: 'drinks' },
  { stems: ['APA', 'ВОДА'], ro: 'Apă', ru: 'Вода', category: 'drinks' },
  { stems: ['PASTE', 'SPAGHETE', 'МАКАРОН'], ro: 'Paste', ru: 'Макароны', category: 'other' },
  { stems: ['OREZ', 'РИС'], ro: 'Orez', ru: 'Рис', category: 'other' },
  { stems: ['FAINA', 'МУКА'], ro: 'Făină', ru: 'Мука', category: 'other' },
  // not food
  { stems: ['DETERGENT', 'SAPUN', 'SAMPON', 'HIRTIE', 'HARTIE', 'SERVETELE', 'PUNGA', 'BATERI', 'ПАКЕТ', 'МЫЛО', 'ШАМПУН', 'БУМАГ', 'САЛФЕТ', 'ПОРОШ'], ro: '', ru: '', category: 'other', food: false },
];

/** Lines that are never products: totals, payment, tax, change, discounts, shop info. */
const NOT_ITEM = /\b(TOTAL|SUBTOTAL|NUMERAR|REST|TVA|CARD|REDUCERE|DISCOUNT|SCHIMB|ИТОГ|ВСЕГО|СДАЧА|НДС|НАЛИЧН|СКИДК|IDNO|MOSTR|SAMPLE|MULTUMIM|МУЛЦУМ|СПАСИБО)\b/;
// OCR sometimes reads the decimal point as "-" or ":" ("71-20", "17:90"), so accept those between digits.
const AMOUNT_AT_END = /(-?\d{1,5}[.,:\-]\d{2})\s*[ABАВ]?\s*$/;
const QTY_TIMES_PRICE = /(\d{1,4}(?:[.,]\d{1,3})?)\s*[xX×хХ*]\s*(\d{1,5}[.,:]\d{2})/;

/** Uppercase, no Romanian diacritics, Cyrillic kept (ё → Е). */
export function foldReceiptText(s: string): string {
  return s
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .normalize('NFD')
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .normalize('NFC');
}

const num = (s: string) => Number(s.replace(/(\d)[,:\-](\d+)$/, '$1.$2').replace(',', '.'));
const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;
const hasCyrillic = (s: string) => /\p{Script=Cyrillic}/u.test(s);

/** Pack size printed in the name: 1L, 900ML, 250G, 1KG, 10BUC (OCR often reads G as 6 or 7: "4006" = 400 g). */
function sizeFromName(name: string): { quantity: number; unit: Unit } | null {
  const m = name.match(/(\d+(?:[.,]\d+)?)\s*(KG|КГ|ML|МЛ|L|Л|G|Г|BUC|ШТ|PCS)(?![\p{L}])/u);
  if (m) {
    const unit: Record<string, Unit> = { KG: 'kg', КГ: 'kg', ML: 'ml', МЛ: 'ml', L: 'l', Л: 'l', G: 'g', Г: 'g', BUC: 'pcs', ШТ: 'pcs', PCS: 'pcs' };
    return { quantity: num(m[1]), unit: unit[m[2]] };
  }
  const misread = name.match(/\b(\d{3})[67]\b/);
  return misread ? { quantity: Number(misread[1]), unit: 'g' } : null;
}

function lookup(name: string): Entry | undefined {
  const words = foldReceiptText(name).split(/[^\p{L}]+/u).filter(Boolean);
  return DICTIONARY.find((e) => e.stems.some((s) => words.some((w) => w.startsWith(s))));
}

/** A readable name for a product we don't know: the words of the line without sizes, %, codes. */
function cleanName(raw: string): string {
  const words = raw
    .split(/\s+/)
    .filter((w) => letters(w) >= 2 && !/\d/.test(w))
    .slice(0, 3)
    .join(' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function toItem(raw: string, sum: number | null, amountLine: string): ReceiptItem {
  const entry = lookup(raw);
  const qtyPrice = amountLine.match(QTY_TIMES_PRICE);
  const weighed = qtyPrice ? /[.,]\d{3}/.test(qtyPrice[1]) : false;
  let count = qtyPrice ? num(qtyPrice[1]) : 1;
  // Cross-check with the line total: "25x 17.90 = 35.80" is really 2 × 17.90 (OCR misread a digit).
  if (qtyPrice && sum !== null && !weighed) {
    const unitPrice = num(qtyPrice[2]);
    const fromTotal = unitPrice > 0 ? sum / unitPrice : NaN;
    if (Math.abs(count * unitPrice - sum) > 0.05 && Math.abs(fromTotal - Math.round(fromTotal)) < 0.02) count = Math.round(fromTotal);
  }
  const size = sizeFromName(raw);

  let quantity = 1;
  let unit: Unit = 'pcs';
  if (weighed) [quantity, unit] = [count, 'kg'];
  else if (count > 1) [quantity, unit] = [count, 'pcs'];
  else if (size) [quantity, unit] = [size.quantity, size.unit];

  return {
    raw: raw.trim(),
    name: entry && entry.food !== false ? (hasCyrillic(raw) ? entry.ru : entry.ro) : cleanName(raw),
    category: entry?.category ?? 'other',
    quantity,
    unit,
    price: sum,
    food: entry?.food !== false,
    confidence: entry && sum !== null ? 'high' : sum !== null ? 'medium' : 'low',
  };
}

/**
 * Finds the product lines. Handles both layouts Moldovan tills print:
 *   NAME …… SUM            (one line)
 *   NAME                    (then)  QTY x PRICE …… SUM [A/B]
 */
export function parseReceipt(text: string): ReceiptItem[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  // Products sit between the date line and TOTAL; if those aren't found, look at everything.
  const folded = lines.map(foldReceiptText);
  const start = folded.findIndex((l) => /\d{2}[./]\d{2}[./]\d{2,4}/.test(l));
  const end = folded.findIndex((l, i) => i > start && /\b(TOTAL|ИТОГ|ВСЕГО)\b/.test(l));
  const body = lines.slice(start + 1, end === -1 ? undefined : end);

  const items: ReceiptItem[] = [];
  let pending: string | null = null;
  for (const line of body) {
    const f = foldReceiptText(line);
    if (NOT_ITEM.test(f) || /^[-=_*.\s]+$/.test(line)) {
      pending = null;
      continue;
    }
    const amount = line.match(AMOUNT_AT_END);
    const before = amount ? line.slice(0, amount.index) : line;
    // A product name starts with a real word ("UNT 72.5% 2006"); a quantity line doesn't ("1.245 x 16.90").
    const isNameLike = /^[^\d\s]*\p{L}{3,}/u.test(before.trim()) || letters(before) > before.replace(/\s/g, '').length * 0.6;

    if (amount && pending && !isNameLike) {
      // the "QTY x PRICE … SUM" line under a product name
      items.push(toItem(pending, num(amount[1]), line));
      pending = null;
    } else if (amount && isNameLike) {
      if (pending) items.push(toItem(pending, null, ''));
      items.push(toItem(before, num(amount[1]), line));
      pending = null;
    } else if (isNameLike) {
      if (pending) items.push(toItem(pending, null, ''));
      pending = line;
    }
  }
  if (pending) items.push(toItem(pending, null, ''));
  return items.filter((i) => i.price === null || i.price > 0);
}

/** Below this OCR confidence the photo is probably too blurry to trust — ask for a better one. */
export const MIN_OCR_CONFIDENCE = 75;
