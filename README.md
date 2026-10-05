# Ctrl AI — This week in AI control

**ctrlai.com** keeps what matters about keeping AI under human control findable. It has two parts and nothing else:

- **This week** ([/](https://ctrlai.com)): the events that mattered in the last seven days, each confirmed by two
  independent reports, and seven pieces worth your time. Every issue keeps its own page at `/week/<last day>`.
- **The Hall of Fame** ([/hall-of-fame](https://ctrlai.com/hall-of-fame)): what to see first if you're new. At most 30
  entries; new ones are nominees for 90 days; contested sections carry the strongest counter-view.

> The feed forgets. This page doesn't.

## Where things are

| What | File |
|---|---|
| Weekly issues: events and picks | [content/issues.ts](content/issues.ts) |
| The Hall of Fame, its rules and sections | [content/hall.ts](content/hall.ts) |
| Public numbers for every pick (generated) | [content/stats.json](content/stats.json) |
| The script that fetches those numbers | [scripts/measure.ts](scripts/measure.ts) |
| How numbers become "liked", "kept", "argued" | [lib/stats.ts](lib/stats.ts) |
| Share images and the cards creators can post | [lib/og.tsx](lib/og.tsx), `app/**/opengraph-image.tsx`, `app/**/card/[id]/route.tsx` |
| Content rules, enforced | [tests/content.test.ts](tests/content.test.ts) |
| The weekly email: signup, confirmation, rendering | [lib/newsletter/](lib/newsletter/), [app/subscribe/](app/subscribe/), [scripts/newsletter.ts](scripts/newsletter.ts) |
| The weekly X and LinkedIn posts | [lib/social.ts](lib/social.ts), [scripts/social.ts](scripts/social.ts) |

How to put out an issue each week: [docs/EDITING.md](docs/EDITING.md). The weekly email and posts: [docs/NEWSLETTER.md](docs/NEWSLETTER.md).

## Run it

Requires Node 22.13 or newer. The site is static: no database, no accounts. The newsletter needs a Resend key, and the site shows no signup until it's set (`.env.example`).

```bash
npm install
npm run dev        # http://localhost:4310
npm test           # content rules and number handling
npm run measure    # refresh content/stats.json from YouTube, X, Substack and Hacker News
npm run newsletter -- check    # is Resend set up? (see docs/NEWSLETTER.md)
npm run social                 # the week's X and LinkedIn posts, with images, in kit/
npm run build
```

Deployed on Vercel from `main`.

## Share cards

Every pick has a card its maker can post, at `/week/<slug>/card/<pick id>` and `/hall-of-fame/card/<entry id>`, for
example [/week/2026-10-04/card/gates-nuclear-weapons](https://ctrlai.com/week/2026-10-04/card/gates-nuclear-weapons).
Attach it when you tag the creator.

## Before this

Until October 2026 this repository ran a public record of AI behavior (tests, receipts, two-stranger verification) and
Other Tomorrows, a series of interactive stories. Both are closed; their code is in the git history before the
`this-week-and-hall-of-fame` merge. Old addresses redirect to the home page, and `/library` to the Hall of Fame.

## License

Code: [AGPL-3.0](LICENSE). Our words (summaries, event write-ups, rules): [CC BY 4.0](DATA-LICENSE.md). The works we
link to belong to their makers.
