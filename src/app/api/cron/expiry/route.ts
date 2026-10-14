import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { reminderPayload, sendPush, type PushSubscriptionRow } from '@/lib/push';
import { itemsToUse, todayInChisinau } from '@/lib/reminders';
import { SOON_DAYS } from '@/lib/expiry';
import { addDays, toISODate } from '@/lib/dates';

/**
 * Daily expiry reminder, run by Vercel Cron (see vercel.json).
 * Vercel sends "Authorization: Bearer <CRON_SECRET>"; anything else is rejected.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = todayInChisinau();

  const { data: subs, error } = await supabase.from('push_subscriptions').select('user_id, endpoint, keys');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  if (userIds.length === 0) return NextResponse.json({ users: 0, notified: 0, removed: 0 });

  const [{ data: items }, { data: profiles }] = await Promise.all([
    supabase
      .from('fridge_items')
      .select('user_id, name, expires_at')
      .eq('status', 'active')
      .in('user_id', userIds)
      .lte('expires_at', toISODate(addDays(today, SOON_DAYS))),
    supabase.from('profiles').select('id, language').in('id', userIds),
  ]);

  let notified = 0;
  const gone: string[] = [];
  for (const userId of userIds) {
    const due = itemsToUse((items ?? []).filter((i) => i.user_id === userId), today);
    if (due.length === 0) continue; // nothing to say today — don't send an empty reminder
    const language = profiles?.find((p) => p.id === userId)?.language;
    const userSubs = (subs ?? []).filter((s) => s.user_id === userId) as PushSubscriptionRow[];
    const removed = await sendPush(userSubs, reminderPayload(due, language));
    gone.push(...removed);
    if (removed.length < userSubs.length) notified += 1;
  }
  if (gone.length) await supabase.from('push_subscriptions').delete().in('endpoint', gone);

  return NextResponse.json({ users: userIds.length, notified, removed: gone.length });
}
