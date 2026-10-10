import type { Metadata } from 'next';
import Link from 'next/link';
import { CAP, NOMINEE_DAYS } from '@/content/hall';
import { FILM_PATH, FILM_PUBLIC, INCIDENT_PATH } from '@/content/incidents/openai-hf/publish';
import { FILM_DURATION } from '@/content/incidents/openai-hf/timing';
import { HN_THRESHOLD } from '@/lib/stats';
import { SITE } from '@/lib/site';
import { AnalyticsSettingsButton } from '@/components/Analytics';
import { Section } from '@/components/Section';
import { newsletterEnabled } from '@/lib/newsletter/config';

export const metadata: Metadata = {
  title: 'About',
  description: 'What Ctrl AI is, what we aspire to build, how the weekly picks and the Hall of Fame are chosen, where the numbers come from, and what we do with your data.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  const minutes = Math.round(FILM_DURATION / 60);
  return (
    <div className="page">
      <div className="shell">
        <header className="hero">
          <div className="hero-main">
            <p className="dateline"><b>About Ctrl AI</b></p>
            <h1 className="headline">The feed forgets. <em>This page doesn’t.</em></h1>
            <p className="lede">
              Whether we can keep AI under human control stopped being a niche question this summer, when OpenAI’s agents broke out of their test
              environment and breached Hugging Face. Since then there has been a flood of good material: interviews, explainers, research, reporting.
              Most of it is buried within a week. Ctrl AI keeps what matters findable. We want it to become more than that: a place where anyone can
              understand what is happening with AI, and join the conversation about one question above all: are we staying in control?
            </p>
          </div>
        </header>
      </div>

      <div className="shell">
        <Section id="what" title="What’s here now">
          <div className="prose">
            <p>
              <strong>This week.</strong> Every week, the events that mattered and seven pieces worth your time, from everything published in the
              last seven days. Each issue keeps its own page, so nothing gets lost.
            </p>
            <p>
              <strong>The Hall of Fame.</strong> What to see first if you’re new: how AI works, why control is hard, what has already happened, how
              worried to be, and who decides. It holds at most {CAP} things, so getting in means something. New entries are nominees for
              {` ${NOMINEE_DAYS}`} days and stay only if people are still watching, reading or citing them.
            </p>
            {FILM_PUBLIC ? (
              <p>
                <strong>Reconstructions.</strong> When something happens that shows how these systems behave, we lay it out step by step: who did what
                and when, what each report says, how sure we are, and what nobody knows yet. The first is <Link href={INCIDENT_PATH}>the OpenAI–Hugging
                Face incident</Link>, as a page and as a <Link href={FILM_PATH}>film of {minutes} minutes</Link>. It rests only on what OpenAI, METR,
                Redwood Research and Hugging Face have published; every date, number and quotation has its source, and our own view is marked as ours.
                It is not an official account from any of them, and the film’s voices are synthetic.
              </p>
            ) : null}
          </div>
        </Section>
      </div>

      <div className="shell">
        <Section id="aims" title="What we aspire to build" blurb="Aims, not promises. Ctrl AI is small and independent, so we’ll build this a piece at a time.">
          <div className="prose">
            <p>
              We think AI may be the most consequential thing people have ever built. The choices about it will be made by far more people than the
              researchers and labs who build and study it, and those people need to understand what is happening. Ctrl AI exists to help: to explain
              it in plain language, to keep up with it, and to bring more people into the conversation.
            </p>
            <p>
              <strong>Explain it.</strong> Films, diagrams and interactive pages, made so that someone who has never followed this can understand it
              in minutes, and someone who has can check every claim. When an event shows how these systems really behave, we want to lay it out step
              by step, with its sources, how sure we are and what is still missing, and to go back to it as new facts come out.
            </p>
            <p>
              <strong>Keep up with it.</strong> The weekly issue, and behind it a handful of plain questions a newcomer asks first: can AI systems act
              beyond what people allowed? Are companies putting real safeguards into practice? Who can stop an unsafe release? Each gets a short
              answer with a date on it, what has changed, what is known, where informed people disagree and what is still unknown, and a public
              history of every time we revised it. The answer should move when the evidence does.
            </p>
            <p>
              <strong>Keep the record.</strong> Leaders and companies say things about control, promise things, and then do or don’t. A statement is
              not a promise, a promise is not an action, and an action is not proof that it worked, so we want to keep them apart: every entry dated,
              sourced and archived, every quotation checked word for word against its source, and any change of position shown in the person’s own
              words, never with a guess from us about why. Software finds candidates; a person reads each one before it is published.
            </p>
            <p>
              <strong>Take part.</strong> Understanding is the start. We want to bring more people into the conversation: questions you send that we
              answer in public, guides for watching and discussing a film together in a class, a team or a family, and open conversations where people
              put their questions to those who study AI. We don’t yet know which of these will work, so we’ll try them small first.
            </p>
            <p>
              <strong>Hear from the people who shape it.</strong> Later, interviews and conversations with researchers, officials and others whose
              decisions matter, held to the same rules as everything else here.
            </p>
            <p>
              <strong>Open to reuse.</strong> Our words are free to reuse with credit and the code is open. We want the record itself to be available
              as data too: feeds, downloads and a permanent link for every entry. The works we link to, and the quotations we show, stay their
              authors’.
            </p>
            <p>
              We don’t intend to be only a news site. Whatever helps more people understand AI and join the conversation about it, we want to try.
            </p>
          </div>
        </Section>
      </div>

      <div className="shell">
        <Section id="stand" title="Where we stand">
          <div className="prose">
            <p>
              We think meaningful human authority over powerful AI is worth protecting. How best to do that, and how large particular risks are, we
              leave to the evidence. We don’t campaign, and we don’t ask you to sign or contact anyone. We put the strongest skeptics next to the most
              alarmed, we hold both to the same rules, and we say when something went well as plainly as when something went wrong.
            </p>
            <p>
              Money never decides what goes in. If this work is ever supported by readers or funders, we’ll say who, and they won’t have a say over
              what we include or how we describe it. Ctrl AI is drafted with Claude, made by Anthropic, and a person reviews what is published;
              Anthropic is held to the same standard as every other AI company that appears here. When we get something wrong, we fix it where it
              was made, say so with the date and keep the earlier text visible. Write to <a href="mailto:hello@ctrlai.com">hello@ctrlai.com</a>.
            </p>
          </div>
        </Section>
      </div>

      <div className="shell">
        <Section id="how" title="How we pick">
          <div className="prose">
            <ul>
              <li>We look widely: YouTube, X, newsletters, research papers, forums and the news.</li>
              <li>We open everything before we pick it, and write why it matters in our own words.</li>
              <li>An event goes in only when at least two independent reports confirm it.</li>
              <li>Where serious people disagree, the strongest counter-view goes in too. Every pick says where it stands: alarmed, measured or skeptical.</li>
              <li>Numbers inform the choice; they don’t make it. A million views is reach, not truth.</li>
            </ul>
            <p>We use AI tools to search, measure and check sources. Every line about a pick is checked against the source before it goes up.</p>
          </div>
        </Section>
      </div>

      <div className="shell">
        <Section id="numbers" title="Where the numbers come from">
          <div className="prose">
            <p>
              Each pick shows the public numbers we could get on the day of the issue, with that date next to them. We pay for no data. YouTube
              numbers come from each video’s own page, posts on X from the public fxtwitter mirror, Substack likes from the publication itself, and
              for articles, the discussion on Hacker News when it reached {HN_THRESHOLD} points or more.
            </p>
            <p>
              We show ratios where we can, because they say more than size: <strong>liked</strong> is likes per view, <strong>kept</strong> is
              bookmarks per view (people saving it for later), and <strong>argued</strong> is comments per like. This week’s picks show views per day;
              the Hall of Fame shows views per year, which rewards lasting over a one-week spike.
            </p>
            <p>YouTube rounds the comment counts it shows (2.1K), and Hacker News is one community’s attention, not everyone’s.</p>
          </div>
        </Section>
      </div>

      <div className="shell">
        <Section id="suggest" title="Suggest something">
          <div className="prose">
            <p>
              Seen something that belongs here? <a href={SITE.suggestUrl}>Send it to us on GitHub</a> with a line on why. We read every suggestion;
              we can’t promise to pick it. The same goes for anything you wish Ctrl AI did and doesn’t.
            </p>
          </div>
        </Section>
      </div>

      <div className="shell">
        <Section id="privacy" title="Privacy">
          <div className="prose">
            <p>
              There are no accounts. We count visits with Vercel Web Analytics, which sets no cookies and keeps nothing that identifies you:
              the page, where the visit came from, the country, and the kind of device and browser. If you agree, Google Analytics also counts
              which picks people open and play, with advertising features switched off. If you don’t, it never loads. You can change your mind at
              any time: <AnalyticsSettingsButton className="text-button" />. Fonts and pictures are served from this site. The film remembers which
              of its sounds you switch off, in your browser only; that setting is never sent to us.
            </p>
          </div>
        </Section>
      </div>

      {newsletterEnabled() ? (
        <div className="shell">
          <Section id="email" title="The weekly email">
            <div className="prose">
              <p>
                Subscribing takes two steps: you type your address, and we send one email with a button. You’re added only when you press it,
                so nobody can sign you up by typing your address. We keep your address with Resend, the service that sends our emails, and
                use it for nothing but the weekly issue. We don’t track whether you open or click our emails.
              </p>
              <p>
                Every issue ends with a one-click unsubscribe link, and after you use it we send nothing more. If you’d like your address erased
                from the list entirely, reply to any issue and we’ll do it.
              </p>
            </div>
          </Section>
        </div>
      ) : null}

      <div className="shell">
        <Section id="videos" title="Videos on this page">
          <div className="prose">
            <p>
              Press a picture and the video plays here. Until you do, nothing loads from YouTube or X: the pictures are copies kept on this site.
              When you press play, the video comes from YouTube in its privacy-enhanced mode, or from X, and their own privacy policies apply.
            </p>
            {FILM_PUBLIC ? <p>The film is different: it is hosted on this site, so playing it loads nothing from YouTube, X or anyone else.</p> : null}
          </div>
        </Section>
      </div>

      <div className="shell">
        <Section id="before" title="Before this">
          <div className="prose">
            <p>
              Until October 2026 this address held a public record of how AI chatbots behave, and a series of interactive stories called Other
              Tomorrows. Both are closed. Their code stays in the <a href={SITE.repoUrl}>public repository</a>.
            </p>
            <p>
              Ctrl AI is an independent project. Our summaries are free to reuse under
              {' '}<a href={SITE.contentLicenseUrl}>{SITE.contentLicense}</a>; the works we link to belong to their makers. The code is
              {' '}<a href={SITE.codeLicenseUrl}>{SITE.codeLicense}</a>.
            </p>
            <p><Link href="/">Back to this week →</Link></p>
          </div>
        </Section>
      </div>
    </div>
  );
}
