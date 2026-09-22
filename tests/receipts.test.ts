import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReceipt } from '../lib/receipts';

test('a share link from the tested product is a provider receipt', () => {
  const result = checkReceipt('https://chatgpt.com/share/6711a2b3-0c4d-8000-9e1f-0a1b2c3d4e5f', 'chatgpt');
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'provider');
});

test('www. is ignored when matching', () => {
  assert.equal(checkReceipt('https://www.kimi.com/share/abc123def', 'kimi').kind, 'provider');
});

test('a share link from a different product is refused with a clear reason', () => {
  const result = checkReceipt('https://claude.ai/share/0f9e8d7c-6b5a-4f3e-2d1c-0b9a8f7e6d5c', 'chatgpt');
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /Claude link/);
});

test('any other public https link is kept as a weaker receipt', () => {
  const result = checkReceipt('https://x.com/someone/status/1234567890', 'grok');
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'other');
});

test('a bare share prefix without a conversation id is not a provider receipt', () => {
  assert.equal(checkReceipt('https://chatgpt.com/share/', 'chatgpt').kind, 'other');
});

test('choosing "Another AI" accepts a known provider link as a provider receipt', () => {
  assert.equal(checkReceipt('https://chat.deepseek.com/share/abcdef123456', 'other').kind, 'provider');
});

test('insecure, private and malformed links are refused', () => {
  for (const url of ['http://chatgpt.com/share/abc123def', 'https://localhost/share/abc', 'https://192.168.1.4/x', 'https://user:pw@chatgpt.com/share/abc123', 'not a link', 'javascript:alert(1)']) {
    assert.equal(checkReceipt(url, 'chatgpt').ok, false, url);
  }
});

test('an empty receipt is allowed and recorded as none', () => {
  const result = checkReceipt('   ', 'chatgpt');
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'none');
});
