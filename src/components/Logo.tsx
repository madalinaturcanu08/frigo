import { FrigoIcon } from './FrigoMascot';

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const icon = size === 'lg' ? 'h-[38px]' : 'h-[32px]';
  const word = size === 'lg' ? 'text-[26px] tracking-[-0.5px]' : 'text-[22px]';
  return (
    <div className="flex items-center gap-2.5">
      <FrigoIcon className={`w-auto ${icon}`} />
      <div className={`font-display ${word}`}>Frigo</div>
    </div>
  );
}
