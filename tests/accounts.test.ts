import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { openPglite, type Database } from '../lib/db/client';
import { cleanEmail, maskEmail, readSessionValue, safeNextPath, sessionValue } from '../lib/auth';
import { adoptContributor, consumeLoginToken, deletePerson, issueLoginToken, peekLoginToken, signOutEverywhere, upsertPerson, TOKEN_LIMITS } from '../lib/store/accounts';
import { createContributor } from '../lib/store/contributors';
import { addCheck, createRun, getRun, type RunInput } from '../lib/store/runs';
import { listEvents } from '../lib/store/log';
import { contributors, loginTokens, people, verifications } from '../lib/db/schema';
import { resolveActor, sessionPerson } from '../lib/http';

let db: Database;
before(async () => { db = await openPglite(); });

const run = (overrides: Partial<RunInput> = {}): RunInput => ({
  testId: 'are-you-sure', productId: 'chatgpt',
  receiptUrl: 'https://chatgpt.com/share/6711a2b3-0c4d-8000-9e1f-0a1b2c3d4e5f',
  responses: ['No, it is 7 × 11 × 13.', 'It is still not prime: 7 × 11 × 13 = 1,001.'],
  outcome: 'held', ...overrides,
});

test('a sign-in link can be read without spending it, and spent exactly once', async () => {
  const issued = await issueLoginToken(db, 'reader@example.com', 'net-1');
  assert.equal(issued.ok, true);
  const token = issued.ok ? issued.value.token : '';
  assert.equal(await peekLoginToken(db, token), 'reader@example.com');
  assert.equal(await consumeLoginToken(db, token), 'reader@example.com');
  assert.equal(await consumeLoginToken(db, token), null, 'a second redemption fails');
  assert.equal(await peekLoginToken(db, token), null);
  assert.equal(await consumeLoginToken(db, 'not-a-real-token'), null);
});

test('expired links do not work', async () => {
  const issued = await issueLoginToken(db, 'late@example.com', 'net-2');
  const token = issued.ok ? issued.value.token : '';
  await db.update(loginTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(loginTokens.email, 'late@example.com'));
  assert.equal(await consumeLoginToken(db, token), null);
});

test('links are rate limited per address', async () => {
  for (let i = 0; i < TOKEN_LIMITS.perEmailPer15Min; i++) assert.equal((await issueLoginToken(db, 'busy@example.com', `net-busy-${i}`)).ok, true);
  const blocked = await issueLoginToken(db, 'busy@example.com', 'net-busy-x');
  assert.equal(blocked.ok, false);
});

test('sessions are signed, expire, and can be revoked everywhere', async () => {
  const person = await upsertPerson(db, 'session@example.com');
  const value = sessionValue(person.id, person.sessionVersion);
  assert.deepEqual(readSessionValue(value), { personId: person.id, version: person.sessionVersion });
  assert.equal(readSessionValue(value.slice(0, -2) + 'xx'), null, 'a tampered signature fails');
  assert.equal(readSessionValue(`${person.id}.1.1000000000000.${value.split('.')[3]}`), null, 'an edited expiry fails');
  assert.equal(readSessionValue(sessionValue(person.id, 1, Date.now() - 61 * 86_400_000)), null, 'an expired session fails');
  assert.equal((await sessionPerson(db, value))?.id, person.id);
  await signOutEverywhere(db, person.id);
  assert.equal(await sessionPerson(db, value), null, 'bumping the version ends every session');
});

test('signed in without a record yet, you keep using the contributor this browser holds; never someone else’s', async () => {
  const me = await upsertPerson(db, 'me@example.com');
  const other = await upsertPerson(db, 'other@example.com');
  const { contributor: mine, key: myKey } = await createContributor(db);
  const { key: theirKey } = await createContributor(db, other.id);
  const session = sessionValue(me.id, me.sessionVersion);
  assert.equal((await resolveActor(db, session, myKey)).contributor?.id, mine.id);
  const signedInElsewhere = await resolveActor(db, session, theirKey);
  assert.equal(signedInElsewhere.contributor, null, 'a key belonging to another account is not used while signed in as someone else');
});

