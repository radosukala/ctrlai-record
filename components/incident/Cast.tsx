'use client';

import { useRef, useState } from 'react';
import { AGENTS, AGENT_BY_ID, GROUPS, LINKS, QUOTE_BY_ID, formatWhen, type AgentGroup, type LinkKind } from '@/content/incidents/openai-hf';
import { Cites, QuoteView } from './parts';

const TREE_KINDS: LinkKind[] = ['handoff', 'assigned', 'recruited', 'asked', 'influenced'];
const EDGE: Record<LinkKind, string> = {
  handoff: 'handed its notes to',
  assigned: 'assigned',
  recruited: 'recruited',
  pressured: 'pressed',
  reproduced: 'reproduced by',
  influenced: 'led to',
  asked: 'asked',
  coordinated: 'coordinated with',
};

function kids(id: string) {
  return LINKS.filter(l => l.from === id && TREE_KINDS.includes(l.kind));
}

function Node({ id, edge, sel, pick, seen }: { id: string; edge?: string; sel: string; pick: (id: string) => void; seen: Set<string> }) {
  const a = AGENT_BY_ID[id];
  if (!a || seen.has(id)) return null;
  const next = new Set(seen).add(id);
  const children = kids(id);
  return (
    <li className="inc-tree-node">
      <div className="inc-tree-row">
        {edge ? <span className="inc-tree-edge">{edge}</span> : null}
        <button type="button" className={`inc-agent${sel === id ? ' is-sel' : ''}`} onClick={() => pick(id)} aria-pressed={sel === id}>
          <b>{a.id}</b>
          <small>{a.role}</small>
        </button>
      </div>
      {children.length ? (
        <ul>
          {children.map(l => <Node key={l.to} id={l.to} edge={EDGE[l.kind]} sel={sel} pick={pick} seen={next} />)}
        </ul>
      ) : null}
    </li>
  );
}

export function Cast() {
  const [sel, setSel] = useState('PHASEONE[big]');
  const detail = useRef<HTMLDivElement>(null);
  // On a narrow screen the detail sits below the whole list, so bring it into view when something is tapped.
  const pick = (id: string) => {
    setSel(id);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 979px)').matches) {
      requestAnimationFrame(() => detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };
  const a = AGENT_BY_ID[sel];
  const rel = LINKS.filter(l => l.from === sel || l.to === sel);
  const quotes = (a.quotes ?? []).map(id => QUOTE_BY_ID[id]).filter(Boolean);
  const inTree = new Set<string>();
  (function walk(id: string) { inTree.add(id); for (const l of kids(id)) if (!inTree.has(l.to)) walk(l.to); })('PHASEONE10841');

  return (
    <div className="inc-cast">
      <div className="inc-cast-left">
        <h4 className="inc-side-title">Who handed what to whom</h4>
        <p className="inc-fine">We assembled this from METR’s account of who assigned, asked or handed work to whom. METR drew no such chart, and the agents had no org chart. Tap a name.</p>
        <ul className="inc-tree"><Node id="PHASEONE10841" sel={sel} pick={pick} seen={new Set()} /></ul>
        <h4 className="inc-side-title">The others, by what they worked on</h4>
        {(Object.keys(GROUPS) as AgentGroup[]).map(g => {
          const members = AGENTS.filter(x => x.group === g && !inTree.has(x.id));
          if (!members.length) return null;
          return (
            <div key={g} className="inc-lane">
              <p className="inc-lane-title"><b>{GROUPS[g].label}</b> <span>{GROUPS[g].blurb}</span></p>
              <p className="inc-lane-chips">
                {members.map(m => (
                  <button key={m.id} type="button" className={`inc-agent inc-agent-chip${sel === m.id ? ' is-sel' : ''}`} onClick={() => pick(m.id)} aria-pressed={sel === m.id}>
                    <b>{m.id}</b><small>{m.role}</small>
                  </button>
                ))}
              </p>
            </div>
          );
        })}
      </div>
      <div className="inc-cast-detail" aria-live="polite" ref={detail}>
        <p className="inc-cast-kicker">{GROUPS[a.group].label}</p>
        <h4 className="inc-cast-name">{a.id}</h4>
        <p className="inc-cast-role">{a.role}{a.first ? <span> · first documented {formatWhen(a.first)}</span> : null}</p>
        <p className="inc-cast-summary">{a.summary}</p>
        {rel.length ? (
          <ul className="inc-rel">
            {rel.map((l, k) => (
              <li key={k}>
                {l.from === sel ? <>{EDGE[l.kind]} <button type="button" className="text-button" onClick={() => pick(l.to)}>{l.to}</button></> : <><button type="button" className="text-button" onClick={() => pick(l.from)}>{l.from}</button> {EDGE[l.kind]} this agent</>}
                {l.note ? <small> {l.note}</small> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {quotes.length ? <div className="inc-cast-quotes">{quotes.map(q => <QuoteView key={q.id} q={q} compact />)}</div> : null}
        <p className="inc-now-cites"><Cites cites={a.cites} /></p>
        <p className="inc-cast-back"><a href="#cast">↑ Back to the list</a></p>
      </div>
    </div>
  );
}
