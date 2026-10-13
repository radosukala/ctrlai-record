import orgsJson from './orgs.json';
import partiesJson from './parties.json';
import peopleJson from './people.json';
import type { Group, Membership, Org, OrgKind, Party, PersonRecord } from './types';

export const ORGS = orgsJson as Org[];
export const PARTIES = partiesJson as Party[];
export const REGISTRY = peopleJson as PersonRecord[];

const ORG = new Map<string, Org>();
for (const o of ORGS) { ORG.set(o.id, o); for (const a of o.aliases ?? []) ORG.set(a, o); }
const PARTY = new Map(PARTIES.map(p => [p.id, p]));
const PERSON = new Map(REGISTRY.map(p => [p.id, p]));

/** An organization by its id or any alias the Base has used for it. */
export const orgOf = (id: string) => ORG.get(id);
export const partyOf = (id: string) => PARTY.get(id);
/** A party's name for display, without the country Wikidata adds in brackets: "Republican Party (United States)" →
 *  "Republican Party". The country is shown with the role. */
export const partyName = (p: Party) => p.name.replace(/\s*\([^)]*\)\s*$/, '');
export const recordOf = (id: string) => PERSON.get(id);

/** Dates as precise as the source: compare YYYY, YYYY-MM and YYYY-MM-DD on the same footing. */
const start = (d?: string) => (d ? (d + '-01-01').slice(0, 10) : '0000-01-01');
const end = (d?: string) => (d ? (d.length === 4 ? `${d}-12-31` : d.length === 7 ? `${d}-31` : d) : '9999-12-31');

/** A founder role alone is history, not a job: a founder who still works there has a current role beside it. */
const FOUNDER_ONLY = /^(co-?)?founder$/i;

/** The memberships active on a date: started by then, not ended before it, and not a bare founder role. A membership
 *  that has ended at an unknown date (`ended`) counts as ended. */
export function membershipsAt(id: string, date: string): Membership[] {
  const p = PERSON.get(id);
  if (!p) return [];
  return p.memberships.filter(m => !m.ended && !FOUNDER_ONLY.test(m.role.trim()) && start(m.from) <= date && end(m.to) >= date);
}

const BY_KIND: Partial<Record<OrgKind, Group>> = {
  'university': 'academic', 'research-nonprofit': 'nonprofit-researcher', 'think-tank': 'think-tank', 'advocacy': 'advocate',
  'tech-company': 'tech-industry', 'company': 'business', 'investor': 'investor', 'civil-society': 'civil-society',
  'media': 'journalist', 'regulator': 'regulator', 'international': 'international-official', 'court': 'government-official',
};
/** Precedence when someone belongs to several groups at once. */
export const GROUP_ORDER: Group[] = [
  'politician', 'government-official', 'regulator', 'international-official',
  'ai-developer-leader', 'ai-developer-staff', 'academic', 'nonprofit-researcher', 'think-tank', 'advocate',
  'tech-industry', 'business', 'investor', 'civil-society', 'journalist', 'former-ai-developer-staff', 'other',
];

function groupOf(m: Membership): Group {
  const kind = orgOf(m.org)?.kind ?? 'other';
  if (kind === 'legislature') return 'politician';
  if (kind === 'government') return m.party ? 'politician' : 'government-official';
  if (kind === 'ai-developer') return m.leadership ? 'ai-developer-leader' : 'ai-developer-staff';
  return BY_KIND[kind] ?? 'other';
}

/**
 * Which group someone spoke as, on a date: from their memberships active that day, in the order of precedence above.
 * With none active, someone who has left an AI developer counts as former staff; otherwise their stated occupation, or
 * 'other'. Unknown people are 'other'.
 */
export function groupAt(id: string, date: string): Group {
  const active = membershipsAt(id, date).map(groupOf);
  if (active.length) return GROUP_ORDER.find(g => active.includes(g))!;
  const p = PERSON.get(id);
  if (p?.memberships.some(m => orgOf(m.org)?.kind === 'ai-developer' && (m.ended || end(m.to) < date))) return 'former-ai-developer-staff';
  return p?.occupation ?? 'other';
}

/** The party someone sat for on a date, when they held elected office then. */
export function partyAt(id: string, date: string): Party | undefined {
  const m = membershipsAt(id, date).find(x => x.party);
  return m?.party ? PARTY.get(m.party) : undefined;
}

export const GROUP_LABEL: Record<Group, string> = {
  'politician': 'Politician',
  'government-official': 'Government official',
  'regulator': 'Regulator',
  'international-official': 'International official',
  'ai-developer-leader': 'AI company leader',
  'ai-developer-staff': 'AI company staff',
  'former-ai-developer-staff': 'Former AI company staff',
  'academic': 'Academic',
  'nonprofit-researcher': 'Nonprofit researcher',
  'think-tank': 'Think tank',
  'advocate': 'Advocate',
  'tech-industry': 'Tech industry',
  'business': 'Business',
  'investor': 'Investor',
  'civil-society': 'Civil society',
  'journalist': 'Journalist or commentator',
  'other': 'Other',
};
