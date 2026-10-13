import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('common');
  return (
    <div className="rounded-[26px] border-2 border-dashed border-line p-10 text-center text-[15px] text-muted">
      {t('notFound')}{' '}
      <Link href="/" className="font-semibold text-ink underline">
        {t('backToFridge')}
      </Link>
    </div>
  );
}
