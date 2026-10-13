# The day before

A rehearsal for the day after a large AI-enabled cyberattack. The viewer makes five decisions across ten days in an invented city and, between decisions, reads what people on the record have said about each option. About 15 minutes. A web film (`/day-before`) first; a linear MP4 can be cut from it later.

## The rule that holds it together

Two layers that never mix.

| | Imagined | Real |
|---|---|---|
| What | the city, the night, the events | quotations from the record |
| Looks like | a scale model under one lamp; words in plain white sans | a paper card, serif, the yellow highlighter, outlet and date, "word for word" |
| Never | a real company, person, country or flag; how anything is attacked; who did it | an invented word in a real person's mouth |

The `EXERCISE · NOT REAL` tag and the disclosure line are on every frame. A card is checked against the saved text of its source by `scripts/verify-day-before.ts`, and `tests/day-before.test.ts` fails if a card is edited afterwards, if a placeholder is in the film, or if our own words quote anyone.

## Where things are

| | |
|---|---|
| `components/scenario/` | the model city (`city.ts`), the renderer (`render.ts`: painter's order, one lamp, shadows, bloom, tilt-shift), motion helpers (`motion.ts`), the types, the player (`player.ts`), the stylesheet (`film.css`), the React wrapper (`DayBefore.tsx`) and the quotations page (`Evidence.tsx`) |
| `content/scenarios/day-before/film.ts` | the timeline: scenes (a pure function of time), cues (words, cards, stamps, the question), the five decisions |
| `content/scenarios/day-before/cards.ts` | every real quotation: speaker, where, how it was checked, the words, the words to highlight, a link, and what the card cannot show (`note`) |
| `content/scenarios/day-before/narration.ts` | how the narrator says a line (times after noon on the twelve-hour clock, “AI” as “A I”), the line ids, and the manifest type |
| `content/scenarios/day-before/voices.manifest.json`, `public/day-before/voices/` | what has been recorded: one MP3 per line, with its length and the plan it was made on |
| `scripts/day-before-voices.ts` | makes the recordings (`npm run day-before:voices -- plan`, then `narrate --paid`) |
| `content/scenarios/day-before/music.ts`, `music.manifest.json`, `public/day-before/music/` | the score: nine moods, which scenes each plays under, and the rendered beds |
| `scripts/day-before-score.ts`, `lib/film-synth.ts` | compose and render the score in code (`npx tsx scripts/day-before-score.ts`; `--report` to measure without keeping) |
| `content/scenarios/day-before/verification.json` | the result of the last verification, with a hash of each quotation |
| `content/scenarios/day-before/publish.ts` | whether the page is served and whether it is listed. Served since 13 October 2026; listed (indexable, in the sitemap, a band on the homepage under the first film's, a paragraph on the About page) since the same day, on Rado's word. `DAY_BEFORE_PUBLIC = false` takes it back to live but unlisted. `DAY_BEFORE_MINUTES` is the length the homepage and About name; a test keeps it true |
| `app/day-before/page.tsx` | the page: a short introduction, the film, then every quotation with its source. Share images are the title card |
| `components/scenario/DayBeforeBand.tsx`, `public/day-before/poster.jpg` | the homepage band (styles in `components/film-hero.css`) |

## Adding or changing a quotation

1. Save the source's text under `docs-internal/` (`scripts/fetch-text.sh URL OUTFILE`; the texts are copyrighted and are never committed).
2. Add the card to `cards.ts`. `check` says where it is found: `{ base: slug }` (inside a quotation the Base already verified), `{ incident: id }` (the first film's data) or `{ file: path }` (a saved page, with a `url`). Copy the words from the saved text; do not retype them.
3. If the card only partly fits the side of the argument it stands for, say so in `note`. It appears on the quotations page, and a test requires it for the partial fits.
4. `DOCS_INTERNAL=<path to docs-internal> npx tsx scripts/verify-day-before.ts`, then `npm test`.

A card shown on screen at the same time as another must be on the other side (the left or the right); a long quotation goes on the left, where there is more room.

## A decision is quick to answer and quick to answer back

A viewer once waited a long time to be able to choose, and again before anything happened after he had. So: the film stops 0.8 s after a question is up (once its options have faded in), the narrator reads the question while the film waits (on real time: the film's clock is stopped), and the options can be chosen from the moment they are up, even a moment before the film stops (then it does not stop at all). After a choice the pick is shown for 1.6 s, the options fade into "You chose B · …", and the argument begins. Only decisions the playhead has passed stay answered: going back before one asks it again, starting over asks them all. `tests/day-before.test.ts` demands the 1.5 s and the 3 s; `docs-internal` has `responsive-test.mjs` that measures them on the real player.

## The player

`createPlayer(root, film, options)` is plain DOM and canvas. The picture is a pure function of film time, so any frame can be drawn on its own. The web player stops at each decision until the viewer chooses (keys A, B, C; Enter skips; Space pauses; arrows move by beat; F is full screen). Choices stay in the viewer's browser. `window.__film` offers `seekFilm(t)`, `setSize(w, h)`, `bench(n, from)`, `goTo(t)`, `decisions`, and for the narrator `voice`, `muted`, `decoded` and `level()` (the output's loudness, for tools that cannot listen). Keyboard shortcuts only act while the film is on screen. The narrator plays through Web Audio on the film's own clock (M or the Sound button mutes; it stops when the tab is hidden); the page can also be given the recordings as base64 (`clipData`) when it cannot fetch files.

## The narrator

One steady English voice (ElevenLabs' Daniel, the first film's narrator) reads our captions, the five questions and one closing line. It never reads a card: real words stay on paper, in the viewer's own voice, so the two layers stay apart in sound too. A recorded caption stays up until its voice is done, waits for the caption before it to leave, and a decision stops the film only 1.4 seconds after its question has been read. Change a caption's words and only that line is recorded again (about half a credit a character), so settle the words first. Recordings are made on the paid plan (`--paid` records it; a test fails for a line that was not). They are static files under `public/`, so once pushed anyone who knows an address can fetch them, although the page itself is hidden.

## The score

Nine beds composed in code, with the instruments the first film's music was made with (drones, slow pads, a low piano-like note, glassy bells, far-off metal, a sub pulse, a tick, wind, a long dark reverb). Nothing is sampled, so there is nothing to license. One small theme runs through all of it: a rising arch in D that comes home, D F A G F D. It is heard whole in the lamp, warmer in the evening, broken in the first hour, asked and not answered while nobody knows who, low under the decisions, falling at dawn, and in the hot wash played to the end in the major.

The beds are not tied to the film's clock. A bed that loops fades into its next pass over a few seconds; the film changes bed, with a slow crossfade, when it enters a scene of another mood; the two beds that do not loop (the lamp, the hot wash) are scored to their scene and put back in step if the viewer jumps. The music is ducked under the narrator, goes on quietly while the film waits for a choice, and is gone, with every other sound, while the viewer has paused (the audio context is suspended, so nothing drifts). Voice and Music have a switch each; M switches both. A bed is decoded only when it is about to be wanted: a bed is tens of megabytes decoded.

## Not done

An MP4, a Czech version, a way to add up everyone's choices (the hot wash says "Example" until you choose), a portrait layout for phones (today it asks for the phone to be turned).
