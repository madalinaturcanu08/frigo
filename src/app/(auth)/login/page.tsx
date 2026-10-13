import { getTranslations } from 'next-intl/server';
import { AuthForm } from '@/components/AuthForm';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const t = await getTranslations('auth');
  const { error } = await searchParams;
  return (
    <>
      <h1 className="m-0 font-display text-[clamp(30px,4vw,44px)] leading-none font-normal tracking-[-1px]">{t('loginTitle')}</h1>
      <AuthForm mode="login" initialError={error === 'confirm' ? 'confirmFailed' : undefined} />
    </>
  );
}
