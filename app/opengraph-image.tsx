import { ImageResponse } from 'next/og';
import { SERIES } from '@/content/tomorrows';
import { ACID, BrandRow, OG_SIZE, ogFonts, PAPER } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Ctrl AI presents Other Tomorrows: five-minute stories about living with AI';

const NIGHT = '#1b2b22';
const SOFT = '#a8b4a4';
const EDGE = '#4a5f51';

function Key({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', padding: '8px 16px 6px', border: `2px solid ${EDGE}`, borderBottomWidth: 5, borderRadius: 12, fontSize: 28, fontWeight: 600, color: PAPER }}>
      {children}
    </div>
  );
}

export default async function Image() {
  const fonts = await ogFonts();
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: NIGHT, color: PAPER, padding: '48px 68px 50px', fontFamily: 'DM Sans' }}>
      <div style={{ display: 'flex' }}>
        <BrandRow color={PAPER} soft={SOFT} taglineText="PRESENTS" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
        <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 150, lineHeight: 0.9, letterSpacing: -5 }}>{SERIES.title}</div>
        <div style={{ display: 'flex', marginTop: 26, fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 38, lineHeight: 1.22, color: SOFT, maxWidth: 1000 }}>{SERIES.lede}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 24, color: SOFT }}>
          <div style={{ display: 'flex' }}>The future has no undo key. These stories do.</div>
          <Key>ctrl</Key>
          <Key>Z</Key>
        </div>
        <div style={{ display: 'flex', background: ACID, color: NIGHT, fontSize: 22, fontWeight: 600, padding: '15px 26px', borderRadius: 999 }}>ctrlai.com</div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
