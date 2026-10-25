// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TRADE_PREFLIGHT_OS // Zero-Trust Compliance Gateway';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#090a0f',
          padding: '60px',
          border: '8px solid #131722',
          fontFamily: 'monospace',
        }}
      >
        {/* Top Header Telemetry */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: '#00ff9d',
              }}
            />
            <span style={{ color: '#00ff9d', fontSize: '20px', fontWeight: 800, letterSpacing: '2px' }}>
              TRADE_PREFLIGHT_OS // CORE_NODE :4000
            </span>
          </div>
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#131722',
              border: '1px solid #2d3748',
              borderRadius: '6px',
              color: '#38bdf8',
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            AIR-GAPPED // ZERO-TRUST
          </div>
        </div>

        {/* Center Main Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: '54px',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '-1px',
            }}
          >
            KSA PROJECT CARGO &amp; STANDARDS GATEWAY
          </div>
          <div style={{ fontSize: '24px', color: '#94a3b8', lineHeight: 1.4 }}>
            Universal Mill Manifest Parity &bull; MTC Metallurgy &bull; SASO 2831 &bull; ZATCA Phase-2 QR
          </div>
        </div>

        {/* Bottom Metadata Badges */}
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { label: 'METALLURGY', val: 'ASTM / SASO PARITY', color: '#00ff9d' },
            { label: 'E-INVOICING', val: 'ZATCA UBL-2.1 TLV', color: '#38bdf8' },
            { label: 'CUSTOMS', val: 'FASAH BAYAN (DAMMAM)', color: '#fbbf24' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#131722',
                border: '1px solid #2d3748',
                padding: '12px 20px',
                borderRadius: '6px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>{item.label}</span>
              <span style={{ fontSize: '18px', color: item.color, fontWeight: 800, marginTop: '4px' }}>
                {item.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}