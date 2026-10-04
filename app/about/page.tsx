import type { Metadata } from 'next';
import Link from 'next/link';
import { CAP, NOMINEE_DAYS } from '@/content/hall';
import { HN_THRESHOLD } from '@/lib/stats';
import { SITE } from '@/lib/site';
import { AnalyticsSettingsButton } from '@/components/Analytics';

export const metadata: Metadata = {
  title: 'How we pick',
  description: 'Why Ctrl AI exists, how the weekly picks and the Hall of Fame are chosen, where the numbers come from, and what we do with your data.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="read page">
      <section className="hero-text">
        <span className="eyebrow">About Ctrl AI</span>
        <h1 className="display">The feed forgets. <em>This page doesn’t.</em></h1>
        <p className="lede">
          Whether we can keep AI under human control stopped being a niche question this summer, when OpenAI’s agents broke out of their test
          environment and breached Hugging Face. Since then there has been a flood of good material: interviews, explainers, research, reporting.
          Most of it is buried within a week. Ctrl AI keeps what matters findable.
        </p>
      </section>

      <section className="prose" aria-labelledby="what">
        <h2 className="h2" id="what">Two things, nothing else</h2>
        <p>
          <strong>This week.</strong> Every week, the events that mattered and seven pieces worth your time, from everything published in the
          last seven days. Each issue keeps its own page, so nothing gets lost.
        </p>
        <p>
          <strong>The Hall of Fame.</strong> What to see first if you’re new: how AI works, why control is hard, what has already happened, how
          worried to be, and who decides. It holds at most {CAP} things, so getting in means something. New entries are nominees for
          {` ${NOMINEE_DAYS}`} days and stay only if people are still watching, reading or citing them.
        </p>
      </section>

      <section className="prose" aria-labelledby="how">
        <h2 className="h2" id="how">How we pick</h2>
        <ul>
          <li>We look widely: YouTube, X, newsletters, research papers, forums and the news.</li>
          <li>We open everything before we pick it, and write why it matters in our own words.</li>
          <li>An event goes in only when at least two independent reports confirm it.</li>
          <li>Where serious people disagree, the strongest counter-view goes in too. Every pick says where it stands: alarmed, measured or skeptical.</li>
          <li>Numbers inform the choice; they don’t make it. A million views is reach, not truth.</li>
        </ul>
        <p>We use AI tools to search, measure and check sources. Every line about a pick is checked against the source before it goes up.</p>
      </section>

      <section className="prose" aria-labelledby="numbers">
        <h2 className="h2" id="numbers">Where the numbers come from</h2>
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
      </section>

      <section className="prose" aria-labelledby="suggest">
        <h2 className="h2" id="suggest">Suggest something</h2>
        <p>
          Seen something that belongs here? <a href={SITE.suggestUrl}>Send it to us on GitHub</a> with a line on why. We read every suggestion;
          we can’t promise to pick it.
        </p>
      </section>

      <section className="prose" aria-labelledby="privacy">
        <h2 className="h2" id="privacy">Privacy</h2>
        <p>
          There are no accounts. We count visits with Vercel Web Analytics, which sets no cookies and keeps nothing that identifies you:
          the page, where the visit came from, the country, and the kind of device and browser. If you agree, Google Analytics also counts
          which picks people open and play, with advertising features switched off. If you don’t, it never loads. You can change your mind at
          any time: <AnalyticsSettingsButton className="text-button" />. Fonts and pictures are served from this site.
        </p>
      </section>

      <section className="prose" aria-labelledby="videos">
        <h2 className="h2" id="videos">Videos on this page</h2>
        <p>
          Press a picture and the video plays here. Until you do, nothing loads from YouTube or X: the pictures are copies kept on this site.
          When you press play, the video comes from YouTube in its privacy-enhanced mode, or from X, and their own privacy policies apply.
        </p>
      </section>

      <section className="prose" aria-labelledby="before">
        <h2 className="h2" id="before">Before this</h2>
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
      </section>
    </div>
  );
}
