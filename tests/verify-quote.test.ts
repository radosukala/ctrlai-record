import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinTranscript, MAX_GAP_WORDS, verifyQuote } from '../lib/verify-quote';

// Synthetic source text shaped like the real failure cases found on Oct 6 2026 (see pilot notes).
const SOURCE = `“This is a time that calls for extreme caution,” wrote the chief scientist, Pat Lee. “I expect and hope for voluntary slowdowns to become commonplace until shared safety bars are established.” Later the representative said: “Congress should do the obvious thing, which is banning catastrophic uses like creating weapons, banning catastrophic models that could overthrow a government, kill large numbers of people, or try to deceive humans,” says Rivera. She added: “We don’t have time to wait for perfection.”`;

test('a verbatim quote passes, exact', () => {
  const r = verifyQuote('I expect and hope for voluntary slowdowns to become commonplace until shared safety bars are established.', SOURCE);
  assert.ok(r.ok && r.mode === 'exact');
});

test('curly versus straight apostrophes and quote marks do not matter', () => {
  const r = verifyQuote("We don't have time to wait for perfection.", SOURCE);
  assert.ok(r.ok && r.mode === 'exact');
});

test('the same words without the punctuation pass as "words", not "exact"', () => {
  const r = verifyQuote('banning catastrophic uses like creating weapons banning catastrophic models that could overthrow a government', SOURCE);
  assert.ok(r.ok && r.mode === 'words');
});

test('one word changed fails and reports how close it was', () => {
  const r = verifyQuote('I expect and hope for voluntary slowdowns to become universal until shared safety bars are established.', SOURCE);
  assert.ok(!r.ok);
  assert.ok((r.coverage ?? 0) > 0.8 && (r.coverage ?? 1) < 1);
  assert.match(r.closest ?? '', /commonplace/);
});

test('an inverted meaning fails', () => {
  const t = 'I think the labs cannot be trusted to regulate themselves, frankly.';
  assert.ok(verifyQuote('the labs cannot be trusted to regulate themselves', t).ok);
  assert.ok(!verifyQuote('the labs can be trusted to regulate themselves', t).ok);
});

test('an attribution phrase silently cut out of a quote fails; marking the gap with an ellipsis passes', () => {
  const spliced = 'This is a time that calls for extreme caution. I expect and hope for voluntary slowdowns to become commonplace.';
  assert.ok(!verifyQuote(spliced, SOURCE).ok);
  const marked = verifyQuote('This is a time that calls for extreme caution … I expect and hope for voluntary slowdowns to become commonplace.', SOURCE);
  assert.ok(marked.ok && marked.segments === 2);
});

test('dropping a clause from the middle of a sentence fails (it changes what the person said)', () => {
  const r = verifyQuote('Congress should do the obvious thing, which is banning catastrophic models that could overthrow a government, kill large numbers of people', SOURCE);
  assert.ok(!r.ok);
});

test('words invented between real ones fail', () => {
  assert.ok(!verifyQuote('Congress should do the very obvious thing, which is banning catastrophic uses like creating weapons', SOURCE).ok);
});

test('editorial brackets are refused', () => {
  const r = verifyQuote('Congress should do the obvious thing, which is [banning] catastrophic uses', SOURCE);
  assert.ok(!r.ok && /brackets/.test(r.reason));
});

test('a segment of fewer than three words is refused', () => {
  const r = verifyQuote('Congress should … banning catastrophic uses like creating weapons', SOURCE);
  assert.ok(!r.ok && /fewer than 3/.test(r.reason));
});

test('segments must be in order, and close together', () => {
  assert.ok(!verifyQuote('banning catastrophic uses like creating weapons … Congress should do the obvious thing', SOURCE).ok);
  const filler = Array.from({ length: MAX_GAP_WORDS + 50 }, (_, i) => `word${i}`).join(' ');
  const far = `The first part of the statement is here. ${filler} And the second part of the statement is here.`;
  const r = verifyQuote('The first part of the statement is here … the second part of the statement is here', far);
  assert.ok(!r.ok && /words apart/.test(r.reason));
});

test('words that appear in the source but nowhere together do not make a quote', () => {
  assert.ok(!verifyQuote('voluntary slowdowns until the senator said we have time', SOURCE).ok);
});

test('an empty or whitespace quote fails', () => {
  assert.ok(!verifyQuote('   ', SOURCE).ok);
  assert.ok(!verifyQuote('… …', SOURCE).ok);
});

