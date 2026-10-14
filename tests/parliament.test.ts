import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemId, relevant, type Item } from '../scripts/radar/feeds';
import {
  HANSARD_API, MEMBERS_API, around, debateItem, epEventId, epFrom, epParagraphs, epUrl, hansardSlug, hansardText, hansardUrl, mentions, nameOn,
  parseEuroparlHits, partyOn, partyShortOn, presiding, readEuroparl, readHansard, readParliament, roleOf, translatedFrom,
} from '../scripts/radar/parliament';
import { COMMONS, EUROPARL, LORDS, epRoute, flatWs, fx, fxJson, hansardSearch, history, membersRoute, net, searching, snippets, type Route } from './helpers/parliament-net';

// The fixtures are real answers from the two parliaments' APIs (see tests/helpers/parliament-net.ts). The tests run offline.

// ---------------------------------------------------------------------------------------------------------------------
// Words and addresses
// ---------------------------------------------------------------------------------------------------------------------

test('a debate’s Hansard address is built the way Hansard builds its own', () => {
  // Title → the last part of the link the Hansard API itself gave for the same debate.
  const theirs: [string, string][] = [
    ['Baby Loss Awareness Week', 'BabyLossAwarenessWeek'],
    [' Written Parliamentary Questions', 'WrittenParliamentaryQuestions'],
    ['Iran: Threats to British Interests', 'IranThreatsToBritishInterests'],
    ['Courts and Tribunals Bill', 'CourtsAndTribunalsBill'],
    ['Rejoining the EU', 'RejoiningTheEU'],
    ['Police Funding: North-east England', 'PoliceFundingNorth-EastEngland'],
  ];
  for (const [title, slug] of theirs) assert.equal(hansardSlug(title), slug, title);
  assert.equal(hansardUrl('Commons', '2026-10-12', '54fb2edb-83af-40fe-8a98-a914ad221cd7', 'International Update'),
    'https://hansard.parliament.uk/Commons/2026-10-12/debates/54FB2EDB-83AF-40FE-8A98-A914AD221CD7/InternationalUpdate');
});

test('Hansard’s markup goes and its words stay: column markers, italics, question tags, entities', () => {
  const raw = [
    ['May I say to the Father of the House that I am not reopening the referendum? We will increase co-operation <span id="29" class="column-number" data-column-number="29"></span>to get a grip on boats.', 'May I say to the Father of the House that I am not reopening the referendum? We will increase co-operation to get a grip on boats.'],
    ['I thank my hon. Friend—<em>[</em><em>Interruption.</em><em>]</em> My apologies—my right hon. Friend.', 'I thank my hon. Friend—[Interruption.] My apologies—my right hon. Friend.'],
    ['<Question HRSContentId="{949E080E-1A70-41C6-A97D-7C85E964F343}">18.  <QuestionText HRSContentId="{3BB15F39-F506-4D09-B4A0-DF7B50325C19}">What steps she is taking with Cabinet colleagues to support the creation of new jobs in the AI industry.</QuestionText> </Question>', '18. What steps she is taking with Cabinet colleagues to support the creation of new jobs in the AI industry.'],
    ['Lords &amp; Commons\r\n\r\n\tSecond paragraph.', 'Lords & Commons\n\nSecond paragraph.'],
  ];
  for (const [from, to] of raw) assert.equal(hansardText(from), to);
  assert.equal(hansardText(null), '');
});

test('AI is counted and shown where it is said, in the speech’s own words', () => {
  const speech = 'The implications of AI for our defence and security are obviously significant. My hon. Friend knows that important work is being done by my right hon. Friend the Minister for Artificial Intelligence on this issue. It is crucial that we look at this not just in any one context.';
  assert.equal(mentions(speech), 2);
  assert.equal(mentions('The maid said that it is fine; AI-enabled boilers; artificial intelligence'), 2, 'only the words, not letters inside other words');
  const shown = around(speech, 120);
  assert.ok(shown.startsWith('The implications of AI'), shown);
  assert.ok(shown.endsWith('…'), shown);
  assert.ok(speech.includes(shown.replace(/…$/, '')), 'what is shown is a stretch of the speech, unchanged');
  const late = around('word '.repeat(60) + 'and then AI turns up in the middle of a long speech ' + 'word '.repeat(60), 120);
  assert.ok(late.startsWith('…') && late.endsWith('…') && late.includes('AI turns up'), late);
});

