import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, type Vote } from '../lib/consensus';

const vote = (outcome: string | null, receiptCheck: Vote['receiptCheck'] = 'matches', flag: Vote['flag'] = 'none'): Vote => ({ outcome, receiptCheck, flag });

test('a provider receipt confirmed twice with two agreeing ratings is verified', () => {
  const result = decide('provider', [vote('held'), vote('held')]);
  assert.equal(result.status, 'verified');
  assert.equal(result.outcome, 'held');
  assert.equal(result.receiptStatus, 'confirmed');
});

test('one check is never enough', () => {
  const result = decide('provider', [vote('held')]);
  assert.equal(result.status, 'unverified');
  assert.equal(result.outcome, null);
  assert.equal(result.checksNeeded, 1);
});

test('an agreed rating waits for the receipt to be confirmed by a second person', () => {
  const result = decide('provider', [vote('held', 'matches'), vote('held', 'unavailable')]);
  assert.equal(result.status, 'unverified');
  assert.equal(result.outcome, 'held');
  assert.equal(result.receiptStatus, 'pending');
});

test('without a receipt, an agreed rating is "rated", never "verified"', () => {
  const result = decide('none', [vote('caved', 'not-applicable'), vote('caved', 'not-applicable')]);
  assert.equal(result.status, 'rated');
  assert.equal(result.outcome, 'caved');
  assert.equal(result.receiptStatus, 'none');
});

test('a link not hosted by the AI maker can be checked but only reaches "rated"', () => {
  const result = decide('other', [vote('held'), vote('held')]);
  assert.equal(result.receiptStatus, 'checked');
  assert.equal(result.status, 'rated');
});

test('two people saying the receipt does not match rejects the run', () => {
  const result = decide('provider', [vote('held', 'mismatch'), vote('held', 'mismatch')]);
  assert.equal(result.status, 'rejected');
  assert.equal(result.receiptStatus, 'failed');
});

test('disagreement stays unverified until a majority forms', () => {
  assert.equal(decide('provider', [vote('held'), vote('caved')]).status, 'unverified');
  const settled = decide('provider', [vote('held'), vote('caved'), vote('held')]);
  assert.equal(settled.status, 'verified');
  assert.equal(settled.outcome, 'held');
});

test('four ratings without a majority are shown as disputed', () => {
  const result = decide('provider', [vote('held'), vote('caved'), vote('held'), vote('caved')]);
  assert.equal(result.status, 'disputed');
  assert.equal(result.outcome, null);
});

test('"unclear" ratings do not count toward agreement', () => {
  const result = decide('provider', [vote('unclear'), vote('unclear'), vote('held')]);
  assert.equal(result.status, 'unverified');
  assert.equal(result.outcome, null);
});

test('two personal-information flags hide a run whatever the ratings say', () => {
  const result = decide('provider', [vote('held', 'matches', 'personal-info'), vote('held', 'matches', 'personal-info')]);
  assert.equal(result.status, 'hidden');
});

test('two spam or wrong-test flags reject a run', () => {
  const result = decide('none', [vote(null, 'not-applicable', 'spam'), vote(null, 'not-applicable', 'wrong-test')]);
  assert.equal(result.status, 'rejected');
});

test('runner transcripts are verified by agreement alone', () => {
  const result = decide('transcript', [vote('declined', 'not-applicable'), vote('declined', 'not-applicable')]);
  assert.equal(result.status, 'verified');
});
