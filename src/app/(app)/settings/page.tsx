import type { ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { logout } from '@/app/actions/auth';
import { AISettings } from '@/components/AISettings';
import { LanguagePicker } from '@/components/LanguagePicker';
import { NotificationSettings } from '@/components/NotificationSettings';
import { OfflineStatus } from '@/components/OfflineStatus';
import { PageHeader } from '@/components/PageHeader';
import { requireUser } from '@/lib/supabase/server';

/** One settings card: the same size as its neighbours, with an icon, a title and its controls. */
function Card({ icon, title, tint, children }: { icon: string; title: string; tint: number; children: ReactNode }) {
  return (
    <section className="card flex h-full flex-col gap-3 rounded-[26px] p-[22px]">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border-2 border-line text-xl"
          style={{ background: `color-mix(in oklch, oklch(0.8 0.14 ${tint}) 45%, var(--card))` }}
        >
          {icon}
        </span>
        <h2 className="m-0 font-display text-[19px] font-normal">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const { user } = await requireUser();
  const t = await getTranslations('settings');

  return (
    <>
      <PageHeader kicker={t('kicker')} title={t('title')} />
      {/* equal cards: 1 per row on phones, 2 on tablets, 3 on computers (6 cards = two full rows) */}
      <div className="grid gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3">
        <Card icon="🌐" title={t('language')} tint={240}>
          <p className="m-0 text-[15px] text-muted">{t('languageLead')}</p>
          <LanguagePicker />
        </Card>
        <Card icon="🔔" title={t('notifications')} tint={80}>
          <NotificationSettings />
        </Card>
        <Card icon="📶" title={t('offline')} tint={145}>
          <OfflineStatus />
        </Card>
        <Card icon="🤖" title={t('ai')} tint={300}>
          <AISettings />
        </Card>
        <Card icon="👤" title={t('account')} tint={30}>
          <p className="m-0 text-[15px] text-muted">{t('signedInAs', { email: user.email ?? '' })}</p>
          <form action={logout} className="mt-auto">
            <button className="btn-ghost">{t('logout')}</button>
          </form>
        </Card>
        <Card icon="🧊" title={t('about')} tint={200}>
          <p className="m-0 text-[15px] text-muted">{t('aboutLead')}</p>
          <Link href="/credits" className="mt-auto text-sm font-semibold underline">
            {t('credits')}
          </Link>
        </Card>
      </div>
    </>
  );
}
