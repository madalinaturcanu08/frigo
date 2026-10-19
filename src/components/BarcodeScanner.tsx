'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { isValidGtin } from '@/lib/barcode';

type CameraState = 'starting' | 'scanning' | 'denied' | 'nocamera' | 'error';

/**
 * Full-screen camera view that reads one barcode, then calls onDetected.
 * ZXing is loaded only when the scanner opens, so it doesn't slow down the rest of the app.
 * A typed-in number works too, for laptops without a camera or a barcode that won't scan.
 */
export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const t = useTranslations('barcode');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<CameraState>('starting');
  const [attempt, setAttempt] = useState(0);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [canFlip, setCanFlip] = useState(false);
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState(false);
  const detected = useRef(onDetected);
  const backdropPress = useRef(false);

  useEffect(() => {
    detected.current = onDetected;
  });

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        // React (in development) mounts this twice; the first copy must never open the camera, because
        // ZXing's stop() also clears the shared <video>, which would blank the second copy's picture.
        if (cancelled) return;
        const hints = new Map([
          [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: facing } } },
          videoRef.current!,
          (result, _err, ctrl) => {
            const code = result?.getText();
            // Only accept codes with a correct check digit — a blurry frame can misread a digit.
            if (code && isValidGtin(code)) {
              ctrl.stop();
              navigator.vibrate?.(60);
              detected.current(code);
            }
          },
        );
        if (cancelled) controls.stop();
        else {
          stop = () => controls.stop();
          setCamera('scanning');
          // Device names are only listed after camera permission, so check for a second camera now.
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (!cancelled) setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1);
        }
      } catch (err) {
        if (cancelled) return;
        const name = (err as Error).name;
        setCamera(name === 'NotAllowedError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocamera' : 'error');
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [attempt, facing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submitTyped(e: React.FormEvent) {
    e.preventDefault();
    const code = typed.replace(/\s/g, '');
    if (isValidGtin(code)) onDetected(code);
    else setTypedError(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      // A tap on the dark area around the box closes the scanner (only when the tap starts there,
      // so selecting text in the box and releasing outside doesn't close it).
      onPointerDown={(e) => {
        backdropPress.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (backdropPress.current && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="card flex w-full max-w-[460px] flex-col gap-4 rounded-[28px] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 font-display text-xl font-normal">{t('title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('close')} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-line text-lg font-bold">
            ✕
          </button>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border-2 border-line bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
          />
          {camera === 'scanning' && canFlip && (
            <button
              type="button"
              onClick={() => {
                setCamera('starting');
                setFacing((f) => (f === 'environment' ? 'user' : 'environment'));
              }}
              aria-label={t('flip')}
              className="absolute right-3 bottom-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-edge bg-lime text-[#121212] shadow-card"
            >
              <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7h3l2-3h8l2 3h3v12H3z" />
                <path d="M9 12.5a3 3 0 0 1 5.2-2" />
                <path d="M15 13.5a3 3 0 0 1-5.2 2" />
                <path d="M14.5 8.5v2h-2M9.5 17.5v-2h2" />
              </svg>
            </button>
          )}
          {camera === 'scanning' && (
            <div aria-hidden className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[38%] -translate-y-1/2 rounded-2xl border-[3px] border-lime shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
          )}
          {camera !== 'scanning' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-[15px] font-semibold text-white">
              {t(`camera.${camera}`)}
              {camera !== 'starting' && (
                <button
                  type="button"
                  onClick={() => {
                    setCamera('starting');
                    setAttempt((a) => a + 1);
                  }}
                  className="btn-lime"
                >
                  {t('retry')}
                </button>
              )}
            </div>
          )}
        </div>
        {camera === 'scanning' && <p className="m-0 text-center text-sm text-muted">{t('hint')}</p>}

        <form onSubmit={submitTyped} className="flex flex-col gap-2">
          <label htmlFor="barcode-typed" className="kicker">
            {t('typeLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id="barcode-typed"
              inputMode="numeric"
              autoComplete="off"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value.replace(/[^\d\s]/g, '').slice(0, 18));
                setTypedError(false);
              }}
              placeholder="4840000000000"
              className="field h-12 min-w-0 flex-1 font-mono text-base"
            />
            <button type="submit" disabled={typed.trim().length < 8} className="btn-lime">
              {t('find')}
            </button>
          </div>
          {typedError && (
            <p role="alert" className="m-0 rounded-2xl border-2 border-edge bg-expired px-3 py-2 text-sm font-semibold text-[#121212]">
              {t('invalid')}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
