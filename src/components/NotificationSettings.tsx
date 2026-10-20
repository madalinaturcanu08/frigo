'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { removeSubscription, saveSubscription, sendTestReminder } from '@/app/actions/push';
import { registerServiceWorker } from '@/lib/serviceWorker';

type Status = 'checking' | 'unsupported' | 'denied' | 'off' | 'on';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/** The VAPID public key is base64url; the Push API wants raw bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function supported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_PUBLIC_KEY;
}

async function registration() {
  return (await registerServiceWorker())!;
}

export function NotificationSettings() {
  const t = useTranslations('notifications');
  const [status, setStatus] = useState<Status>('checking');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supported()) {
      Promise.resolve().then(() => setStatus('unsupported'));
      return;
    }
    registration()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (Notification.permission === 'denied') setStatus('denied');
        else setStatus(sub ? 'on' : 'off');
      })
      .catch(() => setStatus('unsupported'));
  }, []);

  async function turnOn() {
    setBusy(true);
    setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await registration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
      const { ok } = await saveSubscription(sub.toJSON());
      if (!ok) {
        await sub.unsubscribe();
        setMessage(t('failed'));
        return;
      }
      setStatus('on');
    } catch {
      setMessage(t('failed'));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMessage('');
    try {
      const sub = await (await registration()).pushManager.getSubscription();
      if (sub) {
        await removeSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus('off');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const { sent } = await sendTestReminder();
      setMessage(t(sent > 0 ? 'testSent' : 'testNone'));
    } finally {
      setBusy(false);
    }
  }

  return (
    // fills the Settings card so the buttons sit at its bottom
    <div className="flex flex-1 flex-col gap-3">
      <p className="m-0 text-[15px] text-muted">{t('lead')}</p>

      {status === 'unsupported' && <p className="m-0 text-[15px]">{t('unsupported')}</p>}
      {status === 'denied' && <p className="m-0 text-[15px]">{t('denied')}</p>}

      {(status === 'on' || status === 'off') && (
        <>
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full border border-edge ${status === 'on' ? 'bg-fresh' : 'bg-track'}`} />
            {t(status)}
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            {status === 'off' ? (
              <button type="button" onClick={turnOn} disabled={busy} className="btn-lime">
                {busy ? t('working') : t('turnOn')}
              </button>
            ) : (
              <>
                <button type="button" onClick={test} disabled={busy} className="btn-lime">
                  {busy ? t('working') : t('test')}
                </button>
                <button type="button" onClick={turnOff} disabled={busy} className="btn-ghost">
                  {t('turnOff')}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {message && (
        <p role="status" className="m-0 text-sm font-semibold">
          {message}
        </p>
      )}
    </div>
  );
}
