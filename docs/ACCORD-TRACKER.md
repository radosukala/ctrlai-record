# The accord tracker

`/accord` follows what six AI companies have shown publicly since they signed the White House Accord on Super Intelligence
(published September 29, 2026). It is one part of **A Say in AI** (`/say`): Read, Check, Discuss, Decide, Deliver. This page is the
"Check" part. Read it before changing anything under `content/accord/`.

## The rules

- **A claim with no source does not go up.** Every piece of evidence is a page, filing or report a person can open. We save its full
  text, copy a quotation of at most 25 words from that text, and `scripts/verify-accord.ts` checks the quotation against the saved
  text by machine. A quotation that fails does not ship; `tests/accord.test.ts` fails the build if one was edited after it was checked.
- **A status says what is public, not what is true inside a company.** The five statuses (`nothing`, `said`, `detailed`,
  `confirmed`, `contradicted`) are defined in `content/accord/types.ts` and on the page. `nothing` means we looked in the places listed
  under the company and found nothing dated on or after the accord's publication date. The tests refuse a status the evidence does not
  support (for example `confirmed` resting only on the company's own statement). `contradicted` is for public evidence about something
  that happened on or after the accord's publication. Things a company disclosed since then about *earlier* events are described in the
  summary and listed with their dates, but do not by themselves change the status (the accord asks for controls, not for a promise that
  nothing goes wrong). If a cell has adverse since-items and a non-adverse status, say why in the cell's `note`.
- **A source we cannot quote is not quoted.** If a page shows its facts only as images or attributes (a list of member logos), we extract the
  text from the page's HTML, say so in the saved file's header and in the claim, and verify the quotation against that.
- **Before and since are never mixed.** Evidence dated before the accord is an "earlier record" and never counts toward a status. A date
  with only a month ("2026-09") cannot be classed on either side of September 29, so the tests refuse it.
- **No estimates, no rounding up.** Never print a date or a number more precisely than the source states it. The day count and the
  tallies on the page are computed from the data.
- **The same standard for every company**, including Anthropic, whose model helps build the site. The page says so. Prefer a reviewer who
  is not an Anthropic customer for Anthropic's row.
- **Our reading is marked as ours.** The accord's words are exact; "In plain words (ours)" is ours. Claims about what the accord does *not*
  say are checked against its text (`ABSENCES` in `content/accord/facts.ts`, tested).
- **Corrections** go to hello@ctrlai.com. Fix the cell, add a line to `CHANGELOG` in `content/accord/index.ts`, and keep the earlier
  wording visible on the page as the line says.

## What is where

- `content/accord/facts.ts`: the accord's text (pinned by hash), the five commitments, the signatures, the absences.
- `content/accord/companies/<id>.json`: one record per company: cells (L1 to L4) with `status`, `summary`, `since` and `before`
  evidence, `accordStatements`, `searched` (where we looked) and `documents`. `content/accord/meetings.json` holds the one record for the
  commitment that belongs to the companies together.
- A cell `summary` (and a context item's `text`) may hold blank lines: each starts a new paragraph. Keep a summary to what a reader needs; put
  detail in the evidence claims, which sit under "sources". The Czech `cs.summary` keeps the same paragraph breaks.
- Records are built from specs, not edited by hand: `docs-internal/accord-2026-10/specs/<id>.spec.json` plus `compose.ts <id>`,
  `compose-context.ts`, `compose-meetings.ts` (git-excluded, in the main checkout). Edit the spec, compose, then run `scripts/verify-accord.ts`.
- `content/accord/verification.json`: written by `scripts/verify-accord.ts`; committed.
- `public/accord/`: our copy of the White House PDF (its SHA-1 is pinned in the tests).
- Saved source texts live in `docs-internal/accord-2026-10/sources/` (git-excluded: they are other people's writing).

## Updating it

1. Find the new thing. Open it. Save its text: `scripts/fetch-text.sh "<url>" docs-internal/accord-2026-10/sources/<company>/NN-name.txt`.
   Sites that refuse the script (HTTP 403) or build the page with JavaScript: open them in a browser and save the page text yourself.
2. Add an evidence object to the right cell in `content/accord/companies/<company>.json`: `id` (unique slug), `claim` (one plain sentence,
   no stronger than the source), `publisher`, `title`, `url`, `published` (as stated; `null` if not), `kind`, `mentionsAccord`,
   `quote` (exact, at most 25 words), `textFile` (relative to `docs-internal/accord-2026-10/`).
3. Set the cell's `status` to the strongest honest reading of its `since` list, and rewrite its `summary`.
4. Set the company's `checkedOn`, and add to `searched` any place you looked.
5. Add a line to `CHANGELOG`.
6. `npm run accord:verify && npm test && npm run build`. (From a linked git worktree, where `docs-internal/` is not present, set `ACCORD_DOCS=<path to docs-internal/accord-2026-10>`.) Then look at the page and the share image
   (`/accord/opengraph-image`) before committing.

Nothing in this tracker is posted or emailed by code. Companies are not contacted by code.
