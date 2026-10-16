import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Issue } from '@/content/issues';
import type { Pick } from '@/content/types';
import { shortDate } from '@/lib/site';

export const OG_SIZE = { width: 1200, height: 630 };
/** The recap image goes out on X and LinkedIn, where 16:9 fills the feed. */
export const RECAP_SIZE = { width: 1200, height: 675 };

/* The site's own system (app/globals.css): white paper, black ink, the highlighter yellow for the mark, red only for a
   contradiction. Our headlines in the condensed sans, the source's titles in the serif, provenance in mono. */
export const INK = '#111111';
export const INK_2 = '#2f2f2f';
export const PAPER = '#ffffff';
export const MUTED = '#666666';
export const LINE = '#d9d9d6';
export const MARK = '#ffe45c';
export const SIGNAL = '#e0301e';

const DISPLAY = 'Ctrl AI Display';
const SANS = 'Ctrl AI Sans';
const SERIF = 'Ctrl AI Serif';
const MONO = 'IBM Plex Mono';

type Font = { name: string; data: Buffer; weight: 400 | 500 | 600 | 700 | 800; style: 'normal' | 'italic' };

let cached: Promise<Font[]> | null = null;

/**
 * Self-hosted fonts from the families the site uses. Satori needs static WOFF, not WOFF2 or variable fonts, so the
 * Archivo and Source Serif cuts in lib/og-fonts/ are made from the site's variable fonts by scripts/og-fonts.py.
 */
export function ogFonts(): Promise<Font[]> {
  cached ??= (async () => {
    const own = (name: string) => readFile(path.join(process.cwd(), 'lib', 'og-fonts', name));
    const plex = (name: string) => readFile(path.join(process.cwd(), 'node_modules', '@fontsource', 'ibm-plex-mono', 'files', name));
    const entries: [string, () => Promise<Buffer>, Font['weight']][] = [];
    for (const subset of ['latin', 'latin-ext']) {
      entries.push(
        [DISPLAY, () => own(`display-800-${subset}.woff`), 800],
        [SANS, () => own(`sans-500-${subset}.woff`), 500],
        [SANS, () => own(`sans-700-${subset}.woff`), 700],
        [SERIF, () => own(`serif-600-${subset}.woff`), 600],
        [MONO, () => plex(`ibm-plex-mono-${subset}-400-normal.woff`), 400],
        [MONO, () => plex(`ibm-plex-mono-${subset}-600-normal.woff`), 600],
      );
    }
    return Promise.all(entries.map(async ([name, load, weight]) => ({ name, data: await load(), weight, style: 'normal' as const })));
  })();
  return cached;
}

