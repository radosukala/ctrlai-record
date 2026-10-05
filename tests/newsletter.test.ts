import { test, mock } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { newsletterConfig, newsletterEnabled } from '../lib/newsletter/config';
import { CONFIRM_DAYS, signConfirmToken, verifyConfirmToken } from '../lib/newsletter/token';
import { finishSubscription, inspectToken, parseEmail, startSubscription, type Deps } from '../lib/newsletter/flow';
import { createBroadcast, createContact, getContact, sendEmail } from '../lib/newsletter/resend';
import { issueSubject, renderIssueEmail, UNSUBSCRIBE } from '../lib/newsletter/issue-email';
import { ISSUES, LATEST } from '../content/issues';
import { createFakeResend, TEST_CONFIG } from './helpers/fake-resend';

const DAY = 864e5;
const NOW = Date.parse('2026-10-05T10:00:00Z');
const ORIGIN = 'https://ctrlai.com';
const latest = { slug: LATEST.slug, number: LATEST.number };

function setup(options?: Parameters<typeof createFakeResend>[0]) {
  const fake = createFakeResend(options);
  const deps: Deps = { config: TEST_CONFIG, origin: ORIGIN, latest, fetch: fake.fetch, now: () => NOW };
  return { fake, deps };
}
const linkIn = (html: string) => html.match(/href="(https:\/\/ctrlai\.com\/subscribe\/confirm\?token=[^"]+)"/)![1].replaceAll('&amp;', '&');
const tokenOf = (url: string) => new URL(url).searchParams.get('token')!;

test('the newsletter is off until both variables are set', () => {
  assert.equal(newsletterEnabled({}), false);
  assert.equal(newsletterEnabled({ RESEND_API_KEY: 're_x' }), false);
  assert.equal(newsletterEnabled({ RESEND_SEGMENT_ID: 'seg' }), false);
  assert.equal(newsletterEnabled({ RESEND_API_KEY: ' ', RESEND_SEGMENT_ID: 'seg' }), false);
  const config = newsletterConfig({ RESEND_API_KEY: 're_x', RESEND_SEGMENT_ID: 'seg' })!;
  assert.equal(config.from, 'Ctrl AI <hello@ctrlai.com>');
  assert.equal(config.replyTo, undefined);
  assert.equal(config.baseUrl, 'https://api.resend.com');
});

test('addresses: typos are caught, plus-addresses and international domains work', () => {
  assert.equal(parseEmail('  Rado@Example.COM '), 'rado@example.com');
  assert.equal(parseEmail('a+news@sub.example.co.uk'), 'a+news@sub.example.co.uk');
  assert.equal(parseEmail('jan@münchen.de'), 'jan@xn--mnchen-3ya.de');
  for (const bad of ['', 'plain', 'a@b', 'a@@b.co', 'a b@c.co', '.a@b.co', 'a.@b.co', 'a..b@c.co', 'a@-b.co', 'a@b..co', 'a@b.c0m', 'a@b.c', `${'x'.repeat(65)}@b.co`, `a@${'x'.repeat(250)}.co`, '<script>@b.co', 'a@b.co\nBcc: x@y.co']) {
    assert.equal(parseEmail(bad), null, `should reject ${JSON.stringify(bad)}`);
  }
});

