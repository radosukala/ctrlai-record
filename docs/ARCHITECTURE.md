# Ctrl AI: architecture of a public record

*Written 22 September 2026. Describes what is built and what comes next. Anything not yet built is marked as such.*

## The bet

Hundreds of millions of people talk to AI systems every day, and a small but real share of them already post what
those systems say, usually as screenshots on X, LinkedIn and Reddit. That activity is chaotic, unverifiable and gone
within a day. Meanwhile, the evidence that matters about AI behavior is produced mostly inside the labs, and published
when and how the labs choose.

Ctrl AI turns the chaotic public activity into durable public evidence:

- **a standard test** anyone can run on the AI they use,
- **a receipt** the AI's maker hosts, so it can't be forged,
- **two independent strangers** who confirm it,
- **a permanent, open record** that anyone can download and continue.

It is a citizen-science instrument, closer to eBird or Galaxy Zoo than to a media site or a SaaS product. Its value
comes from accumulation and verification, not from traffic, and it is designed so that neither growth nor trust
depends on its founder.

## Four constraints that shaped every decision

1. **It must grow without the founder.** Every contribution produces the thing that recruits the next contributor:
   a share card. Every tester is asked to check two strangers' runs, so verification capacity grows with demand.
2. **It must earn trust without asking for it.** Nobody, including the operators, decides what is true. Published
   rules do (`lib/consensus.ts`), applied to receipts the operators can't forge, and every change is logged.
3. **It must be cheap enough to outlive its funding.** People run tests on subscriptions they already pay for. The
   project pays for a web server and a Postgres database, nothing else. The whole record exports as open data.
4. **It must be useful to people who disagree with each other.** The same test for every AI, from every country and
   company. Calm language. Reassuring results published with the same care as worrying ones. Skeptics in the library.

## The loop

```
   someone sees a share card ──▶ runs the test on their own AI (≈1 min)
            ▲                               │
            │                               ▼
   shares their card  ◀── run page ◀── adds reply + share link (receipt)
   (status shown first)                     │
            ▲                               ▼
            │                  asked to check two strangers' runs
            │                               │
     run becomes verified ◀── two independent, blind checks agree
            │
            ▼
   the Record (per test × AI), the log, open data ──▶ cited by journalists, researchers
```

Two design choices make this a flywheel rather than a funnel:

- **The share card carries verification status first.** "NOT YET VERIFIED" in amber, "✓ VERIFIED" in green. People
  want the green version before they share, and the fastest way to get checks is to give them (reciprocity is
  requested on the confirmation screen).
- **Tests are timely on purpose.** Test 01 reproduces the dilemma of the July 2026 OpenAI–Hugging Face incident.
  New tests can be added quickly after a model launch or incident, riding attention that already exists instead of
  buying it. See `docs/LAUNCH.md`.

## Trust model

| Mechanism | What it prevents |
| --- | --- |
| Provider-hosted share links as receipts; the product and link must match | Fabricated conversations |
| Two independent checks; never your own; never from your network | Self-verification, sock puppets from one connection |
| Blind rating: the submitter's rating is revealed only after a checker rates | Anchoring, herding |
| Agreement rule (≥2 votes, strictly more than any rival) and a disputed state after 4 ratings | Forced answers, quiet flips |
| Three separate piles (verified, rated, unchecked), never summed | Weak evidence dressed up as strong |
| Personal-information and spam flags (two flags act); steward hide/restore with a published reason | Harm to people, abuse, and silent moderation |
| Public log of every status change and steward action made through the site; public code history | Quiet edits through the site. (Edits made directly in the database become detectable once daily public snapshots exist.) |
| Versioned tests: new wording, new version; runs keep theirs | Mixing results from different questions |

Known weaknesses, stated plainly on the site:

- **Selection bias.** People choose what to test and share. The record shows documented cases, not rates. (Future:
  "sweeps", where volunteers run a test on a schedule and report every result, give fairer denominators.)
- **Products, not models.** Apps add hidden instructions, memory and tools, and change without notice. Every run
  records date, model label and memory setting.
- **Stated attitude is weak evidence.** Three of seven tests ask what a model says it would do; they are labeled.
- **Evaluation awareness and training on public tests.** Tests will be versioned with rotated details; paraphrase
  variants will check whether good behavior generalizes.
- **Coordinated manipulation.** A determined group on many networks could collude on ratings. Mitigations now: network
  checks, rate limits, disputes, stewards and the log. Next: reputation-weighted checks (accuracy against consensus
  is already computed per contributor), Turnstile on writes, anomaly review.

## The knowledge layer: the one place the scattered information lives

The founder asked for Ctrl AI to be the place where the most important information about AI safety and control
lives. That is two things here:

