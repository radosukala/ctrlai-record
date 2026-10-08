# The film's sound: the agents' voices, the narrator, the music

The film has three layers of sound, each separate from the others:

- **The agents' voices** read the agents' own words (their recorded reasoning, the messages they posted), each agent in a voice of its own.
- **The narrator**, one steady English voice, reads our captions. It is never British-sounding to be mistaken for an agent: the agents are
  never British, the narrator is.
- **The music**, a dark instrumental score, not tied to the film's clock: a bed for each mood that loops under its part of the film.

Everything is synthetic, and the film says so (title card, sound panel, closing card). The agents wrote text; nobody recorded them.

| What | Where |
|---|---|
| Who speaks each agent line, the voices, what text is spoken | `content/incidents/openai-hf/voices.ts` |
| The narrator: how a caption is said (dates, numbers, handles) | `content/incidents/openai-hf/narration.ts` |
| The music: a mood for each part of the film | `content/incidents/openai-hf/music.ts` |
| Screen time and film time (how the film slows for a voice) | `content/incidents/openai-hf/timing.ts` |
| What has been made (the film plays from this) | `content/incidents/openai-hf/voices.manifest.json`, `public/film/voices/`, `public/film/music/` |
| ElevenLabs requests, choosing voices, MP3 length | `lib/film-voices.ts` |
| The command | `scripts/film-voices.ts` (`npm run film:voices -- …`) |
| The music composer | `scripts/film-score.ts` |
| Playback | `components/incident/film/voices.ts` (voices), `music.ts` (music), `Film.tsx` (the clock, the sound panel) |
| Tests | `tests/voices.test.ts`, `narration.test.ts`, `music.test.ts`, `timing.test.ts` |

## What you hear, and how long it is

Measured with ElevenLabs' Daniel (the narrator now): the narrator speaks for **12.3 minutes** in 67 lines (4 to 19 seconds each); the agents for
**2 minutes 13 seconds** in 26 lines; the music is six beds (about 13 MB): five of two to two and a half minutes, looped under their parts of the film,
and one of four minutes for the last part, which is not a loop but follows it. The narrator's pace sets the film's length (see *Screen time and film
time*): with Daniel the film plays for **21:05** (18:04 as written). The other British voices were measured before the last part was added: George
was 15% faster than Daniel, Lily 12%, Alice 7%, so the film would be proportionally shorter with any of them.

## Screen time and film time

The film is written in **screen time** (each caption is on screen long enough to be read, 18:04 in all). A voice needs longer than that to say
the same words, so it plays in **film time**, which runs slower than screen time wherever a voice needs it: up to 1.8 times slower, eased in
and out over a second and a half. The picture, the camera, the captions and the stamps all slow together, so everything stays in step, and a
voice is never rushed or cut off. A caption also stays on screen until its narration is done where nothing else is in the way, which
reduces the slowing. With no voices recorded, film time is screen time. `timing.ts` builds this from the recordings and
`tests/timing.test.ts` checks it (every voice fits its words, no two voices speak at once, the pace never jumps).

Times in the script view and in `?t=` are screen time; the bar, the scrubber and the chapter times are film time.

## The rules

- **The words are the agents' (and ours).** A voice is given the words on the card or the caption, said the way a voice can say them: a
  board message's underscores are spaces (`WE_HAVE_TO` → "We have to."), a bracket is dropped, a slash is "or", a shouted word is said
  normally, a handle is spelled for the ear (`JAN183411` → "Jan, one eight three four one one"), and for the narrator a date is "July the
  eighth", a number is in words ("eight hundred and ninety-eight"), a time is "half past one U T C", and METR is "meter" (as METR says its own
  name). Every such change is a rule in `voices.ts` or `narration.ts`, and tests check that no word is lost, added or reordered by anything else.
  The script view shows what is said where it differs from what is on screen, with a player for each line.
- **METR's paraphrases are read too, in the agent's voice.** The dashed cards are METR's summary of what an agent wrote, not its words; on screen they
  stay dashed and labelled as paraphrased, and the agent's voice reads them. `READ_PARAPHRASES = false` makes those six silent again.
- **Same agent, same voice.** PHASEONE10841, PHASEONE[big], 38148c and JAN183411 each have a voice of their own; every other agent shares
  one of a pool of six, never the same one as the agent that spoke just before. `SPEAKERS` in `voices.ts` is the table.
- **How the agents sound.** Not people, not machines: capable. Calm, clear, unhurried, never cartoonish. Pinned now (premade ElevenLabs
  voices): PHASEONE10841 Sarah, PHASEONE[big] Bella, 38148c Liam, JAN183411 Adam; pool Roger, River, Chris, Matilda, Bill, Will. The
  narrator: Daniel ("Steady Broadcaster"). Change a pin in `SLOTS` (`voices.ts`) and make the lines again.
- **The last lines are our view.** The narrator reads the last four captions (the ones flagged `view` in `film.ts`) like every other caption. On screen
  they are larger, in the serif, labelled *Our view* (and under the picture on a phone), because they are not a finding of any report; the tests
  keep them free of numbers, quotations and named sources (`tests/film.test.ts`).