test('the Speaker, a Deputy Speaker and the chair of a Westminster Hall debate are in the chair; ministers and backbenchers are not', () => {
  for (const a of ['Mr Speaker', 'Madam Deputy Speaker (Ms Nusrat Ghani)', 'Madam Deputy Speaker (Caroline Nokes)', 'Sir Edward Leigh (in the Chair)']) assert.equal(presiding(a), true, a);
  for (const a of ['The Prime Minister (Andy Burnham)', 'Baroness Twycross (Lab)', 'Dr Kieran Mullan (Bexhill and Battle) (Con)', 'Captain of the King’s Bodyguard of the Yeomen of the Guard and Deputy Chief Whip (Baroness Anderson of Stoke-on-Trent)', null, '']) assert.equal(presiding(a), false, String(a));
});

test('the office Hansard prints before a name is kept; a name with a constituency has none', () => {
  assert.equal(roleOf('The Prime Minister (Andy Burnham)', 'Andy Burnham'), 'The Prime Minister');
  assert.equal(roleOf('The Parliamentary Under-Secretary of State, Department of Health and Social Care (Baroness Merron) (Lab)', 'Baroness Merron'), 'The Parliamentary Under-Secretary of State, Department of Health and Social Care');
  assert.equal(roleOf('Mrs Kemi Badenoch (North West Essex) (Con)', 'Kemi Badenoch'), undefined);
  assert.equal(roleOf('Baroness Teather', 'Baroness Teather'), undefined);
  assert.equal(roleOf(null, undefined), undefined);
});

// ---------------------------------------------------------------------------------------------------------------------
// Who a member was on the day
// ---------------------------------------------------------------------------------------------------------------------

test('a member’s party is the one they sat for on the day of the sitting', () => {
  const kruger = history(4858);
  assert.equal(partyOn(kruger, '2025-09-14'), 'Conservative');
  assert.equal(partyOn(kruger, '2025-09-15'), 'Reform UK', 'the day of the change is the new party’s');
  assert.equal(partyOn(kruger, '2026-10-12'), 'Reform UK');
  assert.equal(partyOn(history(1427), '2026-10-12'), 'Labour');
  assert.equal(partyOn(history(1427), '2020-01-01'), undefined, 'not a member that day: no party, not the nearest one');
  assert.equal(partyOn(history(738), '2026-09-15'), 'Crossbench');
  assert.equal(partyOn(undefined, '2026-10-13'), undefined);
  // The short form is for the excerpt; a party without one is shown whole.
  assert.equal(partyShortOn(history(738), '2026-09-15'), 'XB');
  assert.equal(partyShortOn(kruger, '2026-10-12'), 'RUK');
  assert.equal(partyShortOn(history(1827), '2026-09-15'), 'Non-affiliated');
  assert.equal(nameOn(history(4966), '2026-09-15'), 'Baroness Twycross');
  assert.equal(nameOn(history(1427), '2026-10-12'), 'Andy Burnham');
});

// ---------------------------------------------------------------------------------------------------------------------
// UK Hansard → items
// ---------------------------------------------------------------------------------------------------------------------

function commonsNet(extra: Route[] = []) {
  return net(
    ...extra,
    hansardSearch('contributions/Spoken.json', 'Commons', 'AI', fx('hansard-commons-spoken-ai.json')),
    hansardSearch('contributions/Spoken.json', 'Commons', 'artificial intelligence', fx('hansard-commons-spoken-phrase.json')),
    hansardSearch('debates.json', 'Commons', 'AI', fx('hansard-titles-none.json')),
    hansardSearch('debates.json', 'Commons', 'artificial intelligence', fx('hansard-titles-none.json')),
    hansardSearch('debates.json', 'Commons', 'superintelligence', fx('hansard-titles-none.json')),
    membersRoute,
  );
}

