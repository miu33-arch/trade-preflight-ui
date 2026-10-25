// app/icon.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

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
          backgroundColor: '#090a0f',
          border: '1px solid #00ff9d',
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '18px',
            fontWeight: 900,
            color: '#00ff9d',
            letterSpacing: '-1px',
          }}
        >
          //
        </div>
      </div>
    ),
    { ...size }
  );
}