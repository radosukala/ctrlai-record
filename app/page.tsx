import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { EPISODES, SERIES } from '@/content/tomorrows';
import { Wordmark } from '@/components/Brand';
import { AnalyticsSettingsButton } from '@/components/Analytics';
import styles from '@/components/tomorrows/tomorrows.module.css';

export const metadata: Metadata = {
  title: { absolute: `Ctrl AI · ${SERIES.title}` },
  description: SERIES.description,
  alternates: { canonical: '/' },
  openGraph: { title: `Ctrl AI presents ${SERIES.title}`, description: SERIES.description },
};

export const viewport: Viewport = { themeColor: '#1b2b22' };

export default function HomePage() {
  return (
    <div className={`${styles.page} ${styles.screen}`} data-tone="dusk">
      <header className={styles.bar}>
        <div className={styles.crumb}>
          <Wordmark />
          <span className={styles.seriesName}>{SERIES.title}</span>
        </div>
        <span className={styles.label}>Fiction</span>
      </header>

      <div className={styles.series}>
        <p className={styles.homeKicker}>Ctrl AI presents</p>
        <h1 className={styles.seriesTitle}>{SERIES.title}</h1>
        <p className={styles.seriesLede}>{SERIES.lede}</p>
        <p className={styles.undo}>
          The future has no undo key. These stories do.{' '}
          <span className={styles.keys} aria-label="control Z"><kbd>ctrl</kbd><kbd>Z</kbd></span>
        </p>

        <ol className={styles.episodes}>
          {EPISODES.map(episode => (
            <li className={styles.episode} key={episode.slug}>
              <Link href={`/tomorrows/${episode.slug}`}>
                <div className={styles.episodeMeta}>Episode {episode.number} · About {episode.minutes} minutes</div>
                <div className={styles.episodeTitle}>{episode.title}</div>
                <div className={styles.episodeHook}>{episode.hook}</div>
                <div className={styles.play}>Play it →</div>
              </Link>
            </li>
          ))}
        </ol>
        <p className={styles.seriesNote}>
          New episodes as they’re written. Every story is fiction, and says so. Where one leans on the real world, the line is
          marked, and the end of the episode says what has already happened, with sources.
        </p>

        <section className={styles.why} aria-labelledby="why-ctrl">
          <h2 id="why-ctrl" className={styles.groupTitle}>Why Ctrl AI</h2>
          <p className={styles.whyText}>
            Who controls AI is being decided now, mostly in a few rooms. We think everyone should get to imagine the answers
            before they’re settled. So we write possible tomorrows, mark what’s already real, and let you rewind.
          </p>
          <p className={styles.seriesNote}>
            Ctrl AI began as <Link href="/record">a public record of how AI behaves</Link>. It’s still online.
            <AnalyticsSettingsButton className={styles.inlineButton} />
          </p>
        </section>
      </div>
    </div>
  );
}