test('the Commons for two days: one item per debate, with who spoke on AI and their party that day', async () => {
  const { get, calls } = commonsNet();
  const items = await readHansard(COMMONS, { from: '2026-10-12', to: '2026-10-13' }, get);

  // Politely and exactly: both searches for both words, over the window and the house, then one call for the members.
  assert.deepEqual(calls.map(u => u.pathname), ['/search/contributions/Spoken.json', '/search/contributions/Spoken.json', '/search/debates.json', '/search/debates.json', '/search/debates.json', '/api/Members/History']);
  for (const u of calls.slice(0, 5)) {
    assert.equal(u.searchParams.get('queryParameters.house'), 'Commons');
    assert.equal(u.searchParams.get('queryParameters.startDate'), '2026-10-12');
    assert.equal(u.searchParams.get('queryParameters.endDate'), '2026-10-13');
  }
  // Speeches that say either word; debates whose title says either, or "superintelligence" ("Artificial Superintelligence" is a debate about AI).
  assert.deepEqual(calls.slice(0, 5).map(u => u.searchParams.get('queryParameters.searchTerm')), ['artificial intelligence', 'AI', 'artificial intelligence', 'AI', 'superintelligence']);
  assert.equal(calls[5].searchParams.getAll('ids').length, 7);

  assert.deepEqual(items.map(i => i.title).sort(), ['International Update', 'Iran: Threats to British Interests', 'Rejoining the EU', 'Topical Questions']);
  const byTitle = Object.fromEntries(items.map(i => [i.title, i]));

  const intl = byTitle['International Update'];
  assert.equal(intl.kind, 'parliament');
  assert.equal(intl.tier, 1);
  assert.equal(intl.source, 'uk-house-of-commons-hansard');
  assert.equal(intl.published, '2026-10-12', 'the sitting date');
  assert.equal(intl.author, 'House of Commons');
  assert.equal(intl.url, 'https://hansard.parliament.uk/Commons/2026-10-12/debates/54FB2EDB-83AF-40FE-8A98-A914AD221CD7/InternationalUpdate');
  assert.equal(intl.id, itemId(intl.url));
  // In the order they spoke: three members ask, then the Prime Minister answers the one who raised AI.
  assert.deepEqual(intl.speakers, [
    { name: 'Victoria Collins', memberId: 5201, party: 'Liberal Democrat' },
    { name: 'Anneliese Dodds', memberId: 4657, party: 'Labour' },
    { name: 'Gordon McKee', memberId: 5189, party: 'Labour' },
    { name: 'Andy Burnham', memberId: 1427, party: 'Labour' },
  ]);
  assert.match(intl.excerpt, /^AI comes up in 4 speeches by 4 speakers\. Speakers: Victoria Collins \(LD\), Anneliese Dodds \(Lab\), Gordon McKee \(Lab\), Andy Burnham \(Lab\)\./);

  // A speech found by both words is one speech: the Iran urgent question has two speakers, in the order they spoke.
  const iran = byTitle['Iran: Threats to British Interests'];
  assert.deepEqual(iran.speakers, [{ name: 'Gordon McKee', memberId: 5189, party: 'Labour' }, { name: 'Stephen Doughty', memberId: 4264, party: 'Labour' }]);
  assert.match(iran.excerpt, /^AI comes up in 2 speeches by 2 speakers\./);

  // Westminster Hall is said, and a member who changed party is shown with the party of that day.
  const rejoin = byTitle['Rejoining the EU'];
  assert.equal(rejoin.author, 'House of Commons, Westminster Hall');
  assert.deepEqual(rejoin.speakers, [{ name: 'Danny Kruger', memberId: 4858, party: 'Reform UK' }]);
  assert.deepEqual(byTitle['Topical Questions'].speakers, [{ name: 'Alex Mayer', memberId: 5141, party: 'Labour' }]);
});

test('what an excerpt quotes is in the record, word for word, and it is short enough to keep whole', async () => {
  const { get } = commonsNet();
  const items = await readHansard(COMMONS, { from: '2026-10-12', to: '2026-10-13' }, get);
  const rows = [...fxJson<{ Results: { ContributionTextFull: string }[] }>('hansard-commons-spoken-ai.json').Results, ...fxJson<{ Results: { ContributionTextFull: string }[] }>('hansard-commons-spoken-phrase.json').Results];
  const record = flatWs(rows.map(r => hansardText(r.ContributionTextFull)).join(' '));
  let n = 0;
  for (const it of items) {
    assert.ok(it.excerpt.length <= 1200, `${it.title}: ${it.excerpt.length}`);
    for (const s of snippets(it.excerpt)) { n++; assert.ok(record.includes(s), `${it.title}: not in the record: ${s}`); }
  }
  assert.ok(n >= 7, `only ${n} snippets`);
});

