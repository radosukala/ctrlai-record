/**
 * Applies database migrations. With DATABASE_URL set, migrates that Postgres;
 * otherwise migrates the embedded development database in .data/pglite.
 *   npm run db:migrate
 */
import path from 'node:path';

const migrationsFolder = path.join(process.cwd(), 'drizzle');

async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    const client = postgres(url, { max: 1, prepare: false });
    await migrate(drizzle(client), { migrationsFolder });
    await client.end();
    console.log('Migrated', new URL(url).host);
    return;
  }
  const { openPglite } = await import('../lib/db/client');
  await openPglite(process.env.PGLITE_DIR ?? path.join(process.cwd(), '.data', 'pglite'));
  console.log('Migrated the local development database.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
