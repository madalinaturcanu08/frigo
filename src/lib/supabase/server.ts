import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from './env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — the proxy refreshes the session instead.
          }
        },
      },
    },
  );
}

export interface SessionUser {
  id: string;
  email?: string;
}

/**
 * The signed-in user, read from the login token. The token's signature is checked on our own server
 * (Supabase signs it with an asymmetric key), so this costs no network round trip. `cache` makes every
 * layout, page and action in one request share the same answer.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : undefined };
});

/** Supabase client plus the signed-in user; redirects to /login when there is none. */
export async function requireUser() {
  const [supabase, user] = await Promise.all([createClient(), getSessionUser()]);
  if (!user) redirect('/login');
  return { supabase, user };
}

/** The user's profile row, shared by the layout and pages within one request. */
export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('display_name, language').eq('id', userId).maybeSingle();
  return data;
});