test('the triage filter reads a parliament item like any other, and the excerpt’s own words do not carry it', async () => {
  const { get } = commonsNet();
  const items = await readHansard(COMMONS, { from: '2026-10-12', to: '2026-10-13' }, get);
  const iran = items.find(i => i.title.startsWith('Iran'))!;
  assert.equal(relevant(COMMONS, iran), true, 'defence and security, cyber-attacks');
  // What the code adds around the speeches (the count, the names, the parties) says nothing about safety, control or
  // governance. "Labour" and "Liberal Democrat" would: the filter takes them for labour and democracy, hence "Lab" and "LD".
  for (const it of items) {
    const frame = it.excerpt.slice(0, it.excerpt.indexOf('“')).replace(/[^.]*$/, '');
    assert.ok(frame.startsWith('AI comes up'), frame);
    assert.equal(relevant(COMMONS, { ...it, title: 'A title', excerpt: frame }), false, frame);
  }
  assert.equal(relevant(COMMONS, { ...iran, title: 'Smart Glasses', excerpt: 'A speaker (Labour) says AI-enabled glasses are fun.' }), true, 'whereas the party’s full name would have passed it');
});

test('a page of results that is not the last is followed by the next, from where it ended', async () => {
  const first = fxJson<{ Results: unknown[]; TotalResultCount: number }>('hansard-commons-spoken-ai.json');
  const second = fxJson<{ Results: unknown[]; TotalResultCount: number }>('hansard-commons-spoken-phrase.json');
  const skips: string[] = [];
  const { get } = net(
    u => {
      if (u.pathname !== '/search/contributions/Spoken.json' || u.searchParams.get('queryParameters.searchTerm') !== 'AI') return undefined;
      skips.push(u.searchParams.get('queryParameters.skip')!);
      return JSON.stringify(skips.length === 1 ? { ...first, TotalResultCount: 9 } : { ...second, TotalResultCount: 9 });
    },
    hansardSearch('contributions/Spoken.json', 'Commons', 'artificial intelligence', fx('hansard-spoken-none.json')),
    hansardSearch('debates.json', 'Commons', 'AI', fx('hansard-titles-none.json')),
    hansardSearch('debates.json', 'Commons', 'artificial intelligence', fx('hansard-titles-none.json')),
    hansardSearch('debates.json', 'Commons', 'superintelligence', fx('hansard-titles-none.json')),
    membersRoute,
  );
  const items = await readHansard(COMMONS, { from: '2026-10-12', to: '2026-10-13' }, get);
  assert.deepEqual(skips, ['0', '7']);
  assert.equal(items.length, 4);
});

function lordsNet(extra: Route[] = []) {
  return net(
    ...extra,
    hansardSearch('contributions/Spoken.json', 'Lords', 'AI', fx('hansard-lords-spoken-ai.json')),
    hansardSearch('contributions/Spoken.json', 'Lords', 'artificial intelligence', fx('hansard-spoken-none.json')),
    hansardSearch('debates.json', 'Lords', 'AI', fx('hansard-lords-titles-ai.json')),
    hansardSearch('debates.json', 'Lords', 'artificial intelligence', fx('hansard-titles-none.json')),
    hansardSearch('debates.json', 'Lords', 'superintelligence', fx('hansard-titles-none.json')),
    u => (u.origin === HANSARD_API && u.pathname === '/debates/debate/D23B986C-CA62-4620-A929-F93F4756BEA5.json' ? fx('hansard-debate-lords-ai-extinction.json') : undefined),
    membersRoute,
  );
}

