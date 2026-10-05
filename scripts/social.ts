/**
 * Writes the weekly social kit for an issue to kit/<slug>/: the X threads, the LinkedIn post and its first comment,
 * and the images each post attaches. Nothing is posted; a person copies, attaches and posts.
 *
 *   npm run social                       the latest issue, images from ctrlai.com
 *   npm run social -- 2026-10-04         a specific issue
 *   npm run social -- --base http://localhost:4310    take the images from a local dev server instead
 *   npm run social -- --newsletter / --no-newsletter  force the signup line in or out (default: ask the live site)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getIssue, LATEST } from '../content/issues';
import { SITE } from '../lib/site';
import { linkedin, LINKEDIN_LIMIT, X_LIMIT, xLength, xPicks, xRecap, type Post } from '../lib/social';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const slug = args.find((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--base') ?? LATEST.slug;
const base = (value('--base') ?? SITE.url).replace(/\/$/, '');

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const issue = getIssue(slug) ?? fail(`No issue "${slug}". The latest is ${LATEST.slug}.`);

/** Posts link to the public site, whatever the images came from. The signup line appears only if /subscribe is live. */
async function newsletterLive(): Promise<boolean> {
  if (flag('--newsletter')) return true;
  if (flag('--no-newsletter')) return false;
  try {
    return (await fetch(`${SITE.url}/subscribe`, { redirect: 'manual' })).status === 200;
  } catch {
    return false;
  }
}

function thread(title: string, intro: string, posts: Post[]): { text: string; over: number } {
  let over = 0;
  const lines = [`# ${title}`, '', intro, ''];
  posts.forEach((post, index) => {
    const length = xLength(post.text);
    if (length > X_LIMIT) over++;
    const warning = length > X_LIMIT ? ` · OVER BY ${length - X_LIMIT}: shorten before posting` : '';
    lines.push(`———— ${index + 1}/${posts.length}${post.attach ? ` · attach ${post.attach}` : ''} · ${length}/${X_LIMIT}${warning} ————`, '', post.text, '');
  });
  return { text: lines.join('\n'), over };
}

const dir = path.join(process.cwd(), 'kit', issue.slug);

async function download(name: string, route: string): Promise<boolean> {
  try {
    const response = await fetch(`${base}${route}`);
    if (!response.ok || !(response.headers.get('content-type') ?? '').startsWith('image/')) return false;
    await writeFile(path.join(dir, name), Buffer.from(await response.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(dir, { recursive: true });
  const newsletter = await newsletterLive();
  const options = { origin: SITE.url, newsletter };

  const recap = thread(`X · what happened · issue ${issue.number}`, 'Post as a thread, in order, attaching the image named on each line. Lengths use X’s rules: every link counts 23, and 280 is the limit without a paid plan.', xRecap(issue, options));
  const picks = thread(`X · worth your time · issue ${issue.number}`, 'Post a day later, or the same day, as a second thread. It tags the people who made each pick. Look at each tag before posting.', xPicks(issue, options));
  const li = linkedin(issue, options);
  const liOver = li.text.length > LINKEDIN_LIMIT;
  const liFile = [
    `# LinkedIn · issue ${issue.number}`, '',
    'Post the text with the image, then add the first comment right away. The link sits in the comment because LinkedIn is widely believed to show posts with outside links to fewer people; move it into the post if you prefer.', '',
    `———— post · attach ${li.attach} · ${li.text.length}/${LINKEDIN_LIMIT}${liOver ? ' · OVER, shorten before posting' : ''} ————`, '', li.text, '',
    '———— first comment ————', '', li.firstComment, '',
  ].join('\n');

  await writeFile(path.join(dir, 'x-recap.md'), recap.text);
  await writeFile(path.join(dir, 'x-picks.md'), picks.text);
  await writeFile(path.join(dir, 'linkedin.md'), liFile);

  const images: [string, string][] = [
    ['recap.png', `/week/${issue.slug}/recap`],
    ['issue.png', `/week/${issue.slug}/opengraph-image`],
    ...issue.picks.map(pick => [`card-${pick.id}.png`, `/week/${issue.slug}/card/${pick.id}`] as [string, string]),
  ];
  const missing: string[] = [];
  for (const [name, route] of images) if (!(await download(name, route))) missing.push(name);

  console.log(`Kit for issue ${issue.number} (${issue.slug}) is in kit/${issue.slug}/`);
  console.log(`  x-recap.md    ${xRecap(issue, options).length} posts${recap.over ? `, ${recap.over} OVER the limit` : ', all fit'}`);
  console.log(`  x-picks.md    ${xPicks(issue, options).length} posts${picks.over ? `, ${picks.over} OVER the limit` : ', all fit'}`);
  console.log(`  linkedin.md   ${li.text.length} characters${liOver ? ', OVER the limit' : ', fits'}`);
  console.log(`  images        ${images.length - missing.length} of ${images.length} downloaded from ${base}`);
  console.log(`  signup line   ${newsletter ? 'included (the newsletter is live)' : 'left out (the newsletter is not live)'}`);
  if (missing.length) console.log(`\nMissing images: ${missing.join(', ')}\nThe site at ${base} may not have this issue deployed yet. Push it, or use --base http://localhost:4310 with the dev server running.`);
  if (recap.over || picks.over || liOver) process.exitCode = 1;
}

main();
