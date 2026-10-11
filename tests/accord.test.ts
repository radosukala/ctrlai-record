import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import {
  ABSENCES, ACCORD, CELLS, CHECKED_ON, COMMITMENTS, COMPANIES, COMPANY_NAME, COMPANY_ORDER, CONTEXT, DAYS_SINCE, FULL_TEXT, LAYERS, MEETINGS,
  PARAGRAPHS, SIGNATURES, SINCE, STATUS_LABEL, STATUS_ORDER, daysBetween,
} from '../content/accord';
import { allEvidence } from '../content/accord/all';
import { isDate, isProvablyBefore, isProvablyOnOrAfter } from '../content/accord/dates';
import verification from '../content/accord/verification.json';
import { STRINGS } from '../content/accord/strings';

/**
 * The rules the accord tracker promises its readers, enforced. The quotations are checked against saved source texts by
 * scripts/verify-accord.ts (the texts are other people's writing and live outside the repository); this file checks that every
 * quotation on the page has passed and has not been edited since, and that the tracker's own logic is honest.
 */
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

test('the accord text is the accord text', () => {
  assert.equal(sha(FULL_TEXT), 'fd41b936c97a67f61c01e615f2a9e08f4a76927ae0046502296e89cf08c17f62', 'the accord’s text was changed: it must match the PDF word for word');
  assert.equal(ACCORD.original.sha1, 'd320fc69d2631e3bc8bff166af1df80f0a2a7099');
  // Our archived copy of the PDF is the file the White House published.
  const pdf = readFileSync(`public${ACCORD.original.archived}`);
  assert.equal(createHash('sha1').update(pdf).digest('hex'), ACCORD.original.sha1, 'the archived PDF is not the original');
  assert.equal(pdf.length, ACCORD.original.bytes);
  // When the internal working copy exists (it is not in the repository), it must agree.
  const internal = ['docs-internal/accord-2026-10/accord-text.txt', '../ctrlai-com/docs-internal/accord-2026-10/accord-text.txt'].find(f => existsSync(f));
  if (internal) {
    const body = readFileSync(internal, 'utf8').split('[Page 2')[0].trim().replace(/\s+/g, ' ');
    assert.equal(FULL_TEXT.replace(/\s+/g, ' '), body);
  }
});

test('the five commitments quote the accord exactly, and nothing else', () => {
  assert.deepEqual(COMMITMENTS.map(c => c.id), ['L1', 'L2', 'L3', 'L4', 'G']);
  for (const c of COMMITMENTS) {
    const printed = PARAGRAPHS.find(p => p.endsWith(c.text) && (c.id === 'G' ? p === c.text : p.startsWith(`(${c.number}) `)));
    assert.ok(printed, `${c.id}: the text is not a paragraph of the accord, word for word`);
    assert.ok(c.plain.length > 40 && c.silent.length > 40);
    assert.ok(!/^(the accord|it) (says|requires)/i.test(c.plain), `${c.id}: our plain reading should not be written as if it were the accord`);
  }
});

test('every claim about what the accord does not say holds against its text', () => {
  assert.ok(ABSENCES.length >= 5);
  for (const a of ABSENCES) {
    const hit = FULL_TEXT.match(a.absent);
    assert.equal(hit, null, `“${a.title}”: the accord does contain “${hit?.[0]}”, so the claim that it is silent is wrong`);
  }
});

test('the signature page lists exactly the six companies, and the tracker covers each of them once, in alphabetical order', () => {
  assert.equal(SIGNATURES.length, 6);
  assert.deepEqual(COMPANIES.map(c => c.id), COMPANY_ORDER);
  const names = COMPANY_ORDER.map(id => COMPANY_NAME[id]);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), 'companies must be in alphabetical order, so no order reads as a ranking');
  for (const c of COMPANIES) {
    const sig = SIGNATURES.find(s => s.company.toLowerCase() === c.printedAs.toLowerCase());
    assert.ok(sig, `${c.id} is not on the signature page`);
    assert.equal(sig.name, c.signedBy);
    assert.equal(c.name, COMPANY_NAME[c.id]);
  }
});

