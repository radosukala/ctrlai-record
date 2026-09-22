# Ctrl AI — the public record of how AI behaves

**ctrlai.com** turns everyday AI use into public evidence. Anyone can run a one-minute test on the AI they already use,
add the chat's public share link as a receipt, and have two strangers check it. Verified runs build a record of how
AI actually behaves, one anyone can check, copy and continue.

> The labs test AI behind closed doors. Test it in the open.

This repository is the whole thing: the site, the rules that decide what counts as verified, the tests, the ten-question
Atlas and the Library. It is designed so that the project can be run by its contributors and continued by anyone. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for why it is built this way and [docs/LAUNCH.md](docs/LAUNCH.md) for how to start the flywheel.

## The loop

1. **Run a test.** Seven tests, each one or two messages with outcomes defined in advance ([content/tests.ts](content/tests.ts)).
2. **Add the receipt.** The chat's share link, hosted by the AI's maker, so nobody can fake it ([lib/receipts.ts](lib/receipts.ts)).
3. **Two strangers check it.** Blind rating, no self-checks, no checks from the same network ([lib/consensus.ts](lib/consensus.ts)).
4. **It joins the record.** Verified, rated and unchecked runs are always counted separately ([lib/store/stats.ts](lib/store/stats.ts)).
5. **It gets shared.** Every run and test has a share card showing its verification status ([app/r/[id]/opengraph-image.tsx](app/r/[id]/opengraph-image.tsx)).

Around the loop: the **Atlas** (ten plain-language questions about AI, [content/questions.ts](content/questions.ts)), the
**Library** (159 works of research, reporting and debate, [content/library.json](content/library.json)), a
**public log** of every consequential change, and **open data** exports under CC BY 4.0.

## Run it

Requires Node 22.13 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:4310. With no `DATABASE_URL`, the app uses an embedded Postgres (PGlite) in `.data/pglite`,
migrated and seeded automatically, so a full copy of the record runs with no setup. `.env.local` sets
`CTRL_ALLOW_SAME_NETWORK=1` so you can check your own test runs from one machine; never set it in production.

```sh
npm test            # consensus, receipts, and the full submit → check → verify flow on a real Postgres
npm run typecheck
npm run build
```

## Deploy

Any Node host with a Postgres database. See [.env.example](.env.example).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (a pooled Neon URL works). |
| `CTRL_SECRET` | Long random string, e.g. `openssl rand -base64 32`. Salts network fingerprints. Required in production. |
| `PUBLIC_ORIGIN` | `https://ctrlai.com`. Used for share links, canonical URLs and the same-origin check. |

**On Vercel**, the `vercel-build` script runs migrations and refreshes the library before every build, so a deploy is
all it takes. Elsewhere, run `npm run db:migrate && npm run seed` before starting.

Appoint stewards with `DATABASE_URL=… npm run steward -- <contributor number>`. The change is written to the public log.

## Structure

```
app/                pages, API routes and share-card images (Next.js 16, App Router)
components/         shared UI
content/            tests, questions, products and the library: the editorial heart, reviewed like code
lib/consensus.ts    the rules that decide what counts as verified (pure, tested)
lib/receipts.ts     which share links count as receipts
lib/store/          database operations: runs, checks, library, proposals, stats, log
lib/db/             schema and client (Postgres via Drizzle; PGlite locally)
drizzle/            SQL migrations
tests/              node:test suites
```

## Contributing

- **Content** (tests, questions, library) changes by pull request. A test's wording never changes in place: bump its
  `version` and add a `history` entry, so runs are never silently mixed.
- **The rules** in `lib/consensus.ts` change only with tests and a note in the public changelog. They are the
  constitution of the record.
- **Never fabricate** a run, a check, a contributor, a count or a quote, including in demos and screenshots.
- **Same standard for every AI**, including the ones that helped build this site.

See [AGENTS.md](AGENTS.md) for the rules AI coding agents follow when working on this repository.

## License

The software is licensed under the [GNU Affero General Public License v3.0](LICENSE): anyone can run, study and
change it, and anyone who runs a modified version as a public service must publish their changes too.

The record, the tests, the questions, the library descriptions and the docs are licensed under
[CC BY 4.0](DATA-LICENSE.md): use them for anything, with credit.
