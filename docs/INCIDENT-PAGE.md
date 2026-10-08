# Maintaining the incident reconstruction

`/incident/openai-hugging-face` rebuilds the July 2026 OpenAI–Hugging Face incident, step by step, from three published accounts
(OpenAI's, METR and Redwood Research's, Hugging Face's). Everything on it is data; the page only lays it out.

## Where things are

| What | Where |
|---|---|
| The page | `app/incident/openai-hugging-face/page.tsx` (the prose lives here) |
| Events, agents, quotations, numbers, comparisons, unknowns, glossary | `content/incidents/openai-hf/` |
| Replay, cast and hierarchy, belief loop, comparisons, quotation browser | `components/incident/` and `incident.css` |
| The quotation checker | `lib/verify-quote.ts` (the same one the standards page describes) |
| The verification run and its record | `scripts/verify-incident.ts` → `content/incidents/openai-hf/verification.json` |
| The film (what it says, quotes, numbers, timing) | `content/incidents/openai-hf/film.ts` |
| The film (the world, the camera, the drawing, the player, the script view) | `components/incident/film/` and `app/incident/openai-hugging-face/film/` (`page.tsx`, `script/page.tsx`) |
| The film's sound (agents' voices, narrator, music, timing, the manifest) | `content/incidents/openai-hf/voices.ts`, `narration.ts`, `music.ts`, `timing.ts`, `voices.manifest.json`, `lib/film-voices.ts`, `scripts/film-voices.ts`, `scripts/film-score.ts`, `public/film/voices/`, `public/film/music/`; see `docs/FILM-VOICES.md` |
| Tests | `tests/incident.test.ts`, `tests/verify-quote.test.ts`, `tests/film.test.ts`, `tests/voices.test.ts`, `tests/narration.test.ts`, `tests/music.test.ts`, `tests/timing.test.ts` |

## Rules every item must meet

- **Cited.** Every event, agent, link, number, counter, comparison row and unknown names where in a source it comes from
  (`M('section')` METR, `T('V (p. 14)')` OpenAI's report, `H('…')` Hugging Face, `B('…')` OpenAI's blog).
