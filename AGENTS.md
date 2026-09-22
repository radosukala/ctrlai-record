<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working on Ctrl AI

Ctrl AI is a public record of how AI behaves, kept by the people who use it. Read `README.md`, then
`docs/ARCHITECTURE.md`, before changing anything consequential.

## Rules that are not negotiable

- **Never fabricate** a run, a check, a contributor, a count, a quote or a source, including in seeds, demos,
  screenshots and tests. Test fixtures live in test databases and are labeled as fixtures.
- **The consensus rules are the constitution.** `lib/consensus.ts` changes only with new tests in
  `tests/consensus.test.ts` and a clear explanation in the pull request.
- **Evidence piles never mix.** Verified, rated and unchecked runs are counted and displayed separately. Never add
  them together, and never call anything verified that `decide()` did not mark verified.
- **Tests are versioned.** Never change the wording of a test's messages or outcomes in place: bump `version`, add a
  `history` entry. Runs keep the version they were made with.
- **Same standard for every AI**, including Claude and any other model used to build the site.
- **Library entries must be verified by opening the URL.** Summaries in your own words, calm and factual, with a
  caveat when the source is an interested party.
- **Safe tests only.** No jailbreaks, no requests for harmful content, nothing that breaks a chat app's rules.
- **No trackers, no ads, no third-party scripts.** Fonts are self-hosted.

## Practicalities

- `npm test` runs against an in-memory Postgres (PGlite). Keep it green.
- Never point a dev server or a test at the production database. The dev server ignores remote `DATABASE_URL`s
  unless `CTRL_DEV_REMOTE_DB=1`; don't set it to try things out. The public record is real.
- Stop `npm run dev` before running scripts against the local database; PGlite allows one process at a time.
- Design tokens are in `app/globals.css`. Outcome colors are validated for color-blind readers; always pair a color
  with a text label.
- American English in the interface.
