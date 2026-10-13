'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { login, signup, type AuthState } from '@/app/actions/auth';

export function AuthForm({ mode, initialError }: { mode: 'login' | 'signup'; initialError?: string }) {
  const t = useTranslations('auth');
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === 'login' ? login : signup,
    initialError ? { error: initialError } : undefined,
  );

  if (state?.info) {
    return (
      <div className="card flex flex-col gap-3 rounded-[28px] p-7">
        <h2 className="m-0 font-display text-2xl font-normal">{t('checkEmailTitle')}</h2>
        <p className="m-0 text-[15px] text-muted">{t('checkEmail')}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card flex flex-col gap-5 rounded-[28px] p-[clamp(18px,3vw,30px)]">
      {mode === 'signup' && (
        <label className="flex flex-col gap-2">
          <span className="kicker">{t('name')}</span>
          <input name="display_name" autoComplete="given-name" className="field" maxLength={40} />
        </label>
      )}
      <label className="flex flex-col gap-2">
        <span className="kicker">{t('email')}</span>
        <input name="email" type="email" autoComplete="email" required className="field" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="kicker">{t('password')}</span>
        <input
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={mode === 'signup' ? 8 : undefined}
          required
          className="field"
        />
        {mode === 'signup' && <span className="text-[13px] text-muted">{t('passwordHint')}</span>}
      </label>

      {state?.error && (
        <p role="alert" className="m-0 rounded-2xl border-2 border-edge bg-expired px-4 py-3 font-semibold text-[#121212]">
          {t(`errors.${state.error}`)}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-ink">
        {pending ? t('wait') : t(mode === 'login' ? 'loginButton' : 'signupButton')}
      </button>
      <p className="m-0 text-center text-sm text-muted">
        {mode === 'login' ? t('noAccount') : t('haveAccount')}{' '}
        <Link href={mode === 'login' ? '/signup' : '/login'} className="font-semibold text-ink underline">
          {mode === 'login' ? t('toSignup') : t('toLogin')}
        </Link>
      </p>
    </form>
  );
}
