'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionUser } from '@/lib/supabase/server';
import { LOCALE_COOKIE, isLocale } from '@/i18n/config';

export async function setLanguage(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });

  const user = await getSessionUser();
  if (user) {
    const supabase = await createClient();
    await supabase.from('profiles').update({ language: locale }).eq('id', user.id);
  }

  revalidatePath('/', 'layout');
}