test('a debate whose title is about AI is read whole: everyone who spoke in it counts', async () => {
  const { get, calls } = lordsNet();
  const items = await readHansard(LORDS, { from: '2026-09-15', to: '2026-09-15' }, get);
  assert.equal(calls.filter(u => u.pathname.startsWith('/debates/debate/')).length, 1, 'the one debate about AI is fetched, once');
  assert.deepEqual(items.map(i => i.title), ['AI: Human Extinction', 'UK Water Companies: Chinese Financial Influence']);

  const ai = items[0];
  assert.equal(ai.author, 'House of Lords');
  assert.equal(ai.published, '2026-09-15');
  assert.equal(ai.url, 'https://hansard.parliament.uk/Lords/2026-09-15/debates/D23B986C-CA62-4620-A929-F93F4756BEA5/AIHumanExtinction');
  assert.deepEqual(ai.speakers!.map(s => `${s.name} (${s.party})`), [
    'Baroness Teather (Liberal Democrat)', 'Baroness Twycross (Labour)', 'Lord Alton of Liverpool (Crossbench)', 'Lord Ranger of Northwood (Conservative)',
    'Lord Watts (Labour)', 'Lord Clement-Jones (Liberal Democrat)', 'Viscount Camrose (Conservative)', 'Baroness Butler-Sloss (Crossbench)',
    'Baroness Harding of Winscombe (Conservative)', 'Baroness Uddin (Non-affiliated)', 'Baroness Anderson of Stoke-on-Trent (Labour)',
  ], 'including speakers whose speeches never say AI, in the order they first spoke');
  assert.ok(ai.speakers!.every(s => s.memberId));
  assert.match(ai.excerpt, /^A debate about AI: 11 speakers\. Speakers: Baroness Teather \(LD\), Baroness Twycross \(Lab\), Lord Alton of Liverpool \(XB\)/);
  assert.match(ai.excerpt, /Baroness Teather \(LD\): “To ask His Majesty’s Government what assessment they have made of the risk of AI causing human extinction within the next decade\.”/, 'the question that opens the debate');
  assert.match(ai.excerpt, /Baroness Twycross \(Lab, The Parliamentary Secretary, Cabinet Office, and Parliamentary/, 'and the office of the minister who answers');

  // Another debate that day mentions AI once, in passing: one speaker, found by the search only.
  assert.deepEqual(items[1].speakers, [{ name: 'Baroness Hayman of Ullock', memberId: 4395, party: 'Labour' }]);
  assert.match(items[1].excerpt, /^AI comes up in 1 speech by 1 speaker\./);

  // Twelve members are asked about in one call: the API takes 20.
  assert.equal(calls.filter(u => u.pathname === '/api/Members/History').length, 1);
});

test('the person in the chair is not counted among those who spoke in a debate about AI', async () => {
  // A record that is not about AI, read as if its title were, to see what the chair does: the Deputy Speaker calls the shadow Minister.
  const courts = fx('hansard-debate-courts-excerpt.json');
  const { get } = net(
    hansardSearch('contributions/Spoken.json', 'Commons', 'AI', fx('hansard-spoken-none.json')),
    hansardSearch('contributions/Spoken.json', 'Commons', 'artificial intelligence', fx('hansard-spoken-none.json')),
    hansardSearch('debates.json', 'Commons', 'AI', JSON.stringify({ Results: [{ DebateSection: 'Commons Chamber', SittingDate: '2026-10-13T00:00:00', House: 'Commons', Title: 'Courts and Tribunals Bill', Rank: 208, DebateSectionExtId: '0DDF8CB8-9185-4AE3-B47F-6120C460495A' }], TotalResultCount: 1 })),
    hansardSearch('debates.json', 'Commons', 'artificial intelligence', fx('hansard-titles-none.json')),
    hansardSearch('debates.json', 'Commons', 'superintelligence', fx('hansard-titles-none.json')),
    u => (u.pathname === '/debates/debate/0DDF8CB8-9185-4AE3-B47F-6120C460495A.json' ? courts : undefined),
    membersRoute,
  );
  const [item] = await readHansard(COMMONS, { from: '2026-10-13', to: '2026-10-13' }, get);
  assert.deepEqual(item.speakers!.map(s => s.name), ['Sir Geoffrey Cox', 'Sarah Sackman']);
});

test('when the Members API fails the debates are still listed, without parties', async () => {
  const { get } = lordsNet([u => { if (u.origin === MEMBERS_API) throw new Error('HTTP 503 from members-api.parliament.uk'); return undefined; }]);
  const log = console.log;
  const said: string[] = [];
  console.log = (...a: unknown[]) => { said.push(a.join(' ')); };
  let items: Item[];
  try { items = await readHansard(LORDS, { from: '2026-09-15', to: '2026-09-15' }, get); } finally { console.log = log; }
  assert.equal(items.length, 2);
  assert.ok(items.every(i => i.speakers!.every(s => !('party' in s))));
  assert.ok(said.some(l => /members not read/.test(l)), said.join('\n'));
  assert.ok(items[0].speakers!.length >= 11, 'names then come from what the record printed');
});

test('a debate about AI that cannot be read whole is still listed, saying so', async () => {
  const { get } = net(
    hansardSearch('contributions/Spoken.json', 'Lords', 'AI', fx('hansard-spoken-none.json')),
    hansardSearch('contributions/Spoken.json', 'Lords', 'artificial intelligence', fx('hansard-spoken-none.json')),
    hansardSearch('debates.json', 'Lords', 'AI', fx('hansard-lords-titles-ai.json')),
    hansardSearch('debates.json', 'Lords', 'artificial intelligence', fx('hansard-titles-none.json')),
    hansardSearch('debates.json', 'Lords', 'superintelligence', fx('hansard-titles-none.json')),
    u => { if (u.pathname.startsWith('/debates/debate/')) throw new Error('HTTP 500 from hansard-api.parliament.uk'); return undefined; },
    membersRoute,
  );
  const log = console.log;
  console.log = () => {};
  let items: Item[];
  try { items = await readHansard(LORDS, { from: '2026-09-15', to: '2026-09-15' }, get); } finally { console.log = log; }
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'AI: Human Extinction');
  assert.deepEqual(items[0].speakers, []);
  assert.equal(items[0].excerpt, 'A debate about AI (its title says so).');
});

