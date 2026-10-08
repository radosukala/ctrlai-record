# The film as video: for YouTube, for X and LinkedIn, and for the homepage

One film, three videos, all drawn by the same code that plays it in the browser (the picture is a pure function of time, so any frame can be drawn on its own):

| Video | For | Length | Size | Notes |
|---|---|---|---|---|
| **The full film** | YouTube (and your own site if ever wanted) | 21:27 | about 650 MB | Title card (6 s) + the film + closing card with the address (11 s). 1920×1080, 30 fps, H.264 High, AAC 192 kbps, about −16 LUFS. |
| **The teaser** | X and LinkedIn (and a YouTube trailer) | about 2:00 | about 56 MB | Five whole messages from the film, in its own order, between a title card and a closing card. Under X's 2:20 limit for accounts without Premium. |
| **The homepage loop** | the hero band of the homepage | 36 s, silent | 1.1 MB | A closed slow orbit over the hall at the widest moment of the attack; 960×540, no sound, looped by the page. Not a video to post. |

**Every frame of the full film and the teaser carries `ctrlai.com`, bottom right**, in a small dark pill that stays on top of the picture (not on the homepage loop), so the address travels with
the video wherever it is posted or reused; the colour key moves left to make room for it. It is drawn by the page in capture mode (`.film-watermark` in `Film.tsx` and `film.css`), from `SITE.url`.
The title card carries the Ctrl AI mark and the closing card the short address **ctrlai.com/film** (a redirect in `next.config.ts` to the film page, whose evidence panel links on to the reconstruction).

The captions, cards, dates and numbers are part of the picture, so the videos read with the sound off (X and LinkedIn play muted until tapped). The disclosure line
("A drawing: …") is on screen throughout, and the closing card says the last lines are our view and that this is not an official account.

## The gate: the voices must be licensed

The voices are made with ElevenLabs. Its **free plan has no commercial licence** (and asks for attribution), so a video made from free-plan voices must not be posted
to X, LinkedIn or YouTube, nor put on the site. Videos rendered before the voices are remade on a paid plan are drafts for review: name them `…-DRAFT.mp4`.

(A production build can be made to show the film anyway with `FILM_FORCE_PUBLIC=1` in the environment: that is a decision about the licence, taken on purpose and never in the code.)

1. Activate a paid ElevenLabs plan (Starter has a commercial licence and 30,000 credits a month).
2. `npm run film:voices -- generate --force --paid` and `npm run film:voices -- narrate --force --paid` (about 5,700 credits for all 93 voiced lines).
3. `npm test` (it fails if a line that is meant to be published was not made `--paid`), then render again (below). The new recordings differ a little in length, so the film's
   timing changes by a few seconds; the plan and the mix are made from the manifest, so they follow.

## Making them

One command does it all (plan, mix, render, tag; the teaser and then the full film, about 30 minutes): `PW_DIR=… docs-internal/film-exports/make-videos.sh` makes the **drafts**
(`…-DRAFT.mp4`); `SUFFIX= PW_DIR=… docs-internal/film-exports/make-videos.sh` makes the real ones, and refuses unless every voice was made on a paid plan. The steps, one at a time:

The tools are in the git-excluded `docs-internal/film-tools/` (they need Playwright and ffmpeg, which are not project dependencies; see its README). The dev server
must be running (`npm run dev -- --port 4310`).

```bash
export PW_DIR=<a folder with playwright-core in node_modules>
cd ~/code/ctrlai-com
npx tsx docs-internal/film-tools/plan.ts full   > docs-internal/film-exports/plan-full.json     # what is drawn when, what is heard, which music is under it
node docs-internal/film-tools/mix.mjs docs-internal/film-exports/plan-full.json docs-internal/film-exports/full.m4a        # the sound, mixed offline (and full.srt beside it)
node docs-internal/film-tools/render.mjs docs-internal/film-exports/plan-full.json docs-internal/film-exports/ctrlai-film-full.mp4 --audio docs-internal/film-exports/full.m4a   # 35–40 minutes
```

`teaser` instead of `full` makes the teaser (about 3 minutes to render). `hero` makes the loop (`render.mjs` without `--audio`; re-encode it at 960×540, CRF 30 for the site).
`still.mjs out.png 1280 720 title|end|<film seconds>` makes a still (the YouTube thumbnail, the share image).

How it works, and why:

- **One plan** (`plan.ts`) says, in output time, which stretch of film time each moment shows (the film plays in *film time*, slower than screen time wherever a voice needs it:
  `content/incidents/openai-hf/timing.ts`), which voices start when, and which music mood is under it. The renderer and the mixer both read it, so picture and sound cannot drift.
- **The picture** (`render.mjs`): five browsers draw frames of `/incident/openai-hugging-face/film?capture=1` (`window.__film.seekFilm(T, black)` draws film time `T`; `card('title'|'end', …)` the cards)
  and the frames, in order, go into **one** ffmpeg process that encodes the video and muxes the finished sound in the same pass. No frame files, no chunks to join: the disk holds only the result.
  Frames are JPEG at quality 96 (indistinguishable from PNG once encoded: PSNR 46–48 dB, and 2.4 times faster). The page is laid out at 1280×720 and drawn at 1.5×, so the type has the proportions reviewed on the page.
  About 19 frames a second, so 35–40 minutes for the full film.
- **The sound** (`mix.mjs`) does what the player does live: each voice at its time; the music beds following the part of the film on screen (4 s crossfade at a change, 8 s loop crossfade near a
  bed's end); the music at half level, and at a quarter under any voice and for 2.2 s after it; the beds start on the title card and die away under the closing card. Then everything is made
  as loud as web video is (−16 LUFS integrated, peaks under −1.4 dB) and written as AAC. `full.srt` (the narrator's captions and the agents' words, timed) is for YouTube's subtitle upload.
- **The teaser** is a list in `plan.ts` (`TEASER`): whole messages only (a caption with its narration, a card with its voice), each found by its opening words, each fading in and out of black.
  The current five: the first message; ≈ 700 agents joined, an agent's hesitation, GO, "forgot its initial qualms"; nobody was told; OpenAI's "warning shot"; the question. To change the cut, change the list and render again.

## Posting

- **YouTube**: the full film, 1080p; upload `full.srt` as the English subtitles; the thumbnail is `still.mjs … title` at 1280×720. Put the address in the description.
- **X**: the teaser (2:00, under the 2:20 and 512 MB limits for accounts without Premium).
- **LinkedIn**: the teaser (videos up to 10 minutes are allowed, but the full film is 21).
- Do not describe the film as reviewed by METR, Redwood, OpenAI or Hugging Face unless they said so in writing; the first lines of any post should say what it is: a film drawn from what they published.

## Disk

The full film is several hundred MB, and macOS needs room of its own: `render.mjs` refuses to start unless the free space covers the video plus 400 MB (`--force-disk` overrides). On Oct 8 2026 this Mac had
under 0.5 GB free.
