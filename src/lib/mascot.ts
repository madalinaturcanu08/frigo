/**
 * Frigo, the little pixel fridge, drawn on an 18×18 grid so it matches the pixel numbers (Doto) used across the app.
 * Shared by the mascot on the Fridge page, the logo, and the generated icons (favicon, iPhone home screen, banner).
 */
export type MascotMood = 'happy' | 'worried' | 'sad' | 'sleepy';

export const EDGE = '#121212';
const TEAR = '#7db8ee';
const CHEEK = '#ff8fa3';
const SHINE = 'rgba(255,255,255,0.7)';

/** One pixel block. `part` lets the page animate the eyes (blink) and the "z" (sleepy). */
export interface Pixel {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  part?: 'eyes' | 'z';
}

type Px = [number, number, number, number];
const px = (list: Px[], fill: string, part?: Pixel['part']): Pixel[] => list.map(([x, y, w, h]) => ({ x, y, w, h, fill, part }));

const MOUTH: Record<MascotMood, Px[]> = {
  happy: [[4, 12, 1, 1], [5, 13, 4, 1], [9, 12, 1, 1]],
  worried: [[4, 13, 2, 1], [6, 12, 2, 1], [8, 13, 2, 1]],
  sad: [[4, 13, 1, 1], [5, 12, 4, 1], [9, 13, 1, 1]],
  sleepy: [[6, 13, 2, 1]],
};

/** `body` is the fridge colour: the theme's lime on the page, a fixed colour in generated images. */
export function mascotPixels(mood: MascotMood, body = 'var(--lime)', zColor = 'var(--hero-ink)'): Pixel[] {
  return [
    // body with pixel-rounded corners
    ...px([[1, 1, 12, 15]], body),
    ...px([[1, 0, 12, 1], [0, 1, 1, 15], [13, 1, 1, 15], [1, 16, 12, 1]], EDGE),
    // freezer door, handles, feet
    ...px([[1, 6, 12, 1], [11, 2, 1, 3], [11, 8, 1, 4], [2, 17, 2, 1], [10, 17, 2, 1]], EDGE),
    ...px([[2, 2, 1, 2], [2, 8, 1, 1]], SHINE),
    // eyes: open, or closed lines when sleepy
    ...(mood === 'sleepy' ? px([[4, 10, 2, 1], [8, 10, 2, 1]], EDGE) : px([[4, 9, 2, 2], [8, 9, 2, 2]], EDGE, 'eyes')),
    ...px(MOUTH[mood], EDGE),
    ...(mood === 'happy' ? px([[3, 11, 1, 1], [10, 11, 1, 1]], CHEEK) : []),
    ...(mood === 'worried' ? px([[2, 8, 1, 2]], TEAR) : []),
    ...(mood === 'sad' ? px([[3, 11, 1, 2]], TEAR) : []),
    ...(mood === 'sleepy' ? px([[14, 0, 3, 1], [16, 1, 1, 1], [15, 2, 1, 1], [14, 3, 3, 1]], zColor, 'z') : []),
  ];
}

/** The fridge as an SVG file (for generated images, which can't use the page's CSS). */
export function mascotSvg(mood: MascotMood = 'happy', body = '#e3f46e'): string {
  const rects = mascotPixels(mood, body, EDGE)
    .map((p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.fill}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 18" shape-rendering="crispEdges">${rects}</svg>`;
}

