import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ISSUES, LATEST } from '../content/issues';
import { CAP, ENTRIES, NOMINEE_DAYS, SECTIONS, START_HERE, UPDATED, reviewDate } from '../content/hall';
import { KIND_LABEL, STANCE_LABEL, type Pick } from '../content/types';

const DAY = 864e5;
const at = (date: string) => Date.parse(`${date}T12:00:00Z`);
const isDate = (value: string) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(value) && !Number.isNaN(at(value.length === 10 ? value : `${value}-01`.slice(0, 10)));

function checkPick(pick: Pick, where: string) {
  assert.ok(pick.id.match(/^[a-z0-9-]+$/), `${where}: id "${pick.id}" must be a URL-safe slug`);
  assert.ok(new URL(pick.url).protocol === 'https:', `${where}: ${pick.url} must be https`);
  assert.ok(isDate(pick.published), `${where}: published "${pick.published}" is not a date`);
  assert.ok(pick.kind in KIND_LABEL, `${where}: unknown kind ${pick.kind}`);
  assert.ok(pick.stance in STANCE_LABEL, `${where}: unknown stance ${pick.stance}`);
  assert.ok(pick.why.length >= 40 && pick.why.length <= 280, `${where}: "why" should be one or two sentences (${pick.why.length} chars)`);
  assert.match(pick.why, /[.!?”’]$/, `${where}: "why" should end like a sentence`);
  if (pick.kind === 'video' && pick.url.includes('youtube.com')) assert.ok(pick.minutes, `${where}: a YouTube video needs its running time`);
}

test('issues are newest first, and LATEST is the newest', () => {
  for (let i = 1; i < ISSUES.length; i++) assert.ok(ISSUES[i - 1].to > ISSUES[i].to);
  assert.equal(LATEST, ISSUES[0]);
  assert.deepEqual(ISSUES.map(issue => issue.number), ISSUES.map((_, i) => ISSUES.length - i));
});

for (const issue of ISSUES) {
  test(`issue ${issue.number} covers seven days and holds seven picks from them`, () => {
    assert.equal(issue.slug, issue.to);
    assert.equal((at(issue.to) - at(issue.from)) / DAY, 7);
    assert.equal(issue.picks.length, 7);
    assert.equal(new Set(issue.picks.map(pick => pick.id)).size, 7, 'pick ids must be unique');
    assert.equal(new Set(issue.picks.map(pick => pick.url)).size, 7, 'a link can only be picked once');
    for (const pick of issue.picks) {
      checkPick(pick, `issue ${issue.number} / ${pick.id}`);
      assert.ok(pick.published >= issue.from && pick.published <= issue.to, `${pick.id} was published ${pick.published}, outside the week`);
    }
  });

  test(`issue ${issue.number}: every event happened that week and has two independent sources`, () => {
    assert.ok(issue.main.length >= 3 && issue.main.length <= 6, 'three to six main events');
    for (const event of [...issue.main, ...issue.also]) {
      assert.ok(event.date >= issue.from && event.date <= issue.to, `"${event.headline}" is dated ${event.date}, outside the week`);
      assert.ok(event.sources.length >= 2, `"${event.headline}" needs at least two sources`);
      const hosts = new Set(event.sources.map(source => new URL(source.url).hostname));
      assert.ok(hosts.size >= 2, `"${event.headline}" cites one outlet twice; it needs two independent reports`);
    }
    for (let i = 1; i < issue.main.length; i++) assert.ok(issue.main[i - 1].date <= issue.main[i].date, 'main events go in date order');
  });
}

test(`the Hall of Fame holds at most ${CAP} entries, each once`, () => {
  assert.ok(ENTRIES.length <= CAP, `${ENTRIES.length} entries, cap is ${CAP}`);
  assert.equal(new Set(ENTRIES.map(entry => entry.id)).size, ENTRIES.length, 'entry ids must be unique');
  assert.equal(new Set(ENTRIES.map(entry => entry.url)).size, ENTRIES.length, 'an entry can only appear once');
  for (const entry of ENTRIES) checkPick(entry, `hall / ${entry.id}`);
});

test('every section has entries, and contested sections carry a skeptical one', () => {
  for (const section of SECTIONS) {
    const inSection = ENTRIES.filter(entry => entry.section === section.id);
    assert.ok(inSection.length > 0, `${section.id} is empty`);
    if (section.contested) assert.ok(inSection.some(entry => entry.stance === 'skeptical'), `${section.id} promises the other side but has no skeptical entry`);
  }
  assert.deepEqual([...new Set(ENTRIES.map(entry => entry.section))], SECTIONS.map(section => section.id), 'entries are grouped in section order');
});

test('start here fits one evening', () => {
  assert.ok(START_HERE.length >= 4 && START_HERE.length <= 6);
  const minutes = START_HERE.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0);
  assert.ok(START_HERE.every(entry => entry.minutes), 'every start-here item has a running time');
  assert.ok(minutes <= 180, `start here takes ${minutes} minutes`);
});

test(`entries younger than ${NOMINEE_DAYS} days on the update date are nominees until they have lasted`, () => {
  const sample = (published: string) => reviewDate({ ...ENTRIES[0], published });
  assert.equal(sample('2026-09-20'), '2026-12-19');
  assert.equal(sample('2023-10-09'), null);
  assert.equal(sample('2020'), null);
  for (const entry of ENTRIES) {
    const due = reviewDate(entry);
    if (due) assert.ok(at(due) > at(UPDATED));
  }
});

test('the copy is American English', () => {
  const words = [...ISSUES.flatMap(issue => [issue.summary, ...issue.main.map(e => e.text), ...issue.picks.map(p => p.why)]), ...ENTRIES.map(e => e.why)].join(' ');
  for (const british of ['maths', 'organis', 'behaviour', 'colour', 'favour', 'sceptic', 'programme', 'authoris', 'recognis']) {
    assert.ok(!words.toLowerCase().includes(british), `found "${british}"`);
  }
});
