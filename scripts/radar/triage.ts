/**
 * Turns a triage plan into the run's triage.json, and records every other candidate as skipped, with a reason. The plan is
 * a small file the run writes (with the Write tool, so no shell command is needed); the numbers are the candidate
 * numbers printed at the start of the run (a line's position in candidates.jsonl).
 *
 *   npx tsx scripts/radar/triage.ts RUN_DIR PLAN.json
 *
 * PLAN.json:
 *   { "deep":  { "D1": [ { "main": 81, "also": [48, 54] }, { "main": 20 } ], "D2": [ … ] },
 *     "light": { "L1": [ 99, 56, { "main": 61, "also": [62] } ], "L2": [ … ] },
 *     "skip":  { "default": "not about AI safety, control, governance, work or rights", "12": "a markets segment" } }
 *
 * - Deep: at most 4 groups to a key. Light: at most 30 items to a key. A group has one `main` and any `also` (other
 *   coverage of the same story); the `also` items are recorded as handled ("covered by …"), so a later run does not offer them.
 * - An existing triage.json is kept beside the new one as triage.HHMMSS.json; skipped.txt is only ever appended to.
 * - Every number must exist and be used once. Nothing is written if the plan has a problem.
 */
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Item = { id: string; title?: string };
type Group = { main: number; also?: number[] };
type Plan = { deep?: Record<string, Group[]>; light?: Record<string, (number | Group)[]>; skip?: Record<string, string> };

export function buildTriage(items: Item[], plan: Plan, run: string): { triage: object; skipped: string[]; problems: string[] } {
  const problems: string[] = [];
  const used = new Map<number, string>();
  const take = (n: unknown, where: string): Item | undefined => {
    if (!Number.isInteger(n) || (n as number) < 0 || (n as number) >= items.length) { problems.push(`${where}: ${String(n)} is not a candidate number (0–${items.length - 1})`); return undefined; }
    if (used.has(n as number)) problems.push(`${where}: candidate ${n} is already used in ${used.get(n as number)}`);
    used.set(n as number, where);
    return items[n as number];
  };
  const group = (g: Group | number, where: string) => {
    const gg: Group = typeof g === 'number' ? { main: g } : g;
    const main = take(gg.main, where);
    const also = (gg.also ?? []).map((n, i) => take(n, `${where} also[${i}]`)).filter((x): x is Item => !!x);
    return main ? { main, also } : undefined;
  };
  const deep: Record<string, unknown[]> = {};
  for (const [key, groups] of Object.entries(plan.deep ?? {})) {
    if (groups.length > 4) problems.push(`deep ${key}: ${groups.length} groups; at most 4 to a key`);
    deep[key] = groups.map((g, i) => group(g, `deep ${key}[${i}]`)).filter(Boolean) as unknown[];
  }
  const light: Record<string, unknown[]> = {};
  for (const [key, list] of Object.entries(plan.light ?? {})) {
    if (list.length > 30) problems.push(`light ${key}: ${list.length} items; at most 30 to a key`);
    light[key] = list.map((g, i) => {
      const r = group(g, `light ${key}[${i}]`);
      return r && !r.also.length ? r.main : r;   // a lone item stays a flat item, as the runbook's format has it
    }).filter(Boolean) as unknown[];
  }
  const reasons = plan.skip ?? {};
  const fallback = reasons.default ?? 'not about AI safety, control, governance, work or rights';
  const skipped: string[] = [];
  const coveredBy = new Map<number, number>();
  for (const g of [...Object.values(plan.deep ?? {}).flat(), ...Object.values(plan.light ?? {}).flat()]) {
    if (typeof g === 'object') for (const a of g.also ?? []) coveredBy.set(a, g.main);
  }
  items.forEach((it, i) => {
    if (coveredBy.has(i)) skipped.push(`${it.id} covered by the entry for ${items[coveredBy.get(i)!]?.id}`);
    else if (!used.has(i)) skipped.push(`${it.id} ${reasons[String(i)] ?? fallback}`);
  });
  return { triage: { run, deep, light }, skipped, problems };
}

if (process.argv[1]?.endsWith('triage.ts')) {
  const [dir, planFile] = process.argv.slice(2);
  if (!dir || !planFile) { console.error('usage: triage.ts RUN_DIR PLAN.json'); process.exit(2); }
  const items = readFileSync(join(dir, 'candidates.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Item);
  const plan = JSON.parse(readFileSync(planFile, 'utf8')) as Plan;
  const run = dir.replace(/\/+$/, '').split('/').pop()!;
  const { triage, skipped, problems } = buildTriage(items, plan, run);
  if (problems.length) { for (const p of problems) console.error('PROBLEM ' + p); console.error('Nothing written.'); process.exit(1); }
  const out = join(dir, 'triage.json');
  if (existsSync(out)) renameSync(out, join(dir, `triage.${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.json`));
  writeFileSync(out, JSON.stringify(triage, null, 1) + '\n');
  appendFileSync(join(dir, 'skipped.txt'), skipped.join('\n') + (skipped.length ? '\n' : ''));
  const t = triage as { deep: Record<string, unknown[]>; light: Record<string, unknown[]> };
  console.log(`triage.json written: ${Object.values(t.deep).flat().length} deep groups, ${Object.values(t.light).flat().length} light items; ${skipped.length} recorded as skipped or covered.`);
}
