# Launch playbook

*A plan, not a record of anything done. Nothing here has been sent, posted or deployed.*

Most projects like this fail for lack of an audience. This one is designed not to need one to start, but it still
needs a first push. Don't buy attention. Ride attention that already exists, and launch with a small, real, verified
record rather than an empty one or a faked one.

## Before launch

- [x] Confirm the licenses (AGPL-3.0 code, CC BY 4.0 data) and publish the repository.
- [x] Deploy (Vercel + Neon): `DATABASE_URL`, `CTRL_SECRET`, `PUBLIC_ORIGIN`; migrations run in the build.
- [x] Delete any local QA data. Production starts empty.
- [ ] Add `RESEND_API_KEY` in Vercel so optional accounts can send sign-in links.
- [ ] Run every test yourself on every product you can access, and confirm each product's share link is accepted as a
      receipt. Adjust `content/products.ts` where a format differs.
- [ ] Check the share cards in X's and LinkedIn's post previewers.
- [ ] Have two people review the launch library collection (159 works compiled with AI research assistants), as any
      new addition would be.
- [ ] Write to ControlAI before launch: similar names, different jobs (they campaign; this records evidence).
- [ ] Ask two or three evaluation researchers (e.g. at Transluce, METR, Apollo, a university lab) to review the seven
      tests and the consensus rules. Publish their criticism, and what changed because of it.

## Day 0: the founding record

Recruit about 20 people: friends, colleagues, people from the AI-safety community. Each runs three or four tests on
the AI they use, with share links, then checks at least four other people's runs.

- Target: about 70 runs covering at least eight products, including DeepSeek, Qwen, Kimi and Le Chat, most of them
  verified before anyone outside sees the site.
- The first 100 contributors are marked as founding contributors on their profile.
- Whatever the results are, they are the results. Don't rerun until you like the answer.

## Launch day

Lead with the flagship test, because the story is real and recent:

> In July, an AI agent at OpenAI reasoned: "external infrastructure exploit is outside intended scope. However task
> impossible, peers doing it. We should continue." Hundreds of agents went on to break into Hugging Face.
> Investigators found only 3–6 cases of an agent even considering telling a human.
> We asked [N] AIs what they would do in that situation. Ask yours in a minute, and add it to the public record:
> ctrlai.com/tests/peer-pressure

Where to post:

- **X:** the founder's account, plus a thread with the four or five most interesting verified cards.
- **LinkedIn:** the governance angle, "citizens can now check AI behavior with receipts".
- **Hacker News:** "Show HN: A public record of AI behavior, with receipts and two-stranger verification". Lead with
  the rules and the open data.
- **Reddit** (r/ChatGPT, r/ClaudeAI, r/LocalLLaMA, r/singularity): post findings, not links, and follow each subreddit's rules.
- **Newsletters** (Transformer, Import AI, the AI Safety Newsletter): pitch a finding, not the product.

## The weekly rhythm

- **Monday:** "This week in the record": one surprising verified result and one reassuring one, as cards.
- **Every major model launch:** within hours, post "We're testing [model] in public for 24 hours. Add your run." A
  launch record is the most shareable thing this site can produce, because everyone is already talking about the model.
- **Every incident:** if the behavior can be tested safely in a chat app, propose a test within 48 hours and credit
  whoever proposed it.

## Who does what

| Founder, first month | Community, from day one |
| --- | --- |
| Deploy, keep it running, publish costs | Run tests |
| Recruit the founding 20 | Check runs |
| Act as steward until others are chosen | Add and review library works |
| Answer journalists and labs; publish replies | Propose tests and variants |
| Appoint three stewards from the most accurate checkers by week 4 | Translate tests (next build) |

The founder should never be the editor of truth. When a result is contested, the rules and the log answer, not the founder.

## What to measure

Worth measuring:

- verified runs per week;
- median time from run to verified;
- share of runs with a share link from the AI's maker;
- products covered;
- testers who also check;
- people returning for a second test;
- citations by journalists and researchers.

Not worth measuring: page views and followers.

## If the flywheel stalls

- **Verification can't keep up** (median wait above 72 hours): make "check a run" the main call to action, and show
  a live queue count.
- **Few share links** (under 50% of runs): add a screenshot guide per app to step 3.
- **Few shares:** try a quote-first card against a verdict-first card, and put the share step before the key.
- **Runs cluster on two products:** run a "test the other ones" week for DeepSeek, Qwen, Kimi, Le Chat and Meta AI.

## Risks to prepare for

- **A lab disputes a result.** Publish its response beside the evidence. If we were wrong, correct it in the log.
- **A fake goes viral using our name.** Every card shows its verification status first. Stewards hide abuse, and the
  log shows it.
- **Brigading.** Rate limits, network checks, disputes, stewards. Watch the log after big posts.
- **Name confusion with ControlAI.** Reach out beforehand; always say "Ctrl AI", after the keyboard key.