test('a Hansard source must say which house it is', async () => {
  await assert.rejects(readHansard({ ...COMMONS, house: undefined }, { from: '2026-10-12', to: '2026-10-13' }, net().get), /"house"/);
});

test('a parliament source is read by the API its url names', async () => {
  await assert.rejects(readParliament({ ...COMMONS, url: 'https://example.com' }, { from: '2026-10-12', to: '2026-10-13' }, net().get), /no parliament reader for example\.com/);
  const { get } = commonsNet();
  assert.equal((await readParliament(COMMONS, { from: '2026-10-12', to: '2026-10-13' }, get)).length, 4);
});

// ---------------------------------------------------------------------------------------------------------------------
// The European Parliament → items
// ---------------------------------------------------------------------------------------------------------------------

function europarlNet(extra: Route[] = []) {
  return net(
    ...extra,
    epRoute('/speeches', searching('artificial intelligence'), fx('europarl-hits-phrase.json')),
    epRoute('/speeches', searching('AI'), fx('europarl-hits-ai.json')),
    epRoute('/meps/show-current', () => true, fx('europarl-meps-2026-10-06.json')),
  );
}

test('a page of speech hits becomes speeches: who, where in the record, what language, and the words without markup', () => {
  const { speeches, total } = parseEuroparlHits(fx('europarl-hits-ai.json'));
  assert.equal(total, 7);
  assert.equal(speeches.length, 7);
  const by = (name: string) => speeches.find(s => s.from.name === name)!;
  const virkkunen = by('Henna Virkkunen');
  assert.equal(virkkunen.personId, 124726);
  assert.equal(virkkunen.from.role, 'Executive Vice-President of the Commission');
  assert.equal(virkkunen.cre, 'CRE-10-2026-10-06-ITM-016');
  assert.equal(virkkunen.title, 'Effective measures to protect and empower children in the digital world (debate)');
  assert.equal(virkkunen.date, '2026-10-06');
  assert.equal(virkkunen.lang, 'en');
  const ballarin = by('Laura Ballarín Cereza');
  assert.equal(ballarin.lang, 'es-t-en-mtec');
  assert.equal(translatedFrom(ballarin.lang), 'Spanish');
  assert.equal(translatedFrom('en'), undefined);
  assert.equal(by('Reinier Van Lanschot').from.role, undefined, 'a member speaking for a group has no office');
  assert.equal(by('Reinier Van Lanschot').from.printed, 'Reinier Van Lanschot (Verts/ALE).');
  for (const s of speeches) {
    assert.ok(s.text.length > 100, s.id);
    assert.ok(!/[<>]|&amp;|&lt;/.test(s.text), `markup left in ${s.id}`);
    assert.ok(s.order > 0 && s.personId, s.id);
  }
  // The word that was searched for is in the speech: that is why it was found.
  assert.ok(speeches.every(s => mentions(s.text) > 0));
});

test('the XML of a speech: who speaks (the chair is only “President”), for whom, and the paragraphs', () => {
  const xml = '<oralStatements><speech xml:lang="en"><from xml:lang="en"><person refersTo="epdata:person/37312">President</person>.</from><blockContainer><p xml:space="preserve"><recordedTime time="2026-10-06T16:30:05.601+02:00" type="startEvent"/><time time="x">The</time> <time time="y">next</time> <inline name="i">Kids Act</inline>&amp;co</p><p>Second.</p></blockContainer><summary>(The Chair interrupted the speaker)</summary></speech></oralStatements>';
  assert.deepEqual(epFrom(xml), { personId: 37312, name: 'President', printed: 'President.' });
  assert.deepEqual(epParagraphs(xml), ['The next Kids Act&co', 'Second.', '(The Chair interrupted the speaker)']);
  const group = '<from><person refersTo="epdata:person/1">A B</person>, <role refersTo="">on behalf of the <organization refersTo="epdata:org/7018">PPE</organization> Group</role>.</from>';
  assert.equal(epFrom(group).role, undefined, 'speaking for a group is not an office');
  assert.equal(epFrom(group).printed, 'A B, on behalf of the PPE Group.');
});

