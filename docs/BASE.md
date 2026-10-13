# The Base and the Radar

**The Base** is one record of what is happening with AI safety, AI control, and what AI is doing to work and society. Each
source (an interview, an article, a paper, an official statement, a hearing) is one entry: what it says, who said it, why it
matters to an ordinary reader, to lawmakers, to researchers, and the question it raises, with quotations checked word for word
against the source. Pages: `/base`, `/base/<slug>`, `/people`, `/people/<id>`.

**The Radar** fills it. It reads the sources in `radar/sources.json` every day, keeps what bears on AI safety, control,
governance, work or rights, and hands the important items to reading agents. Code checks every quotation before anything
reaches the site, and a person reviews before anything is published.

```
radar/sources.json ─► ingest ─► triage ─► read (agents) ─► check (code) ─► compose ─► content/base/*.json ─► pages
   (public list)      (code)   (Claude)   full text or      every quote     people,     (machine drafts until
                                          captions          against the     names,      a person reviews them)
                                                            saved text      runs
```

## A run

Each run's folder, with everything it saw, its triage, the agents' entries and the texts their quotations were checked
against, lives in the private archive repository under `runs/<run>/` (clone it next to this one as `../ctrlai-archive`,
or set `ARCHIVE_DIR`). `daily-start.sh` pulls it first and `daily-finish.sh` pushes it, so nothing the Base depends on
lives only on one computer. `compose.ts` builds `content/base` from those folders.

```bash
npx tsx scripts/radar/ingest.ts --from 2026-10-05 --to 2026-10-12   # items.jsonl + health.json (YouTube via the Data API if YOUTUBE_API_KEY is set, else RSS)
# triage: pick which items get a full read and which a short entry → triage.json
# read: agents follow ../ctrlai-archive/runs/<run>/AGENT-BRIEF.md and write entries/<id>.json, saving the source text
npx tsx scripts/radar/check-entry.ts ../ctrlai-archive/runs/<run>/entries/*.json   # every quotation, against the saved text
npx tsx scripts/radar/compose.ts                                                   # writes content/base/*.json, or nothing
npm test
```

YouTube captions: `python -I scripts/radar/transcript.py VIDEO_ID OUT_BASE` (needs `youtube-transcript-api` 1.2.x).
Articles: `scripts/fetch-text.sh URL OUT`.

## Getting the words: the transcript ladder

For each video or podcast, the first of these that works:

1. **The publisher's own transcript**: a page, a hearing record, or `<podcast:transcript>` in the feed (the ingest keeps
   these as `transcripts` on the item; 80,000 Hours lists one for nearly every episode).
2. **The podcast's audio, transcribed by us**: the ingest keeps each episode's audio link (`audio`). Then
   `python -I scripts/radar/transcribe.py AUDIO_URL OUT [--second whisper]`. The default engine is NVIDIA Nemotron ASR through
   OpenRouter (about a cent an hour; `OPENROUTER_API_KEY` in `.env.local`). `--engine whisper` runs whisper.cpp on the Mac,
   `--engine elevenlabs` is Scribe v2 with speaker labels. Speaker turns come from sherpa-onnx on the Mac (`--speakers N`)
   or ElevenLabs. A change of speaker is marked, so a quotation can't run across two speakers. Labels (S0, S1…) are matched
   to names by a person or an agent reading the introductions.
   **Two transcripts for anything we quote.** `--second whisper` writes `OUT.second.*`, an independent transcript of the
   same audio. compose.ts then publishes a quotation from that source only if at least 85% of its words are in the second
   transcript too, in order, and the two never disagree on a negation or a number (`scripts/radar/second.ts`). The words
   they disagree on are kept in `content/base/verification.json`.
   Measured Oct 12 on an 80,000 Hours episode with an official transcript: Nemotron 6.7% word error, Whisper 8.8%.
3. **YouTube captions**, only for videos that exist only on YouTube: `scripts/radar/transcript.py`, **one at a time, a
   few an hour, never in parallel, no retry loops**. On Oct 12, ten agents fetching at once got the home connection
   blocked for the rest of the day.
