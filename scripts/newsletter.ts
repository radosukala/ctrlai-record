/**
 * Everything for the weekly email. None of it sends to the list: that happens only when a person presses Send in
 * Resend's dashboard, on a draft this script saved.
 *
 *   npm run newsletter -- check                    is Resend set up the way the site assumes?
 *   npm run newsletter -- setup                    create the subscribers segment and print its id
 *   npm run newsletter -- preview [issue]          write the email to kit/<issue>/newsletter.html
 *   npm run newsletter -- test <address> [issue]   send one test copy to one address
 *   npm run newsletter -- draft [issue]            save the issue as a draft broadcast in Resend
 *
 * Keys and ids come from the environment (.env.local is read if it exists). See docs/NEWSLETTER.md.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getIssue, LATEST } from '../content/issues';
import type { NewsletterConfig } from '../lib/newsletter/config';
import { parseEmail } from '../lib/newsletter/flow';
import { renderIssueEmail, UNSUBSCRIBE } from '../lib/newsletter/issue-email';
import { createBroadcast, createSegment, listBroadcasts, listDomains, listSegments, ResendError, sendEmail } from '../lib/newsletter/resend';
import { SITE } from '../lib/site';

const [command = 'help', ...rest] = process.argv.slice(2);
const env = process.env;

const config: NewsletterConfig | null = env.RESEND_API_KEY?.trim()
  ? {
      apiKey: env.RESEND_API_KEY.trim(),
      segmentId: env.RESEND_SEGMENT_ID?.trim() ?? '',
      from: env.NEWSLETTER_FROM?.trim() || 'Ctrl AI <hello@ctrlai.com>',
      replyTo: env.NEWSLETTER_REPLY_TO?.trim() || undefined,
      baseUrl: (env.RESEND_API_URL?.trim() || 'https://api.resend.com').replace(/\/$/, ''),
    }
  : null;

const slug = rest.find(arg => !arg.startsWith('--') && !arg.includes('@')) ?? LATEST.slug;
const origin = SITE.url;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function needKey(): NewsletterConfig {
  return config ?? fail('RESEND_API_KEY is not set. Put it in .env.local (never in the repo). See docs/NEWSLETTER.md.');
}

function needIssue() {
  const issue = getIssue(slug);
  if (!issue) fail(`No issue "${slug}".`);
  return issue;
}

/** Images and links in an email are absolute. A draft built against localhost would reach readers broken. */
function needLiveOrigin() {
  if (!origin.startsWith('https://') || /localhost|127\.0\.0\.1/.test(origin)) fail(`The site address is ${origin}, which readers can't open. Unset PUBLIC_ORIGIN, or set it to https://ctrlai.com.`);
}

function explain(error: unknown): never {
  if (error instanceof ResendError) {
    const hint = error.code === 'restricted_api_key' ? '\nThis key can only send email. Create one with Full access at resend.com/api-keys.'
      : error.status === 403 && /not verified/i.test(error.message) ? '\nThe sending domain is not verified in Resend yet. Run `npm run newsletter -- check`.'
      : '';
    fail(`Resend said ${error.status} ${error.code}: ${error.message}${hint}`);
  }
  throw error;
}

async function check() {
  let failed = 0;
  const good = (message: string) => console.log(`✓ ${message}`);
  const bad = (message: string, fix?: string) => { failed++; console.log(`✗ ${message}`); if (fix) console.log(`    ${fix}`); };
  const note = (message: string) => console.log(`· ${message}`);

  if (!config) {
    bad('RESEND_API_KEY is not set', 'Create a key with Full access at resend.com/api-keys, then put it in .env.local and in the Vercel project settings.');
    return process.exit(1);
  }
  good('RESEND_API_KEY is set');
  if (!config.segmentId) bad('RESEND_SEGMENT_ID is not set', 'Run `npm run newsletter -- setup`, or copy the id of a segment from Resend → Contacts → Segments.');
  else good('RESEND_SEGMENT_ID is set');

  try {
    const { data: segments } = await listSegments(config);
    good('The key can manage contacts and broadcasts');
    const found = segments.find(segment => segment.id === config.segmentId);
    if (config.segmentId && found) good(`The segment exists: “${found.name}”`);
    else if (config.segmentId) bad(`No segment has the id ${config.segmentId}`, `Segments in this account: ${segments.map(segment => `${segment.name} (${segment.id})`).join(', ') || 'none'}`);

    const sender = config.from.match(/<([^>]+)>/)?.[1] ?? config.from;
    const domain = sender.split('@')[1] ?? '';
    const { data: domains } = await listDomains(config);
    const match = domains.find(item => item.name === domain);
    if (!match) bad(`${domain} is not a domain in this Resend account`, `Domains here: ${domains.map(item => `${item.name} (${item.status})`).join(', ') || 'none'}. Add it at resend.com/domains.`);
    else if (match.status !== 'verified') bad(`${domain} is ${match.status}, not verified`, 'Add the DNS records Resend lists (in Cloudflare). ctrlai.com has a DMARC policy of reject with strict alignment, so unverified mail is rejected rather than delivered to spam.');
    else good(`${domain} is verified for sending`);
    if (match && (match.open_tracking || match.click_tracking)) bad(`Open or click tracking is on for ${domain}`, 'The About page says we don’t track opens or clicks. Turn it off in Resend → Domains → Configuration.');
    else if (match) good('Open and click tracking are off, as the About page says');
  } catch (error) {
    if (error instanceof ResendError && error.code === 'restricted_api_key') bad('This key can only send email', 'Create one with Full access at resend.com/api-keys; contacts and broadcasts need it.');
    else if (error instanceof ResendError) bad(`Resend said ${error.status} ${error.code}: ${error.message}`);
    else throw error;
  }

  note(`Sender: ${config.from}`);
  if (config.replyTo) note(`Replies go to ${config.replyTo}`);
  else note(`No NEWSLETTER_REPLY_TO, so replies go to ${config.from.match(/<([^>]+)>/)?.[1] ?? config.from}. ctrlai.com’s mail is on Google: make sure that mailbox exists, or set NEWSLETTER_REPLY_TO. The About page promises erasure on reply.`);
  if (!origin.startsWith('https://') || /localhost/.test(origin)) bad(`The site address is ${origin}`, 'Links in emails need the live address. Unset PUBLIC_ORIGIN or set it to https://ctrlai.com.');
  console.log(failed ? `\n${failed} thing${failed === 1 ? '' : 's'} to fix.` : '\nReady.');
  process.exit(failed ? 1 : 0);
}

