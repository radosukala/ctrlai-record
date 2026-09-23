import { ImageResponse } from 'next/og';
import { getEpisode, SERIES } from '@/content/tomorrows';
import { ACID, BrandRow, OG_SIZE, ogFonts, PAPER } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Other Tomorrows: a five-minute interactive fiction about living with AI';

const NIGHT = '#1b2b22';
const SOFT = '#a8b4a4';

export default async function Image({ params }: { params: Promise<{ episode: string }> }) {
  const { episode: slug } = await params;
  const fonts = await ogFonts();
  const episode = getEpisode(slug);
  if (!episode) return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: NIGHT }} />, { ...size, fonts });
  const hookSize = episode.hook.length > 70 ? 70 : 80;

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: NIGHT, color: PAPER, padding: '52px 68px 48px', fontFamily: 'DM Sans' }}>
      <div style={{ display: 'flex' }}>
        <BrandRow color={PAPER} soft={SOFT} taglineText={SERIES.title.toUpperCase()} right={`EPISODE ${episode.number} · FICTION`} />
      </div>
      <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
        <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: hookSize, lineHeight: 1.02, letterSpacing: -2, maxWidth: 1040 }}>{episode.hook}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 40, lineHeight: 1 }}>{episode.title}</div>
          <div style={{ display: 'flex', fontSize: 20, color: SOFT }}>{`About ${episode.minutes} minutes · ${episode.rewindNote}`}</div>
        </div>
        <div style={{ display: 'flex', background: ACID, color: NIGHT, fontSize: 22, fontWeight: 600, padding: '15px 26px', borderRadius: 999 }}>Read it →</div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
