import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

/** The lime "F" logo — used as the favicon and the notification icon. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#e3f46e',
          border: '10px solid #121212',
          borderRadius: 48,
          fontSize: 120,
          fontWeight: 900,
          color: '#121212',
        }}
      >
        F
      </div>
    ),
    size,
  );
}
