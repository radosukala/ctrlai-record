import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Source } from '../scripts/radar/feeds';
import { EP_API, HANSARD_API, MEMBERS_API, politeGetter, type HansardDebate } from '../scripts/radar/parliament';
import { epCreFromUrl, fetchEuroparlDebate, fetchHansardText, hansardDebateId, renderEuroparl, renderHansard, saveText, urlOf } from '../scripts/radar/parliament-text';
import { verifyQuote } from '../lib/verify-quote';
import { epRoute, fx, fxJson, members, membersRoute, net, type Route } from './helpers/parliament-net';

// The text of a debate, saved for a deep read. The fixtures are real answers from the two parliaments' APIs, chosen and
// trimmed, never written by hand (see tests/helpers/parliament-net.ts). The tests run offline.

const MEMBERS = members();
const LORDS_URL = 'https://hansard.parliament.uk/Lords/2026-09-15/debates/D23B986C-CA62-4620-A929-F93F4756BEA5/AIHumanExtinction';
const words = (s: string) => s.split(/\s+/).filter(Boolean);
/** What Hansard's markup comes to, worked out the plain way, to compare the saved words with. */
const rawWords = (value: string | null) => words((value ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'));
const headsOf = (text: string) => text.split('\n').filter(l => l.startsWith('>>'));
/** Everything below the five lines about the source: the words, without the lines that name the speakers. */
const speechWords = (text: string) => words(text.split('\n').slice(6).filter(l => !l.startsWith('>>')).join(' '));

// ---------------------------------------------------------------------------------------------------------------------
// UK Hansard
// ---------------------------------------------------------------------------------------------------------------------

test('a Hansard debate is saved with each speech under a line giving the speaker, the party that day and the member id', () => {
  const saved = renderHansard(fxJson<HansardDebate>('hansard-debate-lords-ai-extinction.json'), MEMBERS, LORDS_URL, '2026-10-13');
  const lines = saved.text.split('\n');
  assert.equal(lines[0], 'AI: Human Extinction');
  assert.equal(lines[1], 'UK Parliament, House of Lords, Lords Chamber: sitting of 2026-09-15.');
  assert.equal(lines[2], LORDS_URL);
  assert.match(lines[3], /Hansard last updated this text on 2026-09-30T14:04:31\.16\. Saved 2026-10-13\./);
  assert.match(lines[4], /^21 speeches by 11 members\./);

  const heads = headsOf(saved.text);
  assert.equal(heads[1], '>> Baroness Teather | party: Liberal Democrat | member 1170 | as printed: “Baroness Teather”.');
  assert.ok(heads.includes('>> Baroness Twycross | party: Labour | member 4966 | as printed: “The Parliamentary Secretary, Cabinet Office, and Parliamentary Under-Secretary of State, Department for Digital, Culture, Media and Sport (Baroness Twycross) (Lab)”.'));
  const speechHeads = heads.filter(h => h !== '>> [record].');
  assert.equal(speechHeads.length, 21);
  assert.equal(saved.speeches, 21);
  assert.equal(saved.speakers, 11);
  for (const h of speechHeads) assert.match(h, /^>> [^|]+ \| party: [^|]+ \| member \d+ \| as printed: “[^”]+”\.$/, h);
  assert.ok(!saved.text.includes('party: unknown'), 'every member of the debate is known to the Members API');
});

test('a saved Hansard debate has exactly the words of the record, in order: nothing added, dropped or reworded', () => {
  const deb = fxJson<HansardDebate>('hansard-debate-lords-ai-extinction.json');
  const saved = renderHansard(deb, MEMBERS, LORDS_URL, '2026-10-13');
  const record = deb.Items.filter(i => i.ItemType === 'Contribution' && i.HRSTag !== 'hs_ColumnNumber').flatMap(i => rawWords(i.Value));
  assert.deepEqual(speechWords(saved.text), record);
  assert.equal(saved.words, record.length);
  assert.ok(record.length > 1000);
  // Including the typographic apostrophe, untouched.
  assert.ok(saved.text.includes('To ask His Majesty’s Government what assessment they have made of the risk of AI causing human extinction within the next decade.'));
});

test('a quotation from a saved debate is checked like any other, and cannot run from one speech into the next', () => {
  const { text } = renderHansard(fxJson<HansardDebate>('hansard-debate-lords-ai-extinction.json'), MEMBERS, LORDS_URL, '2026-10-13');
  const check = (q: string) => verifyQuote(q, text, undefined, { sourceBrackets: true });
  const inside = check('My Lords, AI is advancing at an extraordinary pace, creating opportunities and risks that do not stop at national borders.');
  assert.equal(inside.ok, true);
  assert.equal(inside.ok && inside.leadIn, undefined, 'the line naming the speaker is not the lead-in to what they said');
  const across = check('the risk of AI causing human extinction within the next decade … My Lords, AI is advancing at an extraordinary pace');
  assert.equal(across.ok, false);
  assert.match(across.ok ? '' : across.reason, /change of speaker/);
});

test('words Hansard gives with no member continue the speech before them; what follows a speech in italics does not', () => {
  const courts = renderHansard(fxJson<HansardDebate>('hansard-debate-courts-excerpt.json'), MEMBERS, 'https://hansard.parliament.uk/Commons/2026-10-13/debates/0DDF8CB8-9185-4AE3-B47F-6120C460495A/CourtsAndTribunalsBill', '2026-10-13');
  assert.deepEqual(headsOf(courts.text).map(h => h.split(' | ')[0]), ['>> Sir Geoffrey Cox', '>> Sarah Sackman', '>> Caroline Nokes']);
  const sackman = courts.text.split('>> Sarah Sackman')[1].split('\n>> ')[0];
  assert.ok(sackman.includes('I do not accept the premise of that question.'));
  assert.ok(sackman.includes('There remains a strong case for judge-alone trials'), 'the next paragraphs are hers');
  assert.ok(sackman.includes('We are clear that reform must bring down delays'));
  assert.equal(courts.speeches, 3);

  const hall = renderHansard(fxJson<HansardDebate>('hansard-debate-rejoin-excerpt.json'), MEMBERS, 'https://hansard.parliament.uk/Commons/2026-10-12/debates/3E0103A6-35CB-40F7-8579-61E9B8FF3872/RejoiningTheEU', '2026-10-13');
  const heads = headsOf(hall.text);
  assert.deepEqual(heads.map(h => h.split(' | ')[0]), ['>> Tony Vaughan', '>> [record].', '>> Sir Edward Leigh', '>> Mr Paul Kohler', '>> Tony Vaughan', '>> [record].']);
  const record = (n: number) => hall.text.split('>> [record].')[n].split('\n>> ')[0].trim();
  assert.equal(record(1), 'Several hon. Members rose—');
  assert.equal(record(2), 'Question put and agreed to.\n\nResolved,\n\nThat this House has considered e-petition 749128 relating to the UK applying to rejoin the EU.\n\nSitting adjourned.', 'the closing lines are nobody’s speech, not the last member’s');
  const vaughan = hall.text.split('>> Tony Vaughan').pop()!.split('\n>> ')[0];
  assert.ok(vaughan.includes('I accept that this debate will not end today.'));
  assert.ok(!vaughan.includes('Question put and agreed to'), 'and not in the last speaker’s words');
  assert.match(heads[2], /party: Conservative \| member 345 \| as printed: “Sir Edward Leigh \(in the Chair\)”/, 'whoever is in the chair is named like anyone else');
});

test('markup inside a Hansard speech goes without taking a word with it: column markers, [Interruption.]', () => {
  const saved = renderHansard(fxJson<HansardDebate>('hansard-debate-intl-excerpt.json'), MEMBERS, 'https://hansard.parliament.uk/Commons/2026-10-12/debates/54FB2EDB-83AF-40FE-8A98-A914AD221CD7/InternationalUpdate', '2026-10-13');
  assert.ok(!/[<>]|column-number|<em>/.test(saved.text.split('\n').slice(5).filter(l => !l.startsWith('>>')).join('\n')));
  assert.ok(saved.text.includes('I thank my hon. Friend—[Interruption.] My apologies—my right hon. Friend.'));
  assert.ok(saved.text.includes('I welcome news of a better, stronger deal with Europe'), 'a column marker between two words leaves one space');
});

test('a Hansard debate is read from the API, its members looked up, and a failing Members API leaves parties unknown', async () => {
  const deb = fx('hansard-debate-lords-ai-extinction.json');
  const { get, calls } = net(u => (u.origin === HANSARD_API && u.pathname === '/debates/debate/D23B986C-CA62-4620-A929-F93F4756BEA5.json' ? deb : undefined), membersRoute);
  const saved = await fetchHansardText(LORDS_URL, get, '2026-10-13');
  assert.deepEqual(calls.map(u => u.pathname), ['/debates/debate/D23B986C-CA62-4620-A929-F93F4756BEA5.json', '/api/Members/History']);
  assert.equal(saved.speakers, 11);
  assert.deepEqual(saved.problems, []);
  assert.match(saved.what, /source=hansard house=Lords date=2026-09-15/);

  const failing = net(u => (u.pathname.startsWith('/debates/debate/') ? deb : undefined), u => { if (u.origin === MEMBERS_API) throw new Error('HTTP 503'); return undefined; });
  const without = await fetchHansardText(LORDS_URL, failing.get, '2026-10-13');
  assert.equal(without.problems.length, 1);
  assert.match(without.text, />> Baroness Teather \| party: unknown \| member 1170/, 'the name then is what the record printed');
  assert.match(without.text.split('\n>> ')[0], /\nNOTE: the Members API failed \(HTTP 503\): parties are marked unknown\.\n/, 'and the text itself says so, for the agent that reads only the text');
});

test('a debate more than twenty members spoke in is looked up in batches the API accepts', async () => {
  const many = fxJson<HansardDebate>('hansard-debate-lords-ai-extinction.json');
  // The same record with thirty more members' ids in it: only the number of ids matters to the batching.
  const extra = Array.from({ length: 30 }, (_, i) => ({ ...many.Items[4], ItemId: 9000 + i, OrderInSection: 100 + i, MemberId: 6000 + i, Value: 'Hear, hear!' }));
  const { get, calls } = net(u => (u.pathname.startsWith('/debates/debate/') ? JSON.stringify({ ...many, Items: [...many.Items, ...extra] }) : undefined), membersRoute);
  await fetchHansardText(LORDS_URL, get, '2026-10-13');
  const batches = calls.filter(u => u.pathname === '/api/Members/History').map(u => u.searchParams.getAll('ids').length);
  assert.deepEqual(batches, [20, 20, 1], '41 members: 20, 20 and 1');
});

// ---------------------------------------------------------------------------------------------------------------------
// European Parliament
// ---------------------------------------------------------------------------------------------------------------------

function europarlDebateNet(extra: Route[] = []) {
  return net(
    ...extra,
    epRoute('/events/MTG-PL-2026-10-06-PVCRE-ITM-16', () => true, fx('europarl-event-itm16.json')),
    epRoute('/speeches', u => u.searchParams.has('title'), fx('europarl-speeches-itm16.json')),
    epRoute('/speeches/MTG-PL-2026-10-06-OTH-2017098348222', () => true, fx('europarl-speech-written.json')),
    epRoute('/meps/show-current', () => true, fx('europarl-meps-2026-10-06.json')),
  );
}

const roster = () => new Map(fxJson<{ data: { identifier: string; givenName: string; familyName: string; 'api:political-group': string }[] }>('europarl-meps-2026-10-06.json').data
  .map(m => [Number(m.identifier), { name: `${m.givenName} ${m.familyName}`, group: m['api:political-group'] }]));

test('a plenary debate is read whole from the API: the event, one search by its title, and the items the search did not bring', async () => {
  const { get, calls } = europarlDebateNet();
  const deb = await fetchEuroparlDebate(get, 'CRE-10-2026-10-06-ITM-016');
  assert.equal(deb.title, 'Effective measures to protect and empower children in the digital world (debate)');
  assert.equal(deb.date, '2026-10-06');
  assert.deepEqual(deb.missing, []);
  assert.equal(deb.acts.length, 5);
  assert.deepEqual(calls.map(u => u.pathname.replace('/api/v2', '')), ['/events/MTG-PL-2026-10-06-PVCRE-ITM-16', '/speeches', '/speeches/MTG-PL-2026-10-06-OTH-2017098348222']);
  const search = calls[1].searchParams;
  assert.equal(search.get('title'), 'Effective measures to protect and empower children in the digital world', 'the number and the “(debate)” tag are left out of the search');
  assert.equal(search.get('sitting-date'), '2026-10-06');
  assert.equal(search.get('sitting-date-end'), '2026-10-06');
  assert.equal(search.get('language'), 'en');
  assert.equal(search.get('include-output'), 'xml_fragment');
  // In the order of the record, not the order they came.
  const orders = deb.acts.map(a => a.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  assert.ok(deb.acts[deb.acts.length - 1].id.endsWith('2017098348222'), 'the written statement comes last');
});

test('a plenary debate is saved with each speech under a line giving the speaker, the group that day and the member id', async () => {
  const { get } = europarlDebateNet();
  const deb = await fetchEuroparlDebate(get, 'CRE-10-2026-10-06-ITM-016');
  const saved = renderEuroparl({ ...deb, cre: 'CRE-10-2026-10-06-ITM-016', roster: roster() }, '2026-10-13');
  const lines = saved.text.split('\n');
  assert.equal(lines[0], 'Effective measures to protect and empower children in the digital world (debate)');
  assert.equal(lines[1], 'European Parliament, plenary sitting of 2026-10-06.');
  assert.equal(lines[2], 'https://www.europarl.europa.eu/doceo/document/CRE-10-2026-10-06-ITM-016_EN.html');
  assert.match(lines[4], /^4 speeches by 4 speakers\./);

  assert.deepEqual(headsOf(saved.text), [
    // The chair is printed as "President"; the member id says who was in the chair then.
    '>> Christel Schaldemose | political group: S&D | member 37312 | as printed: “President”.',
    '>> João Oliveira | political group: The Left | member 257083 | as printed: “João Oliveira (The Left), Question under the blue card procedure” | spoke in Portuguese; the English below is the Parliament\'s machine translation.',
    '>> Svenja Hahn | political group: Renew | member 197444 | as printed: “Svenja Hahn (Renew), Answer to a question about the ‘blue card’ procedure” | spoke in German; the English below is the Parliament\'s machine translation.',
    '>> [record].',
    '>> Vasile Dîncu | political group: S&D | member 33998 | as printed: “Vasile Dîncu (S&D), in writing”.',
  ]);
  assert.match(saved.text, /\n>> \[record\]\.\nCatch-the-eye procedure\n\n>> Vasile/);

  // The words are the record's: the paragraphs of each activity's XML, with no markup, in order.
  const paragraphs = deb.acts.flatMap(a => /^<communication/.test(a.xml)
    ? [...a.xml.matchAll(/<narrative[^>]*>([\s\S]*?)<\/narrative>/g)].map(m => m[1])
    : [...a.xml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(m => m[1]));
  const record = paragraphs.flatMap(p => words(p.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')));
  assert.deepEqual(speechWords(saved.text), record);
  assert.equal(saved.words, record.length);

  // A quotation from the machine-translated English passes the checker like any other, but not across the two speakers.
  const check = (q: string) => verifyQuote(q, saved.text, undefined, { sourceBrackets: true });
  assert.equal(check('And the commercial interest of these multinationals is antagonistic to the interest in balanced development').ok, true);
  const across = check('children in the digital world … I was wondering if you were listening to me');
  assert.equal(across.ok, false);
  assert.match(across.ok ? '' : across.reason, /change of speaker/);
});

test('a plenary speaker who is not an MEP has no group; with no list of MEPs, every group is unknown', async () => {
  const { get } = europarlDebateNet();
  const deb = await fetchEuroparlDebate(get, 'CRE-10-2026-10-06-ITM-016');
  const noOne = renderEuroparl({ ...deb, cre: 'CRE-10-2026-10-06-ITM-016', roster: new Map() }, '2026-10-13');
  assert.match(noOne.text, /political group: not a sitting MEP/);
  const unknown = renderEuroparl({ ...deb, cre: 'CRE-10-2026-10-06-ITM-016' }, '2026-10-13');
  assert.ok(!unknown.text.includes('not a sitting MEP'));
  assert.match(unknown.text, />> Svenja Hahn \| political group: unknown \| member 197444/);
});

test('a speech with no English text yet is saved as it was said, and says so', async () => {
  type Reply = { data: { recorded_in_a_realization_of: { 'api:xmlFragment'?: object }[] }[] };
  // The Parliament's answer for a speech whose translations are not made yet: nothing in English, the Portuguese it was said in.
  const original = fx('europarl-speech-oliveira-original-only.json');
  const askedForEnglish = JSON.parse(original) as Reply;
  askedForEnglish.data[0].recorded_in_a_realization_of[0]['api:xmlFragment'] = {};
  const event = JSON.parse(fx('europarl-event-itm16.json')) as { data: { consists_of: string[] }[] };
  event.data[0].consists_of = ['eli/dl/event/MTG-PL-2026-10-06-OTH-2017097959250'];
  const asked: string[] = [];
  const { get } = net(
    epRoute('/events/MTG-PL-2026-10-06-PVCRE-ITM-16', () => true, JSON.stringify(event)),
    epRoute('/speeches', u => u.searchParams.has('title'), JSON.stringify({ data: [], meta: { total: 0 } })),
    u => {
      if (u.pathname !== '/api/v2/speeches/MTG-PL-2026-10-06-OTH-2017097959250') return undefined;
      asked.push(u.searchParams.get('language') ?? 'every language');
      return u.searchParams.get('language') === 'en' ? JSON.stringify(askedForEnglish) : original;
    },
  );
  const deb = await fetchEuroparlDebate(get, 'CRE-10-2026-10-06-ITM-016');
  assert.deepEqual(asked, ['en', 'every language']);
  const saved = renderEuroparl({ ...deb, cre: 'CRE-10-2026-10-06-ITM-016', roster: roster() }, '2026-10-13');
  assert.match(saved.text, /\| no English text yet: this is the original \(Portuguese\)\.\n/);
  assert.match(saved.text, /Senhora Presidente, Senhora Deputada Hahn/);
  assert.ok(!saved.text.includes('machine translation.'), 'and it is not called a translation');
});

test('a plenary item that does not exist is an error; one that cannot be read is named, not dropped silently', async () => {
  await assert.rejects(fetchEuroparlDebate(net(epRoute('/events/MTG-PL-2026-10-06-PVCRE-ITM-16', () => true, JSON.stringify({ data: [] }))).get, 'CRE-10-2026-10-06-ITM-016'), /no agenda item/);
  const { get } = europarlDebateNet([u => { if (u.pathname.endsWith('/speeches/MTG-PL-2026-10-06-OTH-2017098348222')) throw new Error('HTTP 500'); return undefined; }]);
  const deb = await fetchEuroparlDebate(get, 'CRE-10-2026-10-06-ITM-016');
  assert.deepEqual(deb.missing, ['MTG-PL-2026-10-06-OTH-2017098348222']);
  assert.equal(deb.acts.length, 4);

  // The text then says what is missing from it, so no one takes its silence for the record’s.
  const saved = await saveText('https://www.europarl.europa.eu/doceo/document/CRE-10-2026-10-06-ITM-016_EN.html', europarlDebateNet([u => { if (u.pathname.endsWith('/speeches/MTG-PL-2026-10-06-OTH-2017098348222')) throw new Error('HTTP 500'); return undefined; }]).get, '2026-10-13');
  assert.equal(saved.speeches, 3);
  assert.deepEqual(saved.problems, ['1 activity of this agenda item could not be read and is missing from the text: MTG-PL-2026-10-06-OTH-2017098348222']);
  assert.match(saved.text.split('\n>> ')[0], /\nNOTE: 1 activity of this agenda item could not be read and is missing from the text: MTG-PL-2026-10-06-OTH-2017098348222\.\n/);
});

// ---------------------------------------------------------------------------------------------------------------------
// Which debate
// ---------------------------------------------------------------------------------------------------------------------

test('the debate to save comes from a URL, an item as JSON, a file holding one, or a triage group', () => {
  assert.equal(urlOf(LORDS_URL), LORDS_URL);
  assert.equal(urlOf(JSON.stringify({ id: 'x', kind: 'parliament', url: LORDS_URL })), LORDS_URL);
  assert.equal(urlOf(JSON.stringify({ main: { url: LORDS_URL }, also: [] })), LORDS_URL);
  assert.equal(urlOf(JSON.stringify([{ url: LORDS_URL }])), LORDS_URL);
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'parliament-')), 'item.json');
  writeFileSync(file, JSON.stringify({ id: 'x', kind: 'parliament', url: LORDS_URL }));
  assert.equal(urlOf(file), LORDS_URL);
  assert.throws(() => urlOf('/no/such/file.json'), /neither a URL, JSON nor a file/);
  assert.throws(() => urlOf('{"id":"x"}'), /no url/);
});

test('the debate’s own identifier is found in the address the Radar keeps for it', async () => {
  assert.equal(hansardDebateId(LORDS_URL), 'D23B986C-CA62-4620-A929-F93F4756BEA5');
  assert.equal(hansardDebateId(LORDS_URL.toLowerCase()), 'D23B986C-CA62-4620-A929-F93F4756BEA5');
  assert.throws(() => hansardDebateId('https://hansard.parliament.uk/Commons/2026-10-12'), /no Hansard debate id/);
  assert.equal(epCreFromUrl('https://www.europarl.europa.eu/doceo/document/CRE-10-2026-10-06-ITM-016_EN.html'), 'CRE-10-2026-10-06-ITM-016');
  assert.throws(() => epCreFromUrl('https://www.europarl.europa.eu/plenary/en/home.html'), /no verbatim-report item/);
  await assert.rejects(saveText('https://example.com/debate', net().get), /not a debate page of UK Hansard or the European Parliament/);
});

// ---------------------------------------------------------------------------------------------------------------------
// Being polite, and what is read
// ---------------------------------------------------------------------------------------------------------------------

test('requests go one at a time, with a pause between, whoever asks; a busy server is asked again, a refusal is not', async () => {
  let running = 0;
  let most = 0;
  const starts: number[] = [];
  const seen: string[] = [];
  const answers: Record<string, (n: number) => Response> = {
    'https://a.example/ok': () => new Response('{"fine":true}', { status: 200 }),
    'https://a.example/busy': n => (n < 3 ? new Response('busy', { status: 503 }) : new Response('after a rest', { status: 200 })),
    'https://a.example/slow-down': n => (n < 2 ? new Response('', { status: 429 }) : new Response('ok now', { status: 200 })),
    'https://a.example/gone': () => new Response('"Maximum of 20 Members permitted per call"', { status: 400 }),
    'https://a.example/missing': () => new Response('{"message":"no such thing"}', { status: 404 }),
  };
  const tries = new Map<string, number>();
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    running++;
    most = Math.max(most, running);
    starts.push(Date.now());
    seen.push(`${u} ${(init?.headers as Record<string, string>)['user-agent']}`);
    await new Promise(r => setTimeout(r, 5));
    running--;
    const n = (tries.get(u) ?? 0) + 1;
    tries.set(u, n);
    return answers[u](n);
  }) as typeof fetch;
  const get = politeGetter({ gapMs: 20, retryMs: 5, fetchImpl });

  // Many asked for at once: they are answered, one at a time.
  const answered = await Promise.all(['ok', 'busy', 'ok', 'slow-down'].map(p => get(`https://a.example/${p}`)));
  assert.deepEqual(answered, ['{"fine":true}', 'after a rest', '{"fine":true}', 'ok now']);
  assert.equal(most, 1, 'never two at once');
  assert.ok(starts.every((t, i) => i === 0 || t - starts[i - 1] >= 18), `pauses: ${starts.map((t, i) => (i ? t - starts[i - 1] : 0)).join(', ')}`);
  assert.ok(seen.every(s => s.endsWith('CtrlAIBot/0.1 (+https://ctrlai.com/about; reads public feeds once a day)')), 'under the Radar’s own name');
  assert.equal(tries.get('https://a.example/busy'), 3);
  assert.equal(tries.get('https://a.example/slow-down'), 2);

  // A refusal is an error at once, with the reason the server gave; and one failure does not stop the queue.
  await assert.rejects(get('https://a.example/gone'), /HTTP 400 from a\.example\/gone: Maximum of 20 Members permitted per call/);
  await assert.rejects(get('https://a.example/missing'), /HTTP 404 from a\.example\/missing: no such thing/);
  assert.equal(tries.get('https://a.example/gone'), 1);
  assert.equal(await get('https://a.example/ok'), '{"fine":true}');

  // A server that keeps failing is given up on after three tries.
  const dead = politeGetter({ gapMs: 1, retryMs: 1, fetchImpl: (async () => new Response('', { status: 500 })) as typeof fetch });
  await assert.rejects(dead('https://b.example/x'), /HTTP 500 from b\.example\/x/);
});

test('the Radar reads three parliaments: the Commons, the Lords and the European Parliament, as tier 1 sources with the AI filter', () => {
  const { sources } = JSON.parse(readFileSync(path.join(__dirname, '..', 'radar', 'sources.json'), 'utf8')) as { sources: Source[] };
  const parliaments = sources.filter(s => s.kind === 'parliament');
  assert.deepEqual(parliaments.map(s => s.id).sort(), ['european-parliament-plenary', 'uk-house-of-commons-hansard', 'uk-house-of-lords-hansard']);
  for (const s of parliaments) { assert.equal(s.tier, 1); assert.equal(s.filter, 'ai'); }
  assert.deepEqual(parliaments.filter(s => s.url === HANSARD_API).map(s => s.house).sort(), ['Commons', 'Lords']);
  assert.equal(parliaments.find(s => s.id === 'european-parliament-plenary')!.url, EP_API);
  assert.equal(new Set(sources.map(s => s.id)).size, sources.length, 'ids are unique');
});
