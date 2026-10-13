import type { ReactNode } from 'react';

/** The sky + dotted hills backdrop from the design. */
export function SkyHero({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`sky rounded-[30px] ${className}`}>
      <div className="sky-grid" />
      <div className="cloud top-[26px] right-[12%] h-[70px] w-[240px] blur-[12px]" />
      <div className="cloud top-1.5 right-[22%] h-20 w-[120px] blur-[10px]" />
      <div className="cloud top-[120px] -right-[60px] h-[60px] w-[280px] blur-[14px]" />
      <div className="hill-a -right-20 -bottom-[120px] h-[220px] w-[520px]" />
      <div className="hill-b right-[240px] -bottom-[150px] h-[220px] w-[460px]" />
      <div className="relative">{children}</div>
    </div>
  );
}
