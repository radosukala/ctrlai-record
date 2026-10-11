import Link from 'next/link';
import '@/components/say/say.css';
import { Section } from '@/components/Section';
import { COPY, POLIS, STATEMENT_COUNT, THEMES, type Lang } from '@/content/say-discuss';
import { nb } from '@/content/lang';
import { SAY } from '@/content/say';
import { PolisEmbed } from './PolisEmbed';

/** The discussion page in one language. The site's header and footer stay in English; the page says so by wrapping its own words in lang. */
export function DiscussView({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  const id = POLIS[lang];
  let n = 0;
  return (
    <div className="page say-page" lang={lang}>
      <div className="shell">
        <header className="say-hero">
          <p className="dateline">
            <Link href={SAY.hub} lang="en">{t.back}</Link>
            <b>{t.dateline}</b>
            <Link href={t.otherLangHref} className="muted" hrefLang={lang === 'en' ? 'cs' : 'en'} lang={lang === 'en' ? 'cs' : 'en'}>{t.otherLang}</Link>
          </p>
          <h1 className="headline">{t.title}</h1>
          <p className="lede">{nb(t.lede, lang)}</p>
          {t.note ? <p className="say-note">{t.note}</p> : null}
        </header>
      </div>

      <div className="shell">
        <Section id="how" title={t.howTitle}>
          <ol className="prose">
            {t.how.map(line => <li key={line} style={{ listStyle: 'decimal', marginLeft: '1.2em' }}>{nb(line, lang)}</li>)}
          </ol>
        </Section>
      </div>

      <div className="shell">
        <Section id="conversation" title={t.openTitle}>
          <div className="say-embed">
            {id ? <PolisEmbed id={id} lang={lang} load={t.load} loadNote={t.loadNote} /> : <p>{t.openSoon}</p>}
          </div>
        </Section>
      </div>

      <div className="shell">
        <Section id="statements" title={t.seedsTitle} blurb={`${t.seedsBlurb} (${STATEMENT_COUNT})`}>
          <div className="say-statements">
            {THEMES.map(theme => (
              <div className="say-theme" key={theme.id}>
                <h3>{theme.title[lang]}</h3>
                {theme.statements.map(s => {
                  n += 1;
                  return (
                    <p className="say-statement" key={s.en}>
                      <span className="n">{n}</span>
                      <span>{nb(s[lang], lang)}</span>
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
