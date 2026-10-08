import { AGENT_BY_ID } from '@/content/incidents/openai-hf';
import { ORG, type OrgBox } from '@/content/incidents/openai-hf/film';
import { clamp, ramp, smoother } from './math';

/**
 * Who organised whom. Drawn from the reconstruction's cast: each box is an agent (its handle exactly as the sources write it, and
 * what it did in plain words from the cast's); the arrows are the links the sources record (a hand-over, and PHASEONE[big] assigning
 * agents to METR's three approaches). The agents under each approach are shown in a frame, not joined by lines: the grouping is ours,
 * from the section of METR's account each agent's work is described in, and no source says one handed anything to another. It builds
 * up as the film talks about each part. Where a box stands is drawing, not data.
 */
const BOX = Object.fromEntries(ORG.boxes.map(b => [b.id, b]));
const pop = (t: number, at: number, over = 0.7) => smoother(ramp(t, at, at + over));
/** The frame round an approach and the agents under it. */
const COLUMNS = ORG.boxes.filter(b => b.kind === 'approach').map(a => {
  const members = ORG.boxes.filter(b => b.kind === 'agent' && Math.abs(b.x - a.x) < 2 && b.y > a.y);
  const last = Math.max(...members.map(m => m.y));
  return { a, top: a.y - 7, height: last + 11 - (a.y - 7) };
});

/** How much of the chart shows: it comes up at the start of each window the script gives it and goes down at the end. */
const showAt = (t: number) => Math.max(0, ...ORG.windows.map(([t0, t1]) => smoother(ramp(t, t0 - 0.2, t0 + 0.6)) * (1 - smoother(ramp(t, t1 - 0.8, t1)))));

/**
 * How a link is drawn. Side by side: a straight line from the edge of one box to the edge of the next. Otherwise out of the foot of the
 * upper box, along a bar, and down into the head of the lower one, so a line never crosses the words and several links share one stem.
 */
function route(f: OrgBox, g: OrgBox): { d: string; head: [number, number]; down: boolean } {
  if (Math.abs(g.y - f.y) < 1) {
    const x1 = f.x + (g.x > f.x ? 15 : -15), x2 = g.x - (g.x > f.x ? 15 : -15);
    return { d: `M ${x1} ${f.y} L ${x2} ${g.y}`, head: [x2, g.y], down: false };
  }
  const y1 = f.y + 8, y2 = g.y - 5.5, bar = y1 + (y2 - y1) * 0.5;
  return { d: `M ${f.x} ${y1} V ${bar} H ${g.x} V ${y2}`, head: [g.x, y2], down: true };
}

export function OrgChart({ t }: { t: number }) {
  const show = showAt(t);
  if (show <= 0.01) return null;
  const foot = pop(t, BOX.replace.t + 1, 1);
  return (
    <div className="film-org" style={{ opacity: show }} role="img" aria-label="Who organised whom: PHASEONE10841 handed its notes to PHASEONE[big], which assigned agents to three approaches to getting a passing score on impossible tasks. The agents shown under each approach are grouped by us.">
      {COLUMNS.map(c => {
        const k = pop(t, c.a.t);
        return k > 0.01 ? <div key={c.a.id} className="film-org-col" style={{ left: `${c.a.x - 16.5}%`, width: '33%', top: `${c.top}%`, height: `${c.height}%`, opacity: k }} /> : null;
      })}
      <svg className="film-org-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {ORG.arrows.map(a => {
          const f = BOX[a.from], g = BOX[a.to];
          const p = pop(t, a.t, 1.2);
          if (p <= 0.001) return null;
          const { d } = route(f, g);
          return <path key={`${a.from}>${a.to}`} d={d} style={{ opacity: p }} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      {ORG.arrows.map(a => {
        const f = BOX[a.from], g = BOX[a.to];
        const p = pop(t, a.t + 0.3, 0.8);
        if (p <= 0.01) return null;
        const { head, down } = route(f, g);
        return <span key={`h${a.from}>${a.to}`} className="film-org-head" style={{ left: `${head[0]}%`, top: `${head[1]}%`, opacity: p }}>{down ? '▾' : '▸'}</span>;
      })}
      {ORG.arrows.filter(a => a.note).map(a => {
        const f = BOX[a.from], g = BOX[a.to];
        const k = pop(t, a.t + 0.5, 0.8);
        if (k <= 0.01) return null;
        const level = Math.abs(g.y - f.y) < 1;
        const bar = f.y + 8 + (g.y - 5.5 - (f.y + 8)) * 0.5;
        return <span key={`n${a.from}>${a.to}`} className="film-org-note" style={{ left: `${(f.x + g.x) / 2}%`, top: `${level ? f.y - 5 : bar}%`, opacity: k }}>{a.note}</span>;
      })}
      {ORG.boxes.map(b => {
        const k = pop(t, b.t);
        if (k <= 0.01) return null;
        const pos = { left: `${b.x}%`, top: `${b.y}%`, opacity: k, transform: `translate(-50%, calc(-50% + ${(1 - k) * 6}px))` };
        if (b.kind === 'approach') return <div key={b.id} className="film-org-approach" style={pos}>{b.label}</div>;
        const a = AGENT_BY_ID[b.id];
        return (
          <div key={b.id} className="film-org-box" style={pos}>
            <i className="film-org-room" aria-hidden="true" />
            <span className="film-org-handle">{b.id}</span>
            <span className="film-org-role">{b.tag ?? a?.role ?? ''}</span>
          </div>
        );
      })}
      {foot > 0.01 ? <p className="film-org-foot" style={{ opacity: foot }}>{ORG.note}</p> : null}
    </div>
  );
}

export const orgVisible = (t: number) => ORG.windows.some(([t0, t1]) => clamp(ramp(t, t0 - 0.2, t0 + 0.6)) > 0 && t < t1);
