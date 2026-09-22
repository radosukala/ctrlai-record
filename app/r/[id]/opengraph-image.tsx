import { ImageResponse } from 'next/og';
import { getDb } from '@/lib/db/client';
import { getRun } from '@/lib/store/runs';
import { isShortId } from '@/lib/ids';
import { getOutcome, getTest } from '@/content/tests';
import { getProduct } from '@/content/products';
import { ACID, BrandRow, clip, INK, LINE, MUTED, OG_SIZE, ogFonts, PAPER, TONE } from '@/lib/og';
import { SITE } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'A run in the Ctrl AI public record of AI behavior';

const STATUS_LINE: Record<string, string> = {
  verified: 'Receipt and outcome confirmed by two independent checkers',
  rated: 'Outcome agreed by two checkers · no share link from the maker',
  unverified: 'The submitter’s own rating · waiting for two independent checks',
  disputed: 'Checkers disagree about what happened',
};

/** The first thing anyone sees on a shared card is how much it can be trusted. */
const STATUS_PILL: Record<string, { text: string; bg: string; fg: string }> = {
  verified: { text: 'VERIFIED', bg: '#dbeccf', fg: '#1d5a29' },
  rated: { text: 'RATED · NO RECEIPT', bg: '#d8ebf0', fg: '#1f5563' },
  unverified: { text: 'NOT YET VERIFIED', bg: '#f6e7bf', fg: '#6f4c05' },
  disputed: { text: 'DISPUTED', bg: '#f6ddd5', fg: '#8a2a18' },
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fonts = await ogFonts();
  const run = isShortId(id) ? await getRun(await getDb(), id) : null;
  const test = run ? getTest(run.testId) : undefined;
  const visible = run && test && !['withdrawn', 'hidden', 'rejected'].includes(run.status);
  if (!run || !test || !visible) {
    return new ImageResponse(
      <div style={{ ...frame, justifyContent: 'space-between' }}>
        <BrandRow />
        <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 84, color: INK }}>Test your AI in the open.</div>
        <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>{SITE.url.replace('https://', '')}</div>
      </div>,
      { ...size, fonts },
    );
  }
  const product = getProduct(run.productId);
  const outcome = getOutcome(test, run.consensusOutcome ?? run.submitterOutcome);
  const tone = TONE[outcome?.tone ?? 'neutral'];
  const name = product?.name ?? 'This AI';
  const verdict = `${name} ${outcome?.share ?? 'answered'}.`;
  const excerpt = run.excerpt ? clip(run.excerpt, 150) : '';
  const verdictSize = verdict.length > 52 ? 58 : verdict.length > 36 ? 68 : 80;
  const number = String(test.number).padStart(2, '0');
  const pill = STATUS_PILL[run.status] ?? STATUS_PILL.unverified;

  return new ImageResponse(
    <div style={frame}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BrandRow />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: pill.bg, color: pill.fg, fontSize: 18, fontWeight: 600, letterSpacing: 1.6, padding: '9px 16px', borderRadius: 999, flexShrink: 0 }}>
          {run.status === 'verified' ? (
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={pill.fg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : null}
          {pill.text}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, paddingBottom: 12 }}>
        <div style={{ display: 'flex', fontSize: 30, color: MUTED, lineHeight: 1.3 }}>{`Test ${number} · ${test.shareQuestion}`}</div>
        <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 22 }}>
          <div style={{ width: 10, borderRadius: 5, background: tone, marginRight: 26 }} />
          <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: verdictSize, lineHeight: 1.02, letterSpacing: -1.5, color: INK, maxWidth: 1000 }}>{verdict}</div>
        </div>
        {excerpt ? (
          <div style={{ display: 'flex', marginTop: 30, paddingLeft: 22, borderLeft: `4px solid #b7d36b`, fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: excerpt.length > 100 ? 30 : 34, lineHeight: 1.25, color: INK, maxWidth: 1000 }}>
            “{excerpt}”
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${LINE}`, paddingTop: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', fontSize: 20, fontWeight: 600, color: INK }}>{STATUS_LINE[run.status] ?? ''}</div>
          <div style={{ display: 'flex', fontSize: 18, color: MUTED }}>{`${SITE.url.replace('https://', '')}/r/${run.id}${run.modelLabel ? ` · ${clip(run.modelLabel, 28)}` : ''}`}</div>
        </div>
        <div style={{ display: 'flex', background: INK, color: PAPER, fontSize: 22, fontWeight: 600, padding: '14px 24px', borderRadius: 8 }}>Test yours in 60 seconds →</div>
      </div>
    </div>,
    { ...size, fonts },
  );
}

const frame = {
  width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const,
  background: PAPER, padding: '48px 64px 44px', fontFamily: 'DM Sans', color: INK,
};