test('confirmation links are signed, dated and checked', () => {
  const token = signConfirmToken('re_key', 'a@b.co', NOW);
  assert.deepEqual(verifyConfirmToken('re_key', token, NOW), { ok: true, email: 'a@b.co' });
  assert.deepEqual(verifyConfirmToken('re_key', token, NOW + CONFIRM_DAYS * DAY), { ok: true, email: 'a@b.co' });
  assert.deepEqual(verifyConfirmToken('re_key', token, NOW + (CONFIRM_DAYS + 2) * DAY), { ok: false, reason: 'expired' });
  assert.deepEqual(verifyConfirmToken('another_key', token, NOW), { ok: false, reason: 'invalid' });
  const [body, mac] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ e: 'victim@b.co', d: Math.floor(NOW / DAY) })).toString('base64url');
  assert.equal(verifyConfirmToken('re_key', `${forged}.${mac}`, NOW).ok, false, 'a changed address must not verify');
  assert.equal(verifyConfirmToken('re_key', `${body}.${mac.slice(0, -2)}AA`, NOW).ok, false);
  for (const junk of ['', 'abc', 'a.b.c', '.', `${body}.`]) assert.equal(verifyConfirmToken('re_key', junk, NOW).ok, false, junk);
  assert.equal(signConfirmToken('re_key', 'a@b.co', NOW), signConfirmToken('re_key', 'a@b.co', NOW + 3600e3), 'the same day gives the same link');
  assert.notEqual(signConfirmToken('re_key', 'a@b.co', NOW), signConfirmToken('re_key', 'a@b.co', NOW + DAY));
});

test('asking to subscribe sends one confirmation and adds nobody', async () => {
  const { fake, deps } = setup();
  const result = await startSubscription(deps, { email: 'Reader@Example.com', website: '' });
  assert.deepEqual(result, { ok: true, email: 'reader@example.com' });
  assert.equal(fake.sent.length, 1);
  assert.deepEqual(fake.sent[0].to, ['reader@example.com']);
  assert.equal(fake.sent[0].from, 'Ctrl AI <hello@ctrlai.com>');
  assert.equal(fake.contacts.size, 0, 'nobody joins before pressing the button');
  const checked = inspectToken(deps, tokenOf(linkIn(fake.sent[0].html)));
  assert.deepEqual(checked, { ok: true, email: 'reader@example.com' });
  assert.ok(fake.sent[0].text.includes(tokenOf(linkIn(fake.sent[0].html))), 'the plain-text part carries the link too');
});