test('nothing is a placeholder, and every record was checked on or after the accord', () => {
  const dump = JSON.stringify([COMPANIES, MEETINGS]);
  assert.ok(!/PENDING|TODO|lorem|xxx/i.test(dump), 'a record still holds placeholder text');
  for (const c of COMPANIES) {
    assert.ok(isDate(c.checkedOn) && c.checkedOn >= SINCE, `${c.id} checkedOn`);
    assert.ok(c.searched.length >= 5, `${c.id} lists only ${c.searched.length} places we looked; “nothing new” must say where we looked`);
  }
  assert.ok(MEETINGS.searched.length >= 3);
  assert.equal(DAYS_SINCE, daysBetween(ACCORD.published, CHECKED_ON));
  assert.ok(DAYS_SINCE >= 0);
});

test('a status never claims more than its evidence shows', () => {
  const ownKinds = new Set(['company-document', 'company-statement', 'filing']);
  const otherKinds = new Set(['news', 'regulator', 'official', 'auditor', 'analysis', 'advocacy', 'filing']);
  const check = (label: string, status: string, since: { kind: string }[]) => {
    assert.ok(STATUS_ORDER.includes(status as never), `${label}: unknown status ${status}`);
    if (status === 'nothing') assert.equal(since.length, 0, `${label}: says nothing new but lists ${since.length} sources since the accord`);
    else assert.ok(since.length >= 1, `${label}: ${STATUS_LABEL[status as never]} needs at least one source dated since the accord`);
    if (status === 'detailed') assert.ok(since.some(e => ownKinds.has(e.kind)), `${label}: detailed needs something the company itself published`);
    if (status === 'confirmed' || status === 'contradicted') assert.ok(since.some(e => otherKinds.has(e.kind) && e.kind !== 'company-statement'), `${label}: ${status} needs a source other than the company`);
  };
  for (const { company, layer, cell } of CELLS) {
    check(`${company.id}/${layer}`, cell.status, cell.since);
    assert.ok(cell.summary.length >= 30 && /[.!?]$/.test(cell.summary), `${company.id}/${layer}: the summary should be a sentence or two`);
    if (cell.before.length) assert.ok(cell.beforeSummary && cell.beforeSummary.length >= 20, `${company.id}/${layer}: earlier sources need a sentence that says what they show`);
    if (!cell.before.length) assert.ok(!cell.beforeSummary, `${company.id}/${layer}: a summary of earlier sources, but none listed`);
  }
  check('meetings', MEETINGS.status, MEETINGS.evidence);
});

