'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { setLanguage } from '@/app/actions/settings';
import { LOCALES, LOCALE_NAMES } from '@/i18n/config';

export function LanguagePicker() {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Language / Limba / Язык" aria-busy={pending}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          lang={l}
          onClick={() => startTransition(() => setLanguage(l))}
          className={`pill ${locale === l ? 'is-on' : ''}`}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
