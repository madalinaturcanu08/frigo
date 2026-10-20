import { createClient } from '@supabase/supabase-js';

/** Supabase with the secret key — only for creating and removing the temporary test account. */
export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('E2E tests need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const AUTH_DIR = 'tests/e2e/.auth';
export const USER_FILE = `${AUTH_DIR}/user.json`;