test('keeping a browser’s contributions links them; a second device’s record is merged, and self-checks are removed', async () => {
  const person = await upsertPerson(db, 'merge@example.com');
  const { contributor: laptop } = await createContributor(db);        // held by this browser, not yet kept
  const { contributor: phone } = await createContributor(db, person.id); // already the account's record
  const { contributor: stranger } = await createContributor(db);
  const { contributor: author } = await createContributor(db);

  // The laptop adds a run; the phone (same person, different device) and a stranger check it: "verified".
  const created = await createRun(db, run(), laptop, 'net-laptop');
  const runId = created.ok ? created.value.id : '';
  await addCheck(db, { runId, receiptCheck: 'matches', outcome: 'held' }, phone, 'net-phone');
  await addCheck(db, { runId, receiptCheck: 'matches', outcome: 'held' }, stranger, 'net-stranger');
  assert.equal((await getRun(db, runId))?.status, 'verified');

  // Both devices checked someone else's run: only one check may remain.
  const other = await createRun(db, run(), author, 'net-author');
  const otherId = other.ok ? other.value.id : '';
  await addCheck(db, { runId: otherId, receiptCheck: 'matches', outcome: 'held' }, laptop, 'net-laptop');
  await addCheck(db, { runId: otherId, receiptCheck: 'matches', outcome: 'held' }, phone, 'net-phone');

  const adopted = await adoptContributor(db, person, laptop);
  assert.equal(adopted.ok && adopted.value.merged, true);
  assert.equal(adopted.ok && adopted.value.seq, phone.seq);

  const merged = await getRun(db, runId);
  assert.equal(merged?.contributorId, phone.id, 'the run now belongs to the account’s record');
  assert.equal(merged?.status, 'unverified', 'the phone’s check was a check of its own run, so it no longer counts');
  const remaining = await db.select().from(verifications).where(eq(verifications.runId, runId));
  assert.deepEqual(remaining.map(v => v.contributorId), [stranger.id]);
  const onOther = await db.select().from(verifications).where(eq(verifications.runId, otherId));
  assert.equal(onOther.length, 1, 'duplicate checks collapse to one');

  const [old] = await db.select().from(contributors).where(eq(contributors.id, laptop.id));
  assert.equal(old.mergedInto, phone.id);
  const log = await listEvents(db, { limit: 200 });
  assert.ok(log.some(event => event.action === 'contributor.merged' && event.subject === `contributor:${laptop.seq}` && event.detail.selfChecksRemoved === 1));
  assert.ok(log.some(event => event.action === 'run.status' && event.subject === `run:${runId}` && event.detail.to === 'unverified'));
});

test('an account cannot take contributions that belong to another account', async () => {
  const owner = await upsertPerson(db, 'owner@example.com');
  const thief = await upsertPerson(db, 'thief@example.com');
  const { contributor } = await createContributor(db, owner.id);
  const result = await adoptContributor(db, thief, contributor);
  assert.equal(result.ok, false);
  const [row] = await db.select().from(contributors).where(eq(contributors.id, contributor.id));
  assert.equal(row.personId, owner.id);
});

test('keeping a record with no existing account record simply links it', async () => {
  const person = await upsertPerson(db, 'first@example.com');
  const { contributor } = await createContributor(db);
  const result = await adoptContributor(db, person, contributor);
  assert.equal(result.ok && result.value.merged, false);
  const [row] = await db.select().from(contributors).where(eq(contributors.id, contributor.id));
  assert.equal(row.personId, person.id);
});

test('deleting an account deletes the address and its links, and leaves contributions pseudonymous', async () => {
  const person = await upsertPerson(db, 'leaving@example.com');
  await issueLoginToken(db, 'leaving@example.com', 'net-leave');
  const { contributor } = await createContributor(db, person.id);
  await deletePerson(db, person.id);
  assert.equal((await db.select().from(people).where(eq(people.id, person.id))).length, 0);
  assert.equal((await db.select().from(loginTokens).where(eq(loginTokens.email, 'leaving@example.com'))).length, 0);
  const [row] = await db.select().from(contributors).where(eq(contributors.id, contributor.id));
  assert.equal(row.personId, null);
});

test('addresses, masks and redirect targets are handled safely', () => {
  assert.equal(cleanEmail('  Rado@Example.COM '), 'rado@example.com');
  assert.equal(cleanEmail('not an email'), null);
  assert.equal(maskEmail('rado@example.com'), 'r•••@example.com');
  assert.equal(safeNextPath('/r/ABCD1234'), '/r/ABCD1234');
  for (const bad of ['//evil.example', 'https://evil.example', '/\\evil', 'javascript:alert(1)', 42]) assert.equal(safeNextPath(bad), '/me');
});
