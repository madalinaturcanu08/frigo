import { ImageResponse } from 'next/og';
import { FridgeImg } from '@/lib/fridgeImage';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

/** The pixel fridge — used as the browser-tab icon and the notification icon. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FridgeImg height={180} />
      </div>
    ),
    size,
  );
}
