import { mascotSvg } from './mascot';

/** The pixel fridge as an <img> for generated images (next/og draws SVG files given as data URIs). */
export function FridgeImg({ height }: { height: number }) {
  const src = `data:image/svg+xml;base64,${Buffer.from(mascotSvg('happy')).toString('base64')}`;
  // eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> only
  return <img src={src} width={Math.round((height * 14) / 18)} height={height} alt="" />;
}

/** The sky-and-hills background from the Fridge page hero. */
export function Sky({ children, radius = 0 }: { children: React.ReactNode; radius?: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius,
        background: 'linear-gradient(180deg, #7db8ee 0%, #d6eafb 100%)',
      }}
    >
      <div style={{ position: 'absolute', left: '-20%', bottom: '-38%', width: '90%', height: '70%', borderRadius: '50%', background: '#619d36' }} />
      <div style={{ position: 'absolute', right: '-25%', bottom: '-42%', width: '100%', height: '72%', borderRadius: '50%', background: '#93c454' }} />
      {children}
    </div>
  );
}
