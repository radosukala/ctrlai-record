'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/*
 * The money section's charts: SVG drawn from a filing's checked table, with a hover (and focus) readout on every mark.
 * The site's palette, used as emphasis: revenue in the highlighter's yellow, computing in ink, everything else in gray.
 * Thin marks (bars at most 22px), a 4px rounded data-end, square at the baseline, a 2px gap between touching marks,
 * hairline gridlines. Every value is also in the table under the charts, so nothing depends on hovering.
 * Each chart draws at the width it is given, one unit to a pixel, so its text stays the size the stylesheet sets; on a
 * narrow screen labels move above their bars instead of shrinking.
 */
const C = { revenue: '#f0cb00', compute: '#111111', other: '#b8b8b2', total: '#6e6e69', grid: '#e7e7e4', axis: '#bdbdb8' };
const NARROW = 560;

type Line = { name: string; value: string; color: string };
type Tip = { x: number; y: number; title: string; lines: Line[] } | null;
type TipBody = Omit<NonNullable<Tip>, 'x' | 'y'>;
type Show = (e: { clientX: number; clientY: number } | null, t: TipBody | null, el?: Element) => void;

const billions = (m: number) => `$${(m / 1000).toFixed(1)}B`;
const amount = (m: number) => (Math.abs(m) < 1000 ? `$${Math.abs(m).toLocaleString('en-US')}M` : `$${(Math.abs(m) / 1000).toFixed(1)}B`);

/** A bar with a 4px round on the data end only; square where it meets the baseline. */
function bar(x: number, y: number, w: number, h: number, end: 'top' | 'left' | 'right' | 'both', r = 4) {
  if (h <= 0 || w <= 0) return '';
  const k = Math.min(r, (end === 'top' ? Math.min(w / 2, h) : Math.min(h / 2, w / 2)));
  if (end === 'top') return `M${x},${y + h}V${y + k}Q${x},${y} ${x + k},${y}H${x + w - k}Q${x + w},${y} ${x + w},${y + k}V${y + h}Z`;
  if (end === 'left') return `M${x + w},${y}H${x + k}Q${x},${y} ${x},${y + k}V${y + h - k}Q${x},${y + h} ${x + k},${y + h}H${x + w}Z`;
  if (end === 'right') return `M${x},${y}H${x + w - k}Q${x + w},${y} ${x + w},${y + k}V${y + h - k}Q${x + w},${y + h} ${x + w - k},${y + h}H${x}Z`;
  return `M${x + k},${y}H${x + w - k}Q${x + w},${y} ${x + w},${y + k}V${y + h - k}Q${x + w},${y + h} ${x + w - k},${y + h}H${x + k}Q${x},${y + h} ${x},${y + h - k}V${y + k}Q${x},${y} ${x + k},${y}Z`;
}

