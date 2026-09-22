import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { OutcomeTone } from '@/content/tests';

export const OG_SIZE = { width: 1200, height: 630 };

export const INK = '#263b31';
export const PAPER = '#f5f4ee';
export const MUTED = '#667064';
export const LINE = '#d9dcd1';
export const ACID = '#d5eb8c';
export const TONE: Record<OutcomeTone, string> = { hoped: '#2a8a3e', mixed: '#e8a317', concern: '#c9412a', neutral: '#a3a59b' };

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

export function BrandRow({ right, tagline = true }: { right?: string; tagline?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexGrow: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 30, borderTop: `3px solid ${INK}`, borderBottom: `3px solid ${INK}`, borderLeft: `3px solid ${INK}` }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, background: INK }} />
          <div style={{ width: 8, height: 30, borderTop: `3px solid ${INK}`, borderBottom: `3px solid ${INK}`, borderRight: `3px solid ${INK}` }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: 38, fontWeight: 600, letterSpacing: -2.4, color: INK }}>
          ctrl<span style={{ fontSize: 14, marginTop: 4, marginLeft: 2, letterSpacing: -0.4 }}>AI</span>
        </div>
        {tagline ? <div style={{ display: 'flex', marginLeft: 12, fontSize: 15, fontWeight: 600, letterSpacing: 2.4, color: MUTED }}>THE PUBLIC RECORD OF AI BEHAVIOR</div> : null}
      </div>
      {right ? <div style={{ display: 'flex', fontSize: 16, fontWeight: 600, letterSpacing: 2, color: MUTED }}>{right}</div> : null}
    </div>
  );
}