test('a transcript maps a quote to the second it was said', () => {
  const { text, offsets } = joinTranscript([
    { start: 0, text: 'welcome back to the show' },
    { start: 41.2, text: 'I think the labs cannot be trusted to' },
    { start: 44.9, text: 'regulate themselves, frankly.' },
  ]);
  const r = verifyQuote('the labs cannot be trusted to regulate themselves', text, offsets);
  assert.ok(r.ok && r.timestamp === 41.2);
});

test('long quotes are flagged', () => {
  const long = Array.from({ length: 90 }, (_, i) => `alpha${i}`).join(' ');
  const r = verifyQuote(long, `intro ${long} outro`);
  assert.ok(r.ok && r.warnings.some((w) => /keep quotes short/.test(w)));
});

// ---- Oct 7 2026: the three attacks from the Oct 6 stress test that the first version let through, and the clean-up it refused.
// Each attack is a real quote from the Klein–Gates transcript, rebuilt here as a short source so the tests need no network.

test('ATTACK B1: dropping "not" with an ellipsis is refused; the whole sentence passes', () => {
  const src = 'the necessary step is people can talk about whether slowing down is good or not but putting in the safeguards and the monitoring will not meaningfully slow things down and the only effect that has on open source is that you can still be free.';
  const attack = verifyQuote('putting in the safeguards and the monitoring will … meaningfully slow things down', src);
  assert.ok(!attack.ok && /leaves out “not”/.test(attack.reason));
  const whole = verifyQuote('putting in the safeguards and the monitoring will not meaningfully slow things down', src);
  assert.ok(whole.ok, 'a "not" before "but" belongs to the earlier clause and must not block the real quote');
});