/** The plot's width in CSS pixels; the server draws at the desktop width and the browser redraws at the real one. */
function useWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(680);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** The frame every chart shares: a title, a legend, the SVG, a note, and one tooltip that follows the pointer or focus. */
function Frame({ box, title, legend, note, width, height, label, children }: { box: RefObject<HTMLDivElement | null>; title: string; legend?: { name: string; color: string }[]; note?: ReactNode; width: number; height: number; label: string; children: (show: Show) => ReactNode }) {
  const [tip, setTip] = useState<Tip>(null);
  const show: Show = (e, t, el) => {
    if (!t || !box.current) return setTip(null);
    const b = box.current.getBoundingClientRect();
    const at = e ?? (() => { const r = el!.getBoundingClientRect(); return { clientX: r.left + Math.min(r.width / 2, 120), clientY: r.top }; })();
    setTip({ ...t, x: Math.max(0, Math.min(at.clientX - b.left + 14, b.width - 230)), y: Math.max(0, at.clientY - b.top - 10) });
  };
  return (
    <figure className="mo-chart">
      <figcaption className="mo-chart-title">{title}</figcaption>
      {legend ? <p className="mo-legend">{legend.map(l => <span key={l.name}><i style={{ background: l.color }} />{l.name}</span>)}</p> : null}
      <div className="mo-plot" ref={box} onPointerLeave={() => setTip(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>{children(show)}</svg>
        {tip ? (
          <div className="mo-tip" style={{ left: tip.x, top: tip.y }} role="status">
            <p className="mo-tip-title">{tip.title}</p>
            {tip.lines.map(l => <p key={l.name} className="mo-tip-line"><i style={{ background: l.color }} /><b>{l.value}</b><span>{l.name}</span></p>)}
          </div>
        ) : null}
      </div>
      {note ? <p className="mo-note">{note}</p> : null}
    </figure>
  );
}

export type Period = { label: string; audited: boolean; revenue: number; compute: number; other: number };

/**
 * Revenue against operating costs, one pair of columns per period: revenue, and the costs stacked as computing and
 * everything else. Full years and half years are two panels on one scale, so a half year is never read as a year;
 * side by side on a wide screen, one above the other on a narrow one.
 */
export function CostChart({ periods, labelled }: { periods: Period[]; labelled: string[] }) {
  const [box, W] = useWidth();
  const narrow = W < NARROW;
  const L = 44, R = 6, T = 30, PH = narrow ? 180 : 254, XL = 30, GAP = 46;
  const max = Math.ceil(Math.max(...periods.map(p => Math.max(p.revenue, p.compute + p.other))) / 5000) * 5000;
  const full = periods.filter(p => p.label.length === 4), half = periods.filter(p => p.label.length !== 4);
  const gap = 34, inner = W - L - R - gap;
  const panels = narrow
    ? [{ name: 'Full years · audited', items: full, x0: L, w: W - L - R, top: T }, { name: 'January to June · not audited', items: half, x0: L, w: W - L - R, top: T + PH + XL + GAP }]
    : [{ name: 'Full years · audited', items: full, x0: L, w: (inner * full.length) / periods.length, top: T }, { name: 'January to June · not audited', items: half, x0: L + (inner * full.length) / periods.length + gap, w: (inner * half.length) / periods.length, top: T }];
  const H = panels[panels.length - 1].top + PH + XL;
  const col = narrow ? 18 : 22, pair = col * 2 + 2;
  const ticks = Array.from({ length: max / 5000 + 1 }, (_, i) => i * 5000);
  const legend = [{ name: 'Revenue', color: C.revenue }, { name: 'Compute and infrastructure', color: C.compute }, { name: 'All other operating costs', color: C.other }];
  return (
    <Frame box={box} title="Revenue against operating costs" legend={legend} note="Costs are the filing’s operating expenses; the other costs are personnel, sales and marketing, administration and, in 2025, a $1.5 billion legal settlement." width={W} height={H} label="Revenue against operating costs, by period">
      {show => (
        <>
          {panels.map((panel, k) => {
            const y = (v: number) => panel.top + PH * (1 - v / max);
            const axis = narrow || k === 0;
            return (
              <g key={panel.name}>
                {ticks.map(t => (
                  <g key={t}>
                    <line x1={axis ? L : panel.x0 - 8} x2={panel.x0 + panel.w} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth={1} />
                    {axis ? <text x={L - 8} y={y(t) + 4} textAnchor="end" className="mo-tick">{t === 0 ? '$0' : `$${t / 1000}B`}</text> : null}
                  </g>
                ))}
                <line x1={axis ? L : panel.x0 - 8} x2={panel.x0 + panel.w} y1={y(0)} y2={y(0)} stroke={C.axis} strokeWidth={1} />
                <text x={panel.x0} y={panel.top - 16} className="mo-panel">{panel.name}</text>
                {panel.items.map((p, i) => {
                  const cx = panel.x0 + (panel.w * (i + 0.5)) / panel.items.length;
                  const x = cx - pair / 2;
                  const cost = p.compute + p.other;
                  const tip = (e: { clientX: number; clientY: number } | null, el?: Element) =>
                    show(e, { title: p.label, lines: [{ name: 'Revenue', value: amount(p.revenue), color: C.revenue }, { name: 'Compute and infrastructure', value: amount(p.compute), color: C.compute }, { name: 'All other operating costs', value: amount(p.other), color: C.other }, { name: 'Operating costs in all', value: amount(cost), color: C.total }] }, el);
                  const yCompute = y(p.compute);
                  return (
                    <g key={p.label}>
                      <path d={bar(x, y(p.revenue), col, y(0) - y(p.revenue), 'top')} fill={C.revenue} />
                      <path d={p.other > 0 ? `M${x + col + 2},${y(0)}V${yCompute}H${x + col + 2 + col}V${y(0)}Z` : bar(x + col + 2, yCompute, col, y(0) - yCompute, 'top')} fill={C.compute} />
                      {p.other > 0 ? <path d={bar(x + col + 2, y(cost), col, Math.max(0, yCompute - y(cost) - 2), 'top')} fill={C.other} /> : null}
                      {labelled.includes(p.label) ? (
                        <>
                          <text x={x - 6} y={y(p.revenue) + 10} textAnchor="end" className="mo-value">{billions(p.revenue)}</text>
                          <text x={x + col + 2 + col / 2} y={y(cost) - 6} textAnchor="middle" className="mo-value">{billions(cost)}</text>
                        </>
                      ) : null}
                      <text x={cx} y={y(0) + 18} textAnchor="middle" className="mo-xlabel">{p.label}</text>
                      <rect x={x - 8} y={panel.top} width={pair + 16} height={PH} fill="transparent" tabIndex={0} aria-label={`${p.label}: revenue ${amount(p.revenue)}, operating costs ${amount(cost)}`}
                        onPointerMove={e => tip(e)} onFocus={e => tip(null, e.currentTarget)} onBlur={() => show(null, null)} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </>
      )}
    </Frame>
  );
}

export type Step = { label: string; full: string; value: number; tone: 'other' | 'compute' | 'revenue' | 'total' };

/** A loss taken apart: each line of the income statement moves the running total, and the last bar is where it ends.
 *  The amounts sit in their own column at the right, so a long bar never runs into its label; on a narrow screen each
 *  line's name and amount sit above its bar. */
export function Waterfall({ title, steps, note }: { title: string; steps: Step[]; note?: ReactNode }) {
  const [box, W] = useWidth();
  const narrow = W < NARROW;
  const row = narrow ? 50 : 38, T = 8, L = narrow ? 2 : 214, R = narrow ? 2 : 108, barY = narrow ? 18 : 0, H = T + steps.length * row + 26;
  let run = 0;
  const spans = steps.map(s => {
    if (s.tone === 'total') return { ...s, from: 0, to: s.value };
    const from = run; run += s.value; return { ...s, from, to: run };
  });
  const lo = Math.min(0, ...spans.map(s => Math.min(s.from, s.to))), hi = Math.max(0, ...spans.map(s => Math.max(s.from, s.to)));
  const x = (v: number) => L + ((W - L - R) * (v - lo)) / (hi - lo);
  const color = { other: C.other, compute: C.compute, revenue: C.revenue, total: C.total };
  const say = (s: Step) => `${s.value < 0 ? '−' : '+'}${amount(s.value)}`;
  return (
    <Frame box={box} title={title} note={note} width={W} height={H} label={title}>
      {show => (
        <>
          {narrow ? null : <line x1={x(0)} x2={x(0)} y1={T - 4} y2={H - 22} stroke={C.axis} strokeWidth={1} />}
          <text x={x(0)} y={H - 6} textAnchor={narrow ? 'end' : 'middle'} className="mo-tick">$0</text>
          {spans.map((s, i) => {
            const a = Math.min(x(s.from), x(s.to)), w = Math.max(1.5, Math.abs(x(s.to) - x(s.from)));
            const yy = T + i * row + 8, by = yy + barY;
            const loss = s.to < s.from || (s.tone === 'total' && s.value < 0);
            const strong = s.tone === 'total' ? ' mo-strong' : '';
            const tip = { title: s.full, lines: [{ name: s.tone === 'total' ? 'the result' : s.value < 0 ? 'adds to the loss' : 'reduces the loss', value: say(s), color: color[s.tone] }] };
            return (
              <g key={s.label}>
                {i > 0 && s.tone !== 'total' ? <line x1={x(s.from)} x2={x(s.from)} y1={by - row + 20} y2={by} stroke={C.axis} strokeWidth={1} strokeDasharray="2 2" /> : null}
                {s.tone === 'total' ? <line x1={narrow ? 0 : L} x2={W} y1={yy - 9} y2={yy - 9} stroke={C.axis} strokeWidth={1} /> : null}
                <text x={narrow ? 0 : L - 12} y={narrow ? yy + 6 : yy + 14} textAnchor={narrow ? 'start' : 'end'} className={`mo-rowlabel${strong}`}>{s.label}</text>
                <path d={bar(a, by, w, narrow ? 18 : 20, loss ? 'left' : 'right')} fill={color[s.tone]} />
                {narrow ? <line x1={x(0)} x2={x(0)} y1={by - 3} y2={by + 21} stroke={C.axis} strokeWidth={1} /> : null}
                <text x={W - 2} y={narrow ? yy + 6 : yy + 14} textAnchor="end" className={`mo-value${strong}`}>{say(s)}</text>
                <rect x={0} y={yy - 8} width={W} height={row} fill="transparent" tabIndex={0} aria-label={`${s.full}: ${s.value < 0 ? 'minus ' : ''}${amount(s.value)}`}
                  onPointerMove={e => show(e, tip)} onFocus={e => show(null, tip, e.currentTarget)} onBlur={() => show(null, null)} />
              </g>
            );
          })}
        </>
      )}
    </Frame>
  );
}

export type Commitment = { name: string; from: string; to: string; amount: string; detail: string; page: string; estimate?: boolean };

/** What a company has promised to spend, as bars across the years each promise runs. */
export function Timeline({ items, now, note }: { items: Commitment[]; now: string; note?: ReactNode }) {
  const [box, W] = useWidth();
  const narrow = W < NARROW;
  const row = narrow ? 50 : 40, T = narrow ? 38 : 30, L = narrow ? 2 : 150, R = narrow ? 2 : 124, barY = narrow ? 14 : 0, H = T + items.length * row + 8;
  const year = (d: string) => Number(d.slice(0, 4)) + (Number(d.slice(5, 7) || '1') - 1) / 12;
  // A term runs to the end of its last month: "between November 2026 and May 2033" includes May.
  const end = (d: string) => year(d) + 1 / 12;
  const lo = Math.floor(Math.min(...items.map(i => year(i.from)))), hi = Math.ceil(Math.max(...items.map(i => end(i.to))));
  const x = (v: number) => L + ((W - L - R) * (v - lo)) / (hi - lo);
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter(t => (t - lo) % 2 === 0);
  const legend = [{ name: 'Committed, “regardless of actual usage”', color: C.compute }, { name: 'No fixed amount: the filing’s estimate, outside its commitments table', color: C.other }];
  return (
    <Frame box={box} title="Computing commitments, by agreement and the years they run" legend={legend} note={note} width={W} height={H} label="Computing commitments by agreement and years">
      {show => (
        <>
          {ticks.map(t => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={T - 10} y2={H - 6} stroke={C.grid} strokeWidth={1} />
              <text x={x(t)} y={12} textAnchor={narrow && t === lo ? 'start' : narrow && x(t) > W - 20 ? 'end' : 'middle'} className="mo-tick">{t}</text>
            </g>
          ))}
          <line x1={x(year(now))} x2={x(year(now))} y1={T - 10} y2={H - 6} stroke={C.axis} strokeWidth={1} />
          <text x={x(year(now)) + 4} y={narrow ? 27 : T - 2} className="mo-tick">filed</text>
          {items.map((it, i) => {
            const yy = T + i * row + 6, by = yy + barY, a = x(year(it.from)), b = x(end(it.to));
            const tip = { title: it.name, lines: [{ name: `${it.detail} · page ${it.page}`, value: it.amount, color: it.estimate ? C.other : C.compute }] };
            return (
              <g key={it.name}>
                <text x={narrow ? 0 : L - 12} y={narrow ? yy + 6 : yy + 14} textAnchor={narrow ? 'start' : 'end'} className="mo-rowlabel">{it.name}</text>
                <path d={bar(a, by, b - a, narrow ? 18 : 20, 'both')} fill={it.estimate ? C.other : C.compute} />
                <text x={narrow ? W - 2 : b + 8} y={narrow ? yy + 6 : yy + 14} textAnchor={narrow ? 'end' : 'start'} className="mo-value">{it.amount}</text>
                <rect x={0} y={yy - 8} width={W} height={row} fill="transparent" tabIndex={0} aria-label={`${it.name}: ${it.amount}, ${it.detail}`}
                  onPointerMove={e => show(e, tip)} onFocus={e => show(null, tip, e.currentTarget)} onBlur={() => show(null, null)} />
              </g>
            );
          })}
        </>
      )}
    </Frame>
  );
}
