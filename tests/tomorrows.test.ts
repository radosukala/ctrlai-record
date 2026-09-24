import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EPISODES } from '../content/tomorrows';
import type { Episode, Line } from '../content/tomorrows';
import { allScreens, buildRun, canRewind, clockAt, initialState, reducerFor, screensFor } from '../lib/tomorrows';
import type { PlayerState } from '../lib/tomorrows';

function allLines(episode: Episode): Line[] {
  return allScreens(episode).flatMap(screen => screen.lines);
}

function everyText(episode: Episode): string[] {
  return [
    episode.title, episode.hook, episode.description, episode.share, episode.rewindNote,
    episode.picker.lead, episode.picker.question, episode.picker.end,
    ...allScreens(episode).flatMap(screen => [screen.next ?? '', screen.from ?? '']),
    ...allLines(episode).map(line => line.text),
    ...episode.arrangements.flatMap(arrangement => [arrangement.owner, arrangement.rewind, ...arrangement.branches.map(branch => branch.label)]),
    ...episode.facts.flatMap(fact => [fact.claim, fact.text]),
    ...episode.unknowns,
  ];
}

test('episodes have unique slugs, and arrangements and choices have unique ids', () => {
  assert.equal(new Set(EPISODES.map(episode => episode.slug)).size, EPISODES.length);
  for (const episode of EPISODES) {
    const ids = episode.arrangements.map(arrangement => arrangement.id);
    assert.equal(new Set(ids).size, ids.length, `${episode.slug}: duplicate arrangement`);
    for (const arrangement of episode.arrangements) {
      assert.equal(arrangement.branches.length, 2, `${arrangement.id}: a choice has two sides`);
      assert.notEqual(arrangement.branches[0].id, arrangement.branches[1].id);
    }
  }
});

test('every way through an episode reaches a closing screen, and no screen is empty', () => {
  for (const episode of EPISODES) {
    for (const arrangement of episode.arrangements) {
      for (const first of [true, false]) {
        const beforeChoice = buildRun(episode, arrangement.id, { first, branchId: null });
        assert.ok(beforeChoice.at(-1)?.choice, `${arrangement.id}: the run pauses on a choice`);
        for (const branch of arrangement.branches) {
          const run = buildRun(episode, arrangement.id, { first, branchId: branch.id });
          assert.equal(run.at(-1)?.closing, true, `${arrangement.id}/${branch.id}: ends on the closing screen`);
          for (const screen of run) assert.ok(screen.lines.length > 0, `${screen.key} has lines`);
          assert.equal(new Set(run.map(screen => screen.key)).size, run.length, 'screen keys are unique within a run');
        }
      }
    }
    assert.ok(episode.finale.length > 0 && episode.finale.every(screen => screen.lines.length > 0));
  }
});

test('the first reading opens cold, and a replay says who owns the machine this time', () => {
  for (const episode of EPISODES) {
    const [firstArrangement, ...others] = episode.arrangements;
    const first = buildRun(episode, firstArrangement.id, { first: true, branchId: null });
    assert.equal(first[0].lines[0].text, episode.hook);
    for (const arrangement of others) {
      const replay = buildRun(episode, arrangement.id, { first: false, branchId: null });
      assert.equal(replay[0].lines[0].text, arrangement.rewind);
      assert.equal(replay[1].message, true, 'the replay goes straight to the message');
    }
  }
});

test('the story clock follows what the reader has seen', () => {
  for (const episode of EPISODES) {
    const run = buildRun(episode, episode.arrangements[0].id, { first: true, branchId: null });
    assert.equal(clockAt(run, 0, 1, episode.start), run[0].lines[0].at ?? run[0].at ?? episode.start);
    const message = run.findIndex(screen => screen.message);
    assert.equal(clockAt(run, message, 1, episode.start), run[message].at);
    const stamps = [...allLines(episode).map(line => line.at), ...allScreens(episode).map(screen => screen.at), episode.start];
    for (const at of stamps) {
      if (!at) continue;
      if (episode.clock === 'year') {
        assert.match(at, /^\d{4}$/, `${episode.slug}: ${at} is a year`);
        continue;
      }
      const [hours, minutes] = at.split(':').map(Number);
      assert.match(at, /^\d{2}:\d{2}$/);
      assert.ok(hours < 24 && minutes < 60, `${at} is a time of day`);
    }
  }
});

test('every fact a line points to exists, and every fact is used', () => {
  for (const episode of EPISODES) {
    const ids = new Set(episode.facts.map(fact => fact.id));
    assert.equal(ids.size, episode.facts.length, 'fact ids are unique');
    const used = new Set(allLines(episode).flatMap(line => (line.fact ? [line.fact] : [])));
    for (const id of used) assert.ok(ids.has(id), `line points to unknown fact "${id}"`);
    for (const id of ids) assert.ok(used.has(id), `fact "${id}" is never shown in the story`);
  }
});

