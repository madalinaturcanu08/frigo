import { mascotPixels, type MascotMood, type Pixel } from '@/lib/mascot';

/**
 * Frigo, the little pixel fridge. Its face follows what's in your fridge:
 * happy = all fresh · worried = something to use soon · sad = something expired · sleepy = empty fridge.
 */
export type { MascotMood };

export function moodFor(counts: { all: number; soon: number; expired: number }): MascotMood {
  if (counts.all === 0) return 'sleepy';
  if (counts.expired > 0) return 'sad';
  if (counts.soon > 0) return 'worried';
  return 'happy';
}

const rects = (list: Pixel[]) =>
  list.map((p, i) => <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.fill} />);

export function FrigoMascot({ mood, className = '' }: { mood: MascotMood; className?: string }) {
  const pixels = mascotPixels(mood);
  return (
    <svg viewBox="0 0 18 18" shapeRendering="crispEdges" aria-hidden className={`mascot ${className}`}>
      <g className="mascot-body">
        {rects(pixels.filter((p) => !p.part))}
        <g className="mascot-eyes">{rects(pixels.filter((p) => p.part === 'eyes'))}</g>
      </g>
      <g className="mascot-z">{rects(pixels.filter((p) => p.part === 'z'))}</g>
    </svg>
  );
}

/** The fridge alone, without animation, for the logo. */
export function FrigoIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 18" shapeRendering="crispEdges" aria-hidden className={className}>
      {rects(mascotPixels('happy').filter((p) => p.part !== 'z'))}
    </svg>
  );
}
