import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LanguagePicker } from '@/components/LanguagePicker';
import { PhotoFrame } from '@/components/PhotoFrame';
import { SkyHero } from '@/components/SkyHero';

export default async function WelcomePage() {
  const t = await getTranslations('welcome');
  const steps = ['step1', 'step2', 'step3'] as const;

  return (
    <>
      <SkyHero className="min-h-[260px]">
        <div className="flex flex-col gap-4 p-7 pb-28">
          <div className="font-pixel text-[96px] leading-[0.82] font-black text-hero-ink">−50%</div>
          <h1 className="m-0 font-display text-[30px] leading-[1.05] font-normal text-hero-ink">{t('title')}</h1>
          <p className="m-0 max-w-[340px] text-[15px] text-hero-ink">{t('lead')}</p>
        </div>
      </SkyHero>

      <PhotoFrame name="decor-welcome" alt={t('photoAlt')} eager className="aspect-[16/9] rounded-[26px] border-2 border-line shadow-card" sizes="(max-width: 560px) 100vw, 520px" />

      <section className="flex flex-col gap-2.5">
        <div className="kicker">{t('language')}</div>
        <LanguagePicker />
      </section>

      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {steps.map((s, i) => (
          <li key={s} className="card flex items-center gap-4 rounded-[22px] p-4">
            <span className="font-pixel text-[34px] leading-none font-black">{i + 1}</span>
            <span className="text-[15px]">{t(s)}</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Link href="/signup" className="btn-lime flex-1">
          {t('start')}
        </Link>
        <Link href="/login" className="btn-ghost flex-1">
          {t('haveAccount')}
        </Link>
      </div>
      <p className="m-0 text-center text-[13px] text-muted">{t('free')}</p>
      <p className="m-0 text-center text-[13px] text-muted">
        <Link href="/credits" className="underline">
          {t('credits')}
        </Link>
      </p>
    </>
  );
}
