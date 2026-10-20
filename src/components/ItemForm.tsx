'use client';

import { useActionState, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import type { ItemFormState } from '@/app/actions/items';
import { lookupBarcode } from '@/app/actions/products';
import { newOpId, pushOp } from '@/lib/offlineQueue';
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  STORAGES,
  UNITS,
  lookupShelfDays,
  type Category,
  type ShelfLifeRow,
  type Storage,
  type Unit,
} from '@/lib/categories';
import { addDays, parseISODate, toISODate } from '@/lib/dates';
import { estimateExpiry } from '@/lib/expiry';
import { BarcodeScanner } from './BarcodeScanner';
import { ItemCard } from './ItemCard';
import { PhotoFrame } from './PhotoFrame';

const QUICK_DAYS = [2, 5, 7, 14, 30] as const;

type ScanState =
  | { kind: 'idle' }
  | { kind: 'looking'; barcode: string }
  | { kind: 'found'; barcode: string; source: 'cache' | 'off' }
  | { kind: 'unknown'; barcode: string }
  | { kind: 'error' };

type DateMode = { kind: 'auto' } | { kind: 'keep' } | { kind: 'days'; days: number } | { kind: 'date'; date: string };

export interface ItemFormValues {
  name: string;
  category: Category;
  quantity: number;
  unit: Unit;
  storage: Storage;
  price_lei: number | null;
  expires_at?: string;
  expiry_estimated?: boolean;
}

