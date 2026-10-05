import type { NewsletterConfig } from './config';

/** A small client for the parts of Resend's API the newsletter uses. Nothing here logs an address. */

export type Fetch = typeof fetch;

export class ResendError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'ResendError';
  }
}

type Call = { fetch?: Fetch; idempotencyKey?: string; sleep?: (ms: number) => Promise<void> };

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function call<T>(config: NewsletterConfig, method: string, path: string, body: unknown, options: Call = {}): Promise<T> {
  const send = options.fetch ?? fetch;
  for (let attempt = 0; ; attempt++) {
    const response = await send(`${config.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
        ...(options.idempotencyKey ? { 'idempotency-key': options.idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    if (response.ok) return (await response.json()) as T;
    const payload = (await response.json().catch(() => ({}))) as { name?: string; message?: string };
    // Resend allows ten requests a second. A short pause is enough; running out of quota is not retried.
    if (response.status === 429 && payload.name === 'rate_limit_exceeded' && attempt < 2) {
      const seconds = Number(response.headers.get('retry-after')) || 1;
      await (options.sleep ?? wait)(Math.min(seconds, 3) * 1000);
      continue;
    }
    throw new ResendError(response.status, payload.name ?? 'unknown', payload.message ?? `Resend answered ${response.status}`);
  }
}

export type Email = { to: string; subject: string; html: string; text: string };

/** Sends one message. A key makes Resend ignore the same message sent again within 24 hours. */
export function sendEmail(config: NewsletterConfig, email: Email, options: Call = {}) {
  return call<{ id: string }>(config, 'POST', '/emails', {
    from: config.from,
    to: [email.to],
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(config.replyTo ? { reply_to: config.replyTo } : {}),
  }, options);
}

export type Contact = { id: string; email: string; unsubscribed: boolean };

export async function getContact(config: NewsletterConfig, email: string, options: Call = {}): Promise<Contact | null> {
  try {
    return await call<Contact>(config, 'GET', `/contacts/${encodeURIComponent(email)}`, undefined, options);
  } catch (error) {
    if (error instanceof ResendError && error.status === 404) return null;
    throw error;
  }
}

export function createContact(config: NewsletterConfig, email: string, options: Call = {}) {
  return call<{ id: string }>(config, 'POST', '/contacts', { email, unsubscribed: false, segments: [{ id: config.segmentId }] }, options);
}

export function resubscribeContact(config: NewsletterConfig, email: string, options: Call = {}) {
  return call<{ id: string }>(config, 'PATCH', `/contacts/${encodeURIComponent(email)}`, { unsubscribed: false }, options);
}

export function addToSegment(config: NewsletterConfig, email: string, options: Call = {}) {
  return call<{ id: string }>(config, 'POST', `/contacts/${encodeURIComponent(email)}/segments/${config.segmentId}`, undefined, options);
}

export type Broadcast = { id: string; name?: string; status?: string };

/** Creates a draft. Sending it is a separate, deliberate step that only happens in Resend's dashboard. */
export function createBroadcast(config: NewsletterConfig, input: { name: string; subject: string; html: string; text: string }, options: Call = {}) {
  return call<{ id: string }>(config, 'POST', '/broadcasts', {
    segment_id: config.segmentId,
    from: config.from,
    subject: input.subject,
    html: input.html,
    text: input.text,
    name: input.name,
    send: false,
    ...(config.replyTo ? { reply_to: config.replyTo } : {}),
  }, options);
}

export function listBroadcasts(config: NewsletterConfig, options: Call = {}) {
  return call<{ data: Broadcast[] }>(config, 'GET', '/broadcasts', undefined, options);
}

export type Domain = { id: string; name: string; status: string; open_tracking?: boolean; click_tracking?: boolean };

export function listDomains(config: NewsletterConfig, options: Call = {}) {
  return call<{ data: Domain[] }>(config, 'GET', '/domains', undefined, options);
}

export type Segment = { id: string; name: string };

export function listSegments(config: NewsletterConfig, options: Call = {}) {
  return call<{ data: Segment[] }>(config, 'GET', '/segments', undefined, options);
}

export function createSegment(config: NewsletterConfig, name: string, options: Call = {}) {
  return call<{ id: string; name: string }>(config, 'POST', '/segments', { name }, options);
}
