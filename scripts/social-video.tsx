/**
 * The day's video: a vertical video of about a minute from the day's edition, made of our own material: the day's three
 * changes in our words, one quotation as text with its source on screen, the numbers behind the edition, and where to
 * find the rest. No footage, no thumbnails, and nobody else's voice. Captions carry it; with --voice the film's narrator
 * reads our own lines (never the quotation), and each word appears on screen as it is spoken. Nothing is posted: this
 * writes the video and the texts to go with it into a folder, and a person looks at it and posts.
 *
 *   npm run social -- video                          the latest run, into kit/video-<run>/ (captions only)
 *   npm run social -- video 2026-10-21 --out DIR     a given run, into DIR
 *   npm run social -- video --frames-only            only the frames (to look at), no MP4
 *   npm run social -- video --quote <quote id>       a different quotation than the kit's pick
 *   npm run social -- video --voice-plan             what the narrator would say, its characters and credits; sends nothing
 *   npm run social -- video --voice                  with the narrator (ElevenLabs; made once, kept in kit/voice-cache)
 *   npm run social -- video --voice --max-chars 1200 the most characters this run may send (the default)
 *   npm run social -- video --voice --tempo 1.2      how much faster than the recording the narration plays (the default; free, nothing is sent)
 *   npm run social -- video --voice --month-cap 22000 stop using the voice when this month's narration would pass this many credits (the default)
 *   npm run social -- video --voice --model eleven_v4 another ElevenLabs model (its lines are kept apart; the first run of it is billed)
 *
 * With --voice, if the voice is unavailable (no key, the service down, over the month's cap) the video is made with captions only,
 * so the daily run always has one. The pictures and sounds it works from go in <out>/work, removed when it is done (--keep-work keeps them).
 */
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { LATEST_DAY_RUN, dayEdition } from '@/content/base/editions';
import { ogFonts } from '@/lib/og';
import { longDate, shortDate } from '@/lib/site';
import { X_LIMIT, xLength } from '@/lib/social';
import { link, linkedinTodayPost, quoteCard, quotesOfTheDay, todayDisclosure } from '@/lib/social-day';
import { ChangeFrame, EndFrame, NumbersFrame, QuoteFrame, TitleFrame, VIDEO_SIZE } from '@/lib/video-frames';
import { listenFor, spokenLines, videoScript, words } from '@/lib/video-script';
import { CREDITS_PER_CHAR, NARRATOR, Narrator, type Speech } from '@/lib/video-voice';

const FPS = 30;
/** Words a reader takes in per second, a little slower than speech, since there is no voice to carry them without --voice. */
const READ_WPS = 3;
const WORD_STEP = 0.15;
const QUOTE_STEP = 0.36;
const FADE = 0.3;
/** With a voice, it starts a moment after the scene fades in. */
const LEAD = 0.4;

type Event = { at: number; el: React.ReactElement };
type Scene = { name: string; events: Event[]; end: number; speech?: Speech };

const readTime = (text: string) => words(text).length / READ_WPS;
const frames = (seconds: number) => Math.max(1, Math.round(seconds * FPS)) / FPS;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const weekday = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

async function png(element: React.ReactElement) {
  const response = new ImageResponse(element, { ...VIDEO_SIZE, fonts: await ogFonts() });
  return Buffer.from(await response.arrayBuffer());
}

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 5 * 60_000 });

/** A scene's events in time order become pictures that last until the next one (or the scene's end). */
function shotsOf(scene: Scene): { el: React.ReactElement; seconds: number }[] {
  const events = [...scene.events].sort((a, b) => a.at - b.at).filter((e, i, all) => i === all.length - 1 || all[i + 1].at - e.at > 1 / FPS / 2);
  return events.map((e, i) => ({ el: e.el, seconds: frames((events[i + 1]?.at ?? scene.end) - e.at) }));
}

