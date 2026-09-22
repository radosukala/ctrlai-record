import { ImageResponse } from 'next/og';
import { BrandRow, INK, LINE, MUTED, OG_SIZE, ogFonts, PAPER } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Ctrl AI: the labs test AI behind closed doors. Test it in the open.';

export default async function Image() {
  const fonts = await ogFonts();
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, padding: '48px 64px 44px', fontFamily: 'DM Sans', color: INK }}>
      <BrandRow />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
        <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 86, lineHeight: 1.0, letterSpacing: -2.2 }}>The labs test AI behind closed doors.</div>
        <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 86, lineHeight: 1.08, letterSpacing: -2.2, color: '#597247' }}>Test it in the open.</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${LINE}`, paddingTop: 22 }}>
        <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>One-minute tests · receipts · checked by strangers · open data</div>
        <div style={{ display: 'flex', fontSize: 24, fontWeight: 600 }}>ctrlai.com</div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
