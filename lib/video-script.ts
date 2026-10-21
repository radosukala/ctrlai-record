import type { Edition } from '@/content/base/editions';
import { CHANGE_LABEL } from '@/content/base/taxonomy';
import { longDate } from '@/lib/site';
import { quoteCard, type DayQuote } from '@/lib/social-day';
import { spoken } from '@/lib/video-voice';



/**
 * What the daily video's narrator says: our own lines and nothing else, kept short because a voice is billed by the
 * character. The three headlines and what they mean are read as they are written on screen, word for word, so each word
 * appears as it is spoken; the rest is a short lead-in. The quotation itself is never read by the voice: its words are
 * someone else's, and are shown, marked, in silence. The numbers and the closing card are shown without a voice.
 */
export type ChangeScript = { kind: string; outlet: string; date: string; note: string[]; lens: string[]; spoken: string };
export type VideoScript = { intro: string; changes: ChangeScript[]; quoteLead?: string };

export const words = (text: string) => text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
const firstSentence = (text: string) => (text.match(/^.*?[.!?](\s|$)/)?.[0] ?? text).trim();

export function videoScript(ed: Edition, pick?: DayQuote): VideoScript {
  const run = ed.run!.run;
  const changes = ed.changes.slice(0, 3).map(({ e }) => {
    const note = words(e.change!.note);
    const lens = words(firstSentence(e.lenses.public ?? ''));
    return { kind: CHANGE_LABEL[e.change!.kind], outlet: e.outlet, date: e.published, note, lens, spoken: [...note, ...lens].map(spoken).join(' ') };
  });
  const card = pick ? quoteCard(pick, 'x') : undefined;
  return {
    intro: `${longDate(run).replace(/, \d{4}$/, '')}: what changed in AI safety and control.`,
    changes,
    quoteLead: card ? `One quotation, from ${card.who}. Source: ${words(pick!.e.outlet).map(spoken).join(' ')}.` : undefined,
  };
}

/** Every line the narrator would say, for counting characters and for checking what is read. */
export const spokenLines = (s: VideoScript): string[] => [s.intro, ...s.changes.map(c => c.spoken), ...(s.quoteLead ? [s.quoteLead] : [])];

/**
 * The words to listen for when watching a voiced video: the ones we respelled for the voice, acronyms and names with a
 * capital inside (a voice may misread them), and the speaker of the quotation, whose name is read in the lead-in. A person
 * can't hear the video before it is made, so the report says where to listen.
 */
export function listenFor(script: VideoScript, speaker?: string): string[] {
  const out = new Map<string, string>();
  const tokens = script.changes.flatMap(c => [...c.note, ...c.lens]);
  for (const token of tokens) {
    const word = token.replace(/^[^A-Za-z]+|[^A-Za-z.]+$/g, '');
    if (!word) continue;
    if (spoken(word) !== word) out.set(word, `${word} (spoken “${spoken(word)}”)`);
    else if (/^[A-Z]{3,}$/.test(word) || /^[A-Za-z][a-z]+[A-Z]/.test(word)) if (!out.has(word)) out.set(word, word);
  }
  if (speaker) out.set(speaker, speaker);
  return [...out.values()].slice(0, 10);
}