export function ItemForm({
  action,
  shelfLife,
  initial,
  submitLabel,
}: {
  action: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  shelfLife: ShelfLifeRow[];
  initial?: ItemFormValues;
  submitLabel: string;
}) {
  const t = useTranslations('form');
  const tb = useTranslations('barcode');
  const ti = useTranslations('item');
  const format = useFormatter();
  const [state, formAction, pending] = useActionState(action, undefined);

  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'dairy');
  // Kept as text so the field can be cleared and retyped; parsed where a number is needed.
  const [quantityText, setQuantityText] = useState(String(initial?.quantity ?? 1));
  const parsedQuantity = Number(quantityText.replace(',', '.'));
  const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'pcs');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scan, setScan] = useState<ScanState>({ kind: 'idle' });
  const nameRef = useRef<HTMLInputElement>(null);
  const scannedBarcode = scan.kind === 'found' || scan.kind === 'unknown' ? scan.barcode : '';

  const router = useRouter();
  const [offlineEditError, setOfflineEditError] = useState(false);

  /** No connection: a new item is kept on the device and synced later; edits need the server, so explain that. */
  function submitOffline(e: React.FormEvent<HTMLFormElement>) {
    if (navigator.onLine) return;
    e.preventDefault();
    if (initial) return setOfflineEditError(true);
    if (!name.trim()) return;
    const priceLei = Number(price.replace(',', '.'));
    pushOp({
      kind: 'add',
      opId: newOpId(),
      at: new Date().toISOString(),
      item: {
        name: name.trim(),
        category,
        quantity,
        unit,
        storage,
        price_lei: price.trim() && Number.isFinite(priceLei) ? priceLei : null,
        expires_at: submittedDate || null,
        barcode: scannedBarcode || undefined,
      },
    });
    router.push('/');
  }

  async function handleBarcode(code: string) {
    setScannerOpen(false);
    setScan({ kind: 'looking', barcode: code });
    try {
      const result = await lookupBarcode(code);
      if (result.status === 'found') {
        setName(result.name);
        setCategory(result.category);
        if (result.quantity && result.unit) {
          setQuantityText(String(result.quantity));
          setUnit(result.unit);
        }
        setScan({ kind: 'found', barcode: result.barcode, source: result.source });
      } else if (result.status === 'unknown') {
        // Don't leave a previous scan's product in the fields — it would be saved under the new barcode.
        if (scan.kind === 'found') {
          setName('');
          setQuantityText('1');
          setUnit('pcs');
        }
        setScan({ kind: 'unknown', barcode: result.barcode });
        nameRef.current?.focus();
      } else {
        setScan({ kind: 'error' });
      }
    } catch {
      setScan({ kind: 'error' });
    }
  }
  const [storage, setStorage] = useState<Storage>(initial?.storage ?? 'fridge');
  const [price, setPrice] = useState(initial?.price_lei != null ? String(initial.price_lei) : '');
  const defaultMode: DateMode = initial?.expires_at ? { kind: 'keep' } : { kind: 'auto' };
  const [mode, setMode] = useState<DateMode>(defaultMode);
  // What is in the date box, even half-typed: the browser reports "" until all parts are filled in,
  // so the box can't be driven by `mode` alone or it would wipe the digits being typed.
  const [dateInput, setDateInput] = useState('');

  function chooseMode(next: DateMode) {
    setMode(next);
    setDateInput('');
  }

  function typeDate(value: string) {
    setDateInput(value);
    if (value && Number(value.slice(0, 4)) >= 2000) setMode({ kind: 'date', date: value });
    else if (mode.kind === 'date') setMode(defaultMode);
  }

  const today = new Date();
  const estimatedDays = lookupShelfDays(shelfLife, category, storage);
  const expiresAt =
    mode.kind === 'keep'
      ? initial!.expires_at!
      : mode.kind === 'days'
        ? toISODate(addDays(today, mode.days))
        : mode.kind === 'date'
          ? mode.date
          : estimateExpiry(estimatedDays, today);
  const estimated = mode.kind === 'auto' || (mode.kind === 'keep' && !!initial?.expiry_estimated);
  // Only send a date the user actually chose; empty means "estimate" (add) or "keep" (edit).
  const submittedDate = mode.kind === 'days' || mode.kind === 'date' ? expiresAt : '';

  const dateText = format.dateTime(parseISODate(expiresAt), { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-6">
      <form action={formAction} onSubmit={submitOffline} className="card flex flex-col gap-6 rounded-[28px] p-[clamp(18px,3vw,30px)]">
        {!initial && (
          <div className="flex flex-col gap-2.5">
            <input type="hidden" name="barcode" value={scannedBarcode} />
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={() => setScannerOpen(true)} className="btn-lime">
                <svg aria-hidden width="20" height="16" viewBox="0 0 20 16" fill="currentColor">
                  <rect x="0" y="0" width="2" height="16" />
                  <rect x="4" y="0" width="1" height="16" />
                  <rect x="7" y="0" width="3" height="16" />
                  <rect x="12" y="0" width="1" height="16" />
                  <rect x="15" y="0" width="2" height="16" />
                  <rect x="19" y="0" width="1" height="16" />
                </svg>
                {tb('scan')}
              </button>
              {scan.kind !== 'idle' && scan.kind !== 'looking' && (
                <button type="button" onClick={() => setScan({ kind: 'idle' })} className="text-sm font-semibold text-muted underline">
                  {tb('clear')}
                </button>
              )}
            </div>
            {scan.kind !== 'idle' && (
              <p
                role="status"
                className={`m-0 rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold ${
                  scan.kind === 'found'
                    ? 'border-edge bg-fresh text-[#121212]'
                    : scan.kind === 'error'
                      ? 'border-edge bg-expired text-[#121212]'
                      : scan.kind === 'unknown'
                        ? 'border-edge bg-soon text-[#121212]'
                        : 'border-line text-muted'
                }`}
              >
                {scan.kind === 'looking' && tb('looking', { barcode: scan.barcode })}
                {scan.kind === 'found' && tb(scan.source === 'off' ? 'foundOff' : 'foundCache')}
                {scan.kind === 'unknown' && tb('unknown', { barcode: scan.barcode })}
                {scan.kind === 'error' && tb('error')}
              </p>
            )}
          </div>
        )}

        <label className="flex flex-col gap-2">
          <span className="kicker">{t('name')}</span>
          <input
            ref={nameRef}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            maxLength={80}
            required
            autoFocus={!initial}
            autoComplete="off"
            className="field"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="kicker mb-2">{t('category')}</legend>
          <input type="hidden" name="category" value={category} />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`pill ${category === c ? 'is-on' : ''}`}
              >
                <span aria-hidden>{CATEGORY_EMOJI[c]}</span>
                {ti(`category.${c}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-2">
            <span className="kicker" id="qty-label">
              {t('quantity')}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border-2 border-line p-1" aria-labelledby="qty-label">
                <button
                  type="button"
                  aria-label={t('less')}
                  onClick={() => setQuantityText(String(Math.max(1, quantity - 1)))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-track text-[22px] font-bold"
                >
                  −
                </button>
                <input type="hidden" name="quantity" value={quantity} />
                <input
                  inputMode="decimal"
                  value={quantityText}
                  onChange={(e) => setQuantityText(e.target.value.replace(/[^\d.,]/g, '').slice(0, 7))}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => setQuantityText(String(quantity))}
                  aria-labelledby="qty-label"
                  className="w-20 bg-transparent text-center font-pixel text-[28px] font-black outline-none"
                />
                <button
                  type="button"
                  aria-label={t('more')}
                  onClick={() => setQuantityText(String(quantity + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-lime text-[22px] font-bold text-[#121212]"
                >
                  +
                </button>
              </div>
              <select
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                aria-label={t('unit')}
                className="h-12 rounded-full border-2 border-line bg-card px-3 font-semibold"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {ti(`units.${u}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="kicker mb-2">{t('storedIn')}</legend>
            <input type="hidden" name="storage" value={storage} />
            <div className="flex gap-0.5 rounded-full border-2 border-line p-1">
              {STORAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={storage === s}
                  onClick={() => setStorage(s)}
                  className={`flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
                    storage === s ? 'bg-ink text-bg' : 'text-ink'
                  }`}
                >
                  {ti(`storage.${s}`)}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2.5">
            <legend className="kicker">{t('bestBefore')}</legend>
            <div className="text-sm font-semibold">
              {dateText}
              {estimated && <span className="text-muted"> · {t('estimated')}</span>}
            </div>
          </div>
          <input type="hidden" name="expires_at" value={submittedDate} />
          <div className="flex flex-wrap gap-2">
            {initial?.expires_at && (
              <button
                type="button"
                aria-pressed={mode.kind === 'keep'}
                onClick={() => chooseMode({ kind: 'keep' })}
                className={`pill ${mode.kind === 'keep' ? 'is-on' : ''}`}
              >
                {t('keepDate')}
              </button>
            )}
            {!initial?.expires_at && (
              <button
                type="button"
                aria-pressed={mode.kind === 'auto'}
                onClick={() => chooseMode({ kind: 'auto' })}
                className={`pill ${mode.kind === 'auto' ? 'is-on' : ''}`}
              >
                {t('autoDate', { days: estimatedDays })}
              </button>
            )}
            {QUICK_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={mode.kind === 'days' && mode.days === d}
                onClick={() => chooseMode({ kind: 'days', days: d })}
                className={`pill ${mode.kind === 'days' && mode.days === d ? 'is-on' : ''}`}
              >
                {t(`quick.${d}`)}
              </button>
            ))}
            <label className={`pill ${mode.kind === 'date' ? 'is-on' : ''}`}>
              <span>{t('pickDate')}</span>
              <input
                type="date"
                value={dateInput}
                min={toISODate(addDays(today, -30))}
                onChange={(e) => typeDate(e.target.value)}
                className={`w-[118px] bg-transparent text-sm outline-none ${
                  // the calendar icon follows the page theme; flip it on the inverted (selected) chip
                  mode.kind === 'date' ? '[&::-webkit-calendar-picker-indicator]:invert' : ''
                }`}
              />
            </label>
          </div>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="kicker">{t('price')}</span>
          <div className="relative">
            <input
              name="price_lei"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="field pr-14"
            />
            <span className="absolute top-1/2 right-[18px] -translate-y-1/2 font-semibold text-muted">lei</span>
          </div>
          <span className="text-[13px] text-muted">{t('priceHint')}</span>
        </label>

        {offlineEditError && (
          <p role="alert" className="m-0 rounded-2xl border-2 border-edge bg-soon px-4 py-3 font-semibold text-[#121212]">
            {t('offlineEdit')}
          </p>
        )}
        {state?.error && (
          <p role="alert" className="m-0 rounded-2xl border-2 border-edge bg-expired px-4 py-3 font-semibold text-[#121212]">
            {t(`errors.${state.error}`)}
          </p>
        )}

        <button type="submit" disabled={!name.trim() || pending} className="btn-ink">
          {pending ? t('saving') : submitLabel}
        </button>
      </form>

      <div className="flex flex-col gap-2.5">
        <div className="kicker">{t('preview')}</div>
        <ItemCard
          preview
          item={{
            id: 'preview',
            name: name.trim() || t('newItem'),
            category,
            quantity,
            unit,
            storage,
            expires_at: expiresAt,
            expiry_estimated: estimated,
          }}
        />
        {estimated && (
          <p className="m-0 text-sm text-muted">
            {t('estimateExplain', { days: estimatedDays, category: ti(`category.${category}`), storage: ti(`storage.${storage}`) })}
          </p>
        )}
        {!initial && (
          <PhotoFrame name="decor-add" alt="" className="mt-2 aspect-[4/3] rounded-[22px] border-2 border-line shadow-card" sizes="(max-width: 700px) 100vw, 420px">
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
              <div className="font-display text-[11px] tracking-[1px] uppercase opacity-90">{t('tipLabel')}</div>
              <p className="m-0 text-[15px] font-semibold">{t('tip')}</p>
            </div>
          </PhotoFrame>
        )}
      </div>

      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}
    </div>
  );
}