export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,.;:!?—–-]+$/, '')}…`;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sep 27 – Oct 4, 2026" or "Oct 4–11, 2026" for a share image. */
export function rangeLabel(from: string, to: string): string {
  const [, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return fm === tm ? `${SHORT_MONTHS[fm - 1]} ${fd}–${td}, ${ty}` : `${SHORT_MONTHS[fm - 1]} ${fd} – ${SHORT_MONTHS[tm - 1]} ${td}, ${ty}`;
}

/** The mark: Ctrl, then AI on a square of the highlighter yellow (components/Brand.tsx). */
function Mark({ size = 40 }: { size?: number }) {
  const box = Math.round(size * 1.18);
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.01, color: INK }}>
      <div style={{ display: 'flex', marginRight: Math.round(size * 0.14) }}>Ctrl</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: box, height: box, paddingTop: Math.round(size * 0.04), background: MARK }}>AI</div>
    </div>
  );
}

export function BrandRow({ right, size = 40 }: { right?: string; size?: number }) {
  return (
    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 18, borderBottom: `2px solid ${INK}` }}>
      <Mark size={size} />
      {right ? <div style={{ display: 'flex', fontFamily: MONO, fontSize: 19, color: MUTED }}>{right}</div> : null}
    </div>
  );
}

/** What the image is, in mono, the way the site files things. */
function Label({ children }: { children: string }) {
  return <div style={{ display: 'flex', fontFamily: MONO, fontWeight: 600, fontSize: 19, color: INK }}>{children}</div>;
}

function Footer({ left, url }: { left: string; url: string }) {
  return (
    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 24, paddingTop: 18, borderTop: `1px solid ${LINE}` }}>
      <div style={{ display: 'flex', fontFamily: SANS, fontWeight: 500, fontSize: 22, color: MUTED }}>{left}</div>
      <div style={{ display: 'flex', flexShrink: 0, padding: '9px 16px 10px', background: INK, color: PAPER, fontFamily: MONO, fontWeight: 600, fontSize: 20 }}>{url}</div>
    </div>
  );
}

const FRAME = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, padding: '44px 64px 42px', fontFamily: SANS } as const;

/** The share image for a weekly issue. */
export function IssueImage({ issue, label = 'This week in AI control', footer = 'What happened, and seven things worth your time.' }: { issue: Issue; label?: string; footer?: string }) {
  const headline = clip(issue.summary, 190);
  const size = headline.length > 150 ? 64 : headline.length > 110 ? 72 : 84;
  return (
    <div style={FRAME}>
      <BrandRow right={`Issue ${issue.number} · ${rangeLabel(issue.from, issue.to)}`} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, gap: 20 }}>
        <Label>{label}</Label>
        <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.98, letterSpacing: -size * 0.014, maxWidth: 1072 }}>{headline}</div>
      </div>
      <Footer left={footer} url="ctrlai.com" />
    </div>
  );
}

/** The share image for an edition: today's, a day's or a month's. Its date on the right, its headline in our display face. */
export function EditionImage({ right, label, line, footer }: { right: string; label: string; line: string; footer: string }) {
  const headline = clip(line, 190);
  const size = headline.length > 150 ? 64 : headline.length > 110 ? 72 : 84;
  return (
    <div style={FRAME}>
      <BrandRow right={right} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, gap: 20 }}>
        <Label>{label}</Label>
        <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.98, letterSpacing: -size * 0.014, maxWidth: 1072 }}>{headline}</div>
      </div>
      <Footer left={footer} url="ctrlai.com" />
    </div>
  );
}

export function HallImage({ count, cap, firstTitles }: { count: number; cap: number; firstTitles: string[] }) {
  return (
    <div style={FRAME}>
      <BrandRow right={`Hall of Fame · ${count} of ${cap}`} />
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28, gap: 16 }}>
        <Label>What you shouldn’t miss</Label>
        <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 800, fontSize: 54, lineHeight: 0.98, letterSpacing: -0.7, maxWidth: 1072 }}>
          {`The ${count} things to see first about AI control, safety and how AI works. Six videos make one evening.`}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24, flexGrow: 1, borderTop: `2px solid ${INK}` }}>
        {firstTitles.map((title, i) => (
          <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '8px 0', borderBottom: `1px solid ${LINE}` }}>
            <div style={{ display: 'flex', fontFamily: MONO, fontSize: 18, color: MUTED, width: 30 }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 600, fontSize: 24 }}>{clip(title, 80)}</div>
          </div>
        ))}
      </div>
      <Footer left="Capped at 30. Earned by lasting." url="ctrlai.com/hall-of-fame" />
    </div>
  );
}

/** The card a creator can post: their piece, in their own title, and where it was picked. */
export function PickCard({ pick, label, right, footer, url }: { pick: Pick; label: string; right: string; footer: string; url: string }) {
  const titleSize = pick.title.length > 80 ? 56 : pick.title.length > 50 ? 66 : 78;
  const byline = pick.outlet && pick.outlet !== pick.creator ? `${pick.creator} · ${pick.outlet}` : pick.creator;
  return (
    <div style={FRAME}>
      <BrandRow right={right} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, gap: 20 }}>
        <Label>{label}</Label>
        <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 600, fontSize: titleSize, lineHeight: 1.04, letterSpacing: -titleSize * 0.016, maxWidth: 1060 }}>{clip(pick.title, 110)}</div>
        <div style={{ display: 'flex', fontFamily: SANS, fontWeight: 500, fontSize: 27, color: INK_2 }}>{clip(byline, 70)}</div>
      </div>
      <Footer left={footer} url={url} />
    </div>
  );
}

/** The week's main events on one image: the first post of the weekly thread, and the LinkedIn image. */
export function RecapImage({ issue }: { issue: Issue }) {
  return (
    <div style={{ ...FRAME, padding: '38px 64px 36px' }}>
      <BrandRow right={`Issue ${issue.number} · ${rangeLabel(issue.from, issue.to)}`} size={36} />
      <div style={{ display: 'flex', marginTop: 22 }}>
        <Label>This week in AI control · what happened</Label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14, flexGrow: 1, borderTop: `2px solid ${INK}` }}>
        {issue.main.map(event => (
          <div key={event.headline} style={{ display: 'flex', alignItems: 'flex-start', gap: 22, padding: '12px 0', borderBottom: `1px solid ${LINE}` }}>
            <div style={{ display: 'flex', width: 80, flexShrink: 0, paddingTop: 3, fontFamily: MONO, fontSize: 18, lineHeight: '34px', color: MUTED }}>{shortDate(event.date)}</div>
            <div style={{ display: 'flex', fontFamily: SANS, fontWeight: 700, fontSize: 29, lineHeight: '34px', letterSpacing: -0.3 }}>{clip(event.headline, 120)}</div>
          </div>
        ))}
      </div>
      <Footer left="Every event confirmed by two independent reports." url="ctrlai.com" />
    </div>
  );
}

const FILL: Record<string, number> = { nothing: 0, said: 0.33, detailed: 0.66, confirmed: 1, contradicted: 1 };

/** A commitment's number in a square, as on the tracker page. */
function Num({ children, size = 30 }: { children: string; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: size, height: size, padding: '0 6px', border: `2px solid ${INK}`, fontFamily: MONO, fontWeight: 600, fontSize: Math.round(size * 0.5) }}>{children}</div>
  );
}

/**
 * The accord tracker's share image: the whole matrix, so the picture is the finding. Each cell is a bar that fills as the
 * evidence gets stronger (empty and dashed for "nothing new"), and the numbers are the page's own, passed in.
 */
export function AccordImage({ days, companies, rows, withNews, tied, total, checked }: {
  days: number;
  companies: string[];
  rows: { number: string; cells: string[] }[];
  withNews: number;
  tied: number;
  total: number;
  checked: string;
}) {
  const cellW = 160;
  return (
    <div style={{ ...FRAME, padding: '36px 64px 34px' }}>
      <BrandRow right={`Accord tracker · ${days} days after`} size={36} />
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20, gap: 10 }}>
        <Label>White House Accord on Super Intelligence</Label>
        <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 800, fontSize: 58, lineHeight: 0.98, letterSpacing: -0.8, maxWidth: 1070 }}>Six companies committed to four safety controls.</div>
        <div style={{ display: 'flex', fontFamily: SANS, fontWeight: 500, fontSize: 25, lineHeight: 1.25, color: INK_2, maxWidth: 1070 }}>
          {withNews === 0 ? `${days} days after the accord: we found nothing new from any of them.` : `${days} days after the accord: ${withNews} of ${total} commitments show anything new; in ${tied} the company itself points to the accord.`}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12, flexGrow: 1, justifyContent: 'center' }}>
        <div style={{ display: 'flex', paddingLeft: 52, gap: 8 }}>
          {companies.map(name => (
            <div key={name} style={{ display: 'flex', width: cellW, fontFamily: SANS, fontSize: 18, fontWeight: 700, color: INK_2 }}>{name}</div>
          ))}
        </div>
        {rows.map(row => (
          <div key={row.number} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
            <div style={{ display: 'flex', width: 44 }}><Num>{row.number}</Num></div>
            {row.cells.map((status, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', position: 'relative', width: cellW, height: 30,
                  border: `2px ${status === 'nothing' ? 'dashed' : 'solid'} ${status === 'nothing' ? '#b5b5b0' : INK}`, background: PAPER, overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', width: `${Math.round(FILL[status] * 100)}%`, height: '100%', background: status === 'contradicted' ? SIGNAL : INK }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <Footer left={`Checked ${checked}. Fuller bar: more detail. Dashed: nothing new.`} url="ctrlai.com/accord" />
    </div>
  );
}

/** The hub's share image: the question, our answer, and the five parts, the open ones filled. */
export function SayImage({ name, line, parts }: { name: string; line: string; parts: { title: string; state: string }[] }) {
  return (
    <div style={FRAME}>
      <BrandRow right={name} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, gap: 20 }}>
        <Label>Who gets a say in how AI is built?</Label>
        <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, lineHeight: 0.96, letterSpacing: -1.6, maxWidth: 1040 }}>Our view: very few people.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          {parts.map((p, i) => (
            <div key={p.title} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', padding: '8px 16px 9px', border: `2px solid ${INK}`, background: p.state === 'live' ? INK : PAPER, color: p.state === 'live' ? PAPER : INK, fontFamily: SANS, fontWeight: 700, fontSize: 22 }}>{p.title}</div>
              {i < parts.length - 1 ? <div style={{ display: 'flex', width: 16, height: 2, background: LINE }} /> : null}
            </div>
          ))}
        </div>
      </div>
      <Footer left={line} url="ctrlai.com/say" />
    </div>
  );
}

/* ——— The daily post kit (scripts/social-day.ts): a checked quotation, and what changed today. ——— */

/** X fills its feed at 16:9; LinkedIn shows a 4:5 portrait largest. */
export const POST_X_SIZE = { width: 1200, height: 675 };
export const POST_LI_SIZE = { width: 1080, height: 1350 };

/**
 * Their words with the highlighter, as on the site: found word for word in the source. Satori can't paint a background
 * line by line, so each word carries the stroke, with the space after it, and the words wrap as a flex row.
 */
function Marked({ text, size, lineHeight }: { text: string; size: number; lineHeight: number }) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const stroke = `linear-gradient(180deg, transparent 34%, ${MARK} 34%, ${MARK} 92%, transparent 92%)`;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', fontFamily: SERIF, fontWeight: 600, fontSize: size, lineHeight, letterSpacing: -size * 0.01, color: INK }}>
      <div style={{ display: 'flex' }}>“</div>
      {words.map((word, i) => (
        <div key={i} style={{ display: 'flex', backgroundImage: stroke, paddingRight: i === words.length - 1 ? 0 : size * 0.26 }}>{word}</div>
      ))}
      <div style={{ display: 'flex' }}>”</div>
    </div>
  );
}

export type QuoteCardProps = {
  size: 'x' | 'linkedin';
  /** Top right, in mono: "Said · Oct 15, 2026", or "Quoted by Ars Technica · Oct 15, 2026" when the words are older. */
  label: string;
  quote: string;
  who: string;
  role?: string;
  /** Where the words were said or printed, in mono. */
  source: string;
  /** Our one line of context: what the words are about. A quotation never travels without it. */
  context?: string;
  /** The question the entry is filed under (the LinkedIn card has room for it). */
  question?: string;
  /** For entries about Anthropic or Claude. */
  disclosure?: string;
};

/** One checked quotation, its speaker, where and when, and our line of context. */
export function QuoteCard({ size, label, quote, who, role, source, context, question, disclosure }: QuoteCardProps) {
  const x = size === 'x';
  const text = clip(quote, 260);
  const qs = x ? (text.length <= 110 ? 46 : text.length <= 170 ? 40 : 34) : (text.length <= 110 ? 70 : text.length <= 170 ? 60 : 52);
  const meta = x ? 18 : 22;
  return (
    <div style={{ ...FRAME, padding: x ? '40px 56px 34px' : '56px 64px 52px' }}>
      <BrandRow right={label} size={x ? 34 : 44} />
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: x ? 'center' : 'flex-start', paddingTop: x ? 0 : 130, gap: Math.round(qs * 0.6) }}>
        <Marked text={text} size={qs} lineHeight={1.25} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: x ? 25 : 32 }}>
            <div style={{ display: 'flex', fontWeight: 700 }}>{who}</div>
            {role ? <div style={{ display: 'flex', fontWeight: 500, color: INK_2, marginLeft: 10 }}>{`· ${clip(role, 70)}`}</div> : null}
          </div>
          <div style={{ display: 'flex', fontFamily: MONO, fontSize: meta, color: MUTED }}>{clip(source, x ? 90 : 70)}</div>
          {context ? <div style={{ display: 'flex', fontSize: meta + 1, color: INK_2, marginTop: 4 }}>{clip(context, x ? 210 : 220)}</div> : null}
        </div>
      </div>
      {question ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: `2px solid ${INK}`, padding: '18px 0 26px' }}>
          <div style={{ display: 'flex', fontFamily: MONO, fontSize: meta, color: MUTED }}>Filed under the question</div>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>{question}</div>
        </div>
      ) : null}
      {disclosure ? <div style={{ display: 'flex', fontFamily: MONO, fontSize: meta - 3, color: MUTED, marginBottom: 12 }}>{disclosure}</div> : null}
      <Footer left="Found word for word in the source." url="ctrlai.com" />
    </div>
  );
}

export type TodayItem = { kind: string; outlet: string; note: string };

/** What changed today: up to three changes, in our words, each with what kind of change it is and where it came from. */
export function TodayCard({ date, items, disclosure }: { date: string; items: TodayItem[]; disclosure?: string }) {
  return (
    <div style={{ ...FRAME, padding: '56px 64px 52px' }}>
      <BrandRow right={date} size={44} />
      <div style={{ display: 'flex', fontFamily: MONO, fontWeight: 600, fontSize: 21, marginTop: 40 }}>AI safety and control</div>
      <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 800, fontSize: 84, lineHeight: 0.98, letterSpacing: -1.2, marginTop: 8 }}>What changed today</div>
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, marginTop: 30 }}>
        {items.slice(0, 3).map((item, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '24px 0 26px', borderTop: `1px solid ${LINE}` }}>
            <div style={{ display: 'flex', fontFamily: MONO, fontSize: 19 }}>
              <div style={{ display: 'flex', fontWeight: 600, letterSpacing: 0.6 }}>{item.kind.toUpperCase()}</div>
              <div style={{ display: 'flex', color: MUTED, marginLeft: 10 }}>{`· ${item.outlet}`}</div>
            </div>
            <div style={{ display: 'flex', fontSize: items.length > 2 ? 37 : 42, fontWeight: 700, lineHeight: 1.15 }}>{clip(item.note, 170)}</div>
          </div>
        ))}
      </div>
      {disclosure ? <div style={{ display: 'flex', fontFamily: MONO, fontSize: 17, color: MUTED, marginBottom: 14 }}>{disclosure}</div> : null}
      <Footer left="Every quotation checked against its source." url="ctrlai.com" />
    </div>
  );
}
