import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';

/**
 * Supabase client with the secret key: bypasses Row Level Security.
 * Only for trusted server jobs (the daily reminder) — never import it from a page a user can drive.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set');
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
