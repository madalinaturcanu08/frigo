import { daysBetween } from './dates';

export interface Streak {
  /** whole days since the last thrown-away item (or since the first activity, if nothing was ever thrown away) */
  current: number;
  /** longest gap ever between two thrown-away items, or up to today */
  best: number;
}

/**
 * No-waste streak. `wasted` = when items were thrown away, `since` = the user's first activity.
 * Returns null before the user has any history, so a brand-new account doesn't brag about a 0-day streak.
 */
export function noWasteStreak(wasted: Date[], since: Date | null, today: Date = new Date()): Streak | null {
  if (!since) return null;
  const events = [...wasted].sort((a, b) => a.getTime() - b.getTime());
  let best = 0;
  let previous = since;
  for (const w of events) {
    best = Math.max(best, daysBetween(previous, w));
    previous = w;
  }
  const current = Math.max(0, daysBetween(previous, today));
  return { current, best: Math.max(best, current) };
}
