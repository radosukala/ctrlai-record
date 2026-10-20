/**
 * The checked clip: the seconds of a recording in which a person says a quotation that is in the Base, with their words
 * lighting up on paper as they say them, then the quotation's card. It writes an MP4, and the frames it was made from,
 * into a folder. Nothing is posted.
 *
 *   npx tsx scripts/social-clip.tsx <quote id> --video FILE [--focus 0.5] [--out DIR]
 *
 * FILE is a stretch of the recording around the quotation (fetched by hand; before anything is posted, with the show's
 * permission). --focus is where the speaker sits across the frame, 0 to 1, for the 4:3 crop. The words are timed by a
 * local speech-to-text pass over that stretch, which is also a second, independent transcript: if the quotation isn't
 * in it by the rule of scripts/radar/second.ts, no clip is made.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { ENTRIES, currentTitle, nameOf } from '@/content/base';
import { TOPIC } from '@/content/base/taxonomy';
import { CLIP_SIZE, CLIP_VIDEO, ClipFrame, QuoteCard, ogFonts } from '@/lib/og';
import { longDate, shortDate } from '@/lib/site';
import { DISCLOSURE } from '@/lib/social-day';
import { LEAD, TAIL, alignWords } from '@/lib/moments';
import { secondOpinion } from './radar/second';

const TOOLS = process.env.CTRLAI_TOOLS ?? '/Users/rado/code/ctrlai-tools';
const WHISPER_CLI = process.env.WHISPER_CLI ?? '/opt/homebrew/bin/whisper-cli';
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? `${TOOLS}/models/ggml-large-v3-turbo-q5_0.bin`;
const FPS = '24000/1001';
/** How long the card holds at the end. */
const CARD = 3.5;

type Word = { start: number; end: number; text: string };

