import 'server-only';
import webpush from 'web-push';
import { createTranslator } from 'next-intl';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/config';
import { nameList, type ReminderItem } from './reminders';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import ru from '../../messages/ru.json';

const MESSAGES = { en, ro, ru } as const;

export interface PushSubscriptionRow {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:frigo@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/** The daily reminder text, in the user's language. `items` must already be filtered and sorted. */
export function reminderPayload(items: ReminderItem[], language: string | null | undefined): PushPayload {
  const locale: Locale = isLocale(language) ? language : DEFAULT_LOCALE;
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: 'reminders' });
  if (items.length === 0) return { title: t('nothingTitle'), body: t('nothingBody'), url: '/' };
  const { names, rest } = nameList(items);
  return {
    title: t('title', { count: items.length }),
    body: rest > 0 ? t('bodyMore', { names, count: rest }) : names,
    url: '/',
  };
}

/** Sends to every subscription; returns the endpoints the push service says no longer exist. */
export async function sendPush(subscriptions: PushSubscriptionRow[], payload: PushPayload): Promise<string[]> {
  configure();
  const gone: string[] = [];
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(sub.endpoint);
        else console.error('[push]', status, (err as Error).message);
      }
    }),
  );
  return gone;
}
