'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AI_MODEL, bestMatch, lineForAI } from '@/lib/aiMatch';
import { aiDownloaded, embed, loadCatalog } from '@/lib/receiptAI';

interface Result {
  date: string;
  device: string;
  cores: number | null;
  memoryGB: number | null;
  modelWasDownloaded: boolean;
  modelReadyMs: number;
  msPerLineOneByOne: number;
  msPerLineWholeReceipt: number;
  jsHeapMB: number | null;
  lines: number;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Measures how fast the receipt AI runs on THIS device — for the research report (phone vs laptop). */
export function AIBenchmark() {
  const t = useTranslations('benchmark');
  const [state, setState] = useState<'idle' | 'running' | 'error'>('idle');
  const [download, setDownload] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    setState('running');
    setResult(null);
    try {
      const cached = await aiDownloaded();
      const lines: string[] = (await (await fetch('/ai/benchmark-lines.json')).json()).map(lineForAI);
      const { vectors, owners } = await loadCatalog();
      const t0 = performance.now();
      await embed(['lapte'], setDownload); // loads the model (downloads it the first time)
      const modelReadyMs = performance.now() - t0;

      // one line at a time (what the user waits for per line), including finding the closest product
      const t1 = performance.now();
      for (const line of lines) bestMatch((await embed([line]))[0], vectors, owners);
      const single = (performance.now() - t1) / lines.length;
      // a whole receipt at once (how Frigo really does it)
      const t2 = performance.now();
      for (const v of await embed(lines)) bestMatch(v, vectors, owners);
      const batch = (performance.now() - t2) / lines.length;

      const nav = navigator as Navigator & { deviceMemory?: number };
      const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
      setResult({
        date: new Date().toISOString().slice(0, 10),
        device: navigator.userAgent,
        cores: nav.hardwareConcurrency ?? null,
        memoryGB: nav.deviceMemory ?? null,
        modelWasDownloaded: cached,
        modelReadyMs: Math.round(modelReadyMs),
        msPerLineOneByOne: round(single),
        msPerLineWholeReceipt: round(batch),
        jsHeapMB: heap ? Math.round(heap / 1e6) : null,
        lines: lines.length,
      });
      setState('idle');
    } catch {
      setState('error');
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4 rounded-[26px] p-[22px]">
      <p className="m-0 text-[15px] text-muted">{t('lead', { mb: AI_MODEL.downloadMB })}</p>
      <button type="button" onClick={run} disabled={state === 'running'} className="btn-lime self-start">
        {state === 'running' ? (download > 0 && download < 1 ? t('downloading', { pct: Math.round(download * 100) }) : t('running')) : t('start')}
      </button>
      {state === 'error' && (
        <p role="alert" className="m-0 font-semibold">
          {t('error')}
        </p>
      )}
      {result && (
        <>
          <table className="w-full border-collapse text-[15px]">
            <tbody>
              {(
                [
                  [t('modelReady'), `${result.modelReadyMs} ms${result.modelWasDownloaded ? '' : ` (${t('firstDownload')})`}`],
                  [t('perLine'), `${result.msPerLineOneByOne} ms`],
                  [t('perLineBatch'), `${result.msPerLineWholeReceipt} ms`],
                  [t('heap'), result.jsHeapMB === null ? t('notAvailable') : `${result.jsHeapMB} MB`],
                  [t('device'), `${result.cores ?? '?'} ${t('cores')}${result.memoryGB ? ` · ${result.memoryGB} GB` : ''}`],
                ] as const
              ).map(([k, v]) => (
                <tr key={k} className="border-b-[1.5px] border-track">
                  <td className="py-2 pr-3 text-muted">{k}</td>
                  <td className="py-2 font-semibold tabular-nums">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 font-mono text-xs break-all text-muted">{result.device}</p>
          <button type="button" onClick={copy} className="btn-ghost self-start">
            {copied ? t('copied') : t('copy')}
          </button>
        </>
      )}
    </div>
  );
}