test('the agenda item behind a verbatim-report page, and its page', () => {
  assert.equal(epEventId('CRE-10-2026-10-06-ITM-016'), 'MTG-PL-2026-10-06-PVCRE-ITM-16');
  assert.equal(epEventId('CRE-10-2026-10-06-ITM-003'), 'MTG-PL-2026-10-06-PVCRE-ITM-3');
  assert.throws(() => epEventId('CRE-10-2026-10-06'), /not a verbatim report item/);
  assert.equal(epUrl('CRE-10-2026-10-06-ITM-016'), 'https://www.europarl.europa.eu/doceo/document/CRE-10-2026-10-06-ITM-016_EN.html');
});

test('the plenary for a week: one item per agenda item, with the group each MEP sat in on that day', async () => {
  const { get, calls } = europarlNet();
  const items = await readEuroparl(EUROPARL, { from: '2026-10-06', to: '2026-10-13' }, get);

  // Both words searched for, over the window, in English, with the speech as XML; then the MEPs of each sitting day found.
  assert.deepEqual(calls.map(u => u.pathname.replace('/api/v2', '')), ['/speeches', '/speeches', '/meps/show-current', '/meps/show-current']);
  assert.deepEqual(calls.slice(0, 2).map(u => u.searchParams.get('text')), ['artificial intelligence', 'AI']);
  for (const u of calls.slice(0, 2)) {
    assert.equal(u.searchParams.get('sitting-date'), '2026-10-06');
    assert.equal(u.searchParams.get('sitting-date-end'), '2026-10-13');
    assert.equal(u.searchParams.get('search-language'), 'en');
    assert.equal(u.searchParams.get('language'), 'en');
    assert.equal(u.searchParams.get('include-output'), 'xml_fragment');
    assert.deepEqual(u.searchParams.getAll('activity-type'), ['PLENARY_DEBATE_SPEECH', 'PLENARY_DEBATE_WRITTEN_STATEMENT']);
  }
  assert.deepEqual(calls.slice(2).map(u => u.searchParams.get('mandate-date')), ['2026-10-06', '2026-10-08']);

  assert.equal(items.length, 5, 'a debate is one item however many speeches in it mention AI');
  const byTitle = Object.fromEntries(items.map(i => [i.title, i]));
  const children = byTitle['Effective measures to protect and empower children in the digital world (debate)'];
  assert.equal(children.kind, 'parliament');
  assert.equal(children.tier, 1);
  assert.equal(children.source, 'european-parliament-plenary');
  assert.equal(children.published, '2026-10-06');
  assert.equal(children.author, 'European Parliament plenary');
  assert.equal(children.url, 'https://www.europarl.europa.eu/doceo/document/CRE-10-2026-10-06-ITM-016_EN.html');
  assert.equal(children.id, itemId(children.url));
  assert.deepEqual(children.speakers, [
    { name: 'Laura Ballarín Cereza', memberId: 247735, party: 'S&D' },
    { name: 'Dóra Dávid', memberId: 256862, party: 'PPE' },
    { name: 'Nikolina Brnjac', memberId: 204129, party: 'PPE' },
    { name: 'Henna Virkkunen', memberId: 124726 },
  ]);
  assert.match(children.excerpt, /^AI comes up in 4 speeches by 4 speakers\. Speakers: Laura Ballarín Cereza \(S&D\), Dóra Dávid \(PPE\), Nikolina Brnjac \(PPE\), Henna Virkkunen\./, 'the Commissioner is no MEP, so has no group');
  assert.match(children.excerpt, /Laura Ballarín Cereza \(S&D, translated from Spanish\): “/);

  // The same speech was found by both words and counted once.
  assert.equal(children.speakers!.filter(s => s.memberId === 247735).length, 1);
  // Benifei was found by the phrase alone; Deloge, on another day, by "AI" alone.
  assert.deepEqual(byTitle['The state of play of advancing EU-Africa trade and investment relations (debate)'].speakers, [{ name: 'Brando Benifei', memberId: 124867, party: 'S&D' }]);
  assert.deepEqual(byTitle['EU strategies for islands, coastal communities and outermost regions (debate)'].speakers, [{ name: 'Valérie Deloge', memberId: 256886, party: 'PfE' }]);
  assert.equal(byTitle['EU strategies for islands, coastal communities and outermost regions (debate)'].published, '2026-10-08');
});

