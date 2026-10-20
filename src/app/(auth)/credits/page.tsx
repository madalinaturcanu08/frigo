import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { PHOTOS } from '@/lib/photos';

export default async function CreditsPage() {
  const t = await getTranslations('credits');
  return (
    <>
      <h1 className="m-0 font-display text-[clamp(30px,4vw,44px)] leading-none font-normal tracking-[-1px]">{t('title')}</h1>
      <p className="m-0 text-[15px] text-muted">{t('lead')}</p>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
        {PHOTOS.map((p) => (
          <li key={p.name} className="card flex flex-col overflow-hidden rounded-[18px]">
            <div className="relative aspect-[4/3] border-b-2 border-line">
              <Image src={p.file} alt="" fill sizes="180px" className="object-cover" />
            </div>
            <div className="flex flex-col gap-0.5 p-2.5 text-xs">
              <a href={p.profile} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                {p.author}
              </a>
              <a href={p.source} target="_blank" rel="noopener noreferrer" className="text-muted underline">
                {t('onUnsplash')}
              </a>
            </div>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[13px] text-muted">
        {t('license')}{' '}
        <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer" className="underline">
          unsplash.com/license
        </a>
      </p>
      <Link href="/" className="self-start text-sm font-semibold underline">
        ← Frigo
      </Link>
    </>
  );
}
