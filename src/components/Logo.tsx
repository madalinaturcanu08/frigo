export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-[34px] w-[34px] rounded-[11px] text-[17px]' : 'h-[30px] w-[30px] rounded-[10px] text-[15px]';
  const word = size === 'lg' ? 'text-[26px] tracking-[-0.5px]' : 'text-[22px]';
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex items-center justify-center border-2 border-edge bg-lime font-display text-[#121212] ${box}`}>F</div>
      <div className={`font-display ${word}`}>Frigo</div>
    </div>
  );
}