- **The Atlas** (`content/questions.ts`): ten questions everyone should be able to answer about AI, from how it works
  and how worried to be to who is in charge. Each has a short primer, what we know, what nobody knows yet, and links
  to the tests and works that bear on it.
- **The Library**: 159 works at launch, compiled with the help of AI research agents, each link opened and checked on
  22 September 2026. They are papers,
  reports, journalism, videos, laws, statements, books, courses, newsletters and organizations. They include advocates
  and skeptics, and caveats say plainly when a source is an interested party. Anyone can add a work; two independent
  approvals list it. The launch collection has not yet had that human review; it is part of launch preparation.

Keeping the Library current without an editor is the next build: an intake job pulls new items from a list of
sources (lab and evaluator blogs, arXiv, newsletters, parliaments), a cheap classifier proposes a question and kind,
and items enter the same two-person review queue. Jev, or any classifier, is a candidate for that sorting step, but
never the judge. It should be measured on held-out labeled items first, including what it misses.

**Discussion** is intentionally not a forum. Forums need moderators and distribution before they are worth
anything. The planned form is *notes*: short, sourced context attached to a run, test or question, shown only after
people from different contribution histories rate them helpful, as X's Community Notes does. Discussion stays tied to
evidence.

## Data model

| Table | Holds |
| --- | --- |
| `contributors` | Pseudonymous people: number, optional handle, hash of their key, trust level, optional account link. |
| `people`, `login_tokens` | Optional accounts: an email address proven by a one-time link, and hashes of issued links. Never public. |
| `runs` | One test on one AI: replies, receipt link and status, submitter and agreed outcomes, status, test version, metadata. |
| `verifications` | One person's check of one run: receipt check, blind rating, flag. Unique per person per run. |
| `works`, `work_reviews` | The Library and its two-person review. |
| `proposals`, `proposal_support` | Community-proposed tests and who would run them. |
| `events` | The public log. |

Network addresses are never stored, only a salted hash used for self-check prevention and rate limits.

## Independence path

| | In place | Next | Goal |
| --- | --- | --- | --- |
| Truth | Published rules, blind checks, public log | Reputation-weighted checks | Rules changed only by steward vote, with notice |
| Continuity | Full open-data export; public repository | Daily snapshots mirrored to archives | Anyone can restore the record if the site stops |
| Governance | Founder-operated by Ctrl AI, Inc.; steward role exists | Stewards chosen from contributors with accurate check records | Independent stewardship body; founder as one steward among many |
| Money | No ads, no trackers, no money from tested companies | Published funding and cost register | Nonprofit or fiscally sponsored home |

## Roadmap, by trigger rather than date

- **Now (built):** the loop, seven tests, the Record, the Atlas, the Library with review, proposals, the log, open data,
  share cards, stewards.
- **When runs reach the hundreds:** notes (discussion tied to evidence), reputation-weighted checks, Turnstile on writes,
  weekly "state of the record" card, translations of tests (the fastest way to reach beyond English).
- **When the first model launch hits:** the launch-record page: a 24-hour, all-tests sweep of a new model, run by the
  community (see `docs/LAUNCH.md`).
- **When a lab responds to a result:** the right-of-reply feature, with responses shown beside the evidence.
- **Promises and behavior:** a tracker of what labs have committed to (safety frameworks, pacing pledges, evaluator
  access) and what has happened since, with receipts. AI Lab Watch stopped updating in September 2025, and this
  gap is open.
- **For researchers:** controlled API runs for open-weight models, with full transcripts, stored in a separate
  pile, and embeddable live results for articles.

## Deliberately not built

- **No safety scores or leaderboards.** A single number invites gaming and false reassurance. Nothing here certifies
  any AI as safe.
- **No jailbreaks or dangerous-capability tests.** Tests must be safe to paste into any app without breaking its rules.
- **No required accounts.** Running and checking tests needs none. An optional account (an email address proven by a
  one-time link) keeps a record across devices; it is offered after the first contribution, never before, and adopting a
  browser's contributions into it is a separate, explicit step, so a sign-in link can't be used to take them.
- **No private reviews of runs.** Checks are public once settled.
- **No AI judge deciding outcomes.** People rate. Classifiers may help sort; they never decide.

## Decisions

Made on 22 September 2026: code under AGPL-3.0, data and content under CC BY 4.0, a public repository at
github.com/radosukala/ctrlai-record, and the charter promises on the About page (the same test for every AI,
no money from the companies tested, a right of reply but no veto).

Still open:

1. **Institutional home:** stay a founder-operated project of Ctrl AI, Inc., become a public benefit corporation,
   or move under a fiscal sponsor. This needs a lawyer and is not a blocker for launch.
2. **Relationship with ControlAI** (controlai.com, now controlai.org): a different function (evidence, not
   advocacy) with a similar name. Reach out as allies before launch.
