'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const LINKS = [
  { href: '/', key: 'fridge' },
  { href: '/add', key: 'add' },
  { href: '/stats', key: 'stats' },
  { href: '/settings', key: 'settings' },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/' || pathname.startsWith('/items/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Vertical list in the desktop sidebar, scrollable pill row in the mobile top bar. */
export function Nav({ variant, fridgeCount }: { variant: 'side' | 'top'; fridgeCount: number }) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav className={variant === 'side' ? 'flex flex-col gap-1.5' : 'flex gap-1.5 overflow-x-auto'}>
      {LINKS.map(({ href, key }) => {
        const active = isActive(pathname, href);
        const tone = active ? 'border-edge bg-lime text-[#121212]' : 'border-transparent text-ink hover:opacity-85';
        return variant === 'side' ? (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex h-12 items-center gap-3 rounded-full border-2 px-3.5 text-[15px] font-semibold ${tone}`}
          >
            <span className={`h-2 w-2 rounded-full ${active ? 'bg-[#121212]' : 'bg-track'}`} />
            <span className="flex-1">{t(key)}</span>
            {key === 'fridge' && <span className="text-xs opacity-70">{fridgeCount}</span>}
          </Link>
        ) : (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex h-[38px] flex-none items-center rounded-full border-2 px-3.5 text-sm font-semibold ${tone}`}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
