import type { Evidence } from './types';
import { COMPANIES, CONTEXT, MEETINGS } from './companies';
import { LAYERS } from './index';

export type Located = { where: string; e: Evidence; side: 'since' | 'before' | 'statement' | 'meeting' | 'context' };

/** Every piece of evidence the tracker shows, with where it appears. The verifier and the tests walk this list. */
export function allEvidence(): Located[] {
  const out: Located[] = [];
  for (const c of COMPANIES) {
    for (const layer of LAYERS) {
      for (const e of c.cells[layer].since) out.push({ where: `${c.id}/${layer}/since`, e, side: 'since' });
      for (const e of c.cells[layer].before) out.push({ where: `${c.id}/${layer}/before`, e, side: 'before' });
    }
    for (const e of c.accordStatements) out.push({ where: `${c.id}/statements`, e, side: 'statement' });
  }
  for (const e of MEETINGS.evidence) out.push({ where: 'meetings', e, side: 'meeting' });
  for (const e of MEETINGS.statements ?? []) out.push({ where: 'meetings/statements', e, side: 'statement' });
  for (const item of CONTEXT.items) for (const e of item.evidence) out.push({ where: `context/${item.id}`, e, side: 'context' });
  return out;
}
