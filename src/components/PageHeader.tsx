import { getFormatter } from 'next-intl/server';
import { ThemeToggle } from './ThemeToggle';

export async function PageHeader({ kicker, title }: { kicker: string; title: string }) {
  const format = await getFormatter();
  const today = format.dateTime(new Date(), { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="text-[15px] font-medium text-muted">{kicker}</div>
        <h1 className="m-0 font-display text-[clamp(30px,4vw,44px)] leading-none font-normal tracking-[-1px]">{title}</h1>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="rounded-full border-2 border-line bg-card px-3.5 py-[9px] font-display whitespace-nowrap text-[11px] tracking-[1px] uppercase">
          {today.replace(',', ' ·')}
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
