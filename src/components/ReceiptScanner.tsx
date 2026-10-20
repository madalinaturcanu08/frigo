'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { addReceiptItems } from '@/app/actions/receipt';
import { CATEGORIES, CATEGORY_EMOJI, lookupShelfDays, type Category, type ShelfLifeRow } from '@/lib/categories';
import { MIN_OCR_CONFIDENCE, foldReceiptText, parseReceipt, type ReceiptItem } from '@/lib/receipt';
import { SOON_DAYS } from '@/lib/expiry';
import { AI_MODEL, type AISuggestion } from '@/lib/aiMatch';
import { FrigoIcon } from './FrigoMascot';
import { aiWanted, checkWithAI, setAIWanted, type AIItem } from '@/lib/receiptAI';

export interface Correction {
  raw_text: string;
  corrected_name: string;
  corrected_category: string;
}

interface Row extends ReceiptItem {
  key: number;
  on: boolean;
  days: number;
  learned: boolean;
  suggested: { name: string; category: Category };
  ai: AISuggestion | null;
  usedAI: boolean;
}

/** The on-device AI: not asked yet, downloading/thinking, done, or it failed (then the dictionary alone is used). */
type AIState = { kind: 'idle' } | { kind: 'thinking'; download: number } | { kind: 'done' } | { kind: 'failed' };

type Step =
  | { kind: 'pick' }
  | { kind: 'reading'; progress: number }
  | { kind: 'thinking' }
  | { kind: 'unclear'; confidence: number }
  | { kind: 'review' }
  | { kind: 'error' };

const SAMPLES = ['r1-clean', 'r2-phone-tilted', 'r3-faded', 'r4-romanian-russian', 'r5-long-with-nonfood', 'r6-hard'];