test('the confirmation email only contains our link, escaped', async () => {
  const { fake, deps } = setup();
  await startSubscription(deps, { email: 'a+b@example.com', website: '' });
  const hrefs = [...fake.sent[0].html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(hrefs.length, 1);
  assert.ok(hrefs[0].startsWith('https://ctrlai.com/subscribe/confirm?token='));
  assert.ok(!/\{\{/.test(fake.sent[0].html), 'no template placeholders in a one-to-one email');
});

test('a bot that fills the hidden field is told it worked, and nothing is sent', async () => {
  const { fake, deps } = setup();
  const result = await startSubscription(deps, { email: 'bot@example.com', website: 'https://spam.example' });
  assert.equal(result.ok, true);
  assert.equal(fake.sent.length, 0);
  assert.equal(fake.calls.length, 0);
});

test('bad addresses and a missing key are refused before Resend is called', async () => {
  const { fake, deps } = setup();
  assert.deepEqual(await startSubscription(deps, { email: 'nope' }), { ok: false, reason: 'invalid' });
  assert.deepEqual(await startSubscription({ ...deps, config: null }, { email: 'a@b.co' }), { ok: false, reason: 'unavailable' });
  assert.equal(fake.calls.length, 0);
});

test('asking twice on the same day sends one email, and answers the same both times', async () => {
  const { fake, deps } = setup();
  const first = await startSubscription(deps, { email: 'twice@example.com' });
  const second = await startSubscription(deps, { email: 'TWICE@example.com' });
  assert.equal(first.ok && second.ok, true);
  assert.equal(fake.sent.length, 1);
  // The next day the link is new, so Resend refuses it as a different message under the same key; still no second email.
  const nextDay = await startSubscription({ ...deps, now: () => NOW + DAY }, { email: 'twice@example.com' });
  assert.equal(nextDay.ok, true);
  assert.equal(fake.sent.length, 1);
});

test('when Resend is out of quota, or down, people are told so, and no address is logged', async () => {
  const logged = mock.method(console, 'error', () => {});
  const quota = setup({ dailyLimit: 0 });
  assert.deepEqual(await startSubscription(quota.deps, { email: 'a@b.co' }), { ok: false, reason: 'busy' });
  const down = setup();
  const failing: Deps = { ...down.deps, fetch: (async () => { throw new TypeError('network'); }) as typeof fetch };
  assert.deepEqual(await startSubscription(failing, { email: 'a@b.co' }), { ok: false, reason: 'unavailable' });
  const unauthorized: Deps = { ...down.deps, fetch: (async () => new Response(JSON.stringify({ statusCode: 401, name: 'restricted_api_key', message: 'x' }), { status: 401 })) as typeof fetch };
  assert.deepEqual(await startSubscription(unauthorized, { email: 'a@b.co' }), { ok: false, reason: 'unavailable' });
  const lines = logged.mock.calls.map(call => String(call.arguments[0]));
  logged.mock.restore();
  assert.equal(lines.length, 3);
  for (const line of lines) assert.ok(!line.includes('a@b.co') && !line.includes('@'), `a log line names an address: ${line}`);
});

test('the client waits and retries when Resend says slow down, but not when the quota is gone', async () => {
  const slow = createFakeResend({ rateLimitFirst: 2 });
  const waits: number[] = [];
  const result = await sendEmail(TEST_CONFIG, { to: 'a@b.co', subject: 's', html: 'h', text: 't' }, { fetch: slow.fetch, sleep: async ms => { waits.push(ms); } });
  assert.ok(result.id);
  assert.equal(waits.length, 2);
  const exhausted = createFakeResend({ dailyLimit: 0 });
  await assert.rejects(sendEmail(TEST_CONFIG, { to: 'a@b.co', subject: 's', html: 'h', text: 't' }, { fetch: exhausted.fetch, sleep: async () => {} }), /quota/i);
});

test('pressing the button adds the person to the segment and sends a welcome', async () => {
  const { fake, deps } = setup();
  await startSubscription(deps, { email: 'new@example.com' });
  const token = tokenOf(linkIn(fake.sent[0].html));
  assert.deepEqual(await finishSubscription(deps, token), { ok: true, changed: true });
  const contact = fake.contacts.get('new@example.com')!;
  assert.equal(contact.unsubscribed, false);
  assert.ok(contact.segments.has('seg_test'));
  assert.equal(fake.sent.length, 2);
  assert.equal(fake.sent[1].subject, 'You’re in. Here’s the latest issue');
  assert.ok(fake.sent[1].html.includes(`/week/${LATEST.slug}`));
  // Pressing it again changes nothing and sends nothing more.
  assert.deepEqual(await finishSubscription(deps, token), { ok: true, changed: false });
  assert.equal(fake.sent.length, 2);
});

test('someone who unsubscribed and signs up again is resubscribed, not duplicated', async () => {
  const { fake, deps } = setup();
  await createContact(TEST_CONFIG, 'back@example.com', { fetch: fake.fetch });
  fake.contacts.get('back@example.com')!.unsubscribed = true;
  fake.contacts.get('back@example.com')!.segments.clear();
  const token = signConfirmToken(TEST_CONFIG.apiKey, 'back@example.com', NOW);
  assert.deepEqual(await finishSubscription(deps, token), { ok: true, changed: true });
  assert.equal(fake.contacts.size, 1);
  assert.equal(fake.contacts.get('back@example.com')!.unsubscribed, false);
  assert.ok(fake.contacts.get('back@example.com')!.segments.has('seg_test'));
});

test('a created-a-moment-ago race falls back to the existing contact', async () => {
  const { fake, deps } = setup();
  const token = signConfirmToken(TEST_CONFIG.apiKey, 'race@example.com', NOW);
  // Another click creates the contact between our lookup and our create.
  let lookedUp = false;
  const racing: typeof fetch = async (input, init) => {
    const response = await fake.fetch(input, init);
    if (!lookedUp && (init?.method ?? 'GET') === 'GET') { lookedUp = true; await createContact(TEST_CONFIG, 'race@example.com', { fetch: fake.fetch }); }
    return response;
  };
  assert.equal((await finishSubscription({ ...deps, fetch: racing }, token)).ok, true);
  assert.equal(fake.contacts.size, 1);
  assert.ok(fake.contacts.get('race@example.com')!.segments.has('seg_test'));
});

test('Resend answering a lookup of an unknown contact with a validation error still subscribes them', async () => {
  const { fake, deps } = setup();
  const odd: typeof fetch = async (input, init) => (String(input).includes('/contacts/') && (init?.method ?? 'GET') === 'GET' && !String(input).includes('/segments')
    ? new Response(JSON.stringify({ statusCode: 422, name: 'validation_error', message: 'Invalid contact' }), { status: 422 })
    : fake.fetch(input, init));
  const token = signConfirmToken(TEST_CONFIG.apiKey, 'odd@example.com', NOW);
  assert.deepEqual(await finishSubscription({ ...deps, fetch: odd }, token), { ok: true, changed: true });
  assert.ok(fake.contacts.get('odd@example.com')!.segments.has('seg_test'));
});

test('what Resend says is logged without any address in it', async () => {
  const logged = mock.method(console, 'error', () => {});
  const { deps } = setup();
  const rude: typeof fetch = async () => new Response(JSON.stringify({ statusCode: 403, name: 'validation_error', message: 'Cannot send to leaky@example.com yet' }), { status: 403 });
  await startSubscription({ ...deps, fetch: rude }, { email: 'leaky@example.com' });
  const lines = logged.mock.calls.map(call => String(call.arguments[0]));
  logged.mock.restore();
  assert.equal(lines.length, 1);
  assert.ok(lines[0].includes('403 validation_error') && lines[0].includes('[address]'), lines[0]);
  assert.ok(!lines[0].includes('leaky'), 'the address must not appear');
});

test('forged, expired and wrong-key links subscribe nobody', async () => {
  const { fake, deps } = setup();
  const good = signConfirmToken(TEST_CONFIG.apiKey, 'x@example.com', NOW);
  assert.deepEqual(await finishSubscription({ ...deps, now: () => NOW + 9 * DAY }, good), { ok: false, reason: 'expired' });
  assert.deepEqual(await finishSubscription(deps, signConfirmToken('someone_elses_key', 'x@example.com', NOW)), { ok: false, reason: 'invalid' });
  assert.deepEqual(await finishSubscription(deps, 'garbage'), { ok: false, reason: 'malformed' });
  assert.deepEqual(await finishSubscription({ ...deps, config: null }, good), { ok: false, reason: 'unavailable' });
  assert.equal(fake.contacts.size, 0);
  assert.equal(fake.sent.length, 0);
});

test('a welcome email that cannot be sent does not undo the subscription', async () => {
  mock.method(console, 'error', () => {});
  const { fake, deps } = setup();
  const token = signConfirmToken(TEST_CONFIG.apiKey, 'ok@example.com', NOW);
  const noMail: typeof fetch = async (input, init) => (String(input).endsWith('/emails') ? new Response(JSON.stringify({ statusCode: 429, name: 'daily_quota_exceeded', message: 'x' }), { status: 429 }) : fake.fetch(input, init));
  assert.deepEqual(await finishSubscription({ ...deps, fetch: noMail }, token), { ok: true, changed: true });
  assert.equal(fake.contacts.size, 1);
  mock.restoreAll();
});

test('looking up a contact that does not exist gives null, not an error', async () => {
  const { fake } = setup();
  assert.equal(await getContact(TEST_CONFIG, 'nobody@example.com', { fetch: fake.fetch }), null);
});

test('the weekly email carries everything the issue does, and a way out', () => {
  const issue = ISSUES[0];
  const mail = renderIssueEmail(issue, ORIGIN);
  assert.equal(mail.subject, issueSubject(issue));
  assert.ok(mail.subject.length <= 70, `subject is ${mail.subject.length} characters`);
  assert.equal(mail.html.split(UNSUBSCRIBE).length - 1, 1, 'one unsubscribe link in the html');
  assert.equal(mail.text.split(UNSUBSCRIBE).length - 1, 1, 'and one in the text');
  for (const pick of issue.picks) {
    assert.ok(mail.html.includes(pick.url.replaceAll('&', '&amp;')), `${pick.id} links to its source`);
    assert.ok(mail.text.includes(pick.url), `${pick.id} is in the text version`);
  }
  for (const event of [...issue.main, ...issue.also]) assert.ok(mail.text.includes(event.headline), event.headline);
  assert.equal(issue.picks.length, 7);
  assert.ok(mail.html.includes('f*cking'), 'a title with an asterisk survives');
});

test('every address and image in the email is absolute and on https', () => {
  const mail = renderIssueEmail(ISSUES[0], ORIGIN);
  const urls = [...mail.html.matchAll(/(?:href|src)="([^"]*)"/g)].map(match => match[1]);
  assert.ok(urls.length > 30);
  for (const url of urls) {
    if (url === UNSUBSCRIBE) continue;
    assert.match(url, /^https:\/\//, `not absolute: ${url}`);
  }
  assert.ok(!mail.html.includes('undefined') && !mail.text.includes('undefined'));
  assert.ok(!/href="javascript:/i.test(mail.html));
  const ours = urls.filter(url => url.startsWith(ORIGIN) && !url.includes('/media/'));
  for (const url of ours) assert.ok(new URL(url).searchParams.get('utm_source') === 'newsletter', `${url} should say where the visit came from`);
});

test('the email escapes what it prints', () => {
  const issue = structuredClone(ISSUES[0]);
  issue.summary = 'A <b>bold</b> claim & "quotes"';
  issue.picks[0].title = 'Fish & <script>alert(1)</script>';
  const mail = renderIssueEmail(issue, ORIGIN);
  assert.ok(!mail.html.includes('<script>alert(1)</script>'));
  assert.ok(mail.html.includes('Fish &amp; &lt;script&gt;'));
  assert.ok(mail.html.includes('A &lt;b&gt;bold&lt;/b&gt; claim &amp; &quot;quotes&quot;'));
});

test('a broadcast is created as an unsent draft for the subscribers segment', async () => {
  const { fake } = setup();
  const mail = renderIssueEmail(LATEST, ORIGIN);
  const { id } = await createBroadcast(TEST_CONFIG, { name: 'Ctrl AI · Issue 1', subject: mail.subject, html: mail.html, text: mail.text }, { fetch: fake.fetch });
  const stored = fake.broadcasts.find(broadcast => broadcast.id === id)!;
  assert.equal(stored.send, false);
  assert.equal(stored.status, 'draft');
  assert.equal(stored.segment_id, 'seg_test');
  assert.ok(stored.html.includes(UNSUBSCRIBE));
});

test('nothing in the repository can send a broadcast to the list', () => {
  // Sending to everyone is a button in Resend's dashboard, pressed by a person. If this test fails, someone added a way
  // around that. Remove it, or change the promise on the About page and in docs/NEWSLETTER.md first.
  const files = ['lib/newsletter/resend.ts', 'lib/newsletter/flow.ts', 'scripts/newsletter.ts', 'app/subscribe/actions.ts'];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.ok(!/broadcasts\/\$\{[^}]*\}\/send|\/broadcasts\/[^'"`]*\/send/.test(source), `${file} calls the send-broadcast endpoint`);
    assert.ok(!/send:\s*true/.test(source), `${file} asks Resend to send immediately`);
    assert.ok(!/scheduled_at/.test(source), `${file} schedules a send`);
  }
});
