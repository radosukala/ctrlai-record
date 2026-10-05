import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ISSUES } from '../content/issues';
import { firstSentence, linkedin, LINKEDIN_LIMIT, withBlurb, X_LIMIT, xLength, xPicks, xRecap } from '../lib/social';

const options = { origin: 'https://ctrlai.com', newsletter: true };

test('X counts every link as 23 characters, and emoji, arrows and ellipses as two', () => {
  assert.equal(xLength('hello'), 5);
  assert.equal(xLength('see https://ctrlai.com/week/2026-10-04?utm_source=x&utm_medium=social&utm_campaign=issue-1#worth-your-time'), 4 + 23);
  assert.equal(xLength('it’s “quoted” — fine'), 20, 'curly quotes and the em dash are one each');
  assert.equal(xLength('a…'), 3);
  assert.equal(xLength('→ •'), 2 + 1 + 2);
  assert.equal(xLength('👍'), 2);
  assert.equal(xLength('café'), 4);
});

test('the first sentence stops at the right full stop', () => {
  assert.equal(firstSentence('Gates thinks the alarm hasn’t gone far enough. He expects more.'), 'Gates thinks the alarm hasn’t gone far enough.');
  assert.equal(firstSentence('Sen. Hawley read the logs. Altman declined.'), 'Sen. Hawley read the logs.');
  assert.equal(firstSentence('A.I. is everywhere. That matters.'), 'A.I. is everywhere.');
  assert.equal(firstSentence('He called it “insane.” Then he left.'), 'He called it “insane.”');
  assert.equal(firstSentence('No full stop here'), 'No full stop here');
});

test('a long blurb is cut at a clause, a short one is kept, and the link always survives', () => {
  const head = '2/7 Sep 28 · OpenAI cancels the release of its next model';
  const url = 'https://example.com/a/very/long/path';
  const long = 'OpenAI dropped its planned October release after internal tests found the model was more deceptive about what it had done and pushed ahead with tasks beyond what users had allowed and then some more words to be sure it overflows the limit.';
  const cut = withBlurb(head, long, url);
  assert.ok(xLength(cut) <= X_LIMIT);
  assert.ok(cut.includes('…') && cut.endsWith(url));
  assert.ok(!/ (and|with|that|but)…/.test(cut), 'no dangling conjunction before the ellipsis');
  assert.equal(withBlurb(head, 'Short.', url), `${head}\n\nShort.\n\n${url}`);
  const hopeless = withBlurb('x'.repeat(240), 'Anything at all that is long enough to matter here.', url);
  assert.equal(hopeless, `${'x'.repeat(240)}\n\n${url}`);
});

for (const issue of ISSUES) {
  test(`issue ${issue.number}: the X recap fits, and has a post for every main event`, () => {
    const posts = xRecap(issue, options);
    assert.equal(posts.length, issue.main.length + 2);
    posts.forEach((post, index) => assert.ok(xLength(post.text) <= X_LIMIT, `post ${index + 1} is ${xLength(post.text)} characters`));
    assert.equal(posts[0].attach, 'recap.png');
    issue.main.forEach((event, index) => {
      assert.ok(posts[index + 1].text.includes(event.headline), event.headline);
      assert.ok(posts[index + 1].text.includes(event.sources[0].url), 'each event links to its first source');
      assert.ok(posts[index + 1].text.startsWith(`${index + 2}/${posts.length} `));
    });
  });

  test(`issue ${issue.number}: the picks thread tags only the handles we listed, with a card each`, () => {
    const posts = xPicks(issue, options);
    assert.equal(posts.length, issue.picks.length + 2);
    posts.forEach((post, index) => assert.ok(xLength(post.text) <= X_LIMIT, `post ${index + 1} is ${xLength(post.text)} characters`));
    issue.picks.forEach((pick, index) => {
      const post = posts[index + 1];
      assert.equal(post.attach, `card-${pick.id}.png`);
      assert.deepEqual([...post.text.matchAll(/@(\w+)/g)].map(match => match[1]), pick.x ?? []);
      assert.ok(post.text.includes(`#${pick.id}`));
      assert.ok(!/\(@\w+\)\s+@/.test(post.text), 'a handle already in the byline is not repeated');
    });
  });

  test(`issue ${issue.number}: the LinkedIn post fits, has no links in the body, and the link goes in the comment`, () => {
    const post = linkedin(issue, options);
    assert.ok(post.text.length <= LINKEDIN_LIMIT);
    assert.ok(!/https?:\/\//.test(post.text), 'outside links go in the first comment');
    assert.ok(post.firstComment.includes(`/week/${issue.slug}`));
    for (const event of issue.main) assert.ok(post.text.includes(event.headline));
    assert.ok(!post.text.includes('undefined'));
    assert.ok(post.text.includes('post on X'), 'the acronym keeps its capital');
  });
}

test('posts only advertise the signup when it is live', () => {
  const issue = ISSUES[0];
  const live = [...xRecap(issue, options), ...xPicks(issue, options)].map(post => post.text).join('\n');
  const dormant = [...xRecap(issue, { ...options, newsletter: false }), ...xPicks(issue, { ...options, newsletter: false })].map(post => post.text).join('\n');
  assert.ok(live.includes('/subscribe'));
  assert.ok(!dormant.includes('/subscribe'));
  assert.ok(!linkedin(issue, { ...options, newsletter: false }).firstComment.includes('/subscribe'));
});

test('every link we post says where the visit came from', () => {
  const issue = ISSUES[0];
  const links = [...xRecap(issue, options), ...xPicks(issue, options)].flatMap(post => post.text.match(/https:\/\/ctrlai\.com\S+/g) ?? []);
  assert.ok(links.length >= 10);
  for (const url of links) assert.equal(new URL(url).searchParams.get('utm_source'), 'x', url);
});
