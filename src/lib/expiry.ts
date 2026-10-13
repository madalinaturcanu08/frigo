import { addDays, daysBetween, parseISODate, toISODate } from './dates';

export type ExpiryState = 'fresh' | 'soon' | 'expired';

/** Items expiring within this many days (today included) are "use soon". */
export const SOON_DAYS = 2;

export function daysLeft(expiresAt: string, today: Date = new Date()): number {
  return daysBetween(today, parseISODate(expiresAt));
}

export function expiryState(expiresAt: string, today: Date = new Date()): ExpiryState {
  const left = daysLeft(expiresAt, today);
  if (left < 0) return 'expired';
  if (left <= SOON_DAYS) return 'soon';
  return 'fresh';
}

/** Expiry date estimated from shelf-life days, counted from the day the item was added. */
export function estimateExpiry(shelfDays: number, addedOn: Date = new Date()): string {
  return toISODate(addDays(addedOn, shelfDays));
}

/** Soonest-expiring first; ties broken by name so the list is stable. */
export function sortByExpiry<T extends { expires_at: string; name: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => a.expires_at.localeCompare(b.expires_at) || a.name.localeCompare(b.name),
  );
}
