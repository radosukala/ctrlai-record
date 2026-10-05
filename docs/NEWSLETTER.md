# The weekly email, and the weekly posts

## How it works

- **Signing up is two steps.** A reader types an address; we email a link; they press a button on the page it opens.
  Only then do they join the list. Opening the link alone changes nothing, so mail scanners and other people's typos
  can't subscribe anyone. (`lib/newsletter/flow.ts`, `app/subscribe/`)
- **The list lives in Resend**, in one segment. We keep no database. Nothing in the repository stores an address.
- **The weekly issue is never sent by code.** `npm run newsletter -- draft` saves it as a *draft* broadcast; you read
  it in Resend and press Send or Schedule. `tests/newsletter.test.ts` fails if anyone adds a way around that.
- **The signup is invisible until it's switched on.** With no Resend variables set, the site shows no form, no header
  link and no `/subscribe` page (it 404s), so a missing key never leaves something broken in view.

## Switching it on (once)

1. **Check the domain in Resend.** ctrlai.com already has Resend's DNS records in Cloudflare from the earlier site
   (`resend._domainkey` and `send`). Open resend.com/domains and make sure it says *Verified*. If not, Resend lists the
   records to add. ctrlai.com has a DMARC policy of `reject` with strict alignment, so mail from an unverified domain
   is rejected, not sent to spam.
2. **Make an API key with Full access** at resend.com/api-keys. A sending-only key can't manage contacts or broadcasts
   (Resend answers `restricted_api_key`). If a key from the old site is already in Vercel as `RESEND_API_KEY`, it may be
   sending-only: replace it.
3. **Put the key in `.env.local`** (never in the repo), then create the segment and get its id:
   ```bash
   npm run newsletter -- setup
   ```
   It prints a line like `RESEND_SEGMENT_ID=...`. Add that to `.env.local` too.
4. **Add the same two variables in Vercel** (Project → Settings → Environment Variables, Production):
   `RESEND_API_KEY` and `RESEND_SEGMENT_ID`. Pages read them when the site is built, so **redeploy** afterwards.
5. **Check everything:**
   ```bash
   npm run newsletter -- check
   ```
   It confirms the key's scope, the segment, the verified domain and that open/click tracking is off. Every line
   should start with ✓.
6. **Try it with your own address** on the live site: subscribe, press the button in the email, and look for the
   welcome email. Then find yourself under Resend → Contacts.

Optional variables: `NEWSLETTER_FROM` (default `Ctrl AI <hello@ctrlai.com>`) and `NEWSLETTER_REPLY_TO`.
**Replies** go to the sender address. `hello@ctrlai.com` is an alias on Google, so they reach a person. The About page
tells readers they can reply to ask for their address to be erased, so keep that alias working (or set
`NEWSLETTER_REPLY_TO` to another inbox).

## Each week

1. Publish the issue (docs/EDITING.md) and let it deploy, so the images and links in the email exist.
2. **Look at the email:** `npm run newsletter -- preview`, then open `kit/<issue>/newsletter.html`.
3. **Send yourself a copy:** `npm run newsletter -- test you@example.com`.
4. **Save the draft:** `npm run newsletter -- draft`. Then, in Resend → Broadcasts, open it, read it, and press
   **Send** or **Schedule**. (The draft's name is "Ctrl AI · Issue N"; the command refuses to make a second one.)
5. **Make the social posts:** `npm run social`, then see below.

## The weekly posts for X and LinkedIn

`npm run social` writes `kit/<issue>/`:

| File | What it is |
|---|---|
| `x-recap.md` | "What happened": a hook with the recap image, a reply for each main event with its first source, a closing reply |
| `x-picks.md` | "Worth your time": a reply per pick with its card, tagging the people who made it |
| `linkedin.md` | The post, and the first comment (the link goes there) |
| `recap.png`, `issue.png`, `card-*.png` | The images each post names |

Nothing is posted for you. X's API is paid and LinkedIn needs an approved app, so each week it's copy, attach, post.
Lengths use X's own counting (a link is 23 characters; 280 is the limit without a paid plan), and the script says if
a post is over. Read each post, and each tag, before you send it. The signup line appears only when `/subscribe` is
live, so the posts never advertise something that isn't there.

Handles to tag come from `x: [...]` on each pick in `content/issues.ts`. Add a handle only after checking it exists.

## Things to know

- **Free plan limits** (Resend, as documented in October 2026): 100 transactional emails a day and 3,000 a month, and
  marketing emails unlimited to up to 1,000 contacts. A new subscriber costs two transactional emails (confirmation and
  welcome), so about 50 sign-ups a day. Over the limit, the form says to try again tomorrow.
- **One confirmation per address per day.** Resend ignores a repeat of the same message within 24 hours, which is also
  what stops the form being used to flood someone's inbox.
- **Bots:** the form has a hidden field that only a bot fills in, and nothing more. If sign-ups from strangers start
  to look fake, add Cloudflare Turnstile.
- **Unsubscribing** (one click, handled by Resend) flags a contact as unsubscribed; the address stays in Resend until
  you delete it under Contacts. Someone who asks to be erased: delete the contact.
- **Open and click tracking stay off.** The About page says we don't track them. `newsletter check` fails if they're on.
- **Rotating the API key** makes unused confirmation links stop working (they last three days anyway).
- **Logs never contain an address.** Errors from Resend are logged with any address-like text removed.