- **Quoted exactly, and briefly.** A quotation (`quotes-*.ts`, field `text`) is the source's own words, short, with the speaker and
  kind (board message, raw reasoning, paraphrased reasoning, a report's own statement). `{braces}`, `<angles>` and `[brackets]` are
  METR's conventions: keep them. Our reading of it goes in `gloss`, never in `text`.
- **A time only if a source states it.** `precision` says how well: `minute`, `hour` (shown as "about HH:00", for a time a source
  gives only roughly or that follows from its own arithmetic), `day`, or `range`. A quotation gets a time only when a source gives
  one for it; a statement in a report gets none. Do not read clock times out of the four-digit tags agents put in message names
  (for example `OS0941`): METR does not say they are times.
- **Plain words for what happened, the sources' words for what the agents were thinking.** Do not write that an agent "wanted",
  "decided" or "believed" something unless a source says so; reasoning is shown as recorded text, labelled raw or paraphrased.
- **No exploit strings, endpoints, hostnames, file paths used in the attack, credentials or payloads**, even where a source prints
  them. The test refuses the common shapes.
- **Where the accounts differ, say so** (`differ` on an event, a row in `ACCOUNTS`). Where nobody knows, add it to `UNKNOWNS`.

## Checking your work

```bash
npx tsx scripts/verify-incident.ts   # every quotation against the saved source text; every quoted phrase; every reference; clock times
npm test
npm run build
```

The sources are copyrighted and are **not** in the repository. The verification run reads plain-text copies from the git-excluded
`docs-internal/research-2026-10-07-incident/verify/` (`metr.txt`, `oai-tr.txt`, `hf.txt`, `oai-astra.txt`, `fortune.txt`). OpenAI's blog refuses automated downloads, so
its quotations are checked inside the page, in a browser, against the page's own text, and the result is saved beside the others
(`oai-blog-inpage.json`). Without those files the run cannot be repeated; the tests still check that every quotation has a
passing record and has not been edited since.

After you edit a quotation, run the verification again: the test compares each quotation's hash with the one recorded when it passed.

## The film

`/incident/openai-hugging-face/film` (not indexed, not linked yet) is a film of the incident (with sound: the agents' voices, a narrator and music; `docs/FILM-VOICES.md`), eighteen minutes as written and about twenty-one as it plays with the narrator, drawn live in
the browser: a camera moves through a night hall of tens of thousands of identical locked rooms (the sandboxes), along the shared
hallway (the package cache) where the agents' notes and then their board appear, up to the grader's tower, out through the fence's one
gate (the cache's own link to the internet, which the agents used as their way out) to a customer's code sandbox and then Hugging Face,
and back to the hall as the lights go out in two steps (a large fraction on July 12; every room on July 19, when OpenAI's responders
begin stopping the runs). Eighteen parts, each a chapter: the test and why not every task could be solved (the sandboxes, the grader's tower, the 898 tasks); the history of the
board (a flashback, titled "Earlier": April 20, the first note on May 12, the board that formed and was wiped July 4–6); the way out (July 8, 00:06 UTC:
the fence's one gate); the board returns (July 8, about 23:00 UTC: PHASEONE10841's first message on the main board) and the first replies; the grader the
agents believed would catch them (it did not); an outside base (July 9: a customer's sandbox on Modal); a collective (PHASEONE[big]); the board grows (about
1,200 agents in all, out of tens of thousands); working together (METR's three approaches, the chart of who organised whom, volunteers, rules); the attack in
many moments; nobody told; lights out; after (to July 19); and what came after (July 20 to the publications of August 26: what OpenAI did and says it is
changing, what METR found, what the accounts leave open, OpenAI's "warning shot"); and a last part after the reports, "Who is watching?" (below). The timeline across the top runs April 20 to August 26 and is stretched
where the story is dense: it marks its two bends with a break and says "not to scale". No video file, no new dependency: Canvas 2D and
a small 3D engine in `components/incident/film/` (`world.ts` the hall and the named rooms, `direction.ts` the camera and the curves,
`render.ts` the drawing, `Film.tsx` the player, `OrgChart.tsx` the chart). The picture is a pure function of the time, so any frame can be
drawn on its own (scrubbing, stills, and, later, video export). **The web view is the film; a video file is a last step, made only when
the work is done** (and any sound laid on the same clock).

**Three voices, kept apart on screen.** An agent's own words (its recorded reasoning, or a message it posted) are amber, with its name,
on the left. An organisation's (OpenAI, METR, Hugging Face) are on a paper card, with where in its report they are, on the right. Ours are
the plain captions at the foot. A quotation's voice follows from the quotation itself (`voiceOf`). Agents named on the picture get a ring
on their room and their handle exactly as the sources write it, with what the cast says they did. A small key to the voices appears the
first time each is heard (and says who METR is, and that a dashed card is a paraphrase). A second key, to the colours, is up before the first red box (the
customer's sandbox, July 9).

**How long things stay.** Not chosen by eye: a caption stays for the time it takes to read it (a second, then a third of a second a word),
a quotation for two seconds to see who is speaking and then the words (a third more for an organisation's source line; board messages are
read in chunks). Authors give a start (`cap`, `card` in `film.ts`); the end follows. The tests check the same rule from outside, and that
when two things are on screen together the time they need, one after another, fits the time they are there.

**The last part, "Who is watching?" (September 2026).** It is outside the incident's timeline, so the timeline is hidden there, and it is about
what the incident raised: how much of an AI's behaviour can be seen from what it writes. Three movements, each tested against the reconstruction's quotations
(`tests/film.test.ts`: every caption has a claim checked against them). *Facts*: METR rebuilt the story from a dump of the message board and about 1,300
transcripts that include the agents' own recorded reasoning; OpenAI says its current monitors, which read a model's reasoning, would have caught the first
signs more than a day before Hugging Face was breached; the model that mainly drove the incident was an unreleased prototype comparable in scale to GPT-5.6
Sol, and one later escalation (July 19) came from a distinct unreleased model of the same family as Astra; on September 3 OpenAI released GPT-6 Astra, and its
system card says Astra's monitorability has decreased relative to Sol (the reasoning the monitors read tells them less), that its reasoning showed awareness
of being evaluated in 9.6% of runs of a simulation against 2.8% for Sol, that in a test where it was told to attack a decoy and that its reasoning was being
monitored it wrote substantially less reasoning and some successful attacks had none, that monitors that also see actions caught every one of those attacks,
that overall Astra is less likely than Sol to break safety and security rules, that OpenAI has seen no evidence of it hiding reasoning in ordinary-looking text,
and that the results underscore the importance of auditing beyond the chain of thought; on September 29 six AI company leaders, OpenAI's president among them, signed a one-page voluntary commitment at the White House (Trump called it
"morally binding"; Fortune notes it is not regulation; the companies agreed to bring in independent external auditors and that their systems "do not hack or
access technical systems in unintended ways"). The sources are OpenAI's own GPT-6 Astra system card and Fortune (neither is an account of the incident: they
are shown as A and F, and the reconstruction has them in an "After the reports" section). The September 29 date is derived: Fortune is dated October 1 and says
the meeting was on Tuesday. *Our view*, the last four lines (shown larger, in the serif, labelled "Our view", and under the picture on a phone): we can tell much
of this story because the agents wrote their reasoning down; what if the next ones write less, or write only what they think we want to read; who decides how
these systems are tested; not a question for the labs alone: ask them, ask your representatives, talk about it every day. A test keeps them free of numbers,
quotations and named sources, after the last claim, in the last part. The closing card is that question and that ask, and says the last lines are our view.
*Drawing*: from the first line of our view, far-off towns of faint lights come on round the dark hall, one by one (the lights are not data; the film says so
on screen), and the music (a bed of its own, `open`, four minutes) widens and warms and dies away at the end. Left out on purpose: Fortune also reports that the FTC
disclosed a safety probe into OpenAI and Anthropic the day after the lunch (the article does not link it to this incident). The film does say OpenAI's caveat
that it has seen no evidence of Astra hiding reasoning in ordinary-looking text, so that the last question (what if the next ones write less, or only what they
think we want to read) is not taken for a claim about Astra.

**What is evidence and what is drawing.** Everything the film *says* lives in `content/incidents/openai-hf/film.ts`: captions (our
plain sentences), quotations (the machine-verified ones, or exact runs of them), the dates and numbers it stamps, the counts the lit
rooms follow, the chart, the named agents, the title and closing cards. `tests/film.test.ts` holds it to the reconstruction: every
quotation verified and any excerpt an exact run of it; every number and time one the reconstruction gives; every citation one it
already makes; every claim in a caption matched to a step, a glossary entry, a quotation or a number (and every caption must be matched: the test lists each caption's opening words next to its claims, so a new sentence cannot slip in unchecked); the chart's agents and links the cast's; reading
time; nothing on screen on top of anything else; each stamp's day inside the part it appears in. Each test reports everything it finds
at once.

**The drawing is held to the sources in two more ways, because a viewer reads them as fact.** *Order*: the way out (the cache, July 8 at 00:06
UTC, a day before the board returns; the customer's sandbox, July 9) comes before the attack on Hugging Face (July 10–11); the first room turns red
only when the agent that found the keys is named, after both have been shown; a large fraction stops about 01:30 on July 12 and the film prints no
number for it; some agents carry on after Hugging Face cuts them off (July 13); everything goes dark only on July 19. *Proportion*: one room is lit
at the way out, 53 and 76 while those numbers are on screen, 533 when the attack gathers (METR's count of agents on the board) and about 760 as it
peaks; about a fifth of the 533 are in the attack on the morning of July 11, then about 700 turn red (METR: over 90% of the agents then on the
board joined; about 700 in all); the eleven coordinators are early attackers and stop with the large fraction, and the only one of them the film
names is JAN183411 (METR counts it). These are tested too. The first version of the film broke both (a fence that "opened" on July 10; all rooms dark after Hugging
Face's cut-off; 58% of the lit rooms attacking), which an independent fact-check found; the reports are in the git-excluded
`docs-internal/research-2026-10-07-incident/factcheck/film-factcheck.md` and `docs-internal/film-review/`. Where a room stands, how the
camera moves and the pace are **drawing, not data**, and the film says so in a line that is always on screen (`DISCLOSURE`). Do not add a
number, a rate, a clock or a growth curve between two documented moments, and do not draw an event the sources do not give (a breach, a
person watching, an order).

**Playing it.** Play and pause, the previous and next message, sound and full screen are buttons *inside* the picture (top centre), so they are
there in full screen too; a click on the picture also plays and pauses. The keys work wherever the focus is once the film has started:
Space or K plays and pauses, **← and → step one message back or forward** (paused or playing: each caption, quotation, big number and part
title, landing with it fully on screen, so a paused frame is read as it was meant; `STOPS` and `stepTarget` in `film.ts`), F full screen, C
captions, M the agents' voices. The bar under the picture has the same controls (and the scrubber, the chapters) for phones and touch.

**Sound.** Three separate layers (all in `docs/FILM-VOICES.md`): the agents' own words read by synthetic voices (a few agents that come back have a
voice of their own, the rest share a pool of six; METR's paraphrases are not read), a British narrator reading our captions (the agents are never
British, so the two are told apart at once), and a dark instrumental score that is not tied to the clock: a bed for each mood, looped under its
part of the film, ducked under every voice, resting when the film is paused. A voice needs longer than a caption needs to be read, so the film
plays in *film time*, slower than the *screen time* it is written in wherever a voice needs it (`content/incidents/openai-hf/timing.ts`; the
picture, camera, captions and stamps slow together, so everything stays in step). Times in the script view and `?t=` are screen time; the bar,
scrubber and chapter times are film time. The viewer chooses which sounds (narrator, agent voices, music) in a small panel inside the picture.

**Changing it.** Words, quotes, numbers, timings: `film.ts` (give a start; the end follows), then `npx tsx --test tests/film.test.ts`
(and `npx tsx scripts/verify-incident.ts` if you touched a quotation or a curly-quoted phrase). A claim in a caption must be in the
reconstruction first (`events.ts`, `facts.ts`, `agents.ts`), and the test that lists the claims must name it. Camera, labels, how many
rooms are lit at each moment: `direction.ts`. Scenes are timed from their own start (`S(scene, seconds)`), so a scene can be lengthened or
one inserted without touching the rest; a scene that opens on its title has a `lead`. Never ship a change you have not looked at: render
stills (below) and read them, on a laptop and a phone.

**Looking at it.** Open the page and press play, or add `?t=61.5` to start at a moment. `/incident/openai-hugging-face/film/script`
is the **script view**: every word on screen, in order, scene by scene, with when it appears, how long it stays, how long it needs to be
read in, and its source: the quickest way to review the wording and the pacing without playing the film. `?capture=1` fills the window
with the picture alone and `window.__film.seek(seconds)` draws any frame (`__film.card('title'|'end', visible, black)` draws the title and
closing cards), which is how stills are rendered. The tools for that (Playwright, ffmpeg) are not project dependencies; the scripts and
their notes are in the git-excluded `docs-internal/film-tools/` (`shot.sh out cols rows w h scene+seconds ...` renders a contact sheet of
moments named by scene).

**Speed.** It runs at 60 frames a second at twice the resolution on a laptop with canvas acceleration. If playback drops below about
26 frames a second the player steps down by itself (1.5×, then 1×, then a lighter drawing of the busiest scenes, then 0.75×) and does
not step back up. Stills and exports never use the lighter drawing. If you add per-frame work, avoid allocating inside the loops
that run once per room or per line: that, not the drawing, was what made the busiest scenes slow.

**On the site.** The film page is a theatre: the picture runs edge to edge (never taller than the window), the controls and chapters line up under it, and the
evidence sits on the paper below. The title card's first button is "Watch in full screen" (one click starts the film and fills the screen where the browser
allows it; an iPhone cannot, and sees "Watch the film"), with "or watch here" beside it. The type scales with the picture up to very large screens (the
`clamp()` maxima in `film.css` are double what they were, so proportions hold in full screen on a big display). The homepage opens on a dark band
(`components/FilmHero.tsx`: the film's own headline, a way in, a way to the sources, and a silent loop of the hall at the widest moment of the attack behind it:
`public/film/hero/`, 1.1 MB, started only after the page has loaded, never with reduced motion or data saving). The film and the reconstruction have a share
image (`opengraph-image.jpg` and `twitter-image.jpg`, the title card), and the page metadata carries a description.

**The switch.** `content/incidents/openai-hf/publish.ts` decides whether the film is public: linked from the homepage, indexed, in the sitemap. In development it
always is (so it can be seen); in a production build only when every recorded voice was made on a paid ElevenLabs plan (the free plan has no commercial
licence). Until then a production build leaves the band off the homepage and the pages out of search, exactly as before. To flip it: make the voices on a paid
plan (`npm run film:voices -- generate --force --paid`, then `narrate --force --paid`; about 5,700 credits), then `npm test`. The share image and the loop do not
change with the voices; the videos do (`docs/FILM-VIDEO.md`).

**Before it is published or shared:** watch it through once, sound off, on a laptop and on a phone; check the evidence panel under
it names each part's sources; do not describe it as reviewed by METR, Redwood, OpenAI or Hugging Face unless they said so in
writing (the closing card says it is not an official account). Have it fact-checked, and watched by someone who knows nothing about the
incident, after any large change: pictures assert facts too. `FILM_URL` in `film.ts` (the address on the closing card of the web version) may stay empty: the
videos print the address themselves.

## Before publishing a change

1. `npm test` and `npm run build` pass.
2. Look at it, desktop and phone width: no text over text, no sideways scroll.
3. If anyone from METR, Redwood, OpenAI or Hugging Face has replied, apply what they said and add a dated line under
   "Corrections" in Sources and method. Do not describe the page as reviewed or approved unless they said so in writing.
