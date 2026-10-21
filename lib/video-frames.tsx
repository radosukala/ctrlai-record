import { DISPLAY, INK, INK_2, MARK, MONO, MUTED, Mark, Marked, PAPER, SANS } from '@/lib/og';

/**
 * The frames of the daily video: 1080×1920, captions only, in the site's own system (white paper, black ink, the
 * highlighter for what was found word for word). Nothing here is anyone else's picture or sound: the words are ours,
 * and the one quotation is text, with its source on screen. Text sits inside the area the short-video apps leave
 * clear (about 150 px at the top, 280 px at the bottom).
 */
export const VIDEO_SIZE = { width: 1080, height: 1920 };

const FRAME = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, fontFamily: SANS, padding: '150px 72px 280px' } as const;

function Header({ right }: { right: string }) {
  return (
    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 22, borderBottom: `3px solid ${INK}` }}>
      <Mark size={58} />
      <div style={{ display: 'flex', fontFamily: MONO, fontSize: 30, color: MUTED }}>{right}</div>
    </div>
  );
}

/** Words that appear one by one. The words still to come keep their place, unseen, so the text never jumps. */
function Reveal({ text, size, shown, lineHeight }: { text: string; size: number; shown: number; lineHeight: number }) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight, letterSpacing: -size * 0.012, color: INK }}>
      {words.map((word, i) => (
        <div key={i} style={{ display: 'flex', opacity: i < shown ? 1 : 0, paddingRight: size * 0.24 }}>{word}</div>
      ))}
    </div>
  );
}

const small = (text: string) => <div style={{ display: 'flex', fontFamily: MONO, fontSize: 30, color: MUTED }}>{text}</div>;

export function TitleFrame({ date }: { date: string }) {
  return (
    <div style={{ ...FRAME, justifyContent: 'center', gap: 52 }}>
      <Mark size={124} />
      <div style={{ display: 'flex', fontFamily: MONO, fontWeight: 600, fontSize: 40 }}>{date}</div>
      <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 800, fontSize: 148, lineHeight: 0.96, letterSpacing: -2 }}>What changed in AI safety and control today</div>
      <div style={{ display: 'flex', fontSize: 46, fontWeight: 500, color: INK_2, lineHeight: 1.25 }}>Every quotation checked word for word against its source.</div>
    </div>
  );
}

export type ChangeFrameProps = { n: number; of: number; kind: string; outlet: string; date: string; note: string; lens?: string; shown: number; showLens: boolean };

/** One change, in our words, with where it was reported, and what it means for a reader once the headline is up. */
export function ChangeFrame({ n, of, kind, outlet, date, note, lens, shown, showLens }: ChangeFrameProps) {
  const size = note.length <= 100 ? 106 : note.length <= 150 ? 92 : note.length <= 200 ? 80 : 70;
  return (
    <div style={FRAME}>
      <Header right={`${n} of ${of}`} />
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', gap: 46 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', background: MARK, padding: '8px 20px 10px', fontFamily: MONO, fontWeight: 600, fontSize: 36, letterSpacing: 1 }}>{kind.toUpperCase()}</div>
          <div style={{ display: 'flex', fontFamily: MONO, fontSize: 34, color: MUTED }}>{`${outlet} · ${date}`}</div>
        </div>
        <Reveal text={note} size={size} shown={shown} lineHeight={1.02} />
        {lens ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: `3px solid ${INK}`, paddingTop: 26, opacity: showLens ? 1 : 0 }}>
            {small('WHAT IT MEANS')}
            <div style={{ display: 'flex', fontSize: 42, fontWeight: 500, lineHeight: 1.3, color: INK_2 }}>{lens}</div>
          </div>
        ) : null}
      </div>
      {small(`Source: ${outlet}`)}
    </div>
  );
}

export type QuoteFrameProps = { quote: string; lit: number; who: string; role?: string; source: string; context?: string };

/** One quotation, its words marked as they are read, with who said it and where. */
export function QuoteFrame({ quote, lit, who, role, source, context }: QuoteFrameProps) {
  const size = quote.length <= 70 ? 108 : quote.length <= 120 ? 90 : quote.length <= 170 ? 76 : 66;
  return (
    <div style={FRAME}>
      <Header right="Said" />
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', gap: 50 }}>
        {small('ONE QUOTATION, FOUND WORD FOR WORD')}
        <Marked text={quote} size={size} lineHeight={1.2} lit={lit} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', fontSize: 54, fontWeight: 700, lineHeight: 1.1 }}>{who}</div>
          {role ? <div style={{ display: 'flex', fontSize: 40, fontWeight: 500, color: INK_2, lineHeight: 1.2 }}>{role}</div> : null}
          <div style={{ display: 'flex', fontFamily: MONO, fontSize: 32, color: MUTED, marginTop: 6 }}>{source}</div>
          {context ? <div style={{ display: 'flex', fontSize: 40, lineHeight: 1.3, color: INK_2, marginTop: 14 }}>{context}</div> : null}
        </div>
      </div>
      {small('Source named, words unaltered')}
    </div>
  );
}

export function NumbersFrame({ rows, shown }: { rows: { n: string; label: string }[]; shown: number }) {
  return (
    <div style={FRAME}>
      <Header right="Behind today’s edition" />
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', gap: 60 }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity: i < shown ? 1 : 0 }}>
            <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 800, fontSize: 190, lineHeight: 0.95, letterSpacing: -3 }}>{row.n}</div>
            <div style={{ display: 'flex', fontSize: 50, fontWeight: 500, color: INK_2 }}>{row.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EndFrame({ address, disclosure, voiceNote }: { address: string; disclosure?: string; voiceNote?: string }) {
  return (
    <div style={{ ...FRAME, justifyContent: 'center', gap: 50 }}>
      <Mark size={96} />
      <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 800, fontSize: 112, lineHeight: 0.98, letterSpacing: -1.5 }}>Every source and every quotation, in the full edition</div>
      <div style={{ display: 'flex', alignSelf: 'flex-start', padding: '20px 30px 24px', background: INK, color: PAPER, fontFamily: MONO, fontWeight: 600, fontSize: 52 }}>{address}</div>
      {disclosure ? <div style={{ display: 'flex', fontFamily: MONO, fontSize: 29, lineHeight: 1.4, color: MUTED }}>{disclosure}</div> : null}
      {voiceNote ? <div style={{ display: 'flex', fontFamily: MONO, fontSize: 29, lineHeight: 1.4, color: MUTED }}>{voiceNote}</div> : null}
      <div style={{ display: 'flex', fontSize: 38, fontWeight: 500, color: INK_2 }}>Ctrl AI · the checked record of AI safety and control</div>
    </div>
  );
}
