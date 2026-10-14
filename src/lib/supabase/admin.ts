import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client with the secret key: bypasses Row Level Security.
 * Only for trusted server jobs (the daily reminder) — never import it from a page a user can drive.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
