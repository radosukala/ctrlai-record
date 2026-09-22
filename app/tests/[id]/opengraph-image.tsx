import { ImageResponse } from 'next/og';
import { getDb } from '@/lib/db/client';
import { testRunCounts } from '@/lib/store/stats';
import { getTest } from '@/content/tests';
import { BrandRow, INK, LINE, MUTED, OG_SIZE, ogFonts, PAPER, ACID } from '@/lib/og';
import { SITE } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'A one-minute test you can run on your own AI';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fonts = await ogFonts();
  const test = getTest(id);
  if (!test) return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: PAPER }} />, { ...size, fonts });
  const counts = (await testRunCounts(await getDb()))[test.id];
  const number = String(test.number).padStart(2, '0');
  const question = test.shareQuestion;
  const titleSize = question.length > 58 ? 72 : question.length > 44 ? 82 : 94;
  const stat = counts?.runs
    ? `${counts.runs} ${counts.runs === 1 ? 'run' : 'runs'} · ${counts.products} ${counts.products === 1 ? 'AI' : 'AIs'} · ${counts.verified} verified`
    : 'The record is open. Add the first run.';

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, padding: '48px 64px 44px', fontFamily: 'DM Sans', color: INK }}>
      <BrandRow right={`TEST ${number}`} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
        <div style={{ display: 'flex', alignSelf: 'flex-start', background: ACID, borderRadius: 999, padding: '8px 18px', fontSize: 20, fontWeight: 600, letterSpacing: 1.5 }}>
          {`${test.kind === 'behavior' ? 'BEHAVIOR' : 'STATED ATTITUDE'} TEST · ABOUT ${test.seconds} SECONDS · ANY AI`}
        </div>
        <div style={{ display: 'flex', marginTop: 26, fontFamily: 'Instrument Serif', fontSize: titleSize, lineHeight: 1.0, letterSpacing: -2, maxWidth: 1060 }}>{question}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${LINE}`, paddingTop: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', fontSize: 21, fontWeight: 600 }}>{stat}</div>
          <div style={{ display: 'flex', fontSize: 18, color: MUTED }}>{`${SITE.url.replace('https://', '')}/tests/${test.id}`}</div>
        </div>
        <div style={{ display: 'flex', background: INK, color: PAPER, fontSize: 22, fontWeight: 600, padding: '14px 24px', borderRadius: 8 }}>Ask yours →</div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