/** Downscales a photo before OCR: phone photos are 12+ MP, which makes reading slow without being more accurate. */
async function prepare(src: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(src);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function ReceiptScanner({ shelfLife, corrections }: { shelfLife: ShelfLifeRow[]; corrections: Correction[] }) {
  const t = useTranslations('receipt');
  const ti = useTranslations('item');
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [photo, setPhoto] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [ai, setAI] = useState<AIState>({ kind: 'idle' });
  // read once in the browser; the review screen that uses it only appears after a photo is chosen
  const [wanted, setWanted] = useState(() => typeof window !== 'undefined' && aiWanted());

  const learned = new Map(corrections.map((c) => [c.raw_text, c]));
  const shelfDays = (category: Category) => lookupShelfDays(shelfLife, category, 'fridge');

  function buildRows(items: (ReceiptItem | AIItem)[]) {
    setRows(
      items.map((item, key) => {
        // A correction the user made on an earlier receipt wins over the dictionary.
        const fix = learned.get(foldReceiptText(item.raw));
        const name = fix?.corrected_name ?? item.name;
        const category = (fix?.corrected_category ?? item.category) as Category;
        return {
          ...item,
          key,
          name,
          category,
          on: item.food,
          days: shelfDays(category),
          learned: !!fix || ('ai' in item && !!item.ai?.learned),
          confidence: fix ? 'high' : item.confidence,
          suggested: { name, category },
          ai: 'ai' in item ? item.ai : null,
          usedAI: !fix && 'usedAI' in item && item.usedAI,
        };
      }),
    );
  }

  async function read(src: Blob, url: string) {
    setPhoto(url);
    setStep({ kind: 'reading', progress: 0 });
    try {
      const { createWorker } = await import('tesseract.js');
      // The photo is read here, on the device — it is never uploaded. Only the reading models are downloaded once.
      const worker = await createWorker(['ron', 'rus', 'eng'], 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setStep({ kind: 'reading', progress: m.progress });
        },
      });
      const { data } = await worker.recognize(await prepare(src));
      await worker.terminate();
      setText(data.text);
      const parsed = parseReceipt(data.text);
      setItems(parsed);
      buildRows(parsed);
      setAI({ kind: 'idle' });
      if (data.confidence < MIN_OCR_CONFIDENCE) return setStep({ kind: 'unclear', confidence: Math.round(data.confidence) });
      if (aiWanted() && parsed.length) await runAI(parsed);
      setStep({ kind: 'review' });
    } catch {
      setStep({ kind: 'error' });
    }
  }

  /** Lets the on-device AI check every line; the review shows the dictionary's suggestions if it fails. */
  async function runAI(list: ReceiptItem[] = items) {
    setStep({ kind: 'thinking' });
    setAI({ kind: 'thinking', download: 0 });
    try {
      const checked = await checkWithAI(list, corrections, (download) => setAI({ kind: 'thinking', download }));
      buildRows(checked);
      setAI({ kind: 'done' });
    } catch {
      buildRows(list);
      setAI({ kind: 'failed' });
    }
    setStep({ kind: 'review' });
  }

  async function turnOnAI() {
    setAIWanted(true);
    setWanted(true);
    await runAI();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await read(file, URL.createObjectURL(file));
  }

  async function onSample(id: string) {
    const url = `/demo-receipts/${id}.jpg`;
    await read(await (await fetch(url)).blob(), url);
  }

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const selected = rows.filter((r) => r.on && r.name.trim());

  async function save() {
    setSaving(true);
    setSaveError(false);
    const result = await addReceiptItems(
      selected.map((r) => ({
        raw: r.raw,
        name: r.name.trim(),
        category: r.category,
        quantity: r.quantity,
        unit: r.unit,
        price: r.price,
        days: r.days,
        corrected: r.name.trim() !== r.suggested.name || r.category !== r.suggested.category,
      })),
    ).catch(() => ({ error: 'saveFailed' }));
    setSaving(false);
    if ('error' in result) return setSaveError(true);
    router.push('/');
  }

  if (step.kind === 'pick' || step.kind === 'error') {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-6">
        <div className="card flex flex-col gap-4 rounded-[28px] p-[clamp(18px,3vw,30px)]">
          <h2 className="m-0 font-display text-xl font-normal">{t('pickTitle')}</h2>
          <p className="m-0 text-[15px] text-muted">{t('pickLead')}</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-ink">
            {t('takePhoto')}
          </button>
          <ul className="m-0 flex flex-col gap-1.5 p-0 pl-5 text-sm text-muted">
            <li>{t('tip1')}</li>
            <li>{t('tip2')}</li>
            <li>{t('tip3')}</li>
          </ul>
          <p className="m-0 rounded-2xl bg-track px-4 py-3 text-sm">{t('privacy')}</p>
          {step.kind === 'error' && (
            <p role="alert" className="m-0 rounded-2xl border-2 border-edge bg-expired px-4 py-3 font-semibold text-[#121212]">
              {t('readError')}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="kicker">{t('samplesTitle')}</div>
          <p className="m-0 text-sm text-muted">{t('samplesLead')}</p>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLES.map((id, i) => (
              <button key={id} type="button" onClick={() => onSample(id)} className="card overflow-hidden rounded-2xl text-left">
                {/* eslint-disable-next-line @next/next/no-img-element -- small local previews */}
                <img src={`/demo-receipts/${id}.jpg`} alt="" className="aspect-[3/4] w-full object-cover" />
                <span className="block px-2 py-1.5 text-xs font-semibold">{t(`sample${i + 1}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step.kind === 'reading') {
    return (
      <div className="card flex flex-col items-center gap-4 rounded-[28px] p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo} alt="" className="max-h-[260px] rounded-2xl border-2 border-line" />}
        <div className="font-display text-lg">{t('reading')}</div>
        <div className="h-3 w-full max-w-[320px] overflow-hidden rounded-full border-[1.5px] border-line bg-track">
          <div className="h-full bg-lime transition-all" style={{ width: `${Math.round(step.progress * 100)}%` }} />
        </div>
        <p className="m-0 text-sm text-muted">{t('readingNote')}</p>
      </div>
    );
  }

  if (step.kind === 'thinking') {
    const download = ai.kind === 'thinking' ? ai.download : 0;
    return (
      <div className="card flex flex-col items-center gap-4 rounded-[28px] p-8 text-center">
        <FrigoIcon className="h-14 w-auto" />
        <div className="font-display text-lg">{download > 0 && download < 1 ? t('aiDownloading', { mb: AI_MODEL.downloadMB }) : t('aiThinking')}</div>
        <div className="h-3 w-full max-w-[320px] overflow-hidden rounded-full border-[1.5px] border-line bg-track">
          <div className={`h-full bg-lime transition-all ${download === 0 ? 'w-1/3 animate-pulse' : ''}`} style={download > 0 ? { width: `${Math.round(download * 100)}%` } : undefined} />
        </div>
        <p className="m-0 max-w-[420px] text-sm text-muted">{t('aiPrivacy')}</p>
      </div>
    );
  }

  if (step.kind === 'unclear') {
    return (
      <div className="card flex flex-col gap-4 rounded-[28px] p-[clamp(18px,3vw,30px)]">
        <h2 className="m-0 font-display text-xl font-normal">{t('unclearTitle')}</h2>
        <p className="m-0 text-[15px]">{t('unclearLead', { confidence: step.confidence })}</p>
        <ul className="m-0 flex flex-col gap-1.5 p-0 pl-5 text-sm text-muted">
          <li>{t('tip1')}</li>
          <li>{t('tip2')}</li>
          <li>{t('tip3')}</li>
        </ul>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => setStep({ kind: 'pick' })} className="btn-lime">
            {t('retake')}
          </button>
          <button type="button" onClick={() => (wanted ? runAI() : setStep({ kind: 'review' }))} className="btn-ghost" disabled={rows.length === 0}>
            {t('reviewAnyway', { count: rows.length })}
          </button>
        </div>
      </div>
    );
  }

  // review
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex max-w-[380px] flex-[1_1_260px] flex-col gap-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo} alt={t('photoAlt')} className="card max-h-[440px] w-full rounded-[26px] object-contain" />}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-[13px] text-muted">{t('linesFound', { count: rows.length })}</div>
          <button type="button" onClick={() => setStep({ kind: 'pick' })} className="btn-ghost h-[38px] min-h-0 px-3.5 text-[13px]">
            {t('retake')}
          </button>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-muted">{t('showText')}</summary>
          <pre className="mt-2 max-h-[300px] overflow-auto rounded-2xl bg-track p-3 text-xs whitespace-pre-wrap">{text}</pre>
        </details>
        <AIPanel state={ai} wanted={wanted} hasLines={rows.length > 0} onUse={turnOnAI} />
      </div>

      <div className="card min-w-0 flex-[3_1_440px] overflow-hidden rounded-[28px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line px-[22px] py-5">
          <h2 className="m-0 font-display text-xl font-normal">{t('foundTitle', { count: rows.filter((r) => r.food).length })}</h2>
          <div className="text-sm text-muted">{t('foundLead')}</div>
        </div>

        {rows.length === 0 && <p className="m-0 p-6 text-[15px] text-muted">{t('nothingFound')}</p>}

        {rows.map((r) => {
          const state = r.days < 0 ? 'expired' : r.days <= SOON_DAYS ? 'soon' : 'fresh';
          return (
            <div key={r.key} className={`flex flex-wrap items-center gap-3.5 border-b-[1.5px] border-track px-[22px] py-3.5 ${r.on ? '' : 'opacity-55'}`}>
              <button
                type="button"
                role="checkbox"
                aria-checked={r.on}
                aria-label={t('include', { name: r.name || r.raw })}
                onClick={() => update(r.key, { on: !r.on })}
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-[9px] border-2 border-line font-extrabold text-[#121212] ${r.on ? 'bg-lime' : ''}`}
              >
                {r.on ? '✓' : ''}
              </button>
              <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1">
                <input
                  value={r.name}
                  onChange={(e) => update(r.key, { name: e.target.value })}
                  aria-label={t('nameLabel')}
                  className="w-full rounded-lg border-2 border-transparent bg-transparent px-1 text-base font-bold outline-none focus:border-line"
                />
                <div className="flex flex-wrap items-center gap-1.5 px-1 font-mono text-[11px] text-muted">
                  <span>{r.raw}</span>
                  {r.price !== null && <span>· {r.price.toFixed(2)} lei</span>}
                  {r.learned && <span className="rounded-full bg-fresh px-1.5 font-sans font-semibold text-[#121212]">{t('learned')}</span>}
                  {!r.learned && r.usedAI && r.ai && (
                    <span
                      className="rounded-full border border-line px-1.5 font-sans font-semibold text-ink"
                      title={t('aiSimilarity', { value: Math.round(r.ai.similarity * 100) })}
                    >
                      {r.ai.confidence === 'high' ? t('aiSure') : t('aiUnsure')}
                    </span>
                  )}
                  {!r.learned && !r.usedAI && r.ai?.confidence === 'low' && (
                    <span className="rounded-full border border-line px-1.5 font-sans font-semibold text-ink" title={t('aiSimilarity', { value: Math.round(r.ai.similarity * 100) })}>
                      {t('aiNoIdea')}
                    </span>
                  )}
                  {!r.learned && r.confidence !== 'high' && r.food && (
                    <span className="rounded-full bg-soon px-1.5 font-sans font-semibold text-[#121212]">{t('check')}</span>
                  )}
                  {!r.food && <span className="rounded-full bg-track px-1.5 font-sans font-semibold text-ink">{t('notFood')}</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={r.category}
                  onChange={(e) => {
                    const category = e.target.value as Category;
                    update(r.key, { category, days: shelfDays(category) });
                  }}
                  aria-label={t('categoryLabel')}
                  className="h-9 rounded-full border-2 border-line bg-card px-2 text-sm font-semibold"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_EMOJI[c]} {ti(`category.${c}`)}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 rounded-full border-2 border-line p-[3px]">
                  <button type="button" aria-label={t('fewerDays')} onClick={() => update(r.key, { days: Math.max(0, r.days - 1) })} className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-track font-bold">
                    −
                  </button>
                  <div className="min-w-[66px] text-center text-sm font-semibold">{t('days', { count: r.days })}</div>
                  <button type="button" aria-label={t('moreDays')} onClick={() => update(r.key, { days: r.days + 1 })} className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-track font-bold">
                    +
                  </button>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full border border-edge ${state === 'soon' ? 'bg-soon' : state === 'expired' ? 'bg-expired' : 'bg-fresh'}`} aria-hidden />
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] py-[18px]">
          <div className="text-[15px] text-muted">{t('selected', { count: selected.length, total: rows.length })}</div>
          <button type="button" onClick={save} disabled={saving || selected.length === 0} className="btn-lime h-[52px] px-6 font-display text-[15px] font-normal">
            {saving ? t('saving') : t('add', { count: selected.length })}
          </button>
        </div>
        {saveError && (
          <p role="alert" className="m-0 mx-[22px] mb-4 rounded-2xl border-2 border-edge bg-expired px-4 py-3 font-semibold text-[#121212]">
            {t('saveError')}
          </p>
        )}
      </div>
    </div>
  );
}

/** What the on-device AI did with this receipt, and the offer to turn it on (one-time download). */
function AIPanel({ state, wanted, hasLines, onUse }: { state: AIState; wanted: boolean; hasLines: boolean; onUse: () => void }) {
  const t = useTranslations('receipt');
  if (state.kind === 'done') return <p className="m-0 rounded-2xl bg-track px-4 py-3 text-sm">{t('aiDone')}</p>;
  if (state.kind === 'failed')
    return (
      <p role="status" className="m-0 rounded-2xl bg-track px-4 py-3 text-sm">
        {t('aiFailed')}
      </p>
    );
  if (wanted || !hasLines) return null;
  return (
    <div className="card flex flex-col gap-2.5 rounded-[22px] p-4">
      <div className="font-display text-base">{t('aiOfferTitle')}</div>
      <p className="m-0 text-sm text-muted">{t('aiOfferLead', { mb: AI_MODEL.downloadMB })}</p>
      <button type="button" onClick={onUse} className="btn-ink h-[42px] min-h-0 text-sm">
        {t('aiUse')}
      </button>
    </div>
  );
}
