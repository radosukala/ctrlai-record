import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Issue } from '@/content/issues';
import type { Pick } from '@/content/types';

export const OG_SIZE = { width: 1200, height: 630 };

export const INK = '#263b31';
export const PAPER = '#f5f4ee';
export const MUTED = '#667064';
export const LINE = '#d9dcd1';
export const ACID = '#d5eb8c';
export const NIGHT = '#1b2b22';
export const SOFT = '#b9c4b5';

type Font = { name: string; data: Buffer; weight: 400 | 500 | 600; style: 'normal' | 'italic' };

let cached: Promise<Font[]> | null = null;

/** Self-hosted fonts from the same packages the site uses. Satori needs WOFF, not WOFF2. */
export function ogFonts(): Promise<Font[]> {
  cached ??= (async () => {
    const dir = path.join(process.cwd(), 'node_modules', '@fontsource');
    const file = (pkg: string, name: string) => readFile(path.join(dir, pkg, 'files', name));
    const entries: [string, string, string, Font['weight'], Font['style']][] = [
      ['DM Sans', 'dm-sans', 'dm-sans-latin-400-normal.woff', 400, 'normal'],
      ['DM Sans', 'dm-sans', 'dm-sans-latin-ext-400-normal.woff', 400, 'normal'],
      ['DM Sans', 'dm-sans', 'dm-sans-latin-600-normal.woff', 600, 'normal'],
      ['DM Sans', 'dm-sans', 'dm-sans-latin-ext-600-normal.woff', 600, 'normal'],
      ['Instrument Serif', 'instrument-serif', 'instrument-serif-latin-400-normal.woff', 400, 'normal'],
      ['Instrument Serif', 'instrument-serif', 'instrument-serif-latin-ext-400-normal.woff', 400, 'normal'],
      ['Instrument Serif', 'instrument-serif', 'instrument-serif-latin-400-italic.woff', 400, 'italic'],
      ['Instrument Serif', 'instrument-serif', 'instrument-serif-latin-ext-400-italic.woff', 400, 'italic'],
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

export function BrandRow({ right, color = INK, soft = MUTED }: { right?: string; color?: string; soft?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexGrow: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 30, borderTop: `3px solid ${color}`, borderBottom: `3px solid ${color}`, borderLeft: `3px solid ${color}` }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
          <div style={{ width: 8, height: 30, borderTop: `3px solid ${color}`, borderBottom: `3px solid ${color}`, borderRight: `3px solid ${color}` }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: 38, fontWeight: 600, letterSpacing: -2.4, color }}>
          ctrl<span style={{ fontSize: 14, marginTop: 4, marginLeft: 2, letterSpacing: -0.4 }}>AI</span>
        </div>
      </div>
      {right ? <div style={{ display: 'flex', fontSize: 17, fontWeight: 600, letterSpacing: 2, color: soft }}>{right}</div> : null}
    </div>
  );
}

function Pill({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', background: dark ? INK : ACID, color: dark ? PAPER : NIGHT, fontSize: 22, fontWeight: 600, padding: '14px 26px', borderRadius: 999 }}>
      {children}
    </div>
  );
}

/** The share image for an issue, and for the home page while that issue is the latest. */
export function IssueImage({ issue }: { issue: Issue }) {
  const headlines = issue.main.slice(0, 3).map(event => clip(event.headline, 62));
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: NIGHT, color: PAPER, padding: '48px 64px 46px', fontFamily: 'DM Sans' }}>
      <div style={{ display: 'flex' }}>
        <BrandRow color={PAPER} soft={SOFT} right={`ISSUE ${issue.number} · ${capsRange(issue.from, issue.to)}`} />
      </div>
      <div style={{ display: 'flex', marginTop: 40, fontFamily: 'Instrument Serif', fontSize: 96, lineHeight: 0.95, letterSpacing: -3 }}>
        This week in&nbsp;<span style={{ fontStyle: 'italic', color: ACID }}>AI control</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 34, flexGrow: 1 }}>
        {headlines.map(line => (
          <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28, color: PAPER }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: ACID, flexShrink: 0 }} />
            <div style={{ display: 'flex' }}>{line}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontSize: 24, color: SOFT }}>What happened, and seven things worth your time.</div>
        <Pill>ctrlai.com</Pill>
      </div>
    </div>
  );
}

export function HallImage({ count, cap, firstTitles }: { count: number; cap: number; firstTitles: string[] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, padding: '48px 64px 46px', fontFamily: 'DM Sans' }}>
      <div style={{ display: 'flex' }}>
        <BrandRow right={`CAPPED AT ${cap}`} />
      </div>
      <div style={{ display: 'flex', marginTop: 36, fontFamily: 'Instrument Serif', fontSize: 120, lineHeight: 0.92, letterSpacing: -4 }}>
        Hall of&nbsp;<span style={{ fontStyle: 'italic', color: '#597247' }}>Fame</span>
      </div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: 27, color: '#46554b', maxWidth: 1080 }}>
        {`The ${count} things you shouldn’t miss about AI control, safety and how AI works.`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 26, flexGrow: 1 }}>
        {firstTitles.map((title, i) => (
          <div key={title} style={{ display: 'flex', alignItems: 'baseline', gap: 16, fontSize: 25 }}>
            <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 34, color: '#597247', width: 26 }}>{String(i + 1)}</div>
            <div style={{ display: 'flex' }}>{clip(title, 70)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>Start with six videos, one evening.</div>
        <Pill dark>ctrlai.com/hall-of-fame</Pill>
      </div>
    </div>
  );
}

/** The card a creator can post: their piece, and where it was picked. */
export function PickCard({ pick, label, right, footer, url }: { pick: Pick; label: string; right: string; footer: string; url: string }) {
  const titleSize = pick.title.length > 80 ? 54 : pick.title.length > 50 ? 64 : 76;
  const byline = pick.outlet && pick.outlet !== pick.creator ? `${pick.creator} · ${pick.outlet}` : pick.creator;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, padding: '48px 64px 46px', fontFamily: 'DM Sans', borderBottom: `18px solid ${ACID}` }}>
      <div style={{ display: 'flex' }}>
        <BrandRow right={right} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, gap: 22 }}>
        <div style={{ display: 'flex' }}>
          <div style={{ display: 'flex', background: INK, color: ACID, fontSize: 20, fontWeight: 600, letterSpacing: 2.4, padding: '9px 18px', borderRadius: 999 }}>{label}</div>
        </div>
        <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: titleSize, lineHeight: 1.02, letterSpacing: -1.5, maxWidth: 1060 }}>{clip(pick.title, 110)}</div>
        <div style={{ display: 'flex', fontSize: 28, color: '#46554b' }}>{clip(byline, 70)}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>{footer}</div>
        <Pill dark>{url}</Pill>
      </div>
    </div>
  );
}
