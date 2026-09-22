import path from 'node:path';
import { mkdirSync } from 'node:fs';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const migrationsFolder = path.join(process.cwd(), 'drizzle');

/**
 * Opens the database once per process.
 *
 * - With DATABASE_URL: any Postgres (Neon, Supabase, RDS, a VPS). Migrations run in the
 *   deploy step (`npm run db:migrate`), unless CTRL_AUTO_MIGRATE=1.
 * - Without it: an embedded Postgres (PGlite) in .data/pglite, migrated and seeded on first use,
 *   so anyone can run a full copy of the Record with `npm install && npm run dev`.
 */
export function getDb(): Promise<Database> {
  const holder = globalThis as unknown as { __ctrlDb?: Promise<Database> };
  holder.__ctrlDb ??= open().catch(error => {
    holder.__ctrlDb = undefined;
    throw error;
  });
  return holder.__ctrlDb;
}

/**
 * The dev server never writes to a remote database by accident: the public record is real, and test runs
 * must not end up in it. Local Postgres URLs are fine; a remote one needs CTRL_DEV_REMOTE_DB=1.
 * Scripts (migrate, seed, steward) and production are unaffected.
 */
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.NODE_ENV !== 'development' || process.env.CTRL_DEV_REMOTE_DB === '1') return url;
  let host = '';
  try { host = new URL(url).hostname; } catch { return url; }
  if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) return url;
  console.warn(`[ctrl] DATABASE_URL points to ${host}. The dev server is using the local embedded database instead, so nothing you do locally reaches it. Set CTRL_DEV_REMOTE_DB=1 to override.`);
  return undefined;
}

async function open(): Promise<Database> {
  const url = databaseUrl();
  if (url) {
    const { default: postgres } = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const db = drizzle(postgres(url, { max: 5, prepare: false }), { schema }) as unknown as Database;
    if (process.env.CTRL_AUTO_MIGRATE === '1') {
      const { migrate } = await import('drizzle-orm/postgres-js/migrator');
      await migrate(db as never, { migrationsFolder });
    }
    return db;
  }
  if (process.env.VERCEL) throw new Error('DATABASE_URL is not set. Serverless hosts have no persistent disk for the embedded database.');
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), '.data', 'pglite');
  mkdirSync(dir, { recursive: true });
  const db = await openPglite(dir);
  const { seedLibrary } = await import('../store/works');
  await seedLibrary(db);
  return db;
}

/** An embedded database. Pass no directory for an in-memory database (tests). */
export async function openPglite(dir?: string): Promise<Database> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const client = dir ? new PGlite(dir) : new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db as unknown as Database;
}

/** True for a Postgres unique-constraint violation, however the driver wraps it. */
export function isUniqueViolation(error: unknown): boolean {
  for (let current = error as { code?: string; message?: string; cause?: unknown } | undefined; current; current = current.cause as typeof current) {
    if (current.code === '23505' || String(current.message ?? '').includes('duplicate key')) return true;
  }
  return false;
}
