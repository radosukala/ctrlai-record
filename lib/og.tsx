import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Issue } from '@/content/issues';
import type { Pick } from '@/content/types';
import { shortDate } from '@/lib/site';

export const OG_SIZE = { width: 1200, height: 630 };
/** The recap image goes out on X and LinkedIn, where 16:9 fills the feed. */
export const RECAP_SIZE = { width: 1200, height: 675 };

export const INK = '#1a1917';
export const INK_2 = '#3f3c36';
export const PAPER = '#f4f1ea';
export const WHITE = '#fbfaf7';
export const MUTED = '#6e695f';
export const LINE = '#d9d3c6';
export const SIGNAL = '#cf3a16';
export const SIGNAL_DEEP = '#a52c10';

const SERIF = 'Newsreader';
const SANS = 'Schibsted Grotesk';

type Font = { name: string; data: Buffer; weight: 400 | 500 | 600 | 700; style: 'normal' | 'italic' };

let cached: Promise<Font[]> | null = null;

/** Self-hosted fonts from the same families the site uses. Satori needs WOFF, not WOFF2. */
export function ogFonts(): Promise<Font[]> {
  cached ??= (async () => {
    const dir = path.join(process.cwd(), 'node_modules', '@fontsource');
    const file = (pkg: string, name: string) => readFile(path.join(dir, pkg, 'files', name));
    const entries: [string, string, string, Font['weight'], Font['style']][] = [
      [SANS, 'schibsted-grotesk', 'schibsted-grotesk-latin-500-normal.woff', 500, 'normal'],
      [SANS, 'schibsted-grotesk', 'schibsted-grotesk-latin-ext-500-normal.woff', 500, 'normal'],
      [SANS, 'schibsted-grotesk', 'schibsted-grotesk-latin-700-normal.woff', 700, 'normal'],
      [SANS, 'schibsted-grotesk', 'schibsted-grotesk-latin-ext-700-normal.woff', 700, 'normal'],
      [SERIF, 'newsreader', 'newsreader-latin-500-normal.woff', 500, 'normal'],
      [SERIF, 'newsreader', 'newsreader-latin-ext-500-normal.woff', 500, 'normal'],
      [SERIF, 'newsreader', 'newsreader-latin-400-italic.woff', 400, 'italic'],
      [SERIF, 'newsreader', 'newsreader-latin-ext-400-italic.woff', 400, 'italic'],
    ];
    return Promise.all(entries.map(async ([name, pkg, fileName, weight, style]) => ({ name, data: await file(pkg, fileName), weight, style })));
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

const SHORT_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "SEP 27 – OCT 4, 2026" for a share image. */
export function capsRange(from: string, to: string): string {
  const [, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return `${SHORT_MONTHS[fm - 1]} ${fd} – ${fm === tm ? '' : `${SHORT_MONTHS[tm - 1]} `}${td}, ${ty}`;
}

/** A keycap: the mark, and every label that reads as something you press. */
function Cap({ children, size = 44, fill = false, signal = false }: { children: string; size?: number; fill?: boolean; signal?: boolean }) {
  const border = signal ? SIGNAL : INK;
  const bottom = signal ? SIGNAL_DEEP : '#000000';
  const background = signal ? SIGNAL : fill ? INK : WHITE;
  const color = signal || fill ? PAPER : INK;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: size, minWidth: size, padding: `0 ${Math.round(size * 0.3)}px`,
        border: `3px solid ${border}`, borderBottomWidth: 6, borderRadius: Math.round(size * 0.24),
        background, color, fontFamily: SANS, fontWeight: 700, fontSize: Math.round(size * 0.48), letterSpacing: -0.5, lineHeight: 1,
      }}
    >
      {children}
    </div>
  );
}

export function BrandRow({ right, size = 44 }: { right?: string; size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexGrow: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Cap size={size}>ctrl</Cap>
        <Cap size={size}>AI</Cap>
      </div>
      {right ? <div style={{ display: 'flex', fontFamily: SANS, fontSize: 18, fontWeight: 700, letterSpacing: 2.6, color: MUTED }}>{right}</div> : null}
    </div>
  );
}

function Label({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: SANS, fontSize: 18, fontWeight: 700, letterSpacing: 2.6, color: INK }}>
      <div style={{ display: 'flex', width: 12, height: 12, background: SIGNAL, borderRadius: 2 }} />
      <div style={{ display: 'flex' }}>{children}</div>
    </div>
  );
}

function Footer({ left, url, dark = false }: { left: string; url: string; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', fontFamily: SANS, fontSize: 23, color: dark ? LINE : MUTED }}>{left}</div>
      <Cap size={50} fill={!dark}>{url}</Cap>
    </div>
  );
}

