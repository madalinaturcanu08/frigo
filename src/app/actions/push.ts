'use server';

import { requireUser } from '@/lib/supabase/server';
import { reminderPayload, sendPush, type PushSubscriptionRow } from '@/lib/push';
import { itemsToUse, todayInChisinau } from '@/lib/reminders';

function isSubscription(value: unknown): value is PushSubscriptionRow {
  const v = value as PushSubscriptionRow;
  return (
    typeof v?.endpoint === 'string' &&
    v.endpoint.startsWith('https://') &&
    typeof v.keys?.p256dh === 'string' &&
    typeof v.keys?.auth === 'string'
  );
}

/** Saves this browser's push subscription for the signed-in user. */
export async function saveSubscription(subscription: unknown): Promise<{ ok: boolean }> {
  if (!isSubscription(subscription)) return { ok: false };
  const { supabase, user } = await requireUser();
  const { endpoint, keys } = subscription;
  // Replace any old row for this browser so it is never stored twice.
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({ user_id: user.id, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
  if (error) console.error('[push] save', error.message);
  return { ok: !error };
}

export async function removeSubscription(endpoint: string) {
  const { supabase } = await requireUser();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

/** Sends today's reminder to all of the user's browsers right now — for testing and demos. */
export async function sendTestReminder(): Promise<{ sent: number }> {
  const { supabase, user } = await requireUser();
  const [{ data: subs }, { data: items }, { data: profile }] = await Promise.all([
    supabase.from('push_subscriptions').select('endpoint, keys'),
    supabase.from('fridge_items').select('name, expires_at').eq('status', 'active'),
    supabase.from('profiles').select('language').eq('id', user.id).maybeSingle(),
  ]);
  if (!subs?.length) return { sent: 0 };

  const payload = reminderPayload(itemsToUse(items ?? [], todayInChisinau()), profile?.language);
  const gone = await sendPush(subs as PushSubscriptionRow[], payload);
  if (gone.length) await supabase.from('push_subscriptions').delete().in('endpoint', gone);
  return { sent: subs.length - gone.length };
}
