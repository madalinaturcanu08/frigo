import { ImageResponse } from 'next/og';
import { FridgeImg, Sky } from '@/lib/fridgeImage';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iPhone home-screen icon (Share → Add to Home Screen): the pixel fridge standing on the hills. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <Sky>
        <div style={{ display: 'flex', marginTop: 10 }}>
          <FridgeImg height={126} />
        </div>
      </Sky>
    ),
    size,
  );
}
