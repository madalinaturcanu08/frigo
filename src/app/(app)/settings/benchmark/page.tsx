import { getTranslations } from 'next-intl/server';
import { AIBenchmark } from '@/components/AIBenchmark';
import { PageHeader } from '@/components/PageHeader';
import { requireUser } from '@/lib/supabase/server';

/** Settings → Receipt AI → speed test: measures the on-device AI on this phone or laptop (research data). */
export default async function BenchmarkPage() {
  await requireUser();
  const t = await getTranslations('benchmark');
  return (
    <>
      <PageHeader kicker={t('kicker')} title={t('title')} />
      <AIBenchmark />
    </>
  );
}