test("ATTACK B2: starting a quote just after \"don't think\" is refused; a plain lead-in is only shown to the reviewer", () => {
  const src = "I don't think a black and white ban uh is necessary because I do think with monitoring we can do it.";
  const attack = verifyQuote('a black and white ban uh is necessary because I do think with monitoring', src);
  assert.ok(!attack.ok && /starts after “don't”/.test(attack.reason));
  const plain = verifyQuote('a black and white ban is necessary', 'I think a black and white ban is necessary.');
  assert.ok(plain.ok && plain.leadIn === 'I think' && plain.warnings.length === 0);
});

test("ATTACK B3: a quote that runs from the host's question into the guest's answer is refused", () => {
  const src = "So why is anything needed beyond the natural incentives under capitalism? >> Well, I almost can't believe you're asking that. This is the most dangerous thing that humans have ever gone near.";
  const splice = verifyQuote("anything needed beyond the natural incentives under capitalism … I almost can't believe you're asking that", src);
  assert.ok(!splice.ok && /change of speaker/.test(splice.reason));
  const single = verifyQuote("I almost can't believe you're asking that", src);
  assert.ok(single.ok && single.turn === 1);
});

test('ATTACK B4: two sentences far apart no longer pass as one quote; a short skip does', () => {
  const filler = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
  const quote = "you can't rely on the industry to selfregulate here … do we wait until a cyber attack causes massive damage";
  const far = verifyQuote(quote, `You can't rely on the industry to selfregulate here. ${filler(60)} Do we wait until a cyber attack causes massive damage.`);
  assert.ok(!far.ok && /words apart/.test(far.reason));
  const near = verifyQuote(quote, `You can't rely on the industry to selfregulate here. ${filler(10)} Do we wait until a cyber attack causes massive damage.`);
  assert.ok(near.ok);
});

test('a "…" may shorten a sentence but may not skip whole sentences', () => {
  const src = 'You cannot rely on the industry to regulate itself. Everyone in the room knows that and wants it fixed very soon. Some people have held them to account for a decade.';
  const skip = verifyQuote('You cannot rely on the industry to regulate itself … Some people have held them to account for a decade', src);
  assert.ok(!skip.ok && /skips whole sentences/.test(skip.reason));
  const shorten = verifyQuote('You cannot rely on the industry to regulate itself. Everyone in the room … wants it fixed very soon', src);
  assert.ok(shorten.ok && shorten.omitted?.[0] === 'knows that and');
});

test('a quote that starts right after "because" is flagged as the tail of a longer claim', () => {
  const src = 'We always said that when we cross these thresholds we will engage all of society because we will have created the most dangerous thing ever. This makes nuclear weapons look like nothing.';
  const r = verifyQuote('we will have created the most dangerous thing ever. This makes nuclear weapons look like nothing.', src);
  assert.ok(r.ok && r.warnings.some((w) => /right after “because”/.test(w)) && /because$/.test(r.leadIn ?? ''));
});

test('a question followed by more words inside one quote is flagged, because captions do not mark every change of speaker', () => {
  const src = 'and what do your first steps need to be? There is no supervisory layer today and that is the problem.';
  const r = verifyQuote('what do your first steps need to be? There is no supervisory layer today', src);
  assert.ok(r.ok && r.warnings.some((w) => /question followed by more words/.test(w)));
});

test('a phrase that appears twice cannot hide the right match', () => {
  const filler = Array.from({ length: 60 }, (_, i) => `w${i}`).join(' ');
  const r = verifyQuote('We must act now on this … because the risk is real', `We must act now on this. ${filler} We must act now on this because the risk is real.`);
  assert.ok(r.ok);
});

test('"uh", "um" and a word said twice are cleaned up without marking, and the reviewer is told', () => {
  const src = "And I I almost can't believe you're asking that. The the this is the most dangerous thing that humans have ever gone near.";
  const r = verifyQuote("I almost can't believe you're asking that.", src);
  assert.ok(r.ok && r.warnings.some((w) => /spoken clean-up: i \(said twice\)/.test(w)));
  const uh = verifyQuote('we crossed the cyber threshold and we crossed the bio threshold early this year', 'we crossed the cyber threshold uh and we crossed the bio threshold early this year.');
  assert.ok(uh.ok && uh.mode === 'words' && uh.warnings.some((w) => /spoken clean-up: uh/.test(w)));
});

test('"you know" is not clean-up: it needs an ellipsis, and a marked gap that drops no negation passes', () => {
  const src = "the notion that, you know, China wouldn't want to engage in that on behalf of humanity is wrong.";
  assert.ok(!verifyQuote("the notion that China wouldn't want to engage in that on behalf of humanity", src).ok);
  const marked = verifyQuote("the notion that … China wouldn't want to engage in that on behalf of humanity", src);
  assert.ok(marked.ok && marked.segments === 2);
});

test('caption sound tags such as [clears throat] are ignored in the source', () => {
  const src = "So, [clears throat] as soon as you complete the entire task, it doesn't matter that there's demand elasticity.";
  assert.ok(verifyQuote("as soon as you complete the entire task, it doesn't matter that there's demand elasticity", src).ok);
});

test('what a quote leaves out or stops before is shown to the reviewer', () => {
  const hedge = verifyQuote('I think this … be the most dangerous technology that humans have ever built', 'I think this might well be the most dangerous technology that humans have ever built.');
  assert.ok(hedge.ok && hedge.warnings.some((w) => /leaves out “might”/.test(w)));
  const cut = verifyQuote('AI is going to be fine for the most part', 'AI is going to be fine for the most part but nobody is ready for it.');
  assert.ok(cut.ok && cut.warnings.some((w) => /stops before “but”/.test(w)) && cut.leadOut === 'but nobody is ready for it');
});

test('with sourceBrackets, handles and redactions that are in the source may be quoted, and their words must still match', () => {
  const src = 'It replied: {We should build [a way to delegate], not own everything}. Then PHASEONE[big] agreed.';
  const q = 'We should build [a way to delegate], not own everything';
  assert.ok(!verifyQuote(q, src).ok, 'by default, brackets in a quote are refused');
  assert.ok(verifyQuote(q, src, undefined, { sourceBrackets: true }).ok);
  assert.ok(verifyQuote('PHASEONE[big] agreed', src, undefined, { sourceBrackets: true }).ok);
  assert.ok(!verifyQuote('We should build [a way to hide], not own everything', src, undefined, { sourceBrackets: true }).ok, 'an inserted word still has to be in the source');
});

test('a sentence that ends inside braces or after an ellipsis does not drag its negation into the next quote', () => {
  const braces = "{I can’t report this externally.} Agents did not try to find reporting paths, even when they said so.";
  assert.ok(verifyQuote('Agents did not try to find reporting paths, even when they said so.', braces, undefined, { sourceBrackets: true }).ok);
  const ellipsis = "I would not send an email… I VETOed because this is social engineering outside the sandbox";
  assert.ok(verifyQuote('I VETOed because this is social engineering outside the sandbox', ellipsis).ok);
});

test('a reviewer can waive the lead-in check for one quote, and the checker keeps a warning', () => {
  const src = 'They were declaring NO_RETURN and then ”CONFIRMED_PERMANENT_DO_NOT_DUPLICATE_ANYONE_TEST.” Next.';
  const q = 'CONFIRMED_PERMANENT_DO_NOT_DUPLICATE_ANYONE_TEST.';
  assert.ok(!verifyQuote(q, src).ok);
  const waived = verifyQuote(q, src, undefined, { waiveLeadIn: true });
  assert.ok(waived.ok && waived.warnings.some((w) => /waived/.test(w)));
});
