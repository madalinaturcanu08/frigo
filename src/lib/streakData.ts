import 'server-only';
import { cache } from 'react';
import { createClient } from './supabase/server';
import { noWasteStreak } from './streak';
import { todayInChisinau } from './reminders';

/** The signed-in user's no-waste streak, loaded once per request (menu + Stats page share it). */
export const getStreak = cache(async () => {
  const supabase = await createClient();
  const [{ data: wasted }, { data: first }] = await Promise.all([
    supabase.from('fridge_items').select('closed_at').eq('status', 'wasted').not('closed_at', 'is', null),
    supabase.from('fridge_items').select('added_at').order('added_at', { ascending: true }).limit(1),
  ]);
  const since = first?.[0]?.added_at ? new Date(first[0].added_at) : null;
  return noWasteStreak(
    (wasted ?? []).map((w) => new Date(w.closed_at as string)),
    since,
    todayInChisinau(),
  );
});
