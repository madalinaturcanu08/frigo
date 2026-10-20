/**
 * Frigo, the little pixel fridge. Its face follows what's in your fridge:
 * happy = all fresh · worried = something to use soon · sad = something expired · sleepy = empty fridge.
 * Drawn on a 18×18 pixel grid so it matches the pixel numbers (Doto) used across the app.
 */
export type MascotMood = 'happy' | 'worried' | 'sad' | 'sleepy';

const EDGE = '#121212';
const TEAR = '#7db8ee';
const CHEEK = '#ff8fa3';

/** [x, y, width, height] */
type Px = [number, number, number, number];

const MOUTH: Record<MascotMood, Px[]> = {
  happy: [[4, 12, 1, 1], [5, 13, 4, 1], [9, 12, 1, 1]],
  worried: [[4, 13, 2, 1], [6, 12, 2, 1], [8, 13, 2, 1]],
  sad: [[4, 13, 1, 1], [5, 12, 4, 1], [9, 13, 1, 1]],
  sleepy: [[6, 13, 2, 1]],
};

export function moodFor(counts: { all: number; soon: number; expired: number }): MascotMood {
  if (counts.all === 0) return 'sleepy';
  if (counts.expired > 0) return 'sad';
  if (counts.soon > 0) return 'worried';
  return 'happy';
}

export function FrigoMascot({ mood, className = '' }: { mood: MascotMood; className?: string }) {
  const rects = (list: Px[], fill: string) =>
    list.map(([x, y, w, h], i) => <rect key={`${fill}${i}`} x={x} y={y} width={w} height={h} fill={fill} />);

  return (
    <svg viewBox="0 0 18 18" shapeRendering="crispEdges" aria-hidden className={`mascot ${className}`}>
      <g className="mascot-body">
        {/* body with pixel-rounded corners */}
        <rect x={1} y={1} width={12} height={15} fill="var(--lime)" />
        {rects([[1, 0, 12, 1], [0, 1, 1, 15], [13, 1, 1, 15], [1, 16, 12, 1]], EDGE)}
        {/* freezer door, handles, feet */}
        {rects([[1, 6, 12, 1], [11, 2, 1, 3], [11, 8, 1, 4], [2, 17, 2, 1], [10, 17, 2, 1]], EDGE)}
        {/* shine */}
        {rects([[2, 2, 1, 2], [2, 8, 1, 1]], 'rgba(255,255,255,0.7)')}
        {/* eyes: open, or closed lines when sleepy */}
        <g className={mood === 'sleepy' ? '' : 'mascot-eyes'}>
          {mood === 'sleepy' ? rects([[4, 10, 2, 1], [8, 10, 2, 1]], EDGE) : rects([[4, 9, 2, 2], [8, 9, 2, 2]], EDGE)}
        </g>
        {rects(MOUTH[mood], EDGE)}
        {mood === 'happy' && rects([[3, 11, 1, 1], [10, 11, 1, 1]], CHEEK)}
        {mood === 'worried' && rects([[2, 8, 1, 2]], TEAR)}
        {mood === 'sad' && rects([[3, 11, 1, 2]], TEAR)}
      </g>
      {mood === 'sleepy' && (
        <g className="mascot-z">{rects([[14, 0, 3, 1], [16, 1, 1, 1], [15, 2, 1, 1], [14, 3, 3, 1]], 'var(--hero-ink)')}</g>
      )}
    </svg>
  );
}
