/** Shared markup for opengraph-image / twitter-image route handlers. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const OG_IMAGE_ALT = 'Ticket95 — Event Ticketing Platform';
export const OG_IMAGE_CONTENT_TYPE = 'image/png';

export function BrandOgMarkup() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px',
        background: 'linear-gradient(145deg, #0a0e1a 0%, #1a2238 55%, #0f172a 100%)',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: 42,
          fontWeight: 700,
          letterSpacing: '-0.03em',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(180deg, #d4b46a, #9a7b2f)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a0e1a',
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          95
        </div>
        <span>
          Ticket<span style={{ color: '#d4b46a' }}>95</span>
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            maxWidth: 920,
          }}
        >
          Discover & buy tickets for unforgettable events
        </div>
        <div style={{ fontSize: 28, color: '#94a3b8', maxWidth: 820 }}>
          Concerts, sports, movies, and live experiences — secure checkout and instant e-tickets.
        </div>
      </div>

      <div style={{ display: 'flex', fontSize: 22, color: '#d4b46a', fontWeight: 600 }}>
        ticket95.com
      </div>
    </div>
  );
}
