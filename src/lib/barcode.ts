import type { Category, Unit } from './categories';

/** EAN-8, UPC-A (12), EAN-13 or GTIN-14 with a correct check digit. */
export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  // From the right (excluding the check digit), weights alternate 3, 1, 3, 1…
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

const UNIT_ALIASES: Record<string, Unit> = {
  g: 'g', gr: 'g', grams: 'g', г: 'g',
  kg: 'kg', кг: 'kg',
  ml: 'ml', мл: 'ml',
  cl: 'ml',
  l: 'l', ltr: 'l', litre: 'l', liter: 'l', л: 'l',
  buc: 'pcs', pcs: 'pcs', pc: 'pcs', шт: 'pcs', x: 'pcs',
};

/**
 * Reads a pack size such as "1 L", "500g", "1,5 kg", "33 cl" or "10 buc".
 * Multipacks ("6 x 125 g") count the pieces. Returns null when it can't tell.
 */
export function parsePackQuantity(text: string | null | undefined): { quantity: number; unit: Unit } | null {
  if (!text) return null;
  const s = text.toLowerCase().replace(',', '.').trim();

  const multi = s.match(/^(\d+)\s*[x×*]\s*\d/);
  if (multi) return { quantity: Number(multi[1]), unit: 'pcs' };

  const m = s.match(/(\d+(?:\.\d+)?)\s*([a-zа-я]+)/u);
  if (!m) return null;
  const unit = UNIT_ALIASES[m[2]];
  let quantity = Number(m[1]);
  if (!unit || !(quantity > 0)) return null;
  if (m[2] === 'cl') quantity *= 10;
  return { quantity: Math.round(quantity * 1000) / 1000, unit };
}

/** Open Food Facts category tags (e.g. "en:yogurts") → Frigo category. First match wins, so order matters. */
const CATEGORY_RULES: [RegExp, Category][] = [
  [/beverages|drinks|juices|waters|sodas|nectars/, 'drinks'],
  [/cheeses|brinza|telemea/, 'cheese'],
  [/(^|:|-)eggs/, 'eggs'],
  [/fishes|seafood|fish-and/, 'fish'],
  [/meats|poultry|sausages|hams|chicken|pork|beef/, 'meat'],
  [/dairies|milks|yogurts|creams|butters|kefir|fermented-milk|dairy/, 'dairy'],
  [/breads|bakery|viennoiseries|pastries/, 'bread'],
  [/fruits|berries/, 'fruit'],
  [/vegetables|salads|potatoes|legumes/, 'vegetables'],
  [/sauces|condiments|ketchup|mayonnaise|mustards|canned|pickles|jams/, 'sauces'],
  [/meals|prepared|ready/, 'leftovers'],
];

export function categoryFromTags(tags: string[] | null | undefined): Category {
  const joined = (tags ?? []).join(' ');
  return CATEGORY_RULES.find(([re]) => re.test(joined))?.[1] ?? 'other';
}
