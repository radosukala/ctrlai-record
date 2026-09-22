import { desc, eq, lt } from 'drizzle-orm';
import type { Database } from '../db/client';
import { contributors, events } from '../db/schema';

export interface LogInput {
  actorId?: string | null;
  action: string;
  subject: string;
  detail?: Record<string, unknown>;
}

type Writer = Pick<Database, 'insert'>;

export async function logEvent(db: Writer, input: LogInput): Promise<void> {
  await db.insert(events).values({
    actorId: input.actorId ?? null,
    action: input.action,
    subject: input.subject,
    detail: input.detail ?? {},
  });
}

export interface PublicEvent {
  id: number;
  at: string;
  action: string;
  subject: string;
  detail: Record<string, unknown>;
  actor: { seq: number; handle: string | null } | null;
}

export async function listEvents(db: Database, options: { before?: number; limit?: number } = {}): Promise<PublicEvent[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const rows = await db
    .select({ event: events, seq: contributors.seq, handle: contributors.handle })
    .from(events)
    .leftJoin(contributors, eq(contributors.id, events.actorId))
    .where(options.before ? lt(events.id, options.before) : undefined)
    .orderBy(desc(events.id))
    .limit(limit);
  return rows.map(row => ({
    id: row.event.id,
    at: row.event.at.toISOString(),
    action: row.event.action,
    subject: row.event.subject,
    detail: row.event.detail,
    actor: row.seq != null ? { seq: row.seq, handle: row.handle } : null,
  }));
}