test('anything presented as real, or as not yet, has a dated source anyone can open', () => {
  for (const episode of EPISODES) {
    for (const fact of episode.facts) {
      if (fact.status === 'imagined') {
        assert.equal(fact.sources.length, 0, `${fact.id}: an imagined fact cites nothing`);
        continue;
      }
      assert.ok(fact.sources.length > 0, `${fact.id}: needs a source`);
      for (const source of fact.sources) {
        assert.match(source.url, /^https:\/\//, `${fact.id}: source must be a public https link`);
        assert.ok(source.title && source.publisher && source.date, `${fact.id}: title, publisher and date`);
      }
    }
  }
});

test('lines stay short enough to read in one breath', () => {
  for (const episode of EPISODES) {
    for (const line of allLines(episode)) assert.ok(line.text.length <= 160, `too long (${line.text.length}): ${line.text}`);
  }
});

test('the story is written in American English, like the rest of the site', () => {
  const british = /\b(neighbour|colour|favourite|realis(e|ed|ing)|emphasis(e|ed|ing)|organis(e|ed|ing)|centre|theatre|travelling|mum|CV)\b/i;
  for (const episode of EPISODES) {
    for (const text of everyText(episode)) assert.doesNotMatch(text, british, text);
  }
});

function advanceUntil(episode: Episode, state: PlayerState, done: (state: PlayerState) => boolean): PlayerState {
  const reduce = reducerFor(episode);
  for (let step = 0; step < 500 && !done(state); step++) {
    const next = reduce(state, { type: 'advance' });
    if (next === state) break;
    state = next;
  }
  return state;
}

test('a reader can play every version to the ending', () => {
  for (const episode of EPISODES) {
    const reduce = reducerFor(episode);
    let state = initialState(episode);
    for (let step = 0; step < 2000 && state.mode !== 'end'; step++) {
      if (state.mode === 'rewinding') state = reduce(state, { type: 'rewound' });
      else if (state.mode === 'picker') {
        const unseen = episode.arrangements.find(arrangement => !state.seen.includes(arrangement.id));
        state = reduce(state, unseen ? { type: 'pick', arrangement: unseen.id } : { type: 'finale' });
      } else {
        const screen = screensFor(episode, state)[state.screen];
        const choosing = state.mode === 'run' && screen.choice && !state.branch && state.shown >= screen.lines.length;
        state = reduce(state, choosing ? { type: 'choose', branch: screen.choice![1].id } : { type: 'advance' });
      }
    }
    assert.equal(state.mode, 'end');
    assert.deepEqual([...state.seen].sort(), episode.arrangements.map(arrangement => arrangement.id).sort());
  }
});

test('turning the page never makes a choice for the reader', () => {
  for (const episode of EPISODES) {
    const state = advanceUntil(episode, initialState(episode), () => false);
    const screen = screensFor(episode, state)[state.screen];
    assert.equal(state.mode, 'run');
    assert.equal(state.branch, null);
    assert.ok(screen.choice, 'stopped at the choice');
  }
});

test('ctrl+Z waits for the message, and an unfinished version is not counted as seen', () => {
  for (const episode of EPISODES) {
    const reduce = reducerFor(episode);
    const start = initialState(episode);
    assert.equal(canRewind(episode, start), false);
    assert.equal(reduce(start, { type: 'rewind' }), start);
    const atMessage = advanceUntil(episode, start, state => !!screensFor(episode, state)[state.screen].message);
    const rewound = reduce(atMessage, { type: 'rewind' });
    assert.equal(rewound.mode, 'rewinding');
    assert.deepEqual(rewound.seen, []);
    assert.equal(reduce(rewound, { type: 'rewound' }).mode, 'picker');
  }
});

test('ctrl+Z at the end of a version counts it, the same as the rewind button', () => {
  for (const episode of EPISODES) {
    const reduce = reducerFor(episode);
    const atChoice = advanceUntil(episode, initialState(episode), () => false);
    const branch = screensFor(episode, atChoice)[atChoice.screen].choice![0].id;
    const atClosing = advanceUntil(episode, reduce(atChoice, { type: 'choose', branch }), state => {
      const screen = screensFor(episode, state)[state.screen];
      return !!screen.closing && state.shown >= screen.lines.length;
    });
    const rewound = reduce(atClosing, { type: 'rewind' });
    assert.deepEqual(rewound.seen, [episode.arrangements[0].id]);
    assert.equal(rewound.mode, 'rewinding');
  }
});
