'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { THEMES, THEME_COOKIE, isTheme, type Theme } from '@/lib/theme';

const CHANGE = 'frigo-theme-change';

function read(): Theme {
  const set = document.documentElement.dataset.theme;
  if (isTheme(set)) return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(CHANGE));
}

export function ThemeToggle() {
  const t = useTranslations('common');
  const theme = useSyncExternalStore(subscribe, read, () => null);

  return (
    <div role="radiogroup" aria-label={t('theme')} className="flex gap-0.5 rounded-full border-2 border-line bg-card p-[3px]">
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={theme === option}
          onClick={() => apply(option)}
          className={`flex h-8 items-center rounded-full px-3.5 text-[13px] font-semibold ${
            theme === option ? 'bg-ink text-bg' : 'text-ink'
          }`}
        >
          {t(option)}
        </button>
      ))}
    </div>
  );
}
