import { createHash } from 'node:crypto';
import { domainToASCII } from 'node:url';
import type { NewsletterConfig } from './config';
import { confirmEmail, welcomeEmail } from './emails';
import { addToSegment, createContact, getContact, resubscribeContact, ResendError, sendEmail, type Fetch } from './resend';
import { signConfirmToken, verifyConfirmToken } from './token';

/**
 * The two steps of subscribing, kept free of Next.js so they can be tested with a fake Resend.
 * 1. startSubscription: a person types an address; we email a signed link. Nobody is on the list yet.
 * 2. finishSubscription: the person presses the button the link leads to; only then do they join the segment.
 */

export type Deps = {
  config: NewsletterConfig | null;
  /** The site's address, for the link in the email: https://ctrlai.com */
  origin: string;
  /** The latest issue, for the welcome email. */
  latest: { slug: string; number: number };
  fetch?: Fetch;
  now?: () => number;
};

const LOCAL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Lowercased, trimmed, and plausible; or null. This catches typos, it does not prove an address exists. */
export function parseEmail(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return null;
  const [local, rawDomain] = parts;
  const domain = domainToASCII(rawDomain);
  const email = `${local}@${domain}`;
  if (!local || !domain || email.length < 6 || email.length > 254) return null;
  if (local.length > 64 || !LOCAL.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every(label => LABEL.test(label))) return null;
  if (!/^(?:[a-z]{2,}|xn--[a-z0-9-]+)$/.test(labels[labels.length - 1])) return null;
  return email;
}

const fingerprint = (email: string) => createHash('sha256').update(email).digest('hex').slice(0, 40);

/** What went wrong, for the logs: the status, Resend's error name and its message with anything address-like removed. */
function describe(error: unknown): string {
  if (error instanceof ResendError) return `${error.status} ${error.code}: ${error.message.replace(/\S+@\S+/g, '[address]').slice(0, 160)}`;
  return error instanceof Error ? error.name : typeof error;
}

export type StartResult = { ok: true; email: string } | { ok: false; reason: 'invalid' | 'unavailable' | 'busy' };

export async function startSubscription(deps: Deps, input: { email: string; website?: string }): Promise<StartResult> {
  // People never see the hidden field. Anything in it is a bot, and gets the answer a person would, so it learns nothing.
  if (input.website?.trim()) return { ok: true, email: input.email.trim() };
  const email = parseEmail(input.email);
  if (!email) return { ok: false, reason: 'invalid' };
  if (!deps.config) return { ok: false, reason: 'unavailable' };

  const token = signConfirmToken(deps.config.apiKey, email, deps.now?.());
  const message = confirmEmail({ to: email, url: `${deps.origin}/subscribe/confirm?token=${encodeURIComponent(token)}` });
  try {
    // One confirmation per address per day: Resend ignores a repeat with the same key. That stops the form being used
    // to flood someone's inbox, and means a second try the same day answers the same way without sending again.
    await sendEmail(deps.config, message, { fetch: deps.fetch, idempotencyKey: `confirm/${fingerprint(email)}` });
    return { ok: true, email };
  } catch (error) {
    if (error instanceof ResendError) {
      if (error.code === 'invalid_idempotent_request' || error.code === 'concurrent_idempotent_requests') return { ok: true, email };
      console.error(`[newsletter] Resend refused a confirmation: ${describe(error)}`);
      return { ok: false, reason: error.code.endsWith('_quota_exceeded') ? 'busy' : 'unavailable' };
    }
    console.error(`[newsletter] could not reach Resend: ${describe(error)}`);
    return { ok: false, reason: 'unavailable' };
  }
}

/** What the confirm page needs to show before anyone presses the button. Changes nothing. */
export function inspectToken(deps: Pick<Deps, 'config' | 'now'>, token: string) {
  if (!deps.config) return { ok: false as const, reason: 'unavailable' as const };
  return verifyConfirmToken(deps.config.apiKey, token, deps.now?.());
}

/** Resend's docs don't say what a lookup of an unknown contact returns beyond "not found", so a validation error counts too. */
async function lookup(config: NewsletterConfig, email: string, call: { fetch?: Fetch }) {
  try {
    return await getContact(config, email, call);
  } catch (error) {
    if (error instanceof ResendError && (error.status === 400 || error.status === 422)) return null;
    throw error;
  }
}

/** A create that fails because the contact is already there, however Resend words it. */
const isConflict = (error: unknown) => error instanceof ResendError && [400, 409, 422].includes(error.status) && /exist|already|duplicate/i.test(error.message);

/** Puts an address in the segment, subscribed. Returns whether anything changed: false if they were already on the list. */
async function ensureSubscribed(config: NewsletterConfig, email: string, call: { fetch?: Fetch }): Promise<boolean> {
  const found = await lookup(config, email, call);
  if (!found) {
    try {
      await createContact(config, email, call);
      return true;
    } catch (error) {
      // Created a moment ago by another click, or the lookup missed it. Carry on as for a contact we found.
      if (!isConflict(error)) throw error;
    }
  }
  const contact = found ?? await getContact(config, email, call);
  const wasUnsubscribed = contact?.unsubscribed ?? true;
  if (wasUnsubscribed) await resubscribeContact(config, email, call);
  await addToSegment(config, email, call);
  return wasUnsubscribed;
}

export type FinishResult = { ok: true; changed: boolean } | { ok: false; reason: 'malformed' | 'invalid' | 'expired' | 'unavailable' };

export async function finishSubscription(deps: Deps, token: string): Promise<FinishResult> {
  const checked = inspectToken(deps, token);
  if (!checked.ok) return { ok: false, reason: checked.reason };
  const config = deps.config!;
  const call = { fetch: deps.fetch };
  try {
    const changed = await ensureSubscribed(config, checked.email, call);
    if (changed) {
      const welcome = welcomeEmail({
        to: checked.email,
        latestNumber: deps.latest.number,
        latestUrl: `${deps.origin}/week/${deps.latest.slug}?utm_source=newsletter&utm_medium=email&utm_campaign=welcome`,
        startUrl: `${deps.origin}/hall-of-fame?utm_source=newsletter&utm_medium=email&utm_campaign=welcome#start-here`,
      });
      // The welcome is a courtesy. If it can't be sent, the subscription still stands.
      await sendEmail(config, welcome, { ...call, idempotencyKey: `welcome/${fingerprint(checked.email)}` }).catch(error => {
        console.error(`[newsletter] welcome not sent: ${describe(error)}`);
      });
    }
    return { ok: true, changed };
  } catch (error) {
    console.error(`[newsletter] could not add a subscriber: ${describe(error)}`);
    return { ok: false, reason: 'unavailable' };
  }
}