export async function runVideo(args: string[]) {
  const runDate = args.find((a, i) => !a.startsWith('--') && !['--out', '--quote', '--max-chars', '--tempo', '--model', '--month-cap'].includes(args[i - 1])) ?? LATEST_DAY_RUN;
  const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const ed = dayEdition(runDate);
  if (!ed?.run) {
    console.error(`No daily run "${runDate}". The latest is ${LATEST_DAY_RUN}.`);
    process.exit(1);
  }
  if (!ed.changes.length) {
    console.log(`No decision, new evidence, correction or commitment in the run of ${runDate}: no video.`);
    return;
  }
  const out = path.resolve(opt('--out') ?? path.join(process.cwd(), 'kit', `video-${runDate}`));
  const work = path.join(out, 'work');
  await mkdir(path.join(work, 'frames'), { recursive: true });

  const changes = ed.changes.slice(0, 3);
  const ranked = quotesOfTheDay(runDate);
  const pick = opt('--quote') ? ranked.find(p => p.q.id === opt('--quote')) : ranked[0];
  const disclosure = todayDisclosure(ed);
  const script = videoScript(ed, pick);

  // The narrator: what it would say and what that costs are shown before anything is sent.
  const lines = spokenLines(script);
  const chars = lines.reduce((n, l) => n + l.length, 0);
  let narrator = args.includes('--voice')
    ? new Narrator(path.join(process.cwd(), 'kit', 'voice-cache'), Number(opt('--max-chars') ?? 1200), { model: opt('--model') })
    : undefined;
  if (args.includes('--voice-plan') || narrator) {
    const toSend = narrator ? narrator.cost(lines) : chars;
    console.log(`The narrator (${NARRATOR.name}) would say ${lines.length} lines, ${chars} characters:`);
    for (const l of lines) console.log(`  ${String(l.length).padStart(3)} | ${l}`);
    console.log(`  ${narrator ? `This run sends ${toSend} of them (the rest are already made)` : `A run would send up to ${chars}`}: about ${Math.round(toSend * CREDITS_PER_CHAR)} credits at ${CREDITS_PER_CHAR} a character. The dashboard is the truth.`);
    if (!narrator) return;
  }
  if (narrator) {
    // Make every line before anything is drawn, so that a failure leaves a captions-only video, never half a voice.
    const cap = Number(opt('--month-cap') ?? 22000);
    const spent = narrator.spent(runDate.slice(0, 7));
    const need = Math.round(narrator.cost(lines) * CREDITS_PER_CHAR);
    try {
      if (need > 0 && spent + need > cap) throw new Error(`this month's narration would pass ${cap} credits (${spent} spent, ${need} more needed)`);
      for (const l of lines) await narrator.say(l);
      console.log(`Narration: ${narrator.sent} characters sent, ${narrator.kept} already made; this month ${narrator.spent(runDate.slice(0, 7))} of ${cap} credits used (estimated).`);
    } catch (err) {
      console.log(`WARNING: no narration (${err instanceof Error ? err.message : err}); making the captions-only video.`);
      narrator = undefined;
    }
  }
  // The narrator reads slowly, about two words a second. Played a fifth faster (pitch kept), it is about a news reader's pace.
  const tempo = narrator ? Number(opt('--tempo') ?? 1.2) : 1;
  const narrated = narrator ? narrator.sent + narrator.kept : 0;
  const speak = async (text: string) => (narrator ? narrator.say(text) : undefined);

  // The storyboard: what is on screen, and when.
  const scenes: Scene[] = [];
  const introSpeech = await speak(script.intro);
  scenes.push({ name: 'Intro', events: [{ at: 0, el: <TitleFrame date={`${weekday(runDate)}, ${longDate(runDate)}`} /> }], end: introSpeech ? Math.max(4.5, LEAD + introSpeech.seconds / tempo + 0.9) : 4.5, speech: introSpeech });

  for (const [i, c] of script.changes.entries()) {
    const props = { n: i + 1, of: changes.length, kind: c.kind, outlet: c.outlet, date: shortDate(c.date), note: c.note.join(' '), lens: c.lens.join(' ') || undefined };
    const speech = await speak(c.spoken);
    const lead = speech ? LEAD : 0;
    const n = c.note.length;
    const starts = speech ? speech.words.slice(0, n).map(w => w.start / tempo) : c.note.map((_, k) => k * WORD_STEP);
    const events: Event[] = [{ at: 0, el: <ChangeFrame {...props} shown={0} showLens={false} /> }];
    starts.forEach((at, k) => events.push({ at: lead + at, el: <ChangeFrame {...props} shown={k + 1} showLens={false} /> }));
    const lensAt = speech ? lead + (speech.words[n]?.start ?? speech.seconds) / tempo - 0.1 : n * WORD_STEP + 0.9;
    if (props.lens) events.push({ at: lensAt, el: <ChangeFrame {...props} shown={n} showLens /> });
    const end = speech ? lead + speech.seconds / tempo + 1.4 : props.lens ? lensAt + Math.max(5, readTime(props.lens)) + 1.2 : lensAt;
    scenes.push({ name: `${i + 1}. ${c.kind}: ${props.note}`, events, end, speech });
  }

  if (pick) {
    const card = quoteCard(pick, 'x');
    const props = { quote: pick.q.text, who: card.who, role: card.role, source: card.source, context: card.context };
    const n = words(props.quote).length;
    const lead = script.quoteLead ? await speak(script.quoteLead) : undefined;
    const from = lead ? LEAD + lead.seconds / tempo + 0.6 : 0.9;
    const events: Event[] = [{ at: 0, el: <QuoteFrame {...props} lit={0} /> }];
    for (let k = 1; k <= n; k++) events.push({ at: from + (k - 1) * QUOTE_STEP, el: <QuoteFrame {...props} lit={k} /> });
    scenes.push({ name: `One quotation: ${card.who}`, events, end: from + n * QUOTE_STEP + Math.max(3.5, readTime(props.context ?? '') + 1), speech: lead });
  }

  const r = ed.run;
  const rows = [
    { n: String(r.answered), label: 'sources checked this morning' },
    { n: String(ed.numbers.entries), label: `entries, ${ed.numbers.read} read in full` },
    { n: String(ed.numbers.quotes), label: 'quotations found word for word in the saved text' },
  ];
  scenes.push({ name: 'Behind the edition', events: [0, 1.3, 2.6].map((at, i) => ({ at, el: <NumbersFrame rows={rows} shown={i + 1} /> })), end: 5 });
  scenes.push({ name: 'The full edition', events: [{ at: 0, el: <EndFrame address={`ctrlai.com/day/${runDate}`} disclosure={disclosure} voiceNote={narrator ? 'Narration: a synthetic voice.' : undefined} /> }], end: 5.5 });

  // Draw every frame.
  let drawn = 0;
  const lists: { scene: Scene; file: string; seconds: number }[] = [];
  for (const [s, scene] of scenes.entries()) {
    const entries = ['ffconcat version 1.0'];
    let sum = 0;
    for (const [k, shot] of shotsOf(scene).entries()) {
      const name = `s${s}-${String(k).padStart(3, '0')}.png`;
      await writeFile(path.join(work, 'frames', name), await png(shot.el));
      drawn++;
      entries.push(`file '${path.join(work, 'frames', name)}'`, `duration ${shot.seconds.toFixed(4)}`);
      sum += shot.seconds;
    }
    entries.push(entries[entries.length - 2]);
    const file = path.join(work, `scene-${s}.txt`);
    await writeFile(file, `${entries.join('\n')}\n`);
    lists.push({ scene, file, seconds: sum });
  }
  const total = lists.reduce((t, l) => t + l.seconds, 0);
  console.log(`${drawn} frames, ${scenes.length} scenes, ${total.toFixed(1)} s`);
  if (args.includes('--frames-only')) return;

  // One clip per scene, fading through white at both ends, then the scenes joined, a progress bar added, and the sound.
  const parts: string[] = [];
  const sounds: string[] = [];
  for (const [s, { scene, file, seconds }] of lists.entries()) {
    const part = path.join(work, `scene-${s}.mp4`);
    run('ffmpeg', [
      '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', file,
      '-vf', `fps=${FPS},format=yuv420p,fade=t=in:st=0:d=${FADE}:color=white,fade=t=out:st=${(seconds - FADE).toFixed(3)}:d=${FADE}:color=white`,
      // The concat list ends by repeating its last picture, which ffmpeg plays for as long again: cut at the scene's length.
      '-t', seconds.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-an', part,
    ]);
    parts.push(part);
    // Each scene's sound is its speech, after the lead, padded with silence to the scene's length.
    const wav = path.join(work, `scene-${s}.wav`);
    if (scene.speech) {
      run('ffmpeg', ['-loglevel', 'error', '-y', '-i', scene.speech.file, '-af', `atempo=${tempo},adelay=${Math.round(LEAD * 1000)}:all=1,apad=whole_dur=${seconds.toFixed(3)}`, '-t', seconds.toFixed(3), '-ar', '44100', '-ac', '2', wav]);
    } else {
      run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', seconds.toFixed(3), wav]);
    }
    sounds.push(wav);
  }
  await writeFile(path.join(work, 'scenes.txt'), `${parts.map(p => `file '${p}'`).join('\n')}\n`);
  await writeFile(path.join(work, 'sounds.txt'), `${sounds.map(p => `file '${p}'`).join('\n')}\n`);
  const body = path.join(work, 'body.mp4');
  run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'scenes.txt'), '-c', 'copy', body]);
  const voice = path.join(work, 'voice.wav');
  run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'sounds.txt'), '-c', 'copy', voice]);
  const mp4 = path.join(out, `ctrlai-day-${runDate}.mp4`);
  run('ffmpeg', [
    '-loglevel', 'error', '-y', '-i', body, '-i', voice,
    '-f', 'lavfi', '-i', `color=c=0xffe45c:s=${VIDEO_SIZE.width}x14:r=${FPS}`,
    // The speech at a steady loudness for feeds (about -16 LUFS); with no voice the track stays silent.
    '-filter_complex', `[0:v][2:v]overlay=x='-W+W*t/${total.toFixed(3)}':y=H-14:shortest=1[v];[1:a]${narrator ? 'loudnorm=I=-16:TP=-1.5:LRA=11' : 'anull'}[a]`,
    '-map', '[v]', '-map', '[a]', '-shortest',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-movflags', '+faststart', mp4,
  ]);
  await writeFile(path.join(out, 'poster.png'), await png(scenes[0].events[0].el));

  // The texts to go with it, with the sources and links.
  // YouTube chapters must run at least 10 seconds: a shorter scene joins the one after it (the last, the one before).
  const spans: { name: string; start: number; seconds: number }[] = [];
  let at = 0;
  for (const { scene, seconds } of lists) {
    const last = spans[spans.length - 1];
    if (last && last.seconds < 10) {
      last.name = last.name === 'Intro' ? scene.name : `${last.name} and ${scene.name[0].toLowerCase()}${scene.name.slice(1)}`;
      last.seconds += seconds;
    } else spans.push({ name: scene.name, start: at, seconds });
    at += seconds;
  }
  if (spans.length > 1 && spans[spans.length - 1].seconds < 10) {
    const tail = spans.pop()!;
    spans[spans.length - 1].seconds += tail.seconds;
  }
  const chapters = spans.map(c => `${clock(c.start)} ${c.name.length > 90 ? `${c.name.slice(0, 89).replace(/\s+\S*$/, '')}…` : c.name}`);
  const sources = [
    ...changes.map(({ e }, i) => `${i + 1}. ${e.change!.note}\n   ${e.outlet}: ${e.url}\n   Ctrl AI entry: ${link(`/base/${e.slug}`, 'youtube', runDate)}`),
    ...(pick ? [`Quotation: “${pick.q.text}” ${quoteCard(pick, 'x').who}, ${quoteCard(pick, 'x').source}.\n   ${pick.e.outlet}: ${pick.e.url}\n   Ctrl AI entry: ${link(`/base/${pick.e.slug}`, 'youtube', runDate, pick.q.id)}`] : []),
  ];
  const xText = `${weekday(runDate)}, ${shortDate(runDate)}: what changed in AI safety and control, in ${total < 65 ? 'about a minute' : 'just over a minute'}. Every source is named on screen; the full edition and every checked quotation are at the link below.${disclosure ? '\n\nCtrl AI is written with Claude (Anthropic).' : ''}`;
  const li = linkedinTodayPost(ed, runDate);
  const md = [
    `# The day's video, ${weekday(runDate)}, ${longDate(runDate)}`, '',
    `ctrlai-day-${runDate}.mp4: ${clock(total)}, 1080×1920 (vertical), ${narrator ? 'narrated, with captions' : 'captions only, a silent audio track'}. poster.png is its first frame.`,
    'Drafts only: nothing is posted. Watch it through, read each text, then post.', '',
    ...(narrator ? [`Listen for these words (the voice may misread a name): ${listenFor(script, pick ? quoteCard(pick, 'x').who : undefined).join('; ')}.`, ''] : []),
    '## What is in it, and what is not', '',
    `Our own words and graphics, and one short text quotation with its source on screen. No footage, no thumbnails. ${narrator ? `The narration is ${NARRATOR.name}, a licensed synthetic voice (the film's narrator), reading only our own lines, never the quotation; ${narrated} characters of it were generated (about ${Math.round(narrated * CREDITS_PER_CHAR)} credits). Say so when you post: the end card does.` : 'No audio and no voice.'} Nothing here needs a show’s or a broadcaster’s permission.`, '',
    `## X · attach the video · ${xLength(xText)}/${X_LIMIT}${xLength(xText) > X_LIMIT ? ' · OVER' : ''}`, '', xText, '', 'First reply:', '', link(`/day/${runDate}`, 'x', runDate), '',
    ...(li ? ['## LinkedIn · attach the video instead of the card', '', li.text, '', 'First comment:', '', li.comment, ''] : []),
    '## YouTube (a Short, or a normal upload)', '',
    `Title: What changed in AI safety and control, ${weekday(runDate)}, ${shortDate(runDate)} · Ctrl AI`, '',
    'Description:', '',
    `What changed in AI safety and control on ${longDate(runDate)}, with every source named. Each quotation in the record is checked word for word against its source.${narrator ? ' The narration is a synthetic voice.' : ''}`, '',
    'Chapters:', ...chapters, '', 'Sources:', ...sources, '', `The full edition: ${link(`/day/${runDate}`, 'youtube', runDate)}`, ...(disclosure ? ['', disclosure] : []), '',
  ].join('\n');
  await writeFile(path.join(out, 'VIDEO.md'), md);
  if (!args.includes('--keep-work')) await rm(work, { recursive: true, force: true });

  const probe = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'csv=p=0', mp4]).trim().split(',');
  console.log(`Video for ${runDate} is in ${mp4}`);
  console.log(`  ${Number(probe[0]).toFixed(1)} s, ${(Number(probe[1]) / 1e6).toFixed(1)} MB; texts in VIDEO.md${xLength(xText) > X_LIMIT ? ' (X text OVER)' : ''}`);
  if (xLength(xText) > X_LIMIT) process.exitCode = 1;
}
