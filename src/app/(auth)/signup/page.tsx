import { getTranslations } from 'next-intl/server';
import { AuthForm } from '@/components/AuthForm';

export default async function SignupPage() {
  const t = await getTranslations('auth');
  return (
    <>
      <h1 className="m-0 font-display text-[clamp(30px,4vw,44px)] leading-none font-normal tracking-[-1px]">{t('signupTitle')}</h1>
      <AuthForm mode="signup" />
    </>
  );
}
