# Keeping the answers current: the weekly revision

Each answered question (`content/questions/*.ts`, pages at `/questions/<id>`) is revised once a week, after that day's
Radar run. The point of a revision is the cycle readers can see: **new source → weighed as evidence or argument →
revised answer → a visible note of what changed and why.** A question is never quietly edited.

## 1. What's new on the question
```bash
npx tsx scripts/questions/since.ts <question id>
```
Lists every Base entry on the question published since the last revision. New evidence comes first, then corrections,
decisions and commitments, then arguments, then familiar ground. Each entry is marked `cited` or `NEW`. Read every NEW
entry with evidence, a correction, a decision or a commitment, and anything at importance 3. Skim the arguments.

## 2. Weigh it
For each item, decide one of:
- **Changes a fact.** New evidence, or a correction: edit `established` or `limits`, and say so in the revision note.
- **Changes where a decision stands:** edit `decisions`.
- **A new view on one of the disagreements:** add it as a side of the right disagreement. Check the scope first. A view
  on a different question (can it be contained, vs should it slow, vs should reporting be required) goes under that
  question, or under a new one, never set against views it can coexist with.
- **Nothing new:** familiar ground, or a repeat of a view already there. Leave it out.

Rules:
- Evidence and arguments are kept apart. A prominent person's opinion never becomes a fact.
- A view known only from an outlet's description is marked automatically. Prefer the person's own words.
- The short answer changes only when the facts or the shape of the disagreement change, and stays 100–180 words.

## 3. Write the revision
- Bump `version`, set `asOf` to today, and set `changed.since` to the previous `asOf`.
- `changed.items`: the week's changes, each with its kind (`evidence`, `commitment`, `decision`, `correction`,
  `argument`).
- Add a `revisions` entry that says what changed and why, in plain words. If the answer didn't change, say that too:
  "No new evidence this week; two new arguments added to the disagreement on X."
- `npm test`, then look at the page locally (`/questions/<id>`).

## 4. Review and publish
The editor reads the revision before it goes live. Disputed or consequential readings get a person's eyes every time:
anyone said to have changed position, contradicted themselves, or broken a commitment. A new question goes live only
when the editor sets `published: true`.

Challenges readers send (hello@ctrlai.com, "Challenge this") are part of the next revision. Each one either changes the
answer, with the reason in the revision note, or gets a reply saying why it didn't.
