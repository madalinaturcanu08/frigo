'use client';

export function Toast({ message, action }: { message: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div
      role="status"
      className="fixed bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-full bg-ink px-[22px] py-3.5 text-[15px] font-semibold whitespace-nowrap text-bg shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
    >
      <span>{message}</span>
      {action && (
        <button type="button" onClick={action.onClick} className="text-lime underline underline-offset-2">
          {action.label}
        </button>
      )}
    </div>
  );
}
