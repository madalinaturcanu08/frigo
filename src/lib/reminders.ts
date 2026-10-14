import { SOON_DAYS, daysLeft, sortByExpiry } from './expiry';

export interface ReminderItem {
  name: string;
  expires_at: string;
}

/** Items that need attention: already expired or expiring within SOON_DAYS, soonest first. */
export function itemsToUse<T extends ReminderItem>(items: T[], today: Date = new Date()): T[] {
  return sortByExpiry(items.filter((i) => daysLeft(i.expires_at, today) <= SOON_DAYS));
}

/** "Lapte, Telemea, Ouă" — at most `max` names; the caller adds "+N more" from `rest`. */
export function nameList(items: ReminderItem[], max = 3): { names: string; rest: number } {
  return {
    names: items
      .slice(0, max)
      .map((i) => i.name)
      .join(', '),
    rest: Math.max(0, items.length - max),
  };
}

/** Today's calendar date in Moldova, whatever time zone the server runs in. */
export function todayInChisinau(now: Date = new Date()): Date {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Chisinau' }).format(now).split('-').map(Number);
  return new Date(y, m - 1, d);
}
