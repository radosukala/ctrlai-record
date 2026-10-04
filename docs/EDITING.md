# Putting out an issue

One issue a week, covering the seven days that end on the issue's date. About an hour of work, most of it reading.

## 1. Collect candidates

Look across:

- **YouTube**, filtered to uploads from this week: `https://www.youtube.com/results?search_query=AI+safety&sp=EgIIAw%253D%253D`
  (try "AI safety", "AI risk", "AI alignment", "AI control", "superintelligence", and the week's big names).
- **X**: posts people are bookmarking and arguing about. Paste a post's link into `https://api.fxtwitter.com/<user>/status/<id>`
  to see views, likes, replies and bookmarks without the X API.
- **Newsletters**: Zvi Mowshowitz, Transformer, Import AI, AI as Normal Technology.
- **Forums and papers**: LessWrong, the Alignment Forum, arXiv.
- **The news**, for the week's events.

## 2. Pick seven

- Open every one. Watch or read enough to say why it matters in your own words.
- Mix formats, and include the strongest skeptical piece of the week if there is one worth reading.
- Order them the way you'd send them to a friend who has one evening.
- Numbers inform the choice; they don't make it.

## 3. Write the events

- Three to six main events, in date order, plus a few one-line "also this week" items.
- Every event needs **two independent sources** (two different outlets). The tests refuse one outlet twice.
- Say what happened, not what it means. Don't name private individuals unless the story is about them.

## 4. Add the issue

Add a new object at the top of `ISSUES` in `content/issues.ts`: `number` goes up by one, `slug` and `to` are the last day,
`from` is seven days earlier. Then:

```bash
npm run measure   # fetch today's numbers for every pick
npm test          # the content rules
npm run build
```

Commit and push to `main`; Vercel deploys it.

## 5. Share it

- Post a thread linking `ctrlai.com`, one reply per pick, tagging the creator.
- Attach the pick's card: `ctrlai.com/week/<slug>/card/<pick id>`.
- Don't automate replies or mentions. X's rules forbid automated unsolicited replies, and they read as spam anyway.

## The Hall of Fame

- It holds at most 30 entries (`CAP` in `content/hall.ts`). To add one, take one out.
- Anything published less than 90 days before `UPDATED` shows as a nominee. When its date comes, keep it if people are
  still watching, reading or citing it; otherwise take it out. Change `UPDATED` whenever the list changes.
- Sections marked `contested` must keep at least one skeptical entry. The tests check this.
