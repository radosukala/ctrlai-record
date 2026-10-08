import { readFileSync, readdirSync } from 'node:fs';
import { tokenize } from '../lib/verify-quote';

/**
 * Where our own words about the incident live, and how to find the phrases in them that claim to be someone else's.
 * Shared by scripts/verify-incident.ts (which checks the phrases against the sources) and tests/incident.test.ts (which
 * checks that the script has seen every one of them), so the two cannot drift apart.
 */

const DATA = 'content/incidents/openai-hf';
const dataFiles = readdirSync(DATA).filter(f => f.endsWith('.ts')).map(f => `${DATA}/${f}`);

/** Every file the reconstruction is made of. Nothing in any of them may reproduce a key, an endpoint or an exploit string. */
export const ALL_FILES = [
  'app/incident/openai-hugging-face/page.tsx',
  'app/incident/openai-hugging-face/film/page.tsx',
  'app/incident/openai-hugging-face/film/script/page.tsx',
  ...readdirSync('components/incident').filter(f => f.endsWith('.tsx')).map(f => `components/incident/${f}`),
  ...readdirSync('components/incident/film').filter(f => /\.tsx?$/.test(f)).map(f => `components/incident/film/${f}`),
  ...dataFiles,
];

/**
 * The files whose text is ours. The quotation files are not: their words belong to the sources and are checked quote by
 * quote (their glosses, which are ours, are added by the caller). The titles of other people's videos are not ours either.
 */
export const OUR_FILES = ALL_FILES.filter(f => !f.startsWith(`${DATA}/quotes`));

const withoutTitlesOfOthers = (file: string, text: string) =>
  file.endsWith('/sources.ts') ? text.replace(/export const FURTHER = \[[\s\S]*?\n\];/, '') : text;

/** Every phrase in curly double quotation marks in the text, as the words between them. */
export const phrasesIn = (text: string): string[] =>
  [...text.matchAll(/“([^”]+)”/g)].map(m => m[1]).filter(p => tokenize(p).length > 0);

/** Every such phrase in our own words in the files, from `extra` (text held outside the files) too. */
export function ourPhrases(extra: string[] = []): Set<string> {
  const found = new Set<string>();
  for (const f of OUR_FILES) for (const p of phrasesIn(withoutTitlesOfOthers(f, readFileSync(f, 'utf8')))) found.add(p);
  for (const t of extra) for (const p of phrasesIn(t)) found.add(p);
  return found;
}