async function png(element: React.ReactElement) {
  const response = new ImageResponse(element, { ...CLIP_SIZE, fonts: await ogFonts() });
  return Buffer.from(await response.arrayBuffer());
}

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Words with their own start and end, from whisper.cpp's tokens (the same reading as scripts/radar/transcribe.py). */
async function hear(video: string, dir: string): Promise<Word[]> {
  const wav = path.join(dir, 'audio.wav');
  const base = path.join(dir, 'whisper');
  run('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  run(WHISPER_CLI, ['-m', WHISPER_MODEL, '-f', wav, '-l', 'en', '-ojf', '-of', base, '-t', '8', '-np']);
  const words: Word[] = [];
  for (const seg of JSON.parse(await readFile(`${base}.json`, 'utf8')).transcription) {
    for (const tok of seg.tokens ?? []) {
      const t: string = tok.text ?? '';
      if (!t || t.startsWith('[_')) continue;
      const a = tok.offsets.from / 1000, b = tok.offsets.to / 1000;
      const last = words[words.length - 1];
      if (t.startsWith(' ') || !last || (/^[A-Z0-9"(]/.test(t) && /[.?!]$/.test(last.text))) words.push({ start: a, end: b, text: t.trim() });
      else { last.text += t; last.end = b; }
    }
  }
  return words;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function main() {
  const args = process.argv.slice(2);
  const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const id = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  const video = opt('--video');
  if (!id || !video) throw new Error('Usage: npx tsx scripts/social-clip.tsx <quote id> --video FILE [--focus 0.5] [--out DIR]');
  const e = ENTRIES.find(x => x.quotes?.some(q => q.id === id));
  const q = e?.quotes?.find(x => x.id === id);
  if (!e || !q) throw new Error(`No quotation ${id} in the Base.`);
  if (!q.speakerCertain) throw new Error(`The speaker of ${id} is not certain; a clip names who is speaking.`);
  const out = path.resolve(opt('--out') ?? path.join('kit', `clip-${id}`));
  const frames = path.join(out, 'frames');
  await mkdir(frames, { recursive: true });

  // Hear the stretch, check the quotation against it, and time its words.
  const heard = await hear(video, out);
  const second = secondOpinion(q.text, heard.map(w => w.text).join(' '));
  if (!second.ok) throw new Error(`The second transcript doesn't carry the quotation (${second.reason ?? `agreement ${second.agreement.toFixed(2)}`}). No clip.`);
  const words = q.text.replace(/\s+/g, ' ').trim().split(' ');
  const timed = alignWords(words, heard);
  const length = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).trim());
  const from = Math.max(0, timed.starts[0] - LEAD);
  const to = Math.min(length, timed.end + TAIL);
  const [w, h] = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', video]).trim().split(',').map(Number);

  // One frame per word said, and the card at the end.
  const said = q.said ?? e.published;
  const props = {
    quote: q.text,
    who: nameOf(q.speaker),
    role: currentTitle(q.speaker)?.replace(/,\s*per\s+[^,]+$/i, '') ?? e.people.find(p => p.id === q.speaker)?.title,
    source: `${e.outlet} · ${said !== e.published ? 'recorded ' : ''}${longDate(said)}${q.at !== undefined ? ` · at ${mmss(q.at)}` : ''}`,
    context: q.context,
  };
  const checked = 'Checked word for word against two transcripts.';
  const list = ['ffconcat version 1.0'];
  for (let k = 0; k <= words.length; k++) {
    const name = `lit-${String(k).padStart(2, '0')}.png`;
    await writeFile(path.join(frames, name), await png(<ClipFrame {...props} lit={k} checked={checked} />));
    const begin = k === 0 ? 0 : timed.starts[k - 1] - from;
    const next = k === words.length ? to - from : timed.starts[k] - from;
    list.push(`file 'frames/${name}'`, `duration ${Math.max(0.01, next - begin).toFixed(3)}`);
  }
  list.push(list[list.length - 2]);
  await writeFile(path.join(out, 'frames.txt'), `${list.join('\n')}\n`);
  await writeFile(
    path.join(frames, 'card.png'),
    await png(
      <QuoteCard size="linkedin" label={`Said · ${shortDate(said)}, ${said.slice(0, 4)}`} {...props} question={TOPIC[e.topics[0]]?.question} disclosure={e.conflict ? DISCLOSURE : undefined} />,
    ),
  );

  // The recording cropped to 4:3 around the speaker, the frames over it, then the card in silence.
  const cropW = Math.round((h * 4) / 3);
  const focus = Number(opt('--focus') ?? 0.5);
  const cropX = Math.max(0, Math.min(w - cropW, Math.round(focus * w - cropW / 2)));
  const length2 = to - from;
  const mp4 = path.join(out, `clip-${id}.mp4`);
  run('ffmpeg', [
    '-loglevel', 'error', '-y',
    '-ss', from.toFixed(3), '-t', length2.toFixed(3), '-i', video,
    '-f', 'concat', '-safe', '0', '-i', path.join(out, 'frames.txt'),
    '-loop', '1', '-framerate', FPS, '-t', String(CARD), '-i', path.join(frames, 'card.png'),
    '-f', 'lavfi', '-t', String(CARD), '-i', 'anullsrc=r=44100:cl=stereo',
    '-filter_complex', [
      `[0:v]crop=${cropW}:${h}:${cropX}:0,scale=${CLIP_VIDEO.width}:${CLIP_VIDEO.height}:flags=lanczos,pad=${CLIP_SIZE.width}:${CLIP_SIZE.height}:0:0:color=white,setsar=1,fps=${FPS}[base]`,
      `[1:v]format=rgba[words]`,
      `[base][words]overlay=0:0,format=yuv420p[clip]`,
      `[2:v]scale=${CLIP_SIZE.width}:${CLIP_SIZE.height},setsar=1,fps=${FPS},format=yuv420p[card]`,
      `[0:a]aformat=sample_rates=44100:channel_layouts=stereo,afade=t=in:d=0.15,afade=t=out:st=${(length2 - 0.45).toFixed(3)}:d=0.45[voice]`,
      `[3:a]aformat=sample_rates=44100:channel_layouts=stereo[quiet]`,
      `[clip][voice][card][quiet]concat=n=2:v=1:a=1[v][a]`,
    ].join(';'),
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', mp4,
  ]);

  console.log(`Clip of ${id} in ${mp4}`);
  console.log(`  ${props.who}: ${words.length} words, ${timed.matched} heard; second transcript agreement ${second.agreement.toFixed(2)}${second.missing.length ? ` (not heard: ${second.missing.join(', ')})` : ''}`);
  console.log(`  ${(length2 + CARD).toFixed(1)} s: ${length2.toFixed(1)} s of the recording from ${from.toFixed(2)} s into the file, then ${CARD} s of the card`);
  if (q.warnings?.length) console.log(`  The checker's warnings on this quotation: ${q.warnings.join('; ')}`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
