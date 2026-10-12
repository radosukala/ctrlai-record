/**
 * Checks the quotations in Radar entry files against the saved text of their source, with the site's quote checker.
 *
 *   npx tsx scripts/radar/check-entry.ts RUN_DIR/entries/abc123.json [more files…]
 *
 * For a video, the captions' timestamps come back too, so a reader can jump to the moment. Prints one line per quote and
 * exits non-zero if any quotation fails. It proves the words are in the saved text; it does not prove who said them.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { joinTranscript, verifyQuote } from '../../lib/verify-quote';
import { secondOpinion } from './second';

type Entry = { id?: string; textFile?: string; quotes?: { text: string; speaker?: string; at?: number }[] };

let failed = 0;
let total = 0;
for (const file of process.argv.slice(2)) {
  const entry = JSON.parse(readFileSync(file, 'utf8')) as Entry;
  const quotes = entry.quotes ?? [];
  if (!quotes.length) { console.log(`${file}: no quotations`); continue; }
  const runDir = dirname(dirname(file));
  const textPath = entry.textFile ? join(runDir, entry.textFile) : '';
  if (!textPath || !existsSync(textPath)) {
    console.log(`${file}: FAIL saved text not found (${entry.textFile})`);
    failed += quotes.length; total += quotes.length; continue;
  }
  const jsonPath = textPath.replace(/\.txt$/, '.transcript.json');
  let text = readFileSync(textPath, 'utf8');
  let offsets: { pos: number; start: number }[] | undefined;
  if (existsSync(jsonPath)) {
    const t = joinTranscript(JSON.parse(readFileSync(jsonPath, 'utf8')).segments);
    text = t.text; offsets = t.offsets;
  }
  for (const q of quotes) {
    total++;
    const v = verifyQuote(q.text, text, offsets, { sourceBrackets: !offsets });
    const secondPath = [textPath.replace(/\.txt$/, '.second.transcript.json'), textPath.replace(/\.txt$/, '.second.txt')].find(existsSync);
    if (v.ok && secondPath) {
      const second = secondPath.endsWith('.json') ? joinTranscript(JSON.parse(readFileSync(secondPath, 'utf8')).segments).text : readFileSync(secondPath, 'utf8');
      const o = secondOpinion(q.text, second);
      if (!o.ok) { failed++; console.log(`  FAIL ${entry.id ?? file}: "${q.text.slice(0, 70)}…" → second transcript: ${o.reason} (missing: ${o.missing.join(' ')})`); continue; }
      console.log(`  second transcript agrees on ${Math.round(o.agreement * 100)}%${o.missing.length ? `; not in it: ${o.missing.join(' ')}` : ''}`);
    }
    if (!v.ok) { failed++; console.log(`  FAIL ${entry.id ?? file}: "${q.text.slice(0, 70)}…" → ${v.reason}`); continue; }
    const at = v.timestamp !== undefined ? ` at ${Math.floor(v.timestamp)}s` : '';
    const warn = v.warnings.length ? ` WARN ${v.warnings.join(' | ')}` : '';
    console.log(`  ok   ${entry.id ?? file}: ${v.mode}${at}: "${q.text.slice(0, 60)}…"${warn}`);
  }
}
console.log(`\n${total} quotations, ${total - failed} verified, ${failed} failed.`);
process.exit(failed ? 1 : 0);
