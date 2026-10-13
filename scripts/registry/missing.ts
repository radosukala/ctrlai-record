/**
 * The registry's backlog: people and organizations in the Base with no registry record yet, newest first. The weekly
 * registry update (an agent proposes, Wikidata or the source confirms) works from this list.
 *
 *   npx tsx scripts/registry/missing.ts
 */
import { ENTRIES, PEOPLE } from '../../content/base';
import { REGISTRY, orgOf } from '../../content/registry';

const known = new Set(REGISTRY.flatMap(r => [r.id, ...(r.aliasIds ?? [])]));
const people = PEOPLE.filter(p => !known.has(p.id)).map(p => ({ p, last: p.titles[0]?.on ?? '' })).sort((a, b) => b.last.localeCompare(a.last));
const orgs = [...new Set(ENTRIES.flatMap(e => e.orgs))].filter(o => !orgOf(o)).sort();
console.log(`${people.length} of ${PEOPLE.length} people have no registry record:`);
for (const { p } of people) console.log(`  ${p.id}  ${p.name}  ${p.titles.map(t => t.title).filter(Boolean).slice(0, 2).join(' | ')}`);
console.log(`\n${orgs.length} organizations named in entries are not in the registry:\n  ${orgs.join(' ')}`);
