/**
 * Changes made while offline, kept on the device until the server can be reached again.
 * Pure helpers + a thin localStorage layer (the queue is per device, and small).
 */

export type OfflineOp =
  | { kind: 'close'; opId: string; itemId: string; outcome: 'eaten' | 'wasted'; at: string }
  | {
      kind: 'add';
      opId: string;
      at: string;
      item: {
        name: string;
        category: string;
        quantity: number;
        unit: string;
        storage: string;
        price_lei: number | null;
        /** YYYY-MM-DD the user picked, or null to estimate on the server */
        expires_at: string | null;
        barcode?: string;
      };
    };

export const QUEUE_KEY = 'frigo_offline_queue_v1';
export const QUEUE_EVENT = 'frigo-offline-queue';
/** Older changes are dropped instead of synced — a week-old "Used it" is more likely a mistake than news. */
export const MAX_AGE_DAYS = 14;

export function newOpId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Adds an op; closing the same item twice keeps only the latest outcome. */
export function enqueue(queue: OfflineOp[], op: OfflineOp): OfflineOp[] {
  if (op.kind === 'close') {
    return [...queue.filter((q) => !(q.kind === 'close' && q.itemId === op.itemId)), op];
  }
  return [...queue, op];
}

/** Item ids the user has already closed offline — hidden from the fridge list until synced. */
export function closedIds(queue: OfflineOp[]): Set<string> {
  return new Set(queue.flatMap((q) => (q.kind === 'close' ? [q.itemId] : [])));
}

/** Ops the server should accept: well-formed, not in the future, not too old. */
export function validOps(queue: unknown, now: Date = new Date()): OfflineOp[] {
  if (!Array.isArray(queue)) return [];
  const oldest = now.getTime() - MAX_AGE_DAYS * 86_400_000;
  return queue.filter((q): q is OfflineOp => {
    if (!q || typeof q !== 'object' || typeof q.opId !== 'string' || typeof q.at !== 'string') return false;
    const t = Date.parse(q.at);
    if (!Number.isFinite(t) || t > now.getTime() + 5 * 60_000 || t < oldest) return false;
    if (q.kind === 'close') return typeof q.itemId === 'string' && (q.outcome === 'eaten' || q.outcome === 'wasted');
    if (q.kind === 'add') return !!q.item && typeof q.item.name === 'string' && q.item.name.trim().length > 0;
    return false;
  });
}

// ── device storage ───────────────────────────────────────────────────────────

export function readQueue(): OfflineOp[] {
  try {
    return validOps(JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function writeQueue(queue: OfflineOp[]) {
  try {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    // storage full or blocked: the change is lost, but the app keeps working
  }
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function pushOp(op: OfflineOp) {
  writeQueue(enqueue(readQueue(), op));
}
