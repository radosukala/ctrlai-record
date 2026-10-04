<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working on Ctrl AI

ctrlai.com is two things: **This week** (the week's events and seven picks on AI control, safety and alignment) and the
**Hall of Fame** (at most 30 things a newcomer shouldn't miss). Read `README.md` and `docs/EDITING.md` before changing
anything consequential. The earlier public record and Other Tomorrows are retired; don't bring their code back without
being asked.

## Rules that are not negotiable

- **Never fabricate** a pick, a source, a number, a quote or a date, including in tests and screenshots. Numbers come
  only from `npm run measure`; a number we couldn't fetch is left out, never estimated.
- **Open it before you pick it.** Every "why" line is written in our own words and checked against the source.
  Videos: at least the description and the parts you describe. Articles: the text, or two reports of it if paywalled.
- **Every event has two independent sources** (different outlets). Don't name private individuals unless the story is
  about them.
- **The Hall of Fame keeps its published rules:** the cap, nominees for 90 days, and a skeptical entry in every
  contested section. `tests/content.test.ts` enforces them; change the rules on the page and in the tests together.
- **Say where a pick stands** (alarmed, measured, skeptical, record), and keep the strongest counter-view in the room.
- **Nothing loads from YouTube or X until a visitor presses play.** Pictures are copies in `public/media`, made by
  `npm run measure`; players live in `components/Media.tsx` and mount only on play.
- **Analytics:** Vercel Web Analytics counts page views for everyone, without cookies. Google Analytics
  (`lib/analytics.ts`) loads only after a visitor says yes, and is what sees which picks are opened and played. Keep
  the privacy section on `/about` true whenever this changes. Fonts are self-hosted.
- **Money never decides a pick.** Sponsorship or donations may come later; if they do, picks stay the editor's call.
- **Same standard for every AI company**, including Anthropic and any model used to build the site.

## Practicalities

- The site is static. No database, no accounts, no secrets.
- `npm test` runs the content rules. Keep it green.
- Share images: render them and look at the PNG before shipping a change to `lib/og.tsx`.
- American English in the interface.
