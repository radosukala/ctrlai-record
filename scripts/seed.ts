/**
 * Loads content/library.json into the database (idempotent; seed entries are updated in place).
 *   npm run seed
 */
import { getDb } from '../lib/db/client';
import { seedLibrary } from '../lib/store/works';
import { workCounts } from '../lib/store/works';

async function main() {
  const db = await getDb();
  await seedLibrary(db);
  const counts = await workCounts(db);
  console.log('Library entries by kind:', counts);
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