/** The share image for an issue, and for the home page while that issue is the latest. */
export function IssueImage({ issue }: { issue: Issue }) {
  const headline = clip(issue.summary, 190);
  const size = headline.length > 150 ? 54 : headline.length > 110 ? 60 : 68;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, padding: '44px 64px 46px', fontFamily: SANS, borderTop: `10px solid ${SIGNAL}` }}>
      <div style={{ display: 'flex' }}>
        <BrandRow right={`ISSUE ${issue.number} · ${capsRange(issue.from, issue.to)}`} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, gap: 22 }}>
        <Label>THIS WEEK IN AI CONTROL</Label>
        <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 500, fontSize: size, lineHeight: 1.06, letterSpacing: -1.6, maxWidth: 1072 }}>{headline}</div>
      </div>
      <Footer left="What happened, and seven things worth your time." url="ctrlai.com" />
    </div>
  );
}

export function HallImage({ count, cap, firstTitles }: { count: number; cap: number; firstTitles: string[] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, padding: '44px 64px 46px', fontFamily: SANS, borderTop: `10px solid ${SIGNAL}` }}>
      <div style={{ display: 'flex' }}>
        <BrandRow right={`HALL OF FAME · ${count} OF ${cap}`} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 34, gap: 18 }}>
        <Label>WHAT YOU SHOULDN’T MISS</Label>
        <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 500, fontSize: 52, lineHeight: 1.06, letterSpacing: -1.2, maxWidth: 1072 }}>
          {`The ${count} things to see first about AI control, safety and how AI works. Six videos make one evening.`}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28, flexGrow: 1, borderTop: `2px solid ${INK}` }}>
        {firstTitles.map((title, i) => (
          <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '9px 0', borderBottom: `1px solid ${LINE}`, fontFamily: SANS, fontSize: 22, fontWeight: 500 }}>
            <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 400, fontSize: 26, color: MUTED, width: 28 }}>{String(i + 1)}</div>
            <div style={{ display: 'flex' }}>{clip(title, 80)}</div>
          </div>
        ))}
      </div>
      <Footer left="Capped at 30. Earned by lasting." url="ctrlai.com/hall-of-fame" />
    </div>
  );
}

/** The card a creator can post: their piece, and where it was picked. */
export function PickCard({ pick, label, right, footer, url }: { pick: Pick; label: string; right: string; footer: string; url: string }) {
  const titleSize = pick.title.length > 80 ? 54 : pick.title.length > 50 ? 64 : 76;
  const byline = pick.outlet && pick.outlet !== pick.creator ? `${pick.creator} · ${pick.outlet}` : pick.creator;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, padding: '44px 64px 46px', fontFamily: SANS, borderTop: `10px solid ${SIGNAL}` }}>
      <div style={{ display: 'flex' }}>
        <BrandRow right={right} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, gap: 22 }}>
        <Label>{label}</Label>
        <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 500, fontSize: titleSize, lineHeight: 1.04, letterSpacing: -1.5, maxWidth: 1060 }}>{clip(pick.title, 110)}</div>
        <div style={{ display: 'flex', fontFamily: SANS, fontSize: 27, color: INK_2 }}>{clip(byline, 70)}</div>
      </div>
      <Footer left={footer} url={url} />
    </div>
  );
}

/** The week's main events on one image: the first post of the weekly thread, and the LinkedIn image. */
export function RecapImage({ issue }: { issue: Issue }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, padding: '38px 64px 38px', fontFamily: SANS, borderTop: `10px solid ${SIGNAL}` }}>
      <div style={{ display: 'flex' }}>
        <BrandRow right={`ISSUE ${issue.number} · ${capsRange(issue.from, issue.to)}`} size={40} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
        <Label>THIS WEEK IN AI CONTROL · WHAT HAPPENED</Label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16, flexGrow: 1, borderTop: `2px solid ${INK}` }}>
        {issue.main.map(event => (
          <div key={event.headline} style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '11px 0', borderBottom: `1px solid ${LINE}` }}>
            <div style={{ display: 'flex', width: 84, flexShrink: 0, fontFamily: SANS, fontSize: 17, fontWeight: 700, letterSpacing: 2, color: MUTED }}>{shortDate(event.date).toUpperCase()}</div>
            <div style={{ display: 'flex', fontFamily: SERIF, fontWeight: 500, fontSize: 31, lineHeight: 1.15, letterSpacing: -0.4 }}>{clip(event.headline, 90)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: 18 }}>
        <Footer left="Every event confirmed by two independent reports." url="ctrlai.com" />
      </div>
    </div>
  );
}
