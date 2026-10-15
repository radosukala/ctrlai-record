import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ENTRIES, LATEST_DAY, WEEK, isPerson, linkOnly } from '../content/base';
import { CHANGING, COUNTS, DAYS, LATEST_DAY_RUN, MONTHS, dayEdition, monthEdition, neighbors, spanLabel, usable, weekEdition, type Edition } from '../content/base/editions';
import { LINES } from '../content/base/edition-lines';

const ROOT = path.join(import.meta.dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const editions: Edition[] = [
  ...DAYS.map(d => dayEdition(d)!),
  weekEdition(),
  ...MONTHS.map(m => monthEdition(m)),
];

test('there is a day edition for every daily run, and the front page reads the newest', () => {
  assert.ok(DAYS.length > 0);
  assert.equal(LATEST_DAY_RUN, DAYS[DAYS.length - 1]);
  for (const d of DAYS) assert.ok(dayEdition(d), `no edition for ${d}`);
  assert.equal(dayEdition('1999-01-01'), undefined);
  assert.deepEqual(neighbors(DAYS[0]).prev, undefined);
  assert.deepEqual(neighbors(LATEST_DAY_RUN).next, undefined);
  assert.ok(MONTHS.includes(LATEST_DAY_RUN.slice(0, 7)));
});

test('a day edition is exactly its run; a week, the seven days up to the newest entry; a month, the entries published in it', () => {
  for (const d of DAYS) assert.deepEqual(dayEdition(d)!.entries.map(e => e.slug).sort(), ENTRIES.filter(e => e.run === d).map(e => e.slug).sort());
  assert.equal(weekEdition().entries.length, WEEK.length);
  assert.equal(weekEdition().to, LATEST_DAY);
  for (const m of MONTHS) assert.ok(monthEdition(m).entries.every(e => e.published.startsWith(m)));
});

for (const ed of editions) {
  const name = ed.key;
  const counts = COUNTS[ed.horizon];

  test(`${name}: "what changed" holds only changes we read in full, one per story, most important first`, () => {
    assert.ok(ed.changes.length <= counts.changes);
    const stories = ed.changes.map(p => p.e.story).filter(Boolean);
    assert.equal(new Set(stories).size, stories.length, 'two changes from one story');
    for (const { e, q } of ed.changes) {
      assert.ok(e.change && CHANGING.includes(e.change.kind), `${e.slug} is not a change`);
      assert.ok(!linkOnly(e), `${e.slug} was read from its description only`);
      if (q) assert.ok(usable(q) && e.quotes.includes(q), `${e.slug}: its quotation is not a usable checked one`);
    }
    for (let i = 1; i < ed.changes.length; i++) assert.ok(ed.changes[i - 1].e.importance >= ed.changes[i].e.importance, 'not most important first');
  });

  test(`${name}: "said" has one person per quotation, at most two from any group, none already quoted above`, () => {
    assert.ok(ed.said.length <= counts.said);
    const speakers = ed.said.map(s => s.q.speaker);
    assert.equal(new Set(speakers).size, speakers.length, 'a person is quoted twice');
    const above = new Set(ed.changes.map(p => p.q?.speaker).filter(Boolean));
    for (const s of ed.said) {
      assert.ok(isPerson(s.q.speaker), `${s.q.speaker} is not a person`);
      assert.ok(usable(s.q), `${s.q.id} is not usable`);
      assert.ok(!above.has(s.q.speaker), `${s.q.speaker} is already quoted under what changed`);
      assert.ok(s.e.importance >= 2, `${s.e.slug} is background`);
    }
    const groups = new Map<string, number>();
    for (const s of ed.said) groups.set(s.group ?? 'other', (groups.get(s.group ?? 'other') ?? 0) + 1);
    for (const [g, n] of groups) assert.ok(n <= 2, `${n} quotations from the group ${g}`);
  });

  test(`${name}: "watch and listen" ranks only interviews read in full; research and the ledger hold what they say`, () => {
    assert.ok(ed.watch.length <= counts.watch);
    for (const { e } of ed.watch) {
      assert.ok(e.kind === 'video' || e.kind === 'podcast');
      assert.ok(!linkOnly(e), `${e.slug} is ranked from its description`);
    }
    assert.ok(ed.watchRead <= ed.watchAll);
    const above = new Set([...ed.changes.flatMap(p => (p.q ? [p.q.id] : [])), ...ed.said.map(s => s.q.id)]);
    for (const { q } of ed.watch) if (q) assert.ok(!above.has(q.id), `${q.id} is shown twice`);
    for (const e of ed.research) assert.equal(e.kind, 'research');
    for (const e of ed.decided) assert.ok(['decision', 'commitment', 'correction'].includes(e.change!.kind));
  });

  test(`${name}: nothing is lost; what isn't shown above is under "everything else"`, () => {
    const shown = new Set([...ed.changes.map(p => p.e.slug), ...ed.watch.map(p => p.e.slug), ...ed.research.map(e => e.slug)]);
    const rest = ed.rest.flatMap(g => g.entries.map(e => e.slug));
    assert.equal(new Set(rest).size, rest.length, 'an entry is filed twice');
    assert.deepEqual([...shown, ...rest].sort(), ed.entries.map(e => e.slug).sort());
  });

  test(`${name}: a headline, written for this very edition or else its top change`, () => {
    assert.ok(ed.line.length > 20);
    if (ed.written) assert.equal(ed.line, LINES[ed.key]);
    else if (ed.horizon === 'day' && ed.changes.length) assert.equal(ed.line, ed.changes[0].e.change!.note);
  });
}

test('a written headline belongs to one edition key, and keys say which edition', () => {
  for (const key of Object.keys(LINES)) assert.match(key, /^(day:\d{4}-\d{2}-\d{2}|week:\d{4}-\d{2}-\d{2}|month:\d{4}-\d{2}@\d{4}-\d{2}-\d{2})$/, `odd key ${key}`);
});

test('spans read like the rest of the site', () => {
  assert.equal(spanLabel('2026-10-09', '2026-10-15'), 'Oct 9–15');
  assert.equal(spanLabel('2026-09-28', '2026-10-04'), 'Sep 28 – Oct 4');
  assert.equal(spanLabel('2026-10-15', '2026-10-15'), 'Oct 15');
});

test('the front page is today\'s edition with this week and this month as tabs, and the films stay on it', () => {
  const page = read('app/page.tsx');
  assert.match(page, /EditionTabs/);
  assert.match(page, /id: 'today'/);
  assert.match(page, /id: 'week'/);
  assert.match(page, /id: 'month'/);
  assert.match(page, /FILM_PUBLIC \? <FilmHero \/> : null/);
  assert.match(page, /DAY_BEFORE_PUBLIC \? <DayBeforeBand/);
});

test('every edition has a permanent page in the sitemap, and the questions have an index again', () => {
  const sitemap = read('app/sitemap.ts');
  assert.match(sitemap, /\/day\/\$\{d\}/);
  assert.match(sitemap, /\/month\/\$\{m\}/);
  assert.match(sitemap, /absoluteUrl\('\/questions'\)/);
  assert.doesNotMatch(read('next.config.ts'), /'\/questions'/, '/questions must not redirect any more');
});
