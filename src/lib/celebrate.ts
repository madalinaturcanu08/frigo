'use client';

const COLORS = ['var(--lime)', 'var(--fresh)', 'var(--soon)', 'var(--sky1)', '#ff8fa3'];

/** A small burst of pixel confetti from an element — the reward for eating food in time. */
export function celebrate(from: Element) {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = from.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  for (let i = 0; i < 16; i++) {
    const bit = document.createElement('div');
    const size = 5 + Math.round(Math.random() * 4);
    bit.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${COLORS[i % COLORS.length]};border:1.5px solid #121212;pointer-events:none;z-index:60`;
    document.body.appendChild(bit);
    const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
    const distance = 40 + Math.random() * 50;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 30;
    bit
      .animate(
        [
          { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 40}px)) rotate(${Math.random() * 540}deg)`, opacity: 0 },
        ],
        { duration: 750 + Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)' },
      )
      .finished.finally(() => bit.remove());
  }
}
