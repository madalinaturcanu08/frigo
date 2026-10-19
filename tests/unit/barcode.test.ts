import { describe, expect, it } from 'vitest';
import { categoryFromTags, isValidGtin, parsePackQuantity } from '@/lib/barcode';

describe('isValidGtin', () => {
  it('accepts real EAN-13, EAN-8 and UPC-A codes', () => {
    expect(isValidGtin('3017620422003')).toBe(true); // Nutella
    expect(isValidGtin('4840049001004')).toBe(true); // Moldovan 484 prefix (made-up product, valid check digit)
    expect(isValidGtin('96385074')).toBe(true);
    expect(isValidGtin('036000291452')).toBe(true);
  });
  it('rejects a wrong check digit, letters and odd lengths', () => {
    expect(isValidGtin('3017620422004')).toBe(false);
    expect(isValidGtin('30176204220a3')).toBe(false);
    expect(isValidGtin('12345')).toBe(false);
  });
});

describe('parsePackQuantity', () => {
  it('reads common pack sizes', () => {
    expect(parsePackQuantity('1 L')).toEqual({ quantity: 1, unit: 'l' });
    expect(parsePackQuantity('500g')).toEqual({ quantity: 500, unit: 'g' });
    expect(parsePackQuantity('1,5 kg')).toEqual({ quantity: 1.5, unit: 'kg' });
    expect(parsePackQuantity('33 cl')).toEqual({ quantity: 330, unit: 'ml' });
    expect(parsePackQuantity('10 buc')).toEqual({ quantity: 10, unit: 'pcs' });
    expect(parsePackQuantity('900 мл')).toEqual({ quantity: 900, unit: 'ml' });
  });
  it('counts pieces in multipacks and gives up on nonsense', () => {
    expect(parsePackQuantity('6 x 125 g')).toEqual({ quantity: 6, unit: 'pcs' });
    expect(parsePackQuantity('family size')).toBeNull();
    expect(parsePackQuantity('')).toBeNull();
  });
});

describe('categoryFromTags', () => {
  it('maps Open Food Facts tags to Frigo categories', () => {
    expect(categoryFromTags(['en:dairies', 'en:fermented-milk-products', 'en:yogurts'])).toBe('dairy');
    expect(categoryFromTags(['en:dairies', 'en:cheeses'])).toBe('cheese');
    expect(categoryFromTags(['en:plant-based-foods', 'en:beverages', 'en:fruit-juices'])).toBe('drinks');
    expect(categoryFromTags(['en:meats', 'en:sausages'])).toBe('meat');
    expect(categoryFromTags(['en:spreads', 'en:sweet-spreads'])).toBe('other');
    expect(categoryFromTags(undefined)).toBe('other');
  });
});
