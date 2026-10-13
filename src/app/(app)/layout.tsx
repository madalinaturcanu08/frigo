import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/Logo';
import { Nav } from '@/components/Nav';
import { requireUser } from '@/lib/supabase/server';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const { supabase, user } = await requireUser();
  const t = await getTranslations('nav');

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    supabase.from('fridge_items').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);
  const name = profile?.display_name || user.email?.split('@')[0] || '';

  return (
    <div className="flex min-h-dvh flex-col min-[860px]:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col gap-7 border-r-2 border-line bg-card px-[18px] py-7 min-[860px]:flex">
        <div className="px-2">
          <Logo size="lg" />
        </div>
        <Nav variant="side" fridgeCount={count ?? 0} />
        <div className="mt-auto flex items-center gap-2.5 rounded-[20px] border-2 border-line p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-line bg-[var(--sky2)] font-display text-sm text-[#121212]">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="truncate text-sm font-bold">{name}</div>
            <div className="truncate text-xs text-muted">{t('signedIn')}</div>
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b-2 border-line bg-card px-4 py-3 min-[860px]:hidden">
        <Logo />
        <Nav variant="top" fridgeCount={count ?? 0} />
      </div>

      <main className="min-w-0 flex-1 p-[clamp(18px,3.5vw,40px)]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-[26px]">{children}</div>
      </main>
    </div>
  );
}
