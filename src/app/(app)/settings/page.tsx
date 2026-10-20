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

/** One settings card: the same size as its neighbours, with a title and its controls. */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card flex h-full flex-col gap-3 rounded-[26px] p-[22px]">
      <h2 className="m-0 font-display text-[19px] font-normal">{title}</h2>
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
        <Card title={t('language')}>
          <p className="m-0 text-[15px] text-muted">{t('languageLead')}</p>
          <div className="mt-auto">
            <LanguagePicker />
          </div>
        </Card>
        <Card title={t('notifications')}>
          <NotificationSettings />
        </Card>
        <Card title={t('offline')}>
          <OfflineStatus />
        </Card>
        <Card title={t('ai')}>
          <AISettings />
        </Card>
        <Card title={t('account')}>
          <p className="m-0 text-[15px] text-muted">{t('signedInAs', { email: user.email ?? '' })}</p>
          <form action={logout} className="mt-auto">
            <button className="btn-ghost">{t('logout')}</button>
          </form>
        </Card>
        <Card title={t('about')}>
          <p className="m-0 text-[15px] text-muted">{t('aboutLead')}</p>
          <Link href="/credits" className="mt-auto text-sm font-semibold underline">
            {t('credits')}
          </Link>
        </Card>
      </div>
    </>
  );
}
