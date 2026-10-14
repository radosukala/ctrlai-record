/**
 * A stand-in for the network in the parliament tests, answering from tests/fixtures/parliament/. The fixtures are real
 * answers from the two parliaments' APIs (UK Hansard and Members API, the European Parliament's open data API), chosen and
 * trimmed, never written by hand: rows are picked whole; the only edits are to a result count when a page was cut short,
 * and the dropping of Members API fields the code never reads. Asking for anything a test did not plan for is an error.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Source } from '../../scripts/radar/feeds';
import { EP_API, HANSARD_API, MEMBERS_API, type Getter, type MemberHistory } from '../../scripts/radar/parliament';

export const fx = (name: string) => readFileSync(path.join(__dirname, '..', 'fixtures', 'parliament', name), 'utf8');
export const fxJson = <T>(name: string) => JSON.parse(fx(name)) as T;

export const COMMONS: Source = { id: 'uk-house-of-commons-hansard', name: 'UK House of Commons (Hansard)', kind: 'parliament', url: HANSARD_API, house: 'Commons', tier: 1, filter: 'ai' };
export const LORDS: Source = { ...COMMONS, id: 'uk-house-of-lords-hansard', name: 'UK House of Lords (Hansard)', house: 'Lords' };
export const EUROPARL: Source = { id: 'european-parliament-plenary', name: 'European Parliament plenary', kind: 'parliament', url: EP_API, tier: 1, filter: 'ai' };

/** Answers a request with a body, or returns undefined to leave it to the next route. */
export type Route = (u: URL) => string | undefined;

/** A network that answers from routes and remembers what it was asked. */
export function net(...routes: Route[]) {
  const calls: URL[] = [];
  const get: Getter = async url => {
    const u = new URL(url);
    calls.push(u);
    for (const r of routes) { const body = r(u); if (body !== undefined) return body; }
    throw new Error(`unexpected request: ${url}`);
  };
  return { get, calls };
}

/** The Members API: only the members asked for, and no more than 20 at a time, as the real one insists. */
export const membersRoute: Route = u => {
  if (u.origin !== MEMBERS_API || u.pathname !== '/api/Members/History') return undefined;
  const ids = u.searchParams.getAll('ids').map(Number);
  if (ids.length > 20) throw new Error('HTTP 400 from members-api.parliament.uk: "Maximum of 20 Members permitted per call"');
  return JSON.stringify(fxJson<{ value: MemberHistory }[]>('members-history.json').filter(m => ids.includes(m.value.id)));
};

export const history = (id: number) => fxJson<{ value: MemberHistory }[]>('members-history.json').find(m => m.value.id === id)?.value;
export const members = () => new Map(fxJson<{ value: MemberHistory }[]>('members-history.json').map(m => [m.value.id, m.value]));

/** A Hansard search for a word in one house. */
export const hansardSearch = (endpoint: string, house: string, term: string, body: string): Route => u =>
  u.origin === HANSARD_API && u.pathname === `/search/${endpoint}` && u.searchParams.get('queryParameters.house') === house && u.searchParams.get('queryParameters.searchTerm') === term ? body : undefined;

const EP_ORIGIN = new URL(EP_API).origin;
/** A request to the European Parliament's API for a path, when the predicate holds. */
export const epRoute = (pathname: string, pred: (u: URL) => boolean, body: string): Route => u =>
  u.origin === EP_ORIGIN && u.pathname === `/api/v2${pathname}` && pred(u) ? body : undefined;
export const searching = (term: string) => (u: URL) => u.searchParams.get('text') === term;

export const flatWs = (s: string) => s.replace(/\s+/g, ' ').trim();
/** The words inside “…” in an excerpt, without the “…” that marks a cut. */
export const snippets = (excerpt: string) => [...excerpt.matchAll(/“([^”]+)”/g)].map(m => flatWs(m[1]).replace(/^…\s*|\s*…$/g, ''));
