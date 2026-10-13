import type { Category, Storage, Unit } from './categories';

export type ItemStatus = 'active' | 'eaten' | 'wasted';
export type ItemSource = 'manual' | 'barcode' | 'receipt';

export interface FridgeItem {
  id: string;
  user_id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: Unit;
  storage: Storage;
  price_lei: number | null;
  added_at: string;
  /** ISO date, YYYY-MM-DD */
  expires_at: string;
  expiry_estimated: boolean;
  status: ItemStatus;
  closed_at: string | null;
  source: ItemSource;
}
