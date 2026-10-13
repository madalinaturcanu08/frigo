import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col gap-6 p-[clamp(16px,4vw,40px)]">
      <div className="flex items-center justify-between">
        <Logo size="lg" />
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