test('the office of a speaker who is no MEP is shown beside their lines, and they have no group', () => {
  const virkkunen = parseEuroparlHits(fx('europarl-hits-ai.json')).speeches.find(s => s.from.name === 'Henna Virkkunen')!;
  const item = debateItem(EUROPARL, {
    title: virkkunen.title, url: epUrl(virkkunen.cre), date: virkkunen.date, chamber: 'European Parliament plenary',
    said: [{ name: virkkunen.from.name, memberId: virkkunen.personId, role: virkkunen.from.role, text: virkkunen.text }],
  }, () => undefined);
  assert.match(item.excerpt, /^AI comes up in 1 speech by 1 speaker\. Speakers: Henna Virkkunen\. Henna Virkkunen \(Executive Vice-President of the Commission\): “/);
  assert.deepEqual(item.speakers, [{ name: 'Henna Virkkunen', memberId: 124726 }]);
});

test('what an EP excerpt quotes is in the record, word for word', async () => {
  const { get } = europarlNet();
  const items = await readEuroparl(EUROPARL, { from: '2026-10-06', to: '2026-10-13' }, get);
  const record = flatWs([...parseEuroparlHits(fx('europarl-hits-ai.json')).speeches, ...parseEuroparlHits(fx('europarl-hits-phrase.json')).speeches].map(s => s.text).join(' '));
  let n = 0;
  for (const it of items) {
    assert.ok(it.excerpt.length <= 1200, it.title);
    for (const s of snippets(it.excerpt)) { n++; assert.ok(record.includes(s), `${it.title}: not in the record: ${s}`); }
  }
  assert.ok(n >= 5, `only ${n} snippets`);
});

test('when the list of MEPs cannot be read the debates are still listed, without groups', async () => {
  const { get } = europarlNet([u => { if (u.pathname.endsWith('/meps/show-current')) throw new Error('HTTP 500 from data.europarl.europa.eu'); return undefined; }]);
  const log = console.log;
  const said: string[] = [];
  console.log = (...a: unknown[]) => { said.push(a.join(' ')); };
  let items: Item[];
  try { items = await readEuroparl(EUROPARL, { from: '2026-10-06', to: '2026-10-13' }, get); } finally { console.log = log; }
  assert.equal(items.length, 5);
  assert.ok(items.every(i => i.speakers!.every(s => !('party' in s))));
  assert.equal(said.length, 1, 'said once, not for each day');
  assert.match(said[0], /MEPs of 2026-10-06 not read/);
  assert.ok(items.some(i => i.speakers!.some(s => s.name === 'Henna Virkkunen')), 'names then come from the record');
});

test('a window the plenary did not sit in has no items, and a long list is read page by page', async () => {
  const empty = JSON.stringify({ data: [], searchResults: { hits: [] }, meta: { total: 0 } });
  const { get, calls } = net(epRoute('/speeches', () => true, empty));
  assert.deepEqual(await readEuroparl(EUROPARL, { from: '2026-10-09', to: '2026-10-13' }, get), []);
  assert.equal(calls.length, 2, 'one search for each word, and no roster to look up');

  const page = fxJson<object>('europarl-hits-ai.json');
  const offsets: string[] = [];
  const paged = net(
    u => {
      if (u.pathname !== '/api/v2/speeches' || u.searchParams.get('text') !== 'AI') return undefined;
      offsets.push(u.searchParams.get('offset')!);
      return JSON.stringify(offsets.length === 1 ? { ...page, meta: { total: 9 } } : { ...fxJson<object>('europarl-hits-phrase.json'), meta: { total: 9 } });
    },
    epRoute('/speeches', searching('artificial intelligence'), empty),
    epRoute('/meps/show-current', () => true, fx('europarl-meps-2026-10-06.json')),
  );
  await readEuroparl(EUROPARL, { from: '2026-10-06', to: '2026-10-13' }, paged.get);
  assert.deepEqual(offsets, ['0', '7']);
});
