import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { logout } from '@/app/actions/auth';
import { AISettings } from '@/components/AISettings';
import { LanguagePicker } from '@/components/LanguagePicker';
import { NotificationSettings } from '@/components/NotificationSettings';
import { OfflineStatus } from '@/components/OfflineStatus';
import { PageHeader } from '@/components/PageHeader';
import { requireUser } from '@/lib/supabase/server';

export default async function SettingsPage() {
  const { user } = await requireUser();
  const t = await getTranslations('settings');

  return (
    <>
      <PageHeader kicker={t('kicker')} title={t('title')} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-4">
        <section className="card flex flex-col gap-3 rounded-[26px] p-[22px]">
          <h2 className="m-0 font-display text-[19px] font-normal">{t('language')}</h2>
          <LanguagePicker />
        </section>
        <section className="card flex flex-col gap-3 rounded-[26px] p-[22px]">
          <h2 className="m-0 font-display text-[19px] font-normal">{t('notifications')}</h2>
          <NotificationSettings />
        </section>
        <section className="card flex flex-col gap-3 rounded-[26px] p-[22px]">
          <h2 className="m-0 font-display text-[19px] font-normal">{t('offline')}</h2>
          <OfflineStatus />
        </section>
        <section className="card flex flex-col gap-3 rounded-[26px] p-[22px]">
          <h2 className="m-0 font-display text-[19px] font-normal">{t('ai')}</h2>
          <AISettings />
        </section>
        <section className="card flex flex-col gap-3 rounded-[26px] p-[22px]">
          <h2 className="m-0 font-display text-[19px] font-normal">{t('account')}</h2>
          <p className="m-0 text-[15px] text-muted">{t('signedInAs', { email: user.email ?? '' })}</p>
          <Link href="/credits" className="text-sm font-semibold underline">
            {t('credits')}
          </Link>
          <form action={logout}>
            <button className="btn-ghost">{t('logout')}</button>
          </form>
        </section>
      </div>
    </>
  );
}
