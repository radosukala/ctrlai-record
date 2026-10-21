/**
 * The day's video: a vertical video of about a minute from the day's edition, captions only, made of our own material
 * (the day's three changes in our words, one quotation as text with its source on screen, the numbers behind the
 * edition, and where to find the rest). No footage, no audio, no thumbnails, no synthetic voice: nothing that needs
 * anyone's permission but the one short quotation, which is text, as it is on the site. Nothing is posted: this writes
 * the video and the texts to go with it into a folder, and a person looks at it and posts.
 *
 *   npm run social -- video                          the latest run, into kit/video-<run>/
 *   npm run social -- video 2026-10-21 --out DIR     a given run, into DIR
 *   npm run social -- video --frames-only            only the frames (to look at), no MP4
 *   npm run social -- video --quote <quote id>       a different quotation than the kit's pick
 */
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { LATEST_DAY_RUN, dayEdition } from '@/content/base/editions';
import { CHANGE_LABEL } from '@/content/base/taxonomy';
import { ogFonts } from '@/lib/og';
import { longDate, shortDate } from '@/lib/site';
import { X_LIMIT, xLength } from '@/lib/social';
import { link, linkedinTodayPost, quoteCard, quotesOfTheDay, todayDisclosure } from '@/lib/social-day';
import { ChangeFrame, EndFrame, NumbersFrame, QuoteFrame, TitleFrame, VIDEO_SIZE } from '@/lib/video-frames';

const FPS = 30;
/** Words a reader takes in per second, a little slower than speech, since there is no voice to carry them. */
const READ_WPS = 3;
const WORD_STEP = 0.15;
const QUOTE_STEP = 0.36;
const FADE = 0.3;

type Shot = { el: React.ReactElement; seconds: number };
type Scene = { name: string; shots: Shot[] };

const words = (text: string) => text.replace(/\s+/g, ' ').trim().split(' ');
const readTime = (text: string) => words(text).length / READ_WPS;
const frames = (seconds: number) => Math.max(1, Math.round(seconds * FPS)) / FPS;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const weekday = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
const firstSentence = (text: string) => (text.match(/^.*?[.!?](\s|$)/)?.[0] ?? text).trim();

async function png(element: React.ReactElement) {
  const response = new ImageResponse(element, { ...VIDEO_SIZE, fonts: await ogFonts() });
  return Buffer.from(await response.arrayBuffer());
}

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