test('every piece of evidence is well formed and sits on the right side of the accord’s date', () => {
  const seen = new Set<string>();
  const list = allEvidence();
  for (const { where, e, side } of list) {
    assert.ok(/^[a-z0-9-]+$/.test(e.id), `${where}: id “${e.id}” must be a slug`);
    assert.ok(!seen.has(e.id), `${e.id} is used twice`);
    seen.add(e.id);
    assert.equal(new URL(e.url).protocol, 'https:', `${e.id}: https only`);
    assert.ok(e.claim.length >= 20 && e.claim.length <= 600 && /[.!?][)”’"']*$/.test(e.claim), `${e.id}: the claim should be a few sentences, at most 600 characters (${e.claim.length})`);
    assert.ok(words(e.quote) >= 3 && words(e.quote) <= 25, `${e.id}: the quotation must be 3 to 25 words (${words(e.quote)})`);
    assert.ok(e.publisher && e.title && e.textFile, `${e.id}: publisher, title and textFile are required`);
    if (e.published) assert.ok(isDate(e.published), `${e.id}: ${e.published} is not a date`);
    if (side === 'since') assert.ok(e.published && isProvablyOnOrAfter(e.published, SINCE), `${e.id}: dated ${e.published}, not provably on or after ${SINCE}`);
    if (side === 'before') {
      const day = e.published ?? e.notAfter;
      assert.ok(day && isProvablyBefore(day, SINCE), `${e.id}: dated ${day}, not provably before ${SINCE}`);
      if (!e.published) assert.ok(e.dateNote && e.dateNote.length >= 15, `${e.id}: an undated item needs a dateNote saying how we know it predates the accord`);
    }
    if (e.notAfter) assert.ok(isDate(e.notAfter), `${e.id}: notAfter ${e.notAfter} is not a date`);
    if (side === 'statement' && e.published) assert.ok(isProvablyOnOrAfter(e.published, SINCE), `${e.id}: a statement about the accord cannot predate it`);
  }
  assert.ok(list.length >= 0);
});

test('every quotation was verified word for word against its saved source, and has not been edited since', () => {
  const results = verification.results as Record<string, { ok: boolean; mode?: string; quoteSha: string; textSha?: string; textNamesAccord?: boolean; textMentionsLoosely?: boolean }>;
  const sources = verification.sources as Record<string, { sha256: string }>;
  const list = allEvidence();
  for (const { e } of list) {
    const r = results[e.id];
    assert.ok(r, `${e.id} has no verification record: run  npx tsx scripts/verify-accord.ts`);
    assert.ok(r.ok, `${e.id} did not verify`);
    assert.equal(r.quoteSha, sha(e.quote), `${e.id} was edited after it was verified: re-run scripts/verify-accord.ts`);
    assert.equal(r.mode, 'exact', `${e.id} matched only as words, not exactly`);
    if (e.mentionsAccord) assert.ok(r.textMentionsLoosely, `${e.id}: flagged as mentioning the accord, but its source text never names or describes it`);
    else assert.ok(!r.textNamesAccord, `${e.id}: its source text names the accord, but mentionsAccord is false`);
    assert.ok(sources[e.textFile]?.sha256 === r.textSha, `${e.id}: no source hash`);
  }
  assert.equal(Object.keys(results).length, list.length, 'verification.json has records for evidence that no longer exists');
});

test('the layers are the four the accord prints', () => {
  assert.deepEqual(LAYERS, ['L1', 'L2', 'L3', 'L4']);
  for (const c of COMPANIES) assert.deepEqual(Object.keys(c.cells).sort(), [...LAYERS]);
});

test('the Czech page says the same things as the English one', () => {
  for (const c of COMMITMENTS) {
    assert.ok(c.plainCs.length > 30 && c.silentCs.length > 30 && c.shortCs, `${c.id}: Czech reading missing`);
  }
  for (const a of ABSENCES) assert.ok(a.titleCs && a.textCs.length > 30, `${a.id}: Czech text missing`);
  const en = STRINGS.en, cs = STRINGS.cs;
  assert.equal(cs.method.paras.length, en.method.paras.length);
  en.method.paras.forEach((p, i) => {
    for (const token of ['{mail}', '{code}', '{about}']) assert.equal(cs.method.paras[i].text.includes(token), p.text.includes(token), `method paragraph ${i + 1}: ${token} must appear in both languages or neither`);
  });
  assert.deepEqual(Object.keys(cs.status), Object.keys(en.status));
  assert.ok(cs.translationNote.length > 20, 'the Czech page must say it is an unreviewed translation');
  // A translated sentence about a cell must carry the same dates and numbers as the English one.
  const nums = (s: string) => (s.match(/\d+/g) ?? []).sort().join(',');
  for (const { company, layer, cell } of CELLS) {
    if (!cell.cs) continue;
    for (const k of ['summary', 'beforeSummary', 'note'] as const) {
      if (cell.cs[k] !== undefined) assert.equal(nums(cell.cs[k]!), nums(cell[k] ?? ''), `${company.id}/${layer}: the Czech ${k} has different numbers or dates than the English`);
    }
  }
});

test('the open data file carries every record, and none of our internal paths', async () => {
  const { GET } = await import('../app/accord/data.json/route');
  const res = GET();
  assert.equal(res.headers.get('content-type')?.startsWith('application/json'), true);
  const text = await res.text();
  assert.ok(!text.includes('textFile'), 'internal text file paths must not be published');
  assert.ok(!text.includes('docs-internal'), 'internal folder names must not be published');
  const data = JSON.parse(text) as { companies: { id: string; commitments: Record<string, { status: string; since: unknown[] }> }[]; commitments: unknown[]; license: string; checkedOn: string };
  assert.equal(data.companies.length, 6);
  assert.equal(data.commitments.length, 5);
  assert.equal(data.license, 'CC BY 4.0');
  assert.equal(data.checkedOn, CHECKED_ON);
  for (const c of data.companies) assert.deepEqual(Object.keys(c.commitments).sort(), ['L1', 'L2', 'L3', 'L4']);
});

test('the Czech summaries of the meetings record and the context items carry the same numbers and dates as the English', () => {
  const nums = (t: string) => (t.match(/\d+/g) ?? []).sort().join(',');
  const meetingsCs = (MEETINGS as { cs?: { summary?: string } }).cs?.summary;
  if (meetingsCs) assert.equal(nums(meetingsCs), nums(MEETINGS.summary), 'meetings: the Czech summary has different numbers');
  for (const item of CONTEXT.items) {
    if (!item.cs) continue;
    assert.equal(nums(item.cs.text ?? ''), nums(item.text), `${item.id}: the Czech text has different numbers or dates than the English`);
    assert.ok(item.cs.title && item.cs.title.length >= 5, `${item.id}: Czech title`);
  }
});
