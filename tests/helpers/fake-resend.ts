/**
 * A stand-in for Resend that follows its documented behavior: bearer auth, 24-hour idempotency keys (the same key with
 * the same body returns the first answer; with a different body, 409), daily quota, global contacts with segments,
 * 404 for unknown contacts. `handle` is plain so a test can call it directly, and `fetch` wraps it for the client.
 */
export type Sent = { to: string[]; from: string; subject: string; html: string; text: string; key?: string };
type StoredContact = { id: string; email: string; unsubscribed: boolean; segments: Set<string> };
type Reply = { status: number; body: unknown };

export function createFakeResend(options: { dailyLimit?: number; rateLimitFirst?: number } = {}) {
  const sent: Sent[] = [];
  const contacts = new Map<string, StoredContact>();
  const broadcasts: { id: string; name: string; subject: string; html: string; text: string; segment_id: string; status: string; send?: boolean }[] = [];
  const segments = [{ id: 'seg_test', name: 'Ctrl AI weekly' }];
  const domains = [{ id: 'dom_1', name: 'ctrlai.com', status: 'verified', open_tracking: false, click_tracking: false }];
  const keys = new Map<string, { body: string; id: string }>();
  const calls: string[] = [];
  let rateLimited = options.rateLimitFirst ?? 0;
  let counter = 0;
  const id = (prefix: string) => `${prefix}_${++counter}`;
  const error = (status: number, name: string, message: string): Reply => ({ status, body: { statusCode: status, name, message } });

  function handle(method: string, path: string, headers: Headers, body: any): Reply {
    calls.push(`${method} ${path}`);
    if (!headers.get('authorization')?.startsWith('Bearer ')) return error(401, 'missing_api_key', 'Missing API key');
    if (rateLimited > 0) { rateLimited--; return error(429, 'rate_limit_exceeded', 'Too many requests'); }
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);

    if (method === 'POST' && path === '/emails') {
      if (!body?.to || !body?.subject) return error(422, 'validation_error', 'Missing to or subject');
      const key = headers.get('idempotency-key') ?? undefined;
      const serialized = JSON.stringify(body);
      if (key) {
        const previous = keys.get(key);
        if (previous) return previous.body === serialized ? { status: 200, body: { id: previous.id } } : error(409, 'invalid_idempotent_request', 'Request body was modified');
      }
      if (options.dailyLimit !== undefined && sent.length >= options.dailyLimit) return error(429, 'daily_quota_exceeded', 'Daily quota exceeded');
      const emailId = id('email');
      sent.push({ to: body.to, from: body.from, subject: body.subject, html: body.html, text: body.text, key });
      if (key) keys.set(key, { body: serialized, id: emailId });
      return { status: 200, body: { id: emailId } };
    }
    if (parts[0] === 'contacts') {
      const email = parts[1]?.toLowerCase();
      if (method === 'POST' && parts.length === 1) {
        if (contacts.has(body.email)) return error(409, 'validation_error', 'Contact already exists');
        const contact = { id: id('contact'), email: body.email, unsubscribed: Boolean(body.unsubscribed), segments: new Set<string>((body.segments ?? []).map((s: { id: string }) => s.id)) };
        contacts.set(body.email, contact);
        return { status: 200, body: { object: 'contact', id: contact.id } };
      }
      const contact = contacts.get(email);
      if (!contact) return error(404, 'not_found', 'Contact not found');
      if (method === 'GET' && parts.length === 2) return { status: 200, body: { object: 'contact', id: contact.id, email: contact.email, unsubscribed: contact.unsubscribed } };
      if (method === 'PATCH' && parts.length === 2) { contact.unsubscribed = Boolean(body.unsubscribed); return { status: 200, body: { object: 'contact', id: contact.id } }; }
      if (method === 'POST' && parts[2] === 'segments') { contact.segments.add(parts[3]); return { status: 200, body: { id: parts[3] } }; }
    }
    if (parts[0] === 'segments') {
      if (method === 'GET') return { status: 200, body: { object: 'list', data: segments } };
      if (method === 'POST') { const created = { id: id('seg'), name: body.name }; segments.push(created); return { status: 200, body: { object: 'segment', ...created } }; }
    }
    if (method === 'GET' && parts[0] === 'domains') return { status: 200, body: { object: 'list', data: domains } };
    if (parts[0] === 'broadcasts') {
      if (method === 'GET') return { status: 200, body: { object: 'list', data: broadcasts.map(({ id: broadcastId, name, status }) => ({ id: broadcastId, name, status })) } };
      if (method === 'POST') {
        const broadcast = { id: id('broadcast'), name: body.name, subject: body.subject, html: body.html, text: body.text, segment_id: body.segment_id, status: 'draft', send: body.send };
        broadcasts.push(broadcast);
        return { status: 200, body: { object: 'broadcast', id: broadcast.id } };
      }
    }
    return error(404, 'not_found', 'The requested endpoint does not exist');
  }

  const fetchFake = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    const reply = handle(init?.method ?? 'GET', url.pathname, new Headers(init?.headers), init?.body ? JSON.parse(String(init.body)) : undefined);
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'content-type': 'application/json', 'retry-after': '0' } });
  };

  return { fetch: fetchFake as typeof fetch, handle, sent, contacts, broadcasts, segments, domains, calls };
}

export const TEST_CONFIG = { apiKey: 're_test_key', segmentId: 'seg_test', from: 'Ctrl AI <hello@ctrlai.com>', baseUrl: 'https://api.resend.test' };