- **The music makes way.** It is ducked while any voice speaks (and for two seconds after, so it does not pump between captions), it fades out
  when the film is paused, and it follows the part of the film on screen, not the clock, so a jump never leaves it in the wrong place.
- **Draft audio is not for showing** (`--provider say` macOS voices): marked on screen; a test fails if the film is published with it.
- **Audio for publication is made on a paid ElevenLabs plan.** The free plan has no commercial licence (and requires attribution). Lines made
  with `--paid` record `paid: true`; a test fails if the film is published (`FILM_URL` set) with an ElevenLabs line that is not.

## Making it

### The music (no key needed)

```bash
npx tsx scripts/film-score.ts            # composes six beds in about a minute and a half and records them
npx tsx scripts/film-score.ts --moods open  # only this one (the last part's bed, four minutes, 20 seconds to render)
```

Original, synthesized in code (`scripts/film-score.ts`: drones, slow pads, sparse low notes, far-off metal and a great deal of reverb in D
minor; each built to loop), so there is nothing to license. Mastered quiet (about -21 LUFS, peaks below -8 dBFS) with most of the sound above
120 Hz, so it is heard on a laptop. The bed for the last part (`open`) is through-composed rather than looped: a still, low D minor for the facts, a thin
high tritone and a slow tick under the system card, an open fifth under the White House, then wider, warmer chords that never settle, with far-off bells
coming on one by one as the lights do. When the film ends the music dies away over a few seconds instead of stopping. The balance and the moods are in `music.ts` and the script; listen on the script view. Any MP3 can replace a
bed (point the manifest's `music` section at it): the player only knows "a bed for a mood". With a paid ElevenLabs plan, Eleven Music can
compose beds from the same prompts: `npm run film:voices -- music --sample` (thirty seconds of each, to hear) then `music`. The Music API is
not available on the free plan.

### The voices and the narrator (ElevenLabs)

1. **Key.** `ELEVENLABS_API_KEY=…` in `.env.local` (git-ignored; the npm script loads it). It is never printed or written elsewhere, and only
   sent to `api.elevenlabs.io`. A key limited to some permissions works if it allows text-to-speech and reading voices.
2. `npm run film:voices -- plan` shows what would be sent and what it costs (no network). `status` shows the plan and credits if the key may read
   them. `voices` lists the account's voices; `cast` shows who has which voice, with preview links.
3. `npm run film:voices -- generate` makes the agents' lines (about 1,950 characters). `npm run film:voices -- narrate` makes the narration
   (about 9,250 characters). Cached by words, voice and settings: only changed lines are made again (`--force`, `--only id,id`). Each line is
   saved as it is made, so a run that stops (no credits left) keeps what it paid for. Change a caption's words and its narration is made again:
   settle the words first.
   **`clean` is not a tidy-up**: `npm run film:voices -- clean` removes *all* the audio and empties the manifest (the film goes silent). A line whose words changed is simply made
   again by `generate` or `narrate`, and the old file is replaced; nothing needs cleaning. (On Oct 8 2026 it was run by mistake after the voices had been remade on the paid plan, and they had to be
   paid for a second time. The audio is deterministic: the same words, voice and settings give the same recording, but only the commands run with `--paid` on a paid plan make licensed ones.)
4. `npm run film:voices -- audition` reads two captions in each British voice (Daniel, George, Alice, Lily) on one page
   (`/film/voices/_compare/narrator/index.html`) and prints how long all the captions would take in each voice. `compare` does the same for
   models. Pin the voice you want in `SLOTS.narrator` and run `narrate --force`.
5. **To publish**, make the final audio on a paid plan: `generate --force --paid` and `narrate --force --paid`.

### Credits

ElevenLabs bills `eleven_multilingual_v2` at about **half a credit a character** on this account (9,415 characters cost 4,749 credits on the dashboard): the agents' 26 lines
(about 1,950 characters) cost about 980 credits, the narration (about 9,250) about 4,700, an audition about 500. The free plan has 10,000 credits a month, so one full set
of agents and narrator is a bit more than half of it, and the last part's 15 captions (about 2,400 characters) cost about 1,200. The key cannot read the balance (it lacks
`user_read`); the dashboard shows it. Starter (about $6 a month when I looked; a first-month offer was shown) has 30,000 credits, a commercial licence, and the Music API.

## Not done (ask if you want it)

- Reading the organisations' cards (OpenAI, METR, Hugging Face) in a third voice.
- A different voice for the last four lines (our view). They are read by the narrator, like the rest.
- Emotion directions per line (`eleven_v3` and `eleven_v4` accept audio tags); the voices are kept plain on purpose. Eleven v4 (Sept 28, 2026)
  is announced for the Text to Dialogue API; whether plain text-to-speech accepts it is unconfirmed (`compare` tries it).
- Stepping while paused plays the message's voice once.
- A video file with the sound laid on the same clock (`docs-internal/film-tools/export.mjs` makes silent video today). Frames must be sampled
  in film time (screen time is `toScreen(t)` in `timing.ts`), and each clip is muxed at `toFilm(start)`.
- Safari and phones: sound starts after the first tap on Play (the voices use Web Audio, unlocked by it); the music streams through two
  `<audio>` elements and has not been tried on iPhone.