4. **By hand**: a transcript saved with Tactiq goes into the run's `sources/` as `manual-tactiq`.
5. Otherwise the entry stays description-only, and the item goes on the gap list.

## Keeping the record safe

- **Nothing published disappears by accident.** `compose.ts` writes nothing unless the whole build passes, then swaps
  all files in together. If an entry or a quotation that is on the site would be missing from the new build (a lost run
  folder, a quotation that no longer passes), it stops and lists them. A deliberate removal takes a reason,
  `--allow-removals "why"`, and is logged in `content/base/removals.json`.
- **A quotation's id comes from its words** (`<entry id>-<8 hex of the sha256 of the text>`), so a confirmed label can
  never move to other words when an entry's quotations are reordered.
- **Recovery is tested, not assumed:** `bash scripts/radar/recovery-check.sh` clones both repositories fresh, rebuilds
  `content/base` from the archive alone, and compares it with what is published. Run it after any change to the scripts.

## Asking the record: the database

`npx tsx scripts/radar/build-db.ts` (run by `daily-finish.sh`) builds `../ctrlai-archive/index/base.sqlite` from the
files: entries, quotations with their speakers, people and their titles, every item each run saw with what became of it
(`entry`, `skipped` with the reason, `untriaged`, `filtered`), and every saved text, with full-text search over the texts
and the quotations. It is derived, not in git, and rebuilt in seconds anywhere both repositories are cloned.

```bash
DB=../ctrlai-archive/index/base.sqlite
sqlite3 $DB "select said_on, name, text from claims where speaker = 'gary-marcus' order by said_on"
sqlite3 $DB "select d.outlet, d.title, snippet(texts_fts, 0, '[', ']', '…', 10) from texts_fts
  join texts t on t.rowid = texts_fts.rowid join documents d on d.id = t.doc_id where texts_fts match '\"kill switch\"'"
sqlite3 $DB "select source, count(*) from items where decision = 'untriaged' group by source order by 2 desc"
```

## The archive

Every text we obtain is kept whole in a private repository, `github.com/radosukala/ctrlai-archive` (local clone
`/Users/rado/code/ctrlai-archive`): `npx tsx scripts/radar/archive.ts --run <run>` after each run, then commit and push
there. One folder per source, named by the same id as its Base entry, with every version of the text (page text,
captions, our transcripts) and how and when each was obtained; `catalog.jsonl` lists them all. The Base publishes short
quotations and our own words only; the archive is never published.

## Rules the code enforces

- A quotation is shown only if `compose.ts` found its words in the saved source text, in order, with no dropped negation
  (`lib/verify-quote.ts`). `tests/base.test.ts` checks that every quotation on the site is the one that was checked.
- An entry written only from a feed's description (`access: "excerpt"`) carries no quotations.
- Entries about Anthropic or Claude are marked `conflict`, because Claude wrote the draft.
- Our own words use no gendered pronouns for named people.
- Every entry records `review.by`: `machine` until a person has reviewed it.

## What the checker proves, and what it does not

It proves the words are in the text we saved. It does not prove who said them (automatic captions carry no speaker names),
that they were meant as quoted, or that the source is right. A quotation marked `speakerCertain: false` says on the page that
its speaker is known from context, not confirmed by listening.
Positions (`positions` on a quotation) describe one quotation, never a person. The agent's are stored as proposals
(`by: "machine"`) and never shown; a person confirms or corrects them with `npx tsx scripts/radar/labels.ts`
(`content/base/confirmed.json`), and only those are shown.

## Known gaps (run of Oct 12, 2026)

English only. Feeds that hold only the latest 10-20 items (big news channels, the Guardian, LessWrong) do not reach back a
full week; the arXiv query stops at 300 results. X is not read. Paywalled articles are read through other coverage, or left as
descriptions. The triage was done by Claude, by title and description.
