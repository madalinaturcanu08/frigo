'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error?: string; info?: string } | undefined;

function credentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  };
}

/** Supabase Auth error codes we can explain to the user; anything else shows the generic message. */
const SIGNUP_ERRORS: Record<string, string> = {
  user_already_exists: 'emailTaken',
  email_exists: 'emailTaken',
  over_email_send_rate_limit: 'emailRateLimit',
  email_address_invalid: 'emailInvalid',
  weak_password: 'passwordTooShort',
  unexpected_failure: 'databaseError',
};

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = credentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('[login]', error.code, error.status, error.message);
    return { error: error.code === 'email_not_confirmed' ? 'emailNotConfirmed' : 'invalidLogin' };
  }
  redirect('/');
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = credentials(formData);
  const displayName = String(formData.get('display_name') ?? '').trim();
  if (password.length < 8) return { error: 'passwordTooShort' };

  const supabase = await createClient();
  const origin = (await headers()).get('origin') ?? '';
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { display_name: displayName || undefined, language: await getLocale() },
    },
  });
  if (error) {
    console.error('[signup]', error.code, error.status, error.message);
    return { error: SIGNUP_ERRORS[error.code ?? ''] ?? 'signupFailed' };
  }
  // With "Confirm email" on (Supabase default) there is no session until the link is clicked.
  if (!data.session) return { info: 'checkEmail' };
  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/welcome');
}