async function setup() {
  const key = needKey();
  const name = 'Ctrl AI weekly';
  const { data: segments } = await listSegments(key).catch(explain);
  const existing = segments.find(segment => segment.id === key.segmentId) ?? segments.find(segment => segment.name === name);
  const segment = existing ?? (await createSegment(key, name).catch(explain));
  console.log(existing ? `Using the existing segment “${existing.name}”.` : `Created the segment “${name}”.`);
  console.log(`\nAdd this to .env.local and to the Vercel project (Settings → Environment Variables), then redeploy:\n\n  RESEND_SEGMENT_ID=${segment.id}\n`);
}

async function preview() {
  const issue = needIssue();
  const mail = renderIssueEmail(issue, origin);
  const dir = path.join(process.cwd(), 'kit', issue.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'newsletter.html'), mail.html);
  await writeFile(path.join(dir, 'newsletter.txt'), mail.text);
  console.log(`Subject: ${mail.subject}\nWrote kit/${issue.slug}/newsletter.html and newsletter.txt (${Math.round(mail.html.length / 1024)} KB).\nImages load from ${origin}, so they show once the issue is deployed.`);
}

async function test() {
  const key = needKey();
  needLiveOrigin();
  const issue = needIssue();
  const to = parseEmail(rest.find(arg => arg.includes('@')) ?? '') ?? fail('Usage: npm run newsletter -- test you@example.com [issue]');
  const mail = renderIssueEmail(issue, origin);
  // A test goes out one-to-one, so Resend does not fill in the unsubscribe link. Point it at the privacy notes instead.
  const html = mail.html.replaceAll(UNSUBSCRIBE, `${origin}/about#privacy`);
  const text = mail.text.replaceAll(UNSUBSCRIBE, `${origin}/about#privacy (a real one-click link appears in the sent issue)`);
  const sent = await sendEmail(key, { to, subject: `[Test] ${mail.subject}`, html, text }).catch(explain);
  console.log(`Sent a test of issue ${issue.number} to ${to} (${sent.id}).`);
}

async function draft() {
  const key = needKey();
  if (!key.segmentId) fail('RESEND_SEGMENT_ID is not set. Run `npm run newsletter -- setup`.');
  needLiveOrigin();
  const issue = needIssue();
  const name = `Ctrl AI · Issue ${issue.number}`;
  const { data: existing } = await listBroadcasts(key).catch(explain);
  const same = existing.find(broadcast => broadcast.name === name);
  if (same && !rest.includes('--force')) fail(`“${name}” already exists in Resend (${same.id}, ${same.status}). Delete it there first, or run again with --force to make another.`);
  const mail = renderIssueEmail(issue, origin);
  const created = await createBroadcast(key, { name, subject: mail.subject, html: mail.html, text: mail.text }).catch(explain);
  console.log(`Saved “${name}” as a draft (${created.id}). Nothing has been sent.\n\nSubject: ${mail.subject}\n\nOpen Resend → Broadcasts, find the draft, read it, send yourself a test, then press Send or Schedule.`);
}

const commands: Record<string, () => Promise<void>> = { check, setup, preview, test, draft };
if (!commands[command]) {
  console.log('Usage: npm run newsletter -- <check | setup | preview [issue] | test <address> [issue] | draft [issue]>\nSee docs/NEWSLETTER.md.');
  process.exit(command === 'help' ? 0 : 1);
}
commands[command]().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
