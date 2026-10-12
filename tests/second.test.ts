import { test } from 'node:test';
import assert from 'node:assert/strict';
import { secondOpinion } from '../scripts/radar/second';

const SECOND = 'well anthropic was very careful in all of their interviews with me to say very clearly that they are uncertain chris never went as far as saying absolutely these are conscious beings and it was about two hundred people';

test('words one tool keeps and the other tidies away do not fail a quotation', () => {
  const o = secondOpinion('Anthropic was very careful in all of their interviews with me to say very clearly that they are uncertain, right? Chris never went as far as saying, like, absolutely, these are conscious beings.', SECOND);
  assert.ok(o.ok, o.reason);
  assert.deepEqual(o.missing, ['right', 'like']);
});

test('a negation the second transcript does not have fails the quotation', () => {
  const o = secondOpinion('Chris never went as far as saying absolutely these are not conscious beings', SECOND);
  assert.equal(o.ok, false);
  assert.match(o.reason ?? '', /"not"/);
});

test('a number the second transcript does not have fails the quotation', () => {
  const o = secondOpinion('and it was about three hundred people', SECOND);
  assert.equal(o.ok, false);
  assert.match(o.reason ?? '', /"three"/);
});

test('a quotation mostly missing from the second transcript fails', () => {
  const o = secondOpinion('they were deeply worried about the regulators in Brussels and Washington', SECOND);
  assert.equal(o.ok, false);
});
