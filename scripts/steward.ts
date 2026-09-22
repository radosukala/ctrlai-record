/**
 * Appoints or removes a steward by contributor number. The change is written to the public log.
 *   npm run steward -- 12            appoint contributor #12
 *   npm run steward -- 12 --remove   return contributor #12 to member
 *   npm run steward -- --list        list current stewards
 */
import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db/client';
import { contributors } from '../lib/db/schema';
import { logEvent } from '../lib/store/log';

async function main() {
  const args = process.argv.slice(2);
  const db = await getDb();
  if (args.includes('--list')) {
    const rows = await db.select({ seq: contributors.seq, handle: contributors.handle }).from(contributors).where(eq(contributors.trust, 'steward'));
    console.log(rows.length ? rows.map(row => `#${row.seq} ${row.handle ?? ''}`).join('\n') : 'No stewards yet.');
    process.exit(0);
  }
  const seq = Number(args.find(arg => /^\d+$/.test(arg)));
  if (!seq) throw new Error('Give a contributor number, e.g. npm run steward -- 12');
  const remove = args.includes('--remove');
  const [row] = await db.update(contributors).set({ trust: remove ? 'member' : 'steward' }).where(eq(contributors.seq, seq)).returning();
  if (!row) throw new Error(`No contributor #${seq}`);
  await logEvent(db, { actorId: null, action: remove ? 'steward.removed' : 'steward.appointed', subject: `contributor:${seq}`, detail: { handle: row.handle } });
  console.log(`Contributor #${seq} is now ${remove ? 'a member' : 'a steward'}.`);
  process.exit(0);
}

main().catch(error => {
  console.error(error.message ?? error);
  process.exit(1);
});
