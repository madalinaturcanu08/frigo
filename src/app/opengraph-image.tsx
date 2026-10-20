import { ImageResponse } from 'next/og';
import { FridgeImg, Sky } from '@/lib/fridgeImage';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Frigo — a free food-waste coach for your family fridge';

/** The app's display font (Archivo Black), fetched from Google Fonts while the banner is made. */
async function archivoBlack(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Archivo+Black&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null; // no internet while building: the default font is used
  }
}

const TITLE = 'Frigo';
const LINE = 'Use your food before it goes bad.';
const PILL = 'Free · RO · RU · EN';

/** The banner shown when a Frigo link is shared (WhatsApp, Telegram, Messenger…). */
export default async function OpenGraphImage() {
  const font = await archivoBlack(TITLE + LINE + PILL);
  return new ImageResponse(
    (
      <Sky>
        <div style={{ display: 'flex', alignItems: 'center', gap: 70, fontFamily: font ? 'Archivo Black' : undefined, padding: '0 90px', width: '100%' }}>
          <FridgeImg height={430} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, color: '#121212' }}>
            <div style={{ fontSize: 140, letterSpacing: -3, lineHeight: 1 }}>{TITLE}</div>
            <div style={{ fontSize: 42, maxWidth: 560, lineHeight: 1.2 }}>
              {LINE}
            </div>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                marginTop: 12,
                padding: '12px 26px',
                borderRadius: 999,
                border: '5px solid #121212',
                background: '#e3f46e',
                fontSize: 30,
              }}
            >
              {PILL}
            </div>
          </div>
        </div>
      </Sky>
    ),
    { ...size, fonts: font ? [{ name: 'Archivo Black', data: font, weight: 400, style: 'normal' }] : undefined },
  );
}