export async function runVideo(args: string[]) {
  const runDate = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out' && args[i - 1] !== '--quote') ?? LATEST_DAY_RUN;
  const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const ed = dayEdition(runDate);
  if (!ed?.run) {
    console.error(`No daily run "${runDate}". The latest is ${LATEST_DAY_RUN}.`);
    process.exit(1);
  }
  const out = path.resolve(opt('--out') ?? path.join(process.cwd(), 'kit', `video-${runDate}`));
  await mkdir(path.join(out, 'frames'), { recursive: true });

  const changes = ed.changes.slice(0, 3);
  const ranked = quotesOfTheDay(runDate);
  const pick = opt('--quote') ? ranked.find(p => p.q.id === opt('--quote')) : ranked[0];
  const disclosure = todayDisclosure(ed);

  // The storyboard: what is on screen, and for how long.
  const scenes: Scene[] = [];
  scenes.push({ name: 'Intro', shots: [{ el: <TitleFrame date={`${weekday(runDate)}, ${longDate(runDate)}`} />, seconds: 4.5 }] });
  changes.forEach(({ e }, i) => {
    const props = { n: i + 1, of: changes.length, kind: CHANGE_LABEL[e.change!.kind], outlet: e.outlet, date: shortDate(e.published), note: e.change!.note, lens: firstSentence(e.lenses.public ?? '') || undefined };
    const shots: Shot[] = words(props.note).map((_, k) => ({ el: <ChangeFrame {...props} shown={k + 1} showLens={false} />, seconds: WORD_STEP }));
    shots.push({ el: <ChangeFrame {...props} shown={words(props.note).length} showLens={false} />, seconds: 0.9 });
    if (props.lens) shots.push({ el: <ChangeFrame {...props} shown={words(props.note).length} showLens />, seconds: Math.max(5, readTime(props.lens)) + 1.2 });
    scenes.push({ name: `${i + 1}. ${props.kind}: ${props.note}`, shots });
  });
  if (pick) {
    const card = quoteCard(pick, 'x');
    const props = { quote: pick.q.text, who: card.who, role: card.role, source: card.source, context: card.context };
    const n = words(props.quote).length;
    const shots: Shot[] = [{ el: <QuoteFrame {...props} lit={0} />, seconds: 0.9 }];
    for (let k = 1; k <= n; k++) shots.push({ el: <QuoteFrame {...props} lit={k} />, seconds: QUOTE_STEP });
    shots.push({ el: <QuoteFrame {...props} lit={n} />, seconds: Math.max(3.5, readTime(props.context ?? '') + 1) });
    scenes.push({ name: `One quotation: ${card.who}`, shots });
  }
  const r = ed.run;
  const rows = [
    { n: String(r.answered), label: 'sources checked this morning' },
    { n: String(ed.numbers.entries), label: `entries, ${ed.numbers.read} read in full` },
    { n: String(ed.numbers.quotes), label: 'quotations found word for word in the saved text' },
  ];
  scenes.push({ name: 'Behind the edition', shots: [1, 2, 3].map(shown => ({ el: <NumbersFrame rows={rows} shown={shown} />, seconds: shown === 3 ? 2.4 : 1.3 })) });
  scenes.push({ name: 'The full edition', shots: [{ el: <EndFrame address={`ctrlai.com/day/${runDate}`} disclosure={disclosure} />, seconds: 5.5 }] });

  // Draw every frame.
  let drawn = 0;
  const lists: { scene: Scene; file: string; seconds: number }[] = [];
  for (const [s, scene] of scenes.entries()) {
    const lines = ['ffconcat version 1.0'];
    let total = 0;
    for (const [k, shot] of scene.shots.entries()) {
      const name = `s${s}-${String(k).padStart(3, '0')}.png`;
      await writeFile(path.join(out, 'frames', name), await png(shot.el));
      drawn++;
      const seconds = frames(shot.seconds);
      lines.push(`file '${path.join(out, 'frames', name)}'`, `duration ${seconds.toFixed(4)}`);
      total += seconds;
    }
    lines.push(lines[lines.length - 2]);
    const file = path.join(out, `scene-${s}.txt`);
    await writeFile(file, `${lines.join('\n')}\n`);
    lists.push({ scene, file, seconds: total });
  }
  const total = lists.reduce((t, l) => t + l.seconds, 0);
  console.log(`${drawn} frames, ${scenes.length} scenes, ${total.toFixed(1)} s`);
  if (args.includes('--frames-only')) return;

  // One clip per scene, fading through white at both ends, then the scenes joined, a progress bar added, and a silent track.
  const parts: string[] = [];
  for (const [s, { file, seconds }] of lists.entries()) {
    const part = path.join(out, `scene-${s}.mp4`);
    run('ffmpeg', [
      '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', file,
      '-vf', `fps=${FPS},format=yuv420p,fade=t=in:st=0:d=${FADE}:color=white,fade=t=out:st=${(seconds - FADE).toFixed(3)}:d=${FADE}:color=white`,
      // The concat list ends by repeating its last picture, which ffmpeg plays for as long again: cut at the scene's length.
      '-t', seconds.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-an', part,
    ]);
    parts.push(part);
  }
  await writeFile(path.join(out, 'scenes.txt'), `${parts.map(p => `file '${p}'`).join('\n')}\n`);
  const body = path.join(out, 'body.mp4');
  run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(out, 'scenes.txt'), '-c', 'copy', body]);
  const mp4 = path.join(out, `ctrlai-day-${runDate}.mp4`);
  run('ffmpeg', [
    '-loglevel', 'error', '-y', '-i', body,
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-f', 'lavfi', '-i', `color=c=0xffe45c:s=${VIDEO_SIZE.width}x14:r=${FPS}`,
    '-filter_complex', `[0:v][2:v]overlay=x='-W+W*t/${total.toFixed(3)}':y=H-14:shortest=1[v]`,
    '-map', '[v]', '-map', '1:a', '-shortest',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', mp4,
  ]);
  await writeFile(path.join(out, 'poster.png'), await png(scenes[0].shots[0].el));

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
    `ctrlai-day-${runDate}.mp4: ${clock(total)}, 1080×1920 (vertical), captions only, a silent audio track. poster.png is its first frame.`,
    'Drafts only: nothing is posted. Watch it through, read each text, then post.', '',
    '## What is in it, and what is not', '',
    'Our own words and graphics, and one short text quotation with its source on screen. No footage, no audio, no thumbnails, no synthetic voice: nothing here needs a show’s or a broadcaster’s permission.', '',
    `## X · attach the video · ${xLength(xText)}/${X_LIMIT}${xLength(xText) > X_LIMIT ? ' · OVER' : ''}`, '', xText, '', 'First reply:', '', link(`/day/${runDate}`, 'x', runDate), '',
    ...(li ? ['## LinkedIn · attach the video instead of the card', '', li.text, '', 'First comment:', '', li.comment, ''] : []),
    '## YouTube (a Short, or a normal upload)', '',
    `Title: What changed in AI safety and control, ${weekday(runDate)}, ${shortDate(runDate)} · Ctrl AI`, '',
    'Description:', '',
    `What changed in AI safety and control on ${longDate(runDate)}, with every source named. Each quotation in the record is checked word for word against its source.`, '',
    'Chapters:', ...chapters, '', 'Sources:', ...sources, '', `The full edition: ${link(`/day/${runDate}`, 'youtube', runDate)}`, ...(disclosure ? ['', disclosure] : []), '',
  ].join('\n');
  await writeFile(path.join(out, 'VIDEO.md'), md);

  const probe = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'csv=p=0', mp4]).trim().split(',');
  console.log(`Video for ${runDate} is in ${mp4}`);
  console.log(`  ${Number(probe[0]).toFixed(1)} s, ${(Number(probe[1]) / 1e6).toFixed(1)} MB; texts in VIDEO.md${xLength(xText) > X_LIMIT ? ' (X text OVER)' : ''}`);
  if (xLength(xText) > X_LIMIT) process.exitCode = 1;
}
